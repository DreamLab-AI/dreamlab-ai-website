//! `forum-admin channel …` — channel administration.

use clap::Subcommand;
use serde_json::json;

use crate::auth::KeySource;
use crate::client::ForumAdminClient;
use crate::commands::CommandDispatch;
use crate::config::GlobalFlags;
use crate::output;

#[derive(Debug, Subcommand)]
pub enum ChannelCmd {
    /// List channels on this instance.
    List {
        #[command(flatten)]
        key: KeySource,
    },
    /// Create a new channel.
    Create {
        /// URL slug (`general`, `off-topic`, …).
        slug: String,
        /// Display name (defaults to the slug in title case).
        #[arg(long)]
        name: Option<String>,
        /// Optional description / topic.
        #[arg(long)]
        description: Option<String>,
        #[command(flatten)]
        key: KeySource,
    },
}

#[async_trait::async_trait]
impl CommandDispatch for ChannelCmd {
    async fn dispatch(self, flags: &GlobalFlags) -> anyhow::Result<()> {
        match self {
            ChannelCmd::List { key } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let value = client.get("/api/channels").await?;
                output::emit_success(flags, &value);
            }
            ChannelCmd::Create {
                slug,
                name,
                description,
                key,
            } => {
                let client = ForumAdminClient::new(flags, key.resolve()?)?;
                let display = name.unwrap_or_else(|| default_name(&slug));
                let mut body = serde_json::Map::new();
                body.insert("slug".into(), json!(slug));
                body.insert("name".into(), json!(display));
                if let Some(d) = description {
                    body.insert("description".into(), json!(d));
                }
                // TODO(backend-lead): channel-create endpoint still under discussion.
                let value = client
                    .post("/api/channels", &serde_json::Value::Object(body))
                    .await?;
                output::emit_success(flags, &value);
            }
        }
        Ok(())
    }
}

fn default_name(slug: &str) -> String {
    let mut out = String::with_capacity(slug.len());
    let mut capitalize = true;
    for ch in slug.chars() {
        if ch == '-' || ch == '_' {
            out.push(' ');
            capitalize = true;
        } else if capitalize {
            out.extend(ch.to_uppercase());
            capitalize = false;
        } else {
            out.push(ch);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_name_titlecases_slug() {
        assert_eq!(default_name("general"), "General");
        assert_eq!(default_name("off-topic"), "Off Topic");
        assert_eq!(default_name("foo_bar_baz"), "Foo Bar Baz");
    }
}
