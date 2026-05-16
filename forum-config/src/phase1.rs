//! JSS Phase 1 operator-overlay toggles.
//!
//! Operator-overlay-only Phase 1 toggles. Upstream `nostr_bbs_config::schema`
//! does not know about these sections; the overlay parses them locally and
//! feeds the resulting struct into worker config. This keeps the operator
//! overlay additive — no upstream schema change is required to ship the
//! DreamLab opt-in surface for the JSS Phase 1 features:
//!
//! 1. **provision-keys** — auto-generate a Schnorr secp256k1 keypair at
//!    `POST /.pods` signup, NIP-19 bech32-encode it, and write the result to
//!    the user's pod at `/private/privkey.jsonld` with WAC locked to the
//!    owner.
//! 2. **nip05-endpoint** — federated NIP-05 resolution: D1 cache first, fall
//!    through to the pod's `/.well-known/nostr.json` on miss.
//! 3. **export-jsonld** — operator opt-in for the `/api/exports/*` surface,
//!    with private-data inclusion default and per-IP rate limit.
//! 4. **git-versioned pods** — per-pod `git init` at creation (JSS #471,
//!    solid-pod-rs alpha.12). Disabled on the CF deployment per NRF ADR-089
//!    (Workers cannot spawn subprocesses); flips on for native backends.
//!
//! All four features live: Phase 1 (provision-keys, nip05-endpoint,
//! export-jsonld) in solid-pod-rs v0.4.0-alpha.11; git-versioned pods in
//! v0.4.0-alpha.12. CF [git].enabled stays false (NRF ADR-089).

use serde::{Deserialize, Serialize};

/// `[provision]` — key provisioning at signup.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvisionConfig {
    /// Master switch. When `false`, the auth-worker behaves as in rc6:
    /// no keypair is written to the pod at signup.
    #[serde(default)]
    pub enabled: bool,
    /// When [`enabled`](Self::enabled) is `true`, auto-generate the keypair at signup.
    #[serde(default = "default_keys_at_signup")]
    pub keys_at_signup: bool,
    /// WAC-locked container path on the pod (e.g. `/private/`).
    #[serde(default = "default_private_dir")]
    pub private_dir: String,
    /// NIP-19 bech32 keypair filename written under [`private_dir`](Self::private_dir).
    #[serde(default = "default_privkey_filename")]
    pub privkey_filename: String,
}

impl Default for ProvisionConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            keys_at_signup: default_keys_at_signup(),
            private_dir: default_private_dir(),
            privkey_filename: default_privkey_filename(),
        }
    }
}

fn default_keys_at_signup() -> bool {
    true
}
fn default_private_dir() -> String {
    "/private/".into()
}
fn default_privkey_filename() -> String {
    "privkey.jsonld".into()
}

/// `[nip05]` — NIP-05 resolution mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Nip05Config {
    /// `"d1"` — central registry only (legacy `POD_META.nip05:{user}` → pubkey).
    /// `"federated"` — D1 cache first, fall through to pod's
    /// `/.well-known/nostr.json` on miss.
    #[serde(default = "default_resolver_mode")]
    pub resolver_mode: String,
    /// Base URL of the pod backend used for federated fallback lookups.
    #[serde(default = "default_pod_base_url")]
    pub pod_base_url: String,
}

impl Default for Nip05Config {
    fn default() -> Self {
        Self {
            resolver_mode: default_resolver_mode(),
            pod_base_url: default_pod_base_url(),
        }
    }
}

fn default_resolver_mode() -> String {
    "d1".into()
}
fn default_pod_base_url() -> String {
    "https://pods.dreamlab-ai.com".into()
}

/// `[export]` — `/api/exports/*` operator opt-in.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    /// Master switch for the JSS Phase 1 export surface.
    #[serde(default)]
    pub enabled: bool,
    /// Default for whether `/private/*` is included when the caller does not
    /// supply an explicit query parameter. Owner WAC is always required for
    /// private inclusion regardless of this default.
    #[serde(default)]
    pub include_private_default: bool,
    /// Per-IP rate limit (requests per minute) for the export surface.
    #[serde(default = "default_export_rate_limit")]
    pub rate_limit_per_min: u32,
}

impl Default for ExportConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            include_private_default: false,
            rate_limit_per_min: default_export_rate_limit(),
        }
    }
}

fn default_export_rate_limit() -> u32 {
    6
}

/// `[git]` — git-versioned pods (JSS #471, solid-pod-rs alpha.12).
///
/// When `enabled`, the pod backend `git init`'s each pod at creation with the
/// configured `default_branch` and `receive.denyCurrentBranch=updateInstead`,
/// giving members a per-pod audit trail and easy backup. The DreamLab
/// Cloudflare deployment cannot honour `enabled = true` because CF Workers
/// cannot spawn subprocesses (see NRF ADR-089); the overlay therefore stays
/// disabled by default and flips on for non-CF backends (e.g. agentbox or a
/// self-hosted native solid-pod-rs deployment).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitConfig {
    /// Master switch. `false` on the CF deployment per NRF ADR-089.
    #[serde(default)]
    pub enabled: bool,
    /// Informational — automatically `git init` each new pod when
    /// [`enabled`](Self::enabled) is `true`.
    #[serde(default = "default_git_auto_init")]
    pub auto_init: bool,
    /// Default branch name for newly-initialised pod repositories.
    #[serde(default = "default_git_default_branch")]
    pub default_branch: String,
    /// Base URL surfaced to the forum-client for `git clone` instructions.
    /// Empty string disables the UI hint.
    #[serde(default)]
    pub clone_url_base: String,
}

impl Default for GitConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            auto_init: default_git_auto_init(),
            default_branch: default_git_default_branch(),
            clone_url_base: String::new(),
        }
    }
}

fn default_git_auto_init() -> bool {
    true
}
fn default_git_default_branch() -> String {
    "main".into()
}

/// Aggregate of the Phase 1 operator overlays.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Phase1Config {
    /// `[provision]` toggle block.
    #[serde(default)]
    pub provision: ProvisionConfig,
    /// `[nip05]` resolver mode block.
    #[serde(default)]
    pub nip05: Nip05Config,
    /// `[export]` opt-in block.
    #[serde(default)]
    pub export: ExportConfig,
    /// `[git]` git-versioned pods block (JSS #471; CF-disabled per NRF ADR-089).
    #[serde(default)]
    pub git: GitConfig,
}

/// Errors surfaced when loading the Phase 1 overlay.
#[derive(Debug, thiserror::Error)]
pub enum Phase1LoadError {
    /// A Phase 1 section was present but the inner shape did not deserialize.
    #[error("failed to deserialize Phase 1 section `{section}`: {source}")]
    Section {
        /// TOML section name (`provision`, `nip05`, `export`, or `git`).
        section: &'static str,
        /// Underlying serde error.
        #[source]
        source: toml::de::Error,
    },
}

impl Phase1Config {
    /// Pull the three Phase 1 sections out of an already-parsed `dreamlab.toml`.
    ///
    /// Missing sections fall back to per-struct `Default` values, which matches
    /// the documented opt-in semantics — operators must add a block (or set
    /// `enabled = true` inside one) to activate the feature.
    pub fn load_from_value(value: &toml::Value) -> Result<Self, Phase1LoadError> {
        Ok(Self {
            provision: extract_section(value, "provision")?,
            nip05: extract_section(value, "nip05")?,
            export: extract_section(value, "export")?,
            git: extract_section(value, "git")?,
        })
    }
}

fn extract_section<T>(value: &toml::Value, key: &'static str) -> Result<T, Phase1LoadError>
where
    T: for<'de> Deserialize<'de> + Default,
{
    match value.get(key) {
        Some(v) => T::deserialize(v.clone()).map_err(|source| Phase1LoadError::Section {
            section: key,
            source,
        }),
        None => Ok(T::default()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_are_conservative_opt_in() {
        let cfg = Phase1Config::default();
        assert!(!cfg.provision.enabled);
        assert!(cfg.provision.keys_at_signup);
        assert_eq!(cfg.provision.private_dir, "/private/");
        assert_eq!(cfg.provision.privkey_filename, "privkey.jsonld");
        assert_eq!(cfg.nip05.resolver_mode, "d1");
        assert_eq!(cfg.nip05.pod_base_url, "https://pods.dreamlab-ai.com");
        assert!(!cfg.export.enabled);
        assert!(!cfg.export.include_private_default);
        assert_eq!(cfg.export.rate_limit_per_min, 6);
        // [git] — disabled by default; auto_init pre-armed for non-CF flips.
        assert!(!cfg.git.enabled);
        assert!(cfg.git.auto_init);
        assert_eq!(cfg.git.default_branch, "main");
        assert_eq!(cfg.git.clone_url_base, "");
    }

    #[test]
    fn missing_sections_return_defaults() {
        let toml_str = r#"
            [deployment]
            name = "x"
            hostname = "https://x"
        "#;
        let v: toml::Value = toml::from_str(toml_str).unwrap();
        let cfg = Phase1Config::load_from_value(&v).unwrap();
        assert!(!cfg.provision.enabled);
        assert_eq!(cfg.nip05.resolver_mode, "d1");
        assert_eq!(cfg.export.rate_limit_per_min, 6);
        assert!(!cfg.git.enabled);
        assert!(cfg.git.auto_init);
    }

    #[test]
    fn parses_phase1_section_from_dreamlab_toml() {
        let toml_str = std::fs::read_to_string(
            concat!(env!("CARGO_MANIFEST_DIR"), "/dreamlab.toml"),
        )
        .expect("read dreamlab.toml");
        let v: toml::Value = toml::from_str(&toml_str).expect("parse dreamlab.toml");
        let cfg = Phase1Config::load_from_value(&v).expect("load phase1");

        // [provision] — live as of solid-pod-rs v0.4.0-alpha.11.
        assert!(cfg.provision.enabled);
        assert!(cfg.provision.keys_at_signup);
        assert_eq!(cfg.provision.private_dir, "/private/");
        assert_eq!(cfg.provision.privkey_filename, "privkey.jsonld");

        // [nip05] — federated as of NRF commit 1fe95fd (ADR-086 §9).
        assert_eq!(cfg.nip05.resolver_mode, "federated");
        assert_eq!(cfg.nip05.pod_base_url, "https://pods.dreamlab-ai.com");

        // [export] — live as of solid-pod-rs v0.4.0-alpha.11; budget 6/min/IP.
        assert!(cfg.export.enabled);
        assert!(!cfg.export.include_private_default);
        assert_eq!(cfg.export.rate_limit_per_min, 6);

        // [git] — disabled on CF deployment per NRF ADR-089 (Workers cannot
        // spawn subprocesses); auto_init pre-armed so non-CF operators only
        // need to flip `enabled = true`.
        assert!(!cfg.git.enabled, "CF deployment cannot honour git=true");
        assert!(cfg.git.auto_init);
        assert_eq!(cfg.git.default_branch, "main");
        assert_eq!(cfg.git.clone_url_base, "https://pods.dreamlab-ai.com");
    }

    #[test]
    fn dreamlab_defaults_are_phase1_live() {
        // Pins the operator's intent post-2026-05-16 default flip. If a
        // future revert lands, this test catches it before the config
        // ships to production.
        let toml_str = std::fs::read_to_string(
            concat!(env!("CARGO_MANIFEST_DIR"), "/dreamlab.toml"),
        )
        .expect("read dreamlab.toml");
        let v: toml::Value = toml::from_str(&toml_str).expect("parse dreamlab.toml");
        let cfg = Phase1Config::load_from_value(&v).expect("load phase1");

        // All three Phase 1 features live: solid-pod-rs v0.4.0-alpha.11
        // (provision + export) and nostr-rust-forum commit 1fe95fd
        // (auth-worker resolve() D1→pod-HTTP fallback, ADR-086 §9).
        assert!(cfg.provision.enabled, "provision must be enabled");
        assert!(cfg.export.enabled, "export must be enabled");
        assert_eq!(cfg.nip05.resolver_mode, "federated");
    }

    #[test]
    fn git_block_parses_with_expected_defaults() {
        // Operator overlay convention: the [git] block is present but
        // disabled on the DreamLab CF deployment (NRF ADR-089), with
        // auto_init = true so a non-CF operator only flips `enabled`.
        let toml_str = r#"
            [git]
            enabled        = false
            auto_init      = true
            default_branch = "main"
            clone_url_base = "https://pods.dreamlab-ai.com"
        "#;
        let v: toml::Value = toml::from_str(toml_str).unwrap();
        let cfg = Phase1Config::load_from_value(&v).unwrap();
        assert!(!cfg.git.enabled);
        assert!(cfg.git.auto_init);
        assert_eq!(cfg.git.default_branch, "main");
        assert_eq!(cfg.git.clone_url_base, "https://pods.dreamlab-ai.com");
    }

    #[test]
    fn federated_mode_round_trips() {
        let toml_str = r#"
            [nip05]
            resolver_mode = "federated"
            pod_base_url = "https://example.test"
        "#;
        let v: toml::Value = toml::from_str(toml_str).unwrap();
        let cfg = Phase1Config::load_from_value(&v).unwrap();
        assert_eq!(cfg.nip05.resolver_mode, "federated");
        assert_eq!(cfg.nip05.pod_base_url, "https://example.test");
    }
}
