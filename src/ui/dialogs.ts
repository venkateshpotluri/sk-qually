import { el } from './dom';

/**
 * Dialog helpers built on the native <dialog> element: modal, labelled by
 * their heading, Escape to close, focus returned to the opener by the
 * platform.
 */

let idCounter = 0;

interface DialogShell {
  dialog: HTMLDialogElement;
  body: HTMLDivElement;
  heading: HTMLHeadingElement;
}

export function createDialog(title: string, className = ''): DialogShell {
  const headingId = `dialog-h-${++idCounter}`;
  const heading = el('h2', { id: headingId }, [title]);
  const body = el('div', { class: 'dialog-body' });
  const dialog = el('dialog', { class: `dialog ${className}`.trim(), 'aria-labelledby': headingId }, [
    heading,
    body,
  ]);
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  return { dialog, body, heading };
}

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    const { dialog, body } = createDialog(opts.title);
    let confirmed = false;

    const confirmBtn = el(
      'button',
      { type: 'button', class: opts.danger ? 'btn btn-danger' : 'btn btn-primary' },
      [opts.confirmLabel],
    );
    const cancelBtn = el('button', { type: 'button', class: 'btn' }, ['Cancel']);
    confirmBtn.addEventListener('click', () => {
      confirmed = true;
      dialog.close();
    });
    cancelBtn.addEventListener('click', () => dialog.close());

    body.append(
      el('p', {}, [opts.message]),
      el('div', { class: 'dialog-actions' }, [cancelBtn, confirmBtn]),
    );
    dialog.addEventListener('close', () => resolve(confirmed));
    dialog.showModal();
    cancelBtn.focus();
  });
}

/** Single-text-field prompt dialog (used for renames). */
export function promptDialog(opts: {
  title: string;
  label: string;
  initial?: string;
  confirmLabel: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const { dialog, body } = createDialog(opts.title);
    let result: string | null = null;

    const inputId = `dialog-in-${++idCounter}`;
    const input = el('input', {
      id: inputId,
      type: 'text',
      required: true,
      value: opts.initial ?? '',
      autocomplete: 'off',
    });
    const form = el('form', { method: 'dialog' }, [
      el('div', { class: 'field' }, [el('label', { for: inputId }, [opts.label]), input]),
      el('div', { class: 'dialog-actions' }, [
        el('button', { type: 'button', class: 'btn', 'data-cancel': true }, ['Cancel']),
        el('button', { type: 'submit', class: 'btn btn-primary' }, [opts.confirmLabel]),
      ]),
    ]);
    form.querySelector('[data-cancel]')!.addEventListener('click', () => dialog.close());
    form.addEventListener('submit', () => {
      result = input.value.trim() || null;
    });
    body.append(form);
    dialog.addEventListener('close', () => resolve(result));
    dialog.showModal();
    input.focus();
    input.select();
  });
}
