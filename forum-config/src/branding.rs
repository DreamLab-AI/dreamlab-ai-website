//! DreamLab-specific [`BrandingConfig`] populator.

use nostr_bbs_config::schema::Branding;

/// Build the DreamLab branding overlay.
///
/// This is what the `forum-client` reads via `option_env!` build-time slots
/// and what the workers serve at the `/api/config/branding` route. The values
/// here MUST match the production CSS variables in
/// `community-forum-rs/crates/forum-client/design-tokens.css` so visual
/// regression tests stay green during D2 cutover.
pub fn dreamlab_branding() -> Branding {
    Branding {
        theme: Some("amber".into()),
        logo_url: Some("https://dreamlab-ai.com/assets/logo.svg".into()),
        welcome_copy: Some(
            "Welcome to the DreamLab AI Community Forum — \
             a private space for trainers, builders, and the curious."
                .into(),
        ),
    }
}

/// DreamLab zone display name overrides.
///
/// The kit's default zone IDs are `home`/`members`/`private`; DreamLab
/// re-displays these as `Lobby`/`DreamLab`/`MiniMooNoir`.
///
/// Returns a 3-tuple `(home, members, private)` of display names.
pub fn dreamlab_zone_names() -> (&'static str, &'static str, &'static str) {
    ("Lobby", "DreamLab", "MiniMooNoir")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dreamlab_branding_theme_is_amber() {
        let b = dreamlab_branding();
        assert_eq!(b.theme.as_deref(), Some("amber"));
    }

    #[test]
    fn dreamlab_zone_names_match_legacy() {
        let (h, m, p) = dreamlab_zone_names();
        assert_eq!(h, "Lobby");
        assert_eq!(m, "DreamLab");
        assert_eq!(p, "MiniMooNoir");
    }
}
