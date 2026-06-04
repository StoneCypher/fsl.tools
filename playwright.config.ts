import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for e2e tests.
 *
 * Expects BASE_URL to be set by the test harness (hosted_test.js).
 * Falls back to http://localhost:15512 for local development.
 *
 * @example
 *   // Run via the build script:
 *   node src/build_js/hosted_test.js
 *
 *   // Or manually (with servehere already running):
 *   BASE_URL=http://localhost:15512 npx playwright test src/ts/e2e
 */
export default defineConfig({
  testDir: './src/ts/e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:15512',
  },
});
