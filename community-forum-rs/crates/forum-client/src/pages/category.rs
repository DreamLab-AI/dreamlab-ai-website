//! Category browsing page -- shows sections within a specific zone/category.
//!
//! Route: /forums/:category
//! Subscribes to kind 40 channels whose `section` tag matches the category,
//! and renders them as section cards with message counts and last activity.

use leptos::prelude::*;
use leptos_router::hooks::use_params_map;
use nostr_core::NostrEvent;
use std::collections::HashMap;
use std::rc::Rc;

use crate::app::base_href;
use crate::components::breadcrumb::{Breadcrumb, BreadcrumbItem};
use crate::components::empty_state::EmptyState;
use crate::components::section_card::SectionCard;
use crate::components::zone_hero::ZoneHero;
use crate::relay::{ConnectionState, Filter, RelayConnection};
use crate::utils::{capitalize, set_timeout_once};

/// Parsed section data from kind 40 events.
#[derive(Clone, Debug)]
struct SectionMeta {
    channel_id: String,
    name: String,
    description: String,
    _created_at: u64,
}

/// Category page showing sections within a specific category.
#[component]
pub fn CategoryPage() -> impl IntoView {
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    let params = use_params_map();
    let category_slug = move || params.read().get("category").unwrap_or_default();

    let sections = RwSignal::new(Vec::<SectionMeta>::new());
    let message_counts = RwSignal::new(HashMap::<String, u32>::new());
    let last_active_map = RwSignal::new(HashMap::<String, u64>::new());
    let loading = RwSignal::new(true);
    let eose_received = RwSignal::new(false);

    let channel_sub_id: RwSignal<Option<String>> = RwSignal::new(None);
    let msg_sub_id: RwSignal<Option<String>> = RwSignal::new(None);

    let relay_for_ch = relay.clone();
    let relay_for_msgs = relay.clone();
    let relay_for_cleanup = relay;

    // Subscribe to kind 40 events, filter by section tag matching this category
    Effect::new(move |_| {
        let state = conn_state.get();
        if state != ConnectionState::Connected {
            return;
        }
        if channel_sub_id.get_untracked().is_some() {
            return;
        }

        loading.set(true);

        let filter = Filter {
            kinds: Some(vec![40]),
            ..Default::default()
        };

        let slug = category_slug();
        let sections_sig = sections;
        let on_event = Rc::new(move |event: NostrEvent| {
            if event.kind != 40 {
                return;
            }

            let section_tag = event
                .tags
                .iter()
                .find(|t| t.len() >= 2 && t[0] == "section")
                .map(|t| t[1].clone())
                .unwrap_or_default();

            // Match: the section tag must contain the category slug
            // e.g. section "family-home" matches slug "family-home"
            let matches = section_tag.contains(&slug)
                || section_tag.to_lowercase().contains(&slug.to_lowercase());

            if !matches && !slug.is_empty() {
                return;
            }

            let (name, description) = parse_channel_content(&event.content);

            let meta = SectionMeta {
                channel_id: event.id.clone(),
                name,
                description,
                _created_at: event.created_at,
            };

            sections_sig.update(|list| {
                if !list.iter().any(|s| s.channel_id == meta.channel_id) {
                    list.push(meta);
                }
            });
        });

        let loading_sig = loading;
        let eose_sig = eose_received;
        let on_eose = Rc::new(move || {
            loading_sig.set(false);
            eose_sig.set(true);
        });

        let id = relay_for_ch.subscribe(vec![filter], on_event, Some(on_eose));
        channel_sub_id.set(Some(id));

        set_timeout_once(
            move || {
                if loading_sig.get_untracked() {
                    loading_sig.set(false);
                }
            },
            8000,
        );
    });

    // Subscribe to kind 42 messages for counts and last-active timestamps
    Effect::new(move |_| {
        if !eose_received.get() {
            return;
        }
        if msg_sub_id.get_untracked().is_some() {
            return;
        }

        let channel_ids: Vec<String> = sections
            .get_untracked()
            .iter()
            .map(|s| s.channel_id.clone())
            .collect();
        if channel_ids.is_empty() {
            return;
        }

        let msg_filter = Filter {
            kinds: Some(vec![42]),
            e_tags: Some(channel_ids),
            ..Default::default()
        };

        let counts = message_counts;
        let active = last_active_map;
        let on_msg = Rc::new(move |event: NostrEvent| {
            let cid = event
                .tags
                .iter()
                .find(|t| t.len() >= 4 && t[0] == "e" && t[3] == "root")
                .or_else(|| event.tags.iter().find(|t| t.len() >= 2 && t[0] == "e"))
                .map(|t| t[1].clone());

            if let Some(cid) = cid {
                counts.update(|m| *m.entry(cid.clone()).or_insert(0) += 1);
                active.update(|m| {
                    let ts = m.entry(cid).or_insert(0);
                    if event.created_at > *ts {
                        *ts = event.created_at;
                    }
                });
            }
        });

        let id = relay_for_msgs.subscribe(vec![msg_filter], on_msg, None);
        msg_sub_id.set(Some(id));
    });

    on_cleanup(move || {
        if let Some(id) = channel_sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
        if let Some(id) = msg_sub_id.get_untracked() {
            relay_for_cleanup.unsubscribe(&id);
        }
    });

    let display_name = move || capitalize(&category_slug());

    // Map category slug to zone level for ZoneHero
    let zone_level = move || -> u8 {
        let slug = category_slug().to_lowercase();
        if slug.contains("lobby") || slug.contains("public") || slug.contains("general") {
            0
        } else if slug.contains("common") || slug.contains("community") || slug.contains("registered") {
            1
        } else if slug.contains("deep") || slug.contains("tech") || slug.contains("cohort") {
            2
        } else if slug.contains("inner") || slug.contains("sanctum") || slug.contains("private") {
            3
        } else {
            0
        }
    };

    // Icon path data per zone
    let zone_icon = move || -> &'static str {
        match zone_level() {
            0 => "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
            1 => "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
            2 => "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
            _ => "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
        }
    };

    view! {
        <div class="max-w-5xl mx-auto p-4 sm:p-6">
            // Zone hero banner
            {move || view! {
                <ZoneHero
                    title=display_name()
                    description="Browse sections and start a discussion".to_string()
                    zone=zone_level()
                    icon=zone_icon()
                />
            }}

            <Breadcrumb items=vec![
                BreadcrumbItem::link("Home", "/"),
                BreadcrumbItem::link("Forums", "/forums"),
                BreadcrumbItem::current(capitalize(&category_slug())),
            ] />

            // Loading
            <Show when=move || loading.get()>
                <div class="space-y-3">
                    <SectionSkeleton/>
                    <SectionSkeleton/>
                    <SectionSkeleton/>
                </div>
            </Show>

            // Content
            <Show when=move || !loading.get()>
                {move || {
                    let secs = sections.get();
                    let counts = message_counts.get();
                    let active = last_active_map.get();
                    let cat = category_slug();

                    if secs.is_empty() {
                        let empty_icon: Box<dyn FnOnce() -> leptos::prelude::AnyView + Send> = Box::new(|| view! {
                            <svg class="w-7 h-7 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        }.into_any());
                        view! {
                            <EmptyState
                                icon=empty_icon
                                title="No sections yet".to_string()
                                description="Sections will appear here as channels are created.".to_string()
                                action_label="Back to Forums".to_string()
                                action_href=base_href("/forums")
                            />
                        }.into_any()
                    } else {
                        let cards: Vec<_> = secs.iter().map(|s| {
                            let mc = counts.get(&s.channel_id).copied().unwrap_or(0);
                            let la = active.get(&s.channel_id).copied().unwrap_or(0);
                            view! {
                                <SectionCard
                                    name=s.name.clone()
                                    description=s.description.clone()
                                    channel_id=s.channel_id.clone()
                                    message_count=mc
                                    last_activity=la
                                    category=cat.clone()
                                />
                            }
                        }).collect();
                        view! {
                            <div class="space-y-3">
                                {cards.into_iter().collect_view()}
                            </div>
                        }.into_any()
                    }
                }}
            </Show>
        </div>
    }
}

/// Skeleton loader for section cards.
#[component]
fn SectionSkeleton() -> impl IntoView {
    view! {
        <div class="section-list-card">
            <div class="space-y-2">
                <div class="h-5 skeleton rounded w-1/3"></div>
                <div class="h-3 skeleton rounded w-2/3"></div>
                <div class="flex gap-3 mt-3">
                    <div class="h-3 skeleton rounded w-16"></div>
                    <div class="h-3 skeleton rounded w-20"></div>
                </div>
            </div>
        </div>
    }
}

/// Parse kind 40 event content JSON into (name, description).
fn parse_channel_content(content: &str) -> (String, String) {
    match serde_json::from_str::<serde_json::Value>(content) {
        Ok(val) => {
            let name = val
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unnamed Section")
                .to_string();
            let desc = val
                .get("about")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            (name, desc)
        }
        Err(_) => ("Unnamed Section".to_string(), String::new()),
    }
}
