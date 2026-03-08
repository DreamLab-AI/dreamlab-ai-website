# DreamLab Community Forum -- Rust Port

Rust workspace for the DreamLab community forum, porting the SvelteKit forum and
selected Cloudflare Workers to Rust/WASM for performance, type safety, and shared
protocol logic.

## Architecture

Six crates in a Cargo workspace:

| Crate | Type | Purpose |
|-------|------|---------|
| `nostr-core` | Library | Shared Nostr protocol: NIP-01/44/98, key management, event validation, WASM bridge |
| `preview-worker` | CF Worker | Link preview with SSRF protection, OG/meta parsing, Cache API integration |
| `pod-worker` | CF Worker | Solid pod storage on R2 with WAC ACL enforcement and NIP-98 auth |
| `auth-worker` | CF Worker | WebAuthn register/login (passkey-rs), NIP-98 verification, pod provisioning, cron keep-warm |
| `relay-worker` | CF Worker | NIP-01 WebSocket relay via Durable Objects, NIP-11/16/33 support, whitelist API |
| `forum-client` | Leptos App | Browser client (Leptos 0.7 + Trunk), passkey auth, channel browsing |

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
| nostr-core | 73 | NIP-01/44/98, keys, WASM bridge, property tests |
| preview-worker | 35 | SSRF protection, OG parsing, Cache API |
| pod-worker | 22 | R2 CRUD, WAC ACL, NIP-98 auth |
| auth-worker | -- | WebAuthn flows, NIP-98, pod provisioning |
| relay-worker | -- | WebSocket DO relay, NIP-11/16/33 |
| forum-client | -- | In progress (Tranche 4) |
| **Total** | **130** | |

## Current Status

- **Tranches 0-3**: COMPLETE
- **Tranche 4**: IN PROGRESS -- Leptos client (Slice A: auth shell, Slice B: channel browse)
- **Tranche 5**: NOT STARTED
- **Lines of Rust**: ~7,800 across 6 crates

See the full delivery plan: [PRD v2.1](../docs/prd-rust-port-v2.1.md)

## Scope Note

The relay-worker was originally out of scope in the PRD but was ported during
Tranche 3. The Durable Object relay shared enough NIP-01/NIP-98 validation with
nostr-core that porting it was lower effort than maintaining a parallel TypeScript
implementation.
