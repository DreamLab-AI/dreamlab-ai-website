//! DM conversation view page.
//!
//! Route: `/dm/:pubkey`
//! Displays decrypted messages with a counterparty in chronological order,
//! provides a compose box for sending NIP-44 encrypted kind 4 events, and
//! auto-scrolls on new messages.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_params_map;
use wasm_bindgen::JsCast;

use crate::auth::use_auth;
use crate::dm::{provide_dm_store, use_dm_store, DMMessage};
use crate::relay::{ConnectionState, RelayConnection};

/// DM chat view component for a single conversation.
#[component]
pub fn DmChatPage() -> impl IntoView {
    let auth = use_auth();
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    // Provide DM store for this subtree
    provide_dm_store();
    let dm_store = use_dm_store();

    let params = use_params_map();
    let recipient_pubkey = move || {
        params.read().get("pubkey").unwrap_or_default()
    };

    // State
    let message_input = RwSignal::new(String::new());
    let sending = RwSignal::new(false);
    let send_error: RwSignal<Option<String>> = RwSignal::new(None);
    let messages_container = NodeRef::<leptos::html::Div>::new();
    let fetch_started = RwSignal::new(false);

    // Subscribe to conversation messages when connected
    let relay_for_sub = relay.clone();
    Effect::new(move |_| {
        let state = conn_state.get();
        let rpk = recipient_pubkey();
        if state != ConnectionState::Connected || rpk.is_empty() {
            return;
        }
        if fetch_started.get_untracked() {
            return;
        }

        let privkey = auth.get_privkey_bytes();
        let pubkey = auth.pubkey().get_untracked();

        if let (Some(sk), Some(pk)) = (privkey, pubkey) {
            fetch_started.set(true);
            dm_store.select_conversation(&rpk);
            dm_store.load_conversation_messages(&relay_for_sub, &sk, &pk, &rpk);
            dm_store.subscribe_incoming(&relay_for_sub, &sk, &pk);
        }
    });

    // Auto-scroll to bottom when messages change
    let messages = dm_store.messages();
    Effect::new(move |_| {
        let _count = messages.get().len();
        if let Some(container) = messages_container.get() {
            let el: web_sys::HtmlElement = container.into();
            let cb = wasm_bindgen::closure::Closure::once(move || {
                el.set_scroll_top(el.scroll_height());
            });
            if let Some(window) = web_sys::window() {
                let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(
                    cb.as_ref().unchecked_ref(),
                    50,
                );
            }
            cb.forget();
        }
    });

    // Cleanup on unmount
    let relay_for_cleanup = relay.clone();
    on_cleanup(move || {
        dm_store.cleanup(&relay_for_cleanup);
    });

    // Send message handler
    let relay_for_send = relay;
    let on_send = move |_: ()| {
        let content = message_input.get_untracked();
        let content = content.trim().to_string();
        if content.is_empty() || sending.get_untracked() {
            return;
        }

        let rpk = recipient_pubkey();
        if rpk.is_empty() {
            return;
        }

        let privkey = auth.get_privkey_bytes();
        let my_pubkey = auth.pubkey().get_untracked();

        match (privkey, my_pubkey) {
            (Some(sk), Some(pk)) => {
                sending.set(true);
                send_error.set(None);
                message_input.set(String::new());

                match dm_store.send_message(&relay_for_send, &rpk, &content, &sk, &pk) {
                    Ok(()) => {
                        sending.set(false);
                    }
                    Err(e) => {
                        web_sys::console::error_1(
                            &format!("[DM] Send failed: {}", e).into(),
                        );
                        send_error.set(Some(e));
                        sending.set(false);
                        message_input.set(content);
                    }
                }
            }
            _ => {
                send_error.set(Some(
                    "Signing key not available. Please re-authenticate.".to_string(),
                ));
            }
        }
    };

    // Handle Enter key
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

    let is_loading = dm_store.is_loading();
    let my_pubkey = auth.pubkey();

    // Short display name for recipient
    let recipient_display = move || {
        let rpk = recipient_pubkey();
        if rpk.len() >= 12 {
            format!("{}...{}", &rpk[..6], &rpk[rpk.len() - 4..])
        } else {
            rpk
        }
    };

    view! {
        <div class="flex flex-col h-[calc(100vh-64px)]">
            // Header
            <div class="bg-gray-800 border-b border-gray-700 p-4">
                <div class="max-w-2xl mx-auto">
                    <div class="flex items-center gap-3">
                        <A href="/dm" attr:class="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700">
                            {arrow_left_svg()}
                        </A>

                        // Avatar
                        <div
                            class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style=move || {
                                let rpk = recipient_pubkey();
                                format!("background-color: {}", pubkey_color(&rpk))
                            }
                        >
                            {move || {
                                let rpk = recipient_pubkey();
                                if rpk.len() >= 2 { rpk[..2].to_uppercase() } else { "??".to_string() }
                            }}
                        </div>

                        <div class="flex-1 min-w-0">
                            <h1 class="text-lg font-bold text-white truncate font-mono">
                                {recipient_display}
                            </h1>
                            <div class="flex items-center gap-2">
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

                                <span class="text-xs text-gray-600">"|"</span>
                                <span class="text-xs text-gray-500">"NIP-44 encrypted"</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            // Error banner
            {move || {
                send_error.get().map(|msg| view! {
                    <div class="max-w-2xl mx-auto p-2">
                        <div class="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 flex items-center justify-between">
                            <span class="text-red-200 text-sm">{msg}</span>
                            <button class="text-red-400 hover:text-red-200 text-xs ml-4"
                                on:click=move |_| send_error.set(None)
                            >
                                "dismiss"
                            </button>
                        </div>
                    </div>
                })
            }}

            // Messages area
            <div
                class="flex-1 overflow-y-auto p-4 bg-gray-900"
                node_ref=messages_container
            >
                <div class="max-w-2xl mx-auto">
                    {move || {
                        if is_loading.get() {
                            view! {
                                <div class="flex items-center justify-center py-20">
                                    <div class="animate-pulse text-gray-400">"Loading messages..."</div>
                                </div>
                            }.into_any()
                        } else {
                            let msgs = messages.get();
                            if msgs.is_empty() {
                                view! {
                                    <div class="flex flex-col items-center justify-center py-20 text-gray-500">
                                        <div class="text-4xl mb-4 opacity-30">"@"</div>
                                        <p class="text-center">"No messages yet. Send the first one!"</p>
                                        <p class="text-xs text-gray-600 mt-2">"Messages are encrypted with NIP-44"</p>
                                    </div>
                                }.into_any()
                            } else {
                                let my_pk = my_pubkey.get().unwrap_or_default();
                                view! {
                                    <div class="space-y-1">
                                        {msgs.into_iter().map(|msg| {
                                            let is_mine = msg.sender_pubkey == my_pk;
                                            view! { <DmBubble message=msg is_mine=is_mine/> }
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
                <div class="max-w-2xl mx-auto">
                    <div class="flex gap-2">
                        <input
                            type="text"
                            class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 transition-colors"
                            placeholder="Type a message..."
                            prop:value=move || message_input.get()
                            on:input=on_input
                            on:keydown=on_keydown
                            prop:disabled=move || sending.get()
                        />
                        <button
                            class="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:text-gray-400 text-gray-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                            on:click=move |_| on_send(())
                            disabled=move || sending.get() || message_input.get().trim().is_empty()
                        >
                            {move || {
                                if sending.get() {
                                    "Sending..."
                                } else {
                                    "Send"
                                }
                            }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    }
}

/// A single DM message bubble with alignment based on sender.
#[component]
fn DmBubble(message: DMMessage, is_mine: bool) -> impl IntoView {
    let time_display = format_relative_time(message.timestamp);
    let content = message.content.clone();

    view! {
        <div class=move || {
            if is_mine {
                "flex justify-end py-1"
            } else {
                "flex justify-start py-1"
            }
        }>
            <div class=move || {
                if is_mine {
                    "max-w-[75%] bg-amber-500/20 border border-amber-500/30 rounded-2xl rounded-br-sm px-4 py-2"
                } else {
                    "max-w-[75%] bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2"
                }
            }>
                <p class="text-sm text-gray-200 break-words whitespace-pre-wrap">
                    {content}
                </p>
                <div class=move || {
                    if is_mine {
                        "flex items-center justify-end gap-1 mt-1"
                    } else {
                        "flex items-center gap-1 mt-1"
                    }
                }>
                    <span class="text-xs text-gray-500">{time_display}</span>
                </div>
            </div>
        </div>
    }
}

/// Format a UNIX timestamp as a relative time string.
fn format_relative_time(timestamp: u64) -> String {
    if timestamp == 0 {
        return "unknown".to_string();
    }

    let now = (js_sys::Date::now() / 1000.0) as u64;
    if now < timestamp {
        return "now".to_string();
    }
    let diff = now - timestamp;

    if diff < 60 {
        return "now".to_string();
    }
    if diff < 3600 {
        let mins = diff / 60;
        return format!("{}m ago", mins);
    }
    if diff < 86400 {
        let hours = diff / 3600;
        return format!("{}h ago", hours);
    }

    let date = js_sys::Date::new_0();
    date.set_time((timestamp as f64) * 1000.0);
    let month = date.get_month();
    let day = date.get_date();
    let hours = date.get_hours();
    let minutes = date.get_minutes();
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let month_name = months.get(month as usize).unwrap_or(&"???");
    format!("{} {} {:02}:{:02}", month_name, day, hours, minutes)
}

/// Generate a deterministic color from a pubkey for the avatar background.
fn pubkey_color(pubkey: &str) -> String {
    let hue = pubkey
        .chars()
        .take(6)
        .enumerate()
        .fold(0u32, |acc, (i, c)| {
            acc.wrapping_add((c as u32).wrapping_mul((i as u32) + 1))
        })
        % 360;
    format!("hsl({}, 55%, 45%)", hue)
}

/// Simple left arrow SVG for the back button.
fn arrow_left_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
        </svg>
    }
}
