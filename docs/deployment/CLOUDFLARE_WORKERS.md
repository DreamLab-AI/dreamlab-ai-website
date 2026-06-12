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
        RUST_SRC[Rust Crates<br/>kit/crates/nostr-bbs-*-worker/<br/>cloned from nostr-rust-forum]
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

    subgraph "Workers AI"
        AI[bge-small-en-v1.5<br/>384-dim embeddings]
    end

    KV_RATE[(RATE_LIMIT<br/>preview rate limiting)]
    KV_ADMIN[(ADMIN_KV / ADMIN_KV_RO<br/>admin flags)]

    AUTH --> D1_AUTH
    AUTH -- "RELAY_DB (cross-D1<br/>whitelist.is_admin)" --> D1_RELAY
    AUTH --> KV_SESSIONS
    AUTH --> KV_POD_META
    AUTH --> KV_ADMIN
    AUTH --> R2_PODS

    POD --> R2_PODS
    POD --> KV_POD_META
    POD --> KV_ADMIN
    POD -- "REPLAY_DB (NIP-98 replay,<br/>payments/quota)" --> D1_AUTH

    PREVIEW --> CACHE
    PREVIEW --> KV_RATE

    RELAY --> D1_RELAY
    RELAY --> DO
    RELAY -- "REPLAY_DB (NIP-98 replay)" --> D1_AUTH

    SEARCH --> R2_VECTORS
    SEARCH --> KV_SEARCH
    SEARCH --> AI
    SEARCH -- "REPLAY_DB (NIP-98 replay)" --> D1_AUTH
```

The `nip98_replay` table lives in the shared `dreamlab-auth` D1 database so a NIP-98 token replayed against a *different* worker is still detected (bindings in `forum-config/deploy/*.wrangler.toml`).

---

## Rust Workers Build

All 5 workers are Rust crates from the `nostr-rust-forum` kit. The deploy
workflow clones the kit into `kit/` (pinned to the SHA in
`forum-config/Cargo.lock`), copies the DreamLab `wrangler.toml` overrides from
`forum-config/deploy/`, then compiles each crate to `wasm32-unknown-unknown`
via `worker-build`:

```bash
# Kit is cloned to ./kit by the deploy workflow (see .github/workflows/workers-deploy.yml)
cd kit/crates/nostr-bbs-auth-worker && worker-build --release
cd kit/crates/nostr-bbs-pod-worker && worker-build --release
cd kit/crates/nostr-bbs-preview-worker && worker-build --release
cd kit/crates/nostr-bbs-relay-worker && worker-build --release
cd kit/crates/nostr-bbs-search-worker && worker-build --release
```

Output lands in `build/worker/`. Wrangler deploys from the generated `shim.mjs`.

---

## Wrangler Configuration

### Example: auth-worker

```toml
name = "dreamlab-auth-api"
main = "build/worker/shim.mjs"
compatibility_date = "2025-09-01"

[build]
command = "worker-build --release"
```

### Example: relay-worker (with Durable Objects)

```toml
name = "dreamlab-nostr-relay"
main = "build/worker/shim.mjs"
compatibility_date = "2025-09-01"

[build]
command = "worker-build --release"

[[durable_objects.bindings]]
name        = "RELAY"
class_name  = "NostrRelayDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["NostrRelayDO"]
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
| `ADMIN_KV` / `ADMIN_KV_RO` | auth-worker (rw), pod-worker (ro) | Admin flags (provisioned at deploy time; see Operator-Provided Values) |
| `RATE_LIMIT` | preview-worker | Sliding-window rate limiting |

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

Non-secret configuration (`RP_ID`, `RP_NAME`, `EXPECTED_ORIGIN`, `POD_BASE_URL`,
`ALLOWED_ORIGIN`/`ALLOWED_ORIGINS`, `ZONE_CONFIG`, `NATIVE_POD_URL`) ships as
plaintext `[vars]` in `forum-config/deploy/*.wrangler.toml` — do NOT push those
as secrets. Only true secret material is set via `wrangler secret put`:

```bash
# auth-worker — the only worker with required CF secrets
echo "<admin-pubkey[,admin-pubkey...]>" | wrangler secret put ADMIN_PUBKEYS --name dreamlab-auth-api

# REQUIRED — operator-generated, never committed. The auth-worker mixes this
# server-held secret into the WebAuthn PRF → HKDF derivation. If it is unset,
# register/login return HTTP 500 at request time. Generate a fresh 32-byte
# value and set it before the first deploy:
openssl rand -hex 32 | wrangler secret put PRF_SERVER_SECRET --name dreamlab-auth-api

# REQUIRED when [native_pod] is enabled — PSK matching the native server's
# SOLID_ADMIN_KEY for /_admin/provision:
echo "<psk>" | wrangler secret put NATIVE_POD_ADMIN_KEY --name dreamlab-auth-api
```

The `workers-deploy.yml` pipeline blocks the auth-worker deploy if
`PRF_SERVER_SECRET`, `ADMIN_PUBKEYS`, or `NATIVE_POD_ADMIN_KEY` is absent.
The relay-worker takes no `ADMIN_PUBKEYS` secret — its admin authority is the
D1 `whitelist.is_admin` column. The search-worker's `ADMIN_PUBKEYS` is a
plaintext `[vars]` value in `search-worker.wrangler.toml`.
The [`set-worker-secrets.yml`](../../.github/workflows/set-worker-secrets.yml)
workflow pushes the native-pod values in one shot.

---

## Operator-Provided Values

These values are **operator data**. They are deliberately NOT committed to this
repo and NOT generated by the deploy pipeline — the pipeline only *validates*
that they are present, and fails fast if they are missing or still hold a
`REPLACE_WITH_*` placeholder.

| Value | Where | How to provision | Failure if missing |
|-------|-------|------------------|--------------------|
| `ADMIN_KV` namespace id | `forum-config/deploy/auth-worker.wrangler.toml` (`ADMIN_KV`), `pod-worker.wrangler.toml` (`ADMIN_KV_RO`) — shipped as `REPLACE_WITH_NEW_ADMIN_KV_ID` | `wrangler kv:namespace create dreamlab-admin-kv`, paste the returned id (the `workers-deploy.yml` pipeline also auto-provisions and substitutes it). | Admin-flag writes/reads 500 at request time. |
| `PRF_SERVER_SECRET` | auth-worker secret | `openssl rand -hex 32 \| wrangler secret put PRF_SERVER_SECRET --name dreamlab-auth-api` | WebAuthn register/login 500 at request time. |

**Fail-fast enforcement (R-09).** Two checks now surface these as *deploy-time*
errors instead of request-time 500s:

1. `forum-config::deploy_config::validate_deploy_dir()` scans every shipped
   `deploy/*.wrangler.toml` for unresolved `REPLACE_WITH_*` ids. A CI test
   (`cargo test -p dreamlab-forum-config`) runs it against the checked-in
   manifests.
2. The `workers-deploy.yml` "Validate required auth-worker secrets are set"
   step runs `wrangler secret list` before `wrangler deploy` and blocks the
   deploy if `PRF_SERVER_SECRET`, `ADMIN_PUBKEYS`, or `NATIVE_POD_ADMIN_KEY` is absent. Deploy pipelines
   can also call `deploy_config::validate_required_secrets()` directly.

---

## Operator Actions (cannot be done by repo automation)

These require operator access to live infrastructure or to secret material and
**must be performed by an operator**, not by any agent or CI job:

- **Rotate the `operator-jjohare` admin keypair (R-01).** A previous revision of
  the test fixtures embedded a private key that derived to the live admin pubkey
  in `forum-config/dreamlab.toml`. The test fixtures have since been decoupled
  to a throwaway keypair, but **the live key must still be rotated** because the
  old key remains in git history. Generate a fresh admin keypair, update the
  `operator-jjohare` entry in `dreamlab.toml`, re-set `ADMIN_PUBKEYS` on the
  auth-worker and relay-worker, and update the relay D1 whitelist. (Agents must
  not touch `dreamlab.toml` or live secrets.)
- **Provision the real `ADMIN_KV` namespace id** and **set `PRF_SERVER_SECRET`**
  — see [Operator-Provided Values](#operator-provided-values) above.

---

## DNS Routes

> **Planned end-state — not provisioned.** These branded routes do not exist in DNS (verified 2026-06-09); live traffic uses `https://<worker>.solitary-paper-764d.workers.dev`.

| Subdomain | Worker Name | Protocol |
|-----------|------------|----------|
| `api.dreamlab-ai.com` | `dreamlab-auth-api` | HTTPS |
| `pods.dreamlab-ai.com` | `dreamlab-pod-api` | HTTPS |
| `search.dreamlab-ai.com` | `dreamlab-search-api` | HTTPS |
| `preview.dreamlab-ai.com` | `dreamlab-link-preview` | HTTPS |
| `relay.dreamlab-ai.com` | `dreamlab-nostr-relay` | WSS |

---

## Cron Keep-Warm

> **Not configured in this deployment.** The kit's default `wrangler.toml` files declare `*/5 * * * *` crons for the relay and search workers, but the DreamLab deploy replaces every `wrangler.toml` with `forum-config/deploy/*.wrangler.toml`, none of which declare `[triggers] crons`. No cron triggers are live; the table below describes the kit defaults only.

| Worker | Kit-default cron action |
|--------|-------------|
| relay-worker | `*/5 * * * *` (D1 ping / sweep) |
| search-worker | `*/5 * * * *` (warm store from R2) |

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
| [Native Pod Mesh](NATIVE_POD_MESH.md) | Native pod tier (git support): CF Tunnel, agentbox sidecar, wrangler secrets, build env |
| [Auth API](../api/AUTH_API.md) | auth-worker endpoints and D1 schema |
| [Pod API](../api/POD_API.md) | pod-worker endpoints and R2 layout |
| [Nostr Relay](../api/NOSTR_RELAY.md) | relay-worker endpoints and DO config |
| [Search API](../api/SEARCH_API.md) | search-worker endpoints and RVF WASM |
| [Security Overview](../security/SECURITY_OVERVIEW.md) | CORS, input validation, SSRF protection |
