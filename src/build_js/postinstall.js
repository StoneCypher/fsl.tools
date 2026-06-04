/**
 * Post-install hook: install Playwright browsers for local development, but
 * skip the (slow, ~12 min) browser download in CI.
 *
 * Playwright is kept as a developer tool — local e2e/hydration tests
 * (`npm run verify_site`) and the build's `viz_png` PNG rendering both launch
 * Chromium via `playwright`. But CI never runs Playwright (the workflow builds
 * the site with `viz_png` disabled and no `verify_site`), so downloading
 * browsers there is pure waste. GitHub Actions sets `CI=true`, which gates the
 * install off.
 *
 * @example
 *   // package.json: "postinstall": "node src/build_js/postinstall.js"
 *   // local `npm install` → installs browsers
 *   // CI    `npm install` → skips (CI=true)
 */

import { execFileSync } from 'child_process';

if (process.env.CI) {
  console.log('[postinstall] CI detected (CI env set) — skipping Playwright browser install');
} else {
  console.log('[postinstall] installing Playwright browsers for local development…');
  // Static argument array (no interpolation). shell:true is needed so `npx`
  // resolves to npx.cmd on Windows; the args are passed as an array, not a
  // shell string, so there is nothing to inject.
  execFileSync('npx', ['playwright', 'install', '--with-deps'], { stdio: 'inherit', shell: true });
}
