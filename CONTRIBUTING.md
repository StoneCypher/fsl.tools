# Contributing

This project is MIT licensed. Contributions are welcome.

## Table of contents

- [How do I set up my development environment?](#how-do-i-set-up-my-development-environment)
- [How do I add a function?](#how-do-i-add-a-function)
- [How do I run tests?](#how-do-i-run-tests)
- [How do I add a unit test?](#how-do-i-add-a-unit-test)
- [How do I add a stochastic test?](#how-do-i-add-a-stochastic-test)
- [How do I add an E2E test?](#how-do-i-add-an-e2e-test)
- [How do I run the linter?](#how-do-i-run-the-linter)
- [How do I build the project?](#how-do-i-build-the-project)
- [How do I write documentation?](#how-do-i-write-documentation)
- [How do I write a commit message?](#how-do-i-write-a-commit-message)
- [How do I submit a pull request?](#how-do-i-submit-a-pull-request)

---

## How do I set up my development environment?

Clone the repo, install dependencies, and run a full build to verify everything works.

```bash
git clone <repo-url>
cd <repo-name>
npm install
npm run build
```

You need Node 23 or later. No other prerequisites beyond Node and npm.

---

## How do I add a function?

Every function needs source code, documentation, tests, and an export.

1. Write the function in a file under `src/ts/`.
2. Add a DocBlock (see [How do I write documentation?](#how-do-i-write-documentation)).
3. Create a unit test in `src/ts/tests/<name>.spec.ts`.
4. Create a stochastic test in `src/ts/tests/<name>.stoch.ts`.
5. Export the function from `src/ts/index.ts`.
6. Update `base_README.md` if the function affects the public API.

For a complete example of this pattern, look at `src/ts/stub.ts`, its tests in `src/ts/tests/stub.spec.ts` and `src/ts/tests/stub.stoch.ts`, and its export in `src/ts/index.ts`.

**Gotcha:** Never edit `README.md` directly. It is generated from `base_README.md` at build time by the madlibs system. Always edit `base_README.md` instead.

---

## How do I run tests?

Run both unit and stochastic test suites:

```bash
npm run just_test
```

This project has three test categories:

| Category | Files | Tool | Run with |
|---|---|---|---|
| Unit | `src/ts/tests/*.spec.ts` | vitest | `npm run just_test` |
| Stochastic | `src/ts/tests/*.stoch.ts` | vitest + fast-check | `npm run just_test` |
| E2E | `src/ts/e2e/*.spec.ts` | Playwright | `node src/build_js/hosted_test.js` |

Coverage thresholds are 80% for lines, branches, functions, and statements. Tests also run as part of `npm run build` — a failing test fails the build.

---

## How do I add a unit test?

Create a file at `src/ts/tests/<name>.spec.ts`.

```ts
import { myFunction } from '../myModule.js';

describe('myFunction', () => {
  test('returns the expected result', () => {
    expect(myFunction(2)).toBe(4);
  });
});
```

Import source files using the `.js` extension — this is the TypeScript ESM module resolution convention.

**Gotcha:** No fake tests. A fake test computes the expected output and then checks that, instead of exercising the actual function. Every test must call the real function and assert against a known-correct value.

---

## How do I add a stochastic test?

Create a file at `src/ts/tests/<name>.stoch.ts`. Stochastic tests use [fast-check](https://github.com/dubzzz/fast-check) for property-based testing.

```ts
import * as fc    from 'fast-check';
import { myFunction } from '../myModule.js';

describe('myFunction stochastic', () => {
  test('always returns a positive number for positive input', () => {
    fc.assert(
      fc.property(fc.float({ min: 1 }), (n: number) => {
        expect(myFunction(n)).toBeGreaterThan(0);
      })
    );
  });
});
```

Use stochastic tests when a function's correctness can be expressed as a property that holds for all valid inputs — for example, "encoding then decoding is identity", "output is always a number", or "result is never negative for positive input".

Stochastic coverage is reported separately in `coverage-stoch/`.

---

## How do I add an E2E test?

Create test files in `src/ts/e2e/`. E2E tests use Playwright and run against the built site.

```ts
import { test, expect } from '@playwright/test';

test.describe('/my-page.html', () => {
  test('returns a 200 status', async ({ page }) => {
    const response = await page.goto('/my-page.html');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });
});
```

E2E tests are separate from the main build. Build first, then run them:

```bash
npm run build
node src/build_js/hosted_test.js
```

The test harness starts a local server on port 15512, runs Playwright against it, and tears the server down when finished.

---

## How do I run the linter?

```bash
npm run eslint
```

ESLint is configured with strict, type-checked rules for:

- **TypeScript** (`.ts`, `.mts`, `.cts`) — `strictTypeChecked` + `stylisticTypeChecked`
- **JavaScript** (`.js`, `.mjs`, `.cjs`) — recommended rules, no type checking
- **Markdown** (`.md`) — GFM recommended rules
- **CSS** (`.css`) — recommended rules

Linting also runs as part of `npm run build`. Test files (`*.spec.*`, `*.stoch.*`) are excluded from ESLint.

---

## How do I build the project?

```bash
npm run build
```

The build pipeline runs these steps in order:

1. Clean output directories (`build/`, `dist/`, `docs/`)
2. Run unit and stochastic tests, save results
3. Compile TypeScript
4. Generate TypeDoc documentation
5. Interpolate coverage and version into README (madlibs)
6. Re-run TypeDoc with the updated README
7. Lint everything
8. Bundle into ESM, CJS, and IIFE via Rollup
9. Minify with Terser (with source maps)
10. Extract `.d.ts` and generate `.d.cts`
11. Validate type resolution across module systems (attw)
12. Assemble the site and generate changelogs

If the build passes, everything is green: tests, types, lint, bundling, and type resolution.

---

## How do I write documentation?

Use DocBlock (JSDoc) format in the source. TypeDoc generates HTML documentation from these blocks.

**Required tags:**

- `@param {type} name` — description of each parameter
- `@returns {type}` — what the function returns
- `@example` — a working code example with expected output

**Recommended tags:**

- `@throws` — error conditions
- `@since` — version introduced
- `@author` — who wrote it
- `@category` — grouping in the generated docs

Show both success and failure cases in examples where applicable:

```ts
/**
 * Returns the arithmetic double of the input number.
 *
 * @param {number} x - The input value to be doubled
 * @returns {number} The doubled value
 *
 * @example
 * ```ts
 * console.log( double(3) );  // 6
 * ```
 *
 * @throws TypeError if `typeof x !== 'number'`
 *
 * @example
 * ```ts
 * double('three');  // throws TypeError
 * ```
 */
```

Documentation coverage is tracked by `typedoc-plugin-coverage`.

**Gotcha:** The README is generated. `base_README.md` contains `{{placeholders}}` like `{{version}}` and `{{coverage}}` that are filled in at build time. Always edit `base_README.md`.

---

## How do I write a commit message?

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint.

**Format:** `type(scope): description`

The scope is optional. The description should be lowercase, imperative mood, no trailing period.

**Common types:**

| Type | Use for |
|---|---|
| `feat` | A new function or feature |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `build` | Build system, dependencies, configuration |
| `test` | Adding or updating tests |
| `refactor` | Code changes that don't fix a bug or add a feature |
| `ci` | CI/CD configuration |
| `perf` | Performance improvements |
| `chore` | Maintenance tasks |

**Examples:**

```text
feat: add email validation function
fix: handle NaN input in double()
docs: add @throws tag to parser functions
build: upgrade vitest to v4
test: add stochastic tests for encoder
```

---

## How do I submit a pull request?

1. Create a branch from `main`.
2. Make your changes.
3. Run `npm run build` and make sure it passes.
4. Push your branch and open a PR against `main`.

CI runs the full build on a matrix of ubuntu, macOS, and Windows across Node 23 and 24. All matrix jobs must pass before merge.
