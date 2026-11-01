// src/data/__tests__/workshop-meta.test.ts
//
// WORKSHOP_META (src/data/workshop-meta.ts) is hand-curated while
// src/data/workshop-list.json is generated from public/data/workshops/ by
// scripts/generate-workshop-list.mjs on prebuild. The Workshops index and
// Workshop module render through the meta map, so a workshop folder added
// without a curated entry - or a meta key left behind after a folder rename -
// degrades those rows while every generator receipt stays green. Bind the
// two id sets together so REQUIRED bench fails on the drift.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from 'vitest';
import { WORKSHOP_META } from '../workshop-meta';

const list = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'workshop-list.json'), 'utf-8'),
) as Array<{ id: string }>;

test('WORKSHOP_META ids equal the generated workshop-list ids', () => {
  const listIds = list.map((w) => w.id).sort();
  const metaIds = Object.keys(WORKSHOP_META).sort();
  expect(listIds).toEqual(metaIds);
});
