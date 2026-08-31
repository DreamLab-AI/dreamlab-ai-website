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
