# Bounded Contexts

This document maps each bounded context to a Rust crate (or existing TypeScript
Worker) and defines the responsibilities, public interfaces, and dependencies
between contexts.

## Context Map

```
                          +-----------------+
                          |   nostr-core    |  (shared library crate)
                          |  events, crypto |
                          |  NIP-44, NIP-98 |
                          +--------+--------+
                                   |
                  +----------------+----------------+
                  |                |                 |
          +-------v------+  +-----v-------+  +------v-------+
          | forum-client  |  | auth-worker |  | pod-worker   |
          | (Leptos WASM) |  | (CF Worker) |  | (CF Worker)  |
          +---------+-----+  +------+------+  +------+-------+
                    |               |                |
                    |        +------v------+         |
                    |        | preview-    |         |
                    |        | worker      |         |
                    |        +-------------+         |
                    |                                 |
          +---------v---------------------------------v------+
          |       TypeScript Workers (unchanged)             |
          |  nostr-relay (D1+DO+WS)  |  search-api (RVF)    |
          +--------------------------------------------------+
```

## 1. Nostr Core Context -- `nostr-core` crate

**Responsibility**: Protocol primitives shared between client and Workers. Zero
browser or Worker runtime dependencies.

**Compilation targets**: `wasm32-unknown-unknown` + native (for tests/CI).

```rust
// Public modules
pub mod event;      // NostrEvent, EventId, Tag, canonical JSON serialization
pub mod keys;       // NostrKeypair, PublicKey, derive_from_prf(), HKDF
pub mod nip01;      // REQ/CLOSE/EVENT message framing
pub mod nip44;      // ChaCha20-Poly1305 encrypt/decrypt, key derivation
pub mod nip98;      // Token creation and verification (kind 27235)
pub mod kinds;      // EventKind enum with all 12+ forum event kinds
pub mod validation; // Event ID recomputation, signature verification, tag checks
pub mod types;      // Timestamp, Signature, CohortType, ZoneType, value objects
```

**Key dependencies**: `k256`, `chacha20poly1305`, `hkdf`, `sha2`, `serde`,
`serde_json`, `getrandom` (with `js` feature).

**Anti-corruption layer**: Wraps `nostr-sdk` types where the 0.44.x alpha API is
unstable, exposing stable DreamLab-specific types to downstream crates.

## 2. Forum Client Context -- `forum-client` crate

**Responsibility**: The browser-side Leptos CSR application. Owns UI components,
reactive stores, routing, relay connections, and IndexedDB persistence.

**Compilation target**: `wasm32-unknown-unknown` only (via `trunk`).

```rust
// Public modules
pub mod app;        // Root Leptos component + router (14 routes)
pub mod pages;      // Route page components
pub mod components; // 102 UI components (Tailwind + DaisyUI)
pub mod stores;     // 32 reactive signal groups (auth, channels, messages, DMs, etc.)
pub mod nostr;      // Relay pool management, subscription lifecycle, event pipeline
pub mod auth;       // Passkey ceremony (web-sys), NIP-98, session management
pub mod search;     // ONNX embedder bridge, IndexedDB cache, RuVector client
pub mod config;     // Environment, zone definitions, BBS config types
```

**Key dependencies**: `nostr-core`, `leptos`, `leptos_router`, `nostr-sdk`
(WASM), `indexed-db`, `comrak`, `web-sys`, `gloo`.

**Upstream communication**: Connects to the nostr-relay (TypeScript) via
WebSocket. Calls auth-worker, pod-worker, preview-worker, and search-api via
HTTP with NIP-98 auth.

## 3. Identity and Auth Context -- `auth-worker` crate

**Responsibility**: WebAuthn registration/authentication with PRF extension,
NIP-98 token verification, Solid pod provisioning, credential storage.

**Runtime**: Cloudflare Worker (compiled via `worker-build`).

```rust
// Public modules
pub mod routes;       // HTTP handler: /auth/register/*, /auth/login/*, /auth/lookup
pub mod webauthn;     // passkey-rs ceremony handling, PRF salt management
pub mod nip98;        // Server-side NIP-98 verification (reuses nostr-core)
pub mod pod;          // Pod provisioning: R2 profile card + KV ACL + KV metadata
pub mod challenge;    // Challenge generation, D1 storage, expiry cleanup
pub mod credential;   // D1 CRUD for webauthn_credentials table
```

**Storage**: D1 (challenges, webauthn_credentials), KV (SESSIONS, POD_META), R2
(PODS -- profile card seed).

**Key dependencies**: `nostr-core`, `worker`, `passkey`, `serde`.

**Invariants**:
- PRF salt is generated server-side and stored with the credential.
- The Nostr pubkey is derived client-side from the PRF output; the server never
  sees the private key.
- Login verification requires both a valid WebAuthn assertion AND a valid NIP-98
  token proving private key control.

## 4. Storage Context -- `pod-worker` crate

**Responsibility**: Per-user Solid pod CRUD backed by R2, with WAC
(Web Access Control) ACL enforcement. Media upload/download, content-type
handling.

**Runtime**: Cloudflare Worker.

```rust
// Public modules
pub mod routes;  // HTTP handler: /pods/{pubkey}/**, /health
pub mod acl;     // WAC ACL evaluation: agent matching, mode checking, path scoping
pub mod r2;      // R2 get/put/delete/head operations, content-type mapping
pub mod nip98;   // NIP-98 verification for authenticated requests (reuses nostr-core)
```

**Storage**: R2 (PODS), KV (POD_META for ACL documents and metadata).

**Access rules**:
- Owner (`did:nostr:{pubkey}`) has Read + Write + Control on `./`.
- Public agents (`foaf:Agent`) have Read on `./profile/` and `./media/public/`.
- All write operations require NIP-98 auth with matching pubkey.

## 5. Preview Context -- `preview-worker` crate

**Responsibility**: Fetch OpenGraph metadata and Twitter oEmbed data for link
previews, with SSRF protection and CF Cache API caching.

**Runtime**: Cloudflare Worker.

```rust
// Public modules
pub mod routes;    // HTTP handler: /preview?url=..., /health, /stats
pub mod og;        // HTML parsing for og:title, og:description, og:image (scraper crate)
pub mod twitter;   // Twitter/X oEmbed API client
pub mod ssrf;      // Private IP/hostname blocking (IPv4, IPv6, cloud metadata)
pub mod cache;     // CF Cache API read/write with TTL (10d OG, 1d Twitter)
```

**Storage**: CF Cache API only (no D1/KV/R2).

**Key dependencies**: `worker`, `scraper`, `serde`.

## 6. Relay Context -- stays TypeScript

**Location**: `workers/nostr-relay/` (unchanged).

**Why not ported**: The `worker` crate (0.7.5) does not expose WebSocket
Hibernation handler methods (`webSocketMessage`, `webSocketClose`,
`webSocketError`). Without hibernation, each idle WebSocket connection pins a
Durable Object in memory, making the cost prohibitive at scale.

**Interfaces consumed by other contexts**:
- WebSocket: NIP-01 REQ/CLOSE/EVENT, NIP-42 AUTH
- HTTP: `/api/check-whitelist?pubkey=`, admin endpoints

## 7. Search Context -- stays TypeScript

**Location**: `workers/search-api/` (unchanged).

**Why not ported**: The RVF (RuVector Format) core is already Rust compiled to
WASM. The TypeScript wrapper is 430 lines of R2/KV orchestration with 0.47ms p50
latency. Porting the thin wrapper gains nothing; eliminating WASM-in-WASM would
require restructuring `rvf_wasm` as a library crate -- disproportionate effort.

**Interfaces consumed by other contexts**:
- HTTP: `/search?q=`, `/embed` (vector embedding endpoint)

## Context Dependencies

| Consumer | Provider | Mechanism |
|----------|----------|-----------|
| forum-client | nostr-core | Cargo dependency (same WASM binary) |
| auth-worker | nostr-core | Cargo dependency (compiled into Worker) |
| pod-worker | nostr-core | Cargo dependency (NIP-98 verification) |
| forum-client | auth-worker | HTTP + NIP-98 |
| forum-client | pod-worker | HTTP + NIP-98 |
| forum-client | preview-worker | HTTP (no auth) |
| forum-client | nostr-relay (TS) | WebSocket (NIP-01/42) |
| forum-client | search-api (TS) | HTTP |
| auth-worker | pod-worker | Internal (pod provisioning at registration) |
