---
title: "PRD: DreamLab Community Forum — Rust Port (Refined Delivery Plan)"
version: "2.1.0"
status: superseded
date: 2026-03-08
branch: rust-version
scope: community-forum + selected workers only
baseline: "v2.1.0 is the accepted delivery baseline (supersedes v2.0.0 execution model)"
---

> **STATUS: SUPERSEDED** — This document is superseded by `prd-rust-port-v4.0.md`. The TS→Rust migration completed on 2026-03-12. All 5 workers (auth, pod, preview, relay, search) and the forum client are now Rust. This document is retained for historical reference only.

# PRD: DreamLab Community Forum — Refined Rust Port Delivery Plan

[Back to Documentation Index](README.md)

## 1. Document Status and Intent

This document is a **proposed refactor** of the accepted Rust-port plan in
[`prd-rust-port.md`](./prd-rust-port.md).

It is intended to improve:

- delivery sequencing,
- plan reviewability,
- rollback design,
- documentation governance,
- and the relationship between PRD, ADR, and DDD artifacts.

Until this document is formally accepted, **v2.0.0 remains the execution
baseline**.

## 2. Why the Plan Needs a Refactor

The accepted v2.0.0 plan is technically strong, but it still combines several
concerns that are easier to manage when separated:

1. **Target architecture** and **delivery sequence** are mixed together.
2. The plan contains a hybrid validation gate, but the rewrite still reads as a
   mostly linear end-to-end programme.
3. The client migration is described largely by technical layer
   (`stores`, `components`, `routes`) rather than by **vertical user journeys**.
4. The documentation set does not clearly define how a changed PRD should
   affect accepted ADRs and derived DDD documents.
5. The current plan assumes forward progress toward Leptos, while the optimal
   outcome may be to stop after the hybrid phase if the ROI is already achieved.

This refinement keeps the core technical direction but makes the execution model
safer, more governable, and easier to review tranche by tranche.

## 3. Desired Outcome

The programme should deliver all of the following:

- measurable performance improvement on crypto and event-processing hot paths,
- reduced runtime complexity in the forum client,
- selective migration of Workers where Rust has clear ROI,
- a reversible migration path with explicit stop/go checkpoints,
- and a documentation model where accepted decisions are stable and derived
  documents only change after those decisions are settled.

## 4. Scope

### In Scope

- [`community-forum`](../community-forum) application migration strategy
- shared Rust core for Nostr protocol, crypto, and validation
- selective Worker migration for:
  - link-preview API
  - pod API
  - auth API
- benchmarking, canary rollout, and cutover planning
- documentation governance for PRD/ADR/DDD synchronization

### Explicitly Out of Scope

- root React/Vite marketing site in [`src`](../src)
- full Rust rewrite of the nostr relay Worker
- full Rust rewrite of the search API Worker
- a “Rust everywhere” mandate when mixed TS/Rust yields better ROI
- protocol changes to Nostr, WebAuthn PRF, or the Solid pod model

## 5. Planning Principles

1. **Hot path before shell replacement**
   - Performance-critical crypto and event handling must be proven before a full
     UI migration is authorized.

2. **Reversible increments**
   - Every tranche must end in a shippable state with a rollback path.

3. **Architecture freeze per tranche**
   - Architectural changes are accepted via ADRs, not silently folded into
     implementation work.

4. **Vertical slices over horizontal rewrites**
   - Once the client migration begins, delivery should proceed by end-user
     capability slices rather than “all stores, then all components, then all
     routes”.

5. **Evidence before commitment**
   - Benchmarks, canaries, and parity tests are mandatory entry criteria for the
     next tranche.

6. **DDD trails accepted decisions**
   - Domain documentation should reflect accepted architecture, not work-in-
     progress speculation.

## 6. Refined Delivery Model

The programme is restructured into **six tranches**.

### Tranche 0 — Planning Hardening and Evidence Baseline

**Duration**: ~1 week

**Goal**: make the programme governable before major build work begins.

**Outputs**:

- benchmark baseline for current SvelteKit crypto/event hot paths,
- route and feature parity matrix for the forum,
- worker ownership and rollout map,
- rollback/canary template,
- documentation governance ADR.

**Exit criteria**:

- baseline metrics captured and stored,
- parity matrix agreed,
- documentation sequencing agreed,
- responsibility owners assigned per workstream.

### Tranche 1 — Hybrid Validation in the Existing SvelteKit Forum

**Duration**: ~2 weeks

**Goal**: prove that Rust/WASM materially improves the real hotspot path.

**Outputs**:

- `nostr-core-wasm` bridge package,
- Rust/WASM replacement path for current crypto hot paths,
- JS vs Rust/WASM benchmark report,
- limited canary deployment.

**Entry criteria**:

- Tranche 0 baseline is complete,
- `nostr-core` compiles for native and `wasm32-unknown-unknown`.

**Exit criteria**:

- current forum works with Rust/WASM crypto on core paths,
- benchmark evidence is available,
- production canary shows no unacceptable error regression.

**Stop / re-scope conditions**:

- crypto speedup below minimum threshold,
- WASM load instability above threshold,
- operational complexity outweighs observed gain.

**Important rule**: “Stop after hybrid” is a valid success outcome if it
delivers the required value with lower execution risk.

### Tranche 2 — Shared Rust Core and Low-Risk Worker Ports

**Duration**: ~3–4 weeks

**Goal**: port the parts of the backend with the best risk-adjusted return.

**Scope**:

- finalize `nostr-core` shared crate,
- port preview-worker,
- port pod-worker,
- establish mixed Rust + TypeScript Worker deploy pipeline.

**Exit criteria**:

- preview and pod Workers are healthy in production or canary,
- CI/CD supports Rust and TypeScript Worker deployment in parallel,
- no regression in pod ACL behavior, media upload, or preview safety checks.

### Tranche 3 — Auth Boundary Migration

**Duration**: ~2–3 weeks

**Goal**: migrate the most security-sensitive worker only after the shared core
and low-risk workers have proven out.

**Scope**:

- auth-worker using `passkey-rs`,
- PRF salt lifecycle,
- NIP-98 verification through shared Rust code,
- credential/challenge persistence parity,
- pod provisioning parity.

**Exit criteria**:

- passkey registration/login e2e passes,
- NIP-98 protected admin flows still work,
- replay/counter protections are regression-tested,
- rollback to TS auth worker is still available.

### Tranche 4 — Client Migration by Vertical Slice

**Duration**: ~4–6 weeks

**Goal**: replace the forum client in slices that map to user value.

#### Vertical Slice Model

| Slice | Primary user value | Main concerns |
|------|---------------------|---------------|
| A | Authentication shell | boot, session, passkey/NIP-07/local-key |
| B | Read-only forum browse | routing, zone/section access, channel discovery |
| C | Channel messaging | messages, replies, reactions, pinned state |
| D | DMs, search, offline | NIP-44/59, search, IndexedDB, sync |
| E | Admin and calendar | whitelist, approvals, stats, section/calendar workflows |

**Why this is better**:

- Each slice is testable end to end.
- Partial completion can be demonstrated to stakeholders.
- The programme can pause after any slice without leaving a half-ported shell.
- Reviewers can judge value, not just technical completeness.

**Exit criteria**:

- each slice is demoable,
- each slice has passing route-level tests,
- each slice has parity notes against the old client.

### Tranche 5 — UI Completion, Cutover, and Decommissioning

**Duration**: ~2–3 weeks

**Goal**: perform controlled cutover, not a single irreversible swap.

**Scope**:

- route-by-route or cohort-based canary release,
- bundle-size optimization,
- security audit,
- decommission plan for superseded SvelteKit forum code,
- final documentation synchronization.

**Exit criteria**:

- final canary succeeds,
- rollback rehearsed,
- accepted docs updated,
- superseded implementation archived cleanly.

## 7. Progress Tracker

| Tranche | Status | Summary |
|---------|--------|---------|
| 0 — Planning Hardening | COMPLETE | Benchmarks baselined, parity matrix built, WASM bridge validated |
| 1 — Hybrid Validation | COMPLETE | JS vs WASM benchmarks confirm >3x speedup on crypto hot paths |
| 2 — Core + Low-Risk Workers | COMPLETE | nostr-core finalized (73 tests), preview-worker (35 tests), pod-worker (22 tests), mixed deploy pipeline operational |
| 3 — Auth Boundary | COMPLETE | auth-worker (WebAuthn register/login, NIP-98, pod provisioning, cron keep-warm), relay-worker (NIP-01 WebSocket DO relay, NIP-11/16/33, whitelist API) |
| 4 — Client by Vertical Slice | IN PROGRESS | Slice A (auth shell) and Slice B (channel browse) under active development in forum-client crate |
| 5 — Cutover + Decommission | NOT STARTED | Blocked on Tranche 4 completion |

**Total**: 130 workspace tests, ~7,800 lines of Rust across 6 crates.

**Scope note**: The relay-worker was listed as "Explicitly Out of Scope" in section 4
but was ported during Tranche 3 because the Durable Object relay implementation was
straightforward and shared significant NIP-01/NIP-98 validation code with nostr-core.
This scope expansion was a pragmatic decision — the relay-worker was low-risk given the
existing shared crate infrastructure, and porting it alongside auth-worker avoided
duplicating NIP verification logic in TypeScript. The "Explicitly Out of Scope" listing
in section 4 is retained for historical accuracy; this tracker reflects actual delivery.

## 8. Work Packages and Ownership Model

| Workstream | Primary ownership | Core output |
|-----------|-------------------|-------------|
| Protocol/Core | Rust platform | `nostr-core`, validation, crypto, shared types |
| Worker Ports | Platform/backend | preview, pod, auth workers |
| Client Platform | Frontend/Rust WASM | Leptos shell, routing, state model |
| Auth & Identity | Security/auth | passkey PRF, NIP-98, session integrity |
| Quality | QE/platform | benchmarks, property tests, e2e, canary checks |
| Release & Docs | Tech lead + product | PRD/ADR/DDD sync, cutover notes, rollback plan |

Each workstream must expose:

- explicit owner,
- tranche entry criteria,
- tranche exit criteria,
- rollback instructions,
- and architecture delta notes.

## 9. Go / No-Go and Kill Criteria

| Condition | Continue | Stop / Re-scope |
|----------|----------|-----------------|
| Hybrid crypto speedup | `>3x` preferred, `>2x` minimum | `<2x` with no compensating reliability win |
| Canary error rate | `<0.1%` | `>0.5%` sustained |
| WASM load failure rate | `<0.01%` | `>0.1%` sustained |
| Auth parity | Registration + login + NIP-98 all green | PRF/auth regressions unresolved |
| Bundle size | initial forum payload `<2MB gzipped` | `>3MB gzipped` without mitigation path |
| Route parity | critical routes green per slice | critical user journeys blocked |

## 10. Success Metrics

### Technical Metrics

| Metric | Target |
|--------|--------|
| NIP-44 encrypt/decrypt | `<0.5ms` or `>3x` improvement |
| 10K event parse | `<20ms` |
| Relay management complexity | Replace bespoke reconnect state with pooled abstraction |
| Initial Rust client bundle | `<2MB gzipped` |

### Delivery Metrics

| Metric | Target |
|--------|--------|
| Critical route parity | `14/14` routes validated |
| Worker migration scope | `3/3` selected workers complete |
| E2E pass rate | `>95%` |
| Rollback tested | yes, per tranche |

### Operational Metrics

| Metric | Target |
|--------|--------|
| Security audit | No CRITICAL or HIGH findings |
| Canary regression window | stable for 48h before expansion |
| Documentation drift | zero known PRD/ADR/DDD contradictions at cutover |

## 11. Documentation Governance

The documentation set should follow these rules:

1. **PRDs are versioned planning artifacts**
   - major planning changes produce a new versioned PRD,
   - the currently accepted PRD remains the baseline until replaced.

2. **Accepted ADRs are immutable**
   - changes are introduced through superseding ADRs,
   - not through in-place rewriting of accepted architecture decisions.

3. **DDD is derived, not co-equal governance**
   - it updates after the plan and architecture are accepted,
   - not in the same review that changes those decisions.

4. **One change set, one governance purpose**
   - planning changes,
   - architecture decisions,
   - and domain-model synchronization
   should be reviewable as distinct activities even if they land near each other.

## 12. Immediate Recommendations

1. Treat `v2.0.0` as the accepted delivery baseline until `v2.1.0` is approved.
2. Accept a planning-governance ADR before making deeper architectural edits.
3. Build and maintain a **route parity matrix** and a **feature parity matrix**.
4. Treat “stop after hybrid validation” as an explicitly valid programme exit.
5. Port the client by **vertical slice**, not only by store/component layer.
6. Require a rollback note and cutover note for every production-affecting tranche.
7. Update DDD only after any new architecture ADRs are accepted.

## 13. Approval and Supersession

This PRD supersedes [`prd-rust-port.md`](./prd-rust-port.md) **only if it is
accepted**.

Recommended approval path:

1. review and accept the planning-governance ADR,
2. approve this PRD revision,
3. decide whether any architecture ADRs need supersession,
4. then synchronize the DDD set.

## 14. References

- [Accepted baseline: PRD v2.0.0](./prd-rust-port.md)
- [ADR-013: Rust/Leptos 0.7 as Forum UI Framework](./adr/013-rust-leptos-forum-framework.md)
- [ADR-014: Hybrid Validation Phase Before Full Rewrite](./adr/014-hybrid-validation-phase.md)
- [ADR-015: Selective Workers Port Strategy](./adr/015-workers-port-strategy.md)
- [ADR-016: nostr-sdk 0.44.x as Nostr Protocol Layer](./adr/016-nostr-sdk-protocol-layer.md)
- [ADR-017: passkey-rs for WebAuthn/FIDO2 with PRF Extension](./adr/017-passkey-rs-webauthn-prf.md)
- [ADR-018: Testing Strategy for Rust Port](./adr/018-testing-strategy-rust-port.md)
