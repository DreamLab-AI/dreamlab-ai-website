---
id: ADR-2008
title: Route Talk-to-AI over Nostr gift-wrap and read replies from open relays
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: changing the reply-relay set, or moving the agent chat to an HTTP endpoint
repo: dreamlab-ai-website
domain: IDENTITY-zones.md
lineage: distils legacy 042-website-agent-chat-routing (Amendment 1), 041-anonymous-contact-dm-ingress, 031-dm-protocol-standardisation.
---

# ADR-2008 — Route Talk-to-AI over Nostr gift-wrap and read replies from open relays

## Context

The marketing "Talk to AI" FAB could call an ordinary HTTP chat endpoint. Instead
it reuses the forum's Nostr transport — but the primary relay's allowlist rejects
a kind-1059 wrap addressed to the browser's ephemeral session key, so the naive
"publish and listen on the same relay" pattern never receives a reply.

## Decision

The browser gift-wraps a kind-14 rumor to `VITE_JARVIS_PUBKEY` (junkiejarvis) and
publishes the kind-1059 wrap directly to the primary relay
(`src/components/AIChatFab.tsx:23-24,354`). Because the primary relay's allowlist
drops the reply wrap, **replies are read from the open relays the agent also
publishes to** — `relay.damus.io`, `relay.primal.net`
(`AIChatFab.tsx:31-35`) — and the reply listener pins `expectedSenderPk =
JARVIS_PUBKEY` (`:273`) since open relays accept wraps from anyone. The contact
form uses the same gift-wrap transport to `VITE_ADMIN_PUBKEY`.

## Consequences

- Forecloses an HTTP chat backend: there is no server to run; the agent is a Nostr
  identity, and abuse control is the relay's per-IP rate-limit, not app auth.
- The reply-relay set **must remain a subset of the agent's own publish fan-out**,
  or replies are structurally unreadable — an invariant, not a tuning knob.
- Reading from open relays requires the sender-pubkey pin to avoid accepting a
  spoofed reply; dropping it trusts any wrap on a public relay.
- `VITE_JARVIS_PUBKEY`/`VITE_ADMIN_PUBKEY` are hand-synced mirrors (ADR-2005), so a
  rotation touches this path too.

## Verification

At `dc06748`: `grep -nE "kind-1059|kind-14|damus|primal|expectedSenderPk|JARVIS_PUBKEY" src/components/AIChatFab.tsx` shows the gift-wrap comment at `:23-24`, the
open reply-relay default at `:35`, the sender pin at `:273`, and the publish call
at `:354`. Routing and Invariant 4 in `IDENTITY-zones.md` §Website→agent DM
routing.
