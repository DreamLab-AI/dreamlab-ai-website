//! Shared UI components for the DreamLab forum client.
//!
//! Header and AuthGate are provided by `app.rs` (the other agent's shell).
//! This module houses channel-specific display components.

pub mod channel_card;
pub mod message_bubble;

pub use channel_card::ChannelCard;
pub use message_bubble::MessageBubble;
