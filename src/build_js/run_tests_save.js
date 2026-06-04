import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Runs both the unit and stochastic test suites with coverage and saves
 * the combined output to a single file.
 *
 * Each test set is run with its own vitest config and written under a
 * labeled section header so that downstream consumers (e.g. update_madlibs)
 * can parse results for each set independently.
 *
 * The output file uses the following section markers:
 *   === UNIT TESTS ===        – deterministic specs (*.spec.ts)
 *   === STOCHASTIC TESTS ===  – property-based tests (*.stoch.ts)
 *
 * @example
 *   // In package.json scripts:
 *   "just_test_save": "node src/build_js/run_tests_save.js"
 *
 *   // Produces build/test_output.txt which update_madlibs.js reads
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const outputPath  = join(projectRoot, 'build', 'test_output.txt');

/**
 * Runs a single vitest invocation and returns its stdout.
 *
 * @param {string} command - The shell command to execute.
 * @returns {{ output: string, failed: boolean, status: number | null, stderr: string }}
 *   The captured stdout, whether the run failed, and any stderr.
 *
 * @example
 *   const result = runTestSet('npx vitest run --coverage');
 *   // result.output  → full vitest stdout
 *   // result.failed  → false when all tests pass
 */
function runTestSet(command) {
  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    return { output, failed: false, status: 0, stderr: '' };
  } catch (error) {
    return {
      output: error.stdout || '',
      failed: true,
      status: error.status || 1,
      stderr: error.stderr || ''
    };
  }
}

const unitResult  = runTestSet('npx vitest run --coverage');
const stochResult = runTestSet('npx vitest run --config vitest-stoch.config.ts --coverage');

const combined = [
  '=== UNIT TESTS ===',
  unitResult.output,
  '',
  '=== STOCHASTIC TESTS ===',
  stochResult.output
].join('\n');

mkdirSync(join(projectRoot, 'build'), { recursive: true });
writeFileSync(outputPath, combined, 'utf8');
process.stdout.write(combined);

// If either test set failed, forward stderr and exit with a failure code.
if (unitResult.failed || stochResult.failed) {
  if (unitResult.stderr)  process.stderr.write(unitResult.stderr);
  if (stochResult.stderr) process.stderr.write(stochResult.stderr);
  process.exit(unitResult.status || stochResult.status || 1);
}
