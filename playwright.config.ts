import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

// Prefer the environment-provided Chromium when the bundled revision is absent.
const localChromium = '/opt/pw-browsers/chromium';
const executablePath =
  process.env.CI || !fs.existsSync(localChromium) ? undefined : localChromium;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/sk-qually/',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/sk-qually/',
    reuseExistingServer: !process.env.CI,
  },
});
