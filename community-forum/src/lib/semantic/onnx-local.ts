/**
 * Local ONNX Embedder — Client-Side Semantic Embeddings
 *
 * Uses ruvector's ONNX WASM embedder to generate real transformer embeddings
 * in the browser. Model (all-MiniLM-L6-v2, ~23MB) is downloaded once from
 * HuggingFace and cached via the Cache API for subsequent sessions.
 *
 * Architecture:
 *   1. Lazy init: WASM module (7.4MB) + ONNX model (23MB) loaded on first embed call
 *   2. Cache API stores both model and tokenizer across sessions
 *   3. embedOne(text) → Float32Array(384) — real semantic embedding
 *   4. Falls back gracefully if WASM or model loading fails
 *
 * This replaces the hash-based fallback with genuine semantic similarity.
 */

// Singleton state
let embedder: WasmEmbedderLike | null = null;
let initPromise: Promise<boolean> | null = null;
let initFailed = false;
let onnxDimension = 384;

// Type interface matching WasmEmbedder from ruvector ONNX WASM
interface WasmEmbedderLike {
  embedOne(text: string): Float32Array;
  embedBatch(texts: string[]): Float32Array;
  similarity(text1: string, text2: string): number;
  dimension(): number;
  free(): void;
}

interface WasmEmbedderConfigLike {
  setMaxLength(len: number): WasmEmbedderConfigLike;
  setNormalize(normalize: boolean): WasmEmbedderConfigLike;
  setPooling(pooling: number): WasmEmbedderConfigLike;
}

interface OnnxWasmModule {
  default(): Promise<void>;
  WasmEmbedder: {
    new(model_bytes: Uint8Array, tokenizer_json: string): WasmEmbedderLike;
    withConfig(model_bytes: Uint8Array, tokenizer_json: string, config: WasmEmbedderConfigLike): WasmEmbedderLike;
  };
  WasmEmbedderConfig: {
    new(): WasmEmbedderConfigLike;
  };
}

// Model config
const MODEL_URL = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx';
const TOKENIZER_URL = 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json';
const CACHE_NAME = 'ruvector-onnx-models';
const MAX_LENGTH = 256;

/**
 * Fetch with Cache API — downloads once, serves from cache thereafter.
 */
async function fetchCached(url: string, cacheKey: string, type: 'arraybuffer' | 'text'): Promise<ArrayBuffer | string> {
  // Try cache first
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(cacheKey);
      if (cached) {
        return type === 'arraybuffer' ? cached.arrayBuffer() : cached.text();
      }
    } catch {
      // Cache API unavailable (e.g. Firefox private browsing)
    }
  }

  // Fetch from network
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  // Store in cache
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey, response.clone());
    } catch {
      // Cache write failed
    }
  }

  return type === 'arraybuffer' ? response.arrayBuffer() : response.text();
}

/**
 * Initialize the ONNX embedder. Lazy — called on first embed.
 * Downloads WASM module + ONNX model + tokenizer (cached for future sessions).
 */
async function doInit(): Promise<boolean> {
  if (embedder) return true;
  if (initFailed) return false;

  try {
    // Dynamic import of the WASM module from ruvector
    const wasmModule = await import(
      /* @vite-ignore */
      'ruvector/dist/core/onnx/pkg/ruvector_onnx_embeddings_wasm.js'
    ) as OnnxWasmModule;
    await wasmModule.default();

    // Download model and tokenizer (Cache API backed)
    const [modelBuf, tokenizerJson] = await Promise.all([
      fetchCached(MODEL_URL, 'all-MiniLM-L6-v2-model.onnx', 'arraybuffer') as Promise<ArrayBuffer>,
      fetchCached(TOKENIZER_URL, 'all-MiniLM-L6-v2-tokenizer.json', 'text') as Promise<string>,
    ]);

    // Create embedder with mean pooling + L2 normalization
    const config = new wasmModule.WasmEmbedderConfig()
      .setMaxLength(MAX_LENGTH)
      .setNormalize(true)
      .setPooling(0); // Mean pooling

    embedder = wasmModule.WasmEmbedder.withConfig(
      new Uint8Array(modelBuf),
      tokenizerJson,
      config,
    );

    onnxDimension = embedder.dimension();
    console.log(`ONNX embedder ready: ${onnxDimension}d, all-MiniLM-L6-v2`);
    return true;
  } catch (err) {
    console.warn('ONNX embedder init failed, will use server fallback:', err);
    initFailed = false; // Allow retry on next call (might be transient network issue)
    return false;
  }
}

/**
 * Ensure the embedder is initialized. Returns the singleton promise
 * so concurrent callers share the same init.
 */
export function ensureOnnx(): Promise<boolean> {
  if (embedder) return Promise.resolve(true);
  if (!initPromise) {
    initPromise = doInit().finally(() => { initPromise = null; });
  }
  return initPromise;
}

/**
 * Generate a semantic embedding for a single text.
 * Returns null if ONNX is not available (caller should fall back).
 */
export async function onnxEmbed(text: string): Promise<number[] | null> {
  const ready = await ensureOnnx();
  if (!ready || !embedder) return null;

  try {
    const vec = embedder.embedOne(text);
    return Array.from(vec);
  } catch (err) {
    console.warn('ONNX embed failed:', err);
    return null;
  }
}

/**
 * Generate semantic embeddings for multiple texts.
 * Returns null if ONNX is not available.
 */
export async function onnxEmbedBatch(texts: string[]): Promise<number[][] | null> {
  const ready = await ensureOnnx();
  if (!ready || !embedder) return null;

  try {
    const flat = embedder.embedBatch(texts);
    const dim = onnxDimension;
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      results.push(Array.from(flat.slice(i * dim, (i + 1) * dim)));
    }
    return results;
  } catch (err) {
    console.warn('ONNX batch embed failed:', err);
    return null;
  }
}

/**
 * Check if ONNX embedder is initialized and ready.
 */
export function isOnnxReady(): boolean {
  return embedder !== null;
}

/**
 * Get the embedding dimension (384 for all-MiniLM-L6-v2).
 */
export function getOnnxDimension(): number {
  return onnxDimension;
}

/**
 * Pre-warm the ONNX embedder in the background.
 * Call this early (e.g., after auth) to hide the model download latency.
 */
export function preWarmOnnx(): void {
  if (typeof window === 'undefined') return;
  if (embedder || initPromise) return;

  // Delay to avoid competing with initial page load
  setTimeout(() => {
    ensureOnnx().catch(() => {});
  }, 5000);
}

/**
 * Release the ONNX embedder and free WASM memory.
 */
export function destroyOnnx(): void {
  if (embedder) {
    try { embedder.free(); } catch { /* already freed */ }
    embedder = null;
  }
  initFailed = false;
}
