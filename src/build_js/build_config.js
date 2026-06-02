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
  MANDATORY_FEATURE_NAMES,
  OPTIONAL_FEATURE_NAMES,
} from './build_config_schema.js';

const ALL_FEATURE_NAMES = [...MANDATORY_FEATURE_NAMES, ...OPTIONAL_FEATURE_NAMES];

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

  const cli = parseCliFlags(argv);
  const envOpts = parseEnvVars(env);

  // Within a single layer, --only conflicts with sibling --enable/--disable/--skip
  if (cli.only && (cli.enable.length || cli.disable.length)) {
    throw new Error('CLI --only conflicts with sibling --enable/--disable/--skip in the same invocation');
  }
  if (envOpts.only && (envOpts.enable.length || envOpts.disable.length)) {
    throw new Error('BUILD_ONLY conflicts with sibling BUILD_ENABLE/BUILD_DISABLE/BUILD_SKIP in the same environment');
  }

  validateOverrideLayer(cli,     'CLI');
  validateOverrideLayer(envOpts, 'env vars');

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

  applyOverrides(merged, envOpts);
  applyOverrides(merged, cli);

  const explicitlyDisabled = new Set(OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false));
  const warnings = resolveDependencies(merged, explicitlyDisabled);

  const stages = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings };
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

/**
 * Load and validate an optional config file. Returns null if the file
 * is absent; throws if it exists but is invalid JSON or fails schema validation.
 *
 * @param {string} path  Absolute path to the candidate config file.
 * @returns {object|null}
 */
function loadIfPresent(path) {
  if (!existsSync(path)) return null;
  return loadAndValidate(path);
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

/**
 * Parse the orchestrator's CLI argv into an override layer.
 * @param {string[]} argv  Typically process.argv.slice(2).
 * @returns {{profile?: string, env?: string, only?: string[], enable: string[], disable: string[]}}
 */
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

/**
 * Parse process.env into an override layer using the BUILD_* var names.
 * @param {Record<string,string>} env
 * @returns {{profile?: string, env?: string, only?: string[], enable: string[], disable: string[]}}
 */
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

/**
 * Apply enable/disable/only directives from an override layer onto a
 * mutable features map. `only` is exclusive: if present, every optional
 * feature not in `only` is set to false. Otherwise `enable` and `disable`
 * each set their listed features to true / false.
 *
 * @param {Record<string, boolean>} merged  Mutable map of feature -> enabled.
 * @param {{only?: string[], enable: string[], disable: string[]}} layer
 */
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

/**
 * Reject typos and protected-feature changes in an override layer.
 * Every name listed in enable/disable/only must be a known feature.
 * Mandatory features cannot be disabled. (They may appear in `only`
 * harmlessly — they still run regardless.)
 *
 * @param {{enable: string[], disable: string[], only?: string[]}} layer
 * @param {string} layerLabel  Used in error messages to identify the offending source.
 * @throws {Error} on unknown name or mandatory-feature disable attempt.
 */
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

/**
 * Cascade-disable optional features whose `requires` upstream is off.
 * Runs to a fixed point so transitive chains resolve in one call.
 * Emits a warning for each auto-disable EXCEPT when the dependent was
 * already explicitly disabled by the user (those need no narration).
 *
 * @param {Record<string, boolean>} merged  Mutable feature->enabled map.
 * @param {Set<string>} explicitlyDisabled  Names the user actively turned off.
 * @returns {string[]}  Warning lines for any auto-disables performed.
 */
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
