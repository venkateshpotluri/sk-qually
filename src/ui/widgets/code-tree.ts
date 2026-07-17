import type { Code } from '../../types';
import { childrenOf, effectiveColorId } from '../../lib/codes';
import { paletteColor } from '../../lib/palette';
import { el } from '../dom';

/**
 * Accessible code tree following the ARIA Authoring Practices tree pattern.
 * Arbitrary depth. Focus is managed with a roving tabindex on the treeitems;
 * aria-checked reflects whether each code is assigned to the currently
 * selected transcript segment.
 *
 * Keys: Up/Down move, Right expands / enters, Left collapses / exits,
 * Home/End jump, Enter/Space toggle assignment, and (when single-letter
 * shortcuts are enabled) N = new sub-code, E = edit, Delete = delete.
 */

export interface CodeTreeCallbacks {
  isAssigned(codeId: string): boolean;
  onToggleAssign(codeId: string): void;
  onNew(parentId: string | null): void;
  onEdit(codeId: string): void;
  onDelete(codeId: string): void;
  singleKeysEnabled(): boolean;
  /** Called when the focused tree item changes, e.g. to enable action buttons. */
  onFocusChange?(codeId: string | null): void;
}

export class CodeTree {
  readonly root: HTMLUListElement;
  private codes: Code[] = [];
  private expanded = new Set<string>();
  private focusedId: string | null = null;

  constructor(private callbacks: CodeTreeCallbacks) {
    this.root = el('ul', { role: 'tree', 'aria-label': 'Code tree', class: 'code-tree' });
    this.root.addEventListener('keydown', (e) => this.onKeydown(e));
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('focusin', (e) => {
      const item = (e.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
      if (item) this.setFocused(item.dataset.codeId!, false);
    });
  }

  get focusedCodeId(): string | null {
    return this.focusedId;
  }

  /** Re-render from the given codes, preserving expansion and focus. */
  render(codes: Code[]): void {
    this.codes = codes;
    const prevFocus = this.focusedId;
    this.root.replaceChildren(...childrenOf(null, codes).map((c) => this.buildItem(c, 1)));

    const items = this.visibleItems();
    if (items.length === 0) {
      this.focusedId = null;
      this.callbacks.onFocusChange?.(null);
      return;
    }
    const target =
      (prevFocus && this.itemFor(prevFocus) ? prevFocus : null) ?? items[0]!.dataset.codeId!;
    this.setFocused(target, false);
  }

  /** Update aria-checked on every item (after the selected segment changes). */
  refreshAssignedStates(): void {
    for (const item of this.allItems()) {
      item.setAttribute('aria-checked', String(this.callbacks.isAssigned(item.dataset.codeId!)));
    }
  }

  focus(): void {
    const item = (this.focusedId && this.itemFor(this.focusedId)) || this.visibleItems()[0];
    item?.focus();
  }

  private buildItem(code: Code, level: number): HTMLLIElement {
    const kids = childrenOf(code.id, this.codes);
    const color = paletteColor(effectiveColorId(code, this.codes));
    const isExpanded = this.expanded.has(code.id);

    const row = el('span', { class: 'tree-row' }, [
      kids.length > 0
        ? el('span', { class: `twisty ${isExpanded ? 'open' : ''}`, 'aria-hidden': 'true' })
        : el('span', { class: 'twisty-spacer', 'aria-hidden': 'true' }),
      el('span', {
        class: 'color-dot',
        'aria-hidden': 'true',
        style: color ? `--dot-light:${color.light};--dot-dark:${color.dark}` : undefined,
      }),
      el('span', { class: 'code-name' }, [code.name]),
      el('span', { class: 'assigned-mark', 'aria-hidden': 'true' }, ['✓']),
    ]);

    const item = el(
      'li',
      {
        role: 'treeitem',
        tabindex: '-1',
        'aria-level': String(level),
        'aria-checked': String(this.callbacks.isAssigned(code.id)),
        ...(kids.length > 0 ? { 'aria-expanded': String(isExpanded) } : {}),
        'data-code-id': code.id,
      },
      [row],
    );

    if (kids.length > 0 && isExpanded) {
      item.append(el('ul', { role: 'group' }, kids.map((k) => this.buildItem(k, level + 1))));
    }
    return item;
  }

  // ----- item queries -----

  private allItems(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
  }

  /** Items whose ancestors are all expanded — collapsed subtrees are not in the DOM. */
  private visibleItems(): HTMLElement[] {
    return this.allItems();
  }

  private itemFor(codeId: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(`[role="treeitem"][data-code-id="${codeId}"]`);
  }

  private setFocused(codeId: string, moveFocus: boolean): void {
    const item = this.itemFor(codeId);
    if (!item) return;
    for (const other of this.allItems()) other.setAttribute('tabindex', '-1');
    item.setAttribute('tabindex', '0');
    this.focusedId = codeId;
    if (moveFocus) item.focus();
    this.callbacks.onFocusChange?.(codeId);
  }

  // ----- interaction -----

  private onClick(event: MouseEvent): void {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!item || !this.root.contains(item)) return;
    event.stopPropagation();
    const codeId = item.dataset.codeId!;
    if ((event.target as HTMLElement).closest('.twisty')) {
      this.toggleExpand(codeId);
      this.setFocused(codeId, true);
      return;
    }
    this.setFocused(codeId, true);
    this.callbacks.onToggleAssign(codeId);
  }

  private onKeydown(event: KeyboardEvent): void {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!item) return;
    const codeId = item.dataset.codeId!;
    const items = this.visibleItems();
    const index = items.indexOf(item);
    const singles = this.callbacks.singleKeysEnabled();

    const move = (target: HTMLElement | undefined) => {
      if (target) this.setFocused(target.dataset.codeId!, true);
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(items[index + 1]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(items[index - 1]);
        break;
      case 'Home':
        event.preventDefault();
        move(items[0]);
        break;
      case 'End':
        event.preventDefault();
        move(items[items.length - 1]);
        break;
      case 'ArrowRight': {
        event.preventDefault();
        const hasKids = item.hasAttribute('aria-expanded');
        if (hasKids && item.getAttribute('aria-expanded') === 'false') {
          this.toggleExpand(codeId);
          this.setFocused(codeId, true);
        } else if (hasKids) {
          move(item.querySelector<HTMLElement>('[role="treeitem"]') ?? undefined);
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        if (item.getAttribute('aria-expanded') === 'true') {
          this.toggleExpand(codeId);
          this.setFocused(codeId, true);
        } else {
          const parent = item.parentElement?.closest<HTMLElement>('[role="treeitem"]');
          move(parent ?? undefined);
        }
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.callbacks.onToggleAssign(codeId);
        break;
      case 'Delete':
        event.preventDefault();
        this.callbacks.onDelete(codeId);
        break;
      default:
        if (singles && (event.key === 'n' || event.key === 'N')) {
          event.preventDefault();
          this.callbacks.onNew(codeId);
        } else if (singles && (event.key === 'e' || event.key === 'E')) {
          event.preventDefault();
          this.callbacks.onEdit(codeId);
        }
    }
  }

  private toggleExpand(codeId: string): void {
    if (this.expanded.has(codeId)) this.expanded.delete(codeId);
    else this.expanded.add(codeId);
    this.render(this.codes);
  }

  expandAncestorsOf(codeId: string): void {
    const byId = new Map(this.codes.map((c) => [c.id, c]));
    let current = byId.get(codeId);
    while (current?.parentId) {
      this.expanded.add(current.parentId);
      current = byId.get(current.parentId);
    }
  }
}
