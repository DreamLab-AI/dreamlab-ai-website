//! `forum-admin mod …` — moderation actions (WI-2).
//!
//! Named `mod_ops` to avoid clashing with the `mod` keyword.

use clap::Subcommand;
use serde_json::{json, Value};

use crate::auth::{normalize_pubkey, KeySource};
use crate::client::ForumAdminClient;
use crate::commands::CommandDispatch;
use crate::config::GlobalFlags;
use crate::output;

#[derive(Debug, Subcommand)]
pub enum ModCmd {
    /// Permanently ban a pubkey from the instance.
    Ban {
        /// Pubkey in hex or npub1… form.
        pubkey: String,
        /// Reason recorded on the moderation log and Nostr event.
        #[arg(long)]
        reason: Option<String>,
        #[command(flatten)]
        key: KeySource,
    },
    /// Temporarily mute a pubkey for N hours.
    Mute {
        pubkey: String,
        /// Mute duration in hours.
        #[arg(long)]
        hours: u32,
        #[arg(long)]
        reason: Option<String>,
        #[command(flatten)]
        key: KeySource,
    },
    /// Issue a formal warning to a pubkey (visible to the target).
    Warn {
        pubkey: String,
        #[arg(long)]
        reason: String,
        #[command(flatten)]
        key: KeySource,
    },
    /// List open moderation reports.
    ReportList {
        /// Status filter (open|actioned|dismissed).
        #[arg(long, default_value = "open")]
        status: String,
        #[command(flatten)]
        key: KeySource,
    },
}

#[async_trait::async_trait]
impl CommandDispatch for ModCmd {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            ModCmd::Ban {
                pubkey,
                reason,
                key,
            } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = build_mod_body(&pk, reason.as_deref(), None);
                // TODO(backend-lead): WI-2 — POST /api/mod/ban
                let value = client.post("/api/mod/ban", &body).await?;
                output::emit_success(flags, &value);
            }
            ModCmd::Mute {
                pubkey,
                hours,
                reason,
                key,
            } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = build_mod_body(&pk, reason.as_deref(), Some(hours));
                // TODO(backend-lead): WI-2 — POST /api/mod/mute
                let value = client.post("/api/mod/mute", &body).await?;
                output::emit_success(flags, &value);
            }
            ModCmd::Warn {
                pubkey,
                reason,
                key,
            } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = build_mod_body(&pk, Some(&reason), None);
                // TODO(backend-lead): WI-2 — POST /api/mod/warn
                let value = client.post("/api/mod/warn", &body).await?;
                output::emit_success(flags, &value);
            }
            ModCmd::ReportList { status, key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let path = format!("/api/mod/reports?status={status}");
                // TODO(backend-lead): WI-2 — GET /api/mod/reports
                let value = client.get(&path).await?;
                output::emit_success(flags, &value);
            }
        }
        Ok(())
    }
}

fn build_mod_body(pubkey: &str, reason: Option<&str>, hours: Option<u32>) -> Value {
    let mut m = serde_json::Map::new();
    m.insert("target_pubkey".into(), json!(pubkey));
    if let Some(r) = reason {
        m.insert("reason".into(), json!(r));
    }
    if let Some(h) = hours {
        m.insert("hours".into(), json!(h));
    }
    Value::Object(m)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mod_body_ban_has_only_reason_no_hours() {
        let body = build_mod_body(&"a".repeat(64), Some("spam"), None);
        assert_eq!(body["target_pubkey"], "a".repeat(64));
        assert_eq!(body["reason"], "spam");
        assert!(body.get("hours").is_none());
    }

    #[test]
    fn mod_body_mute_carries_hours() {
        let body = build_mod_body(&"b".repeat(64), None, Some(24));
        assert_eq!(body["hours"], 24);
        assert!(body.get("reason").is_none());
    }
}
