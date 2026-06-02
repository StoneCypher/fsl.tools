# Configurable Build via Cascading JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/build_js/run_build.js`'s hardcoded `STAGES` array with a config-driven plan loaded from cascading JSON files, env vars, and CLI flags, validated by zod.

**Architecture:** A separate `build_config.js` module loads layered JSON (`build.config.json` → optional `build.config.<env>.json` → optional `build.config.local.json`) plus env vars (`BUILD_*`) plus CLI flags, applies a selected profile, validates with zod, resolves feature dependencies, and emits a `{stages, disabled, warnings}` plan. `run_build.js` is reduced to a thin runner over that plan.

**Tech Stack:** Node ESM, zod (already in `devDependencies`), vitest + fast-check (already configured), no new runtime dependencies.

**Reference spec:** `src/superpowers/spec/2026-05-22-configurable-build-design.md`

---

## File Structure

```text
NEW  src/build_js/build_config_schema.js          zod schemas + FEATURES catalog (single source of truth)
NEW  src/build_js/build_config.js                 buildPlan() + helpers (load, merge, validate, dep-cascade)
MOD  src/build_js/run_build.js                    swap hardcoded STAGES for buildPlan() call
NEW  src/ts/tests/build_config.spec.ts            unit tests for buildPlan
NEW  src/ts/tests/build_config.stoch.ts           stochastic tests for plan validity
NEW  build.config.json                            committed defaults (all optionals on)
NEW  build.config.schema.json                     hand-written JSON Schema for IDE
MOD  .gitignore                                   add build.config.local.json
```

`build_config_schema.js` owns the FEATURES catalog and zod schema; `build_config.js` owns runtime logic; `run_build.js` becomes a thin executor. Test files go under `src/ts/tests/` to match the existing convention; they import the SUT via relative path (`../../build_js/build_config.js`).

---

## Task 1: Schema scaffold and FEATURES catalog

**Files:**
- Create: `src/build_js/build_config_schema.js`
- Create: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/build_config.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  BuildConfigSchema,
  FEATURES,
  MANDATORY_FEATURE_NAMES,
  OPTIONAL_FEATURE_NAMES,
} from '../../build_js/build_config_schema.js';

describe('build_config_schema', () => {
  it('exposes FEATURES catalog with mandatory and optional entries', () => {
    expect(FEATURES['typescript']?.mandatory).toBe(true);
    expect(FEATURES['eslint']?.optional).toBe(true);
    expect(MANDATORY_FEATURE_NAMES).toContain('typescript');
    expect(OPTIONAL_FEATURE_NAMES).toContain('eslint');
  });

  it('parses a minimal valid config', () => {
    const parsed = BuildConfigSchema.parse({
      features: { eslint: true, docs: false },
    });
    expect(parsed.features?.eslint).toBe(true);
    expect(parsed.features?.docs).toBe(false);
  });

  it('rejects unknown feature keys', () => {
    expect(() =>
      BuildConfigSchema.parse({ features: { esling: true } })
    ).toThrow(/esling/);
  });

  it('rejects wrong types', () => {
    expect(() =>
      BuildConfigSchema.parse({ features: { eslint: 'yes' } })
    ).toThrow();
  });

  it('rejects unknown top-level keys', () => {
    expect(() =>
      BuildConfigSchema.parse({ profle: 'fast' })
    ).toThrow(/profle/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: FAIL — `Cannot find module '../../build_js/build_config_schema.js'`

- [ ] **Step 3: Write minimal implementation**

Create `src/build_js/build_config_schema.js`:

```js
/**
 * zod schema and feature catalog for the configurable build orchestrator.
 *
 * FEATURES is the single source of truth for which scripts the build can
 * run, whether each is mandatory or optional, what stage(s) each belongs
 * to, and which other features it requires. The zod schema is derived
 * from the OPTIONAL_FEATURE_NAMES list so the two cannot drift.
 *
 * @example
 *   import { BuildConfigSchema } from './build_config_schema.js';
 *   const cfg = BuildConfigSchema.parse(JSON.parse(text));
 */

import { z } from 'zod';

/**
 * The feature catalog. Each entry maps a feature name to its build-orchestrator
 * metadata. `stages` is an array because some features (notably `docs`) are
 * intentionally invoked at more than one stage.
 */
export const FEATURES = {
  // mandatory — always run; not toggleable
  clean:          { stages: [0], mandatory: true, script: 'clean' },
  typescript:     { stages: [1], mandatory: true, script: 'typescript' },
  just_test_save: { stages: [1], mandatory: true, script: 'just_test_save' },
  rollup:         { stages: [2], mandatory: true, script: 'rollup' },
  dts:            { stages: [2], mandatory: true, script: 'dts' },
  update_madlibs: { stages: [2], mandatory: true, script: 'update_madlibs' },

  // optional — default on; can be toggled via config / env / CLI
  docs:      { stages: [1, 4], optional: true, defaultEnabled: true, script: 'docs' },
  eslint:    { stages: [1],    optional: true, defaultEnabled: true, script: 'eslint' },
  cloc:      { stages: [1],    optional: true, defaultEnabled: true, script: 'cloc' },
  changelog: { stages: [1],    optional: true, defaultEnabled: true, script: 'changelog' },
  viz_png:   { stages: [3],    optional: true, defaultEnabled: true, script: 'viz_png', requires: ['rollup'] },
  terser:    { stages: [3],    optional: true, defaultEnabled: true, script: 'terser',  requires: ['rollup'] },
  attw:      { stages: [4],    optional: true, defaultEnabled: true, script: 'attw' },
  site:      { stages: [5],    optional: true, defaultEnabled: true, script: 'site',    requires: ['docs'] },
};

export const MANDATORY_FEATURE_NAMES = Object.entries(FEATURES)
  .filter(([, def]) => def.mandatory)
  .map(([name]) => name);

export const OPTIONAL_FEATURE_NAMES = Object.entries(FEATURES)
  .filter(([, def]) => def.optional)
  .map(([name]) => name);

const featureFlagsShape = Object.fromEntries(
  OPTIONAL_FEATURE_NAMES.map(n => [n, z.boolean().optional()])
);

const FeatureFlags = z.object(featureFlagsShape).strict();

const Profile = z.object({
  features: FeatureFlags.optional(),
}).strict();

export const BuildConfigSchema = z.object({
  $schema:  z.string().optional(),
  features: FeatureFlags.optional(),
  profiles: z.record(z.string(), Profile).optional(),
}).strict();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config_schema.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): add zod schema and FEATURES catalog for config-driven build"
```

---

## Task 2: Plan generator for the default case (no overrides)

**Files:**
- Create: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
import { buildPlan } from '../../build_js/build_config.js';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function makeTmpRepo(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'buildcfg-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
  }
  return dir;
}

describe('buildPlan — defaults', () => {
  it('with all-on base config, produces every feature in correct stages', () => {
    const cwd = makeTmpRepo({
      'build.config.json': JSON.stringify({
        features: {
          docs: true, eslint: true, cloc: true, changelog: true,
          viz_png: true, terser: true, attw: true, site: true,
        },
      }),
    });
    try {
      const { stages, disabled, warnings } = buildPlan({ cwd, argv: [], env: {} });
      expect(stages[0]).toEqual(['clean']);
      expect(stages[1]?.sort()).toEqual(
        ['changelog', 'cloc', 'docs', 'eslint', 'just_test_save', 'typescript'].sort()
      );
      expect(stages[2]?.sort()).toEqual(['dts', 'rollup', 'update_madlibs'].sort());
      expect(stages[3]?.sort()).toEqual(['terser', 'viz_png'].sort());
      expect(stages[4]?.sort()).toEqual(['attw', 'docs'].sort());
      expect(stages[5]).toEqual(['site']);
      expect(disabled).toEqual([]);
      expect(warnings).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('errors if build.config.json is missing', () => {
    const cwd = makeTmpRepo({});
    try {
      expect(() => buildPlan({ cwd, argv: [], env: {} })).toThrow(/build\.config\.json/);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "buildPlan"`
Expected: FAIL — `Cannot find module '../../build_js/build_config.js'`

- [ ] **Step 3: Write minimal implementation**

Create `src/build_js/build_config.js`:

```js
/**
 * Config-driven build planner. Loads layered JSON config, applies the
 * selected profile, overlays env-var and CLI overrides, validates with
 * zod, resolves feature dependencies, and returns a runnable stage plan.
 *
 * @example
 *   import { buildPlan } from './build_config.js';
 *   const { stages } = buildPlan();
 *   for (const stage of stages) await Promise.all(stage.map(runScript));
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  BuildConfigSchema,
  FEATURES,
  OPTIONAL_FEATURE_NAMES,
} from './build_config_schema.js';

/**
 * Build the effective stage plan from layered config + overrides.
 *
 * @param {{ argv?: string[], env?: Record<string,string>, cwd?: string }} opts
 * @returns {{ stages: string[][], disabled: string[], warnings: string[] }}
 *   stages[i] is the list of script names that should run in parallel as
 *   stage i; disabled lists optional features turned off; warnings notes
 *   any auto-disable cascades or non-fatal issues.
 *
 * @throws {Error} if build.config.json is missing, a referenced profile
 *   doesn't exist, a mandatory feature is targeted for disable, or zod
 *   rejects any layer.
 */
export function buildPlan(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const env  = opts.env  ?? process.env;
  const cwd  = opts.cwd  ?? process.cwd();

  const basePath = join(cwd, 'build.config.json');
  if (!existsSync(basePath)) {
    throw new Error(`Missing required config file: ${basePath}`);
  }
  const base = loadAndValidate(basePath);

  // Merge feature flags through cascade (placeholder: just base for now)
  const merged = { ...defaultFeatures(), ...(base.features ?? {}) };

  // Build stage plan
  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);

  return { stages, disabled, warnings: [] };
}

function defaultFeatures() {
  return Object.fromEntries(
    OPTIONAL_FEATURE_NAMES.map(n => [n, FEATURES[n].defaultEnabled === true])
  );
}

function loadAndValidate(path) {
  const text = readFileSync(path, 'utf8');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error(`Invalid JSON in ${path}: ${e.message}`); }
  const result = BuildConfigSchema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid config in ${path}:\n${msg}`);
  }
  return result.data;
}

function bucketByStage(flags) {
  const byStage = new Map();
  for (const [name, def] of Object.entries(FEATURES)) {
    const enabled = def.mandatory || flags[name] === true;
    if (!enabled) continue;
    for (const idx of def.stages) {
      if (!byStage.has(idx)) byStage.set(idx, []);
      byStage.get(idx).push(def.script);
    }
  }
  if (byStage.size === 0) return [];
  const maxIdx = Math.max(...byStage.keys());
  const out = [];
  for (let i = 0; i <= maxIdx; i++) out.push(byStage.get(i) ?? []);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests pass (Task 1's 5 + Task 2's 2 = 7)

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): buildPlan reads base config and emits stage plan"
```

---

## Task 3: Profile selection and expansion

**Files:**
- Modify: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
describe('buildPlan — profiles', () => {
  const allOnConfig = {
    features: {
      docs: true, eslint: true, cloc: true, changelog: true,
      viz_png: true, terser: true, attw: true, site: true,
    },
    profiles: {
      fast: {
        features: {
          docs: false, eslint: false, cloc: false, changelog: false,
          viz_png: false, attw: false, site: false,
        },
      },
    },
  };

  it('applies a profile selected via env var', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(allOnConfig) });
    try {
      const { stages, disabled } = buildPlan({
        cwd, argv: [], env: { BUILD_PROFILE: 'fast' },
      });
      expect(disabled.sort()).toEqual(
        ['docs', 'eslint', 'cloc', 'changelog', 'viz_png', 'attw', 'site'].sort()
      );
      // Stage 1 should be just the mandatory entries
      expect(stages[1]?.sort()).toEqual(['just_test_save', 'typescript'].sort());
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('applies a profile selected via CLI flag, overriding env var', () => {
    const cwd = makeTmpRepo({
      'build.config.json': JSON.stringify({
        ...allOnConfig,
        profiles: {
          ...allOnConfig.profiles,
          ci: { features: { docs: true, eslint: true, cloc: true, changelog: true,
                            viz_png: true, terser: true, attw: true, site: true } },
        },
      }),
    });
    try {
      const { disabled } = buildPlan({
        cwd, argv: ['--profile=ci'], env: { BUILD_PROFILE: 'fast' },
      });
      expect(disabled).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('errors if selected profile does not exist', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(allOnConfig) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: ['--profile=nope'], env: {} })
      ).toThrow(/profile.*nope/i);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "profiles"`
Expected: FAIL — profiles aren't applied yet

- [ ] **Step 3: Write minimal implementation**

Replace the body of `buildPlan` in `src/build_js/build_config.js`:

```js
export function buildPlan(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const env  = opts.env  ?? process.env;
  const cwd  = opts.cwd  ?? process.cwd();

  const cli = parseCliFlags(argv);
  const envOpts = parseEnvVars(env);

  const basePath = join(cwd, 'build.config.json');
  if (!existsSync(basePath)) {
    throw new Error(`Missing required config file: ${basePath}`);
  }
  const base = loadAndValidate(basePath);

  const profileName = cli.profile ?? envOpts.profile;
  const merged = { ...defaultFeatures(), ...(base.features ?? {}) };

  if (profileName) {
    const profile = base.profiles?.[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found in build.config.json`);
    }
    Object.assign(merged, profile.features ?? {});
  }

  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings: [] };
}

function parseCliFlags(argv) {
  const out = { profile: undefined, env: undefined, only: undefined,
                enable: [], disable: [] };
  for (const arg of argv) {
    if (arg.startsWith('--profile=')) out.profile = arg.slice('--profile='.length);
    else if (arg.startsWith('--env='))     out.env     = arg.slice('--env='.length);
    else if (arg.startsWith('--only='))    out.only    = arg.slice('--only='.length).split(',').filter(Boolean);
    else if (arg.startsWith('--enable='))  out.enable.push(...arg.slice('--enable='.length).split(',').filter(Boolean));
    else if (arg.startsWith('--disable=')) out.disable.push(...arg.slice('--disable='.length).split(',').filter(Boolean));
    else if (arg.startsWith('--skip='))    out.disable.push(...arg.slice('--skip='.length).split(',').filter(Boolean));
  }
  return out;
}

function parseEnvVars(env) {
  const splitCsv = s => (s ?? '').split(',').filter(Boolean);
  return {
    profile: env.BUILD_PROFILE || undefined,
    env:     env.BUILD_ENV     || undefined,
    only:    env.BUILD_ONLY ? splitCsv(env.BUILD_ONLY) : undefined,
    enable:  splitCsv(env.BUILD_ENABLE),
    disable: [...splitCsv(env.BUILD_DISABLE), ...splitCsv(env.BUILD_SKIP)],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests including 3 new profile tests

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): apply selected profile (CLI > env var > none)"
```

---

## Task 4: Env-config and local-config overlays

**Files:**
- Modify: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
describe('buildPlan — file cascade', () => {
  it('overlays build.config.<env>.json on top of base', () => {
    const cwd = makeTmpRepo({
      'build.config.json': JSON.stringify({
        features: { docs: true, eslint: true, cloc: true, changelog: true,
                    viz_png: true, terser: true, attw: true, site: true },
      }),
      'build.config.ci.json': JSON.stringify({
        features: { eslint: false },
      }),
    });
    try {
      const { disabled } = buildPlan({ cwd, argv: ['--env=ci'], env: {} });
      expect(disabled).toEqual(['eslint']);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('overlays build.config.local.json on top of env file', () => {
    const cwd = makeTmpRepo({
      'build.config.json':       JSON.stringify({
        features: { docs: true, eslint: true, cloc: true, changelog: true,
                    viz_png: true, terser: true, attw: true, site: true },
      }),
      'build.config.ci.json':    JSON.stringify({ features: { eslint: false } }),
      'build.config.local.json': JSON.stringify({ features: { eslint: true, docs: false } }),
    });
    try {
      const { disabled } = buildPlan({ cwd, argv: ['--env=ci'], env: {} });
      expect(disabled).toEqual(['docs']);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('silently skips a missing optional layer', () => {
    const cwd = makeTmpRepo({
      'build.config.json': JSON.stringify({
        features: { docs: true, eslint: true, cloc: true, changelog: true,
                    viz_png: true, terser: true, attw: true, site: true },
      }),
    });
    try {
      const { disabled } = buildPlan({ cwd, argv: ['--env=nonexistent'], env: {} });
      expect(disabled).toEqual([]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "file cascade"`
Expected: FAIL — env/local files aren't loaded yet

- [ ] **Step 3: Write minimal implementation**

In `src/build_js/build_config.js`, update `buildPlan`:

```js
export function buildPlan(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const env  = opts.env  ?? process.env;
  const cwd  = opts.cwd  ?? process.cwd();

  const cli = parseCliFlags(argv);
  const envOpts = parseEnvVars(env);

  const basePath = join(cwd, 'build.config.json');
  if (!existsSync(basePath)) {
    throw new Error(`Missing required config file: ${basePath}`);
  }
  const base = loadAndValidate(basePath);

  const buildEnv = cli.env ?? envOpts.env;
  const envCfg = buildEnv
    ? loadIfPresent(join(cwd, `build.config.${buildEnv}.json`))
    : null;
  const localCfg = loadIfPresent(join(cwd, 'build.config.local.json'));

  // Collect profile definitions across all layers (later wins, wholesale)
  const allProfiles = {};
  for (const layer of [base, envCfg, localCfg]) {
    if (!layer?.profiles) continue;
    for (const [name, def] of Object.entries(layer.profiles)) {
      allProfiles[name] = def;
    }
  }

  const profileName = cli.profile ?? envOpts.profile;
  const merged = { ...defaultFeatures(), ...(base.features ?? {}) };

  if (profileName) {
    const profile = allProfiles[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found in any config layer`);
    }
    Object.assign(merged, profile.features ?? {});
  }

  // Layer overlays (after profile)
  if (envCfg?.features)   Object.assign(merged, envCfg.features);
  if (localCfg?.features) Object.assign(merged, localCfg.features);

  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings: [] };
}

function loadIfPresent(path) {
  if (!existsSync(path)) return null;
  return loadAndValidate(path);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests, including 3 new file-cascade tests

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): cascade env-file and local-file config layers"
```

---

## Task 5: Env-var and CLI feature overrides

**Files:**
- Modify: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
describe('buildPlan — env-var and CLI feature overrides', () => {
  const baseAllOn = {
    features: { docs: true, eslint: true, cloc: true, changelog: true,
                viz_png: true, terser: true, attw: true, site: true },
  };

  it('BUILD_DISABLE turns off listed features', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { disabled } = buildPlan({ cwd, argv: [], env: { BUILD_DISABLE: 'docs,eslint' } });
      expect(disabled.sort()).toEqual(['docs', 'eslint'].sort());
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('CLI --disable overrides env-var --enable for the same feature', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { disabled } = buildPlan({
        cwd,
        argv: ['--disable=docs'],
        env:  { BUILD_ENABLE: 'docs' },
      });
      expect(disabled).toContain('docs');
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('--only restricts to listed features, disabling all other optionals', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { disabled } = buildPlan({ cwd, argv: ['--only=eslint'], env: {} });
      expect(disabled.sort()).toEqual(
        ['attw', 'changelog', 'cloc', 'docs', 'site', 'terser', 'viz_png'].sort()
      );
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('--only combined with sibling --disable in the same layer errors out', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: ['--only=eslint', '--disable=docs'], env: {} })
      ).toThrow(/only.*conflict/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "env-var and CLI feature overrides"`
Expected: FAIL — overrides not applied yet

- [ ] **Step 3: Write minimal implementation**

In `src/build_js/build_config.js`, update `buildPlan` to apply overrides after the file/profile merge:

```js
export function buildPlan(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const env  = opts.env  ?? process.env;
  const cwd  = opts.cwd  ?? process.cwd();

  const cli = parseCliFlags(argv);
  const envOpts = parseEnvVars(env);

  // Within a single layer, --only conflicts with sibling --enable/--disable/--skip
  if (cli.only && (cli.enable.length || cli.disable.length)) {
    throw new Error('CLI --only conflicts with sibling --enable/--disable/--skip in the same invocation');
  }
  if (envOpts.only && (envOpts.enable.length || envOpts.disable.length)) {
    throw new Error('BUILD_ONLY conflicts with sibling BUILD_ENABLE/BUILD_DISABLE/BUILD_SKIP in the same environment');
  }

  const basePath = join(cwd, 'build.config.json');
  if (!existsSync(basePath)) {
    throw new Error(`Missing required config file: ${basePath}`);
  }
  const base = loadAndValidate(basePath);

  const buildEnv = cli.env ?? envOpts.env;
  const envCfg = buildEnv
    ? loadIfPresent(join(cwd, `build.config.${buildEnv}.json`))
    : null;
  const localCfg = loadIfPresent(join(cwd, 'build.config.local.json'));

  const allProfiles = {};
  for (const layer of [base, envCfg, localCfg]) {
    if (!layer?.profiles) continue;
    for (const [name, def] of Object.entries(layer.profiles)) {
      allProfiles[name] = def;
    }
  }

  const profileName = cli.profile ?? envOpts.profile;
  const merged = { ...defaultFeatures(), ...(base.features ?? {}) };

  if (profileName) {
    const profile = allProfiles[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found in any config layer`);
    }
    Object.assign(merged, profile.features ?? {});
  }
  if (envCfg?.features)   Object.assign(merged, envCfg.features);
  if (localCfg?.features) Object.assign(merged, localCfg.features);

  applyOverrides(merged, envOpts);
  applyOverrides(merged, cli);

  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings: [] };
}

function applyOverrides(merged, layer) {
  if (layer.only) {
    for (const n of OPTIONAL_FEATURE_NAMES) {
      merged[n] = layer.only.includes(n);
    }
    return;
  }
  for (const n of layer.enable)  merged[n] = true;
  for (const n of layer.disable) merged[n] = false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests including 4 new override tests

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): apply env-var and CLI feature overrides with only-conflict check"
```

---

## Task 6: Mandatory-feature protection

**Files:**
- Modify: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
describe('buildPlan — mandatory feature protection and unknown-name rejection', () => {
  const baseAllOn = {
    features: { docs: true, eslint: true, cloc: true, changelog: true,
                viz_png: true, terser: true, attw: true, site: true },
  };

  it('errors when CLI tries to disable a mandatory feature', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: ['--disable=typescript'], env: {} })
      ).toThrow(/mandatory.*typescript/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('errors when env var tries to disable a mandatory feature', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: [], env: { BUILD_SKIP: 'rollup' } })
      ).toThrow(/mandatory.*rollup/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('mandatory features always run regardless of --only', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { stages } = buildPlan({ cwd, argv: ['--only=eslint'], env: {} });
      const flat = stages.flat();
      expect(flat).toContain('typescript');
      expect(flat).toContain('rollup');
      expect(flat).toContain('eslint');
      expect(flat).not.toContain('docs');
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('rejects unknown feature names in CLI override lists', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: ['--disable=esling'], env: {} })
      ).toThrow(/unknown feature.*esling/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('rejects unknown feature names in env-var override lists', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: [], env: { BUILD_ONLY: 'eslnt' } })
      ).toThrow(/unknown feature.*eslnt/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "mandatory feature protection"`
Expected: FAIL — disabling a mandatory feature currently has no effect (or silently fails to throw)

- [ ] **Step 3: Write minimal implementation**

In `src/build_js/build_config.js`, update the import to include both name lists:

```js
import {
  BuildConfigSchema,
  FEATURES,
  MANDATORY_FEATURE_NAMES,
  OPTIONAL_FEATURE_NAMES,
} from './build_config_schema.js';

const ALL_FEATURE_NAMES = [...MANDATORY_FEATURE_NAMES, ...OPTIONAL_FEATURE_NAMES];
```

Then add this helper near the bottom of the file:

```js
function validateOverrideLayer(layer, layerLabel) {
  const allNames = [...layer.enable, ...layer.disable, ...(layer.only ?? [])];
  for (const n of allNames) {
    if (!ALL_FEATURE_NAMES.includes(n)) {
      throw new Error(`${layerLabel}: unknown feature "${n}"`);
    }
  }
  for (const n of layer.disable) {
    if (MANDATORY_FEATURE_NAMES.includes(n)) {
      throw new Error(`${layerLabel}: cannot disable mandatory feature "${n}"`);
    }
  }
}
```

And in `buildPlan`, right after the only-conflict check, call it:

```js
  validateOverrideLayer(cli,     'CLI');
  validateOverrideLayer(envOpts, 'env vars');
```

Note: `--only` is allowed to omit mandatory features — they always run regardless. But naming an unknown feature in any override list errors out, so typos like `--only=esling` or `BUILD_SKIP=eslnt` fail fast with a clear message.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests including 3 new mandatory-protection tests

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): reject attempts to disable mandatory features"
```

---

## Task 7: Dependency-aware skip cascade

**Files:**
- Modify: `src/build_js/build_config.js`
- Modify: `src/ts/tests/build_config.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/ts/tests/build_config.spec.ts`:

```ts
describe('buildPlan — dependency cascade', () => {
  const baseAllOn = {
    features: { docs: true, eslint: true, cloc: true, changelog: true,
                viz_png: true, terser: true, attw: true, site: true },
  };

  it('auto-disables site when docs is disabled and emits a warning', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { disabled, warnings } = buildPlan({
        cwd, argv: ['--disable=docs'], env: {},
      });
      expect(disabled.sort()).toEqual(['docs', 'site'].sort());
      expect(warnings.join('\n')).toMatch(/auto-disabling site.*docs/);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it('does not warn when a dependent is already explicitly disabled', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { warnings } = buildPlan({
        cwd, argv: ['--disable=docs,site'], env: {},
      });
      expect(warnings.length).toBe(0);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ts/tests/build_config.spec.ts -t "dependency cascade"`
Expected: FAIL — no cascade logic yet

- [ ] **Step 3: Write minimal implementation**

In `src/build_js/build_config.js`, add cascade resolution after override application and before stage bucketing:

```js
  const explicitlyDisabled = new Set(OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false));
  const warnings = resolveDependencies(merged, explicitlyDisabled);

  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings };
}

function resolveDependencies(merged, explicitlyDisabled) {
  const warnings = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, def] of Object.entries(FEATURES)) {
      if (!def.optional || merged[name] !== true) continue;
      if (!def.requires) continue;
      for (const req of def.requires) {
        const reqDef = FEATURES[req];
        const reqEnabled = reqDef.mandatory || merged[req] === true;
        if (!reqEnabled) {
          merged[name] = false;
          if (!explicitlyDisabled.has(name)) {
            warnings.push(`auto-disabling ${name} because required feature ${req} is disabled`);
            explicitlyDisabled.add(name);
          }
          changed = true;
        }
      }
    }
  }
  return warnings;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ts/tests/build_config.spec.ts`
Expected: PASS — all tests including 2 new cascade tests

- [ ] **Step 5: Commit**

```bash
git add src/build_js/build_config.js src/ts/tests/build_config.spec.ts
git commit -m "feat(build): cascade-disable optional features whose requires are off"
```

---

## Task 8: Stochastic tests for plan validity

**Files:**
- Create: `src/ts/tests/build_config.stoch.ts`

- [ ] **Step 1: Write the failing test (which will pass — stochastic tests guard invariants)**

Create `src/ts/tests/build_config.stoch.ts`:

```ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildPlan } from '../../build_js/build_config.js';
import {
  OPTIONAL_FEATURE_NAMES,
  MANDATORY_FEATURE_NAMES,
} from '../../build_js/build_config_schema.js';

function withTmpRepo<T>(files: Record<string, string>, fn: (cwd: string) => T): T {
  const cwd = mkdtempSync(join(tmpdir(), 'buildcfg-stoch-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(cwd, name), content);
  }
  try { return fn(cwd); }
  finally { rmSync(cwd, { recursive: true, force: true }); }
}

const featureFlagsArb = fc.dictionary(
  fc.constantFrom(...OPTIONAL_FEATURE_NAMES),
  fc.boolean(),
  { minKeys: 0, maxKeys: OPTIONAL_FEATURE_NAMES.length }
);

describe('buildPlan — stochastic invariants', () => {
  it('any valid config produces a non-empty stage list', () => {
    fc.assert(
      fc.property(featureFlagsArb, (features) => {
        withTmpRepo(
          { 'build.config.json': JSON.stringify({ features }) },
          (cwd) => {
            const { stages } = buildPlan({ cwd, argv: [], env: {} });
            expect(stages.length).toBeGreaterThan(0);
          }
        );
      }),
      { numRuns: 50 }
    );
  });

  it('mandatory features always appear in the plan', () => {
    fc.assert(
      fc.property(featureFlagsArb, (features) => {
        withTmpRepo(
          { 'build.config.json': JSON.stringify({ features }) },
          (cwd) => {
            const { stages } = buildPlan({ cwd, argv: [], env: {} });
            const flat = stages.flat();
            for (const name of MANDATORY_FEATURE_NAMES) {
              expect(flat).toContain(name);
            }
          }
        );
      }),
      { numRuns: 50 }
    );
  });

  it('disabled features never appear in the plan', () => {
    fc.assert(
      fc.property(featureFlagsArb, (features) => {
        withTmpRepo(
          { 'build.config.json': JSON.stringify({ features }) },
          (cwd) => {
            const { stages, disabled } = buildPlan({ cwd, argv: [], env: {} });
            const flat = stages.flat();
            for (const name of disabled) {
              expect(flat).not.toContain(name);
            }
          }
        );
      }),
      { numRuns: 50 }
    );
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run --config vitest-stoch.config.ts src/ts/tests/build_config.stoch.ts`
Expected: PASS — 3 stochastic properties hold across 50 random inputs each

- [ ] **Step 3: Commit**

```bash
git add src/ts/tests/build_config.stoch.ts
git commit -m "test(build): stochastic invariants for buildPlan (mandatory present, disabled absent)"
```

---

## Task 9: Wire buildPlan into run_build.js

**Files:**
- Modify: `src/build_js/run_build.js`

- [ ] **Step 1: Read the current run_build.js to confirm shape**

Run: `cat src/build_js/run_build.js | head -80`
Confirm: orchestrator drives off `STAGES` constant and calls `runScript(name)` per entry.

- [ ] **Step 2: Replace the orchestrator body**

Replace `src/build_js/run_build.js` entirely with:

```js
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
```

- [ ] **Step 3: Commit (before sample config — will fail until Task 10 lands)**

```bash
git add src/build_js/run_build.js
git commit -m "feat(build): run_build.js drives off buildPlan (config-driven)"
```

---

## Task 10: Sample config files and gitignore

**Files:**
- Create: `build.config.json`
- Create: `build.config.schema.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the default build.config.json**

Create `build.config.json` at repo root:

```json
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
        "docs":      false,
        "eslint":    false,
        "cloc":      false,
        "changelog": false,
        "viz_png":   false,
        "attw":      false,
        "site":      false
      }
    },
    "ci": {
      "features": {
        "docs":      true,
        "eslint":    true,
        "cloc":      true,
        "changelog": true,
        "viz_png":   true,
        "terser":    true,
        "attw":      true,
        "site":      true
      }
    },
    "release": {
      "features": {
        "docs":      true,
        "eslint":    true,
        "cloc":      true,
        "changelog": true,
        "viz_png":   true,
        "terser":    true,
        "attw":      true,
        "site":      true
      }
    }
  }
}
```

- [ ] **Step 2: Write the JSON Schema for IDE IntelliSense**

Create `build.config.schema.json` at repo root:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BuildConfig",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "$schema":  { "type": "string" },
    "features": { "$ref": "#/definitions/FeatureFlags" },
    "profiles": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "features": { "$ref": "#/definitions/FeatureFlags" }
        }
      }
    }
  },
  "definitions": {
    "FeatureFlags": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "docs":      { "type": "boolean" },
        "eslint":    { "type": "boolean" },
        "cloc":      { "type": "boolean" },
        "changelog": { "type": "boolean" },
        "viz_png":   { "type": "boolean" },
        "terser":    { "type": "boolean" },
        "attw":      { "type": "boolean" },
        "site":      { "type": "boolean" }
      }
    }
  }
}
```

- [ ] **Step 3: Update .gitignore**

Append to `.gitignore`:

```text
# Developer-local build config (per-machine overrides)
build.config.local.json
```

- [ ] **Step 4: Commit**

```bash
git add build.config.json build.config.schema.json .gitignore
git commit -m "feat(build): add default build.config.json, JSON Schema, and gitignore for local overrides"
```

---

## Task 11: End-to-end build verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full build at defaults**

Run: `npm run build`
Expected: build completes successfully (matches behavior before this PR — all features enabled).

- [ ] **Step 2: Run the build under the `fast` profile**

Run: `npm run build -- --profile=fast`
Expected: build completes; only mandatory features execute; `[build] disabled: ...` line appears listing the optionals.

- [ ] **Step 3: Run the build with an unknown profile**

Run: `npm run build -- --profile=does-not-exist`
Expected: build fails fast with `Profile "does-not-exist" not found in any config layer`.

- [ ] **Step 4: Run the build with a typo in build.config.local.json**

Create `build.config.local.json` with `{ "features": { "esling": false } }`, run `npm run build`.
Expected: build fails fast with a zod error pointing at `esling`. Remove the file afterward.

- [ ] **Step 5: Verify diagnostics on touched files**

Run: `mcp__ide__getDiagnostics` on `src/build_js/build_config.js`, `src/build_js/build_config_schema.js`, `src/build_js/run_build.js`, `src/ts/tests/build_config.spec.ts`, `src/ts/tests/build_config.stoch.ts`.
Expected: no errors, no deprecation warnings.

- [ ] **Step 6: Final commit (only if verification surfaced any tweaks)**

If any tweaks were needed, commit them with an appropriate message. Otherwise this task is a pure verification gate.

(IDE Schema validation of `build.config.json` against `build.config.schema.json` is an editor-side concern — VS Code and JetBrains IDEs pick it up automatically via the `$schema` reference. No programmatic verification is required as part of the build.)
