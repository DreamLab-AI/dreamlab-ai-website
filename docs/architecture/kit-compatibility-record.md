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
| `dreamlab-ai.com` (+ mirror `thedreamlab.uk`) | `5b1e2d86354ac19492160ccbcaa5bceec9921d8a` | `main` (soak-fix sprint + ADR-107) | `integrated` | ✔ |

<!-- pin-check:canonical-kit-sha -->
```
CANONICAL_KIT_SHA=5b1e2d86354ac19492160ccbcaa5bceec9921d8a
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

## What this SHA contains (`main`, soak-fix sprint + ADR-107, `5b1e2d8`)

Everything in `3df5498` (gap-close slice: COM-13/F2 disclosure badge, F8/WP-5
Agents roster, F1 governance surfaces, COM-16/COM-17, REC-6) plus:

- **Soak-test fix sprint** — 16 fixes from the 10-persona browser soak
  (notification baseline/own-join suppression, logout click-through, humanised
  errors, settings display-name UX, nsec-recovery profile rehydration,
  governance empty states, admin create-section CTA; see the kit CHANGELOG
  and `docs/sprint/soak-test-2026-07-16.md` in this repo).
- **ADR-107 zone-first navigation** — members authorised for exactly one locked
  zone land at `/forums/{zone}` (zone hero, zone-only topics), zone-labelled
  nav anchor, zone-rooted breadcrumbs; driven entirely by `ZONE_CONFIG`.
- **Feature-gated `dev-auth` harness** (never compiled into prod builds) and a
  brand-neutral empty `window.__ENV__` placeholder in the kit `index.html`.

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
| `5b1e2d8` | `main` (soak-fix sprint + ADR-107) | Current. 16 soak fixes, zone-first navigation, dev-auth harness. |
| `3df5498` | `gap-close/2026-07` HEAD + CI fix | Superseded. Removes dev-only `[patch.crates-io]` local path. |
| `6986276` | `gap-close/2026-07` HEAD | Superseded. COM-13 badge, F8 roster tab, governance surfaces. |
| `a149da4` | PR #63 head (v1.0.0-beta.3) | Superseded. BBS control-plane + live Chat/Code + pod-url clarity. |
| `3c16c21` | earlier | Superseded (JSS Solid surface, `solid-pod-rs` 0.5.0-alpha.2). |
| `25ca8a1` | earlier | Superseded. |
