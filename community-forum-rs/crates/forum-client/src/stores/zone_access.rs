//! 4-zone BBS access control model.
//!
//! Provides reactive zone access context that maps user cohorts to visibility
//! tiers. Zone enforcement is client-side (UX optimization); the relay is
//! the source of truth per ADR-022.
//!
//! On authentication, fetches the user's whitelist entry (including cohorts)
//! from the relay's `/api/check-whitelist?pubkey=` endpoint and populates
//! the reactive `user_cohorts` signal.

use leptos::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::auth::use_auth;

/// Access zone tier, ordered from least to most restrictive.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Zone {
    /// No authentication required.
    Public = 0,
    /// Any whitelisted (authenticated) user.
    Registered = 1,
    /// Requires membership in a specific cohort.
    Cohort = 2,
    /// Explicit invitation only (still cohort-based but stricter semantics).
    Private = 3,
}

impl Zone {
    /// Parse a zone from its numeric string representation (kind-40 tag value).
    pub fn from_tag(s: &str) -> Self {
        match s.trim() {
            "0" => Zone::Public,
            "1" => Zone::Registered,
            "2" => Zone::Cohort,
            "3" => Zone::Private,
            _ => Zone::Public,
        }
    }

    /// Human-readable label for the zone.
    pub fn label(self) -> &'static str {
        match self {
            Zone::Public => "Public",
            Zone::Registered => "Registered",
            Zone::Cohort => "Cohort",
            Zone::Private => "Private",
        }
    }

    /// Accent color key for UI rendering.
    pub fn accent(self) -> &'static str {
        match self {
            Zone::Public => "amber",
            Zone::Registered => "blue",
            Zone::Cohort => "purple",
            Zone::Private => "emerald",
        }
    }

    /// CSS class for the lock/badge icon.
    pub fn badge_class(self) -> &'static str {
        match self {
            Zone::Public => "text-amber-400 bg-amber-500/10 border-amber-500/20",
            Zone::Registered => "text-blue-400 bg-blue-500/10 border-blue-500/20",
            Zone::Cohort => "text-purple-400 bg-purple-500/10 border-purple-500/20",
            Zone::Private => "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        }
    }
}

/// Reactive zone access state provided via Leptos context.
#[derive(Clone, Debug)]
pub struct ZoneAccess {
    /// User's current cohort memberships (reactive).
    pub user_cohorts: RwSignal<Vec<String>>,
    /// Whether the user is on the whitelist (reactive derived signal).
    pub is_whitelisted: Signal<bool>,
}

impl ZoneAccess {
    /// Check whether the user can access a given zone, optionally requiring
    /// membership in a specific cohort.
    pub fn can_access(&self, zone: Zone, required_cohort: Option<&str>) -> bool {
        match zone {
            Zone::Public => true,
            Zone::Registered => self.is_whitelisted.get_untracked(),
            Zone::Cohort => required_cohort
                .map(|c| self.user_cohorts.get_untracked().contains(&c.to_string()))
                .unwrap_or(false),
            Zone::Private => required_cohort
                .map(|c| self.user_cohorts.get_untracked().contains(&c.to_string()))
                .unwrap_or(false),
        }
    }

    /// Reactive version of `can_access` for use inside views.
    pub fn can_access_reactive(&self, zone: Zone, required_cohort: Option<String>) -> Memo<bool> {
        let is_whitelisted = self.is_whitelisted;
        let user_cohorts = self.user_cohorts;
        Memo::new(move |_| match zone {
            Zone::Public => true,
            Zone::Registered => is_whitelisted.get(),
            Zone::Cohort | Zone::Private => required_cohort
                .as_deref()
                .map(|c| user_cohorts.get().contains(&c.to_string()))
                .unwrap_or(false),
        })
    }
}

/// Create and provide the zone access store into Leptos context.
///
/// Must be called after `provide_auth()`. Derives whitelist status from the
/// auth store's authentication state. When the user authenticates, fetches
/// their cohorts from the relay's `/api/check-whitelist` endpoint.
pub fn provide_zone_access() {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let pubkey = auth.pubkey();
    let user_cohorts = RwSignal::new(Vec::<String>::new());
    let is_whitelisted = Signal::derive(move || is_authed.get());

    let access = ZoneAccess {
        user_cohorts,
        is_whitelisted,
    };
    provide_context(access.clone());

    // Fetch cohorts from relay when user authenticates
    Effect::new(move |_| {
        let authed = is_authed.get();
        let pk = pubkey.get();
        if authed {
            if let Some(pk) = pk {
                let cohorts_signal = user_cohorts;
                leptos::task::spawn_local(async move {
                    match fetch_user_cohorts(&pk).await {
                        Ok(cohorts) => {
                            web_sys::console::log_1(
                                &format!("[zone_access] cohorts for {}: {:?}", &pk[..8], cohorts).into(),
                            );
                            cohorts_signal.set(cohorts);
                        }
                        Err(e) => {
                            web_sys::console::error_1(
                                &format!("[zone_access] failed to fetch cohorts: {e}").into(),
                            );
                        }
                    }
                });
            }
        } else {
            user_cohorts.set(Vec::new());
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

/// Fetch the user's cohort list from the relay's check-whitelist endpoint.
async fn fetch_user_cohorts(pubkey: &str) -> Result<Vec<String>, String> {
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
    // Response shape: { isWhitelisted: bool, isAdmin: bool, cohorts: string[] }
    let cohorts = val["cohorts"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    Ok(cohorts)
}

/// Retrieve the zone access store from context.
pub fn use_zone_access() -> ZoneAccess {
    expect_context::<ZoneAccess>()
}
