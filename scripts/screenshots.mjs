#!/usr/bin/env node
/**
 * Capture review screenshots of every screen and state, light and dark.
 * Used for the expert design review in docs/design-review.md.
 * Usage: node scripts/screenshots.mjs [outDir]  (requires `npm run preview` running)
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.argv[2] ?? path.join(here, '..', 'screenshots');
const fixture = path.join(here, '..', 'tests', 'e2e', 'fixtures', 'interview.vtt');
const base = 'http://localhost:4173/sk-qually/';
fs.mkdirSync(outDir, { recursive: true });

const executablePath = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const shot = async (name) => {
  // Repeated test clicks can leave a text selection that pollutes the capture.
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
};

async function createCode(name, parentLabel) {
  await page.getByRole('button', { name: 'New code…' }).click();
  await page.getByLabel('Code name').fill(name);
  if (parentLabel) await page.getByLabel('Parent code').selectOption({ label: parentLabel });
  await page.getByRole('button', { name: 'Create code' }).click();
}

await page.goto(base);
await shot('01-home-empty');

await page.getByLabel('Project name').fill('Interview study spring 2026');
await page.getByRole('button', { name: 'Create project' }).click();
await page.getByRole('heading', { level: 1, name: 'Interview study spring 2026' }).waitFor();
await shot('02-project-empty');

await page.getByLabel('Transcript file (required)').setInputFiles(fixture);
await page.getByLabel('Title (optional, defaults to the file name)').fill('Interview 1 — Participant 3');
await page.getByRole('button', { name: 'Add document' }).click();
await page.getByRole('listbox', { name: 'Transcript' }).waitFor();

await createCode('Emotion');
await createCode('positive', 'Emotion');
await createCode('frustration', 'Emotion');
await createCode('Feature');
await createCode('new feature request', 'Feature');
await createCode('discoverability', 'Feature');

const tree = page.getByRole('tree', { name: 'Code tree' });
const options = page.getByRole('listbox', { name: 'Transcript' }).getByRole('option');
await options.first().click();
await tree.getByRole('treeitem', { name: 'positive' }).click();
await tree.getByRole('treeitem', { name: 'new feature request' }).click();
await options.nth(2).click();
await tree.getByRole('treeitem', { name: 'discoverability' }).click();
await options.nth(3).click();
await tree.getByRole('treeitem', { name: 'frustration' }).click();
await options.first().click();
await shot('03-coding-light');

await page.keyboard.press('?');
await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).waitFor();
await shot('04-shortcuts-dialog');
await page.keyboard.press('Escape');

await page.getByRole('button', { name: 'New code…' }).click();
await page.getByRole('dialog', { name: 'New code' }).waitFor();
await shot('05-code-dialog');
await page.keyboard.press('Escape');

await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(300); // let background transitions settle
await shot('06-coding-dark');
await page.getByRole('button', { name: 'Settings…' }).click();
await shot('07-settings-dark');
await page.keyboard.press('Escape');

await page.getByRole('link', { name: /Interview study/ }).click();
await page.getByRole('heading', { level: 1, name: 'Interview study spring 2026' }).waitFor();
await shot('08-project-dark');
await page.emulateMedia({ colorScheme: 'light' });
await page.goto(base + '#/');
await page.reload();
await page.getByRole('heading', { level: 1, name: 'Qually' }).waitFor();
await shot('09-home-with-project');

await browser.close();
console.log(`Screenshots written to ${outDir}`);
