//! Whitelist management HTTP handlers.
//!
//! Provides public and admin-only endpoints for checking, listing, adding, and
//! updating whitelist entries in the D1 `whitelist` table.

use serde::Deserialize;
use serde_json::json;
use wasm_bindgen::JsValue;
use worker::{Env, Request, Response, Result};

use crate::auth;
use crate::cors::json_response;

// ---------------------------------------------------------------------------
// JsValue helpers
// ---------------------------------------------------------------------------

fn js_str(s: &str) -> JsValue {
    JsValue::from_str(s)
}

fn js_f64(v: f64) -> JsValue {
    JsValue::from_f64(v)
}

// ---------------------------------------------------------------------------
// D1 row types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct CohortRow {
    cohorts: String,
}

#[derive(Deserialize)]
struct WhitelistRow {
    pubkey: String,
    cohorts: String,
    added_at: f64,
    added_by: Option<String>,
    profile_content: Option<String>,
}

#[derive(Deserialize)]
struct CountRow {
    count: f64,
}

// ---------------------------------------------------------------------------
// Request body types
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct WhitelistAddBody {
    pubkey: Option<String>,
    cohorts: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct WhitelistUpdateCohortsBody {
    pubkey: Option<String>,
    cohorts: Option<Vec<String>>,
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// `GET /api/check-whitelist?pubkey=<hex>`
///
/// Returns the whitelist status for a given pubkey, including admin status and
/// cohort memberships. Public endpoint used by the community forum client.
pub async fn handle_check_whitelist(req: &Request, env: &Env) -> Result<Response> {
    let url = req.url()?;
    let pubkey = url
        .query_pairs()
        .find(|(k, _)| k == "pubkey")
        .map(|(_, v)| v.to_string())
        .unwrap_or_default();

    if pubkey.len() != 64 || !pubkey.bytes().all(|b| b.is_ascii_hexdigit()) {
        return json_response(env, &json!({ "error": "Invalid pubkey format" }), 400);
    }

    let db = env.d1("DB")?;
    let now = auth::js_now_secs();

    let stmt = db
        .prepare("SELECT cohorts FROM whitelist WHERE pubkey = ?1 AND (expires_at IS NULL OR expires_at > ?2)")
        .bind(&[js_str(&pubkey), js_f64(now as f64)])?;

    let entry = stmt.first::<CohortRow>(None).await?;
    let env_admins = auth::admin_pubkeys(env);
    let is_admin_key = env_admins.iter().any(|k| k == &pubkey);

    let mut cohorts: Vec<String> = entry
        .as_ref()
        .and_then(|row| serde_json::from_str(&row.cohorts).ok())
        .unwrap_or_default();

    if is_admin_key && !cohorts.iter().any(|c| c == "admin") {
        cohorts.push("admin".to_string());
    }

    let has_admin_cohort = cohorts.iter().any(|c| c == "admin");

    json_response(
        env,
        &json!({
            "isWhitelisted": entry.is_some() || is_admin_key,
            "isAdmin": is_admin_key || has_admin_cohort,
            "cohorts": cohorts,
            "verifiedAt": js_sys::Date::now() as u64,
            "source": "relay",
        }),
        200,
    )
}

/// `GET /api/whitelist/list?limit=&offset=&cohort=`
///
/// Paginated whitelist with optional cohort filter. Joins with the events table
/// to extract `display_name` from the most recent kind-0 profile event.
pub async fn handle_whitelist_list(req: &Request, env: &Env) -> Result<Response> {
    let url = req.url()?;
    let params: std::collections::HashMap<String, String> = url.query_pairs().map(|(k, v)| (k.to_string(), v.to_string())).collect();

    let limit: u32 = params
        .get("limit")
        .and_then(|v| v.parse().ok())
        .unwrap_or(20)
        .min(100);
    let offset: u32 = params.get("offset").and_then(|v| v.parse().ok()).unwrap_or(0);
    let cohort = params.get("cohort").cloned();

    let db = env.d1("DB")?;
    let now = auth::js_now_secs();

    // Build count query
    let (count_sql, list_sql, bind_values) = if let Some(ref cohort_val) = cohort {
        // Escape LIKE wildcards and strip quotes to prevent pattern injection
        let escaped = cohort_val
            .replace('%', "\\%")
            .replace('_', "\\_")
            .replace('"', "");
        let like_pattern = format!("%\"{escaped}\"%");

        let count = format!(
            "SELECT COUNT(*) as count FROM whitelist WHERE (expires_at IS NULL OR expires_at > ?1) AND cohorts LIKE ?2 ESCAPE '\\'"
        );
        let list = format!(
            "SELECT w.pubkey, w.cohorts, w.added_at, w.added_by, \
             (SELECT e.content FROM events e WHERE e.pubkey = w.pubkey AND e.kind = 0 ORDER BY e.created_at DESC LIMIT 1) as profile_content \
             FROM whitelist w WHERE (w.expires_at IS NULL OR w.expires_at > ?1) AND w.cohorts LIKE ?2 ESCAPE '\\' \
             ORDER BY w.added_at DESC LIMIT ?3 OFFSET ?4"
        );
        (count, list, vec![
            js_f64(now as f64),
            js_str(&like_pattern),
            js_f64(limit as f64),
            js_f64(offset as f64),
        ])
    } else {
        let count = "SELECT COUNT(*) as count FROM whitelist WHERE (expires_at IS NULL OR expires_at > ?1)".to_string();
        let list = format!(
            "SELECT w.pubkey, w.cohorts, w.added_at, w.added_by, \
             (SELECT e.content FROM events e WHERE e.pubkey = w.pubkey AND e.kind = 0 ORDER BY e.created_at DESC LIMIT 1) as profile_content \
             FROM whitelist w WHERE (w.expires_at IS NULL OR w.expires_at > ?1) \
             ORDER BY w.added_at DESC LIMIT ?2 OFFSET ?3"
        );
        (count, list, vec![
            js_f64(now as f64),
            js_f64(limit as f64),
            js_f64(offset as f64),
        ])
    };

    // Execute count query
    let count_binds: Vec<JsValue> = if cohort.is_some() {
        bind_values[..2].to_vec()
    } else {
        bind_values[..1].to_vec()
    };
    let count_result = db
        .prepare(&count_sql)
        .bind(&count_binds)?
        .first::<CountRow>(None)
        .await?;
    let total = count_result.map(|r| r.count as u64).unwrap_or(0);

    // Execute list query
    let list_result = db
        .prepare(&list_sql)
        .bind(&bind_values)?
        .all()
        .await?;

    let rows: Vec<WhitelistRow> = list_result.results()?;
    let users: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            let display_name = row.profile_content.as_ref().and_then(|content| {
                serde_json::from_str::<serde_json::Value>(content)
                    .ok()
                    .and_then(|profile| {
                        profile
                            .get("display_name")
                            .or_else(|| profile.get("name"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    })
            });

            let cohorts: Vec<String> =
                serde_json::from_str(&row.cohorts).unwrap_or_default();

            json!({
                "pubkey": row.pubkey,
                "cohorts": cohorts,
                "addedAt": row.added_at as u64,
                "addedBy": row.added_by,
                "displayName": display_name,
            })
        })
        .collect();

    json_response(
        env,
        &json!({ "users": users, "total": total, "limit": limit, "offset": offset }),
        200,
    )
}

/// `POST /api/whitelist/add` (NIP-98 admin only)
///
/// Adds or updates a pubkey in the whitelist. Request body:
/// `{ "pubkey": "<hex>", "cohorts": ["approved"] }`
pub async fn handle_whitelist_add(mut req: Request, env: &Env) -> Result<Response> {
    let url = req.url()?;
    let request_url = format!("{}{}", url.origin().ascii_serialization(), url.path());
    let auth_header = req
        .headers()
        .get("Authorization")
        .ok()
        .flatten();
    let body_bytes = req.bytes().await?;

    let admin_pubkey = match auth::require_nip98_admin(
        auth_header.as_deref(),
        &request_url,
        "POST",
        Some(&body_bytes),
        env,
    )
    .await
    {
        Ok(pk) => pk,
        Err((body, status)) => return json_response(env, &body, status),
    };

    let body: WhitelistAddBody =
        serde_json::from_slice(&body_bytes).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let pubkey = match body.pubkey {
        Some(ref pk) if pk.len() == 64 && pk.bytes().all(|b| b.is_ascii_hexdigit()) => pk.clone(),
        _ => return json_response(env, &json!({ "error": "Invalid or missing pubkey" }), 400),
    };

    let cohorts = body.cohorts.unwrap_or_else(|| vec!["approved".to_string()]);
    let cohorts_json = serde_json::to_string(&cohorts)
        .map_err(|e| worker::Error::RustError(e.to_string()))?;
    let now = auth::js_now_secs();

    let db = env.d1("DB")?;
    db.prepare(
        "INSERT INTO whitelist (pubkey, cohorts, added_at, added_by) \
         VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT (pubkey) DO UPDATE SET cohorts = excluded.cohorts, added_by = excluded.added_by",
    )
    .bind(&[
        js_str(&pubkey),
        js_str(&cohorts_json),
        js_f64(now as f64),
        js_str(&admin_pubkey),
    ])?
    .run()
    .await?;

    json_response(env, &json!({ "success": true }), 200)
}

/// `POST /api/whitelist/update-cohorts` (NIP-98 admin only)
///
/// Updates the cohorts for an existing pubkey. Request body:
/// `{ "pubkey": "<hex>", "cohorts": ["approved", "premium"] }`
pub async fn handle_whitelist_update_cohorts(mut req: Request, env: &Env) -> Result<Response> {
    let url = req.url()?;
    let request_url = format!("{}{}", url.origin().ascii_serialization(), url.path());
    let auth_header = req
        .headers()
        .get("Authorization")
        .ok()
        .flatten();
    let body_bytes = req.bytes().await?;

    let admin_pubkey = match auth::require_nip98_admin(
        auth_header.as_deref(),
        &request_url,
        "POST",
        Some(&body_bytes),
        env,
    )
    .await
    {
        Ok(pk) => pk,
        Err((body, status)) => return json_response(env, &body, status),
    };

    let body: WhitelistUpdateCohortsBody =
        serde_json::from_slice(&body_bytes).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let pubkey = match &body.pubkey {
        Some(pk) if !pk.is_empty() => pk.clone(),
        _ => return json_response(env, &json!({ "error": "Missing pubkey or cohorts" }), 400),
    };
    let cohorts = match &body.cohorts {
        Some(c) => c.clone(),
        None => return json_response(env, &json!({ "error": "Missing pubkey or cohorts" }), 400),
    };

    let cohorts_json = serde_json::to_string(&cohorts)
        .map_err(|e| worker::Error::RustError(e.to_string()))?;
    let now = auth::js_now_secs();

    let db = env.d1("DB")?;
    db.prepare(
        "INSERT INTO whitelist (pubkey, cohorts, added_at, added_by) \
         VALUES (?1, ?2, ?3, ?4) \
         ON CONFLICT (pubkey) DO UPDATE SET cohorts = excluded.cohorts, added_by = excluded.added_by",
    )
    .bind(&[
        js_str(&pubkey),
        js_str(&cohorts_json),
        js_f64(now as f64),
        js_str(&admin_pubkey),
    ])?
    .run()
    .await?;

    json_response(env, &json!({ "success": true }), 200)
}
