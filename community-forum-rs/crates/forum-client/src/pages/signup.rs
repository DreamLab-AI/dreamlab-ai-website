//! Signup page with display name input and passkey registration.

use leptos::prelude::*;
use leptos_router::components::A;
use wasm_bindgen_futures::spawn_local;

use crate::auth::use_auth;

#[component]
pub fn SignupPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let error = auth.error();

    let display_name = RwSignal::new(String::new());
    let is_pending = RwSignal::new(false);

    // Redirect if already authenticated
    Effect::new(move |_| {
        if is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/chat");
            }
        }
    });

    let on_register = move |_| {
        let name = display_name.get_untracked();
        let trimmed = name.trim().to_string();
        if trimmed.is_empty() {
            auth.set_error("Please enter a display name");
            return;
        }
        if trimmed.len() < 2 {
            auth.set_error("Display name must be at least 2 characters");
            return;
        }
        if trimmed.len() > 50 {
            auth.set_error("Display name must be 50 characters or fewer");
            return;
        }

        auth.clear_error();
        is_pending.set(true);

        let auth = auth;
        spawn_local(async move {
            let result = auth.register_with_passkey(&trimmed).await;
            is_pending.set(false);
            if result.is_ok() {
                if let Some(window) = web_sys::window() {
                    let _ = window.location().set_href("/chat");
                }
            }
        });
    };

    // Handle Enter key in the name input
    let on_keydown = move |ev: web_sys::KeyboardEvent| {
        if ev.key() == "Enter" {
            ev.prevent_default();
            let name = display_name.get_untracked();
            let trimmed = name.trim().to_string();
            if trimmed.is_empty() || trimmed.len() < 2 {
                return;
            }
            auth.clear_error();
            is_pending.set(true);

            let auth = auth;
            spawn_local(async move {
                let result = auth.register_with_passkey(&trimmed).await;
                is_pending.set(false);
                if result.is_ok() {
                    if let Some(window) = web_sys::window() {
                        let _ = window.location().set_href("/chat");
                    }
                }
            });
        }
    };

    view! {
        <div class="min-h-[80vh] flex items-center justify-center px-4">
            <div class="w-full max-w-md space-y-8">
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-white">"Create Account"</h1>
                    <p class="mt-2 text-gray-400">
                        "Register with a passkey to generate your Nostr identity"
                    </p>
                </div>

                // Error display
                <Show when=move || error.get().is_some()>
                    <div class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                        {move || error.get().unwrap_or_default()}
                    </div>
                </Show>

                <div class="space-y-6">
                    <div class="space-y-2">
                        <label for="display-name" class="block text-sm font-medium text-gray-300">
                            "Display Name"
                        </label>
                        <input
                            id="display-name"
                            type="text"
                            placeholder="Your display name"
                            on:input=move |ev| display_name.set(event_target_value(&ev))
                            on:keydown=on_keydown
                            prop:value=move || display_name.get()
                            maxlength="50"
                            class="w-full bg-gray-800 border border-gray-600 focus:border-amber-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <p class="text-xs text-gray-500">
                            "This will be shown to other users in the forum."
                        </p>
                    </div>

                    <button
                        on:click=on_register
                        disabled=move || is_pending.get()
                        class="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Show
                            when=move || is_pending.get()
                            fallback=|| view! { <span>"Register with Passkey"</span> }
                        >
                            <span class="animate-spin inline-block w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full"></span>
                            <span>"Creating account..."</span>
                        </Show>
                    </button>

                    <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2">
                        <h3 class="text-sm font-semibold text-gray-300">"How it works"</h3>
                        <ul class="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                            <li>"Your device creates a passkey secured by biometrics"</li>
                            <li>"A Nostr private key is derived from the passkey using HKDF"</li>
                            <li>"The private key stays in memory only -- never stored to disk"</li>
                            <li>"Same passkey always derives the same Nostr identity"</li>
                        </ul>
                    </div>
                </div>

                <p class="text-center text-gray-500 text-sm">
                    "Already have an account? "
                    <A href="/login" attr:class="text-amber-400 hover:text-amber-300 underline">
                        "Sign in"
                    </A>
                </p>
            </div>
        </div>
    }
}
