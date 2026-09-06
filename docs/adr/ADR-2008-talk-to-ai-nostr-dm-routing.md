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

## Closeout extension — 2026-09-04

Work package: **CP-03/05**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

Existing local transport/component tests pass. Sender verification and wrap deduplication exist, but this boundary checks no question identifier when a late reply resolves a pending turn. Tier/extension authority is not transmitted.

**Acceptance condition:** Bind replies to requests; demonstrate late/out-of-order handling, wrong-sender rejection and failed reply-relay recovery. Verify the agent publish fan-out and clarify tier meaning before claiming private VisionFlow access.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented.** Replies are now bound to requests. The transport carries no
protocol-level correlation (the agent's `_sendDm` emits a fresh rumor with no
`e` tag), so the client mints its own request id per question and routes each
reply to the turn it names.

`src/lib/chat-turns.ts` (new) holds the correlation model as pure, testable
logic: `encodeQuestion` prefixes a small header block
(`X-DreamLab-Request: <16-hex>`) to the outgoing rumor, `parseReplyEnvelope`
recovers the id from an echoed header or an inline `[req:<id>]` marker and strips
the plumbing before render, and `TurnRegistry` tracks every turn's lifecycle.
`AIChatFab.tsx` no longer resolves "the pending turn" on any accepted reply:

- a reply echoing a known id resolves **that** turn only;
- a reply echoing an id this session never issued is **dropped entirely** — it is
  not our traffic;
- a reply for a turn that already closed still renders, flagged in the UI as a
  late answer to the earlier question, and **leaves the current turn pending**;
- a reply with no id (today's agent does not echo the header) can only resolve
  the **oldest** still-pending turn, and resolves nothing when none is
  outstanding — the previous behaviour, retained but bounded.

Reply-wait timers are per request id, so a stale timer cannot time out a turn
that was already answered. **Failed reply-relay recovery**: `DmSession` now
tracks per-relay health, marks a relay healthy on its `EOSE` and **resets its
retry budget** (so a long session that flaps recovers instead of being
permanently written off), and reports `allDown` when every reply relay has
exhausted its retries — a structural dead end the UI now states plainly rather
than spinning to timeout. **Wrong-sender rejection** was already enforced by the
`expectedSenderPk` pin; it is now also *observable* via a new `onRejectedReply`
hook (`duplicate` / `unwrap-failed` / `self-authored` / `stale`), because a
silent drop was previously indistinguishable from no traffic at all.

**Tier is transmitted as an explicit unverified hint, and claims no authority.**
The header carries `X-DreamLab-Tier-Hint: <n> (client-asserted, UNVERIFIED, not
an entitlement)` and, when a NIP-07 key is connected,
`X-DreamLab-Identity-Hint: <pubkey> (… no proof of possession)`. The browser
holds no proof of possession for that key — DMs ride the ephemeral session key,
never the NIP-07 key — so the wire format says so in words. A test asserts the
payload never contains "authoris/entitled/granted".

**Tests + results.** `src/lib/__tests__/chat-turns.test.ts` — 25 tests, all
passing, encoding the three mis-attribution failures as executable cases: the
late reply (turn A times out, B is asked, A's answer must not close B), the
out-of-order pair (B answers before A; each resolves its own turn), and the
unknown/replayed id. Plus double-resolution, case-insensitive ids, the
uncorrelated fallback resolving only the oldest pending turn, timeout/fail
no-ops on already-resolved turns, and truncation preserving the request id.
`src/lib/__tests__/nostr.test.ts` — 32 tests (6 new): wrong-sender drop reported
rather than swallowed, duplicate fan-out classified as duplicate, reply-relay
health on `EOSE`, `allDown` only once **every** relay is exhausted, recovery
after a failure, and no false `allDown` when no reply relays are configured.
`src/components/__tests__/AIChatFab.test.tsx` — 17 tests (5 new): the envelope on
the wire, a correlated reply resolving its turn without leaking the header to the
user, an unknown-id reply dropped while the real turn stays pending, the full
late-reply scenario end to end, the unverified identity hint, and the
reply-channel warning shown once. Full suite: **191 vitest tests pass**.

**Browser receipt.** `docs/estate-closeout/2026-09-05/` (verdict
`talk_to_ai_disconnected_degrades_gracefully: pass`, screenshot
`07-talk-to-ai-disconnected.png`): with the WebSocket severed — deliberately, so
no DM reaches the production agent — the panel showed "Connecting to the
assistant…" then "Couldn't reach the assistant just now…", and **re-enabled the
input** rather than leaving a stuck spinner. The blocked socket was confirmed to
be the production relay URL.

**Remaining.** The correlation is client-side and **one-sided until the agent
echoes the header**: uncorrelated replies still fall back to oldest-pending
matching, so the strict binding is only fully load-bearing once junkiejarvis
echoes `X-DreamLab-Request`. That is an agentbox-side change, not one this repo
can make. Also unverified here: the agent's live publish fan-out (the invariant
that the reply-relay set stays a subset of it), and what the agent does with the
tier hint — this pass makes the hint honest on the wire, it does not decide
whether tiers should require authenticated authority (see ADR-2006).

**Governed paths changed.** `src/components/AIChatFab.tsx`, `src/lib/nostr.ts`,
`src/lib/chat-turns.ts` (new).
