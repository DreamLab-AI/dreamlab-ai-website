//! DreamLab AI forum operator overlay for the `nostr-bbs` kit.
//!
//! This package is the *operator-specific* overlay sitting on top of the
//! generic `nostr-bbs-*` kit crates living in the `nostr-rust-forum` repo.
//! It provides:
//!
//! 1. [`branding`] -- the DreamLab-specific [`BrandingConfig`] populator
//!    (theme, logos, copy, zone display overrides).
//! 2. [`workers`] -- per-worker entry shims that document the rc6
//!    wrangler.toml routing model, expose deployed URLs for service
//!    discovery, and provide [`workers::RateLimitConfig`] for operator-
//!    side rate limiting via `nostr-bbs-rate-limit`.
//! 3. `dreamlab.toml` -- the operator-supplied TOML consumed by
//!    `nostr-bbs-config::load_from_path` at startup.
//! 4. `deploy/<worker>.wrangler.toml` -- preserved CF resource IDs (D1,
//!    KV namespaces, R2 buckets, Custom Domain mappings). The kit-cutover to a
//!    thin consumer is complete: the legacy `community-forum-rs/` fork was
//!    deleted at commit `d248550`, and production now deploys entirely from the
//!    pinned kit with this crate as the sole operator overlay.
//!
//! # Architecture (rc6)
//!
//! Each `nostr-bbs-*-worker` crate ships a self-contained `#[event(fetch)]`
//! entry point. The operator overlay is applied through environment variables
//! and resource bindings in `deploy/*.wrangler.toml`, not through a Rust-level
//! dispatch API. Rate limiting is handled by `nostr-bbs-rate-limit` (already
//! wired into the kit workers) and by [`workers::RateLimitConfig`] for any
//! additional operator-side gating.
//!
//! Cutover decisions: [ADR-040]; SHA production runs:
//! `docs/architecture/kit-compatibility-record.md`.
//!
//! [ADR-040]: https://github.com/DreamLab-AI/dreamlab-ai-website/blob/main/docs/adr/040-gap-close-edge-decisions.md

#![warn(missing_docs)]

pub mod branding;
pub mod deploy_config;
pub mod workers;
