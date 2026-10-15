---
id: ADR-2011
title: Name the monitor key as the "website information" identity, labelled but never privileged
date: 2026-10-15
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: b7b7fe46
owner: jjohare
review_trigger: a browser library for form ingress is added to the kit, or the monitor key is rotated
repo: dreamlab-ai-website
domain: IDENTITY-zones.md
lineage: extends ADR-2008 (website to agent DM routing) and the monitor co-recipient added in 08628f06.
---

# ADR-2011 — Name the monitor key as the "website information" identity, labelled but never privileged

## Context

Every contact, signup and chat message is gift-wrapped to a recipient the relay admits, plus a
co-recipient copy to `VITE_MONITOR_PUBKEY`, because the relay serves a kind-1059 wrap only to its
addressee. That key is whitelisted with no cohorts, but it appeared in the forum as an anonymous
hex member and nothing said what it was. The pattern (E2E form ingress with no database) is
useful to any kit deployment, but today it lives as hand-synced pubkeys, a one-off whitelist
script and a `reset-db` hazard. Registering an identity as an `agent` cohort member would
name it, but zone4 sets `agent_keys = true`, so that cohort receives the zone key.

## Decision

1. The monitor key is one declared service identity, `website-info`: a published kind-0 profile
   (bot-flagged), the NIP-05 handle `website@dreamlab-ai.com` served from
   `public/.well-known/nostr.json`, a row in the D1 agent registry, and a `[[agents]]` roster entry.
2. **Labelled, never privileged.** The registry row is written with the auth worker's `register`
   route (not `provision`), the roster entry has `cohorts = []`, and the identity must never hold
   the `agent` cohort, any other cohort, admin rights or a zone key. It reads wraps and posts nothing.
3. `scripts/seed/provision-website-info.mjs` adopts it idempotently and refuses to run if the
   whitelist row carries privilege. The nightly inbox watch fails if the registry row is missing.
4. The existing key is kept. Rotating it would touch the deploy env, the vendored embeds on two
   other sites and the key custody, for no gain while the row is clean.
5. The kit generalisation shipped as kit ADR-2022 (nostr-rust-forum `aee1997`, crates at 1.0.0-beta.16):
   `[[ingress]]` in `dreamlab.toml` declares the admin inbox, the Talk-to-AI agent and `website-info`; the relay
   admits kind-1059 wraps for them from its `INGRESS_RECIPIENTS` binding with no whitelist row, so a `reset-db`
   cannot silence the forms; `check-whitelist` reports `ingressRecipient`; and `/api/agents/disclosure` merges
   declared recipients that carry `authorised_by` (a registry row wins). `tests/ingress_mirror.rs` keeps the TOML,
   the relay binding and the build env equal, and the nightly watch fails unless the live relay reports each key
   as an effective ingress recipient. Left out on purpose: projecting the list into `window.__ENV__` (nothing in the
   kit client reads it), a shared browser library for building the wraps (still `src/lib/nostr.ts`), and the
   admin Agents roster, which the auth worker serves.

## Consequences

- The admin Agents roster and the member list name the identity and its authorising principal. The
  disclosure badge only marks items an agent authors, so it never appears for this one. The
  registry's `registered_by` is the key that signs the registration (agentbox-operator), while the
  roster says operator-jjohare: the P2-REC-12 gap stays open until the kit exports config to the registry.
- The registry row and the whitelist row are both lost on `reset-db`; the watch now reports both.
- Four places name the key (`deploy.yml`, the embed, `dreamlab.toml`, `nostr.json`) and a test
  guards that they agree. Rotating the key touches all four, the embeds and the custody file.
- Not solved: other kit operators still have no config-driven way to declare ingress recipients;
  each co-recipient is another copy of every message and another key able to read it; and the
  recipient is an open inbox bounded only by the per-IP rate limit. Retention of emails stored as
  relay DMs is an operator data-protection matter.

## Verification

Implementation is `complete` for decisions 1 to 5 as amended: decisions 1 to 4 are live (Phase 0, below) and decision 5
is the kit release described there, verified by the second note.

Live check, 2026-10-15 at `b7b7fe46`, by `scripts/seed/provision-website-info.mjs`: the monitor row had no
cohorts and was not admin before and after; the kind-0 was accepted and read back from the relay with a
valid signature (`name website-info`, `nip05 website@dreamlab-ai.com`, `bot true`); `register` returned 201
and `/api/agents/disclosure` lists `website-info`; `/.well-known/nostr.json` resolves the handle with
`access-control-allow-origin: *`; `inbox-watch --dry-run` reports no problems.
Not observed: the forum's admin members view, whose data source was not traced.

`npx vitest run scripts/__tests__/website-info.test.mjs scripts/__tests__/inbox-digest.test.mjs` covers the
profile, the registration body (no `cohorts`), NIP-98 signing, the disclosure and privilege checks, the
mirror agreement, the no-`agent`-cohort counter-example, and the sanitised, bounded digest.

Kit move, 2026-10-15: kit `aee1997` (ADR-2022) is pinned in `deploy.yml`, `workers-deploy.yml`, `rust-ci.yml`, the
`forum-config` crate pins and the compatibility record. `cd forum-config && cargo test` includes
`tests/ingress_mirror.rs`; `npx vitest run scripts/__tests__/website-info.test.mjs` covers the ingress-aware
privilege and effectiveness checks. The live result of the redeploy is recorded in the note below once checked.
