---
id: ADR-2005
title: Accept hand-synced config mirrors; defer the single-source generator
date: 2026-08-31
decision_status: accepted
implementation_status: partial
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: a pubkey/zone rotation that proves too error-prone, or shipping the O1/O2 config generator
repo: dreamlab-ai-website
domain: BASELINE-architecture.md
lineage: distils legacy 037-config-single-source-of-truth (whose single-source claim is unmet) and 040-gap-close-edge-decisions O1/O2/O3.
---

# ADR-2005 — Accept hand-synced config mirrors; defer the single-source generator

## Context

Legacy ADR-037 declared `forum-config/dreamlab.toml` the single source of truth
for admin/agent pubkeys and zone config, to be projected by a generator. Only the
O3 fail-closed KV guard shipped; the O1/O2 generator did not. Building it now is
deferred work — but the deferral itself constrains every rotation today.

## Decision

The authored source remains `forum-config/dreamlab.toml`, but `VITE_ADMIN_PUBKEY`,
`VITE_JARVIS_PUBKEY`, and `ZONE_CONFIG_JSON` in the deploy workflow are **accepted
as hand-synced mirrors, not generated** — the workflow says so in-line
(`deploy.yml:56` "these are HAND-SYNCED mirrors, not generated";
values at `:65,:66,:75`). Any pubkey or zone rotation is therefore a deliberate
multi-location manual edit that must touch `dreamlab.toml` **and** every mirror in
`deploy.yml` in the same change. The single-source generator is not scheduled.

## Consequences

- Forecloses treating the TOML as authoritative in isolation: CI reads the mirror,
  so a rotation that updates only the TOML ships stale keys/zones to the client.
- Every rotation carries desync risk; the mirror set is an invariant that review
  must check by hand until the generator lands.
- Cost deferred, not paid: no generator to build/maintain now, at the price of
  ongoing manual discipline (this is the constraining part of the deferral).

## Verification

At `dc06748`: `grep -n "HAND-SYNCED\|VITE_ADMIN_PUBKEY\|VITE_JARVIS_PUBKEY\|ZONE_CONFIG_JSON" .github/workflows/deploy.yml` shows the mirror comment at `:56` and
the three mirrored values at `:65,:66,:75`, matching `dreamlab.toml` `[admin]`,
`[[agents]]`, and `[[zones]]`. Divergence and invariant in
`BASELINE-architecture.md` §Known divergences (config hand-synced) and
`IDENTITY-zones.md` Invariant 5.
