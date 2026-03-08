# ADR-017: passkey-rs for WebAuthn/FIDO2 with PRF Extension

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |

## Context

DreamLab's community forum uses a passkey-first authentication scheme where the
user's Nostr private key is deterministically derived from a WebAuthn PRF
(Pseudo-Random Function) extension output. This is not a standard passkey login
flow -- the PRF output is fed through HKDF-SHA256 to produce a secp256k1 private
key that serves as the user's Nostr identity.

The key derivation chain:
```
WebAuthn PRF output (32 bytes, HMAC-SHA-256 from authenticator)
  -> HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")
  -> 32-byte secp256k1 private key
  -> getPublicKey() -> hex pubkey (Nostr identity)
```

**Critical constraint**: The PRF extension (`hmac-secret` / `prf`) is non-standard
WebAuthn behavior. Most WebAuthn libraries do not support it. The PRF salt is
stored server-side in `webauthn_credentials.prf_salt` and must be sent to the
client during authentication options.

### Crate Comparison

| Criterion               | passkey-rs (1Password)    | webauthn-rs (kanidm)      |
|--------------------------|--------------------------|---------------------------|
| GitHub stars             | 263                      | 480                       |
| Maintainer               | 1Password                | Kanidm project            |
| PRF extension support    | **Yes**                  | **No**                    |
| Production usage         | 1Password browser WASM   | Kanidm identity server    |
| WASM compilation         | Supported                | Untested for WASM         |
| API style                | Builder pattern           | Opinionated high-level    |
| CTAP2 extension handling | Explicit extension API    | Limited to standard set   |
| Latest version           | 0.3.x                   | 0.5.x                    |

### PRF Extension Details

The WebAuthn PRF extension (W3C Level 3) allows the authenticator to evaluate
HMAC-SHA-256 with a credential-specific secret key on client-provided salt values.
The result is a deterministic 32-byte output that is:

- Unique per credential + salt combination
- Reproducible (same credential + same salt = same output)
- Never exposed to the relying party server (stays on client)

DreamLab's use of PRF is the core of its zero-knowledge auth model: the server
never sees the private key, only the derived public key. Losing PRF support means
losing the entire auth architecture.

### webauthn-rs Rejection

The `webauthn-rs` crate from the Kanidm project (480 stars) is the more popular
Rust WebAuthn library. However, it does not implement the PRF extension. Its
extension handling is limited to `credProtect`, `credBlob`, and `minPinLength`.
Adding PRF support would require forking and maintaining a custom extension
parser, which defeats the purpose of using an upstream crate.

Issue tracking in webauthn-rs for PRF support: no open issue exists as of
2026-03-08, indicating the maintainers have not prioritized this feature.

## Decision

Use `passkey-rs` (1Password) version 0.3.x as the WebAuthn/FIDO2 crate for the
auth-worker and for server-side credential verification. PRF extension support
is the deciding factor.

### Usage Architecture

```
Browser (forum-client WASM):
  navigator.credentials.create() / .get()  <- web-sys bindings (manual)
  PRF extension in create/get options       <- web-sys bindings (manual)
  HKDF(PRF output) -> privkey              <- nostr-core::keys::derive_from_prf()

Server (auth-worker, Rust):
  Verify registration response             <- passkey-rs
  Verify authentication assertion           <- passkey-rs
  Store/retrieve prf_salt in D1            <- worker crate D1 bindings
  Provision Solid pod in R2                <- worker crate R2 bindings
```

Key implementation details:

1. **Server-side only**: `passkey-rs` runs in the auth-worker (Cloudflare Worker
   compiled to WASM). It handles attestation verification, assertion verification,
   credential storage logic, and counter validation.

2. **Client-side manual bindings**: The browser PRF ceremony uses `web-sys`
   bindings to `navigator.credentials` directly. There is no Rust crate that
   wraps the browser WebAuthn API with PRF support. The client-side code in
   `forum-client` calls `web-sys` for `PublicKeyCredentialCreationOptions` with
   the PRF extension, then passes the PRF output to `nostr-core` for HKDF.

3. **Transport filtering**: Cross-device QR auth (`hybrid` transport) produces
   different PRF output and is blocked. USB security keys are allowed. This
   logic is implemented in the `forum-client` crate's auth module.

4. **Counter validation**: `passkey-rs` verifies that the authenticator's
   signature counter advances on each authentication, detecting cloned
   credentials.

## Consequences

### Positive

- **PRF support preserved**: The entire passkey-derived Nostr key scheme
  continues to work. Users authenticate with their passkey and deterministically
  derive the same Nostr private key on each login.
- **1Password production validation**: `passkey-rs` is used in 1Password's
  browser extension WASM build, which handles millions of WebAuthn operations.
  This is strong evidence of WASM compatibility and correctness.
- **Shared nostr-core**: The HKDF key derivation logic lives in `nostr-core`
  and is shared between client and server. The `derive_from_prf()` function
  is the same code path in both environments.
- **Type-safe credential handling**: Rust structs for
  `PublicKeyCredentialCreationOptions`, attestation objects, and assertion
  responses replace the current stringly-typed TypeScript handling.
- **Counter verification built-in**: `passkey-rs` handles signature counter
  validation automatically, which was a manual implementation in the TS version.

### Negative

- **Smaller community**: 263 stars vs webauthn-rs's 480. Fewer community
  examples and StackOverflow answers.
- **Manual client-side bindings**: No Rust crate wraps the browser WebAuthn
  API. The PRF ceremony on the client requires ~150 lines of manual `web-sys`
  code for `navigator.credentials.create()` and `.get()` with extension
  options. This is error-prone and must be thoroughly tested.
- **0.3.x maturity**: The crate is at 0.3.x, not 1.0. API changes are
  possible, though 1Password's dependency on it provides stability pressure.
- **PRF edge cases**: Windows Hello lacks PRF support and must be blocked
  with a user-facing error message. This is a pre-existing constraint from
  the TypeScript implementation, not new.

### Neutral

- **Same auth flow**: The registration and authentication ceremony is
  identical to the current TypeScript implementation. The steps, constraints,
  and transport filtering rules are unchanged.
- **D1 schema unchanged**: The `webauthn_credentials` table schema (including
  `prf_salt` column) remains the same. The Rust auth-worker reads and writes
  the same D1 rows as the current TS auth-api.
- **NIP-98 unchanged**: NIP-98 HTTP auth token creation and verification
  uses `nostr-core`, not `passkey-rs`. The crates have no overlap.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0, Section 4.1](../prd-rust-port.md)
- [passkey-rs](https://github.com/nichochar/passkey-rs) (1Password, 263 stars)
- [webauthn-rs](https://github.com/kanidm/webauthn-rs) (480 stars, no PRF)
- [W3C WebAuthn Level 3 PRF Extension](https://www.w3.org/TR/webauthn-3/#prf-extension)
- [CLAUDE.md: Forum Auth Architecture](../../CLAUDE.md)
- ADR-015: Workers Port Strategy
