//! Events listing page with upcoming/past tabs, event cards, and a sidebar
//! mini-calendar. Uses hardcoded sample events for initial render.

use leptos::prelude::*;
use leptos_router::components::A;

use crate::app::base_href;
use crate::components::event_card::EventCard;
use crate::components::mini_calendar::MiniCalendar;

/// Internal representation of a calendar event.
#[derive(Clone, Debug, PartialEq)]
struct CalendarEvent {
    title: String,
    description: String,
    start_time: u64,
    end_time: u64,
    location: String,
    host_pubkey: String,
    featured: bool,
}

/// Helper: build a `CalendarEvent` with shortened boilerplate.
fn evt(
    title: &str,
    desc: &str,
    start: u64,
    dur_h: u64,
    loc: &str,
    pk: &str,
    featured: bool,
) -> CalendarEvent {
    CalendarEvent {
        title: title.to_string(),
        description: desc.to_string(),
        start_time: start,
        end_time: start + dur_h * 3600,
        location: loc.to_string(),
        host_pubkey: pk.to_string(),
        featured,
    }
}

/// Generate sample events relative to the current time.
fn sample_events() -> Vec<CalendarEvent> {
    let now = (js_sys::Date::now() / 1000.0) as u64;
    let (hour, day) = (3600u64, 86400u64);
    let dow = js_sys::Date::new_0().get_day(); // 0=Sun

    let days_to_tue = if dow <= 2 { 2 - dow } else { 7 - dow + 2 };
    let next_tue = now + (days_to_tue as u64) * day + 14 * hour;

    let diff_sat = 6 - dow;
    let days_to_sat = if diff_sat == 0 { 7 } else { diff_sat };
    let next_sat = now + (days_to_sat as u64) * day + 10 * hour;

    let next_month = now + 30 * day + 18 * hour;
    let past = now - 3 * day + 15 * hour;

    let pk_a = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
    let pk_b = "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3";
    let pk_c = "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4";

    vec![
        evt("Community Town Hall",
            "Monthly community gathering to discuss updates, roadmap, and open Q&A with the team.",
            next_tue, 2, "Virtual - Discord", pk_a, true),
        evt("Rust WASM Workshop",
            "Hands-on workshop building WASM modules with Rust. Bring your laptop and a working Rust toolchain.",
            next_sat, 3, "Virtual - Zoom", pk_b, false),
        evt("DreamLab Meetup",
            "Local meetup for DreamLab community members. Networking, demos, and lightning talks welcome.",
            next_month, 4, "London, UK", pk_c, false),
        evt("Nostr Protocol Deep Dive",
            "Past session exploring NIP-44 encryption, relay architecture, and identity patterns.",
            past, 2, "Virtual - Discord", pk_a, false),
    ]
}

/// Events listing page with tab filtering, event cards, and sidebar calendar.
#[component]
pub fn EventsPage() -> impl IntoView {
    let events = RwSignal::new(sample_events());
    let active_tab = RwSignal::new("upcoming".to_string());
    let selected_day = RwSignal::new(Option::<u64>::None);

    let now_ts = (js_sys::Date::now() / 1000.0) as u64;

    // Filtered events based on active tab + optional day filter
    let filtered = Memo::new(move |_| {
        let tab = active_tab.get();
        let now = now_ts;
        let sel = selected_day.get();

        let mut list: Vec<CalendarEvent> = events
            .get()
            .into_iter()
            .filter(|e| {
                let time_match = if tab == "upcoming" {
                    e.end_time >= now
                } else {
                    e.end_time < now
                };

                let day_match = sel
                    .map(|day_ts| {
                        // Check if event starts on the selected day (within 24h window)
                        e.start_time >= day_ts && e.start_time < day_ts + 86400
                    })
                    .unwrap_or(true);

                time_match && day_match
            })
            .collect();

        // Sort: upcoming by soonest first, past by most recent first
        if tab == "upcoming" {
            list.sort_by_key(|e| e.start_time);
        } else {
            list.sort_by_key(|e| std::cmp::Reverse(e.start_time));
        }
        list
    });

    // Compute event days for the mini calendar (days with events in current view)
    let event_days = Signal::derive(move || {
        let evts = events.get();
        let now = now_ts;
        let d = js_sys::Date::new_0();
        let current_month = d.get_month() as u32;
        let current_year = d.get_full_year() as u32;

        evts.iter()
            .filter(|e| e.end_time >= now) // only upcoming
            .filter_map(|e| {
                let ed = js_sys::Date::new_0();
                ed.set_time((e.start_time as f64) * 1000.0);
                let m = ed.get_month() as u32;
                let y = ed.get_full_year() as u32;
                if y == current_year && m == current_month {
                    Some(ed.get_date())
                } else {
                    None
                }
            })
            .collect::<Vec<u32>>()
    });

    let on_calendar_select = Callback::new(move |ts: u64| {
        // Toggle: click same day again to clear filter
        let current = selected_day.get_untracked();
        if current == Some(ts) {
            selected_day.set(None);
        } else {
            selected_day.set(Some(ts));
        }
    });

    let on_clear_filter = move |_| {
        selected_day.set(None);
    };

    let tab_class = move |tab: &'static str| {
        move || {
            if active_tab.get() == tab {
                "px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 transition-colors"
            } else {
                "px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent transition-colors"
            }
        }
    };

    view! {
        <div class="mesh-bg min-h-[80vh] relative overflow-hidden">
            // Ambient orbs
            <div class="ambient-orb ambient-orb-1" aria-hidden="true"></div>
            <div class="ambient-orb ambient-orb-2" aria-hidden="true"></div>

            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                // Breadcrumb
                <nav class="breadcrumb-nav mb-6">
                    <A href=base_href("/") attr:class="hover:text-amber-400 transition-colors">"Home"</A>
                    <span class="breadcrumb-separator">"/"</span>
                    <span class="text-gray-400">"Events"</span>
                </nav>

                // Hero heading
                <div class="text-center mb-8">
                    <div class="relative inline-block">
                        <div class="absolute -z-10 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl animate-ambient-breathe left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                        <h1 class="text-4xl sm:text-5xl font-bold candy-gradient mb-3">
                            "Events"
                        </h1>
                    </div>
                    <p class="text-gray-400 text-lg">
                        "Workshops, meetups, and community gatherings"
                    </p>
                </div>

                // Main layout: content + sidebar
                <div class="flex flex-col lg:flex-row gap-8">
                    // Left: event list
                    <div class="flex-1 max-w-[800px]">
                        // Tab pills + create button
                        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                            <div class="flex gap-2">
                                <button
                                    class=tab_class("upcoming")
                                    on:click=move |_| {
                                        active_tab.set("upcoming".to_string());
                                        selected_day.set(None);
                                    }
                                >
                                    "Upcoming"
                                </button>
                                <button
                                    class=tab_class("past")
                                    on:click=move |_| {
                                        active_tab.set("past".to_string());
                                        selected_day.set(None);
                                    }
                                >
                                    "Past"
                                </button>
                            </div>

                            <button class="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
                                    <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
                                </svg>
                                "Create Event"
                            </button>
                        </div>

                        // Day filter indicator
                        <Show when=move || selected_day.get().is_some()>
                            <div class="flex items-center gap-2 mb-4 text-sm text-gray-400">
                                <span>"Filtered by day"</span>
                                <button
                                    class="text-amber-400 hover:text-amber-300 underline text-xs"
                                    on:click=on_clear_filter
                                >
                                    "Clear filter"
                                </button>
                            </div>
                        </Show>

                        // Event cards or empty state
                        <div class="space-y-4 fade-in">
                            {move || {
                                let list = filtered.get();
                                if list.is_empty() {
                                    view! {
                                        <div class="glass-card p-8 text-center">
                                            <div class="animate-gentle-float inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-800/60 border border-gray-700/50 text-gray-400 mb-4">
                                                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    <line x1="16" y1="2" x2="16" y2="6" stroke-linecap="round"/>
                                                    <line x1="8" y1="2" x2="8" y2="6" stroke-linecap="round"/>
                                                    <line x1="3" y1="10" x2="21" y2="10" stroke-linecap="round"/>
                                                </svg>
                                            </div>
                                            <h3 class="text-lg font-bold text-white mb-2">
                                                {move || if active_tab.get() == "upcoming" {
                                                    "No upcoming events"
                                                } else {
                                                    "No past events"
                                                }}
                                            </h3>
                                            <p class="text-sm text-gray-400">
                                                {move || if active_tab.get() == "upcoming" {
                                                    "Check back soon or create one yourself!"
                                                } else {
                                                    "Events you attend will appear here."
                                                }}
                                            </p>
                                        </div>
                                    }.into_any()
                                } else {
                                    list.into_iter().map(|evt| {
                                        view! {
                                            <EventCard
                                                title=evt.title
                                                description=evt.description
                                                start_time=evt.start_time
                                                end_time=evt.end_time
                                                location=evt.location
                                                host_pubkey=evt.host_pubkey
                                                featured=evt.featured
                                            />
                                        }
                                    }).collect_view().into_any()
                                }
                            }}
                        </div>
                    </div>

                    // Right sidebar: mini calendar (desktop only)
                    <aside class="hidden lg:block flex-shrink-0">
                        <div class="sticky top-24">
                            <MiniCalendar
                                event_days=event_days
                                on_select=on_calendar_select
                            />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    }
}
