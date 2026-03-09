//! Collapsible banner showing pinned messages at the top of a channel.
//!
//! Displays up to 5 pinned messages with author, timestamp, and a click
//! handler that scrolls to the original message in the list.

use leptos::prelude::*;

use crate::components::avatar::{Avatar, AvatarSize};
use crate::components::user_display::NameCache;
use crate::utils::{format_relative_time, shorten_pubkey};

/// A single pinned message's data.
#[derive(Clone, Debug)]
pub struct PinnedMessage {
    pub event_id: String,
    pub pubkey: String,
    pub content: String,
    pub created_at: u64,
}

/// Maximum number of pinned messages to display.
const MAX_PINNED: usize = 5;

/// Collapsible pinned-messages banner for a channel.
///
/// Renders a glass-card with an amber left border. Clicking a pinned message
/// scrolls to its position in the message list via `data-event-id`.
#[component]
pub fn PinnedMessages(
    /// The channel ID (used for keying; currently informational).
    #[prop(into)]
    channel_id: String,
    /// Reactive list of pinned messages for this channel.
    pinned: RwSignal<Vec<PinnedMessage>>,
) -> impl IntoView {
    let collapsed = RwSignal::new(false);
    let _ = channel_id; // reserved for future admin-pin actions

    let pinned_count = move || pinned.get().len();
    let has_pinned = move || pinned_count() > 0;

    let toggle = move |_| collapsed.update(|v| *v = !*v);

    view! {
        <Show when=has_pinned>
            <div class="glass-card border-l-2 border-amber-400 rounded-lg mb-3 overflow-hidden">
                // Header bar (always visible)
                <button
                    class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-800/30 transition-colors"
                    on:click=toggle
                >
                    <div class="flex items-center gap-2 text-amber-400">
                        // Pin icon
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                        </svg>
                        <span class="text-sm font-medium">
                            {move || format!("{} pinned message{}", pinned_count(), if pinned_count() == 1 { "" } else { "s" })}
                        </span>
                    </div>
                    // Chevron
                    <svg
                        class=move || if collapsed.get() {
                            "w-4 h-4 text-gray-500 transition-transform -rotate-90"
                        } else {
                            "w-4 h-4 text-gray-500 transition-transform"
                        }
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    >
                        <polyline points="6 9 12 15 18 9" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>

                // Pinned messages list
                <Show when=move || !collapsed.get()>
                    <div class="border-t border-gray-700/50 divide-y divide-gray-700/30">
                        {move || {
                            let msgs = pinned.get();
                            msgs.into_iter().take(MAX_PINNED).map(|msg| {
                                let eid = msg.event_id.clone();
                                let pk = msg.pubkey.clone();
                                let pk_for_name = pk.clone();
                                let content_preview = truncate_content(&msg.content, 120);
                                let time = format_relative_time(msg.created_at);

                                let display_name = Memo::new(move |_| {
                                    if let Some(cache) = use_context::<NameCache>() {
                                        if let Some(name) = cache.0.get().get(&pk_for_name).cloned() {
                                            return name;
                                        }
                                    }
                                    shorten_pubkey(&pk_for_name)
                                });

                                let on_click = move |_| {
                                    scroll_to_event(&eid);
                                };

                                view! {
                                    <button
                                        class="w-full text-left px-4 py-2 hover:bg-gray-800/30 transition-colors flex items-start gap-2.5"
                                        on:click=on_click
                                    >
                                        <Avatar pubkey=pk size=AvatarSize::Sm />
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-baseline gap-2">
                                                <span class="text-xs font-medium text-amber-400">{move || display_name.get()}</span>
                                                <span class="text-xs text-gray-600">{time.clone()}</span>
                                            </div>
                                            <p class="text-xs text-gray-400 truncate mt-0.5">{content_preview}</p>
                                        </div>
                                    </button>
                                }
                            }).collect_view()
                        }}
                    </div>
                </Show>
            </div>
        </Show>
    }
}

/// Scroll to a message element with the given `data-event-id` attribute.
fn scroll_to_event(event_id: &str) {
    if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
        let selector = format!("[data-event-id=\"{}\"]", event_id);
        if let Ok(Some(el)) = doc.query_selector(&selector) {
            let opts = web_sys::ScrollIntoViewOptions::new();
            opts.set_behavior(web_sys::ScrollBehavior::Smooth);
            el.scroll_into_view_with_scroll_into_view_options(&opts);
        }
    }
}

/// Truncate content to at most `max` characters, appending "..." if truncated.
fn truncate_content(content: &str, max: usize) -> String {
    if content.len() <= max {
        content.to_string()
    } else {
        let end = content
            .char_indices()
            .nth(max)
            .map(|(i, _)| i)
            .unwrap_or(content.len());
        format!("{}...", &content[..end])
    }
}
