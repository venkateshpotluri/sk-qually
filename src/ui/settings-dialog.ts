import { store } from '../state/store';
import type { Settings } from '../types';
import { applyTheme } from './theme';
import { createDialog } from './dialogs';
import { el } from './dom';
import { announce } from './live-region';

/** Settings dialog. onChange fires after any setting is updated. */
export function openSettingsDialog(onChange?: () => void): void {
  const { dialog, body } = createDialog('Settings');

  const check = (
    id: string,
    label: string,
    description: string,
    key: 'announceColors' | 'singleKeyShortcuts',
  ) => {
    const input = el('input', { type: 'checkbox', id, 'aria-describedby': `${id}-desc` });
    input.checked = store.settings[key];
    input.addEventListener('change', () => {
      store.updateSettings({ [key]: input.checked });
      announce(`${label} ${input.checked ? 'on' : 'off'}.`);
      onChange?.();
    });
    return el('div', { class: 'field field-check' }, [
      input,
      el('div', {}, [
        el('label', { for: id }, [label]),
        el('p', { class: 'muted', id: `${id}-desc` }, [description]),
      ]),
    ]);
  };

  const themeId = 'setting-theme';
  const themeSelect = el('select', { id: themeId }, [
    el('option', { value: 'system' }, ['Match system']),
    el('option', { value: 'light' }, ['Light']),
    el('option', { value: 'dark' }, ['Dark']),
  ]);
  themeSelect.value = store.settings.theme;
  themeSelect.addEventListener('change', () => {
    store.updateSettings({ theme: themeSelect.value as Settings['theme'] });
    applyTheme();
    onChange?.();
  });

  body.append(
    check(
      'setting-colors',
      'Announce code colors',
      'Include each code’s color name (for example “ocean blue”) in segment announcements.',
      'announceColors',
    ),
    check(
      'setting-single-keys',
      'Single-letter shortcuts',
      'Enable C, N, E, J, K and L. Turn off if they conflict with your screen reader or browser.',
      'singleKeyShortcuts',
    ),
    el('div', { class: 'field' }, [el('label', { for: themeId }, ['Theme']), themeSelect]),
  );

  const closeBtn = el('button', { type: 'button', class: 'btn btn-primary' }, ['Close']);
  closeBtn.addEventListener('click', () => dialog.close());
  body.append(el('div', { class: 'dialog-actions' }, [closeBtn]));

  dialog.showModal();
}
