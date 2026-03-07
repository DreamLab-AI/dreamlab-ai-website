---
title: "RVF Runtime Architecture — Self-Bootstrapping Cognitive Containers"
description: "Architecture reference for the RuVector Format (.rvf) runtime, model embedding, and DreamLab semantic search pipeline"
category: architecture
tags: [rvf, ruvector, wasm, onnx, semantic-search, embeddings, runtime]
last-updated: 2026-03-07
---

# RVF Runtime Architecture

## Overview

The **RuVector Format (.rvf)** is a binary container format that serves as both a
persistence format AND a self-bootstrapping runtime. When a .rvf file contains a
WASM_SEG segment, any host with WebAssembly execution can load the embedded
interpreter and process the remaining data segments autonomously — making the file
a fully portable, executable knowledge unit.

DreamLab uses .rvf as the foundation for its semantic search system, deployed via
a 42KB WASM microkernel running in Cloudflare Workers.

## .rvf as a Runtime

### Self-Bootstrapping Execution Model

```
.rvf file loaded by any host
  ├── Parse segment directory (24-byte headers)
  ├── Find WASM_SEG (0x10)
  │     └── Instantiate WebAssembly module from segment bytes
  ├── Runtime reads sibling segments:
  │     ├── VEC_SEG (0x01)     → vector embeddings
  │     ├── INDEX_SEG (0x02)   → HNSW navigation graph
  │     ├── OVERLAY_SEG (0x03) → LoRA adapter deltas
  │     ├── MANIFEST_SEG (0x04)→ metadata + segment directory
  │     └── WITNESS_SEG (0x0A) → tamper-evident hash chain
  └── Runtime is operational (query, ingest, export)
```

A .rvf file can be:
- A **database**: VEC_SEG + INDEX_SEG
- A **model**: OVERLAY_SEG (LoRA deltas) + inference runtime
- A **runtime**: WASM_SEG + data segments = runs anywhere
- A **cognitive engine**: all of the above in one file

### Comparison to Existing Formats

| Format | Contains | Executable | Self-Describing | Attestable |
|--------|----------|-----------|-----------------|------------|
| ONNX | Model weights + graph | No | Yes | No |
| GGUF | Quantized model | No | Yes | No |
| SQLite | Database | No | Yes | No |
| Docker image | App + OS layers | Yes (needs daemon) | Yes | Yes (signing) |
| **.rvf** | **Data + Model + Runtime + Trust** | **Yes (WASM)** | **Yes** | **Yes (witness chain)** |

## Segment Type Reference

The .rvf format defines 28 segment types. Each segment has a header:

```
[magic: u32] [version: u8] [type: u8] [flags: u16] [seg_id: u64] [payload_len: u64]
```

### Data Segments

| Code | Name | Description |
|------|------|-------------|
| 0x01 | **Vec** | Raw vector data: `[count, dim, (id: u64, vec: f32*dim)*]` |
| 0x02 | **Index** | HNSW navigation graph (Layer A/B/C) |
| 0x06 | Quant | Quantization codebooks (Product Quantization, Scalar) |
| 0x07 | Filter | Pre-filter metadata indices |
| 0x08 | MetaIdx | Metadata inverted index |
| 0x09 | Bloom | Bloom filter for approximate membership |
| 0x0D | MultiVec | Multi-vector representations |

### Model & Learning Segments

| Code | Name | Description |
|------|------|-------------|
| 0x03 | **Overlay** | LoRA adapter deltas, partition updates, graph state |
| 0x23 | **Delta** | Sparse delta patches / LoRA overlays (space-efficient) |
| 0x24 | Graph | GNN adjacency and state data |
| 0x25 | Attention | Attention weight matrices |
| 0x30 | TransferPrior | Cross-domain transfer learning priors |
| 0x31 | PolicyKernel | Decision policy weights |
| 0x36 | **AggregateWeights** | Federated SONA weights (distributed learning) |

### Runtime Segments

| Code | Name | Description |
|------|------|-------------|
| 0x10 | **Wasm** | Self-bootstrapping WASM runtime (microkernel) |
| 0x0E | **Kernel** | Embedded Linux kernel image |
| 0x0F | Ebpf | eBPF programs |

### Infrastructure Segments

| Code | Name | Description |
|------|------|-------------|
| 0x04 | Manifest | Index metadata, segment directory |
| 0x05 | ManifestV2 | Extended manifest |
| 0x0A | **Witness** | SHAKE-256 hash chain (tamper evidence) |
| 0x0B | Crypto | Encryption / signing keys |
| 0x0C | CowMap | Copy-on-write mapping (page table) |
| 0x11 | Dashboard | Operational dashboards |
| 0x21 | SnapshotLink | Cross-file snapshot reference |
| 0x22 | TxnLog | Transaction log (WAL) |
| 0x35 | WitnessV2 | Enhanced witness chain |

## Two WASM Runtimes

### rvf_wasm (42KB) — Vector Store Microkernel

The production runtime deployed in Cloudflare Workers.

**Exports** (32 `extern "C"` functions):

```
// Store lifecycle
rvf_store_create(dim, metric) → handle
rvf_store_open(buf_ptr, buf_len) → handle
rvf_store_close(handle)
rvf_store_export(handle, out_ptr, out_len) → bytes

// CRUD
rvf_store_ingest(handle, vecs_ptr, ids_ptr, count) → accepted
rvf_store_query(handle, query_ptr, k, metric, out_ptr) → result_count
rvf_store_delete(handle, ids_ptr, count)
rvf_store_count(handle) → n
rvf_store_dimension(handle) → dim
rvf_store_status(handle, out_ptr) → 20 bytes

// Memory management
rvf_alloc(size) → ptr
rvf_free(ptr, size)

// Core query path
rvf_init, rvf_load_query, rvf_load_block, rvf_distances

// Top-K heap
rvf_topk_merge, rvf_topk_read

// Quantization
rvf_load_sq_params, rvf_dequant_i8     (scalar)
rvf_load_pq_codebook, rvf_pq_distances  (product)

// HNSW navigation
rvf_load_neighbors, rvf_greedy_step

// Integrity
rvf_verify_header, rvf_crc32c, rvf_verify_checksum
rvf_parse_header, rvf_segment_count, rvf_segment_info
rvf_witness_verify, rvf_witness_count
```

**Performance** (validated 2026-03-01):

| Metric | 100 vectors | 1000 vectors |
|--------|-------------|--------------|
| Ingest | instant | 2.1ms (486K vec/sec) |
| Query p50 | 0.47ms | 0.48ms |
| Query p95 | — | 0.79ms |
| Module size | 42KB | 42KB |

### ruvector_onnx_embeddings_wasm (7.4MB) — ONNX Inference Engine

Full ONNX Runtime compiled to WebAssembly. Available in the `ruvector` npm package
but **not currently deployed** in the search-api Worker.

**API:**
```typescript
class WasmEmbedder {
  constructor(model_bytes: Uint8Array, tokenizer_json: string);
  static withConfig(model_bytes, tokenizer_json, config: WasmEmbedderConfig);
  embedOne(text: string): Float32Array;      // Single text → 384d vector
  embedBatch(texts: string[]): Float32Array;  // Batch → flattened vectors
  similarity(text1: string, text2: string): number;
  dimension(): number;
  maxLength(): number;
}

class WasmEmbedderConfig {
  setPooling(strategy: number);   // 0=Mean, 1=CLS, 2=Max, 3=MeanSqrtLen, 4=LastToken
  setNormalize(normalize: boolean);
  setMaxLength(max_length: number);
}

// Utilities
function cosineSimilarity(a: Float32Array, b: Float32Array): number;
function normalizeL2(embedding: Float32Array): Float32Array;
function simd_available(): boolean;
```

## Model Embedding into .rvf

### Approach A: LoRA Adapters (Lightweight)

Embed domain-specific adaptations while keeping the frozen model external:

```
.rvf container:
  WASM_SEG    → rvf_wasm_bg.wasm (42KB store runtime)
  VEC_SEG     → vector embeddings (384d, cosine)
  OVERLAY_SEG → LoRA adapter weights (rank 2-8 × 384d, a few KB)
  MANIFEST_SEG → metadata
  WITNESS_SEG → integrity chain
```

The `AdaptiveEmbedder` from ruvector generates these LoRA deltas:
```
ONNX(text) → [frozen 384d] → LoRA_A(384×r) → LoRA_B(r×384) → [adapted 384d]
```

Deltas are learned via contrastive learning from co-edits, and consolidated with EWC++
to prevent catastrophic forgetting.

### Approach B: Full Self-Contained Model

Embed the entire inference pipeline:

```
.rvf container:
  WASM_SEG    → ruvector_onnx_embeddings_wasm_bg.wasm (7.4MB inference engine)
  VEC_SEG     → vector embeddings
  OVERLAY_SEG → ONNX model bytes (~23MB for all-MiniLM-L6-v2)
  FILTER_SEG  → tokenizer.json
  MANIFEST_SEG → metadata
```

Single file = complete semantic search engine. Any WASM host loads the runtime from
WASM_SEG, reads model from OVERLAY_SEG, tokenizer from FILTER_SEG, and can perform
both embedding generation AND vector search.

### Approach C: Kernel Embedding (Bare Metal)

For edge/IoT deployment:

```
.rvf container:
  KERNEL_SEG  → Linux kernel image (custom minimal)
  WASM_SEG    → rvf_wasm (42KB)
  VEC_SEG     → vectors
  EBPF_SEG    → network/security programs
```

The `embed_kernel()` API (in rvf-runtime crate) writes KERNEL_SEG with a 128-byte
header specifying architecture, kernel type, flags, API port, and command line.

## RuVector Intelligence Stack

The `ruvector` npm package provides a complete intelligence runtime beyond vector search:

### Embedding Providers

| Module | Class | Type | Quality |
|--------|-------|------|---------|
| Hash fallback | `generateEmbedding()` | Deterministic hash | Low (not semantic) |
| ONNX WASM | `WasmEmbedder` | Transformer inference | High (semantic) |
| Optimized ONNX | `OptimizedOnnxEmbedder` | INT8/FP16 quantized | High (faster) |
| Adaptive | `AdaptiveEmbedder` | ONNX + Micro-LoRA | Highest (domain-adapted) |

### Learning Components

| Module | Purpose |
|--------|---------|
| `SonaEngine` | Micro-LoRA (0.1ms), Base-LoRA, EWC++, ReasoningBank |
| `LearningEngine` | 9 RL algorithms (Q-learning, SARSA, PPO, DQN, etc.) |
| `IntelligenceEngine` | Full stack: VectorDB + SONA + AgentDB + Attention + ONNX |
| `WasmMicroLoRA` | Rank-1/2 LoRA adapter (WASM, zero-allocation, dim≤256) |
| `WasmScopedLoRA` | 17 operator-scoped adapters with category fallback |
| `WasmTrajectoryBuffer` | Circular buffer for adaptation trajectories |
| `TensorCompress` | Adaptive compression: FP16, PQ8, PQ4, binary (10x savings) |

### Available Embedding Models

| Model | Size | Dimensions | Source |
|-------|------|-----------|--------|
| all-MiniLM-L6-v2 | ~23MB | 384 | sentence-transformers |
| bge-small-en-v1.5 | ~33MB | 384 | BAAI |
| e5-small-v2 | ~33MB | 384 | intfloat |
| gte-small | ~33MB | 384 | Alibaba-NLP |

### Available LLM Models (ONNX)

| Model | Size | Context | Use Case |
|-------|------|---------|----------|
| SmolLM 135M | ~135MB | 2048 | Fastest instruct |
| SmolLM2 360M | ~360MB | 2048 | Better quality |
| Qwen2.5 0.5B | ~300MB | 4096 | Multilingual |
| TinyLlama 1.1B | ~600MB | 2048 | Best small quality |
| DeepSeek Coder 1.3B | ~700MB | 4096 | Code tasks |
| Phi-2 2.7B | ~1.5GB | 2048 | High quality |
| Phi-3 Mini | ~2GB | 4096 | Best tiny model |

## DreamLab Search Architecture

### Current Deployment

```
Browser ─── indexNewMessage() ──→ Local IndexedDB (text search)
  │                                  │
  │                                  └── storeEmbedding() [fire-and-forget]
  │                                        │
  │                                        ├── embedQuery(content) → POST /embed
  │                                        │     └── hash-based fallback (NOT semantic)
  │                                        │
  │                                        └── fetchWithNip98(POST /ingest)
  │                                              └── CF Worker: rvf_store_ingest()
  │                                                    → rvf_store_export() → R2
  │
  └── searchSimilar(query) ──→ POST /search
                                    │
                                    └── CF Worker: rvf_store_query()
                                          ├── Cosine k-NN on WASM linear memory
                                          ├── Map labels → string IDs
                                          └── Return JSON results
```

### Key Components

| Component | File | Role |
|-----------|------|------|
| Search Worker | `workers/search-api/index.ts` | WASM-powered search API (430 lines) |
| WASM Module | `workers/search-api/rvf_wasm_bg.wasm` | 42KB microkernel |
| Client Search | `community-forum/src/lib/semantic/ruvector-search.ts` | Calls Worker, IndexedDB fallback |
| Local Index | `community-forum/src/lib/utils/searchIndex.ts` | Dexie full-text search |
| NIP-98 Auth | `community-forum/src/lib/auth/nip98-client.ts` | Signs /ingest requests |

### Storage

| Store | Service | Content |
|-------|---------|---------|
| R2 `dreamlab-vectors` | VECTORS bucket | `.rvf` binary container |
| KV `SEARCH_CONFIG` | `{key}:mapping` | JSON `{ pairs: [id, label][], next: number }` |

### Worker Lifecycle

1. **Cold start**: `WebAssembly.instantiate(wasmModule)` → fetch .rvf from R2 → `rvf_store_open()` → load KV mapping
2. **Warm**: Reuse store handle across requests (sub-millisecond queries)
3. **Ingest**: `rvf_store_ingest()` → `rvf_store_export()` → PUT .rvf to R2 + mapping to KV
4. **Keep-warm**: Scheduled cron trigger calls `ensureStore()` to prevent cold starts

### Upgrade Path to Semantic Embeddings

The current `/embed` endpoint returns hash-based fallback vectors. Three upgrade options:

1. **Client-side ONNX**: Load all-MiniLM-L6-v2 via `ModelLoader` in browser (~23MB cached).
   `WasmEmbedder.embedOne(text)` → real 384d semantic vector. No Worker changes needed.

2. **Worker-side ONNX**: Replace hash fallback with `WasmEmbedder` in the Worker.
   Load ONNX model from R2. 7.4MB WASM + 23MB model adds to Worker memory.

3. **Self-contained .rvf**: Embed WASM inference engine + model + vectors in single .rvf.
   Maximum portability, but large file size.

## Implementation Status (2026-03-07)

### Client-Side ONNX Embedder — IMPLEMENTED

**File**: `community-forum/src/lib/semantic/onnx-local.ts`

Replaces the hash-based fallback with real transformer inference in the browser.

```
Browser tab
  ├── ensureOnnx() [lazy, first call only]
  │     ├── Dynamic import: ruvector/dist/core/onnx/pkg/ruvector_onnx_embeddings_wasm.js
  │     ├── WASM init: wasmModule.default()
  │     ├── Model download (Cache API):
  │     │     ├── model.onnx (~23MB) from HuggingFace
  │     │     └── tokenizer.json from HuggingFace
  │     └── WasmEmbedder.withConfig(model, tokenizer, { maxLength:256, normalize:true, pooling:Mean })
  │
  ├── onnxEmbed(text) → number[384] | null
  ├── onnxEmbedBatch(texts) → number[384][] | null
  └── preWarmOnnx() — starts download 5s after call (hides latency)
```

**Cache strategy**: `caches.open('ruvector-onnx-models')` — model and tokenizer persist
across browser sessions via the Cache API. First visit downloads ~30MB, subsequent visits
serve from cache (instant).

### 3-Tier Embedding Pipeline — IMPLEMENTED

**File**: `community-forum/src/lib/semantic/ruvector-search.ts`

The `embedQuery()` function now uses a priority chain:

| Priority | Source | Quality | Latency | Availability |
|----------|--------|---------|---------|-------------|
| 1 | Local ONNX WASM | Semantic (384d) | ~10ms (warm) | After model download |
| 2 | Server `/embed` | Hash-based (384d) | ~100ms network | When online |
| 3 | Client hash | Deterministic (384d) | Instant | Always |

The `initRuVectorSearch()` function now calls `preWarmOnnx()` in its background init
(3s after page load → 5s delay → begins model download if not cached).

### Vite Configuration — IMPLEMENTED

**File**: `community-forum/vite.config.ts`

- `assetsInclude: ['**/*.wasm']` — WASM files treated as importable assets
- `optimizeDeps.exclude: ['ruvector']` — prevents Vite from pre-bundling the ruvector
  package (which contains WASM that must be loaded at runtime)
- `@noble/hashes` alias resolves version conflicts across NDK dependencies

### Module Exports — IMPLEMENTED

**File**: `community-forum/src/lib/semantic/index.ts`

Exports from `onnx-local.ts`: `ensureOnnx`, `onnxEmbed`, `onnxEmbedBatch`, `isOnnxReady`,
`getOnnxDimension`, `preWarmOnnx`, `destroyOnnx`.

### What Remains

| Item | Status | Owner |
|------|--------|-------|
| DNS records (search., api., pods.) | Pending | Infrastructure |
| First vector ingest (0 vectors in store) | Pending | Needs deployed Workers + DNS |
| ONNX download in production browser | Untested | Needs deployed frontend |
| Worker-side ONNX (Approach B) | Not started | Optional upgrade |
| Self-contained .rvf (Approach C) | Not started | Future |
| HNSW wiring (O(log n) queries) | Not started | rvf_wasm upgrade needed |

## Known Limitations

1. **WASM store is brute-force**: `rvf_store_query()` iterates all vectors (O(n)).
   HNSW primitives exist (`rvf_greedy_step`, `rvf_load_neighbors`) but aren't wired in.

2. **rvf-runtime cannot compile to WASM**: Uses `std::fs`, `pread`, file locking.
   Only `rvf-wasm` and `rvf-index` target `wasm32-unknown-unknown`.

3. **No JS API for segment embedding**: Model/kernel embedding done at Rust crate level.
   The JS SDK only provides vector operations.

4. **ID mapping overhead**: WASM uses u64 numeric IDs. String ID mapping maintained
   in JS and persisted to KV alongside the .rvf in R2.

## References

- ADR-010: Return to Cloudflare (`docs/adr/010-return-to-cloudflare.md`)
- ADR-012: Hardening Sprint (`docs/adr/012-hardening-sprint.md`)
- DDD Bounded Contexts: BC-6 Search & Discovery (`docs/ddd-bounded-contexts.md`)
- RuVector Source: `/home/devuser/workspace/ruvector/crates/rvf/`
- npm Package: `community-forum/node_modules/ruvector/`
