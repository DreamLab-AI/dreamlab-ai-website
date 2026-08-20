# ADR 044: Canonical Brand Logo Asset

## Status

Proposed — 2026-08-20

## Context

The site has **no dedicated logo asset**. Current stand-ins:

- `public/favicon.ico` — a single 16×16 ICO, far below the ≥112×112 minimum
  most schema/entity consumers require for `Organization.logo`.
- ADR-043's schema work had to point `Organization.logo` at
  `images/heroes/dreamlab-hero.webp` (a 1920×1072 venue photograph) as an
  interim measure — valid markup, but a hero photo is not a brand mark, and
  answer engines / knowledge panels will render it badly at small sizes.
- `site.webmanifest` and the OG/Twitter card images inherit the same gap:
  there is no square mark for PWA icons, avatars, or entity cards.

Entity recognition is the weakest axis in the AI-visibility reports
(HubSpot brand recognition 2–4/20). A consistent, machine-readable brand
mark across schema, favicon, manifest, and social profiles is one of the
few on-site levers for entity grounding.

## Decision

1. **Commission/produce one canonical vector mark** (`logo.svg`): a square
   brand mark that reads at 16 px and at 512 px, dark- and light-background
   variants. Source of truth lives at `public/images/brand/`.
2. **Derive the raster set** from the SVG at build-asset time (one-off
   script alongside `scripts/optimize-images.sh`):
   - `logo-512.png`, `logo-192.png` (webmanifest / PWA)
   - `logo-112.png` minimum for `Organization.logo` (use the 512 in schema)
   - `favicon.ico` (16/32/48 multi-size) and `apple-touch-icon.png` (180)
3. **Wire the references**:
   - `Organization.logo` in `index.html` JSON-LD → `/images/brand/logo-512.png`
     (replaces the ADR-043 interim hero-photo value)
   - `site.webmanifest` icons array → 192/512 PNGs
   - `<link rel="icon">` → new multi-size favicon; add `apple-touch-icon`
   - Use the same mark on social profiles (LinkedIn, Bluesky) listed in
     `sameAs`, so entity resolvers see one consistent identity.
4. **Constraints**: square canvas, no text-only wordmark at small sizes,
   transparent background for the PNGs, and the mark must not depend on
   colour alone (accessibility + monochrome contexts).

## Consequences

- Closes the ADR-043 interim deviation; schema presents a real brand mark.
- Consistent identity across favicon, PWA, schema, and social profiles
  strengthens entity grounding for answer engines.
- Requires a design input (the SVG) that does not yet exist — this ADR is
  blocked on producing or commissioning the mark; everything downstream is
  mechanical.

## References

- ADR-043 (AI Search Visibility) — interim `Organization.logo` deviation
- Google `Organization` structured-data guidance: logo ≥112×112, crawlable,
  PNG/WebP/SVG accepted
