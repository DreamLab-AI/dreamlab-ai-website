# Cloudflare Workers Deployment

**Last updated:** 2026-03-16 | [Back to Documentation Index](../README.md)

---

## Table of Contents

- [Build Pipeline](#build-pipeline)
- [Resource Relationships](#resource-relationships)
- [Rust Workers Build](#rust-workers-build)
- [Wrangler Configuration](#wrangler-configuration)
- [Cloudflare Resources](#cloudflare-resources)
- [Secrets Management](#secrets-management)
- [DNS Routes](#dns-routes)
- [Cron Keep-Warm](#cron-keep-warm)
- [WASM Size Limits](#wasm-size-limits)
- [GitHub Actions Secrets](#github-actions-secrets)
- [Related Documents](#related-documents)

---

## Build Pipeline

```mermaid
flowchart TD
    subgraph "Source"
        RUST_SRC[Rust Crates<br/>community-forum-rs/crates/]
    end

    subgraph "Rust Build Pipeline"
        CARGO[cargo build<br/>--target wasm32-unknown-unknown<br/>--release]
        WASM_BINDGEN[wasm-bindgen<br/>Generate JS glue]
        SHIM[Worker shim.mjs<br/>ES module entry]
    end

    subgraph "Deploy"
        WRANGLER_DEPLOY[wrangler deploy<br/>Upload to CF Edge]
        CF_EDGE[Cloudflare Edge<br/>Global deployment]
    end

    RUST_SRC --> CARGO --> WASM_BINDGEN --> SHIM --> WRANGLER_DEPLOY
    WRANGLER_DEPLOY --> CF_EDGE
```

---

## Resource Relationships

```mermaid
graph TB
    subgraph "Workers"
        AUTH[auth-worker<br/>Rust WASM]
        POD[pod-worker<br/>Rust WASM]
        PREVIEW[preview-worker<br/>Rust WASM]
        RELAY[relay-worker<br/>Rust WASM]
        SEARCH[search-worker<br/>Rust WASM]
    end

    subgraph "D1 Databases"
        D1_AUTH[(dreamlab-auth<br/>credentials, challenges)]
        D1_RELAY[(dreamlab-relay<br/>events, whitelist)]
    end

    subgraph "KV Namespaces"
        KV_SESSIONS[(SESSIONS<br/>Session tokens)]
        KV_POD_META[(POD_META<br/>ACLs, pod metadata)]
        KV_SEARCH[(SEARCH_CONFIG<br/>ID-label mapping)]
    end

    subgraph "R2 Buckets"
        R2_PODS[(dreamlab-pods<br/>Profile cards, media)]
        R2_VECTORS[(dreamlab-vectors<br/>.rvf vector stores)]
    end

    subgraph "Durable Objects"
        DO[NostrRelayDO<br/>WebSocket hibernation]
    end

    subgraph "Cache"
        CACHE[Cache API<br/>Link preview results]
    end

    AUTH --> D1_AUTH
    AUTH --> KV_SESSIONS
    AUTH --> KV_POD_META
    AUTH --> R2_PODS

    POD --> R2_PODS
    POD --> KV_POD_META

    PREVIEW --> CACHE

    RELAY --> D1_RELAY
    RELAY --> DO

    SEARCH --> R2_VECTORS
    SEARCH --> KV_SEARCH
```

---

## Rust Workers Build

All 5 workers are Rust crates that compile to `wasm32-unknown-unknown` via `worker-build`:

```bash
cd community-forum-rs/crates/auth-worker && worker-build --release
cd community-forum-rs/crates/pod-worker && worker-build --release
cd community-forum-rs/crates/preview-worker && worker-build --release
cd community-forum-rs/crates/relay-worker && worker-build --release
cd community-forum-rs/crates/search-worker && worker-build --release
```

Output lands in `build/worker/`. Wrangler deploys from the generated `shim.mjs`.

---

## Wrangler Configuration

### Example: auth-worker

```toml
name = "dreamlab-auth-api"
main = "build/worker/shim.mjs"
compatibility_date = "2024-09-23"

[build]
command = "worker-build --release"
```

### Example: relay-worker (with Durable Objects)

```toml
name = "dreamlab-nostr-relay"
main = "build/worker/shim.mjs"
compatibility_date = "2024-09-23"

[build]
command = "worker-build --release"

[durable_objects]
bindings = [{ name = "RELAY", class_name = "NostrRelayDO" }]

[[migrations]]
tag = "v1"
new_classes = ["NostrRelayDO"]
```

---

## Cloudflare Resources

### D1 Databases

| Database | Worker | Tables |
|----------|--------|--------|
| `dreamlab-auth` | auth-worker | `webauthn_credentials`, `challenges` |
| `dreamlab-relay` | relay-worker | `events`, `whitelist` |

### KV Namespaces

| Namespace | Worker(s) | Purpose |
|-----------|-----------|---------|
| `SESSIONS` | auth-worker | Session tokens (7-day TTL) |
| `POD_META` | auth-worker, pod-worker | Pod ACLs + metadata |
| `SEARCH_CONFIG` | search-worker | Vector ID-label mapping |
| `CONFIG` | auth-worker | General configuration |

### R2 Buckets

| Bucket | Worker(s) | Content |
|--------|-----------|---------|
| `dreamlab-pods` | auth-worker, pod-worker | User pod files (profiles, media, data) |
| `dreamlab-vectors` | search-worker | .rvf binary vector stores |

### Durable Objects

| Class | Worker | Instance | Purpose |
|-------|--------|----------|---------|
| `NostrRelayDO` | relay-worker | `"main"` (singleton) | WebSocket connection management with Hibernation API |

---

## Secrets Management

Set Worker secrets via `wrangler secret put`:

```bash
# auth-worker
echo "dreamlab-ai.com" | wrangler secret put RP_ID --name dreamlab-auth-api
echo "DreamLab AI" | wrangler secret put RP_NAME --name dreamlab-auth-api
echo "https://dreamlab-ai.com" | wrangler secret put EXPECTED_ORIGIN --name dreamlab-auth-api
echo "<admin-pubkey>" | wrangler secret put ADMIN_PUBKEYS --name dreamlab-auth-api

# pod-worker
echo "https://dreamlab-ai.com" | wrangler secret put EXPECTED_ORIGIN --name dreamlab-pod-api

# relay-worker
echo "<admin-pubkey>" | wrangler secret put ADMIN_PUBKEYS --name dreamlab-nostr-relay
echo "https://dreamlab-ai.com" | wrangler secret put ALLOWED_ORIGIN --name dreamlab-nostr-relay

# search-worker
echo "https://dreamlab-ai.com" | wrangler secret put ALLOWED_ORIGIN --name dreamlab-search-api
```

---

## DNS Routes

| Subdomain | Worker Name | Protocol |
|-----------|------------|----------|
| `api.dreamlab-ai.com` | `dreamlab-auth-api` | HTTPS |
| `pods.dreamlab-ai.com` | `dreamlab-pod-api` | HTTPS |
| `search.dreamlab-ai.com` | `dreamlab-search-api` | HTTPS |
| `preview.dreamlab-ai.com` | `dreamlab-link-preview` | HTTPS |
| `relay.dreamlab-ai.com` | `dreamlab-nostr-relay` | WSS |

---

## Cron Keep-Warm

All Workers run a `*/5 * * * *` cron trigger to prevent cold starts:

| Worker | Cron Action |
|--------|-------------|
| auth-worker | Ping D1 (`SELECT 1`) |
| pod-worker | No-op (trigger itself warms isolate) |
| preview-worker | No-op (trigger itself warms isolate) |
| relay-worker | Ping D1 (`SELECT 1`) |
| search-worker | Load WASM store from R2 |

---

## WASM Size Limits

Cloudflare paid plan allows 10 MB compressed WASM per Worker. Monitor binary sizes and apply `wasm-opt -Oz` if any Worker exceeds 5 MB.

| Worker | Expected Size | Optimization |
|--------|--------------|-------------|
| auth-worker | ~2 MB | `wasm-opt -Oz` in CI |
| pod-worker | ~1 MB | `wasm-opt -Oz` in CI |
| preview-worker | ~1 MB | `wasm-opt -Oz` in CI |
| relay-worker | ~2 MB | `wasm-opt -Oz` in CI |
| search-worker | ~1 MB | `wasm-opt -Oz` in CI |

---

## GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy (Scripts:Edit, D1:Edit, KV:Edit, R2:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Overview](README.md) | Architecture, CI/CD pipeline, environments, DNS |
| [Auth API](../api/AUTH_API.md) | auth-worker endpoints and D1 schema |
| [Pod API](../api/POD_API.md) | pod-worker endpoints and R2 layout |
| [Nostr Relay](../api/NOSTR_RELAY.md) | relay-worker endpoints and DO config |
| [Search API](../api/SEARCH_API.md) | search-worker endpoints and RVF WASM |
| [Security Overview](../security/SECURITY_OVERVIEW.md) | CORS, input validation, SSRF protection |
