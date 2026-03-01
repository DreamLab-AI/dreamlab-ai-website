# Cloudflare Workers Migration

**Last Updated:** 2026-03-01
**Status:** Deployed -- auth-api, pod-api, search-api live at `*.solitary-paper-764d.workers.dev`

This document describes the migration from GCP Cloud Run to the Cloudflare platform (Workers, Pages, D1, KV, R2). See [docs/prd-cloudflare-workers-migration.md](../prd-cloudflare-workers-migration.md) for the full PRD and [ADR-010](../adr/010-return-to-cloudflare.md) for the architectural decision record.

---

## Background

DreamLab previously used Cloudflare Workers + R2 (relay called "Nosflare") before migrating to GCP Cloud Run on 2026-01-25 (commit `7df51e1`). ADR-003 rejected Workers at the time, citing "WebSocket limitations, D1 immaturity" -- both issues have since been resolved by Cloudflare.

---

## Architecture

```
Cloudflare Edge (300+ PoPs)
+---------------------------------------------------------------+
|                                                               |
|  Pages ---------- Static SPA (React/Vite + SvelteKit forum)  |
|                                                               |
|  Workers -------- auth-api (WebAuthn + NIP-98)                |
|            |        +-- D1 (webauthn_credentials, challenges) |
|            |        +-- KV (session/rate-limit metadata)      |
|            |                                                   |
|            +----- pod-api (Solid storage replacement)          |
|            |        +-- R2 (pod files, ACL documents)          |
|            |        +-- KV (ACL metadata cache)               |
|            |        +-- WAC evaluator (JSON-LD, zero deps)    |
|            |                                                   |
|            +----- search-api (vector search + WASM)            |
|            |        +-- WASM module (42KB, @ruvector/rvf-wasm) |
|            |        +-- R2 (index persistence)                 |
|            |        +-- KV (query cache)                       |
|            |                                                   |
|            +----- image-api (future)                           |
|            |        +-- R2 (image uploads)                     |
|            |                                                   |
|            +----- nostr-relay (future, Durable Objects)        |
|                     +-- D1 (events, whitelist)                |
|                     +-- Durable Objects (WebSocket state)     |
+---------------------------------------------------------------+

Retained on GCP Cloud Run (us-central1):
  - nostr-relay (WebSocket, always-on)
  - embedding-api (Python, ML model)
```

---

## Current State

### What Exists Today

**Workers code** (in `workers/` directory):

| Worker | Source | Bindings | Status |
|--------|--------|----------|--------|
| auth-api | `workers/auth-api/` | D1, KV | Deployed |
| pod-api | `workers/pod-api/` | R2, KV | Deployed |
| search-api | `workers/search-api/` | WASM (42KB), R2, KV | Deployed |

**Shared modules:**

| Module | Location | Purpose |
|--------|----------|---------|
| NIP-98 | `community-forum/packages/nip98/` | Shared NIP-98 verification (used by all Workers) |

**Configuration:**

| File | Purpose |
|------|---------|
| `wrangler.toml` | Worker configuration with D1, KV, R2, WASM bindings |
| `workers-deploy.yml` | GitHub Actions workflow for deploying all Workers |

**Cloudflare Pages deploy** (in `deploy.yml`):

```yaml
- name: Deploy to Cloudflare Pages
  if: vars.CLOUDFLARE_PAGES_ENABLED == 'true'
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist/ --project-name=dreamlab-ai --commit-dirty=true
```

To enable Pages: set `CLOUDFLARE_PAGES_ENABLED=true` in GitHub repository variables and configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

### Migration Progress

| Component | GCP Equivalent | Cloudflare Target | Status |
|-----------|---------------|-------------------|--------|
| Static site deploy | GitHub Pages | Cloudflare Pages | Gated, ready to enable |
| auth-api | Cloud Run (Express) | Worker + D1 | Deployed |
| pod-api | Cloud Run (CSS 7.x) | Worker + R2 + WAC evaluator | Deployed |
| search-api | N/A (new service) | Worker + WASM + R2 + KV | Deployed |
| image-api | Cloud Run (Node.js) | Worker + R2 | Not started |
| nostr-relay | Cloud Run (Node.js) | Worker + Durable Objects + D1 | Not started (retained on Cloud Run) |
| embedding-api | Cloud Run (Python) | N/A (requires Python runtime) | Retained on Cloud Run |

---

## Worker: auth-api

### D1 Schema

```sql
CREATE TABLE webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL UNIQUE,
  did_nostr TEXT NOT NULL,
  webid TEXT,
  pod_url TEXT,
  public_key_bytes BLOB NOT NULL,
  counter INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'singleDevice',
  backed_up INTEGER DEFAULT 0,
  transports TEXT,
  prf_salt BLOB NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  challenge TEXT NOT NULL UNIQUE,
  pubkey TEXT,
  used INTEGER DEFAULT 0,
  prf_salt BLOB,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### wrangler.toml (auth-api)

```toml
name = "dreamlab-auth-api"
main = "src/index.ts"
compatibility_date = "2026-02-01"

[[d1_databases]]
binding = "DB"
database_name = "dreamlab-auth"
database_id = "<generated-on-create>"

[vars]
RP_ID = "dreamlab-ai.com"
RP_NAME = "DreamLab Community"
RP_ORIGIN = "https://dreamlab-ai.com"
```

### Migration Notes

- `@simplewebauthn/server` works in Workers (pure JS, no native dependencies)
- `nostr-tools` works in Workers (Web Crypto API compatible)
- `pg` (PostgreSQL client) replaced by D1 bindings
- `express.raw()` body capture replaced by `request.arrayBuffer()`
- Challenge expiry via D1 scheduled deletes (Workers CRON trigger)

---

## Worker: pod-api

Replaces the Community Solid Server (JSS) with a lightweight R2-backed pod storage service with WAC enforcement.

### R2 Bindings

```toml
[[r2_buckets]]
binding = "PODS"
bucket_name = "dreamlab-pods"

[[kv_namespaces]]
binding = "ACL_CACHE"
title = "dreamlab-acl-cache"
```

### WAC Evaluator

A custom Web Access Control evaluator (~200 lines, zero external dependencies) that:

1. Parses JSON-LD ACL documents from R2
2. Resolves the authenticated identity from NIP-98 tokens (`did:nostr:<pubkey>`)
3. Evaluates ACL rules against the requested resource and access mode
4. Returns allow/deny decisions

No RDF libraries required. ACL documents are stored as JSON-LD with a fixed `@context`, avoiding the need for full RDF parsing.

---

## Worker: search-api

Vector search service powered by a 42KB WASM microkernel (`@ruvector/rvf-wasm`).

### Performance

| Metric | Value |
|--------|-------|
| Throughput | 490,000 vectors/sec |
| Query latency (p50) | 0.47ms |
| WASM module size | 42KB |

### Bindings

```toml
[[r2_buckets]]
binding = "INDEX_STORE"
bucket_name = "dreamlab-search-indexes"

[[kv_namespaces]]
binding = "QUERY_CACHE"
title = "dreamlab-search-cache"

[wasm_modules]
RVF_WASM = "rvf_wasm_bg.wasm"
```

### Architecture

- **WASM microkernel**: `@ruvector/rvf-wasm` provides HNSW-based approximate nearest neighbor search compiled to WebAssembly
- **R2 persistence**: Vector indexes are serialized and stored in R2 for durability across Worker restarts
- **KV caching**: Frequent query results are cached in KV with TTL-based expiry
- **Zero cold-start overhead**: The 42KB WASM module loads in <1ms

---

## Worker: nostr-relay (Future)

WebSocket relay using Cloudflare Durable Objects for connection state management. Currently retained on GCP Cloud Run.

### Durable Objects

Each relay instance uses a Durable Object to manage WebSocket connections:

- Connection lifecycle (open, message, close, error)
- NIP-42 authentication state per connection
- Subscription management
- Event broadcasting to connected clients

### D1 for Event Storage

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  tags TEXT NOT NULL,  -- JSON
  content TEXT NOT NULL,
  sig TEXT NOT NULL,
  received_at INTEGER
);

CREATE INDEX idx_events_pubkey ON events(pubkey);
CREATE INDEX idx_events_kind ON events(kind);
CREATE INDEX idx_events_created ON events(created_at DESC);
```

---

## Deployment Requirements

To deploy Workers, the following Cloudflare account setup is required:

### 1. Cloudflare Account and API Credentials

| Requirement | Purpose |
|-------------|---------|
| Cloudflare account | Workers, Pages, D1, KV, R2 access |
| `CLOUDFLARE_API_TOKEN` | GitHub secret for wrangler CLI authentication |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub secret for targeting the correct account |

### 2. Resource Creation (via wrangler CLI or dashboard)

| Resource | Type | Binding Name | Notes |
|----------|------|-------------|-------|
| `dreamlab-auth` | D1 database | `DB` | WebAuthn credentials and challenges |
| `dreamlab-pods` | R2 bucket | `PODS` | Pod file storage |
| `dreamlab-acl-cache` | KV namespace | `ACL_CACHE` | ACL metadata cache |
| `dreamlab-search-indexes` | R2 bucket | `INDEX_STORE` | Vector index persistence |
| `dreamlab-search-cache` | KV namespace | `QUERY_CACHE` | Search query cache |

### 3. GitHub Secrets Configuration

```bash
# Required for Workers deployment
gh secret set CLOUDFLARE_API_TOKEN --body "<your-api-token>"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "<your-account-id>"
```

### 4. D1 Database Migration

After creating the D1 database, run the schema migration:

```bash
wrangler d1 execute dreamlab-auth --file=workers/auth-api/schema.sql
```

---

## Migration Plan

### Phase 1: Static Site (Low Risk) -- Ready to Enable

1. Enable `CLOUDFLARE_PAGES_ENABLED=true`
2. Configure Cloudflare API secrets
3. Verify dual deployment (GitHub Pages + Cloudflare Pages)
4. Test Cloudflare Pages build
5. Optionally: migrate DNS to Cloudflare for full CDN benefits

### Phase 2: Workers Deployment (Deployed)

1. Create Cloudflare account and API credentials
2. Create D1 databases, R2 buckets, and KV namespaces
3. Run D1 schema migrations
4. Deploy auth-api, pod-api, and search-api Workers via `workers-deploy.yml`
5. Test registration and authentication flows end-to-end
6. Migrate DNS to point `VITE_AUTH_API_URL` to the auth-api Worker

### Phase 3: Data Migration

1. Migrate WebAuthn credentials from Cloud SQL to D1
2. Migrate pod data from Cloud Storage to R2
3. Migrate image assets from GCS to R2
4. Verify data integrity

### Phase 4: Remaining Services (Future)

1. Port image-api to Worker + R2
2. Evaluate nostr-relay migration to Durable Objects + D1
3. Migrate event data from Cloud SQL to D1 (if relay is migrated)

### Phase 5: Decommission GCP (After Full Migration)

1. Verify all migrated services running on Cloudflare
2. Remove Cloud Run services for migrated workloads
3. Remove Cloud SQL instance (after data migration confirmed)
4. Remove Artifact Registry images
5. Update all documentation
6. Remove GCP-related GitHub secrets (for decommissioned services only)

---

## Cost Comparison

| Component | GCP (Current) | Cloudflare (Target) |
|-----------|--------------|---------------------|
| Static site | Free (GitHub Pages) | Free (Pages, 500 builds/month) |
| auth-api | ~$2-5/month (Cloud Run) | Free tier (100K requests/day) |
| pod-api (jss) | ~$2-5/month (Cloud Run) | ~$0.36/month (R2 storage) |
| search-api | N/A | Free tier (Workers + WASM) |
| nostr-relay | ~$15-25/month (always-on) | ~$5/month (Durable Objects) -- future |
| image-api | ~$1-3/month (Cloud Run) | Free tier + R2 -- future |
| Database | ~$10-30/month (Cloud SQL) | Free (D1, 5GB) |
| **Total** | **~$50-100/month** | **~$5-15/month** |

---

## Related Documentation

- [Deployment Overview](./README.md)
- [Cloud Services (current)](./CLOUD_SERVICES.md)
- [PRD: Cloudflare Workers Migration](../prd-cloudflare-workers-migration.md)
- [ADR-003: GCP Cloud Run Infrastructure](../adr/003-gcp-cloud-run-infrastructure.md)
- [ADR-010: Return to Cloudflare](../adr/010-return-to-cloudflare.md)

---

*Last major revision: 2026-03-01.*
