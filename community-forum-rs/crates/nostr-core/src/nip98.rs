//! NIP-98: HTTP Auth via Nostr events (kind 27235).
//!
//! Implements token creation and verification matching the TypeScript
//! implementation in `workers/shared/nip98.ts` and `packages/nip98/`.
//!
//! Wire format: `Authorization: Nostr base64(json(signed_event))`

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use k256::schnorr::SigningKey;
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::event::{sign_event, verify_event, NostrEvent, UnsignedEvent};

/// NIP-98 event kind.
const HTTP_AUTH_KIND: u64 = 27235;

/// Maximum allowed clock skew in seconds.
const TIMESTAMP_TOLERANCE: u64 = 60;

/// Maximum encoded event size in bytes (64 KiB, matching TS implementation).
const MAX_EVENT_SIZE: usize = 64 * 1024;

/// Authorization header prefix.
const NOSTR_PREFIX: &str = "Nostr ";

/// A verified NIP-98 token with extracted fields.
#[derive(Debug, Clone)]
pub struct Nip98Token {
    /// Hex-encoded x-only public key of the signer.
    pub pubkey: String,
    /// The URL this token authorizes.
    pub url: String,
    /// The HTTP method this token authorizes.
    pub method: String,
    /// SHA-256 hex hash of the request body, if present.
    pub payload_hash: Option<String>,
    /// Unix timestamp when the token was created.
    pub created_at: u64,
}

/// Errors that can occur during NIP-98 token creation or verification.
#[derive(Debug, Error)]
pub enum Nip98Error {
    #[error("invalid secret key: {0}")]
    InvalidKey(#[from] k256::schnorr::Error),

    #[error("JSON serialization failed: {0}")]
    Json(#[from] serde_json::Error),

    #[error("base64 decode failed: {0}")]
    Base64(#[from] base64::DecodeError),

    #[error("missing 'Nostr ' prefix in Authorization header")]
    MissingPrefix,

    #[error("event exceeds maximum size ({MAX_EVENT_SIZE} bytes)")]
    EventTooLarge,

    #[error("wrong event kind: expected {HTTP_AUTH_KIND}, got {0}")]
    WrongKind(u64),

    #[error("invalid pubkey: expected 64 hex chars")]
    InvalidPubkey,

    #[error("timestamp expired: event created_at {event_ts} is more than {TIMESTAMP_TOLERANCE}s from now ({now})")]
    TimestampExpired { event_ts: u64, now: u64 },

    #[error("missing required tag: {0}")]
    MissingTag(String),

    #[error("URL mismatch: token={token_url}, expected={expected_url}")]
    UrlMismatch {
        token_url: String,
        expected_url: String,
    },

    #[error("method mismatch: token={token_method}, expected={expected_method}")]
    MethodMismatch {
        token_method: String,
        expected_method: String,
    },

    #[error("payload hash mismatch")]
    PayloadMismatch,

    #[error("body present but no payload tag in signed event")]
    MissingPayloadTag,

    #[error("event signature verification failed")]
    InvalidSignature,
}

/// Create a NIP-98 authorization token for an HTTP request.
///
/// Returns a base64-encoded JSON string suitable for the `Authorization: Nostr <token>` header.
///
/// # Arguments
/// * `secret_key` - 32-byte secp256k1 secret key
/// * `url` - The full request URL
/// * `method` - HTTP method (GET, POST, etc.)
/// * `body` - Optional request body (will be SHA-256 hashed for the payload tag)
pub fn create_token(
    secret_key: &[u8; 32],
    url: &str,
    method: &str,
    body: Option<&[u8]>,
) -> Result<String, Nip98Error> {
    let sk = SigningKey::from_bytes(secret_key)?;
    let pubkey = hex::encode(sk.verifying_key().to_bytes());

    let mut tags = vec![
        vec!["u".to_string(), url.to_string()],
        vec!["method".to_string(), method.to_string()],
    ];

    if let Some(body_bytes) = body {
        let hash = Sha256::digest(body_bytes);
        tags.push(vec!["payload".to_string(), hex::encode(hash)]);
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock before epoch")
        .as_secs();

    let unsigned = UnsignedEvent {
        pubkey,
        created_at: now,
        kind: HTTP_AUTH_KIND,
        tags,
        content: String::new(),
    };

    let signed = sign_event(unsigned, &sk);
    let json = serde_json::to_string(&signed)?;
    Ok(BASE64.encode(json.as_bytes()))
}

/// Verify a NIP-98 `Authorization` header value.
///
/// Decodes the base64 token, recomputes the event ID from canonical form
/// (never trusts the provided id), verifies the Schnorr signature, and
/// checks URL, method, timestamp, and optional payload hash.
///
/// # Arguments
/// * `auth_header` - The full `Authorization` header value (e.g. `"Nostr base64..."`)
/// * `expected_url` - The URL that should appear in the `u` tag
/// * `expected_method` - The HTTP method that should appear in the `method` tag
/// * `body` - Optional request body bytes to verify against the `payload` tag
pub fn verify_token(
    auth_header: &str,
    expected_url: &str,
    expected_method: &str,
    body: Option<&[u8]>,
) -> Result<Nip98Token, Nip98Error> {
    // 1. Strip "Nostr " prefix
    let token = auth_header
        .strip_prefix(NOSTR_PREFIX)
        .ok_or(Nip98Error::MissingPrefix)?
        .trim();

    // 2. Size check on encoded token
    if token.len() > MAX_EVENT_SIZE {
        return Err(Nip98Error::EventTooLarge);
    }

    // 3. Base64 decode and parse JSON
    let json_bytes = BASE64.decode(token)?;
    if json_bytes.len() > MAX_EVENT_SIZE {
        return Err(Nip98Error::EventTooLarge);
    }
    let event: NostrEvent = serde_json::from_slice(&json_bytes)?;

    // 4. Check kind
    if event.kind != HTTP_AUTH_KIND {
        return Err(Nip98Error::WrongKind(event.kind));
    }

    // 5. Check pubkey format
    if event.pubkey.len() != 64 || hex::decode(&event.pubkey).is_err() {
        return Err(Nip98Error::InvalidPubkey);
    }

    // 6. Timestamp within tolerance
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock before epoch")
        .as_secs();
    let diff = if now > event.created_at {
        now - event.created_at
    } else {
        event.created_at - now
    };
    if diff > TIMESTAMP_TOLERANCE {
        return Err(Nip98Error::TimestampExpired {
            event_ts: event.created_at,
            now,
        });
    }

    // 7. Verify event integrity (recomputes ID from scratch + Schnorr sig check)
    if !verify_event(&event) {
        return Err(Nip98Error::InvalidSignature);
    }

    // 8. Extract and verify URL tag
    let token_url = get_tag(&event, "u").ok_or_else(|| Nip98Error::MissingTag("u".into()))?;
    let normalized_token = token_url.trim_end_matches('/');
    let normalized_expected = expected_url.trim_end_matches('/');
    if normalized_token != normalized_expected {
        return Err(Nip98Error::UrlMismatch {
            token_url: token_url.clone(),
            expected_url: expected_url.to_string(),
        });
    }

    // 9. Extract and verify method tag
    let token_method =
        get_tag(&event, "method").ok_or_else(|| Nip98Error::MissingTag("method".into()))?;
    if token_method.to_uppercase() != expected_method.to_uppercase() {
        return Err(Nip98Error::MethodMismatch {
            token_method,
            expected_method: expected_method.to_string(),
        });
    }

    // 10. Payload hash verification
    let payload_tag = get_tag(&event, "payload");

    let verified_payload_hash = if let Some(body_bytes) = body {
        if !body_bytes.is_empty() {
            // Body present — payload tag MUST exist
            let expected_hash = payload_tag.as_ref().ok_or(Nip98Error::MissingPayloadTag)?;
            let actual_hash = hex::encode(Sha256::digest(body_bytes));
            if expected_hash.to_lowercase() != actual_hash.to_lowercase() {
                return Err(Nip98Error::PayloadMismatch);
            }
            Some(expected_hash.clone())
        } else {
            payload_tag
        }
    } else {
        payload_tag
    };

    Ok(Nip98Token {
        pubkey: event.pubkey,
        url: token_url,
        method: token_method,
        payload_hash: verified_payload_hash,
        created_at: event.created_at,
    })
}

/// Helper: extract the first value for a tag name from an event's tags.
fn get_tag(event: &NostrEvent, name: &str) -> Option<String> {
    event
        .tags
        .iter()
        .find(|t| t.first().map(|s| s.as_str()) == Some(name))
        .and_then(|t| t.get(1).cloned())
}

/// Build a full `Authorization` header value from a token string.
pub fn authorization_header(token: &str) -> String {
    format!("{NOSTR_PREFIX}{token}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use k256::schnorr::SigningKey;

    fn test_secret_key() -> [u8; 32] {
        // Deterministic key for tests
        let mut key = [0u8; 32];
        key[0] = 0x01;
        key[31] = 0x01;
        key
    }

    fn test_signing_key() -> SigningKey {
        SigningKey::from_bytes(&test_secret_key()).unwrap()
    }

    // ── Roundtrip ──────────────────────────────────────────────────────

    #[test]
    fn nip98_create_verify_roundtrip_no_body() {
        let sk = test_secret_key();
        let url = "https://api.example.com/upload";
        let method = "GET";

        let token = create_token(&sk, url, method, None).unwrap();
        let header = authorization_header(&token);
        let result = verify_token(&header, url, method, None).unwrap();

        let expected_pubkey = hex::encode(test_signing_key().verifying_key().to_bytes());
        assert_eq!(result.pubkey, expected_pubkey);
        assert_eq!(result.url, url);
        assert_eq!(result.method, method);
        assert!(result.payload_hash.is_none());
    }

    #[test]
    fn nip98_create_verify_roundtrip_with_body() {
        let sk = test_secret_key();
        let url = "https://api.example.com/data";
        let method = "POST";
        let body = b"hello world";

        let token = create_token(&sk, url, method, Some(body)).unwrap();
        let header = authorization_header(&token);
        let result = verify_token(&header, url, method, Some(body)).unwrap();

        assert_eq!(result.method, method);
        assert!(result.payload_hash.is_some());

        // Verify the payload hash matches SHA-256 of body
        let expected_hash = hex::encode(Sha256::digest(body));
        assert_eq!(result.payload_hash.unwrap(), expected_hash);
    }

    // ── Rejection tests ────────────────────────────────────────────────

    #[test]
    fn nip98_reject_wrong_url() {
        let sk = test_secret_key();
        let token = create_token(&sk, "https://good.com/api", "GET", None).unwrap();
        let header = authorization_header(&token);

        let err = verify_token(&header, "https://evil.com/api", "GET", None).unwrap_err();
        assert!(matches!(err, Nip98Error::UrlMismatch { .. }));
    }

    #[test]
    fn nip98_reject_wrong_method() {
        let sk = test_secret_key();
        let token = create_token(&sk, "https://api.example.com/x", "GET", None).unwrap();
        let header = authorization_header(&token);

        let err = verify_token(&header, "https://api.example.com/x", "POST", None).unwrap_err();
        assert!(matches!(err, Nip98Error::MethodMismatch { .. }));
    }

    #[test]
    fn nip98_reject_missing_prefix() {
        let err = verify_token("Bearer abc123", "https://x.com", "GET", None).unwrap_err();
        assert!(matches!(err, Nip98Error::MissingPrefix));
    }

    #[test]
    fn nip98_reject_invalid_base64() {
        let err = verify_token("Nostr !!!not-base64!!!", "https://x.com", "GET", None).unwrap_err();
        // Could be base64 decode error or JSON parse error
        assert!(
            matches!(err, Nip98Error::Base64(_)) || matches!(err, Nip98Error::Json(_)),
            "expected Base64 or Json error, got: {err}"
        );
    }

    #[test]
    fn nip98_reject_tampered_signature() {
        let sk = test_secret_key();
        let url = "https://api.example.com/test";
        let token_b64 = create_token(&sk, url, "GET", None).unwrap();

        // Decode, tamper with sig, re-encode
        let json_bytes = BASE64.decode(&token_b64).unwrap();
        let mut event: NostrEvent = serde_json::from_slice(&json_bytes).unwrap();
        // Flip a byte in the signature
        let mut sig_bytes = hex::decode(&event.sig).unwrap();
        sig_bytes[0] ^= 0xFF;
        event.sig = hex::encode(&sig_bytes);

        let tampered_json = serde_json::to_string(&event).unwrap();
        let tampered_b64 = BASE64.encode(tampered_json.as_bytes());
        let header = authorization_header(&tampered_b64);

        let err = verify_token(&header, url, "GET", None).unwrap_err();
        assert!(matches!(err, Nip98Error::InvalidSignature));
    }

    #[test]
    fn nip98_reject_payload_mismatch() {
        let sk = test_secret_key();
        let url = "https://api.example.com/upload";
        let original_body = b"original content";
        let tampered_body = b"tampered content";

        let token = create_token(&sk, url, "POST", Some(original_body)).unwrap();
        let header = authorization_header(&token);

        let err = verify_token(&header, url, "POST", Some(tampered_body)).unwrap_err();
        assert!(matches!(err, Nip98Error::PayloadMismatch));
    }

    #[test]
    fn nip98_reject_body_without_payload_tag() {
        let sk = test_secret_key();
        let url = "https://api.example.com/upload";

        // Create token WITHOUT body (no payload tag)
        let token = create_token(&sk, url, "POST", None).unwrap();
        let header = authorization_header(&token);

        // Verify WITH body — should reject because payload tag is missing
        let err = verify_token(&header, url, "POST", Some(b"sneaky body")).unwrap_err();
        assert!(matches!(err, Nip98Error::MissingPayloadTag));
    }

    #[test]
    fn nip98_reject_expired_timestamp() {
        let signing_key = test_signing_key();
        let pubkey = hex::encode(signing_key.verifying_key().to_bytes());
        let url = "https://api.example.com/old";

        // Manually create an event with an old timestamp
        let old_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            - 120; // 2 minutes ago, beyond 60s tolerance

        let unsigned = UnsignedEvent {
            pubkey,
            created_at: old_time,
            kind: HTTP_AUTH_KIND,
            tags: vec![
                vec!["u".to_string(), url.to_string()],
                vec!["method".to_string(), "GET".to_string()],
            ],
            content: String::new(),
        };

        let signed = sign_event(unsigned, &signing_key);
        let json = serde_json::to_string(&signed).unwrap();
        let b64 = BASE64.encode(json.as_bytes());
        let header = authorization_header(&b64);

        let err = verify_token(&header, url, "GET", None).unwrap_err();
        assert!(matches!(err, Nip98Error::TimestampExpired { .. }));
    }

    // ── Edge cases ─────────────────────────────────────────────────────

    #[test]
    fn nip98_url_trailing_slash_normalization() {
        let sk = test_secret_key();
        let url_with_slash = "https://api.example.com/path/";
        let url_without_slash = "https://api.example.com/path";

        let token = create_token(&sk, url_with_slash, "GET", None).unwrap();
        let header = authorization_header(&token);

        // Should succeed: trailing slash is normalized away
        let result = verify_token(&header, url_without_slash, "GET", None).unwrap();
        assert_eq!(result.url, url_with_slash);
    }

    #[test]
    fn nip98_method_case_insensitive() {
        let sk = test_secret_key();
        let url = "https://api.example.com/test";

        let token = create_token(&sk, url, "post", None).unwrap();
        let header = authorization_header(&token);

        // Should succeed: method comparison is case-insensitive
        let result = verify_token(&header, url, "POST", None).unwrap();
        assert_eq!(result.method, "post");
    }

    #[test]
    fn nip98_empty_body_no_payload_tag_required() {
        let sk = test_secret_key();
        let url = "https://api.example.com/get";

        let token = create_token(&sk, url, "GET", None).unwrap();
        let header = authorization_header(&token);

        // No body on verify side either — should pass
        let result = verify_token(&header, url, "GET", None).unwrap();
        assert!(result.payload_hash.is_none());
    }

    #[test]
    fn nip98_authorization_header_format() {
        let token = "abc123";
        let header = authorization_header(token);
        assert_eq!(header, "Nostr abc123");
    }
}
