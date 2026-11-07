import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { config, runDir } from '../shared/config';

const out = runDir();

export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  outputDir: path.join(out, 'web', 'artifacts'),
  fullyParallel: false,
  workers: 1,
  retries: 0, // scenarios are stateful and create records; re-runs are explicit (see README: safe re-runs)
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(out, 'web', 'playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(out, 'web', 'playwright-results.json') }],
  ],
  use: {
    baseURL: config.webBaseUrl,
    viewport: { width: 430, height: 932 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
  },
});
