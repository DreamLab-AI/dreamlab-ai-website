//! 3-flag zone access model: home, dreamlab, minimoonoir.
//!
//! Provides reactive zone access context that maps user flags to visibility.
//! Zone enforcement is client-side (UX optimization); the relay is the
//! source of truth per ADR-022.
//!
//! On authentication, fetches the user's whitelist entry (including the
//! `access` object) from the relay's `/api/check-whitelist?pubkey=` endpoint.

use leptos::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::auth::use_auth;

/// Reactive zone access state provided via Leptos context.
#[derive(Clone, Debug)]
pub struct ZoneAccess {
    /// Whether the user has Home access.
    pub home: Memo<bool>,
    /// Whether the user has DreamLab access.
    pub dreamlab: Memo<bool>,
    /// Whether the user has Minimoonoir access.
    pub minimoonoir: Memo<bool>,
    /// Whether the user is on the whitelist (any flag true).
    pub is_whitelisted: Signal<bool>,
    /// Whether the user has admin privileges (from D1 whitelist).
    pub is_admin: RwSignal<bool>,
    /// Raw flags signal (set from relay response).
    flags: RwSignal<(bool, bool, bool)>,
}

impl ZoneAccess {
    /// Check access for a zone by its string ID.
    pub fn has_access(&self, zone_id: &str) -> bool {
        match zone_id {
            "home" | "dreamlab-lobby" => self.home.get_untracked(),
            "dreamlab" => self.dreamlab.get_untracked(),
            "minimoonoir" => self.minimoonoir.get_untracked(),
            _ => false,
        }
    }
}

/// Create and provide the zone access store into Leptos context.
///
/// Must be called after `provide_auth()`. When the user authenticates, fetches
/// their access flags from the relay's `/api/check-whitelist` endpoint.
pub fn provide_zone_access() {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let pubkey = auth.pubkey();
    let flags = RwSignal::new((false, false, false));
    let is_admin_sig = RwSignal::new(false);

    let home = Memo::new(move |_| flags.get().0);
    let dreamlab = Memo::new(move |_| flags.get().1);
    let minimoonoir = Memo::new(move |_| flags.get().2);
    let is_whitelisted = Signal::derive(move || {
        let (h, d, m) = flags.get();
        h || d || m || is_authed.get()
    });

    let access = ZoneAccess {
        home,
        dreamlab,
        minimoonoir,
        is_whitelisted,
        is_admin: is_admin_sig,
        flags,
    };
    provide_context(access.clone());

    // Fetch access flags from relay when user authenticates
    Effect::new(move |_| {
        let authed = is_authed.get();
        let pk = pubkey.get();
        if authed {
            if let Some(pk) = pk {
                let flags_sig = flags;
                let admin_sig = is_admin_sig;
                leptos::task::spawn_local(async move {
                    match fetch_user_access(&pk).await {
                        Ok((h, d, m, admin)) => {
                            web_sys::console::log_1(
                                &format!(
                                    "[zone_access] flags for {}: home={}, dreamlab={}, minimoonoir={}, admin={}",
                                    &pk[..8], h, d, m, admin
                                )
                                .into(),
                            );
                            flags_sig.set((h, d, m));
                            admin_sig.set(admin);
                        }
                        Err(e) => {
                            web_sys::console::error_1(
                                &format!("[zone_access] failed to fetch access: {e}").into(),
                            );
                        }
                    }
                });
            }
        } else {
            flags.set((false, false, false));
            is_admin_sig.set(false);
        }
    });
}

/// Resolve the relay HTTP base URL for whitelist API calls.
fn relay_api_base() -> String {
    if let Some(window) = web_sys::window() {
        if let Ok(val) = js_sys::Reflect::get(&window, &"__ENV__".into()) {
            if !val.is_undefined() && !val.is_null() {
                if let Ok(url) = js_sys::Reflect::get(&val, &"VITE_RELAY_URL".into()) {
                    if let Some(s) = url.as_string() {
                        if !s.is_empty() {
                            return s
                                .replace("wss://", "https://")
                                .replace("ws://", "http://")
                                .trim_end_matches('/')
                                .to_string();
                        }
                    }
                }
            }
        }
    }
    // Compile-time fallback
    let relay = option_env!("VITE_RELAY_URL").unwrap_or("wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev");
    relay
        .replace("wss://", "https://")
        .replace("ws://", "http://")
        .trim_end_matches('/')
        .to_string()
}

/// Fetch the user's access flags from the relay's check-whitelist endpoint.
///
/// Returns `(home, dreamlab, minimoonoir, is_admin)`.
/// Parses the `access` object first (new format). Falls back to normalizing
/// the `cohorts` array for backwards compatibility with old relay versions.
async fn fetch_user_access(pubkey: &str) -> Result<(bool, bool, bool, bool), String> {
    let url = format!("{}/api/check-whitelist?pubkey={}", relay_api_base(), pubkey);
    let win = web_sys::window().ok_or("No window")?;
    let resp_val = JsFuture::from(win.fetch_with_str(&url))
        .await
        .map_err(|e| format!("fetch error: {e:?}"))?;
    let resp: web_sys::Response = resp_val
        .dyn_into()
        .map_err(|_| "Not a Response".to_string())?;
    if !resp.ok() {
        return Err(format!("HTTP {}", resp.status()));
    }
    let text = JsFuture::from(resp.text().map_err(|e| format!("{e:?}"))?)
        .await
        .map_err(|e| format!("{e:?}"))?;
    let text_str = text.as_string().ok_or("Not a string")?;
    let val: serde_json::Value =
        serde_json::from_str(&text_str).map_err(|e| format!("JSON parse: {e}"))?;

    let is_admin = val.get("isAdmin").and_then(|v| v.as_bool()).unwrap_or(false);

    // New format: { access: { home, dreamlab, minimoonoir } }
    if let Some(access) = val.get("access") {
        let home = access.get("home").and_then(|v| v.as_bool()).unwrap_or(false);
        let dreamlab = access.get("dreamlab").and_then(|v| v.as_bool()).unwrap_or(false);
        let minimoonoir = access.get("minimoonoir").and_then(|v| v.as_bool()).unwrap_or(false);
        return Ok((home, dreamlab, minimoonoir, is_admin));
    }

    // Fallback: normalize from cohorts array
    if is_admin {
        return Ok((true, true, true, true));
    }

    let cohorts: Vec<String> = val["cohorts"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    let home = cohorts.iter().any(|c| matches!(c.as_str(), "home" | "lobby" | "approved" | "cross-access"));
    let dreamlab = cohorts.iter().any(|c| matches!(c.as_str(),
        "dreamlab" | "business" | "business-only" | "trainers" | "trainees"
        | "ai-agents" | "agent" | "visionflow-full" | "cross-access"
    ));
    let minimoonoir = cohorts.iter().any(|c| matches!(c.as_str(),
        "minimoonoir" | "minimoonoir-only" | "minimoonoir-business" | "cross-access"
    ));

    Ok((home, dreamlab, minimoonoir, false))
}

/// Retrieve the zone access store from context.
pub fn use_zone_access() -> ZoneAccess {
    expect_context::<ZoneAccess>()
}
