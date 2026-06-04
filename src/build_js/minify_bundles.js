/**
 * Minifies the three Rollup output bundles (ESM, CJS, IIFE) in parallel using terser's Node API.
 *
 * Replaces the previous three-stage serial terser CLI chain. Each bundle is an
 * independent input/output pair with its own source map, so the work parallelizes
 * cleanly via Promise.all.
 *
 * Reads from build/rollup/index.{mjs,cjs,iife.js} (+ matching .map files) and
 * writes to dist/index.{mjs,cjs,iife.js} (+ matching .map files). The output
 * source maps preserve the input maps' content so debuggers can trace minified
 * code back through Rollup all the way to the original TypeScript source.
 *
 * @example
 *   // Invoked by the `terser` npm script:
 *   node src/build_js/minify_bundles.js
 *   // Writes the three minified bundles + source maps into dist/
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { minify } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const BUILD_ROLLUP = join(PROJECT_ROOT, 'build', 'rollup');
const DIST = join(PROJECT_ROOT, 'dist');

const BUNDLES = [
  { name: 'index.mjs' },
  { name: 'index.cjs' },
  { name: 'index.iife.js' },
];

/**
 * Minify one Rollup bundle and write the minified code + source map to dist/.
 *
 * @param {{ name: string }} bundle - The bundle filename (relative to build/rollup and dist)
 * @returns {Promise<void>} Resolves once both output files are written
 *
 * @throws {Error} If terser reports an error or no code is produced
 */
async function minifyOne({ name }) {
  const inputPath = join(BUILD_ROLLUP, name);
  const inputMapPath = `${inputPath}.map`;
  const outputPath = join(DIST, name);
  const outputMapPath = `${outputPath}.map`;

  const [code, mapContent] = await Promise.all([
    readFile(inputPath, 'utf8'),
    readFile(inputMapPath, 'utf8'),
  ]);

  const result = await minify(code, {
    sourceMap: {
      content: mapContent,
      url: `${name}.map`,
    },
  });

  if (result.code == null) throw new Error(`terser produced no code for ${name}`);

  await Promise.all([
    writeFile(outputPath, result.code, 'utf8'),
    writeFile(outputMapPath, result.map, 'utf8'),
  ]);
}

async function main() {
  await Promise.all(BUNDLES.map(minifyOne));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
