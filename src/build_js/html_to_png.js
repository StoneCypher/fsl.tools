/**
 * Converts an HTML page to a PNG image using Playwright.
 *
 * Accepts a URL (http/https) or a local file path, along with viewport
 * dimensions, and saves a full-page screenshot as a PNG.
 *
 * @example
 *   // Capture a remote page at 1280x720:
 *   node src/build_js/html_to_png.js --width 1280 --height 720 --url https://example.com --out screenshot.png
 *
 * @example
 *   // Capture a local HTML file at 800x600:
 *   node src/build_js/html_to_png.js --width 800 --height 600 --url ./docs/index.html --out output.png
 *
 * @example
 *   // Minimal usage (defaults to 1280x800, output to screenshot.png):
 *   node src/build_js/html_to_png.js --url ./docs/index.html
 */

import { chromium } from 'playwright';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';

/**
 * Parse command-line arguments into a key-value map.
 *
 * Expects pairs of `--key value`. Flags without a value are set to `"true"`.
 *
 * @param {string[]} argv - The raw process.argv slice (from index 2 onward)
 * @returns {Record<string, string>} Parsed argument map
 *
 * @example
 *   parseArgs(['--width', '800', '--height', '600', '--url', 'index.html'])
 *   // => { width: '800', height: '600', url: 'index.html' }
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = 'true';
      }
    }
  }
  return args;
}

/**
 * Resolve a URL string to a navigable address.
 *
 * If the input looks like a local file path (not starting with http:// or
 * https://), it is resolved to an absolute path and converted to a file:// URL.
 * Throws if the resolved local file does not exist.
 *
 * @param {string} input - A URL or local file path
 * @returns {string} A navigable URL (http://, https://, or file://)
 *
 * @throws {Error} If a local file path does not exist on disk
 *
 * @example
 *   resolveUrl('https://example.com')
 *   // => 'https://example.com'
 *
 * @example
 *   resolveUrl('./docs/index.html')
 *   // => 'file:///C:/Users/.../docs/index.html'
 */
function resolveUrl(input) {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }
  const absolute = resolve(input);
  if (!existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`);
  }
  return pathToFileURL(absolute).href;
}

/**
 * Capture a screenshot of a web page and save it as a PNG.
 *
 * @param {object} options
 * @param {string} options.url - The navigable URL (http, https, or file)
 * @param {number} options.width - Viewport width in pixels
 * @param {number} options.height - Viewport height in pixels
 * @param {string} options.out - Output file path for the PNG
 * @returns {Promise<void>}
 *
 * Before capturing, appends `.sidebar { display: none !important; }` to
 * the first `<style>` element to hide sidebar UI in visualizations.
 *
 * @example
 *   await capture({ url: 'https://example.com', width: 1280, height: 800, out: 'shot.png' });
 *   // Saves shot.png to disk (with sidebar hidden)
 */
async function capture({ url, width, height, out }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const style = document.querySelector('style');
    if (style) {
      style.textContent = style.textContent + '\n.sidebar { display: none !important; }';
    }
  });
  await page.screenshot({ path: out, fullPage: true });

  await browser.close();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    console.error('Usage: node html_to_png.js --url <url-or-path> [--width N] [--height N] [--out file.png]');
    process.exitCode = 1;
    return;
  }

  const width = parseInt(args.width || '1280', 10);
  const height = parseInt(args.height || '800', 10);
  const out = args.out || 'screenshot.png';
  const url = resolveUrl(args.url);

  console.log(`Capturing ${url} at ${width}x${height} -> ${out}`);
  await capture({ url, width, height, out });
  console.log(`Saved ${out}`);
}

main();
