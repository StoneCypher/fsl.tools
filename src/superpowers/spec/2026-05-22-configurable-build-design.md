# Configurable Build via Cascading JSON

## Overview

Replace `run_build.js`'s hardcoded `STAGES` array with a config-driven build plan. The orchestrator reads layered JSON config files plus env vars and CLI flags, validates via `zod`, resolves feature dependencies, and emits a stage list to run.

This is the foundation PR. It adds the config infrastructure but no new coverage types — each planned coverage type (`type_coverage`, `e2e`, `example_coverage`, `license_check`, `a11y_coverage`, `perf_coverage`) gets its own subsequent PR that extends the schema by one entry.

## Goals

- Toggle optional build features via JSON, not code changes
- Support named profiles (`fast`, `ci`, `release`) declared inside config
- Support per-environment config files (`build.config.<env>.json`)
- Support developer-local override (`build.config.local.json`, gitignored)
- Support one-off overrides via env vars and CLI flags
- Reject unknown keys at parse time (zod `.strict()`) — no silent typos
- Auto-skip features whose required upstream dependencies are disabled

## Non-goals

- Adding any new coverage types (each is its own subsequent PR)
- Replacing typedoc#1 with a fast doc-coverage script (separate PR; easier on this foundation)
- Per-script wall-clock timing in the orchestrator (separate small PR if requested)
- Hot reload, web UI for config, per-environment cascading via `NODE_ENV` auto-detect

## Mandatory vs optional steps

**Mandatory (always run; cannot be disabled — `--disable=typescript` errors out):**

- `clean`
- `typescript`
- `just_test_save` (per user memory: tests stay in build)
- `rollup`
- `dts`
- `update_madlibs`

**Optional (default on; can be disabled):**

- `docs`, `eslint`, `cloc`, `changelog`, `viz_png`, `terser`, `attw`, `site`

## Cascade order (last wins)

1. Schema defaults (built-in)
2. `build.config.json` (committed root config)
3. Active profile, expanded from `profiles.<name>` found in any layer (selected via `--profile` / `BUILD_PROFILE`)
4. `build.config.<env>.json` (committed env-specific; env selected via `--env` / `BUILD_ENV`)
5. `build.config.local.json` (gitignored, per-developer)
6. Env vars: `BUILD_SKIP`, `BUILD_ONLY`, `BUILD_ENABLE`, `BUILD_DISABLE`
7. CLI flags: `--skip=`, `--only=`, `--enable=`, `--disable=`

Rules:

- Within the CLI layer (and within the env-var layer), if `--only` (or `BUILD_ONLY`) is present, it is authoritative for that layer: features not listed are treated as disabled and any sibling `--skip` / `--enable` / `--disable` flags in the same layer error out as conflicting
- When `--only` is not present, `--skip` and `--disable` are synonyms; `--enable` / `--disable` / `--skip` are applied in CLI argument order with last-wins per feature
- `NODE_ENV` is NOT consulted (explicit `BUILD_ENV` only — avoids surprises from external env)
- A missing config file at any layer is silent (not an error) — only required file is the base `build.config.json`; missing base errors out
- Profiles are flat (no nested profile-references) for simplicity
- A profile named in `--profile=NAME` that doesn't exist in any layer errors out
- If multiple layers define the same profile name, the later layer's profile definition replaces the earlier one wholesale (no per-key merge inside a profile); this avoids "partial profile" surprises

## Sample `build.config.json`

```jsonc
{
  "$schema": "./build.config.schema.json",
  "features": {
    "docs":      true,
    "eslint":    true,
    "cloc":      true,
    "changelog": true,
    "viz_png":   true,
    "terser":    true,
    "attw":      true,
    "site":      true
  },
  "profiles": {
    "fast": {
      "features": {
        "docs": false, "eslint": false, "cloc": false, "changelog": false,
        "viz_png": false, "attw": false, "site": false
      }
    },
    "ci": {
      "features": {
        "docs": true, "eslint": true, "cloc": true, "changelog": true,
        "viz_png": true, "terser": true, "attw": true, "site": true
      }
    },
    "release": {
      "features": {
        "docs": true, "eslint": true, "cloc": true, "changelog": true,
        "viz_png": true, "terser": true, "attw": true, "site": true
      }
    }
  }
}
```

## Schema

Implemented in `src/build_js/build_config_schema.js` using `zod`:

```js
const FeatureFlags = z.object({
  docs:      z.boolean().optional(),
  eslint:    z.boolean().optional(),
  cloc:      z.boolean().optional(),
  changelog: z.boolean().optional(),
  viz_png:   z.boolean().optional(),
  terser:    z.boolean().optional(),
  attw:      z.boolean().optional(),
  site:      z.boolean().optional(),
}).strict();

const Profile = z.object({
  features: FeatureFlags.optional(),
}).strict();

const BuildConfig = z.object({
  $schema:  z.string().optional(),
  features: FeatureFlags.optional(),
  profiles: z.record(z.string(), Profile).optional(),
}).strict();
```

`.strict()` rejects unknown keys: a typo `"esling": false` fails parse with a clear error pointing at the source layer and the offending key.

## Feature catalog

Each feature declares stage assignment and dependencies, also in `build_config_schema.js`:

```js
export const FEATURES = {
  // mandatory
  clean:          { stages: [0], mandatory: true, script: 'clean' },
  typescript:     { stages: [1], mandatory: true, script: 'typescript' },
  just_test_save: { stages: [1], mandatory: true, script: 'just_test_save' },
  rollup:         { stages: [2], mandatory: true, script: 'rollup' },
  dts:            { stages: [2], mandatory: true, script: 'dts' },
  update_madlibs: { stages: [2], mandatory: true, script: 'update_madlibs' },

  // optional
  docs:      { stages: [1, 4], optional: true, defaultEnabled: true, script: 'docs' },
  eslint:    { stages: [1],    optional: true, defaultEnabled: true, script: 'eslint' },
  cloc:      { stages: [1],    optional: true, defaultEnabled: true, script: 'cloc' },
  changelog: { stages: [1],    optional: true, defaultEnabled: true, script: 'changelog' },
  viz_png:   { stages: [3],    optional: true, defaultEnabled: true, script: 'viz_png', requires: ['rollup'] },
  terser:    { stages: [3],    optional: true, defaultEnabled: true, script: 'terser',  requires: ['rollup'] },
  attw:      { stages: [4],    optional: true, defaultEnabled: true, script: 'attw' },
  site:      { stages: [5],    optional: true, defaultEnabled: true, script: 'site',    requires: ['docs'] },
};
```

`docs` runs in stages 1 and 4 — one feature, two invocations (matches current behavior where typedoc runs once for coverage JSON, once for final HTML).

## Dependency-aware skip

When a feature's `requires` list contains a disabled feature, the dependent feature is auto-disabled and a warning logged to stdout: `[build] auto-disabling site because required feature docs is disabled`. Mandatory features always satisfy `requires`.

## Files added/modified

```text
src/build_js/build_config.js              (new) — load, merge, validate, plan
src/build_js/build_config_schema.js       (new) — zod schema + FEATURES catalog
src/build_js/run_build.js                 (mod) — call into build_config to get plan
src/build_js/tests/build_config.spec.ts   (new) — unit tests
src/build_js/tests/build_config.stoch.ts  (new) — stochastic plan-validity tests
build.config.json                         (new) — committed defaults
build.config.schema.json                  (new) — JSON Schema for editor IntelliSense
.gitignore                                (mod) — add build.config.local.json
```

## API surface of `build_config.js`

```js
/**
 * Load all config layers, apply env/CLI overrides, validate via zod,
 * resolve dependencies, return a runnable plan.
 *
 * @param {{ argv?: string[], env?: Record<string,string>, cwd?: string }} opts
 *   argv defaults to process.argv.slice(2), env to process.env, cwd to process.cwd()
 * @returns {{ stages: string[][], disabled: string[], warnings: string[] }}
 *   stages[i] is the parallel-runnable script names for stage i;
 *   disabled is the final list of features turned off;
 *   warnings includes auto-disable cascades and any non-fatal config issues
 *
 * @throws {Error} If config is invalid (unknown key, bad type, missing profile,
 *   attempt to disable a mandatory feature)
 */
export function buildPlan(opts);
```

## Tests

Per CLAUDE.md every entity gets tests. Coverage:

**Unit (`build_config.spec.ts`):**
- Schema accepts valid configs
- Schema rejects unknown keys with helpful error
- Schema rejects wrong types
- Cascade: each layer overrides the prior (file → profile → env-file → local → env → CLI)
- `--only` beats `--skip`
- `--profile=missing` errors out
- Disabling a mandatory feature errors out
- Dependency cascade: disabling `docs` auto-disables `site` with warning
- Plan-building: enabled features bucket into correct stage indices
- Missing optional config file is silent (only `build.config.json` is required)

**Stochastic (`build_config.stoch.ts`):**
- Random valid configs always produce a non-empty stage list
- Random valid configs never include mandatory features in the disabled list
- Random valid configs always include `clean` in stage 0

## Migration

`run_build.js` keeps its current behavior when `build.config.json` is present with all-optional features set to `true`. The default `build.config.json` shipped in this PR matches today's behavior exactly. Existing CI/dev workflows continue to pass without changes.

## Risks

- **Cascade complexity** — six layers is a lot. Mitigation: stochastic tests over random layer combinations; clear stdout summary of effective config when `BUILD_VERBOSE=1`.
- **Schema drift across PRs** — each future coverage PR extends the schema; risk of merge conflicts. Mitigation: keep the schema sorted and one-key-per-line so conflicts are localized.
- **Mandatory list disagreement** — what if a future contributor disagrees that `update_madlibs` is mandatory? Mitigation: documented in this spec and inline in `FEATURES` with the reason.
