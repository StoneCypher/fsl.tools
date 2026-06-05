/**
 * Assembles the built fsl.tools site into docs/. Copies the prerendered
 * homepage + client bundle + per-language stylesheet + static cookbook into
 * docs/fsl.tools/en/, the self-hosted fonts into the shared docs/fsl.tools/
 * assets/ dir, and writes a redirect at docs/index.html. Asserts the result
 * is CDN-free and complete (the build-output smoke test). Run after
 * make_cookbook + make_site.
 *
 * @example
 *   node src/build_js/assemble_site.js
 */
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SITE = join(ROOT, 'src', 'fsl.tools', 'site');
const BUILT = join(ROOT, 'build', 'site');
const DOCS = join(ROOT, 'docs');
const FSL = join(DOCS, 'fsl.tools');
const EN = join(FSL, 'en');

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function main() {
  assert(existsSync(join(BUILT, 'index.html')), 'run make_site first (build/site/index.html missing)');
  assert(existsSync(join(SITE, 'cookbook', 'index.html')), 'run make_cookbook first (cookbook/index.html missing)');

  // Wipe the language dir first so stale hashed bundles (app-<hash>.js) from a
  // prior incremental run never linger alongside the current one.
  rmSync(EN, { recursive: true, force: true });
  mkdirSync(EN, { recursive: true });
  mkdirSync(join(FSL, 'assets', 'fonts'), { recursive: true });

  // Shared, language-agnostic assets (one copy, above the languages).
  cpSync(join(SITE, 'assets'), join(FSL, 'assets'), { recursive: true });

  // Per-language: prerendered homepage + client bundle + stylesheet + cookbook.
  cpSync(BUILT, EN, { recursive: true });                                   // index.html, app-*.js, *.map
  cpSync(join(SITE, 'colors_and_type.css'), join(EN, 'colors_and_type.css'));
  cpSync(join(SITE, 'cookbook'), join(EN, 'cookbook'), { recursive: true });

  // Apex redirect at the bucket root. docs/fsl.tools/ is what gets deployed to
  // S3 (its contents — en/ and assets/ — become the bucket root), so this
  // index.html is what fsl.tools/ resolves to. It bounces to the language root.
  writeFileSync(join(FSL, 'index.html'),
`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0; url=en/"/>
  <link rel="canonical" href="en/"/>
  <title>fsl.tools</title>
</head>
<body><p>Redirecting to <a href="en/">en/</a>…</p></body>
</html>
`);

  // Redirect at the docs/ root too, for serving the docs/ tree directly (e.g.
  // GitHub Pages) where the site lives under /fsl.tools/en/.
  writeFileSync(join(DOCS, 'index.html'),
`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="refresh" content="0; url=fsl.tools/en/"/>
  <link rel="canonical" href="fsl.tools/en/"/>
  <title>fsl.tools</title>
</head>
<body><p>Redirecting to <a href="fsl.tools/en/">fsl.tools/en/</a>…</p></body>
</html>
`);

  // Build-output smoke test.
  const homepage = readFileSync(join(EN, 'index.html'), 'utf8');
  assert(!/unpkg\.com|fonts\.googleapis|text\/babel/.test(homepage), 'CDN/babel reference in docs homepage');
  assert(/<div id="root">[\s\S]{100,}?<\/div>\s*<script/.test(homepage), 'docs homepage #root not prerendered');
  assert(readdirSync(EN).some(f => /^app-.*\.js$/.test(f)), 'no client bundle in docs/fsl.tools/en');
  assert(readdirSync(join(FSL, 'assets', 'fonts')).filter(f => f.endsWith('.woff2')).length === 6, 'expected 6 woff2 in shared assets');
  const manifest = JSON.parse(readFileSync(join(EN, 'cookbook', 'manifest.json'), 'utf8'));
  const recipeCount = readdirSync(join(SITE, 'recipes')).filter(f => f.endsWith('.cjs')).length;
  assert(manifest.count === recipeCount, `cookbook count ${manifest.count} != recipes ${recipeCount}`);
  assert(/url=en\//.test(readFileSync(join(FSL, 'index.html'), 'utf8')), 'apex redirect (docs/fsl.tools/index.html) missing or wrong');

  console.log(`[assemble] docs/fsl.tools (apex redirect + en/ homepage + ${manifest.count} recipes + shared assets)`);
}

main();
