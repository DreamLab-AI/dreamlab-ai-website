//! Shared UI components for the DreamLab forum client.
//!
//! Header and AuthGate are provided by `app.rs` (the layout shell).
//! This module houses all reusable display components.

// -- Existing components ------------------------------------------------------
pub mod channel_card;
pub mod message_bubble;
pub mod particle_canvas;

// -- Core UI (Stream 1) ------------------------------------------------------
pub mod avatar;
pub mod badge;
pub mod confirm_dialog;
pub mod empty_state;
pub mod modal;
pub mod toast;

// -- Rich Messages (Stream 2) ------------------------------------------------
pub mod link_preview;
pub mod media_embed;
pub mod mention_text;
pub mod message_input;
pub mod quoted_message;
pub mod reaction_bar;
pub mod typing_indicator;

// -- Auth Flow + Profile (Stream 3) ------------------------------------------
pub mod profile_modal;
pub mod user_display;

// -- Navigation + Mobile (Stream 4) ------------------------------------------
pub mod breadcrumb;
pub mod mobile_bottom_nav;
pub mod notification_bell;
pub mod session_timeout;

// -- Forum/BBS Hierarchy (Stream 5) ------------------------------------------
pub mod category_card;
pub mod section_card;

// -- Calendar/Events (Stream 6) ----------------------------------------------
pub mod event_card;
pub mod mini_calendar;

// -- Search + DM Enhancement (Stream 8) --------------------------------------
pub mod bookmarks_modal;
pub mod global_search;
pub mod image_upload;
pub mod virtual_list;
