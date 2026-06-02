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

import { buildPlan } from '../../build_js/build_config.js';
import { mkdtempSync, rmSync, writeFileSync, readFileSync as _readFileSync } from 'fs';
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
      expect(disabled.sort()).toEqual(['docs', 'site'].sort());
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

describe('buildPlan — env-var and CLI feature overrides', () => {
  const baseAllOn = {
    features: { docs: true, eslint: true, cloc: true, changelog: true,
                viz_png: true, terser: true, attw: true, site: true },
  };

  it('BUILD_DISABLE turns off listed features', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      const { disabled } = buildPlan({ cwd, argv: [], env: { BUILD_DISABLE: 'docs,eslint' } });
      expect(disabled.sort()).toEqual(['docs', 'eslint', 'site'].sort());
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

describe('buildPlan — env-var BUILD_ONLY and BUILD_DISABLE conflict', () => {
  const baseAllOn = {
    features: { docs: true, eslint: true, cloc: true, changelog: true,
                viz_png: true, terser: true, attw: true, site: true },
  };

  it('BUILD_ONLY combined with sibling BUILD_DISABLE in the same env errors out', () => {
    const cwd = makeTmpRepo({ 'build.config.json': JSON.stringify(baseAllOn) });
    try {
      expect(() =>
        buildPlan({ cwd, argv: [], env: { BUILD_ONLY: 'eslint', BUILD_DISABLE: 'docs' } })
      ).toThrow(/BUILD_ONLY.*conflicts/i);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});

describe('JSON Schema / FEATURES catalog drift guard', () => {
  it('build.config.schema.json FeatureFlags lists exactly the OPTIONAL_FEATURE_NAMES', async () => {
    const { OPTIONAL_FEATURE_NAMES: optNames } = await import('../../build_js/build_config_schema.js');
    const schemaPath = join(process.cwd(), 'build.config.schema.json');
    const schema = JSON.parse(_readFileSync(schemaPath, 'utf8'));
    const schemaFeatureNames = Object.keys(schema.definitions.FeatureFlags.properties);
    expect(schemaFeatureNames.sort()).toEqual([...optNames].sort());
  });
});

describe('buildPlan — --enable positive test', () => {
  it('--enable lifts a feature that the base config set to false', () => {
    const cwd = makeTmpRepo({
      'build.config.json': JSON.stringify({
        features: { docs: false, eslint: true, cloc: true, changelog: true,
                    viz_png: true, terser: true, attw: true, site: true },
      }),
    });
    try {
      const { disabled } = buildPlan({ cwd, argv: ['--enable=docs'], env: {} });
      expect(disabled).toEqual([]);
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });
});
