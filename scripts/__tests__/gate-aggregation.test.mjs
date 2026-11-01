// Pre-deploy gate aggregation guard (ADR-2002/2003 posture).
//
// .github/workflows/test-and-lint.yml is the ONLY gate between a push to main
// and publication (deploy.yml and workers-deploy.yml consume its `passed`
// output). Its Summary step aggregates gate outcomes by hand: every step
// carrying `id:` plus `if: always()` must appear, uppercased, in the
// `for gate in ... do` verdict loop. Nothing structural enforces that link:
// a gate step added without updating the loop (the same defect class closed
// on 2026-09-05) would run, fail, and the gate would still report
// passed=true. This test parses the workflow and fails on that drift in both
// directions: a gate step missing from the loop, and a loop name with no
// backing gate step.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WORKFLOW_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '.github',
  'workflows',
  'test-and-lint.yml',
);

// Steps sit at 6-space indentation, their keys at 8, matching the workflow as
// written. If the file is reformatted the parse below throws, and this guard
// must be consciously updated rather than silently matching nothing.
function parseGateAggregation(text) {
  const loopMatch = text.match(/for\s+gate\s+in\s+([A-Za-z0-9_ ]+?);?\s*do/);
  if (!loopMatch) {
    throw new Error('Summary verdict loop (`for gate in ... do`) not found');
  }
  const loopNames = loopMatch[1].trim().split(/\s+/);

  const blocks = text.split(/^ {6}- /m).slice(1);
  const aggregator = blocks.find((block) => /for\s+gate\s+in/.test(block));
  if (!aggregator) {
    throw new Error('aggregator step containing the verdict loop not found');
  }

  const requiredIds = [];
  const silentSteps = [];
  for (const block of blocks) {
    if (block === aggregator) continue;
    const isAlways = /^ {8}if:\s*always\(\)\s*$/m.test(block);
    if (!isAlways) continue;
    const idMatch = block.match(/^ {8}id:\s*([A-Za-z0-9_]+)\s*$/m);
    if (idMatch) {
      requiredIds.push(idMatch[1]);
    } else if (/^ {8}continue-on-error:\s*true\s*$/m.test(block)) {
      // always() + continue-on-error + no id: runs after earlier failures,
      // its own failures are recorded nowhere, and the job still succeeds.
      silentSteps.push('always() step without id but with continue-on-error');
    }
  }
  return { loopNames, requiredIds, silentSteps };
}

function aggregationDrift(text) {
  const { loopNames, requiredIds, silentSteps } = parseGateAggregation(text);
  const loopSet = new Set(loopNames);
  const requiredSet = new Set(requiredIds.map((id) => id.toUpperCase()));
  return {
    loopNames,
    requiredIds,
    missingFromLoop: [...requiredSet].filter((name) => !loopSet.has(name)).sort(),
    unknownInLoop: [...loopSet].filter((name) => !requiredSet.has(name)).sort(),
    silentSteps,
  };
}

// Synthetic workflow in the exact shape the parser expects (6-space steps,
// 8-space keys), keeping the drift cases self-contained.
function syntheticWorkflow(loopNames, stepIds) {
  const steps = stepIds
    .map(
      (id) =>
        `      - name: Gate ${id}\n` +
        `        id: ${id}\n` +
        '        if: always()\n' +
        '        run: "true"\n\n',
    )
    .join('');
  return (
    'jobs:\n' +
    '  gate:\n' +
    '    steps:\n' +
    steps +
    '      - name: Summary\n' +
    '        id: summary\n' +
    '        if: always()\n' +
    '        run: |\n' +
    `          for gate in ${loopNames.join(' ')}; do\n` +
    '            echo "$gate"\n' +
    '          done\n'
  );
}

describe('test-and-lint.yml gate aggregation', () => {
  it('aggregates every always() gate step into the Summary verdict loop', () => {
    const drift = aggregationDrift(readFileSync(WORKFLOW_PATH, 'utf8'));
    expect(drift.requiredIds.length).toBeGreaterThan(0);
    expect(drift.loopNames.length).toBeGreaterThan(0);
    expect(drift.silentSteps).toEqual([]);
    expect(drift.missingFromLoop).toEqual([]);
    expect(drift.unknownInLoop).toEqual([]);
  });

  it('flags a gate step the verdict loop forgets', () => {
    const drift = aggregationDrift(syntheticWorkflow(['ONE'], ['one', 'two']));
    expect(drift.missingFromLoop).toEqual(['TWO']);
    expect(drift.unknownInLoop).toEqual([]);
  });

  it('flags a loop name with no backing gate step', () => {
    const drift = aggregationDrift(syntheticWorkflow(['ONE', 'GHOST'], ['one']));
    expect(drift.missingFromLoop).toEqual([]);
    expect(drift.unknownInLoop).toEqual(['GHOST']);
  });

  it('accepts a fully aggregated synthetic gate', () => {
    const drift = aggregationDrift(syntheticWorkflow(['ONE', 'TWO'], ['one', 'two']));
    expect(drift.missingFromLoop).toEqual([]);
    expect(drift.unknownInLoop).toEqual([]);
  });
});
