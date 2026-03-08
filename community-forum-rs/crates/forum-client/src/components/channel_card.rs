//! Channel card component for the channel list page.

use leptos::prelude::*;
use leptos_router::components::A;

/// Props for the ChannelCard component.
#[derive(Clone, Debug)]
pub struct ChannelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub section: String,
    pub message_count: u32,
    pub last_active: u64,
}

/// Display a single channel as a card in the channel list.
#[component]
pub fn ChannelCard(channel: ChannelInfo) -> impl IntoView {
    let href = format!("/chat/{}", channel.id);
    let last_active_display = format_relative_time(channel.last_active);
    let has_messages = channel.last_active > 0;
    let msg_count_label = if channel.message_count == 1 {
        "1 post".to_string()
    } else {
        format!("{} posts", channel.message_count)
    };

    let icon = get_section_icon(&channel.name);
    let name = channel.name.clone();
    let section = channel.section.clone();
    let description = channel.description.clone();
    let has_section = !section.is_empty();
    let has_description = !description.is_empty();

    view! {
        <A href=href attr:class="block bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-amber-500/30 rounded-lg transition-all no-underline text-inherit">
            <div class="p-4">
                <div class="flex gap-4">
                    // Category icon
                    <div class="flex-shrink-0">
                        <div class="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg font-bold">
                            {icon}
                        </div>
                    </div>

                    // Channel info
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-bold text-white truncate">
                                        {name}
                                    </h3>
                                    {has_section.then(|| view! {
                                        <span class="text-xs text-gray-500 border border-gray-600 rounded px-1.5 py-0.5">
                                            {section}
                                        </span>
                                    })}
                                </div>
                                {has_description.then(|| view! {
                                    <p class="text-sm text-gray-400 truncate mt-0.5">
                                        {description}
                                    </p>
                                })}
                            </div>

                            // Stats
                            <div class="flex flex-col items-end gap-1 flex-shrink-0">
                                <span class="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-0.5 font-medium">
                                    {msg_count_label}
                                </span>
                            </div>
                        </div>

                        // Last active
                        <div class="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
                            {if has_messages {
                                format!("Last active: {}", last_active_display)
                            } else {
                                "No messages yet -- be the first to post!".to_string()
                            }}
                        </div>
                    </div>
                </div>
            </div>
        </A>
    }
}

/// Format a UNIX timestamp as a relative time string.
fn format_relative_time(timestamp: u64) -> String {
    if timestamp == 0 {
        return "never".to_string();
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
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let month_name = months.get(month as usize).unwrap_or(&"???");
    format!("{} {}", month_name, day)
}

/// Map channel name keywords to a simple text icon.
fn get_section_icon(name: &str) -> &'static str {
    let lower = name.to_lowercase();
    if lower.contains("general") {
        return "G";
    }
    if lower.contains("music") || lower.contains("tuneage") {
        return "M";
    }
    if lower.contains("event") || lower.contains("calendar") {
        return "E";
    }
    if lower.contains("help") || lower.contains("support") {
        return "?";
    }
    if lower.contains("announce") || lower.contains("news") {
        return "!";
    }
    if lower.contains("random") || lower.contains("offtopic") {
        return "~";
    }
    if lower.contains("tech") || lower.contains("dev") {
        return "<>";
    }
    "#"
}
