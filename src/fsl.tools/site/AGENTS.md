# Cookbook authoring — for agents

This document tells Claude Code (and any future agent) **exactly** how to add a recipe to the fsl.tools cookbook and how the overall build works. Read it before touching `recipes/`, `scripts/build.cjs`, or any component.

## TL;DR

1. Drop a new `recipes/<category>-<slug>.cjs` file.
2. Run `npm run make_cookbook` (which runs `node src/fsl.tools/site/scripts/build.cjs`).
3. Done. The recipe page, the cookbook index, the manifest, and (if it's a triple) the triples picker all update.

No SPA. No React on the recipe pages. Output is a folder of plain `.html` files, gitignored.

---

## The repository layout

```
src/fsl.tools/site/                  ← everything for the fsl.tools site lives here

  recipes/                           ← SOURCE: one file per recipe
    patterns-toggle.cjs
    patterns-cycle.cjs
    hooks-entry.cjs
    test-vitest-vite-react.cjs        ← TRIPLES (see below)
    test-jest-webpack-vue.cjs
    ...

  scripts/
    build.cjs                        ← cookbook builder; run via npm run make_cookbook
    templates/
      recipe.html                    ← per-recipe shell (header / footer / TOC scaffold)
      index.html                     ← /cookbook/index.html shell
      triples.html                   ← /cookbook/test/index.html shell

  cookbook/                          ← BUILD OUTPUT (gitignored) — do not hand-edit
    patterns-toggle.html
    test-vitest-vite-react.html
    index.html
    test/index.html                  ← triples picker
    manifest.json                    ← {recipes: [...], tags: [...], categories: [...]}
    cookbook.css

  components/                        ← homepage React components (ES modules)
    Nav.jsx
    Hero.jsx
    FeatureGrid.jsx
    Install.jsx
    Examples.jsx
    Learn.jsx
    DiagnosticPanel.jsx
    Community.jsx
    Footer.jsx

  app.jsx                            ← composes all components into the root React tree
  entry.server.jsx                   ← renderToString entry for prerender
  entry.client.jsx                   ← hydrateRoot entry for the browser
  index.html.tpl                     ← HTML shell injected with prerendered markup
  assets/fonts/                      ← self-hosted WOFF2 files (IBM Plex Sans + JetBrains Mono)
  colors_and_type.css                ← design tokens + @font-face declarations

src/build_js/
  build_site.js                      ← esbuild driver: prerender + client bundle
  assemble_site.js                   ← copies everything into docs/
  run_build.js                       ← staged build orchestrator (npm run build)

docs/fsl.tools/                      ← FINAL OUTPUT committed to git (GitHub Pages)
  en/                                ← language segment (/en/ — see note below)
    index.html                       ← prerendered homepage
    app-<hash>.js                    ← client hydration bundle
    colors_and_type.css
    cookbook/                        ← static cookbook pages
  assets/fonts/                      ← shared fonts (one copy above language dirs)
```

The `/en/` language segment is a path convention to leave room for future languages. There is no i18n framework yet — `/en/` is the only language directory.

The homepage is a **prerendered + hydrated React app** — React components built locally by esbuild, rendered to static HTML at build time, then hydrated in the browser. Fonts are self-hosted; no CDN or external font service is used.

The cookbook is **plain static HTML** so it scales to thousands of pages and Google can index every one.

---

## Build commands

| npm script              | What it does                                                                     |
|-------------------------|----------------------------------------------------------------------------------|
| `npm run make_cookbook` | Reads `recipes/*.cjs`, writes `src/fsl.tools/site/cookbook/**` (gitignored).    |
| `npm run make_site`     | Prerender + client-bundle the React homepage into `build/site/`.                 |
| `npm run assemble_site` | Copy build output + cookbook + fonts into `docs/fsl.tools/`; write root redirect. Asserts CDN-free and complete. |
| `npm run build`         | Staged orchestrator: runs make_cookbook + make_site (stage 5) then assemble_site (stage 6). |
| `npm run verify_site`   | Playwright test that hydration actually happened in the assembled docs/. Run after `npm run build`. |

Normal development cycle: `npm run build` then optionally `npm run verify_site`.

---

## Filename → URL convention

```
recipes/<category>-<slug>.cjs     →     /cookbook/<category>-<slug>.html
```

The filename **is** the URL. Pick it carefully — it never changes.

- `category` is a single word, lowercased, kebab-cased if needed (`patterns`, `hooks`, `errors`, `workflows`, `test`, `integrations`).
- `slug` is whatever uniquely identifies this recipe within its category.

### Triples (testing × bundler × frontend)

Triples are normal recipes with a fixed slug shape:

```
recipes/test-<runner>-<bundler>-<frontend>.cjs
```

- `runner` ∈ {`vitest`, `jest`, `playwright`, `cypress`, `mocha`, `node`}
- `bundler` ∈ {`vite`, `webpack`, `esbuild`, `rollup`, `parcel`, `turbopack`, `bun`, `none`}
- `frontend` ∈ {`react`, `vue`, `svelte`, `solid`, `preact`, `angular`, `lit`, `vanilla`}

The build script recognizes the `test-` prefix and adds the recipe to the triples picker at `/cookbook/test/index.html`. Each axis value is also auto-tagged on the recipe.

If you need a fourth axis later (e.g. TS vs JS), append it: `test-vitest-vite-react-ts.cjs`. Update the `parseTripleSlug` function in `scripts/build.cjs` to match.

---

## Recipe file format

A recipe is a plain CommonJS module. **No imports, no dependencies, no JSX.** Just a data record.

```js
// recipes/patterns-toggle.cjs
module.exports = {
  // REQUIRED
  title: 'Toggle',
  category: 'Patterns',                // free-form, but pick from the existing set when possible
  problem: 'Two states, one verb. The smallest useful machine — and the one you reach for whenever a boolean has started growing edge cases.',

  // OPTIONAL
  tags: ['boolean', 'two-state', 'beginner'],
  blocks: [
    {
      kind: 'fsl',                     // see "Code block kinds" below
      title: 'machine.fsl',             // optional, shows in the block header
      code: `import { sm } from 'jssm';

const panel = sm\`
  closed 'toggle' → open;
  open   'toggle' → closed;
\`;

panel.go('toggle');
panel.state(); // → 'open'
`,
    },
  ],
  graph: {                              // optional — see "Graphs" below
    width: 520,
    height: 140,
    accentNode: 'closed',
    nodes: [
      { id: 'closed', x: 150, y: 70 },
      { id: 'open',   x: 370, y: 70 },
    ],
    edges: [
      { from: 'closed', to: 'open',   label: 'toggle', curve: 'arc-up', arcOffset: 28 },
      { from: 'open',   to: 'closed', label: 'toggle', curve: 'arc',    arcOffset: 28 },
    ],
  },
  note: 'Reach for this whenever you find yourself adding a third boolean to a component. `open / opening / closed` is a different machine — and once you write it as one, the bugs go away.',

  // OPTIONAL — for triples only, this is auto-derived from the filename, but you can override
  triple: { runner: 'vitest', bundler: 'vite', frontend: 'react' },
};
```

### Required fields
- `title` — sentence-case, no trailing period.
- `category` — title-case, free-form. Existing values: `Patterns`, `Hooks`, `Errors`, `Persistence`, `React`, `Workflows`, `Testing`, `Integrations`. Add new ones freely.
- `problem` — one short paragraph. Markdown-light: `` `code` `` and `*emphasis*` are supported in `problem` and `note`.

### Code block kinds
Used for the small "FSL" / "TS" / "VITEST" badge at the top of each block, and as a hint to the highlighter. Recognized values:

| `kind`        | Header label | Highlighter   |
|---------------|--------------|---------------|
| `fsl`         | FSL          | fsl           |
| `jssm`        | JSSM         | js            |
| `ts` / `tsx`  | TS / TSX     | js            |
| `js` / `jsx`  | JS / JSX     | js            |
| `react`       | REACT        | js            |
| `vitest`      | VITEST       | js            |
| `jest`        | JEST         | js            |
| `shell`       | SHELL        | shell         |
| `json`        | JSON         | json          |
| anything else | (uppercased) | plain         |

### Code block syntax conventions

The highlighter is heuristic, not a real parser. To make code render cleanly:

- Use `→` (U+2192) for FSL arrows when possible. `->` is also recognized.
- Comments starting with words like *no*, *refused*, *fail*, *error*, *cannot* render in mauve (refusal red).
- Comments containing `ok` or `→ ok` render in teal (accepted green).
- Strings (single, double, backtick) all colorize as accent (ochre).

### Graphs

Optional. Pure data — no SVG knowledge required. Coordinates are in pixels inside a viewBox of `width × height`.

- `nodes: [{ id, x, y, label? }]` — `label` defaults to `id`.
- `edges: [{ from, to, label?, curve?, arcOffset? }]`
  - `curve` ∈ `undefined` (straight) | `'arc'` (bend down) | `'arc-up'` (bend up) | `'self'` (loop on top of node).
  - `arcOffset` controls how pronounced the arc is; default 32.
- `accentNode: 'id'` highlights one node in teal as the entry point.

If laying out a graph by hand is annoying, just leave `graph` out — the recipe page will simply not show one. Better no graph than a tangled one.

### `note`

A short closing paragraph below the code/graph. Same Markdown-light rules as `problem`.

---

## Cookbook build script

```bash
npm run make_cookbook
# runs: node src/fsl.tools/site/scripts/build.cjs
```

Reads every `recipes/*.cjs`, validates required fields, writes:

- `cookbook/<basename>.html` — one per recipe.
- `cookbook/index.html` — searchable list of all recipes (client-side filter on `manifest.json`).
- `cookbook/test/index.html` — triples picker (only if any `test-*` recipes exist).
- `cookbook/manifest.json` — `{recipes: [...summary...], tags: [...], categories: [...]}`.
- `cookbook/cookbook.css` — shared stylesheet.

The `cookbook/` output directory is gitignored. The script is **zero-dependency** — it uses only Node's built-in `fs`, `path`, and `module`.

### Validation

The build refuses to run if any recipe is missing `title`, `category`, or `problem`. Triple recipes (`test-*`) additionally fail if their slug doesn't parse into a `runner-bundler-frontend` triple.

### Re-running

Idempotent. Safe to run on every save. The output folder can be wiped and re-built from scratch.

---

## Homepage build

The homepage is **not** a CDN-loaded React SPA. It is built locally by esbuild with no runtime CDN dependency:

1. `npm run make_site` — `src/build_js/build_site.js` uses esbuild to:
   - Bundle `entry.server.jsx` for Node, call its `render()` to get prerendered HTML (`renderToString`). React is bundled in.
   - Bundle `entry.client.jsx` for the browser (minified ESM, content-hashed filename). React is bundled in.
   - Fill `index.html.tpl` with the prerendered markup and a `<script type="module">` tag pointing at the client bundle.
   - Output: `build/site/index.html` + `build/site/app-<hash>.js` (+ `.map`).

2. `npm run assemble_site` — `src/build_js/assemble_site.js` copies everything into `docs/`:
   - `build/site/**` → `docs/fsl.tools/en/`
   - `src/fsl.tools/site/colors_and_type.css` → `docs/fsl.tools/en/`
   - `src/fsl.tools/site/cookbook/` → `docs/fsl.tools/en/cookbook/`
   - `src/fsl.tools/site/assets/` → `docs/fsl.tools/assets/` (shared; one copy above language dirs)
   - Writes a root redirect at `docs/index.html` → `/fsl.tools/en/`.
   - Asserts the output is CDN-free and the `#root` div is prerendered.

### Homepage components

`components/*.jsx` are ES modules (`import React from 'react'`, `export { ComponentName }`). They import nothing except React. Composed in `app.jsx`; the two entry points (`entry.server.jsx`, `entry.client.jsx`) import `app.jsx`.

`colors_and_type.css` declares `@font-face` for self-hosted fonts in `assets/fonts/` (IBM Plex Sans 400/500/600, JetBrains Mono 400/500/700, all WOFF2). No external font service is used.

### Hydration verification

```bash
npm run verify_site
# runs: playwright test src/ts/e2e/hydration.spec.ts
```

Confirms that React hydration ran without errors in the assembled `docs/` output.

---

## What you should NOT touch

- `cookbook/**` — generated output (gitignored). If you change something here, the next build wipes it.
- `build/**` — intermediate build output. Never committed.
- `docs/fsl.tools/**` — assembled output. Regenerated by `npm run assemble_site`.

## What you SHOULD touch

- `recipes/*.cjs` — add freely.
- `scripts/templates/*.html` — change the per-recipe page chrome here, not by editing the generated HTML.
- `scripts/build.cjs` — extend when you need new code-block kinds, new categories with custom rendering, or a new top-level page (e.g. an integrations matrix).
- `components/*.jsx` — homepage React components.
- `app.jsx` — root component composition.
- `index.html.tpl` — HTML shell template.
- `colors_and_type.css` — design tokens and font declarations.
- This file (`AGENTS.md`) — keep in sync with reality.

---

## Common tasks

### Add a new pattern
1. `src/fsl.tools/site/recipes/patterns-debounce.cjs` with the schema above.
2. `npm run make_cookbook`.

### Add the testing triple for vitest × vite × react
1. `src/fsl.tools/site/recipes/test-vitest-vite-react.cjs`. The build infers the triple from the filename.
2. `npm run make_cookbook`. The recipe appears at `/cookbook/test-vitest-vite-react.html` AND in the picker at `/cookbook/test/index.html`.

### Add a whole new category
Just use it as the `category` field. The index page groups by category alphabetically; nothing else to do.

### Add a new code-block kind (e.g. `python`)
Edit `src/fsl.tools/site/scripts/build.cjs`:
- Add the kind to the `KIND_LABELS` map.
- If the highlighter should treat it specially, extend the `highlight()` function. Otherwise it falls through to the plain renderer.

### Full build and verify
```bash
npm run build
npm run verify_site
```
