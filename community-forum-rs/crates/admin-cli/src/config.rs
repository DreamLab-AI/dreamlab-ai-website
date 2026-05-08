//! Global CLI configuration — base URL, output format, dry-run flag.

use clap::Args;

/// Default base URL for the hosted DreamLab forum instance.
pub const DEFAULT_BASE_URL: &str = "https://forum.dreamlab-ai.com";

/// Global flags that apply to every subcommand.
#[derive(Debug, Args, Clone)]
pub struct GlobalFlags {
    /// Override the forum base URL (e.g. `http://127.0.0.1:8787` for local dev).
    #[arg(
        long,
        global = true,
        env = "FORUM_ADMIN_BASE_URL",
        default_value = DEFAULT_BASE_URL,
    )]
    pub base_url: String,

    /// Emit machine-readable JSON on stdout. Errors still go to stderr as JSON.
    #[arg(long, global = true)]
    pub json: bool,

    /// Print the request that would be sent without actually sending it.
    /// Applies to every write-bearing command.
    #[arg(long, global = true)]
    pub dry_run: bool,

    /// Enable debug-level tracing to stderr.
    #[arg(long, global = true, short = 'v')]
    pub verbose: bool,
}

impl GlobalFlags {
    /// Return the configured base URL with trailing slash stripped.
    pub fn base_url(&self) -> &str {
        self.base_url.trim_end_matches('/')
    }
}
