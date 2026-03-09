//! Forum index page -- displays all zones and their categories with hero cards.
//!
//! Subscribes to kind 40 (channel creation) events from the relay,
//! groups them by zone/category from the `section` tag, and renders
//! each zone with its categories as visually rich hero cards.

use leptos::prelude::*;
use nostr_core::NostrEvent;
use std::collections::HashMap;
use std::rc::Rc;

use crate::components::breadcrumb::{Breadcrumb, BreadcrumbItem};
use crate::components::category_card::CategoryCard;
use crate::components::empty_state::EmptyState;
use crate::relay::{ConnectionState, Filter, RelayConnection};
use crate::utils::set_timeout_once;

// -- Zone definitions (matching config/sections.yaml) -------------------------

struct Zone {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    icon: &'static str,
    accent: &'static str,
    /// Access level: 0=Public, 1=Registered, 2=Cohort, 3=Private.
    access_level: u8,
    /// Sections belonging to this zone (section IDs from the YAML config).
    /// Channels tagged with these section IDs will appear under this zone.
    sections: &'static [&'static str],
}

/// Production zone definitions matching `community-forum/config/sections.yaml`.
/// Each zone owns a set of section IDs; channels carry a `section` tag with the
/// section ID, and we resolve zone membership by looking up which zone contains
/// that section ID.
const ZONES: &[Zone] = &[
    Zone {
        id: "fairfield-family",
        name: "Fairfield Family",
        description: "Private family zone",
        icon: "home",
        accent: "green",
        access_level: 3,
        sections: &["family-home", "family-events", "family-photos"],
    },
    Zone {
        id: "minimoonoir",
        name: "Minimoonoir",
        description: "For friends and visitors staying with us",
        icon: "moon",
        accent: "purple",
        access_level: 2,
        sections: &["minimoonoir-welcome", "minimoonoir-events", "minimoonoir-booking"],
    },
    Zone {
        id: "dreamlab",
        name: "DreamLab",
        description: "Business training and collaboration space",
        icon: "sparkle",
        accent: "pink",
        access_level: 2,
        sections: &["dreamlab-lobby", "dreamlab-training", "dreamlab-projects", "dreamlab-bookings"],
    },
    Zone {
        id: "ai-agents",
        name: "AI Agents",
        description: "VisionFlow AI agents — tiered intelligence via Nostr DM",
        icon: "bot",
        accent: "sky",
        access_level: 1,
        sections: &["ai-general", "ai-claude-flow", "ai-visionflow"],
    },
];

/// Resolve a section tag to its parent zone ID.
/// Channels store the section ID directly (e.g. "minimoonoir-welcome"),
/// not in "zone/category" format.
fn section_to_zone(section: &str) -> Option<&'static str> {
    for zone in ZONES {
        if zone.sections.contains(&section) {
            return Some(zone.id);
        }
    }
    None
}

/// Main forum index page showing all zones and their categories.
#[component]
pub fn ForumsPage() -> impl IntoView {
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    // zone_id -> { category_name -> count_of_sections }
    let zone_categories = RwSignal::new(HashMap::<String, HashMap<String, u32>>::new());
    let loading = RwSignal::new(true);
    let sub_id: RwSignal<Option<String>> = RwSignal::new(None);

    let relay_for_sub = relay.clone();
    let relay_for_cleanup = relay;

    // Subscribe to kind 40 channel-creation events
    Effect::new(move |_| {
        let state = conn_state.get();
        if state != ConnectionState::Connected {
            return;
        }
        if sub_id.get_untracked().is_some() {
            return;
        }

        loading.set(true);

        let filter = Filter {
            kinds: Some(vec![40]),
            ..Default::default()
        };

        let zc = zone_categories;
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind != 40 {
                return;
            }

            // Extract section tag: ["section", "section-id"]
            let section_tag = event
                .tags
                .iter()
                .find(|t| t.len() >= 2 && t[0] == "section")
                .map(|t| t[1].clone())
                .unwrap_or_default();

            if section_tag.is_empty() {
                return;
            }

            // Resolve section ID to its parent zone
            let zone_id = section_to_zone(&section_tag)
                .unwrap_or_else(|| {
                    // Fallback: if section_tag contains '/', use the prefix as zone
                    // Otherwise skip unrecognised sections
                    if section_tag.contains('/') {
                        return "unknown";
                    }
                    "unknown"
                });
            if zone_id == "unknown" {
                return;
            }

            // Use the section ID as the category within this zone
            let category = section_tag;

            zc.update(|map| {
                let cats = map.entry(zone_id.to_string()).or_default();
                *cats.entry(category).or_insert(0) += 1;
            });
        });

        let loading_sig = loading;
        let on_eose = Rc::new(move || {
            loading_sig.set(false);
        });

        let id = relay_for_sub.subscribe(vec![filter], on_event, Some(on_eose));
        sub_id.set(Some(id));

        set_timeout_once(
            move || {
                if loading_sig.get_untracked() {
                    loading_sig.set(false);
                }
            },
            8000,
        );
    });

    on_cleanup(move || {
        if let Some(id) = sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
    });

    view! {
        <div class="max-w-6xl mx-auto p-4 sm:p-6">
            // Hero header
            <div class="relative mb-10 py-10 rounded-2xl overflow-hidden mesh-bg aurora-shimmer">
                <div class="ambient-orb ambient-orb-1" aria-hidden="true"></div>
                <div class="ambient-orb ambient-orb-2" aria-hidden="true"></div>
                <div class="relative z-10 text-center">
                    <h1 class="text-4xl sm:text-5xl font-bold candy-gradient mb-3">
                        "Forums"
                    </h1>
                    <p class="text-gray-400 text-lg max-w-xl mx-auto">
                        "Explore zones, dive into categories, and join the conversation"
                    </p>
                </div>
            </div>

            <Breadcrumb items=vec![
                BreadcrumbItem::link("Home", "/"),
                BreadcrumbItem::current("Forums"),
            ] />

            // Loading state
            <Show when=move || loading.get()>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <ZoneSkeleton/>
                    <ZoneSkeleton/>
                    <ZoneSkeleton/>
                    <ZoneSkeleton/>
                </div>
            </Show>

            // Zone sections
            <Show when=move || !loading.get()>
                {move || {
                    let zc = zone_categories.get();
                    ZONES.iter().map(|zone| {
                        let cats = zc.get(zone.id).cloned().unwrap_or_default();
                        let zone_id = zone.id;
                        let zone_name = zone.name;
                        let zone_desc = zone.description;
                        let accent = zone.accent;
                        let icon = zone.icon;
                        let al = zone.access_level;
                        let has_cats = !cats.is_empty();

                        view! {
                            <section class="mb-10">
                                <div class="flex items-center gap-3 mb-4">
                                    <ZoneIcon icon=icon accent=accent/>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h2 class="text-xl font-bold text-white">{zone_name}</h2>
                                            {(al > 0).then(|| {
                                                let badge = crate::stores::zone_access::Zone::from_tag(&al.to_string());
                                                view! {
                                                    <span class=format!(
                                                        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 {}",
                                                        badge.badge_class()
                                                    )>
                                                        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                            <rect x="3" y="11" width="18" height="11" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round" stroke-linejoin="round"/>
                                                        </svg>
                                                        {badge.label()}
                                                    </span>
                                                }
                                            })}
                                        </div>
                                        <p class="text-sm text-gray-500">{zone_desc}</p>
                                    </div>
                                </div>

                                {if has_cats {
                                    let cards: Vec<_> = cats.iter().map(|(cat_name, section_count)| {
                                        let name = cat_name.clone();
                                        let count = *section_count;
                                        view! {
                                            <CategoryCard
                                                name=name
                                                description=format!("Browse sections in this category")
                                                icon=icon
                                                section_count=count
                                                accent_color=accent
                                                zone_id=zone_id
                                            />
                                        }
                                    }).collect();
                                    view! {
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {cards.into_iter().collect_view()}
                                        </div>
                                    }.into_any()
                                } else {
                                    {
                                        let empty_icon: Box<dyn FnOnce() -> leptos::prelude::AnyView + Send> = Box::new(|| view! {
                                            <svg class="w-7 h-7 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        }.into_any());
                                        view! {
                                            <EmptyState
                                                icon=empty_icon
                                                title="No categories yet".to_string()
                                                description="Categories will appear here as channels are created in this zone.".to_string()
                                            />
                                        }.into_any()
                                    }
                                }}
                            </section>
                        }
                    }).collect_view()
                }}
            </Show>
        </div>
    }
}

/// Inline SVG icon per zone type.
#[component]
fn ZoneIcon(icon: &'static str, accent: &'static str) -> impl IntoView {
    let bg_class = match accent {
        "green" => "w-10 h-10 rounded-lg flex items-center justify-center bg-green-500/10",
        "purple" => "w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10",
        "pink" => "w-10 h-10 rounded-lg flex items-center justify-center bg-pink-500/10",
        "sky" => "w-10 h-10 rounded-lg flex items-center justify-center bg-sky-500/10",
        _ => "w-10 h-10 rounded-lg flex items-center justify-center bg-gray-500/10",
    };

    let svg = match icon {
        // Home icon for Fairfield Family
        "home" => view! {
            <svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        }.into_any(),
        // Moon icon for Minimoonoir
        "moon" => view! {
            <svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        }.into_any(),
        // Sparkle icon for DreamLab
        "sparkle" => view! {
            <svg class="w-5 h-5 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        }.into_any(),
        // Bot icon for AI Agents
        "bot" => view! {
            <svg class="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="11" width="18" height="10" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="5" r="2" stroke-linecap="round"/>
                <path d="M12 7v4" stroke-linecap="round"/>
                <line x1="8" y1="16" x2="8" y2="16" stroke-linecap="round" stroke-width="2"/>
                <line x1="16" y1="16" x2="16" y2="16" stroke-linecap="round" stroke-width="2"/>
            </svg>
        }.into_any(),
        _ => view! { <span class="text-gray-400">"?"</span> }.into_any(),
    };

    view! {
        <div class=bg_class>
            {svg}
        </div>
    }
}

#[component]
fn ZoneSkeleton() -> impl IntoView {
    view! {
        <div class="glass-card p-6">
            <div class="flex gap-3 mb-4">
                <div class="w-10 h-10 rounded-lg skeleton"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-5 skeleton rounded w-1/3"></div>
                    <div class="h-3 skeleton rounded w-2/3"></div>
                </div>
            </div>
            <div class="h-24 skeleton rounded-lg"></div>
        </div>
    }
}
