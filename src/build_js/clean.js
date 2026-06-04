/**
 * Wipes and recreates all build output directories in parallel.
 *
 * Replaces the previous npm `clean` script's serial `cd && rimraf && mkdir`
 * chain, which on Windows ran through a shell-emulation layer that made
 * each `cd` and `mkdir` slow and the script hard to read.
 *
 * The operation runs in three phases:
 *   1. Wipe the six top-level dirs in parallel (they are siblings, no nesting)
 *   2. Re-create the required leaves in parallel (with recursive:true so
 *      intermediate parents like `build/rollup` are created)
 *   3. Remove the four root-level bundle PNGs in parallel
 *
 * Splitting wipe from create avoids the race where one parallel task
 * wipes a parent while another tries to create its child.
 *
 * @example
 *   // Invoked by the `clean` npm script:
 *   node src/build_js/clean.js
 *   // Wipes src/ts/generated_code, build, dist, docs, coverage-typedoc,
 *   // recreates the required subdirs, and removes bundle_*.png at root.
 */

import { rm, mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

const TOP_LEVEL_WIPES = [
  'src/ts/generated_code',
  'build',
  'dist',
  'docs',
  'coverage-typedoc',
];

const LEAVES_TO_CREATE = [
  'src/ts/generated_code',
  'build/rollup/visualizations',
  'dist',
  'docs/dist',
  'docs/docs',
  'coverage-typedoc',
];

const FILES_TO_REMOVE = [
  'bundle_sunburst.png',
  'bundle_treemap.png',
  'bundle_network.png',
  'bundle_flamegraph.png',
];

const abs = relPath => join(PROJECT_ROOT, relPath);

async function main() {
  await Promise.all(TOP_LEVEL_WIPES.map(p => rm(abs(p), { recursive: true, force: true })));
  await Promise.all(LEAVES_TO_CREATE.map(p => mkdir(abs(p), { recursive: true })));
  await Promise.all(FILES_TO_REMOVE.map(p => rm(abs(p), { force: true })));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
