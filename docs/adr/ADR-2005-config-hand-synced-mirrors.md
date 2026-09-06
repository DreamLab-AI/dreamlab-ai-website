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

## Closeout extension — 2026-09-04

Work package: **CP-04/08**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

CI compares admin keys in authored TOML and relay/search wrangler config. Client keys, zones and the auth-worker secret have separate mirror/rotation obligations. The generator remains deferred.

**Acceptance condition:** Enumerate every mirror and compare effective values at release; exercise a rotation and denied old-key access. Either retain manual synchronisation with a reproducible check or adopt generation through a new decision.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented.** The mirror set is now enumerated and compared, which is the
precondition that makes the deferral defensible.

The previous CI job compared **one** mirror (the admin pubkey set, across the
relay and search wrangler configs). `scripts/lib/config-mirrors.mjs` now
enumerates **seven** mirrors over **20 sites** and compares effective values:

| Mirror | Sites |
|---|---|
| `admin-pubkeys` | `dreamlab.toml [admin]`, relay-worker, search-worker |
| `admin-pubkeys-auth-secret` | `set-worker-secrets.yml` push path + the CF secret (enumerated, `verifiable: false`) |
| `client-admin-pubkey` | `deploy.yml VITE_ADMIN_PUBKEY` vs the authored admin set |
| `agent-jarvis-pubkey` | `dreamlab.toml [[agents]]`, `deploy.yml VITE_JARVIS_PUBKEY`, BBS `__ENV__.JARVIS_PUBKEY` |
| `zone-model` | `dreamlab.toml [[zones]]`, `deploy.yml ZONE_CONFIG_JSON`, relay-worker, **auth-worker** |
| `relay-url` | `dreamlab.toml [relay].url`, `deploy.yml VITE_RELAY_URL` |
| `pod-base-url` | `dreamlab.toml [pod]`, `deploy.yml`, pod-worker, auth-worker |

**A live drift was found and fixed.** The auth-worker's `ZONE_CONFIG` was missing
`"kanban": true` on `zone3` and `zone4` while the authored TOML, `deploy.yml` and
the relay-worker all carried it — exactly the failure mode this ADR accepts the
risk of. `forum-config/deploy/auth-worker.wrangler.toml:69` is realigned to the
canonical projection; all four zone sites now agree byte-for-byte.

Two structural guards close the "unknown mirror" gap: a **completeness sweep**
fails the build when a governed key (`ADMIN_PUBKEYS`, `ZONE_CONFIG`,
`POD_BASE_URL`, `RELAY_URL`, `JARVIS_PUBKEY`) appears in any wrangler `[vars]`
block that no enumerated mirror covers; and a plaintext `ADMIN_PUBKEYS` in the
auth-worker `[vars]` is rejected because it would shadow (and can mask) the CF
secret. The inline Python in `ci.yml` is replaced by the job `config-mirrors`
calling `scripts/check-config-mirrors.mjs`, which also runs in the pre-deploy
gate. TOML is read by `scripts/lib/toml-lite.mjs`, a focused reader cross-checked
against Python `tomllib` over all six real config files with **zero differences**
(a CI gate must not be able to fail on a dependency fetch).

**Tests + results.** `scripts/__tests__/config-mirrors.test.mjs` — 22 tests, all
passing: a rotation landing in the TOML but not the relay worker; in the relay
but not the search worker; a client pubkey outside the authored admin set; an
agent pubkey rotated in the roster only; a zone added to the TOML but not
projected; the exact `kanban` drift above; a slug changed in one mirror; a relay
URL and a pod URL changed at one site; a masking plaintext secret; an
unenumerated governed key; and removal of the secret push path. Plus
`toml-lite` parser tests, including that it throws rather than mis-parsing an
unsupported value. **Browser receipt:** the deployed zone model was observed
identical on both runtime surfaces — forum `zone_slugs` `["welcome",
"minimoonoir", "family", "dreamlab"]` and BBS `zone_count: 4`
(`docs/estate-closeout/2026-09-05/browser-acceptance.json`, verdict
`zone_model_projected_identically: pass`).

**Remaining.** `implementation_status` stays **partial**: the O1/O2 single-source
generator is still deferred, and this pass makes the manual discipline
*checkable*, not unnecessary. Not closed: exercising a real rotation end to end,
and proving old-key access is denied — both need live workers. The auth-worker
`ADMIN_PUBKEYS` secret remains unreadable from CI by construction; it is now
enumerated and its push path asserted, but its **value** is still unverified.

**Governed paths changed.** `forum-config/deploy/auth-worker.wrangler.toml`,
`scripts/check-config-mirrors.mjs` (new), `scripts/lib/config-mirrors.mjs` (new),
`scripts/lib/toml-lite.mjs` (new), `.github/workflows/ci.yml`,
`.github/workflows/test-and-lint.yml`.
