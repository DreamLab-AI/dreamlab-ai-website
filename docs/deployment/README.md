# Deployment Overview -- DreamLab AI

**Last updated:** 2026-05-29 | [Back to Documentation Index](../README.md)

---

## Table of Contents

- [Architecture](#architecture)
- [CI/CD Pipeline](#cicd-pipeline)
- [Static Sites](#static-sites)
- [Cloudflare Workers](#cloudflare-workers)
- [Environments](#environments)
- [Required Secrets](#required-secrets)
- [DNS Records](#dns-records)
- [Related Documents](#related-documents)

---

## Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        BROWSER[Browser]
    end

    subgraph "CDN: GitHub Pages"
        REACT[React Main Site<br/>dreamlab-ai.com /]
        LEPTOS[Leptos Forum Client<br/>dreamlab-ai.com /community/]
    end

    subgraph "Cloudflare Edge"
        CF_EDGE[TLS Termination + Routing]
    end

    subgraph "Rust Workers (WASM)"
        AUTH_W[auth-worker<br/>api.dreamlab-ai.com]
        POD_W[pod-worker<br/>pods.dreamlab-ai.com]
        PREVIEW_W[preview-worker<br/>preview.dreamlab-ai.com]
        RELAY_W[relay-worker<br/>relay.dreamlab-ai.com]
        SEARCH_W[search-worker<br/>search.dreamlab-ai.com]
    end

    subgraph "Cloudflare Storage"
        D1_AUTH[(D1: dreamlab-auth)]
        D1_RELAY[(D1: dreamlab-relay)]
        KV_SESSIONS[(KV: SESSIONS)]
        KV_POD_META[(KV: POD_META)]
        KV_SEARCH[(KV: SEARCH_CONFIG)]
        R2_PODS[(R2: dreamlab-pods)]
        R2_VECTORS[(R2: dreamlab-vectors)]
        DO[DO: NostrRelayDO]
    end

    BROWSER --> REACT
    BROWSER --> LEPTOS
    BROWSER --> CF_EDGE

    CF_EDGE --> AUTH_W
    CF_EDGE --> POD_W
    CF_EDGE --> PREVIEW_W
    CF_EDGE -- "WSS" --> RELAY_W
    CF_EDGE --> SEARCH_W

    AUTH_W --> D1_AUTH
    AUTH_W --> KV_SESSIONS
    AUTH_W --> KV_POD_META
    AUTH_W --> R2_PODS

    POD_W --> R2_PODS
    POD_W --> KV_POD_META

    PREVIEW_W -- "Outbound fetch" --> EXTERNAL[External URLs]

    RELAY_W --> D1_RELAY
    RELAY_W --> DO

    SEARCH_W --> R2_VECTORS
    SEARCH_W --> KV_SEARCH
```

---

## CI/CD Pipeline

### deploy.yml -- Static Sites

Triggers on push to `main`. Guard: `if: github.repository == 'DreamLab-AI/dreamlab-ai-website'`

```mermaid
flowchart LR
    PUSH[Push to main] --> CHECKOUT[Checkout code]
    CHECKOUT --> PARALLEL

    subgraph PARALLEL [Parallel Build]
        direction TB
        REACT_BUILD[npm ci<br/>npm run build<br/>React main site -> dist/]
        LEPTOS_BUILD[Install Rust + Trunk<br/>trunk build --release<br/>Leptos forum -> WASM]
        LEPTOS_BUILD --> WASM_OPT[wasm-opt -Oz<br/>Optimize WASM binary]
    end

    PARALLEL --> COPY[Copy forum output<br/>to dist/community/]
    COPY --> DEPLOY_PAGES[Push dist/ to<br/>gh-pages branch]
    DEPLOY_PAGES --> LIVE[Live on<br/>dreamlab-ai.com]
```

### workers-deploy.yml -- Cloudflare Workers

Triggers on push to `main` when files under `forum-config/deploy/**` change. The workflow clones the `nostr-rust-forum` kit at `KIT_REF` (currently `main`), overlays each `forum-config/deploy/*.wrangler.toml` onto the matching kit crate, then builds and deploys. Guard: `if: github.repository == 'DreamLab-AI/dreamlab-ai-website'`

```mermaid
flowchart LR
    PUSH[Push to main<br/>crates/ changed] --> SETUP[Install Rust toolchain<br/>+ wasm32-unknown-unknown<br/>+ worker-build]

    SETUP --> RUST_BUILD

    subgraph RUST_BUILD [Parallel Rust Builds]
        direction TB
        AUTH_BUILD[worker-build --release<br/>auth-worker]
        POD_BUILD[worker-build --release<br/>pod-worker]
        PREVIEW_BUILD[worker-build --release<br/>preview-worker]
        RELAY_BUILD[worker-build --release<br/>relay-worker]
        SEARCH_BUILD[worker-build --release<br/>search-worker]
    end

    RUST_BUILD --> DEPLOY_ALL

    subgraph DEPLOY_ALL [Deploy All Workers]
        direction TB
        DEPLOY_AUTH[wrangler deploy<br/>dreamlab-auth-api]
        DEPLOY_POD[wrangler deploy<br/>dreamlab-pod-api]
        DEPLOY_PREVIEW[wrangler deploy<br/>dreamlab-link-preview]
        DEPLOY_RELAY[wrangler deploy<br/>dreamlab-nostr-relay]
        DEPLOY_SEARCH[wrangler deploy<br/>dreamlab-search-api]
    end
```

---

## Static Sites

### React Main Site

| Property | Value |
|----------|-------|
| Source | `src/` (React 18 + Vite + TypeScript) |
| Build command | `npm run build` |
| Output | `dist/` |
| Deploy target | `gh-pages` branch |
| Domain | `dreamlab-ai.com` |
| CNAME | `public/CNAME` |

### Leptos Forum Client

| Property | Value |
|----------|-------|
| Source | `nostr-rust-forum` kit (cloned at build time), overlaid with `forum-config/` |
| Build command | `trunk build --release` |
| Optimization | `wasm-opt -Oz` (target: <2 MB gzipped) |
| Output | Copied to `dist/community/` |
| Route | All `/community/*` paths serve the Leptos SPA |

---

## Cloudflare Workers

### Rust Workers (5 services)

All workers are Rust, compiled to `wasm32-unknown-unknown` via `worker-build --release` and packaged as Workers-compatible ES modules. Source lives upstream in the `nostr-rust-forum` kit; this repo overlays per-worker `wrangler.toml` from `forum-config/deploy/`.

| Worker | Kit crate | Storage | Subdomain |
|--------|-----------|---------|-----------|
| auth-worker | `nostr-bbs-auth-worker` | D1 + KV + R2 | `api.dreamlab-ai.com` |
| pod-worker | `nostr-bbs-pod-worker` | R2 + KV | `pods.dreamlab-ai.com` |
| preview-worker | `nostr-bbs-preview-worker` | Cache API | `preview.dreamlab-ai.com` |
| relay-worker | `nostr-bbs-relay-worker` | D1 + Durable Objects | `relay.dreamlab-ai.com` |
| search-worker | `nostr-bbs-search-worker` | R2 + KV | `search.dreamlab-ai.com` |

---

## Environments

### Production

| Property | Value |
|----------|-------|
| Domain | `dreamlab-ai.com` |
| Workers subdomains | `api.`, `pods.`, `search.`, `preview.`, `relay.` |
| GitHub Pages branch | `gh-pages` |
| TLS | Cloudflare-managed (edge + origin) |

### Development

| Service | Command | URL |
|---------|---------|-----|
| React main site | `npm run dev` | `http://localhost:5173` |
| Leptos forum | `trunk serve` | `http://localhost:8080` |
| Any Worker (local) | `wrangler dev` | `http://localhost:8787` (default) |
| Relay (local) | `wrangler dev --local --persist` | Local with persisted D1 state |

Local Workers use `wrangler dev` which simulates D1, KV, R2, and Durable Objects locally.

---

## Required Secrets

### GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy (Scripts:Edit, D1:Edit, KV:Edit, R2:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

### Worker Secrets (set via `wrangler secret put`)

| Secret | Workers | Value |
|--------|---------|-------|
| `RP_ID` | auth-worker | `dreamlab-ai.com` |
| `RP_NAME` | auth-worker | `DreamLab AI` |
| `EXPECTED_ORIGIN` | auth-worker, pod-worker | `https://dreamlab-ai.com` |
| `POD_BASE_URL` | auth-worker, pod-worker | `https://pods.dreamlab-ai.com` |
| `ADMIN_PUBKEYS` | auth-worker, relay-worker | Comma-separated admin hex pubkeys |
| `ALLOWED_ORIGIN` | relay-worker, search-worker | `https://dreamlab-ai.com` |
| `NATIVE_POD_URL` | auth-worker | `https://pods-native.dreamlab-ai.com` (native pod tier; only when `[native_pod]` enabled) |
| `NATIVE_POD_ADMIN_KEY` | auth-worker | PSK matching the native server's `SOLID_ADMIN_KEY` for `/_admin/provision` |

`NATIVE_POD_URL` is also consumed at WASM compile time (`option_env!`) so the native pod UI compiles out when absent. The [`set-worker-secrets.yml`](../../.github/workflows/set-worker-secrets.yml) workflow pushes both values to the CF Worker in one shot. Full runbook: [Native Pod Mesh](NATIVE_POD_MESH.md).

---

## DNS Records

All DNS records are managed in the Cloudflare `dreamlab-ai.com` zone.

| Subdomain | Type | Target | Proxied |
|-----------|------|--------|---------|
| `dreamlab-ai.com` | CNAME | `dreamlab-ai.github.io` | No (GitHub Pages) |
| `api.dreamlab-ai.com` | CNAME | auth-worker route | Yes |
| `pods.dreamlab-ai.com` | CNAME | pod-worker route | Yes |
| `search.dreamlab-ai.com` | CNAME | search-worker route | Yes |
| `preview.dreamlab-ai.com` | CNAME | preview-worker route | Yes |
| `relay.dreamlab-ai.com` | CNAME | relay-worker route | Yes |

---

## Feature Flags

Operator feature flags in `forum-config/dreamlab.toml` under `[features]` control which capabilities are active. The relay and forum client respect these flags at startup.

| Flag | Purpose | Default |
|------|---------|---------|
| `marketplace` | NIP-90 agent job marketplace | `true` |
| `calendar` | NIP-52 calendar events | `true` |
| `dms` | NIP-59 encrypted direct messages | `true` |
| `governance` | Agent Control Surface dashboard (`/governance`, kinds 31400-31405) | `true` |

The `governance` flag additionally requires configuration in the `[governance]` section of `dreamlab.toml` -- see [forum-config/README.md](../../forum-config/README.md#governance-configuration) for the full schema (route, relay URL, agent pubkey allowlist).

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Cloudflare Workers](CLOUDFLARE_WORKERS.md) | Build pipeline, resource bindings, secrets |
| [Native Pod Mesh](NATIVE_POD_MESH.md) | CF Tunnel to agentbox `solid-pod-rs`, native pod provisioning |
| [Forum Config](../../forum-config/README.md) | Operator overlay, feature flags, governance config |
| [Auth API](../api/AUTH_API.md) | WebAuthn + NIP-98 endpoints |
| [Pod API](../api/POD_API.md) | Solid pod storage |
| [Nostr Relay](../api/NOSTR_RELAY.md) | WebSocket relay |
| [Search API](../api/SEARCH_API.md) | RVF WASM vector search |
| [Security Overview](../security/SECURITY_OVERVIEW.md) | Threat model, CORS, input validation |
