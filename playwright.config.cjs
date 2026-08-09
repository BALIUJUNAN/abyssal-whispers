const { defineConfig } = require('@playwright/test');

// CI always receives a previously-built dist artifact. Test that exact output
// instead of starting the development server, so broken release packaging is
// caught before deployment. Local runs keep the faster HMR development flow.
const testBuiltArtifact = Boolean(process.env.CI || process.env.TEST_BUILT_ARTIFACT);
const testPort = testBuiltArtifact ? 4173 : 3000;

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.cjs',
  timeout: 60000,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['line']] : 'list',
  use: {
    baseURL: 'http://localhost:' + testPort,
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
  // Auto-start the production preview in CI and the dev server locally.
  webServer: {
    command: testBuiltArtifact
      ? 'npm run preview -- --host 127.0.0.1 --port 4173'
      : 'npm run dev',
    url: 'http://localhost:' + testPort,
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
