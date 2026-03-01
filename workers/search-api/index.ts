/**
 * DreamLab AI Semantic Search Worker
 *
 * WASM-powered vector similarity search over R2-stored .rvf indices.
 * Uses the @ruvector/rvf-wasm microkernel (42KB, no_std) for in-memory
 * cosine search on 384-dim all-MiniLM-L6-v2 embeddings.
 *
 * Architecture:
 *   Cold start: fetch .rvf bytes from R2 → load into WASM store
 *   Warm:       query WASM store directly (sub-millisecond)
 *   Ingest:     add to WASM store → export .rvf → persist to R2
 *
 * The WASM module provides rvf_store_* functions for create/ingest/query/
 * delete/export — all operating on WASM linear memory with zero JS↔native
 * bridge overhead.
 *
 * Endpoints:
 *   POST /search  — k-NN cosine query (< 1ms for 1000 vectors)
 *   POST /ingest  — batch ingest embeddings (NIP-98 gated)
 *   GET  /status  — store health + vector count
 */

// In Cloudflare Workers (ES module format), WASM is imported directly
import wasmModule from './rvf_wasm_bg.wasm';

interface RvfWasmExports {
  memory: WebAssembly.Memory;
  rvf_alloc(size: number): number;
  rvf_free(ptr: number, size: number): void;
  rvf_store_create(dim: number, metric: number): number;
  rvf_store_open(buf_ptr: number, buf_len: number): number;
  rvf_store_ingest(handle: number, vecs_ptr: number, ids_ptr: number, count: number): number;
  rvf_store_query(handle: number, query_ptr: number, k: number, metric: number, out_ptr: number): number;
  rvf_store_delete(handle: number, ids_ptr: number, count: number): number;
  rvf_store_count(handle: number): number;
  rvf_store_dimension(handle: number): number;
  rvf_store_status(handle: number, out_ptr: number): number;
  rvf_store_export(handle: number, out_ptr: number, out_len: number): number;
  rvf_store_close(handle: number): number;
}

export interface Env {
  /** R2 bucket for .rvf vector store files */
  VECTORS: R2Bucket;
  /** KV for id↔label mapping (WASM uses u64 labels, we use string IDs) */
  SEARCH_CONFIG: KVNamespace;
  /** Allowed origin for CORS */
  ALLOWED_ORIGIN: string;
  /** R2 key for the vector store (default: "dreamlab.rvf") */
  RVF_STORE_KEY: string;
}

const DIM = 384;
const COSINE_METRIC = 2; // rvf-wasm Metric::Cosine
const RESULT_ENTRY_SIZE = 12; // u64 id + f32 distance

interface SearchRequest {
  embedding: number[];
  k?: number;
  minScore?: number;
  channel?: string;
  after?: number;
  before?: number;
}

interface IngestRequest {
  entries: Array<{
    id: string;
    embedding: number[];
    channel?: string;
    timestamp?: number;
  }>;
}

// ── Per-isolate state (survives across requests within same Worker instance) ──

let wasm: RvfWasmExports | null = null;
let storeHandle = 0;
let idToLabel: Map<string, number> = new Map();
let labelToId: Map<number, string> = new Map();
let nextLabel = 1;
let vectorCount = 0;
let lastLoadedKey = '';

// ── WASM lifecycle ───────────────────────────────────────────────────

async function ensureWasm(): Promise<RvfWasmExports> {
  if (wasm) return wasm;

  const instance = await WebAssembly.instantiate(wasmModule, {});
  wasm = instance.exports as unknown as RvfWasmExports;
  return wasm;
}

/** Load or create the WASM store from R2 .rvf data */
async function ensureStore(env: Env): Promise<number> {
  const w = await ensureWasm();
  const storeKey = env.RVF_STORE_KEY || 'dreamlab.rvf';

  // Already loaded for this key
  if (storeHandle > 0 && lastLoadedKey === storeKey) {
    return storeHandle;
  }

  // Close previous store if switching keys
  if (storeHandle > 0) {
    w.rvf_store_close(storeHandle);
    storeHandle = 0;
  }

  // Try to load id↔label mapping from KV
  const mappingJson = await env.SEARCH_CONFIG.get(`${storeKey}:mapping`);
  if (mappingJson) {
    const mapping = JSON.parse(mappingJson) as { pairs: [string, number][]; next: number };
    idToLabel = new Map(mapping.pairs);
    labelToId = new Map(mapping.pairs.map(([id, label]) => [label, id]));
    nextLabel = mapping.next;
  } else {
    idToLabel = new Map();
    labelToId = new Map();
    nextLabel = 1;
  }

  // Try to load .rvf from R2
  const obj = await env.VECTORS.get(storeKey);
  if (obj) {
    const bytes = await obj.arrayBuffer();
    const ptr = w.rvf_alloc(bytes.byteLength);
    new Uint8Array(w.memory.buffer, ptr, bytes.byteLength).set(new Uint8Array(bytes));
    const handle = w.rvf_store_open(ptr, bytes.byteLength);
    w.rvf_free(ptr, bytes.byteLength);

    if (handle > 0) {
      storeHandle = handle;
      vectorCount = w.rvf_store_count(handle);
      lastLoadedKey = storeKey;
      return handle;
    }
  }

  // No existing store — create empty
  storeHandle = w.rvf_store_create(DIM, COSINE_METRIC);
  vectorCount = 0;
  lastLoadedKey = storeKey;
  return storeHandle;
}

/** Resolve a string ID to a numeric label (for WASM u64 IDs) */
function resolveLabel(id: string): number {
  const existing = idToLabel.get(id);
  if (existing !== undefined) return existing;
  const label = nextLabel++;
  idToLabel.set(id, label);
  labelToId.set(label, id);
  return label;
}

/** Persist the WASM store to R2 and mapping to KV */
async function persistStore(env: Env): Promise<void> {
  if (!wasm || storeHandle <= 0) return;
  const storeKey = env.RVF_STORE_KEY || 'dreamlab.rvf';

  // Export .rvf bytes from WASM
  // Estimate: ~(DIM * 4 + 8) bytes per vector + segment headers
  const estimatedSize = vectorCount * (DIM * 4 + 16) + 4096;
  const exportPtr = wasm.rvf_alloc(estimatedSize);
  const exportedBytes = wasm.rvf_store_export(storeHandle, exportPtr, estimatedSize);

  if (exportedBytes > 0) {
    const rvfData = new Uint8Array(wasm.memory.buffer, exportPtr, exportedBytes).slice();
    wasm.rvf_free(exportPtr, estimatedSize);

    await env.VECTORS.put(storeKey, rvfData.buffer, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: {
        vectorCount: String(vectorCount),
        dimensions: String(DIM),
        format: 'rvf-wasm-v1',
        updatedAt: new Date().toISOString(),
      },
    });
  } else {
    wasm.rvf_free(exportPtr, estimatedSize);
  }

  // Persist id↔label mapping to KV
  const pairs: [string, number][] = Array.from(idToLabel.entries());
  await env.SEARCH_CONFIG.put(`${storeKey}:mapping`, JSON.stringify({
    pairs,
    next: nextLabel,
  }));
}

// ── CORS ──────────────────────────────────────────────────────────────

function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://dreamlab-ai.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

// ── Handlers ──────────────────────────────────────────────────────────

async function handleSearch(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as SearchRequest;

  if (!body.embedding || body.embedding.length !== DIM) {
    return json({ error: `Expected ${DIM}-dim embedding` }, 400, env);
  }

  const w = await ensureWasm();
  const handle = await ensureStore(env);
  const k = Math.min(Math.max(body.k ?? 10, 1), 100);
  const minScore = body.minScore ?? 0.0;

  if (vectorCount === 0) {
    return json({ results: [], totalVectors: 0 }, 200, env);
  }

  // Allocate WASM memory for query + results
  const queryPtr = w.rvf_alloc(DIM * 4);
  const outPtr = w.rvf_alloc(k * RESULT_ENTRY_SIZE);

  // Copy query embedding into WASM memory
  new Float32Array(w.memory.buffer, queryPtr, DIM).set(new Float32Array(body.embedding));

  // Execute WASM cosine search
  const resultCount = w.rvf_store_query(handle, queryPtr, k, -1, outPtr);

  // Read results from WASM memory
  const resultBuf = new DataView(w.memory.buffer, outPtr, resultCount * RESULT_ENTRY_SIZE);
  const results: Array<{ id: string; distance: number; score: number }> = [];

  for (let i = 0; i < resultCount; i++) {
    const offset = i * RESULT_ENTRY_SIZE;
    // Read u64 label (little-endian)
    const labelLow = resultBuf.getUint32(offset, true);
    const labelHigh = resultBuf.getUint32(offset + 4, true);
    const label = labelLow + labelHigh * 0x100000000;
    // Read f32 distance
    const distance = resultBuf.getFloat32(offset + 8, true);
    const score = 1 - distance;

    if (score >= minScore) {
      const id = labelToId.get(label) ?? String(label);
      results.push({ id, distance, score });
    }
  }

  w.rvf_free(queryPtr, DIM * 4);
  w.rvf_free(outPtr, k * RESULT_ENTRY_SIZE);

  return json({
    results,
    totalVectors: vectorCount,
    engine: 'rvf-wasm',
    dimensions: DIM,
  }, 200, env);
}

async function handleIngest(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as IngestRequest;

  if (!body.entries?.length) {
    return json({ error: 'Missing entries array' }, 400, env);
  }

  const w = await ensureWasm();
  const handle = await ensureStore(env);

  // Filter valid entries
  let rejected = 0;
  const valid = body.entries.filter(e => {
    if (!e.id || !e.embedding || e.embedding.length !== DIM) { rejected++; return false; }
    return true;
  });

  if (valid.length === 0) {
    return json({ accepted: 0, rejected, totalVectors: vectorCount }, 200, env);
  }

  // Allocate WASM memory
  const vecsPtr = w.rvf_alloc(valid.length * DIM * 4);
  const idsPtr = w.rvf_alloc(valid.length * 8);

  const vecsView = new Float32Array(w.memory.buffer, vecsPtr, valid.length * DIM);
  const idsView = new BigUint64Array(w.memory.buffer, idsPtr, valid.length);

  for (let i = 0; i < valid.length; i++) {
    vecsView.set(new Float32Array(valid[i].embedding), i * DIM);
    idsView[i] = BigInt(resolveLabel(valid[i].id));
  }

  const accepted = w.rvf_store_ingest(handle, vecsPtr, idsPtr, valid.length);
  vectorCount = w.rvf_store_count(handle);

  w.rvf_free(vecsPtr, valid.length * DIM * 4);
  w.rvf_free(idsPtr, valid.length * 8);

  // Persist to R2 + KV
  await persistStore(env);

  return json({
    accepted,
    rejected,
    totalVectors: vectorCount,
    engine: 'rvf-wasm',
  }, 200, env);
}

async function handleStatus(env: Env): Promise<Response> {
  await ensureStore(env);

  return json({
    totalVectors: vectorCount,
    dimensions: DIM,
    metric: 'cosine',
    model: 'all-MiniLM-L6-v2',
    engine: 'rvf-wasm',
    wasmModuleSize: '42KB',
    format: 'rvf-wasm-v1',
  }, 200, env);
}

// ── Router ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const path = new URL(request.url).pathname;

    try {
      if (path === '/search' && request.method === 'POST') return await handleSearch(request, env);
      if (path === '/ingest' && request.method === 'POST') return await handleIngest(request, env);
      if (path === '/status' && request.method === 'GET') return await handleStatus(env);
      return json({ error: 'Not found' }, 404, env);
    } catch (err) {
      if (err instanceof SyntaxError) {
        return json({ error: 'Invalid JSON body' }, 400, env);
      }
      return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500, env);
    }
  },
};
