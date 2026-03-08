//! Admin panel page -- auth-gated and admin-only.
//!
//! Provides a tabbed interface for Overview, Channels, and Users management.
//! Route: `/admin`

use leptos::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::admin::channel_form::{ChannelForm, ChannelFormData};
use crate::admin::user_table::{UpdateCohortsCb, UserTable};
use crate::admin::{
    provide_admin, use_admin, AdminStore, AdminTab, ADMIN_PUBKEY,
};
use crate::auth::use_auth;
use crate::relay::{ConnectionState, RelayConnection};

/// Admin panel page component. Checks auth + admin status before rendering.
#[component]
pub fn AdminPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();
    let pubkey = auth.pubkey();

    let is_admin = Memo::new(move |_| {
        pubkey.get().map(|pk| AdminStore::is_admin(&pk)).unwrap_or(false)
    });

    // Redirect non-authenticated users
    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/login");
            }
        }
    });

    // Redirect non-admin users
    Effect::new(move |_| {
        if is_ready.get() && is_authed.get() && !is_admin.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/chat");
            }
        }
    });

    view! {
        <Show
            when=move || is_ready.get()
            fallback=|| view! {
                <div class="flex items-center justify-center min-h-[60vh]">
                    <div class="animate-pulse text-gray-400">"Loading..."</div>
                </div>
            }
        >
            <Show
                when=move || is_authed.get() && is_admin.get()
                fallback=|| view! {
                    <div class="flex items-center justify-center min-h-[60vh]">
                        <div class="text-center">
                            <h2 class="text-2xl font-bold text-red-400 mb-2">"Access Denied"</h2>
                            <p class="text-gray-400">"You do not have admin privileges."</p>
                        </div>
                    </div>
                }
            >
                <AdminPanelInner />
            </Show>
        </Show>
    }
}

/// Inner admin panel rendered only for authenticated admins.
#[component]
fn AdminPanelInner() -> impl IntoView {
    provide_admin();

    let admin = use_admin();
    let auth = use_auth();
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    // Fetch initial data when relay is connected
    let admin_for_init = admin.clone();
    let auth_for_init = auth;
    Effect::new(move |_| {
        let state = conn_state.get();
        if state != ConnectionState::Connected {
            return;
        }

        admin_for_init.fetch_stats();

        if let Some(privkey) = auth_for_init.get_privkey_bytes() {
            let admin_clone = admin_for_init.clone();
            spawn_local(async move {
                let _ = admin_clone.fetch_whitelist(&privkey).await;
            });
        }
    });

    let active_tab = admin.state.active_tab;
    let error = admin.state.error;
    let success = admin.state.success;

    let admin_for_dismiss_err = admin.clone();
    let admin_for_dismiss_success = admin.clone();

    view! {
        <div class="max-w-6xl mx-auto p-4 sm:p-6">
            // Header
            <div class="mb-6">
                <h1 class="text-3xl font-bold text-white">"Admin Panel"</h1>
                <p class="text-gray-400 mt-1">
                    "Manage whitelist, channels, and view forum statistics."
                </p>
            </div>

            // Connection status bar
            <ConnectionStatusBar />

            // Toast messages
            {move || {
                error.get().map(|msg| {
                    let admin_err = admin_for_dismiss_err.clone();
                    view! {
                        <div class="mb-4 bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
                            <span class="text-red-200 text-sm">{msg}</span>
                            <button
                                on:click=move |_| admin_err.clear_error()
                                class="text-red-300 hover:text-red-100 text-xs ml-4"
                            >
                                "Dismiss"
                            </button>
                        </div>
                    }
                })
            }}
            {move || {
                success.get().map(|msg| {
                    let admin_suc = admin_for_dismiss_success.clone();
                    view! {
                        <div class="mb-4 bg-green-900/50 border border-green-700 rounded-lg px-4 py-3 flex items-center justify-between">
                            <span class="text-green-200 text-sm">{msg}</span>
                            <button
                                on:click=move |_| admin_suc.clear_success()
                                class="text-green-300 hover:text-green-100 text-xs ml-4"
                            >
                                "Dismiss"
                            </button>
                        </div>
                    }
                })
            }}

            // Tab navigation
            <div class="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 border border-gray-700">
                <TabButton tab=AdminTab::Overview active=active_tab label="Overview" />
                <TabButton tab=AdminTab::Channels active=active_tab label="Channels" />
                <TabButton tab=AdminTab::Users active=active_tab label="Users" />
            </div>

            // Tab content
            {move || {
                match active_tab.get() {
                    AdminTab::Overview => view! { <OverviewTab /> }.into_any(),
                    AdminTab::Channels => view! { <ChannelsTab /> }.into_any(),
                    AdminTab::Users => view! { <UsersTab /> }.into_any(),
                }
            }}
        </div>
    }
}

// -- Tab button ---------------------------------------------------------------

#[component]
fn TabButton(
    tab: AdminTab,
    active: RwSignal<AdminTab>,
    label: &'static str,
) -> impl IntoView {
    let is_active = move || active.get() == tab;

    let class = move || {
        if is_active() {
            "flex-1 text-center py-2 px-4 rounded-md text-sm font-medium transition-colors bg-amber-500 text-gray-900"
        } else {
            "flex-1 text-center py-2 px-4 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-700"
        }
    };

    view! {
        <button on:click=move |_| active.set(tab) class=class>
            {label}
        </button>
    }
}

// -- Connection status bar ----------------------------------------------------

#[component]
fn ConnectionStatusBar() -> impl IntoView {
    let relay = expect_context::<RelayConnection>();
    let conn_state = relay.connection_state();

    view! {
        {move || {
            match conn_state.get() {
                ConnectionState::Connected => view! {
                    <div class="mb-4 bg-green-900/30 border border-green-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-green-400"></span>
                        <span class="text-green-300 text-sm">"Relay connected"</span>
                    </div>
                }.into_any(),
                ConnectionState::Connecting | ConnectionState::Reconnecting => view! {
                    <div class="mb-4 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span class="animate-pulse w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span class="text-yellow-300 text-sm">"Connecting to relay..."</span>
                    </div>
                }.into_any(),
                ConnectionState::Error => view! {
                    <div class="mb-4 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-400"></span>
                        <span class="text-red-300 text-sm">"Relay connection error"</span>
                    </div>
                }.into_any(),
                ConnectionState::Disconnected => view! {
                    <div class="mb-4 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-gray-500"></span>
                        <span class="text-gray-400 text-sm">"Relay disconnected"</span>
                    </div>
                }.into_any(),
            }
        }}
    }
}

// -- Overview tab -------------------------------------------------------------

#[component]
fn OverviewTab() -> impl IntoView {
    let admin = use_admin();
    let stats = admin.state.stats;
    let is_loading = admin.state.is_loading;

    view! {
        <Show
            when=move || !is_loading.get()
            fallback=|| view! {
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </div>
            }
        >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Users"
                    value=Signal::derive(move || stats.get().total_users.to_string())
                    icon="U"
                    color="amber"
                />
                <StatCard
                    label="Channels"
                    value=Signal::derive(move || stats.get().total_channels.to_string())
                    icon="#"
                    color="blue"
                />
                <StatCard
                    label="Messages"
                    value=Signal::derive(move || stats.get().total_messages.to_string())
                    icon="M"
                    color="green"
                />
                <StatCard
                    label="Pending"
                    value=Signal::derive(move || stats.get().pending_approvals.to_string())
                    icon="!"
                    color="orange"
                />
            </div>
        </Show>

        // Admin pubkey info
        <div class="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-medium text-gray-400 mb-2">"Admin Public Key"</h3>
            <code class="text-xs text-amber-300 font-mono break-all">{ADMIN_PUBKEY}</code>
        </div>
    }
}

#[component]
fn StatCard(
    label: &'static str,
    value: Signal<String>,
    icon: &'static str,
    color: &'static str,
) -> impl IntoView {
    let (bg, text, icon_bg) = match color {
        "amber" => (
            "bg-amber-500/10 border-amber-500/20",
            "text-amber-400",
            "bg-amber-500/20",
        ),
        "blue" => (
            "bg-blue-500/10 border-blue-500/20",
            "text-blue-400",
            "bg-blue-500/20",
        ),
        "green" => (
            "bg-green-500/10 border-green-500/20",
            "text-green-400",
            "bg-green-500/20",
        ),
        "orange" => (
            "bg-orange-500/10 border-orange-500/20",
            "text-orange-400",
            "bg-orange-500/20",
        ),
        _ => (
            "bg-gray-500/10 border-gray-500/20",
            "text-gray-400",
            "bg-gray-500/20",
        ),
    };

    let card_class = format!("border rounded-lg p-4 {bg}");
    let icon_class = format!("w-10 h-10 rounded-lg {icon_bg} {text} flex items-center justify-center text-lg font-bold");
    let value_class = format!("text-2xl font-bold {text}");

    view! {
        <div class=card_class>
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm text-gray-400 mb-1">{label}</p>
                    <p class=value_class>{move || value.get()}</p>
                </div>
                <div class=icon_class>{icon}</div>
            </div>
        </div>
    }
}

#[component]
fn StatCardSkeleton() -> impl IntoView {
    view! {
        <div class="border border-gray-700 rounded-lg p-4 bg-gray-800 animate-pulse">
            <div class="flex items-start justify-between">
                <div class="space-y-2">
                    <div class="h-3 bg-gray-700 rounded w-16"></div>
                    <div class="h-7 bg-gray-700 rounded w-12"></div>
                </div>
                <div class="w-10 h-10 rounded-lg bg-gray-700"></div>
            </div>
        </div>
    }
}

// -- Channels tab -------------------------------------------------------------

#[component]
fn ChannelsTab() -> impl IntoView {
    let admin = use_admin();
    let auth = use_auth();
    let channels = admin.state.channels;

    let admin_for_create = admin.clone();
    let on_create_channel = move |data: ChannelFormData| {
        if let Some(privkey) = auth.get_privkey_bytes() {
            match admin_for_create.create_channel(
                &data.name,
                &data.description,
                &data.section,
                &privkey,
            ) {
                Ok(()) => {}
                Err(e) => {
                    admin_for_create.state.error.set(Some(e));
                }
            }
        } else {
            admin_for_create
                .state
                .error
                .set(Some("No private key available".into()));
        }
    };

    view! {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            // Channel creation form (sidebar)
            <div class="lg:col-span-1">
                <ChannelForm on_submit=on_create_channel />
            </div>

            // Existing channels list
            <div class="lg:col-span-2">
                <h3 class="text-lg font-semibold text-white mb-3">"Existing Channels"</h3>
                {move || {
                    let chan_list = channels.get();
                    if chan_list.is_empty() {
                        view! {
                            <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                                <p class="text-gray-500">"No channels found. Create one to get started."</p>
                            </div>
                        }.into_any()
                    } else {
                        view! {
                            <div class="space-y-2">
                                {chan_list.into_iter().map(|ch| {
                                    let section_display = if ch.section.is_empty() {
                                        "none".to_string()
                                    } else {
                                        ch.section.clone()
                                    };
                                    view! {
                                        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                                            <div class="flex items-start justify-between">
                                                <div class="min-w-0 flex-1">
                                                    <h4 class="font-semibold text-white truncate">{ch.name.clone()}</h4>
                                                    {(!ch.description.is_empty()).then(|| view! {
                                                        <p class="text-sm text-gray-400 mt-0.5 truncate">{ch.description.clone()}</p>
                                                    })}
                                                    <div class="flex items-center gap-2 mt-2">
                                                        <span class="text-xs text-gray-500 border border-gray-600 rounded px-1.5 py-0.5">
                                                            {section_display}
                                                        </span>
                                                        <span class="text-xs text-gray-600">
                                                            {format!("ID: {}...{}", &ch.id[..8], &ch.id[ch.id.len().saturating_sub(4)..])}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                }).collect_view()}
                            </div>
                        }.into_any()
                    }
                }}
            </div>
        </div>
    }
}

// -- Users tab ----------------------------------------------------------------

#[component]
fn UsersTab() -> impl IntoView {
    let admin = use_admin();
    let auth = use_auth();
    let users = admin.state.users;
    let is_loading = admin.state.is_loading;

    // Add user form state
    let new_pubkey = RwSignal::new(String::new());
    let new_cohorts = RwSignal::new(vec!["general".to_string()]);
    let add_error = RwSignal::new(Option::<String>::None);

    let on_pubkey_input = move |ev: leptos::ev::Event| {
        new_pubkey.set(event_target_value(&ev));
        add_error.set(None);
    };

    let admin_for_add = admin.clone();
    let on_add_user = move |ev: leptos::ev::SubmitEvent| {
        ev.prevent_default();

        let pk = new_pubkey.get_untracked();
        let pk_trimmed = pk.trim();

        // Validate pubkey format (64 hex chars)
        if pk_trimmed.len() != 64 || !pk_trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
            add_error.set(Some("Pubkey must be 64 hex characters".into()));
            return;
        }

        let cohorts = new_cohorts.get_untracked();
        if cohorts.is_empty() {
            add_error.set(Some("Select at least one cohort".into()));
            return;
        }

        if let Some(privkey) = auth.get_privkey_bytes() {
            let admin_clone = admin_for_add.clone();
            let pk_owned = pk_trimmed.to_string();
            spawn_local(async move {
                match admin_clone.add_to_whitelist(&pk_owned, &cohorts, &privkey).await {
                    Ok(()) => {
                        new_pubkey.set(String::new());
                        new_cohorts.set(vec!["general".to_string()]);
                    }
                    Err(_) => {} // Error is already set in admin state
                }
            });
        } else {
            add_error.set(Some("No private key available".into()));
        }
    };

    // Cohort update handler for the user table
    let admin_for_update = admin.clone();
    let on_update_cohorts = move |pubkey: String, cohorts: Vec<String>| {
        if let Some(privkey) = auth.get_privkey_bytes() {
            let admin_clone = admin_for_update.clone();
            spawn_local(async move {
                let _ = admin_clone.update_cohorts(&pubkey, &cohorts, &privkey).await;
            });
        }
    };

    // Refresh handler
    let admin_for_refresh = admin.clone();
    let on_refresh = move |_| {
        if let Some(privkey) = auth.get_privkey_bytes() {
            let admin_clone = admin_for_refresh.clone();
            spawn_local(async move {
                let _ = admin_clone.fetch_whitelist(&privkey).await;
            });
        }
    };

    let users_signal = Signal::derive(move || users.get());

    view! {
        <div class="space-y-6">
            // Add user form
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 class="text-lg font-semibold text-white mb-4">"Add User to Whitelist"</h3>
                <form on:submit=on_add_user class="space-y-4">
                    // Pubkey input
                    <div class="space-y-1">
                        <label for="add-pubkey" class="block text-sm font-medium text-gray-300">
                            "Public Key (hex)"
                        </label>
                        <input
                            id="add-pubkey"
                            type="text"
                            prop:value=move || new_pubkey.get()
                            on:input=on_pubkey_input
                            placeholder="64-character hex public key"
                            class="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                        />
                        {move || {
                            add_error.get().map(|msg| view! {
                                <p class="text-red-400 text-sm">{msg}</p>
                            })
                        }}
                    </div>

                    // Cohort checkboxes
                    <div class="space-y-1">
                        <label class="block text-sm font-medium text-gray-300">"Cohorts"</label>
                        <div class="flex flex-wrap gap-3">
                            {["general", "music", "events", "tech", "moderator", "vip"].iter().map(|cohort| {
                                let cohort_str = cohort.to_string();
                                let cohort_check = cohort_str.clone();
                                let cohort_toggle = cohort_str.clone();
                                let label = capitalize_str(cohort);

                                let is_checked = move || new_cohorts.get().contains(&cohort_check);
                                let on_toggle = move |_| {
                                    new_cohorts.update(|list| {
                                        if list.contains(&cohort_toggle) {
                                            list.retain(|c| c != &cohort_toggle);
                                        } else {
                                            list.push(cohort_toggle.clone());
                                        }
                                    });
                                };

                                view! {
                                    <label class="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            prop:checked=is_checked
                                            on:change=on_toggle
                                            class="rounded border-gray-600 bg-gray-900 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span class="text-sm text-gray-300">{label}</span>
                                    </label>
                                }
                            }).collect_view()}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled=move || is_loading.get()
                        class="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        {move || if is_loading.get() { "Adding..." } else { "Add User" }}
                    </button>
                </form>
            </div>

            // User table
            <div>
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-lg font-semibold text-white">"Whitelisted Users"</h3>
                    <button
                        on:click=on_refresh
                        disabled=move || is_loading.get()
                        class="text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400 rounded px-3 py-1 transition-colors disabled:opacity-50"
                    >
                        {move || if is_loading.get() { "Refreshing..." } else { "Refresh" }}
                    </button>
                </div>

                <Show
                    when=move || !is_loading.get()
                    fallback=|| view! {
                        <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center animate-pulse">
                            <p class="text-gray-500">"Loading whitelist..."</p>
                        </div>
                    }
                >
                    <UserTable users=users_signal on_update_cohorts=UpdateCohortsCb::new(on_update_cohorts.clone()) />
                </Show>
            </div>
        </div>
    }
}

/// Capitalize the first letter of a string.
fn capitalize_str(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}
