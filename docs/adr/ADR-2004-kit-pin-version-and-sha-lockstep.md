---
id: ADR-2004
title: Pin the upstream kit by crates.io version and git SHA moved in lockstep
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: any kit bump (nostr-bbs-* version change or KIT_REF change)
repo: dreamlab-ai-website
domain: BASELINE-architecture.md
lineage: distils legacy 038-kit-ref-pin-governance (the 2026-06-15 forum-wipe post-mortem) and 014-hybrid-validation-phase.
---

# ADR-2004 — Pin the upstream kit by crates.io version and git SHA moved in lockstep

## Context

This repo is a thin operator overlay: forum client, workers, and Nostr crates all
live upstream in `nostr-rust-forum`. A single pin (git rev only, or version only)
would be simpler. It was rejected after a skewed client/worker pair wiped the
forum on 2026-06-15 (legacy ADR-038).

## Decision

Two coupled pins govern the kit and **must move together**: the config crates are
consumed from crates.io with a version requirement `nostr-bbs-{core,config,mesh,rate-limit}
= "1.0.0-beta.9"` (`forum-config/Cargo.toml:49-52`), while the client and workers
are built by cloning the kit at the git SHA
`KIT_REF = a7544687b4d1c09807862d749b27f8c8da307a12`, held **identically** in
`deploy.yml:98` and `workers-deploy.yml:44`. `workers-deploy.yml` is triggered on
changes to `forum-config/Cargo.lock` and its own `KIT_REF`
(`workers-deploy.yml:10-19`) precisely so a re-pin cannot ship a new client against
workers built from an older kit.

## Consequences

- Forecloses a lone pin: a version bump that forgets `KIT_REF` (or vice-versa) is
  the documented forum-wipe failure mode, so the lockstep is an invariant, not a
  convenience.
- A kit bump is a multi-file atomic change (Cargo.{toml,lock} + both `KIT_REF`s)
  and the operator must confirm `workers-deploy.yml` actually fires.
- Stale in-repo comments (`Cargo.toml:21` "beta.6", `workers-deploy.yml:36`
  "rc11") do not track the real pin (beta.9); the code lines, not the prose, are
  authority.

## Verification

At `dc06748`: `grep -n "1.0.0-beta.9" forum-config/Cargo.toml` = lines 49-52;
`grep -rn "KIT_REF: 'a7544687" .github/workflows/` shows the identical SHA in both
workflows; `workers-deploy.yml:10-19` shows the `Cargo.lock`/`KIT_REF` path filter.
Lockstep rule is `BASELINE-architecture.md` Invariant 1.

## Closeout extension — 2026-09-04

Work package: **CP-01/08**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

Local pin parity passes for three workflow SHAs, four manifest requirements and compatibility markers. Requirements are version ranges without an exact equals prefix; parity does not inspect resolved lockfile packages.

**Acceptance condition:** Bind resolved package versions/checksums and source SHA in a release receipt; reject deliberately inconsistent pins and block client publication until compatible worker deployment is evidenced.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented.** The two named defects are closed in source.

*Requirements were ranges, not exact pins.* `forum-config/Cargo.toml:49-52` now
pins all four kit crates with an exact `=` requirement (`= "=1.0.0-beta.9"`).
`cargo metadata --offline` resolves unchanged and `forum-config/Cargo.lock` is
byte-identical, so this tightens the constraint without moving the build.

*Parity did not inspect the lockfile.* `scripts/lib/pin-parity.mjs` now reads the
**resolved version and crates.io registry checksum** of every kit crate from
`Cargo.lock` and compares them against a new release receipt in
`docs/architecture/kit-compatibility-record.md` (block `pin-check:resolved-packages`,
four `RESOLVED <crate> <version> <sha256>` lines, regenerable with
`node scripts/pin-parity.mjs --print-resolved`). The gate now fails on: a floating
requirement, a manifest pin that disagrees with the lockfile, a resolved version
that disagrees with `CANONICAL_KIT_VERSION`, a checksum that disagrees with the
receipt, a crate swapped off the registry to a git/path source, and a crate
present in one of manifest/lockfile/record but missing from another.

*Two independent copies of the logic.* There is now one implementation.
`.github/workflows/ci.yml` (job `pin-check`) and `scripts/pin-parity-check.sh`
both `exec node scripts/pin-parity.mjs`; the ~40 lines of check logic previously
inlined in the workflow are gone. The shell wrapper stays quote-free for the
dream-cycle evaluator and still emits `PIN-PARITY-OK` / `PIN-DRIFT`.

*Actions were tag-pinned.* All 36 tag-pinned `uses:` across the seven workflows
are now full 40-hex commit SHAs with the resolved version in a trailing comment
(`actions/checkout@11d5960a…` v4.4.0, `actions/setup-node@49933ea5…` v4.4.0,
`actions/cache@0057852b…` v4.3.0, `actions/github-script@f28e40c7…` v7.1.0;
resolved via `gh api`). `checkActionPins` sweeps every workflow and fails the
build on any non-SHA `uses:`, so a tag pin cannot be reintroduced.

**Tests + results.** `scripts/__tests__/pin-parity.test.mjs` — 19 tests, all
passing. Each drift case builds a fixture repository from the live governed files
and corrupts exactly one fact, so a weakened check surfaces as a test that stops
failing: differing `KIT_REF` across workflows; `KIT_REF` diverging from the
record; a bare requirement; a caret requirement; a manifest pin disagreeing with
the lockfile; a mutated checksum; a version disagreeing with
`CANONICAL_KIT_VERSION`; a crate moved to a git source; a missing `RESOLVED`
line; a missing record; and a reintroduced `@v4` tag pin. Full suite: 191 vitest
tests pass; `cargo test --manifest-path forum-config/Cargo.toml` 21 tests pass.

**Remaining.** Publication-blocking on evidenced worker compatibility is only
partly closed: the gate now blocks the client deploy on pin parity, but the
"client publication blocked until a compatible worker deployment is evidenced"
half still rests on `workers-deploy.yml`'s path trigger rather than a checked
cross-workflow assertion. Live worker deployment and the crates.io publication
provenance remain unexercised here.

**Governed paths changed.** `forum-config/Cargo.toml`,
`docs/architecture/kit-compatibility-record.md`, `scripts/pin-parity.mjs` (new),
`scripts/lib/pin-parity.mjs` (new), `scripts/pin-parity-check.sh`,
`.github/workflows/{ci,deploy,workers-deploy,rust-ci,test-and-lint,docs-update}.yml`.
