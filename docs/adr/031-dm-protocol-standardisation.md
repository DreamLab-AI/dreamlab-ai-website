# ADR-031: DM Protocol Standardisation — NIP-04 Compat Fix + NIP-17 Primary

## Status: Proposed — partially superseded by the kit; remainder not overlay-verifiable

> **Adjudication (2026-06-11):** This ADR fixes the kind-4 decryption bug in
> `forum-client/src/stores/dms.rs`, adds relay-side NIP-42 AUTH gating for
> kind-1059, publishes kind-10050, and adds a `p_tag_pubkey` D1 index — all
> against the deleted in-tree `community-forum-rs` port. Partial overlay
> evidence exists: the relay's mesh config federates the gift-wrap kind
> (`MESH_FEDERATED_KINDS` includes `1059` in `relay-worker.wrangler.toml`), and
> the relay advertises NIP-42 AUTH as required (`auth_required` posture is the
> kit default). But the deployed migration `001_init.sql` shows **no**
> `p_tag_pubkey` column or `idx_events_kind_p_tag` index, and there is no
> overlay-observable evidence of the NIP-04 decrypt fix or kind-10050
> auto-publish — those live inside the kit's event-handling and client code.
> **Blocked on:** confirming the NIP-04 compat fix, kind-1059 AUTH gating, and
> kind-10050 publish shipped in the kit at `25ca8a1` (a kit-side audit), at
> which point the relevant sections become Accepted-via-kit. Kept Proposed.

## Date: 2026-05-06

## Context

A critical bug exists in the forum client's DM processing path. The function `process_kind4_event()` in `forum-client/src/stores/dms.rs` calls `nip44_decrypt()` on kind-4 events. Kind-4 (NIP-04) uses AES-256-CBC with a shared secret derived from ECDH (no HKDF, shared secret is SHA-256 hashed, not HKDF-derived), while NIP-44 uses ChaCha20-Poly1305 with HKDF-expanded key material. These are completely different encryption schemes. The result is that every direct message sent to a DreamLab user from any external Nostr client (Damus, Amethyst, Snort, Coracle, Iris, etc.) fails to decrypt and is silently dropped. DMs from external clients are non-functional.

The bug is compounded by a relay-side privacy failure. Kind-1059 events (NIP-59 gift wrap, the NIP-17 DM outer layer) are not AUTH-gated at the relay. Any WebSocket subscriber can send a `REQ` filter for `{"kinds": [1059]}` and receive all encrypted DM wraps that the relay stores. This defeats the privacy guarantees of NIP-17 entirely — the recipient's pubkey is exposed via the `p` tag on every kind-1059 event, and an attacker with relay access can collect the ciphertext for offline analysis. The NIP-17 specification explicitly requires NIP-42 AUTH gating: kind-1059 events must only be served to authenticated sessions whose pubkey matches the `p` tag.

Additionally, DreamLab users who receive kind-17 DMs from external clients are not discoverable as DM targets because no kind-10050 (NIP-17 preferred DM relay list) event has been published. External clients that respect NIP-17 will look up the recipient's kind-10050 event to find the preferred DM relay before sending. Without kind-10050, some clients fall back to querying the sender's relay list, which may not include `wss://relay.dreamlab-ai.com`, causing DMs to be delivered to a relay the recipient never checks.

The D1 events table in the relay-worker database does not have an index on `(kind, p_tag_pubkey)` for the kind-1059 case. Every request to serve a user's incoming gift-wrapped DMs requires a full table scan filtered by kind and the `p` tag JSON blob, which is a substring search rather than an indexed lookup. At low message volumes this is tolerable; at any meaningful scale it becomes a bottleneck.

## Decision

Fix the NIP-04 decryption bug. Implement relay-side NIP-42 AUTH gating for kind-1059 events. Add kind-10050 publishing. Add the missing D1 index.

### 1. Fix kind-4 Decryption Bug — `nip04_decrypt()`

Add `nip04_decrypt()` and `nip04_encrypt()` to `nostr-core/src/nip04.rs`. NIP-04 uses ECDH shared secret then SHA-256 hash (not HKDF) as the AES key:

```rust
// nostr-core/src/nip04.rs

use aes::Aes256;
use cbc::{Decryptor, Encryptor};
use cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit, block_padding::Pkcs7};
use secp256k1::{SecretKey, PublicKey, Secp256k1};
use sha2::{Sha256, Digest};
use base64::{Engine, engine::general_purpose::STANDARD as B64};

/// NIP-04 encryption (AES-256-CBC, ECDH shared secret, SHA-256 key derivation).
/// Used for kind-4 events only. For new DMs, prefer NIP-44 via NIP-17 gift wrap.
pub fn nip04_encrypt(
    sender_sk: &SecretKey,
    recipient_pk: &PublicKey,
    plaintext: &str,
) -> Result<String, Nip04Error> {
    let shared_secret = ecdh_shared_secret(sender_sk, recipient_pk)?;
    let key = Sha256::digest(&shared_secret);  // 32-byte key

    let iv: [u8; 16] = rand::random();
    let cipher = Encryptor::<Aes256>::new(&key.into(), &iv.into());
    let mut buf = plaintext.as_bytes().to_vec();
    // Pad to AES block boundary
    let padded_len = ((buf.len() / 16) + 1) * 16;
    buf.resize(padded_len, 0);
    let ciphertext = cipher.encrypt_padded_mut::<Pkcs7>(&mut buf, plaintext.len())
        .map_err(|e| Nip04Error::Encryption(e.to_string()))?;

    // NIP-04 format: base64(ciphertext)?iv=base64(iv)
    Ok(format!("{}?iv={}", B64.encode(ciphertext), B64.encode(iv)))
}

/// NIP-04 decryption. Counterpart to nip04_encrypt.
/// Call this for kind-4 events. Do NOT call nip44_decrypt on kind-4.
pub fn nip04_decrypt(
    receiver_sk: &SecretKey,
    sender_pk: &PublicKey,
    ciphertext_with_iv: &str,
) -> Result<String, Nip04Error> {
    // Split on "?iv="
    let parts: Vec<&str> = ciphertext_with_iv.splitn(2, "?iv=").collect();
    if parts.len() != 2 {
        return Err(Nip04Error::InvalidFormat("missing ?iv= separator".into()));
    }
    let ciphertext = B64.decode(parts[0]).map_err(|e| Nip04Error::Base64(e.to_string()))?;
    let iv_bytes = B64.decode(parts[1]).map_err(|e| Nip04Error::Base64(e.to_string()))?;
    if iv_bytes.len() != 16 {
        return Err(Nip04Error::InvalidFormat("IV must be 16 bytes".into()));
    }
    let iv: [u8; 16] = iv_bytes.try_into().unwrap();

    let shared_secret = ecdh_shared_secret(receiver_sk, sender_pk)?;
    let key = Sha256::digest(&shared_secret);

    let cipher = Decryptor::<Aes256>::new(&key.into(), &iv.into());
    let mut buf = ciphertext.clone();
    let plaintext = cipher.decrypt_padded_mut::<Pkcs7>(&mut buf)
        .map_err(|e| Nip04Error::Decryption(e.to_string()))?;

    String::from_utf8(plaintext.to_vec()).map_err(|e| Nip04Error::Utf8(e.to_string()))
}

fn ecdh_shared_secret(sk: &SecretKey, pk: &PublicKey) -> Result<[u8; 32], Nip04Error> {
    let secp = Secp256k1::new();
    let point = secp256k1::ecdh::SharedSecret::new(pk, sk);
    Ok(point.secret_bytes())
}

/// NIP-04 test vectors from the NIP-04 specification.
#[cfg(test)]
mod tests {
    use super::*;
    use secp256k1::Secp256k1;

    #[test]
    fn test_nip04_roundtrip() {
        let secp = Secp256k1::new();
        let (sk_a, pk_a) = secp.generate_keypair(&mut secp256k1::rand::thread_rng());
        let (sk_b, pk_b) = secp.generate_keypair(&mut secp256k1::rand::thread_rng());

        let plaintext = "Hello, NIP-04!";
        let encrypted = nip04_encrypt(&sk_a, &pk_b, plaintext).unwrap();
        let decrypted = nip04_decrypt(&sk_b, &pk_a, &encrypted).unwrap();
        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_nip04_known_vector() {
        // From NIP-04 spec test vector:
        // sender_sk: 0000...0001 (scalar 1)
        // recipient_pk: (secp256k1 generator point)
        // Expected: deterministic given fixed IV
        // Test vector values from: https://github.com/nostr-protocol/nips/blob/master/04.md
        // Note: NIP-04 does not publish official test vectors. Use community-verified vectors.
        // Placeholder: verify against at least two independent implementations (damus, snort).
    }
}

#[derive(Debug, thiserror::Error)]
pub enum Nip04Error {
    #[error("encryption failed: {0}")]
    Encryption(String),
    #[error("decryption failed: {0}")]
    Decryption(String),
    #[error("invalid format: {0}")]
    InvalidFormat(String),
    #[error("base64 decode error: {0}")]
    Base64(String),
    #[error("UTF-8 decode error: {0}")]
    Utf8(String),
    #[error("ECDH error: {0}")]
    Ecdh(String),
}
```

Update `process_kind4_event()` in `forum-client/src/stores/dms.rs`:

```rust
// BEFORE (bug):
let plaintext = nip44_decrypt(&state.secret_key, &sender_pubkey, &event.content)?;

// AFTER (correct):
let plaintext = match event.kind {
    4 => nip04_decrypt(&state.secret_key, &sender_pubkey, &event.content)
            .map_err(DmError::Nip04)?,
    1059 => {
        // Gift wrap: unseal outer layer, then decrypt rumor
        let unsealed = nip59_unseal(&state.secret_key, &event)?;
        nip44_decrypt(&state.secret_key, &unsealed.sender, &unsealed.content)
            .map_err(DmError::Nip44)?
    },
    _ => return Err(DmError::UnknownKind(event.kind)),
};
```

### 2. Relay-Side kind-1059 AUTH Gating

In `relay-worker/src/relay_do/nip_handlers.rs`, update `handle_req()` to enforce NIP-42 for kind-1059 subscriptions:

```rust
pub async fn handle_req(
    sub_id: &str,
    filters: Vec<NostrFilter>,
    session: &mut RelaySession,
    db: &D1Database,
) -> Result<Vec<NostrEvent>, RelayError> {
    let mut events = Vec::new();

    for filter in &filters {
        // NIP-17 privacy enforcement: kind-1059 requires authentication
        if filter.kinds.as_deref().unwrap_or_default().contains(&1059) {
            match &session.authenticated_pubkey {
                None => {
                    // Send AUTH challenge and return CLOSED
                    return Err(RelayError::AuthRequired(
                        "restricted: authentication required for kind-1059".into()
                    ));
                },
                Some(auth_pubkey) => {
                    // Enforce: only serve kind-1059 events where p tag matches authenticated pubkey
                    let restricted_filter = filter.with_p_tag_constraint(auth_pubkey.clone());
                    let evts = query_events(&restricted_filter, db).await?;
                    events.extend(evts);
                    continue;  // Skip the unrestricted query below for this filter
                }
            }
        }
        // All other kinds: normal query
        events.extend(query_events(filter, db).await?);
    }

    Ok(events)
}
```

The `RelayError::AuthRequired` variant sends `["CLOSED", sub_id, "auth-required: ..."]` to the client. After authentication completes and the client re-sends the REQ, the check passes and only the authenticated user's kind-1059 events are returned.

### 3. kind-10050 Auto-Publish on First DM Compose

In `forum-client/src/pages/dms.rs`, when the DM composition pane opens for the first time (no existing kind-10050 from this pubkey), publish a kind-10050 event:

```rust
// forum-client/src/pages/dms.rs
async fn ensure_kind10050_published(state: &AuthState, relay_pool: &RelayPool) {
    // Check if we've already published kind-10050
    let existing = relay_pool.query(NostrFilter {
        authors: Some(vec![state.pubkey_hex()]),
        kinds: Some(vec![10050]),
        limit: Some(1),
    }).await;

    if existing.is_empty() {
        let tags = vec![
            vec!["relay".to_string(), "wss://relay.dreamlab-ai.com".to_string()],
        ];
        let unsigned = UnsignedEvent::new(
            state.public_key(),
            10050,
            "".to_string(),
            tags,
        );
        if let Ok(signed) = state.sign_event(unsigned).await {
            relay_pool.publish(signed).await.ok();
        }
    }
}
```

This function is called once when the DM page mounts. The kind-10050 event is replaceable (kind 10000-19999 range), so if the user's relay preferences change, publishing a new one overwrites the old.

### 4. D1 Index for kind-1059 Delivery

Add to `relay-worker/src/lib.rs` `ensure_schema()`:

```rust
// Index for NIP-17 gift wrap delivery: efficient lookup of kind-1059 by recipient
let _ = db.prepare(
    "CREATE INDEX IF NOT EXISTS idx_events_kind_p_tag \
     ON events(kind, p_tag_pubkey)"
).run().await;
```

This requires a `p_tag_pubkey` column in the `events` table. If this column does not yet exist (it may be a JSON-extracted value):

```sql
ALTER TABLE events ADD COLUMN p_tag_pubkey TEXT;

-- Backfill from existing events (run once)
UPDATE events
SET p_tag_pubkey = json_extract(tags, '$[?(@[0]=="p")][1]')
WHERE kind = 1059 AND p_tag_pubkey IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_kind_p_tag
ON events(kind, p_tag_pubkey);
```

The relay-worker `insert_event()` function must populate `p_tag_pubkey` when storing kind-1059 events:

```rust
// In relay_do/nip_handlers.rs, insert_event():
let p_tag_pubkey: Option<String> = if event.kind == 1059 {
    event.tags.iter()
        .find(|t| t.get(0).map(|s| s == "p").unwrap_or(false))
        .and_then(|t| t.get(1))
        .cloned()
} else {
    None
};

// Include p_tag_pubkey in D1 INSERT statement
db.prepare(
    "INSERT OR REPLACE INTO events (id, pubkey, kind, created_at, content, tags, sig, p_tag_pubkey)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
).bind(&[
    // ... existing bindings ...
    p_tag_pubkey.as_deref().unwrap_or("").into(),
]).run().await?;
```

### 5. NIP-17 Read Receipt (kind-10 rumor)

When a kind-1059 gift wrap is successfully decrypted and displayed to the recipient, the client can optionally publish a read receipt as a kind-10 rumor inside a new gift wrap to the sender. This is implemented as an opt-in (controlled by user notification settings). The read receipt rumor structure:

```json
{
  "kind": 10,
  "content": "",
  "tags": [
    ["e", "<original_sealed_event_id>"],
    ["p", "<sender_pubkey>"],
    ["marker", "read"]
  ]
}
```

The rumor is wrapped in a kind-1059 seal before publishing. Implementation is deferred to Phase 2 — the infrastructure changes above are the prerequisite.

## Consequences

### Positive

- External Nostr client DMs now work correctly. DMs from Damus, Amethyst, Snort, and any other NIP-04-compliant client can be received and read.
- Kind-1059 AUTH gating provides genuine NIP-17 privacy. An unauthenticated relay subscriber can no longer collect all gift-wrapped DMs.
- kind-10050 publication makes DreamLab users discoverable as DM targets for NIP-17-aware external clients.
- The D1 index reduces kind-1059 query time from O(n) full table scan to O(log n + k) indexed lookup.
- The decryption path is now kind-discriminated — the correct algorithm is used for each event kind with no ambiguity.

### Negative / Trade-offs

- The `aes` and `cbc` crates are added as new dependencies for NIP-04 support. These add approximately 20-40KB to the WASM binary. The AES implementation is pure Rust (no C FFI), so wasm32 compilation is clean.
- The `p_tag_pubkey` D1 column migration requires a backfill operation on existing events. For a small database (< 100K events) this is fast; for larger deployments the backfill should be run as a background job, not in `ensure_schema()`.
- kind-1059 AUTH gating makes the relay non-backward-compatible for unauthenticated WebSocket subscribers who were relying on open kind-1059 subscriptions (e.g., debugging tools). These subscribers now receive `CLOSED` responses.
- Not sending read receipts (Phase 2 deferral) means sender-side "delivered" status is not available until Phase 2. The sender UI should not show read receipt indicators until this is implemented.

### Neutral

- Kind-4 support is maintained alongside NIP-17 (kind-1059). DreamLab does not deprecate kind-4 — it continues to be stored, relayed, and decrypted correctly. NIP-17 is the preferred path for new DMs but compatibility with existing Nostr ecosystem clients requires keeping kind-4 fully functional.
- The `nip04_encrypt()` function is implemented but the forum client UI does not use it for outgoing DMs (kind-1059 is used for outgoing). It is exposed in nostr-core for completeness and external tooling.

## Options Considered

### Option 1: Fix kind-4 decrypt only, defer NIP-17 privacy gating
- **Pros**: Minimal scope; kind-4 DMs from external clients work immediately.
- **Cons**: Kind-1059 AUTH gating is a privacy requirement, not a feature. Leaving it ungated means the forum has a documented privacy vulnerability in production.

### Option 2: Deprecate kind-4 entirely — only support NIP-17
- **Pros**: Simplified codebase; only one DM protocol to maintain.
- **Cons**: All existing kind-4 messages become unreadable. External clients using kind-4 (a large majority) cannot DM DreamLab users. Breaking the Nostr ecosystem compatibility contract.

### Option 3: Relay-side kind-4 → kind-1059 migration (rewrite inbound DMs)
- **Pros**: All stored messages in one format.
- **Cons**: Rewriting event content changes the event ID and breaks signature verification. Fundamentally incompatible with Nostr's immutable event model.

### Option 4: Implement NIP-17 at relay proxy layer (separate worker)
- **Pros**: Clean separation of DM concerns.
- **Cons**: An additional worker deployment for DM handling adds operational complexity. The relay already has the WebSocket connections — adding a separate worker creates indirection with no benefit at DreamLab's current scale.

## Related Decisions

- ADR-030: Authentication signer abstraction — `nip04_decrypt()` is called via the `Signer` interface.
- ADR-026: Forum professionalisation — notification system (web push) integration point for kind-1059 delivery notifications.
- ADR-023: Forum relay hardening — relay NIP-42 AUTH session management this ADR extends.

## References

- [NIP-04: Encrypted Direct Message](https://github.com/nostr-protocol/nostr/blob/master/04.md)
- [NIP-17: Private Direct Messages](https://github.com/nostr-protocol/nostr/blob/master/17.md)
- [NIP-44: Versioned Encryption](https://github.com/nostr-protocol/nostr/blob/master/44.md)
- [NIP-59: Gift Wrap](https://github.com/nostr-protocol/nostr/blob/master/59.md)
- [NIP-42: Authentication of Clients to Relays](https://github.com/nostr-protocol/nostr/blob/master/42.md)
- [NIP-10050: Preferred DM Relays](https://github.com/nostr-protocol/nostr/blob/master/10050.md)
