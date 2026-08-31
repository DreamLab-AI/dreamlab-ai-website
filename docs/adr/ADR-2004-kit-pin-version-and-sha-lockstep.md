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
consumed from crates.io at a fixed version `nostr-bbs-{core,config,mesh,rate-limit}
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
