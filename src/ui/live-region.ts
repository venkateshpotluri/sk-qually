/**
 * One polite live region for the whole app. Status messages (code assigned,
 * project saved, errors) funnel through announce().
 */

let region: HTMLElement | null = null;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export function mountLiveRegion(parent: HTMLElement): void {
  region = document.createElement('div');
  region.className = 'sr-only';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  parent.append(region);
}

export function announce(message: string): void {
  if (!region) return;
  // Clear first so repeating the same message is re-announced.
  region.textContent = '';
  clearTimeout(clearTimer);
  requestAnimationFrame(() => {
    if (region) region.textContent = message;
  });
  clearTimer = setTimeout(() => {
    if (region) region.textContent = '';
  }, 10000);
}
