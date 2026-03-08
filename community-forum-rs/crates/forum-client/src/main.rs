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
    leptos::mount::mount_to_body(App);

    // Remove the static loading screen now that the Leptos app has mounted.
    if let Some(el) = web_sys::window()
        .and_then(|w| w.document())
        .and_then(|d| d.get_element_by_id("loading-screen"))
    {
        el.remove();
    }
}
