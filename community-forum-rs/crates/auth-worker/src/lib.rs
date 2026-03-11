//! DreamLab auth-api Worker (Rust)
//!
//! WebAuthn registration/authentication + NIP-98 verification + pod provisioning.
//! Port of `workers/auth-api/index.ts` (510 lines).
//!
//! ## Architecture
//!
//! - `lib.rs` -- Router, CORS, entry point
//! - `webauthn.rs` -- WebAuthn registration + authentication handlers
//! - `pod.rs` -- Pod provisioning and profile retrieval
//! - `auth.rs` -- NIP-98 verification wrapper

mod auth;
mod pod;
mod webauthn;

use worker::*;

/// Build CORS headers from the `EXPECTED_ORIGIN` env var.
fn cors_headers(env: &Env) -> Headers {
    let origin = env
        .var("EXPECTED_ORIGIN")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string());

    let headers = Headers::new();
    headers.set("Access-Control-Allow-Origin", &origin).ok();
    headers
        .set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .ok();
    headers
        .set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization",
        )
        .ok();
    headers.set("Access-Control-Max-Age", "86400").ok();
    headers
}

/// Create a JSON response with CORS headers.
fn json_response(env: &Env, body: &serde_json::Value, status: u16) -> Result<Response> {
    let json_str = serde_json::to_string(body).map_err(|e| Error::RustError(e.to_string()))?;
    let cors = cors_headers(env);
    let resp = Response::ok(json_str)?
        .with_status(status)
        .with_headers(cors);
    resp.headers().set("Content-Type", "application/json").ok();
    Ok(resp)
}

/// Attach CORS headers to an existing response.
fn with_cors(resp: Response, env: &Env) -> Response {
    let cors = cors_headers(env);
    resp.with_headers(cors)
}

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // CORS preflight
    if req.method() == Method::Options {
        return Ok(Response::empty()?
            .with_status(204)
            .with_headers(cors_headers(&env)));
    }

    let url = req.url()?;
    let path = url.path();
    let method = req.method();

    let result = route(req, &env, path, &method).await;

    match result {
        Ok(resp) => Ok(with_cors(resp, &env)),
        Err(e) => {
            console_error!("Worker error: {e}");
            let msg = e.to_string();
            // Catch JSON parse errors and serde deserialization errors
            if msg.contains("JSON")
                || msg.contains("json")
                || msg.contains("Serialization")
                || msg.contains("missing field")
                || msg.contains("parsing")
            {
                json_response(
                    &env,
                    &serde_json::json!({ "error": "Invalid request body" }),
                    400,
                )
            } else {
                json_response(
                    &env,
                    &serde_json::json!({ "error": "Internal server error" }),
                    500,
                )
            }
        }
    }
}

/// Route an incoming request to the appropriate handler.
async fn route(req: Request, env: &Env, path: &str, method: &Method) -> Result<Response> {
    // Health check
    if path == "/health" {
        return json_response(
            env,
            &serde_json::json!({
                "status": "ok",
                "service": "auth-api",
                "runtime": "workers-rs"
            }),
            200,
        );
    }

    // WebAuthn Registration -- Generate options
    if path == "/auth/register/options" && *method == Method::Post {
        return webauthn::register_options(req, env).await;
    }

    // WebAuthn Registration -- Verify
    if path == "/auth/register/verify" && *method == Method::Post {
        return webauthn::register_verify(req, env).await;
    }

    // WebAuthn Authentication -- Generate options
    if path == "/auth/login/options" && *method == Method::Post {
        return webauthn::login_options(req, env).await;
    }

    // WebAuthn Authentication -- Verify
    if path == "/auth/login/verify" && *method == Method::Post {
        return webauthn::login_verify(req, env).await;
    }

    // Credential lookup (for discoverable login)
    if path == "/auth/lookup" && *method == Method::Post {
        return webauthn::credential_lookup(req, env).await;
    }

    // NIP-98 protected endpoints
    if path.starts_with("/api/") {
        let auth_header = match req.headers().get("Authorization").ok().flatten() {
            Some(h) => h,
            None => {
                return json_response(
                    env,
                    &serde_json::json!({ "error": "Authorization required" }),
                    401,
                )
            }
        };

        let expected_origin = env
            .var("EXPECTED_ORIGIN")
            .map(|v| v.to_string())
            .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string());
        let request_url = format!("{expected_origin}{path}");

        // Body is not available here because the request was already consumed
        // by the route matching above. For GET endpoints (like /api/profile),
        // there is no body to verify. POST/PUT endpoints that need payload hash
        // verification read the body themselves (e.g. login_verify).
        let body_bytes: Option<Vec<u8>> = None;

        let result = auth::verify_nip98(
            &auth_header,
            &request_url,
            method_str(method),
            body_bytes.as_deref(),
        );

        match result {
            Ok(token) => {
                // Route authenticated requests
                if path == "/api/profile" && *method == Method::Get {
                    let cors = cors_headers(env);
                    return pod::handle_profile(&token.pubkey, env, cors).await;
                }
            }
            Err(_) => {
                return json_response(
                    env,
                    &serde_json::json!({ "error": "Invalid NIP-98 token" }),
                    401,
                )
            }
        }
    }

    json_response(env, &serde_json::json!({ "error": "Not found" }), 404)
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

/// Cron keep-warm: prevents cold starts by pinging D1.
#[event(scheduled)]
async fn scheduled(_event: ScheduledEvent, env: Env, _ctx: ScheduleContext) -> () {
    let db = match env.d1("DB") {
        Ok(db) => db,
        Err(_) => return,
    };
    let _ = db
        .prepare("SELECT 1")
        .first::<serde_json::Value>(None)
        .await;
}
