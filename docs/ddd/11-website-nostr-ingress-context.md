# DDD: Website Nostr Ingress Bounded Context

**Status:** Living document
**Date:** 2026-07-14
**Scope:** The anonymous, website-originated write path onto the relay — contact-signup DMs to the human admin and the visitor chat session with junkiejarvis
**Governed by:** [ADR-041 Anonymous Contact DM Ingress](../adr/041-anonymous-contact-dm-ingress.md), [ADR-042 Website Agent Chat Routing](../adr/042-website-agent-chat-routing.md)
**Conformist to:** Forum/Relay context (nostr-rust-forum kit — admission rules; see §2)

---

## 1. Bounded Context

The Website Nostr Ingress context governs how the React marketing SPA writes onto the relay as an anonymous actor. It has exactly two write paths: a fire-and-forget contact submission delivered as a NIP-17 private DM to the configured admin recipient (`VITE_ADMIN_PUBKEY` — interim: the operator's working admin key `11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c` per ADR-041 Decision 5), and a serialised chat conversation with the junkiejarvis agent (`2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9`). The context owns browser-side event construction (rumor → seal → gift wrap), the chat session lifecycle, and the env plumbing that carries the recipient pubkeys and relay URL into the build. It is downstream in every direction: it conforms to the relay's admission contract (recipient-gated gift-wrap write, NIP-42-gated read — kit `nostr-bbs-relay-worker/src/relay_do/nip_handlers.rs:430-451`, `1170-1199`; upstream ADR-104) and consumes the agent's DM contract as a customer.

This context adds no backend, no worker, and no Nostr kind. Both features publish from the browser over a raw WebSocket to `VITE_RELAY_URL` (ADR-041, ADR-042 — decision D1). There is a single relay today; the path is federation-ready by construction (kind 1059 is already in `federated_kinds`, `forum-config/dreamlab.toml`), but the mesh transport is designed, not shipped — no multi-node delivery exists. The context also changes the deployment's data map: signup PII leaves the Supabase `email_subscribers` table and travels instead as end-to-end-encrypted DM content, shrinking what `src/lib/gdpr-erasure.ts` covers (see §2 and Open Issue 1). The parent feature record, including the risk register and the whitelist runbook step (satisfied at launch by the interim recipient; re-arms at the ADR-040 D3 key split), is [prd-nostr-contact-and-agent-chat-v1.0.md](../prd/prd-nostr-contact-and-agent-chat-v1.0.md).

---

## 2. Context Map

| Context | Relationship | Notes |
|---|---|---|
| **Website Nostr Ingress** (this context) | Coordinates the anonymous write path | Owns event construction, session lifecycle, env plumbing — nothing relay-side |
| **Forum/Relay** (nostr-rust-forum kit) | Upstream (Conformist) | Owns admission: kind-1059 admitted iff the first `["p", …]` pubkey `is_whitelisted()` (nip_handlers.rs:430-451, storage.rs:332-348); reads AUTH-gated with forced `#p` rewrite (nip_handlers.rs:1170-1199) |
| **Agent Identity & Messaging** ([DDD 08](08-agent-identity-messaging-context.md)) | Upstream (Customer/Supplier) | This context is a Customer of the agent's DM contract. junkiejarvis is realised by the agentbox bridge (`management-api/lib/junkiejarvis-agent.js`), **not** by DDD 08's aspirational `agent-worker` crate |
| **Supabase Contact/GDPR** (Contact.tsx, `gdpr-erasure.ts`) | Separate Ways (after migration) | The signup write leaves Supabase; `gdpr-erasure.ts` coverage shrinks to Contact.tsx's tables; erasure for DM content becomes an operator purge (ADR-041) |

### Relationship types

- **Forum/Relay → Website Nostr Ingress:** Conformist. The kit owns the admission rules and the website cannot negotiate them — it composes events that satisfy the contract as shipped (recipient-whitelisted gift wrap, NIP-42 AUTH before any kind-1059 REQ, 10 events/sec/IP) or its events are rejected. Any change to that contract is an upstream kit decision, never a request from this context.
- **Agent Identity & Messaging → Website Nostr Ingress:** Customer/Supplier, with a realisation caveat. The supplier that actually answers is the agentbox bridge — `junkiejarvis-agent.js` subscribes `{kinds:[1059], '#p':[jj]}`, unwraps the kind-14 rumor, calls an LLM under a 25 s fail-open timeout, and replies as a gift wrap whose rumor carries only `[['p', recipient]]` tags. DDD 08's `agent-worker` crate, DVM job lifecycle, and NIP-26 delegation remain aspirational design (not implemented as of 2026-06-12, per that document's own status note) and must not be cited as the realisation of this contract. This context consumes the bridge's DM contract exactly as observed; it holds no lever over the agent's behaviour.
- **Supabase Contact/GDPR → Website Nostr Ingress:** Separate Ways. Contact.tsx keeps its `contact_submissions` insert and `email_subscribers` side-upsert (Contact.tsx:86-107) on Supabase; the signup form leaves. The two contexts share no code after the migration — only the privacy copy that must describe both truthfully (ADR-041 GDPR posture).

---

## 3. Aggregates

| Aggregate | Root | Description |
|---|---|---|
| `ContactSubmission` | Yes (feature-A root) | One "Stay in the loop" signup. Holds a one-shot `EphemeralIdentity`, the `GiftWrappedEnvelope` addressed to `VITE_ADMIN_PUBKEY`, and the `ConsentGrant` carried inside the rumor payload. Fire-and-forget: the aggregate exists only between key generation and the `RelayAcknowledgement`; the key is discarded on OK and the admin replies out-of-band via the email inside the payload (ADR-041). |
| `ChatSession` | Yes (feature-B root) | One browser session with junkiejarvis. Holds a session-scoped `EphemeralIdentity` (regenerated per page load, in-memory only), the NIP-42-authed own-inbox subscription, the keepalive timer, and an ordered list of `ConversationTurn`s. Consistency boundary: the subscription exists before any publish, and at most one turn is in flight (ADR-042). |
| `ConversationTurn` | No (member of `ChatSession`) | One question and its `AgentReply` (or the 30 s timeout fallback). Correlated by serialisation alone — the bridge's reply rumor carries no `e`-tag back to the question. |

---

## 4. Entities

| Entity | Identity | Owner |
|---|---|---|
| `ContactSubmission` | kind-1059 wrap event id | Website Nostr Ingress |
| `ChatSession` | Session ephemeral pubkey | Website Nostr Ingress |
| `ConversationTurn` | Client-local sequence number (no wire correlation id exists) | `ChatSession` |
| `WhitelistedRecipient` | Recipient pubkey (interim admin recipient `11ed6422…` per ADR-041 Decision 5, junkiejarvis `2de44d56…`) | Relay D1 `whitelist` table (state); forum-config roster + ops runbook (authorship) |

---

## 5. Value Objects

| Value object | Fields | Notes |
|---|---|---|
| `EphemeralIdentity` | {sk, pk} — fresh secp256k1 keypair | `nostr-tools generateSecretKey()`; never persisted. One-shot for `ContactSubmission`, session-scoped for `ChatSession` (ADR-041, ADR-042). |
| `GiftWrappedEnvelope` | rumor (kind 14, unsigned) → seal (kind 13, NIP-44, sender-signed) → wrap (kind 1059, NIP-44, throwaway-signed, clear-text `["p", recipient]`) | Byte-compatible with the kit's `gift_wrap.rs`; built with `nostr-tools` `nip17.wrapEvent`/`nip59.wrapEvent` (^2.23.3, promoted devDependency → runtime dependency per ADR-042). Reference: `scripts/seed/probes/probe-giftwrap.mjs`. |
| `RelayAcknowledgement` | `["OK", event_id, accepted, message]` | `accepted=false` with `"blocked: gift-wrap recipient not whitelisted"` is the failure the UI must surface — never report success on send alone (ADR-041). |
| `AgentReply` | Unwrapped kind-14 rumor from junkiejarvis; tags `[["p", recipient]]` only | No `e`-tag correlation — the reason serialisation is an invariant, not an optimisation (ADR-042). |
| `ConsentGrant` | {has_consent, source, submitted_at} | Travels inside the rumor JSON, not as a database column; the durable consent record is the DM itself (ADR-041). |
| `RelayEndpoint` | `VITE_RELAY_URL` (wss) | The only permitted connection target. CSP `connect-src` (`index.html:72`) admits only `wss://*.solitary-paper-764d.workers.dev`; a third-party relay would be silently blocked. |

---

## 6. Domain Events

| Event | Trigger | Publisher | Consumer |
|---|---|---|---|
| `ContactDmPublished` | Relay answers OK `true` for a contact wrap | Website Nostr Ingress (`EmailSignupForm`) | Relay DO (D1 store + fan-out to the admin's authenticated session); signup UI success state |
| `ContactDmRejected` | Relay answers OK `false` (recipient not whitelisted, size, rate limit) | Relay | Signup UI error state; ops (re-run the whitelist seed, `scripts/seed/whitelist-admin-recipient.mjs`) |
| `ChatQuestionPublished` | Visitor sends while no turn is in flight; own-inbox subscription already live | `ChatSession` | Relay → agentbox bridge subscription `{kinds:[1059], '#p':[jj]}` |
| `AgentReplyReceived` | A kind-1059 arrives on the session's own-inbox subscription and unwraps with the session key | agentbox bridge (origin), Relay (fan-out) | `ChatSession` — closes the open `ConversationTurn`, re-enables input |
| `ChatSessionExpired` | FAB closed, component unmount, or page unload | `ChatSession` | Keepalive teardown, WebSocket close, key drop |
| `KeepaliveMissed` | The ~12 s keepalive cadence lapses / DO idle stall (~20 s) suspected | `ChatSession` keepalive | `ChatSession` — reconnect, re-AUTH, re-REQ before the next send |

---

## 7. Invariants

1. **Recipient must be whitelisted before any publish.** The relay admits a kind-1059 iff the FIRST `["p", …]` tag pubkey is in the D1 `whitelist` table; the (ephemeral) author is deliberately unchecked (kit nip_handlers.rs:430-451, storage.rs:332-348; upstream ADR-104). Live-verified 2026-07-14: junkiejarvis IS whitelisted, and so is the interim admin recipient (`11ed6422…`, per ADR-041 Decision 5) — so both features launch with no runbook step. The prerequisite re-arms when the ADR-040 D3 key split rotates `VITE_ADMIN_PUBKEY` (one-time NIP-98 admin `POST /api/whitelist/add` for the new key), and `/api/admin/reset-db` silently wipes whitelist rows (ADR-041).

2. **The ephemeral key is never persisted.** No localStorage, no IndexedDB, no cookie. One-shot and discarded after OK for `ContactSubmission` (ADR-041); in-memory and regenerated per page load for `ChatSession` (ADR-042).

3. **Subscribe before publish.** The chat client opens its NIP-42-authed own-inbox subscription before sending any question — the Durable Object stops pushing to an idle subscription after ~20 s without closing the socket, and a re-REQ does not reliably restore live delivery (ADR-042; empirically, `nostr-bridge.js:102-113` and `scripts/seed/probes/probe-jj-live.mjs`).

4. **One in-flight question per session.** Input is disabled while a reply is pending; junkiejarvis reply rumors carry only `[['p', recipient]]` with no `e`-tag, so overlapping questions are unresolvable on the wire (ADR-042).

5. **Success only on relay OK.** Neither feature reports success until the relay's `["OK", …, true, …]` frame arrives; an OK `false` (including the whitelist rejection) surfaces as a user-visible error, never a false success (ADR-041).

6. **Payload stays under the NIP-44 cap.** Rumor plaintext < 65535 bytes (`MAX_PLAINTEXT_LEN`, kit `nip44.rs:52`); relay `max_content_length` is 65536 (`nip11.rs:192-198`). Enforced client-side with the existing `src/lib/utils.ts` limits (ADR-041, ADR-042).

7. **Every connection is pinned to `VITE_RELAY_URL`.** No relay auto-discovery, no multi-relay fan-out — CSP `connect-src` (`index.html:72`) would silently block any other host, turning discovery into an invisible failure mode (ADR-041, ADR-042).

---

## 8. Ubiquitous Language

| Term | Meaning |
|---|---|
| **Gift wrap** | The kind-1059 outer event, NIP-44-encrypted and signed by an unrecoverable throwaway key; the only clear-text routing signal is the recipient `p`-tag. |
| **Rumor** | The unsigned kind-14 inner message carrying the real content (the signup payload or the chat text). |
| **Seal** | The kind-13 NIP-44-encrypted rumor, signed by the real sender — here, the ephemeral identity. |
| **Ephemeral identity** | A browser-generated secp256k1 keypair with no registration, no whitelist entry, and no persistence. |
| **Whitelist (recipient-gated admission)** | The relay's rule that a gift wrap is admitted on the recipient's membership, never the author's; all other kinds are author-gated. |
| **Own-inbox subscription** | An NIP-42-authed REQ whose `#p` the relay force-rewrites to the authenticated pubkey — a session can only ever read wraps addressed to itself. |
| **Keepalive** | The ~12 s application-level traffic that keeps a Cloudflare Durable Object subscription live past its ~20 s idle stall. |
| **Serialised conversation** | The discipline of one outstanding question per session, forced by tag-free agent replies. |
| **Fire-and-forget submission** | A one-shot publish whose key is discarded on OK; any reply happens out-of-band via the email inside the payload. |
| **Operator purge** | The only erasure path for a delivered DM: an operator-side D1 row delete. Distinct from self-service erasure — NIP-09 deletion requires the stored event's author key (nip_handlers.rs:1384), which is a discarded throwaway, so erasure by sender or recipient is cryptographically impossible. |

---

## 9. Ownership Summary

| Owns in this context | Does not own |
|---|---|
| Browser-side event construction (`src/lib/nostr.ts` primitives, `wrapContactDm`/`wrapChatDm`), the `ChatSession` lifecycle (subscribe-before-publish, serialisation, keepalive, teardown), the env plumbing (`VITE_ADMIN_PUBKEY`, `VITE_JARVIS_PUBKEY`, `VITE_RELAY_URL` parity across `.env.example`, deploy.yml, ci.yml, test-and-lint.yml), the signup/chat UI states and the privacy copy describing this path | Relay admission rules (kit-owned, Conformist), junkiejarvis behaviour (agentbox-owned: LLM choice, 25 s fail-open timeout, scheduling-intent gate, reply shape), whitelist state (ops runbook + `scripts/seed/whitelist-admin-recipient.mjs`), Supabase contact tables and their erasure pipeline (Contact.tsx context, `gdpr-erasure.ts`) |

The website is a sender, not a service. It composes events that satisfy contracts owned elsewhere; when a contract changes, this context re-conforms — it never negotiates.

---

## 10. Open Issues

1. **Contact.tsx migration.** The contact form still inserts into `contact_submissions` and side-upserts `email_subscribers` (Contact.tsx:86-107), so the same logical "email subscription" concept lives in two backends during the transition. Default: deferred — Contact.tsx stays on Supabase, `gdpr-erasure.ts`'s `PII_TABLES` remains valid for those tables, and the migration is a documented follow-up outside this context (ADR-041, PRD non-goal).

2. **Persistent chat identity.** A localStorage keypair would give returning visitors reply-after-reload at the cost of linkability across visits. Default: no — per-page-load in-memory key; privacy by default (ADR-042).

3. **Per-pubkey throttle upstream.** The relay enforces only 10 events/sec/IP and the bridge has no per-pubkey cooldown, so anonymous fresh keys can trigger unmetered LLM calls. Default: flagged to agentbox upstream, not blocking — the shipped mitigations are client-side serialisation, a per-session throttle, and the ops kill-switch (`JUNKIEJARVIS_ENABLED=0`) (ADR-042; PRD risk register).

4. **Federation activation.** Default: none until the mesh ships. Kind 1059 is already in `federated_kinds`, so contact and chat DMs become mesh-propagating automatically if/when a concrete `MeshTransport` ships — until then there is exactly one relay, and no copy or document may claim multi-node delivery. Note that `dreamlab.toml`'s `[mesh]` comment cites PRD-010/ADR-073, which were never committed and are superseded ghost references from a dead numbering epoch (prd-gap-close-edge-v1.0.md:55, 143) — do not treat them as the federation design source.
