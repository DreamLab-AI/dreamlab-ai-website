//! NIP-98 admin verification for the relay worker.
//!
//! Verifies the `Authorization: Nostr <base64(event)>` header using
//! `nostr_core::verify_nip98_token_at`, then checks whether the authenticated
//! pubkey holds admin privileges via the `ADMIN_PUBKEYS` env var.

use nostr_core::nip98::{Nip98Error, Nip98Token};
use worker::Env;

// ---------------------------------------------------------------------------
// NIP-98 verification
// ---------------------------------------------------------------------------

/// Verify a NIP-98 `Authorization` header.
///
/// Uses `js_sys::Date::now()` for the current timestamp since
/// `std::time::SystemTime` is unavailable in the Workers WASM runtime.
pub fn verify_nip98(
    auth_header: &str,
    expected_url: &str,
    expected_method: &str,
    body: Option<&[u8]>,
) -> Result<Nip98Token, Nip98Error> {
    let now = js_now_secs();
    nostr_core::verify_nip98_token_at(auth_header, expected_url, expected_method, body, now)
}

/// Get the current Unix timestamp in seconds from the JS runtime.
pub fn js_now_secs() -> u64 {
    (js_sys::Date::now() / 1000.0) as u64
}

// ---------------------------------------------------------------------------
// Admin checks
// ---------------------------------------------------------------------------

/// Return the list of admin pubkeys from the `ADMIN_PUBKEYS` environment variable.
pub fn admin_pubkeys(env: &Env) -> Vec<String> {
    env.var("ADMIN_PUBKEYS")
        .map(|v| v.to_string())
        .unwrap_or_default()
        .split(',')
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
        .collect()
}

/// Check whether a pubkey is listed in the `ADMIN_PUBKEYS` environment variable.
pub fn is_admin_by_env(pubkey: &str, env: &Env) -> bool {
    admin_pubkeys(env).iter().any(|k| k == pubkey)
}

/// Check whether a pubkey is an admin (env var only).
pub async fn is_admin(pubkey: &str, env: &Env) -> bool {
    is_admin_by_env(pubkey, env)
}

/// Verify NIP-98 auth and assert the authenticated pubkey is an admin.
///
/// Returns `Ok(pubkey_hex)` on success, or an error tuple `(json_body, status_code)`
/// suitable for building an error response.
pub async fn require_nip98_admin(
    auth_header: Option<&str>,
    request_url: &str,
    method: &str,
    body: Option<&[u8]>,
    env: &Env,
) -> Result<String, (serde_json::Value, u16)> {
    let auth = auth_header.ok_or_else(|| {
        (
            serde_json::json!({ "error": "NIP-98 authentication required" }),
            401u16,
        )
    })?;

    let token = verify_nip98(auth, request_url, method, body).map_err(|_| {
        (
            serde_json::json!({ "error": "Invalid NIP-98 token" }),
            401u16,
        )
    })?;

    if !is_admin(&token.pubkey, env).await {
        return Err((serde_json::json!({ "error": "Not authorized" }), 403));
    }

    Ok(token.pubkey)
}
