# Embedding Service API

**Last Updated:** 2026-03-01

The embedding service provides vector embeddings for semantic search capabilities in the DreamLab AI community forum. Embeddings are pre-computed and stored in Google Cloud Storage, then synced to client devices for local similarity search.

> **Migration note:** This service is retained on GCP Cloud Run per ADR-010 (ML inference requires CPU/memory beyond Cloudflare Workers limits). Client-side WASM search via `rvf-wasm` (`community-forum/packages/rvf-wasm/`) provides a complementary local TF-IDF search capability that does not depend on this service.

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Model** | all-MiniLM-L6-v2 (Sentence Transformers) |
| **Dimensions** | 384 |
| **Quantisation** | int8 or float32 |
| **Storage** | Google Cloud Storage (public bucket) |
| **Index** | HNSW (Hierarchical Navigable Small World) |
| **Search** | Client-side (WASM, IndexedDB) |
| **Deployment** | GCP Cloud Run (Python 3.11, FastAPI) |

---

## Architecture

```
Embedding API (Cloud Run)
  |
  v
GCS Bucket (public)
  +-- latest/manifest.json
  +-- latest/index.bin        (HNSW index, ~50MB)
  +-- latest/index_mapping.json
  +-- latest/embeddings.bin   (raw vectors, ~200MB)
  |
  v
Client (browser)
  +-- WiFi-only background sync
  +-- IndexedDB cache
  +-- WASM-based similarity search
```

The embedding API generates embeddings and uploads them to GCS. Clients sync the pre-built index and perform similarity search locally, minimising API calls and latency.

---

## Server API

### POST /embed

Generate an embedding for a text string.

**Request**:
```json
{
  "text": "sample text to embed"
}
```

**Response**:
```json
{
  "embedding": [0.123, -0.456, ...],
  "dimensions": 384,
  "model": "all-MiniLM-L6-v2"
}
```

### GET /health

Health check.

**Response**:
```json
{
  "ok": true,
  "model_loaded": true
}
```

### CORS

```
Allowed origins: https://dreamlab-ai.com, http://localhost:5173
```

---

## Manifest API (GCS)

### GET latest/manifest.json

Returns metadata about the current embedding index.

**URL**: `https://storage.googleapis.com/<bucket>/latest/manifest.json`

**Response**:
```json
{
  "version": 2,
  "updated_at": "2026-02-15T10:00:00Z",
  "total_vectors": 150000,
  "dimensions": 384,
  "model": "all-MiniLM-L6-v2",
  "quantize_type": "int8",
  "index_size_bytes": 52428800,
  "embeddings_size_bytes": 209715200,
  "latest": {
    "index": "latest/index.bin",
    "index_mapping": "latest/index_mapping.json",
    "embeddings": "latest/embeddings.bin",
    "manifest": "latest/manifest.json"
  }
}
```

### GET latest/index.bin

Download the HNSW index binary (~50MB).

### GET latest/index_mapping.json

Download the index-to-event-ID mapping:

```json
{
  "0": "event_id_1",
  "1": "event_id_2",
  ...
}
```

### GET latest/embeddings.bin

Download raw embeddings binary.

**Format**:
- int8: 1 byte per dimension (384 bytes per vector)
- float32: 4 bytes per dimension (1536 bytes per vector)

---

## Client Sync

### Sync Strategy

1. Check local version against manifest version
2. Download only if a newer version is available
3. Store in IndexedDB for offline access
4. Lazy-load into memory when needed
5. Background sync 5 seconds after app start

### Network Awareness

| Connection | Auto-Sync |
|-----------|-----------|
| WiFi / Ethernet | Yes |
| 4G (unmetered) | Yes |
| 3G / 2G / cellular | No |
| iOS (no navigator.connection) | No (manual sync) |
| Unknown (desktop) | Yes |

### User Preferences

Users can set sync preference:

- `wifi-only` (default): Sync only on WiFi/Ethernet
- `always`: Sync on any connection
- `manual`: Sync only when explicitly triggered

### IndexedDB Schema

**Table: `metadata`**

| Key | Value |
|-----|-------|
| `embedding_sync_state` | `{ version: number, lastSynced: number, indexLoaded: boolean }` |

**Table: `embeddings`**

| Key | Data | Description |
|-----|------|-------------|
| `hnsw_index` | ArrayBuffer | HNSW index binary |
| `index_mapping` | ArrayBuffer | ID mapping |

---

## File Sizes

| File | Approximate Size |
|------|-----------------|
| Manifest | ~1 KB |
| HNSW Index | ~50 MB |
| Index Mapping | ~10 MB |
| Embeddings | ~200 MB |

---

## Security

- GCS bucket is public (no authentication required for downloads)
- HTTPS only for all transfers
- No sensitive data in embeddings (only vector representations of public content)
- Client-side storage is origin-isolated via IndexedDB

---

## Deployment

| Attribute | Value |
|-----------|-------|
| **Workflow** | `.github/workflows/embedding-api.yml` |
| **Source** | `community-forum/services/embedding-api/` |
| **Runtime** | Python 3.11, FastAPI |
| **Memory** | 2Gi (ML model ~2GB) |
| **Build** | Cloud Build (E2_HIGHCPU_8, 20-min timeout) |
| **Instances** | 0-3 (scale-to-zero) |

---

## Related Documentation

- [Cloud Services Deployment](../deployment/CLOUD_SERVICES.md) -- Deployment configuration
- [Nostr Relay API](./NOSTR_RELAY.md) -- Source events for embeddings

---

*Last major revision: 2026-03-01.*
