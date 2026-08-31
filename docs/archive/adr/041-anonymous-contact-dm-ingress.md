# ADR-041: Anonymous Contact-DM Ingress — Client-Side Gift-Wrap Publish to the Admin Recipient

## Status: Proposed

## Date: 2026-07-14

## Context

The front-page signup form (`src/components/EmailSignupForm.tsx`, rendered from
`src/pages/Index.tsx:495-513`) currently upserts `{email, name, has_consent,
source}` into the Supabase `email_subscribers` table. That gives clean
self-service GDPR erasure (`src/lib/gdpr-erasure.ts` does a keyed `DELETE` by
email) but leaves visitor PII in a third-party database, misaligned with the
platform's nostr-first posture. This ADR replaces that write with a client-side
NIP-17 private DM to the admin recipient configured as `VITE_ADMIN_PUBKEY`.
**Interim recipient (operator decision, 2026-07-14):** the operator's current
working admin key
(`11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c`,
`forum-config/dreamlab.toml:57` — the visionclaw-server key whose admin-role
split is staged in ADR-040 D3). The post-split target is the freshly minted
operator key; see Decision 5 for the rotation obligation. operator-jjohare's
human-admin pubkey (`6407eed8…425a`, `dreamlab.toml:58-59`) was the drafted
recipient but is not currently relay-whitelisted, whereas the interim key is.
The sibling feature — routing the
ask-the-agent box to junkiejarvis — is decided in
[ADR-042](042-website-agent-chat-routing.md).

The relay already admits exactly this traffic shape, by the kit's accepted
design. The overlay sets `ingress_policy = "allowlist"`
(`forum-config/dreamlab.toml:28`), and for every other kind the relay's
`handle_event` rejects authors not in the D1 `whitelist` table. Kind-1059 gift
wraps are the deliberate, code-commented exception (kit
`nostr-bbs-relay-worker/src/relay_do/nip_handlers.rs:430-451`, upstream kit
ADR-104): because a NIP-59 wrap is signed by a fresh throwaway key that can
never be a member, admission is gated on the **recipient** — the first
`["p", …]` tag pubkey must pass `is_whitelisted()`. The author is deliberately
unchecked. Publishing an EVENT requires no NIP-42 AUTH (only REQ filters
touching kind 1059 are AUTH-gated, with `#p` force-rewritten to the authed
pubkey — `nip_handlers.rs:1170-1199`), and the WebSocket upgrade path applies
no Origin restriction (`nostr-bbs-relay-worker/src/lib.rs:167-170`). So
`ingress_policy=allowlist` does **not** block this path: an anonymous browser
on dreamlab-ai.com can publish a gift wrap today with zero registration, gated
only by the recipient check and a 10 events/sec/IP rate limit
(`relay_do/broadcast.rs:138-154`).

One live-verified fact shaped the recipient choice. `is_whitelisted()`
(`relay_do/storage.rs:332-348`) consults **only** the D1 `whitelist` table —
not the `ADMIN_PUBKEYS` env var, which feeds `is_admin()` alone
(`auth.rs:154-183`). A NIP-98-authed `GET /api/whitelist/list` probe (via
`scripts/seed/probe-users.mjs`, live-verified 2026-07-14) shows the table
holds 9 rows: **operator-jjohare is not one of them** (despite being a
configured `ADMIN_PUBKEYS` admin), while the interim recipient
(`11ed6422…663c`) **is**. A DM to a non-whitelisted recipient is rejected
with OK-false `"blocked: gift-wrap recipient not whitelisted"` — and a naive
client would show the visitor a false success. Targeting the interim key
therefore delivers with no operational prerequisite; targeting the human key
would first need a one-time admin `POST /api/whitelist/add` (Decision 5).

Paths considered for the ingress:

| Path | Verdict | Reason |
|------|---------|--------|
| (a) New HTTP intake endpoint on a worker that signs/republishes | Rejected | New upstream kit surface + a new service signing secret; visitor PII transits the worker in plaintext before wrapping — a privacy regression vs client-side encryption. No such endpoint exists today (relay/auth route tables enumerated; all admin-adjacent POSTs are NIP-98-gated). |
| (b) NIP-04 kind-4 DM | Rejected | Legacy-read-only in the forum client — outgoing DMs are exclusively gift-wrapped (`nostr-bbs-forum-client/src/dm/mod.rs:332-443`); kind-4 also leaks sender/recipient metadata. |
| (c) Keep Supabase as a dual-write alongside the DM | Rejected | Defeats the alignment goal and keeps PII in the third-party database; erasure bookkeeping is handled by policy instead (Decision 6). |
| (d) Mesh/federated delivery to the admin | Rejected | Not shipped. `nostr-bbs-mesh` is scaffold only ("federation is designed, not shipped", `nostr-bbs-mesh/src/lib.rs:1-21`), not a dependency of the relay worker; production runs `MESH_MODE=standalone` with zero peers. |
| (e) Client-side direct gift-wrap publish | **Adopted** | Zero kit changes; the repo's own probe (`scripts/seed/probes/probe-giftwrap.mjs`) already exercises the exact flow. |

## Decision

Adopt client-side anonymous gift-wrap publish as the contact-form ingress,
with a launch-blocking whitelist runbook and a revised erasure posture.

1. **Client-side direct publish; no new backend.** The browser opens a raw
   WebSocket to `VITE_RELAY_URL`, sends `["EVENT", wrap]`, and awaits the OK
   frame. No new worker, no HTTP proxy, no upstream kit change. All
   connections pin to `VITE_RELAY_URL`; relay auto-discovery is never enabled
   (the CSP at `index.html:72` permits only
   `wss://*.solitary-paper-764d.workers.dev` and would silently block
   third-party relays). Shared primitives live in `src/lib/nostr.ts`, the
   module [ADR-042](042-website-agent-chat-routing.md) also builds on.

2. **One-shot ephemeral sender key.** Each submission generates a fresh
   secp256k1 keypair via nostr-tools `generateSecretKey()`, used once and
   discarded after the relay OK. Nothing is persisted (no localStorage, no
   derivation from visitor identifiers) — the sender is anonymous and
   unlinkable across submissions. The admin replies out-of-band using the
   email address inside the payload; there is deliberately no in-thread reply
   channel for this feature.

3. **Event construction.** A kind-14 rumor tagged `["p", <admin pubkey>]` with
   subject `"DreamLab website signup"`, wrapped via `nip17.wrapEvent` from
   nostr-tools `^2.23.3` (already in `package.json` as a devDependency,
   promoted to a runtime dependency per
   [ADR-042](042-website-agent-chat-routing.md); byte-compatible with the kit's
   `nostr-bbs-core/src/gift_wrap.rs` rumor→seal→wrap construction). Never
   `wrapManyEvents` — it self-wraps a copy to the (non-whitelisted) ephemeral
   sender, which the relay would reject. Rumor content is a human-readable
   header line (the forum's DM view renders content verbatim) followed by a
   JSON payload:

   ```json
   {"type": "contact_signup", "name": "...", "email": "...",
    "has_consent": true, "source": "website_signup_form",
    "page_url": "...", "submitted_at": "..."}
   ```

   Client-side size enforcement stays well under the NIP-44 plaintext cap
   (65535 bytes, `nostr-bbs-core/src/nip44.rs:52`) and the relay's 64KB
   content limit (`nip_handlers.rs:804-837`).

4. **Success only on relay OK.** The form reports success iff the relay
   returns OK-true for the wrap's event id. OK-false — including
   `"blocked: gift-wrap recipient not whitelisted"` — surfaces as a
   user-visible failure with a fallback contact route. No fire-and-forget
   false positives.

5. **Recipient selection and the whitelist-add runbook.** The recipient is
   whatever pubkey `VITE_ADMIN_PUBKEY` carries, and the launch-blocking
   prerequisite is that **that pubkey is a row in the relay's D1 `whitelist`
   table**. The interim recipient (`11ed6422…663c`) already satisfies this —
   it was among the 9 whitelist rows in the live-verified 2026-07-14 probe —
   so the feature ships with no runbook step. The prerequisite re-arms
   whenever the recipient rotates: when the ADR-040 D3 admin-key split mints
   the operator key, the split becomes a **five-location atomic change**
   (the runbook's four `ADMIN_PUBKEYS` locations plus `VITE_ADMIN_PUBKEY` in
   `deploy.yml`/`.env.example`), and the operator must run
   `scripts/seed/whitelist-admin-recipient.mjs` for the new key: a
   NIP-98-signed `POST /api/whitelist/add`
   (`nostr-bbs-relay-worker/src/whitelist.rs:281-327`), admin key read from
   the environment and never printed. Two recorded side-effects: the row also
   grants the recipient kind-1059 REQ read access plus whatever the chosen
   cohorts confer (the runbook records the cohort list), and the NIP-98-gated
   `/api/admin/reset-db` endpoint (`lib.rs:285`) **silently deletes whitelist
   rows** — any reseed must re-establish the recipient's row, and Decision
   4's OK-gating is the canary that catches the regression.

6. **GDPR posture: operator-side purge, no self-service NIP-09.** NIP-09
   deletion requires `deletion.pubkey == event.pubkey`
   (`nip_handlers.rs:1362-1431`), and the stored kind-1059 row's author is the
   throwaway wrap key — which nostr-tools' `createWrap()` never returns to any
   caller and the Rust kit zeroizes (`gift_wrap.rs:277-281`). Erasure of a
   sent DM is therefore **cryptographically impossible for both the sender and
   the recipient** — only an operator-side D1 row purge works. `Privacy.tsx`
   and `DataErasureRequest` copy state that signup messages travel as
   end-to-end-encrypted DMs readable only by the admin, are not database rows,
   and that erasure requests are honoured by a manual operator purge. The
   Supabase erasure text remains valid for Contact-form data.

7. **Scope boundary.** Only `EmailSignupForm.tsx` loses its Supabase upsert.
   `src/lib/supabase.ts`, `Contact.tsx`, and `gdpr-erasure.ts` remain;
   migrating `Contact.tsx` is a documented follow-up, out of scope here.

## Consequences

### Positive

- Visitor PII is end-to-end encrypted in transit and at rest: only the admin
  recipient can decrypt the seal. No worker, database, or third party sees the
  plaintext — strictly better confidentiality than the Supabase row it
  replaces, and no new signing secret or backend surface is created.
- Zero upstream kit changes: the admission path is the kit's accepted design
  (upstream ADR-104), and the publish flow replicates the repo's own working
  probe (`scripts/seed/probes/probe-giftwrap.mjs`).
- The sender is anonymous by construction (one-shot ephemeral key), so the
  form leaks no cross-submission identity signal.
- OK-gated success (Decision 4) doubles as the operational canary for the
  whitelist row: if a reseed drops it, the form fails loudly instead of
  silently swallowing signups.

### Negative / Trade-offs

- **Single-relay delivery today.** The DM lands only in the one production
  relay's D1 `events` table and is readable only by a session authenticated as
  the recipient on that relay. The deployment is federation-ready by
  construction — kind 1059 is already in `federated_kinds`
  (`forum-config/dreamlab.toml:152`) — but the mesh transport is designed, not
  shipped (`MESH_MODE=standalone`, zero peers), so no multi-node delivery
  claim may be made in copy or docs. The `[mesh]` header comment's citations
  of "PRD-010 Phase 3 / ADR-073" refer to artefacts that were never committed
  (a dead numbering epoch) and are not prior art.
- **Spam surface.** Ingress is gated only by the 10 events/sec/IP sliding
  window (`broadcast.rs:138-154`) plus structural size/tag limits — no PoW,
  CAPTCHA, or per-recipient throttle, and kind-1059 bypasses content
  moderation (mod_cache covers kinds 1 and 42 only). Anyone who knows the
  admin pubkey can flood the inbox at that rate. Mitigations: client-side
  validation and size caps, the accepted-risk entry in the PRD risk register,
  and the threat-model subsection added to
  `docs/security/SECURITY_OVERVIEW.md`. Relay-side anti-spam for this kind
  would be an upstream kit ask.
- **Erasure regression.** Self-service deletion is replaced by a manual
  operator purge (Decision 6) — a materially weaker Article-17 mechanism than
  the keyed Supabase `DELETE`, carried as an explicit accepted trade-off in
  the PRD ([prd-nostr-contact-and-agent-chat-v1.0.md](../prd/prd-nostr-contact-and-agent-chat-v1.0.md))
  pending policy sign-off.
- **Reseed hazard.** `/api/admin/reset-db` silently undoes the whitelist row;
  the runbook step must be re-run after any relay reseed and is recorded in
  the ops runbook for that endpoint.
- The one-shot key means the admin cannot reply in-thread; the reply path is
  the email address inside the payload, which must therefore validate
  client-side (existing `isValidEmail` reuse).

### Neutral

- [ADR-031](031-dm-protocol-standardisation.md)'s kind-1059 material is now
  realised upstream as kit ADR-104; this ADR consumes that design rather than
  extending ADR-031.
- Env plumbing (`VITE_ADMIN_PUBKEY` wiring into the deploy/CI build env, value
  sourced from `dreamlab.toml` per the admin-pubkeys-sync precedent) is
  deploy-parity work carried in the PRD; per
  [ADR-037](037-config-single-source-of-truth.md) it must not become another
  hand-synced copy without noting the O1/O2 generator gap.
- The Website Nostr Ingress bounded context that owns this flow is mapped in
  [docs/ddd/11-website-nostr-ingress-context.md](../ddd/11-website-nostr-ingress-context.md).

## Related Decisions

- [ADR-031](031-dm-protocol-standardisation.md): DM protocol standardisation —
  Proposed (partial), the kind-1059 portion partially superseded by upstream
  kit ADR-104, which this ADR builds on.
- [ADR-040 D3](040-gap-close-edge-decisions.md) and
  [docs/deployment/admin-key-split-runbook.md](../deployment/admin-key-split-runbook.md):
  identify **whose key is the recipient**. Interim: the visionclaw-server
  working admin key (`11ed6422…663c`) — the operator's explicit 2026-07-14
  choice, since it is the identity they currently operate and it is already
  relay-whitelisted. This makes `VITE_ADMIN_PUBKEY` a fifth location the
  staged key split must move atomically: when the minted operator key replaces
  the visionclaw-server key, the split re-points `VITE_ADMIN_PUBKEY` and
  whitelists the new recipient (Decision 5), or signup DMs are silently
  orphaned to the retired key's inbox.
- [ADR-042](042-website-agent-chat-routing.md): sibling decision routing the
  ask-the-agent box to junkiejarvis; shares `src/lib/nostr.ts` and the
  OK-gated publish semantics, but uses a session-scoped key and an AUTH-gated
  read path this ADR deliberately omits.
- [ADR-037](037-config-single-source-of-truth.md): governs where the admin
  pubkey value is authored.
- Upstream kit ADR-104 (`docs/adr/ADR-104-gift-wrap-recipient-admission.md` in
  nostr-rust-forum): the accepted recipient-gated admission design.
- Upstream kit ADR-101 (`docs/adr/ADR-101-multi-device-dm-delivery.md` in
  nostr-rust-forum): why `#p` is never rebound device→owner on the read path.

## References

- Kit relay worker (`nostr-rust-forum/crates/nostr-bbs-relay-worker/src/`):
  `relay_do/nip_handlers.rs:430-451` (gift-wrap admission branch), `:87-95`
  (`gift_wrap_recipient`), `:804-837` (structural limits), `:1170-1199`
  (kind-1059 REQ AUTH gate), `:1362-1431` (NIP-09 author check);
  `relay_do/storage.rs:332-348` (`is_whitelisted`);
  `relay_do/broadcast.rs:138-154` (IP rate limit); `auth.rs:154-183`
  (`is_admin` — the mechanism the gift-wrap gate does *not* use);
  `whitelist.rs:281-327` (`/api/whitelist/add`); `lib.rs:167-170` (WS upgrade,
  no Origin check), `lib.rs:285` (`/api/admin/reset-db`)
- Kit crypto: `nostr-bbs-core/src/gift_wrap.rs` (rumor/seal/wrap construction,
  throwaway-key zeroize at 277-281), `nostr-bbs-core/src/nip44.rs:52`
  (plaintext cap); `nostr-bbs-mesh/src/lib.rs:1-21` (federation scaffold
  status)
- `forum-config/dreamlab.toml:28` (`ingress_policy`), `:57` (interim recipient —
  visionclaw-server working admin key), `:58-59` (operator-jjohare pubkey),
  `:149-156` (`[mesh]` standalone + `federated_kinds`)
- `scripts/seed/probes/probe-giftwrap.mjs` (reference publish flow),
  `scripts/seed/probe-users.mjs` (whitelist probe, live-verified 2026-07-14)
- `src/components/EmailSignupForm.tsx`, `src/lib/gdpr-erasure.ts`,
  `index.html:72` (CSP connect-src)
- nostr-tools `^2.23.3` `nip17.wrapEvent` / `generateSecretKey` (package.json)
