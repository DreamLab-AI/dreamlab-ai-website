use leptos::prelude::*;

#[component]
fn App() -> impl IntoView {
    view! {
        <main class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
            <div class="text-center">
                <h1 class="text-4xl font-bold mb-4">
                    "DreamLab Forum \u{2014} Rust Port"
                </h1>
                <p class="text-gray-400">
                    "Leptos + nostr-sdk + Cloudflare Workers"
                </p>
            </div>
        </main>
    }
}

fn main() {
    leptos::mount::mount_to_body(App);
}
