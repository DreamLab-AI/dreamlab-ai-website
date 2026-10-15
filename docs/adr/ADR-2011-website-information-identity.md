---
id: ADR-2011
title: Name the monitor key as the "website information" identity, labelled but never privileged
date: 2026-10-15
decision_status: accepted
implementation_status: partial
activation_status: staged
supersedes: []
superseded_by: []
verified_commit: bd02fb6
owner: jjohare
review_trigger: the kit gains a config-declared ingress recipient list (Phase 1 below), or the monitor key is rotated
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
5. Generalising this into the kit is recorded as the target but is not done here (Phase 1):
   a config-declared `[[ingress]]` recipient list read by the relay gate (so `reset-db` cannot
   drop it), a config-to-registry seed export (closing P2-REC-12), and projection into
   `window.__ENV__`. Forum behaviour changes belong upstream.

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

Implementation is `partial` (Phase 0 only) and activation `staged` until the provisioning script has
run against the live relay and `/api/agents/disclosure` lists the key; see the dated note below.
`npx vitest run scripts/__tests__/website-info.test.mjs` covers the profile, the registration body
(no `cohorts`), NIP-98 signing, the disclosure check, the mirror agreement and the no-`agent`-cohort
counter-example.
