//! DreamLab community forum -- Leptos CSR application entry point.

mod app;
mod auth;
mod components;
mod pages;
mod relay;

use app::App;

fn main() {
    leptos::mount::mount_to_body(App);
}
