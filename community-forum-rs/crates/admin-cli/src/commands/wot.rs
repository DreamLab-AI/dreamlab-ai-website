//! `forum-admin wot …` — Web-of-Trust operations (WI-3).

use clap::Subcommand;
use serde_json::json;

use crate::auth::{normalize_pubkey, KeySource};
use crate::client::ForumAdminClient;
use crate::commands::CommandDispatch;
use crate::config::GlobalFlags;
use crate::output;

#[derive(Debug, Subcommand)]
pub enum WotCmd {
    /// Set the referente pubkey. Refresh is NOT triggered automatically.
    SetReferente {
        /// Pubkey in hex or npub1… form.
        pubkey: String,
        #[command(flatten)]
        key: KeySource,
    },
    /// Refresh the follow-graph from the referente's kind-3 event.
    Refresh {
        #[command(flatten)]
        key: KeySource,
    },
}

#[async_trait::async_trait]
impl CommandDispatch for WotCmd {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            WotCmd::SetReferente { pubkey, key } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = json!({ "pubkey": pk });
                // TODO(backend-lead): WI-3 — POST /api/wot/set-referente
                let value = client.post("/api/wot/set-referente", &body).await?;
                output::emit_success(flags, &value);
            }
            WotCmd::Refresh { key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                // TODO(backend-lead): WI-3 — POST /api/wot/refresh
                let value = client.post_empty("/api/wot/refresh").await?;
                output::emit_success(flags, &value);
            }
        }
        Ok(())
    }
}
