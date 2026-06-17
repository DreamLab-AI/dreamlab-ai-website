# Forum QA — bug list (2026-06-17)

QA pass driven through the browser sidecar (Chrome 149) with podkey 0.0.8 signing
as admin `11ed64…` (operator john, all cohorts; vault sealed under passphrase
`dreamlab`, `dreamlab-ai.com` pre-trusted, auto-sign on). Kit pin at exploration
time: `2f411f0` (== latest upstream `nostr-rust-forum@main`, so we are already on
the newest crates). Every nav panel was exercised; console was clean throughout
(only a benign preload `integrity` warning).

Legend: **SEV1** broken/blocking · **SEV2** wrong behaviour · **SEV3** polish.
Owner: **KIT** = nostr-rust-forum client · **DATA** = relay seed · **AGENTBOX**
= junkiejarvis bridge.

---

## Reported by operator

### B1 — Cannot @tag a user when starting a New Topic — SEV2 — KIT
- **Where:** the "Start a new topic — the first line becomes the title" composer
  (section page). Reproduced in Minimoonoir › Music (empty section).
- **Observed:** typing `@redd` shows **no autocomplete dropdown** and the client
  **never calls `/api/profiles/search`** (`profileCalls: []`). RedDreadTest1 is
  therefore untaggable from the new-topic box.
- **Contrast (works):** the *reply* composer (`message_input`) fires
  `/api/profiles/search?q=redd`, shows RedDreadTest1, and selection inserts
  `@RedDreadTest1 ` with the pubkey stashed for the `["p", …]` tag — even with a
  cold ProfileCache. Backend search is case-insensitive and correct
  (`redd`/`RedDread`/`reddreadtest1` all return `3c16674f…`).
- **Root cause:** the new-topic composer is a plain `<textarea>`; it does not use
  the `mention_autocomplete` component / mention logic that `message_input` has.
- **Fix:** wire the same mention autocomplete into the new-topic composer.

### B2 — `junkiejarvis` renders as pubkey, not nickname — SEV2 — DATA + AGENTBOX
- **Where:** EVERYWHERE junkiejarvis (`2de44d…16e9`) appears — chat replies
  (haikus, 2h ago in *Fairfield Events* and *chat with agents*), the calendar
  event it created, the **admin Users table**, notifications, DMs. All show raw
  hex `2de44d…16e9`; every other user shows a handle/name.
- **Root cause:** junkiejarvis has **no kind-0 profile**. `/api/profiles/batch`
  returns john + RedDreadTest1 but **omits 2de44d**; `/api/profiles/search?q=jun`
  returns `[]`. With no kind-0 the client name-resolver falls back to hex, and the
  agent is unsearchable/unmentionable-by-search (the `@junkiejarvis` static seed
  still tags it, but its *posts* can't be resolved back to a name).
- **Fix:** (DATA) publish a kind-0 for junkiejarvis now so it resolves everywhere
  instantly; (AGENTBOX) the bridge must publish its own kind-0 on startup so it
  survives a relay reset. Confirms the operator's "responding as pubkey".

---

## Discovered during QA

### B3 — Direct-load / refresh of `/community/admin` bounces admin to `/forums` — SEV2 — KIT
- **Where:** loading `https://dreamlab-ai.com/community/admin` directly (or
  refreshing on it).
- **Observed:** full-page load lands on `/forums`; only **in-app nav** to Admin
  works (then the panel renders fine — Users/Pending/Channels all load, the
  `get_signer` authed-read fix holds).
- **Root cause:** the AdminPage route guard redirects before `is_admin` /
  `ZoneAccess::loaded` resolves on a cold boot — the same race the navland task
  fixed for `AdminGatedGovernance` (Agents) but **not** for AdminPage. This is the
  generalised form of "I have to come in from the very top for this to work".
- **Fix:** make the admin guard wait on `ZoneAccess::loaded` before redirecting
  (mirror the AdminGatedGovernance fix).

### B4 — Admin Overview counters: Channels 0 / Messages 0 — SEV3 — KIT
- **Where:** Admin › Overview ("Messages 0", "Channels 0") and Admin › Channels
  ("No channels found"), despite 115+ posts across many sections.
- **Note:** the deployment runs at section+topic level (no kind-40 channels), so
  "Channels 0" may be technically accurate, but "Messages 0" with 115+ live posts
  is a stale/empty counter. Cosmetic (admin dashboard only).

### B5 — junkiejarvis fabricates calendar events from non-scheduling chat — SEV2 — AGENTBOX
- **Where:** Events shows "Haiku Writing Session — created by JunkieJarvis"
  (JUN 19), synthesised from john's "write me a haiku" messages.
- **Root cause:** the bridge's `hasSchedulingIntent()` gate (suppress calendar
  creation for chit-chat) is pending an agentbox rebuild. Out of kit scope.

### B8 — Cold deep-link load bounces to /login (session not restored in time) — SEV2 — KIT (follow-up)
- **Where:** a full-page load of any gated deep link (e.g. `/forums/:zone/:section`,
  `/events`, `/admin`) after having signed in — including a refresh.
- **Observed:** lands on `/login?returnTo=…` instead of restoring the session;
  signing in again (now possible cold, thanks to B7) returns you to the target.
- **Hypothesis:** the auth-gate Effect fires before the async session restore
  completes (same one-shot-before-ready class as B3/B7). This is the deeper layer
  of "I have to come in from the very top". **Not fixed this pass** — a focused
  auth-store restore-timing fix; flagged for a follow-up so it isn't bundled with
  the verified batch.

### B6 — Session-mirror gift-wraps appear in operator DMs — SEV3 — note
- **Where:** DMs list shows `fb868e…` "■ session … ended" entries (the Nostr
  Claude-Code session mirror self-DMing the operator). Harmless noise; could be
  filtered from the human DM list.

---

---

## Resolution (2026-06-17)

**Shipped** — kit re-pinned `2f411f0 → c7cb1534` (website `efbe758`, deploy
green, CDN serving `efbe758`). Live-verified on the deployed bundle:
- **B7** ✅ cold `/community/login` now shows "Sign in with browser extension …
  detected" by default (was the recovery-key flow); sign-in works cold + on
  `returnTo` deep-links.
- **B1** ✅ new-topic composer in a fresh channel now shows the mention dropdown
  and fires `/api/profiles/search` (was silent).
- **B2** ✅ junkiejarvis renders as "JunkieJarvis" in Events + admin Users.
- **B3** ✅ shipped (admin guard waits on `ZoneAccess::loaded`).
- **B8** ⬜ newly found during live verification (see below) — follow-up.

Kit PR **DreamLab-AI/nostr-rust-forum#61** (`fix/new-topic-mentions-and-admin-direct-load`):
- **B1** — New Topic composer now reuses `MessageInput` (full mention autocomplete
  + `["p"]` tags). Native check + 154 tests + fmt clean. Verified reply path live;
  new-topic path ships in this PR.
- **B3** — admin guard now waits on `ZoneAccess::loaded` before bouncing (mirrors
  `AdminGatedGovernance`). Direct-load `/admin` no longer kicks admins out.
- **B7 (NEW, == operator's "login does nothing from /community/login")** — root
  cause: `login.rs` `has_nip07` was a one-shot check at mount; podkey injects
  `window.nostr` *after* a cold load, so the page hid the extension button. Fixed
  with a brief re-poll. Reproduced live: `window.nostr` present + returns admin
  pubkey, yet page showed recovery-key flow → confirmed.
- Plus a pre-existing rustfmt-stable drift collapse in `link_preview.rs`.

**B2 — FIXED (data) + VERIFIED LIVE.** Published junkiejarvis kind-0
(`provision-junkiejarvis-relay.mjs`) + ran the admin `/api/admin/profiles/backfill`
(idempotent; the live kind-0→D1 projection lagged on D1 read-after-write). Relay
now resolves `JunkieJarvis` via `/api/profiles/search` + `/batch`. Browser-verified:
Events shows "JunkieJarvis" (no hex), admin Users row resolves the name. **Durable
follow-up (AGENTBOX):** the junkiejarvis bridge should publish its own kind-0 on
startup so it survives a relay/DB reset.

**B4 / B5 / B6** — not addressed this pass: B4 cosmetic (admin overview counters);
B5/B6 are agentbox (bridge `hasSchedulingIntent` gate; session-mirror DM noise).

CI note: kit `main` is already **fmt-red** (rustfmt-stable drift across
`nostr-bbs-config` + `nostr-bbs-pod-worker`, pre-existing, unrelated to this PR);
`cargo-deny`/`doc` are long-standing advisory failures. The gates validating this
change — **wasm32 check + test** — are green on main and on the PR.

---

## Healthy (verified working)
- Sign-in via NIP-07 (podkey) → session established, lands on `/forums`.
- Reply composer mentions (network + cache + selection + `["p"]` tag).
- Admin authed reads (Users/Pending/Channels/Sections) — `get_signer` fix holds.
- Notifications dropdown paints (#29 fix), shows mentions/replies.
- Pod browser friendly endpoint copy (#28), Events RSVP UI, DMs (NIP-44), Search
  API reachable (`/search` fires), zone heroes + cohorts render.
