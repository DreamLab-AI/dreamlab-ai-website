//! Rich message bubble with mentions, media embeds, link previews, reactions, and bookmarks.

use leptos::prelude::*;

use crate::components::avatar::{Avatar, AvatarSize};
use crate::components::bookmarks_modal::use_bookmarks;
use crate::components::link_preview::LinkPreview;
use crate::components::media_embed::MediaEmbed;
use crate::components::mention_text::MentionText;
use crate::components::quoted_message::QuotedMessage;
use crate::components::reaction_bar::{Reaction, ReactionBar};
use crate::components::user_display::NameCache;
use crate::utils::{format_relative_time, shorten_pubkey};

/// Props for a single message in the channel view.
#[derive(Clone, Debug)]
pub struct MessageData {
    pub id: String,
    pub pubkey: String,
    pub content: String,
    pub created_at: u64,
    /// Reply-to event ID (from `e` tag with "reply" marker).
    pub reply_to_id: Option<String>,
    /// Reply-to author pubkey.
    pub reply_to_pubkey: Option<String>,
    /// Reply-to content (cached for display).
    pub reply_to_content: Option<String>,
    /// Reactive reactions list.
    pub reactions: RwSignal<Vec<Reaction>>,
}

/// Global context for opening a profile modal from any component.
#[derive(Clone, Copy)]
pub struct ProfileModalTarget(pub RwSignal<Option<String>>);

/// Provide the profile modal target context. Call once at app root.
pub fn provide_profile_modal_target() {
    provide_context(ProfileModalTarget(RwSignal::new(None)));
}

/// Display a rich message bubble with all interactive features.
#[component]
pub fn MessageBubble(message: MessageData) -> impl IntoView {
    let time_display = format_relative_time(message.created_at);
    let bookmarks = use_bookmarks();
    let event_id = message.id.clone();
    let msg_pubkey = message.pubkey.clone();
    let content = message.content.clone();
    let pk_for_avatar = msg_pubkey.clone();

    // Extract URLs from content for media embeds and link previews
    let urls = extract_urls(&content);
    let (media_urls, link_urls): (Vec<_>, Vec<_>) =
        urls.into_iter().partition(|url| is_media_url(url));
    let first_link_url = link_urls.into_iter().next();

    // Bookmark toggle via StoredValue (Copy-friendly)
    let is_bookmarked = bookmarks.is_bookmarked_signal(event_id.clone());
    let eid_bm = StoredValue::new(event_id.clone());
    let content_bm = StoredValue::new(content.clone());
    let pk_bm = StoredValue::new(msg_pubkey.clone());
    let ts_bm = message.created_at;

    let toggle_bookmark = move |_: leptos::ev::MouseEvent| {
        let store = use_bookmarks();
        let eid = eid_bm.get_value();
        if store.is_bookmarked(&eid) {
            store.remove(&eid);
        } else {
            store.add(&eid, &content_bm.get_value(), &pk_bm.get_value(), ts_bm, "");
        }
    };

    // Profile modal trigger (avatar + name click)
    let pk_modal = StoredValue::new(msg_pubkey.clone());
    let on_avatar_click = move |_: leptos::ev::MouseEvent| {
        if let Some(ctx) = use_context::<ProfileModalTarget>() {
            ctx.0.set(Some(pk_modal.get_value()));
        }
    };
    let on_name_click = move |_: leptos::ev::MouseEvent| {
        if let Some(ctx) = use_context::<ProfileModalTarget>() {
            ctx.0.set(Some(pk_modal.get_value()));
        }
    };

    // Display name from NameCache or shortened pubkey
    let pk_for_name = msg_pubkey.clone();
    let display_name = Memo::new(move |_| {
        if let Some(cache) = use_context::<NameCache>() {
            if let Some(name) = cache.0.get().get(&pk_for_name).cloned() {
                return name;
            }
        }
        shorten_pubkey(&pk_for_name)
    });

    // Reply info
    let has_reply = message.reply_to_id.is_some();
    let reply_id = message.reply_to_id.unwrap_or_default();
    let reply_pk = message.reply_to_pubkey.unwrap_or_default();
    let reply_content = message.reply_to_content.unwrap_or_default();

    let event_id_attr = event_id.clone();
    let event_id_react = event_id;

    view! {
        <div
            class="flex gap-3 py-2 px-2 hover:bg-gray-800/30 rounded-lg transition-colors group"
            data-event-id=event_id_attr
        >
            // Avatar (clickable)
            <div class="flex-shrink-0 mt-0.5 cursor-pointer" on:click=on_avatar_click>
                <Avatar pubkey=pk_for_avatar size=AvatarSize::Md />
            </div>

            // Content column
            <div class="flex-1 min-w-0">
                // Author + time + bookmark
                <div class="flex items-baseline gap-2">
                    <span
                        class="font-semibold text-sm text-amber-400 cursor-pointer hover:text-amber-300 transition-colors"
                        on:click=on_name_click
                    >
                        {move || display_name.get()}
                    </span>
                    <span class="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {time_display}
                    </span>
                    <button
                        class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-700/50 ml-auto"
                        title=move || if is_bookmarked.get() { "Remove bookmark" } else { "Bookmark" }
                        on:click=toggle_bookmark
                    >
                        <svg
                            class=move || if is_bookmarked.get() {
                                "w-3.5 h-3.5 text-amber-400"
                            } else {
                                "w-3.5 h-3.5 text-gray-600 hover:text-gray-400"
                            }
                            viewBox="0 0 24 24"
                            fill=move || if is_bookmarked.get() { "currentColor" } else { "none" }
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z"/>
                        </svg>
                    </button>
                </div>

                // Quoted/reply message
                {has_reply.then(|| view! {
                    <QuotedMessage
                        reply_to_id=reply_id.clone()
                        reply_to_pubkey=reply_pk.clone()
                        reply_to_content=reply_content.clone()
                    />
                })}

                // Message text with mentions + markdown
                <div class="mt-0.5 text-sm text-gray-200 leading-relaxed">
                    <MentionText content=content />
                </div>

                // Media embeds (images, YouTube)
                {media_urls.into_iter().map(|url| {
                    view! { <MediaEmbed url=url /> }
                }).collect_view()}

                // Link preview (first non-media URL only)
                {first_link_url.map(|url| view! {
                    <LinkPreview url=url />
                })}

                // Reaction bar
                <ReactionBar
                    event_id=event_id_react
                    reactions=message.reactions
                />
            </div>
        </div>
    }
}

/// Extract URLs from text content.
fn extract_urls(text: &str) -> Vec<String> {
    let mut urls = Vec::new();
    for word in text.split_whitespace() {
        let trimmed = word.trim_matches(|c: char| {
            c == '(' || c == ')' || c == '[' || c == ']' || c == '<' || c == '>' || c == ','
        });
        if (trimmed.starts_with("https://") || trimmed.starts_with("http://")) && trimmed.len() > 10
        {
            urls.push(trimmed.to_string());
        }
    }
    urls
}

/// Check if a URL points to a media resource (image or YouTube).
fn is_media_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    let path = lower.split('?').next().unwrap_or(&lower);
    let image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    for ext in &image_exts {
        if path.ends_with(ext) {
            return true;
        }
    }
    lower.contains("youtube.com/watch") || lower.contains("youtu.be/")
}
