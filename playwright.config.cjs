const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.cjs',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    // Local development can reuse an installed Chromium-compatible browser;
    // CI leaves this unset and uses the Playwright-managed Chromium binary.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
  },
  // Auto-start dev server for E2E tests
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    env: { ...process.env, BROWSER: 'none' },
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
