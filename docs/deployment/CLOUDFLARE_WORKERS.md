# Cloudflare Workers Deployment

## Rust Workers Build

Each Rust crate compiles to `wasm32-unknown-unknown` via `worker-build`:

```bash
cd crates/auth-worker && worker-build --release
cd crates/pod-worker && worker-build --release
cd crates/preview-worker && worker-build --release
```

Output lands in `build/worker/`. Wrangler deploys from the generated `shim.mjs`.

## TypeScript Workers Build

```bash
cd workers/nostr-relay && wrangler deploy
cd workers/search-api && wrangler deploy
```

## Wrangler Configuration (Rust Worker Example)

```toml
name = "dreamlab-auth-api"
main = "build/worker/shim.mjs"
compatibility_date = "2024-09-23"
[build]
command = "worker-build --release"
```

## Required Cloudflare Resources

### D1 Databases

| Database | Worker | Tables |
|----------|--------|--------|
| `dreamlab-auth` | auth-worker | `webauthn_credentials`, `challenges` |
| `dreamlab-relay` | nostr-relay | `events`, `whitelist` |

### KV Namespaces

| Namespace | Worker | Purpose |
|-----------|--------|---------|
| `SESSIONS` | auth-worker | Session tokens |
| `POD_META` | auth-worker, pod-worker | Pod ACLs + metadata |
| `SEARCH_CONFIG` | search-api | Vector id-label mapping |

### R2 Buckets

| Bucket | Worker | Content |
|--------|--------|---------|
| `dreamlab-pods` | auth-worker, pod-worker | User pod files |
| `dreamlab-vectors` | search-api | .rvf vector stores |

### Durable Objects

`NostrRelayDO` in nostr-relay — WebSocket connection management with Hibernation.

## Secrets

```bash
echo "dreamlab-ai.com" | wrangler secret put RP_ID --name dreamlab-auth-api
echo "https://dreamlab-ai.com" | wrangler secret put EXPECTED_ORIGIN --name dreamlab-auth-api
echo "<admin-pubkey>" | wrangler secret put ADMIN_PUBKEYS --name dreamlab-nostr-relay
```

## DNS Routes

| Subdomain | Worker |
|-----------|--------|
| `api.dreamlab-ai.com` | dreamlab-auth-api |
| `pods.dreamlab-ai.com` | dreamlab-pod-api |
| `search.dreamlab-ai.com` | dreamlab-search-api |
| `preview.dreamlab-ai.com` | dreamlab-link-preview |

## Cron Keep-Warm

All Workers run `*/5 * * * *` cron. auth-worker and nostr-relay ping D1.
search-api loads the WASM store from R2. Others rely on the trigger itself.

## WASM Size Limits

Paid plan allows 10MB compressed WASM per Worker. Monitor binary size and apply
`wasm-opt -Oz` if any Worker exceeds 5MB.

## GitHub Actions Secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy (Scripts:Edit, D1:Edit, KV:Edit, R2:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
