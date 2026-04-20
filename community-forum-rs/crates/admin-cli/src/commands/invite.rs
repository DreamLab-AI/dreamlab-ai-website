//! `forum-admin invite …` — invite-credit lifecycle (WI-4).

use clap::Subcommand;
use serde_json::{json, Map, Value};

use crate::auth::KeySource;
use crate::client::ForumAdminClient;
use crate::commands::CommandDispatch;
use crate::config::GlobalFlags;
use crate::output;

#[derive(Debug, Subcommand)]
pub enum InviteCmd {
    /// Mint a new single-use (or N-use) invite.
    Create {
        /// Lifetime in hours (server default = 168).
        #[arg(long)]
        expiry: Option<u64>,
        /// Maximum redemptions before the invite burns (default = 1).
        #[arg(long)]
        max_uses: Option<u32>,
        #[command(flatten)]
        key: KeySource,
    },
    /// List invites minted by the authenticated admin.
    List {
        #[command(flatten)]
        key: KeySource,
    },
    /// Revoke a live invite by id.
    Revoke {
        /// Invite id (nanoid — printed by `invite create`).
        id: String,
        #[command(flatten)]
        key: KeySource,
    },
}

#[async_trait::async_trait]
impl CommandDispatch for InviteCmd {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            InviteCmd::Create {
                expiry,
                max_uses,
                key,
            } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let mut body = Map::new();
                if let Some(e) = expiry {
                    body.insert("expiry_hours".into(), json!(e));
                }
                if let Some(m) = max_uses {
                    body.insert("max_uses".into(), json!(m));
                }
                // TODO(backend-lead): WI-4 — POST /api/invites/create
                let value = client
                    .post("/api/invites/create", &Value::Object(body))
                    .await?;
                output::emit_success(flags, &value);
            }
            InviteCmd::List { key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                // TODO(backend-lead): WI-4 — GET /api/invites/mine
                let value = client.get("/api/invites/mine").await?;
                output::emit_success(flags, &value);
            }
            InviteCmd::Revoke { id, key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let path = format!("/api/invites/{id}/revoke");
                // TODO(backend-lead): WI-4 — POST /api/invites/:id/revoke
                let value = client.post_empty(&path).await?;
                output::emit_success(flags, &value);
            }
        }
        Ok(())
    }
}
