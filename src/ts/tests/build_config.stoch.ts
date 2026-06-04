/**
 * Stochastic property tests for buildPlan invariants.
 *
 * Validates that the build orchestrator's plan generation adheres to
 * key properties across random inputs: all valid configs produce a plan,
 * mandatory features always appear, and disabled features never appear.
 */

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

/**
 * Create a temporary repo directory with the given files, run the callback,
 * and clean up. Returns the callback's return value.
 *
 * @param files Record of relative filename to file content.
 * @param fn Callback receiving the temporary directory path.
 */
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
