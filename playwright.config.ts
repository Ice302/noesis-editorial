import { defineConfig, devices } from '@playwright/test';
import { E2E_DB_PATH } from './e2e/constants.ts';

/**
 * End-to-end tests against the production build (`vite build` + `vite preview`),
 * with shared editing backed by a throwaway SQLite file seeded in
 * `e2e/global-setup.ts`.
 *
 * Uses the locally installed Google Chrome (`channel: 'chrome'`) so no browser
 * download is needed. On a CI machine without Chrome, run
 * `npx playwright install chromium` and set PW_CHANNEL=chromium.
 */
const PORT = 4180;
const BASE_URL = `http://localhost:${PORT}`;
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : 'chrome';

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  // Each worker is a full Chrome instance; starting ten at once on a laptop
  // that's also running a browser starved the first wave of tests (8 s just to
  // open a page). Four workers keep the run at ~40 s without the stampede.
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], channel },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      SITE_URL: BASE_URL,
      NOESIS_DB_PATH: E2E_DB_PATH,
    },
  },
});
