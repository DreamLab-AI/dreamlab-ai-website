# ADR-015: Selective Workers Port Strategy (3 Rust, 2 TypeScript)

> **Status Update (2026-03-12):** This ADR's "3 Rust, 2 TypeScript" decision has been superseded. **All 5 workers are now Rust** in `community-forum-rs/crates/` (auth-worker, pod-worker, preview-worker, relay-worker, search-worker). The relay-worker uses `accept_websocket_with_tags()` for DO Hibernation. The search-worker uses `rvf-types` natively. All TypeScript workers (`workers/*-api/`) have been deleted. The `workers/` directory no longer exists.

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |

## Context

DreamLab runs 5 Cloudflare Workers, each handling a distinct backend concern:

| Worker          | TS Lines | Storage           | Key Dependency                  |
|-----------------|----------|-------------------|---------------------------------|
| auth-api        | 600      | D1 + KV + R2      | WebAuthn + NIP-98 + pod provisioning |
| pod-api         | 350      | R2 + KV            | Solid pods + WAC ACL            |
| link-preview-api| 200      | Cache API          | OG metadata + SSRF protection   |
| nostr-relay-api | 430+420  | D1 + DO + WebSocket| NIP-01/42/98 + WebSocket Hibernation |
| search-api      | 430      | R2 + KV            | RVF WASM + ONNX embeddings      |

The initial PRD v1.0.0 proposed porting all 5 Workers to Rust. The 4-agent crate
ecosystem survey identified two confirmed technical blockers that make a full port
impractical.

### Blocker 1: WebSocket Hibernation API (nostr-relay)

The Cloudflare Workers WebSocket Hibernation API allows Durable Objects to release
memory between WebSocket messages. The relay Worker depends on this:

```typescript
// Current TS implementation - works
async webSocketMessage(ws: WebSocket, message: string) { ... }
async webSocketClose(ws: WebSocket, code: number, reason: string) { ... }
```

The `worker` crate (workers-rs v0.7.5) has basic WebSocket support but does NOT
expose the Hibernation handler methods. Without hibernation, each idle WebSocket
connection pins a Durable Object instance in memory. At 500+ concurrent relay
connections, this becomes cost-prohibitive (estimated 10x DO billing increase).

Issue tracking: [cloudflare/workers-rs#736](https://github.com/cloudflare/workers-rs/issues).
Estimated availability: Q3 2026 based on issue activity.

### Blocker 2: WASM-in-WASM Elimination (search-api)

The search-api architecture:
```
Request -> TS Worker -> WebAssembly.instantiate(rvf_wasm_bg.wasm) -> Rust rvf functions -> Response
```

The RVF core is already Rust, compiled to WASM. The TypeScript wrapper is 430 lines
of R2/KV orchestration. Porting the wrapper to Rust would eliminate the JS-WASM
bridge, but the measured latency is already 0.47ms p50. The ROI of restructuring
`rvf_wasm` as a library crate (rather than standalone WASM module) is too low to
justify the effort.

## Decision

Port 3 Workers to Rust and keep 2 Workers in TypeScript:

| Worker          | Action              | Risk   | Crates                            |
|-----------------|---------------------|--------|-----------------------------------|
| link-preview-api| **Port to Rust**    | LOW    | `worker` 0.7.5, `scraper`, `serde` |
| pod-api         | **Port to Rust**    | LOW    | `worker` 0.7.5, `serde`, R2 bindings |
| auth-api        | **Port to Rust**    | MEDIUM | `worker` 0.7.5, `passkey` 0.3.x, `nostr-core` |
| nostr-relay-api | **Stay TypeScript** | N/A    | WebSocket Hibernation blocker     |
| search-api      | **Stay TypeScript** | N/A    | RVF already Rust WASM; ROI too low |

### Port Order (by ascending risk)

1. **preview-worker** (Week 5): Stateless HTTP fetch + HTML parse. No auth, no
   storage mutations. Uses `scraper` crate for HTML parsing and Cache API for
   response caching. Easy first win to validate the `worker` crate toolchain.

2. **pod-worker** (Week 6): R2 CRUD operations + WAC ACL enforcement. The
   `worker` crate has full R2 bindings (`Bucket::get`, `put`, `delete`, `list`).
   Straightforward data operations with KV metadata.

3. **auth-worker** (Weeks 7-8): Most complex. WebAuthn registration and
   authentication with PRF extension via `passkey-rs`. NIP-98 token verification
   via `nostr-core`. Pod provisioning in R2. D1 queries for credential storage.
   Allocated 2 weeks due to PRF ceremony complexity.

### Deployment Strategy

Each Worker is deployed independently with a TS canary for rollback:

```
Production:  [Rust preview-worker] [Rust pod-worker] [Rust auth-worker]
Canary:      [TS link-preview-api] [TS pod-api]      [TS auth-api]
Unchanged:   [TS nostr-relay-api]  [TS search-api]
```

CI/CD pipeline uses `worker-build` for Rust Workers and `wrangler` for TS Workers,
both in the same `.github/workflows/workers-deploy.yml`.

## Consequences

### Positive

- **Shared nostr-core crate**: auth-worker and forum-client share the same
  `nostr-core` crate for NIP-98, event types, and key operations. No more
  duplicated logic between `workers/shared/nip98.ts` and client code.
- **Compile-time D1 safety**: Rust types replace stringly-typed D1 queries in
  the auth worker. Invalid column names or type mismatches fail at compile time.
- **Reduced attack surface**: Rust Workers eliminate entire categories of
  vulnerabilities (prototype pollution, type coercion bugs, ReDoS in regex).
- **Faster cold starts**: Compiled WASM binary (5-15ms) vs JS parse (10-50ms)
  for the 3 ported Workers.
- **16-week timeline**: Keeping 2 Workers in TS saves ~4 weeks vs the original
  22-week plan, without sacrificing meaningful performance gains.

### Negative

- **Mixed toolchain**: CI/CD must handle both `worker-build` (Rust) and
  `wrangler` (TS). The deploy workflow becomes more complex.
- **Two language maintenance**: Bug fixes or feature additions to nostr-relay or
  search-api still require TypeScript. The team cannot go Rust-only for backend.
- **Auth-worker PRF risk**: The `passkey-rs` crate handles server-side WebAuthn
  verification, but browser-side PRF ceremony requires manual `web-sys` bindings.
  Edge cases in authenticator behavior may surface during integration.

### Neutral

- **Infrastructure unchanged**: All Workers remain on Cloudflare. D1, KV, R2,
  Durable Objects, and Cache API bindings are available in both languages.
- **Nostr relay reassessment**: When workers-rs adds confirmed WebSocket
  Hibernation support (tracked at issue #736), the relay can be ported in a
  future iteration without architectural changes.
- **Search-api performance unchanged**: The 0.47ms p50 latency stays the same
  since the RVF core is already Rust WASM.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0, Section 5](../prd-rust-port.md)
- [workers-rs](https://github.com/cloudflare/workers-rs) (0.7.5, 3,400 stars)
- [cloudflare/workers-rs#736](https://github.com/cloudflare/workers-rs/issues) (Hibernation tracking)
- ADR-010: Return to Cloudflare Platform
- ADR-017: passkey-rs WebAuthn PRF
