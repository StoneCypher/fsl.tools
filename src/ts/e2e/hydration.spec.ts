import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';

/**
 * Hydration test for the fsl.tools homepage.
 *
 * Serves the pre-built `docs/` directory via servehere and verifies that:
 * - The page loads and the React app hydrates without console errors.
 * - The hero heading containing "unrepresentable" is visible.
 * - The package-manager tab switcher is interactive: clicking "pnpm" reveals
 *   the correct install command.
 * - No hydration-mismatch console errors are reported (the critical assertion).
 *
 * The server is spun up in beforeAll and torn down in afterAll so the test is
 * self-contained and does not require any external harness.
 *
 * @example
 *   // Run only this spec:
 *   npm run verify_site
 *
 * @see src/fsl.tools/site/components/ for the component source
 */

const PORT = 14321;
const BASE = `http://localhost:${PORT}`;
const PAGE_PATH = '/fsl.tools/en/';

let server: ChildProcess;

test.beforeAll(async () => {
  // servehere -d docs -p PORT — serves the docs/ directory on PORT
  server = spawn(
    'npx',
    ['servehere', '-d', 'docs', '-p', String(PORT), '--silent'],
    { shell: true, stdio: 'ignore' }
  );

  // Poll until the server is ready, up to 10 seconds.
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`${BASE}${PAGE_PATH}`);
      if (r.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`static server did not start on port ${PORT} within 10 s`);
});

test.afterAll(() => {
  server?.kill();
});

test('homepage hydrates without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'networkidle' });

  // Hero h1 must contain the word "unrepresentable".
  await expect(page.getByRole('heading', { name: /unrepresentable/i })).toBeVisible();

  // Clicking the "pnpm" tab must show the pnpm install command.
  await page.getByRole('button', { name: 'pnpm', exact: true }).click();
  await expect(page.locator('text=pnpm add -D jssm')).toBeVisible();

  // The critical assertion: no React hydration-mismatch errors.
  const hydrationErrors = errors.filter(e => /hydrat|did not match|mismatch/i.test(e));
  expect(hydrationErrors, `Hydration errors:\n${hydrationErrors.join('\n')}`).toHaveLength(0);
});
