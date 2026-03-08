//! Message bubble component for displaying individual chat messages.

use leptos::prelude::*;

use crate::utils::{format_relative_time, pubkey_color, shorten_pubkey};

/// Props for a single message in the channel view.
#[derive(Clone, Debug)]
pub struct MessageData {
    pub id: String,
    pub pubkey: String,
    pub content: String,
    pub created_at: u64,
}

/// Display a single message in the channel chat view.
#[component]
pub fn MessageBubble(message: MessageData) -> impl IntoView {
    let short_pubkey = shorten_pubkey(&message.pubkey);
    let time_display = format_relative_time(message.created_at);
    let avatar_text = message.pubkey[..2].to_uppercase();
    let avatar_bg = pubkey_color(&message.pubkey);

    view! {
        <div class="flex gap-3 py-2 px-2 hover:bg-gray-800/30 rounded-lg transition-colors group">
            // Avatar
            <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ring-2 ring-gray-700/50"
                style=format!("background-color: {}", avatar_bg)
            >
                {avatar_text}
            </div>

            // Content
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                    <span class="font-semibold text-sm text-amber-400 font-mono">
                        {short_pubkey}
                    </span>
                    <span class="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {time_display}
                    </span>
                </div>
                <p class="text-sm text-gray-200 break-words whitespace-pre-wrap mt-0.5 leading-relaxed">
                    {message.content.clone()}
                </p>
            </div>
        </div>
    }
}

