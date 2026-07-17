import { createDialog } from './dialogs';
import { el } from './dom';

interface ShortcutRow {
  keys: string;
  action: string;
}

interface ShortcutGroup {
  title: string;
  rows: ShortcutRow[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Anywhere',
    rows: [
      { keys: '?', action: 'Show this shortcuts list' },
      { keys: 'Escape', action: 'Close a dialog' },
    ],
  },
  {
    title: 'Coding view — moving around',
    rows: [
      { keys: 'Alt + 1', action: 'Go to the transcript' },
      { keys: 'Alt + 2', action: 'Go to the video' },
      { keys: 'Alt + 3', action: 'Go to the code tree' },
      { keys: 'Alt + 4', action: 'Go to the document switcher' },
      { keys: 'Control + S', action: 'Export the project file' },
    ],
  },
  {
    title: 'Transcript list',
    rows: [
      { keys: 'Up / Down arrows', action: 'Previous / next segment (also selects it for coding)' },
      { keys: 'Home / End', action: 'First / last segment' },
      { keys: 'Enter', action: 'Play the video from this segment' },
      { keys: 'C', action: 'Go to the code tree to code the selected segment' },
    ],
  },
  {
    title: 'Video (single letters work in the transcript and video areas)',
    rows: [
      { keys: 'K or Space', action: 'Play or pause' },
      { keys: 'J', action: 'Back 5 seconds' },
      { keys: 'L', action: 'Forward 5 seconds' },
    ],
  },
  {
    title: 'Code tree',
    rows: [
      { keys: 'Up / Down arrows', action: 'Previous / next code' },
      { keys: 'Right / Left arrows', action: 'Expand / collapse, or move between levels' },
      { keys: 'Enter or Space', action: 'Assign or unassign this code for the selected segment' },
      { keys: 'N', action: 'New code (under the current code)' },
      { keys: 'E', action: 'Edit the current code' },
      { keys: 'Delete', action: 'Delete the current code and its sub-codes' },
    ],
  },
];

export function openShortcutsDialog(): void {
  const { dialog, body, heading } = createDialog('Keyboard shortcuts', 'dialog-wide');

  for (const group of GROUPS) {
    body.append(
      el('h3', {}, [group.title]),
      el(
        'table',
        { class: 'shortcuts-table' },
        [
          el('thead', {}, [
            el('tr', {}, [el('th', { scope: 'col' }, ['Keys']), el('th', { scope: 'col' }, ['Action'])]),
          ]),
          el(
            'tbody',
            {},
            group.rows.map((row) =>
              el('tr', {}, [
                el('td', {}, [el('kbd', {}, [row.keys])]),
                el('td', {}, [row.action]),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  body.append(
    el('p', { class: 'muted' }, [
      'Single-letter shortcuts (C, N, E, J, K, L) can be turned off in Settings if they conflict with your screen reader or browser.',
    ]),
  );

  const closeBtn = el('button', { type: 'button', class: 'btn btn-primary' }, ['Close']);
  closeBtn.addEventListener('click', () => dialog.close());
  body.append(el('div', { class: 'dialog-actions' }, [closeBtn]));

  dialog.showModal();
  // Start reading (and scrolled) from the top, not from the Close button.
  heading.setAttribute('tabindex', '-1');
  heading.focus();
  dialog.scrollTop = 0;
}
