//! Landing page with animated constellation hero + login/signup CTAs.
//!
//! The hero section layers:
//! 1. Canvas2D particle field (golden-angle constellation)
//! 2. CSS ambient orbs (fallback / complementary)
//! 3. Content (text + CTAs)

use leptos::prelude::*;
use leptos_router::components::A;

use crate::auth::use_auth;
use crate::components::particle_canvas::ParticleCanvas;

#[component]
pub fn HomePage() -> impl IntoView {
    let auth = use_auth();
    let is_authed = auth.is_authenticated();

    view! {
        <div class="min-h-[80vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
            // Ambient CSS orbs — always present, complement the canvas
            <div class="ambient-orb ambient-orb-1" aria-hidden="true"></div>
            <div class="ambient-orb ambient-orb-2" aria-hidden="true"></div>
            <div class="ambient-orb ambient-orb-3" aria-hidden="true"></div>

            // Canvas2D constellation particle field (tier 1)
            <ParticleCanvas />

            // Content layer — above the canvas
            <div class="max-w-2xl text-center space-y-8 relative z-10">
                // Hero section with glow
                <div class="relative flex flex-col items-center">
                    <div class="absolute -z-10 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl animate-ambient-breathe"></div>

                    <p class="text-amber-400/60 uppercase tracking-widest text-xs font-medium mb-4">
                        "Decentralized Community"
                    </p>

                    <h1 class="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-lg">
                        "DreamLab Forum"
                    </h1>
                </div>

                <div class="space-y-2">
                    <p class="text-xl text-gray-300 leading-relaxed">
                        "A decentralized community forum built on Nostr."
                    </p>
                    <p class="text-lg text-gray-400 leading-relaxed">
                        "Your keys, your identity, your data \u{2014} no platform lock-in, ever."
                    </p>
                </div>

                <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Show
                        when=move || is_authed.get()
                        fallback=move || view! {
                            <A
                                href="/signup"
                                attr:class="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-xl text-lg transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                            >
                                "Create Account"
                            </A>
                            <A
                                href="/login"
                                attr:class="border border-gray-600 hover:border-amber-500/50 text-gray-200 hover:text-white px-8 py-3 rounded-xl text-lg transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
                            >
                                "Sign In"
                            </A>
                        }
                    >
                        <A
                            href="/chat"
                            attr:class="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-xl text-lg transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                        >
                            "Enter Chat"
                        </A>
                    </Show>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
                    <FeatureCard
                        icon="\u{1F511}"
                        title="Passkey Auth"
                        description="Sign in with biometrics. Your Nostr key is derived from your passkey -- no seed phrases."
                    />
                    <FeatureCard
                        icon="\u{1F6E1}"
                        title="End-to-End Encrypted"
                        description="Direct messages use NIP-44 encryption. Only you and the recipient can read them."
                    />
                    <FeatureCard
                        icon="\u{1F5DD}"
                        title="Self-Sovereign"
                        description="Your identity is a Nostr keypair. Take it anywhere. No platform lock-in."
                    />
                </div>

                // Powered-by tech badges
                <div class="flex flex-wrap items-center justify-center gap-3 pt-6">
                    <TechBadge label="Nostr Protocol" />
                    <TechBadge label="NIP-44 Encryption" />
                    <TechBadge label="WebAuthn Passkeys" />
                    <TechBadge label="Rust + WASM" />
                </div>
            </div>
        </div>
    }
}

#[component]
fn FeatureCard(icon: &'static str, title: &'static str, description: &'static str) -> impl IntoView {
    view! {
        <div class="glass-card p-6 space-y-3 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-300 group">
            <h3 class="text-xl font-semibold text-amber-400 flex items-center gap-2">
                <span class="group-hover:scale-110 transition-transform duration-300">{icon}</span>
                <span>{title}</span>
            </h3>
            <p class="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    }
}

#[component]
fn TechBadge(label: &'static str) -> impl IntoView {
    view! {
        <span class="text-xs text-gray-500 border border-gray-800 rounded-full px-3 py-1 hover:border-amber-500/20 hover:text-gray-400 transition-colors duration-300">
            {label}
        </span>
    }
}
