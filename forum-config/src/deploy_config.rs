//! Fail-fast validation of the operator deploy configuration.
//!
//! # Why this exists
//!
//! Two classes of deploy-time misconfiguration previously failed **at request
//! time** (a 500 in production) instead of **at deploy time**:
//!
//! 1. **Unresolved KV namespace placeholders.** `deploy/auth-worker.wrangler.toml`
//!    and `deploy/pod-worker.wrangler.toml` ship the `ADMIN_KV` binding with
//!    `id = "REPLACE_WITH_NEW_ADMIN_KV_ID"`. The operator must run
//!    `wrangler kv:namespace create dreamlab-admin-kv` and paste the real id.
//!    If left unresolved, admin-flag writes silently 500.
//!
//! 2. **Missing server-side secrets.** The kit auth-worker derives the WebAuthn
//!    PRF salt from a server-held secret ([`REQUIRED_AUTH_SECRETS`]). If that
//!    secret was never `wrangler secret put`, registration/login 500s on the
//!    first request rather than refusing to deploy.
//!
//! A third class surfaced after the v2 cutover (audit 2026-11-26 C-6): a
//! placeholder that is NOT `REPLACE_WITH_*` (e.g. `<SEARCH_CONFIG_V2_KV_ID>`)
//! passed the check, and `database_id` was never inspected at all. Binding ids
//! are therefore also format-checked: a KV `id` must be 32 lower-case hex
//! characters and a D1 `database_id` a lower-case UUID.
//!
//! This module turns all three into a **fail-closed, init-time** check. The real KV
//! namespace id and the secret values are *operator data* — this code never
//! generates or guesses them; it only verifies they were supplied and rejects
//! the known placeholder sentinels.
//!
//! The CI test [`tests`] runs [`validate_deploy_dir`] against the checked-in
//! `deploy/` manifests, so a placeholder that escaped review fails the build.
//! Deploy pipelines should additionally call [`validate_required_secrets`] with
//! the secret names the operator has actually set (e.g. from
//! `wrangler secret list`) before invoking `wrangler deploy`.

use std::collections::BTreeSet;
use std::path::Path;

/// The placeholder sentinel that must never survive into a real deploy.
///
/// Any binding `id` equal to this (or any value matching the broader
/// `REPLACE_WITH_*` shape) is treated as unresolved.
pub const KV_PLACEHOLDER: &str = "REPLACE_WITH_NEW_ADMIN_KV_ID";

/// Prefix shared by every placeholder sentinel in the wrangler manifests.
pub const PLACEHOLDER_PREFIX: &str = "REPLACE_WITH_";

/// Wrangler manifests that carry resource bindings requiring a real id.
pub const REQUIRED_WRANGLER_MANIFESTS: &[&str] = &[
    "auth-worker.wrangler.toml",
    "pod-worker.wrangler.toml",
    "preview-worker.wrangler.toml",
    "relay-worker.wrangler.toml",
    "search-worker.wrangler.toml",
];

/// Server-side secrets the auth-worker requires before it can serve a request.
///
/// These are **operator-provided** via `wrangler secret put` (or the
/// `set-worker-secrets.yml` workflow). They are intentionally NOT in
/// `[vars]`/`wrangler.toml` because they are secrets, and NOT generated here
/// because their values are operator identity material.
///
/// - `PRF_SERVER_SECRET` — server-side salt mixed into the WebAuthn PRF →
///   HKDF derivation. Absent ⇒ the auth-worker 500s on register/login.
/// - `ADMIN_PUBKEYS` — comma-separated admin hex pubkeys for governance auth.
///   Also the static admin bootstrap set (mirrors `dreamlab.toml [admin]
///   static_pubkeys`); absent ⇒ a fresh deploy with empty D1 has zero admins.
/// - `NATIVE_POD_ADMIN_KEY` — PSK (`X-Pod-Admin-Key`) the auth-worker sends to
///   the native solid-pod-rs server when provisioning a native pod (must match
///   the agentbox `SOLID_ADMIN_KEY`). Absent ⇒ `/api/native-pod/provision`
///   503s "native pod not configured".
/// - `NATIVE_POD_URL` — base URL the auth-worker posts the provision request to
///   (`POST {NATIVE_POD_URL}/_admin/provision/{pubkey}`). It is a **secret**, not
///   a `[vars]` plaintext binding: a same-named `[vars]` and secret conflict, so
///   `wrangler deploy` would re-assert the plaintext var and clobber the secret
///   every deploy. Gated here so a fresh deploy without it fails fast instead of
///   503-ing the native pod path at request time.
pub const REQUIRED_AUTH_SECRETS: &[&str] = &[
    "PRF_SERVER_SECRET",
    "ADMIN_PUBKEYS",
    "NATIVE_POD_ADMIN_KEY",
    "NATIVE_POD_URL",
];

/// A single deploy-config defect, located precisely enough for an operator to fix.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeployConfigError {
    /// A wrangler binding still holds a `REPLACE_WITH_*` placeholder id.
    UnresolvedPlaceholder {
        /// Manifest file name (e.g. `auth-worker.wrangler.toml`).
        manifest: String,
        /// Binding name the placeholder is attached to (e.g. `ADMIN_KV`).
        binding: String,
        /// The placeholder value found.
        value: String,
    },
    /// A KV `id` or D1 `database_id` is absent or not in Cloudflare's id format.
    MalformedId {
        /// Manifest file name.
        manifest: String,
        /// Binding name the id belongs to.
        binding: String,
        /// The field checked: `id` (KV namespace) or `database_id` (D1).
        field: String,
        /// The offending value (empty when the field is absent).
        value: String,
    },
    /// A required operator-provided secret was not supplied.
    MissingSecret {
        /// The secret name that must be `wrangler secret put`.
        name: String,
    },
    /// A required manifest file was absent from the deploy directory.
    MissingManifest {
        /// The expected file name.
        manifest: String,
    },
    /// A manifest could not be read or parsed.
    Unreadable {
        /// The file that failed.
        manifest: String,
        /// Human-readable cause.
        reason: String,
    },
}

impl std::fmt::Display for DeployConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeployConfigError::UnresolvedPlaceholder { manifest, binding, value } => write!(
                f,
                "deploy config: {manifest} binding `{binding}` still has placeholder id `{value}`. \
                 Provision the real namespace (e.g. `wrangler kv:namespace create dreamlab-admin-kv`) \
                 and paste the returned id. This value is operator data — it is not generated here."
            ),
            DeployConfigError::MalformedId { manifest, binding, field, value } => write!(
                f,
                "deploy config: {manifest} binding `{binding}` has malformed `{field}` `{value}` \
                 (expected {}). Paste the real id from the Cloudflare dashboard or `wrangler` output.",
                if field == "id" { "32 lower-case hex characters" } else { "a lower-case UUID" }
            ),
            DeployConfigError::MissingSecret { name } => write!(
                f,
                "deploy config: required secret `{name}` was not supplied. Set it with \
                 `wrangler secret put {name} --name dreamlab-auth-api-v2` (or via set-worker-secrets.yml) \
                 before deploying. This value is operator data — it is not generated here."
            ),
            DeployConfigError::MissingManifest { manifest } => {
                write!(f, "deploy config: required wrangler manifest `{manifest}` is missing")
            }
            DeployConfigError::Unreadable { manifest, reason } => {
                write!(f, "deploy config: could not read `{manifest}`: {reason}")
            }
        }
    }
}

impl std::error::Error for DeployConfigError {}

/// Scan a parsed wrangler manifest for unresolved or malformed binding ids.
///
/// Returns one error per offending binding:
/// - [`DeployConfigError::UnresolvedPlaceholder`] for any `id` set to a
///   `REPLACE_WITH_*` sentinel (in any binding array), and for a `<...>`
///   placeholder in a KV `id` or D1 `database_id`;
/// - [`DeployConfigError::MalformedId`] for a `kv_namespaces` entry whose `id`
///   is absent or not 32 lower-case hex, or a `d1_databases` entry whose
///   `database_id` is absent or not a lower-case UUID.
///
/// The format checks apply only inside `kv_namespaces` / `d1_databases` (at any
/// depth, so `[env.*]` overrides are covered); an `id` in another table is not a
/// Cloudflare resource id and is left alone.
pub fn scan_manifest_value(manifest: &str, value: &toml::Value) -> Vec<DeployConfigError> {
    let mut errors = Vec::new();
    collect_placeholder_ids(manifest, value, None, &mut errors);
    collect_malformed_ids(manifest, value, &mut errors);
    errors
}

/// `true` for a Cloudflare KV namespace id: exactly 32 lower-case hex characters.
pub fn is_kv_namespace_id(id: &str) -> bool {
    id.len() == 32
        && id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// `true` for a Cloudflare D1 database id: a lower-case 8-4-4-4-12 hex UUID.
pub fn is_d1_database_id(id: &str) -> bool {
    let groups: Vec<&str> = id.split('-').collect();
    groups.len() == 5
        && groups.iter().zip([8usize, 4, 4, 4, 12]).all(|(g, n)| {
            g.len() == n
                && g.bytes()
                    .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        })
}

fn is_placeholder(value: &str) -> bool {
    value.starts_with(PLACEHOLDER_PREFIX) || (value.starts_with('<') && value.ends_with('>'))
}

fn collect_malformed_ids(manifest: &str, value: &toml::Value, out: &mut Vec<DeployConfigError>) {
    match value {
        toml::Value::Table(table) => {
            for (key, field, valid) in [
                (
                    "kv_namespaces",
                    "id",
                    is_kv_namespace_id as fn(&str) -> bool,
                ),
                ("d1_databases", "database_id", is_d1_database_id),
            ] {
                let Some(toml::Value::Array(entries)) = table.get(key) else {
                    continue;
                };
                for entry in entries {
                    let binding = entry
                        .get("binding")
                        .and_then(toml::Value::as_str)
                        .unwrap_or("<unknown>")
                        .to_string();
                    let id = entry.get(field).and_then(toml::Value::as_str).unwrap_or("");
                    if id.starts_with(PLACEHOLDER_PREFIX) && field == "id" {
                        // Already reported by collect_placeholder_ids.
                        continue;
                    }
                    if is_placeholder(id) {
                        out.push(DeployConfigError::UnresolvedPlaceholder {
                            manifest: manifest.to_string(),
                            binding,
                            value: id.to_string(),
                        });
                    } else if !valid(id) {
                        out.push(DeployConfigError::MalformedId {
                            manifest: manifest.to_string(),
                            binding,
                            field: field.to_string(),
                            value: id.to_string(),
                        });
                    }
                }
            }
            for v in table.values() {
                collect_malformed_ids(manifest, v, out);
            }
        }
        toml::Value::Array(items) => {
            for v in items {
                collect_malformed_ids(manifest, v, out);
            }
        }
        _ => {}
    }
}

fn collect_placeholder_ids(
    manifest: &str,
    value: &toml::Value,
    binding_hint: Option<&str>,
    out: &mut Vec<DeployConfigError>,
) {
    match value {
        toml::Value::Table(table) => {
            // A binding table typically carries both `binding` and `id`.
            let binding = table
                .get("binding")
                .and_then(toml::Value::as_str)
                .or(binding_hint);
            if let Some(toml::Value::String(id)) = table.get("id") {
                if id.starts_with(PLACEHOLDER_PREFIX) {
                    out.push(DeployConfigError::UnresolvedPlaceholder {
                        manifest: manifest.to_string(),
                        binding: binding.unwrap_or("<unknown>").to_string(),
                        value: id.clone(),
                    });
                }
            }
            for v in table.values() {
                collect_placeholder_ids(manifest, v, binding, out);
            }
        }
        toml::Value::Array(items) => {
            for v in items {
                collect_placeholder_ids(manifest, v, binding_hint, out);
            }
        }
        _ => {}
    }
}

/// Validate every required wrangler manifest under `deploy_dir`, failing fast
/// on missing files, parse errors, unresolved placeholders and malformed
/// KV / D1 ids (see [`scan_manifest_value`]).
///
/// This is the deploy-time gate: call it before `wrangler deploy`. The CI test
/// runs it against the checked-in `deploy/` directory so an unresolved
/// placeholder cannot merge unnoticed.
pub fn validate_deploy_dir(deploy_dir: &Path) -> Result<(), Vec<DeployConfigError>> {
    let mut errors = Vec::new();
    for manifest in REQUIRED_WRANGLER_MANIFESTS {
        let path = deploy_dir.join(manifest);
        match std::fs::read_to_string(&path) {
            Ok(contents) => match contents.parse::<toml::Value>() {
                Ok(value) => errors.extend(scan_manifest_value(manifest, &value)),
                Err(e) => errors.push(DeployConfigError::Unreadable {
                    manifest: (*manifest).to_string(),
                    reason: e.to_string(),
                }),
            },
            Err(e) => {
                // A genuinely missing manifest is distinct from an unreadable one.
                if e.kind() == std::io::ErrorKind::NotFound {
                    errors.push(DeployConfigError::MissingManifest {
                        manifest: (*manifest).to_string(),
                    });
                } else {
                    errors.push(DeployConfigError::Unreadable {
                        manifest: (*manifest).to_string(),
                        reason: e.to_string(),
                    });
                }
            }
        }
    }
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Validate that every [`REQUIRED_AUTH_SECRETS`] entry is present in the set of
/// secrets the operator has actually configured.
///
/// `configured` is the set of secret names the operator supplied — e.g. parsed
/// from `wrangler secret list --name dreamlab-auth-api` in the deploy pipeline.
/// A secret whose value is a placeholder (`REPLACE_WITH_*`) is treated as unset.
pub fn validate_required_secrets<I, S>(configured: I) -> Result<(), Vec<DeployConfigError>>
where
    I: IntoIterator<Item = (S, S)>,
    S: AsRef<str>,
{
    let present: BTreeSet<String> = configured
        .into_iter()
        .filter(|(_, val)| {
            !val.as_ref().trim().is_empty() && !val.as_ref().starts_with(PLACEHOLDER_PREFIX)
        })
        .map(|(name, _)| name.as_ref().to_string())
        .collect();

    let missing: Vec<DeployConfigError> = REQUIRED_AUTH_SECRETS
        .iter()
        .filter(|name| !present.contains(**name))
        .map(|name| DeployConfigError::MissingSecret {
            name: (*name).to_string(),
        })
        .collect();

    if missing.is_empty() {
        Ok(())
    } else {
        Err(missing)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn deploy_dir() -> std::path::PathBuf {
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("deploy")
    }

    /// The v2 switch resolved every binding id except the search worker's SEARCH_CONFIG namespace:
    /// the v2 search worker is not provisioned (no worker, no `dreamlab-vectors-v2` bucket, no KV
    /// namespace, per the Cloudflare listing of 2026-11-26). Its manifest must therefore FAIL the
    /// validator, and nothing else may.
    #[test]
    fn validator_fails_closed_only_on_the_unprovisioned_search_worker() {
        let errors = validate_deploy_dir(&deploy_dir()).expect_err(
            "search-worker.wrangler.toml carries a placeholder KV id and must not validate",
        );
        assert_eq!(errors.len(), 1, "exactly one defect expected: {errors:?}");
        match &errors[0] {
            DeployConfigError::UnresolvedPlaceholder {
                manifest, binding, ..
            } => {
                assert_eq!(manifest, "search-worker.wrangler.toml");
                assert_eq!(binding, "SEARCH_CONFIG");
            }
            other => panic!("wrong error: {other:?}"),
        }
    }

    #[test]
    fn angle_bracket_placeholder_is_unresolved() {
        let v: toml::Value = r#"
            [[kv_namespaces]]
            binding = "SEARCH_CONFIG"
            id      = "<SEARCH_CONFIG_V2_KV_ID>"
        "#
        .parse()
        .unwrap();
        let errors = scan_manifest_value("test.toml", &v);
        assert_eq!(errors.len(), 1, "{errors:?}");
        assert!(matches!(
            &errors[0],
            DeployConfigError::UnresolvedPlaceholder { binding, .. } if binding == "SEARCH_CONFIG"
        ));
    }

    #[test]
    fn malformed_kv_id_is_rejected() {
        for bad in [
            "40fdb0ce2d814f77b3db9d7b922ff57",   // 31 chars
            "40fdb0ce2d814f77b3db9d7b922ff5799", // 33 chars
            "40FDB0CE2D814F77B3DB9D7B922FF579",  // upper case (Cloudflare ids are lower-case)
            "40fdb0ce-2d81-4f77-b3db-9d7b922ff579",
            "not-a-namespace-id",
            "",
        ] {
            let v: toml::Value = format!("[[kv_namespaces]]\nbinding = \"KV\"\nid = \"{bad}\"\n")
                .parse()
                .unwrap();
            let errors = scan_manifest_value("test.toml", &v);
            assert!(
                matches!(errors.as_slice(), [DeployConfigError::MalformedId { field, .. }] if field == "id"),
                "{bad:?} must be rejected as a malformed KV id: {errors:?}"
            );
        }
    }

    #[test]
    fn malformed_d1_database_id_is_rejected() {
        for bad in [
            "eb33cf2f44db433c97716db850d8b64c", // no hyphens
            "eb33cf2f-44db-433c-9771-6db850d8b64",
            "EB33CF2F-44DB-433C-9771-6DB850D8B64C",
            "<RELAY_DB_ID>",
            "",
        ] {
            let v: toml::Value = format!(
                "[[d1_databases]]\nbinding = \"DB\"\ndatabase_name = \"x\"\ndatabase_id = \"{bad}\"\n"
            )
            .parse()
            .unwrap();
            let errors = scan_manifest_value("test.toml", &v);
            assert_eq!(errors.len(), 1, "{bad:?} must be rejected: {errors:?}");
            match &errors[0] {
                DeployConfigError::MalformedId { field, binding, .. } => {
                    assert_eq!(field, "database_id");
                    assert_eq!(binding, "DB");
                }
                DeployConfigError::UnresolvedPlaceholder { binding, .. } => {
                    assert_eq!(binding, "DB")
                }
                other => panic!("wrong error: {other:?}"),
            }
        }
    }

    #[test]
    fn missing_binding_id_is_rejected() {
        let v: toml::Value = r#"
            [[kv_namespaces]]
            binding = "POD_META"

            [[d1_databases]]
            binding = "DB"
            database_name = "dreamlab-relay-v2"
        "#
        .parse()
        .unwrap();
        assert_eq!(scan_manifest_value("test.toml", &v).len(), 2);
    }

    #[test]
    fn well_formed_ids_pass_and_format_checks_stay_scoped() {
        let v: toml::Value = r#"
            [[kv_namespaces]]
            binding = "ADMIN_KV"
            id      = "36c5f8d2157b4b3e8ef53c47c7fb68f1"

            [[d1_databases]]
            binding = "DB"
            database_name = "dreamlab-relay-v2"
            database_id = "eb33cf2f-44db-433c-9771-6db850d8b64c"

            # An `id` outside kv_namespaces is not a KV id and is not format-checked.
            [[durable_objects.bindings]]
            name = "RELAY"
            class_name = "NostrRelayDO"
            id = "anything"
        "#
        .parse()
        .unwrap();
        assert!(scan_manifest_value("test.toml", &v).is_empty());
    }

    #[test]
    fn scan_flags_replace_with_placeholder() {
        let toml_str = r#"
            [[kv_namespaces]]
            binding = "ADMIN_KV"
            id      = "REPLACE_WITH_NEW_ADMIN_KV_ID"

            [[kv_namespaces]]
            binding = "SESSIONS"
            id      = "901345296c2848788066686aa67d5909"
        "#;
        let v: toml::Value = toml_str.parse().unwrap();
        let errors = scan_manifest_value("test.toml", &v);
        assert_eq!(errors.len(), 1);
        match &errors[0] {
            DeployConfigError::UnresolvedPlaceholder { binding, value, .. } => {
                assert_eq!(binding, "ADMIN_KV");
                assert_eq!(value, KV_PLACEHOLDER);
            }
            other => panic!("wrong error: {other:?}"),
        }
    }

    #[test]
    fn scan_passes_fully_resolved_manifest() {
        let toml_str = r#"
            [[kv_namespaces]]
            binding = "ADMIN_KV"
            id      = "a1b2c3d4e5f60718293a4b5c6d7e8f90"
        "#;
        let v: toml::Value = toml_str.parse().unwrap();
        assert!(scan_manifest_value("test.toml", &v).is_empty());
    }

    #[test]
    fn required_secrets_all_present_passes() {
        let configured = vec![
            ("PRF_SERVER_SECRET", "a-real-secret-value"),
            ("ADMIN_PUBKEYS", "6407eed8...,deadbeef..."),
            ("NATIVE_POD_ADMIN_KEY", "a-native-pod-psk"),
            ("NATIVE_POD_URL", "https://pods-native.dreamlab-ai.com"),
            ("RP_ID", "dreamlab-ai.com"),
        ];
        assert!(validate_required_secrets(configured).is_ok());
    }

    #[test]
    fn required_secret_missing_fails_fast() {
        // Only ADMIN_PUBKEYS supplied: PRF_SERVER_SECRET,
        // NATIVE_POD_ADMIN_KEY and NATIVE_POD_URL are all reported missing.
        let configured = vec![("ADMIN_PUBKEYS", "6407eed8...")];
        let errors = validate_required_secrets(configured).unwrap_err();
        let missing: Vec<&str> = errors
            .iter()
            .filter_map(|e| match e {
                DeployConfigError::MissingSecret { name } => Some(name.as_str()),
                _ => None,
            })
            .collect();
        assert!(missing.contains(&"PRF_SERVER_SECRET"));
        assert!(missing.contains(&"NATIVE_POD_ADMIN_KEY"));
        assert!(!missing.contains(&"ADMIN_PUBKEYS"));
    }

    #[test]
    fn placeholder_secret_value_counts_as_missing() {
        let configured = vec![
            ("PRF_SERVER_SECRET", "REPLACE_WITH_SECRET"),
            ("ADMIN_PUBKEYS", "6407eed8..."),
            ("NATIVE_POD_ADMIN_KEY", "a-native-pod-psk"),
            ("NATIVE_POD_URL", "https://pods-native.dreamlab-ai.com"),
        ];
        let errors = validate_required_secrets(configured).unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            DeployConfigError::MissingSecret {
                name: "PRF_SERVER_SECRET".to_string()
            }
        );
    }

    #[test]
    fn empty_secret_value_counts_as_missing() {
        let configured = vec![
            ("PRF_SERVER_SECRET", "   "),
            ("ADMIN_PUBKEYS", "x"),
            ("NATIVE_POD_ADMIN_KEY", "psk"),
            ("NATIVE_POD_URL", "https://pods-native.dreamlab-ai.com"),
        ];
        let errors = validate_required_secrets(configured).unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(
            errors[0],
            DeployConfigError::MissingSecret {
                name: "PRF_SERVER_SECRET".into()
            }
        );
    }

    #[test]
    fn native_pod_admin_key_is_required() {
        let configured = vec![
            ("PRF_SERVER_SECRET", "a-real-secret-value"),
            ("ADMIN_PUBKEYS", "6407eed8..."),
            ("NATIVE_POD_URL", "https://pods-native.dreamlab-ai.com"),
        ];
        let errors = validate_required_secrets(configured).unwrap_err();
        assert_eq!(
            errors,
            vec![DeployConfigError::MissingSecret {
                name: "NATIVE_POD_ADMIN_KEY".to_string()
            }]
        );
    }

    #[test]
    fn native_pod_url_is_required() {
        let configured = vec![
            ("PRF_SERVER_SECRET", "a-real-secret-value"),
            ("ADMIN_PUBKEYS", "6407eed8..."),
            ("NATIVE_POD_ADMIN_KEY", "a-native-pod-psk"),
        ];
        let errors = validate_required_secrets(configured).unwrap_err();
        assert_eq!(
            errors,
            vec![DeployConfigError::MissingSecret {
                name: "NATIVE_POD_URL".to_string()
            }]
        );
    }

    #[test]
    fn error_message_is_actionable() {
        let e = DeployConfigError::MissingSecret {
            name: "PRF_SERVER_SECRET".into(),
        };
        let msg = e.to_string();
        assert!(msg.contains("wrangler secret put"));
        assert!(msg.contains("operator data"));
    }
}
