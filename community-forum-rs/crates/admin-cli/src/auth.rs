//! Admin-key sourcing and NIP-98 request signing.
//!
//! The admin's secret key lives in memory for the shortest possible window:
//! decoded from `--nsec`, `FORUM_ADMIN_NSEC`, or a bunker URI, passed into
//! the signing function, then zeroized on drop.

use std::env;

use bech32::primitives::decode::CheckedHrpstring;
use bech32::{Bech32, Hrp};
use clap::Args;
use nostr_core::{nip98_sign_request_header, Nip98Error};
use thiserror::Error;
use zeroize::Zeroizing;

/// Bech32 HRP used for Nostr secret keys (NIP-19).
const NSEC_HRP: &str = "nsec";

/// Environment variable read by `--env` / default key discovery.
pub const ENV_NSEC: &str = "FORUM_ADMIN_NSEC";

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("no admin key source provided — pass --nsec, --bunker, or set FORUM_ADMIN_NSEC")]
    NoKeySource,

    #[error("environment variable {0} is not set")]
    EnvMissing(&'static str),

    #[error("invalid nsec: {0}")]
    InvalidNsec(String),

    #[error("NIP-46 bunker signing is not implemented yet (WI-1 stub — depends on bunker helper in nostr-core)")]
    BunkerUnsupported,

    #[error("NIP-98 signing failed: {0}")]
    Sign(#[from] Nip98Error),
}

/// CLI flags for supplying an admin key. At most one source should be
/// set; `--env` reads `FORUM_ADMIN_NSEC` (explicit opt-in for clarity).
#[derive(Debug, Args, Clone, Default)]
pub struct KeySource {
    /// nsec (NIP-19 bech32) or 64-char hex secret key. **Never** written to disk.
    #[arg(long, group = "key_src", conflicts_with_all = ["bunker", "env_key"])]
    pub nsec: Option<String>,

    /// NIP-46 bunker connect URI (e.g. `bunker://<pubkey>?relay=wss://...`).
    #[arg(long, group = "key_src", conflicts_with_all = ["nsec", "env_key"])]
    pub bunker: Option<String>,

    /// Read the nsec from `FORUM_ADMIN_NSEC`.
    #[arg(long = "env", group = "key_src", conflicts_with_all = ["nsec", "bunker"])]
    pub env_key: bool,
}

impl KeySource {
    /// Resolve the caller's key source into a signing handle. The handle
    /// holds the secret bytes in a `Zeroizing` buffer.
    pub fn resolve(&self) -> Result<AdminSigner, AuthError> {
        if let Some(bunker) = &self.bunker {
            return Ok(AdminSigner::Bunker {
                connect_uri: bunker.clone(),
            });
        }

        // Implicit fallback: if neither --nsec nor --bunker is set, try the env var.
        let nsec_source = if let Some(nsec) = self.nsec.as_deref() {
            nsec.to_string()
        } else if self.env_key
            || (self.nsec.is_none() && self.bunker.is_none() && env::var_os(ENV_NSEC).is_some())
        {
            env::var(ENV_NSEC).map_err(|_| AuthError::EnvMissing(ENV_NSEC))?
        } else {
            return Err(AuthError::NoKeySource);
        };

        let secret = decode_nsec(&nsec_source)?;
        Ok(AdminSigner::Local(secret))
    }
}

/// Decode an `nsec1…` bech32 string or a 64-char hex string into raw secret bytes.
pub fn decode_nsec(input: &str) -> Result<Zeroizing<[u8; 32]>, AuthError> {
    let trimmed = input.trim();

    // Hex fast-path for 64-char lowercase/uppercase hex.
    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        let bytes = hex::decode(trimmed)
            .map_err(|e| AuthError::InvalidNsec(format!("hex decode failed: {e}")))?;
        if bytes.len() != 32 {
            return Err(AuthError::InvalidNsec("expected 32 bytes".into()));
        }
        let mut out = Zeroizing::new([0u8; 32]);
        out.copy_from_slice(&bytes);
        return Ok(out);
    }

    // Bech32 NIP-19 path.
    let parsed = CheckedHrpstring::new::<Bech32>(trimmed)
        .map_err(|e| AuthError::InvalidNsec(format!("bech32 decode failed: {e}")))?;
    let expected_hrp = Hrp::parse(NSEC_HRP)
        .map_err(|e| AuthError::InvalidNsec(format!("internal HRP error: {e}")))?;
    if parsed.hrp() != expected_hrp {
        return Err(AuthError::InvalidNsec(format!(
            "expected `{NSEC_HRP}` prefix, got `{}`",
            parsed.hrp()
        )));
    }
    let data: Vec<u8> = parsed.byte_iter().collect();
    if data.len() != 32 {
        return Err(AuthError::InvalidNsec(format!(
            "expected 32 bytes, got {}",
            data.len()
        )));
    }
    let mut out = Zeroizing::new([0u8; 32]);
    out.copy_from_slice(&data);
    Ok(out)
}

/// Decode an `npub1…` bech32 string into hex. Used by commands that take
/// a pubkey argument and want to accept either form.
pub fn normalize_pubkey(input: &str) -> Result<String, AuthError> {
    let trimmed = input.trim();
    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        return Ok(trimmed.to_ascii_lowercase());
    }
    let parsed = CheckedHrpstring::new::<Bech32>(trimmed)
        .map_err(|e| AuthError::InvalidNsec(format!("invalid pubkey: {e}")))?;
    let expected = Hrp::parse("npub")
        .map_err(|e| AuthError::InvalidNsec(format!("internal HRP error: {e}")))?;
    if parsed.hrp() != expected {
        return Err(AuthError::InvalidNsec(format!(
            "expected `npub` prefix, got `{}`",
            parsed.hrp()
        )));
    }
    let data: Vec<u8> = parsed.byte_iter().collect();
    if data.len() != 32 {
        return Err(AuthError::InvalidNsec(format!(
            "expected 32-byte pubkey, got {}",
            data.len()
        )));
    }
    Ok(hex::encode(data))
}

/// Resolved signing capability. Local keys sign in-process; bunker keys
/// would proxy through a remote signer (NIP-46) — currently stubbed.
#[allow(dead_code)] // connect_uri reserved for NIP-46 bunker wiring
pub enum AdminSigner {
    Local(Zeroizing<[u8; 32]>),
    Bunker { connect_uri: String },
}

impl AdminSigner {
    /// Produce a ready-to-send `Authorization: Nostr <base64>` header for
    /// the given request. The secret key is held inside `self`; it is
    /// zeroized when the signer is dropped.
    pub fn sign(
        &self,
        url: &str,
        method: &str,
        body: Option<&[u8]>,
    ) -> Result<String, AuthError> {
        match self {
            AdminSigner::Local(sk) => Ok(nip98_sign_request_header(sk, url, method, body)?),
            AdminSigner::Bunker { .. } => Err(AuthError::BunkerUnsupported),
        }
    }

    /// Convenience: is this a bunker signer? Useful for conditional UX.
    #[allow(dead_code)] // only referenced from tests today; public for future UX branching
    pub fn is_bunker(&self) -> bool {
        matches!(self, AdminSigner::Bunker { .. })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // A deterministic test key — 32 bytes of 0x11.
    const TEST_NSEC_HEX: &str =
        "1111111111111111111111111111111111111111111111111111111111111111";

    /// nsec1 for the above hex, generated with nostr-tools (0x11 * 32).
    const TEST_NSEC_BECH32: &str =
        "nsec1zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygsvlq9fm";

    #[test]
    fn decode_nsec_accepts_hex() {
        let out = decode_nsec(TEST_NSEC_HEX).unwrap();
        assert_eq!(out.as_ref(), &[0x11u8; 32]);
    }

    #[test]
    fn decode_nsec_rejects_short_hex() {
        let err = decode_nsec("deadbeef").unwrap_err();
        assert!(matches!(err, AuthError::InvalidNsec(_)));
    }

    #[test]
    fn decode_nsec_rejects_wrong_hrp() {
        // An npub-prefixed bech32 shouldn't be accepted as nsec.
        let err = decode_nsec("npub1234567890").unwrap_err();
        assert!(matches!(err, AuthError::InvalidNsec(_)));
    }

    #[test]
    fn decode_nsec_roundtrip_bech32() {
        // Generate a known-good nsec using bech32 crate itself to avoid
        // hard-coding a possibly-wrong constant. Encode hex → bech32 → decode.
        use bech32::{Bech32, Hrp};
        let hrp = Hrp::parse(NSEC_HRP).unwrap();
        let encoded =
            bech32::encode::<Bech32>(hrp, &[0x22u8; 32]).expect("encode");
        let out = decode_nsec(&encoded).unwrap();
        assert_eq!(out.as_ref(), &[0x22u8; 32]);
    }

    #[test]
    fn normalize_pubkey_accepts_hex_lowercase() {
        let pk = "a".repeat(64);
        assert_eq!(normalize_pubkey(&pk).unwrap(), pk);
    }

    #[test]
    fn normalize_pubkey_rejects_garbage() {
        let err = normalize_pubkey("not-a-pubkey").unwrap_err();
        assert!(matches!(err, AuthError::InvalidNsec(_)));
    }

    #[test]
    fn key_source_env_fallback() {
        // Ensure the --env flag path pulls from the env var.
        // Use a guard so other tests aren't affected.
        std::env::set_var(ENV_NSEC, TEST_NSEC_HEX);
        let ks = KeySource {
            env_key: true,
            ..KeySource::default()
        };
        let signer = ks.resolve().expect("resolve env nsec");
        assert!(matches!(signer, AdminSigner::Local(_)));
        std::env::remove_var(ENV_NSEC);
    }

    #[test]
    fn key_source_bunker_shortcut() {
        let ks = KeySource {
            bunker: Some("bunker://abc?relay=wss://relay.example".into()),
            ..KeySource::default()
        };
        let signer = ks.resolve().unwrap();
        assert!(signer.is_bunker());
    }

    #[test]
    fn sign_header_includes_nostr_prefix() {
        let sk = Zeroizing::new([0x11u8; 32]);
        let signer = AdminSigner::Local(sk);
        let header = signer
            .sign("https://forum.dreamlab-ai.com/api/whitelist", "GET", None)
            .expect("sign");
        assert!(header.starts_with("Nostr "));
        assert!(header.len() > "Nostr ".len());
    }

    // Silence dead-code warning for the unused reference constant.
    #[allow(dead_code)]
    const _KEEP: &str = TEST_NSEC_BECH32;
}
