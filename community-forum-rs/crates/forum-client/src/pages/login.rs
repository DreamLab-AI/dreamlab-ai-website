//! Login page with passkey, NIP-07 extension, and nsec fallback options.

use leptos::prelude::*;
use leptos_router::components::A;
use wasm_bindgen_futures::spawn_local;

use crate::auth::use_auth;

#[component]
pub fn LoginPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let error = auth.error();

    // Local state for the nsec input fallback
    let nsec_input = RwSignal::new(String::new());
    let show_nsec = RwSignal::new(false);
    let is_pending = RwSignal::new(false);

    // Redirect if already authenticated
    Effect::new(move |_| {
        if is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/chat");
            }
        }
    });

    // Passkey login handler
    let on_passkey_login = move |_| {
        let auth = auth;
        is_pending.set(true);
        spawn_local(async move {
            // Try to use stored pubkey for fast path
            let stored_pubkey = auth.pubkey().get_untracked();
            let result = auth
                .login_with_passkey(stored_pubkey.as_deref())
                .await;
            is_pending.set(false);
            if result.is_ok() {
                if let Some(window) = web_sys::window() {
                    let _ = window.location().set_href("/chat");
                }
            }
        });
    };

    // Nsec login handler
    let on_nsec_login = move |_| {
        let input = nsec_input.get_untracked();
        let trimmed = input.trim().to_string();
        if trimmed.is_empty() {
            auth.set_error("Please enter your private key");
            return;
        }
        auth.clear_error();
        match auth.login_with_local_key(&trimmed) {
            Ok(()) => {
                if let Some(window) = web_sys::window() {
                    let _ = window.location().set_href("/chat");
                }
            }
            Err(e) => {
                auth.set_error(&e);
            }
        }
    };

    view! {
        <div class="min-h-[80vh] flex items-center justify-center px-4">
            <div class="w-full max-w-md space-y-8">
                <div class="text-center">
                    <h1 class="text-3xl font-bold text-white">"Welcome Back"</h1>
                    <p class="mt-2 text-gray-400">"Sign in to your DreamLab account"</p>
                </div>

                // Error display
                <Show when=move || error.get().is_some()>
                    <div class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                        {move || error.get().unwrap_or_default()}
                    </div>
                </Show>

                <div class="space-y-4">
                    // Passkey login (primary)
                    <button
                        on:click=on_passkey_login
                        disabled=move || is_pending.get()
                        class="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <Show
                            when=move || is_pending.get()
                            fallback=|| view! { <span>"Sign In with Passkey"</span> }
                        >
                            <span class="animate-spin inline-block w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full"></span>
                            <span>"Authenticating..."</span>
                        </Show>
                    </button>

                    <div class="relative">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-700"></div>
                        </div>
                        <div class="relative flex justify-center text-sm">
                            <span class="px-4 bg-gray-900 text-gray-500">"or"</span>
                        </div>
                    </div>

                    // Advanced: nsec/hex key input
                    <button
                        on:click=move |_| show_nsec.update(|v| *v = !*v)
                        class="w-full text-gray-400 hover:text-gray-200 text-sm py-2 transition-colors"
                    >
                        {move || if show_nsec.get() { "Hide advanced options" } else { "Advanced: Sign in with private key" }}
                    </button>

                    <Show when=move || show_nsec.get()>
                        <div class="space-y-3 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <label class="block text-sm text-gray-400">"Private key (hex)"</label>
                            <input
                                type="password"
                                placeholder="Enter your 64-character hex private key"
                                on:input=move |ev| nsec_input.set(event_target_value(&ev))
                                prop:value=move || nsec_input.get()
                                class="w-full bg-gray-900 border border-gray-600 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm font-mono"
                            />
                            <button
                                on:click=on_nsec_login
                                class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg transition-colors text-sm font-semibold"
                            >
                                "Sign In with Key"
                            </button>
                            <p class="text-xs text-gray-500">
                                "Your key is held in memory only and never stored to disk."
                            </p>
                        </div>
                    </Show>
                </div>

                <p class="text-center text-gray-500 text-sm">
                    "Don't have an account? "
                    <A href="/signup" attr:class="text-amber-400 hover:text-amber-300 underline">
                        "Create one"
                    </A>
                </p>
            </div>
        </div>
    }
}
