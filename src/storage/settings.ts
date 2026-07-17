import { DEFAULT_SETTINGS, type Settings } from '../types';

/**
 * App preferences (not study data) live in localStorage: whether to announce
 * colors, whether single-key shortcuts are enabled, and the theme.
 */

const KEY = 'qually.settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable (private mode with quota 0, etc.) — run with in-memory settings.
  }
}
