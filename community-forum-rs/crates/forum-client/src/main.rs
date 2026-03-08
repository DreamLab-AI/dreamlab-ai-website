//! DreamLab community forum -- Leptos CSR application entry point.

mod admin;
mod app;
mod auth;
mod components;
mod dm;
mod pages;
mod relay;
pub(crate) mod utils;

use app::App;

fn main() {
    // Surface WASM panics as console.error instead of swallowing them silently.
    console_error_panic_hook::set_once();

    web_sys::console::log_1(&"[DreamLab] WASM main() started".into());

    leptos::mount::mount_to_body(App);

    web_sys::console::log_1(&"[DreamLab] mount_to_body complete".into());

    // Remove the static loading screen now that the Leptos app has mounted.
    if let Some(el) = web_sys::window()
        .and_then(|w| w.document())
        .and_then(|d| d.get_element_by_id("loading-screen"))
    {
        el.remove();
    }
}
