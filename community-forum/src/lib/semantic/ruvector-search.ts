/**
 * RuVector Search Service
 *
 * Primary semantic search for DreamLab AI community forum.
 * Uses a Cloudflare Worker (search-api) backed by R2-stored vector index.
 *
 * Embedding pipeline (priority order):
 *   1. Local ONNX WASM (all-MiniLM-L6-v2, 384d) — real semantic embeddings
 *   2. Server /embed endpoint — hash-based fallback (deterministic, not semantic)
 *   3. Client-side hash fallback — offline graceful degradation
 *
 * Search pipeline:
 *   Client embedding → POST /search (CF Worker) → WASM k-NN → R2 .rvf index
 *   Offline fallback: brute-force cosine on IndexedDB-cached embeddings
 *
 * Embedding model: all-MiniLM-L6-v2 (384 dimensions, L2-normalised)
 */

import { db } from '$lib/db';
import { fetchWithNip98 } from '$lib/auth/nip98-client';
import { onnxEmbed, isOnnxReady, preWarmOnnx } from './onnx-local';

// Search API endpoint — Cloudflare Worker (RuVector WASM + R2)
const SEARCH_API_URL = import.meta.env.VITE_SEARCH_API_URL ||
  'https://search.dreamlab-ai.com';

const DIMENSIONS = 384;

export interface SearchResult {
  noteId: string;
  score: number;
  distance: number;
}

export interface RuVectorStats {
  vectorCount: number;
  dimensions: number;
  lastUpdated: string | null;
  searchMode: 'server' | 'cached' | 'hybrid';
}

// Local embedding cache for offline search
interface CachedEmbedding {
  noteId: string;
  embedding: number[];
  channel?: string;
  timestamp: number;
}

let cachedEmbeddings: Map<string, CachedEmbedding> = new Map();
let cacheLoaded = false;
let lastCacheUpdate = 0;

// Embedding result cache (LRU-ish)
const embeddingCache = new Map<string, number[]>();
const EMBEDDING_CACHE_MAX = 100;

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Generate query embedding. Priority:
 *   1. Local ONNX WASM (semantic, ~10ms after model loaded)
 *   2. Server /embed endpoint (hash-based, ~100ms network)
 *   3. Client-side hash fallback (offline, instant, non-semantic)
 */
async function embedQuery(query: string): Promise<number[]> {
  const cached = embeddingCache.get(query);
  if (cached) return cached;

  // Priority 1: Local ONNX (real semantic embedding)
  const onnxResult = await onnxEmbed(query);
  if (onnxResult) {
    cacheEmbedding(query, onnxResult);
    return onnxResult;
  }

  // Priority 2: Server /embed endpoint (hash-based fallback)
  try {
    const response = await fetch(`${SEARCH_API_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
    });

    if (!response.ok) {
      throw new Error(`Embed API error: ${response.status}`);
    }

    const data = await response.json() as { embeddings: number[][]; dimensions: number };
    if (!data.embeddings?.length) {
      throw new Error('No embedding returned');
    }

    const embedding = data.embeddings[0];
    cacheEmbedding(query, embedding);
    return embedding;
  } catch (error) {
    console.error('Embed API failed:', error);
    return generateFallbackEmbedding(query);
  }
}

/** LRU cache insertion for embeddings */
function cacheEmbedding(query: string, embedding: number[]): void {
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(query, embedding);
}

/**
 * Deterministic fallback embedding for offline use.
 * Not semantic — only for testing/graceful degradation.
 */
function generateFallbackEmbedding(text: string): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    vector[(code * (i + 1)) % DIMENSIONS] += code / 255;
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map(v => v / norm);
}

/**
 * Server-side search via Cloudflare Worker.
 */
async function searchServerSide(
  queryVector: number[],
  k: number,
  minScore: number,
  channel?: string,
): Promise<SearchResult[]> {
  const response = await fetch(`${SEARCH_API_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embedding: queryVector,
      k,
      minScore,
      channel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  const data = await response.json() as {
    results: Array<{ id: string; score: number; distance: number }>;
    totalVectors: number;
  };

  return data.results.map(r => ({
    noteId: r.id,
    score: r.score,
    distance: r.distance,
  }));
}

/**
 * Local brute-force cosine search on cached embeddings.
 * Acceptable for <100K vectors in the browser.
 */
function searchLocalCache(
  queryVector: number[],
  k: number,
  minScore: number,
): SearchResult[] {
  if (!cacheLoaded || cachedEmbeddings.size === 0) {
    throw new Error('Local cache not loaded');
  }

  const results: SearchResult[] = [];
  for (const [noteId, cached] of cachedEmbeddings) {
    const score = cosineSimilarity(queryVector, cached.embedding);
    if (score >= minScore) {
      results.push({ noteId, score, distance: 1 - score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Search for similar notes. Tries server first, falls back to cache.
 */
export async function searchSimilar(
  query: string,
  k = 10,
  minScore = 0.5,
  channel?: string,
): Promise<SearchResult[]> {
  const queryVector = await embedQuery(query);

  // Server-side search (Cloudflare Worker → R2 index)
  try {
    const serverResults = await searchServerSide(queryVector, k, minScore, channel);
    if (serverResults.length > 0) return serverResults;
  } catch {
    console.log('Server search unavailable, using local cache');
  }

  // Offline fallback
  return searchLocalCache(queryVector, k, minScore);
}

/**
 * Load embeddings from search API into local cache.
 */
export async function loadFromRuVector(): Promise<boolean> {
  try {
    const response = await fetch(`${SEARCH_API_URL}/status`);
    if (!response.ok) {
      console.warn('Search API not available, trying IndexedDB');
      return loadFromIndexedDB();
    }

    const status = await response.json() as { totalVectors: number };
    if (status.totalVectors === 0) {
      return loadFromIndexedDB();
    }

    // For now, server handles search — we just confirm it's available
    cacheLoaded = true;
    lastCacheUpdate = Date.now();
    console.log(`Search API available: ${status.totalVectors} vectors`);
    return true;
  } catch {
    return loadFromIndexedDB();
  }
}

/**
 * Load cached embeddings from IndexedDB (offline mode).
 */
async function loadFromIndexedDB(): Promise<boolean> {
  try {
    const cached = await db.table('embeddings').get('ruvector_cache');
    if (!cached?.data) return false;

    const entries = JSON.parse(cached.data) as CachedEmbedding[];
    cachedEmbeddings.clear();
    for (const entry of entries) {
      cachedEmbeddings.set(entry.noteId, entry);
    }

    cacheLoaded = cachedEmbeddings.size > 0;
    lastCacheUpdate = cached.timestamp || Date.now();
    console.log(`Loaded ${cachedEmbeddings.size} embeddings from IndexedDB`);
    return cacheLoaded;
  } catch {
    return false;
  }
}

/**
 * Save current cache to IndexedDB.
 */
async function saveToIndexedDB(): Promise<void> {
  try {
    const entries = Array.from(cachedEmbeddings.values());
    await db.table('embeddings').put({
      key: 'ruvector_cache',
      data: JSON.stringify(entries),
      timestamp: Date.now(),
      count: entries.length,
    });
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
  }
}

/**
 * Store a new embedding via search API.
 */
export async function storeEmbedding(noteId: string, content: string, channel?: string): Promise<boolean> {
  try {
    const embedding = await embedQuery(content);
    const url = `${SEARCH_API_URL}/ingest`;
    const body = JSON.stringify({
      entries: [{
        id: noteId,
        embedding,
        channel,
        timestamp: Math.floor(Date.now() / 1000),
      }],
    });

    // Ingest requires NIP-98 auth — use fetchWithNip98 which handles
    // both raw privkey (passkey/local-key) and NIP-07 extension signing
    const response = await fetchWithNip98(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) {
      // Update local cache
      cachedEmbeddings.set(noteId, {
        noteId,
        embedding,
        channel,
        timestamp: Date.now(),
      });
      setTimeout(() => saveToIndexedDB(), 1000);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isSearchAvailable(): boolean {
  return cacheLoaded && cachedEmbeddings.size > 0;
}

export function getSearchStats(): RuVectorStats | null {
  if (!cacheLoaded) return null;
  return {
    vectorCount: cachedEmbeddings.size,
    dimensions: DIMENSIONS,
    lastUpdated: lastCacheUpdate ? new Date(lastCacheUpdate).toISOString() : null,
    searchMode: navigator.onLine ? 'hybrid' : 'cached',
  };
}

export async function syncEmbeddings(force = false): Promise<{ synced: boolean; count: number }> {
  if (!navigator.onLine && !force) {
    return { synced: false, count: cachedEmbeddings.size };
  }
  const loaded = await loadFromRuVector();
  return { synced: loaded, count: cachedEmbeddings.size };
}

export async function initRuVectorSearch(): Promise<void> {
  setTimeout(async () => {
    try {
      await loadFromIndexedDB();
      if (navigator.onLine) {
        await loadFromRuVector();
        // Pre-warm ONNX embedder in background (downloads model on first run)
        preWarmOnnx();
      }
    } catch {
      console.warn('Background search init failed');
    }
  }, 3000);
}

export function unloadIndex(): void {
  cachedEmbeddings.clear();
  cacheLoaded = false;
}

export const loadIndex = loadFromRuVector;

export function resetRuVectorState(): void {
  cachedEmbeddings.clear();
  cacheLoaded = false;
  lastCacheUpdate = 0;
  embeddingCache.clear();
}
