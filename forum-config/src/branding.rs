//! DreamLab-specific [`BrandingConfig`] populator.

use nostr_bbs_config::schema::Branding;

/// Build the DreamLab branding overlay.
///
/// This is what the `forum-client` reads via `option_env!` build-time slots
/// and what the workers serve at the `/api/config/branding` route. The theme
/// selector (`amber`) must match a palette the pinned kit ships in its
/// `nostr-bbs-forum-client` design tokens; the kit owns the CSS, this overlay
/// only selects and populates the branding values it consumes.
pub fn dreamlab_branding() -> Branding {
    Branding {
        theme: Some("amber".into()),
        // dreamlab.toml [branding].logo_url is empty: no SVG logo exists yet
        // (that file's comment records /assets/logo.svg as a 404). Do not
        // point the overlay at a dead asset.
        logo_url: None,
        welcome_copy: Some(
            "Welcome to the DreamLab AI Community Forum — \
             a private space for trainers, builders, and the curious."
                .into(),
        ),
        // Retro ASCII/BBS interface branding (nostr-bbs-bbs-client status bar).
        // Mirrors the BBS_* env projected into window.__ENV__ by deploy.yml.
        // dreamlab.toml [branding].node_name ("MINIMOONOIR") is the authored
        // source of truth (src/lib.rs item 3); a self-declared mirror must
        // not diverge from the value it claims to mirror.
        node_name: Some("MINIMOONOIR".into()),
        location: Some("Lake District, UK".into()),
        banner_url: None,
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
    fn dreamlab_branding_matches_authored_toml() {
        // forum-config/dreamlab.toml [branding] is the authored source of
        // truth (src/lib.rs item 3). Guard the 2026-10-02 drift fix so the
        // programmatic overlay cannot silently contradict it again.
        let b = dreamlab_branding();
        assert_eq!(b.node_name.as_deref(), Some("MINIMOONOIR"));
        assert_eq!(b.logo_url, None); // no SVG logo exists yet
        assert_eq!(b.location.as_deref(), Some("Lake District, UK"));
    }

    #[test]
    fn dreamlab_zone_names_match_legacy() {
        let (h, m, p) = dreamlab_zone_names();
        assert_eq!(h, "Lobby");
        assert_eq!(m, "DreamLab");
        assert_eq!(p, "MiniMooNoir");
    }
}
