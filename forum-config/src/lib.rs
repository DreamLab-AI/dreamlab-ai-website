//! DreamLab AI forum operator overlay for the `nostr-bbs` kit.
//!
//! This package is the *operator-specific* overlay sitting on top of the
//! generic `nostr-bbs-*` kit crates living in the `nostr-rust-forum` repo.
//! It provides:
//!
//! 1. [`branding`] — the DreamLab-specific [`BrandingConfig`] populator
//!    (theme, logos, copy, zone display overrides).
//! 2. [`workers`] — per-worker entry shims that wire the kit's `dispatch`
//!    extension API into the DreamLab-specific routing table.
//! 3. `dreamlab.toml` — the operator-supplied TOML consumed by
//!    `nostr-bbs-config::load_from_path` at startup.
//! 4. `deploy/<worker>.wrangler.toml` — preserved CF resource IDs (D1,
//!    KV namespaces, R2 buckets, Custom Domain mappings) for D2 zero-
//!    downtime route handover from the legacy fork at
//!    `community-forum-rs/`.
//!
//! # Migration plan
//!
//! Per [PRD-012 Phase X3 / X4]:
//!
//! - Phase X3 (this sprint): forum-config/ exists; the legacy
//!   `community-forum-rs/` continues to ship production. No D2 cutover yet.
//! - Phase X4 (Sprint v12+): D2 cutover — switch CF Routes from legacy
//!   workers to forum-config/ workers; delete `community-forum-rs/`.
//!
//! [PRD-012 Phase X3 / X4]: https://github.com/DreamLab-AI/dreamlab-ai-website/blob/main/docs/PRD-012.md

#![warn(missing_docs)]

pub mod branding;
pub mod workers;
