
import { defineConfig } from 'vitest/config';



export default defineConfig({

  test: {
    include: ['src/**/*.stoch.ts'],
    exclude: ['dist/**', 'node_modules/**', 'src/ts/e2e/**'],
    coverage: {
      enabled: true,
      reportsDirectory: './coverage-stoch',
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.stoch.ts', 'src/**/*.mutat.ts'],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    },
    globals: true
  },

});
