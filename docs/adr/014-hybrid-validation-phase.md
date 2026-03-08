# ADR-014: Hybrid Validation Phase Before Full Leptos Rewrite

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |

## Context

No production Rust/WASM Nostr client exists anywhere. The closest analog is
Gossip (851 stars), which is a desktop-only GTK application that does not compile
to WASM. DreamLab's forum port would be the first production browser-based Nostr
client written in Rust.

This creates a fundamental risk: committing 16 weeks of engineering effort to a
full Leptos rewrite without validating that Rust WASM crypto actually performs
better than the current JavaScript implementation in real production conditions.

The current SvelteKit forum already has a working crypto pathway:
- `crypto.worker.ts` handles NIP-44 encrypt/decrypt in a Web Worker
- `passkey.ts` performs HKDF key derivation via `crypto.subtle`
- `nip98-client.ts` creates Schnorr-signed HTTP auth tokens

These operations account for the majority of measurable performance bottlenecks
(2-5ms per NIP-44 operation, GC pressure from Uint8Array copies, main-thread
blocking on key derivation).

The research survey identified a viable hybrid approach: compile the `nostr-core`
Rust crate to WASM with `wasm-bindgen` JS bindings, and drop it into the existing
SvelteKit application as a replacement for `crypto.worker.ts`. This validates the
core performance hypothesis without rewriting the UI.

## Decision

Implement an explicit hybrid validation phase (Phase 1 in the PRD, Weeks 3-4)
where Rust WASM crypto runs inside the existing SvelteKit forum. The full Leptos
rewrite only proceeds after a Go/No-Go gate based on measured results.

### Phase 1 Deliverables

1. **WASM bridge package**: Compile `nostr-core` to `@dreamlab/nostr-core-wasm`
   npm package using `wasm-bindgen`. Expose three functions: `nip44_encrypt`,
   `nip44_decrypt`, `sign_nip98_token`.

2. **SvelteKit integration**: Replace `crypto.worker.ts` with direct WASM calls
   from the main thread. Rust WASM runs in linear memory without GC, so the Web
   Worker indirection is unnecessary.

3. **Benchmark comparison**: Measure JS vs WASM performance for NIP-44
   encrypt/decrypt, Schnorr signing, and HKDF key derivation using the same test
   vectors and payloads.

4. **Canary deployment**: Route 10% of production traffic through the
   WASM-enabled SvelteKit build. Monitor error rates, latency percentiles, and
   memory usage.

### Go/No-Go Gate

| Condition                            | Go          | No-Go       |
|--------------------------------------|-------------|-------------|
| NIP-44 encrypt/decrypt speedup       | >3x         | <2x         |
| Error rate (10% canary, 48h)         | <0.1%       | >0.5%       |
| Schnorr sign speedup                 | >5x         | <2x         |
| WASM load failure rate               | <0.01%      | >0.1%       |
| Memory regression                    | <10% increase | >30% increase |

**If Go**: Proceed to Phase 2 (Workers port) and Phase 3 (Leptos client).

**If No-Go**: Keep SvelteKit with WASM crypto bridge as final architecture.
This still delivers a meaningful performance improvement without the risk of
a full rewrite. The `nostr-core` crate remains useful for Workers ports.

## Consequences

### Positive

- **Risk mitigation**: The most expensive risk (full rewrite fails to deliver
  performance gains) is eliminated before committing to Phases 2-5.
- **Immediate production value**: Even if the No-Go gate triggers, the WASM
  crypto bridge delivers 3-10x speedup for NIP-44 operations in the existing
  SvelteKit forum.
- **Incremental confidence**: Measured benchmarks replace assumptions. The team
  can make data-driven decisions about the full rewrite.
- **Reusable artifact**: The `@dreamlab/nostr-core-wasm` npm package can be
  published and used by other Nostr clients, regardless of whether DreamLab
  proceeds to Leptos.
- **Early bug discovery**: WASM compilation surfaces cross-platform issues
  (like the `getrandom` js feature requirement) in a controlled context.

### Negative

- **2-week delay**: The hybrid phase adds ~2 weeks before the Leptos rewrite
  begins. However, this time would otherwise be spent debugging WASM issues
  during the more complex Phase 3.
- **Throwaway integration code**: The SvelteKit-to-WASM bridge code
  (`@dreamlab/nostr-core-wasm` JS bindings, import statements in Svelte
  components) is discarded when SvelteKit is replaced by Leptos.
- **Two deployment targets**: During Phase 1, both the standard SvelteKit
  build and the WASM-enhanced build must be maintained in CI.

### Neutral

- **No UI changes**: Phase 1 changes only the crypto implementation path.
  Users see no visual difference. The forum UI, routing, and state management
  remain SvelteKit throughout this phase.
- **Worker ports unblocked**: Phase 2 (Workers port) can begin in parallel
  with Phase 1's canary period since the `nostr-core` crate is already built
  in Phase 0.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0, Section 6 Phase 1](../prd-rust-port.md)
- [Gossip client](https://github.com/mikedilger/gossip) (851 stars, desktop-only)
- [wasm-bindgen guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- ADR-013: Rust/Leptos Forum Framework
