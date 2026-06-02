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
