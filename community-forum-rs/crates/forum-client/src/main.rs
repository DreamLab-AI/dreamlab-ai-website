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
}
