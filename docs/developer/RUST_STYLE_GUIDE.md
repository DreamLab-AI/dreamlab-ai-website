# Rust Style Guide -- DreamLab Community Forum

**Last updated:** 2026-03-08 | [Back to Documentation Index](../README.md)

## Mandatory Compiler Settings

Every crate must include at the top of `lib.rs` or `main.rs`:

```rust
#![deny(unsafe_code)]
#![warn(missing_docs)]
#![warn(clippy::all)]
```

CI enforces: `cargo clippy -- -D warnings`, `cargo fmt --check`, `cargo test`, `cargo test --target wasm32-unknown-unknown`.

## Module Organization

```mermaid
graph TD
    subgraph "nostr-core"
        NC_LIB["lib.rs<br/>(public re-exports)"]
        NC_EVT["event.rs<br/>(NostrEvent, EventKind)"]
        NC_KEYS["keys.rs<br/>(Keypair, PRF, HKDF)"]
        NC_44["nip44.rs<br/>(encrypt/decrypt)"]
        NC_98["nip98.rs<br/>(token create/verify)"]
        NC_GW["gift_wrap.rs<br/>(NIP-59 wrap/unwrap)"]
        NC_TYP["types.rs<br/>(EventId, Timestamp, Tag)"]
        NC_WB["wasm_bridge.rs<br/>(wasm-bindgen FFI)"]

        NC_LIB --> NC_EVT
        NC_LIB --> NC_KEYS
        NC_LIB --> NC_44
        NC_LIB --> NC_98
        NC_LIB --> NC_GW
        NC_LIB --> NC_TYP
        NC_LIB -.->|"#[cfg(wasm32)]"| NC_WB
    end

    subgraph "forum-client"
        FC_MAIN["main.rs<br/>(entry point)"]
        FC_APP["app.rs<br/>(root + router)"]
        FC_AUTH["auth/<br/>(passkey, session)"]
        FC_PAGES["pages/<br/>(route components)"]
        FC_COMP["components/<br/>(UI widgets)"]
        FC_ADMIN["admin/<br/>(admin panel)"]
        FC_DM["dm/<br/>(direct messages)"]
        FC_RELAY["relay.rs<br/>(WebSocket pool)"]
        FC_UTILS["utils.rs<br/>(helpers)"]

        FC_MAIN --> FC_APP
        FC_APP --> FC_PAGES
        FC_APP --> FC_COMP
        FC_APP --> FC_AUTH
        FC_APP --> FC_ADMIN
        FC_APP --> FC_DM
        FC_APP --> FC_RELAY
        FC_APP --> FC_UTILS
    end

    subgraph "relay-worker"
        RW_LIB["lib.rs<br/>(HTTP router, CORS)"]
        RW_DO["relay_do.rs<br/>(Durable Object)"]
        RW_NIP["nip11.rs<br/>(relay info)"]
        RW_WL["whitelist.rs<br/>(whitelist handlers)"]
        RW_AUTH["auth.rs<br/>(NIP-98 admin)"]

        RW_LIB --> RW_DO
        RW_LIB --> RW_NIP
        RW_LIB --> RW_WL
        RW_LIB --> RW_AUTH
    end
```

One file per domain concept. Maximum 500 lines per file. Split into submodules if exceeded.

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Functions, methods | `snake_case` | `verify_signature()` |
| Types, traits, enums | `PascalCase` | `NostrEvent`, `EventKind` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_CONTENT_SIZE` |
| Modules, files | `snake_case` | `nip44.rs`, `gift_wrap.rs` |

## Error Handling

```mermaid
graph TD
    subgraph "Library Crates (nostr-core)"
        TE["thiserror<br/>#[derive(Error)]"]
        TE --> TYPED["Typed errors<br/>(Nip44Error, KeyError, etc.)"]
        TYPED --> RES["Result&lt;T, SpecificError&gt;"]
    end

    subgraph "Worker Crates"
        WR["worker::Result"]
        WR --> ANYHOW["Error propagation<br/>with ? operator"]
        ANYHOW --> RESP["HTTP Response<br/>(status code + JSON)"]
    end

    subgraph "Client Crate (forum-client)"
        SIG["Leptos signals"]
        SIG --> UI_ERR["User-facing<br/>error messages"]
    end

    style TE fill:#3498db,color:#fff
    style WR fill:#e67e22,color:#fff
    style SIG fill:#2ecc71,color:#fff
```

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

Never use `.unwrap()` in library code. Workers may use `.expect()` only for genuinely impossible invariants with an explaining comment.

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

Property-based testing with `proptest` for crypto and serialization. WASM tests with `wasm-bindgen-test`:

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

All public items must have `///` doc comments including `# Errors` section where applicable. Run `cargo doc --no-deps` to verify.

## Related Documents

- [Documentation Index](../README.md)
- [Getting Started](GETTING_STARTED.md)
- [DDD Overview](../ddd/README.md)
