# fsl.tools In-Repo Local Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the fsl.tools website (currently in `../jssm/src/fsl.tools/site/`) into this repo as a 100% CDN-free build — homepage prerendered + React-hydrated via esbuild, fonts self-hosted, the static cookbook kept and the legacy SPA cookbook dropped — emitting to `docs/fsl.tools/en/` with shared assets in `docs/fsl.tools/assets/`.

**Architecture:** Source lives under `src/fsl.tools/site/`. A zero-dep Node generator turns `recipes/*.cjs` into static cookbook HTML. An esbuild driver (`src/build_js/build_site.js`) bundles the homepage twice — once for Node to `renderToString` static HTML, once for the browser to `hydrateRoot` — with React 18.3.x bundled in. An assembler (`src/build_js/assemble_site.js`) copies everything into `docs/fsl.tools/`, self-hosted fonts into a shared `assets/` dir, and writes a root redirect. Three new build features wire into the existing stage-based orchestrator (`run_build.js`).

**Tech Stack:** Node ≥18, esbuild, React 18.3.x + ReactDOM 18.3.x, @fontsource font packages, the repo's existing Rollup/TypeScript/vitest/Playwright toolchain.

**Source reference:** Original files to port live in `C:\Users\john\projects\jssm\src\fsl.tools\site\`. Read each from there; do not assume contents.

---

## File Structure

**Created in this repo:**
- `src/fsl.tools/site/recipes/*.cjs` — cookbook source (copied verbatim from jssm)
- `src/fsl.tools/site/scripts/build.cjs` — cookbook generator (copied; one template-path edit)
- `src/fsl.tools/site/scripts/templates/*.html` + `cookbook.css` — generator templates (copied; one `@import` edit)
- `src/fsl.tools/site/components/*.jsx` — 9 homepage components, converted to ES modules
- `src/fsl.tools/site/app.jsx` — `<App/>` composition
- `src/fsl.tools/site/entry.server.jsx` — exports `render()` → HTML string
- `src/fsl.tools/site/entry.client.jsx` — `hydrateRoot`
- `src/fsl.tools/site/index.html.tpl` — homepage shell with `{{PRERENDER}}` / `{{SCRIPT}}` slots
- `src/fsl.tools/site/colors_and_type.css` — design tokens + local `@font-face` (copied; `@import` → `@font-face`)
- `src/fsl.tools/site/assets/fonts/*.woff2` — self-hosted fonts (committed binaries)
- `src/fsl.tools/site/AGENTS.md` — authoring guide (copied; updated)
- `src/build_js/build_site.js` — esbuild prerender + client bundle driver
- `src/build_js/assemble_site.js` — copy to `docs/`, write redirect, assert outputs
- `src/fsl.tools/site/__tests__/hydration.spec.ts` — Playwright hydration test

**Modified:**
- `package.json` — add devDeps + `make_cookbook` / `make_site` / `assemble_site` / `verify_site` scripts
- `src/build_js/build_config_schema.js` — add 3 features
- `build.config.json` — list the 3 features in base + profiles
- `.gitignore` — ignore generated `src/fsl.tools/site/cookbook/` and `build/site/`

**NOT ported:** `cookbook.html`, `components/Cookbook*.jsx`, `components/cookbook-data.jsx`, `index.html` (replaced by `index.html.tpl` + prerender).

---

## Task 1: Dependencies & scaffolding

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add dev dependencies**

Run (each as its own command):
```text
npm install --save-dev esbuild
npm install --save-dev react@^18.3 react-dom@^18.3
npm install --save-dev @fontsource/ibm-plex-sans @fontsource/jetbrains-mono
```
Expected: each exits 0; `package.json` devDependencies now include `esbuild`, `react`, `react-dom`, `@fontsource/ibm-plex-sans`, `@fontsource/jetbrains-mono`.

- [ ] **Step 2: Ignore generated site output**

Append to `.gitignore` (note: `build/` is not globally ignored in this repo, so name the generated site dirs explicitly):
```text
# fsl.tools site — generated cookbook + esbuild output (derived, not source)
src/fsl.tools/site/cookbook/
build/site/
build/site-ssr/
```

- [ ] **Step 3: Verify React resolves under Node**

Run:
```text
node -e "require.resolve('react');require.resolve('react-dom/server');require.resolve('react-dom/client');console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```text
git add package.json package-lock.json .gitignore
git commit -m "build: add esbuild, react, and font deps for in-repo fsl.tools site"
```

---

## Task 2: Port the cookbook generator (works as-is)

This half is already CDN-free. Port it first so it's verifiable in isolation.

**Files:**
- Create: `src/fsl.tools/site/recipes/*.cjs` (copy all from jssm)
- Create: `src/fsl.tools/site/scripts/build.cjs` (copy from jssm)
- Create: `src/fsl.tools/site/scripts/templates/{index.html,recipe.html,triples.html,cookbook.css}` (copy from jssm)
- Modify (after copy): `src/fsl.tools/site/scripts/templates/cookbook.css`

- [ ] **Step 1: Copy generator, templates, and recipes from jssm**

Run:
```text
node -e "const fs=require('fs');const S='C:/Users/john/projects/jssm/src/fsl.tools/site';const D='src/fsl.tools/site';for(const d of ['recipes','scripts','scripts/templates'])fs.mkdirSync(D+'/'+d,{recursive:true});fs.cpSync(S+'/recipes',D+'/recipes',{recursive:true});fs.cpSync(S+'/scripts',D+'/scripts',{recursive:true});console.log('copied');"
```
Expected: prints `copied`; `src/fsl.tools/site/recipes/` and `.../scripts/` now populated.

- [ ] **Step 2: Confirm the template `@import` is the only external reference and leave it correct**

The cookbook output stays at `…/en/cookbook/` and `colors_and_type.css` stays per-language at `…/en/colors_and_type.css`, so `scripts/templates/cookbook.css`'s existing `@import url('../colors_and_type.css');` resolves correctly from a cookbook page (`…/en/cookbook/foo.html` → `../colors_and_type.css`). **No edit needed** — verify it reads exactly:
```text
@import url('../colors_and_type.css');
```
Run: `node -e "const c=require('fs').readFileSync('src/fsl.tools/site/scripts/templates/cookbook.css','utf8');if(!c.includes(\"@import url('../colors_and_type.css')\"))throw new Error('import path changed');console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Add the `make_cookbook` npm script**

In `package.json` `scripts`, add:
```json
"make_cookbook": "node src/fsl.tools/site/scripts/build.cjs",
```

- [ ] **Step 4: Run the generator and verify output**

Run: `npm run make_cookbook`
Expected: logs `[build] loaded N recipes` and `[build] wrote N recipes + index … → cookbook/`.

Run: `node -e "const fs=require('fs');const b='src/fsl.tools/site/cookbook';const m=JSON.parse(fs.readFileSync(b+'/manifest.json','utf8'));const recipes=fs.readdirSync('src/fsl.tools/site/recipes').filter(f=>f.endsWith('.cjs')).length;if(m.count!==recipes)throw new Error('count '+m.count+' != recipes '+recipes);if(!fs.existsSync(b+'/index.html'))throw new Error('no index');console.log('cookbook ok:',m.count,'recipes')"`
Expected: prints `cookbook ok: N recipes` where N matches the recipe file count.

- [ ] **Step 5: Commit**

```text
git add src/fsl.tools/site/recipes src/fsl.tools/site/scripts package.json
git commit -m "feat: port zero-dep cookbook generator into fsl.tools site"
```

---

## Task 3: Self-host fonts

The shared stylesheet currently does `@import url('https://fonts.googleapis.com/...')`. Replace with local `@font-face`.

**Files:**
- Create: `src/fsl.tools/site/assets/fonts/*.woff2`
- Create: `src/fsl.tools/site/colors_and_type.css` (copy from jssm, then edit the font import)

- [ ] **Step 1: Copy the shared stylesheet from jssm**

Run:
```text
node -e "const fs=require('fs');fs.mkdirSync('src/fsl.tools/site/assets/fonts',{recursive:true});fs.copyFileSync('C:/Users/john/projects/jssm/src/fsl.tools/site/colors_and_type.css','src/fsl.tools/site/colors_and_type.css');console.log('copied')"
```
Expected: prints `copied`.

- [ ] **Step 2: Copy the six needed woff2 weights out of the @fontsource packages**

Weights used by the `@import`: IBM Plex Sans 400/500/600, JetBrains Mono 400/500/700 (latin).
Run:
```text
node -e "const fs=require('fs');const path=require('path');const dst='src/fsl.tools/site/assets/fonts';const want=[['@fontsource/ibm-plex-sans','ibm-plex-sans-latin-400-normal.woff2'],['@fontsource/ibm-plex-sans','ibm-plex-sans-latin-500-normal.woff2'],['@fontsource/ibm-plex-sans','ibm-plex-sans-latin-600-normal.woff2'],['@fontsource/jetbrains-mono','jetbrains-mono-latin-400-normal.woff2'],['@fontsource/jetbrains-mono','jetbrains-mono-latin-500-normal.woff2'],['@fontsource/jetbrains-mono','jetbrains-mono-latin-700-normal.woff2']];for(const [pkg,file] of want){const src=path.join('node_modules',pkg,'files',file);fs.copyFileSync(src,path.join(dst,file));}console.log('fonts copied:',fs.readdirSync(dst).length)"
```
Expected: prints `fonts copied: 6`. (If a filename differs, list `node_modules/@fontsource/ibm-plex-sans/files/` and pick the matching `latin-<wght>-normal.woff2`.)

- [ ] **Step 3: Replace the Google Fonts `@import` with local `@font-face`**

In `src/fsl.tools/site/colors_and_type.css`, delete the line:
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
```
and insert at the very top of the file:
```css
/* Self-hosted fonts. Files live in the shared assets dir one level up from
   this per-language stylesheet: …/fsl.tools/assets/fonts/ */
@font-face { font-family: 'IBM Plex Sans'; font-style: normal; font-weight: 400; font-display: swap; src: url('../assets/fonts/ibm-plex-sans-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Sans'; font-style: normal; font-weight: 500; font-display: swap; src: url('../assets/fonts/ibm-plex-sans-latin-500-normal.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Sans'; font-style: normal; font-weight: 600; font-display: swap; src: url('../assets/fonts/ibm-plex-sans-latin-600-normal.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 400; font-display: swap; src: url('../assets/fonts/jetbrains-mono-latin-400-normal.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 500; font-display: swap; src: url('../assets/fonts/jetbrains-mono-latin-500-normal.woff2') format('woff2'); }
@font-face { font-family: 'JetBrains Mono'; font-style: normal; font-weight: 700; font-display: swap; src: url('../assets/fonts/jetbrains-mono-latin-700-normal.woff2') format('woff2'); }
```

- [ ] **Step 4: Verify no CDN reference remains**

Run: `node -e "const c=require('fs').readFileSync('src/fsl.tools/site/colors_and_type.css','utf8');if(/fonts\.googleapis|fonts\.gstatic|https?:/.test(c))throw new Error('CDN ref still present');if((c.match(/@font-face/g)||[]).length!==6)throw new Error('expected 6 @font-face');console.log('fonts local ok')"`
Expected: prints `fonts local ok`.

- [ ] **Step 5: Commit**

```text
git add src/fsl.tools/site/colors_and_type.css src/fsl.tools/site/assets package.json package-lock.json
git commit -m "feat: self-host IBM Plex Sans + JetBrains Mono for fsl.tools site"
```

---

## Task 4: Convert homepage components to ES modules

Each jssm component is a browser global (`function X(){…}` … `window.X = X;`) using `React.useState`. Convert each to an ES module. **Conversion rule, applied to every component file:**

1. Add as the first line: `import React from 'react';` (provides `React.useState`, `React.useEffect`, `React.useMemo`).
2. Delete the trailing `window.<Main> = <Main>;` line.
3. Add `export { <Main> };` at the end (export ONLY the main component named in the old `window.` line; helper components and module constants stay file-local).
4. Change nothing else — JSX is handled by esbuild's automatic runtime.

**Files (copy each from `C:\Users\john\projects\jssm\src\fsl.tools\site\components\`, then apply the rule):**
- `Nav.jsx` (export `Nav`), `Hero.jsx` (`Hero`), `FeatureGrid.jsx` (`FeatureGrid`), `Install.jsx` (`Install`), `Examples.jsx` (`Examples`), `Learn.jsx` (`Learn`), `DiagnosticPanel.jsx` (`DiagnosticPanel`), `Community.jsx` (`Community`), `Footer.jsx` (`Footer`).

- [ ] **Step 1: Copy the nine homepage components**

Run:
```text
node -e "const fs=require('fs');const S='C:/Users/john/projects/jssm/src/fsl.tools/site/components';const D='src/fsl.tools/site/components';fs.mkdirSync(D,{recursive:true});for(const f of ['Nav','Hero','FeatureGrid','Install','Examples','Learn','DiagnosticPanel','Community','Footer'])fs.copyFileSync(S+'/'+f+'.jsx',D+'/'+f+'.jsx');console.log('copied 9')"
```
Expected: prints `copied 9`. (Deliberately excludes `Cookbook*.jsx` and `cookbook-data.jsx`.)

- [ ] **Step 2: Apply the conversion rule to all nine via a one-shot script**

Run:
```text
node -e "const fs=require('fs');const D='src/fsl.tools/site/components';const map={Nav:'Nav',Hero:'Hero',FeatureGrid:'FeatureGrid',Install:'Install',Examples:'Examples',Learn:'Learn',DiagnosticPanel:'DiagnosticPanel',Community:'Community',Footer:'Footer'};for(const [file,main] of Object.entries(map)){const p=D+'/'+file+'.jsx';let s=fs.readFileSync(p,'utf8');const re=new RegExp('\\\\n?window\\\\.'+main+'\\\\s*=\\\\s*'+main+'\\\\s*;?\\\\s*$');if(!re.test(s))throw new Error('window export not found in '+file);s=s.replace(re,'');s='import React from \\'react\\';\\n\\n'+s.replace(/^\\s+|\\s+$/g,'')+'\\n\\nexport { '+main+' };\\n';fs.writeFileSync(p,s);}console.log('converted 9')"
```
Expected: prints `converted 9`.

- [ ] **Step 3: Fix Footer's build-date hydration hazard**

`Footer.jsx` renders `new Date().toISOString().slice(0, 10)` during render — nondeterministic between prerender (build day) and hydration (visitor's day). Replace it with a build-time constant injected by esbuild `define` (see Task 5).

Edit `src/fsl.tools/site/components/Footer.jsx`: add directly under the `import React` line:
```jsx
/* global __BUILT_DATE__ */
```
and replace the substring `{new Date().toISOString().slice(0, 10)}` with:
```jsx
{__BUILT_DATE__}
```
Run: `node -e "const s=require('fs').readFileSync('src/fsl.tools/site/components/Footer.jsx','utf8');if(s.includes('new Date('))throw new Error('Date still in render');if(!s.includes('__BUILT_DATE__'))throw new Error('missing __BUILT_DATE__');console.log('footer ok')"`
Expected: prints `footer ok`.

- [ ] **Step 4: Verify every component is a valid ES module that exports its component**

Run:
```text
node -e "const fs=require('fs');const D='src/fsl.tools/site/components';for(const f of fs.readdirSync(D)){const s=fs.readFileSync(D+'/'+f,'utf8');if(!/^import React from 'react';/.test(s))throw new Error('no React import: '+f);if(!/export \{ \w+ \};\s*$/.test(s))throw new Error('no export: '+f);if(/window\./.test(s))throw new Error('window. left in '+f);}console.log('all 9 are ES modules')"
```
Expected: prints `all 9 are ES modules`.

- [ ] **Step 5: Commit**

```text
git add src/fsl.tools/site/components
git commit -m "refactor: convert fsl.tools homepage components to ES modules"
```

---

## Task 5: App composition, entries, HTML template, and the esbuild driver

**Files:**
- Create: `src/fsl.tools/site/app.jsx`
- Create: `src/fsl.tools/site/entry.server.jsx`
- Create: `src/fsl.tools/site/entry.client.jsx`
- Create: `src/fsl.tools/site/index.html.tpl`
- Create: `src/build_js/build_site.js`
- Modify: `package.json` (add `make_site`)

- [ ] **Step 1: Create `app.jsx`** (mirrors the old inline `App()` from jssm's `index.html`)

```jsx
import React from 'react';
import { Nav }             from './components/Nav.jsx';
import { Hero }            from './components/Hero.jsx';
import { FeatureGrid }     from './components/FeatureGrid.jsx';
import { Install }         from './components/Install.jsx';
import { Examples }        from './components/Examples.jsx';
import { Learn }           from './components/Learn.jsx';
import { DiagnosticPanel } from './components/DiagnosticPanel.jsx';
import { Community }       from './components/Community.jsx';
import { Footer }          from './components/Footer.jsx';

export function App() {
  return (
    <div>
      <Nav/>
      <main>
        <Hero/>
        <FeatureGrid/>
        <Install/>
        <Examples/>
        <Learn/>
        <DiagnosticPanel/>
        <Community/>
      </main>
      <Footer/>
    </div>
  );
}
```

- [ ] **Step 2: Create `entry.server.jsx`**

```jsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './app.jsx';

/** Render the homepage to a hydratable HTML string (build-time only). */
export function render() {
  return renderToString(<App/>);
}
```

- [ ] **Step 3: Create `entry.client.jsx`**

```jsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './app.jsx';

hydrateRoot(document.getElementById('root'), <App/>);
```

- [ ] **Step 4: Create `index.html.tpl`** (head + inline style ported from jssm's `index.html`; CDN scripts removed; `{{PRERENDER}}` and `{{SCRIPT}}` slots added)

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>fsl.tools — finite state language</title>
  <link rel="stylesheet" href="colors_and_type.css"/>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: var(--bg); color: var(--fg-1);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
    }
    html { scroll-behavior: smooth; }
    a { color: inherit; }
    main > section + section::before {
      content: '';
      display: block;
      height: 1px;
      background: var(--rule);
      max-width: 1136px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div id="root">{{PRERENDER}}</div>
  <script type="module" src="{{SCRIPT}}"></script>
</body>
</html>
```

- [ ] **Step 5: Create `src/build_js/build_site.js`** (esbuild prerender + client bundle)

```js
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
  console.log(`[site] prerendered homepage + ${scriptName} (built ${BUILT_DATE}) → build/site/`);
}

main().catch(err => { console.error('[site] FAILED:', err.message); process.exit(1); });
```

- [ ] **Step 6: Add the `make_site` npm script**

In `package.json` `scripts`, add:
```json
"make_site": "node src/build_js/build_site.js",
```

- [ ] **Step 7: Run the site build and verify output**

Run: `npm run make_site`
Expected: logs `[site] prerendered homepage + app-<hash>.js (built YYYY-MM-DD) → build/site/`.

Run:
```text
node -e "const fs=require('fs');const b='build/site';const html=fs.readFileSync(b+'/index.html','utf8');if(/unpkg\.com|fonts\.googleapis|text\/babel/.test(html))throw new Error('CDN/babel still present');const root=html.match(/<div id=\"root\">([\s\S]*?)<\/div>\s*<script/);if(!root||root[1].trim().length<100)throw new Error('#root not prerendered');if(!fs.readdirSync(b).some(f=>/^app-.*\.js$/.test(f)))throw new Error('no client bundle');console.log('site build ok')"
```
Expected: prints `site build ok`.

- [ ] **Step 8: Commit**

```text
git add src/fsl.tools/site/app.jsx src/fsl.tools/site/entry.server.jsx src/fsl.tools/site/entry.client.jsx src/fsl.tools/site/index.html.tpl src/build_js/build_site.js package.json
git commit -m "feat: prerender + hydrate fsl.tools homepage via esbuild (no CDN)"
```

---

## Task 6: Assemble into docs/ and write the root redirect

**Files:**
- Create: `src/build_js/assemble_site.js`
- Modify: `package.json` (add `assemble_site`)

- [ ] **Step 1: Create `src/build_js/assemble_site.js`**

```js
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
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
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

  mkdirSync(EN, { recursive: true });
  mkdirSync(join(FSL, 'assets', 'fonts'), { recursive: true });

  // Shared, language-agnostic assets (one copy, above the languages).
  cpSync(join(SITE, 'assets'), join(FSL, 'assets'), { recursive: true });

  // Per-language: prerendered homepage + client bundle + stylesheet + cookbook.
  cpSync(BUILT, EN, { recursive: true });                                   // index.html, app-*.js, *.map
  cpSync(join(SITE, 'colors_and_type.css'), join(EN, 'colors_and_type.css'));
  cpSync(join(SITE, 'cookbook'), join(EN, 'cookbook'), { recursive: true });

  // Root redirect → /fsl.tools/en/
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

  console.log(`[assemble] docs/fsl.tools/en (homepage + ${manifest.count} recipes) + shared assets + root redirect`);
}

main();
```

- [ ] **Step 2: Add the `assemble_site` npm script**

In `package.json` `scripts`, add:
```json
"assemble_site": "node src/build_js/assemble_site.js",
```

- [ ] **Step 3: Run the full local chain and verify**

Run (each its own command):
```text
npm run make_cookbook
npm run make_site
npm run assemble_site
```
Expected final line: `[assemble] docs/fsl.tools/en (homepage + N recipes) + shared assets + root redirect`.

Run:
```text
node -e "const fs=require('fs');for(const p of ['docs/index.html','docs/fsl.tools/en/index.html','docs/fsl.tools/en/colors_and_type.css','docs/fsl.tools/en/cookbook/index.html','docs/fsl.tools/assets/fonts'])if(!fs.existsSync(p))throw new Error('missing '+p);const redir=fs.readFileSync('docs/index.html','utf8');if(!/url=fsl\.tools\/en\//.test(redir))throw new Error('redirect target wrong');console.log('assembled layout ok')"
```
Expected: prints `assembled layout ok`.

- [ ] **Step 4: Commit**

```text
git add src/build_js/assemble_site.js package.json
git commit -m "feat: assemble fsl.tools site into docs/fsl.tools/en + root redirect"
```

---

## Task 7: Wire into the build orchestrator

**Files:**
- Modify: `src/build_js/build_config_schema.js`
- Modify: `build.config.json`

- [ ] **Step 1: Register three features in the catalog**

In `src/build_js/build_config_schema.js`, inside the `FEATURES` object, after the `site:` line, add:
```js
  make_cookbook: { stages: [5], optional: true, defaultEnabled: true, script: 'make_cookbook', requires: ['site'] },
  make_site:     { stages: [5], optional: true, defaultEnabled: true, script: 'make_site',     requires: ['site'] },
  assemble_site: { stages: [6], optional: true, defaultEnabled: true, script: 'assemble_site', requires: ['site'] },
```
Rationale: `make_cookbook` and `make_site` run in stage 5 (parallel with the existing `site` copy; they touch only `src/.../cookbook` and `build/site`, never `docs`). `assemble_site` runs in stage 6 — strictly after stage 5 — so cookbook output, the homepage bundle, and the `site`-populated `docs/` all exist before it copies and overwrites `docs/index.html`. `requires: ['site']` makes the trio enable/disable as a unit with the existing site step.

- [ ] **Step 2: List the new features in `build.config.json`**

In `build.config.json`, add to the top-level `"features"` object:
```json
    "make_cookbook": true,
    "make_site":     true,
    "assemble_site": true
```
And to each profile's `"features"` object set them to match that profile's `site` value: in `fast` and `ci-lite` set all three to `false`; in `ci` and `release` set all three to `true`.

- [ ] **Step 3: Verify the planner accepts the config and stages the trio correctly**

Run:
```text
node -e "import('./src/build_js/build_config.js').then(m=>{const {stages}=m.buildPlan({argv:[]});const flat=stages.flat();for(const s of ['make_cookbook','make_site','assemble_site','site'])if(!flat.includes(s))throw new Error('missing '+s);if(stages[6][0]!=='assemble_site')throw new Error('assemble_site not in stage 6');console.log('plan ok; stage5='+JSON.stringify(stages[5])+' stage6='+JSON.stringify(stages[6]))})"
```
Expected: prints a line showing `assemble_site` in stage 6 and `site`/`make_cookbook`/`make_site` in stage 5.

Run (confirm `fast` profile disables the trio):
```text
node -e "import('./src/build_js/build_config.js').then(m=>{const {stages,disabled}=m.buildPlan({argv:['--profile=fast']});const flat=stages.flat();for(const s of ['make_cookbook','make_site','assemble_site'])if(flat.includes(s))throw new Error(s+' should be disabled in fast');console.log('fast disables site trio ok')})"
```
Expected: prints `fast disables site trio ok`.

- [ ] **Step 4: Commit**

```text
git add src/build_js/build_config_schema.js build.config.json
git commit -m "build: wire fsl.tools site build into the staged orchestrator"
```

---

## Task 8: Playwright hydration test

Verifies the prerendered page hydrates without mismatch and an interactive control works.

**Files:**
- Create: `src/fsl.tools/site/__tests__/hydration.spec.ts`
- Modify: `package.json` (add `verify_site`)

- [ ] **Step 1: Inspect `playwright.config.ts` for the test glob and webServer**

Run: `node -e "console.log(require('fs').readFileSync('playwright.config.ts','utf8'))"`
Expected: shows `testDir`/`testMatch` and any `webServer`. Place the spec where the config will discover it; if `testDir` excludes `src/`, instead create the spec under the configured test dir and adjust the path in Step 2 accordingly.

- [ ] **Step 2: Create the hydration spec** (serves the built `docs/` with the repo's `servehere` dep on port 4321)

```ts
import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
let server: ChildProcess;

test.beforeAll(async () => {
  server = spawn('npx', ['servehere', String(PORT)], { cwd: 'docs', shell: true, stdio: 'ignore' });
  // Poll until the server answers.
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${BASE}/fsl.tools/en/`); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('static server did not start');
});

test.afterAll(() => { server?.kill(); });

test('homepage hydrates without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${BASE}/fsl.tools/en/`, { waitUntil: 'networkidle' });

  // Prerendered content is present before JS.
  await expect(page.getByRole('heading', { name: /unrepresentable/i })).toBeVisible();

  // Interactive proof of hydration: switch the Install package-manager tab.
  await page.getByRole('button', { name: 'pnpm', exact: true }).click();
  await expect(page.locator('text=pnpm add -D jssm')).toBeVisible();

  const hydrationErrors = errors.filter(e => /hydrat|did not match|mismatch/i.test(e));
  expect(hydrationErrors, hydrationErrors.join('\n')).toHaveLength(0);
});
```

- [ ] **Step 3: Add the `verify_site` npm script**

In `package.json` `scripts`, add (adjust the spec path to match Step 1's testDir if needed):
```json
"verify_site": "playwright test src/fsl.tools/site/__tests__/hydration.spec.ts",
```

- [ ] **Step 4: Run the hydration test against the assembled site**

Pre-req: Task 6 Step 3 has produced `docs/`. Run: `npm run verify_site`
Expected: 1 passed. If it fails on a missing browser, run `npx playwright install chromium` first.

- [ ] **Step 5: Commit**

```text
git add src/fsl.tools/site/__tests__ package.json
git commit -m "test: add Playwright hydration check for fsl.tools homepage"
```

---

## Task 9: Authoring docs

**Files:**
- Create: `src/fsl.tools/site/AGENTS.md` (copy from jssm, then update)

- [ ] **Step 1: Copy and update AGENTS.md**

Run: `node -e "require('fs').copyFileSync('C:/Users/john/projects/jssm/src/fsl.tools/site/AGENTS.md','src/fsl.tools/site/AGENTS.md');console.log('copied')"`

Then edit `src/fsl.tools/site/AGENTS.md` to reflect this repo:
- Update the "repository layout" block: homepage is now prerendered+hydrated (esbuild), not a CDN SPA; `components/` are ES modules; `cookbook.html` and `Cookbook*.jsx` no longer exist.
- Document the build: `npm run make_cookbook`, `npm run make_site`, `npm run assemble_site` (and that a full `npm run build` runs all three via stages 5–6).
- Note fonts are self-hosted in `assets/fonts/` and output goes to `docs/fsl.tools/en/` with shared `docs/fsl.tools/assets/`.

- [ ] **Step 2: Commit**

```text
git add src/fsl.tools/site/AGENTS.md
git commit -m "docs: add fsl.tools site authoring guide for this repo"
```

---

## Task 10: Full-build integration check

- [ ] **Step 1: Run the complete build**

Run: `npm run build`
Expected: completes through Stage 6; final site stages log the cookbook generation, prerender, and `[assemble] docs/fsl.tools/en …`. No CDN warnings.

- [ ] **Step 2: Re-verify the assembled layout and CDN-freeness**

Run:
```text
node -e "const fs=require('fs');const grep=(p)=>fs.readFileSync(p,'utf8');for(const p of ['docs/index.html','docs/fsl.tools/en/index.html','docs/fsl.tools/en/cookbook/index.html','docs/fsl.tools/assets/fonts'])if(!fs.existsSync(p))throw new Error('missing '+p);if(/unpkg\.com|fonts\.googleapis/.test(grep('docs/fsl.tools/en/index.html')))throw new Error('CDN in homepage');const css=grep('docs/fsl.tools/en/colors_and_type.css');if(/fonts\.googleapis/.test(css))throw new Error('CDN font in css');console.log('full build CDN-free ok')"
```
Expected: prints `full build CDN-free ok`.

- [ ] **Step 3: Run the hydration test once more against the full build**

Run: `npm run verify_site`
Expected: 1 passed.

- [ ] **Step 4: Check IDE diagnostics**

Use `mcp__ide__getDiagnostics` on the new/modified files; resolve any lint/type warnings (e.g., confirm `/* global __BUILT_DATE__ */` silences the Footer undef, and that `.jsx` files don't trip the TS build — they are bundled by esbuild, not `tsc`).

- [ ] **Step 5: Final commit if any fixups were needed**

```text
git add -A
git commit -m "chore: fsl.tools site build integration fixups"
```

---

## Notes for the implementer

- **Do not** copy `cookbook.html`, `Cookbook*.jsx`, or `cookbook-data.jsx` — they are the dropped legacy SPA.
- **Relative links are intentional.** Homepage links like `cookbook/index.html` and `#install` work because homepage + cookbook are siblings under `…/en/`. Don't rewrite them.
- **`docs/` is wiped** by `npm run clean` (stage 0). All source lives under `src/`; only build output lands in `docs/`. Generated `src/fsl.tools/site/cookbook/` and `build/site/` are gitignored.
- **`tsc` does not compile the site.** `.jsx` files are bundled by esbuild only; ensure `tsconfig.json`'s `include`/`exclude` does not pull `src/fsl.tools/**` into the `tsc --build` step (if it does, exclude it).
- React/ReactDOM are pinned to 18.3.x; the homepage uses `hydrateRoot` (React 18 client API) and `renderToString` (server). Do not bump to 19 without re-validating hydration.
