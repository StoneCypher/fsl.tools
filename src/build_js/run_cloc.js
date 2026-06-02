/**
 * Runs the two cloc passes (with-tests and without-tests) in parallel.
 *
 * Each pass walks ./src/** with the project's .clocignore exclusions and
 * writes a JSON report. The two output files (report_wt.json and
 * report_nt.json) are independent, so the work parallelizes cleanly.
 *
 * The downstream cloc_report.cjs step that reads both reports stays in
 * the npm script (it must wait for both passes to complete).
 *
 * @example
 *   // Invoked by the `cloc` npm script:
 *   node src/build_js/run_cloc.js
 *   // Writes ./coverage/cloc/report_wt.json (with tests) and
 *   //        ./coverage/cloc/report_nt.json (without tests)
 */

import { spawn } from 'child_process';

const CLOC_BASE_ARGS = ['--quiet', './src/**', '--exclude-list-file=./.clocignore', '--3', '--json'];

const PASSES = [
  { extraArgs: [],                       out: './coverage/cloc/report_wt.json' },
  { extraArgs: ['--exclude-dir=tests'],  out: './coverage/cloc/report_nt.json' },
];

/**
 * Spawn one cloc pass and resolve when it exits cleanly.
 *
 * @param {{ extraArgs: string[], out: string }} pass - The pass configuration
 * @returns {Promise<void>} Resolves on exit code 0, rejects otherwise
 *
 * @throws {Error} If cloc exits non-zero or fails to spawn
 */
/**
 * cloc on Windows ships as a Perl script wrapped by a `.cmd` file. Newer
 * Node refuses to spawn `.cmd` directly (CVE-2024-27980 mitigation) without
 * `shell: true`. Pass the assembled command as a single string so the shell
 * handles it cleanly and DEP0190 doesn't fire — all arguments here are
 * hardcoded literals, so there is no injection surface.
 */
function runPass({ extraArgs, out }) {
  const args = [...CLOC_BASE_ARGS, ...extraArgs, `--out=${out}`];
  const cmd = `cloc ${args.join(' ')}`;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`cloc failed for ${out} (exit ${code})`));
    });
  });
}

async function main() {
  await Promise.all(PASSES.map(runPass));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
