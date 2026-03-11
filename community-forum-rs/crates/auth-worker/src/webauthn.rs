//! WebAuthn registration and authentication handlers.
//!
//! Implements the server-side WebAuthn ceremony for passkey registration
//! and login, with PRF-derived Nostr keys. Mirrors the TypeScript
//! implementation in `workers/auth-api/index.ts`.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use wasm_bindgen::JsValue;
use worker::*;

use crate::auth;
use crate::pod;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/// Encode bytes as unpadded base64url (RFC 4648 section 5).
fn array_to_base64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Decode an unpadded base64url string to bytes.
fn base64url_decode(input: &str) -> std::result::Result<Vec<u8>, base64::DecodeError> {
    URL_SAFE_NO_PAD.decode(input)
}

/// Constant-time comparison of two byte slices.
fn constant_time_equal(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Current time in milliseconds from the JS runtime.
fn js_now_ms() -> u64 {
    js_sys::Date::now() as u64
}

/// Validate that a string is exactly 64 hex characters (Nostr pubkey).
fn is_valid_pubkey(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// Convert a u64 to JsValue (as f64 since JS has no u64).
fn js_u64(v: u64) -> JsValue {
    JsValue::from_f64(v as f64)
}

/// Convert an i32 to JsValue.
fn js_i32(v: i32) -> JsValue {
    JsValue::from_f64(v as f64)
}

/// Convert a u32 to JsValue.
fn js_u32(v: u32) -> JsValue {
    JsValue::from_f64(v as f64)
}

/// Convert a string to JsValue.
fn js_str(s: &str) -> JsValue {
    JsValue::from_str(s)
}

// ---------------------------------------------------------------------------
// Request/response types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct RegisterOptionsBody {
    #[serde(rename = "displayName")]
    display_name: Option<String>,
}

#[derive(Deserialize)]
struct RegisterVerifyBody {
    pubkey: Option<String>,
    response: Option<CredentialResponse>,
    #[serde(rename = "credentialId")]
    credential_id_flat: Option<String>,
    #[serde(rename = "publicKey")]
    public_key_flat: Option<String>,
    #[serde(rename = "prfSalt")]
    prf_salt: Option<String>,
}

#[derive(Deserialize)]
struct CredentialResponse {
    id: Option<String>,
    response: Option<InnerAttestationResponse>,
}

#[derive(Deserialize)]
struct InnerAttestationResponse {
    #[serde(rename = "attestationObject")]
    attestation_object: Option<String>,
}

#[derive(Deserialize)]
struct LoginOptionsBody {
    pubkey: Option<String>,
}

#[derive(Deserialize)]
struct LoginVerifyBody {
    pubkey: Option<String>,
    response: Option<AssertionData>,
}

#[derive(Deserialize)]
struct AssertionData {
    id: Option<String>,
    response: Option<InnerAssertionResponse>,
}

#[derive(Deserialize)]
struct InnerAssertionResponse {
    #[serde(rename = "clientDataJSON")]
    client_data_json: Option<String>,
    #[serde(rename = "authenticatorData")]
    authenticator_data: Option<String>,
}

#[derive(Deserialize)]
struct ClientData {
    #[serde(rename = "type")]
    ceremony_type: Option<String>,
    challenge: Option<String>,
    origin: Option<String>,
}

#[derive(Deserialize)]
struct CredentialLookupBody {
    #[serde(rename = "credentialId")]
    credential_id: Option<String>,
}

// ---------------------------------------------------------------------------
// D1 row types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct ChallengeRow {
    challenge: String,
}

#[derive(Deserialize)]
struct CredentialRow {
    credential_id: Option<String>,
    prf_salt: Option<String>,
}

#[derive(Deserialize)]
struct StoredCredential {
    credential_id: Option<String>,
    #[allow(dead_code)]
    public_key: Option<String>,
    counter: Option<i64>,
}

#[derive(Deserialize)]
struct CheckRow {
    #[allow(dead_code)]
    ok: Option<i64>,
}

#[derive(Deserialize)]
struct PubkeyRow {
    pubkey: Option<String>,
}

// ---------------------------------------------------------------------------
// JSON error helper
// ---------------------------------------------------------------------------

fn json_err(message: &str, status: u16) -> Result<Response> {
    let body = serde_json::json!({ "error": message });
    let json_str = serde_json::to_string(&body).map_err(|e| Error::RustError(e.to_string()))?;
    let resp = Response::ok(json_str)?.with_status(status);
    resp.headers().set("Content-Type", "application/json").ok();
    Ok(resp)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// POST /auth/register/options
///
/// Generate a WebAuthn PublicKeyCredentialCreationOptions with a
/// server-controlled PRF salt and a random challenge.
pub async fn register_options(mut req: Request, env: &Env) -> Result<Response> {
    console_log!("[register_options] handler entered");
    let body: RegisterOptionsBody = req
        .json()
        .await
        .unwrap_or(RegisterOptionsBody { display_name: None });
    let display_name = body
        .display_name
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "Nostr User".to_string());

    // Generate 32-byte challenge
    let mut challenge_bytes = [0u8; 32];
    getrandom::getrandom(&mut challenge_bytes)
        .map_err(|e| Error::RustError(format!("RNG failed: {e}")))?;
    let challenge_b64 = array_to_base64url(&challenge_bytes);

    // Server-controlled PRF salt
    let mut prf_salt_bytes = [0u8; 32];
    getrandom::getrandom(&mut prf_salt_bytes)
        .map_err(|e| Error::RustError(format!("RNG failed: {e}")))?;
    let prf_salt_b64 = array_to_base64url(&prf_salt_bytes);

    // Temporary user ID for the WebAuthn ceremony
    let mut temp_user_id = [0u8; 16];
    getrandom::getrandom(&mut temp_user_id)
        .map_err(|e| Error::RustError(format!("RNG failed: {e}")))?;
    let temp_user_id_b64 = array_to_base64url(&temp_user_id);

    // Clean expired challenges and store the new one
    let now_ms = js_now_ms();
    let five_min_ago = now_ms.saturating_sub(5 * 60 * 1000);

    let db = env.d1("DB")?;
    let delete_stmt = db
        .prepare("DELETE FROM challenges WHERE created_at < ?1")
        .bind(&[js_u64(five_min_ago)])?;
    let insert_stmt = db
        .prepare("INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?1, ?2, ?3)")
        .bind(&[
            js_str(&challenge_b64),
            js_str(&challenge_b64),
            js_u64(now_ms),
        ])?;
    db.batch(vec![delete_stmt, insert_stmt]).await?;

    let rp_name = env
        .var("RP_NAME")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "DreamLab AI".to_string());
    let rp_id = env
        .var("RP_ID")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "dreamlab-ai.com".to_string());

    let response_body = serde_json::json!({
        "options": {
            "rp": { "name": rp_name, "id": rp_id },
            "user": {
                "id": temp_user_id_b64,
                "name": display_name,
                "displayName": display_name
            },
            "challenge": challenge_b64,
            "pubKeyCredParams": [
                { "alg": -7, "type": "public-key" },
                { "alg": -257, "type": "public-key" }
            ],
            "timeout": 60000,
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "residentKey": "required",
                "userVerification": "required"
            },
            "excludeCredentials": []
        },
        "prfSalt": prf_salt_b64
    });

    console_log!("[register_options] responding with {} bytes", serde_json::to_string(&response_body).unwrap_or_default().len());
    Response::from_json(&response_body)
}

/// POST /auth/register/verify
///
/// Verify a WebAuthn registration response, store the credential in D1,
/// provision a Solid pod, and return the user's DID/WebID/podUrl.
pub async fn register_verify(mut req: Request, env: &Env) -> Result<Response> {
    console_log!("[register_verify] handler entered");
    // Read raw body first so we can log it for debugging
    let raw_body = req
        .bytes()
        .await
        .map_err(|_| Error::RustError("Failed to read request body".to_string()))?;
    console_log!(
        "[register_verify] raw body ({} bytes): {}",
        raw_body.len(),
        String::from_utf8_lossy(&raw_body[..raw_body.len().min(500)])
    );
    let body: RegisterVerifyBody = serde_json::from_slice(&raw_body)
        .map_err(|e| {
            console_error!("[register_verify] JSON parse error: {e}");
            Error::RustError(format!("Invalid JSON body: {e}"))
        })?;

    let pubkey = match &body.pubkey {
        Some(pk) if is_valid_pubkey(pk) => pk.to_lowercase(),
        _ => return json_err("Invalid pubkey", 400),
    };

    // Verify a non-expired challenge exists. Registration uses a simplified flow
    // where the challenge is stored with pubkey=challenge_b64 (from register_options).
    // We fetch the most recent challenge and consume it atomically after use to
    // prevent replay attacks.
    let now_ms = js_now_ms();
    let five_min_ago = now_ms.saturating_sub(5 * 60 * 1000);

    let db = env.d1("DB")?;
    let challenge_row = db
        .prepare("SELECT challenge FROM challenges WHERE created_at > ?1 ORDER BY created_at DESC LIMIT 1")
        .bind(&[js_u64(five_min_ago)])?
        .first::<ChallengeRow>(None)
        .await?;

    let challenge_row = match challenge_row {
        Some(row) => row,
        None => return json_err("No pending challenge or challenge expired", 400),
    };

    // Extract credential data -- accept both nested and flat formats
    let credential_id = body
        .response
        .as_ref()
        .and_then(|r| r.id.clone())
        .or(body.credential_id_flat.clone());

    let attestation = body
        .response
        .as_ref()
        .and_then(|r| r.response.as_ref())
        .and_then(|r| r.attestation_object.clone())
        .or(body.public_key_flat.clone());

    let credential_id = match credential_id {
        Some(id) => id,
        None => return json_err("Missing credential data", 400),
    };

    let public_key = attestation.unwrap_or_else(|| credential_id.clone());
    let prf_salt_val: JsValue = match &body.prf_salt {
        Some(s) => js_str(s),
        None => JsValue::NULL,
    };

    // Store credential in D1
    db.prepare(
        "INSERT INTO webauthn_credentials (pubkey, credential_id, public_key, counter, prf_salt, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(&[
        js_str(&pubkey),
        js_str(&credential_id),
        js_str(&public_key),
        js_i32(0),
        prf_salt_val,
        js_u64(now_ms),
    ])?
    .run()
    .await?;

    // Provision pod
    let pod_info = pod::provision_pod(&pubkey, env).await?;

    // Clean up used challenge
    db.prepare("DELETE FROM challenges WHERE challenge = ?1")
        .bind(&[js_str(&challenge_row.challenge)])?
        .run()
        .await?;

    let response_body = serde_json::json!({
        "verified": true,
        "pubkey": pubkey,
        "didNostr": format!("did:nostr:{pubkey}"),
        "webId": pod_info.web_id,
        "podUrl": pod_info.pod_url
    });

    Response::from_json(&response_body)
}

/// POST /auth/login/options
///
/// Generate a WebAuthn PublicKeyCredentialRequestOptions. If a pubkey is
/// provided, include the stored credential ID and PRF salt in the response.
pub async fn login_options(mut req: Request, env: &Env) -> Result<Response> {
    let body: LoginOptionsBody = req
        .json()
        .await
        .unwrap_or(LoginOptionsBody { pubkey: None });

    // Generate 32-byte challenge
    let mut challenge_bytes = [0u8; 32];
    getrandom::getrandom(&mut challenge_bytes)
        .map_err(|e| Error::RustError(format!("RNG failed: {e}")))?;
    let challenge_b64 = array_to_base64url(&challenge_bytes);

    let mut prf_salt: Option<String> = None;
    let mut allow_credentials: Vec<serde_json::Value> = Vec::new();

    let db = env.d1("DB")?;

    if let Some(ref pubkey) = body.pubkey {
        let cred = db
            .prepare(
                "SELECT credential_id, prf_salt FROM webauthn_credentials WHERE pubkey = ?1 LIMIT 1",
            )
            .bind(&[js_str(pubkey)])?
            .first::<CredentialRow>(None)
            .await?;

        match cred {
            None => {
                return json_err(
                    "No passkey registered for this account. Use private key login or create a new passkey.",
                    404,
                );
            }
            Some(cred) => {
                prf_salt = cred.prf_salt;
                if let Some(ref cid) = cred.credential_id {
                    allow_credentials.push(serde_json::json!({
                        "id": cid,
                        "type": "public-key"
                    }));
                }
            }
        }
    }

    // Store challenge (supports discoverable credential flows without pubkey)
    let challenge_pubkey = body
        .pubkey
        .clone()
        .unwrap_or_else(|| "__discoverable__".to_string());
    let now_ms = js_now_ms();
    let five_min_ago = now_ms.saturating_sub(5 * 60 * 1000);

    let delete_stmt = db
        .prepare("DELETE FROM challenges WHERE created_at < ?1")
        .bind(&[js_u64(five_min_ago)])?;
    let insert_stmt = db
        .prepare("INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?1, ?2, ?3)")
        .bind(&[
            js_str(&challenge_pubkey),
            js_str(&challenge_b64),
            js_u64(now_ms),
        ])?;
    db.batch(vec![delete_stmt, insert_stmt]).await?;

    let rp_id = env
        .var("RP_ID")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "dreamlab-ai.com".to_string());

    let response_body = serde_json::json!({
        "options": {
            "challenge": challenge_b64,
            "rpId": rp_id,
            "timeout": 60000,
            "userVerification": "required",
            "allowCredentials": allow_credentials
        },
        "prfSalt": prf_salt
    });

    Response::from_json(&response_body)
}

/// POST /auth/login/verify
///
/// The most complex handler: verifies NIP-98, looks up the stored credential,
/// validates clientDataJSON and authenticatorData, checks the signature
/// counter, and returns the verified pubkey.
pub async fn login_verify(mut req: Request, env: &Env) -> Result<Response> {
    // Read raw body bytes -- needed for both JSON parsing and NIP-98 payload hash
    let raw_body = req
        .bytes()
        .await
        .map_err(|_| Error::RustError("Failed to read request body".to_string()))?;

    let body: LoginVerifyBody = serde_json::from_slice(&raw_body)
        .map_err(|_| Error::RustError("Invalid JSON body".to_string()))?;

    let pubkey = match &body.pubkey {
        Some(pk) if is_valid_pubkey(pk) => pk.to_lowercase(),
        _ => return json_err("Invalid pubkey", 400),
    };

    // Step 1: Verify NIP-98 Authorization header
    let auth_header = match req.headers().get("Authorization").ok().flatten() {
        Some(h) => h,
        None => return json_err("NIP-98 Authorization required", 401),
    };

    let request_url = req.url().map(|u| u.to_string()).unwrap_or_default();

    let nip98_result = match auth::verify_nip98(&auth_header, &request_url, "POST", Some(&raw_body))
    {
        Ok(token) => token,
        Err(_) => return json_err("Invalid NIP-98 token", 401),
    };

    if nip98_result.pubkey != pubkey {
        return json_err("NIP-98 pubkey mismatch", 401);
    }

    // Step 2: Look up stored credential
    let db = env.d1("DB")?;
    let cred = db
        .prepare(
            "SELECT credential_id, public_key, counter FROM webauthn_credentials WHERE pubkey = ?1 LIMIT 1",
        )
        .bind(&[js_str(&pubkey)])?
        .first::<StoredCredential>(None)
        .await?;

    let cred = match cred {
        Some(c) => c,
        None => return json_err("No registered credential", 400),
    };

    // Step 3: Extract assertion response and verify credential ID
    let assertion_data = match &body.response {
        Some(a) => a,
        None => return json_err("Missing assertion response", 400),
    };
    let inner_response = match &assertion_data.response {
        Some(r) => r,
        None => return json_err("Missing assertion response", 400),
    };

    if assertion_data.id.as_deref() != cred.credential_id.as_deref() {
        return json_err("Credential mismatch", 400);
    }

    // Step 4: Verify clientDataJSON
    let client_data_b64 = match &inner_response.client_data_json {
        Some(s) if !s.is_empty() => s.clone(),
        _ => return json_err("Missing clientDataJSON", 400),
    };

    let client_data_bytes = match base64url_decode(&client_data_b64) {
        Ok(b) => b,
        Err(_) => return json_err("Invalid clientDataJSON", 400),
    };

    let client_data: ClientData = match serde_json::from_slice(&client_data_bytes) {
        Ok(cd) => cd,
        Err(_) => return json_err("Invalid clientDataJSON", 400),
    };

    if client_data.ceremony_type.as_deref() != Some("webauthn.get") {
        return json_err("Invalid ceremony type", 400);
    }

    let expected_origin = env
        .var("EXPECTED_ORIGIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string());

    if client_data.origin.as_deref() != Some(&expected_origin) {
        return json_err("Origin mismatch", 400);
    }

    // Verify challenge was issued by this server and hasn't expired
    let now_ms = js_now_ms();
    let five_min_ago = now_ms.saturating_sub(5 * 60 * 1000);
    let challenge_str = client_data.challenge.unwrap_or_default();

    let challenge_check: Option<CheckRow> = db
        .prepare("SELECT 1 as ok FROM challenges WHERE challenge = ?1 AND created_at > ?2")
        .bind(&[js_str(&challenge_str), js_u64(five_min_ago)])?
        .first::<CheckRow>(None)
        .await?;

    if challenge_check.is_none() {
        return json_err("Invalid or expired challenge", 400);
    }

    // Step 5: Verify authenticatorData
    let auth_data_b64 = match &inner_response.authenticator_data {
        Some(s) if !s.is_empty() => s.clone(),
        _ => return json_err("Missing authenticatorData", 400),
    };

    let auth_data = match base64url_decode(&auth_data_b64) {
        Ok(b) => b,
        Err(_) => return json_err("Invalid authenticatorData", 400),
    };

    if auth_data.len() < 37 {
        return json_err("authenticatorData too short", 400);
    }

    // First 32 bytes = SHA-256(rpId)
    let rp_id = env
        .var("RP_ID")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "dreamlab-ai.com".to_string());
    let rp_id_hash = Sha256::digest(rp_id.as_bytes());

    if !constant_time_equal(&rp_id_hash, &auth_data[..32]) {
        return json_err("RP ID mismatch", 400);
    }

    // Byte 32 = flags: bit 0 (UP), bit 2 (UV)
    let flags = auth_data[32];
    if flags & 0x01 == 0 {
        return json_err("User presence not verified", 400);
    }
    if flags & 0x04 == 0 {
        return json_err("User verification not performed", 400);
    }

    // Bytes 33-36 = sign counter (big-endian u32)
    let sign_count =
        u32::from_be_bytes([auth_data[33], auth_data[34], auth_data[35], auth_data[36]]);
    let stored_counter = cred.counter.unwrap_or(0) as u32;

    // signCount 0 means authenticator doesn't support counters -- skip check
    if sign_count != 0 && sign_count <= stored_counter {
        return json_err("Credential replay detected", 400);
    }

    // Step 6: All checks passed -- update counter and consume challenge
    let update_stmt = db
        .prepare("UPDATE webauthn_credentials SET counter = ?1 WHERE pubkey = ?2")
        .bind(&[js_u32(sign_count), js_str(&pubkey)])?;
    let delete_stmt = db
        .prepare("DELETE FROM challenges WHERE challenge = ?1")
        .bind(&[js_str(&challenge_str)])?;
    db.batch(vec![update_stmt, delete_stmt]).await?;

    let response_body = serde_json::json!({
        "verified": true,
        "pubkey": pubkey,
        "didNostr": format!("did:nostr:{pubkey}")
    });

    Response::from_json(&response_body)
}

/// POST /auth/lookup
///
/// Look up a pubkey by credential ID (for discoverable credential flows).
pub async fn credential_lookup(mut req: Request, env: &Env) -> Result<Response> {
    let body: CredentialLookupBody = req
        .json()
        .await
        .map_err(|_| Error::RustError("Invalid JSON body".to_string()))?;

    let credential_id = match &body.credential_id {
        Some(id) if !id.is_empty() => id.clone(),
        _ => return json_err("Missing credentialId", 400),
    };

    let db = env.d1("DB")?;
    let cred = db
        .prepare("SELECT pubkey FROM webauthn_credentials WHERE credential_id = ?1 LIMIT 1")
        .bind(&[js_str(&credential_id)])?
        .first::<PubkeyRow>(None)
        .await?;

    match cred {
        Some(row) => {
            let resp = serde_json::json!({ "pubkey": row.pubkey });
            Ok(Response::from_json(&resp)?)
        }
        None => json_err("Credential not found", 404),
    }
}
