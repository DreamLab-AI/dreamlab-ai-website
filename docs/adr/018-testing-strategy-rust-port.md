# ADR-018: Testing Strategy for Rust Port

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |

## Context

The current SvelteKit forum uses Vitest for unit tests and Playwright for e2e
tests. The Rust port introduces a fundamentally different testing landscape:

1. **Crypto correctness is critical**: The forum derives Nostr private keys from
   WebAuthn PRF output via HKDF. A single-bit error means users lose their
   identity. Example-based tests are insufficient for crypto code.

2. **WASM compilation target**: Code that passes `cargo test` (native) may fail
   on `wasm32-unknown-unknown`. The `getrandom` crate panics without the `js`
   feature. Browser APIs (`web-sys`) are unavailable in native tests.

3. **Cross-crate boundaries**: `nostr-core` is shared between `forum-client`
   (browser WASM), `auth-worker` (CF Worker WASM), and native test targets.

4. **Performance regression detection**: Performance targets (NIP-44 <0.5ms,
   10K event parse <20ms) must be continuously verified in CI.

5. **Browser-only behavior**: Passkey PRF ceremonies, IndexedDB, WebSocket
   relay connections, and DOM rendering require a real browser.

No mature Rust e2e browser automation framework exists. Playwright remains the
best option for browser interaction tests.

## Decision

Adopt a 5-layer testing strategy spanning compile-time checks through end-to-end
browser tests: static analysis, property-based unit tests, WASM target tests,
performance benchmarks, and Playwright e2e.

### Layer 1: Compile-Time Guarantees

- **`#![deny(unsafe_code)]`** in all 5 workspace crates. No `unsafe` blocks.
  All crypto uses safe RustCrypto abstractions.
- **`cargo clippy -- -D warnings`** in CI. Zero warnings permitted.
- **Strong typing**: Event kinds as enums, hex pubkeys as newtypes, channel
  sections as exhaustive enums (replacing `as ChannelSection` casts).

### Layer 2: Unit + Property Tests (cargo test + proptest)

Property-based tests for all crypto and serialization code. Critical tests
(all P0 priority):
- NIP-44 encrypt-decrypt roundtrip (10K random payloads, 1 byte to 64KB)
- NIP-01 event serialization canonical form (serde roundtrip)
- NIP-98 sign-verify roundtrip (random URLs, methods, payloads)
- HKDF key derivation (known test vectors from RFC 5869)
- Schnorr sign-verify (random messages, valid keys)
- Event ID computation (SHA-256 of canonical JSON)

Coverage target: 90%+ for `nostr-core`, measured by `cargo tarpaulin`.

### Layer 3: WASM Target Tests (wasm-bindgen-test)

Tests run in headless Chrome to validate WASM-specific behavior:
- `getrandom` produces non-zero output (validates `js` feature flag)
- NIP-44 encrypt/decrypt and Schnorr signing in WASM context
- IndexedDB read/write via `indexed-db` crate
- `nostr-sdk` relay connection (WebSocket in browser)

### Layer 4: Performance Benchmarks (criterion)

Statistical benchmarks with regression detection in CI:

| Benchmark              | Target      | Regression threshold |
|------------------------|-------------|---------------------|
| NIP-44 encrypt 1KB     | <0.5ms      | +20%                |
| NIP-44 decrypt 1KB     | <0.5ms      | +20%                |
| Event parse (1K)       | <2ms        | +20%                |
| Event parse (10K)      | <20ms       | +20%                |
| Schnorr sign           | <0.1ms      | +20%                |
| HKDF derive            | <0.05ms     | +20%                |

Benchmarks run on native target for reproducible CI results. Outputs stored
as CI artifacts for trend analysis.

### Layer 5: End-to-End Tests (Playwright, JavaScript)

Playwright tests run against the compiled Leptos WASM app served by `trunk
serve`. Uses Playwright's virtual WebAuthn authenticator for passkey tests.

E2e scenarios: passkey registration with PRF, login + session persistence,
hybrid transport blocked, channel zone access, message send/receive (kind:1,
kind:42), DM encrypt/decrypt (NIP-44), admin whitelist, profile edit + avatar
upload, search query, link preview rendering.

### CI Pipeline

Four parallel CI jobs:

1. **check**: `cargo fmt --check`, `cargo clippy -- -D warnings`,
   `cargo test --workspace`, WASM target tests, `cargo tarpaulin`
2. **benchmark**: `cargo criterion`, compare against baseline (fail on >20%)
3. **e2e**: `trunk build --release`, `npx playwright test`
4. **size**: `trunk build --release`, `wasm-opt -Oz`, assert <2MB gzipped

## Consequences

### Positive

- **Crypto confidence**: Property-based testing with 10K random inputs provides
  far stronger guarantees than example-based Vitest tests. `proptest`'s
  deterministic shrinking pinpoints exact failure inputs.
- **Regression detection**: Criterion benchmarks in CI catch performance
  regressions before merge. The 20% threshold prevents gradual degradation.
- **WASM parity**: `wasm-bindgen-test` catches WASM-specific issues (like
  missing `getrandom` js feature) that native `cargo test` would miss.
- **Zero unsafe**: `#![deny(unsafe_code)]` eliminates memory safety bugs by
  construction across all 5 workspace crates.
- **Compile-time coverage**: Rust's type system catches entire categories of
  bugs (exhaustive matching, ownership) that TypeScript misses.

### Negative

- **Dual test environments**: Tests must pass on both native and wasm32. Some
  require conditional compilation (`#[cfg(target_arch = "wasm32")]`).
- **Playwright stays JavaScript**: E2e tests cannot be written in Rust. The
  team maintains test code in two languages.
- **CI time increase**: Property tests, WASM compilation, and criterion add
  ~5-10 minutes vs current Vitest. Parallelization across jobs mitigates this.
- **No visual regression**: Screenshot comparison is not included. Visual
  parity with SvelteKit is verified manually during Phase 4.

### Neutral

- **Coverage tooling**: `cargo tarpaulin` measures native coverage. WASM
  coverage is inferred from shared code paths (no WASM coverage tool exists).
- **Playwright compatibility**: Tests interact with DOM via `data-test`
  attributes, which work identically for SvelteKit and Leptos output.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0, Section 9](../prd-rust-port.md)
- [proptest book](https://proptest-rs.github.io/proptest/intro.html)
- [criterion.rs user guide](https://bheisler.github.io/criterion.rs/book/)
- [wasm-bindgen-test](https://rustwasm.github.io/docs/wasm-bindgen/wasm-bindgen-test/index.html)
- ADR-013: Rust/Leptos Forum Framework
- ADR-014: Hybrid Validation Phase
