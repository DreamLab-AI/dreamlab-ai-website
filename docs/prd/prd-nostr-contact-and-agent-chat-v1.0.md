# PRD: Nostr Contact Ingress & Website Agent Chat

**Version:** 1.0
**Date:** 2026-07-14
**Author:** DreamLab Engineering
**Status:** Draft
**Depends on:** [ADR-041](../adr/041-anonymous-contact-dm-ingress.md), [ADR-042](../adr/042-website-agent-chat-routing.md), [DDD-11](../ddd/11-website-nostr-ingress-context.md)

---

## 1. Overview & Motivation

### Why

The marketing site carries two front-page features that are the last remaining orphans of the pre-nostr stack:

**A — Contact/signup form.** `src/components/EmailSignupForm.tsx` ("Stay in the loop", `src/pages/Index.tsx:495-513`) upserts `{email, name, has_consent, source}` into the Supabase `email_subscribers` table. The June 2026 project audit flagged the component directly: it uses a weak shared email regex, no length caps (unlike Contact, which uses Zod), and logs raw Supabase errors to the console (`docs/sprint/full-project-audit-2026-06.md:115-116`). It has no unit-test coverage.

**B — Ask-the-agent chat box.** `src/components/AIChatFab.tsx` (global FAB, mounted unconditionally in `src/App.tsx:72`) POSTs to `VITE_AI_CHAT_URL` — an environment variable that has never been set in any workflow, `.env.example`, or deployment; it is a documented dead declaration (`docs/architecture/forum-deployment-sequence.md:287`). When unset (i.e. always, in production), the component short-circuits to a canned "not connected yet" message. The feature has never worked.

Meanwhile the platform beneath the site is entirely nostr-native, and the relay already admits exactly the traffic these features need, **by construction**:

1. **Anonymous gift-wrap ingress is recipient-gated.** The relay's `handle_event` (kit `nostr-bbs-relay-worker/src/relay_do/nip_handlers.rs:430-451`, upstream ADR-104) admits kind-1059 gift wraps iff the FIRST `["p", …]` tag pubkey `is_whitelisted()`; the ephemeral author is deliberately unchecked, and publishing an EVENT requires no NIP-42 AUTH. An anonymous browser visitor with a freshly generated keypair can therefore DM any whitelisted recipient with zero registration.
2. **Reading kind-1059 requires NIP-42 AUTH but not whitelist membership** (`gate_kind_1059_filters`, `nip_handlers.rs:1170-1199`): any keypair can AUTH, and the filter's `#p` is force-rewritten to the authed pubkey — a session can only read its own inbox.
3. **The DM format is already implemented on both sides.** The forum reads kind-14 rumor → kind-13 seal → kind-1059 wrap (NIP-17/NIP-59, NIP-44 encryption throughout); `nostr-tools ^2.23.3` — already in `package.json` (devDependencies) — ships byte-compatible `nip17.wrapEvent`/`nip59.wrapEvent`/`nip59.unwrapEvent`. A working in-repo reference exists at `scripts/seed/probes/probe-giftwrap.mjs`.
4. **junkiejarvis is a live conversational agent** (`2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9`, agentbox `management-api/lib/junkiejarvis-agent.js`) that already subscribes `{kinds:[1059], '#p':[jj]}`, unwraps the rumor, runs an LLM (25 s hard timeout, fail-open canned apology), and gift-wraps a reply to the sender. It IS whitelisted on the production relay — feature B needs zero relay provisioning.
5. **The CSP already permits the relay** (`index.html:72` `connect-src` includes `wss://*.solitary-paper-764d.workers.dev`). No CSP change is needed.

Recipient status is the load-bearing prerequisite: a live probe (NIP-98-authed `GET /api/whitelist/list`, **live-verified 2026-07-14**) shows the D1 `whitelist` table holds 9 rows; **operator-jjohare (`6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a`) is NOT one of them**, while the operator's current working admin key (`11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c`, visionclaw-server) **is**. `is_whitelisted()` (`storage.rs:332-348`) does not consult `ADMIN_PUBKEYS`, so admin status confers no DM-recipient status; a DM to a non-whitelisted recipient is rejected `"blocked: gift-wrap recipient not whitelisted"`. **Interim recipient decision (operator, 2026-07-14):** `VITE_ADMIN_PUBKEY` targets the working admin key, which delivers with no runbook step; the whitelist insert (§3.4) re-arms as a launch blocker when the ADR-040 D3 key split rotates the recipient (ADR-041 Decision 5).

Federation posture, stated once for the whole document: **single relay today; federation-ready by construction (kind 1059 already in `federated_kinds`); mesh transport is designed, not shipped.** No user-facing copy or success criterion in this PRD may claim multi-node delivery.

### What

A two-phase realignment, entirely within this repository (D1: client-side direct publish; no new backend, no new worker, no HTTP proxy, zero upstream kit changes):

1. **Phase 1 — Contact/signup DM (feature A).** Replace EmailSignupForm's Supabase upsert with a client-side NIP-17 private DM to the configured admin recipient (`VITE_ADMIN_PUBKEY`; interim: the operator's working admin key `11ed6422…663c` per ADR-041), published fire-and-forget from the browser over a raw WebSocket to `VITE_RELAY_URL` under a one-shot ephemeral key. Ship the shared `src/lib/nostr.ts` module, env/deploy parity, the whitelist runbook + seed script, and the GDPR/privacy copy changes. (Decisions D1/D3/D4/D7/D8/D9.)

2. **Phase 2 — Agent chat (feature B).** Replace AIChatFab's dead HTTP path with a live nostr DM conversation with junkiejarvis: per-session in-memory ephemeral key, NIP-42 AUTH, subscribe-before-publish, ~12 s keepalive, serialised sends, 30 s client timeout. Retire `VITE_AI_CHAT_URL`; register junkiejarvis in the `[[agents]]` roster. (Decisions D1/D2/D3/D5/D6/D7/D10.)

### Scope

| In scope | Out of scope |
|----------|-------------|
| `src/lib/nostr.ts` shared module + unit tests | Contact.tsx migration (documented follow-up, §5.2) |
| EmailSignupForm submit-path rewrite (Supabase → gift-wrap DM) | Upstream kit (nostr-rust-forum) code changes |
| AIChatFab rewrite (HTTP fetch → DM session with junkiejarvis) | agentbox code changes (upstream asks flagged in docs only) |
| Env/deploy parity: `VITE_RELAY_URL`, `VITE_ADMIN_PUBKEY`, `VITE_JARVIS_PUBKEY` | Mesh/federation implementation; multi-relay fan-out from the site |
| `VITE_AI_CHAT_URL` retirement | Supabase removal from build/CI (Contact.tsx + gdpr-erasure still depend on it) |
| Whitelist runbook + `scripts/seed/whitelist-admin-recipient.mjs` | Self-service erasure of sent DMs (cryptographically impossible; §5.3) |
| Privacy.tsx + DataErasureRequest copy updates | NIP-07-signed DMs (session key carries DMs at all tiers; §4.1) |
| `forum-config/dreamlab.toml` `[[agents]]` junkiejarvis entry | Persistent chat identity / cross-reload history |
| Unit tests for both components; `package.json`/`vite.config.ts` chunking | New Playwright CI gates (live-relay smoke stays manual, matching existing convention) |

### Non-Goals

- No upstream kit (nostr-rust-forum) code changes; no agentbox changes (upstream asks are flagged in docs only).
- No Contact.tsx migration (documented follow-up).
- No mesh/federation implementation; no multi-relay fan-out from the site.
- No Supabase removal from build/CI (Contact.tsx + gdpr-erasure still depend on it).

### Codebase Reference

| Component | Location | Current state |
|-----------|----------|---------------|
| EmailSignupForm | `src/components/EmailSignupForm.tsx` | Supabase upsert into `email_subscribers` (lines 51-61); no tests |
| AIChatFab | `src/components/AIChatFab.tsx` | Fetch to unset `VITE_AI_CHAT_URL` (line 19); NIP-07/NIP-98 HTTP-auth scaffolding (lines 21-90); no tests |
| Shared nostr module | `src/lib/nostr.ts` | Does not exist — no relay client, key management, or NIP-44/59 code anywhere in `src/` |
| Validation primitives | `src/lib/utils.ts` | `isValidEmail`, `MAX_EMAIL_LEN`, `MAX_NAME_LEN`, `MAX_MESSAGE_LEN` (the last currently unused) |
| Supabase client | `src/lib/supabase.ts` | Null-guarded singleton; retained for Contact.tsx |
| GDPR erasure | `src/lib/gdpr-erasure.ts` | `PII_TABLES` = `contact_submissions`, `email_subscribers` (lines 42-45) |
| Privacy copy | `src/pages/Privacy.tsx`, `src/components/DataErasureRequest.tsx` | "stored securely in our Supabase database" (Privacy.tsx:34); erasure promise covers "email subscriptions" (DataErasureRequest.tsx:124-125) |
| Reference client | `scripts/seed/probes/probe-giftwrap.mjs` | Working NIP-42 AUTH + `nip59.wrapEvent` + `["EVENT", wrap]` publish against the production relay |
| Operator config | `forum-config/dreamlab.toml` | `[admin].static_pubkeys` includes operator-jjohare (line 59); `[[agents]]` roster lacks junkiejarvis; `[mesh] mode = "standalone"`, `federated_kinds` includes 1059 |
| Workflows | `.github/workflows/{deploy,ci,test-and-lint}.yml` | React build env block (deploy.yml:114-119) passes only `VITE_SUPABASE_*` + `VITE_AUTH_API_URL`; `VITE_RELAY_URL` exists at workflow level but is invisible to the React build |
| Env typing | `src/vite-env.d.ts` | `VITE_ADMIN_PUBKEY` (line 15) declared but unused; `VITE_JARVIS_PUBKEY` does not exist; `VITE_AI_CHAT_URL` (line 18) to be retired |

---

## 2. Success Criteria

### Launch-Blocking Operational Preconditions

| # | Precondition | Verification |
|---|-------------|--------------|
| 1 | **The `VITE_ADMIN_PUBKEY` recipient is relay-whitelisted (D8).** SATISFIED at launch by the interim recipient decision: `11ed6422…663c` (operator's working admin key) is already among the 9 whitelist rows (**live-verified 2026-07-14**). Re-arms when the ADR-040 D3 key split rotates the recipient — the minted operator key must then be inserted via `scripts/seed/whitelist-admin-recipient.mjs` (NIP-98-admin `POST /api/whitelist/add`), and `VITE_ADMIN_PUBKEY` re-pointed in the same change (five-location atomic split, ADR-041 Decision 5). Feature A is dead-on-arrival against a non-whitelisted recipient. | NIP-98-authed `GET /api/whitelist/list` includes the `VITE_ADMIN_PUBKEY` value; recorded in the ops runbook. Note: `/api/admin/reset-db` silently wipes whitelist rows — the runbook must mandate re-verification after any DB reset. |
| 2 | **agentbox image includes the `hasSchedulingIntent` fix (commit `5e626c20`).** Without it, casually phrased anonymous chat can cause junkiejarvis to fabricate real, forum-visible kind-31923 calendar events (QA bug B5, `docs/sprint/forum-qa-bugs-2026-06-17.md:71-76`). | Operator confirms the deployed agentbox container is built from ≥ `5e626c20` before Phase 2 launch. |

### Phase 1 (Contact/Signup DM)

Every criterion below is falsifiable; "unit test" means a Vitest test in `src/components/__tests__/EmailSignupForm.test.tsx` or `src/lib/__tests__/nostr.test.ts` with the WebSocket boundary mocked (jsdom has no WebSocket).

| Metric | Target |
|--------|--------|
| Valid submission publishes exactly one kind-1059 event to `VITE_RELAY_URL` whose first `["p", …]` tag is `VITE_ADMIN_PUBKEY` | Unit test asserts wrap shape and single publish |
| Success toast appears **only after** the relay returns `OK … true` | Unit test: mocked OK=true → success state |
| Publishing with relay `OK=false` (e.g. `"blocked: gift-wrap recipient not whitelisted"`) MUST surface an error toast — never false success | Unit test: mocked OK=false → error state, no success toast |
| WebSocket connect failure / OK timeout surfaces an error toast with an out-of-band fallback (contact email) | Unit test with fake timers |
| Rumor content = human-readable header line + JSON `{type:'contact_signup', name, email, has_consent, source:'website_signup_form', page_url, submitted_at}`; `["subject","DreamLab website signup"]` tag present | Unit test asserts decoded rumor shape |
| Zero Supabase calls from EmailSignupForm | Unit test: supabase module spy records no calls |
| Ephemeral key is fresh per submission and never persisted (no localStorage/sessionStorage/IndexedDB writes) | Unit test |
| Validation/consent UX unchanged: `isValidEmail`/`MAX_EMAIL_LEN`/`MAX_NAME_LEN` enforced before any event construction | Unit test |
| Live end-to-end: a real signup on production arrives in operator-jjohare's forum DM inbox | Manual E2E after precondition 1, recorded in runbook |
| `npm run lint`, `npm run build`, `npm test -- --run` green; `cd forum-config && cargo test` green | CI |

### Phase 2 (Agent Chat)

| Metric | Target |
|--------|--------|
| **A chat question receives a junkiejarvis reply end-to-end on the live relay** | Manual E2E on production; round trip < 30 s (LLM hard timeout is 25 s) |
| Client subscribes (NIP-42 AUTH → REQ own inbox) **before** publishing the question | Unit test asserts frame ordering (AUTH, REQ, then EVENT) |
| Keepalive at ~12 s cadence while the panel is open; full teardown on FAB close/unmount | Unit test with fake timers |
| Sends serialised: input disabled while a reply is pending (replies carry no e-tag correlation) | Unit test |
| 30 s client timeout renders a friendly fallback message and re-enables input | Unit test with fake timers |
| Session key is in-memory only and regenerated per page load | Unit test |
| Connect/AUTH failures render system messages in the chat panel — never silent failure | Unit test |
| `VITE_AI_CHAT_URL` fully retired: zero references in `src/`, `vite-env.d.ts`, workflows, docs env lists | `grep -r VITE_AI_CHAT_URL` returns nothing |
| junkiejarvis present in `forum-config/dreamlab.toml` `[[agents]]`; config tests green | `cd forum-config && cargo test` |
| Bundle: `nostr` manual chunk exists; no chunk exceeds `chunkSizeWarningLimit: 1000` | Build output inspection |
| All Phase 1 metrics continue to pass; `src/pages/__tests__/Contact.test.tsx` stays green | 0 regressions |

### Definition of Done (per phase)

1. `npm run lint` clean; `npm run build` succeeds with the new env vars stubbed in CI.
2. `npm test -- --run` green, including the new suites; `Contact.test.tsx` untouched and green.
3. `cd forum-config && cargo test` green (Phase 2 touches `dreamlab.toml`).
4. Manual end-to-end verification against the production relay (Phase 1: DM arrives in admin inbox; Phase 2: junkiejarvis reply round trip).
5. Env-var parity table (§7.4) fully satisfied — no surface ships an empty-string bake-in.
6. Cross-references landed: [ADR-041](../adr/041-anonymous-contact-dm-ingress.md), [ADR-042](../adr/042-website-agent-chat-routing.md), [DDD-11](../ddd/11-website-nostr-ingress-context.md), and the docs indexes.

---

## 3. Phase 1: Contact/Signup DM (Feature A)

Decisions covered: D1 (client-side direct publish), D3 (shared module), D4 (fire-and-forget one-shot key), D7 (env/deploy parity), D8 (ops runbook + seed script), D9 (GDPR posture).

### 3.1 Shared Module: `src/lib/nostr.ts` (D3)

Minimal primitives, no client-framework abstraction (D2 — `nostr-tools` only; see ADR-042). Reference implementation for the publish path: `scripts/seed/probes/probe-giftwrap.mjs`.

```ts
/** Fresh secp256k1 keypair; never persisted by this module. */
export function generateEphemeralKeys(): { sk: Uint8Array; pk: string };

/** WS connect → ["EVENT", wrap] → await ["OK", id, true].
 *  Rejects on OK=false (with the relay's reason string) or timeout. */
export function publishGiftWrap(relayUrl: string, wrap: Event): Promise<void>;

/** Connect → NIP-42 AUTH (sign kind-22242 with sk) → REQ {kinds:[1059], "#p":[pk]}
 *  → wrap/eose/error callbacks. Runs an application-level keepalive (~12 s)
 *  and exposes close() for teardown. Phase 2 consumer. */
export function openDmSession(relayUrl: string, sk: Uint8Array, cb: DmSessionCallbacks): DmSession;

/** kind-14 rumor (subject tag "DreamLab website signup", header + JSON payload)
 *  → nip17/nip59 wrap addressed to adminPubkey. */
export function wrapContactDm(sk: Uint8Array, adminPubkey: string, payload: ContactPayload): Event;

/** kind-14 rumor with plain text content → wrap addressed to jarvisPubkey. */
export function wrapChatDm(sk: Uint8Array, jarvisPubkey: string, text: string): Event;
```

Input caps reuse `src/lib/utils.ts` (`isValidEmail`, `MAX_EMAIL_LEN`, `MAX_NAME_LEN`, `MAX_MESSAGE_LEN`). Payloads are far below the NIP-44 65 535-byte plaintext cap (`nostr-bbs-core/src/nip44.rs:52`) and the relay's `max_content_length: 65536` (`nip11.rs:192-198`).

All connections are pinned to `VITE_RELAY_URL`; relay auto-discovery is never enabled (the CSP `connect-src` allowlist at `index.html:72` would silently block third-party relays).

Unit testing: jsdom has no WebSocket — the module accepts an injectable WS factory (or the tests mock the module boundary).

| File | Change |
|------|--------|
| `src/lib/nostr.ts` | NEW — primitives above |
| `src/lib/__tests__/nostr.test.ts` | NEW — mocked-WS unit tests (OK=true, OK=false, timeout, AUTH ordering, keepalive) |
| `package.json` | Move `nostr-tools` devDependencies → dependencies (first-time browser-bundle inclusion) |
| `vite.config.ts` | Add manual chunk `nostr: ['nostr-tools']` |
| `src/vite-env.d.ts` | `VITE_ADMIN_PUBKEY` becomes live (already declared, line 15) |

### 3.2 EmailSignupForm Cutover (D4)

Swap the Supabase upsert (`EmailSignupForm.tsx:51-61`) for `wrapContactDm` + `publishGiftWrap`:

- **One-shot ephemeral key** per submission via `generateEphemeralKeys()`; discarded after the relay OK. No reply path exists or is needed — the admin replies out-of-band using the email inside the payload.
- **Content:** a human-readable header line followed by JSON `{type:'contact_signup', name, email, has_consent, source:'website_signup_form', page_url, submitted_at}` with subject tag `"DreamLab website signup"`. The forum's DM view renders `content` verbatim, so the header keeps the admin inbox scannable while the JSON stays machine-parseable for any future triage bot.
- **Success only on relay OK=true.** OK=false or timeout surfaces an error toast with a fallback contact route — never false success. (This is the client-side guard for Risk R1.)
- Validation and consent UX are unchanged; no `@/lib/supabase` import remains in this component. `src/lib/supabase.ts`, Contact.tsx, and `gdpr-erasure.ts` are untouched (§5.2).

| File | Change |
|------|--------|
| `src/components/EmailSignupForm.tsx` | Submit path: Supabase upsert → `wrapContactDm` + `publishGiftWrap`; OK-gated success |
| `src/components/__tests__/EmailSignupForm.test.tsx` | NEW — success/failure/timeout/no-Supabase/key-hygiene tests |

### 3.3 Env & Deploy Parity, Phase-1 Slice (D7)

Vite inlines `import.meta.env.VITE_*` at build time; a var missing from a build surface bakes in an empty string with no runtime fallback. Phase 1 wires `VITE_RELAY_URL` (reuse the existing workflow-level value verbatim) and `VITE_ADMIN_PUBKEY` (= `6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a`) across every surface in the parity table (§7.4).

Values are sourced from the `forum-config/dreamlab.toml` canon (`[admin].static_pubkeys`, line 59), following the `admin-pubkeys-sync` CI precedent (`ci.yml:226-263`). This does add a fourth-plus hand-synced copy of the admin pubkey; that trade-off is accepted and noted against the still-open ADR-037 O1/O2 hand-synced-config gap (`CLOSEOUT-SECURITY-AUDIT.md`) rather than silently worsened.

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | Add `VITE_RELAY_URL`, `VITE_ADMIN_PUBKEY` to the React build step's `env:` block (lines 114-119) |
| `.github/workflows/ci.yml` | node-build (lines 84-99): stub values alongside the existing Supabase stubs |
| `.github/workflows/test-and-lint.yml` | Build step (lines 54-58): same stubs |
| `.env.example` | Add both vars (closes part of the pre-existing drift flagged in `forum-deployment-sequence.md:287`) |
| `CLAUDE.md` | Env-var list updated in lockstep |

### 3.4 Whitelist Runbook + Seed Script (D8) — satisfied at launch by the interim recipient; re-arms at key split

`scripts/seed/whitelist-admin-recipient.mjs` (NEW), mirroring the existing seed-script conventions: NIP-98-signed `POST /api/whitelist/add` for a `--pubkey` argument (default: operator-jjohare `6407eed8…425a`, the post-split `VITE_ADMIN_PUBKEY` target), admin key read from the environment, **never printed or persisted** (repo security rule).

Rationale, live-verified 2026-07-14: the D1 `whitelist` table holds 9 rows; operator-jjohare is absent, while the interim recipient (`11ed6422…663c`, the operator's working admin key chosen per ADR-041 Decision 5) is present. `is_whitelisted()` (`storage.rs:332-348`) queries only the `whitelist` table and does **not** consult `ADMIN_PUBKEYS`, so configured admin privileges confer no gift-wrap-recipient status. With the interim target this step is a no-op verification at launch; it becomes mandatory for the minted operator key when the ADR-040 D3 key split re-points `VITE_ADMIN_PUBKEY` — a DM to a non-whitelisted recipient is rejected `"blocked: gift-wrap recipient not whitelisted"`.

Runbook warnings:

1. The NIP-98-gated `/api/admin/reset-db` endpoint would silently wipe this row; the runbook must mandate re-running this script after any relay DB reset or reseed.
2. The whitelist entry also grants that pubkey kind-1059 read access and any cohort/zone access the chosen cohorts confer — the operator signs this off explicitly as part of the runbook step.

| File | Change |
|------|--------|
| `scripts/seed/whitelist-admin-recipient.mjs` | NEW — one-time NIP-98 admin whitelist insert |

### 3.5 Privacy & GDPR Copy (D9)

`src/pages/Privacy.tsx:34` ("Your email address is stored securely in our Supabase database") and `src/components/DataErasureRequest.tsx:124-125` (erasure promise covering "email subscriptions") become false for new signups the moment Phase 1 ships. Copy changes:

- Signup messages travel as end-to-end-encrypted direct messages readable only by the site administrator; they are not database rows.
- Erasure requests for signup messages are honoured by an operator-side purge process (manual).
- The existing Supabase erasure text remains valid for Contact-form data (`contact_submissions` and Contact-sourced `email_subscribers` rows).
- No copy claims multi-node delivery: single relay today; federation-ready by construction (kind 1059 already in `federated_kinds`); mesh transport is designed, not shipped.

The erasure trade-off is stated plainly in §5.3 and carried as Risk R5.

| File | Change |
|------|--------|
| `src/pages/Privacy.tsx` | Copy: DM-based signup handling, manual-purge erasure route |
| `src/components/DataErasureRequest.tsx` | Copy: scope the self-service deletion promise to Supabase-held data |

---

## 4. Phase 2: Agent Chat (Feature B)

Decisions covered: D1, D2 (nostr-tools only; no NDK), D3 (extends `openDmSession`), D5 (session model), D6 (keepalive + subscribe-before-publish), D7 (env parity, Phase-2 slice), D10 (roster entry). The junkiejarvis contract and routing decision are specified in [ADR-042](../adr/042-website-agent-chat-routing.md).

### 4.1 Session Model (D5)

- **Tier 1 (default):** per-session in-memory ephemeral key, regenerated per page load. No persistence = privacy by default; no reply-after-reload continuity, by design.
- **Tiers 2/3:** the existing NIP-07 path is retained as an identity signal only. DMs still ride the ephemeral session key — NIP-07 `signEvent` cannot portably perform NIP-44 unwrap for arbitrary gift wraps, so binding DMs to the extension key would break the reply path.
- **Serialised sends:** junkiejarvis reply rumors carry only `[["p", recipient]]` — no e-tag correlation to the triggering question (agentbox `junkiejarvis-agent.js`, `_sendDm`). The client therefore allows exactly one in-flight question: input disabled while a reply is pending, 30 s client timeout with a friendly fallback message, then re-enable.

### 4.2 Relay Session Lifecycle (D6)

Empirical relay quirks (agentbox `nostr-bridge.js:102-113` + `scripts/seed/probes/probe-jj-live.mjs`): the Cloudflare Durable Object stops pushing to an idle subscription after ~20 s without closing the socket, and a re-REQ does **not** reliably restore live delivery. Consequences are hard requirements:

- **Subscribe before publishing.** AUTH + REQ must complete before the question EVENT is sent.
- **Application-level keepalive** at ~12 s cadence (a cheap `REQ`/`CLOSE` pair) while the panel is open; full teardown on FAB close/unmount.

```
AIChatFab opened
  ├─ generateEphemeralKeys()                     (per page load, in-memory only)
  ├─ WS connect to VITE_RELAY_URL
  ├─ NIP-42 AUTH: sign kind-22242 with session key  (no whitelist check applies)
  ├─ REQ {kinds:[1059], "#p":[sessionPk]}        ← subscribe BEFORE publish
  └─ keepalive REQ/CLOSE every ~12 s while open
user sends question
  ├─ wrapChatDm(sessionSk, VITE_JARVIS_PUBKEY, text) → ["EVENT", wrap] → await OK
  └─ input disabled                              (serialised; replies carry no e-tag)
junkiejarvis (agentbox bridge, already whitelisted)
  ├─ unwraps kind-14 rumor → LLM (25 s hard timeout; fail-open canned apology)
  └─ gift-wraps reply to sessionPk
client
  ├─ nip59.unwrapEvent(wrap, sessionSk) → render reply; re-enable input
  └─ 30 s client timeout → friendly fallback message; re-enable input
```

### 4.3 AIChatFab Rewrite

Replace the fetch path (`AIChatFab.tsx:193-234`) with the `openDmSession` + `wrapChatDm` flow. Keep the tier UI. Render system messages in the chat transcript for connect/AUTH failures. Cap input at `MAX_MESSAGE_LEN` (`src/lib/utils.ts`, currently unused). Remove the `VITE_AI_CHAT_URL` constant (line 19) and the dead fetch branch entirely.

junkiejarvis needs zero relay provisioning: its pubkey (`2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9`) is already in the D1 whitelist (live-verified 2026-07-14), so the recipient-gated ingress check passes today.

| File | Change |
|------|--------|
| `src/components/AIChatFab.tsx` | Fetch path → DM session (D5/D6); tier UI kept; system messages; `VITE_AI_CHAT_URL` removed |
| `src/components/__tests__/AIChatFab.test.tsx` | NEW — ordering, keepalive, serialisation, timeout, failure-message tests |
| `src/vite-env.d.ts` | Add `VITE_JARVIS_PUBKEY`; drop `VITE_AI_CHAT_URL` |

### 4.4 Env & Deploy Parity, Phase-2 Slice (D7)

`VITE_JARVIS_PUBKEY` (= `2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9`) is added to the same five surfaces as §3.3, and `VITE_AI_CHAT_URL` is retired from all of them (§5.4). Full parity table in §7.4.

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | Add `VITE_JARVIS_PUBKEY` to the React build env block |
| `.github/workflows/ci.yml`, `.github/workflows/test-and-lint.yml` | Stub value in both build gates |
| `.env.example`, `CLAUDE.md` | Add `VITE_JARVIS_PUBKEY`; remove `VITE_AI_CHAT_URL` |

### 4.5 junkiejarvis Roster Entry (D10)

`forum-config/dreamlab.toml` `[[agents]]` is documented in-file as the authored source of truth for the agent roster, yet junkiejarvis — live and relay-whitelisted — is absent (pre-existing drift). Add an entry matching the existing six-agent pattern:

```toml
[[agents]]
label         = "junkiejarvis"
pubkey        = "2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9"
role          = "Conversational agent — website chat + forum DMs"
cohorts       = ["dreamlab", "agent"]
authorised_by = "6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a"  # operator-jjohare (human admin)
```

Documentation-only config change, permitted in this repo (no kit behaviour change). `cd forum-config && cargo test` must stay green.

| File | Change |
|------|--------|
| `forum-config/dreamlab.toml` | `[[agents]]` junkiejarvis entry |

---

## 5. Migration Strategy

### 5.1 EmailSignupForm Cutover — no dual-write

Hard cutover in a single release. From the deploy onwards, Supabase `email_subscribers` stops receiving **new** signup-form rows; there is no dual-write period and no backfill. Existing rows remain in Supabase and remain erasable through the existing `gdpr-erasure.ts` pipeline. Rollback is a plain `git revert` — no schema changes, no D1 migrations, no worker deploys are involved; the whitelist row from §3.4 is inert if the feature is reverted.

### 5.2 Contact.tsx — explicitly out of scope

`src/pages/Contact.tsx` independently inserts into `contact_submissions` and upserts the visitor's email into `email_subscribers` (lines 101-107). It keeps doing both. Consequence: the logical "email subscription" concept temporarily lives in two backends depending on entry point (Contact → Supabase; signup form → DM). This is an accepted, documented follow-up — `src/lib/supabase.ts`, `gdpr-erasure.ts`, and `Contact.test.tsx` are untouched by this PRD, and `VITE_SUPABASE_*` stays in every workflow and `.env.example`.

### 5.3 GDPR posture change (D9) — the erasure trade-off, stated plainly

NIP-09 deletion requires `deletion.pubkey == event.pubkey`. The kind-1059 row's author is a throwaway key that `createWrap()` never exposes to the caller (and the kit zeroizes its counterpart). **Erasure of a sent DM is therefore cryptographically impossible for both the sender and the recipient — only an operator-side D1 purge works.** The self-service erasure available for Supabase rows is replaced, for signup DMs, by a manual operator process.

What is gained in exchange: end-to-end encryption in transit and at rest (the relay operator cannot read DM content), no queryable PII table for signups, and strict data minimisation (the payload contains only what the visitor typed). This PRD carries the posture as an explicit accepted trade-off requiring legal/policy sign-off (Risk R5); the §3.5 copy changes make the position public.

### 5.4 `VITE_AI_CHAT_URL` retirement

The variable was never configured anywhere (`forum-deployment-sequence.md:287`), so retirement is deletion, not migration: remove from `AIChatFab.tsx:19`, `src/vite-env.d.ts:18`, and any docs env lists. No workflow ever set it, so no workflow change is needed to remove it — only the additions in §4.4. Acceptance: repo-wide grep returns zero references.

---

## 6. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|-----------|--------|-----------|-------|
| R1 | Admin recipient not whitelisted: feature A dead-on-arrival against a non-whitelisted `VITE_ADMIN_PUBKEY`. Mitigated at launch by the interim recipient (`11ed6422…`, already whitelisted, live-verified 2026-07-14); re-arms at the ADR-040 D3 key split, and `/api/admin/reset-db` silently wipes whitelist rows | Low at launch; High at key split / after reseed | High | Interim recipient already whitelisted; `whitelist-admin-recipient.mjs --pubkey=…` at key split (five-location atomic change, ADR-041 Decision 5); client surfaces relay OK=false as an error toast (unit-tested), never false success; runbook mandates re-verification after any DB reset | Ops runbook |
| R2 | Anonymous LLM-cost abuse against junkiejarvis: relay enforces only 10 events/s/IP; no PoW, no CAPTCHA, no per-pubkey throttle on LLM calls; unlimited fresh ephemeral keys | Medium | Medium | Client-side per-session throttle + serialised sends (one in-flight question); ops kill-switch `JUNKIEJARVIS_ENABLED=0`; upstream ask: per-pubkey cooldown in agentbox (§7.3 — flagged, not implemented here) | Upstream-flagged (agentbox) + website repo |
| R3 | Calendar-fabrication residual: anonymous chat phrased with a date + event word can still cause junkiejarvis to publish a real kind-31923 calendar event; the `hasSchedulingIntent` gate (commit `5e626c20`) must actually be in the deployed image | Low (post-fix) | High | Launch precondition 2 (§2): verify deployed agentbox image includes `5e626c20`; upstream ask: suppress `create_event` directives for non-member senders | Ops runbook + upstream-flagged (agentbox) |
| R4 | Silent reply loss: the relay DO stops pushing to an idle subscription after ~20 s without closing the socket; re-REQ does not reliably restore delivery | High (empirical) | Medium | Subscribe-before-publish + ~12 s application keepalive (D6, unit-tested); 30 s client timeout with friendly fallback UX | Website repo |
| R5 | Erasure regression vs Supabase: sent DMs are cryptographically unerasable by sender or recipient (fact stated in §5.3); privacy promises on /privacy would otherwise become false | Certain (by design) | Medium | D9 copy changes to Privacy.tsx + DataErasureRequest; documented manual operator-purge process; explicit legal/policy sign-off on the posture before launch | Website repo (copy) + ops runbook (purge process, sign-off) |
| R6 | Bundle growth: first-time inclusion of nostr crypto in the browser bundle | Medium | Low | `nostr-tools` only, no NDK (avoids @noble version-family duplication); dedicated `nostr` manual chunk in `vite.config.ts`; measure against `chunkSizeWarningLimit: 1000` in the build report | Website repo |

---

## 7. Dependencies

### 7.1 ADR Forward References

| ADR | Decision coverage | Required by |
|-----|-------------------|-------------|
| [ADR-041 — Anonymous contact DM ingress](../adr/041-anonymous-contact-dm-ingress.md) | D1 (client-side direct publish), D4 (fire-and-forget one-shot key + payload schema), D8 (whitelist runbook), D9 (GDPR posture) | Phase 1 |
| [ADR-042 — Website agent chat routing](../adr/042-website-agent-chat-routing.md) | D1, D2 (nostr-tools only, no NDK), D5 (session model), D6 (keepalive + subscribe-before-publish), junkiejarvis contract | Phase 2 |

Numbering note: earlier ghost references in this repo's config/docs (PRD-010, PRD-012, ADR-073, ADR-084/085) were never committed and belong to a superseded numbering epoch; they are not dependencies of anything. The live ADR series continues at 041/042.

### 7.2 Domain Model Reference

[DDD-11 — Website Nostr Ingress context](../ddd/11-website-nostr-ingress-context.md): the new bounded context owning both features, a Customer of the Forum/Relay context. It records that junkiejarvis is the agentbox bridge implementation, not the aspirational agent-worker described in `docs/ddd/08`.

### 7.3 Upstream Asks (flagged in docs only — no upstream changes in this PRD)

| Upstream | Ask | Motivation |
|----------|-----|-----------|
| agentbox | Per-pubkey/per-session cooldown on junkiejarvis LLM calls | R2 — the anonymous DM path removes the implicit rate-limiting of forum membership |
| agentbox | Suppress `create_event` directives for non-member senders (or add a caller policy override to `_think()`) | R3 residual — anonymous visitors should not be able to trigger publicly visible calendar events |
| agentbox (optional) | Add `['e', <askerRumorId>]` to `_sendDm` reply rumors | Would unlock concurrent in-flight questions; until then the client serialises sends |
| nostr-rust-forum kit | **None required** | The recipient-gated 1059 ingress (upstream ADR-104) and the AUTH read gate already admit both flows unchanged |

### 7.4 Env-Var Parity Table (D7)

Every row must be satisfied on every surface in the same commit that makes `src/` consume the variable — Vite bakes empty strings otherwise.

| Variable | Value | deploy.yml React build env | ci.yml node-build | test-and-lint.yml | .env.example | vite-env.d.ts | CLAUDE.md env list | Phase |
|----------|-------|---------------------------|-------------------|--------------------|--------------|---------------|--------------------|-------|
| `VITE_RELAY_URL` | `wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev` (reuse existing workflow-level value) | ADD (lines 114-119) | ADD stub | ADD stub | ADD | already declared | ADD | 1 |
| `VITE_ADMIN_PUBKEY` | `11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c` (interim per ADR-041; canon: `dreamlab.toml:57`; re-points at ADR-040 D3 key split) | ADD | ADD stub | ADD stub | ADD | already declared (line 15) | ADD | 1 |
| `VITE_JARVIS_PUBKEY` | `2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9` (canon: new `[[agents]]` entry, §4.5) | ADD | ADD stub | ADD stub | ADD | ADD | ADD | 2 |
| `VITE_AI_CHAT_URL` | — retired | never present | never present | never present | never present | REMOVE (line 18) | never present | 2 |

### 7.5 Inter-Phase Dependencies

```
Phase 1 (Contact/Signup DM)
  [src/lib/nostr.ts + tests] ──────────────┐
  [package.json deps move + nostr chunk] ──┤
  [EmailSignupForm cutover] ── depends on: nostr.ts, VITE_ADMIN_PUBKEY parity
  [Env parity: RELAY_URL + ADMIN_PUBKEY] ──┤
  [Whitelist runbook (launch gate)] ───────┤── independent of code; must land before launch
  [Privacy/GDPR copy] ─────────────────────┘
                                            │
Phase 2 (Agent Chat)                        ▼
  [AIChatFab rewrite] ──── depends on: Phase 1 nostr.ts (openDmSession, wrapChatDm)
  [Env parity: JARVIS_PUBKEY; AI_CHAT_URL retired] ── depends on: Phase 1 parity pattern
  [dreamlab.toml [[agents]] entry] ── independent (config-only; cargo test gate)
  [agentbox image check (5e626c20)] ── launch gate, ops-owned
```

### 7.6 External Dependencies

| Dependency | Type | Constraint |
|-----------|------|-----------|
| Relay gift-wrap admission | Platform behaviour | Recipient-gated kind-1059 ingress (kit `nip_handlers.rs:430-451`, upstream ADR-104); author unchecked; EVENT publish needs no NIP-42 AUTH |
| Relay 1059 read gate | Platform behaviour | NIP-42 AUTH required; any keypair may AUTH; `#p` force-rewritten to the authed pubkey (`nip_handlers.rs:1170-1199`) |
| Relay idle behaviour | Platform behaviour (empirical) | ~20 s idle push-stop without socket close; re-REQ unreliable — drives D6 |
| junkiejarvis contract | Agentbox service | `{kinds:[1059], '#p':[jj]}` subscription; 25 s LLM hard timeout, fail-open; replies carry `[['p', recipient]]` only — drives serialised sends |
| `nostr-tools` | Library | Pin `^2.23.3`; byte-compatible `nip17`/`nip59` with the kit; no NDK (D2) |
| CSP | Site policy | `index.html:72` `connect-src` already permits the relay; all connections pinned to `VITE_RELAY_URL`; no auto-discovery |
| Federation posture | Platform roadmap | Single relay today; federation-ready by construction (kind 1059 already in `federated_kinds`); mesh transport is designed, not shipped |
