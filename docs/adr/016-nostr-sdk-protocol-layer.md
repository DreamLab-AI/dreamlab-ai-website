# ADR-016: nostr-sdk 0.44.x as Nostr Protocol Layer

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |
| Replaces  | NDK 2.13 (TypeScript)          |

## Context

The DreamLab community forum currently uses NDK (Nostr Dev Kit) 2.13 as its Nostr
protocol layer. NDK is a TypeScript library with 1,500+ stars and broad ecosystem
adoption. However, the current codebase has three NDK singletons (`ndk.ts`,
`relay.ts`, and inline instantiation) with divergent relay sets, and the relay
connection module is 800+ lines of hand-written reconnect, timeout, and NIP-42
AUTH logic.

For the Rust port, two Nostr protocol crates were evaluated:

### Crate Comparison

| Criterion              | nostr-sdk 0.44.x (rust-nostr) | nostr-rs (deprecated) |
|------------------------|-------------------------------|----------------------|
| GitHub stars           | 605                           | ~200                 |
| NIP support            | 50+ NIPs                      | ~15 NIPs             |
| WASM support           | Native (wasm32-unknown-unknown target) | Partial     |
| Relay pool             | Built-in RelayPool with backoff | Manual              |
| NIP-42 AUTH            | Built-in                      | Not implemented      |
| NIP-44 encryption      | Built-in                      | Not implemented      |
| Event builder          | Type-safe EventBuilder        | Raw JSON             |
| Key management         | Keys struct + signer traits    | Manual               |
| Maintenance            | Active (Yuki Kishimoto)       | Abandoned            |
| Status                 | ALPHA (0.44.x)                | Archived             |

There is no other viable Rust Nostr SDK. The `nostr-sdk` crate from the rust-nostr
monorepo is the only option with sufficient NIP coverage and WASM support.

### ALPHA State Assessment

The 0.44.x line is explicitly marked alpha by the maintainer. Concrete implications:

1. **API churn**: Method signatures may change between 0.44.0 and 0.44.x patch
   releases. The `EventBuilder` API changed twice between 0.42 and 0.44.
2. **Breaking releases**: Minor version bumps (0.44 -> 0.45) will likely contain
   breaking changes until 1.0.
3. **Documentation gaps**: Some NIPs are implemented but not documented in the
   crate-level docs. The examples directory is the primary reference.
4. **Production users**: Despite alpha status, the crate is used by several
   projects including Gossip (851 stars, desktop) and various relay implementations.

### Shared Crate Architecture

A key architectural benefit: the `nostr-core` workspace crate can use `nostr`
(the protocol types crate, separate from `nostr-sdk`) for event types, key types,
and NIP implementations. This crate compiles for both `wasm32-unknown-unknown`
(client) and native (Workers via `worker-build`) targets. The forum-client crate
uses the full `nostr-sdk` (which includes RelayPool, subscriptions, etc.), while
Workers use only the lightweight `nostr` types crate.

## Decision

Use `nostr-sdk` 0.44.x from the rust-nostr monorepo as the Nostr protocol layer
for the DreamLab forum Rust port. Pin exact versions in `Cargo.lock` to guard
against alpha-stage API changes.

### Crate Usage by Workspace Member

| Crate          | Uses `nostr` (types) | Uses `nostr-sdk` (full) | Rationale |
|----------------|---------------------|------------------------|-----------|
| nostr-core     | Yes                 | No                     | Shared types, NIP-44, NIP-98, keys |
| forum-client   | Yes (via nostr-core)| Yes                    | RelayPool, subscriptions, event stream |
| auth-worker    | Yes (via nostr-core)| No                     | NIP-98 verification only |
| pod-worker     | No                  | No                     | No Nostr protocol interaction |
| preview-worker | No                  | No                     | No Nostr protocol interaction |

### Migration Mapping (NDK -> nostr-sdk)

| NDK Concept           | nostr-sdk Equivalent              |
|-----------------------|-----------------------------------|
| `NDKEvent`            | `nostr::Event` (owned) or `EventBuilder` |
| `NDKRelay` + custom reconnect | `RelayPool` with built-in backoff |
| `NDKSubscription`     | `Filter` + `pool.subscribe()`     |
| `NDKSigner` (NIP-07)  | `NostrSigner` trait               |
| `ndk.fetchEvents()`  | `pool.get_events_of(filters)`     |
| `ndk.publish(event)` | `pool.send_event(event)`          |
| Manual NIP-42 AUTH    | Automatic (built into RelayPool)  |

### Mitigation for ALPHA Risk

1. **Wrapper traits**: Define `NostrClient` and `EventSigner` traits in
   `nostr-core` that abstract over `nostr-sdk` APIs. If a breaking change lands,
   only the trait implementations need updating.
2. **Pin Cargo.lock**: Exact version pinning prevents unexpected upgrades.
   Dependabot PRs for nostr-sdk are reviewed manually, not auto-merged.
3. **Upstream engagement**: File issues and contribute fixes for bugs encountered
   during integration. The maintainer (Yuki Kishimoto) is responsive.
4. **Fallback path**: If nostr-sdk becomes unmaintained, the `nostr` types crate
   (lower-level, more stable) can be used directly with custom relay management.

## Consequences

### Positive

- **800 lines eliminated**: The custom relay.ts reconnect/timeout/AUTH logic is
  replaced by `nostr-sdk`'s built-in `RelayPool` with configurable backoff,
  automatic NIP-42 AUTH, and connection health monitoring.
- **50+ NIPs out of the box**: NIP-01, NIP-04, NIP-44, NIP-42, NIP-98, and
  dozens more are implemented and tested in the crate.
- **Type-safe events**: `EventBuilder` enforces correct tag structures at
  compile time, eliminating the `as ChannelSection` cast pattern.
- **Shared protocol code**: `nostr-core` uses the same `nostr::Event` type in
  both browser WASM and Workers, eliminating serialization mismatches.
- **WASM-native**: The crate compiles to `wasm32-unknown-unknown` without
  feature-flag gymnastics. Browser examples exist in the repo.
- **Single NDK instance**: Replaces 3 divergent NDK singletons with one
  `RelayPool` configuration.

### Negative

- **ALPHA stability risk**: API changes between minor versions could require
  code updates. Wrapper traits mitigate but do not eliminate this cost.
- **Documentation gaps**: Some NIP implementations lack crate-level docs.
  The examples directory and source code are the primary references.
- **No NIP-07 browser extension**: `nostr-sdk` does not natively bridge to
  NIP-07 browser extensions (nos2x, Alby). A custom `web-sys` binding to
  `window.nostr` is required for NIP-07 signer support.
- **Smaller community**: 605 stars vs NDK's 1,500+. Fewer Stack Overflow
  answers and community examples for troubleshooting.

### Neutral

- **Version pinning is standard practice**: Pinning exact versions in
  Cargo.lock is normal Rust workflow, not specific to alpha crates.
- **Relay stays TypeScript**: The nostr-relay Worker (ADR-015) continues
  using its own NIP-01 implementation. It does not use nostr-sdk.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0, Section 4.1](../prd-rust-port.md)
- [rust-nostr/nostr](https://github.com/rust-nostr/nostr) (605 stars)
- [nostr-sdk WASM examples](https://github.com/rust-nostr/nostr/tree/master/crates/nostr-sdk/examples)
- [Gossip client](https://github.com/mikedilger/gossip) (851 stars, uses nostr crate)
- ADR-013: Rust/Leptos Forum Framework
