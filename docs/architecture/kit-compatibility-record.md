# Kit compatibility record

**Governs:** gap-close edge PRD WP-4, ADR-040 D2, ADR-038 (Kit-Ref Pin Governance)
**Purpose:** the durable, git-tracked answer to *"which `nostr-rust-forum` kit SHA
does each production deployment run, and at what maturity tier does it consume the
kit?"* — moved out of the transient deploy-summary comment
(`workers-deploy.yml`) into a citable artifact.

The single global `KIT_REF` pin (one production target today) is enforced in
lockstep by the `pin-check` job in `.github/workflows/ci.yml`: the three workflow
`KIT_REF`s, the four `forum-config/Cargo.toml` `rev=` pins, and **the SHA cited in
this record** must all resolve to the same commit, or the build fails. This record
is therefore not documentation that can silently drift — CI ties it to the live pin.

## Deployments

The schema admits more than one deployment row: a second branded deployment adds a
row here (its own host, SHA, tier), it does not duplicate a literal. Only the row
whose `kit_sha` is marked canonical (`✔`) is compared against the live `KIT_REF` by
CI; a second deployment pinning a different SHA would carry its own pin sites and
its own `pin-check` extension.

| Deployment host | Forum-kit SHA | Kit branch/tag at pin | Consumption tier | Canonical for pin-check |
|---|---|---|---|---|
| `dreamlab-ai.com` (+ mirror `thedreamlab.uk`) | `98bdf7b0d8a2f1a49751b3bf182dd8331bb81aa5` | `main` (per-zone auto-approval) | `integrated` | ✔ |

<!-- pin-check:canonical-kit-sha -->
```
CANONICAL_KIT_SHA=98bdf7b0d8a2f1a49751b3bf182dd8331bb81aa5
```

The `CANONICAL_KIT_SHA` line above is the machine-readable field the `pin-check`
job extracts and compares against the workflow `KIT_REF`s and Cargo revs. Keep it
byte-identical to `KIT_REF` when bumping the kit.

## Pin sites (all must equal `CANONICAL_KIT_SHA`)

| Site | File | What it drives |
|---|---|---|
| `KIT_REF` | `.github/workflows/deploy.yml` | Forum-client (Leptos WASM) build |
| `KIT_REF` | `.github/workflows/workers-deploy.yml` | Five CF worker builds |
| `KIT_REF` | `.github/workflows/rust-ci.yml` | Kit-level fmt/clippy/test gates |
| `rev =` ×4 | `forum-config/Cargo.toml` | Overlay compiles/tests against the same kit |
| `CANONICAL_KIT_SHA` | this file | The citable provenance record |

## What tier `integrated` means here

`integrated` (ADR-002 vocabulary) is the ceiling for a consumer: the branded
deployment observably builds and serves the pinned kit's surfaces (workers, Leptos
client, the COM-13 disclosure badge, the F8 Agents roster tab) with **no local
reimplementation** — the thin-consumer property is machine-checked by the grep gate
over `src/` + `forum-config/src/` for kit-owned surface names (returns zero) and by
the `pin-check` lockstep. It does not claim `federation-verified`/`released`: the
edge carries no cross-substrate decision loop of its own to prove end to end.

## What this SHA contains (`main`, per-zone auto-approval, `98bdf7b`)

Per-zone auto-approval of new joiners: each zone gains an `auto_approve` flag in
`ZONE_CONFIG`; when set, a brand-new user (first-kind-0 auto-whitelist) is
additively granted that zone's `required_cohorts`, landing in it without an admin
approving them. Opt-in per zone (deny-by-default; the historic `["members"]`
default is preserved for un-flagged deployments). This deployment opts **minimoonoir**
in (new joiners auto-granted the `friends` cohort); family/business stay
manual-grant. Everything below is also present.

## What earlier SHAs added (`5875beb` — BBS mobile-first redesign / ADR-108)

The retro BBS client (`nostr-bbs-bbs-client`, served at `/community/bbs/`) is
reimagined mobile-first per ADR-108 — the phosphor skin, ASCII image rendering,
numbered menu and keyboard model are kept while the modem-era interaction grammar
is replaced by the main board's patterns (onboarding landing, ≥44 px vertical
sign-in with extension-free paths, zones-as-cards drill-down, tappable back +
breadcrumbs, persistent bottom nav, threaded topics, in-composer image upload,
a11y prefs, encrypted DMs incl. Jarvis 1:1, native passkey sign-in, global
search, notifications). Config-driven `NODE_NAME`/`TAGLINE` text masthead
replaces the box-glyph art (operator branding: MINIMOONOIR / "private secure
forums"). Everything below is also present.

## What earlier SHAs added (`b866108` and before)

Everything in `5b1e2d8` (soak-fix sprint + ADR-107, itself atop the `3df5498`
gap-close slice: COM-13/F2 disclosure badge, F8/WP-5 Agents roster, F1
governance surfaces, COM-16/COM-17, REC-6) plus:

- **Admin create-channel panic fix** — the admin channel-creation flow no
  longer panics on submit (kit-side fix landing atop the relay-pacing/Solid-PUT
  slice below).
- **Relay send pacing** — the client paces REQ/EVENT/CLOSE frames under the
  relay's per-IP rate limit (boot burst previously dropped the message REQs,
  rendering "0 messages" site-wide); the relay-worker cap is now the
  `RATE_LIMIT_MSGS_PER_SEC` var (default 30, was hardcoded 10).
- **Solid PUT uploads** — pod media uploads use `PUT` (Solid resource
  semantics), fixing avatar/in-post images against self-hosted
  `solid-pod-rs` pods; the CF pod-worker accepts both verbs.

All render from the pinned kit at deploy time; this repo adds only branding
(`window.__ENV__` injection) and operator config (`dreamlab.toml`).

## Bump procedure

1. Re-pin `KIT_REF` in `deploy.yml`, `workers-deploy.yml`, `rust-ci.yml`.
2. Re-pin the four `rev=` in `forum-config/Cargo.toml` (bump each crate `version`
   to match the crate version at the new rev).
3. Update `CANONICAL_KIT_SHA` above and add/adjust the deployment row.
4. Run the overlay build (`cargo test --manifest-path forum-config/Cargo.toml`) and
   the `pin-check` gate locally; both must be green before pushing.

## History

| SHA | Branch/context | Notes |
|---|---|---|
| `98bdf7b` | `main` (per-zone auto-approval) | Current. Config-driven `auto_approve` per zone; minimoonoir opted in (new joiners auto-granted `friends`). |
| `5875beb` | `main` (BBS redesign, ADR-108) | Superseded. Mobile-first BBS reimagining (T1–T3): sign-in, onboarding, zones/threads, DMs, passkey, search, notifications; MINIMOONOIR branding. |
| `b866108` | `main` (admin create-channel panic fix) | Superseded. Admin channel-creation panic fix atop the relay-pacing/Solid-PUT slice. |
| `3c9fb83` | `main` (relay pacing + Solid PUT) | Superseded. Client send pacing under relay rate limit; PUT media uploads. |
| `5b1e2d8` | `main` (soak-fix sprint + ADR-107) | Superseded. 16 soak fixes, zone-first navigation, dev-auth harness. |
| `3df5498` | `gap-close/2026-07` HEAD + CI fix | Superseded. Removes dev-only `[patch.crates-io]` local path. |
| `6986276` | `gap-close/2026-07` HEAD | Superseded. COM-13 badge, F8 roster tab, governance surfaces. |
| `a149da4` | PR #63 head (v1.0.0-beta.3) | Superseded. BBS control-plane + live Chat/Code + pod-url clarity. |
| `3c16c21` | earlier | Superseded (JSS Solid surface, `solid-pod-rs` 0.5.0-alpha.2). |
| `25ca8a1` | earlier | Superseded. |
