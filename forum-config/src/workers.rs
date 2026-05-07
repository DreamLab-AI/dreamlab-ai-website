//! Per-worker entry shims for the DreamLab deployment.
//!
//! Each shim consists of a small `event(fetch)` (or `wasm_bindgen(start)` for
//! the forum-client) that:
//!   1. Loads `dreamlab.toml` via `nostr_bbs_config::load_from_path`.
//!   2. Applies the DreamLab branding overlay from [`super::branding`].
//!   3. Hands off to the kit's `dispatch` extension API on the relevant
//!      `nostr-bbs-*-worker` crate.
//!
//! # Status
//!
//! Sprint v9-v11: scaffold only. The kit's `dispatch` extension API is the
//! deferred half — workers currently expose `event(fetch)` directly. When
//! `nostr-bbs-relay-worker` (etc.) lands the `dispatch` API, this module
//! re-wires the DreamLab overlay onto it. Until then, the legacy
//! `community-forum-rs/` workers continue to serve production.

#![allow(missing_docs)]

/// Auth Worker entry shim — invoked from a CF Worker `event(fetch)` handler.
///
/// Implementation: Sprint v12+ (depends on
/// `nostr-bbs-auth-worker::dispatch` extension API).
pub fn auth_worker_dispatch_stub() -> &'static str {
    // This stub will be replaced with a `#[event(fetch)]` async fn once the
    // kit's `nostr_bbs_auth_worker::dispatch(req, env, ctx, branding)` is
    // available. Today the kit ships its own non-overlayable `event(fetch)`
    // and this shim is unreachable from production.
    "stub: nostr-bbs-auth-worker dispatch API not yet available (Sprint v12+)"
}

/// Pod Worker entry shim.
pub fn pod_worker_dispatch_stub() -> &'static str {
    "stub: nostr-bbs-pod-worker dispatch API not yet available (Sprint v12+)"
}

/// Relay Worker entry shim.
pub fn relay_worker_dispatch_stub() -> &'static str {
    "stub: nostr-bbs-relay-worker dispatch API not yet available (Sprint v12+)"
}

/// Search Worker entry shim.
pub fn search_worker_dispatch_stub() -> &'static str {
    "stub: nostr-bbs-search-worker dispatch API not yet available (Sprint v12+)"
}

/// Preview Worker entry shim.
pub fn preview_worker_dispatch_stub() -> &'static str {
    "stub: nostr-bbs-preview-worker dispatch API not yet available (Sprint v12+)"
}

/// Forum Client entry shim — invoked from a `wasm_bindgen(start)` in the
/// DreamLab-overlaid forum-client binary.
pub fn forum_client_dispatch_stub() -> &'static str {
    "stub: nostr-bbs-forum-client dispatch API not yet available (Sprint v12+)"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dispatch_stubs_compile() {
        assert!(auth_worker_dispatch_stub().contains("Sprint v12+"));
        assert!(pod_worker_dispatch_stub().contains("Sprint v12+"));
        assert!(relay_worker_dispatch_stub().contains("Sprint v12+"));
        assert!(search_worker_dispatch_stub().contains("Sprint v12+"));
        assert!(preview_worker_dispatch_stub().contains("Sprint v12+"));
        assert!(forum_client_dispatch_stub().contains("Sprint v12+"));
    }
}
