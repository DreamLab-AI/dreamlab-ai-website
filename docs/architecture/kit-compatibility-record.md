# Kit compatibility record

**Governs:** gap-close edge PRD WP-4, ADR-040 D2, ADR-038 (Kit-Ref Pin Governance)
**Purpose:** the durable, git-tracked answer to *"which `nostr-rust-forum` kit SHA
does each production deployment run, and at what maturity tier does it consume the
kit?"* — moved out of the transient deploy-summary comment
(`workers-deploy.yml`) into a citable artifact.

The single global `KIT_REF` pin (one production target today) is enforced in
lockstep by the `pin-check` job in `.github/workflows/ci.yml`: the three workflow
`KIT_REF`s, the four `forum-config/Cargo.toml` `rev=` pins, and **the SHA cited in
this record** must all resolve to the same commit, or the build fails. This record
is therefore not documentation that can silently drift — CI ties it to the live pin.

## Deployments

The schema admits more than one deployment row: a second branded deployment adds a
row here (its own host, SHA, tier), it does not duplicate a literal. Only the row
whose `kit_sha` is marked canonical (`✔`) is compared against the live `KIT_REF` by
CI; a second deployment pinning a different SHA would carry its own pin sites and
its own `pin-check` extension.

| Deployment host | Forum-kit SHA | Kit branch/tag at pin | Consumption tier | Canonical for pin-check |
|---|---|---|---|---|
| `dreamlab-ai.com` (+ mirror `thedreamlab.uk`) | `491b1fbc5217585f252d862349f3962a3d333a29` | `soak-fix-sprint-2026-07` (invite zone-grant race fix) | `integrated` | ✔ |

<!-- pin-check:canonical-kit-sha -->
```
CANONICAL_KIT_SHA=491b1fbc5217585f252d862349f3962a3d333a29
CANONICAL_KIT_VERSION=1.0.0-beta.6
```

The `CANONICAL_KIT_SHA` line above is the machine-readable field the `pin-check`
job extracts and compares against the workflow `KIT_REF`s and Cargo revs. Keep it
byte-identical to `KIT_REF` when bumping the kit.

## Pin sites (all must equal `CANONICAL_KIT_SHA`)

| Site | File | What it drives |
|---|---|---|
| `KIT_REF` | `.github/workflows/deploy.yml` | Forum-client (Leptos WASM) build |
| `KIT_REF` | `.github/workflows/workers-deploy.yml` | Five CF worker builds |
| `KIT_REF` | `.github/workflows/rust-ci.yml` | Kit-level fmt/clippy/test gates |
| `rev =` ×4 | `forum-config/Cargo.toml` | Overlay compiles/tests against the same kit |
| `CANONICAL_KIT_SHA` | this file | The citable provenance record |

## What tier `integrated` means here

`integrated` (ADR-002 vocabulary) is the ceiling for a consumer: the branded
deployment observably builds and serves the pinned kit's surfaces (workers, Leptos
client, the COM-13 disclosure badge, the F8 Agents roster tab) with **no local
reimplementation** — the thin-consumer property is machine-checked by the grep gate
over `src/` + `forum-config/src/` for kit-owned surface names (returns zero) and by
the `pin-check` lockstep. It does not claim `federation-verified`/`released`: the
edge carries no cross-substrate decision loop of its own to prove end to end.

## What this SHA contains (`main`, slug channel-list fix on 1.0.0-beta.5, ``)

Workspace release housekeeping atop the PWA feature: every kit crate changed
since its last version stamp moves to `1.0.0-beta.5` (ascii, auth-worker,
bbs-client, config, core, forum-client, mesh, pod-worker, preview-worker,
relay-worker; rate-limit/search-worker/setup-skill/canary unchanged), the
workspace dependency table is re-synced, `CHANGELOG.md` gains the consolidated
`[1.0.0-beta.5]` entry, workspace rustdoc is warning-clean, and a latent
test-only break is repaired (`nostr-bbs-config` validate.rs test `Zone`
literals were missing `auto_approve`; its 37 tests compile and pass again).
This overlay's pins move to `1.0.0-beta.5` for core/config/mesh accordingly.
Everything below is also present.

## What earlier SHAs added (`0c1dc57` — zone-bound BBS PWA, ADR-109)

ADR-109: a single-locked-zone member can install their zone as a mobile app.
A gated "Install mobile app" Settings section (shown only when
`BBS_PWA_ENABLED` is on AND the ADR-107 `home_zone_for` predicate resolves to
exactly one locked zone AND the session holds a readable local key) takes
explicit consent with a plain-spoken lost-phone warning, bakes the key
on-device (non-extractable AES-256-GCM wrap in IndexedDB + a BootProfile), and
hands off to the BBS, which now ships a manifest (id==scope==`/community/bbs/`,
`?pwa=1` start_url) + maskable icons + a minimal network-first service worker
(navigations always bypass HTTP cache and are never cache-written — the
historic stale-shell class is structurally impossible). Every launch of the
installed app boots one-shot: baked key adopted, landing pinned to the bound
zone, other zones hidden (relay cohorts remain the boundary). iOS home-screen
storage isolation is handled by a one-time first-launch Rebind (passkey PRF
else paste-once) followed by a local re-bake. Feature default OFF in the kit;
this deployment enables it and brands the manifest at deploy time. Design trio
shipped in-kit: `docs/prd/prd-zone-bound-bbs-pwa.md`,
`docs/adr/ADR-109-zone-bound-bbs-pwa-install.md`,
`docs/ddd/ddd-zone-bound-bbs-pwa.md`. Everything below is also present.

## What earlier SHAs added (`020b279` — hide media URLs)

Posting an image no longer shows the raw Solid pod URL as text. A posted image
previously rendered the bare URL as a line of text AND the embedded image;
`strip_media_urls()` now removes any embedded-media URL from the visible body (in
both the topic view and the chat bubble), so an image-only post is just the
image and a caption+image post drops the URL. The embed still opens full on
click and now also shows a small "open full" expand icon in its corner, hidden
by default and revealed on hover — the source stays one tap away without ever
printing the URL. Non-media links are untouched. Everything below is also present.

## What earlier SHAs added (`8cea7fd` — quote-and-append topic replies)

Main-forum topic replies move to a flat quote-and-append model. A topic is a
linear conversation, but you could previously only reply to the whole topic (one
bottom composer, no way to answer a specific message). Now every post — the topic
root and each reply — carries a "↩ Reply" button that quotes THAT message and
focuses the single bottom composer; the reply still appends at the bottom
(chronological, never nested). The card shows a compact inline quote of what it
answers (author + snippet), so context is visible without indentation, and the
quoted author is p-tagged (notified) alongside the topic starter. Threading is
kept correct by structure: the NIP-10 `reply` marker always points at the topic
root (so the topic list folds the reply and the reply list matches it), while the
quoted sibling is referenced with a separate `quote` marker the card renders
inline — a quote-reply never orphans out of its topic. Discourse-style linear
model; existing kind-1111 replies still render. Everything below is also present.

## What earlier SHAs added (`03d7515` — BBS author nyms)

The retro BBS rendered message authors as raw truncated pubkeys (`<11ed…663c>`)
even though its store already loads the same kind-0 profiles the main board
resolves names from. Added `author_label(profiles, pubkey)` (display_name → name
→ short-id) and wired it into every author surface: board thread messages, the
chat lobby, the topic list, the code-snippets view, and DM rows (Jarvis-aware).
Resolving inside the reactive closures means a row shows the short id first, then
re-renders to the nym the moment that author's kind-0 arrives. (Posted-image
ASCII rendering was already fixed by the media content-type change below —
`AsciiImg` fetches `?format=ascii`; it only degraded to "[ image unavailable ]"
because octet-stream skipped the transform.) Everything below is also present.

## What earlier SHAs added (`6668404` — avatar/media/BBS-sash fixes)

Three production fixes:

- **Avatar preserved across logins.** The app-root auto-whitelist effect
  republished kind-0 rebuilt from `{display_name, name}` only, clobbering
  `picture` (and `about`/`birthday`) on every relay connect — kind-0 is
  replaceable/last-write-wins. It now consults the relay's existing kind-0
  first: an already-registered identity is left untouched, and when a publish
  is genuinely needed it merges over the existing profile so the avatar and any
  claimed `nip05` survive.
- **Media renders (no more "image unavailable").** The upload client PUT every
  blob as `application/octet-stream`; the pod-worker stored/served that with
  `nosniff`, so `<img>` refused it and the BBS image→ASCII transform (gated on
  `image/*`) was skipped. The client now sends the real MIME (blob type, else
  extension), and the pod-worker recovers an image type from the path extension
  for legacy octet-stream objects, so already-stored images render without a
  re-upload.
- **Retro-BBS sash navigates.** The plain `<a>` to the separate BBS SPA was
  captured by the Leptos router (same-origin anchor interception) → route miss
  → 404 on click (a refresh, a real GET, worked). Now `rel="external"` plus an
  explicit hard-navigation `on:click` so the click escapes the SPA router.

Everything below is also present.

## What earlier SHAs added (`c9de76` — photo upload 403 fix)

Photo/avatar uploads no longer 403. The client provisioned pods at a bare
`POST /.provision` (the pod-worker 404s that; its endpoint is
`POST /pods/{pubkey}/.provision`), so the pod was never created and the media
PUT hit the WAC gate on an unprovisioned pod (deny-by-default 403). Fixed the
provision endpoint at both call sites, and made `upload_to_pod_signer`
self-healing: on 403/404 it provisions and retries once. Everything below is also
present.

## What earlier SHAs added (`1699cce` — one-deep message replies)

Message threading is kept exactly one level deep: a channel message that is
itself a reply no longer offers a Reply affordance (the ThreadView's Reply
button is gated on `allow_reply = !has_reply`), so an unsupported reply-to-a-reply
can't be started. Everything below is also present.

## What earlier SHAs added (`ee6ffb9` — new-joiner signup fixes + BBS SW)

Fixes an intermittent new-joiner signup race: the client publishes its kind-0
profile the instant it authenticates, but the whitelist row is created a beat
later by the auth-worker username-claim, so the relay rejected the kind-0 (author
not yet whitelisted) and the display name was lost, and the zone-access fetch
raced the claim so the zone-first landing never fired. Now the kind-0 publish
retries on rejection until the claim lands, and signup refreshes zone-access after
a successful claim (`ZoneAccess::refresh()`) so the joiner is landed in their
auto-approved zone with their name. Also: the forum service worker no longer
intercepts `<base>/bbs/` navigations (it was caching the BBS index as the forum
shell → BBS 404 / offline-shell poisoning); the retro-BBS sash now loads reliably.
Everything below is also present.

## What earlier SHAs added (`cfad1ad` — forum→BBS switch sash)

A thin, glitchy amber terminal sash under the forum hero switches the reader into
the retro ASCII BBS, under BOTH the `/forums` index hero and the zone landing hero.
Everything below is also present.

## What earlier SHAs added (`d4165f0` — per-zone auto-approval)

Per-zone auto-approval of new joiners. Each zone gains an `auto_approve` flag in
`ZONE_CONFIG`; when set, a new user is additively granted that zone's
`required_cohorts` at join time, landing in it without an admin approving them.
Opt-in per zone (deny-by-default; the historic `["members"]` default is preserved
for un-flagged deployments). Enforced at the **auth-worker username-claim** — the
path the signup wizard always calls (the relay's kind-0 auto_whitelist is
unreachable) — so it needs `ZONE_CONFIG` in the auth-worker `[vars]`; the relay
carries the same model defensively. This deployment opts **minimoonoir** in (new
joiners auto-granted the `friends` cohort); family/business stay manual-grant.
Everything below is also present.

## What earlier SHAs added (`5875beb` — BBS mobile-first redesign / ADR-108)

The retro BBS client (`nostr-bbs-bbs-client`, served at `/community/bbs/`) is
reimagined mobile-first per ADR-108 — the phosphor skin, ASCII image rendering,
numbered menu and keyboard model are kept while the modem-era interaction grammar
is replaced by the main board's patterns (onboarding landing, ≥44 px vertical
sign-in with extension-free paths, zones-as-cards drill-down, tappable back +
breadcrumbs, persistent bottom nav, threaded topics, in-composer image upload,
a11y prefs, encrypted DMs incl. Jarvis 1:1, native passkey sign-in, global
search, notifications). Config-driven `NODE_NAME`/`TAGLINE` text masthead
replaces the box-glyph art (operator branding: MINIMOONOIR / "private secure
forums"). Everything below is also present.

## What earlier SHAs added (`b866108` and before)

Everything in `5b1e2d8` (soak-fix sprint + ADR-107, itself atop the `3df5498`
gap-close slice: COM-13/F2 disclosure badge, F8/WP-5 Agents roster, F1
governance surfaces, COM-16/COM-17, REC-6) plus:

- **Admin create-channel panic fix** — the admin channel-creation flow no
  longer panics on submit (kit-side fix landing atop the relay-pacing/Solid-PUT
  slice below).
- **Relay send pacing** — the client paces REQ/EVENT/CLOSE frames under the
  relay's per-IP rate limit (boot burst previously dropped the message REQs,
  rendering "0 messages" site-wide); the relay-worker cap is now the
  `RATE_LIMIT_MSGS_PER_SEC` var (default 30, was hardcoded 10).
- **Solid PUT uploads** — pod media uploads use `PUT` (Solid resource
  semantics), fixing avatar/in-post images against self-hosted
  `solid-pod-rs` pods; the CF pod-worker accepts both verbs.

All render from the pinned kit at deploy time; this repo adds only branding
(`window.__ENV__` injection) and operator config (`dreamlab.toml`).

## Bump procedure

1. Re-pin `KIT_REF` in `deploy.yml`, `workers-deploy.yml`, `rust-ci.yml`.
2. Re-pin the four `rev=` in `forum-config/Cargo.toml` (bump each crate `version`
   to match the crate version at the new rev).
3. Update `CANONICAL_KIT_SHA` above and add/adjust the deployment row.
4. Run the overlay build (`cargo test --manifest-path forum-config/Cargo.toml`) and
   the `pin-check` gate locally; both must be green before pushing.

## History

| SHA | Branch/context | Notes |
|---|---|---|
| `491b1fb` | `soak-fix-sprint-2026-07` | Current (canonical — matches `CANONICAL_KIT_SHA` above and the `KIT_REF` pins). Invite zone-grant made race-safe: `grant_zone_cohorts` inverted to ensure-then-merge so a concurrent username-claim insert can no longer clobber the zone cohort for a brand-new invitee. Library crates unchanged (still 1.0.0-beta.6). |
| `3328220` | `soak-fix-sprint-2026-07` | Superseded. Slug/display zone alias applied across the whole UI (category cards, drill-downs, admin badges) — no raw `zone1..zone4` surfaced; ids/tags/cohorts unchanged. Carries the zone-bound invite feature (mint / `/join` landing / redeem-grants-zone) and the `/join` preview `state=active` validity fix. |
| `97eb579` | `main` (1.0.0-beta.6 release) | Superseded. Four library crates published to crates.io; overlay pivoted off the git-SHA pin (version deps). Consolidates the full-stack audit remediation + the generic-zone align. |
| `641832a` | `main` (full-stack audit remediation) | Superseded. Device-key proof-of-possession, dead-code/publish hygiene, NIP-42 hibernation-AUTH fix, relay ban-gate + new-channel + admin-TTL, systemic client on_cleanup leak sweep, exact solid-pod-rs pin, doc currency. |
| `e974bc7` | `main` (media-embed first-view fix + main-interface PWA) | Superseded. |
| `5d56319` | `main` (feedback sprint 2, issues #42/#43/#44) | Superseded. Operator-brandable header/footer wordmark (`BRAND_LABEL`) linking to the forum home via base_href; forums index h1 uses runtime `FORUM_NAME`; Pod Browser endpoint field moved inside the collapsible Solid explainer. |
| `50a3416` | `main` (release 1.0.0-beta.5) | Superseded. Workspace version bump (10 crates → beta.5), CHANGELOG entry, rustdoc-clean, config test-literal repair. |
| `0c1dc57` | `main` (zone-bound BBS PWA, ADR-109) | Superseded. Install-your-zone-as-an-app: gated Settings bake (consent + warning), BBS manifest/SW/icons, one-shot zone-pinned boot, iOS rebind. |
| `020b279` | `main` (hide media URLs) | Superseded. Posted images no longer print the raw Solid pod URL as text — the embed carries a hover "open full" expand icon instead (topic view + chat bubble). |
| `8cea7fd` | `main` (quote-and-append topic replies) | Superseded. Fixes the reply threading so a quote-reply stays in its topic (reply marker → root, quote marker → sibling). Main-forum topic replies get a per-post "Reply" that quotes the message and appends at the bottom (flat, inline quote, notifies the quoted author); retires nested/root-only replying for topics. |
| `03d7515` | `main` (BBS author nyms) | Superseded. BBS resolves message-author display names from kind-0 (board threads, chat, topic list, snippets, DM rows) instead of raw pubkeys. |
| `6668404` | `main` (avatar/media/BBS-sash fixes) | Superseded. kind-0 republish merges (avatar preserved); media served with real MIME (renders + ASCII); BBS sash full-navigates (no 404-on-click). |
| `c9de76` | `main` (photo upload 403 fix) | Superseded. Provision at /pods/{pubkey}/.provision + upload self-heals on 403/404. |
| `1699cce` | `main` (one-deep message replies) | Superseded. Reply button hidden on messages that are themselves replies (channel threading stays one level). |
| `ee6ffb9` | `main` (new-joiner signup fixes + BBS SW) | Superseded. kind-0 retry + zone-access refresh after claim (name + zone landing); SW leaves /bbs/ to the network (fixes BBS 404). |
| `cfad1ad` | `main` (forum→BBS switch sash) | Superseded. Glitchy amber "enter the retro BBS" sash under the forums-index AND zone heroes. |
| `959c30d` | `main` (switch sash, index only) | Superseded. Sash on the /forums index only (missed by single-zone users). |
| `d4165f0` | `main` (per-zone auto-approval) | Superseded. Config-driven `auto_approve` per zone at auth-worker username-claim; minimoonoir opted in (new joiners auto-granted `friends`). |
| `98bdf7b` | `main` (per-zone auto-approval, relay half) | Superseded. Relay-side `auto_approve` (defensive; the functional path is the auth-worker in `d4165f0`). |
| `5875beb` | `main` (BBS redesign, ADR-108) | Superseded. Mobile-first BBS reimagining (T1–T3): sign-in, onboarding, zones/threads, DMs, passkey, search, notifications; MINIMOONOIR branding. |
| `b866108` | `main` (admin create-channel panic fix) | Superseded. Admin channel-creation panic fix atop the relay-pacing/Solid-PUT slice. |
| `3c9fb83` | `main` (relay pacing + Solid PUT) | Superseded. Client send pacing under relay rate limit; PUT media uploads. |
| `5b1e2d8` | `main` (soak-fix sprint + ADR-107) | Superseded. 16 soak fixes, zone-first navigation, dev-auth harness. |
| `3df5498` | `gap-close/2026-07` HEAD + CI fix | Superseded. Removes dev-only `[patch.crates-io]` local path. |
| `6986276` | `gap-close/2026-07` HEAD | Superseded. COM-13 badge, F8 roster tab, governance surfaces. |
| `a149da4` | PR #63 head (v1.0.0-beta.3) | Superseded. BBS control-plane + live Chat/Code + pod-url clarity. |
| `3c16c21` | earlier | Superseded (JSS Solid surface, `solid-pod-rs` 0.5.0-alpha.2). |
| `25ca8a1` | earlier | Superseded. |
