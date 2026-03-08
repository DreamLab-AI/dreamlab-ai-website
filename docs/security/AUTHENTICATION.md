# Authentication — DreamLab Community Forum (Rust Port)

## Auth Paths

| Method | Priority | Key Source | NIP-98 Capable |
|--------|----------|-----------|----------------|
| Passkey PRF | Primary | WebAuthn PRF + HKDF | Yes |
| NIP-07 | Extension | Browser extension (nos2x, Alby) | Yes (extension signs) |
| nsec | Advanced | User-provided hex private key | Yes |

Passkey PRF is the only method that derives a key deterministically from the
authenticator. NIP-07 and nsec users have `privateKey: None` in the auth state.

## PasskeyCredential Struct

```rust
pub struct PasskeyCredential {
    pub credential_id: String,  // Base64url credential ID
    pub prf_salt: String,       // Server-generated 32-byte salt (base64url)
    pub counter: u32,           // Signature counter for replay detection
    pub pubkey: String,         // Hex secp256k1 public key (Nostr identity)
    pub public_key: String,     // Base64url COSE public key from attestation
    pub created_at: u64,        // Unix timestamp (ms)
}
```

## PRF Key Derivation Flow

1. Server generates random 32-byte PRF salt during registration
2. Client calls `navigator.credentials.create()` with PRF extension + salt
3. Authenticator: `HMAC-SHA-256(credential_secret, prf_salt)` -> 32 bytes
4. Client: `HKDF-SHA256(ikm=prf_output, salt=[], info="nostr-secp256k1-v1")` -> 32 bytes
5. 32-byte output becomes the secp256k1 private key
6. Public key derived via `k256::SecretKey::public_key()`
7. Server stores `(credential_id, prf_salt, counter, pubkey)` in D1

Same PRF salt + same credential always produces the same private key. This is
what makes passkey login deterministic without storing the key.

## Rust Implementation

```rust
pub fn derive_from_prf(prf_output: &[u8; 32]) -> Result<SecretKey, KeyError> {
    let hk = Hkdf::<Sha256>::new(Some(&[]), prf_output);
    let mut okm = [0u8; 32];
    hk.expand(b"nostr-secp256k1-v1", &mut okm)?;
    let key = SecretKey::from_bytes((&okm).into())?;
    okm.zeroize();
    Ok(key)
}
```

## Platform Restrictions

- **Cross-device QR**: Blocked. Remote authenticators produce different PRF output,
  so the derived key would not match the registered pubkey.
- **USB security keys**: Allowed. Consistent PRF output across sessions.
- **Windows Hello**: Blocked. No PRF extension support (`prf.enabled === false`).

## NIP-98 Token Format

Header: `Authorization: Nostr <base64(kind:27235 event)>`

Tags: `["u", "<url>"]`, `["method", "<HTTP method>"]`, optional `["payload", "<sha256 hex of body>"]`.
Schnorr-signed with the PRF-derived private key.

## NIP-98 Verification (Server-Side)

1. Base64-decode token, reject if >64KB
2. Verify `kind === 27235` and `created_at` within 60 seconds
3. Verify `u` tag matches request URL, `method` tag matches HTTP method
4. Recompute event ID from NIP-01 canonical form (not the claimed `id`)
5. Verify Schnorr signature against recomputed ID
6. If body present, verify `payload` tag matches SHA-256 of raw bytes

## Private Key Lifecycle

1. **Derivation**: PRF output -> HKDF -> `SecretKey`
2. **Storage**: Never persisted. Held in `Option<SecretKey>` within auth signal
3. **Usage**: Signs NIP-98 tokens and Nostr events on demand
4. **Cleanup**: Zeroized on `pagehide` via the `zeroize` crate
5. **Re-derivation**: Same passkey ceremony reproduces the key on next login

## Session Management

Sessions stored in Cloudflare KV (`SESSIONS` namespace), keyed by pubkey, with
7-day default TTL. No server-side cookies. The client derives fresh NIP-98 tokens
per request using the in-memory private key.
