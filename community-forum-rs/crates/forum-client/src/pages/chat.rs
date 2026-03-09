//! Channel list page -- displays NIP-28 channels (kind 40) from the relay.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_query_map;
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::JsCast;

use crate::app::base_href;
use crate::components::channel_card::{ChannelCard, ChannelInfo};
use crate::relay::{ConnectionState, Filter, RelayConnection};

/// Parsed channel creation event metadata.
#[derive(Clone, Debug)]
struct ChannelMeta {
    id: String,
    name: String,
    description: String,
    section: String,
    #[allow(dead_code)]
    created_at: u64,
}

/// Section filter pill definitions.
const SECTION_FILTERS: &[(&str, &str)] = &[
    ("All", ""),
    ("General", "general"),
    ("Music", "music"),
    ("Events", "events"),
    ("Tech", "tech"),
    ("Random", "random"),
];

/// Channel list page. Subscribes to kind 40 (channel creation) events,
/// displays them as cards, and supports filtering by section query param.
#[component]
pub fn ChatPage() -> impl IntoView {
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    let query = use_query_map();
    let section_filter = move || query.read().get("section").unwrap_or_default();

    // Reactive state
    let channels = RwSignal::new(Vec::<ChannelMeta>::new());
    let message_counts = RwSignal::new(HashMap::<String, u32>::new());
    let last_active_map = RwSignal::new(HashMap::<String, u64>::new());
    let loading = RwSignal::new(true);
    let error_msg: RwSignal<Option<String>> = RwSignal::new(None);
    let eose_received = RwSignal::new(false);

    // Track the active subscription ID for cleanup
    let sub_id: RwSignal<Option<String>> = RwSignal::new(None);
    let msg_sub_id: RwSignal<Option<String>> = RwSignal::new(None);

    // Clone relay for each closure that needs it
    let relay_for_channels = relay.clone();
    let relay_for_msgs = relay.clone();
    let relay_for_cleanup = relay;

    // Subscribe to kind 40 events when connected
    Effect::new(move |_| {
        let state = conn_state.get();
        if state != ConnectionState::Connected {
            return;
        }

        // Already subscribed
        if sub_id.get_untracked().is_some() {
            return;
        }

        loading.set(true);
        error_msg.set(None);

        let filter = Filter {
            kinds: Some(vec![40]),
            ..Default::default()
        };

        let channels_sig = channels;
        let on_event = Rc::new(move |event: nostr_core::NostrEvent| {
            if event.kind != 40 {
                return;
            }

            // Parse channel metadata from content JSON
            let (name, description) = parse_channel_content(&event.content);

            // Extract section from tags
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

            // Add or update channel (deduplicate by id)
            channels_sig.update(|list| {
                if !list.iter().any(|c| c.id == meta.id) {
                    list.push(meta);
                }
            });
        });

        let on_eose = Rc::new(move || {
            loading.set(false);
            eose_received.set(true);
        });

        let id = relay_for_channels.subscribe(vec![filter], on_event, Some(on_eose));
        sub_id.set(Some(id));

        // Set a loading timeout so the UI never gets stuck
        let loading_sig = loading;
        let cb = wasm_bindgen::closure::Closure::once(move || {
            if loading_sig.get_untracked() {
                loading_sig.set(false);
            }
        });
        let window = web_sys::window().expect("no global window");
        let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
            cb.as_ref().unchecked_ref(),
            6000,
        );
        cb.forget();
    });

    // Subscribe to kind 42 (messages) once channel EOSE arrives, for counts
    Effect::new(move |_| {
        if !eose_received.get() {
            return;
        }
        if msg_sub_id.get_untracked().is_some() {
            return;
        }

        let channel_ids: Vec<String> = channels
            .get_untracked()
            .iter()
            .map(|c| c.id.clone())
            .collect();
        if channel_ids.is_empty() {
            return;
        }

        let msg_filter = Filter {
            kinds: Some(vec![42]),
            e_tags: Some(channel_ids),
            ..Default::default()
        };

        let msg_counts = message_counts;
        let last_active = last_active_map;
        let on_msg_event = Rc::new(move |event: nostr_core::NostrEvent| {
            // Find channel ID from the root "e" tag
            let channel_id = event
                .tags
                .iter()
                .find(|t| t.len() >= 4 && t[0] == "e" && t[3] == "root")
                .or_else(|| event.tags.iter().find(|t| t.len() >= 2 && t[0] == "e"))
                .map(|t| t[1].clone());

            if let Some(cid) = channel_id {
                msg_counts.update(|m| {
                    let count = m.entry(cid.clone()).or_insert(0);
                    *count += 1;
                });
                last_active.update(|m| {
                    let ts = m.entry(cid).or_insert(0);
                    if event.created_at > *ts {
                        *ts = event.created_at;
                    }
                });
            }
        });

        let id = relay_for_msgs.subscribe(vec![msg_filter], on_msg_event, None);
        msg_sub_id.set(Some(id));
    });

    // Cleanup subscriptions on unmount
    on_cleanup(move || {
        if let Some(id) = sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
        if let Some(id) = msg_sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
    });

    // Filtered and sorted channel list
    let filtered_channels = move || {
        let section = section_filter();
        let chans = channels.get();
        let counts = message_counts.get();
        let active = last_active_map.get();

        let mut result: Vec<ChannelInfo> = chans
            .iter()
            .filter(|c| section.is_empty() || c.section == section)
            .map(|c| ChannelInfo {
                id: c.id.clone(),
                name: c.name.clone(),
                description: c.description.clone(),
                section: c.section.clone(),
                message_count: counts.get(&c.id).copied().unwrap_or(0),
                last_active: active.get(&c.id).copied().unwrap_or(0),
            })
            .collect();

        // Sort by last active descending (most recent first)
        result.sort_by(|a, b| b.last_active.cmp(&a.last_active));
        result
    };

    let page_title = move || {
        let section = section_filter();
        if section.is_empty() {
            "Channels".to_string()
        } else {
            section
        }
    };

    let channel_count = move || channels.get().len();

    view! {
        <div class="max-w-4xl mx-auto p-4 sm:p-6">
            <div class="mb-6">
                <div class="flex items-center gap-3 mb-1">
                    <h1 class="text-3xl font-bold text-white">{page_title}</h1>
                    {move || {
                        let count = channel_count();
                        if !loading.get() && count > 0 {
                            Some(view! {
                                <span class="text-xs font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-0.5">
                                    {count}
                                </span>
                            })
                        } else {
                            None
                        }
                    }}
                </div>
                <p class="text-gray-400">"Join conversations in public channels"</p>
            </div>

            // Section filter pills
            <div class="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none" style="-webkit-overflow-scrolling: touch">
                {SECTION_FILTERS.iter().map(|&(label, value)| {
                    let current = section_filter();
                    let is_active = if value.is_empty() {
                        current.is_empty()
                    } else {
                        current == value
                    };
                    let href = if value.is_empty() {
                        base_href("/chat")
                    } else {
                        base_href(&format!("/chat?section={}", value))
                    };
                    let class = if is_active {
                        "inline-block px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-500 text-gray-900 whitespace-nowrap transition-colors"
                    } else {
                        "inline-block px-3 py-1.5 rounded-full text-sm bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700 hover:text-gray-200 whitespace-nowrap transition-colors"
                    };
                    view! {
                        <A href=href attr:class=class>
                            {label}
                        </A>
                    }
                }).collect_view()}
            </div>

            // Connection banner
            {move || {
                let state = conn_state.get();
                match state {
                    ConnectionState::Reconnecting => Some(view! {
                        <div class="bg-yellow-900/50 border border-yellow-700 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                            <span class="animate-pulse w-2 h-2 rounded-full bg-yellow-400"></span>
                            <span class="text-yellow-200 text-sm">"Reconnecting to relay..."</span>
                        </div>
                    }.into_any()),
                    ConnectionState::Error => Some(view! {
                        <div class="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
                            <span class="text-red-200 text-sm">"Connection error. Retrying..."</span>
                        </div>
                    }.into_any()),
                    ConnectionState::Disconnected => Some(view! {
                        <div class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4">
                            <span class="text-gray-300 text-sm">"Disconnected from relay."</span>
                        </div>
                    }.into_any()),
                    _ => None,
                }
            }}

            // Error message
            {move || {
                error_msg.get().map(|msg| view! {
                    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center mb-4">
                        <h3 class="text-lg font-semibold text-red-400 mb-2">"Connection Issue"</h3>
                        <p class="text-gray-400 mb-4">{msg}</p>
                    </div>
                })
            }}

            // Content
            {move || {
                if loading.get() {
                    view! {
                        <div class="space-y-3">
                            <ChannelSkeleton/>
                            <ChannelSkeleton/>
                            <ChannelSkeleton/>
                            <ChannelSkeleton/>
                            <ChannelSkeleton/>
                        </div>
                    }.into_any()
                } else {
                    let chans = filtered_channels();
                    if chans.is_empty() {
                        view! {
                            <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
                                // Chat bubble SVG icon
                                <div class="flex justify-center mb-5">
                                    <div class="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center">
                                        <svg class="w-8 h-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                                        </svg>
                                    </div>
                                </div>
                                <h3 class="text-lg font-semibold text-white mb-2">
                                    {move || {
                                        let section = section_filter();
                                        if section.is_empty() {
                                            "No channels yet".to_string()
                                        } else {
                                            format!("No channels in {}", section)
                                        }
                                    }}
                                </h3>
                                <p class="text-gray-400 mb-6 max-w-sm mx-auto">
                                    "Channels are where conversations happen. New channels will appear here as they are created."
                                </p>
                                {move || {
                                    let section = section_filter();
                                    if !section.is_empty() {
                                        Some(view! {
                                            <A href=base_href("/chat") attr:class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-5 py-2.5 rounded-lg transition-colors">
                                                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
                                                </svg>
                                                "View All Channels"
                                            </A>
                                        })
                                    } else {
                                        None
                                    }
                                }}
                            </div>
                        }.into_any()
                    } else {
                        view! {
                            <div class="space-y-3">
                                {chans.into_iter().map(|ch| {
                                    view! { <ChannelCard channel=ch/> }
                                }).collect_view()}
                            </div>
                        }.into_any()
                    }
                }
            }}
        </div>
    }
}

/// Skeleton loader for a channel card (loading placeholder).
#[component]
fn ChannelSkeleton() -> impl IntoView {
    view! {
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div class="flex gap-4">
                <div class="w-12 h-12 rounded-lg skeleton"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 skeleton rounded w-1/3"></div>
                    <div class="h-3 skeleton rounded w-2/3"></div>
                    <div class="h-3 skeleton rounded w-1/4 mt-3"></div>
                </div>
            </div>
        </div>
    }
}

/// Parse channel creation event content JSON into (name, description).
fn parse_channel_content(content: &str) -> (String, String) {
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
