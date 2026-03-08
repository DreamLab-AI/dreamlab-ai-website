//! DreamLab pod-api Worker (Rust)
//!
//! Per-user Solid pod storage backed by R2 + KV, with NIP-98 authentication
//! and WAC (Web Access Control) enforcement.
//!
//! Port of `workers/pod-api/index.ts`.

mod acl;
mod auth;

use acl::{evaluate_access, method_to_mode, AclDocument};
use worker::*;

/// Maximum request body size: 50 MB.
const MAX_BODY_SIZE: u64 = 50 * 1024 * 1024;

/// Regex-equivalent pattern for pod routes: `/pods/{64 hex chars}{optional path}`.
/// We parse manually instead of pulling in `regex` to keep the WASM binary small.
fn parse_pod_route(path: &str) -> Option<(&str, &str)> {
    let rest = path.strip_prefix("/pods/")?;
    if rest.len() < 64 {
        return None;
    }
    let (pubkey, remainder) = rest.split_at(64);
    // Validate hex characters
    if !pubkey.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }
    // Remainder must be empty or start with '/'
    if !remainder.is_empty() && !remainder.starts_with('/') {
        return None;
    }
    let resource_path = if remainder.is_empty() { "/" } else { remainder };
    Some((pubkey, resource_path))
}

/// Map a `worker::Method` enum to its string name.
fn method_str(m: &Method) -> &'static str {
    match m {
        Method::Get => "GET",
        Method::Head => "HEAD",
        Method::Post => "POST",
        Method::Put => "PUT",
        Method::Delete => "DELETE",
        Method::Options => "OPTIONS",
        Method::Patch => "PATCH",
        Method::Connect => "CONNECT",
        Method::Trace => "TRACE",
        _ => "GET",
    }
}

/// Build CORS headers from the `EXPECTED_ORIGIN` env var.
fn cors_headers(env: &Env) -> Headers {
    let origin = env
        .var("EXPECTED_ORIGIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string());

    let headers = Headers::new();
    headers.set("Access-Control-Allow-Origin", &origin).ok();
    headers
        .set(
            "Access-Control-Allow-Methods",
            "GET, PUT, POST, DELETE, HEAD, OPTIONS",
        )
        .ok();
    headers
        .set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .ok();
    headers.set("Access-Control-Max-Age", "86400").ok();
    headers
}

/// Create a JSON error response with CORS headers.
fn json_error(env: &Env, message: &str, status: u16) -> Result<Response> {
    let body = serde_json::json!({ "error": message });
    let json_str = serde_json::to_string(&body).map_err(|e| Error::RustError(e.to_string()))?;
    let cors = cors_headers(env);
    let resp = Response::ok(json_str)?
        .with_status(status)
        .with_headers(cors);
    resp.headers().set("Content-Type", "application/json").ok();
    Ok(resp)
}

/// Create a JSON success response with CORS headers.
fn json_ok(env: &Env, body: &serde_json::Value, status: u16) -> Result<Response> {
    let json_str = serde_json::to_string(body).map_err(|e| Error::RustError(e.to_string()))?;
    let cors = cors_headers(env);
    let resp = Response::ok(json_str)?
        .with_status(status)
        .with_headers(cors);
    resp.headers().set("Content-Type", "application/json").ok();
    Ok(resp)
}

#[event(fetch)]
async fn fetch(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // CORS preflight
    if req.method() == Method::Options {
        return Ok(Response::empty()?.with_status(204).with_headers(cors_headers(&env)));
    }

    let url = req.url()?;
    let path = url.path();

    // Health check
    if path == "/health" {
        return json_ok(
            &env,
            &serde_json::json!({ "status": "ok", "service": "pod-api" }),
            200,
        );
    }

    // Route: /pods/{pubkey}/...
    let (owner_pubkey, resource_path) = match parse_pod_route(path) {
        Some(parsed) => parsed,
        None => return json_error(&env, "Not found", 404),
    };

    // We need owned copies before we borrow `req` mutably for the body
    let owner_pubkey = owner_pubkey.to_string();
    let resource_path = resource_path.to_string();
    let method = req.method();
    let auth_header = req.headers().get("Authorization").ok().flatten();
    let content_type = req
        .headers()
        .get("Content-Type")
        .ok()
        .flatten()
        .unwrap_or_else(|| "application/octet-stream".to_string());
    let content_length: u64 = req
        .headers()
        .get("Content-Length")
        .ok()
        .flatten()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    // Read body early so we can use it for both NIP-98 payload verification and R2 upload
    let body_bytes: Option<Vec<u8>> = match method {
        Method::Put | Method::Post => req.bytes().await.ok(),
        _ => None,
    };

    // Authenticate via NIP-98
    let expected_origin = env
        .var("EXPECTED_ORIGIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string());
    let request_url = format!("{expected_origin}{path}");

    let requester_pubkey: Option<String> = if let Some(ref header) = auth_header {
        let method_name = method_str(&method);
        let body_ref = body_bytes.as_deref();
        match auth::verify_nip98(header, &request_url, method_name, body_ref) {
            Ok(token) => Some(token.pubkey),
            Err(_) => None,
        }
    } else {
        None
    };

    // ACL check
    let required_mode = method_to_mode(method_str(&method));

    let kv = env.kv("POD_META")?;
    let acl_key = format!("acl:{owner_pubkey}");
    let acl_doc: Option<AclDocument> = match kv.get(&acl_key).text().await? {
        Some(text) => serde_json::from_str(&text).ok(),
        None => None,
    };

    let agent_uri = requester_pubkey
        .as_ref()
        .map(|pk| format!("did:nostr:{pk}"));

    let has_access = evaluate_access(
        acl_doc.as_ref(),
        agent_uri.as_deref(),
        &resource_path,
        required_mode,
    );

    if !has_access {
        return if requester_pubkey.is_some() {
            json_error(&env, "Forbidden", 403)
        } else {
            json_error(&env, "Authentication required", 401)
        };
    }

    // R2 operations
    let r2_key = format!("pods/{owner_pubkey}{resource_path}");
    let bucket = env.bucket("PODS")?;

    match method {
        Method::Get | Method::Head => {
            let object = match bucket.get(&r2_key).execute().await? {
                Some(obj) => obj,
                None => return json_error(&env, "Not found", 404),
            };

            let obj_content_type = object
                .http_metadata()
                .content_type
                .unwrap_or_else(|| "application/octet-stream".to_string());
            let etag = object.etag();

            let cors = cors_headers(&env);

            if method == Method::Head {
                let resp = Response::empty()?.with_headers(cors);
                resp.headers()
                    .set("Content-Type", &obj_content_type)
                    .ok();
                resp.headers().set("ETag", &etag).ok();
                return Ok(resp);
            }

            let body = object.body().ok_or_else(|| {
                Error::RustError("R2 object has no body".to_string())
            })?;
            let bytes = body.bytes().await?;
            let resp = Response::from_bytes(bytes)?.with_headers(cors);
            resp.headers()
                .set("Content-Type", &obj_content_type)
                .ok();
            resp.headers().set("ETag", &etag).ok();
            Ok(resp)
        }

        Method::Put | Method::Post => {
            if content_length > MAX_BODY_SIZE {
                return json_error(
                    &env,
                    &format!("Body exceeds {} byte limit", MAX_BODY_SIZE),
                    413,
                );
            }

            let data = body_bytes.unwrap_or_default();
            if data.len() as u64 > MAX_BODY_SIZE {
                return json_error(
                    &env,
                    &format!("Body exceeds {} byte limit", MAX_BODY_SIZE),
                    413,
                );
            }

            bucket
                .put(&r2_key, data)
                .http_metadata(HttpMetadata {
                    content_type: Some(content_type),
                    ..Default::default()
                })
                .execute()
                .await?;

            json_ok(
                &env,
                &serde_json::json!({ "status": "ok" }),
                201,
            )
        }

        Method::Delete => {
            bucket.delete(&r2_key).await?;
            json_ok(
                &env,
                &serde_json::json!({ "status": "deleted" }),
                200,
            )
        }

        _ => json_error(&env, "Method not allowed", 405),
    }
}

// ---------------------------------------------------------------------------
// Unit tests (route parsing only -- full integration requires wasm-bindgen)
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_pod_route_valid() {
        let pubkey = "a".repeat(64);
        let path = format!("/pods/{pubkey}/profile/card");
        let (pk, rp) = parse_pod_route(&path).unwrap();
        assert_eq!(pk, pubkey);
        assert_eq!(rp, "/profile/card");
    }

    #[test]
    fn parse_pod_route_root() {
        let pubkey = "b".repeat(64);
        let path = format!("/pods/{pubkey}");
        let (pk, rp) = parse_pod_route(&path).unwrap();
        assert_eq!(pk, pubkey);
        assert_eq!(rp, "/");
    }

    #[test]
    fn parse_pod_route_with_trailing_slash() {
        let pubkey = "c".repeat(64);
        let path = format!("/pods/{pubkey}/");
        let (pk, rp) = parse_pod_route(&path).unwrap();
        assert_eq!(pk, pubkey);
        assert_eq!(rp, "/");
    }

    #[test]
    fn parse_pod_route_invalid_hex() {
        let path = format!("/pods/{}/file", "x".repeat(64));
        assert!(parse_pod_route(&path).is_none());
    }

    #[test]
    fn parse_pod_route_short_pubkey() {
        assert!(parse_pod_route("/pods/abc/file").is_none());
    }

    #[test]
    fn parse_pod_route_wrong_prefix() {
        assert!(parse_pod_route("/api/something").is_none());
    }

    #[test]
    fn parse_pod_route_no_slash_after_pubkey() {
        let pubkey = "d".repeat(64);
        // Extra chars after pubkey without a slash separator
        let path = format!("/pods/{pubkey}extra");
        assert!(parse_pod_route(&path).is_none());
    }
}
