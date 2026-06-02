/**
 * Build orchestrator: runs the build chain as a sequence of parallel stages.
 *
 * Stages are computed by build_config.js from the cascading JSON config
 * (build.config.json plus optional env/local overlays plus env-var/CLI
 * overrides). Within each stage, scripts run concurrently via
 * `child_process.spawn('npm', ['run', name])`. Stages run serially. If
 * any script in a stage exits non-zero, the build aborts after that
 * stage's remaining work completes and the process exits non-zero.
 *
 * @example
 *   // Invoked by the `build` npm script:
 *   node src/build_js/run_build.js
 *   // With a profile:
 *   node src/build_js/run_build.js --profile=fast
 *   // With per-feature overrides:
 *   node src/build_js/run_build.js --disable=docs,viz_png
 */

import { spawn } from 'child_process';
import { buildPlan } from './build_config.js';

/**
 * Run one npm script and resolve when it exits cleanly.
 *
 * Uses `shell: true` so the cross-platform npm wrapper works on Windows.
 *
 * @param {string} script - The npm script name (e.g., "typescript")
 * @returns {Promise<void>} Resolves on exit 0, rejects otherwise
 */
function runScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(`npm run ${script}`, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${script} failed (exit ${code})`));
    });
  });
}

async function main() {
  const { stages, disabled, warnings } = buildPlan();

  for (const w of warnings) console.warn(`[build] ${w}`);
  if (disabled.length) console.log(`[build] disabled: ${disabled.join(', ')}`);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (!stage.length) continue;
    console.log(`\n=== Stage ${i}: ${stage.join(', ')} ===`);
    await Promise.all(stage.map(runScript));
  }
}

main().catch(err => {
  console.error(`\nBuild failed: ${err.message}`);
  process.exit(1);
});
