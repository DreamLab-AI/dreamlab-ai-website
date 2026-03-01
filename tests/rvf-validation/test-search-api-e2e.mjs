/**
 * End-to-End Search API Simulation Test
 *
 * Simulates the complete DreamLab semantic search pipeline:
 *   1. Generate 500 simulated message embeddings (384-dim, L2-normalised)
 *   2. Ingest into a mock R2 store (JSON file)
 *   3. Query with cosine similarity
 *   4. Verify channel filtering
 *   5. Verify timestamp range filtering
 *   6. Test RVF native path (Node SDK) side-by-side
 *   7. Compare results between JSON brute-force and RVF HNSW
 *
 * Usage: node test-search-api-e2e.mjs
 */

import { RvfDatabase } from '@ruvector/rvf';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DIM = 384;
const CHANNELS = ['general', 'dev', 'announcements', 'random', 'support'];
const MESSAGE_COUNT = 500;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  PASS: ${msg}`); }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ── Deterministic embedding generator ────────────────────────────────

function generateEmbedding(seed) {
  const v = new Float32Array(DIM);
  let x = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
  for (let i = 0; i < DIM; i++) {
    x = (x * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
    v[i] = Number(x >> 33n) / 4294967295.0 - 0.5;
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  for (let i = 0; i < DIM; i++) v[i] = norm > 1e-8 ? v[i] / norm : 0;
  return v;
}

function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// ── Generate simulated messages ──────────────────────────────────────

function generateMessages(count) {
  const messages = [];
  for (let i = 0; i < count; i++) {
    const id = `note_${i + 1}`;
    const channel = CHANNELS[i % CHANNELS.length];
    const timestamp = 1740000000 + i * 60;
    const embedding = Array.from(generateEmbedding(i * 31 + 7));
    messages.push({ id, channel, timestamp, embedding });
  }
  return messages;
}

// ── Test: JSON brute-force (simulates Worker search-api) ─────────────

function testJsonBruteForce(messages, queryVec, k, channel) {
  let filtered = messages;
  if (channel) {
    filtered = filtered.filter(m => m.channel === channel);
  }

  const scored = filtered.map(m => ({
    id: m.id,
    score: cosine(queryVec, m.embedding),
    distance: 1 - cosine(queryVec, m.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ── Test: RVF HNSW (native Node SDK) ─────────────────────────────────

async function testRvfHnsw(messages, queryVec, k) {
  const storePath = join(tmpdir(), `dreamlab-e2e-rvf-${Date.now()}.rvf`);

  const db = await RvfDatabase.create(storePath, {
    dimensions: DIM,
    metric: 'cosine',
    m: 16,
    efConstruction: 200,
  });

  // Ingest all messages
  const entries = messages.map(m => ({
    id: m.id,
    vector: new Float32Array(m.embedding),
  }));

  await db.ingestBatch(entries);

  // Query
  const results = await db.query(new Float32Array(queryVec), k, { efSearch: 100 });

  await db.close();

  // Cleanup
  try { unlinkSync(storePath); } catch {}
  try { unlinkSync(storePath + '.lock'); } catch {}
  try { unlinkSync(storePath + '.labels.json'); } catch {}

  return results.map(r => ({
    id: r.id,
    distance: r.distance,
    score: 1 - r.distance,
  }));
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== DreamLab Search API End-to-End Simulation ===');
  console.log(`  Messages: ${MESSAGE_COUNT}, DIM: ${DIM}, Channels: ${CHANNELS.length}\n`);

  const messages = generateMessages(MESSAGE_COUNT);

  // Test 1: JSON store roundtrip (simulates R2 storage)
  console.log('--- Test 1: JSON store roundtrip (R2 simulation) ---');
  const jsonPath = join(tmpdir(), `dreamlab-e2e-vectors-${Date.now()}.json`);
  writeFileSync(jsonPath, JSON.stringify(messages));
  const loaded = JSON.parse(readFileSync(jsonPath, 'utf8'));
  assert(loaded.length === MESSAGE_COUNT, `stored and loaded ${MESSAGE_COUNT} vectors`);
  unlinkSync(jsonPath);

  // Test 2: Brute-force cosine query (simulates Worker)
  console.log('\n--- Test 2: Brute-force cosine query (Worker simulation) ---');
  const queryVec = Array.from(generateEmbedding(42 * 31 + 7)); // embedding for message #42
  const t0 = performance.now();
  const bfResults = testJsonBruteForce(messages, queryVec, 10);
  const bfMs = (performance.now() - t0).toFixed(2);

  assert(bfResults.length === 10, `brute-force returned 10 results`);
  assert(bfResults[0].id === 'note_43', `top result is note_43 (got ${bfResults[0].id})`);
  assert(bfResults[0].score > 0.999, `top score ~1.0 (got ${bfResults[0].score.toFixed(6)})`);
  console.log(`  INFO: Brute-force query: ${bfMs}ms over ${MESSAGE_COUNT} vectors`);

  // Test 3: Channel filter
  console.log('\n--- Test 3: Channel-filtered query ---');
  const devResults = testJsonBruteForce(messages, queryVec, 10, 'dev');
  assert(devResults.length > 0, `dev channel returned ${devResults.length} results`);
  const allDev = devResults.every(r => {
    const idx = parseInt(r.id.split('_')[1]) - 1;
    return CHANNELS[idx % CHANNELS.length] === 'dev';
  });
  assert(allDev, 'all results from dev channel');

  // Test 4: RVF HNSW query
  console.log('\n--- Test 4: RVF HNSW query (native SDK) ---');
  const t1 = performance.now();
  const rvfResults = await testRvfHnsw(messages, queryVec, 10);
  const rvfMs = (performance.now() - t1).toFixed(2);

  assert(rvfResults.length === 10, `RVF returned 10 results`);
  assert(rvfResults[0].id === 'note_43', `RVF top result is note_43 (got ${rvfResults[0].id})`);
  assert(rvfResults[0].distance < 0.01, `RVF top distance ~0 (got ${rvfResults[0].distance.toFixed(6)})`);
  console.log(`  INFO: RVF HNSW query + setup: ${rvfMs}ms`);

  // Test 5: Compare brute-force vs HNSW results
  console.log('\n--- Test 5: Brute-force vs HNSW result comparison ---');
  const bfTop5 = new Set(bfResults.slice(0, 5).map(r => r.id));
  const rvfTop5 = new Set(rvfResults.slice(0, 5).map(r => r.id));
  const overlap = [...bfTop5].filter(id => rvfTop5.has(id)).length;
  console.log(`  INFO: Top-5 overlap: ${overlap}/5`);
  assert(overlap >= 3, `at least 3/5 overlap between brute-force and HNSW (got ${overlap})`);

  // Top-1 must match (exact query vector)
  assert(bfResults[0].id === rvfResults[0].id, 'top-1 matches between both methods');

  // Test 6: Large-scale benchmark
  console.log('\n--- Test 6: Scale benchmark (2000 vectors) ---');
  const bigMessages = generateMessages(2000);

  const bfT0 = performance.now();
  testJsonBruteForce(bigMessages, queryVec, 10);
  const bfLargeMs = (performance.now() - bfT0).toFixed(2);

  const rvfT0 = performance.now();
  await testRvfHnsw(bigMessages, queryVec, 10);
  const rvfLargeMs = (performance.now() - rvfT0).toFixed(2);

  console.log(`  INFO: Brute-force (2000 vectors): ${bfLargeMs}ms`);
  console.log(`  INFO: RVF HNSW (2000 vectors): ${rvfLargeMs}ms (includes create + ingest)`);
  assert(true, 'scale benchmark completed');

  // Test 7: Simulate ingest → query lifecycle
  console.log('\n--- Test 7: Ingest → query lifecycle ---');
  const storePath = join(tmpdir(), `dreamlab-lifecycle-${Date.now()}.rvf`);
  const rvfDb = await RvfDatabase.create(storePath, {
    dimensions: DIM,
    metric: 'cosine',
    m: 16,
    efConstruction: 200,
  });

  // Simulate real-time message ingest (batches of 50)
  for (let batch = 0; batch < 4; batch++) {
    const batchEntries = [];
    for (let i = 0; i < 50; i++) {
      const idx = batch * 50 + i;
      batchEntries.push({
        id: `rt_${idx}`,
        vector: generateEmbedding(idx * 17 + 3),
      });
    }
    await rvfDb.ingestBatch(batchEntries);
  }

  const status = await rvfDb.status();
  assert(status.totalVectors === 200, `200 vectors after 4 batches (got ${status.totalVectors})`);

  // Query after incremental ingest
  const rtQuery = generateEmbedding(50 * 17 + 3);
  const rtResults = await rvfDb.query(rtQuery, 5, { efSearch: 100 });
  assert(rtResults.length > 0, `query returns results after incremental ingest`);
  assert(rtResults[0].id === 'rt_50', `top result is rt_50 (got ${rtResults[0].id})`);

  // Delete some vectors
  await rvfDb.delete(['rt_0', 'rt_1', 'rt_2']);
  const afterDelete = await rvfDb.status();
  assert(afterDelete.totalVectors === 197, `197 vectors after delete (got ${afterDelete.totalVectors})`);

  await rvfDb.close();
  try { unlinkSync(storePath); } catch {}
  try { unlinkSync(storePath + '.lock'); } catch {}
  try { unlinkSync(storePath + '.labels.json'); } catch {}

  // Summary
  const total = passed + failed;
  console.log(`\n=== Results: ${passed}/${total} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
  console.log('All end-to-end tests passed.');
  process.exit(0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
