//! Signup page with display name input and passkey registration.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_navigate;
use leptos_router::NavigateOptions;
use wasm_bindgen_futures::spawn_local;

use crate::app::base_href;
use crate::auth::use_auth;

#[component]
pub fn SignupPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let error = auth.error();
    // StoredValue is Copy — safe to capture in multiple closures
    let navigate = StoredValue::new(use_navigate());

    let display_name = RwSignal::new(String::new());
    let is_pending = RwSignal::new(false);

    // Redirect if already authenticated (SPA navigation — preserves WASM state)
    Effect::new(move |_| {
        if is_authed.get() {
            navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
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
                navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
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
                    navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
                }
            });
        }
    };

    view! {
        <div class="min-h-[80vh] flex items-center justify-center px-4">
            <div class="w-full max-w-md">
                <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8 space-y-8">
                    <div class="text-center">
                        <div class="text-amber-400/60">
                            {sparkle_icon_svg()}
                        </div>
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
                                fallback=|| view! {
                                    {key_icon_svg()}
                                    <span>"Register with Passkey"</span>
                                }
                            >
                                <span class="animate-spin inline-block w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full"></span>
                                <span>"Creating account..."</span>
                            </Show>
                        </button>

                        // How it works - numbered steps with connectors
                        <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                            <h3 class="text-sm font-semibold text-gray-300 mb-4">"How it works"</h3>
                            <div class="space-y-0">
                                <StepItem number="1" text="Your device creates a passkey secured by biometrics" last=false />
                                <StepItem number="2" text="A Nostr private key is derived from the passkey using HKDF" last=false />
                                <StepItem number="3" text="The private key stays in memory only -- never stored to disk" last=false />
                                <StepItem number="4" text="Same passkey always derives the same Nostr identity" last=true />
                            </div>
                        </div>
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
                    "Already have an account? "
                    <A href=base_href("/login") attr:class="text-amber-400 hover:text-amber-300 underline">
                        "Sign in"
                    </A>
                </p>
            </div>
        </div>
    }
}

#[component]
fn StepItem(number: &'static str, text: &'static str, last: bool) -> impl IntoView {
    let connector_class = if last {
        "hidden"
    } else {
        "w-px h-4 bg-gray-700 ml-3.5"
    };
    view! {
        <div>
            <div class="flex items-start gap-3">
                <span class="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xs font-semibold text-amber-400">
                    {number}
                </span>
                <p class="text-xs text-gray-400 pt-1 leading-relaxed">{text}</p>
            </div>
            <div class=connector_class></div>
        </div>
    }
}

fn sparkle_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-4 w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
        </svg>
    }
}

fn key_icon_svg() -> impl IntoView {
    view! {
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
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
