# Upstream Security Report — nostr-rust-forum & solid-pod-rs

**Date:** 2026-06-27 · **Pins audited:** `nostr-rust-forum@3c16c21280f0b6080c6534094ebd9a5347ced4bf`,
`solid-pod-rs@0.5.0-alpha.2` (crates.io). **Threat model:** clients speaking raw
Nostr/HTTP are untrusted; the relay/pod may face hostile peers.

> **Why this lives in the overlay repo:** DreamLab consumes these crates but does
> not host their source. These findings are **not fixable in `forum-config/`** —
> they belong upstream. This document is written to be filed directly as issues /
> turned into PRs against the two upstream repositories. One ready-to-apply patch
> is included under `docs/sprint/upstream-patches/`.

Status legend: **[PATCH]** = unified diff provided · **[SPEC]** = fix described,
needs maintainer implementation + CI (we cannot build/test the wasm32 workers here).

---

## A. Relay worker (`nostr-bbs-relay-worker`)

The cryptographic core is strong (event-id recompute + Schnorr verify before any
side effect; NIP-98 URL/method/payload binding + atomic D1 replay; WebAuthn
genuinely verified). All HIGH issues are **read-side access control** — content is
written into the right zone but leaks when read/broadcast.

### A1. [SPEC] Live broadcast applies no zone/cohort gate — HIGH
`src/relay_do/broadcast.rs:41-67` (`broadcast_event`)
Only kind-1059 DMs are recipient-gated; every other kind is delivered to any
subscriber whose NIP-01 filter matches, with no `has_zone_access` check. A kind-42
to a Locked/Hidden zone is broadcast live to non-members, although the historical
REQ path withholds it.
**Fix:** in `broadcast_event`, for each candidate session resolve the event's zone
(same `get_channel_zone` / kind→zone logic used in `handle_req`) and skip sessions
whose `authed_pubkey` lacks access (admins bypass; unauth sessions get public-zone
only). Reuse the existing `handle_req` projection so read and broadcast share one
gate.

### A2. [SPEC] REQ/COUNT default-allow for non-channel/non-calendar kinds — HIGH
`src/relay_do/nip_handlers.rs:722-763`, `storage.rs:267-271`
`handle_req` only scopes kind-40 (own id), kind-42 (`#e`→channel zone), and
calendar kinds; the `_ => None` arm sends everything else (kind-1, kind-7,
kind-30023, …) unfiltered. Unmapped channels default to the `home` zone
(`get_channel_zone` fallback), so a never-mapped channel is treated as public.
**Fix:** enforce zone access at the query/storage layer (deny-by-default), or
explicitly map **every** zone-private kind instead of defaulting unknown kinds to
allow. Treat an unmapped channel as deny, not `home`.

### A3. [SPEC] Soft-hidden events are never suppressed on read — HIGH
`storage.rs:241-302` (`query_events`), `moderation.rs:106-114,315-331`
`hidden_events` is INSERTed by auto-hide (3+ reports) and admin-hide but is never
read — not in `query_events`, the REQ loop, COUNT, or broadcast. Only hard
`delete` removes content; "hide" is a no-op for readers.
**Fix:** exclude hidden ids in the read path, e.g. add
`AND id NOT IN (SELECT event_id FROM hidden_events)` to `query_events` (and apply
the same check in `broadcast_event` / `handle_count`). Consider letting admins see
hidden content with a flag.

### A4. [SPEC] NIP-45 COUNT bypasses access control — MEDIUM
`nip_handlers.rs:976-984` (`handle_count`)
`handle_count` calls `query_events(&filters)` and returns `len()` with no auth and
none of the per-kind zone projection from `handle_req` — an unauthenticated client
can COUNT activity in a Locked/Hidden zone (existence/volume metadata leak).
**Fix:** route COUNT through the same projection as REQ, or refuse COUNT on
zone-scoped filters for non-members.

### A5. [SPEC] WoT / invite / welcome registration gate is dead code — MEDIUM
auth-worker `src/webauthn.rs:827-1028` (`register_verify`); `wot.rs:431`,
`invites.rs:608`, `welcome.rs:429` have **zero call sites**; `invite_code` is
parsed and discarded.
If an operator sets `wot_enabled = 1` expecting invite/WoT-gated registration, it
is **not enforced** — any completed WebAuthn ceremony yields a credential.
**Fix:** wire `is_allowed_by_wot` / `consume_for_registration` /
`send_on_first_registration` into `register_verify`, or remove the inert
fields/functions and the misleading docs.

### A6. [SPEC] NIP-42 AUTH ignores the `relay` tag; challenge not rotated — LOW
`nip_handlers.rs:912-964` (`handle_auth`)
Validates kind/sig/challenge/600s window but never checks the kind-22242 `relay`
tag (NIP-42 binds AUTH to a relay URL), and leaves the session challenge in place
after success. Narrow (challenge is per-connection CSPRNG), but a signed AUTH could
be replayed by a relay sharing the challenge value.
**Fix:** validate the `relay` tag against the relay's own URL; clear the challenge
after consumption.

### A7. [SPEC] WebAuthn challenge consume is non-atomic; KV limiter fails open — LOW
auth-worker `webauthn.rs:893-907/1255-1376` (read-then-delete, no UNIQUE);
`nostr-bbs-rate-limit/src/lib.rs:39-42,58-62` (returns allowed on KV error; IP
defaults to `"unknown"`, collapsing IP-less traffic into one bucket).
**Fix:** atomic consume (`DELETE … RETURNING` or UNIQUE + `INSERT OR IGNORE`);
consider fail-closed/alarmed behavior for the KV limiter + replay store.

---

## B. Pod worker (`nostr-bbs-pod-worker`) & solid-pod-rs

Access-control core is sound: WAC deny-by-default with correct inheritance gating,
NIP-98 real on the consumed path, strong path-traversal defense in depth, cross-pod
write structurally impossible, `.acl` write-escalation blocked, **zero `unsafe`**,
no panics on untrusted input. Gaps are in **response hardening**.

### B1. [PATCH] Stored content served with attacker `Content-Type`, no `nosniff` — HIGH
`src/lib.rs:880-946` (GET serve), `:858` (profile card `text/html`),
`:1518-1542` (`validate_webid_html`). solid-pod-rs `src/ldp.rs` `guess_content_type`
auto-serves `.html` as `text/html`.
A user can store HTML/JS in a world-readable `/public/` (or `/profile/card`) and
have the pod serve `text/html`, executing in the **pod origin**.
*DreamLab mitigation:* pod origins (`dreamlab-pod-api.*.workers.dev`,
`pods-native.dreamlab-ai.com`) are distinct from the app origin `dreamlab-ai.com`,
so this is cross-origin (phishing) here, not same-origin XSS against the SPA.
**Fix (partial PATCH provided — `0001-pod-worker-cors-nosniff-credentials-guard.patch`):**
adds `X-Content-Type-Options: nosniff` to every response via the shared
`cors_headers`. **Remaining (SPEC):** add `Content-Disposition: attachment` (or a
hardcoded safe type) for `text/html` / `application/xhtml+xml` / SVG / unknown types
on world-readable containers — **excluding** the WebID profile card path
(`:843-868`), which must remain inline `text/html` for Solid browsers. Mirror in
solid-pod-rs `ldp.rs` for the native server.

### B2. [PATCH] CORS `*` origin + `Allow-Credentials: true` when `EXPECTED_ORIGIN` unset — HIGH
`src/lib.rs:165-177` (`cors_headers`), core `src/cors.rs:46-55` (`POD_CORS_HEADERS`).
**Fix (PATCH provided):** the same patch skips `Access-Control-Allow-Credentials`
whenever the origin resolves to `*`. Recommend additionally requiring
`EXPECTED_ORIGIN` (fail closed) and matching against an allow-list.

### B3. [SPEC] Container listing enumerates child names regardless of child ACL — MEDIUM
`src/container.rs:16-66`, `src/lib.rs:820-838` (`list_container`)
Membership is built from an R2 prefix `list()` with no per-child WAC check; a child
with a stricter own-ACL is still enumerated (name + `dcterms:modified`) to anyone who
can read the parent.
**Fix:** filter listing members by evaluating Read for the requesting agent on each
child, or document that containers must not mix visibility levels.

### B4. [SPEC] NIP-05 / WebFinger directory enumeration; limiter fails open — MEDIUM
`src/lib.rs:289-306,426-470`
`/.well-known/nostr.json?name=` returns pubkeys unauthenticated; `rl_nostr_json`
fails open on KV error and uses `"unknown"` as the IP fallback (shared bucket).
**Fix:** NIP-05 is public-by-design (document it), but make the limiter
fail-closed-ish on KV degradation and don't collapse IP-less requests into one bucket.

### B5. [SPEC] Storage quota charged to the pod owner, not the writer — MEDIUM
`src/lib.rs:1001,1059,1107,1188`, `quota.rs` (`check_and_reserve_d1`)
Every write reserves against `owner_pubkey`; append (inbox) / delegated writers spend
the owner's quota → quota-DoS against the owner.
**Fix:** account non-owner (append/delegate) writes separately, or bound
inbox/append container size independently of the owner quota.

### B6. [SPEC] Minor — pre-auth git probe; inbox append spam; `validate_webid_html` — LOW
- `src/lib.rs:633-635`, `git.rs:44-48`: git smart-HTTP matched before ACL (returns
  501 on CF — genuinely disabled; tighten for native deployments).
- `src/lib.rs:1111-1118`, `provision.rs:273-288`: any authenticated agent can append
  inbox objects (rate-limit/size-cap per sender).
- `src/lib.rs:1518-1542`: `validate_webid_html` checks only that JSON-LD parses, not
  that the HTML is non-executable (instance of B1).

---

## How to consume this

1. **Patch:** `git -C nostr-rust-forum apply
   path/to/0001-pod-worker-cors-nosniff-credentials-guard.patch` then PR it
   (covers B1 partial + B2). It is mechanically safe (header-only) but unbuilt
   here — run the kit's `cargo test` / wasm build in CI.
2. **Specs:** file A1–A7 and B3–B6 as upstream issues; the relay read-path trio
   (A1/A2/A3) is the highest priority and should share one zone-projection helper.
3. The **crypto/auth core needs no changes** — verified strong at this pin.
