//! Root application component with router, layout, and auth gate.

use leptos::prelude::*;
use leptos_router::components::{Route, Router, Routes, A};
use leptos_router::path;

use crate::auth::{provide_auth, use_auth};
use crate::pages::{ChannelPage, ChatPage, HomePage, LoginPage, SignupPage};
use crate::relay::RelayConnection;

// -- App root -----------------------------------------------------------------

#[component]
pub fn App() -> impl IntoView {
    provide_auth();

    // Provide relay connection as context — connect/disconnect reactively with auth state
    let relay = RelayConnection::new();
    provide_context(relay.clone());

    let auth = use_auth();
    let is_authed = auth.is_authenticated();

    Effect::new(move |_| {
        if is_authed.get() {
            let r = expect_context::<RelayConnection>();
            r.connect();
        } else {
            let r = expect_context::<RelayConnection>();
            r.disconnect();
        }
    });

    view! {
        <Router>
            <Layout>
                <Routes fallback=|| view! {
                    <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                        <div class="text-center">
                            <h1 class="text-6xl font-bold mb-4">"404"</h1>
                            <p class="text-gray-400 mb-8">"Page not found"</p>
                            <A href="/" attr:class="text-amber-400 hover:text-amber-300 underline">
                                "Go home"
                            </A>
                        </div>
                    </div>
                }>
                    <Route path=path!("/") view=HomePage />
                    <Route path=path!("/login") view=LoginPage />
                    <Route path=path!("/signup") view=SignupPage />
                    <Route path=path!("/chat") view=AuthGatedChat />
                    <Route path=path!("/chat/:channel_id") view=AuthGatedChannel />
                </Routes>
            </Layout>
        </Router>
    }
}

// -- Layout -------------------------------------------------------------------

#[component]
fn Layout(children: Children) -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let nickname = auth.nickname();
    let pubkey = auth.pubkey();

    let display_name = Memo::new(move |_| {
        nickname.get().unwrap_or_else(|| {
            pubkey
                .get()
                .map(|pk| format!("{}...", &pk[..8]))
                .unwrap_or_else(|| "Anonymous".to_string())
        })
    });

    view! {
        <div class="min-h-screen bg-gray-900 text-white flex flex-col">
            <header class="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
                <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <A href="/" attr:class="flex items-center gap-2 text-xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        "DreamLab Forum"
                    </A>

                    <div class="flex items-center gap-4">
                        <Show
                            when=move || is_authed.get()
                            fallback=move || view! {
                                <A href="/login" attr:class="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800">
                                    "Log In"
                                </A>
                                <A href="/signup" attr:class="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors">
                                    "Sign Up"
                                </A>
                            }
                        >
                            <A href="/chat" attr:class="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800">
                                "Chat"
                            </A>
                            <span class="text-gray-400 text-sm">{move || display_name.get()}</span>
                            <LogoutButton />
                        </Show>
                    </div>
                </nav>
            </header>

            <main class="flex-1">
                {children()}
            </main>

            <footer class="border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
                "DreamLab AI Community Forum"
            </footer>
        </div>
    }
}

// -- Logout button ------------------------------------------------------------

#[component]
fn LogoutButton() -> impl IntoView {
    let auth = use_auth();

    let on_logout = move |_| {
        auth.logout();
    };

    view! {
        <button
            on:click=on_logout
            class="text-gray-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800 text-sm"
        >
            "Log Out"
        </button>
    }
}

// -- Auth-gated chat pages ----------------------------------------------------

/// Channel list with auth gate — redirects to login if not authenticated.
#[component]
fn AuthGatedChat() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/login");
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
                when=move || is_authed.get()
                fallback=|| view! {
                    <div class="flex items-center justify-center min-h-[60vh]">
                        <p class="text-gray-400">"Redirecting to login..."</p>
                    </div>
                }
            >
                <ChatPage />
            </Show>
        </Show>
    }
}

/// Single channel view with auth gate — redirects to login if not authenticated.
#[component]
fn AuthGatedChannel() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href("/login");
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
                when=move || is_authed.get()
                fallback=|| view! {
                    <div class="flex items-center justify-center min-h-[60vh]">
                        <p class="text-gray-400">"Redirecting to login..."</p>
                    </div>
                }
            >
                <ChannelPage />
            </Show>
        </Show>
    }
}
