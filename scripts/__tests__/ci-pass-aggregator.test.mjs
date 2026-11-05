// ci-pass aggregator guard.
//
// ci.yml's `ci-pass` job is the single required status check for branch
// protection. Its verdict is a shell loop that enumerates
// `${{ needs.<job>.result }}` for every gate it depends on. Two drift
// directions break it:
//   - a job added to `needs:` but missing from the verdict loop: its failure
//     reads as success and ci-pass stays green while a required gate is red;
//   - a reference to a job that is not in `needs:`: the expression reads as
//     empty and the gate fails unconditionally.
// PR #69 locked the pre-deploy gate (test-and-lint.yml) to its gate steps;
// this binds the same invariants for ci.yml's aggregator, plus `if: always()`
// so a failed dependency cannot skip the verdict job entirely.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ciYml = readFileSync(join(repoRoot, '.github/workflows/ci.yml'), 'utf8');

/** Lines of one two-space-indented job block under `jobs:`. */
function jobLines(name) {
  const lines = ciYml.split('\n');
  const start = lines.findIndex((line) => line === `  ${name}:`);
  if (start === -1) {
    throw new Error(`job '${name}' not found in .github/workflows/ci.yml`);
  }
  const end = lines.findIndex(
    (line, i) => i > start && /^  [A-Za-z0-9_-]+:\s*$/.test(line),
  );
  return lines.slice(start, end === -1 ? lines.length : end);
}

/** Every needs.<job>.result reference in a block of text. */
function resultRefs(text) {
  return [
    ...text.matchAll(/\$\{\{\s*needs\.([A-Za-z0-9_-]+)\.result\s*\}\}/g),
  ].map((m) => m[1]);
}

const ciPass = jobLines('ci-pass');

// The `needs:` list: four-space key, six-space dash items.
const needs = [];
let inNeeds = false;
for (const line of ciPass) {
  if (/^    needs:\s*$/.test(line)) {
    inNeeds = true;
  } else if (inNeeds) {
    const item = /^      - ([A-Za-z0-9_-]+)\s*$/.exec(line);
    if (!item) break;
    needs.push(item[1]);
  }
}

// The verdict loop: `for result in \ "<ref>" \ ... "<ref>"; do`.
const loopStart = ciPass.findIndex((line) => line.includes('for result in'));
const loopRefs = [];
if (loopStart !== -1) {
  for (const line of ciPass.slice(loopStart)) {
    loopRefs.push(...resultRefs(line));
    if (line.includes('; do')) break;
  }
}

const allRefs = resultRefs(ciPass.join('\n'));

function expectSameSet(actual, expected, message) {
  expect([...new Set(actual)].sort(), message).toEqual(
    [...new Set(expected)].sort(),
  );
}

describe('ci.yml ci-pass aggregator', () => {
  it('declares the gates it aggregates', () => {
    expect(needs.length, 'ci-pass needs: list is missing or unparsed')
      .toBeGreaterThan(0);
  });

  it('runs if: always() so a failed gate cannot skip the verdict', () => {
    expect(
      ciPass.some((line) => /^\s*if:\s*always\(\)\s*$/.test(line)),
      'ci-pass must keep if: always() or a failed need skips the aggregator',
    ).toBe(true);
  });

  it('has a verdict loop enumerating needs results', () => {
    expect(loopRefs.length, 'verdict loop not found in ci-pass')
      .toBeGreaterThan(0);
  });

  it('verdict loop covers exactly the needs list (both directions)', () => {
    expectSameSet(loopRefs, needs, 'verdict loop and needs: list disagree');
  });

  it('every needs.<job>.result reference names a declared need', () => {
    const declared = new Set(needs);
    const stale = [...new Set(allRefs)].filter((job) => !declared.has(job));
    expect(stale, 'stale needs.<job>.result reference').toEqual([]);
  });
});
