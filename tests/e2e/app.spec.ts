import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'interview.vtt');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoAxeViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, `axe violations on ${context}`).toEqual([]);
}

/** Create a project and add the fixture transcript, landing on the coding view. */
async function setUpProject(page: Page, name: string): Promise<void> {
  await page.goto('./');
  await page.getByLabel('Project name').fill(name);
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await page.getByLabel('Transcript file (required)').setInputFiles(FIXTURE);
  await page.getByRole('button', { name: 'Add document' }).click();
  await expect(page.getByRole('listbox', { name: 'Transcript' })).toBeVisible();
}

async function createCode(page: Page, name: string, parentLabel?: string): Promise<void> {
  await page.getByRole('button', { name: 'New code…' }).click();
  const dialog = page.getByRole('dialog', { name: /New code/ });
  await dialog.getByLabel('Code name').fill(name);
  if (parentLabel) await dialog.getByLabel('Parent code').selectOption({ label: parentLabel });
  await dialog.getByRole('button', { name: 'Create code' }).click();
}

test('home screen is accessible and states the privacy promise', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Qually' })).toBeVisible();
  await expect(page.getByText('All study data stays in this browser')).toBeVisible();
  await expectNoAxeViolations(page, 'home');
});

test('project screen is accessible', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Project name').fill('Axe project screen');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Axe project screen' })).toBeVisible();
  await expectNoAxeViolations(page, 'project view');
});

test('coding view is accessible, including dialogs', async ({ page }) => {
  await setUpProject(page, 'Axe coding view');
  await expectNoAxeViolations(page, 'coding view');

  await page.getByRole('button', { name: 'New code…' }).click();
  await expect(page.getByRole('dialog', { name: 'New code' })).toBeVisible();
  await expectNoAxeViolations(page, 'new code dialog');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expectNoAxeViolations(page, 'shortcuts dialog');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Settings…' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expectNoAxeViolations(page, 'settings dialog');
  await page.keyboard.press('Escape');
});

test('coding view is accessible in dark theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await setUpProject(page, 'Axe dark theme');
  await createCode(page, 'Emotion');
  await expectNoAxeViolations(page, 'coding view (dark)');
});

test('transcript listbox announces codes, timestamp, speaker and text', async ({ page }) => {
  await setUpProject(page, 'Announcements');
  const listbox = page.getByRole('listbox', { name: 'Transcript' });
  const first = listbox.getByRole('option').first();

  // Before coding: timestamp, speaker, text — no code prefix.
  await expect(first).toHaveAttribute(
    'aria-label',
    '00:00:12, Participant 3, I want a new button here, that would really improve the feature',
  );

  await createCode(page, 'Emotion');
  await createCode(page, 'positive', 'Emotion');

  // Clicking a tree item assigns it to the selected (first) segment.
  const tree = page.getByRole('tree', { name: 'Code tree' });
  await tree.getByRole('treeitem', { name: 'positive' }).click();
  await expect(tree.getByRole('treeitem', { name: 'positive' })).toHaveAttribute('aria-checked', 'true');
  await expect(first).toHaveAttribute(
    'aria-label',
    'Emotion: positive, 00:00:12, Participant 3, I want a new button here, that would really improve the feature',
  );

  // Announce-colors setting appends the color name (first code gets brick red).
  await page.getByRole('button', { name: 'Settings…' }).click();
  await page.getByRole('checkbox', { name: 'Announce code colors' }).check();
  await page.keyboard.press('Escape');
  await expect(first).toHaveAttribute('aria-label', /Emotion: positive \(brick red\),/);
});

test('listbox keyboard navigation moves selection and coding follows it', async ({ page }) => {
  await setUpProject(page, 'Keyboard nav');
  await createCode(page, 'Frustration');

  const listbox = page.getByRole('listbox', { name: 'Transcript' });
  const options = listbox.getByRole('option');
  await options.first().click();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(options.nth(3)).toBeFocused();

  // Assign via keyboard from the tree: Enter toggles for the selected segment.
  const item = page.getByRole('treeitem', { name: 'Frustration' });
  await item.focus();
  await page.keyboard.press('Enter');
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await expect(options.nth(3)).toHaveAttribute('aria-label', /^Frustration, 00:00:24/);
  await page.keyboard.press('Enter');
  await expect(item).toHaveAttribute('aria-checked', 'false');
});

test('code tree supports nesting, editing and deletion with subtree cleanup', async ({ page }) => {
  await setUpProject(page, 'Tree management');
  await createCode(page, 'Emotion');
  await createCode(page, 'positive', 'Emotion');
  await createCode(page, 'excitement', 'Emotion: positive');

  const tree = page.getByRole('tree', { name: 'Code tree' });
  await expect(tree.getByRole('treeitem', { name: 'excitement' })).toBeVisible();
  const excitement = tree.getByRole('treeitem', { name: 'excitement' });
  await expect(excitement).toHaveAttribute('aria-level', '3');

  // Assign the level-3 code: the option label shows the full path.
  await excitement.click();
  const first = page.getByRole('listbox', { name: 'Transcript' }).getByRole('option').first();
  await expect(first).toHaveAttribute('aria-label', /^Emotion: positive: excitement,/);

  // Edit: rename via the visible button.
  await excitement.focus();
  await page.getByRole('button', { name: 'Edit code excitement' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit code' });
  await editDialog.getByLabel('Code name').fill('joy');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(first).toHaveAttribute('aria-label', /^Emotion: positive: joy,/);

  // Delete the top-level code: subtree and assignments disappear.
  await tree.getByRole('treeitem', { name: 'Emotion' }).focus();
  await page.getByRole('button', { name: 'Delete code Emotion' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete code' }).click();
  await expect(tree.getByRole('treeitem')).toHaveCount(0);
  await expect(first).toHaveAttribute('aria-label', /^00:00:12,/);
});

test('work persists across a reload and can be exported', async ({ page }) => {
  await setUpProject(page, 'Persistence check');
  await createCode(page, 'Feature');
  await page.getByRole('treeitem', { name: 'Feature' }).click();
  await page.waitForTimeout(700); // allow the debounced autosave to flush

  await page.reload();
  await expect(page.getByRole('listbox', { name: 'Transcript' })).toBeVisible();
  const first = page.getByRole('listbox', { name: 'Transcript' }).getByRole('option').first();
  await expect(first).toHaveAttribute('aria-label', /^Feature, 00:00:12/);

  // Export from the project screen.
  await page.getByRole('link', { name: '← Persistence check' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export project file' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/Persistence-check\.qually\.json/);
});

test('single-letter shortcuts can be disabled (WCAG 2.1.4)', async ({ page }) => {
  await setUpProject(page, 'Shortcut setting');
  await createCode(page, 'Emotion');

  await page.getByRole('button', { name: 'Settings…' }).click();
  await page.getByRole('checkbox', { name: 'Single-letter shortcuts' }).uncheck();
  await page.keyboard.press('Escape');

  // With singles off, pressing C in the listbox must NOT move focus to the tree.
  const first = page.getByRole('listbox', { name: 'Transcript' }).getByRole('option').first();
  await first.click();
  await page.keyboard.press('c');
  await expect(first).toBeFocused();
});
