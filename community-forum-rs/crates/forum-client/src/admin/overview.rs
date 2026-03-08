//! Overview tab and shared display components for the admin panel.
//!
//! Contains stat cards, connection status bar, and the overview tab.

use leptos::prelude::*;

use super::{use_admin, ADMIN_PUBKEY};
use crate::relay::{ConnectionState, RelayConnection};

// -- Connection status bar ----------------------------------------------------

/// Displays the current relay connection state with a colored indicator.
#[component]
pub fn ConnectionStatusBar() -> impl IntoView {
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

/// The overview tab displaying aggregate stats and admin info.
#[component]
pub fn OverviewTab() -> impl IntoView {
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

// -- Stat card ----------------------------------------------------------------

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
    let icon_class = format!(
        "w-10 h-10 rounded-lg {icon_bg} {text} flex items-center justify-center text-lg font-bold"
    );
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
