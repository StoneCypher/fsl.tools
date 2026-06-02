import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Starts a local servehere instance, runs Playwright e2e tests against it,
 * then tears the server down.
 *
 * The server is configured to serve from `docs/` on port 15512 with CORS
 * headers enabled and the haltroute (`/z-terminate`) active so that it can
 * be shut down cleanly from any platform.
 *
 * @example
 *   // In package.json scripts:
 *   "hosted_test": "node src/build_js/hosted_test.js"
 *
 *   // Starts servehere on http://localhost:15512, runs e2e tests, stops server
 *
 * @example
 *   // Successful run:
 *   // "Waiting for servehere on http://localhost:15512..."
 *   // "Server is ready."
 *   // (playwright test output)
 *   // "Server shut down."
 *
 * @example
 *   // When tests fail:
 *   // "Waiting for servehere on http://localhost:15512..."
 *   // "Server is ready."
 *   // (playwright test output with failures)
 *   // "Server shut down."
 *   // process exits with code 1
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

const PORT = 15512;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Poll a URL until it responds or the attempt limit is reached.
 *
 * @param {string} url - The URL to poll
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} intervalMs - Milliseconds between attempts
 * @returns {Promise<void>} Resolves when the server responds
 * @throws {Error} If the server does not respond within the attempt limit
 */
async function waitForServer(url, maxAttempts = 30, intervalMs = 200) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error(`Server at ${url} did not respond after ${maxAttempts} attempts`);
}

/**
 * Send the haltroute request to shut down the servehere instance.
 *
 * @param {string} baseUrl - The base URL of the running server
 * @returns {Promise<void>}
 */
async function haltServer(baseUrl) {
  try {
    await fetch(`${baseUrl}/z-terminate`);
  } catch {
    // Server may close the connection before responding — that's fine
  }
}

async function main() {

  // Resolve servehere's bin entry directly so we can spawn node without a
  // shell wrapper.  This avoids Windows libuv cleanup issues with shell: true.
  const require = createRequire(import.meta.url);
  const servehereDir = dirname(require.resolve('servehere/package.json'));
  const servehereBin = join(servehereDir, 'src', 'js', 'index.js');

  const server = spawn(process.execPath, [servehereBin, '-p', String(PORT), '-c', '-d', 'docs', '-z', '-s'], {
    cwd: projectRoot,
    stdio: 'ignore'
  });

  let testFailed = false;

  try {
    console.log(`Waiting for servehere on ${BASE_URL}...`);
    await waitForServer(BASE_URL);
    console.log('Server is ready.');

    execSync('npx playwright test src/ts/e2e', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, BASE_URL }
    });
  } catch (error) {
    testFailed = true;
    if (error.status != null) {
      console.error(`Playwright exited with code ${error.status}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  } finally {
    await haltServer(BASE_URL);

    // Wait for the server process to exit cleanly after the haltroute.
    // If it hasn't closed after 2 seconds, force-kill it.
    const closed = await new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 2000);
      server.on('close', () => { clearTimeout(timeout); resolve(true); });
    });

    if (!closed) {
      try { server.kill(); } catch { /* already dead */ }
      // Wait briefly for the kill to take effect
      await new Promise(resolve => server.on('close', resolve));
    }

    console.log('Server shut down.');
  }

  process.exitCode = testFailed ? 1 : 0;
}

main();
