# Search API — search-api (TypeScript, not ported)

## Overview

WASM-powered vector similarity search over R2-stored `.rvf` indices. Uses the
RuVector `rvf_wasm` microkernel (42KB, `no_std`) for cosine search on 384-dim
`all-MiniLM-L6-v2` embeddings. Stays TypeScript: RVF core is already Rust WASM,
the thin TS wrapper adds no meaningful overhead.

**Base URL**: `search.dreamlab-ai.com`

## Endpoints

### POST /search

k-NN cosine similarity search. Performance: 0.47ms p50 for 1K vectors.

**Body**: `{ "embedding": [384 floats], "k": 10, "minScore": 0.5 }`
**Response**: `{ "results": [{ "id": "...", "distance": 0.15, "score": 0.85 }], "totalVectors": 1500, "engine": "rvf-wasm" }`

### POST /ingest (NIP-98 Protected)

Batch ingest embeddings. Persists to R2 after ingestion.

**Body**: `{ "entries": [{ "id": "event-abc", "embedding": [384 floats] }] }`
**Response**: `{ "accepted": 5, "rejected": 0, "totalVectors": 1505 }`

Rejected entries have missing `id` or wrong embedding dimensions.

### POST /embed

Generate embeddings from text. Currently hash-based fallback; planned: MiniLM ONNX.

**Body**: `{ "text": "query" }` or `{ "texts": ["a", "b"] }` (max 100)
**Response**: `{ "embeddings": [[...]], "dimensions": 384, "model": "hash-fallback-v1" }`

### GET /status

**Response**: `{ "totalVectors": N, "dimensions": 384, "metric": "cosine", "engine": "rvf-wasm", "wasmModuleSize": "42KB" }`

## Architecture

```
Request -> TS Worker -> WebAssembly.instantiate(rvf_wasm_bg.wasm) -> Rust rvf functions -> Response
```

WASM module imported as ES module, instantiated lazily on first request. Store
handle and id-label mappings persist across requests in the same isolate.

## RVF WASM Functions

`rvf_store_create`, `rvf_store_open`, `rvf_store_ingest`, `rvf_store_query`,
`rvf_store_delete`, `rvf_store_count`, `rvf_store_export`, `rvf_store_close`.

The WASM engine uses u64 labels internally. KV mapping translates between
application string IDs (Nostr event IDs) and WASM numeric labels.

## Storage

| Resource | Location | Content |
|----------|----------|---------|
| `dreamlab.rvf` | R2 (`dreamlab-vectors`) | Binary .rvf vector container |
| `dreamlab.rvf:mapping` | KV (`SEARCH_CONFIG`) | `{ "pairs": [["id", label]], "next": N }` |

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `VECTORS` | R2Bucket | `dreamlab-vectors` — .rvf storage |
| `SEARCH_CONFIG` | KVNamespace | id-label mapping + config |
| `ALLOWED_ORIGIN` | Secret | CORS origin |
| `RVF_STORE_KEY` | Var | R2 key (default: `dreamlab.rvf`) |
