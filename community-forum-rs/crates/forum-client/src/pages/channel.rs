//! Single channel view page -- displays messages (kind 42) and compose box.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_params_map;
use nostr_core::NostrEvent;
use std::rc::Rc;
use wasm_bindgen::JsCast;

use crate::auth::use_auth;
use crate::components::message_bubble::{MessageBubble, MessageData};
use crate::relay::{ConnectionState, Filter, RelayConnection};
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
    let channel_id = move || {
        params.read().get("channel_id").unwrap_or_default()
    };

    // State
    let messages = RwSignal::new(Vec::<MessageData>::new());
    let channel_info: RwSignal<Option<ChannelHeader>> = RwSignal::new(None);
    let loading = RwSignal::new(true);
    let error_msg: RwSignal<Option<String>> = RwSignal::new(None);
    let message_input = RwSignal::new(String::new());
    let sending = RwSignal::new(false);
    let messages_container = NodeRef::<leptos::html::Div>::new();

    // Track subscription IDs for cleanup
    let channel_sub_id: RwSignal<Option<String>> = RwSignal::new(None);
    let messages_sub_id: RwSignal<Option<String>> = RwSignal::new(None);

    // Clone relay for each closure that needs it
    let relay_for_sub = relay.clone();
    let relay_for_cleanup = relay;

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

        // Subscribe to messages (kind 42) referencing this channel
        let msg_filter = Filter {
            kinds: Some(vec![42]),
            e_tags: Some(vec![cid.clone()]),
            ..Default::default()
        };

        let messages_sig = messages;
        let on_msg_event = Rc::new(move |event: NostrEvent| {
            if event.kind != 42 {
                return;
            }

            let msg = MessageData {
                id: event.id.clone(),
                pubkey: event.pubkey.clone(),
                content: event.content.clone(),
                created_at: event.created_at,
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
            loading_sig.set(false);
        });

        let id2 = relay_for_sub.subscribe(vec![msg_filter], on_msg_event, Some(on_eose));
        messages_sub_id.set(Some(id2));

        // Loading timeout (auto-drops closure after execution)
        set_timeout_once(move || {
            if loading_sig.get_untracked() {
                loading_sig.set(false);
            }
        }, 8000);
    });

    // Auto-scroll to bottom when new messages arrive
    Effect::new(move |_| {
        let _count = messages.get().len();
        if let Some(container) = messages_container.get() {
            let el: web_sys::HtmlElement = container.into();
            set_timeout_once(move || {
                el.set_scroll_top(el.scroll_height());
            }, 50);
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
    let relay_for_send = expect_context::<RelayConnection>();
    let on_send = move |_: ()| {
        let content = message_input.get_untracked();
        let content = content.trim().to_string();
        if content.is_empty() || sending.get_untracked() {
            return;
        }

        let cid = channel_id();
        if cid.is_empty() {
            return;
        }

        sending.set(true);
        message_input.set(String::new());

        // Get pubkey from auth store
        let pubkey = auth.pubkey().get_untracked().unwrap_or_default();
        if pubkey.is_empty() {
            error_msg.set(Some("Not authenticated".to_string()));
            sending.set(false);
            message_input.set(content);
            return;
        }

        let now = (js_sys::Date::now() / 1000.0) as u64;

        let unsigned = nostr_core::UnsignedEvent {
            pubkey: pubkey.clone(),
            created_at: now,
            kind: 42,
            tags: vec![vec![
                "e".to_string(),
                cid,
                String::new(),
                "root".to_string(),
            ]],
            content: content.clone(),
        };

        // Sign via AuthStore — privkey bytes never leave the auth module
        match auth.sign_event(unsigned) {
            Ok(signed_event) => {
                relay_for_send.publish(&signed_event);
                sending.set(false);
            }
            Err(e) => {
                web_sys::console::error_1(
                    &format!("[Channel] Signing failed: {}", e).into(),
                );
                error_msg.set(Some(e));
                sending.set(false);
                message_input.set(content);
            }
        }
    };

    // Handle Enter key in input
    let on_send_clone = on_send.clone();
    let on_keydown = move |ev: leptos::ev::KeyboardEvent| {
        if ev.key() == "Enter" && !ev.shift_key() {
            ev.prevent_default();
            on_send_clone(());
        }
    };

    let on_input = move |ev: leptos::ev::Event| {
        let target = ev.target().unwrap();
        let input: web_sys::HtmlInputElement = target.unchecked_into();
        message_input.set(input.value());
    };

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
                            <A href="/chat" attr:class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700">
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
                            <span class="text-xs text-gray-500 border border-gray-600 rounded px-1.5 py-0.5">
                                {move || format!("{} messages", messages.get().len())}
                            </span>
                            // Connection indicator
                            {move || {
                                let state = conn_state.get();
                                match state {
                                    ConnectionState::Connected => view! {
                                        <span class="text-xs text-green-400 flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                            "Connected"
                                        </span>
                                    }.into_any(),
                                    ConnectionState::Reconnecting => view! {
                                        <span class="text-xs text-yellow-400 flex items-center gap-1">
                                            <span class="animate-pulse w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                                            "Reconnecting"
                                        </span>
                                    }.into_any(),
                                    _ => view! {
                                        <span class="text-xs text-red-400 flex items-center gap-1">
                                            <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                            "Disconnected"
                                        </span>
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
                                view! {
                                    <div class="space-y-1">
                                        {msgs.into_iter().map(|msg| {
                                            view! { <MessageBubble message=msg/> }
                                        }).collect_view()}
                                    </div>
                                }.into_any()
                            }
                        }
                    }}
                </div>
            </div>

            // Compose area
            <div class="bg-gray-800 border-t border-gray-700 p-4">
                <div class="max-w-4xl mx-auto">
                    <div class="flex gap-2 items-end">
                        <input
                            type="text"
                            class="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:shadow-[0_0_0_1px_rgba(245,158,11,0.5)] transition-all"
                            placeholder="Type a message..."
                            prop:value=move || message_input.get()
                            on:input=on_input
                            on:keydown=on_keydown
                            prop:disabled=move || sending.get()
                        />
                        <button
                            class="w-10 h-10 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 text-gray-900 disabled:text-gray-400 transition-colors flex-shrink-0"
                            on:click=move |_| on_send(())
                            disabled=move || sending.get() || message_input.get().trim().is_empty()
                        >
                            {move || {
                                if sending.get() {
                                    view! {
                                        <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    }.into_any()
                                } else {
                                    view! {
                                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd"/>
                                        </svg>
                                    }.into_any()
                                }
                            }}
                        </button>
                    </div>
                </div>
            </div>
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

