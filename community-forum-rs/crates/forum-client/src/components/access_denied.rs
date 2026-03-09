//! Access denied component for zone-gated content.
//!
//! Displays a glassmorphism card with a lock icon, explains the required access
//! level, and offers a "Request Access" button for Cohort/Private zones or a
//! link back to public areas.

use leptos::prelude::*;
use leptos_router::components::A;

use crate::app::base_href;
use crate::stores::zone_access::Zone;

/// Access denied page shown when a user lacks the required zone permissions.
#[component]
pub fn AccessDenied(
    /// The zone that was required.
    zone: Zone,
) -> impl IntoView {
    let (title, description) = match zone {
        Zone::Public => ("Access Denied", "This content is not available."),
        Zone::Registered => (
            "Members Only",
            "You need to be a registered member to access this area. Please log in or sign up.",
        ),
        Zone::Cohort => (
            "Cohort Access Required",
            "This section is restricted to members of a specific cohort. You can request access below.",
        ),
        Zone::Private => (
            "Invitation Only",
            "This is a private area accessible by invitation only. You can request an invitation below.",
        ),
    };

    let show_request = zone == Zone::Cohort || zone == Zone::Private;
    let show_login = zone == Zone::Registered;

    view! {
        <div class="flex items-center justify-center min-h-[60vh] p-4">
            <div class="relative max-w-md w-full">
                // Glass card
                <div class="glass-card p-8 text-center relative overflow-hidden">
                    // Ambient glow
                    <div class="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

                    <div class="relative z-10">
                        // Lock icon
                        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                            <svg class="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="11" width="18" height="11" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M7 11V7a5 5 0 0110 0v4" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>

                        // Zone badge
                        <span class=format!(
                            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 mb-4 {}",
                            zone.badge_class()
                        )>
                            {zone_icon(zone)}
                            {zone.label()}
                        </span>

                        <h2 class="text-2xl font-bold text-white mb-2">{title}</h2>
                        <p class="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>

                        <div class="flex flex-col gap-3">
                            // Login button for registered zones
                            {show_login.then(|| view! {
                                <A
                                    href=base_href("/login")
                                    attr:class="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors inline-block"
                                >
                                    "Log In"
                                </A>
                                <A
                                    href=base_href("/signup")
                                    attr:class="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-6 py-2.5 rounded-lg transition-colors inline-block"
                                >
                                    "Sign Up"
                                </A>
                            })}

                            // Request access placeholder for cohort/private
                            {show_request.then(|| view! {
                                <p class="text-xs text-gray-500 mt-2">
                                    "Use the \"Request Access\" button on the section page to submit a join request."
                                </p>
                            })}

                            // Back to forums
                            <A
                                href=base_href("/forums")
                                attr:class="text-sm text-gray-400 hover:text-amber-400 transition-colors mt-2 inline-block"
                            >
                                "Back to Forums"
                            </A>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    }
}

/// Small inline SVG icon for the zone badge.
fn zone_icon(zone: Zone) -> impl IntoView {
    match zone {
        Zone::Public => view! {
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z"/>
            </svg>
        }.into_any(),
        Zone::Registered => view! {
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
            </svg>
        }.into_any(),
        Zone::Cohort => view! {
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
            </svg>
        }.into_any(),
        Zone::Private => view! {
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
        }.into_any(),
    }
}
