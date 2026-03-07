/**
 * Semantic Search Module
 * Primary: RuVector (Cloudflare Worker search-api with R2-backed vector index)
 * Offline fallback: IndexedDB-cached embeddings with brute-force cosine
 */

export {
  syncEmbeddings as syncHnswEmbeddings,
  initEmbeddingSync as initHnswSync,
  fetchManifest,
  shouldSync,
  getLocalSyncState,
  type EmbeddingManifest
} from './embeddings-sync';

// RuVector exports (primary)
export {
  loadIndex,
  loadFromRuVector,
  searchSimilar,
  isSearchAvailable,
  getSearchStats,
  unloadIndex,
  syncEmbeddings,
  initRuVectorSearch,
  storeEmbedding,
  type SearchResult,
  type RuVectorStats
} from './ruvector-search';

// Re-export SearchResult from ruvector (same interface)
export type { SearchResult as RuVectorSearchResult } from './ruvector-search';

// Local ONNX embedder (client-side semantic embeddings)
export {
  ensureOnnx,
  onnxEmbed,
  onnxEmbedBatch,
  isOnnxReady,
  getOnnxDimension,
  preWarmOnnx,
  destroyOnnx
} from './onnx-local';

// Initialize semantic search via RuVector
export async function initSemanticSearch(): Promise<void> {
  const { initRuVectorSearch } = await import('./ruvector-search');
  const { initEmbeddingSync } = await import('./embeddings-sync');

  // RuVector server-side search (Cloudflare Worker)
  await initRuVectorSearch();

  // Embedding sync for offline cache
  await initEmbeddingSync();
}

export { default as SemanticSearch } from './SemanticSearch.svelte';
