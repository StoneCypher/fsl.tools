
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["src/**/*.spec.*", "src/**/*.stoch.*", "src/**/*.mutat.*", "build/**", "coverage/**", "coverage-stoch/**", "dist/**", "docs/**", ".stryker-tmp/**", "typedoc-options.cjs", "**/CHANGELOG.md", "**/CHANGELOG.long.md", "src/doc_md/tasklist.md"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  { files: ["src/build_js/**/*.js"], languageOptions: { globals: globals.node } },
  ...tseslint.configs.strictTypeChecked.map(cfg => ({ ...cfg, files: ["**/*.{ts,mts,cts}"] })),
  ...tseslint.configs.stylisticTypeChecked.map(cfg => ({ ...cfg, files: ["**/*.{ts,mts,cts}"] })),
  {
    files: ["**/*.{ts,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/gfm", extends: ["markdown/recommended"] },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
  // The imported fsl.tools site CSS uses design-token custom properties whose
  // definitions live in a separate @import'd stylesheet; css/no-invalid-properties
  // can't resolve them across files and reports false positives. Scope just that
  // rule off for the site CSS (all other css rules stay on and are satisfied).
  { files: ["src/fsl.tools/site/**/*.css"], plugins: { css }, language: "css/css", rules: { "css/no-invalid-properties": "off" } },
]);
