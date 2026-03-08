//! Root application component with router, layout, and auth gate.

use leptos::prelude::*;
use leptos_router::components::{Route, Router, Routes, A};
use leptos_router::hooks::use_location;
use leptos_router::path;

use crate::admin::AdminStore;
use crate::auth::{provide_auth, use_auth};
use crate::pages::{
    AdminPage, ChannelPage, ChatPage, DmChatPage, DmListPage, HomePage, LoginPage, SignupPage,
};
use crate::relay::RelayConnection;

// -- Base path for sub-directory deployment -----------------------------------

/// Base URL prefix. Set `FORUM_BASE=/community` at compile time for production.
/// Empty/unset for local development (routes mount at root).
const FORUM_BASE: &str = match option_env!("FORUM_BASE") {
    Some(b) => b,
    None => "",
};

/// Build a full href by prepending the base path. Used for programmatic
/// navigation that bypasses the router (e.g. `window.location.set_href`).
pub(crate) fn base_href(path: &str) -> String {
    if FORUM_BASE.is_empty() {
        path.to_string()
    } else {
        format!("{}{}", FORUM_BASE, path)
    }
}

// -- SVG icon helpers ---------------------------------------------------------

fn brand_icon() -> impl IntoView {
    view! {
        <svg class="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
                fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
    }
}

fn chat_icon() -> impl IntoView {
    view! {
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    }
}

fn dm_icon() -> impl IntoView {
    view! {
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="22,6 12,13 2,6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    }
}

fn user_icon() -> impl IntoView {
    view! {
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    }
}

fn logout_icon() -> impl IntoView {
    view! {
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"
                stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="16 17 21 12 16 7" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    }
}

fn hamburger_icon() -> impl IntoView {
    view! {
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6" stroke-linecap="round"/>
            <line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round"/>
            <line x1="3" y1="18" x2="21" y2="18" stroke-linecap="round"/>
        </svg>
    }
}

fn close_icon() -> impl IntoView {
    view! {
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round"/>
        </svg>
    }
}

fn admin_icon() -> impl IntoView {
    view! {
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    }
}

fn loading_spinner() -> impl IntoView {
    view! {
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div class="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            <p class="text-gray-500 text-sm">"Loading..."</p>
        </div>
    }
}

fn redirect_spinner() -> impl IntoView {
    view! {
        <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div class="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full"></div>
            <p class="text-gray-400 text-sm">"Redirecting to login..."</p>
        </div>
    }
}

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
        <Router base=FORUM_BASE>
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
                    <Route path=path!("/dm") view=AuthGatedDmList />
                    <Route path=path!("/dm/:pubkey") view=AuthGatedDmChat />
                    <Route path=path!("/admin") view=AdminPage />
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
    let mobile_open = RwSignal::new(false);

    let location = use_location();
    let pathname = move || location.pathname.get();

    let display_name = Memo::new(move |_| {
        nickname.get().unwrap_or_else(|| {
            pubkey
                .get()
                .map(|pk| format!("{}...", &pk[..8]))
                .unwrap_or_else(|| "Anonymous".to_string())
        })
    });

    let is_admin = Memo::new(move |_| {
        pubkey
            .get()
            .map(|pk| AdminStore::is_admin(&pk))
            .unwrap_or(false)
    });

    // Helper: returns active or inactive CSS for nav links
    let nav_link_class = move |prefix: &'static str| {
        move || {
            let p = pathname();
            let active = if prefix == "/" {
                p == "/"
            } else {
                p == prefix || p.starts_with(&format!("{}/", prefix))
            };
            if active {
                "flex items-center gap-1.5 text-amber-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800 font-medium"
            } else {
                "flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
            }
        }
    };

    let mobile_link_class = move |prefix: &'static str| {
        move || {
            let p = pathname();
            let active = if prefix == "/" {
                p == "/"
            } else {
                p == prefix || p.starts_with(&format!("{}/", prefix))
            };
            if active {
                "flex items-center gap-2 text-amber-400 font-medium px-4 py-3 rounded-lg bg-amber-400/10"
            } else {
                "flex items-center gap-2 text-gray-300 hover:text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            }
        }
    };

    let close_mobile = move |_| {
        mobile_open.set(false);
    };

    view! {
        <div class="min-h-screen bg-gray-900 text-white flex flex-col">
            // Header
            <header class="border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
                <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    // Brand
                    <A href="/" attr:class="flex items-center gap-2 text-xl sm:text-2xl font-bold text-amber-400 hover:text-amber-300 transition-colors">
                        {brand_icon()}
                        "DreamLab Forum"
                    </A>

                    // Desktop nav
                    <div class="hidden sm:flex items-center gap-4">
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
                            <A href="/chat" attr:class=nav_link_class("/chat")>
                                {chat_icon()}
                                "Chat"
                            </A>
                            <A href="/dm" attr:class=nav_link_class("/dm")>
                                {dm_icon()}
                                "DMs"
                            </A>
                            {move || is_admin.get().then(|| view! {
                                <A href="/admin" attr:class=nav_link_class("/admin")>
                                    {admin_icon()}
                                    <span class="text-sm">"Admin"</span>
                                </A>
                            })}
                            <div class="flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300">
                                {user_icon()}
                                <span>{move || display_name.get()}</span>
                            </div>
                            <LogoutButton />
                        </Show>
                    </div>

                    // Mobile hamburger
                    <button
                        class="sm:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        on:click=move |_| mobile_open.update(|v| *v = !*v)
                    >
                        <Show
                            when=move || mobile_open.get()
                            fallback=|| { hamburger_icon() }
                        >
                            {close_icon()}
                        </Show>
                    </button>
                </nav>

                // Mobile dropdown menu
                <Show when=move || mobile_open.get()>
                    <div class="sm:hidden border-t border-gray-800/50 bg-gray-900/95 backdrop-blur-md px-4 pb-4 pt-2 space-y-1">
                        <Show
                            when=move || is_authed.get()
                            fallback=move || view! {
                                <A href="/login" attr:class="block text-gray-300 hover:text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors" on:click=close_mobile>
                                    "Log In"
                                </A>
                                <A href="/signup" attr:class="block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-3 rounded-lg transition-colors text-center" on:click=close_mobile>
                                    "Sign Up"
                                </A>
                            }
                        >
                            <A href="/chat" attr:class=mobile_link_class("/chat") on:click=close_mobile>
                                {chat_icon()}
                                "Chat"
                            </A>
                            <A href="/dm" attr:class=mobile_link_class("/dm") on:click=close_mobile>
                                {dm_icon()}
                                "DMs"
                            </A>
                            {move || is_admin.get().then(|| view! {
                                <A href="/admin" attr:class=mobile_link_class("/admin") on:click=close_mobile>
                                    {admin_icon()}
                                    "Admin"
                                </A>
                            })}
                            <div class="border-t border-gray-800/50 mt-2 pt-2 flex items-center justify-between px-4 py-2">
                                <div class="flex items-center gap-2 text-gray-300 text-sm">
                                    {user_icon()}
                                    <span>{move || display_name.get()}</span>
                                </div>
                                <LogoutButton />
                            </div>
                        </Show>
                    </div>
                </Show>
            </header>

            <main class="flex-1">
                {children()}
            </main>

            // Footer
            <footer class="border-t border-gray-800/50 py-8 mt-auto">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div class="flex items-center gap-2 text-gray-500">
                            {brand_icon()}
                            <span class="text-sm">"DreamLab AI"</span>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-gray-600">
                            <span>"Nostr Protocol"</span>
                            <span class="text-gray-700">"|"</span>
                            <span>"NIP-44 Encrypted"</span>
                            <span class="text-gray-700">"|"</span>
                            <span>"Built with Rust + WASM"</span>
                        </div>
                        <div class="text-xs text-gray-600">"2026"</div>
                    </div>
                </div>
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
            class="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-sm"
        >
            {logout_icon()}
            "Log Out"
        </button>
    }
}

// -- Auth-gated chat pages ----------------------------------------------------

/// Channel list with auth gate -- redirects to login if not authenticated.
#[component]
fn AuthGatedChat() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href(&base_href("/login"));
            }
        }
    });

    view! {
        <Show
            when=move || is_ready.get()
            fallback=|| { loading_spinner() }
        >
            <Show
                when=move || is_authed.get()
                fallback=|| { redirect_spinner() }
            >
                <ChatPage />
            </Show>
        </Show>
    }
}

/// Single channel view with auth gate -- redirects to login if not authenticated.
#[component]
fn AuthGatedChannel() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href(&base_href("/login"));
            }
        }
    });

    view! {
        <Show
            when=move || is_ready.get()
            fallback=|| { loading_spinner() }
        >
            <Show
                when=move || is_authed.get()
                fallback=|| { redirect_spinner() }
            >
                <ChannelPage />
            </Show>
        </Show>
    }
}

/// DM conversation list with auth gate.
#[component]
fn AuthGatedDmList() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href(&base_href("/login"));
            }
        }
    });

    view! {
        <Show
            when=move || is_ready.get()
            fallback=|| { loading_spinner() }
        >
            <Show
                when=move || is_authed.get()
                fallback=|| { redirect_spinner() }
            >
                <DmListPage />
            </Show>
        </Show>
    }
}

/// Single DM conversation with auth gate.
#[component]
fn AuthGatedDmChat() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();
    let is_ready = auth.is_ready();

    Effect::new(move |_| {
        if is_ready.get() && !is_authed.get() {
            if let Some(window) = web_sys::window() {
                let _ = window.location().set_href(&base_href("/login"));
            }
        }
    });

    view! {
        <Show
            when=move || is_ready.get()
            fallback=|| { loading_spinner() }
        >
            <Show
                when=move || is_authed.get()
                fallback=|| { redirect_spinner() }
            >
                <DmChatPage />
            </Show>
        </Show>
    }
}
