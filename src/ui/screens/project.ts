import { navigate } from '../../app';
import { store } from '../../state/store';
import { parseTranscript } from '../../parsers';
import { projectToCsv } from '../../lib/csv';
import { serializeProject } from '../../lib/project-io';
import { confirmDialog, promptDialog } from '../dialogs';
import { downloadFile, safeFileName } from '../download';
import { el } from '../dom';
import { announce } from '../live-region';

/** Project view: manage documents, export, rename, delete. */
export async function renderProject(main: HTMLElement, projectId: string): Promise<HTMLElement> {
  const project = await store.openProject(projectId);
  if (!project) {
    throw new Error('This project was not found in this browser. It may have been deleted.');
  }
  document.title = `${project.name} — Qually`;

  const heading = el('h1', { tabindex: '-1' }, [project.name]);
  const header = el('header', { class: 'page-header' }, [
    el('nav', { 'aria-label': 'Breadcrumb' }, [el('a', { href: '#/' }, ['← All projects'])]),
    heading,
  ]);

  // --- toolbar ---
  const renameBtn = el('button', { type: 'button', class: 'btn' }, ['Rename project…']);
  renameBtn.addEventListener('click', async () => {
    const name = await promptDialog({
      title: 'Rename project',
      label: 'Project name',
      initial: project.name,
      confirmLabel: 'Rename',
    });
    if (name) {
      await store.renameProject(project.id, name);
      announce(`Project renamed to ${name}.`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });

  const exportJsonBtn = el('button', { type: 'button', class: 'btn' }, ['Export project file']);
  exportJsonBtn.addEventListener('click', () => {
    store.flushSave();
    downloadFile(`${safeFileName(project.name)}.qually.json`, serializeProject(project), 'application/json');
    announce('Project file downloaded.');
  });

  const exportCsvBtn = el('button', { type: 'button', class: 'btn' }, ['Export coded segments (CSV)']);
  exportCsvBtn.addEventListener('click', () => {
    downloadFile(`${safeFileName(project.name)}-codes.csv`, projectToCsv(project), 'text/csv');
    announce('CSV file downloaded.');
  });

  const deleteBtn = el('button', { type: 'button', class: 'btn btn-danger-quiet' }, ['Delete project…']);
  deleteBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete project',
      message: `Delete “${project.name}” and everything in it from this browser? This cannot be undone.`,
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (ok) {
      await store.deleteProject(project.id);
      announce(`Deleted project ${project.name}.`);
      navigate({ screen: 'home' });
    }
  });

  const toolbar = el('div', { class: 'toolbar', role: 'group', 'aria-label': 'Project actions' }, [
    renameBtn,
    exportJsonBtn,
    exportCsvBtn,
    deleteBtn,
  ]);

  // --- documents ---
  const docsSection = el('section', { 'aria-labelledby': 'docs-h' });
  docsSection.append(el('h2', { id: 'docs-h' }, ['Documents']));

  if (project.documents.length === 0) {
    docsSection.append(
      el('p', { class: 'muted' }, ['No documents yet. Add a transcript below — with or without its video.']),
    );
  } else {
    const ul = el('ul', { class: 'card-list' });
    for (const doc of project.documents) {
      const open = el('a', { href: `#/project/${project.id}/doc/${doc.id}`, class: 'card-title' }, [
        doc.title,
      ]);
      const codedCount = new Set(
        project.assignments.filter((a) => a.documentId === doc.id).map((a) => a.segmentId),
      ).size;
      const meta = el('p', { class: 'muted' }, [
        `${doc.segments.length} segments, ${codedCount} coded` +
          (doc.videoFileName ? ` — video: ${doc.videoFileName}` : ' — transcript only'),
      ]);
      const renameDocBtn = el('button', { type: 'button', class: 'btn btn-small' }, [
        'Rename',
        el('span', { class: 'sr-only' }, [` document ${doc.title}`]),
      ]);
      renameDocBtn.addEventListener('click', async () => {
        const title = await promptDialog({
          title: 'Rename document',
          label: 'Document title',
          initial: doc.title,
          confirmLabel: 'Rename',
        });
        if (title) {
          store.renameDocument(doc.id, title);
          announce(`Document renamed to ${title}.`);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
      const removeDocBtn = el('button', { type: 'button', class: 'btn btn-small btn-danger-quiet' }, [
        'Remove',
        el('span', { class: 'sr-only' }, [` document ${doc.title}`]),
      ]);
      removeDocBtn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Remove document',
          message: `Remove “${doc.title}” and its code assignments from this project? This cannot be undone.`,
          confirmLabel: 'Remove document',
          danger: true,
        });
        if (ok) {
          store.removeDocument(doc.id);
          announce(`Removed document ${doc.title}.`);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      });
      ul.append(
        el('li', { class: 'card' }, [
          el('div', {}, [open, meta]),
          el('div', { class: 'card-actions' }, [renameDocBtn, removeDocBtn]),
        ]),
      );
    }
    docsSection.append(ul);
  }

  // --- add document ---
  const addSection = el('section', { 'aria-labelledby': 'add-h' });
  const titleId = 'doc-title';
  const transcriptId = 'doc-transcript';
  const videoId = 'doc-video';

  const titleInput = el('input', { id: titleId, type: 'text', autocomplete: 'off' });
  const transcriptInput = el('input', {
    id: transcriptId,
    type: 'file',
    required: true,
    accept: '.vtt,.srt,.txt,text/plain,text/vtt',
    'aria-describedby': 'transcript-hint',
  });
  const videoInput = el('input', {
    id: videoId,
    type: 'file',
    accept: 'video/*,audio/*',
    'aria-describedby': 'video-hint',
  });

  const addForm = el('form', { class: 'stacked-form' }, [
    el('div', { class: 'field' }, [
      el('label', { for: transcriptId }, ['Transcript file (required)']),
      transcriptInput,
      el('p', { class: 'muted', id: 'transcript-hint' }, [
        'VTT, SRT, or plain text. Timestamps and “Name:” speaker prefixes are picked up automatically.',
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { for: videoId }, ['Video or audio file (optional)']),
      videoInput,
      el('p', { class: 'muted', id: 'video-hint' }, [
        'Played locally, never uploaded or stored. You will be asked to re-attach it in future sessions.',
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { for: titleId }, ['Title (optional, defaults to the file name)']),
      titleInput,
    ]),
    el('button', { type: 'submit', class: 'btn btn-primary' }, ['Add document']),
  ]);

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const transcriptFile = transcriptInput.files?.[0];
    if (!transcriptFile) {
      announce('Choose a transcript file first.');
      return;
    }
    try {
      const content = await transcriptFile.text();
      const { format, segments } = parseTranscript(transcriptFile.name, content);
      const videoFile = videoInput.files?.[0];
      const title = titleInput.value.trim() || transcriptFile.name.replace(/\.[^.]+$/, '');
      const doc = store.addDocument(title, format, segments, videoFile?.name);
      if (videoFile) store.attachVideo(doc.id, videoFile);
      announce(`Added document ${title} with ${segments.length} segments.`);
      navigate({ screen: 'doc', projectId: project.id, docId: doc.id });
    } catch (err) {
      announce(err instanceof Error ? err.message : 'Could not parse this transcript.');
    }
  });

  addSection.append(el('h2', { id: 'add-h' }, ['Add a document']), addForm);

  main.append(header, toolbar, docsSection, addSection);
  return heading;
}
