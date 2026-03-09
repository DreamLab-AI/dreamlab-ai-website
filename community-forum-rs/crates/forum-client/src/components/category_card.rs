//! Category hero card component for the forum index page.
//!
//! Renders a visually rich card with themed gradient, watermark icon,
//! aurora shimmer, and section count badge. Navigates to the category
//! page on click.

use leptos::prelude::*;
use leptos_router::components::A;

use crate::app::base_href;

/// Visually rich card representing a forum category.
#[component]
pub fn CategoryCard(
    /// Display name of the category.
    name: String,
    /// Short description text.
    description: String,
    /// Icon identifier: "globe", "users", "code", or "shield".
    icon: &'static str,
    /// Number of sections in this category.
    section_count: u32,
    /// Accent color key: "amber", "blue", "purple", "emerald".
    accent_color: &'static str,
    /// Parent zone id for building the href.
    zone_id: &'static str,
    /// Optional picture URL for background image.
    #[prop(optional, into)]
    picture: String,
) -> impl IntoView {
    let href = base_href(&format!("/forums/{}", slug(&name)));

    let gradient_class = match accent_color {
        "amber" => "from-amber-600/20 via-orange-500/10 to-transparent",
        "blue" => "from-blue-600/20 via-cyan-500/10 to-transparent",
        "purple" => "from-purple-600/20 via-indigo-500/10 to-transparent",
        "emerald" => "from-emerald-600/20 via-teal-500/10 to-transparent",
        _ => "from-gray-600/20 via-gray-500/10 to-transparent",
    };

    let badge_class = match accent_color {
        "amber" => "bg-amber-500/15 text-amber-400 border-amber-500/30",
        "blue" => "bg-blue-500/15 text-blue-400 border-blue-500/30",
        "purple" => "bg-purple-500/15 text-purple-400 border-purple-500/30",
        "emerald" => "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        _ => "bg-gray-500/15 text-gray-400 border-gray-500/30",
    };

    let icon_color = match accent_color {
        "amber" => "text-amber-500/10",
        "blue" => "text-blue-500/10",
        "purple" => "text-purple-500/10",
        "emerald" => "text-emerald-500/10",
        _ => "text-gray-500/10",
    };

    let count_label = if section_count == 1 {
        "1 section".to_string()
    } else {
        format!("{} sections", section_count)
    };

    let name_display = name.clone();
    let desc_display = description.clone();
    let has_picture = !picture.is_empty();

    view! {
        <A href=href attr:class="block category-hero-card glass-card-interactive aurora-shimmer no-underline text-inherit">
            // Background image (when picture URL is available)
            {has_picture.then(|| {
                let pic = picture.clone();
                view! {
                    <img
                        src=pic
                        alt=""
                        class="absolute inset-0 w-full h-full object-cover rounded-xl opacity-20 pointer-events-none"
                        loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gray-900/60 rounded-xl pointer-events-none"></div>
                }
            })}

            // Background gradient overlay
            <div class=format!("absolute inset-0 bg-gradient-to-br {} pointer-events-none", gradient_class)></div>

            // Watermark icon (large, semi-transparent) -- only when no image
            {(!has_picture).then(|| {
                view! {
                    <div class=format!("absolute -right-4 -bottom-4 {} pointer-events-none", icon_color)>
                        <WatermarkIcon icon=icon/>
                    </div>
                }
            })}

            // Content
            <div class="relative z-10 p-5 flex flex-col justify-between min-h-[160px]">
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <CardIcon icon=icon accent=accent_color/>
                        <h3 class="text-lg font-bold text-white">{name_display}</h3>
                    </div>
                    <p class="text-sm text-gray-300 line-clamp-2 leading-relaxed">{desc_display}</p>
                </div>

                <div class="flex items-center justify-between mt-4">
                    <span class=format!("text-xs font-medium border rounded-full px-2.5 py-0.5 {}", badge_class)>
                        {count_label}
                    </span>
                    <span class="text-xs text-gray-500">
                        {zone_id.replace('-', " ")}
                    </span>
                </div>
            </div>
        </A>
    }
}

/// Small inline icon for the card header.
#[component]
fn CardIcon(icon: &'static str, accent: &'static str) -> impl IntoView {
    let wrapper_class = match accent {
        "amber" => "w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/15",
        "blue" => "w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/15",
        "purple" => "w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/15",
        "emerald" => "w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15",
        _ => "w-8 h-8 rounded-lg flex items-center justify-center bg-gray-500/15",
    };

    let svg = match icon {
        "globe" => view! {
            <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/>
            </svg>
        }.into_any(),
        "users" => view! {
            <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
        }.into_any(),
        "code" => view! {
            <svg class="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
            </svg>
        }.into_any(),
        "shield" => view! {
            <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
        }.into_any(),
        _ => view! { <span class="text-xs text-gray-400">"?"</span> }.into_any(),
    };

    view! {
        <div class=wrapper_class>{svg}</div>
    }
}

/// Large watermark SVG icon rendered behind the card content.
#[component]
fn WatermarkIcon(icon: &'static str) -> impl IntoView {
    match icon {
        "globe" => view! {
            <svg class="w-28 h-28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="12" r="10" fill-opacity="0.5"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke="currentColor" stroke-width="0.5"/>
            </svg>
        }.into_any(),
        "users" => view! {
            <svg class="w-28 h-28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="9" cy="7" r="4" fill-opacity="0.5"/>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" fill-opacity="0.3"/>
            </svg>
        }.into_any(),
        "code" => view! {
            <svg class="w-28 h-28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.8">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
            </svg>
        }.into_any(),
        "shield" => view! {
            <svg class="w-28 h-28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill-opacity="0.4"/>
            </svg>
        }.into_any(),
        _ => view! { <span></span> }.into_any(),
    }
}

/// Convert a category name to a URL slug.
fn slug(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|seg| !seg.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
