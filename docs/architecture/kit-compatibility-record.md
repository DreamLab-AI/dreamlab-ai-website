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
| `dreamlab-ai.com` (+ mirror `thedreamlab.uk`) | `6986276bf64a8fed1cd0412e60c57651c69e8522` | `gap-close/2026-07` HEAD | `integrated` | ✔ |

<!-- pin-check:canonical-kit-sha -->
```
CANONICAL_KIT_SHA=6986276bf64a8fed1cd0412e60c57651c69e8522
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

## What this SHA contains (gap-close/2026-07 HEAD, `6986276`)

Consumed from the forum's gap-close slice:

- **COM-13/F2** — agent disclosure badge (`components/agent_badge.rs`) wired at all
  author-render sites, sourced from the relay's public
  `GET /api/agents/disclosure` endpoint (`agent_disclosure.rs`).
- **F8/WP-5** — admin Agents roster tab (`admin/agents_roster.rs`) round-tripping
  the nine `/api/governance/*` endpoints via NIP-98-signed fetch.
- **F1** — member read-only governance view; **COM-16/COM-17** decision integrity +
  graduated escalation; **REC-6** escalation-default projection.

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
| `6986276` | `gap-close/2026-07` HEAD | Current. COM-13 badge, F8 roster tab, governance surfaces. |
| `a149da4` | PR #63 head (v1.0.0-beta.3) | Superseded. BBS control-plane + live Chat/Code + pod-url clarity. |
| `3c16c21` | earlier | Superseded (JSS Solid surface, `solid-pod-rs` 0.5.0-alpha.2). |
| `25ca8a1` | earlier | Superseded. |
