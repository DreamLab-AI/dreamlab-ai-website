---
id: ADR-2007
title: Gate access with four zones on dual-accept cohorts and a single encrypted zone
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: migrating legacy slug grants (dropping the dual-accept arm), or changing which zones are encrypted
repo: dreamlab-ai-website
domain: IDENTITY-zones.md
lineage: distils legacy 022-nip29-group-access-model, 033-multi-admin-moderation-architecture, 026-forum-professionalisation.
---

# ADR-2007 — Gate access with four zones on dual-accept cohorts and a single encrypted zone

## Context

Access could gate on a single cohort key per zone. It does not: a 2026-07-20
regression showed that pre-ALIGN grants were keyed in D1 on the legacy **slug**,
not the generic zone id, so a single-key check collapsed legacy members to
welcome-only.

## Decision

Four zones are authored once in `forum-config/dreamlab.toml` `[[zones]]`
(`:95-142`): `zone1/welcome` (public), `zone2/minimoonoir`, `zone3/family`,
`zone4/dreamlab` (all locked). Each locked zone's `required_cohorts` is
**dual-accept** — it lists **both** the generic zone id and the legacy slug
(e.g. `["zone2","minimoonoir"]`, `:114,:128,:139`) — so both grant vintages match.
Exactly **one** zone, `zone3/family`, is end-to-end encrypted (`encrypted = true`,
`:131`); all others are `false`. Dropping either cohort arm, or changing any
zone's `encrypted` flag, is a recorded change, not a config tweak.

## Consequences

- Forecloses single-key cohort checks: until every legacy slug grant is migrated
  in D1, both arms must persist or locked-zone members silently lose access.
- Zone config is duplicated between the TOML source and the deploy mirror
  (`ZONE_CONFIG_JSON`, see ADR-2005), so a zone edit is a two-place change.
- Only `zone3` carries the E2E-encryption guarantee; flipping `encrypted`
  anywhere changes a security property and must re-open this ADR.

## Verification

At `dc06748`: `grep -nE "required_cohorts|visibility|encrypted" forum-config/dreamlab.toml` shows dual-accept arms at `:114,:128,:139`, `visibility = "public"`
only on `zone1` (`:101`), and `encrypted = true` only on `zone3` (`:131`). The same
four-zone shape is mirrored in `deploy.yml:75`. Model and invariants in
`IDENTITY-zones.md` §Access model / Invariants 2–3.

## Closeout extension — 2026-09-04

Work package: **CP-04/05**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

TOML and the client mirror describe four zones and dual cohort labels. This source inspection does not verify deployed grants or actual encryption.

**Acceptance condition:** Test both grant vintages, outsider denial, revocation, encrypted Family delivery and absence of plaintext exposure at the pinned kit revision; capture rotation and recovery receipts.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented (partial).** The closeout finding was that source inspection
described four zones and dual cohort labels but verified neither the projection
nor deployed behaviour. The projection half is now machine-checked; the
behavioural half is not, and still needs live workers.

The zone model is compared across **all four** of its sites at CI —
`forum-config/dreamlab.toml [[zones]]`, `deploy.yml ZONE_CONFIG_JSON`, the
relay-worker `ZONE_CONFIG` (server enforcement) and the auth-worker
`ZONE_CONFIG` — by `scripts/check-config-mirrors.mjs` (job `config-mirrors`, and
the pre-deploy gate). Comparison is on a canonical form that is insensitive to
zone and key order and treats an empty cohort list as equivalent to an absent
one, but does **not** collapse a genuine field difference. This covers the
dual-accept arms (`required_cohorts: ["zone2","minimoonoir"]` and the `zone3` /
`zone4` equivalents) and the `encrypted` flag, so silently dropping a legacy slug
arm — the 2026-07-20 regression this ADR's review trigger names — or flipping
which zone is encrypted now fails the build.

**A live drift was found and fixed** in the process: the auth-worker's
`ZONE_CONFIG` lacked `"kanban": true` on `zone3` and `zone4` while the other
three sites carried it (`forum-config/deploy/auth-worker.wrangler.toml:69`,
realigned). All four sites now agree.

**Tests + results.** `scripts/__tests__/config-mirrors.test.mjs` (22 tests,
passing) includes: a zone added to the TOML but not projected; the exact `kanban`
drift above; and a slug changed in the relay mirror only. Canonicalisation tests
assert order-insensitivity and empty-vs-absent equivalence while proving a real
field difference is still caught. **Browser receipt**
(`docs/estate-closeout/2026-09-05/`, verdict
`zone_model_projected_identically: pass`): the four zones were observed reaching
both runtime surfaces from a real build — forum `zone_slugs`
`["welcome","minimoonoir","family","dreamlab"]`, BBS `zone_count: 4`.

**Remaining.** Everything behavioural. Not tested: either grant vintage against a
live relay, outsider denial, revocation, encrypted Family delivery, or absence of
plaintext exposure at the pinned kit revision — all require deployed workers and
seeded cohorts, which this pass deliberately did not touch. Both clients were
observed only at their signed-out entry screens, so no zone was actually entered.
Rotation and recovery receipts remain outstanding.

**Governed paths changed.** `forum-config/deploy/auth-worker.wrangler.toml`;
checking machinery in `scripts/check-config-mirrors.mjs`,
`scripts/lib/config-mirrors.mjs`, `scripts/lib/toml-lite.mjs` (all new) and
`.github/workflows/{ci,test-and-lint}.yml`.
