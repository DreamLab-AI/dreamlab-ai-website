# ADR-040: Gap-Close Edge Decisions

## Status: Proposed

## Date: 2026-07-08

**Decision owners:** DreamLab Edge maintainers
**Related:** [Child PRD Gap-Close Edge](../prd/prd-gap-close-edge-v1.0.md), [Meta-PRD Gap-Close Sprint](../../../VisionFlow/docs/PRD-gap-close-sprint.md), [ADR-004 Gap-Close Sprint Governance](../../../VisionFlow/docs/ADR-004-gap-close-sprint-governance.md), [ADR-002 Ecosystem Alignment Governance], [ADR-037 Config Single Source of Truth](037-config-single-source-of-truth.md), [ADR-038 Kit-Ref Pin Governance](038-kit-ref-pin-governance.md), [DDD Gap-Close Edge Context](../ddd/10-gap-close-edge-context.md)

## Context

DreamLab Edge holds four owned items in the gap-close register: REC-12 kit cutover, the operator overlay for the forum's disclosure badge and Agents tab, `dreamlab.toml` roster legibility, and a durable kit compatibility record. The child PRD states the increment; this ADR records the decisions the increment forces, where each has a real alternative that a maintainer might reasonably have chosen.

Three facts frame the decisions. First, the repository is a consumer: per the Gap-Close DDD ownership summary it owns no protocol source, and its forum surfaces are the `nostr-rust-forum` kit's WASM client served at `/community/`, branded through `window.__ENV__` injection at deploy time (`deploy.yml:270`). Second, two of the four items depend on forum components (COM-13, F8) that do not yet exist in this repo's grep-verified surface, so the sequencing question is real: build a local placeholder to show progress, or hold the surface open. Third, the config that expresses bot authority carries a documented dual-role bug — the visionclaw-server key `11ed64…663c` is listed as PRIMARY admin (`dreamlab.toml:37-47`) and as a governance publisher (`dreamlab.toml:242`) at once — and any authority surface built over that state would display a genuinely incorrect admin claim.

## Decisions

### D1 — Consume the kit; never reimplement a kit-owned surface locally

The branded deployment renders forum surfaces by consuming the kit's components through `window.__ENV__` injection and wrangler routing, never by reimplementing them in the React marketing site or the `forum-config` overlay crate. A grep gate over `src/` and `forum-config/src/` for kit-owned surface names, returning zero, is the machine-checkable form of this decision and the CANARY-EDGE-KIT precondition.

**Alternatives considered.**

| Alternative | Verdict | Rationale |
|---|---|---|
| Reimplement the disclosure badge in the React marketing site for brand control | Rejected | Reproduces the specialisation the cutover removed (the deleted `community-forum-rs/` fork, d248550) and violates the meta-PRD acceptance criterion "renders … without local reimplementation". It also splits ground truth: a locally rendered badge could disagree with the kit's `agent_registry`, which is the register's D5 failure mode. |
| Iframe the `/community/` route into the marketing SPA | Rejected | The `/community/` route already is the kit's WASM client. Overlay is applied at the wrangler routing level and through `window.__ENV__` (`workers.rs:10-25`), not by nesting one SPA inside another. An iframe adds a frame boundary with no branding benefit the env injection does not already give. |

### D2 — Keep the single global pin; promote its provenance to a durable record

The kit compatibility record stays a single global `KIT_REF` pin, because one production target (`dreamlab-ai.com`) exists. The decision is to move its human-readable provenance out of the transient deploy-summary comment (`workers-deploy.yml:351`) into a git-tracked compatibility record under `docs/`, whose schema admits a second deployment row, with CI extended to fail on divergence between the record and the live pin.

**Alternatives considered.**

| Alternative | Verdict | Rationale |
|---|---|---|
| Build a per-deployment pin manifest now | Rejected as premature | Only one deployment target exists. A manifest keyed by deployment would carry a single row today and add indirection the `pin-check` job already covers. The chosen record schema admits a second row, so the extension cost is deferred to the day a second brand ships, not paid speculatively. |
| Rely on the `ci.yml` `pin-check` lockstep alone | Rejected | The CI gate enforces that the four Cargo revs and three `KIT_REF`s agree, but leaves no git-tracked artefact a reader can cite for "which SHA does production run". ADR-002's compatibility-matrix posture wants a durable record, and the meta-PRD acceptance criterion asks the deployment to state its SHA, which a CI job's ephemeral output does not satisfy. |

### D3 — Split the visionclaw-server key atomically, before surfacing authority

A distinct operator/admin keypair is minted, and the visionclaw-server key `11ed64…663c` is left only in `[governance].agent_pubkeys`. Because that key is mirrored into the relay-worker and search-worker `ADMIN_PUBKEYS` and the auth-worker CF secret, and `ci.yml:213-243` asserts the mirrors agree, the removal is one atomic change across `dreamlab.toml [admin]`, the relay/search `ADMIN_PUBKEYS`, and the auth-worker CF secret. This split is sequenced before the roster authority surface, so the surface never displays an incorrect PRIMARY-admin claim.

**Alternatives considered.**

| Alternative | Verdict | Rationale |
|---|---|---|
| Surface authority as-is with a footnote explaining the dual role | Rejected | The Agents tab would show visionclaw-server as PRIMARY admin, which is wrong: it is a non-admin governance service identity (`forum-config/README.md`: "Admin: no"). A footnote does not make a wrong datum right; it documents a defect the register (F8) already filed. |
| Remove visionclaw-server from `[admin]` alone, without minting a new key | Rejected | Removing it from `dreamlab.toml [admin]` while it remains in the relay/search `ADMIN_PUBKEYS` and the auth-worker CF secret splits the admin set and fails the `admin-pubkeys-sync` check. The existing `TODO(operator)` (`dreamlab.toml:44-47`) specifies the atomic change; a partial edit desyncs the mirrors. |

### D4 — Model authority as explicit config data; leave the render to the kit

Each `[[agents]]` entry gains an `authorised_by` field naming the principal that authorised it. This repo owns the datum (which principal authorised each agent); the kit owns the render (the Agents tab, F8). Authority is stated in `dreamlab.toml`, the config single source of truth per ADR-037, not inferred and not held in a second file.

**Alternatives considered.**

| Alternative | Verdict | Rationale |
|---|---|---|
| Infer authority from `cohorts` or `role` | Rejected | `cohorts` describes zone membership and `role` is free text (`dreamlab.toml:259+`). Neither states who authorised the agent. An explicit `authorised_by` pubkey or label is the legible datum a roster surface needs; inference would fabricate a provenance the config does not hold. |
| Put the authority mapping in a separate file | Rejected | `dreamlab.toml` is already the single config source loaded via `nostr_bbs_config::load_from_path`, and ADR-037 exists precisely to stop configuration splitting into hand-synchronised copies. A second file reintroduces the drift ADR-037 and the `admin-pubkeys-sync` check guard against. |

### D5 — Declare the upstream dependency; hold the surface open rather than stub it

Where a surface depends on a forum component that has not shipped (COM-13 disclosure badge, F8 Agents tab), this slice declares the dependency, readies the `window.__ENV__` plumbing at most (`scaffolded`), and holds the surface at `planned`/`scaffolded` with its canary unfired until the kit ships. It does not build a local placeholder to register apparent progress.

**Alternatives considered.**

| Alternative | Verdict | Rationale |
|---|---|---|
| Build a local placeholder badge/tab to show sprint progress | Rejected | A placeholder is the local reimplementation D1 forbids and the "built, and unwired" pattern ADR-004 exists to prevent: a surface that renders while decoupled from the kit's ground truth would score as progress while carrying the exact defect the register found (D5). |
| Move this slice's wave earlier so it does not wait on the forum | Rejected | ADR-004 Decision 7 reserves wave and owner movement to the canon register. A child does not re-scope its own slice to avoid a dependency; it raises the dependency at the canon and holds the item open, visibly, per the no-canary-no-closure invariant. |

## What This Decision Does Not Govern

- **The forum surfaces themselves.** COM-13, F8, and the nine governance endpoints are `nostr-rust-forum`'s to build. This ADR governs how the branded deployment consumes them.
- **The kit-ref lockstep mechanism.** ADR-038 already governs the `KIT_REF` invariant; D2 extends its provenance into a durable record and does not restate it.
- **The config single-source rule.** ADR-037 already owns `dreamlab.toml` as the authored source; D3 and D4 conform to it.

## Consequences

### Positive

- The branded deployment's kit provenance becomes citable from a git-tracked record, and its thin-consumer property becomes machine-checkable, so a reader can answer "which kit SHA runs, and does the deployment reimplement anything" without reading CI logs.
- Bot authority stops being fragmented across three unsynchronised lists with a wrong PRIMARY-admin claim; after D3/D4, the config states which principal authorised each agent, atomically consistent with the CF-secret mirrors.
- The two upstream-gated surfaces register honestly as open until the forum ships, so the four-surface score reflects the running state rather than a stubbed one.

### Tradeoffs

- D3's atomic key split touches four locations (`dreamlab.toml`, relay `ADMIN_PUBKEYS`, search `ADMIN_PUBKEYS`, auth-worker CF secret) in one change; a partial application fails `admin-pubkeys-sync` and blocks deploy until reconciled. This is the cost of the single-source discipline ADR-037 already accepted.
- Holding surfaces open (D5) means this slice's four-surface contribution stays incomplete until forum P0/P1 land, even where the edge plumbing is ready. The wave gating in ADR-004 makes this explicit rather than hidden.

### Risks

- **Upstream slip.** If COM-13/F8 do not ship within the sprint's P2 window, WP-2 and WP-3's rendered surface stay `planned`/`scaffolded` and their canaries never fire. The structural response is the same as ADR-004's: an unfired canary registers the item as open, so a slip shows in the score rather than being papered over by a placeholder.
- **Mirror desync during the key split.** The window between editing `dreamlab.toml` and updating the auth-worker CF secret is a desync window. The mitigation is to land the change as one commit plus the operator's coordinated CF-secret rotation, with `admin-pubkeys-sync` as the backstop that refuses to deploy an inconsistent set.

## Reconciliation at the Canon

Per ADR-002 and ADR-004 Decision 7, each closed item updates the canon `docs/architecture/compatibility-matrix.md` at the tier its evidence supports, and this slice's canaries register against VisionClaw's `LivenessHarness` (RES-a). Where this ADR and the canon register disagree on wave, owner, or tier, the canon wins; where they disagree on local implementation (the overlay crate, the config schema, the CI job), this ADR wins.
