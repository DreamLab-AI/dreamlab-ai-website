//! Single channel view page -- displays messages (kind 42) and compose box.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_params_map;
use nostr_core::NostrEvent;
use std::rc::Rc;

use crate::app::base_href;
use crate::auth::use_auth;
use crate::components::badge::{Badge, BadgeVariant};
use crate::components::channel_stats::ChannelStats;
use crate::components::message_bubble::{MessageBubble, MessageData};
use crate::components::message_input::MessageInput;
use crate::components::pinned_messages::{PinnedMessage, PinnedMessages};
use crate::components::typing_indicator::TypingIndicator;
use crate::relay::{ConnectionState, Filter, RelayConnection};
use crate::stores::channels::ChannelStore;
use crate::stores::read_position::use_read_positions;
use crate::utils::{arrow_left_svg, set_timeout_once};

/// Parsed channel metadata from the kind 40 event.
#[derive(Clone, Debug)]
struct ChannelHeader {
    name: String,
    description: String,
}

/// Single channel view: message list + compose input.
#[component]
pub fn ChannelPage() -> impl IntoView {
    let relay = expect_context::<RelayConnection>();
    let auth = use_auth();
    let conn_state = relay.connection_state();

    let params = use_params_map();
    let channel_id = move || params.read().get("channel_id").unwrap_or_default();

    // Read-position store for mark-as-read
    let read_store = use_read_positions();

    // State
    let messages = RwSignal::new(Vec::<MessageData>::new());
    let channel_info: RwSignal<Option<ChannelHeader>> = RwSignal::new(None);
    let pinned = RwSignal::new(Vec::<PinnedMessage>::new());
    let loading = RwSignal::new(true);
    let last_read_event_id = read_store.last_read_event_id(&channel_id());
    let error_msg: RwSignal<Option<String>> = RwSignal::new(None);

    // Derived signals for ChannelStats
    let message_count = Signal::derive(move || messages.get().len() as u32);
    let member_count = Signal::derive(move || {
        let msgs = messages.get();
        let mut unique = std::collections::HashSet::new();
        for m in &msgs {
            unique.insert(m.pubkey.as_str());
        }
        unique.len() as u32
    });
    let typing_pubkeys = RwSignal::new(Vec::<String>::new());
    let messages_container = NodeRef::<leptos::html::Div>::new();

    // Track subscription IDs for cleanup
    let channel_sub_id: RwSignal<Option<String>> = RwSignal::new(None);
    let messages_sub_id: RwSignal<Option<String>> = RwSignal::new(None);

    // Clone relay for each closure that needs it
    let relay_for_sub = relay.clone();
    let relay_for_send = relay.clone();
    let relay_for_cleanup = relay;

    // Try channel store for instant header (avoids waiting for kind-40 relay round-trip)
    {
        let cid = channel_id();
        if let Some(store) = use_context::<ChannelStore>() {
            let channels = store.channels.get_untracked();
            if let Some(found) = channels
                .iter()
                .find(|c| c.id == cid || c.name == cid)
            {
                channel_info.set(Some(ChannelHeader {
                    name: found.name.clone(),
                    description: found.description.clone(),
                }));
            }
        }
    }

    // Subscribe to channel metadata (kind 40) and messages (kind 42) when connected
    Effect::new(move |_| {
        let state = conn_state.get();
        let cid = channel_id();
        if state != ConnectionState::Connected || cid.is_empty() {
            return;
        }

        // Already subscribed
        if channel_sub_id.get_untracked().is_some() {
            return;
        }

        loading.set(true);
        error_msg.set(None);

        // Fetch channel metadata (kind 40, by event id)
        let channel_filter = Filter {
            ids: Some(vec![cid.clone()]),
            kinds: Some(vec![40]),
            ..Default::default()
        };

        let channel_info_sig = channel_info;
        let on_channel_event = Rc::new(move |event: NostrEvent| {
            if event.kind == 40 {
                let header = parse_channel_metadata(&event.content);
                channel_info_sig.set(Some(header));
            }
        });

        let id1 = relay_for_sub.subscribe(vec![channel_filter], on_channel_event, None);
        channel_sub_id.set(Some(id1));

        // Capture channel store's channels signal for client-side matching.
        // We read it INSIDE the callback (not here) so it picks up channels
        // that arrive after the subscription starts (the kind-40 EOSE may not
        // have fired yet when this Effect runs).
        let channels_sig_for_cb = use_context::<ChannelStore>().map(|s| s.channels);

        // Subscribe to messages (kind 42) -- broad filter, client-side matching.
        // Legacy relay data may tag messages with slugs or section names instead
        // of the kind-40 event id, so we cannot rely on e_tags filtering.
        let msg_filter = Filter {
            kinds: Some(vec![42]),
            ..Default::default()
        };

        let cid_for_cb = cid.clone();
        let messages_sig = messages;
        let msg_debug_count = RwSignal::new(0u32);
        web_sys::console::log_1(&format!("[ChannelPage] subscribing kind-42, cid={}", cid_for_cb).into());
        let on_msg_event = Rc::new(move |event: NostrEvent| {
            if event.kind != 42 {
                return;
            }

            msg_debug_count.update(|c| *c += 1);
            let count = msg_debug_count.get_untracked();
            if count <= 5 {
                let e_tags: Vec<_> = event.tags.iter().filter(|t| t.len() >= 2 && t[0] == "e").collect();
                web_sys::console::log_1(&format!(
                    "[ChannelPage] kind-42 #{}: id={} e_tags={:?} cid={}",
                    count, &event.id[..12], e_tags, cid_for_cb
                ).into());
            }

            // Client-side channel matching: extract root e-tag then resolve
            // against channel id, name, and section — mirrors channels.rs logic.
            let tag_val = event
                .tags
                .iter()
                .find(|t| t.len() >= 4 && t[0] == "e" && t[3] == "root")
                .or_else(|| event.tags.iter().find(|t| t.len() >= 2 && t[0] == "e"))
                .map(|t| t[1].clone());

            let tag_val = match tag_val {
                Some(v) => v,
                None => return,
            };

            // Check exact channel ID match first
            let matches_channel = if tag_val == cid_for_cb {
                true
            } else if let Some(sig) = &channels_sig_for_cb {
                // Read current channel list (populated after kind-40 EOSE)
                let channels = sig.get_untracked();
                if let Some(found) = channels.iter().find(|c| c.id == cid_for_cb || c.name == cid_for_cb) {
                    let val_lower = tag_val.to_lowercase();
                    (!found.name.is_empty() && found.name.to_lowercase() == val_lower)
                        || (!found.section.is_empty() && found.section.to_lowercase() == val_lower)
                } else {
                    false
                }
            } else {
                false
            };
            if !matches_channel {
                return;
            }

            let reply_to = event
                .tags
                .iter()
                .find(|t| t.len() >= 4 && t[0] == "e" && t[3] == "reply")
                .or_else(|| {
                    // Skip the root tag -- pick a secondary e-tag for reply
                    event
                        .tags
                        .iter()
                        .filter(|t| t.len() >= 2 && t[0] == "e")
                        .nth(1)
                })
                .map(|t| t[1].clone());
            let reply_pk = event
                .tags
                .iter()
                .find(|t| t.len() >= 2 && t[0] == "p")
                .map(|t| t[1].clone());
            let msg = MessageData {
                id: event.id.clone(),
                pubkey: event.pubkey.clone(),
                content: event.content.clone(),
                created_at: event.created_at,
                reply_to_id: reply_to,
                reply_to_pubkey: reply_pk,
                reply_to_content: None,
                reactions: RwSignal::new(Vec::new()),
            };

            messages_sig.update(|list| {
                // Deduplicate by event id
                if !list.iter().any(|m| m.id == msg.id) {
                    list.push(msg);
                    // Keep sorted by created_at ascending
                    list.sort_by_key(|m| m.created_at);
                }
            });
        });

        let loading_sig = loading;
        let on_eose = Rc::new(move || {
            web_sys::console::log_1(&"[ChannelPage] EOSE received for kind-42".into());
            loading_sig.set(false);
        });

        let id2 = relay_for_sub.subscribe(vec![msg_filter], on_msg_event, Some(on_eose));
        messages_sub_id.set(Some(id2));

        // Loading timeout (auto-drops closure after execution)
        set_timeout_once(
            move || {
                if loading_sig.get_untracked() {
                    loading_sig.set(false);
                }
            },
            8000,
        );
    });

    // Auto-scroll to bottom when new messages arrive + mark as read
    Effect::new(move |_| {
        let msgs = messages.get();
        let count = msgs.len();
        if let Some(container) = messages_container.get() {
            let el: web_sys::HtmlElement = container.into();
            set_timeout_once(
                move || {
                    el.set_scroll_top(el.scroll_height());
                },
                50,
            );
        }
        // Mark channel as read when messages load or new ones arrive
        if count > 0 {
            if let Some(last) = msgs.last() {
                let cid = channel_id();
                read_store.mark_read(&cid, &last.id, last.created_at);
            }
        }
    });

    // Cleanup subscriptions on unmount
    on_cleanup(move || {
        if let Some(id) = channel_sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
        if let Some(id) = messages_sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
    });

    // Send message handler
    let do_send_text = move |content: String| {
        let cid = channel_id();
        if cid.is_empty() {
            return;
        }

        let pubkey = auth.pubkey().get_untracked().unwrap_or_default();
        if pubkey.is_empty() {
            error_msg.set(Some("Not authenticated".to_string()));
            return;
        }

        let now = (js_sys::Date::now() / 1000.0) as u64;
        let content_for_index = content.clone();
        let unsigned = nostr_core::UnsignedEvent {
            pubkey: pubkey.clone(),
            created_at: now,
            kind: 42,
            tags: vec![vec![
                "e".to_string(),
                cid.clone(),
                String::new(),
                "root".to_string(),
            ]],
            content,
        };

        match auth.sign_event(unsigned) {
            Ok(signed) => {
                let event_id = signed.id.clone();
                let _ = relay_for_send.publish(&signed);

                // Auto-index for semantic search in background
                let channel_for_index = cid;
                let privkey_bytes = auth.get_privkey_bytes();
                wasm_bindgen_futures::spawn_local(async move {
                    if let Some(key) = privkey_bytes {
                        let _ = crate::utils::search_client::ingest_message(
                            &event_id,
                            &content_for_index,
                            Some(&channel_for_index),
                            &key,
                        )
                        .await;
                    }
                });
            }
            Err(e) => {
                error_msg.set(Some(e));
            }
        }
    };

    let send_callback = Callback::new(do_send_text);
    let is_authed = auth.is_authenticated();

    // Derive avatar letter from channel name
    let avatar_letter = move || {
        channel_info
            .get()
            .map(|c| {
                c.name
                    .chars()
                    .next()
                    .unwrap_or('#')
                    .to_uppercase()
                    .to_string()
            })
            .unwrap_or_else(|| "#".to_string())
    };

    view! {
        <div class="flex flex-col h-[calc(100vh-64px)]">
            // Channel header
            <div class="bg-gray-800 border-b border-gray-700 relative">
                <div class="p-4">
                    <div class="max-w-4xl mx-auto">
                        <div class="flex items-center gap-3 mb-1">
                            <A href=base_href("/chat") attr:class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700">
                                {arrow_left_svg()}
                            </A>
                            // Channel avatar
                            <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {avatar_letter}
                            </div>
                            <h1 class="text-2xl font-bold text-white">
                                {move || {
                                    channel_info.get()
                                        .map(|c| c.name)
                                        .unwrap_or_else(|| "Loading...".to_string())
                                }}
                            </h1>
                        </div>
                        {move || {
                            channel_info.get().and_then(|c| {
                                if c.description.is_empty() {
                                    None
                                } else {
                                    Some(view! {
                                        <p class="text-sm text-gray-400 ml-14">
                                            {c.description}
                                        </p>
                                    })
                                }
                            })
                        }}
                        <div class="flex items-center gap-2 mt-1 ml-14">
                            <ChannelStats
                                message_count=message_count
                                member_count=member_count
                            />
                            // Connection indicator
                            {move || {
                                let state = conn_state.get();
                                match state {
                                    ConnectionState::Connected => view! {
                                        <Badge text="Connected".to_string() variant=BadgeVariant::Success />
                                    }.into_any(),
                                    ConnectionState::Reconnecting => view! {
                                        <Badge text="Reconnecting".to_string() variant=BadgeVariant::Warning pulse=true />
                                    }.into_any(),
                                    _ => view! {
                                        <Badge text="Disconnected".to_string() variant=BadgeVariant::Error />
                                    }.into_any(),
                                }
                            }}
                        </div>
                    </div>
                </div>
                // Subtle bottom gradient line
                <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
            </div>

            // Error banner
            {move || {
                error_msg.get().map(|msg| view! {
                    <div class="max-w-4xl mx-auto p-2">
                        <div class="bg-yellow-900/50 border border-yellow-700 rounded-lg px-4 py-2 flex items-center justify-between">
                            <span class="text-yellow-200 text-sm">{msg}</span>
                            <button class="text-yellow-400 hover:text-yellow-200 text-xs ml-4"
                                on:click=move |_| error_msg.set(None)
                            >
                                "dismiss"
                            </button>
                        </div>
                    </div>
                })
            }}

            // Messages area
            <div
                class="flex-1 overflow-y-auto bg-gray-900 relative"
                node_ref=messages_container
            >
                // Top fade gradient to indicate scrollability
                <div class="sticky top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-900 to-transparent z-10 pointer-events-none"></div>

                <div class="max-w-4xl mx-auto px-4 pb-4">
                    // Pinned messages banner
                    {
                        let cid = channel_id();
                        view! { <PinnedMessages channel_id=cid pinned=pinned /> }
                    }

                    {move || {
                        if loading.get() {
                            view! {
                                <div class="flex flex-col items-center justify-center py-20 gap-3">
                                    <svg class="w-6 h-6 text-amber-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span class="text-gray-400 text-sm">"Loading messages..."</span>
                                </div>
                            }.into_any()
                        } else {
                            let msgs = messages.get();
                            if msgs.is_empty() {
                                view! {
                                    <div class="flex flex-col items-center justify-center py-20 text-center">
                                        <div class="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                                            <svg class="w-7 h-7 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/>
                                            </svg>
                                        </div>
                                        <h3 class="text-white font-semibold mb-1">"No messages yet"</h3>
                                        <p class="text-gray-500 text-sm">"Be the first to start this conversation."</p>
                                    </div>
                                }.into_any()
                            } else {
                                let last_read = last_read_event_id.clone();
                                let mut found_divider = false;
                                view! {
                                    <div class="space-y-1">
                                        {msgs.into_iter().map(|msg| {
                                            let show_divider = if !found_divider && !last_read.is_empty() && msg.id == last_read {
                                                found_divider = true;
                                                false
                                            } else if found_divider {
                                                found_divider = false;
                                                true
                                            } else {
                                                false
                                            };
                                            view! {
                                                <>
                                                    {show_divider.then(|| view! {
                                                        <div class="flex items-center gap-3 py-2">
                                                            <div class="flex-1 h-px bg-amber-500/30"></div>
                                                            <span class="text-xs font-medium text-amber-400">"New messages"</span>
                                                            <div class="flex-1 h-px bg-amber-500/30"></div>
                                                        </div>
                                                    })}
                                                    <MessageBubble message=msg/>
                                                </>
                                            }
                                        }).collect_view()}
                                    </div>
                                }.into_any()
                            }
                        }
                    }}
                </div>
            </div>

            // Compose area (only when authenticated)
            <Show when=move || is_authed.get()>
                <div class="bg-gray-800 border-t border-gray-700 p-3">
                    <div class="max-w-4xl mx-auto">
                        <TypingIndicator typing_pubkeys=typing_pubkeys />
                        <MessageInput on_send=send_callback channel_id=channel_id() />
                    </div>
                </div>
            </Show>
        </div>
    }
}

/// Parse kind 40 event content JSON into channel name and description.
fn parse_channel_metadata(content: &str) -> ChannelHeader {
    match serde_json::from_str::<serde_json::Value>(content) {
        Ok(val) => ChannelHeader {
            name: val
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unnamed Channel")
                .to_string(),
            description: val
                .get("about")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        },
        Err(_) => ChannelHeader {
            name: "Unnamed Channel".to_string(),
            description: String::new(),
        },
    }
}
