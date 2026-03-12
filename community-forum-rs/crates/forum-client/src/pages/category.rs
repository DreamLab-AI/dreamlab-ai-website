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
use crate::auth::use_auth;
use crate::components::breadcrumb::{Breadcrumb, BreadcrumbItem};
use crate::components::empty_state::EmptyState;
use crate::components::section_card::SectionCard;
use crate::components::zone_hero::ZoneHero;
use crate::relay::{ConnectionState, Filter, RelayConnection};
use crate::utils::{capitalize, set_timeout_once};

/// Maps zone IDs to their child section IDs (from config/sections.yaml).
const ZONE_SECTIONS: &[(&str, &[&str])] = &[
    ("fairfield-family", &["family-home", "family-events", "family-photos"]),
    ("minimoonoir", &["minimoonoir-welcome", "minimoonoir-events", "minimoonoir-booking"]),
    ("dreamlab-lobby", &["dreamlab-lobby"]),
    ("dreamlab", &["dreamlab-training", "dreamlab-projects", "dreamlab-bookings"]),
    ("ai-agents", &["ai-general", "ai-claude-flow", "ai-visionflow"]),
];

/// Resolve a channel's section tag to its parent zone ID.
fn section_to_zone_id(section: &str) -> Option<&'static str> {
    for &(zone_id, sections) in ZONE_SECTIONS {
        if sections.contains(&section) {
            return Some(zone_id);
        }
    }
    None
}

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
    let auth = use_auth();
    let is_authed = auth.is_authenticated();

    let params = use_params_map();
    let category_slug = move || params.read().get("category").unwrap_or_default();

    let sections = RwSignal::new(Vec::<SectionMeta>::new());
    let message_counts = RwSignal::new(HashMap::<String, u32>::new());
    let last_active_map = RwSignal::new(HashMap::<String, u64>::new());
    let loading = RwSignal::new(true);
    let eose_received = RwSignal::new(false);

    // -- New topic creation state --
    let show_new_topic = RwSignal::new(false);
    let topic_name = RwSignal::new(String::new());
    let topic_desc = RwSignal::new(String::new());
    let creating = RwSignal::new(false);
    let create_error = RwSignal::new(Option::<String>::None);

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

            // Match: exact match, case-insensitive match, or zone parent match
            let matches = section_tag == slug
                || section_tag.eq_ignore_ascii_case(&slug)
                || section_to_zone_id(&section_tag) == Some(slug.as_str());

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

    let display_name = move || {
        let slug = category_slug();
        match slug.as_str() {
            "fairfield-family" => "Fairfield Family".to_string(),
            "minimoonoir" => "Minimoonoir".to_string(),
            "dreamlab" => "DreamLab".to_string(),
            "ai-agents" => "AI Agents".to_string(),
            other => {
                // For section IDs like "dreamlab-lobby", humanize to "Lobby"
                if other.contains('-') {
                    let suffix = other.split_once('-').map(|(_, s)| s).unwrap_or(other);
                    suffix
                        .split('-')
                        .map(|w| {
                            let mut c = w.chars();
                            match c.next() {
                                None => String::new(),
                                Some(f) => f.to_uppercase().to_string() + c.as_str(),
                            }
                        })
                        .collect::<Vec<_>>()
                        .join(" ")
                } else {
                    capitalize(other)
                }
            }
        }
    };

    // Map category slug to zone access level for ZoneHero
    let zone_level = move || -> u8 {
        let slug = category_slug();
        match slug.as_str() {
            "fairfield-family" => 3,     // Private
            "minimoonoir" => 2,          // Cohort
            "dreamlab" => 2,             // Cohort
            "dreamlab-lobby" => 1,       // Registered (all whitelisted users)
            "ai-agents" => 2,            // Cohort
            _ => {
                // Also match section IDs to their parent zone
                if slug.starts_with("family-") { 3 }
                else if slug.starts_with("minimoonoir-") { 2 }
                else if slug == "dreamlab-lobby" { 1 }
                else if slug.starts_with("dreamlab-") { 2 }
                else if slug.starts_with("ai-") { 2 }
                else { 0 }
            }
        }
    };

    // Icon path data per zone
    let zone_icon = move || -> &'static str {
        let slug = category_slug();
        if slug.starts_with("family") || slug == "fairfield-family" {
            // Home
            "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        } else if slug.starts_with("minimoonoir") {
            // Moon
            "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        } else if slug.starts_with("dreamlab") {
            // Sparkle
            "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
        } else if slug.starts_with("ai") {
            // Bot
            "M3 11h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V11zm9-6a2 2 0 100 4 2 2 0 000-4zm0 4v2"
        } else {
            "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
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

            // New Topic button + inline form
            <Show when=move || is_authed.get() && !loading.get()>
                <div class="mb-4">
                    <Show
                        when=move || !show_new_topic.get()
                        fallback=move || {
                            let relay_create = expect_context::<RelayConnection>();
                            let auth_create = use_auth();
                            let sections_sig = sections;
                            view! {
                                <div class="bg-gray-800 border border-gray-700 rounded-lg p-5 space-y-3">
                                    <h3 class="text-lg font-semibold text-white">"New Topic"</h3>
                                    <input
                                        type="text"
                                        maxlength="64"
                                        placeholder="Topic name"
                                        prop:value=move || topic_name.get()
                                        on:input=move |ev| topic_name.set(event_target_value(&ev))
                                        class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        rows="2"
                                        prop:value=move || topic_desc.get()
                                        on:input=move |ev| topic_desc.set(event_target_value(&ev))
                                        class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                                    />
                                    {move || create_error.get().map(|e| view! {
                                        <p class="text-red-400 text-sm">{e}</p>
                                    })}
                                    <div class="flex gap-2">
                                        <button
                                            type="button"
                                            disabled=move || creating.get() || topic_name.get().trim().len() < 3
                                            on:click=move |_| {
                                                let name = topic_name.get_untracked();
                                                let desc = topic_desc.get_untracked();
                                                let section = category_slug();
                                                if name.trim().len() < 3 {
                                                    create_error.set(Some("Name must be at least 3 characters".into()));
                                                    return;
                                                }
                                                creating.set(true);
                                                create_error.set(None);

                                                match create_topic_event(&auth_create, &relay_create, &name, &desc, &section, create_error) {
                                                    Ok(meta) => {
                                                        // Add to local list immediately
                                                        sections_sig.update(|list| {
                                                            if !list.iter().any(|s| s.channel_id == meta.channel_id) {
                                                                list.push(meta);
                                                            }
                                                        });
                                                        topic_name.set(String::new());
                                                        topic_desc.set(String::new());
                                                        show_new_topic.set(false);
                                                    }
                                                    Err(e) => create_error.set(Some(e)),
                                                }
                                                creating.set(false);
                                            }
                                            class="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                                        >
                                            {move || if creating.get() { "Creating..." } else { "Create Topic" }}
                                        </button>
                                        <button
                                            type="button"
                                            on:click=move |_| {
                                                show_new_topic.set(false);
                                                create_error.set(None);
                                            }
                                            class="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
                                        >
                                            "Cancel"
                                        </button>
                                    </div>
                                </div>
                            }
                        }
                    >
                        <button
                            type="button"
                            on:click=move |_| show_new_topic.set(true)
                            class="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                        >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="16"/>
                                <line x1="8" y1="12" x2="16" y2="12"/>
                            </svg>
                            "New Topic"
                        </button>
                    </Show>
                </div>
            </Show>

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
                        let (title, desc) = if is_authed.get() {
                            ("No topics yet".to_string(), "Be the first — click \"New Topic\" above to start a conversation.".to_string())
                        } else {
                            ("No topics yet".to_string(), "Sign in to start a conversation.".to_string())
                        };
                        view! {
                            <EmptyState
                                icon=empty_icon
                                title=title
                                description=desc
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

/// Create a kind-40 channel event, sign it, and publish to the relay with ack.
/// Returns the `SectionMeta` for optimistic local insertion.
/// On relay rejection, the error signal is set asynchronously.
fn create_topic_event(
    auth: &crate::auth::AuthStore,
    relay: &RelayConnection,
    name: &str,
    description: &str,
    section: &str,
    error_signal: RwSignal<Option<String>>,
) -> Result<SectionMeta, String> {
    if relay.connection_state().get_untracked() != ConnectionState::Connected {
        return Err("Relay not connected".to_string());
    }

    let content = serde_json::json!({
        "name": name.trim(),
        "about": description.trim(),
        "picture": ""
    });

    let pubkey = auth
        .pubkey()
        .get_untracked()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let now = (js_sys::Date::now() / 1000.0) as u64;
    let tags = vec![
        vec!["section".into(), section.into()],
        vec!["zone".into(), "1".into()],
    ];

    let unsigned = nostr_core::UnsignedEvent {
        pubkey,
        created_at: now,
        kind: 40,
        tags,
        content: serde_json::to_string(&content).unwrap(),
    };

    let signed = auth.sign_event(unsigned)?;
    let channel_id = signed.id.clone();

    // Publish with ack — show error asynchronously if relay rejects
    let on_ok = std::rc::Rc::new(move |accepted: bool, msg: String| {
        if !accepted {
            let display = if msg.contains("whitelist") {
                "Your account isn't active yet — try refreshing the page.".to_string()
            } else {
                format!("Relay rejected: {msg}")
            };
            error_signal.set(Some(display));
        }
    });
    let _ = relay.publish_with_ack(&signed, Some(on_ok));

    Ok(SectionMeta {
        channel_id,
        name: name.trim().to_string(),
        description: description.trim().to_string(),
        _created_at: now,
    })
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
