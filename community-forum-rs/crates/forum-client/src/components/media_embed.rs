//! Inline media embeds for images and YouTube videos.

use leptos::prelude::*;

/// Detected media type from a URL.
#[derive(Clone, Debug, PartialEq)]
enum MediaType {
    Image,
    YouTube(String), // video ID
    Unknown,
}

/// Detect what kind of media a URL points to.
fn detect_media(url: &str) -> MediaType {
    let lower = url.to_lowercase();

    // Image extensions
    let image_exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    for ext in &image_exts {
        // Check extension before any query string
        let path = lower.split('?').next().unwrap_or(&lower);
        if path.ends_with(ext) {
            return MediaType::Image;
        }
    }

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if lower.contains("youtube.com/watch") {
        if let Some(pos) = lower.find("v=") {
            let after_v = &url[pos + 2..];
            let video_id: String = after_v
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
                .collect();
            if !video_id.is_empty() {
                return MediaType::YouTube(video_id);
            }
        }
    } else if lower.contains("youtu.be/") {
        if let Some(pos) = url.find("youtu.be/") {
            let after = &url[pos + 9..];
            let video_id: String = after
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
                .collect();
            if !video_id.is_empty() {
                return MediaType::YouTube(video_id);
            }
        }
    }

    MediaType::Unknown
}

/// Embed images and YouTube videos inline in messages.
///
/// - Images: lazy-loaded `<img>` with max-height, rounded corners, click to open full
/// - YouTube: responsive 16:9 iframe embed
/// - Skeleton loading state before media loads
/// - Graceful fallback on error
#[component]
pub(crate) fn MediaEmbed(
    /// The media URL to embed.
    url: String,
) -> impl IntoView {
    let media_type = detect_media(&url);

    match media_type {
        MediaType::Image => {
            let img_url = url.clone();
            let full_url = url.clone();
            let loaded = RwSignal::new(false);
            let errored = RwSignal::new(false);

            view! {
                <div class="mt-2 max-w-lg">
                    // Skeleton shown while loading
                    <Show when=move || !loaded.get() && !errored.get()>
                        <div class="skeleton h-48 w-full rounded-lg"></div>
                    </Show>

                    // Error state
                    <Show when=move || errored.get()>
                        <div class="flex items-center gap-2 text-gray-500 text-xs p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span>"Failed to load image"</span>
                        </div>
                    </Show>

                    // Image (hidden until loaded)
                    <a
                        href=full_url
                        target="_blank"
                        rel="noopener noreferrer"
                        class=move || {
                            if loaded.get() && !errored.get() {
                                "block"
                            } else {
                                "hidden"
                            }
                        }
                    >
                        <img
                            src=img_url
                            alt="Embedded image"
                            class="max-h-[400px] w-auto rounded-lg border border-gray-700/50 hover:border-amber-500/30 transition-colors cursor-pointer"
                            loading="lazy"
                            on:load=move |_| loaded.set(true)
                            on:error=move |_| errored.set(true)
                        />
                    </a>
                </div>
            }
            .into_any()
        }
        MediaType::YouTube(video_id) => {
            let embed_url = format!("https://www.youtube-nocookie.com/embed/{}", video_id);

            view! {
                <div class="mt-2 max-w-lg">
                    <div class="relative w-full overflow-hidden rounded-lg border border-gray-700/50" style="padding-top: 56.25%">
                        <iframe
                            src=embed_url
                            class="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen=true
                            title="YouTube video"
                        />
                    </div>
                </div>
            }
            .into_any()
        }
        MediaType::Unknown => {
            // Not a recognized media URL -- render nothing
            view! { <span></span> }.into_any()
        }
    }
}
