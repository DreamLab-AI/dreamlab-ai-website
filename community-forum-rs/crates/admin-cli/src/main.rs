//! `forum-admin` — headless admin CLI for community-forum-rs.
//!
//! Authenticates every HTTP request with NIP-98 using an admin Nostr key
//! provided via `--nsec`, `FORUM_ADMIN_NSEC`, or a NIP-46 bunker URI.
//! Designed for AI coding agents — all commands accept `--json` for
//! machine-consumable output and set structured exit codes.

use std::process::ExitCode;

use clap::Parser;
use tracing::debug;
use tracing_subscriber::EnvFilter;

mod auth;
mod client;
mod commands;
mod config;
mod exit;
mod output;

use commands::{Cli, CommandDispatch};
use exit::ExitStatus;

#[tokio::main]
async fn main() -> ExitCode {
    let cli = Cli::parse();
    init_tracing(cli.global.verbose);
    debug!(?cli.global, "forum-admin starting");

    match cli.command.dispatch(&cli.global).await {
        Ok(()) => ExitCode::from(ExitStatus::Success as u8),
        Err(err) => {
            let status: ExitStatus = (&err).into();
            output::emit_error(&cli.global, &err);
            ExitCode::from(status as u8)
        }
    }
}

fn init_tracing(verbose: bool) {
    let default = if verbose { "debug" } else { "warn" };
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(default));
    // Errors on double-init are harmless — tests may call this repeatedly.
    let _ = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_writer(std::io::stderr)
        .try_init();
}
