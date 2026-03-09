//! Shared channel metadata store with localStorage cache.
//!
//! Subscribes once at app root to kind-40 (channel creation) and kind-42
//! (messages) events. All pages read from the same reactive signals —
//! no re-fetching on navigation. Channel metadata is cached to localStorage
//! for instant hydration on subsequent visits (stale-while-revalidate).

use gloo::storage::{LocalStorage, Storage};
use leptos::prelude::*;
use nostr_core::NostrEvent;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::JsCast;

use crate::relay::{ConnectionState, Filter, RelayConnection};

// -- Constants ----------------------------------------------------------------

const CACHE_KEY: &str = "dreamlab_channel_cache";

// -- Types --------------------------------------------------------------------

/// Serializable channel metadata for localStorage cache.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ChannelMeta {
    pub id: String,
    pub name: String,
    pub description: String,
    pub section: String,
    pub created_at: u64,
}

/// Cached channel data persisted to localStorage.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
struct CachedData {
    channels: Vec<ChannelMeta>,
    message_counts: HashMap<String, u32>,
    last_active: HashMap<String, u64>,
    /// Timestamp of last successful relay sync.
    synced_at: u64,
}

// -- ChannelStore -------------------------------------------------------------

/// Global channel store provided via Leptos context.
/// Subscribe once at app root — all pages read from these signals.
#[derive(Clone)]
pub struct ChannelStore {
    pub channels: RwSignal<Vec<ChannelMeta>>,
    pub message_counts: RwSignal<HashMap<String, u32>>,
    pub last_active: RwSignal<HashMap<String, u64>>,
    pub loading: RwSignal<bool>,
    pub eose_received: RwSignal<bool>,
    sub_id: RwSignal<Option<String>>,
    msg_sub_id: RwSignal<Option<String>>,
}

impl ChannelStore {
    fn new() -> Self {
        // Hydrate from localStorage cache for instant render
        let cached = Self::load_cache();
        let has_cache = !cached.channels.is_empty();

        Self {
            channels: RwSignal::new(cached.channels),
            message_counts: RwSignal::new(cached.message_counts),
            last_active: RwSignal::new(cached.last_active),
            // If we have cache, don't show loading — render immediately
            loading: RwSignal::new(!has_cache),
            eose_received: RwSignal::new(false),
            sub_id: RwSignal::new(None),
            msg_sub_id: RwSignal::new(None),
        }
    }

    fn load_cache() -> CachedData {
        let json: Result<String, _> = LocalStorage::get(CACHE_KEY);
        json.ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    fn save_cache(&self) {
        let data = CachedData {
            channels: self.channels.get_untracked(),
            message_counts: self.message_counts.get_untracked(),
            last_active: self.last_active.get_untracked(),
            synced_at: (js_sys::Date::now() / 1000.0) as u64,
        };
        if let Ok(json) = serde_json::to_string(&data) {
            let _ = LocalStorage::set(CACHE_KEY, json);
        }
    }

    /// Start relay subscriptions. Called once from App root after relay connects.
    pub(crate) fn start_sync(&self, relay: &RelayConnection) {
        if self.sub_id.get_untracked().is_some() {
            return;
        }

        let channels_sig = self.channels;
        let loading_sig = self.loading;
        let eose_sig = self.eose_received;
        let store = self.clone();

        // Kind 40: channel creation events
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind != 40 {
                return;
            }

            let (name, description) = parse_channel_content(&event.content);
            let section = event
                .tags
                .iter()
                .find(|t| t.len() >= 2 && t[0] == "section")
                .map(|t| t[1].clone())
                .unwrap_or_default();

            let meta = ChannelMeta {
                id: event.id.clone(),
                name,
                description,
                section,
                created_at: event.created_at,
            };

            channels_sig.update(|list| {
                if !list.iter().any(|c| c.id == meta.id) {
                    list.push(meta);
                }
            });
        });

        let store_for_eose = store.clone();
        let on_eose = Rc::new(move || {
            loading_sig.set(false);
            eose_sig.set(true);
            // Cache after receiving all channel metadata
            store_for_eose.save_cache();
        });

        let id = relay.subscribe(
            vec![Filter {
                kinds: Some(vec![40]),
                ..Default::default()
            }],
            on_event,
            Some(on_eose),
        );
        self.sub_id.set(Some(id));

        // Loading timeout fallback
        let loading_timeout = loading_sig;
        let store_for_timeout = store;
        let cb = wasm_bindgen::closure::Closure::once(move || {
            if loading_timeout.get_untracked() {
                loading_timeout.set(false);
            }
            store_for_timeout.save_cache();
        });
        if let Some(window) = web_sys::window() {
            let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                cb.as_ref().unchecked_ref(),
                6000,
            );
        }
        cb.forget();
    }

    /// Start message count subscription (called after channel EOSE).
    pub(crate) fn start_msg_sync(&self, relay: &RelayConnection) {
        if self.msg_sub_id.get_untracked().is_some() {
            return;
        }

        let channel_ids: Vec<String> = self
            .channels
            .get_untracked()
            .iter()
            .map(|c| c.id.clone())
            .collect();
        if channel_ids.is_empty() {
            return;
        }

        let msg_counts = self.message_counts;
        let last_active = self.last_active;
        let store = self.clone();

        let on_msg = Rc::new(move |event: NostrEvent| {
            let channel_id = event
                .tags
                .iter()
                .find(|t| t.len() >= 4 && t[0] == "e" && t[3] == "root")
                .or_else(|| event.tags.iter().find(|t| t.len() >= 2 && t[0] == "e"))
                .map(|t| t[1].clone());

            if let Some(cid) = channel_id {
                msg_counts.update(|m| {
                    *m.entry(cid.clone()).or_insert(0) += 1;
                });
                last_active.update(|m| {
                    let ts = m.entry(cid).or_insert(0);
                    if event.created_at > *ts {
                        *ts = event.created_at;
                    }
                });
            }
        });

        let store_for_eose = store;
        let on_msg_eose = Rc::new(move || {
            store_for_eose.save_cache();
        });

        let id = relay.subscribe(
            vec![Filter {
                kinds: Some(vec![42]),
                e_tags: Some(channel_ids),
                ..Default::default()
            }],
            on_msg,
            Some(on_msg_eose),
        );
        self.msg_sub_id.set(Some(id));
    }

    /// Cleanup subscriptions.
    pub(crate) fn cleanup(&self, relay: &RelayConnection) {
        if let Some(id) = self.sub_id.get_untracked() {
            relay.unsubscribe(&id);
        }
        if let Some(id) = self.msg_sub_id.get_untracked() {
            relay.unsubscribe(&id);
        }
    }
}

// -- Context helpers ----------------------------------------------------------

/// Provide the channel store. Call once in App root.
pub fn provide_channel_store() {
    provide_context(ChannelStore::new());
}

/// Get the channel store from context.
pub fn use_channel_store() -> ChannelStore {
    expect_context::<ChannelStore>()
}

// -- Helpers ------------------------------------------------------------------

/// Parse kind-40 channel content JSON into (name, description).
pub fn parse_channel_content(content: &str) -> (String, String) {
    match serde_json::from_str::<serde_json::Value>(content) {
        Ok(val) => {
            let name = val
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unnamed Channel")
                .to_string();
            let description = val
                .get("about")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            (name, description)
        }
        Err(_) => ("Unnamed Channel".to_string(), String::new()),
    }
}
