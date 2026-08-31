# ADR-038: Kit-Ref Pin Governance — KIT_REF Lockstep and Advancement Policy

## Status: Accepted

## Date: 2026-06-11

## Context

The forum surfaces are built from the upstream `nostr-rust-forum` kit at a pinned
revision. That pin appears in four places that must agree:

- `forum-config/Cargo.toml` — the `rev = "..."` on the `nostr-bbs-{core,config,mesh,rate-limit}`
  git dependencies (and recorded in `Cargo.lock`);
- `.github/workflows/rust-ci.yml` — `KIT_REF`, the rev the kit's own worker tests
  run against;
- `.github/workflows/deploy.yml` — `KIT_REF`, the rev the Pages/site deploy
  checks out;
- `.github/workflows/workers-deploy.yml` — `KIT_REF`, the rev the worker deploy
  builds and ships.

Anomaly R2 in
[the forum overlay anomaly register](../architecture/00-forum-overlay-anomaly-register.md)
caught the failure mode this invariant guards against: `rust-ci.yml` had pinned
`KIT_REF: 'main'` while both deploy workflows pinned `25ca8a1`. CI was therefore
testing a *different* kit than production deployed — exactly the drift
`workers-deploy.yml`'s own comment warned against. R2 was resolved by pinning
rust-ci to the deploy SHA with a lockstep comment. Current state (verified
2026-06-11): all four carry `25ca8a1` (`Cargo.toml` short form;
`25ca8a11e199ced9b1be4a4fb0601239e31aff54` full form in the three workflows).

This is the consumer side of the kit's own semantic-versioning ADR. The kit is on
the `1.0.0-beta.2` line and an upstream `1.0.0-beta.3` bump is anticipated; a
breaking kit bump must be adopted deliberately, not absorbed silently.

## Decision

Establish the kit-ref pin as a governed lockstep invariant.

1. **Lockstep invariant.** The four pin sites — `forum-config/Cargo.toml`
   (`rev`), `rust-ci.yml`, `deploy.yml`, `workers-deploy.yml` (`KIT_REF`) — MUST
   reference the **same** kit commit. `Cargo.lock` must reflect that rev. A
   change to any one without the others is a defect (this is R2's regression
   guard).

2. **rust-ci runs on the pinned SHA, not on `main`.** The kit's worker tests in
   `rust-ci.yml` check out `KIT_REF` (detached at the pinned SHA), so CI tests
   the exact kit that production deploys. rust-ci MUST NOT float on `main`. The
   `forum-config` overlay crate is auto-gated; the kit worker crates are tested
   against the pin (note: rust-ci is `workflow_dispatch`-only today — anomaly O5
   — so the kit-worker tests run on demand against the pin rather than on every
   push; advancing the pin SHOULD trigger that run).

3. **Who advances the pin.** Advancing `KIT_REF` is an operator/maintainer
   action (see [`MAINTAINERS.md`](../../MAINTAINERS.md)), not an automated
   dependency bump. The advancing maintainer updates all four sites and
   `Cargo.lock` in one change, and records the new rev in the deploy summary
   (`workers-deploy.yml` already emits `**Kit**: nostr-rust-forum@${KIT_REF}`).

4. **Pin-advance procedure.**
   1. Choose the target upstream commit; read its changelog/ADRs for breaking
      changes.
   2. Update the `rev` in `forum-config/Cargo.toml` and refresh `Cargo.lock`.
   3. Update `KIT_REF` in all three workflows to the **full 40-char SHA** (the
      workflows use the long form; `Cargo.toml` may use the short form, but they
      must denote the same commit).
   4. Run rust-ci (`workflow_dispatch`) against the new pin; the kit worker tests
      and the overlay crate must pass.
   5. Refresh the `forum-config/Cargo.toml` header comment and
      `forum-config/README.md` rev references so prose matches the pin (R3 was a
      header-comment lie about the rev — keep prose truthful).
   6. Deploy.

5. **Adopting a breaking kit bump (e.g. `1.0.0-beta.3`).** A breaking bump is
   adopted as its own change, not folded into an unrelated PR. Before advancing
   the pin: audit the kit's removed/renamed surface against the overlay
   (`forum-config/src/workers.rs` shims, the wrangler `[vars]` the kit consumes,
   the migration schema in `001_init.sql`). The `nip26.rs`/`nip90.rs` removal
   that drove [ADR-036](036-agent-delegation-via-device-keys.md) is the
   archetype: a kit deletion can invalidate a downstream ADR, so a breaking bump
   triggers an ADR-impact pass, not just a build.

## Consequences

### Positive

- The R2 drift (CI testing a different kit than prod) cannot recur silently: the
  four-site lockstep is the recorded invariant and rust-ci binds to the pin.
- Pin advancement is a deliberate, documented, single-change operation with a
  CI gate and an ADR-impact check — breaking kit bumps cannot creep in.
- The §13 canonical-source pointer ([ADR-035](035-agpl-combined-work-licensing.md))
  stays truthful because the pin it names is governed.

### Negative / Trade-offs

- Manual four-site updates are easy to do incompletely; a CI assertion that the
  four pins are byte-equal (short-vs-long-form normalised) would harden this and
  is recommended follow-up.
- rust-ci being `workflow_dispatch`-only (O5) means the pin's kit-worker tests do
  not auto-run on every overlay change; advancing the pin relies on the
  maintainer triggering the run.

### Neutral

- No workflow or `forum-config` file is changed by this ADR; it records the
  invariant the audit already enforced (R2 fix) and the advancement policy.

## Related Decisions

- [ADR-035](035-agpl-combined-work-licensing.md): the pinned rev is the AGPL §13
  canonical-source pointer — governed here.
- [ADR-037](037-config-single-source-of-truth.md): the sibling deploy-pipeline
  invariant (config single-source); same "one source, CI-enforced" discipline.
- [ADR-036](036-agent-delegation-via-device-keys.md): the worked example of a kit
  deletion invalidating a downstream ADR — why breaking bumps need an ADR-impact pass.

## References

- [Forum overlay anomaly register, R2/R3/O5](../architecture/00-forum-overlay-anomaly-register.md)
- `forum-config/Cargo.toml`, `forum-config/Cargo.lock`
- `.github/workflows/rust-ci.yml`, `deploy.yml`, `workers-deploy.yml`
- [`MAINTAINERS.md`](../../MAINTAINERS.md)
- upstream `nostr-rust-forum` semantic-versioning ADR
