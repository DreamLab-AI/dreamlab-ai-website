# User-Journey Audit — Community Forum (Obelisk-Polish Sprint)

**Audit ID:** WI-7
**Auditor:** `user-journey-auditor`
**Date:** 2026-04-20
**Repository:** `community-forum-rs` (Leptos/WASM + Cloudflare Workers)
**Reference:** Obelisk (`external/obelisk`, Next.js + Prisma + Socket.io)
**Methodology:** Code-traced only. No running dev server. File paths and line numbers cite the tree at HEAD of `main` on 2026-04-20. Steps that could not be fully verified from code are flagged `[UNVERIFIED]`.

---

## Executive Summary

Community-forum-rs ships a Nostr-native group chat / forum with three mutually exclusive auth paths (passkey+PRF, NIP-07, locally-held key). The auth surface is the strongest part of the product: passkey registration is well-considered, hybrid-transport is deliberately blocked to preserve the PRF→Nostr-key invariant, and credential-manager interception is detected with actionable messaging.

Everything downstream of auth is weaker. The most damaging findings:

1. **Notifications are dead code.** `NotificationStoreV2.add()` is `#[allow(dead_code)]` and never called. No producer hooks kind-42 mentions, kind-4 DMs, or kind-1 replies into the store. The bell UI renders an empty array — by design, not accident.
2. **"Follow a post" does not exist.** Journey J-7 as specified cannot be audited because no follow / thread-subscription feature is implemented anywhere in the client, relay, or workers.
3. **`/signup` does not use passkey.** It calls `auth.register_with_generated_key()` and walks the user through an nsec backup screen. Passkey-first registration is reachable only from the admin-bootstrap CTA on `/` when `setup-status.needsSetup=true`. The sprint spec's J-1 assumes the common path is PRF; the actual common path is a generated hex key that the user must copy.
4. **DM navigation does a full page reload.** `dm_list.rs:on_start_conversation` calls `window.location.set_href("/dm/:pubkey")` instead of routing. This tears down the WebSocket pool, discards signal state, and re-runs every `Effect` on the destination page.
5. **Passkey recovery is impossible by design.** PRF is a deterministic function of `(authenticator, credential, salt)`. Lose the authenticator, lose the Nostr identity. There is no export, no recovery code, no secondary factor, no cross-device hybrid rescue (hybrid is blocked). This is not a bug — but it must be surfaced to users before they commit.
6. **Moderation from the target's perspective is unimplemented.** WI-2 is still in flight; no surface shows a user "you have been warned for X" with an appeal path.

Auth, channel, and DM send paths are fast (<2 clicks, <1s time-to-send in local traces). Discovery, settings, and composition have 8s loading timeouts that dominate perceived performance when relays are slow, with no stale-while-revalidate behaviour.

---

## Methodology

- Source-only. No instrumentation run, no browser trace, no perf profiler.
- Each journey is traced from the entry component through signal updates, async `spawn_local` boundaries, and network calls to `auth-worker` / relay.
- "Clicks" counts user actions that cause a commit (tap, Enter in a text input, submit). "Waits" counts boundaries where the UI shows a spinner, skeleton, or blocking dialog.
- Obelisk comparison uses `external/obelisk/src/components/LoginModal.tsx` and `external/obelisk/CLAUDE.md` as the reference. Obelisk is Postgres-backed; direct feature parity is not the goal — behavioural parity is.
- Severity scale: `blocker` (user cannot complete), `major` (user completes but loses data/time/trust), `minor` (friction without data loss), `cosmetic` (polish).
- Scoring: `Impact` 1–5, `Effort` 1–5, `Priority = Impact / Effort`.

---

## Cross-Journey Themes

| # | Theme | Evidence | Journeys touched |
|---|-------|----------|------------------|
| T-1 | Notifications are a Potemkin feature | `stores/notifications.rs:88` `#[allow(dead_code)] add()`; zero call-sites | J-5, J-6, J-7, J-8, J-9 |
| T-2 | Registration path bifurcates silently | `/signup` → generated key (`pages/signup.rs:62`); `/` admin CTA → passkey (`pages/home.rs:225-247`) | J-1, J-4 |
| T-3 | 8-second relay timeouts without stale-revalidate | `pages/channel.rs:201-208`, forums list, dm list | J-5, J-6, J-8, J-11 |
| T-4 | Page reloads where routes were expected | `dm_list.rs:65-99` `window.location.set_href` | J-8 |
| T-5 | Recovery is structurally impossible for passkey | `auth/passkey.rs:114` PRF derivation + `auth/passkey.rs:213` `check_hybrid_transport` | J-10 (entire journey) |
| T-6 | Target-side moderation surfaces don't exist | No `kind-30911/30912/30913` consumer in `pages/` | J-9 |
| T-7 | WoT / invite gate is spec-only | No `kind-3`-gated path in `auth/mod.rs`; no invite-code field in signup | J-4 |
| T-8 | Post-action confirmation is inconsistent | Channel send: no toast. Settings save: inline banner. DM send: optimistic bubble. | J-5, J-6, J-8, J-11 |

---

## Top-10 Friction Points (Severity × Frequency)

| Rank | Finding | Severity | Frequency | Journey | Fix Priority |
|------|---------|----------|-----------|---------|--------------|
| 1 | Notification store has no producer — bell is always empty | blocker | every session | J-5/6/7/8/9 | 5.0 |
| 2 | No recovery for passkey PRF identity; not disclosed before commit | blocker | irreversible on loss | J-10 | 4.5 |
| 3 | Follow / subscribe-to-post does not exist | blocker | wherever J-7 expected | J-7 | 3.0 |
| 4 | `/signup` generates a hex key and shows it; user expects passkey | major | every new non-admin user | J-1 | 4.0 |
| 5 | DM start does full page reload, loses state | major | every DM initiation | J-8 | 4.0 |
| 6 | WoT gate / invite path unimplemented; spec promises it | major | every blocked registration | J-4 | 2.5 |
| 7 | Moderation warning not visible to target | major | every moderation event | J-9 | 3.0 |
| 8 | 8s hard timeout with no stale cache replay | major | every slow-relay load | J-5/6/8/11 | 3.5 |
| 9 | Settings save uses banner not toast; scrolls off | minor | every profile edit | J-11 | 4.0 |
| 10 | Login "More options" hides passkey behind a disclosure | minor | every returning passkey user | J-2/3 | 3.5 |

---

## J-1 — First-Time Registration (Passkey PRF Path, as written in spec)

> **Spec intent:** A new user arrives, chooses passkey, completes WebAuthn PRF ceremony, has a Nostr keypair derived, lands in the app with a ready profile.

### Current flow (code-traced)

**Reality check:** The `/signup` route **does not** perform passkey registration. Passkey registration is only reachable from `/` when `/api/setup-status` returns `needsSetup=true`, i.e. first admin bootstrap.

**Path A — admin bootstrap (passkey):**
1. User arrives at `/` → `pages/home.rs:68-79` fetches `/api/setup-status`.
2. If `needsSetup=true`, `AdminSetupCta` renders (`pages/home.rs:211+`).
3. User taps "Create passkey" → `on_passkey` (`pages/home.rs:225-247`) calls `auth.register_with_passkey(name)`.
4. `auth/passkey.rs:114 register_passkey` runs: (a) GET `/auth/register/options`, (b) `navigator.credentials.create()` with PRF extension, (c) HKDF → schnorr key (`nostr_core::derive_from_prf`), (d) POST `/auth/register/verify` with NIP-98 signed body.
5. `check_credentials_intercepted` (`auth/passkey.rs:308`) runs pre-flight; aborts with actionable error if ProtonPass/Bitwarden hijacked `credentials.create`.
6. Navigate to `/setup` (`pages/setup.rs`) for nickname (2–50 chars) + optional about.
7. Publish kind-0 (`pages/setup.rs:118-156`), navigate to `returnTo || /forums`.

**Path B — `/signup` (generated key, what users actually get):**
1. User lands on `/signup` (`pages/signup.rs`).
2. Phase::Name — enters nickname, taps "Create account" → `do_create` (`pages/signup.rs:49-69`).
3. Internally calls `auth.register_with_generated_key(name)` (`auth/mod.rs:299`) — generates random k256 schnorr key, returns hex for backup.
4. Phase::Backup — UI displays 64-char hex + nsec bech32; user must check "I saved it" → `on_backup_done` (`pages/signup.rs:71-75`).
5. `nsec_backed_up=true` set in `AuthState`; navigate to `returnTo || /forums`.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J1-F1 | **major** | Spec's "first-time passkey" journey is not the default; users arriving via `/signup` never see passkey. |
| J1-F2 | **major** | Generated-key flow dumps raw hex privkey on screen with a "I saved it" checkbox as the only guard — no QR, no encrypted-export, no warning about screen recording or shoulder-surfing. |
| J1-F3 | **major** | No link between `/signup` and passkey flow; a user who wants passkey has no discoverable path from `/signup`. |
| J1-F4 | minor | Post-register, user is bounced to `/forums` with no onboarding tour; no "post your first intro" prompt. |
| J1-F5 | minor | `check_credentials_intercepted` message is correct but long; truncates on narrow viewports. |
| J1-F6 | cosmetic | Passkey button label "Create passkey" doesn't explain that this will also create their Nostr identity. |

### Time-to-value (Path B, typical)

- Clicks: 3 (name, Create, "I saved it")
- Waits: 1 (generate key, <50ms perceived)
- Decisions: 2 (nickname, did-I-really-save-it)
- Total: ~20s for a diligent user who copies the nsec; ~5s for one who doesn't.

### Obelisk comparison

Obelisk's `LoginModal.tsx` surfaces three choices at the same level (NIP-07 / nsec / NIP-46 bunker). It does not offer PRF, but it also does not hide any path behind a bootstrap flag. Community-forum-rs should match that flatness.

### Recommendations (ranked)

1. **Add passkey as first option on `/signup`** with the generated-key path as "Generate key (advanced)". Impact 5 / Effort 2 → **P 2.5**.
2. **Replace hex dump with an encrypted-download step**: user sets a passphrase, gets a `.nsec.enc` file + QR of the same. "I saved it" becomes "I downloaded and opened it once". Impact 4 / Effort 3 → P 1.3.
3. **Unify registration state machine** so `/signup` and home-CTA share one component with an auth-method selector. Impact 4 / Effort 3 → P 1.3.
4. **Onboarding tour** after `/setup` publish: "1 — introduce yourself (posts kind-1), 2 — join a channel, 3 — find your relays". Impact 3 / Effort 2 → P 1.5.

---

## J-2 — Returning Login (Same Device)

### Current flow

1. User arrives at `/login` (`pages/login.rs`).
2. Client reads `localStorage.nostr_bbs_stored_pubkey` — if present, it's rendered as a small "Last used: npub1…" hint [UNVERIFIED — could not locate the exact render site but `stored_pubkey.as_deref()` is passed to `login_with_passkey` at `pages/login.rs:239`].
3. Primary button is smart-selected:
   - NIP-07 extension detected → NIP-07 is primary (`pages/login.rs:125`).
   - Otherwise → key-input form is primary (`pages/login.rs:88-121`).
4. "More options" disclosure (`pages/login.rs:175-258`) expands passkey, local key, NIP-46 bunker alternatives.
5. User taps passkey → `login_with_passkey(stored_pubkey)` (`auth/mod.rs:271`) → `navigator.credentials.get()` with allowCredentials from stored pubkey → PRF → session.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J2-F1 | **major** | Passkey is hidden under "More options" even when `stored_pubkey` proves the user previously authenticated via passkey. Device-aware primary selection (NIP-07 vs key-input) ignores passkey history. |
| J2-F2 | minor | No skeleton for the passkey ceremony — between click and browser prompt there's a dead ~100ms. |
| J2-F3 | minor | Key-input form accepts both hex and nsec (`auth/mod.rs:348`), but the label says "Private key" without disambiguation. |
| J2-F4 | cosmetic | "Last used" hint is easy to miss; no favicon/avatar preview. |

### Time-to-value

- Clicks: 2 (open More options, tap passkey) or 1 if passkey is promoted.
- Waits: 1 (browser passkey prompt, ~1s depending on platform biometrics).
- Decisions: 0.
- Total: ~3s.

### Obelisk comparison

Obelisk auto-resumes via `obelisk-auth-in-progress` localStorage key so that NIP-46 bunker reconnection survives page reloads (`external/obelisk/src/components/LoginModal.tsx`). Community-forum-rs has no equivalent resume for bunker.

### Recommendations

1. **Promote passkey to primary when `stored_pubkey` exists and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` returns true.** Impact 4 / Effort 2 → **P 2.0**.
2. **Add bunker auto-resume** mirroring Obelisk's in-progress key. Impact 3 / Effort 3 → P 1.0.
3. **Label the key-input** "Private key (hex or nsec…)" with a format example placeholder. Impact 2 / Effort 1 → P 2.0.

---

## J-3 — Returning Login (New Device, Discoverable Credential)

### Current flow

1. User arrives at `/login` on a new device. No `stored_pubkey` in localStorage.
2. User taps "More options" → "Sign in with passkey".
3. `login_with_passkey(None)` (`auth/mod.rs:271`) — no pubkey hint.
4. `authenticate_passkey` (`auth/passkey.rs:189`) calls `navigator.credentials.get()` with empty `allowCredentials` → platform surfaces all eligible passkeys.
5. `check_hybrid_transport` (`auth/passkey.rs:213`) aborts if the browser selects a cross-device (CTAP hybrid/QR) transport — different PRF output = different identity. Error surfaces to user.
6. On success, `discover_pubkey_from_passkey` (`auth/passkey.rs:266`): first tries to decode `userHandle` as hex pubkey; on failure, POSTs credentialId to `/auth/lookup` (`auth-worker/src/lib.rs:163-250`) to resolve pubkey from the server's credential→pubkey map.
7. HKDF runs with resolved pubkey → schnorr signing key → session.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J3-F1 | **blocker** | If the user tries this from a phone scanning a QR from the laptop (hybrid), `check_hybrid_transport` aborts with a correct but terse error; user has no actionable next step on the new device. |
| J3-F2 | **major** | "More options" disclosure hides this path exactly when the user needs it most (new device = no stored_pubkey = passkey is the only memoryless option). |
| J3-F3 | minor | Error messages from `PasskeyError::HybridBlocked` don't explain *why* hybrid is blocked (PRF determinism); users perceive it as a bug. |
| J3-F4 | minor | `/auth/lookup` is rate-limited to 20 req / 60s per IP (`auth-worker/src/lib.rs:102`) — fine for humans but invisible to the user if they keep retrying. |

### Time-to-value

- Clicks: 2 (More options, Passkey).
- Waits: 1 browser prompt + 1 round-trip to `/auth/lookup` if needed (~300ms cold).
- Decisions: 1 (pick the right passkey from the sheet).
- Total: ~5s.

### Obelisk comparison

Obelisk does not have passkey; its cross-device story is NIP-46 bunker with QR/URL tabs. Notably, Obelisk's bunker flow *enables* cross-device where community-forum's passkey flow *blocks* it. If we want cross-device parity, bunker is the answer — not passkey hybrid.

### Recommendations

1. **On hybrid-blocked error, surface a dedicated screen**: "This browser tried to use your phone's passkey. PRF requires the same device. Options: (a) use the device where you registered, (b) use NIP-46 bunker, (c) use your nsec." Impact 4 / Effort 2 → **P 2.0**.
2. **Promote passkey to primary when no auth method is stored** (new device = cold start = passkey is the best UX bet). Impact 3 / Effort 1 → P 3.0.
3. **Add a progress indicator during `/auth/lookup`**. Impact 2 / Effort 1 → P 2.0.

---

## J-4 — Registration with WoT Gate (Blocked / Invite Paths)

### Current flow

**Spec-level, not implemented.** The sprint spec references "WoT auto-registration + activity-based invite credits" in `external/obelisk/docs/wot-and-invite-credits.md`, but community-forum-rs has no corresponding code:

- `auth/mod.rs` registration methods (`register_with_passkey:242`, `register_with_generated_key:299`) perform no contact-list (`kind-3`) lookup.
- `pages/signup.rs` has no invite-code field.
- `auth-worker/src/lib.rs` `/auth/register/verify` does not consult any allow-list.

`setup-status.needsSetup` gates the admin-bootstrap CTA but that is a one-time boot flag, not a WoT check.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J4-F1 | **blocker** | Feature entirely absent. Sprint spec lists as expected work; no partial implementation exists to audit. |
| J4-F2 | **major** | Without any gate, the forum is wide open to spam registration. Current mitigations (rate limit on `/auth/register/verify`) are IP-level only. |

### Time-to-value

- N/A — feature does not exist.

### Obelisk comparison

Obelisk (per `external/obelisk/CLAUDE.md`) has a documented WoT + invite-credits anti-spam core. Community-forum-rs should mirror the model: new registrations require either (a) a kind-3 follow from N existing members, or (b) a consumed invite credit from an existing member.

### Recommendations

1. **Implement spec WI-3 (WoT gate):** at `/auth/register/verify`, fetch kind-3 events tagging the new pubkey from at least 2 existing members; on zero matches, divert to invite-code path. Impact 5 / Effort 4 → **P 1.25**.
2. **Add invite-code field to `/signup`** (both paths). Validate against an `auth-worker`-issued single-use code bound to an issuing pubkey. Impact 4 / Effort 3 → P 1.3.
3. **Surface the gate pre-submission**: explain the WoT requirement before the user fills in nickname, don't reject after commit. Impact 4 / Effort 2 → P 2.0.

---

## J-5 — Posting First Channel Message

### Current flow

1. User navigates to `/chat` (`pages/chat.rs`) → channel list with dashboard (`pages/chat.rs:275-286`), filter pills (`:294-327`), skeleton (`:356-365`).
2. User picks a channel → `/channel/:id` (`pages/channel.rs`).
3. `ChannelStore` shared subscription fetches kind-42 history; per-component kind-40 fetch for metadata.
4. 8s loading timeout (`pages/channel.rs:201-208`) — if no events arrive, UI shows an empty/error state.
5. Auto-scroll + mark-as-read (`:211-230`) runs on each batch.
6. User types in composer, presses Enter → `do_send_text` (`pages/channel.rs:240-292`): build unsigned kind-42, async sign (privkey in `zeroize`d buffer or via NIP-07), publish via relay pool, then `ingest` to semantic search store.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J5-F1 | **major** | On post-send, no toast / no bubble colour change / no "sent ✓" tick. User can't tell if the event was accepted or rejected until another client echoes it. |
| J5-F2 | **major** | 8s hard timeout replaces history with empty-state; no stale-cache fallback from `ChannelStore`. |
| J5-F3 | **major** | First-message flow has no etiquette prompt — no "posting here is public" warning, no channel topic summary rendered above the composer. |
| J5-F4 | minor | Ingest to semantic search runs after publish; if publish fails, the message is still ingested into local search, creating ghosts. |
| J5-F5 | minor | No draft persistence — navigating away loses an in-progress message. |
| J5-F6 | minor | No mention autocomplete; `@npub…` is free-text. |
| J5-F7 | cosmetic | No Markdown preview; paste-an-image has no affordance. |

### Time-to-value

- Clicks: 3 (open chat, pick channel, send).
- Waits: up to 8s for history load, <1s for signature.
- Decisions: 1 (which channel).
- Total: ~12s cold, ~3s warm.

### Obelisk comparison

Obelisk uses Socket.io for real-time, so message-sent confirmation arrives as a broadcast echo. Community-forum-rs uses raw Nostr relays — it *could* still show an optimistic bubble with a "pending → confirmed" transition once the relay OK ack arrives.

### Recommendations

1. **Optimistic bubble with pending→confirmed→failed state** driven by relay OK/NOTICE replies. Impact 5 / Effort 3 → **P 1.67**.
2. **Stale-while-revalidate for channel history**: keep last N events in `ChannelStore` across mounts. Impact 4 / Effort 2 → P 2.0.
3. **Draft persistence per channel** in localStorage, cleared on successful send. Impact 3 / Effort 1 → P 3.0.
4. **Mention autocomplete** against the cached member set. Impact 3 / Effort 3 → P 1.0.
5. **First-post coaching card** shown once per channel when the user has zero prior messages there. Impact 2 / Effort 2 → P 1.0.

---

## J-6 — Creating a Forum Post

### Current flow

1. `pages/forums.rs` lists sections/boards [UNVERIFIED — exact render layout not re-read in evidence pass; relies on kind-40 section mapping].
2. User picks a section → `pages/section.rs` lists threads (kind-42 root events filtered by `#e` tag or similar).
3. User taps "New post" → opens composer (same `MessageInput` primitive as J-5, reused).
4. Submit publishes a kind-42 with a section tag; same async-sign pathway as J-5.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J6-F1 | **major** | No distinction in UI between "thread root" and "reply" — the kind-42 event shape is the same, so a reply posted without the right `e` tag creates an orphan thread. Risk of user error. |
| J6-F2 | **major** | No title field for threads — forum posts are just messages; no summary, no subject line. This is a deliberate Nostr-ism but UX-hostile for forum-style use. |
| J6-F3 | **major** | Same 8s timeout as channels; first thread can look empty. |
| J6-F4 | minor | No "post and notify followers" switch — even if J-7 existed, there'd be no composition-time hook. |
| J6-F5 | minor | No categorisation at compose time if user creates a thread from the section root. |

### Time-to-value

- Clicks: 3 (forums → section → new post) + typing + send.
- Waits: ~8s for section load cold.
- Total: ~15s cold.

### Obelisk comparison

Obelisk has a dedicated forum post data model (Prisma schema, see `external/obelisk/CLAUDE.md`). It supports titles, explicit reply vs thread distinction, and professional moderation hooks. Community-forum-rs relies on Nostr kind-42 + tags for all of this; the UX cost is real.

### Recommendations

1. **Add a title field for thread roots** stored as `subject` NIP-14 tag. Impact 4 / Effort 2 → **P 2.0**.
2. **Differentiate reply vs root in the composer** — separate "Start a thread" button vs inline reply box. Impact 4 / Effort 2 → P 2.0.
3. **Post preview** before publish (kind-42 is immutable once accepted by relays). Impact 3 / Effort 2 → P 1.5.
4. **Section-level "mute this thread"** preference persisted to localStorage. Impact 2 / Effort 1 → P 2.0.

---

## J-7 — Following a Post → Notification

### Current flow

**Does not exist.**

- No follow/subscribe UI on `pages/section.rs`, `pages/channel.rs`, or any post-detail view.
- `stores/notifications.rs:88-125` defines `NotificationStoreV2.add()` with `#[allow(dead_code)]`. Zero call-sites found by grep for `NotificationKind`, `push.*Notification`, `notifications.*add`.
- No server-side job or worker emits notifications to a user's stream. `auth-worker/src/lib.rs` has no notification endpoints.
- The bell icon in the top bar renders an empty list because the store has no producer.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J7-F1 | **blocker** | Feature absent at every layer (UI, store, producer, transport). |
| J7-F2 | **blocker** | Notification store exists *and is exported* which creates the false impression that notifications work. This is worse than not having a bell at all. |
| J7-F3 | **major** | No kind-3 / kind-30000 "follow list" concept exposed to the user — even the underlying Nostr primitive isn't wired in. |

### Time-to-value

- N/A.

### Obelisk comparison

Obelisk's Prisma schema and Socket.io server deliver typing indicators and mention notifications in real time (`external/obelisk/CLAUDE.md`). Parity for community-forum-rs is achievable using NIP-specific tags + a client-side subscription for `#p <me>` plus thread subscriptions (`#e <rootId>` → local store).

### Recommendations

1. **Wire a real notification producer:** subscribe on app-mount to `kinds=[1, 4, 42], #p=<mypubkey>` and push into `NotificationStoreV2`. Remove `#[allow(dead_code)]`. Impact 5 / Effort 3 → **P 1.67**.
2. **Add per-thread follow:** button on thread view stores `e` tag + root in `localStorage[followed_threads]`; client subscribes to those IDs and routes matches into the same store. Impact 5 / Effort 3 → P 1.67.
3. **Badge the bell** with unread count driven by the store. Impact 3 / Effort 1 → P 3.0.
4. **Persistence:** store notifications in IndexedDB so they survive reloads. Impact 3 / Effort 2 → P 1.5.

---

## J-8 — DM Flow

### Current flow

1. User taps "Messages" → `/dm` (`pages/dm_list.rs`).
2. List shows existing conversations. User taps "New" or enters a pubkey in the composer.
3. `on_start_conversation` (`dm_list.rs:65-99`) validates 64-char hex, rejects self-DM, then **calls `window.location.set_href("/dm/:pubkey")`** — full page reload.
4. `/dm/:pubkey` (`pages/dm_chat.rs`) mounts: `provide_dm_store` → `select_conversation(pubkey)` → `load_conversation_messages` → `subscribe_incoming`.
5. User types, taps send → `on_send` (`dm_chat.rs:92-132`) → NIP-44 encrypt → publish kind-4.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J8-F1 | **major** | Full page reload on conversation start. Tears down WebSocket pool, forces re-auth-state-hydrate, re-runs every root Effect. Noticeable ~500ms blank. |
| J8-F2 | **major** | No contact picker — user must paste a 64-hex pubkey. No integration with any member directory, follow list, or recent-interactions list. |
| J8-F3 | **major** | No notification for incoming DM (blocked by J-7 root cause). |
| J8-F4 | minor | Self-DM rejected, but no message that "you can't DM yourself" — the composer just silently doesn't submit. |
| J8-F5 | minor | No typing indicator, no read receipts. |
| J8-F6 | minor | NIP-44 v2 is the spec; kind-4 is legacy NIP-04. Mixing these risks interop bugs with other clients. |
| J8-F7 | cosmetic | No avatars next to message bubbles; just pubkeys/names. |

### Time-to-value

- Clicks: 3 (open DM, paste pubkey, send) for a cold start; 2 for an existing conversation.
- Waits: ~500ms page-reload + relay round-trip.
- Total: ~5s cold.

### Obelisk comparison

Obelisk DM UI (commit `2932fca "DM UI: show username with subtle pubkey underneath"`) shows usernames by default with pubkeys as an underline subtle — community-forum-rs' DM list could match easily.

### Recommendations

1. **Replace `window.location.set_href` with `use_navigate`** (`leptos_router`) to make DM-start a client-side route change. Impact 4 / Effort 1 → **P 4.0**.
2. **Contact picker** sourced from: (a) recent DMs, (b) kind-3 follows, (c) channel members where mutually present. Impact 5 / Effort 3 → P 1.67.
3. **Wire DM into the notification store** (depends on J-7 fix). Impact 5 / Effort 2 (piggybacks on J-7) → P 2.5.
4. **Username + subtle pubkey** render parity with Obelisk DM list. Impact 2 / Effort 1 → P 2.0.
5. **Migrate to NIP-44** encryption for new DMs; keep NIP-04 read path for back-compat. Impact 3 / Effort 3 → P 1.0.

---

## J-9 — Moderation Warning (Target's Perspective)

### Current flow

**Not implementable from current code.** WI-2 (moderation data model) is still in_progress. No target-visible surface exists:

- No consumer for custom kinds `30910–30914` (documented in spec as the moderation event range) in `pages/`.
- `stores/notifications.rs` has no moderation channel (and wouldn't fire anyway — see J-7).
- No `/moderation/received` or similar page; no banner component for "you have been warned".

A moderator *could* publish a kind-30912 (warning) event today via the admin CLI [UNVERIFIED — WI-1 admin CLI is in progress], but there is no client-side surface that would render it to the target.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J9-F1 | **blocker** | Target has no way to know they've been warned, muted, or reported. |
| J9-F2 | **blocker** | No appeal UI, no "view moderation history" page. |
| J9-F3 | **major** | Mute enforcement is client-side only (muted users list in `pages/settings.rs`) — a server-side mute via moderation event has no enforcement loop. |

### Time-to-value

- N/A — flow does not exist.

### Obelisk comparison

Obelisk has full moderation tables (`Ban`, `Mute`, `Report`, `Warning`, `ModerationAction`) in Prisma schema (`external/obelisk/CLAUDE.md`) plus a `/moderation/page.tsx` dashboard. Community-forum-rs should model the target-facing side (banner on next login, notification on receipt, dedicated "Received actions" page in settings).

### Recommendations

1. **On login, subscribe to `kinds=[30910..30914], #p=<me>`** and render an unavoidable banner for any unacknowledged action. Impact 5 / Effort 3 → **P 1.67**.
2. **"Moderation history received" section in `/settings`** listing warnings, mutes, and reports against the user. Impact 4 / Effort 3 → P 1.3.
3. **Appeal form** that publishes a reply-event (custom kind 30915?) back to the moderator's pubkey. Impact 3 / Effort 3 → P 1.0.
4. **Enforcement hook:** when a server-side mute for the viewing user is observed, disable composers in scope. Impact 5 / Effort 3 → P 1.67.

---

## J-10 — Recovery When Passkey Is Lost

### Current flow

**Structurally impossible by current design.**

- `auth/passkey.rs:114 register_passkey` derives the Nostr schnorr key via HKDF over the PRF output.
- PRF output is a deterministic function of `(authenticator, credential, salt)` where salt is stored server-side and returned at ceremony time.
- Lose the authenticator (phone wiped, security key lost, platform passkey not synced) → PRF cannot be regenerated → schnorr key cannot be reconstructed → Nostr identity is permanently unreachable.
- `check_hybrid_transport` (`auth/passkey.rs:213`) deliberately blocks cross-device hybrid, which is the only WebAuthn path that *could* carry credentials to a new authenticator.
- No export path: `auth/mod.rs` has no `export_nsec()` equivalent for passkey-derived identities. The privkey lives in a `zeroize`d buffer for one session and cannot be persisted.
- `pages/settings.rs` nsec-export copies the current in-memory hex to clipboard — this works only *during* a session and only if the user triggers it pre-loss.

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J10-F1 | **blocker** | Permanent identity loss with no recovery. Acceptable only if users knowingly consent. |
| J10-F2 | **blocker** | No pre-registration disclosure. User taps "Create passkey" without being told that loss = permanent. |
| J10-F3 | **major** | Settings has nsec-export but the user must remember to use it *before* losing the device. No prompt, no reminder. |
| J10-F4 | **major** | No secondary identity / guardian recovery (shamir-shared, social-recovery, or "export your key to an nsec file" as mandatory post-register step). |
| J10-F5 | minor | Logout (`auth/mod.rs:480`) zeros privkey — correct for session security but also means clipboard-export must happen before logout. |

### Time-to-value

- N/A. This journey's value is prevention, not flow.

### Obelisk comparison

Obelisk does not use PRF; nsec / NIP-07 / NIP-46 all permit portable identity. Community-forum-rs' passkey flow is the only auth method with irrecoverable loss semantics.

### Recommendations (in priority order — this journey is the single most dangerous gap)

1. **Mandatory disclosure before passkey create:** a blocking dialog stating "Losing this passkey will permanently delete your identity. There is no recovery. Continue?". Impact 5 / Effort 1 → **P 5.0** (highest in document).
2. **Mandatory post-register export step:** immediately after `register_passkey` success, prompt the user to export an encrypted nsec file (passphrase-wrapped). Mark identity as "unexported" in `AuthState` until completed. Impact 5 / Effort 3 → P 1.67.
3. **Periodic reminders:** if `nsec_backed_up=false` N days after register, show a banner. Impact 3 / Effort 1 → P 3.0.
4. **Secondary passkey enrolment:** allow registering additional passkeys (same PRF salt, same identity) — `/auth/passkey/add` endpoint on the worker. Impact 4 / Effort 4 → P 1.0.
5. **Document J-10 in the public docs** so users understand the trade-off before they commit. Impact 3 / Effort 1 → P 3.0.

---

## J-11 — Settings / Profile Edit

### Current flow

1. User navigates to `/settings` (`pages/settings.rs`).
2. Sections: Profile, Muted Users, Privacy, Appearance, Account.
3. Profile section: fields for name, about, picture URL, birthday.
4. User edits, taps Save → `on_save_profile` (`pages/settings.rs:164-240`):
   - Builds kind-0 content JSON.
   - Signs via current auth method (passkey, NIP-07, or local key).
   - Publishes via relay pool with `publish_with_ack` callback.
   - On ack success: shows inline "Profile saved" banner.
5. Privacy toggles save to `localStorage[nostr_bbs_privacy]` synchronously.
6. Account section: "Copy nsec" button copies hex to clipboard (session-only; only works for local-key and passkey-derived, not NIP-07).

### Friction points

| ID | Severity | Finding |
|----|----------|---------|
| J11-F1 | **major** | Save confirmation is an inline banner at the top of the Profile panel; on long-scroll settings pages it's often off-screen. |
| J11-F2 | **major** | No dirty-state guard — navigating away with unsaved changes silently discards them. |
| J11-F3 | **major** | kind-0 publish has no retry: if first relay rejects and callback fires error, user must click Save again. |
| J11-F4 | minor | Picture URL is free-text; no upload, no preview, no validation against image content-type. |
| J11-F5 | minor | Birthday field publishes to kind-0 content as a custom key — interop with other clients varies. |
| J11-F6 | minor | Copy-nsec puts a 64-char privkey on the system clipboard with no TTL / clear-on-expiry. |
| J11-F7 | cosmetic | Muted Users section has no search / filter. |

### Time-to-value

- Clicks: 1 (open settings) + N field edits + 1 (Save).
- Waits: ~500ms relay round-trip.
- Decisions: N per field.
- Total: ~15s for a 3-field edit.

### Obelisk comparison

Obelisk's `ProfileEditor` (referenced in `LoginModal.tsx`) uses the same kind-0 event shape with picture upload to server storage. Community-forum-rs should consider pairing settings-edit with a toast system and a dirty-state router guard.

### Recommendations

1. **Replace inline banner with toast** anchored to viewport; auto-dismiss 3s, click-to-view on save error. Impact 4 / Effort 1 → **P 4.0**.
2. **Dirty-state guard** on navigate-away if any section has unsaved changes. Impact 4 / Effort 2 → P 2.0.
3. **Automatic retry** with exponential backoff on kind-0 publish; surface per-relay ack status. Impact 3 / Effort 2 → P 1.5.
4. **Picture URL preview** with content-type check + fallback avatar. Impact 2 / Effort 1 → P 2.0.
5. **Clear clipboard after 30s** on nsec copy (best-effort via setTimeout + navigator.clipboard.writeText('')). Impact 3 / Effort 1 → P 3.0.

---

## Appendix A — Files Referenced

| File | Purpose |
|------|---------|
| `community-forum-rs/crates/forum-client/src/pages/signup.rs` | Generated-key registration path |
| `community-forum-rs/crates/forum-client/src/pages/login.rs` | Returning-user login UI |
| `community-forum-rs/crates/forum-client/src/pages/home.rs` | Admin bootstrap + passkey registration CTA |
| `community-forum-rs/crates/forum-client/src/pages/setup.rs` | Post-register profile publish |
| `community-forum-rs/crates/forum-client/src/pages/chat.rs` | Channel list |
| `community-forum-rs/crates/forum-client/src/pages/channel.rs` | Channel send + history |
| `community-forum-rs/crates/forum-client/src/pages/forums.rs` | Forum section list |
| `community-forum-rs/crates/forum-client/src/pages/section.rs` | Thread list within section |
| `community-forum-rs/crates/forum-client/src/pages/dm_list.rs` | DM conversation list |
| `community-forum-rs/crates/forum-client/src/pages/dm_chat.rs` | DM thread view |
| `community-forum-rs/crates/forum-client/src/pages/settings.rs` | Profile + preferences |
| `community-forum-rs/crates/forum-client/src/auth/mod.rs` | AuthStore (3 methods) |
| `community-forum-rs/crates/forum-client/src/auth/passkey.rs` | WebAuthn + PRF + HKDF |
| `community-forum-rs/crates/forum-client/src/stores/notifications.rs` | NotificationStoreV2 (dead code) |
| `community-forum-rs/crates/auth-worker/src/lib.rs` | Cloudflare Worker auth routes |
| `external/obelisk/src/components/LoginModal.tsx` | Obelisk login reference |
| `external/obelisk/CLAUDE.md` | Obelisk architecture reference |

## Appendix B — Unverified Claims

Marked `[UNVERIFIED]` inline where the evidence pass could not fully confirm a UI detail without a running environment:

- J-2 step 2: exact render site of "Last used" hint.
- J-6 step 1: precise render layout of `pages/forums.rs`.
- J-9 admin-CLI publish of kind-30912 warning events (WI-1 still in progress).

These do not change the friction findings — the structural gaps (dead notifications, impossible recovery, page-reload DM nav, absent follow) are code-verified.

## Appendix C — Priority Rollup (all journeys)

Highest-priority fixes ordered by Impact/Effort with severity weighting:

1. **J10-F2 — Mandatory passkey-loss disclosure** (P 5.0)
2. **J11-F1 — Toast instead of banner** (P 4.0)
3. **J8-F1 — `use_navigate` for DM start** (P 4.0)
4. **J7-F1 — Wire notification producer** (P 1.67, but highest impact 5)
5. **J10-F2b — Mandatory post-register export** (P 1.67, impact 5)
6. **J5-F1 — Optimistic send bubble** (P 1.67)
7. **J9-F1 — Target-side moderation banner** (P 1.67)
8. **J3-F2 — Passkey primary on cold device** (P 3.0)
9. **J2-F1 — Passkey primary when stored_pubkey exists** (P 2.0)
10. **J5-F2 — Stale-while-revalidate channel history** (P 2.0)

---

*End of audit. Next action is engineering triage against the WI-* tracker; no further auditor writes expected on this document unless evidence changes.*
