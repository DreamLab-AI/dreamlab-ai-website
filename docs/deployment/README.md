# Deployment Overview — DreamLab AI

## Architecture

```
dreamlab-ai.com
  ├── /              React main site (GitHub Pages)
  ├── /community/    Leptos forum client (GitHub Pages, WASM)
  └── Workers:
      ├── api.       auth-worker      (Rust WASM)
      ├── pods.      pod-worker       (Rust WASM)
      ├── preview.   preview-worker   (Rust WASM)
      ├── relay.     nostr-relay      (TypeScript)
      └── search.    search-api       (TypeScript)
```

## Static Sites (GitHub Pages)

### React Main Site

- **Source**: `src/` (React 18 + Vite + TypeScript)
- **Build**: `npm run build` -> `dist/`
- **Deploy**: GitHub Actions pushes `dist/` to `gh-pages` branch
- **Domain**: `dreamlab-ai.com` (CNAME in `public/CNAME`)

### Leptos Forum Client

- **Source**: `community-forum-rs/crates/forum-client/`
- **Build**: `trunk build --release` -> produces WASM + HTML + JS loader
- **Optimization**: `wasm-opt -Oz` reduces binary size (target: <2MB gzipped)
- **Deploy**: Output copied to `dist/community/` before GitHub Pages push
- **Route**: All `/community/*` paths serve the Leptos SPA

## Cloudflare Workers

### Rust Workers (3 services)

Built with `worker-build --release` which compiles Rust to `wasm32-unknown-unknown`
and packages it as a Workers-compatible module.

| Worker | Crate | Storage | Build Command |
|--------|-------|---------|---------------|
| auth-worker | `crates/auth-worker` | D1 + KV + R2 | `cd crates/auth-worker && worker-build --release` |
| pod-worker | `crates/pod-worker` | R2 + KV | `cd crates/pod-worker && worker-build --release` |
| preview-worker | `crates/preview-worker` | Cache API | `cd crates/preview-worker && worker-build --release` |

### TypeScript Workers (2 services)

Built and deployed directly with `wrangler`.

| Worker | Source | Storage | Build Command |
|--------|--------|---------|---------------|
| nostr-relay | `workers/nostr-relay/` | D1 + Durable Objects | `wrangler deploy` |
| search-api | `workers/search-api/` | R2 + KV + WASM | `wrangler deploy` |

## CI/CD: GitHub Actions

### deploy.yml — Static Sites

Triggers on push to `main`. Steps:
1. `npm ci && npm run build` (React main site)
2. `trunk build --release` (Leptos forum client)
3. `wasm-opt -Oz` on forum WASM binary
4. Copy forum output to `dist/community/`
5. Push `dist/` to `gh-pages` branch

Guard: `if: github.repository == 'DreamLab-AI/dreamlab-ai-website'`

### workers-deploy.yml — Cloudflare Workers

Triggers on push to `main` when files in `workers/` or `crates/` change. Steps:
1. Install Rust toolchain + `wasm32-unknown-unknown` target + `worker-build`
2. Build 3 Rust Workers in parallel
3. Deploy all 5 Workers via `wrangler`

Guard: `if: github.repository == 'DreamLab-AI/dreamlab-ai-website'`

## Environments

### Production

- **Domain**: `dreamlab-ai.com`
- **Workers subdomains**: `api.`, `pods.`, `search.`, `preview.` + relay WebSocket
- **GitHub Pages branch**: `gh-pages`

### Development

- **React dev**: `npm run dev` -> `http://localhost:5173`
- **Leptos dev**: `trunk serve` -> `http://localhost:8080`
- **Workers local**: `wrangler dev` per worker (uses local D1/KV/R2 simulators)
- **Relay local**: `wrangler dev --local` with `--persist` for D1 state

## Required Secrets (GitHub)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy (Scripts:Edit, D1:Edit, KV:Edit, R2:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

## DNS Records

| Subdomain | Type | Target |
|-----------|------|--------|
| `api.dreamlab-ai.com` | CNAME | auth-worker route |
| `pods.dreamlab-ai.com` | CNAME | pod-worker route |
| `search.dreamlab-ai.com` | CNAME | search-api route |
| `preview.dreamlab-ai.com` | CNAME | preview-worker route |
