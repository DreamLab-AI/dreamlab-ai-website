//! Exit-status taxonomy shared by every command.

use crate::client::ClientError;

/// Exit status codes documented in `AGENT.md`. Keep them stable — they are
/// part of the CLI's public contract for scripts and AI agents.
#[derive(Copy, Clone, Debug)]
#[repr(u8)]
pub enum ExitStatus {
    Success = 0,
    Usage = 1,
    Network = 2,
    Auth = 3,
    Server = 4,
}

impl From<&anyhow::Error> for ExitStatus {
    fn from(err: &anyhow::Error) -> Self {
        if let Some(ce) = err.downcast_ref::<ClientError>() {
            return match ce {
                ClientError::Auth(_) | ClientError::KeySource(_) => ExitStatus::Auth,
                ClientError::Network(_) => ExitStatus::Network,
                ClientError::Server { .. } => ExitStatus::Server,
                ClientError::Usage(_) => ExitStatus::Usage,
            };
        }
        ExitStatus::Usage
    }
}
