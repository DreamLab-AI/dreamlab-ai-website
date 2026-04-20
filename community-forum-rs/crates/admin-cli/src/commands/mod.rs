//! Command definitions and dispatch.

use clap::{Parser, Subcommand};

use crate::auth::KeySource;
use crate::client::ForumAdminClient;
use crate::config::GlobalFlags;
use crate::output;

pub mod channel;
pub mod invite;
pub mod mod_ops;
pub mod whitelist;
pub mod wot;

/// Top-level CLI entry point.
#[derive(Debug, Parser)]
#[command(
    name = "forum-admin",
    version,
    about = "Headless admin CLI for community-forum-rs (NIP-98 authed)",
    long_about = "Drives the same HTTP endpoints the forum UI uses. Authenticates \
every request with NIP-98 using an admin Nostr secret key provided via --nsec, \
--bunker, or the FORUM_ADMIN_NSEC environment variable."
)]
pub struct Cli {
    #[command(flatten)]
    pub global: GlobalFlags,

    #[command(subcommand)]
    pub command: Command,
}

#[derive(Debug, Subcommand)]
pub enum Command {
    /// Verify key material by signing a trivial request against /api/whoami.
    Login {
        #[command(flatten)]
        key: KeySource,
    },

    /// Manage the instance whitelist (manual overrides).
    #[command(subcommand)]
    Whitelist(whitelist::WhitelistCmd),

    /// Web-of-Trust configuration.
    #[command(subcommand)]
    Wot(wot::WotCmd),

    /// Invite-code operations.
    #[command(subcommand)]
    Invite(invite::InviteCmd),

    /// Moderation — ban, mute, warn, review reports.
    #[command(subcommand)]
    Mod(mod_ops::ModCmd),

    /// Channels — listing, creation.
    #[command(subcommand)]
    Channel(channel::ChannelCmd),
}

/// Every subcommand resolves its own key source and produces an
/// `anyhow::Result`. The main loop converts that into an exit code.
#[async_trait::async_trait]
pub trait CommandDispatch {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()>;
}

#[async_trait::async_trait]
impl CommandDispatch for Command {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            Command::Login { key } => {
                let signer = key.resolve()?;
                let client = ForumAdminClient::new(flags, signer)?;
                let value = client.get("/api/whoami").await?;
                output::emit_success(flags, &value);
                Ok(())
            }
            Command::Whitelist(cmd) => cmd.dispatch(flags).await,
            Command::Wot(cmd) => cmd.dispatch(flags).await,
            Command::Invite(cmd) => cmd.dispatch(flags).await,
            Command::Mod(cmd) => cmd.dispatch(flags).await,
            Command::Channel(cmd) => cmd.dispatch(flags).await,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(argv: &[&str]) -> Result<Cli, clap::Error> {
        let mut full = vec!["forum-admin"];
        full.extend_from_slice(argv);
        Cli::try_parse_from(full)
    }

    #[test]
    fn parses_whitelist_add() {
        let cli = parse(&[
            "whitelist",
            "add",
            &"a".repeat(64),
            "--nsec",
            &"1".repeat(64),
        ])
        .expect("parse");
        match cli.command {
            Command::Whitelist(whitelist::WhitelistCmd::Add { pubkey, key }) => {
                assert_eq!(pubkey, "a".repeat(64));
                assert!(key.nsec.is_some());
            }
            _ => panic!("wrong subcommand"),
        }
    }

    #[test]
    fn parses_invite_create_with_flags() {
        let cli = parse(&[
            "invite", "create", "--expiry", "72", "--max-uses", "3", "--env",
        ])
        .expect("parse");
        match cli.command {
            Command::Invite(invite::InviteCmd::Create {
                expiry,
                max_uses,
                key,
            }) => {
                assert_eq!(expiry, Some(72));
                assert_eq!(max_uses, Some(3));
                assert!(key.env_key);
            }
            _ => panic!("wrong subcommand"),
        }
    }

    #[test]
    fn mod_mute_requires_hours() {
        let err = parse(&[
            "mod",
            "mute",
            &"c".repeat(64),
            "--nsec",
            &"1".repeat(64),
        ])
        .unwrap_err();
        assert!(err.to_string().to_lowercase().contains("--hours"));
    }

    #[test]
    fn global_flags_passthrough() {
        let cli = parse(&[
            "--base-url",
            "http://localhost:8787",
            "--json",
            "--dry-run",
            "channel",
            "list",
            "--nsec",
            &"1".repeat(64),
        ])
        .expect("parse");
        assert_eq!(cli.global.base_url, "http://localhost:8787");
        assert!(cli.global.json);
        assert!(cli.global.dry_run);
    }

    #[test]
    fn conflicting_key_sources_rejected() {
        let err = parse(&[
            "whitelist",
            "list",
            "--nsec",
            &"1".repeat(64),
            "--bunker",
            "bunker://abc",
        ])
        .unwrap_err();
        let msg = err.to_string().to_lowercase();
        assert!(
            msg.contains("cannot be used with") || msg.contains("conflicts"),
            "unexpected error: {msg}"
        );
    }

    #[test]
    fn mod_warn_requires_reason() {
        let err = parse(&[
            "mod",
            "warn",
            &"d".repeat(64),
            "--nsec",
            &"1".repeat(64),
        ])
        .unwrap_err();
        assert!(err.to_string().to_lowercase().contains("--reason"));
    }
}
