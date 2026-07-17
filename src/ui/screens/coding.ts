import { navigate } from '../../app';
import { store } from '../../state/store';
import type { Segment, TranscriptDoc } from '../../types';
import { aggregateRows, maxLevel } from '../../lib/aggregates';
import { segmentLabel } from '../../lib/announce';
import { codePathLabel, effectiveColorId } from '../../lib/codes';
import { paletteColor } from '../../lib/palette';
import { serializeProject } from '../../lib/project-io';
import { formatTimestamp } from '../../lib/time';
import { segmentsToVtt } from '../../lib/vtt-out';
import { confirmDialog } from '../dialogs';
import { downloadFile, safeFileName } from '../download';
import { el, isTypingTarget, srOnly } from '../dom';
import { announce } from '../live-region';
import { openSettingsDialog } from '../settings-dialog';
import { CodeTree } from '../widgets/code-tree';
import { openCodeDialog } from '../widgets/code-dialog';

/**
 * Coding view: transcript listbox (left), video and code tree (right).
 * The listbox option's accessible name carries the full announcement:
 * assigned code paths, timestamp, speaker, then the segment text.
 */
export async function renderCoding(main: HTMLElement, projectId: string, docId: string): Promise<HTMLElement> {
  const project = await store.openProject(projectId);
  if (!project) throw new Error('This project was not found in this browser.');
  const found = project.documents.find((d) => d.id === docId);
  if (!found) throw new Error('This document was not found in the project.');
  const doc: TranscriptDoc = found;
  document.title = `${doc.title} — ${project.name} — Qually`;

  // Abort this screen's window-level listeners as soon as we navigate away.
  const controller = new AbortController();
  window.addEventListener('hashchange', () => controller.abort(), { once: true });

  let selectedSegmentId: string | null = doc.segments[0]?.id ?? null;
  let video: HTMLVideoElement | null = null;

  // ---------- header ----------

  const heading = el('h1', { tabindex: '-1', class: 'doc-title' }, [doc.title]);

  const switcherId = 'doc-switcher';
  const switcher = el(
    'select',
    { id: switcherId },
    project.documents.map((d) =>
      el('option', { value: d.id, ...(d.id === doc.id ? { selected: true } : {}) }, [d.title]),
    ),
  );
  switcher.addEventListener('change', () => {
    navigate({ screen: 'doc', projectId, docId: switcher.value });
  });

  const aggregatesBtn = el('button', { type: 'button', class: 'btn btn-small' }, ['View aggregates']);
  aggregatesBtn.addEventListener('click', () => openAggregates());

  const settingsBtn = el('button', { type: 'button', class: 'btn btn-small' }, ['Settings…']);
  settingsBtn.addEventListener('click', () => openSettingsDialog(() => updateAllOptions()));
  const helpBtn = el('button', { type: 'button', class: 'btn btn-small' }, [
    'Shortcuts',
    srOnly(' (question mark)'),
  ]);
  helpBtn.addEventListener('click', () => {
    void import('../shortcuts-dialog').then((m) => m.openShortcutsDialog());
  });

  const header = el('header', { class: 'coding-header' }, [
    el('div', { class: 'coding-header-title' }, [
      el('nav', { 'aria-label': 'Breadcrumb' }, [
        el('a', { href: `#/project/${projectId}` }, [`← ${project.name}`]),
      ]),
      heading,
    ]),
    el('div', { class: 'coding-header-tools' }, [
      el('div', { class: 'field field-inline' }, [
        el('label', { for: switcherId }, ['Document']),
        switcher,
      ]),
      aggregatesBtn,
      settingsBtn,
      helpBtn,
    ]),
  ]);

  // ---------- transcript listbox ----------

  const listbox = el('ul', {
    role: 'listbox',
    'aria-label': 'Transcript',
    class: 'transcript-list',
  });

  const optionId = (segId: string) => `seg-${segId}`;

  function buildOption(segment: Segment): HTMLLIElement {
    const stripes = el('span', { class: 'option-stripes', 'aria-hidden': 'true' });
    const body = el('span', { class: 'option-body' }, [
      segment.startMs !== undefined
        ? el('span', { class: 'seg-time' }, [formatTimestamp(segment.startMs)])
        : null,
      segment.speaker ? el('span', { class: 'seg-speaker' }, [segment.speaker]) : null,
      el('span', { class: 'seg-text' }, [segment.text]),
    ]);
    const item = el(
      'li',
      {
        role: 'option',
        id: optionId(segment.id),
        tabindex: segment.id === selectedSegmentId ? '0' : '-1',
        'aria-selected': String(segment.id === selectedSegmentId),
        'data-segment-id': segment.id,
        class: 'transcript-option',
      },
      [stripes, body],
    );
    return item;
  }

  function updateOption(segmentId: string): void {
    const segment = doc.segments.find((s) => s.id === segmentId);
    const item = listbox.querySelector<HTMLElement>(`[data-segment-id="${segmentId}"]`);
    if (!segment || !item || !store.project) return;
    item.setAttribute(
      'aria-label',
      segmentLabel(segment, doc.id, store.project.codes, store.project.assignments, store.settings),
    );
    const stripes = item.querySelector('.option-stripes')!;
    stripes.replaceChildren();
    const seen = new Set<string>();
    for (const a of store.assignmentsFor(doc.id, segmentId)) {
      const code = store.project.codes.find((c) => c.id === a.codeId);
      if (!code) continue;
      const color = paletteColor(effectiveColorId(code, store.project.codes));
      if (!color || seen.has(color.id)) continue;
      seen.add(color.id);
      stripes.append(
        el('span', { class: 'stripe', style: `--dot-light:${color.light};--dot-dark:${color.dark}` }),
      );
    }
    item.classList.toggle('coded', seen.size > 0);
  }

  function updateAllOptions(): void {
    for (const segment of doc.segments) updateOption(segment.id);
  }

  for (const segment of doc.segments) listbox.append(buildOption(segment));
  updateAllOptions();

  function selectSegment(segmentId: string, focus: boolean): void {
    selectedSegmentId = segmentId;
    for (const item of listbox.querySelectorAll<HTMLElement>('[role="option"]')) {
      const isTarget = item.dataset.segmentId === segmentId;
      item.setAttribute('aria-selected', String(isTarget));
      item.setAttribute('tabindex', isTarget ? '0' : '-1');
      if (isTarget && focus) item.focus();
    }
    updateCodingTarget();
    tree.refreshAssignedStates();
  }

  function seekToSegment(segment: Segment, andPlay: boolean): void {
    if (!video) {
      if (doc.videoFileName) announce('Re-attach the video to play it.');
      return;
    }
    if (segment.startMs === undefined) {
      announce('This segment has no timestamp.');
      return;
    }
    video.currentTime = segment.startMs / 1000;
    if (andPlay) void video.play();
  }

  listbox.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (!item) return;
    const segment = doc.segments.find((s) => s.id === item.dataset.segmentId);
    if (!segment) return;
    selectSegment(segment.id, true);
    seekToSegment(segment, true);
  });

  listbox.addEventListener('keydown', (event) => {
    const items = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')];
    const current = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (!current) return;
    const index = items.indexOf(current);
    const singles = store.settings.singleKeyShortcuts;

    const moveTo = (item: HTMLElement | undefined) => {
      if (item) selectSegment(item.dataset.segmentId!, true);
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveTo(items[index + 1]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveTo(items[index - 1]);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(items[0]);
        break;
      case 'End':
        event.preventDefault();
        moveTo(items[items.length - 1]);
        break;
      case 'Enter': {
        event.preventDefault();
        const segment = doc.segments.find((s) => s.id === current.dataset.segmentId);
        if (segment) seekToSegment(segment, true);
        break;
      }
      case ' ':
        event.preventDefault();
        togglePlayback();
        break;
      default:
        if (!singles) return;
        if (event.key === 'c' || event.key === 'C') {
          event.preventDefault();
          tree.focus();
        } else if (event.key === 'k' || event.key === 'K') {
          event.preventDefault();
          togglePlayback();
        } else if (event.key === 'j' || event.key === 'J') {
          event.preventDefault();
          nudgeVideo(-5);
        } else if (event.key === 'l' || event.key === 'L') {
          event.preventDefault();
          nudgeVideo(5);
        }
    }
  });

  const transcriptSection = el('section', { class: 'transcript-panel', 'aria-labelledby': 'transcript-h' }, [
    el('h2', { id: 'transcript-h', class: 'panel-heading' }, ['Transcript']),
    doc.segments.length === 0 ? el('p', { class: 'muted' }, ['This transcript has no segments.']) : listbox,
  ]);

  // ---------- video ----------

  function togglePlayback(): void {
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function nudgeVideo(seconds: number): void {
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime + seconds);
  }

  const videoSection = el('section', { class: 'video-panel', 'aria-labelledby': 'video-h' });

  // Blob URLs for the video and its captions track; revoked on rebuild and
  // when navigating away so long sessions don't accumulate them.
  const objectUrls: string[] = [];
  const trackUrl = (blob: Blob | File): string => {
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return url;
  };
  const revokeObjectUrls = (): void => {
    while (objectUrls.length > 0) URL.revokeObjectURL(objectUrls.pop()!);
  };
  controller.signal.addEventListener('abort', revokeObjectUrls);

  function buildVideoSection(): void {
    videoSection.replaceChildren(el('h2', { id: 'video-h', class: 'panel-heading' }, ['Video']));
    const file = store.videoFor(doc.id);
    revokeObjectUrls();

    if (file) {
      video = el('video', { controls: true, class: 'video-player', preload: 'metadata' });
      video.src = trackUrl(file);
      const vtt = segmentsToVtt(doc.segments);
      if (vtt) {
        const track = el('track', {
          kind: 'captions',
          label: 'Transcript captions',
          srclang: 'en',
          default: true,
        });
        track.src = trackUrl(new Blob([vtt], { type: 'text/vtt' }));
        video.append(track);
      }
      video.addEventListener('timeupdate', () => highlightPlayingSegment());
      videoSection.append(video);
      return;
    }

    video = null;
    const attachInput = el('input', {
      type: 'file',
      accept: 'video/*,audio/*',
      hidden: true,
      'aria-hidden': 'true',
      tabindex: '-1',
    });
    const attachBtn = el('button', { type: 'button', class: 'btn' }, [
      doc.videoFileName ? `Re-attach video (${doc.videoFileName})…` : 'Attach a video…',
    ]);
    attachBtn.addEventListener('click', () => attachInput.click());
    attachInput.addEventListener('change', () => {
      const chosen = attachInput.files?.[0];
      if (!chosen) return;
      store.attachVideo(doc.id, chosen);
      buildVideoSection();
      announce(`Video ${chosen.name} attached.`);
      video?.focus();
    });
    videoSection.append(
      el('p', { class: 'muted' }, [
        doc.videoFileName
          ? 'Videos stay on your computer, so they need to be re-attached each session.'
          : 'This document has no video. You can code the transcript on its own.',
      ]),
      attachBtn,
      attachInput,
    );
  }
  buildVideoSection();

  let lastPlayingId: string | null = null;
  function highlightPlayingSegment(): void {
    if (!video) return;
    const nowMs = video.currentTime * 1000;
    let playing: Segment | null = null;
    for (let i = 0; i < doc.segments.length; i++) {
      const seg = doc.segments[i]!;
      if (seg.startMs === undefined) continue;
      const end = seg.endMs ?? doc.segments[i + 1]?.startMs ?? Infinity;
      if (nowMs >= seg.startMs && nowMs < end) {
        playing = seg;
        break;
      }
    }
    const playingId = playing?.id ?? null;
    if (playingId === lastPlayingId) return;
    lastPlayingId = playingId;
    for (const item of listbox.querySelectorAll<HTMLElement>('[role="option"]')) {
      const isPlaying = item.dataset.segmentId === playingId;
      item.classList.toggle('playing', isPlaying);
      if (isPlaying) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
      if (isPlaying && !listbox.contains(document.activeElement)) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ---------- codes panel ----------

  const codingTarget = el('p', { class: 'coding-target', id: 'coding-target' });
  function updateCodingTarget(): void {
    const segment = doc.segments.find((s) => s.id === selectedSegmentId);
    if (!segment) {
      codingTarget.textContent = 'Select a transcript segment to code it.';
      return;
    }
    const excerpt = segment.text.length > 90 ? `${segment.text.slice(0, 90)}…` : segment.text;
    const time = segment.startMs !== undefined ? `${formatTimestamp(segment.startMs)} — ` : '';
    codingTarget.textContent = `Coding: ${time}“${excerpt}”`;
  }

  function requireSegment(): Segment | null {
    const segment = doc.segments.find((s) => s.id === selectedSegmentId) ?? null;
    if (!segment) announce('Select a transcript segment first.');
    return segment;
  }

  function segmentRef(segment: Segment): string {
    return segment.startMs !== undefined
      ? `segment at ${formatTimestamp(segment.startMs)}`
      : 'the selected segment';
  }

  const tree = new CodeTree({
    isAssigned: (codeId) =>
      selectedSegmentId !== null && store.isAssigned(doc.id, selectedSegmentId, codeId),
    onToggleAssign: (codeId) => {
      const segment = requireSegment();
      const code = store.project?.codes.find((c) => c.id === codeId);
      if (!segment || !code || !store.project) return;
      const label = codePathLabel(code, store.project.codes);
      if (store.isAssigned(doc.id, segment.id, codeId)) {
        store.unassign(doc.id, segment.id, codeId);
        announce(`Removed ${label} from ${segmentRef(segment)}.`);
      } else {
        store.assign(doc.id, segment.id, codeId);
        announce(`Assigned ${label} to ${segmentRef(segment)}.`);
      }
      tree.refreshAssignedStates();
      updateOption(segment.id);
    },
    onNew: (parentId) => void createCodeFlow(parentId),
    onEdit: (codeId) => void editCodeFlow(codeId),
    onDelete: (codeId) => void deleteCodeFlow(codeId),
    singleKeysEnabled: () => store.settings.singleKeyShortcuts,
    onFocusChange: (codeId) => updateCodeActionButtons(codeId),
  });

  async function createCodeFlow(parentId: string | null): Promise<void> {
    if (!store.project) return;
    const result = await openCodeDialog({
      title: 'New code',
      codes: store.project.codes,
      defaultParentId: parentId,
      confirmLabel: 'Create code',
    });
    if (!result) return;
    const code = store.createCode(result.name, result.parentId, result.colorId);
    tree.expandAncestorsOf(code.id);
    tree.render(store.project.codes);
    announce(`Created code ${codePathLabel(code, store.project.codes)}.`);
    updateAllOptions();
    restoreTreeFocus();
  }

  async function editCodeFlow(codeId: string): Promise<void> {
    if (!store.project) return;
    const code = store.project.codes.find((c) => c.id === codeId);
    if (!code) return;
    const result = await openCodeDialog({
      title: 'Edit code',
      codes: store.project.codes,
      editing: code,
      confirmLabel: 'Save changes',
    });
    if (!result) return;
    store.updateCode(codeId, { name: result.name, parentId: result.parentId, colorId: result.colorId });
    tree.expandAncestorsOf(codeId);
    tree.render(store.project.codes);
    announce(`Updated code ${codePathLabel(code, store.project.codes)}.`);
    updateAllOptions();
    restoreTreeFocus();
  }

  /**
   * Re-rendering the tree can destroy the element the closing dialog returns
   * focus to (e.g. when a code dialog was opened with E or N on a tree item).
   * If focus fell back to <body>, put it on the tree again.
   */
  function restoreTreeFocus(): void {
    setTimeout(() => {
      if (document.activeElement === document.body) tree.focus();
    }, 0);
  }

  async function deleteCodeFlow(codeId: string): Promise<void> {
    if (!store.project) return;
    const code = store.project.codes.find((c) => c.id === codeId);
    if (!code) return;
    const kids = store.project.codes.filter((c) => c.parentId === codeId).length;
    const name = codePathLabel(code, store.project.codes);
    const ok = await confirmDialog({
      title: 'Delete code',
      message:
        `Delete “${name}”` +
        (kids > 0 ? ' and all its sub-codes' : '') +
        '? Its assignments on every document in this project will be removed. This cannot be undone.',
      confirmLabel: 'Delete code',
      danger: true,
    });
    if (!ok) return;
    store.deleteCode(codeId);
    tree.render(store.project.codes);
    announce(`Deleted code ${name}.`);
    updateAllOptions();
    tree.focus();
  }

  const newCodeBtn = el('button', { type: 'button', class: 'btn btn-primary btn-small' }, ['New code…']);
  newCodeBtn.addEventListener('click', () => void createCodeFlow(null));

  const editCodeBtn = el('button', { type: 'button', class: 'btn btn-small', disabled: true }, ['Edit…']);
  editCodeBtn.addEventListener('click', () => {
    if (tree.focusedCodeId) void editCodeFlow(tree.focusedCodeId);
  });
  const deleteCodeBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger-quiet', disabled: true }, [
    'Delete…',
  ]);
  deleteCodeBtn.addEventListener('click', () => {
    if (tree.focusedCodeId) void deleteCodeFlow(tree.focusedCodeId);
  });

  function updateCodeActionButtons(codeId: string | null): void {
    const code = codeId ? store.project?.codes.find((c) => c.id === codeId) : undefined;
    for (const btn of [editCodeBtn, deleteCodeBtn]) {
      if (code) btn.removeAttribute('disabled');
      else btn.setAttribute('disabled', '');
    }
    editCodeBtn.setAttribute('aria-label', code ? `Edit code ${code.name}` : 'Edit code');
    deleteCodeBtn.setAttribute('aria-label', code ? `Delete code ${code.name}` : 'Delete code');
  }

  const emptyCodesNote = el('p', { class: 'muted' }, [
    'No codes yet. Create your first code to start coding.',
  ]);
  function updateEmptyCodesNote(): void {
    emptyCodesNote.hidden = (store.project?.codes.length ?? 0) > 0;
  }

  const codesSection = el('section', { class: 'codes-panel', 'aria-labelledby': 'codes-h' }, [
    el('h2', { id: 'codes-h', class: 'panel-heading' }, ['Codes']),
    codingTarget,
    el('div', { class: 'toolbar' }, [newCodeBtn, editCodeBtn, deleteCodeBtn]),
    emptyCodesNote,
    tree.root,
  ]);

  const observer = new MutationObserver(() => updateEmptyCodesNote());
  observer.observe(tree.root, { childList: true });
  tree.render(project.codes);
  updateEmptyCodesNote();
  updateCodingTarget();

  // ---------- aggregates view ----------
  // Replaces the coding layout entirely while open: the table and the coding
  // panels are never on screen at the same time.

  const aggregatesHeading = el('h2', { tabindex: '-1' }, ['Code aggregates']);
  const levelSelectId = 'aggregates-level';
  const levelSelect = el('select', { id: levelSelectId });
  const aggregatesTableHolder = el('div', { class: 'aggregates-table-holder' });
  const closeAggregatesBtn = el('button', { type: 'button', class: 'btn' }, ['Close aggregates']);

  const aggregatesSection = el(
    'section',
    { class: 'aggregates-panel', 'aria-labelledby': 'aggregates-h', hidden: true },
    [
      el('div', { class: 'aggregates-header' }, [aggregatesHeading, closeAggregatesBtn]),
      el('p', { class: 'muted' }, [
        'How many segments each code is assigned to, in this document and across the whole project. ',
        'Counts in parentheses include the code’s sub-codes.',
      ]),
      el('div', { class: 'field field-inline' }, [
        el('label', { for: levelSelectId }, ['Show levels']),
        levelSelect,
      ]),
      aggregatesTableHolder,
    ],
  );
  aggregatesHeading.id = 'aggregates-h';

  function renderAggregatesTable(): void {
    if (!store.project) return;
    const rows = aggregateRows(store.project, doc.id);
    const filter = levelSelect.value;
    const shown = filter === 'all' ? rows : rows.filter((r) => r.level === Number(filter));

    if (rows.length === 0) {
      aggregatesTableHolder.replaceChildren(
        el('p', { class: 'muted' }, ['No codes yet — there is nothing to count.']),
      );
      return;
    }
    if (shown.length === 0) {
      aggregatesTableHolder.replaceChildren(
        el('p', { class: 'muted' }, [`No codes at level ${filter}.`]),
      );
      return;
    }

    const cell = (direct: number, subtree: number) =>
      subtree > direct ? `${direct} (${subtree} with sub-codes)` : String(direct);

    const table = el('table', { class: 'aggregates-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { scope: 'col' }, ['Code']),
          el('th', { scope: 'col' }, ['Level']),
          el('th', { scope: 'col' }, ['This document']),
          el('th', { scope: 'col' }, ['All documents']),
        ]),
      ]),
      el(
        'tbody',
        {},
        shown.map((row) =>
          el('tr', {}, [
            el('th', { scope: 'row' }, [row.path.join(': ')]),
            el('td', {}, [String(row.level)]),
            el('td', {}, [cell(row.docDirect, row.docSubtree)]),
            el('td', {}, [cell(row.allDirect, row.allSubtree)]),
          ]),
        ),
      ),
    ]);
    aggregatesTableHolder.replaceChildren(table);
  }

  function rebuildLevelOptions(): void {
    if (!store.project) return;
    const previous = levelSelect.value || 'all';
    const depth = maxLevel(aggregateRows(store.project, doc.id));
    levelSelect.replaceChildren(
      el('option', { value: 'all' }, ['All levels']),
      ...Array.from({ length: depth }, (_, i) =>
        el('option', { value: String(i + 1) }, [`Level ${i + 1} only`]),
      ),
    );
    levelSelect.value = [...levelSelect.options].some((o) => o.value === previous) ? previous : 'all';
  }
  levelSelect.addEventListener('change', () => renderAggregatesTable());

  function openAggregates(): void {
    if (video && !video.paused) video.pause();
    rebuildLevelOptions();
    renderAggregatesTable();
    layout.hidden = true;
    aggregatesSection.hidden = false;
    aggregatesBtn.disabled = true;
    aggregatesHeading.focus();
  }

  function closeAggregates(): void {
    aggregatesSection.hidden = true;
    layout.hidden = false;
    aggregatesBtn.disabled = false;
    aggregatesBtn.focus();
  }
  closeAggregatesBtn.addEventListener('click', () => closeAggregates());

  // ---------- layout + global keys ----------

  const layout = el('div', { class: 'coding-layout' }, [
    transcriptSection,
    el('div', { class: 'side-column' }, [videoSection, codesSection]),
  ]);
  main.append(header, layout, aggregatesSection);

  window.addEventListener(
    'keydown',
    (event) => {
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape' && !aggregatesSection.hidden) {
        event.preventDefault();
        closeAggregates();
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const focusTargets: Record<string, () => void> = {
          '1': () => {
            const active = listbox.querySelector<HTMLElement>('[tabindex="0"]');
            (active ?? listbox.querySelector<HTMLElement>('[role="option"]'))?.focus();
          },
          '2': () => (video ?? videoSection.querySelector<HTMLElement>('button'))?.focus(),
          '3': () => tree.focus(),
          '4': () => switcher.focus(),
        };
        const action = focusTargets[event.key];
        if (action) {
          event.preventDefault();
          action();
          return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        if (store.project) {
          store.flushSave();
          downloadFile(
            `${safeFileName(store.project.name)}.qually.json`,
            serializeProject(store.project),
            'application/json',
          );
          announce('Project file downloaded.');
        }
        return;
      }
      // Video keys also work when focus is on the video element itself.
      if (video && document.activeElement === video && !isTypingTarget(event.target)) {
        if (store.settings.singleKeyShortcuts) {
          if (event.key === 'k' || event.key === 'K') {
            event.preventDefault();
            togglePlayback();
          } else if (event.key === 'j' || event.key === 'J') {
            event.preventDefault();
            nudgeVideo(-5);
          } else if (event.key === 'l' || event.key === 'L') {
            event.preventDefault();
            nudgeVideo(5);
          }
        }
      }
    },
    { signal: controller.signal },
  );

  return heading;
}
