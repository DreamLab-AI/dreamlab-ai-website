//! Login page with passkey, NIP-07 extension, and nsec fallback options.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_navigate;
use leptos_router::NavigateOptions;
use wasm_bindgen_futures::spawn_local;

use crate::app::base_href;
use crate::auth::use_auth;

#[component]
pub fn LoginPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let error = auth.error();
    // StoredValue is Copy — safe to capture in multiple closures including <Show> children
    let navigate = StoredValue::new(use_navigate());

    // Local state for the nsec input fallback
    let nsec_input = RwSignal::new(String::new());
    let show_nsec = RwSignal::new(false);
    let is_pending = RwSignal::new(false);

    // Redirect if already authenticated (SPA navigation — preserves WASM state)
    Effect::new(move |_| {
        if is_authed.get() {
            navigate.with_value(|nav| nav(&base_href("/chat"), NavigateOptions::default()));
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
                navigate.with_value(|nav| nav(&base_href("/chat"), NavigateOptions::default()));
            }
        });
    };

    view! {
        <div class="min-h-[80vh] flex items-center justify-center px-4">
            <div class="w-full max-w-md">
                <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8 space-y-8">
                    <div class="text-center">
                        <div class="text-amber-400/60">
                            {lock_icon_svg()}
                        </div>
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
                                fallback=|| view! {
                                    {fingerprint_icon_svg()}
                                    <span>"Sign In with Passkey"</span>
                                }
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
                                <span class="px-4 bg-gray-800/30 text-gray-500">"or"</span>
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
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-amber-400/80">
                                        {warning_icon_svg()}
                                    </span>
                                    <span class="text-xs font-semibold text-amber-400/80 uppercase tracking-wide">
                                        "Advanced"
                                    </span>
                                </div>
                                <label class="block text-sm text-gray-400">"Private key (hex)"</label>
                                <input
                                    type="password"
                                    placeholder="Enter your 64-character hex private key"
                                    on:input=move |ev| nsec_input.set(event_target_value(&ev))
                                    prop:value=move || nsec_input.get()
                                    class="w-full bg-gray-900 border border-gray-600 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm font-mono"
                                />
                                <button
                                    on:click=move |_| {
                                        let input = nsec_input.get_untracked();
                                        let trimmed = input.trim().to_string();
                                        if trimmed.is_empty() {
                                            auth.set_error("Please enter your private key");
                                            return;
                                        }
                                        auth.clear_error();
                                        match auth.login_with_local_key(&trimmed) {
                                            Ok(()) => {
                                                navigate.with_value(|nav| nav(&base_href("/chat"), NavigateOptions::default()));
                                            }
                                            Err(e) => {
                                                auth.set_error(&e);
                                            }
                                        }
                                    }
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

                    // Security badge
                    <div class="flex items-center justify-center gap-2 text-xs text-gray-500 pt-2">
                        <span class="text-gray-600">
                            {shield_small_icon_svg()}
                        </span>
                        <span>"End-to-end encrypted \u{00B7} Keys never leave your device"</span>
                    </div>
                </div>

                <p class="text-center text-gray-500 text-sm mt-6">
                    "Don\u{2019}t have an account? "
                    <A href=base_href("/signup") attr:class="text-amber-400 hover:text-amber-300 underline">
                        "Create one"
                    </A>
                </p>
            </div>
        </div>
    }
}

fn lock_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-4 w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
        </svg>
    }
}

fn fingerprint_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.108 7.823M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm-9.375 8.414A47.78 47.78 0 0112 21.75c2.676 0 5.216-.584 7.5-1.336"/>
        </svg>
    }
}

fn warning_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
    }
}

fn shield_small_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
        </svg>
    }
}
