/**
 * Categorical palette for codes. Every color has a human-readable name that is
 * used in screen-reader announcements when "announce colors" is enabled.
 *
 * Each color has two values: one tuned for the light theme (darker, ≥3:1
 * against the light background) and one for the dark theme (lighter, ≥3:1
 * against the dark background). Verified by scripts/contrast-check.mjs.
 */

export interface PaletteColor {
  id: string;
  name: string;
  light: string;
  dark: string;
}

export const PALETTE: PaletteColor[] = [
  { id: 'brick', name: 'brick red', light: '#a3352b', dark: '#e88b7d' },
  { id: 'ocean', name: 'ocean blue', light: '#1d5f9e', dark: '#7fb3e3' },
  { id: 'moss', name: 'moss green', light: '#3d6b35', dark: '#94c48a' },
  { id: 'plum', name: 'plum purple', light: '#6d3f7e', dark: '#c9a0d8' },
  { id: 'amber', name: 'amber yellow', light: '#8a6116', dark: '#e0b45c' },
  { id: 'teal', name: 'teal', light: '#0f6a66', dark: '#6cc5c0' },
  { id: 'rose', name: 'rose pink', light: '#a13560', dark: '#e694b6' },
  { id: 'slate', name: 'slate gray', light: '#4e5d6c', dark: '#a3b2c2' },
  { id: 'olive', name: 'olive green', light: '#5f6b1f', dark: '#b3c163' },
  { id: 'cobalt', name: 'cobalt blue', light: '#3b4bbf', dark: '#a3adf2' },
  { id: 'rust', name: 'rust orange', light: '#96481a', dark: '#e39a67' },
  { id: 'orchid', name: 'orchid violet', light: '#8438a8', dark: '#d2a2e8' },
];

export function paletteColor(id: string | undefined): PaletteColor | undefined {
  return id ? PALETTE.find((c) => c.id === id) : undefined;
}

/** Pick the least-used palette color for a new top-level code. */
export function nextColorId(usedIds: (string | undefined)[]): string {
  const counts = new Map<string, number>(PALETTE.map((c) => [c.id, 0]));
  for (const id of usedIds) {
    if (id && counts.has(id)) counts.set(id, counts.get(id)! + 1);
  }
  let best = PALETTE[0]!.id;
  let bestCount = Infinity;
  for (const c of PALETTE) {
    const n = counts.get(c.id)!;
    if (n < bestCount) {
      best = c.id;
      bestCount = n;
    }
  }
  return best;
}
