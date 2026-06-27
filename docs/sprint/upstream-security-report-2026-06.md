# Upstream Security Report — nostr-rust-forum & solid-pod-rs

**Date:** 2026-06-27 · **Pins audited:** `nostr-rust-forum@3c16c21280f0b6080c6534094ebd9a5347ced4bf`,
`solid-pod-rs@0.5.0-alpha.2` (crates.io). **Threat model:** clients speaking raw
Nostr/HTTP are untrusted; the relay/pod may face hostile peers.

> **Why this lives in the overlay repo:** DreamLab consumes these crates but does
> not host their source. These findings are **not fixable in `forum-config/`** —
> they belong upstream. This document is written to be filed directly as issues /
> turned into PRs against the two upstream repositories. One ready-to-apply patch
> is included under `docs/sprint/upstream-patches/`.

Status legend: **[FIXED]** = implemented on an upstream branch · **[SPEC]** = fix
described, pending. (An earlier `0001` pod-worker patch was removed from this repo —
the kit implemented a stronger fix itself in `7b9bef45`; see §0.)

---

## 0. Upstream status & consumption chain (cross-checked 2026-06-27)

Verified against the live upstream branches (read via the GitHub REST API).

**Active fix branches (re-checked — both have progressed substantially)**
- `nostr-rust-forum@claude/agentic-qe-global-install-92nfhn` (+3 over `main`):
  commit `7b9bef45` lands the kit security fixes — **relay A1–A4** (`broadcast.rs`,
  `nip_handlers.rs` +270/-156: per-viewer zone gate on broadcast, read-path
  projection, hidden-event suppression, COUNT auth), **pod-worker B1/B2**
  (`lib.rs`/`content_negotiation.rs`: `nosniff` on every response, wildcard+credentials
  guard, **`CSP: default-src 'none'; sandbox` on `text/html`**, and an `Accept:
  text/html` relabel guard), **auth A5/A7**, plus a **preview-worker SSRF** fix and
  supply-chain (`deny.toml`, CI). ⇒ **patch `0001` below is now SUPERSEDED** by this
  commit (their CSP-sandbox approach is stronger than the `Content-Disposition` spec).
- `solid-pod-rs@claude/agentic-qe-global-install-l20lwk` (+9 over `main`): **B1, B2,
  B3, B4, B5, B6.1, B6.2, B6.3 all fixed** (server middleware + per-child WAC listing
  + write-path quota + NIP-05/inbox rate-limit + git read-auth opt-in + WebID HTML),
  with new tests, **plus** JSS v0.0.210 parity (git CORS on WAC denial,
  `JSS_BODY_LIMIT`, `write_acl` default gating). Their audit confirms A1–A7 **N/A**
  to that tree (correct — they're the NRF relay, §A here).
- The other NRF branches (`fix/nip07-topic-signing`, `chore/…alpha.0-pin`) are
  stale/superseded.

**⚠️ solid-pod-rs version was NOT bumped — still `0.5.0-alpha.2` on the branch.**
Re-publishing a changed `0.5.0-alpha.2` over the existing crates.io release is a
collision (cargo serves the cached/old one). The fixes need a **version bump**
(`0.5.0-alpha.3`) before any downstream can pin them.

**Two distinct pod trees — fixes land in different places.** §B findings exist in
both, with different root causes/fixes:
| | Kit CF pod-worker (`nostr-bbs-pod-worker`) | Native server (`solid-pod-rs-server`, agentbox) |
|---|---|---|
| Consumed by | this overlay's CF deploy (primary) | `[native_pod]` = `pods-native.dreamlab-ai.com` |
| B1/B2 fix | **patch `0001` here** (apply to NRF) | **done** on the solid-pod-rs branch |
| B4 root cause | fail-open **KV** limiter (real) | **no** limiter wired (real) |
| B5 root cause | quota keyed by `owner_pubkey` (real) | quota keyed by dir-name, **unenforced** |

> Corrections accepted from the solid-pod-rs audit: the "fails-open on KV" (B4) and
> "charged to owner_pubkey" (B5) wording in earlier drafts described the **CF
> Worker**, not the native server — both findings are real in their respective
> trees. This report now scopes them per-tree.

**Provide/consume verdict (verified in principle, pre-publish):**

✅ **NRF kit branch ↔ this overlay — LINES UP.** Verified:
- The kit security commit adds **zero new `solid_pod_rs::` calls**, so the kit branch
  **still builds against the published `solid-pod-rs 0.5.0-alpha.2`** — it does *not*
  require the unpublished solid-pod-rs branch. The kit is self-contained.
- The only consume-facing change, `nostr-bbs-config` validation, was checked
  field-by-field against our `dreamlab.toml` and **passes**: `mesh.peer_relays` empty
  (ok), `payments.token.ticker="DREAM"` non-empty (ok), zone ids unique (ok),
  `accent_hex` optional/unset (ok). New `Zone.accent_hex` is additive — our
  `ZONE_CONFIG`/`env.ts` ignore unknown fields.
- Relay A1–A4 only make zone enforcement *stricter*; the `/bbs` client treats
  withheld/locked reads as empty + renders lock state → improvement, not a break.

⚠️ **solid-pod-rs branch ↔ kit — not wired, and not required by the kit.** The kit
consumes `features = ["core"]` of the published alpha.2; the branch's B1–B5 fixes are
in `solid-pod-rs-server` (the **agentbox native pod**, built separately), and the
core-crate changes (B6.3 WebID, `JSS_BODY_LIMIT`) are additive. To consume them
downstream you must **bump+publish** solid-pod-rs (or add a `[patch.crates-io]
solid-pod-rs = { git, branch }` in the kit/workspace for a from-source test build).

**Pin-bump chain (when the branches merge):**
1. **solid-pod-rs** → bump to `0.5.0-alpha.3` + publish (only needed for the native
   pod / if the kit wants the core hardening).
2. **nostr-rust-forum** → merge `7b9bef45` to `main` (pod-worker B1/B2 + relay A1–A4
   already done there; patch `0001` is superseded).
3. **this overlay** → bump the dual-pin (`KIT_REF` ×3 + `forum-config/Cargo.toml`
   revs + `Cargo.lock`) to the new kit commit. The `pin-check` CI job already guards it.

**Nothing in `forum-config/` or `src/lib/bbs/` needs to change ahead of the pin bump.**

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

### B1. [FIXED — kit `7b9bef45` + solid-pod-rs branch] Stored content served with attacker `Content-Type`, no `nosniff` — HIGH
`src/lib.rs:880-946` (GET serve), `:858` (profile card `text/html`),
`:1518-1542` (`validate_webid_html`). solid-pod-rs `src/ldp.rs` `guess_content_type`
auto-serves `.html` as `text/html`.
A user can store HTML/JS in a world-readable `/public/` (or `/profile/card`) and
have the pod serve `text/html`, executing in the **pod origin**.
*DreamLab mitigation:* pod origins (`dreamlab-pod-api.*.workers.dev`,
`pods-native.dreamlab-ai.com`) are distinct from the app origin `dreamlab-ai.com`,
so this is cross-origin (phishing) here, not same-origin XSS against the SPA.
**Fixed.** Kit CF pod-worker (`7b9bef45`): `nosniff` on every response, a
wildcard+credentials guard, **`CSP: default-src 'none'; sandbox` on `text/html`**
(the WebID card still parses as data but cannot execute — neater than the original
`Content-Disposition` idea), and a content-negotiation guard so `Accept: text/html`
cannot relabel a stored non-HTML resource. The solid-pod-rs native server is fixed
equivalently (middleware `nosniff` + `Content-Disposition: attachment` for active
content types).

### B2. [FIXED — kit `7b9bef45` + solid-pod-rs branch] CORS `*` origin + `Allow-Credentials: true` when `EXPECTED_ORIGIN` unset — HIGH
`src/lib.rs:165-177` (`cors_headers`), core `src/cors.rs:46-55` (`POD_CORS_HEADERS`).
**Fixed.** The kit drops `Allow-Credentials` when the origin resolves to `*` (and on
the wildcard NIP-05 endpoint); solid-pod-rs advertises credentials only for an
allow-listed origin. Still recommend requiring `EXPECTED_ORIGIN` (fail closed).

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

1. **Kit fixes already on the NRF branch** (`7b9bef45`): relay A1–A4, pod-worker
   B1/B2, auth A5/A7, preview SSRF, supply-chain. Merge to `main`; this overlay then
   bumps the dual-pin (§0). No patch to apply — the kit implemented them directly.
2. **solid-pod-rs branch** fixes B1–B6 for the native server + core; **bump+publish
   `0.5.0-alpha.3`** so the native pod (agentbox) / kit can pin them.
3. **Still open — kit CF pod-worker only** (file as issues): B3 (container listing
   ACL), B4 (NIP-05 fail-open KV limiter), B5 (owner-keyed quota), B6 (inbox/git).
   The solid-pod-rs branch fixed these for the **native** server; the **CF Worker
   variant** in `nostr-bbs-pod-worker` still needs them.
4. The **crypto/auth core needs no changes** — verified strong at this pin.
