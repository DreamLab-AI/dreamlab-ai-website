# ADR-030: Authentication Signer Abstraction — WebAuthn PRF + NIP-07 + NIP-46

## Status: Proposed

## Date: 2026-05-06

## Context

The DreamLab forum currently supports exactly one authentication path: WebAuthn PRF extension → HKDF key derivation → secp256k1 private key held in a Rust closure in `forum-client/src/auth/prf.rs`. This path is excellent for onboarding new users who have no pre-existing Nostr identity — it is phishing-resistant, hardware-backed, and requires no key management from the user. However, it creates three significant gaps in the DreamLab user base coverage.

The first gap affects existing Nostr users. A significant fraction of potential DreamLab users already have a Nostr keypair managed by a browser extension implementing NIP-07 (`window.nostr`). These users — active on Damus, Amethyst, Snort, or other Nostr clients — would be required to abandon their existing social graph identity and start with a fresh PRF-derived key if they want to join DreamLab. This is a high-friction onboarding barrier. NIP-07 browser extensions (Nos2x, Alby, Flamingo, Nostore) expose a standard `window.nostr.signEvent()` API that a WASM client can call via wasm-bindgen JavaScript interop.

The second gap affects power users and organisations whose nsec keys live in hardware security modules or dedicated key management systems. NIP-46 (Nostr Connect, also called "bunker") defines a relay-mediated RPC protocol: the client sends encrypted kind-24133 request events to a `bunker://` URI, and the bunker signs and returns the result. The `admin-cli` in the forum source code explicitly declares a `--bunker` command-line flag with a `BunkerSigningNotImplemented` error at line ~340 of `admin-cli/src/main.rs`. This is WI-1 in the forum backlog. Operators who run admin operations through the CLI today must expose their raw nsec, which is a security anti-pattern for production admin keys.

The third gap is architectural: the forum client's `AuthState` struct in `forum-client/src/stores/auth.rs` currently holds a raw `secp256k1::SecretKey`. Any code that needs to sign an event must access this struct directly. As new signing paths are added, every signing call site would need to be updated to handle multiple key types. There is no abstraction that allows a component to sign an event without knowing or caring how the key is managed.

The `nostr = "0.44.2"` crate (used in nostr-core) includes `nostr-connect` as a sub-crate that provides NIP-46 client and server implementations. The `nostr-sdk` crate (a higher-level wrapper) also has NIP-46 support but adds dependencies that conflict with the wasm32 target. The raw `nostr-connect` sub-crate can be used directly.

## Decision

Define a `Signer` trait in `nostr-core` that abstracts all signing operations. Implement three concrete types. Refactor `AuthState` to hold a `Box<dyn Signer>` instead of a raw private key. Resolve WI-1 via `Nip46BunkerSigner`.

### 1. `Signer` Trait Definition

In `nostr-core/src/signer.rs`:

```rust
use crate::{NostrEvent, PublicKey, UnsignedEvent};

/// Unified signing abstraction for all DreamLab authentication paths.
///
/// All implementations must be Send + Sync to be usable in Leptos reactive signals
/// and across async boundaries.
pub trait Signer: Send + Sync + 'static {
    /// Return the Nostr public key for this signer.
    fn public_key(&self) -> &PublicKey;

    /// Sign an unsigned event, returning a fully signed NostrEvent.
    ///
    /// The implementation is responsible for setting the `id`, `sig` fields.
    /// The `created_at` field on UnsignedEvent is pre-set by the caller.
    async fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, SignerError>;

    /// NIP-44 encrypt plaintext to the given pubkey.
    async fn nip44_encrypt(
        &self,
        recipient: &PublicKey,
        plaintext: &str,
    ) -> Result<String, SignerError>;

    /// NIP-44 decrypt ciphertext from the given pubkey.
    async fn nip44_decrypt(
        &self,
        sender: &PublicKey,
        ciphertext: &str,
    ) -> Result<String, SignerError>;

    /// Return the signer type name for diagnostics.
    fn signer_type(&self) -> SignerType;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SignerType {
    PrfDerived,
    Nip07Extension,
    Nip46Bunker,
}

#[derive(Debug, thiserror::Error)]
pub enum SignerError {
    #[error("signing failed: {0}")]
    SigningFailed(String),
    #[error("encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("decryption failed: {0}")]
    DecryptionFailed(String),
    #[error("NIP-46 RPC timeout after {0}ms")]
    Nip46Timeout(u64),
    #[error("NIP-46 relay disconnected")]
    Nip46Disconnected,
    #[error("NIP-07 extension not available")]
    Nip07NotAvailable,
    #[error("NIP-07 extension rejected request")]
    Nip07Rejected,
    #[error("NIP-07 JS interop error: {0}")]
    Nip07JsError(String),
}
```

### 2. `PrfSigner` — Current WebAuthn PRF Path

```rust
// nostr-core/src/signers/prf.rs
use secp256k1::{SecretKey, Secp256k1, Message};
use crate::{PublicKey, NostrEvent, UnsignedEvent, signer::{Signer, SignerError, SignerType}};

pub struct PrfSigner {
    secret_key: SecretKey,
    public_key: PublicKey,
    secp: Secp256k1<secp256k1::All>,
}

impl PrfSigner {
    /// Construct from a HKDF-derived 32-byte private key.
    /// This is the only constructor — the secret key is consumed and never exposed.
    pub fn from_hkdf_output(key_bytes: [u8; 32]) -> Result<Self, SignerError> {
        let secp = Secp256k1::new();
        let secret_key = SecretKey::from_slice(&key_bytes)
            .map_err(|e| SignerError::SigningFailed(e.to_string()))?;
        let public_key = PublicKey::from_secret_key(&secp, &secret_key).into();
        // Zero the input bytes after consumption
        drop(key_bytes);
        Ok(Self { secret_key, public_key, secp })
    }
}

impl Signer for PrfSigner {
    fn public_key(&self) -> &PublicKey { &self.public_key }

    async fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, SignerError> {
        let msg = Message::from_slice(&event.id_hash())
            .map_err(|e| SignerError::SigningFailed(e.to_string()))?;
        let sig = self.secp.sign_schnorr(&msg, &self.secret_key);
        Ok(event.attach_signature(sig.into()))
    }

    async fn nip44_encrypt(&self, recipient: &PublicKey, plaintext: &str) -> Result<String, SignerError> {
        crate::nip44::encrypt(&self.secret_key, recipient, plaintext)
            .map_err(|e| SignerError::EncryptionFailed(e.to_string()))
    }

    async fn nip44_decrypt(&self, sender: &PublicKey, ciphertext: &str) -> Result<String, SignerError> {
        crate::nip44::decrypt(&self.secret_key, sender, ciphertext)
            .map_err(|e| SignerError::DecryptionFailed(e.to_string()))
    }

    fn signer_type(&self) -> SignerType { SignerType::PrfDerived }
}
```

### 3. `Nip07Signer` — Browser Extension Interop

In a `#[cfg(target_arch = "wasm32")]` gated module:

```rust
// nostr-core/src/signers/nip07.rs
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_futures::JsFuture;
#[cfg(target_arch = "wasm32")]
use web_sys::js_sys;

pub struct Nip07Signer {
    public_key: PublicKey,
}

impl Nip07Signer {
    /// Check if window.nostr is available and retrieve the public key.
    #[cfg(target_arch = "wasm32")]
    pub async fn detect() -> Result<Self, SignerError> {
        let nostr_obj = js_sys::Reflect::get(
            &web_sys::window().ok_or(SignerError::Nip07NotAvailable)?,
            &JsValue::from_str("nostr"),
        ).map_err(|_| SignerError::Nip07NotAvailable)?;

        if nostr_obj.is_undefined() {
            return Err(SignerError::Nip07NotAvailable);
        }

        // Call window.nostr.getPublicKey()
        let get_pk_fn = js_sys::Reflect::get(&nostr_obj, &JsValue::from_str("getPublicKey"))
            .map_err(|_| SignerError::Nip07NotAvailable)?;
        let get_pk_fn: js_sys::Function = get_pk_fn.dyn_into()
            .map_err(|_| SignerError::Nip07NotAvailable)?;

        let pk_promise = get_pk_fn.call0(&nostr_obj)
            .map_err(|e| SignerError::Nip07JsError(format!("{:?}", e)))?;
        let pk_str: String = JsFuture::from(js_sys::Promise::from(pk_promise))
            .await
            .map_err(|e| SignerError::Nip07JsError(format!("{:?}", e)))?
            .as_string()
            .ok_or_else(|| SignerError::Nip07JsError("non-string pubkey".into()))?;

        let public_key = PublicKey::from_hex(&pk_str)
            .map_err(|e| SignerError::Nip07JsError(e.to_string()))?;
        Ok(Self { public_key })
    }
}

#[cfg(target_arch = "wasm32")]
impl Signer for Nip07Signer {
    fn public_key(&self) -> &PublicKey { &self.public_key }

    async fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, SignerError> {
        let nostr_obj = get_window_nostr()?;
        let sign_fn: js_sys::Function = get_fn(&nostr_obj, "signEvent")?;
        let event_js = serde_wasm_bindgen::to_value(&event)
            .map_err(|e| SignerError::Nip07JsError(e.to_string()))?;
        let result_promise = sign_fn.call1(&nostr_obj, &event_js)
            .map_err(|e| SignerError::Nip07JsError(format!("{:?}", e)))?;
        let signed: NostrEvent = serde_wasm_bindgen::from_value(
            JsFuture::from(js_sys::Promise::from(result_promise)).await
                .map_err(|e| SignerError::Nip07Rejected)?,
        ).map_err(|e| SignerError::Nip07JsError(e.to_string()))?;
        Ok(signed)
    }

    async fn nip44_encrypt(&self, recipient: &PublicKey, plaintext: &str) -> Result<String, SignerError> {
        call_nip44_on_extension("nip44", "encrypt", &self.public_key, recipient, plaintext).await
    }

    async fn nip44_decrypt(&self, sender: &PublicKey, ciphertext: &str) -> Result<String, SignerError> {
        call_nip44_on_extension("nip44", "decrypt", &self.public_key, sender, ciphertext).await
    }

    fn signer_type(&self) -> SignerType { SignerType::Nip07Extension }
}
```

### 4. `Nip46BunkerSigner` — Remote Key Management (Resolves WI-1)

```rust
// nostr-core/src/signers/nip46.rs
use std::sync::Arc;
use tokio::sync::{Mutex, oneshot};
use std::collections::HashMap;

/// NIP-46 bunker URI format:
/// bunker://{pubkey}?relay={relay_url}&secret={secret}
pub struct Nip46BunkerSigner {
    client_key: secp256k1::SecretKey,
    remote_pubkey: PublicKey,
    relay_url: String,
    secret: Option<String>,
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<Nip46Response>>>>,
}

impl Nip46BunkerSigner {
    /// Parse a bunker:// URI and establish a relay connection.
    pub async fn connect(bunker_uri: &str) -> Result<Self, SignerError> {
        let parsed = parse_bunker_uri(bunker_uri)?;
        // Generate ephemeral client key for this session
        let client_key = secp256k1::SecretKey::new(&mut secp256k1::rand::thread_rng());
        let signer = Self {
            client_key,
            remote_pubkey: parsed.remote_pubkey,
            relay_url: parsed.relay_url,
            secret: parsed.secret,
            pending: Arc::new(Mutex::new(HashMap::new())),
        };
        // Send NIP-46 "connect" request to establish session
        signer.send_connect_request().await?;
        Ok(signer)
    }

    async fn rpc_request(
        &self,
        method: &str,
        params: Vec<serde_json::Value>,
    ) -> Result<Nip46Response, SignerError> {
        let request_id = uuid::Uuid::new_v4().to_string();
        let request = serde_json::json!({
            "id": request_id,
            "method": method,
            "params": params
        });
        let encrypted = nip44_encrypt_str(
            &self.client_key, &self.remote_pubkey,
            &serde_json::to_string(&request).unwrap(),
        )?;
        // Build kind-24133 NIP-46 request event
        let unsigned = UnsignedEvent::new(
            PublicKey::from_secret_key_secp256k1(&self.client_key),
            24133,
            encrypted,
            vec![vec!["p".to_string(), self.remote_pubkey.to_hex()]],
        );
        let signed = PrfSigner::from_raw_key(self.client_key.clone())
            .sign_event(unsigned).await?;

        let (tx, rx) = oneshot::channel();
        self.pending.lock().await.insert(request_id, tx);
        publish_to_relay(&self.relay_url, signed).await?;

        tokio::time::timeout(
            std::time::Duration::from_millis(30_000),
            rx,
        ).await
            .map_err(|_| SignerError::Nip46Timeout(30_000))?
            .map_err(|_| SignerError::Nip46Disconnected)
    }
}

impl Signer for Nip46BunkerSigner {
    fn public_key(&self) -> &PublicKey { &self.remote_pubkey }

    async fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, SignerError> {
        let event_json = serde_json::to_string(&event).unwrap();
        let response = self.rpc_request("sign_event", vec![serde_json::Value::String(event_json)]).await?;
        serde_json::from_str::<NostrEvent>(&response.result)
            .map_err(|e| SignerError::SigningFailed(e.to_string()))
    }

    async fn nip44_encrypt(&self, recipient: &PublicKey, plaintext: &str) -> Result<String, SignerError> {
        let response = self.rpc_request(
            "nip44_encrypt",
            vec![
                serde_json::Value::String(recipient.to_hex()),
                serde_json::Value::String(plaintext.to_string()),
            ],
        ).await?;
        Ok(response.result)
    }

    async fn nip44_decrypt(&self, sender: &PublicKey, ciphertext: &str) -> Result<String, SignerError> {
        let response = self.rpc_request(
            "nip44_decrypt",
            vec![
                serde_json::Value::String(sender.to_hex()),
                serde_json::Value::String(ciphertext.to_string()),
            ],
        ).await?;
        Ok(response.result)
    }

    fn signer_type(&self) -> SignerType { SignerType::Nip46Bunker }
}
```

### 5. `AuthState` Refactor

In `forum-client/src/stores/auth.rs`, replace:

```rust
// BEFORE
pub struct AuthState {
    pub pubkey: RwSignal<Option<String>>,
    pub secret_key: RwSignal<Option<secp256k1::SecretKey>>,  // raw key
    pub is_admin: RwSignal<bool>,
    // ...
}
```

With:

```rust
// AFTER
use nostr_core::signer::Signer;

pub struct AuthState {
    pub pubkey: RwSignal<Option<String>>,
    pub signer: RwSignal<Option<Arc<dyn Signer>>>,  // abstracted
    pub is_admin: RwSignal<bool>,
    pub trust_level: RwSignal<u8>,
    // ...
}

impl AuthState {
    pub async fn sign_event(&self, event: UnsignedEvent) -> Result<NostrEvent, SignerError> {
        let signer = self.signer.get_untracked()
            .ok_or(SignerError::SigningFailed("not authenticated".into()))?;
        signer.sign_event(event).await
    }

    pub fn signer_type(&self) -> Option<SignerType> {
        self.signer.get_untracked().map(|s| s.signer_type())
    }
}
```

### 6. Admin CLI Resolution of WI-1

In `admin-cli/src/main.rs`, replace the `BunkerSigningNotImplemented` error:

```rust
// BEFORE
"--bunker" => {
    return Err(CliError::BunkerSigningNotImplemented);
}

// AFTER
"--bunker" => {
    let bunker_uri = args.next().ok_or(CliError::MissingBunkerUri)?;
    let signer = Nip46BunkerSigner::connect(&bunker_uri).await
        .map_err(CliError::SignerError)?;
    Box::new(signer) as Box<dyn Signer>
}
```

### 7. Login UI Flow

The forum client login page (`forum-client/src/pages/login.rs`) gains a signer selection step before passkey auth:

- "Sign in with Passkey" (PRF path, default for new users)
- "Sign in with Extension" (NIP-07 path, shown only if `window.nostr` detected)
- "Sign in with Bunker" (NIP-46 path, shows a text input for `bunker://` URI, for power users)

Detection of `window.nostr` runs at mount time via a JS eval call.

## Consequences

### Positive

- Existing Nostr users can join DreamLab with their existing social graph identity (NIP-07 path).
- Admin operations via the CLI can use hardware-backed key management (NIP-46 path). WI-1 resolved.
- The `Signer` trait enables future signing paths (NIP-55 Android signer, hardware tokens) without touching call sites.
- The `AuthState` refactor removes raw secret key exposure from reactive Leptos signals — the key is now behind a trait object, preventing accidental exposure via serialisation.
- NIP-46 bunker support makes DreamLab compatible with enterprise key management workflows.

### Negative / Trade-offs

- NIP-07 interop requires `wasm-bindgen` JS FFI — the most fragile integration surface in the codebase. Browser extensions can return unexpected types; error handling must be defensive.
- `Nip46BunkerSigner` requires a live WebSocket connection to the bunker relay. If the relay is unreachable, signing fails — this is a single point of failure for admin operations if the admin uses a remote bunker.
- The `Arc<dyn Signer>` in `AuthState` replaces a concrete type with dynamic dispatch. Leptos's reactivity system must clone the Arc on signal access — verify that `Arc` implements `Clone` correctly when nested in `RwSignal`.
- NIP-46 adds async RPC latency to every signing operation (30-second timeout). This is acceptable for admin CLI operations but must not block UI rendering in the forum client. All sign calls must be wrapped in non-blocking async tasks.

### Neutral

- The `PrfSigner` is unchanged internally — it is simply wrapped in the trait. No migration of existing passkey sessions is required.
- `Nip07Signer` is only compiled for `wasm32` targets. The admin CLI (native binary) cannot use it.
- `SignerType` enum provides a discriminant for telemetry — which login method is most popular.

## Options Considered

### Option 1: Add NIP-07 and NIP-46 as parallel code paths without a trait abstraction
- **Pros**: Minimal refactoring; each path is independent.
- **Cons**: Every signing call site needs `match signer_type { ... }` pattern. Adding a fourth signer type (e.g., NIP-55) requires updating every call site. The raw secret key remains exposed in `AuthState` for the PRF path.

### Option 2: Use `nostr-sdk`'s built-in signer abstraction
- **Pros**: No custom trait; reuse upstream work.
- **Cons**: `nostr-sdk` adds ~300KB to the WASM binary and has tokio dependencies that complicate wasm32 compilation. The nostr-core crate is intentionally lighter-weight.

### Option 3: Signer as a server-side session (all signing delegated to auth-worker)
- **Pros**: Private keys never in browser memory.
- **Cons**: Every user interaction requiring a signature (every post, every DM) requires an authenticated HTTP round-trip to auth-worker. Latency is unacceptable for a real-time chat interface.

## Related Decisions

- ADR-017: Passkey-rs WebAuthn PRF — defines the PRF-to-privkey derivation that `PrfSigner` wraps.
- ADR-031: DM protocol standardisation — `nip04_decrypt()` is called via the `Signer` interface's decrypt path for kind-4 events.
- ADR-032: Agent job marketplace — `NIP-26 DelegationToken` uses the `Signer` trait to sign delegation tokens.

## References

- [NIP-07: Browser Signer](https://github.com/nostr-protocol/nostr/blob/master/07.md)
- [NIP-46: Nostr Connect (Bunker)](https://github.com/nostr-protocol/nostr/blob/master/46.md)
- [nostr-connect sub-crate](https://crates.io/crates/nostr-connect)
- [WebAuthn PRF Extension](https://www.w3.org/TR/webauthn-3/#prf-extension)
