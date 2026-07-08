# PRD: Gap-Close Sprint — DreamLab Edge Slice

**Owner:** DreamLab AI (dreamlab-ai-website / DreamLab Edge)
**Status:** Proposed
**Date:** 2026-07-08
**Version:** 1.0
**Parent:** [Meta-PRD Gap-Close Sprint](../../../VisionFlow/docs/PRD-gap-close-sprint.md) · work package "dreamlab-ai-website (DreamLab Edge)"
**Governed by:** [ADR-004 Gap-Close Sprint Governance](../../../VisionFlow/docs/ADR-004-gap-close-sprint-governance.md), [ADR-002 Ecosystem Alignment Governance], [ADR-040 Gap-Close Edge Decisions](../adr/040-gap-close-edge-decisions.md)
**Bounded context:** [DDD Gap-Close Edge Context](../ddd/10-gap-close-edge-context.md), conformist to [DDD Gap-Close Context](../../../VisionFlow/docs/DDD-gap-close-context.md)
**Local decisions this slice extends:** [ADR-037 Config Single Source of Truth](../adr/037-config-single-source-of-truth.md), [ADR-038 Kit-Ref Pin Governance](../adr/038-kit-ref-pin-governance.md)
**Wave:** P2 (REC-12 is a P2 commitment; the render surfaces block on the forum's P0 COM-13 and P1 F8 deliverables)

## TL;DR

DreamLab Edge is a consumer, not a protocol owner. It runs the branded production forum at `dreamlab-ai.com/community/` by pinning the `nostr-rust-forum` kit and injecting DreamLab configuration at deploy time. This slice closes four items the meta-PRD assigns here: REC-12 kit cutover, the operator overlay for the forum's post-sprint disclosure badge and Agents tab, `dreamlab.toml` roster legibility, and a durable kit compatibility record. None of these builds a forum surface. Two of them (overlay disclosure, roster render) wait on the forum shipping COM-13 and F8 upstream, and this document declares that dependency rather than stubbing the surface locally.

Two facts set the tier honestly. The de-specialisation already happened: the legacy `community-forum-rs/` fork was deleted at commit d248550, and `forum-config/` is 892 lines of thin overlay consuming the kit crates at pinned rev `a149da4` (`forum-config/Cargo.toml:42-45`). And the pin is already CI-enforced in lockstep (`.github/workflows/ci.yml:186-201`). What remains is legibility: the record still points at documents that were never committed and SHAs that were superseded, and the config expresses bot authority across three unsynchronised pubkey lists with a documented dual-role bug. This slice makes the running state legible and holds it legible under a canary, so a reader can state which kit SHA production runs and which principal authorised each agent.

## Scope and Ownership

From the meta-PRD per-repository work package, DreamLab Edge owns:

| Item | Register origin | This slice's contribution |
|---|---|---|
| REC-12 kit cutover | Roadmap commitment (P2), co-owned with VisionFlow | Complete the de-specialisation into a thin kit consumer and reconcile the drifted record |
| Overlay surfaces | Operator overlay for COM-13 disclosure badge + F8 Agents tab | Render the forum's shipped components in the branded deployment without local reimplementation |
| Roster legibility | Forum gap F8's out-of-band configuration | Make `dreamlab.toml` bot authority visible: which principal authorised each agent |
| Kit compatibility record | Meta-PRD acceptance criterion | Pin the forum SHA per production deployment in a durable, git-tracked record |

Out of ownership, per the DDD ownership summary: any protocol source. The disclosure badge component, the Agents-tab component, and the nine governance-API endpoints live in `nostr-rust-forum`. This slice consumes them; it does not author them.

## Maturity Ledger

Tiers use the ADR-002 seven-tier vocabulary verbatim (`historical`, `planned`, `scaffolded`, `standalone`, `integrated`, `federation-verified`, `released`). Current tiers are assessed against the code as it stands on branch `closeout/2026-07-03`; targets are the sprint goal.

| Item | Current tier | Evidence for current | Target tier | Gate to target |
|---|---|---|---|---|
| REC-12 kit cutover (consumption wire) | `integrated` | `forum-config` compiles against kit crates at rev `a149da4` (`cargo check -p dreamlab-forum-config` clean); legacy fork deleted d248550; overlay is 892 lines | `integrated` | Record reconciled to match the code; thin-consumer property proven by CANARY-EDGE-KIT |
| REC-12 kit cutover (record) | `scaffolded` | Four dead `PRD-012` references and two stale kit SHAs (`25ca8a1`, `3c16c21`) still in prose | `integrated` | The four references resolve to a live doc and the current SHA |
| Overlay surfaces (disclosure badge) | `planned` | Zero disclosure-badge code anywhere in this repo (grep empty across `src/`, `forum-config/`) | `integrated` | Forum ships COM-13/F8; deployment renders the kit component; CANARY-EDGE-DISCLOSURE fires. Interim if the kit slips: `scaffolded` (env-injection readied), labelled |
| Roster legibility (config source) | `planned` | `dreamlab.toml` `[[agents]]` entries carry no authorising-principal field; visionclaw-server key dual-listed | `integrated` | `authorised_by` added per agent; visionclaw-server key split; CANARY-EDGE-ROSTER config assertion green |
| Roster legibility (rendered surface) | `planned` | No roster UI in this repo (F8 confirmed) | `integrated` | Forum ships F8 Agents tab; deployment renders it. Interim if the kit slips: `scaffolded`, labelled |
| Kit compatibility record | `integrated` (mechanism) / `scaffolded` (record) | Pin CI-enforced at `ci.yml:186-201`; only human-readable provenance is a transient deploy-summary comment (`workers-deploy.yml:351`) | `integrated` | A durable git-tracked compatibility record cites the deployed SHA; CANARY-EDGE-KITPIN fires |

No item claims `federation-verified` or `released`. This slice is a consumer: it carries no cross-substrate decision loop of its own to prove end to end, so `integrated` (the branded deployment observably consumes the upstream component) is the ceiling its evidence can reach.

## Work Packages

### WP-1 — Kit Cutover (REC-12)

**What it closes.** The de-specialisation of the branded forum into a thin kit consumer, and the reconciliation of the record that still describes it as pending.

**Current state.** The cutover is done in code. `community-forum-rs/` was deleted (d248550, "Phase 10 delete community-forum-rs/, deploy from kit upstream"). `forum-config/src` totals 892 lines across `branding.rs` (56), `deploy_config.rs` (438), `lib.rs` (35), `workers.rs` (363) — operator overlay, not forum logic. The record contradicts the code:

- `README.md:350` cites **PRD-012** and **ADR-085**; neither was ever committed to this repo, and ADR-085 predates the current `013-039` numbering that supersedes it (`docs/adr/README.md`).
- `README.md:332` and `README.md:337` cite kit SHA `25ca8a1`; the live pin is `a149da4`.
- `forum-config/README.md:10/177/205` cites SHA `3c16c21`; lines `271-321` describe a "Phase X3 ... no D2 cutover yet" narrative waiting on a kit `dispatch` API. That narrative is already contradicted by `forum-config/src/workers.rs:10-25`, whose own doc comment records that no `dispatch` API exists and the overlay is applied at the wrangler routing level.

**Acceptance criteria.**
1. Every one of the four dead `PRD-012`/`ADR-085` references (`README.md:350`, `forum-config/README.md:273/309/321`) resolves to a live document — this PRD or a named successor — with no path pointing at a non-existent `docs/PRD-012.md`.
2. Both stale kit-SHA mentions (`README.md:332/337`, `forum-config/README.md:10/177/205`) read `a149da4` (or the then-current pin) and reference the CI lockstep gate that enforces it.
3. `forum-config/README.md`'s Status/Migration section states the cutover is complete, consistent with `workers.rs`'s doc comment; the obsolete dispatch-API narrative is removed.
4. A grep gate over `src/` and `forum-config/src/` for a kit-owned surface name returns zero — the thin-consumer property is machine-checkable, not asserted.

**Falsification statement.** *This package is falsified if any `src/` or `forum-config/src/` module reimplements a surface the kit now owns (a non-zero grep for a kit-owned component under this repo's source), or if any of the four dead `PRD-012`/`ADR-085` references or the two stale kit SHAs still points at a non-existent document or a superseded SHA after the increment.*

### WP-2 — Overlay Surfaces

**What it closes.** Rendering the forum's post-sprint disclosure badge (COM-13) and Agents tab (F8) inside the branded deployment, sourced from the kit component.

**Current state.** No disclosure-badge or Agents-tab code exists in this repo; grep for `DisclosureBadge`, `agent_registry`, `AgentsTab` across `src/` and `forum-config/` is empty. The forum UI at `/community/` is the kit's Leptos 0.7 CSR WASM client (`README.md:74`, `README.md:368`). Branding reaches that client through `window.__ENV__` injection at deploy time: `deploy.yml:62-66` sets `BBS_THEME`/`BBS_NODE_NAME`/`BBS_LOGO_URL` and `deploy.yml:270` injects them, the same pattern `ZONE_CONFIG_JSON` uses (`deploy.yml:56`).

**Dependency, declared.** This surface cannot render until `nostr-rust-forum` ships the disclosure-badge component (COM-13, meta-PRD P0) and the Agents-tab component (F8, meta-PRD P1). Until then the overlay stays `planned`. If the sprint reaches its P2 window with the kit component in place, the overlay's only local work is a `BrandingConfig` extension (`forum-config/src/branding.rs`) if DreamLab-specific copy or theming is needed, plus verification that the deploy-time env injection already carries the surface through. If DreamLab needs no theming hook, the deliverable is verification alone: the surface renders from the kit with no new local code.

**Acceptance criteria.**
1. An agent-authored post at `dreamlab-ai.com/community/` renders the forum's disclosure badge, and the rendered badge originates from the kit bundle (no `src/` or `forum-config/src/` reimplementation).
2. The Agents tab at `/community/` renders from the kit component, branded via `window.__ENV__` injection only.
3. If COM-13/F8 have not shipped by this slice's P2 window, the surface is labelled `scaffolded` (env plumbing readied) and is not claimed live; CANARY-EDGE-DISCLOSURE remains unfired and the item stays open, visibly.

**Falsification statement.** *This package is falsified if the branded deployment renders a disclosure badge or Agents tab from local code (React `src/` or `forum-config` Rust) rather than the kit component, or if the deployment claims the surface is live while the kit component has not shipped and CANARY-EDGE-DISCLOSURE has not fired.*

### WP-3 — Roster Legibility

**What it closes.** Making bot authority in `dreamlab.toml` visible: which principal authorised each agent, with no identity dual-listed as both admin and governance publisher.

**Current state.** `forum-config/dreamlab.toml` (316 lines) is the bot-roster and authority config, loaded via `nostr_bbs_config::load_from_path`. Authority is fragmented across three lists that are hand-synchronised:

- `[admin].static_pubkeys` (lines 28-47) — 5 entries. It lists the visionclaw-server key `11ed64…663c` as the **PRIMARY** admin, with an explicit `TODO(operator)` (lines 37-47) recording that this is the same key used below as a `[governance]` publisher and should be a distinct non-admin service identity.
- `[governance].agent_pubkeys` (lines 240-245) — 2 entries authorised to publish control-surface events (kinds 31400-31405); visionclaw-server appears here too.
- `[[agents]]` (lines 259+) — 6 roster entries with `label`/`pubkey`/`role`/`cohorts`, and no field naming the authorising principal.

The dual-listing is not cosmetic. ADR-037 O2 already flags the `ADMIN_PUBKEYS` fragmentation across `dreamlab.toml`, the relay-worker, the search-worker, and the auth-worker CF secret; `ci.yml:213-243` runs an `admin-pubkeys-sync` check asserting the mirrors agree. Removing visionclaw-server from `[admin]` alone would split the admin set and desync from those mirrors. The fix is one atomic change across `dreamlab.toml [admin]`, the relay/search `ADMIN_PUBKEYS`, and the auth-worker CF secret, minting a distinct operator/admin key, per the existing TODO.

**Acceptance criteria.**
1. Each `[[agents]]` entry carries an `authorised_by` field naming the principal (pubkey or label) that authorised it, so the config can express authority rather than implying it from cohort or role.
2. The visionclaw-server key `11ed64…663c` appears only in `[governance].agent_pubkeys`, never in `[admin].static_pubkeys`, after a distinct operator/admin key is minted and mirrored across the relay/search `ADMIN_PUBKEYS` and the auth-worker CF secret in one change; `ci.yml` `admin-pubkeys-sync` stays green.
3. The rendered Agents tab (kit-owned, F8) shows each agent's authorising principal resolved from `dreamlab.toml`; this render sub-item blocks on the forum shipping F8, and stays `planned`/`scaffolded` until then, labelled.

**Falsification statement.** *This package is falsified if the visionclaw-server key `11ed64…663c` still appears in both `[admin].static_pubkeys` and `[governance].agent_pubkeys` after the increment, or if any `[[agents]]` entry renders (or is claimed renderable) without an `authorised_by` principal resolvable from `dreamlab.toml`.*

### WP-4 — Kit Compatibility Record

**What it closes.** A durable, git-tracked statement of which forum-kit SHA each production deployment runs.

**Current state.** The pin is real and enforced. `KIT_REF` is set identically in `deploy.yml:74`, `workers-deploy.yml:41`, and `rust-ci.yml:20` (`a149da4…`), and `forum-config/Cargo.toml:42-45` carries four `rev=` pins at the same SHA. `ci.yml:186-201` fails the build if the three `KIT_REF`s differ or if a Cargo rev is not a prefix of the deploy SHA. ADR-038 already governs this lockstep. The gap is legibility: the only human-readable provenance is the deploy-summary comment at `workers-deploy.yml:351`, which is transient CI output, not a git-tracked record a reader can cite.

**Acceptance criteria.**
1. A compatibility record under `docs/` (a table or manifest) states, per production deployment (today: `dreamlab-ai.com`), the forum-kit SHA it runs and the maturity tier at which it consumes the kit.
2. The record's cited SHA equals the live `KIT_REF`, and CI fails on divergence — extending the existing `pin-check` job rather than replacing it.
3. The record's schema admits more than one deployment row, so a second branded deployment adds a row rather than a duplicated literal.

**Falsification statement.** *This package is falsified if the production deployment cannot cite, from a git-tracked record, the forum-kit SHA it runs, or if the compatibility record and the live `KIT_REF`/Cargo revs can diverge without CI failing.*

## Liveness Canaries

Every loop-closing item in this slice registers a named canary against the VisionClaw liveness harness (`LivenessHarness`, RES-a). An item is not closed until its canary fires in a live session. Two canaries are honestly gated on upstream forum deliverables and cannot fire until COM-13/F8 ship; those items stay open until then.

| Canary ID | Item | Wire observed | Firing means |
|---|---|---|---|
| `CANARY-EDGE-KIT` | WP-1 kit cutover | Live `dreamlab-ai.com/community/` bundle provenance (`BUILD_HASH` + checked-out `KIT_REF`) against the pinned Cargo rev, plus a zero-result grep for kit-owned surfaces under this repo's source | Production runs the pinned kit as a thin consumer, not a fork; no surface is locally reimplemented |
| `CANARY-EDGE-KITPIN` | WP-4 compatibility record | The compatibility record's cited SHA against the three workflow `KIT_REF`s and the four Cargo revs, gated by `ci.yml` `pin-check` | The deployment can state its forum-kit SHA from a git-tracked record, and the record cannot silently diverge from the live pin |
| `CANARY-EDGE-DISCLOSURE` | WP-2 overlay surfaces | The rendered DOM of an agent-authored post at `/community/` against the kit's disclosure-badge component | The branded deployment renders the forum's disclosure surface from the kit, without local reimplementation. **Gated on forum COM-13/F8; cannot fire until the kit ships.** |
| `CANARY-EDGE-ROSTER` | WP-3 roster legibility | (a) `dreamlab.toml [[agents]].authorised_by` presence and the visionclaw-server key appearing only under `[governance]`; (b) the rendered Agents tab resolving each authorising principal from config | Bot authority is legible and no identity is dual-listed as admin and governance publisher. Sub-item (a) fires on config; sub-item (b) is **gated on forum F8**. |

## Dependencies on Upstream

| Depends on | From | Blocks |
|---|---|---|
| COM-13 disclosure-badge component | nostr-rust-forum (P0) | WP-2 render, CANARY-EDGE-DISCLOSURE |
| F8 Agents-tab component + the nine governance endpoints | nostr-rust-forum (P1) | WP-2 Agents tab, WP-3 rendered surface, CANARY-EDGE-ROSTER (b) |
| RES-a liveness harness | VisionClaw (P0) | All four canaries' registration and firing |

Per ADR-004 Decision 7, if an upstream deliverable slips past this slice's P2 window, this slice does not stub the surface or move its own wave. It raises the dependency at the canon and holds the affected item open at `planned`/`scaffolded`, labelled.

## Wave Placement

REC-12 is a P2 commitment, and the render surfaces depend on the forum's P0 (COM-13) and P1 (F8) work landing first, so this slice's rendered items are naturally P2. Two sub-items do not depend on the kit UI and may proceed as soon as the slice is minted: the WP-1 record reconciliation and the WP-3 config hygiene (the `authorised_by` field and the visionclaw-server key split), the latter a stated precondition for any trustworthy authority surface. WP-4's durable compatibility record likewise proceeds independently, extending the existing `pin-check` job.

## Non-Goals

- **Building any forum surface.** The disclosure badge, the Agents tab, and the governance endpoints belong to `nostr-rust-forum`. A local placeholder badge would reintroduce the specialisation the cutover removed and would reproduce the register's D5 anti-pattern (a surface decoupled from ground truth).
- **A per-deployment pin manifest before a second deployment exists.** One production target runs today. WP-4's record schema admits a second row; it does not build multi-deployment machinery speculatively.
- **Re-deriving the lost PRD-012/ADR-084/085 content.** A 2026-05-07 RuVector memory records that roughly 2000 lines of planning existed under the superseded `073-085` numbering epoch. That content is historical; this PRD supersedes the dead references rather than recovering them.

## Cross-Reference

- Kit pin governance: ADR-038 (KIT_REF lockstep); config single source: ADR-037 (`dreamlab.toml` → worker vars + client env).
- Injection pattern: `deploy.yml:56/62-66/270` (`window.__ENV__`, `ZONE_CONFIG_JSON`, `BBS_*`).
- Pin enforcement: `ci.yml:186-201` (`pin-check`), `ci.yml:213-243` (`admin-pubkeys-sync`).
- Overlay source surface: `forum-config/src/{branding,deploy_config,workers,lib}.rs` (892 lines total); `forum-config/dreamlab.toml` (316 lines).
- Forum route: `dreamlab-ai.com/community/`, Leptos 0.7 CSR WASM (`README.md:74/368`).
- Governance kinds: 31400-31405 (ACSP control surface, `dreamlab.toml [governance]`).
