# Cloudflare Workers Migration (Planned)

**Last Updated:** 2026-02-28
**Status:** Planned. Currently gated by `CLOUDFLARE_PAGES_ENABLED` repository variable.

This document describes the planned migration from GCP Cloud Run to the Cloudflare platform (Workers, Pages, D1, KV, R2). See [docs/prd-cloudflare-workers-migration.md](../prd-cloudflare-workers-migration.md) for the full PRD.

---

## Background

DreamLab previously used Cloudflare Workers + R2 (relay called "Nosflare") before migrating to GCP Cloud Run on 2026-01-25 (commit `7df51e1`). ADR-003 rejected Workers at the time, citing "WebSocket limitations, D1 immaturity" -- both issues have since been resolved by Cloudflare.

---

## Planned Architecture

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
|            +----- image-api                                    |
|            |        +-- R2 (image uploads)                     |
|            |                                                   |
|            +----- nostr-relay (Durable Objects + WebSocket)    |
|                     +-- D1 (events, whitelist)                |
|                     +-- Durable Objects (WebSocket state)     |
+---------------------------------------------------------------+
```

---

## Current State

### What Exists Today

The `deploy.yml` workflow already includes a Cloudflare Pages deployment step, gated by a repository variable:

```yaml
- name: Deploy to Cloudflare Pages
  if: vars.CLOUDFLARE_PAGES_ENABLED == 'true'
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist/ --project-name=dreamlab-ai --commit-dirty=true
```

To enable: set `CLOUDFLARE_PAGES_ENABLED=true` in GitHub repository variables and configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

### What Needs to Be Built

| Component | GCP Equivalent | Cloudflare Target | Status |
|-----------|---------------|-------------------|--------|
| Static site deploy | GitHub Pages | Cloudflare Pages | Gated, ready |
| auth-api | Cloud Run (Express) | Worker + D1 | Not started |
| pod-api | Cloud Run (CSS 7.x) | Worker + R2 + WAC evaluator | Not started |
| nostr-relay | Cloud Run (Node.js) | Worker + Durable Objects + D1 | Not started |
| image-api | Cloud Run (Node.js) | Worker + R2 | Not started |
| embedding-api | Cloud Run (Python) | External (requires Python runtime) | Out of scope |

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

## Worker: nostr-relay

WebSocket relay using Cloudflare Durable Objects for connection state management.

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

## Migration Plan

### Phase 1: Static Site (Low Risk)

1. Enable `CLOUDFLARE_PAGES_ENABLED=true`
2. Configure Cloudflare API secrets
3. Verify dual deployment (GitHub Pages + Cloudflare Pages)
4. Test Cloudflare Pages build
5. Optionally: migrate DNS to Cloudflare for full CDN benefits

### Phase 2: auth-api Worker (Medium Risk)

1. Port Express routes to Worker fetch handler
2. Replace `pg` with D1 bindings
3. Verify WebAuthn ceremony works in Workers runtime
4. Deploy as a separate Worker with its own D1 database
5. Test registration and authentication flows end-to-end
6. Migrate DNS to point `VITE_AUTH_API_URL` to the Worker

### Phase 3: pod-api Worker (Medium Risk)

1. Build WAC evaluator
2. Port pod provisioning to R2 + KV
3. Migrate existing pod data from Cloud Storage to R2
4. Update auth-api to provision pods via the new pod-api Worker

### Phase 4: Relay and Image Workers (Higher Risk)

1. Port nostr-relay to Durable Objects + D1
2. Port image-api to Worker + R2
3. Migrate event data from Cloud SQL to D1
4. Migrate images from GCS to R2

### Phase 5: Decommission GCP

1. Verify all services running on Cloudflare
2. Remove GCP Cloud Run services
3. Remove Cloud SQL instance
4. Remove Artifact Registry images
5. Update all documentation
6. Remove GCP-related GitHub secrets

---

## Cost Comparison

| Component | GCP (Current) | Cloudflare (Planned) |
|-----------|--------------|---------------------|
| Static site | Free (GitHub Pages) | Free (Pages, 500 builds/month) |
| auth-api | ~$2-5/month (Cloud Run) | Free tier (100K requests/day) |
| pod-api (jss) | ~$2-5/month (Cloud Run) | ~$0.36/month (R2 storage) |
| nostr-relay | ~$15-25/month (always-on) | ~$5/month (Durable Objects) |
| image-api | ~$1-3/month (Cloud Run) | Free tier + R2 |
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

*Last major revision: 2026-02-28.*
