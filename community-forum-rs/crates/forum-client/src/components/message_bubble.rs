//! Message bubble component for displaying individual chat messages.

use leptos::prelude::*;

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
        <div class="flex gap-3 py-2 px-2 hover:bg-gray-800/50 rounded-lg transition-colors group">
            // Avatar
            <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
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
                    <span class="text-xs text-gray-500">
                        {time_display}
                    </span>
                </div>
                <p class="text-sm text-gray-200 break-words whitespace-pre-wrap mt-0.5">
                    {message.content.clone()}
                </p>
            </div>
        </div>
    }
}

/// Shorten a hex pubkey to "abcd12...ef56" format.
fn shorten_pubkey(pubkey: &str) -> String {
    if pubkey.len() < 12 {
        return pubkey.to_string();
    }
    format!("{}...{}", &pubkey[..6], &pubkey[pubkey.len() - 4..])
}

/// Format a UNIX timestamp as a relative time string.
fn format_relative_time(timestamp: u64) -> String {
    if timestamp == 0 {
        return "unknown".to_string();
    }

    let now = (js_sys::Date::now() / 1000.0) as u64;
    if now < timestamp {
        return "just now".to_string();
    }
    let diff = now - timestamp;

    if diff < 60 {
        return "just now".to_string();
    }
    if diff < 3600 {
        let mins = diff / 60;
        return format!("{}m ago", mins);
    }
    if diff < 86400 {
        let hours = diff / 3600;
        return format!("{}h ago", hours);
    }
    if diff < 604800 {
        let days = diff / 86400;
        return format!("{}d ago", days);
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
    // Use first 6 hex chars as HSL hue seed
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
