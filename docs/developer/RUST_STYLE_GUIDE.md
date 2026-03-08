# Rust Style Guide — DreamLab Community Forum

## Mandatory Compiler Settings

Every crate must include at the top of `lib.rs` or `main.rs`:

```rust
#![deny(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::all)]
```

CI enforces: `cargo clippy -- -D warnings`, `cargo fmt --check`, `cargo test`,
`cargo test --target wasm32-unknown-unknown`.

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Functions, methods | `snake_case` | `verify_signature()` |
| Types, traits, enums | `PascalCase` | `NostrEvent`, `EventKind` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_CONTENT_SIZE` |
| Modules, files | `snake_case` | `nip44.rs` |

## Error Handling

`thiserror` for library crates (typed errors), `anyhow`/`worker::Result` for Workers.

```rust
// Library (nostr-core)
#[derive(Debug, Error)]
pub enum Nip44Error {
    #[error("invalid ciphertext length: {0}")]
    InvalidLength(usize),
    #[error("AEAD decryption failed")]
    DecryptionFailed,
}

// Worker
async fn handle(req: Request, env: Env) -> worker::Result<Response> {
    let body: RegisterRequest = req.json().await?;
    Ok(Response::from_json(&result)?)
}
```

Never use `.unwrap()` in library code. Workers may use `.expect()` only for
genuinely impossible invariants with an explaining comment.

## Module Organization

One file per domain concept. Maximum 500 lines per file. Split into submodules
if exceeded.

```
nostr-core/src/
  lib.rs          # Public API re-exports
  event.rs        # NostrEvent, EventKind, serialization
  nip44.rs        # NIP-44 encryption/decryption
  nip98.rs        # NIP-98 token creation/verification
  keys.rs         # Key derivation, PRF, SecretKey wrapper
  validation.rs   # Input validation
```

## Struct Design

Always derive standard traits. Use `#[serde(rename_all = "camelCase")]` for JS interop.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NostrEvent {
    pub id: String,
    pub pubkey: String,
    pub created_at: u64,
    pub kind: EventKind,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,
}
```

## Async Code

All Workers use `wasm-bindgen-futures`. Never import `tokio`.

## Testing

Property-based testing with `proptest` for crypto and serialization. WASM tests
with `wasm-bindgen-test`:

```rust
proptest! {
    #[test]
    fn nip44_roundtrip(plaintext in any::<Vec<u8>>()) {
        let ct = encrypt(&key, &plaintext).unwrap();
        prop_assert_eq!(plaintext, decrypt(&key, &ct).unwrap());
    }
}
```

## Dependencies

- Prefer RustCrypto crates for crypto operations
- Pin exact versions for `nostr-sdk` (alpha instability)
- Always enable `getrandom` `js` feature for WASM
- Avoid `std`-only crates in `nostr-core` (must compile for native + WASM)
- Never add `tokio`

## Documentation

All public items must have `///` doc comments including `# Errors` section where
applicable. Run `cargo doc --no-deps` to verify.
