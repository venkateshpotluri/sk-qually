import type { Code } from '../../types';
import { childrenOf, codePath, subtreeIds } from '../../lib/codes';
import { PALETTE } from '../../lib/palette';
import { createDialog } from '../dialogs';
import { el } from '../dom';

export interface CodeDialogResult {
  name: string;
  parentId: string | null;
  colorId?: string;
}

let idCounter = 0;

/**
 * Create/edit dialog for a code: name, parent (any existing code, any depth)
 * and color. When editing, the code's own subtree is excluded from the parent
 * options so a code can't become its own descendant.
 */
export function openCodeDialog(opts: {
  title: string;
  codes: Code[];
  editing?: Code;
  defaultParentId?: string | null;
  confirmLabel: string;
}): Promise<CodeDialogResult | null> {
  return new Promise((resolve) => {
    const { dialog, body } = createDialog(opts.title);
    let result: CodeDialogResult | null = null;
    const suffix = ++idCounter;

    const nameId = `code-name-${suffix}`;
    const parentId = `code-parent-${suffix}`;
    const colorId = `code-color-${suffix}`;

    const nameInput = el('input', {
      id: nameId,
      type: 'text',
      required: true,
      autocomplete: 'off',
      value: opts.editing?.name ?? '',
    });

    // Parent options, indented to show depth.
    const excluded = opts.editing ? new Set(subtreeIds(opts.editing.id, opts.codes)) : new Set<string>();
    const parentSelect = el('select', { id: parentId }, [
      el('option', { value: '' }, ['(top level)']),
    ]);
    const addOptions = (pid: string | null, depth: number) => {
      for (const code of childrenOf(pid, opts.codes)) {
        if (excluded.has(code.id)) continue;
        parentSelect.append(
          el('option', { value: code.id }, [
            `${'  '.repeat(depth)}${codePath(code, opts.codes).join(': ')}`,
          ]),
        );
        addOptions(code.id, depth + 1);
      }
    };
    addOptions(null, 0);
    parentSelect.value = opts.editing?.parentId ?? opts.defaultParentId ?? '';

    const colorSelect = el('select', { id: colorId, 'aria-describedby': `${colorId}-hint` }, [
      el('option', { value: '' }, ['Inherit from parent (or automatic)']),
      ...PALETTE.map((c) => el('option', { value: c.id }, [c.name])),
    ]);
    colorSelect.value = opts.editing?.colorId ?? '';

    const form = el('form', { method: 'dialog', class: 'stacked-form' }, [
      el('div', { class: 'field' }, [el('label', { for: nameId }, ['Code name']), nameInput]),
      el('div', { class: 'field' }, [el('label', { for: parentId }, ['Parent code']), parentSelect]),
      el('div', { class: 'field' }, [
        el('label', { for: colorId }, ['Color']),
        colorSelect,
        el('p', { class: 'muted', id: `${colorId}-hint` }, [
          'Sub-codes inherit their parent’s color unless you pick one.',
        ]),
      ]),
      el('div', { class: 'dialog-actions' }, [
        el('button', { type: 'button', class: 'btn', 'data-cancel': true }, ['Cancel']),
        el('button', { type: 'submit', class: 'btn btn-primary' }, [opts.confirmLabel]),
      ]),
    ]);
    form.querySelector('[data-cancel]')!.addEventListener('click', () => dialog.close());
    form.addEventListener('submit', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      result = {
        name,
        parentId: parentSelect.value || null,
        ...(colorSelect.value ? { colorId: colorSelect.value } : {}),
      };
    });

    body.append(form);
    dialog.addEventListener('close', () => resolve(result));
    dialog.showModal();
    nameInput.focus();
  });
}
