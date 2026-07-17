import { store } from '../state/store';

/**
 * Theme handling: light and dark palettes are defined in CSS; "system"
 * follows prefers-color-scheme, an explicit choice pins data-theme.
 */
export function applyTheme(): void {
  const theme = store.settings.theme;
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}
