# CONTRIBUTING.md Design Spec

## Overview

A general-purpose CONTRIBUTING.md for projects bootstrapped from this template. FAQ/cookbook style, targeting intermediate developers who know git/npm/PRs but not this project's specific conventions.

## Format

Each entry follows a consistent pattern:

1. One-sentence summary
2. Commands to run or files to touch
3. Concrete example where helpful
4. Gotchas, if any

## Table of Contents (cookbook entries)

### 1. How do I set up my development environment?

- Clone, `npm install`, `npm run build` to verify
- Mention Node 23+ (from CI matrix)
- No other prerequisites beyond Node and npm

### 2. How do I add a function?

- Write the function in a file under `src/ts/`
- Add a DocBlock: `@param`, `@returns`, `@example` (success + failure), `@throws`, `@since`, `@author`
- Create a unit test (`src/ts/tests/*.spec.ts`)
- Create a stochastic test (`src/ts/tests/*.stoch.ts`)
- Export from `src/ts/index.ts`
- Update `base_README.md` (never edit `README.md` directly — it's generated at build time)
- Example: show the `double()` pattern as a reference (function + docblock + test + stoch + export)

### 3. How do I run tests?

- `npm run just_test` runs both unit and stochastic suites
- Three test categories:
  - **Unit tests** (`*.spec.ts`) — vitest, traditional assertions
  - **Stochastic tests** (`*.stoch.ts`) — vitest + fast-check, property-based
  - **E2E tests** (`src/ts/e2e/`) — Playwright, run separately via `node src/build_js/hosted_test.js`
- Coverage thresholds: 80% for lines, branches, functions, statements
- Tests run as part of the full build pipeline; a failing test fails the build

### 4. How do I add a unit test?

- Create `src/ts/tests/<name>.spec.ts`
- Import from the source file using `.js` extension (TypeScript ESM convention)
- Use `describe`/`test`/`expect` (vitest globals)
- Show example based on `stub.spec.ts`
- Gotcha: no fake tests — tests must exercise the actual function, not just assert pre-computed values

### 5. How do I add a stochastic test?

- Create `src/ts/tests/<name>.stoch.ts`
- Import `fast-check` as `fc`
- Use `fc.assert(fc.property(...))` to define properties
- Explain when to use: when a function's correctness can be expressed as a property that holds for all valid inputs (e.g., "doubling always returns a number", "encoding then decoding is identity")
- Show example based on `stub.stoch.ts`
- Separate coverage report in `coverage-stoch/`

### 6. How do I add an E2E test?

- Create test files in `src/ts/e2e/`
- Uses Playwright (`@playwright/test`)
- Run via `node src/build_js/hosted_test.js` (starts a local server on port 15512, runs tests, tears down)
- Tests run against the built site in `docs/`
- Build first (`npm run build`), then run E2E separately
- Show example: checking that a page returns 200, that a script tag is attached

### 7. How do I run the linter?

- `npm run eslint`
- What it covers: TypeScript (strict + stylistic type-checked), JavaScript, Markdown (GFM), CSS
- Linting runs as part of the full build
- Test files (`*.spec.*`, `*.stoch.*`) are excluded from ESLint

### 8. How do I build the project?

- `npm run build`
- The pipeline in plain English:
  1. Clean output directories
  2. Run unit + stochastic tests, save results
  3. Compile TypeScript
  4. Generate TypeDoc documentation
  5. Interpolate coverage/version into README (madlibs)
  6. Re-run TypeDoc (picks up updated README)
  7. Lint everything
  8. Bundle into ESM, CJS, and IIFE via Rollup
  9. Minify with Terser (with source maps)
  10. Extract `.d.ts` and generate `.d.cts`
  11. Validate type resolution across module systems (attw)
  12. Assemble the site and generate changelogs
- If the build passes, everything is green: tests, types, lint, bundling, and type resolution

### 9. How do I write documentation?

- Use DocBlock (JSDoc) format in the source
- Required tags: `@param` (with type and description), `@returns`, `@example`
- Recommended tags: `@throws`, `@since`, `@author`, `@category`
- Examples should show both success and failure cases where applicable
- TypeDoc generates HTML docs from these blocks; `typedoc-plugin-coverage` tracks completeness
- The madlibs system: `base_README.md` is the template with `{{placeholders}}`; `update_madlibs.js` fills them at build time. Always edit `base_README.md`, never `README.md`.

### 10. How do I write a commit message?

- Conventional Commits format, enforced by commitlint
- Format: `type(scope): description`
- Common types: `feat`, `fix`, `docs`, `build`, `test`, `refactor`, `chore`, `ci`, `perf`
- Subject: lowercase, no trailing period, imperative mood
- Examples:
  - `feat: add email validation function`
  - `fix: handle NaN input in double()`
  - `docs: add @throws tag to parser functions`
  - `build: upgrade vitest to v4`

### 11. How do I submit a pull request?

- Branch from `main`
- Make sure `npm run build` passes locally
- PR against `main`
- CI runs the full build on: ubuntu/macOS/Windows x Node 23/24
- All matrix jobs must pass before merge

## What this file does NOT cover

- Template infrastructure internals (madlibs scripts, build_js, rollup config) — those are documented in the source
- IDE setup or editor preferences
- Deployment or publishing workflow

## License mention

Brief note at the top that the project is MIT licensed, linking to LICENSE.
