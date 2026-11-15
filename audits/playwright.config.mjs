// Playwright suite for Decode by Cense. Runs against the app's production build on port 3208, started by
// lib/serve-with-mock.mjs with its Anthropic SDK pointed at a local stand-in for the API (lib/mock-anthropic.mjs),
// so the real route, SDK and normalizer run and no test spends money. Build first: npm run build --prefix ..
//
// AUDIT_URL points the suite at another server instead (a preview deployment, say). Tests that need the
// stand-in API skip themselves there.
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.AUDIT_PORT || 3208);
const baseURL = process.env.AUDIT_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  // The laptop is shared with other work, so keep the load modest.
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'results/latest/playwright.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: process.env.AUDIT_URL
    ? undefined
    : {
        command: `node lib/serve-with-mock.mjs --port ${PORT}`,
        url: baseURL,
        // Never reuse: a server started some other way would not be wired to the stand-in API.
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
