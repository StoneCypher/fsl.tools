Tasklist:

  Usability
  - [ ] Fast and slow build paths

  Code Quality & Safety
  - [x] Commit message linting (commitlint, conventional commits)
  - [x] (declined) ~~Pre-commit hooks (husky, lint-staged)~~
  - [x] (declined) ~~Dependency auditing (npm audit, socket.dev, Snyk)~~
  - [x] (declined) ~~License compliance scanning (license-checker, FOSSA)~~
  - [x] (issue tracker #7) Dead code detection (ts-prune, knip)
  - [x] (declined) ~~Circular dependency detection (madge, dpdm)~~
  - [x] (declined) ~~Import sorting/organization enforcement (eslint-plugin-import)~~
  - [x] (declined) ~~Spell checking in code/comments (cspell)~~
  - [x] (issue tracker #5) Secret detection (gitleaks, trufflehog)

  Type System
  - [x] Strict tsconfig (strictNullChecks, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
  - [x] API type extraction / .d.ts generation and validation
  - [x] Runtime type validation at boundaries (zod, valibot, arktype)

  Build & Distribution
  - [x] Package.json exports map (conditional exports for ESM/CJS/types)
  - [x] Dual-publish validation (attw, publint, are-the-types-wrong)
  - [x] Source maps (for debugging minified output)
  - [x] (declined) ~~Package size tracking (size-limit, bundlephobia)~~
  - [x] (issue tracker #3) Provenance statement (npm publish --provenance)
  - [x] (issue tracker #6) attestations

  CI/CD & Automation
  - [x] Matrix testing across Node versions
  - [x] OS-matrix testing (Linux/macOS/Windows)
  - [ ] Automated dependency updates (Renovate, Dependabot)
  - [x] Release automation (semantic-release, changesets, release-it)
  - [ ] Branch protection rules
  - [ ] Required status checks before merge
  - [x] (declined) ~~Automated canary/preview releases from PRs~~
  - [x] (declined) ~~Build caching (turborepo, nx)~~

  Developer Experience
  - [ ] Editor config (.editorconfig)
  - [ ] Workspace-level VS Code settings & recommended extensions
  - [ ] Debug launch configurations
  - [ ] Git hooks for auto-formatting on commit
  - [x] CONTRIBUTING.md with setup instructions
  - [x] Issue and PR templates
  - [x] Reproducible installs
    - [x] lockfile
    - [x] (declined) ~~pinned engines~~
    - [x] (declined) ~~corepack for package manager version)~~
  - [x] (declined) ~~.nvmrc / .node-version for Node version pinning~~

  Performance & Monitoring
  - [ ] Benchmarking harness (tinybench, vitest bench)
  - [ ] Performance regression detection in CI
  - [x] Bundle analysis visualization

  Documentation Beyond API Docs
  - [ ] Architecture decision records (ADRs)
  - [ ] Migration guides between major versions
  - [ ] Interactive examples / playground (Storybook, Ladle, or a custom one)
  - [x] (declined) ~~API compatibility reports between versions (api-extractor)~~

  Testing Beyond Unit/Property
  - [ ] E2E / integration testing (Playwright, which you have installed)
  - [x] Mutation testing (Stryker) — verifies your tests actually catch bugs
  - [ ] Snapshot testing
  - [x] (declined) ~~Visual regression testing~~
  - [x] (issue tracker #4) Contract testing (for APIs)
  - [x] Fuzz testing
  - [x] (declined) ~~Test impact analysis - only run tests affected by changes~~

  Security
  - [ ] CSP headers (if serving a frontend)
  - [ ] SBOM generation (software bill of materials)
  - [ ] Signed commits (GPG/SSH)
  - [ ] Signed packages

  Observability (for libraries)
  - [ ] Error boundary patterns
  - [ ] Structured logging
  - [ ] Debug namespace support (the debug package pattern)

  Governance & Community
  - [x] Code of conduct
  - [x] (declined) ~~ Security policy (SECURITY.md)~~
  - [x] (declined) ~~Deprecation policy~~
  - [x] (declined) ~~Support matrix (which Node/TS versions are supported)~~
  - [x] (declined) ~~Funding metadata (FUNDING.yml)~~
