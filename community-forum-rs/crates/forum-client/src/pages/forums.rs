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

// -- Zone definitions ---------------------------------------------------------

struct Zone {
    id: &'static str,
    name: &'static str,
    description: &'static str,
    icon: &'static str,
    accent: &'static str,
}

const ZONES: &[Zone] = &[
    Zone {
        id: "public-lobby",
        name: "Public Lobby",
        description: "Open discussions visible to all",
        icon: "globe",
        accent: "amber",
    },
    Zone {
        id: "common-room",
        name: "Common Room",
        description: "Community conversations and networking",
        icon: "users",
        accent: "blue",
    },
    Zone {
        id: "deep-dives",
        name: "Deep Dives",
        description: "Technical deep-dives and learning",
        icon: "code",
        accent: "purple",
    },
    Zone {
        id: "inner-sanctum",
        name: "Inner Sanctum",
        description: "Exclusive members-only discussions",
        icon: "shield",
        accent: "emerald",
    },
];

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

            // Extract section tag: ["section", "zone-id/category-name"]
            let section_tag = event
                .tags
                .iter()
                .find(|t| t.len() >= 2 && t[0] == "section")
                .map(|t| t[1].clone())
                .unwrap_or_default();

            let (zone, category) = if let Some(idx) = section_tag.find('/') {
                (
                    section_tag[..idx].to_string(),
                    section_tag[idx + 1..].to_string(),
                )
            } else if !section_tag.is_empty() {
                (section_tag.clone(), "General".to_string())
            } else {
                ("public-lobby".to_string(), "General".to_string())
            };

            zc.update(|map| {
                let cats = map.entry(zone).or_default();
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
                        let has_cats = !cats.is_empty();

                        view! {
                            <section class="mb-10">
                                <div class="flex items-center gap-3 mb-4">
                                    <ZoneIcon icon=icon accent=accent/>
                                    <div>
                                        <h2 class="text-xl font-bold text-white">{zone_name}</h2>
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
        "amber" => "w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10",
        "blue" => "w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10",
        "purple" => "w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10",
        "emerald" => "w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10",
        _ => "w-10 h-10 rounded-lg flex items-center justify-center bg-gray-500/10",
    };

    let svg = match icon {
        "globe" => view! {
            <svg class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10" stroke-linecap="round"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke-linecap="round"/>
            </svg>
        }.into_any(),
        "users" => view! {
            <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke-linecap="round"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        }.into_any(),
        "code" => view! {
            <svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="16 18 22 12 16 6" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="8 6 2 12 8 18" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        }.into_any(),
        "shield" => view! {
            <svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke-linecap="round" stroke-linejoin="round"/>
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
