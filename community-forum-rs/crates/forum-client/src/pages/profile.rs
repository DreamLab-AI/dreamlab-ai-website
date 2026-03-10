//! Profile page -- displays a user's public Nostr profile.
//!
//! Route: /profile/:pubkey

use leptos::prelude::*;
use leptos_router::hooks::use_params_map;

/// Public profile page for a given pubkey.
#[component]
pub fn ProfilePage() -> impl IntoView {
    let params = use_params_map();
    let pubkey = move || params.read().get("pubkey").unwrap_or_default();

    view! {
        <div class="max-w-3xl mx-auto p-4 sm:p-6">
            <h1 class="text-3xl font-bold text-white mb-4">"Profile"</h1>
            <p class="text-gray-400 font-mono break-all text-sm">{pubkey}</p>
            <div class="mt-6 text-gray-500">"Profile details coming soon."</div>
        </div>
    }
}
