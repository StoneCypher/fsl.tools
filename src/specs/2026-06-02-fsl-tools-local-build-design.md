# fsl.tools site — in-repo, fully local build

**Date:** 2026-06-02
**Status:** Design — awaiting review
**Author:** John Haugeland (with Claude)

## Context

The fsl.tools website currently lives in a *different* repository
(`../jssm`, at `src/fsl.tools/site/`) and is emitted into that repo's
`docs/fsl.tools/` build output. It has two halves:

1. **Homepage** — a React SPA (`index.html` + nine `components/*.jsx`) that
   loads React, ReactDOM, **and an in-browser Babel compiler** from the unpkg
   **CDN**, then transpiles JSX in the visitor's browser at page load.
2. **Cookbook** — a zero-dependency Node static-site generator
   (`scripts/build.cjs`) that turns `recipes/*.cjs` data records into a folder
   of plain static HTML pages. This half is already CDN-free.

There is also a **legacy SPA cookbook** (`cookbook.html` +
`Cookbook*.jsx` + a duplicate `cookbook-data.jsx` data island) that the static
generator supersedes; `AGENTS.md` already marks it for removal.

Two further CDN dependencies exist:

- `colors_and_type.css` (shared by both halves) pulls **Google Fonts**
  (`IBM Plex Sans`, `JetBrains Mono`) via `@import url('https://fonts.googleapis.com/…')`.

We want to bring this site into **this** repo (`fsl.tools`) and make it
**100% CDN-free** — no runtime fetch of React, no in-browser Babel, no
Google Fonts.

## Goal

Port `src/fsl.tools/site/` into this repo and produce a fully local build:

- Homepage: **prerendered static HTML + React hydration**, with React/ReactDOM
  bundled locally.
- Fonts: **self-hosted**.
- Cookbook: keep the static generator; **drop** the legacy SPA cookbook.
- Output under **`docs/fsl.tools/en/`** with a shared assets folder and room
  for future languages.

Non-goals: changing copy/content, redesigning, or building any i18n
translation/extraction framework. The `/en/` segment is a **path convention
only**.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | **Prerender + hydrate** | Instant first paint, fully indexable, preserves the existing React interactivity (tabs, copy buttons). |
| Build tool | **esbuild** (one new dev dep) | Native JSX (no Babel), tiny, fast; a self-contained driver mirrors the cookbook generator's lean style; less surface area than Vite, less config than Rollup-for-JSX. |
| Legacy SPA cookbook | **Drop it** | The static generator is canonical (sourced from `recipes/*.cjs`, searchable, indexable). Keeping the SPA means two cookbooks from two data sources. |
| Fonts | **Self-host** in a shared `assets/` dir | No per-page request to Google; not duplicated per language. |
| Shared assets | **`docs/fsl.tools/assets/`** (above languages) | Fonts now; images / favicon / OG cards later. Language-agnostic binaries live once. |
| React version | **Pin to 18.3.x** | Same major the CDN used; keeps prerender/hydration semantics identical. Bundled, not fetched. |
| Output root | **`docs/fsl.tools/en/`** | User-chosen; mirrors old jssm path with a language segment. |
| i18n | **Path only** | YAGNI — no extraction framework until a second language is real. Each language is a sibling folder; design tokens (`colors_and_type.css`) stay per-language so a future CJK/RTL language can override font stacks. |

## Source layout (this repo)

Self-contained under `src/fsl.tools/site/`, mirroring jssm:

```text
src/fsl.tools/site/
  index.html.tpl              homepage shell with {{PRERENDER}}, {{SCRIPT}}, {{HEAD}} slots
  app.jsx                     <App/> composition (Nav … Footer)
  entry.server.jsx            renderToString(<App/>)  — build-time SSR entry
  entry.client.jsx            hydrateRoot(root, <App/>) — browser entry
  components/*.jsx            nine homepage components, converted to ES modules
  colors_and_type.css         design tokens; @font-face → ../assets/fonts/…
  assets/
    fonts/*.woff2            IBM Plex Sans, JetBrains Mono (self-hosted)
  recipes/*.cjs              cookbook source (canonical), copied from jssm
  scripts/
    build.cjs                cookbook generator, copied as-is (one template edit)
    templates/*.html
  AGENTS.md                   authoring guide, updated for this repo

src/build_js/build_site.js    esbuild driver: prerender + client bundle
```

NOT ported: `cookbook.html`, `components/Cookbook*.jsx`,
`components/cookbook-data.jsx`.

## Output layout

```text
docs/
  index.html                  redirect → fsl.tools/en/  (meta-refresh + <link rel=canonical>)
  docs/                        TypeDoc (unchanged)
  fsl.tools/
    index.html                redirect → en/  (optional; future language picker)
    assets/
      fonts/*.woff2           one copy, shared by all languages
    en/
      index.html              prerendered homepage
      app.[hash].js (+ .map)  client hydration bundle
      colors_and_type.css     tokens + @font-face url('../assets/fonts/…')
      cookbook/
        index.html
        <slug>.html
        test/index.html        triples picker
        cookbook.css           @import url('../colors_and_type.css')  (UNCHANGED)
        manifest.json
```

**Path correctness:**
- Homepage `…/en/index.html` links `colors_and_type.css` (sibling).
- `colors_and_type.css` `@font-face` → `../assets/fonts/…` resolves to
  `…/fsl.tools/assets/fonts/…`.
- Cookbook `cookbook.css` `@import url('../colors_and_type.css')` is unchanged,
  because the token CSS stays per-language (sibling of the cookbook dir's parent).
- All homepage internal links are already **relative** (`cookbook/index.html`,
  `#install`) and keep working because homepage + cookbook stay siblings under
  `/en/`. No link rewriting required. External links (Discord) left as-is.

## Build pipeline

### `src/build_js/build_site.js` (esbuild driver)

Three steps, one Node script:

1. **SSR bundle.** esbuild bundles `entry.server.jsx` (`platform: 'node'`,
   `jsx: 'automatic'`, `format: 'cjs'`) to a temp file in the build dir;
   `require` it; call `renderToString(<App/>)` → HTML string.
2. **Client bundle.** esbuild bundles `entry.client.jsx`
   (`platform: 'browser'`, `bundle: true`, `minify: true`, `sourcemap: true`,
   `format: 'esm'`, content-hashed name) with React + ReactDOM bundled in →
   `app.[hash].js` (+ `.map`) into the build dir.
3. **Assemble HTML.** Fill `index.html.tpl`: inject the prerendered HTML into
   `<div id="root">…</div>`, inject `<script type="module" src="app.[hash].js">`,
   inject the stylesheet link. Write to the build dir.

All artifacts land in the **build** dir first; a later step copies them into
`docs/`. Nothing is fetched at runtime.

### Component conversion (globals → ES modules)

Each `components/*.jsx` currently defines a browser-global function and assumes
`React` and sibling components are globals. Conversion is mechanical:

- `export` each component; `import` siblings / shared constants explicitly.
- Rely on esbuild's automatic JSX runtime — no `import React` boilerplate.

**Hydration guardrails** (so server HTML === client first render):
- No `window` / `document` access during module load or initial render — move
  it into `useEffect`.
- Deterministic initial `useState` values (no `Date.now()`, no random, no
  `window`-derived state).

### Fonts

Download the two families' `woff2` into `src/fsl.tools/site/assets/fonts/`.
Replace the Google Fonts `@import` in `colors_and_type.css` with local
`@font-face` rules (`font-display: swap`, `url('../assets/fonts/…')`), same
family names so nothing else changes.

### Cookbook

Run the existing `scripts/build.cjs` unchanged except **one template edit**: it
needs no change to its `@import` (still `../colors_and_type.css`); confirm font
tokens resolve once fonts are local. Output copied to `…/en/cookbook/`.

### Redirect

`docs/index.html` (served at the site root) becomes a small redirect to
`fsl.tools/en/` via `<meta http-equiv="refresh">` plus
`<link rel="canonical">`. Sourced from a checked-in file, not the old stub.

## Build wiring

Three npm scripts, added to the **`site`** stage of `run_build.js` via
`build.config.json` so `--profile=fast` keeps skipping them:

| Script | Command |
|--------|---------|
| `make_cookbook` | `node src/fsl.tools/site/scripts/build.cjs` |
| `make_site` | `node src/build_js/build_site.js` (prerender + client bundle) |
| `assemble_site` | copy built homepage + `colors_and_type.css` + cookbook into `docs/fsl.tools/en/`; copy `assets/` into `docs/fsl.tools/assets/`; write `docs/index.html` redirect |

Order within the stage: `make_cookbook` and `make_site` can run in parallel;
`assemble_site` depends on both. (If the staged runner cannot express an
intra-stage dependency, split `assemble_site` into the next stage.)

New dev dependencies: `esbuild`, `react@^18.3`, `react-dom@^18.3`.

## Testing / verification

- **Build smoke test** (Node): after a build, assert
  - `docs/fsl.tools/en/app.*.js` exists,
  - `docs/fsl.tools/en/index.html` contains no `unpkg.com` and no
    `fonts.googleapis.com`,
  - the prerendered `#root` is non-empty,
  - `docs/fsl.tools/en/cookbook/index.html` and `manifest.json` exist and the
    recipe count matches `recipes/*.cjs`.
- **Hydration check** (Playwright — already in the repo): serve the built
  `docs/` locally, load the homepage, assert **no hydration-mismatch console
  errors**, and that one interactive element works (e.g., Install tab switch /
  copy button).

## Out of scope / risks

- Not changing content/copy, not redesigning, no real i18n machinery.
- The generic `github.com` link in the (deleted) cookbook footer is moot; the
  Hero `discord.gg/fsl` link is content, left as-is.
- **Risk — hydration mismatch** from nondeterministic initial render: mitigated
  by the conversion guardrails + the Playwright check.
- **Risk — React 18 vs 19** behavioral drift: avoided by pinning 18.3.x.
- **Risk — `docs/` is wiped by `clean`**: all source lives under `src/`; only
  build output lands in `docs/`. (This spec lives in `src/specs/`, outside `docs/`.)

## Future work (not now)

- Add a second language as a sibling `docs/fsl.tools/<lang>/` folder; at that
  point externalize homepage strings so one client bundle can serve all
  languages (today the bundle has English text inline).
- A language picker at `docs/fsl.tools/index.html`.
- Move shared images / favicon / OG cards into `assets/`.
