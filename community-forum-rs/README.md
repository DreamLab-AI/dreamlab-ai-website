# DreamLab Community Forum

Rust workspace for the DreamLab community forum — all backend workers, the forum client, and the admin CLI.
Migration from SvelteKit/TypeScript completed 2026-03-12; this is now the sole implementation.
**PRD v6.0 hardening + Solid pod upgrade completed 2026-03-16.**
**Obelisk-Polish sprint (moderation + WoT + invites + welcome bot + admin CLI) landed 2026-04-20.**

## Architecture

Eight crates in a Cargo workspace:

| Crate | Type | Purpose |
|-------|------|---------|
| `nostr-core` | Library | Shared Nostr protocol: NIP-01/07/09/29/33/40/42/45/50/52/98, moderation event kinds 30910-30914, key management, event validation, WASM bridge |
| `auth-worker` | CF Worker | WebAuthn register/login (passkey-rs), NIP-98 verification, pod provisioning, rate limiting, moderation/WoT/invites/welcome-bot APIs (D1 + KV + R2) |
| `pod-worker` | CF Worker | **Solid pod storage** — LDP containers, WAC ACL inheritance, JSON Patch (RFC 6902), conditional requests, per-user quotas, WebID profiles, content negotiation, micropayments (HTTP 402), WebFinger, NIP-05, notifications (R2 + KV) |
| `preview-worker` | CF Worker | Link preview with SSRF protection, OG/meta parsing, rate limiting, modular architecture (ssrf/parse/oembed) |
| `relay-worker` | CF Worker | NIP-01 WebSocket relay via Durable Objects, hibernation-safe sessions, ingress mute/ban enforcement via D1-backed mod cache (D1 + DO) |
| `search-worker` | CF Worker | RuVector search, rvf-types binary format, in-memory cosine k-NN, rate limiting (R2 + KV) |
| `forum-client` | Leptos App | Browser client (Leptos 0.7 CSR + Trunk), passkey auth, 18 pages, 58+ components, smart auth UX, admin checklist |
| `admin-cli` | Binary | `forum-admin` — NIP-98 authed HTTP client for headless operators and AI coding agents (whitelist, WoT, invites, moderation, channels) |

## Crate Dependency Graph

```
forum-client
    +-- nostr-core

auth-worker
    +-- nostr-core

relay-worker
    +-- nostr-core

pod-worker
    +-- nostr-core

search-worker
    +-- nostr-core

admin-cli
    +-- nostr-core

preview-worker
    (standalone -- no internal deps)
```

All worker crates depend on the `worker` crate (0.7) for Cloudflare Workers bindings.
`nostr-core` compiles for both native (`x86_64`/`aarch64`) and `wasm32-unknown-unknown`.

## Build

```bash
# Build all crates (native)
cargo build

# Run all workspace tests
cargo test --workspace

# Build and serve the Leptos client (requires Trunk)
cd crates/forum-client && trunk serve
```

### Prerequisites

- Rust stable (see `rust-toolchain.toml`)
- `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Trunk (for forum-client): `cargo install trunk`
- wrangler (for worker deployment): `npm i -g wrangler`

## Test Summary

| Crate | Tests | Coverage |
|-------|-------|----------|
| nostr-core | 154 | NIP-01/07/09/29/33/40/42/45/50/52/98, moderation event kinds 30910-30914, keys, WASM bridge, proptest NIP-98 |
| relay-worker | 24 | Filter building, event matching, broadcast, rate limiting, session recovery, mod-cache mute/ban enforcement |
| auth-worker | 70 | WebAuthn utils, routing, moderation handlers, WoT gating, invite credits, welcome-bot config, schema migrations |
| pod-worker | 97 | LDP containers, WAC ACL, JSON Patch, conditional requests, quotas, WebID, provisioning, content negotiation, payments, notifications, remoteStorage |
| preview-worker | 35 | SSRF protection, OG parsing, oEmbed |
| search-worker | 41 | Vector store CRUD, cosine similarity, RVF serialization, embedding |
| forum-client | 49 | HTML sanitization (XSS), relay URL resolution, auth state, session management |
| admin-cli | 80 | Argument parsing, NIP-98 signing, URL composition, error mapping, dry-run output shape |
| **Total** | **550** | |

## Pod-Worker Features (v6.0)

The pod-worker implements a comprehensive Solid-compatible storage layer:

| Feature | Spec | Description |
|---------|------|-------------|
| LDP Containers | W3C LDP | Container CRUD, `ldp:contains` triples, POST with Slug header |
| WAC ACL | Solid WAC | `.acl` sidecar files, container-tree inheritance, `WAC-Allow` header |
| Conditional Requests | HTTP/1.1 | ETag, `If-Match`, `If-None-Match` (304/412) |
| Range Requests | RFC 7233 | `Range: bytes=...` for streaming media (206 Partial Content) |
| JSON Patch | RFC 6902 | `PATCH` with add/remove/replace, optimistic concurrency via `If-Match` |
| Per-User Quotas | Custom | 50MB default, KV-backed, admin API for adjustment |
| WebID Profiles | Solid WebID | HTML + JSON-LD at `/pods/{pk}/profile/card` |
| Content Negotiation | HTTP/1.1 | Accept header parsing, `Vary: Accept`, JSON-LD native |
| Micropayments | HTTP 402 | Web Ledgers, Bitcoin TXO deposit, per-request satoshi cost |
| WebFinger | RFC 7033 | `/.well-known/webfinger` for remoteStorage + Solid discovery |
| NIP-05 | Nostr NIP-05 | `/.well-known/nostr.json` verification |
| Notifications | Solid Notifications | Webhook subscriptions on resource changes |
| Pod Provisioning | Custom | Default 5-container structure with 6 ACLs on first access |

## Relay-Worker Modules (v6.0)

The relay Durable Object is split into focused modules:

| Module | LOC | Responsibility |
|--------|-----|---------------|
| `relay_do/mod.rs` | ~270 | Struct + DurableObject trait (fetch, websocket_message, close, error, alarm) |
| `relay_do/session.rs` | ~270 | Session management, hibernation recovery with subscription + auth persistence |
| `relay_do/filter.rs` | ~250 | SQL query builder, in-memory filter matching, tag extraction |
| `relay_do/broadcast.rs` | ~110 | Event broadcasting, rate limiting, wire protocol helpers |
| `relay_do/nip_handlers.rs` | ~370 | NIP-01/09/42/45 protocol handlers |
| `relay_do/storage.rs` | ~290 | D1 event storage, whitelist, auto-whitelist (first-user-is-admin) |

## Security (v6.0 Hardening)

- **XSS protection** — `sanitize.rs` module: comrak with `unsafe_=false` + `tagfilter=true` on all `inner_html` sites
- **NIP-98 body verification** — auth-worker reads body before routing, verifies payload hash
- **Rate limiting** — KV-backed sliding window on auth (20/min), preview (30/min), search (100/min)
- **CORS** — env-var-based origins, no localhost in production
- **Privkey protection** — `Clone` removed from passkey result structs, `cfg(wasm32)` on unsafe Send/Sync
- **Hibernation resilience** — subscriptions + auth state persisted to DO transactional storage

## Status

**Obelisk-Polish sprint COMPLETE** (2026-04-20) — moderation data model (Nostr kinds 30910-30914), WoT gating, invite credits with tenure, welcome bot, admin CLI.
**PRD v6.0 COMPLETE** (2026-03-16) — full audit remediation + Solid pod upgrade.

- **8 crates** in the workspace
- **550 tests**, 0 failures
- **All 5 workers** deployed to Cloudflare Workers (runtime: `"workers-rs"`)
- **Dual SPA**: dreamlab-ai.com/community/ serves the Leptos WASM client
- **`forum-admin` CLI** shipping for headless operators + AI coding agents

### Sprint 2026-04 (Obelisk-Polish) deliverables

| WI | Description | Artefacts |
|----|-------------|-----------|
| WI-1 | Admin CLI | `crates/admin-cli/` (new) |
| WI-2 | Moderation data model | `nostr-core/moderation_events.rs`, `auth-worker/moderation.rs`, `relay-worker/relay_do/mod_cache.rs`, migration 002 |
| WI-3 | Web-of-Trust gating | `auth-worker/wot.rs`, `wot_entries` table, registration gate |
| WI-4 | Invite credits | `auth-worker/invites.rs`, `invitations` + `invitation_redemptions` tables, tenure check |
| WI-5 | Welcome bot | `auth-worker/welcome.rs`, age-encrypted nsec, locale resolution |
| WI-6 | UX/UI audit | [`docs/sprint/ux-ui-audit-2026-04.md`](../docs/sprint/ux-ui-audit-2026-04.md) |
| WI-7 | User-journey audit | [`docs/sprint/user-journey-audit-2026-04.md`](../docs/sprint/user-journey-audit-2026-04.md) |
| bonus | Security baseline audit | [`docs/sprint/security-audit-2026-04.md`](../docs/sprint/security-audit-2026-04.md) |

Sprint spec: [`docs/sprint/2026-04-obelisk-polish-sprint.md`](../docs/sprint/2026-04-obelisk-polish-sprint.md).

### PRD History

| PRD | Status | Date |
|-----|--------|------|
| [v2.0](../docs/prd-rust-port.md) | Complete | 2026-03-01 |
| [v2.1](../docs/prd-rust-port-v2.1.md) | Complete | 2026-03-05 |
| [v3.0](../docs/prd-rust-port-v3.0.md) | Superseded by v4.0 | 2026-03-07 |
| [v4.0](../docs/prd-rust-port-v4.0.md) | Complete | 2026-03-09 |
| [v5.0-UX](../docs/prd-ux-onboarding-v5.0.md) | Complete | 2026-03-16 |
| [v6.0](../docs/prd-hardening-solid-v6.0.md) | Complete | 2026-03-16 |
| [Sprint 2026-04 (Obelisk-Polish)](../docs/sprint/2026-04-obelisk-polish-sprint.md) | **Complete** | 2026-04-20 |
