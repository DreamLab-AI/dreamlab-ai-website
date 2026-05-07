//! `forum-admin whitelist …` — list, add, remove WoT/manual whitelist entries.

use clap::Subcommand;
use serde_json::json;

use crate::auth::{normalize_pubkey, KeySource};
use crate::client::ForumAdminClient;
use crate::commands::CommandDispatch;
use crate::config::GlobalFlags;
use crate::output;

#[derive(Debug, Subcommand)]
pub enum WhitelistCmd {
    /// List all current whitelist entries.
    List {
        #[command(flatten)]
        key: KeySource,
    },
    /// Add a pubkey to the manual-override whitelist.
    Add {
        /// Pubkey in hex or npub1… form.
        pubkey: String,
        #[command(flatten)]
        key: KeySource,
    },
    /// Remove a pubkey from the manual-override whitelist.
    Remove {
        /// Pubkey in hex or npub1… form.
        pubkey: String,
        #[command(flatten)]
        key: KeySource,
    },
}

#[async_trait::async_trait]
impl CommandDispatch for WhitelistCmd {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            WhitelistCmd::List { key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                // TODO(backend-lead): endpoint being added in WI-3.
                let value = client.get("/api/wot/overrides").await?;
                output::emit_success(flags, &value);
            }
            WhitelistCmd::Add { pubkey, key } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = json!({ "pubkey": pk });
                // TODO(backend-lead): endpoint being added in WI-3.
                let value = client.post("/api/wot/override/add", &body).await?;
                output::emit_success(flags, &value);
            }
            WhitelistCmd::Remove { pubkey, key } => {
                let pk = normalize_pubkey(&pubkey)?;
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let body = json!({ "pubkey": pk });
                // TODO(backend-lead): endpoint being added in WI-3.
                let value = client.post("/api/wot/override/remove", &body).await?;
                output::emit_success(flags, &value);
            }
        }
        Ok(())
    }
}
