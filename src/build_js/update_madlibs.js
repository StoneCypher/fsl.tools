import { readFileSync, writeFileSync, existsSync, unlinkSync, copyFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Format text with 24-bit ANSI color from a hex string
 * @param {string} hex - Hex color like '#dddd55'
 * @param {string} text - Text to colorize
 * @returns {string} ANSI-colored string
 */
function colorize(hex, text) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const open = `\x1b[38;2;${r};${g};${b}m`;
  // Re-apply this color after any nested reset, so nesting colorize calls works correctly
  // eslint-disable-next-line no-control-regex
  const restored = String(text).replace(/\x1b\[39m/g, `\x1b[39m${open}`);
  return `${open}${restored}\x1b[39m`;
}

// Output color for console messages
const OUTPUT_COLOR   = '#dddd55',
      SUCCESS_COLOR  = '#55dd55',
      TEMPLATE_COLOR = '#888888',
      VALUE_COLOR    = '#5588ff',
      WARN_COLOR     = '#ee6666';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Navigate to project root (two levels up from src/build_js)
const projectRoot = join(__dirname, '..', '..');

// Read package.json
const packageJsonPath = join(projectRoot, 'package.json');
const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageJsonContent);

// Get version
const version = packageJson.version;

// Get build timestamp
const built = new Date().getTime();
const built_text = new Date(built).toLocaleString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "PST",
  timeZoneName: "longOffset"
});

// Get git hash
let gh_hash = 'unknown';
try {
  const gitHash = execSync('git rev-parse HEAD', {
    cwd: projectRoot,
    encoding: 'utf8'
  }).trim();
  gh_hash = gitHash.substring(0, 7);
} catch (error) {
  console.warn(colorize(WARN_COLOR, `Warning: Could not determine git hash "${error}"`));
}

// Read saved test output (produced by run_tests_save.js earlier in the build)
const testOutputPath = join(projectRoot, 'build', 'test_output.txt');
console.log(colorize(OUTPUT_COLOR, 'Reading saved test output for coverage...'));
let coverage           = 'N/A';
let unitbranch         = 'N/A';
let unitfunc           = 'N/A';
let unitline           = 'N/A';
let stochcoverage      = 'N/A';
let stochbranch        = 'N/A';
let stochfunc          = 'N/A';
let stochline          = 'N/A';
let testcasecount      = 'N/A';
let unittestcount      = 'N/A';
let stochtestcount     = 'N/A';
let doccoverage        = 'N/A';
let docblockcount      = 'N/A';

/**
 * Parses coverage percentages and test count from a vitest output section.
 *
 * The v8 text reporter produces an "All files" summary line with four
 * pipe-delimited columns: % Stmts | % Branch | % Funcs | % Lines.
 *
 * @param {string} section - ANSI-stripped vitest output text for one test set.
 * @returns {{ stmts: string | null, branch: string | null, funcs: string | null, lines: string | null, testCount: string | null }}
 *   The four coverage percentages and the test count, or null for any not found.
 *
 * @example
 *   const result = parseTestSection('... All files |  96.89 |  79.73 |  92.3 |  97.09 | ... Tests  42 passed (42) ...');
 *   // result.stmts     → '96.89'
 *   // result.branch    → '79.73'
 *   // result.funcs     → '92.3'
 *   // result.lines     → '97.09'
 *   // result.testCount → '42'
 */
function parseTestSection(section) {
  const coverageMatch  = section.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
  const testCountMatch = section.match(/Tests\s+(\d+)\s+passed.*?\((\d+)\)/);
  return {
    stmts:     coverageMatch  ? coverageMatch[1]  : null,
    branch:    coverageMatch  ? coverageMatch[2]  : null,
    funcs:     coverageMatch  ? coverageMatch[3]  : null,
    lines:     coverageMatch  ? coverageMatch[4]  : null,
    testCount: testCountMatch ? testCountMatch[2] : null
  };
}

try {
  const testOutput = readFileSync(testOutputPath, 'utf8');

  // Strip ANSI codes for easier parsing
  // eslint-disable-next-line no-control-regex
  const cleanOutput = testOutput.replace(/\x1b\[[0-9;]*m/g, '');

  // Split on section markers produced by run_tests_save.js
  const unitSection  = cleanOutput.split('=== STOCHASTIC TESTS ===')[0] || '';
  const stochSection = cleanOutput.split('=== STOCHASTIC TESTS ===')[1] || '';

  const unitParsed  = parseTestSection(unitSection);
  const stochParsed = parseTestSection(stochSection);

  // Coverage from each test run
  if (unitParsed.stmts) {
    coverage   = unitParsed.stmts;
    unitbranch = unitParsed.branch;
    unitfunc   = unitParsed.funcs;
    unitline   = unitParsed.lines;
    console.log(colorize(SUCCESS_COLOR, `  Unit coverage: stmt ${colorize(VALUE_COLOR, coverage)}% branch ${colorize(VALUE_COLOR, unitbranch)}% func ${colorize(VALUE_COLOR, unitfunc)}% line ${colorize(VALUE_COLOR, unitline)}%`));
  }

  if (stochParsed.stmts) {
    stochcoverage = stochParsed.stmts;
    stochbranch   = stochParsed.branch;
    stochfunc     = stochParsed.funcs;
    stochline     = stochParsed.lines;
    console.log(colorize(SUCCESS_COLOR, `  Stochastic coverage: stmt ${colorize(VALUE_COLOR, stochcoverage)}% branch ${colorize(VALUE_COLOR, stochbranch)}% func ${colorize(VALUE_COLOR, stochfunc)}% line ${colorize(VALUE_COLOR, stochline)}%`));
  }

  // Individual test counts
  if (unitParsed.testCount) {
    unittestcount = unitParsed.testCount;
    console.log(colorize(SUCCESS_COLOR, `  Unit test count: ${colorize(VALUE_COLOR, unittestcount)}`));
  } else {
    console.warn(colorize(WARN_COLOR, '  Warning: Could not parse unit test count from output'));
  }

  if (stochParsed.testCount) {
    stochtestcount = stochParsed.testCount;
    console.log(colorize(SUCCESS_COLOR, `  Stochastic test count: ${colorize(VALUE_COLOR, stochtestcount)}`));
  } else {
    console.warn(colorize(WARN_COLOR, '  Warning: Could not parse stochastic test count from output'));
  }

  // Combined count
  const unitNum  = parseInt(unittestcount, 10)  || 0;
  const stochNum = parseInt(stochtestcount, 10) || 0;
  if (unitNum > 0 || stochNum > 0) {
    testcasecount = String(unitNum + stochNum);
    console.log(colorize(SUCCESS_COLOR, `  Total test count: ${colorize(VALUE_COLOR, testcasecount)}`));
  }
} catch (error) {
  console.warn(colorize(WARN_COLOR, `  Warning: Could not read test output from ${testOutputPath} "${error}"`));
}

// Read typedoc documentation coverage
const typedocCoveragePath = join(projectRoot, 'coverage-typedoc', 'coverage-typedoc.json');
console.log('\n' + colorize(OUTPUT_COLOR, 'Reading typedoc coverage...'));
try {
  const typedocRaw = readFileSync(typedocCoveragePath, 'utf8');
  const typedocData = JSON.parse(typedocRaw);

  if (typedocData.percent != null) {
    doccoverage = String(typedocData.percent);
    console.log(colorize(SUCCESS_COLOR, `  Documentation coverage: ${colorize(VALUE_COLOR, doccoverage)}%`));
  }

  if (typedocData.expected != null) {
    docblockcount = String(typedocData.expected);
    console.log(colorize(SUCCESS_COLOR, `  Documentable symbols: ${colorize(VALUE_COLOR, docblockcount)}`));
  }
} catch (error) {
  console.warn(colorize(WARN_COLOR, `  Warning: Could not read typedoc coverage from ${typedocCoveragePath} "${error}"`));
}

// Define paths
const readmePath = join(projectRoot, 'README.md');
const baseReadmePath = join(projectRoot, 'base_README.md');

// Delete existing README.md if it exists
if (existsSync(readmePath)) {
  unlinkSync(readmePath);
  console.log(colorize(TEMPLATE_COLOR, '\nDeleted existing README.md'));
}

// Copy base_README.md to README.md
copyFileSync(baseReadmePath, readmePath);
console.log(colorize(SUCCESS_COLOR, `  Copied ${colorize(VALUE_COLOR, 'base_README.md')} to ${colorize(VALUE_COLOR, 'README.md')}`));

// Read the new README.md
const readmeContent = readFileSync(readmePath, 'utf8');

// Replace all placeholders
let updatedContent = readmeContent.replace(/\{\{version\}\}/g, version);
updatedContent = updatedContent.replace(/\{\{coverage\}\}/g, coverage);
updatedContent = updatedContent.replace(/\{\{stochcoverage\}\}/g, stochcoverage);
updatedContent = updatedContent.replace(/\{\{doccoverage\}\}/g, doccoverage);
updatedContent = updatedContent.replace(/\{\{docblockcount\}\}/g, docblockcount);
updatedContent = updatedContent.replace(/\{\{testcasecount\}\}/g, testcasecount);
updatedContent = updatedContent.replace(/\{\{unittestcount\}\}/g, unittestcount);
updatedContent = updatedContent.replace(/\{\{stochtestcount\}\}/g, stochtestcount);
updatedContent = updatedContent.replace(/\{\{built\}\}/g, built);
updatedContent = updatedContent.replace(/\{\{built_text\}\}/g, built_text);
updatedContent = updatedContent.replace(/\{\{gh_hash\}\}/g, gh_hash);

// Write back to README.md
writeFileSync(readmePath, updatedContent, 'utf8');

console.log(colorize(OUTPUT_COLOR, `\nUpdated README.md: ${colorize(SUCCESS_COLOR, `Replaced\n  - ${colorize(TEMPLATE_COLOR, '{{version}}')} with ${colorize(VALUE_COLOR, version)},\n  - ${colorize(TEMPLATE_COLOR, '{{coverage}}')} with ${colorize(VALUE_COLOR, coverage)}%,\n  - ${colorize(TEMPLATE_COLOR, '{{stochcoverage}}')} with ${colorize(VALUE_COLOR, stochcoverage)}%,\n  - ${colorize(TEMPLATE_COLOR, '{{doccoverage}}')} with ${colorize(VALUE_COLOR, doccoverage)}%,\n  - ${colorize(TEMPLATE_COLOR, '{{docblockcount}}')} with ${colorize(VALUE_COLOR, docblockcount)},\n  - ${colorize(TEMPLATE_COLOR, '{{testcasecount}}')} with ${colorize(VALUE_COLOR, testcasecount)},\n  - ${colorize(TEMPLATE_COLOR, '{{unittestcount}}')} with ${colorize(VALUE_COLOR, unittestcount)},\n  - ${colorize(TEMPLATE_COLOR, '{{stochtestcount}}')} with ${colorize(VALUE_COLOR, stochtestcount)},\n  - ${colorize(TEMPLATE_COLOR, '{{built}}')} with ${colorize(VALUE_COLOR, built)},\n  - ${colorize(TEMPLATE_COLOR, '{{built_text}}')} with ${colorize(VALUE_COLOR, built_text)},\n  - ${colorize(TEMPLATE_COLOR, '{{gh_hash}}')} with ${colorize(VALUE_COLOR, gh_hash)}`)}`));
