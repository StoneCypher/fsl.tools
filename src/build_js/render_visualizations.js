/**
 * Renders all four rollup-visualizer HTML pages to PNG using a single
 * Playwright browser shared across the four conversions.
 *
 * Previously this script spawned one html_to_png.js child process per
 * visualization (parallel, but four browser launches). That paid the
 * full Playwright startup cost four times — ~2–5 seconds each on cold
 * cache. This version launches Chromium once, opens four pages on the
 * same browser instance in parallel, screenshots each, then closes.
 *
 * The html_to_png.js CLI is unchanged — it remains the right tool for
 * one-off conversions; this driver is purpose-built for the four-pack
 * that the build needs.
 *
 * @example
 *   // Invoked by the `viz_png` npm script:
 *   node src/build_js/render_visualizations.js
 *   // Saves build/rollup/visualizations/bundle_{sunburst,treemap,network,flamegraph}.png
 */

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIZ_DIR = join(__dirname, '..', '..', 'build', 'rollup', 'visualizations');
const WIDTH = 768;
const HEIGHT = 480;
const VISUALIZATIONS = ['sunburst', 'treemap', 'network', 'flamegraph'];

/**
 * Render one visualization on a fresh page from a shared browser.
 *
 * Mirrors the sidebar-hiding tweak from html_to_png.js so the PNG matches
 * the layout produced by single-file conversions of the same HTML.
 *
 * @param {import('playwright').Browser} browser - The shared Chromium instance
 * @param {string} name - The visualization name (e.g., "sunburst")
 * @returns {Promise<void>} Resolves once the PNG has been written
 */
async function renderOne(browser, name) {
  const url = pathToFileURL(join(VIZ_DIR, `bundle_${name}.html`)).href;
  const out = join(VIZ_DIR, `bundle_${name}.png`);
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const style = document.querySelector('style');
      if (style) {
        style.textContent = style.textContent + '\n.sidebar { display: none !important; }';
      }
    });
    await page.screenshot({ path: out, fullPage: true });
    console.log(`Saved ${out}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    await Promise.all(VISUALIZATIONS.map(name => renderOne(browser, name)));
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
