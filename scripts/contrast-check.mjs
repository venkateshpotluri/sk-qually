#!/usr/bin/env node
/**
 * WCAG 2.1 contrast verification for the Qually design tokens and code
 * palette. Text pairs must reach 4.5:1 (AA normal text) and non-text
 * indicators 3:1 (AA non-text). Fails the process if anything is short.
 * Results are recorded in docs/design-review.md.
 */

const tokens = {
  light: {
    bg: '#faf9f7', raised: '#ffffff', sunken: '#f0eeea',
    text: '#1c1f24', muted: '#565e6a',
    accent: '#3d4db7', accentContrast: '#ffffff', accentSoft: '#e9ebf9',
    danger: '#a3352b',
  },
  dark: {
    bg: '#16181d', raised: '#1e2127', sunken: '#101216',
    text: '#e8e9ec', muted: '#a5adba',
    accent: '#9daaf7', accentContrast: '#14161b', accentSoft: '#262c45',
    danger: '#e88b7d',
  },
};

const palette = [
  ['brick red', '#a3352b', '#e88b7d'],
  ['ocean blue', '#1d5f9e', '#7fb3e3'],
  ['moss green', '#3d6b35', '#94c48a'],
  ['plum purple', '#6d3f7e', '#c9a0d8'],
  ['amber yellow', '#8a6116', '#e0b45c'],
  ['teal', '#0f6a66', '#6cc5c0'],
  ['rose pink', '#a13560', '#e694b6'],
  ['slate gray', '#4e5d6c', '#a3b2c2'],
  ['olive green', '#5f6b1f', '#b3c163'],
  ['cobalt blue', '#3b4bbf', '#a3adf2'],
  ['rust orange', '#96481a', '#e39a67'],
  ['orchid violet', '#8438a8', '#d2a2e8'],
];

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

let failed = false;
const rows = [];

function check(label, fg, bg, min) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed = true;
  rows.push([label, fg, bg, `${r.toFixed(2)}:1`, `${min}:1`, ok ? 'PASS' : 'FAIL']);
}

for (const theme of ['light', 'dark']) {
  const t = tokens[theme];
  for (const surface of ['bg', 'raised', 'sunken']) {
    check(`${theme}: body text on ${surface}`, t.text, t[surface], 4.5);
    check(`${theme}: muted text on ${surface}`, t.muted, t[surface], 4.5);
  }
  check(`${theme}: link/accent text on bg`, t.accent, t.bg, 4.5);
  check(`${theme}: link/accent text on raised`, t.accent, t.raised, 4.5);
  check(`${theme}: button label on accent`, t.accentContrast, t.accent, 4.5);
  check(`${theme}: danger text on bg`, t.danger, t.bg, 4.5);
  check(`${theme}: danger text on raised`, t.danger, t.raised, 4.5);
  check(`${theme}: text on accent-soft (selected segment)`, t.text, t.accentSoft, 4.5);
  check(`${theme}: muted text on accent-soft`, t.muted, t.accentSoft, 4.5);
  check(`${theme}: focus ring vs bg (non-text)`, t.accent, t.bg, 3);
  check(`${theme}: focus ring vs raised (non-text)`, t.accent, t.raised, 3);
}

for (const [name, light, dark] of palette) {
  check(`palette ${name} vs light surfaces (non-text)`, light, tokens.light.raised, 3);
  check(`palette ${name} vs dark surfaces (non-text)`, dark, tokens.dark.raised, 3);
}

const width = Math.max(...rows.map((r) => r[0].length));
for (const [label, fg, bg, r, min, ok] of rows) {
  console.log(`${ok}  ${label.padEnd(width)}  ${fg} on ${bg}  ${r} (needs ${min})`);
}
console.log(`\n${rows.length} checks, ${rows.filter((r) => r[5] === 'FAIL').length} failures`);
process.exit(failed ? 1 : 0);
