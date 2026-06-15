//! Per-worker entry shims and rate-limit wiring for the DreamLab deployment.
//!
//! # Rate limiting (Task: khive 799faa7c)
//!
//! [`RateLimitConfig`] reads per-route limits from `dreamlab.toml` and exposes
//! a convenience wrapper around `nostr_bbs_rate_limit::{check_rate_limit, client_ip}`.
//! Each worker entry point should call [`RateLimitConfig::gate`] early in its
//! request handler to enforce the operator-supplied limits.
//!
//! # Dispatch shims (Task: khive 74a8bdb9)
//!
//! The rc6 kit workers (`nostr-bbs-{auth,pod,relay,search,preview}-worker`) each
//! ship a self-contained `#[event(fetch)]` entry point compiled to WASM. There is
//! no separate `dispatch` extension API; the operator overlay is applied at the
//! **wrangler.toml routing level** (see `deploy/*.wrangler.toml`), not at the
//! Rust function-call level.
//!
//! The previous stubs claimed a "Sprint v12+" dispatch API would land. That was
//! superseded by the rc6 architecture: each worker is deployed independently via
//! `wrangler deploy --config deploy/<worker>.wrangler.toml`, and the operator
//! overlay (branding, env vars, KV/D1/R2 bindings) is injected through the
//! wrangler manifest, not through a Rust wrapper function.
//!
//! The entry-point functions below now document this routing model and return
//! the deployed worker URLs for service discovery.

#![allow(missing_docs)]

use nostr_bbs_config::schema::RateLimit;
use worker::{Env, Request};

// ---------------------------------------------------------------------------
// Rate-limit wiring (khive 799faa7c)
// ---------------------------------------------------------------------------

/// Operator-configurable rate-limit settings derived from `dreamlab.toml`.
///
/// Wraps the `[ratelimit]` section of `nostr_bbs_config::schema::RateLimit`
/// and delegates enforcement to `nostr_bbs_rate_limit::check_rate_limit`.
///
/// # JSS Phase 1 routing (May 2026)
///
/// Phase 1 added the `/api/exports/*` surface (pod data export). The kit
/// `nostr-bbs-config` schema now owns the `[export]` section directly, so the
/// operator reads the budget from the typed kit config and applies it via
/// [`RateLimitConfig::with_export_per_min`].
/// See `dreamlab.toml` `[ratelimit].export_per_min` for the operator setting.
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Max requests per minute for `/api/profiles/batch`.
    pub profiles_batch_per_min: u32,
    /// Max requests per minute for `/.well-known/nostr.json`.
    pub nostr_well_known_per_min: u32,
    /// Max requests per minute for `/api/exports/*` (JSS Phase 1).
    pub export_per_min: u32,
    /// Default per-route limit when no specific override exists.
    pub default_per_min: u32,
}

impl RateLimitConfig {
    /// Build from the operator TOML's `[ratelimit]` section.
    ///
    /// `export_per_min` defaults to 6 (the JSS Phase 1 reference budget);
    /// override via [`Self::with_export_per_min`] with the value read from the
    /// kit's typed `[export]` / `[ratelimit]` config in `dreamlab.toml`.
    pub fn from_schema(rl: &RateLimit) -> Self {
        Self {
            profiles_batch_per_min: rl.profiles_batch_per_min.unwrap_or(60),
            nostr_well_known_per_min: rl.nostr_well_known_per_min.unwrap_or(60),
            export_per_min: 6,
            default_per_min: 120,
        }
    }

    /// Apply the operator-overlay `export_per_min` value (JSS Phase 1).
    ///
    /// Builder-style helper used after [`Self::from_schema`] so the overlay
    /// can layer the new field on top of the upstream typed schema without
    /// requiring a `nostr-bbs-config` bump.
    #[must_use]
    pub fn with_export_per_min(mut self, n: u32) -> Self {
        self.export_per_min = n;
        self
    }

    /// Resolve the per-minute limit for a given request path.
    pub fn limit_for_path(&self, path: &str) -> u32 {
        if path.starts_with("/api/profiles/batch") {
            self.profiles_batch_per_min
        } else if path.starts_with("/.well-known/nostr.json") {
            self.nostr_well_known_per_min
        } else if path.starts_with("/api/exports/") {
            self.export_per_min
        } else {
            self.default_per_min
        }
    }

    /// Gate a request: extract the client IP, look up the per-route limit,
    /// and check the sliding-window counter in Cloudflare KV.
    ///
    /// Returns `Ok(ip)` if the request is allowed, or `Err(response)` with
    /// a 429 Too Many Requests body if rate-limited.
    ///
    /// `kv_binding` is the name of the KV namespace configured in the
    /// worker's `wrangler.toml` (e.g. `"SESSIONS"`, `"RATE_LIMIT"`).
    pub async fn gate(
        &self,
        req: &Request,
        env: &Env,
        kv_binding: &str,
        path: &str,
    ) -> Result<String, worker::Response> {
        let ip = nostr_bbs_rate_limit::client_ip(req);
        let limit = self.limit_for_path(path);
        let allowed = nostr_bbs_rate_limit::check_rate_limit(env, kv_binding, &ip, limit, 60).await;
        if allowed {
            Ok(ip)
        } else {
            let body = serde_json::json!({
                "error": "rate limit exceeded",
                "retry_after_secs": 60,
            });
            let resp = worker::Response::ok(body.to_string())
                .unwrap_or_else(|_| worker::Response::error("rate limited", 429).unwrap())
                .with_status(429);
            let headers = resp.headers();
            headers.set("Content-Type", "application/json").ok();
            headers.set("Retry-After", "60").ok();
            Err(resp)
        }
    }
}

/// Extract the client IP from a Cloudflare Workers request.
///
/// Re-export of `nostr_bbs_rate_limit::client_ip` for convenience.
pub fn client_ip(req: &Request) -> String {
    nostr_bbs_rate_limit::client_ip(req)
}

// ---------------------------------------------------------------------------
// Worker entry-point documentation (khive 74a8bdb9)
// ---------------------------------------------------------------------------

/// Deployed base URLs for DreamLab workers (Cloudflare Workers).
///
/// These are the canonical URLs used for inter-worker communication and
/// frontend service discovery. They match the `name` fields in the
/// corresponding `deploy/*.wrangler.toml` manifests, deployed under the
/// DreamLab account's `*.workers.dev` subdomain.
pub mod deployed_urls {
    /// Auth Worker: WebAuthn registration/login, NIP-98, admin resolution.
    /// Deployed via `deploy/auth-worker.wrangler.toml` as `dreamlab-auth-api`.
    pub const AUTH_WORKER: &str = "https://dreamlab-auth-api.solitary-paper-764d.workers.dev";

    /// Pod Worker: Solid pod CRUD, quota management, /pay/ payment routes.
    /// Deployed via `deploy/pod-worker.wrangler.toml` as `dreamlab-pod-api`.
    pub const POD_WORKER: &str = "https://dreamlab-pod-api.solitary-paper-764d.workers.dev";

    /// Relay Worker: Nostr relay (WebSocket), NIP event handling, whitelist.
    /// Deployed via `deploy/relay-worker.wrangler.toml` as `dreamlab-nostr-relay`.
    pub const RELAY_WORKER: &str = "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev";

    /// Search Worker: full-text + vector search over relay events.
    /// Deployed via `deploy/search-worker.wrangler.toml` as `dreamlab-search-api`.
    pub const SEARCH_WORKER: &str = "https://dreamlab-search-api.solitary-paper-764d.workers.dev";

    /// Preview Worker: link preview / Open Graph unfurling.
    /// Deployed via `deploy/preview-worker.wrangler.toml` as `dreamlab-link-preview`.
    pub const PREVIEW_WORKER: &str =
        "https://dreamlab-link-preview.solitary-paper-764d.workers.dev";
}

/// Auth Worker entry shim.
///
/// The rc6 `nostr-bbs-auth-worker` crate ships its own `#[event(fetch)]`
/// entry point. The operator overlay (D1 IDs, KV namespace IDs, WebAuthn
/// RP config, admin pubkeys) is applied through environment variables and
/// resource bindings in `deploy/auth-worker.wrangler.toml`.
///
/// Rate limiting: the auth-worker already calls
/// `nostr_bbs_rate_limit::check_rate_limit` internally (20 req/min/IP via
/// the SESSIONS KV binding). No additional operator-side gating is needed.
///
/// Returns the deployed worker URL for service discovery.
pub fn auth_worker_entry() -> &'static str {
    deployed_urls::AUTH_WORKER
}

/// Pod Worker entry shim.
///
/// The rc6 `nostr-bbs-pod-worker` crate ships its own `#[event(fetch)]`.
/// Operator overlay via `deploy/pod-worker.wrangler.toml`. Includes
/// `/pay/` routes (`.info`, `.balance`, `.deposit`) for HTTP 402 payments.
///
/// Rate limiting: apply via [`RateLimitConfig::gate`] with the `POD_META`
/// KV binding at the operator edge (e.g. in a CF Worker route wrapper).
///
/// Returns the deployed worker URL for service discovery.
pub fn pod_worker_entry() -> &'static str {
    deployed_urls::POD_WORKER
}

/// Relay Worker entry shim.
///
/// The rc6 `nostr-bbs-relay-worker` crate ships its own `#[event(fetch)]`
/// that upgrades to WebSocket. Operator overlay via
/// `deploy/relay-worker.wrangler.toml`.
///
/// Rate limiting: the relay Durable Object has internal per-connection
/// rate limiting (see `relay_do::broadcast::check_rate_limit`). No
/// additional operator-side gating is needed for WebSocket connections.
///
/// Returns the deployed worker WebSocket URL for service discovery.
pub fn relay_worker_entry() -> &'static str {
    deployed_urls::RELAY_WORKER
}

/// Search Worker entry shim.
///
/// The rc6 `nostr-bbs-search-worker` crate ships its own `#[event(fetch)]`.
/// Operator overlay via `deploy/search-worker.wrangler.toml`.
///
/// Rate limiting: the search-worker already calls
/// `nostr_bbs_rate_limit::check_rate_limit` internally (100 req/min/IP via
/// the SEARCH_CONFIG KV binding).
///
/// Returns the deployed worker URL for service discovery.
pub fn search_worker_entry() -> &'static str {
    deployed_urls::SEARCH_WORKER
}

/// Preview Worker entry shim.
///
/// The rc6 `nostr-bbs-preview-worker` crate ships its own `#[event(fetch)]`.
/// Operator overlay via `deploy/preview-worker.wrangler.toml`.
///
/// Rate limiting: the preview-worker already calls
/// `nostr_bbs_rate_limit::check_rate_limit` internally (30 req/min/IP via
/// the RATE_LIMIT KV binding).
///
/// Returns the deployed worker URL for service discovery.
pub fn preview_worker_entry() -> &'static str {
    deployed_urls::PREVIEW_WORKER
}

/// Forum Client entry shim.
///
/// The forum-client is a Trunk-built WASM binary, not a CF Worker. It
/// reads branding config via `option_env!` build slots populated at
/// `trunk build` time. No runtime dispatch is involved.
///
/// Returns a documentation string describing the build process.
pub fn forum_client_entry() -> &'static str {
    "forum-client: built via `trunk build` with branding overlay from dreamlab.toml \
     (not a CF Worker — no wrangler dispatch)"
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr_bbs_config::schema::RateLimit;

    #[test]
    fn rate_limit_config_from_schema_defaults() {
        let rl = RateLimit {
            profiles_batch_per_min: None,
            nostr_well_known_per_min: None,
        };
        let cfg = RateLimitConfig::from_schema(&rl);
        assert_eq!(cfg.profiles_batch_per_min, 60);
        assert_eq!(cfg.nostr_well_known_per_min, 60);
        assert_eq!(cfg.export_per_min, 6);
        assert_eq!(cfg.default_per_min, 120);
    }

    #[test]
    fn rate_limit_config_from_schema_overrides() {
        let rl = RateLimit {
            profiles_batch_per_min: Some(30),
            nostr_well_known_per_min: Some(10),
        };
        let cfg = RateLimitConfig::from_schema(&rl);
        assert_eq!(cfg.profiles_batch_per_min, 30);
        assert_eq!(cfg.nostr_well_known_per_min, 10);
    }

    #[test]
    fn rate_limit_config_with_export_per_min_overlay() {
        let rl = RateLimit {
            profiles_batch_per_min: None,
            nostr_well_known_per_min: None,
        };
        let cfg = RateLimitConfig::from_schema(&rl).with_export_per_min(12);
        assert_eq!(cfg.export_per_min, 12);
    }

    #[test]
    fn limit_for_path_profiles() {
        let cfg = RateLimitConfig {
            profiles_batch_per_min: 42,
            nostr_well_known_per_min: 60,
            export_per_min: 6,
            default_per_min: 120,
        };
        assert_eq!(cfg.limit_for_path("/api/profiles/batch"), 42);
    }

    #[test]
    fn limit_for_path_well_known() {
        let cfg = RateLimitConfig {
            profiles_batch_per_min: 60,
            nostr_well_known_per_min: 15,
            export_per_min: 6,
            default_per_min: 120,
        };
        assert_eq!(cfg.limit_for_path("/.well-known/nostr.json"), 15);
    }

    #[test]
    fn limit_for_path_exports() {
        let cfg = RateLimitConfig {
            profiles_batch_per_min: 60,
            nostr_well_known_per_min: 60,
            export_per_min: 9,
            default_per_min: 120,
        };
        assert_eq!(cfg.limit_for_path("/api/exports/profile"), 9);
        assert_eq!(cfg.limit_for_path("/api/exports/full.jsonld"), 9);
    }

    #[test]
    fn limit_for_path_default() {
        let cfg = RateLimitConfig {
            profiles_batch_per_min: 60,
            nostr_well_known_per_min: 60,
            export_per_min: 6,
            default_per_min: 200,
        };
        assert_eq!(cfg.limit_for_path("/some/other/route"), 200);
    }

    #[test]
    fn entry_points_return_urls() {
        assert!(auth_worker_entry().starts_with("https://"));
        assert!(pod_worker_entry().starts_with("https://"));
        assert!(relay_worker_entry().starts_with("wss://"));
        assert!(search_worker_entry().starts_with("https://"));
        assert!(preview_worker_entry().starts_with("https://"));
        assert!(forum_client_entry().contains("trunk build"));
    }

    #[test]
    fn deployed_urls_match_wrangler_names() {
        // Verify the URLs contain the worker names from wrangler.toml.
        assert!(deployed_urls::AUTH_WORKER.contains("dreamlab-auth-api"));
        assert!(deployed_urls::POD_WORKER.contains("dreamlab-pod-api"));
        assert!(deployed_urls::RELAY_WORKER.contains("dreamlab-nostr-relay"));
        assert!(deployed_urls::SEARCH_WORKER.contains("dreamlab-search-api"));
        assert!(deployed_urls::PREVIEW_WORKER.contains("dreamlab-link-preview"));
    }
}
