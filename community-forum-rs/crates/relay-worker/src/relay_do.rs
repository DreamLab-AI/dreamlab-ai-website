//! Nostr Relay Durable Object (NIP-01 WebSocket relay).
//!
//! Handles WebSocket connections, NIP-01 message protocol (EVENT/REQ/CLOSE),
//! event validation, Schnorr signature verification via `nostr_core`, whitelist
//! gating, and subscription-based event broadcasting.
//!
//! Uses D1 for persistent event storage and in-memory maps for per-connection
//! subscriptions and rate limiting.
//!
//! The `DurableObject` trait methods take `&self`, so all mutable state is
//! wrapped in `RefCell` for interior mutability. This is safe because the DO
//! runs single-threaded in a V8 isolate.

use std::cell::RefCell;
use std::collections::HashMap;

use nostr_core::event::NostrEvent;
use serde::Deserialize;
use wasm_bindgen::JsValue;
use worker::*;

use crate::auth;

// ---------------------------------------------------------------------------
// Security limits (matching the TypeScript implementation)
// ---------------------------------------------------------------------------

const MAX_CONTENT_SIZE: usize = 64 * 1024;
const MAX_REGISTRATION_CONTENT_SIZE: usize = 8 * 1024;
const MAX_TAG_COUNT: usize = 2000;
const MAX_TAG_VALUE_SIZE: usize = 1024;
const MAX_TIMESTAMP_DRIFT: u64 = 60 * 60 * 24 * 7;
const MAX_EVENTS_PER_SECOND: usize = 10;
const MAX_CONNECTIONS_PER_IP: u32 = 20;
const MAX_SUBSCRIPTIONS: usize = 20;
const MAX_QUERY_LIMIT: u32 = 1000;
/// Idle timeout: evict DO from memory if no sessions for 60 seconds.
/// Cloudflare bills per-wall-clock-second, so keeping an empty DO alive
/// burns money for zero utility.
const IDLE_TIMEOUT_MS: i64 = 60_000;

// ---------------------------------------------------------------------------
// NIP-01 filter type
// ---------------------------------------------------------------------------

/// A NIP-01 subscription filter.
#[derive(Debug, Clone, Deserialize)]
pub struct NostrFilter {
    #[serde(default)]
    pub ids: Option<Vec<String>>,
    #[serde(default)]
    pub authors: Option<Vec<String>>,
    #[serde(default)]
    pub kinds: Option<Vec<u64>>,
    #[serde(default)]
    pub since: Option<u64>,
    #[serde(default)]
    pub until: Option<u64>,
    #[serde(default)]
    pub limit: Option<u32>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

// ---------------------------------------------------------------------------
// Session state per WebSocket connection
// ---------------------------------------------------------------------------

struct SessionInfo {
    ws: WebSocket,
    ip: String,
    subscriptions: HashMap<String, Vec<NostrFilter>>,
}

// ---------------------------------------------------------------------------
// NIP-16 event treatment
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EventTreatment {
    Regular,
    Replaceable,
    Ephemeral,
    ParameterizedReplaceable,
}

fn event_treatment(kind: u64) -> EventTreatment {
    if (20000..30000).contains(&kind) {
        EventTreatment::Ephemeral
    } else if (10000..20000).contains(&kind) || kind == 0 || kind == 3 {
        EventTreatment::Replaceable
    } else if (30000..40000).contains(&kind) {
        EventTreatment::ParameterizedReplaceable
    } else {
        EventTreatment::Regular
    }
}

fn d_tag_value(event: &NostrEvent) -> String {
    for tag in &event.tags {
        if tag.first().map(|s| s.as_str()) == Some("d") {
            return tag.get(1).cloned().unwrap_or_default();
        }
    }
    String::new()
}

// ---------------------------------------------------------------------------
// D1 row type for query results
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct EventRow {
    id: String,
    pubkey: String,
    created_at: f64,
    kind: f64,
    tags: String,
    content: String,
    sig: String,
}

impl EventRow {
    fn into_nostr_event(self) -> Option<NostrEvent> {
        let tags: Vec<Vec<String>> = serde_json::from_str(&self.tags).ok()?;
        Some(NostrEvent {
            id: self.id,
            pubkey: self.pubkey,
            created_at: self.created_at as u64,
            kind: self.kind as u64,
            tags,
            content: self.content,
            sig: self.sig,
        })
    }
}

// ---------------------------------------------------------------------------
// Durable Object
// ---------------------------------------------------------------------------

#[durable_object]
pub struct NostrRelayDO {
    state: State,
    env: Env,
    sessions: RefCell<HashMap<u64, SessionInfo>>,
    next_session_id: RefCell<u64>,
    rate_limits: RefCell<HashMap<String, Vec<f64>>>,
    connection_counts: RefCell<HashMap<String, u32>>,
}

impl DurableObject for NostrRelayDO {
    fn new(state: State, env: Env) -> Self {
        Self {
            state,
            env,
            sessions: RefCell::new(HashMap::new()),
            next_session_id: RefCell::new(1),
            rate_limits: RefCell::new(HashMap::new()),
            connection_counts: RefCell::new(HashMap::new()),
        }
    }

    async fn fetch(&self, req: Request) -> Result<Response> {
        if req.headers().get("Upgrade")?.as_deref() != Some("websocket") {
            return Response::error("Expected WebSocket", 426);
        }

        let ip = req
            .headers()
            .get("CF-Connecting-IP")?
            .unwrap_or_else(|| "unknown".to_string());

        // Connection rate limit
        {
            let counts = self.connection_counts.borrow();
            let conn_count = counts.get(&ip).copied().unwrap_or(0);
            if conn_count >= MAX_CONNECTIONS_PER_IP {
                return Response::error("Too many connections", 429);
            }
        }

        let pair = WebSocketPair::new()?;
        let server = pair.server;
        let client = pair.client;

        self.state.accept_web_socket(&server);

        let session_id = {
            let mut id = self.next_session_id.borrow_mut();
            let current = *id;
            *id += 1;
            current
        };

        {
            let mut sessions = self.sessions.borrow_mut();
            sessions.insert(
                session_id,
                SessionInfo {
                    ws: server,
                    ip: ip.clone(),
                    subscriptions: HashMap::new(),
                },
            );
        }

        {
            let mut counts = self.connection_counts.borrow_mut();
            let count = counts.get(&ip).copied().unwrap_or(0);
            counts.insert(ip, count + 1);
        }

        Response::from_websocket(client)
    }

    async fn websocket_message(
        &self,
        ws: WebSocket,
        message: WebSocketIncomingMessage,
    ) -> Result<()> {
        let msg = match message {
            WebSocketIncomingMessage::String(s) => s,
            WebSocketIncomingMessage::Binary(b) => String::from_utf8(b).unwrap_or_default(),
        };

        let session_id = match self.find_session_id(&ws) {
            Some(id) => id,
            None => return Ok(()),
        };

        let ip = match self.sessions.borrow().get(&session_id) {
            Some(s) => s.ip.clone(),
            None => return Ok(()),
        };

        let parsed: serde_json::Value = match serde_json::from_str(&msg) {
            Ok(v) => v,
            Err(_) => {
                Self::send_notice(&ws, "Invalid JSON");
                return Ok(());
            }
        };

        let arr = match parsed.as_array() {
            Some(a) if a.len() >= 2 => a.clone(),
            _ => {
                Self::send_notice(&ws, "Invalid message format");
                return Ok(());
            }
        };

        let msg_type = match arr[0].as_str() {
            Some(t) => t.to_string(),
            None => {
                Self::send_notice(&ws, "Invalid message format");
                return Ok(());
            }
        };

        match msg_type.as_str() {
            "EVENT" => {
                let event: NostrEvent = match serde_json::from_value(arr[1].clone()) {
                    Ok(e) => e,
                    Err(_) => {
                        Self::send_notice(&ws, "Invalid event");
                        return Ok(());
                    }
                };
                self.handle_event(&ws, &ip, event).await;
            }
            "REQ" => {
                let sub_id = match arr[1].as_str() {
                    Some(s) => s.to_string(),
                    None => {
                        Self::send_notice(&ws, "Invalid subscription ID");
                        return Ok(());
                    }
                };
                let filters: Vec<NostrFilter> = arr[2..]
                    .iter()
                    .filter_map(|v| serde_json::from_value(v.clone()).ok())
                    .collect();
                self.handle_req(session_id, &sub_id, filters).await;
            }
            "CLOSE" => {
                if let Some(sub_id) = arr[1].as_str() {
                    self.handle_close(session_id, sub_id);
                }
            }
            _ => {
                Self::send_notice(&ws, &format!("Unknown message type: {msg_type}"));
            }
        }

        Ok(())
    }

    async fn websocket_close(
        &self,
        ws: WebSocket,
        _code: usize,
        _reason: String,
        _was_clean: bool,
    ) -> Result<()> {
        self.remove_session(&ws);
        Ok(())
    }

    async fn websocket_error(&self, ws: WebSocket, _error: Error) -> Result<()> {
        self.remove_session(&ws);
        Ok(())
    }

    /// Alarm handler: if no sessions remain, clear in-memory state so the DO
    /// can be evicted. If sessions exist (a new connection arrived during the
    /// timeout window), the alarm is a no-op.
    async fn alarm(&self) -> Result<Response> {
        if self.sessions.borrow().is_empty() {
            self.rate_limits.borrow_mut().clear();
            self.connection_counts.borrow_mut().clear();
            console_log!("[RelayDO] Idle timeout — cleared in-memory state for eviction");
        }
        Response::ok("ok")
    }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    fn find_session_id(&self, ws: &WebSocket) -> Option<u64> {
        let target: &JsValue = ws.as_ref();
        let sessions = self.sessions.borrow();
        for (id, session) in sessions.iter() {
            let candidate: &JsValue = session.ws.as_ref();
            if target.loose_eq(candidate) {
                return Some(*id);
            }
        }
        None
    }

    fn remove_session(&self, ws: &WebSocket) {
        if let Some(session_id) = self.find_session_id(ws) {
            let ip = {
                let sessions = self.sessions.borrow();
                sessions.get(&session_id).map(|s| s.ip.clone())
            };
            self.sessions.borrow_mut().remove(&session_id);
            if let Some(ip) = ip {
                let mut counts = self.connection_counts.borrow_mut();
                let count = counts.get(&ip).copied().unwrap_or(1);
                if count <= 1 {
                    counts.remove(&ip);
                } else {
                    counts.insert(ip, count - 1);
                }
            }

            // If no sessions remain, schedule an idle timeout alarm so the
            // DO evicts itself and stops billing.
            if self.sessions.borrow().is_empty() {
                self.schedule_idle_alarm();
            }
        }
    }

    /// Schedule an alarm to evict the DO if still idle after `IDLE_TIMEOUT_MS`.
    /// The `set_alarm` JS binding fires synchronously in the Workers runtime;
    /// we intentionally drop the resulting promise/future.
    #[allow(clippy::let_underscore_future)]
    fn schedule_idle_alarm(&self) {
        let now = js_sys::Date::now() as i64;
        let _ = self.state.storage().set_alarm(now + IDLE_TIMEOUT_MS);
    }
}

// ---------------------------------------------------------------------------
// NIP-01: EVENT handling
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    async fn handle_event(&self, ws: &WebSocket, ip: &str, event: NostrEvent) {
        // Rate limit
        if !self.check_rate_limit(ip) {
            Self::send_notice(ws, "rate limit exceeded");
            return;
        }

        // Validate event structure
        if !Self::validate_event(&event) {
            Self::send_ok(ws, &event.id, false, "invalid: event validation failed");
            return;
        }

        // Registration events (kind 0 profile, kind 9024) bypass whitelist
        let is_registration = event.kind == 0 || event.kind == 9024;
        if !is_registration && !self.is_whitelisted(&event.pubkey).await {
            Self::send_ok(ws, &event.id, false, "blocked: pubkey not whitelisted");
            return;
        }

        // Verify event ID and Schnorr signature via nostr_core
        if nostr_core::verify_event_strict(&event).is_err() {
            Self::send_ok(
                ws,
                &event.id,
                false,
                "invalid: event id or signature verification failed",
            );
            return;
        }

        // NIP-16 event treatment
        let treatment = event_treatment(event.kind);

        if treatment == EventTreatment::Ephemeral {
            Self::send_ok(ws, &event.id, true, "");
            self.broadcast_event(&event);
            return;
        }

        // Save to D1
        if self.save_event(&event, treatment).await {
            Self::send_ok(ws, &event.id, true, "");
            self.broadcast_event(&event);
        } else {
            Self::send_ok(ws, &event.id, false, "error: failed to save event");
        }
    }

    fn validate_event(event: &NostrEvent) -> bool {
        if event.id.len() != 64 || event.pubkey.len() != 64 || event.sig.len() != 128 {
            return false;
        }

        let is_reg = event.kind == 0 || event.kind == 9024;
        let max_content = if is_reg {
            MAX_REGISTRATION_CONTENT_SIZE
        } else {
            MAX_CONTENT_SIZE
        };
        if event.content.len() > max_content {
            return false;
        }

        if event.tags.len() > MAX_TAG_COUNT {
            return false;
        }
        for tag in &event.tags {
            for v in tag {
                if v.len() > MAX_TAG_VALUE_SIZE {
                    return false;
                }
            }
        }

        let now = auth::js_now_secs();
        let drift = now.abs_diff(event.created_at);
        if drift > MAX_TIMESTAMP_DRIFT {
            return false;
        }

        true
    }
}

// ---------------------------------------------------------------------------
// NIP-01: REQ / CLOSE handling
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    async fn handle_req(&self, session_id: u64, sub_id: &str, filters: Vec<NostrFilter>) {
        let ws = {
            let sessions = self.sessions.borrow();
            match sessions.get(&session_id) {
                Some(s) => s.ws.clone(),
                None => return,
            }
        };

        // Check subscription limit
        {
            let sessions = self.sessions.borrow();
            if let Some(session) = sessions.get(&session_id) {
                if session.subscriptions.len() >= MAX_SUBSCRIPTIONS {
                    Self::send_notice(&ws, "too many subscriptions");
                    return;
                }
            }
        }

        // Store subscription
        {
            let mut sessions = self.sessions.borrow_mut();
            if let Some(session) = sessions.get_mut(&session_id) {
                session
                    .subscriptions
                    .insert(sub_id.to_string(), filters.clone());
            }
        }

        // Query D1 for matching events
        let events = self.query_events(&filters).await;
        for event in &events {
            Self::send_event(&ws, sub_id, event);
        }
        Self::send_eose(&ws, sub_id);
    }

    fn handle_close(&self, session_id: u64, sub_id: &str) {
        let mut sessions = self.sessions.borrow_mut();
        if let Some(session) = sessions.get_mut(&session_id) {
            session.subscriptions.remove(sub_id);
        }
    }
}

// ---------------------------------------------------------------------------
// D1 storage
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    async fn save_event(&self, event: &NostrEvent, treatment: EventTreatment) -> bool {
        let db = match self.env.d1("DB") {
            Ok(db) => db,
            Err(_) => return false,
        };

        let d_tag = d_tag_value(event);
        let tags_json = match serde_json::to_string(&event.tags) {
            Ok(j) => j,
            Err(_) => return false,
        };
        let now = auth::js_now_secs();

        let insert_stmt = db.prepare(
            "INSERT INTO events (id, pubkey, created_at, kind, tags, content, sig, d_tag, received_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9) \
             ON CONFLICT (id) DO NOTHING",
        );

        let insert_binds = [
            JsValue::from_str(&event.id),
            JsValue::from_str(&event.pubkey),
            JsValue::from_f64(event.created_at as f64),
            JsValue::from_f64(event.kind as f64),
            JsValue::from_str(&tags_json),
            JsValue::from_str(&event.content),
            JsValue::from_str(&event.sig),
            JsValue::from_str(&d_tag),
            JsValue::from_f64(now as f64),
        ];

        match treatment {
            EventTreatment::Replaceable => {
                let delete_stmt = db.prepare(
                    "DELETE FROM events WHERE pubkey = ?1 AND kind = ?2 AND created_at < ?3",
                );
                let delete_binds = [
                    JsValue::from_str(&event.pubkey),
                    JsValue::from_f64(event.kind as f64),
                    JsValue::from_f64(event.created_at as f64),
                ];

                let delete_bound = match delete_stmt.bind(&delete_binds) {
                    Ok(s) => s,
                    Err(_) => return false,
                };
                let insert_bound = match insert_stmt.bind(&insert_binds) {
                    Ok(s) => s,
                    Err(_) => return false,
                };

                db.batch(vec![delete_bound, insert_bound]).await.is_ok()
            }
            EventTreatment::ParameterizedReplaceable => {
                let delete_stmt = db.prepare(
                    "DELETE FROM events WHERE pubkey = ?1 AND kind = ?2 AND d_tag = ?3 AND created_at < ?4",
                );
                let delete_binds = [
                    JsValue::from_str(&event.pubkey),
                    JsValue::from_f64(event.kind as f64),
                    JsValue::from_str(&d_tag),
                    JsValue::from_f64(event.created_at as f64),
                ];

                let delete_bound = match delete_stmt.bind(&delete_binds) {
                    Ok(s) => s,
                    Err(_) => return false,
                };
                let insert_bound = match insert_stmt.bind(&insert_binds) {
                    Ok(s) => s,
                    Err(_) => return false,
                };

                db.batch(vec![delete_bound, insert_bound]).await.is_ok()
            }
            EventTreatment::Regular => match insert_stmt.bind(&insert_binds) {
                Ok(s) => s.run().await.is_ok(),
                Err(_) => false,
            },
            EventTreatment::Ephemeral => true,
        }
    }

    async fn query_events(&self, filters: &[NostrFilter]) -> Vec<NostrEvent> {
        let db = match self.env.d1("DB") {
            Ok(db) => db,
            Err(_) => return Vec::new(),
        };

        let mut events = Vec::new();

        for filter in filters {
            let mut conditions: Vec<String> = Vec::new();
            let mut params: Vec<JsValue> = Vec::new();
            let mut param_idx = 1u32;

            if let Some(ref ids) = filter.ids {
                if !ids.is_empty() {
                    let placeholders: Vec<String> = ids
                        .iter()
                        .map(|id| {
                            let p = format!("?{param_idx}");
                            params.push(JsValue::from_str(id));
                            param_idx += 1;
                            p
                        })
                        .collect();
                    conditions.push(format!("id IN ({})", placeholders.join(",")));
                }
            }

            if let Some(ref authors) = filter.authors {
                if !authors.is_empty() {
                    let placeholders: Vec<String> = authors
                        .iter()
                        .map(|a| {
                            let p = format!("?{param_idx}");
                            params.push(JsValue::from_str(a));
                            param_idx += 1;
                            p
                        })
                        .collect();
                    conditions.push(format!("pubkey IN ({})", placeholders.join(",")));
                }
            }

            if let Some(ref kinds) = filter.kinds {
                if !kinds.is_empty() {
                    let placeholders: Vec<String> = kinds
                        .iter()
                        .map(|k| {
                            let p = format!("?{param_idx}");
                            params.push(JsValue::from_f64(*k as f64));
                            param_idx += 1;
                            p
                        })
                        .collect();
                    conditions.push(format!("kind IN ({})", placeholders.join(",")));
                }
            }

            if let Some(since) = filter.since {
                conditions.push(format!("created_at >= ?{param_idx}"));
                params.push(JsValue::from_f64(since as f64));
                param_idx += 1;
            }

            if let Some(until) = filter.until {
                conditions.push(format!("created_at <= ?{param_idx}"));
                params.push(JsValue::from_f64(until as f64));
                param_idx += 1;
            }

            // Tag filters (#e, #p, #t, etc.)
            for (key, values) in &filter.extra {
                if !key.starts_with('#') {
                    continue;
                }
                let tag_name = &key[1..];
                if !tag_name
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
                {
                    continue;
                }

                let tag_values: Vec<&str> = match values.as_array() {
                    Some(arr) => arr.iter().filter_map(|v| v.as_str()).collect(),
                    None => continue,
                };

                if tag_values.is_empty() {
                    continue;
                }

                let mut tag_conditions: Vec<String> = Vec::new();
                for v in &tag_values {
                    if v.is_empty() {
                        continue;
                    }
                    let escaped = v.replace('%', "\\%").replace('_', "\\_").replace('"', "");
                    let pattern = format!("%\"{tag_name}\",\"{escaped}\"%");
                    tag_conditions.push(format!("tags LIKE ?{param_idx} ESCAPE '\\\\'"));
                    params.push(JsValue::from_str(&pattern));
                    param_idx += 1;
                }

                if !tag_conditions.is_empty() {
                    conditions.push(format!("({})", tag_conditions.join(" OR ")));
                }
            }

            let where_clause = if conditions.is_empty() {
                String::new()
            } else {
                format!("WHERE {}", conditions.join(" AND "))
            };

            let limit = filter.limit.unwrap_or(500).min(MAX_QUERY_LIMIT);
            let limit_placeholder = format!("?{param_idx}");
            params.push(JsValue::from_f64(limit as f64));

            let sql = format!(
                "SELECT id, pubkey, created_at, kind, tags, content, sig \
                 FROM events {where_clause} \
                 ORDER BY created_at DESC LIMIT {limit_placeholder}"
            );

            let result = match db.prepare(&sql).bind(&params) {
                Ok(stmt) => match stmt.all().await {
                    Ok(r) => r,
                    Err(_) => continue,
                },
                Err(_) => continue,
            };

            let rows: Vec<EventRow> = match result.results() {
                Ok(r) => r,
                Err(_) => continue,
            };

            for row in rows {
                if let Some(event) = row.into_nostr_event() {
                    events.push(event);
                }
            }
        }

        events
    }
}

// ---------------------------------------------------------------------------
// Whitelist check
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    async fn is_whitelisted(&self, pubkey: &str) -> bool {
        if auth::is_admin_by_env(pubkey, &self.env) {
            return true;
        }

        let db = match self.env.d1("DB") {
            Ok(db) => db,
            Err(_) => return false,
        };

        let now = auth::js_now_secs();
        let stmt = match db
            .prepare("SELECT 1 as found FROM whitelist WHERE pubkey = ?1 AND (expires_at IS NULL OR expires_at > ?2)")
            .bind(&[JsValue::from_str(pubkey), JsValue::from_f64(now as f64)])
        {
            Ok(s) => s,
            Err(_) => return false,
        };

        matches!(stmt.first::<serde_json::Value>(None).await, Ok(Some(_)))
    }
}

// ---------------------------------------------------------------------------
// Broadcasting
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    fn broadcast_event(&self, event: &NostrEvent) {
        let sessions = self.sessions.borrow();
        for (_id, session) in sessions.iter() {
            for (sub_id, filters) in &session.subscriptions {
                if event_matches_filters(event, filters) {
                    Self::send_event(&session.ws, sub_id, event);
                }
            }
        }
    }
}

fn event_matches_filters(event: &NostrEvent, filters: &[NostrFilter]) -> bool {
    'outer: for filter in filters {
        if let Some(ref ids) = filter.ids {
            if !ids.iter().any(|id| id == &event.id) {
                continue;
            }
        }
        if let Some(ref authors) = filter.authors {
            if !authors.iter().any(|a| a == &event.pubkey) {
                continue;
            }
        }
        if let Some(ref kinds) = filter.kinds {
            if !kinds.contains(&event.kind) {
                continue;
            }
        }
        if let Some(since) = filter.since {
            if event.created_at < since {
                continue;
            }
        }
        if let Some(until) = filter.until {
            if event.created_at > until {
                continue;
            }
        }

        // Tag filters (#e, #p, #t, etc.) — must match at least one value per tag
        for (key, values) in &filter.extra {
            if !key.starts_with('#') {
                continue;
            }
            let tag_name = &key[1..];
            let required: Vec<&str> = match values.as_array() {
                Some(arr) => arr.iter().filter_map(|v| v.as_str()).collect(),
                None => continue,
            };
            if required.is_empty() {
                continue;
            }

            // Check that the event has at least one tag matching this filter
            let has_match = event.tags.iter().any(|tag| {
                tag.first().map(|t| t.as_str()) == Some(tag_name)
                    && tag.get(1).map_or(false, |v| required.contains(&v.as_str()))
            });
            if !has_match {
                continue 'outer;
            }
        }

        return true;
    }
    false
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    fn check_rate_limit(&self, ip: &str) -> bool {
        let now = js_sys::Date::now();
        let cutoff = now - 1000.0;

        let mut rate_limits = self.rate_limits.borrow_mut();
        let timestamps = rate_limits.entry(ip.to_string()).or_default();
        timestamps.retain(|&ts| ts >= cutoff);

        if timestamps.len() >= MAX_EVENTS_PER_SECOND {
            return false;
        }
        timestamps.push(now);
        true
    }
}

// ---------------------------------------------------------------------------
// Wire protocol helpers
// ---------------------------------------------------------------------------

impl NostrRelayDO {
    fn send(ws: &WebSocket, msg: &serde_json::Value) {
        if let Ok(json_str) = serde_json::to_string(msg) {
            let _ = ws.send_with_str(&json_str);
        }
    }

    fn send_ok(ws: &WebSocket, id: &str, ok: bool, msg: &str) {
        Self::send(ws, &serde_json::json!(["OK", id, ok, msg]));
    }

    fn send_notice(ws: &WebSocket, msg: &str) {
        Self::send(ws, &serde_json::json!(["NOTICE", msg]));
    }

    fn send_event(ws: &WebSocket, sub_id: &str, event: &NostrEvent) {
        Self::send(ws, &serde_json::json!(["EVENT", sub_id, event]));
    }

    fn send_eose(ws: &WebSocket, sub_id: &str) {
        Self::send(ws, &serde_json::json!(["EOSE", sub_id]));
    }
}
