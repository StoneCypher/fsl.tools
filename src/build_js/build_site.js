/**
 * Builds the fsl.tools homepage with no CDN dependency: bundles the React
 * app twice — once for Node to prerender static HTML via renderToString,
 * once for the browser to hydrate — then fills the HTML template. React and
 * ReactDOM are bundled in; nothing is fetched at runtime.
 *
 * Output (build dir, copied to docs/ later by assemble_site.js):
 *   build/site/app-<hash>.js (+ .map)   client hydration bundle
 *   build/site/index.html                prerendered homepage
 *
 * @example
 *   node src/build_js/build_site.js
 */
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SITE = join(ROOT, 'src', 'fsl.tools', 'site');
const OUT  = join(ROOT, 'build', 'site');       // shipped: index.html + app-<hash>.js (+ .map)
const SSR  = join(ROOT, 'build', 'site-ssr');   // temp: server bundle, never shipped

const BUILT_DATE = new Date().toISOString().slice(0, 10);
const DEFINE = { __BUILT_DATE__: JSON.stringify(BUILT_DATE) };

async function prerender() {
  // Bundle the server entry to a CJS file, require it, call render().
  const serverFile = join(SSR, 'server.cjs');
  await esbuild.build({
    entryPoints: [join(SITE, 'entry.server.jsx')],
    bundle: true, outfile: serverFile, format: 'cjs', platform: 'node',
    jsx: 'automatic', define: DEFINE,
  });
  delete require.cache[serverFile];
  const { render } = require(serverFile);
  const html = render();
  if (!html || html.length < 100) throw new Error('prerender produced empty HTML');
  return html;
}

async function clientBundle() {
  const result = await esbuild.build({
    entryPoints: { app: join(SITE, 'entry.client.jsx') },
    bundle: true, minify: true, sourcemap: true, format: 'esm',
    jsx: 'automatic', define: DEFINE,
    outdir: OUT, entryNames: '[name]-[hash]', metafile: true,
  });
  const jsOut = Object.keys(result.metafile.outputs).find(f => f.endsWith('.js'));
  if (!jsOut) throw new Error('client bundle produced no .js');
  return basename(jsOut);
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  rmSync(SSR, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SSR, { recursive: true });

  const [html, scriptName] = await Promise.all([prerender(), clientBundle()]);

  const tpl = readFileSync(join(SITE, 'index.html.tpl'), 'utf8');
  const page = tpl.replace('{{PRERENDER}}', html).replace('{{SCRIPT}}', scriptName);
  if (/unpkg\.com|fonts\.googleapis/.test(page)) throw new Error('CDN reference in output');
  writeFileSync(join(OUT, 'index.html'), page);

  rmSync(SSR, { recursive: true, force: true });  // drop the SSR bundle so it is never copied to docs/
  console.log(`[site] prerendered homepage + ${scriptName} (built ${BUILT_DATE}) -> build/site/`);
}

main().catch(err => { console.error('[site] FAILED:', err.message); process.exit(1); });
