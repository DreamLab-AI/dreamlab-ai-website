//! Login page with traffic-light security options.
//!
//! Green (easy) = paste private key, Yellow = NIP-07 extension, Red = passkey + PRF.

use leptos::prelude::*;
use leptos_router::components::A;
use leptos_router::hooks::use_navigate;
use leptos_router::NavigateOptions;
use wasm_bindgen_futures::spawn_local;

use crate::app::base_href;
use crate::auth::nip07;
use crate::auth::use_auth;

#[component]
pub fn LoginPage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let error = auth.error();
    let navigate = StoredValue::new(use_navigate());

    let key_input = RwSignal::new(String::new());
    let is_pending = RwSignal::new(false);
    let nip07_pending = RwSignal::new(false);
    let has_nip07 = RwSignal::new(nip07::has_nip07_extension());

    // Redirect if already authenticated
    Effect::new(move |_| {
        if is_authed.get() {
            navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
        }
    });

    // Private key login logic (shared between click and enter)
    let do_key_login = move || {
        let input = key_input.get_untracked();
        let trimmed = input.trim().to_string();
        if trimmed.is_empty() {
            auth.set_error("Paste your private key (hex or nsec1...)");
            return;
        }
        auth.clear_error();
        match auth.login_with_local_key(&trimmed) {
            Ok(()) => {
                navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
            }
            Err(e) => auth.set_error(&e),
        }
    };

    view! {
        <div class="min-h-[80vh] flex items-center justify-center px-4">
            <div class="w-full max-w-md">
                <div class="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-8 space-y-6">
                    <div class="text-center">
                        <h1 class="text-3xl font-bold text-white">"Welcome Back"</h1>
                        <p class="mt-2 text-gray-400 text-sm">"Choose how to sign in"</p>
                    </div>

                    // Error display
                    <Show when=move || error.get().is_some()>
                        <div class="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
                            {move || error.get().unwrap_or_default()}
                        </div>
                    </Show>

                    <div class="space-y-3">

                        // === GREEN: Private key (easy, works everywhere) ===
                        <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                                <span class="text-sm font-medium text-gray-200">"Private Key"</span>
                                <span class="text-xs text-gray-500 ml-auto">"Easy"</span>
                            </div>
                            <input
                                type="password"
                                placeholder="Paste nsec1... or 64-char hex key"
                                on:input=move |ev| key_input.set(event_target_value(&ev))
                                on:keydown=move |ev: web_sys::KeyboardEvent| {
                                    if ev.key() == "Enter" {
                                        ev.prevent_default();
                                        do_key_login();
                                    }
                                }
                                prop:value=move || key_input.get()
                                class="w-full bg-gray-900 border border-gray-600 focus:border-green-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm font-mono"
                            />
                            <button
                                on:click=move |_: web_sys::MouseEvent| do_key_login()
                                class="w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg transition-colors text-sm font-semibold"
                            >
                                "Sign In"
                            </button>
                        </div>

                        // === YELLOW: NIP-07 extension ===
                        <div class=move || {
                            if has_nip07.get() {
                                "bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3"
                            } else {
                                "bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3 opacity-50"
                            }
                        }>
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                                <span class="text-sm font-medium text-gray-200">"Nostr Extension (NIP-07)"</span>
                                <span class="text-xs text-gray-500 ml-auto">
                                    {move || {
                                        if has_nip07.get() {
                                            nip07::get_extension_name().unwrap_or_else(|| "Detected".to_string())
                                        } else {
                                            "Not detected".to_string()
                                        }
                                    }}
                                </span>
                            </div>
                            <p class="text-xs text-gray-500">"Use nos2x, Alby, or another signing extension."</p>
                            <button
                                on:click=move |_: web_sys::MouseEvent| {
                                    if !has_nip07.get_untracked() {
                                        auth.set_error("No NIP-07 extension detected. Install nos2x or Alby.");
                                        return;
                                    }
                                    let auth = auth;
                                    nip07_pending.set(true);
                                    spawn_local(async move {
                                        let result = auth.login_with_nip07().await;
                                        nip07_pending.set(false);
                                        if result.is_ok() {
                                            navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
                                        }
                                    });
                                }
                                disabled=move || nip07_pending.get() || !has_nip07.get()
                                class="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                            >
                                <Show
                                    when=move || nip07_pending.get()
                                    fallback=|| view! { <span>"Sign In with Extension"</span> }
                                >
                                    <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    <span>"Connecting..."</span>
                                </Show>
                            </button>
                        </div>

                        // === RED: Passkey + PRF (secure but limited support) ===
                        <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                <span class="text-sm font-medium text-gray-200">"Passkey (PRF)"</span>
                                <span class="text-xs text-gray-500 ml-auto">"Chrome/Safari only"</span>
                            </div>
                            <p class="text-xs text-gray-500">"Derives your key from biometrics. Requires PRF support."</p>
                            <button
                                on:click=move |_: web_sys::MouseEvent| {
                                    let auth = auth;
                                    is_pending.set(true);
                                    spawn_local(async move {
                                        let stored_pubkey = auth.pubkey().get_untracked();
                                        let result = auth.login_with_passkey(stored_pubkey.as_deref()).await;
                                        is_pending.set(false);
                                        if result.is_ok() {
                                            navigate.with_value(|nav| nav("/chat", NavigateOptions::default()));
                                        }
                                    });
                                }
                                disabled=move || is_pending.get()
                                class="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white py-2.5 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                            >
                                <Show
                                    when=move || is_pending.get()
                                    fallback=|| view! { <span>"Sign In with Passkey"</span> }
                                >
                                    <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    <span>"Authenticating..."</span>
                                </Show>
                            </button>
                        </div>

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
