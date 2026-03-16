//! DreamLab Nostr Relay Worker (Rust)
//!
//! Cloudflare Workers-based private Nostr relay with:
//! - WebSocket NIP-01 protocol via Durable Objects
//! - D1-backed event storage + whitelist
//! - NIP-98 authenticated admin endpoints
//! - Whitelist/cohort management API
//! - NIP-11 relay information document
//! - NIP-16/33 replaceable events
//!
//! ## Architecture
//!
//! - `lib.rs` -- HTTP router, CORS, entry point
//! - `relay_do.rs` -- Durable Object: WebSocket relay, NIP-01 message handling
//! - `nip11.rs` -- NIP-11 relay information document
//! - `whitelist.rs` -- Whitelist management HTTP handlers
//! - `auth.rs` -- NIP-98 admin verification wrapper

mod auth;
mod nip11;
mod relay_do;
mod whitelist;

/// Re-export so the `worker` crate runtime can discover the Durable Object.
pub use relay_do::NostrRelayDO;

use worker::*;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/// Build allowed origins list from `ALLOWED_ORIGINS` env var (comma-separated)
/// or fall back to the production domain.
fn allowed_origins(env: &Env) -> Vec<String> {
    env.var("ALLOWED_ORIGINS")
        .map(|v| v.to_string())
        .unwrap_or_else(|_| "https://dreamlab-ai.com".to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .collect()
}

/// Determine the allowed CORS origin for a request.
///
/// If the request's `Origin` header matches one of the allowed origins, that
/// origin is returned. Otherwise falls back to the first allowed origin.
fn cors_origin(req: &Request, env: &Env) -> String {
    let origins = allowed_origins(env);
    let origin = req
        .headers()
        .get("Origin")
        .ok()
        .flatten()
        .unwrap_or_default();
    if origins.iter().any(|o| o == &origin) {
        origin
    } else {
        origins
            .into_iter()
            .next()
            .unwrap_or_else(|| "https://dreamlab-ai.com".to_string())
    }
}

/// Build CORS response headers.
fn cors_headers(req: &Request, env: &Env) -> Headers {
    let headers = Headers::new();
    headers
        .set("Access-Control-Allow-Origin", &cors_origin(req, env))
        .ok();
    headers
        .set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .ok();
    headers
        .set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, Accept",
        )
        .ok();
    headers.set("Access-Control-Max-Age", "86400").ok();
    headers.set("Vary", "Origin").ok();
    headers
}

/// Return the default allowed origin from the env or the production domain.
fn default_origin(env: &Env) -> String {
    allowed_origins(env)
        .into_iter()
        .next()
        .unwrap_or_else(|| "https://dreamlab-ai.com".to_string())
}

/// CORS utilities for submodules that lack direct access to the request.
pub(crate) mod cors {
    use worker::*;

    /// Create a JSON response with CORS headers attached.
    ///
    /// Used by whitelist handlers that receive `&Env` but not the original
    /// `&Request`. The origin is resolved from the env-based allowed origins.
    pub fn json_response(env: &Env, body: &serde_json::Value, status: u16) -> Result<Response> {
        let json_str = serde_json::to_string(body).map_err(|e| Error::RustError(e.to_string()))?;
        let headers = Headers::new();
        headers.set("Content-Type", "application/json").ok();

        let origin = super::default_origin(env);
        headers.set("Access-Control-Allow-Origin", &origin).ok();
        headers
            .set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .ok();
        headers
            .set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization, Accept",
            )
            .ok();
        headers.set("Access-Control-Max-Age", "86400").ok();
        headers.set("Vary", "Origin").ok();

        Ok(Response::ok(json_str)?
            .with_status(status)
            .with_headers(headers))
    }
}

/// Create a JSON response with CORS from the request's Origin header.
fn json_response(
    req: &Request,
    env: &Env,
    body: &serde_json::Value,
    status: u16,
) -> Result<Response> {
    let json_str = serde_json::to_string(body).map_err(|e| Error::RustError(e.to_string()))?;
    let headers = cors_headers(req, env);
    headers.set("Content-Type", "application/json").ok();
    Ok(Response::ok(json_str)?
        .with_status(status)
        .with_headers(headers))
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Ensure the is_admin column exists (idempotent migration)
    ensure_admin_column(&env).await;

    // CORS preflight
    if req.method() == Method::Options {
        return Ok(Response::empty()?
            .with_status(204)
            .with_headers(cors_headers(&req, &env)));
    }

    // WebSocket upgrade -> Durable Object
    if req.headers().get("Upgrade")?.as_deref() == Some("websocket") {
        let stub = env.durable_object("RELAY")?.get_by_name("main")?;
        return stub.fetch_with_request(req).await;
    }

    let url = req.url()?;
    let path = url.path();

    // NIP-11 relay info document
    if path == "/" && accepts_nostr_json(&req) {
        let info = nip11::relay_info(&env);
        let json_str =
            serde_json::to_string(&info).map_err(|e| Error::RustError(e.to_string()))?;
        let headers = Headers::new();
        headers.set("Content-Type", "application/nostr+json").ok();
        headers
            .set("Access-Control-Allow-Origin", &cors_origin(&req, &env))
            .ok();
        headers.set("Vary", "Origin").ok();
        return Ok(Response::ok(json_str)?.with_headers(headers));
    }

    // Route to handlers with error wrapping
    let result = route(req, &env, path).await;
    match result {
        Ok(resp) => Ok(resp),
        Err(e) => {
            console_error!("Relay worker error: {e}");
            let msg = e.to_string();
            let fallback_origin = default_origin(&env);
            if msg.contains("JSON") || msg.contains("json") || msg.contains("Syntax") {
                let headers = Headers::new();
                headers.set("Content-Type", "application/json").ok();
                headers
                    .set("Access-Control-Allow-Origin", &fallback_origin)
                    .ok();
                headers.set("Vary", "Origin").ok();
                Ok(Response::ok(r#"{"error":"Invalid JSON"}"#)?
                    .with_status(400)
                    .with_headers(headers))
            } else {
                let headers = Headers::new();
                headers.set("Content-Type", "application/json").ok();
                headers
                    .set("Access-Control-Allow-Origin", &fallback_origin)
                    .ok();
                headers.set("Vary", "Origin").ok();
                Ok(Response::ok(r#"{"error":"Internal error"}"#)?
                    .with_status(500)
                    .with_headers(headers))
            }
        }
    }
}

/// Route incoming requests to the appropriate handler.
async fn route(req: Request, env: &Env, path: &str) -> Result<Response> {
    let method = req.method();

    // Health check
    if path == "/health" || path == "/" {
        return json_response(
            &req,
            env,
            &serde_json::json!({
                "status": "healthy",
                "version": "3.0.0",
                "runtime": "workers-rs",
                "nips": [1, 9, 11, 16, 29, 33, 40, 42, 45, 50, 98],
            }),
            200,
        );
    }

    // Setup status check (public -- returns whether initial admin setup is needed)
    if path == "/api/setup-status" && method == Method::Get {
        return whitelist::handle_setup_status(&req, env).await;
    }

    // Whitelist check (public)
    if path == "/api/check-whitelist" && method == Method::Get {
        return whitelist::handle_check_whitelist(&req, env).await;
    }

    // Whitelist list (public)
    if path == "/api/whitelist/list" && method == Method::Get {
        return whitelist::handle_whitelist_list(&req, env).await;
    }

    // Whitelist add (NIP-98 admin only)
    if path == "/api/whitelist/add" && method == Method::Post {
        return whitelist::handle_whitelist_add(req, env).await;
    }

    // Whitelist update cohorts (NIP-98 admin only)
    if path == "/api/whitelist/update-cohorts" && method == Method::Post {
        return whitelist::handle_whitelist_update_cohorts(req, env).await;
    }

    // Set admin status (NIP-98 admin only)
    if path == "/api/whitelist/set-admin" && method == Method::Post {
        return whitelist::handle_set_admin(req, env).await;
    }

    // Reset database (NIP-98 admin only)
    if path == "/api/admin/reset-db" && method == Method::Post {
        return whitelist::handle_reset_db(req, env).await;
    }

    json_response(
        &req,
        env,
        &serde_json::json!({ "error": "Not found" }),
        404,
    )
}

/// Idempotent schema migration: add `is_admin` column to the whitelist table.
/// Runs once per request but is a no-op if the column already exists.
async fn ensure_admin_column(env: &Env) {
    if let Ok(db) = env.d1("DB") {
        let _ = db
            .prepare("ALTER TABLE whitelist ADD COLUMN is_admin INTEGER DEFAULT 0")
            .run()
            .await;
    }
}

/// Check whether the request's Accept header includes `application/nostr+json`.
fn accepts_nostr_json(req: &Request) -> bool {
    req.headers()
        .get("Accept")
        .ok()
        .flatten()
        .map(|v| v.contains("application/nostr+json"))
        .unwrap_or(false)
}

// ---------------------------------------------------------------------------
// Cron keep-warm
// ---------------------------------------------------------------------------

/// Cron handler: touch D1 to keep the connection pool warm and prevent cold starts.
#[event(scheduled)]
async fn scheduled(_event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    let db = match env.d1("DB") {
        Ok(db) => db,
        Err(_) => return,
    };
    let _ = db
        .prepare("SELECT 1")
        .first::<serde_json::Value>(None)
        .await;
}
