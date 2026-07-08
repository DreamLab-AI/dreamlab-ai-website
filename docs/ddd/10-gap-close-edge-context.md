# DDD: Gap-Close Edge Bounded Context

**Status:** Living document
**Date:** 2026-07-08
**Scope:** DreamLab Edge's slice of the cross-repository gap-close sprint
**Governed by:** [Child PRD Gap-Close Edge](../prd/prd-gap-close-edge-v1.0.md), [ADR-040 Gap-Close Edge Decisions](../adr/040-gap-close-edge-decisions.md)
**Conformist to:** [DDD Gap-Close Context](../../../VisionFlow/docs/DDD-gap-close-context.md), [DDD Ecosystem Alignment], forum context (nostr-rust-forum)

---

## 1. Bounded Context

The Gap-Close Edge context governs how the DreamLab branded deployment consumes the `nostr-rust-forum` kit and makes its own configuration legible. It owns the deployment's relationship to the kit — the pin, the overlay, the roster config, the compatibility record — and nothing about the forum protocol itself. It is a downstream consumer in every direction: it conforms to the Gap-Close closure protocol, conforms to the Ecosystem Alignment maturity vocabulary, and consumes the forum context's shipped components as a customer.

This context adds no aggregate to the forum or broker models. A disclosure badge, an Agents tab, a governance kind (31400-31405) are forum concepts; here they appear only as surfaces this deployment renders by consuming the kit. The context's own vocabulary is the deployment's: which kit SHA runs, which principal authorised which agent, whether a surface is consumed or reimplemented.

---

## 2. Context Map

| Context | Relationship | Notes |
|---|---|---|
| **Gap-Close Edge** (this context) | Coordinates the edge slice's closures | Owns the deployment-to-kit relationship, not the forum |
| **Gap-Close Sprint** ([DDD](../../../VisionFlow/docs/DDD-gap-close-context.md), [ADR-004](../../../VisionFlow/docs/ADR-004-gap-close-sprint-governance.md)) | Upstream | Owns the register-to-closure lifecycle, the canary protocol, the maturity vocabulary this context obeys |
| **Ecosystem Alignment** ([ADR-002]) | Upstream | Owns the seven-tier maturity vocabulary and the compatibility-matrix machinery |
| **Forum** (nostr-rust-forum) | Upstream (Supplier) | Ships the disclosure badge (COM-13), the Agents tab (F8), the governance endpoints; this context consumes them |

### Relationship types

- **Gap-Close Sprint → Gap-Close Edge:** Customer/Supplier. This context supplies a `RepoWorkPackage`, its falsification statements, and its closure evidence; it obeys the falsification, receipt and canary protocol.
- **Ecosystem Alignment → Gap-Close Edge:** Conformist. Maturity tiers and the compatibility record follow ADR-002 verbatim.
- **Forum → Gap-Close Edge:** Customer/Supplier. The edge is the customer; the kit is the supplier. The edge consumes the kit's shipped components and never reimplements them (ADR-040 D1).

---

## 3. Aggregates

| Aggregate | Root | Description |
|---|---|---|
| `EdgeDeployment` | Yes (context root) | One branded production deployment (today: `dreamlab-ai.com`). Holds its pinned `KitPin`, the injected `window.__ENV__` overlay, and the set of `OverlaySurface`s it renders. Consistency boundary: the pin, the deployed bundle, and the compatibility record are reconciled together. |
| `RosterConfig` | Yes | `forum-config/dreamlab.toml` as the authored config source of truth (ADR-037). Holds `[admin].static_pubkeys`, `[governance].agent_pubkeys`, and the `[[agents]]` roster. Consistency boundary: no identity is dual-listed as admin and governance publisher, and the admin set stays consistent with its CF-secret mirrors. |
| `KitPin` | No (member of `EdgeDeployment`) | The forum-kit SHA and its pin sites: four `rev=` in `forum-config/Cargo.toml`, three `KIT_REF` in the deploy/workers/rust-ci workflows, and the durable compatibility record. |
| `OverlaySurface` | No (member of `EdgeDeployment`) | A kit-owned rendered surface (disclosure badge, Agents tab) the deployment consumes via env injection. Carries a `consumed`/`reimplemented` flag; `reimplemented` is an invariant violation. |
| `RosterAgent` | No (member of `RosterConfig`) | One `[[agents]]` entry: `label`, `pubkey`, `role`, `cohorts`, and (this sprint) `authorised_by`. |
| `EdgeClosureEvidence` | No (member of the `RepoWorkPackage`) | The receipt (command, raw output, timestamp, git SHA), the maturity claim, and the canary result for one closed edge item. |

---

## 4. Entities

| Entity | Identity | Owner |
|---|---|---|
| `EdgeDeployment` | Deployment host (`dreamlab-ai.com`) | DreamLab Edge |
| `KitPin` | Forum-kit SHA (`a149da4…`) | DreamLab Edge (pin), forum (source) |
| `RosterAgent` | Agent pubkey | RosterConfig (DreamLab Edge) |
| `AuthorisingPrincipal` | Principal pubkey or label | RosterConfig (DreamLab Edge) |
| `OverlaySurface` | Surface name (disclosure badge, Agents tab) | Forum (component), DreamLab Edge (consumption) |
| `LivenessCanary` | Canary ID (`CANARY-EDGE-*`) | VisionClaw (harness), DreamLab Edge (registration) |

---

## 5. Value Objects

| Value object | Fields | Notes |
|---|---|---|
| `MaturityTier` | historical, planned, scaffolded, standalone, integrated, federation-verified, released | ADR-002 vocabulary, verbatim. The edge ceiling is `integrated`: a consumer carries no cross-substrate loop of its own to reach `federation-verified`. |
| `ConsumptionState` | consumed, reimplemented | An `OverlaySurface` is valid only when `consumed`. `reimplemented` is the D5-style violation. |
| `PinLockstep` | {four Cargo revs, three KIT_REFs, one record SHA} | All must resolve to the same forum-kit SHA; `ci.yml` `pin-check` enforces it. |
| `AuthorityBinding` | {agent pubkey → authorising principal} | Explicit in `dreamlab.toml`, never inferred from cohort or role (ADR-040 D4). |
| `ExitCriterion` | Predicate over the live deployment | The observable condition that closes an item; carried from the child PRD acceptance criteria. |
| `FalsificationStatement` | Predicate whose truth means *not done* | Authored before the work, per work package. |

---

## 6. Domain Events

| Event | Trigger | Publisher | Consumer |
|---|---|---|---|
| `WorkPackageMinted` | This slice's child PRD/ADR/DDD authored | DreamLab Edge | Gap-Close Sprint context |
| `CanaryRegistered` | An edge item registers a `CANARY-EDGE-*` against the harness | DreamLab Edge | SprintWave, `LivenessHarness` |
| `KitPinRecorded` | The compatibility record cites the deployed SHA | DreamLab Edge | `EdgeDeployment`, canon compatibility matrix |
| `KeySplitApplied` | visionclaw-server key moved to `[governance]` only, mirrors reconciled | DreamLab Edge | `RosterConfig`, `admin-pubkeys-sync` |
| `SurfaceConsumed` | An `OverlaySurface` renders from the kit component | DreamLab Edge | `CANARY-EDGE-DISCLOSURE`/`CANARY-EDGE-ROSTER` |
| `DisclosureBadgeShipped` | Forum ships COM-13/F8 component | Forum (upstream) | `EdgeDeployment` (reacts by enabling the overlay) |
| `CanaryFired` | A `CANARY-EDGE-*` observes live traffic on its wire | `LivenessHarness` | SprintWave, `EdgeClosureEvidence` |
| `ClosureEvidenced` | Receipt + maturity claim + canary result recorded for an edge item | DreamLab Edge | Anti-fox verifier |

---

## 7. Invariants

1. **No local reimplementation of a kit-owned surface.** Every `OverlaySurface` is `consumed`, never `reimplemented`. A non-zero grep for a kit-owned surface under `src/` or `forum-config/src/` is a violation and blocks `CANARY-EDGE-KIT` (ADR-040 D1).

2. **One config source of truth.** Authority and roster live only in `dreamlab.toml`, loaded via `nostr_bbs_config::load_from_path`. A second authored copy violates ADR-037 and the `admin-pubkeys-sync` check.

3. **Pin lockstep.** The four Cargo revs, the three `KIT_REF`s, and the compatibility record's cited SHA resolve to one forum-kit SHA. Divergence fails `ci.yml` `pin-check` (ADR-038).

4. **Authority is explicit, never inferred.** A `RosterAgent`'s authorising principal is an `authorised_by` datum in `dreamlab.toml`, not derived from `cohorts` or `role` (ADR-040 D4).

5. **No identity is dual-listed as admin and governance publisher.** The visionclaw-server key appears only in `[governance].agent_pubkeys` after the key split; listing it in `[admin].static_pubkeys` as well is a violation the roster surface must not render (ADR-040 D3).

6. **No canary, no closure.** A loop-closing edge item closed without its `CANARY-EDGE-*` having fired in a live session is not closed. Items gated on upstream (`CANARY-EDGE-DISCLOSURE`, `CANARY-EDGE-ROSTER` render sub-item) stay open until the forum ships COM-13/F8.

7. **Maturity claimed conservatively.** The edge ceiling is `integrated`. A surface gated on an unshipped kit component is `planned` or `scaffolded`, labelled, never folded into a closed parent (Gap-Close Invariant 6).

8. **The child does not re-scope its own slice.** Wave and owner movement is a canon-register edit; a slipped upstream dependency is raised at the canon, not resolved by moving this slice's wave (ADR-004 Decision 7).

---

## 8. Ubiquitous Language

| Term | Meaning |
|---|---|
| **Kit** | The `nostr-rust-forum` package consumed by this deployment; the forum source lives upstream, not here. |
| **Kit Pin** | The forum-kit SHA and its seven pin sites (four Cargo revs, three workflow `KIT_REF`s) plus the compatibility record. |
| **Thin Consumer** | A deployment that renders forum surfaces by consuming the kit's components, adding only branding and operator config, reimplementing nothing. |
| **Overlay Surface** | A kit-owned rendered surface (disclosure badge, Agents tab) the branded deployment shows via `window.__ENV__` injection. |
| **Overlay** | The DreamLab-specific branding and operator configuration injected at deploy time; distinct from the forum logic, which is the kit's. |
| **Authorising Principal** | The pubkey or label that authorised a `RosterAgent`, stated in `dreamlab.toml` `authorised_by`. |
| **Roster Legibility** | The property that the config states which principal authorised each agent, with no identity dual-listed as admin and governance publisher. |
| **Compatibility Record** | The git-tracked statement of which forum-kit SHA each production deployment runs, at which maturity tier. |
| **Liveness Canary** | A `CANARY-EDGE-*` probe that must observe live traffic on a wired loop before that loop is closed. |

---

## 9. Ownership Summary

| Owns in this context | Does not own |
|---|---|
| `EdgeDeployment`, `KitPin`, `RosterConfig`, the overlay, the compatibility record, the config schema (`authorised_by`), the CI pin/authority checks | The disclosure-badge component, the Agents-tab component, the nine governance endpoints, the forum protocol, any Nostr kind definition — all forum-owned |

The edge is a consumer, not an owner (Gap-Close DDD ownership summary). It supplies a work package and its evidence; it renders surfaces the forum ships.

---

## 10. Open Issues

1. **Canary durability for the pin.** Whether `CANARY-EDGE-KIT`/`CANARY-EDGE-KITPIN` must remain green as a standing monitor (the pin cannot drift post-deploy) or firing once at deploy suffices. Default: the pin canaries are standing (`ci.yml` runs them every build); the render canaries fire once per live session and re-fire on kit bump.
2. **Second-deployment schema.** The compatibility record admits a second deployment row, but the trigger to populate it (a second brand going live) is not yet dated. Default: the schema exists; the row is added when the deployment exists.
3. **Key-split sequencing with the operator CF secret.** The atomic key split (ADR-040 D3) spans a git commit and an operator-managed CF-secret rotation. The exact ordering that keeps `admin-pubkeys-sync` green through the transition is fixed in the WP-3 execution receipt, not here.
