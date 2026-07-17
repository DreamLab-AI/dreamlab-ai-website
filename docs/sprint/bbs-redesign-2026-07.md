# BBS Redesign — "Split the Difference" (2026-07)

**Status:** Draft spec, implementation-ready
**Author role:** Design synthesist (BBS reimagining mesh)
**Operator brief:** *"Completely reimagine the /bbs rendering option making it far more user friendly and conformant. The ideas are ok but the mapping to early-BBS tropes has lost much of the intuitive usability of the rest of the forum. We can afford to split the difference."*
**Target surface:** upstream `nostr-bbs-bbs-client` (Rust/Leptos CSR, WASM), served at `/community/bbs/`. Forum behaviour changes belong upstream in `nostr-rust-forum`, so this spec drives changes in `kit/crates/nostr-bbs-bbs-client/` (and shared kit crates), not the React overlay.
**Inputs:** live mobile UX audit (14 screenshots at 390×844 / 360×640, iOS UA), feature-parity matrix (`nostr-bbs-bbs-client` vs `nostr-bbs-forum-client`), and direct source review.

> **Reading key.** Every decision below cites its evidence as `[AUDIT:<tag>]` (mobile UX audit finding) or `[PARITY:<feature>]` (parity-matrix row), plus `file:line` source anchors. Nothing here is speculative.

---

## 0. Problem statement

The BBS is a genuinely strong *aesthetic* whose *interaction model* was copied too literally from 1990s wildcat BBSs. The audit's one-line verdict: **the MENU screen is excellent on a phone, but the newcomer journey and the sign-in journey both fail.** The three load-bearing failures:

1. **Sign-in is structurally broken on mobile.** `sign_in_panel` (`src/screens.rs:1093-1105`) packs `[key/ prompt][nsec input][ sign in ][ generate ]` into a single `.bbs-cmdline` flex row (`assets/bbs.css:190-196`, `display:flex; gap:.5rem`) where the input is `flex:1` (`bbs.css:198-206`). The input eats the width; the two action `<span role="button">`s squeeze to 32 px and 62 px and, inheriting `white-space:pre-wrap` from `.bbs-panel` (`bbs.css:145`), shatter their labels vertically into "`[  [ / sign generate / in ] ]`". At 360 px "generate" clips off-screen. `[ sign in ]` at 32 px is below the 44 px touch minimum. This is the PRIMARY authentication surface. `[AUDIT:HIGH-1]`
2. **There is no extension-free mobile sign-in.** The `[ sign in with extension ]` CTA only renders when `crate::nip07::has_nip07_extension()` is true (`src/screens.rs:1081-1090`); on real iOS Safari / Android Chrome there is no `window.nostr`, so the *only* remaining path is the broken nsec row. `[AUDIT:HIGH-2]`
3. **Logged-out newcomers get trope-soup and zero onboarding.** The landing is `● ONLINE │ DREAMLAB BBS · NIP-01/42` over a numbered `[1]-[0]` jargon menu (`src/menu.rs:42-55`, `src/chrome.rs:120-143`). Every content screen is empty or locked when logged out — even the PUBLIC Support/Introductions boards show "(no messages yet — or you lack read access to this zone)" (`src/screens.rs:262`). The only explainer is buried behind `[0] Help` (`src/screens.rs:1118-1136`). `[AUDIT:HIGH-3]`

Supporting failures: zone identity clipped off the right edge and unreachable (`board_row` right-appends ` @{zone}` after a 24-char-padded name into a `white-space:pre` row — `src/screens.rs:169-173`, `bbs.css:172`) so the two "Fairfield Events" boards are indistinguishable `[AUDIT:ZONE-CLIP]`; back-nav from a board is a non-tappable `[ESC] back to boards` label (`src/screens.rs:251`) `[AUDIT:BACK-DEADEND]`; friendly names degrade to hex (`board 032f…11ea`, `11ed…663c`) `[AUDIT:HEX]`; ~50-60% of every content screen is blank because `.bbs-panel{flex:1 1 auto}` bottom-anchors content on mobile (`bbs.css:370`) `[AUDIT:WASTED-SPACE]`; DMs are advertised but "coming" (`src/screens.rs:697`) `[AUDIT:DMS]`.

The baseline `/community/` forum (screenshot 14) is the explicit usability target: headline + plain-language value props ("Create an account in seconds… No email or phone number needed"), Create-Account/Sign-In front and centre, a persistent Home/DMs/Forums/Profile bottom tab bar (`src/components/mobile_bottom_nav.rs`), skip-to-content, and 0 px horizontal overflow. `[AUDIT:BASELINE]`

---

## 1. Vision — what "split the difference" means concretely

The retro skin is not the problem; the retro *interaction grammar* is. We keep everything that reads as delightful and costs the user nothing, and we replace every trope that a first-time phone user has to *learn* before they can act.

### 1.1 Retro elements that EARN their place (keep, unchanged or enhanced)

| Element | Why it stays | Source |
|---|---|---|
| Amber/green/purple/sky phosphor palette + CRT scanlines, bloom, phosphor-ghost | Measured WCAG AA pass (10.8:1 status, 6.6:1 dim on `#0a0a0a`); the aesthetic differentiator; zero usability cost | `bbs.css:8-38,57-92`, `[AUDIT:A11Y]` |
| Monospace type + box-drawing headers | Terminal identity; alignment is intrinsic to the look | `bbs.css:18-20`, `src/screens.rs:66-73` |
| ANSI accent chips / `▓`/`▸`/`◆` glyph marks | Cheap, legible signposts; the zone accent chip (`.bbs-section-hero .label`) is already the *right* pattern and should be reused for rows | `bbs.css:288-297` |
| **ASCII image rendering** (posts, pod files, banners → phosphor ASCII) | The signature delight feature; on-theme, novel, and already responsive-scrolled (`.ascii-img-wrap{overflow-x:auto}`) | `src/ascii_img.rs`, `bbs.css:224-280` |
| Numbered main menu with large finger rows | The audit's single strongest screen; keep as the "home" and as a power-user accelerator | `bbs.css:336-352`, `[AUDIT:BASELINE]` |
| Agents / governance control-plane as menu item #1 | DreamLab's differentiator; full parity; surfaces even logged-out | `src/screens.rs:896-950`, `[PARITY:governance]` |
| Four CRT themes, the UA 571-C sentry Easter egg | On-brand personality; off the main path | `src/theme.rs`, `bbs.css:395-483` |

### 1.2 Tropes replaced with the forum's proven patterns

| Retro trope (remove) | Replace with (forum-proven) | Driven by |
|---|---|---|
| Numbered jargon menu as the *only* entry for logged-out users | A one-screen "what is this / why join" hero with plain-language value props + a first-class **Sign in** and **Create account at /community/** CTA, shown before the menu when signed out | `[AUDIT:HIGH-3]`, `[AUDIT:BASELINE]` |
| Sign-in as a cramped single-line command row | A stacked, full-width sign-in card: extension (if present) → passkey/`/community/` → generate throwaway → paste nsec, each a ≥44 px target on its own line | `[AUDIT:HIGH-1]`, `[AUDIT:HIGH-2]` |
| Zone identity as a clipped right-appended `@handle` | The existing accent **chip** rendered inline at the row's left, always visible, never clipped | `[AUDIT:ZONE-CLIP]` |
| `[ESC] back` / "press a number" / "Keys: …" as the only affordances | Real tappable controls (`← Boards` back button, tap rows, a persistent bottom bar); hotkeys remain but are never the *only* path | `[AUDIT:BACK-DEADEND]` |
| Raw hex identity (`board 032f…11ea`, `11ed…663c`) | Channel `name` (kind-40) and profile `display_name` (kind-0) resolved first, hex only as a dim fallback | `[AUDIT:HEX]` |
| Bottom-anchored, half-empty content screens | Top-anchored content; composer/input pinned to a real input bar; empty states become friendly, actionable "empty_state" copy | `[AUDIT:WASTED-SPACE]` |
| "swipe down from top = menu" (undocumented) as the return path | A persistent, labelled bottom nav bar (skinned terminal); swipe kept as an accelerator | `[AUDIT:BACK-DEADEND]`, `[AUDIT:BASELINE]` |

### 1.3 Design principles (the "difference" made testable)

- **Every action must be reachable by tap.** Hotkeys are accelerators, never the sole path (see §2.4).
- **Nothing critical is ever clipped.** `document.scrollWidth == clientWidth` at 360 px and 390 px on every screen (`[AUDIT:ZONE-CLIP]` measured overflow of 101-128 px today).
- **Newcomer-first.** A logged-out phone user understands *what this is* and *how to get in* within one screen, without opening Help.
- **Keep the tube, lose the teletype.** Phosphor, scanlines and ASCII art stay; the modem-era navigation model goes.
- **Touch targets ≥ 44 px; body type ≥ 12 px on mobile** (today the menu is great at 1.45rem but header/status/footer render ~10 px `[AUDIT:A11Y]`).

---

## 2. Information architecture

### 2.1 Mental-model mapping (forum ↔ redesigned BBS)

The forum's model is **Zone → Category/Section → Topic → Thread** across routed pages (`pages/forums.rs`, `category.rs`, `section.rs`, `thread.rs`) `[PARITY:hierarchy]`. The BBS today is **MainMenu → flat zone-grouped kind-40 board list → flat kind-42 posts with single-level reply** `[PARITY:threads]`. We do **not** port the forum's 4-table data model; we map the same *mental* drill-down onto the kinds the BBS already streams:

| Forum concept | BBS skin (redesigned) | Backing data | Today |
|---|---|---|---|
| Zone (public/friends/family/business) | **Zone card** (big accent chip, name, board count) | `ZONE_CONFIG` → `cfg.zones` (`src/config.rs:76-85`) | grouped inline, clipped `[AUDIT:ZONE-CLIP]` |
| Section / Board | **Board row** inside a zone | kind-40 channel (`relay::flat_zone_order`, `src/screens.rs:183-239`) | flat, all zones at once |
| Topic / Thread | **Thread row** (root post + reply count + last activity) | root kind-42 (no `e` reply tag) | absent — all posts flat `[PARITY:threads]` |
| Thread view / replies | **Thread screen** (root + nested replies) | kind-42 with `e`-tag to root (`relay::post_root_channel`, `channel_message_tags`) | single-level `[reply]` only |

**New `Screen` states** (extend `src/menu.rs` `Screen` enum + `chrome.rs BbsState`): keep the flat state machine — do **not** adopt `leptos_router` (the BBS is deliberately non-routed, `src/app.rs:1-4`). Add navigation depth via new `RwSignal` fields on `BbsState`:

```
BbsState {
  screen,             // existing
  zone:   RwSignal<Option<usize>>,  // NEW: selected zone index into cfg.zones
  board,              // existing (kind-40 channel id)
  thread: RwSignal<Option<String>>, // NEW: root kind-42 event id
  ...
}
```

Boards drill-down becomes: **Zones (cards)** → *tap zone* → **Boards in zone** → *tap board* → **Threads** → *tap thread* → **Thread + replies + composer**. Each level has an explicit tappable back control and a breadcrumb line.

### 2.2 Screen map (mobile-first)

```
┌─ Landing (logged OUT) ───────────────────────────┐   NEW
│  DREAMLAB BBS masthead (ASCII, compact variant)   │
│  "A retro terminal face for the Minimoonoir       │
│   community — agents, boards, your own pod."      │
│  [ ▸ Sign in ]            (opens Sign-in sheet)   │  ≥44px
│  [ ▸ Create account ↗ ]   (→ /community/)         │  ≥44px
│  [ ▸ Look around ]        (enters menu read-only) │
│  · 3 plain-language value props (chips)           │
└───────────────────────────────────────────────────┘
        │ (signed in, or "look around")
        ▼
┌─ Main Menu (kept; strongest screen) ─────────────┐
│  [1] Agents  [2] Boards  [3] Chat  [4] Members    │
│  [5] Pod  [6] Code  [7] Network  [8] Status        │
│  [9] Settings  [0] Help                            │
└───────────────────────────────────────────────────┘
   Boards drill-down (NEW depth):
   Zones(cards) → Boards(in zone) → Threads → Thread view
┌─ Persistent bottom bar (all screens, mobile) ────┐   NEW
│  ≡ Menu   ▤ Boards   ✉ DMs   ▸ Agents   ⚙/⏻ You   │
└───────────────────────────────────────────────────┘
```

### 2.3 Per-screen mobile layouts (the fixes)

- **Landing / onboarding (NEW).** Rendered by `ScreenView` when `signer.pubkey()` is `None` and the viewer hasn't chosen "look around". Masthead (ASCII, currently dropped on mobile `bbs.css:333` — **re-enable a compact variant here only**), one-sentence explainer, three value-prop chips reusing `.bbs-section-hero .label` styling, and three stacked ≥44 px CTAs. Directly answers `[AUDIT:HIGH-3]` and mirrors `[AUDIT:BASELINE]`.
- **Sign-in sheet (rebuilt).** Replace the single `.bbs-cmdline` row (`src/screens.rs:1093-1105`) with a **vertical stack** of full-width options, in priority order (see §3, F2):
  1. `[ ▸ Sign in with extension ]` — only if `has_nip07_extension()` (unchanged logic, now on its own full-width line).
  2. `[ ▸ Continue at /community/ ↗ ]` — always present; opens the forum login (passkey/WebAuthn) same-origin; the adopted session carries back via `adopt_forum_session()` (`src/app.rs:34-35`, `src/config.rs:113-123`). This is the **extension-free primary path** until native passkey lands (F9).
  3. `key/ [__________ nsec / hex __________]` input on its **own full-width row**, then `[ ▸ Sign in ]` full-width below it.
  4. `[ Generate a throwaway key ]` full-width; on success show the "back this up — shown once" hex (`src/screens.rs:1103-1109`) with a copy affordance.
  CSS: the sign-in container gets `flex-direction:column`; buttons get `white-space:nowrap; min-height:44px; width:100%`. Add `id`/`name` to the input (fixes the DevTools "form field should have an id or name" issue and enables autofill `[AUDIT:A11Y]`). Fixes `[AUDIT:HIGH-1]`, `[AUDIT:HIGH-2]`.
- **Zones screen (NEW, replaces flat board list top-level).** One accent **card per configured zone** (`cfg.zones`), each showing the zone `display_name` and board count — never a clipped `@handle`. Reuses the `--accent` chip pattern (`bbs.css:288-297`). Fixes `[AUDIT:ZONE-CLIP]`.
- **Board row (fixed).** Move the zone signifier to a **left-side accent chip** and let the name truncate with ellipsis instead of a 24-char `pre` pad. Change `.bbs-row` on mobile from `white-space:pre` to `white-space:nowrap; text-overflow:ellipsis; overflow:hidden` on the name span, with the zone chip fixed-width and always visible. Fixes `[AUDIT:ZONE-CLIP]`, `[AUDIT:HEX]`.
- **Thread / board view (fixed).** Content **top-anchored**; replace the dim `[ESC] back to boards` label (`src/screens.rs:251`) with a real `<span role="button" class="bbs-link">← Boards</span>` and a breadcrumb (`Zone › Board`). Replace hex `board 032f…11ea` with the resolved channel name. Composer stays pinned at the bottom as a proper input bar. Empty state becomes friendly + actionable (reuse forum `empty_state` copy). Fixes `[AUDIT:BACK-DEADEND]`, `[AUDIT:HEX]`, `[AUDIT:WASTED-SPACE]`.
- **Status indicator (fixed).** The `● ONLINE`/`○ CONNECTING` flip (`src/chrome.rs:80-82`) is really NIP-42 deny-by-default awaiting AUTH `[AUDIT:STATUS-FLIP]`. Add a third state: when connected-but-unauthenticated, show `◐ SIGN IN TO READ` linking to the sign-in sheet, so users don't read it as "node down".

### 2.4 Hotkeys as accelerators, never the only path

Keep the entire keyboard model (`src/chrome.rs:222-298`, `src/menu.rs parse_command`) — it is a genuine power-user feature and already correctly yields focus to inputs (`chrome.rs:238-246`). The rule: **every hotkey has a visible, tappable twin.**

- Number keys ↔ tappable menu rows (already true, `chrome.rs:130-138`).
- `ESC` back ↔ the new `← Back` button + bottom-bar `≡ Menu`.
- `↑↓/jk` move ↔ tap-to-select (already true on rows).
- `/` command line ↔ stays for power users; a bottom-bar `⌕` affordance is optional.
- `T` theme ↔ the Settings `[ cycle (T) ]` control (already tappable, `src/screens.rs:1044`).
- In-content copy that today says "Keys: number to open a board · / for commands · ESC back · T theme" (`src/screens.rs:1129`) and "Sign in ([9] Settings)" (`src/screens.rs:459`, `910`) is reworded to tap-first ("Tap a board to open it", "Tap **Sign in** below"), with the key hint demoted to a parenthetical.

The mobile footer already swaps the F-key legend for a touch hint (`bbs.css:384-391`); extend that with the persistent bottom bar rather than relying on the undocumented header-tap / swipe-from-top.

---

## 3. Feature parity plan (priority order + effort)

Effort scale: **S** ≤1 day · **M** 2-3 days · **L** 4-6 days · **XL** >1 week. Ordered so the audit's "primary defect" and the newcomer path land first, then the parity-matrix "matters:yes" gaps.

| # | Item | What to build | Effort | Evidence |
|---|---|---|---|---|
| **F1** | **Fix the sign-in flex row** | Stack the sign-in controls vertically, ≥44 px, full-width, nowrap labels; add input `id`/`name` | **S** | `[AUDIT:HIGH-1]` |
| **F2** | **First-class extension-free sign-in** | Priority-ordered sign-in sheet (§2.3); `/community/` passkey as primary extension-free path via adopted session | **S** | `[AUDIT:HIGH-2]`, `src/config.rs:113-123` |
| **F3** | **Logged-out onboarding landing** | New landing screen with explainer + value props + CTAs, shown before the menu when signed out | **M** | `[AUDIT:HIGH-3]`, `[AUDIT:BASELINE]` |
| **F4** | **Zone visibility + board naming** | Zones-as-cards, left accent chip on board rows, name-not-hex, no clipping at 360/390 | **M** | `[AUDIT:ZONE-CLIP]`, `[AUDIT:HEX]` |
| **F5** | **Tappable back + breadcrumbs + top-anchored content** | Real `← Back` control, breadcrumb line, top-anchor board/thread bodies, friendly empty states | **M** | `[AUDIT:BACK-DEADEND]`, `[AUDIT:WASTED-SPACE]` |
| **F6** | **Persistent bottom nav** | Skinned terminal bottom bar (Menu/Boards/DMs/Agents/You), gated like the forum's (`Show when authed` for DMs/You) | **M** | `[AUDIT:BASELINE]`, `src/components/mobile_bottom_nav.rs` |
| **F7** | **Threaded topics** | Board → thread list (root kind-42) → thread view (root + `e`-tagged replies); composer posts to a thread root | **L** | `[PARITY:threads]`, `[PARITY:hierarchy]` |
| **F8** | **Encrypted DMs (incl. Jarvis 1:1)** | Wire a DM screen to the shared NIP-44/59 gift-wrap path; reuse `nostr-bbs-forum-client/src/dm/mod.rs`; replace "DMs are coming" (`src/screens.rs:697`) | **L** | `[PARITY:dm]`, `[AUDIT:DMS]` |
| **F9** | **Native passkey sign-in** | Reuse `nostr-bbs-forum-client/src/auth/{passkey,webauthn}.rs` so the BBS can derive a key on-device without leaving to `/community/` | **L** | `[AUDIT:HIGH-2]`, `[PARITY:onboarding]` |
| **F10** | **Image upload in composer** | Reuse `image_compress.rs` + `pod_client::upload_to_pod_signer` (PUT); post the URL, ASCII-preview inline (see §4) | **M** | `[PARITY:image-upload]` |
| **F11** | **Global search (Cmd/Ctrl+K + tap)** | Surface `search-worker` via the shared `utils/search_client.rs`; add a `/search` command + a `⌕` affordance | **M** | `[PARITY:search]` |
| **F12** | **Notifications (bell/badge)** | Mentions/replies count via the `stores/notifications.rs` pattern; a bottom-bar badge | **M** | `[PARITY:notifications]` |
| **F13** | **A11y / density prefs in Settings** | Text-size + reduced-motion (CSS already has `prefers-reduced-motion` hooks, `bbs.css:210-215,314`); expose an in-app toggle mirroring `stores/preferences.rs` | **S** | `[PARITY:settings-a11y]`, `[AUDIT:A11Y]` |
| **F14** | **nsec backup / recovery sheet** | QR + copy for a generated/adopted key; reuse `components/{nsec_backup,recovery_sheet}.rs` | **S** | `[PARITY:nsec-backup]` |
| **F15** | **Profile detail** | Tap a member → bio/name/short-id panel (kind-0), no raster avatar (ASCII surface) | **S** | `[PARITY:profiles]` |

**Explicitly out of scope for this sprint** (parity-matrix `matters:no`, and correctly N/A for a terminal): calendar/events/RSVP, bookmarks, emoji reactions, moderation report/hide/mute, PWA/offline store, raster avatar upload, member/registration admin. Governance WRITE is already at parity via the Agents screen `[PARITY:governance]`; only member/report admin is absent and stays deferred.

**Recommended tranche cut:** T1 = F1-F6 (the entire audit-critical newcomer + navigation fix, all S/M) ships first and independently. T2 = F7, F10, F13, F14, F15. T3 = F8, F9, F11, F12.

---

## 4. Image / ASCII pipeline

The BBS already **renders** inbound images as ASCII (`src/ascii_img.rs`, `AsciiImg` component; posts via `extract_image_urls`, `src/screens.rs:271-286`) through the preview worker's `GET /ascii?url=…&cols=…&ramp=…` (`src/config.rs:36-38`). What is missing is the **upload** half `[PARITY:image-upload]`. Design:

### 4.1 Upload UX (composer)

- Add a `[ ▸ image ]` affordance to `board_composer` (`src/screens.rs:445-535`), beside `[ send ]`. It opens a hidden `<input type="file" accept="image/*">`.
- On pick: validate client-side before any network call — `image_compress::is_accepted_image` (jpeg/png/webp/gif) and `image_compress::MAX_FILE_SIZE` (5 MB). Reject with a **friendly terminal error** (`✗ that file is 8 MB — the limit is 5 MB` / `✗ only JPG/PNG/WEBP/GIF images`), reusing the existing `SendStatus::Err` inline-suffix channel (`src/screens.rs:33-42`).
- Compress in-browser via `image_compress::compress_image_default` (canvas resize to 1920 px, JPEG q0.85) + `generate_thumbnail`. No server round-trip for compression.
- Upload with **`upload_to_pod_signer`** (`nostr-bbs-forum-client/src/utils/pod_client.rs:25-107`). **PUT is mandatory:** the pod-api Worker treats PUT as the primary write and `solid-pod-rs` accepts **only** PUT for direct file URLs — POST is container-only and previously 404'd (documented at `pod_client.rs:1-9`). Auth is NIP-98 via the `Signer` trait, so the BBS `BbsSigner::get_signer()` (`src/screens.rs:481-487`) plugs straight in; no new auth code. Target path: `{pod_api}/pods/{pubkey}/media/public/{filename}`.
- On success the returned public URL is inserted into the draft; the post is a normal kind-42 whose content carries the URL.

### 4.2 ASCII conversion as progressive enhancement

The post is **the real image URL**, not ASCII — ASCII is a *rendering*, not the payload. This preserves interop (the forum client shows the real image; the BBS shows ASCII):

1. **Optimistic local preview.** Immediately after compression, show an inline ASCII preview of the local blob (or a `▞ IMG ▚ …rendering` placeholder) so the user sees their picture before the relay round-trips — mirrors the existing `.ascii-img-status` "loading" affordance (`bbs.css:265-270`).
2. **Post the URL.** The signed kind-42 carries the pod URL in `content`; `extract_image_urls` already surfaces it and `AsciiImg` renders it on-theme (`src/screens.rs:271-286`) — so **no change to the read path** is needed.
3. **Graceful degradation.** If the preview worker is unreachable, `AsciiImg` already shows a status line rather than a broken image; keep that. The raw URL remains in content, so nothing is lost.

### 4.3 Size caps and friendly errors

- Hard cap: `MAX_FILE_SIZE` = 5 MB pre-compression (`image_compress.rs:165`); the compressor further shrinks to ≤1920 px.
- All failure paths (`pod_client.rs` already returns human copy for read/network errors, `HTTP {status}` for the rest) render through `SendStatus::Err` as `✗ <message>` — never a raw `JsValue` dump. Keep the console detail (`web_sys::console::error_1`) for debugging.
- ASCII width caps stay theme-consistent: posts render at `cols=64` (`src/screens.rs:285`), pod files `cols=72`, banners `cols=84-100`.

---

## 5. Technical plan (file-by-file)

All paths under `kit/crates/nostr-bbs-bbs-client/` unless noted. The BBS is CSR/WASM Leptos with a **navigation-state-machine, not routing** (`src/app.rs:1-4`) — preserve that; add depth via signals, not `leptos_router`.

### 5.1 Files to change

| File | Change | Feature |
|---|---|---|
| `src/menu.rs` | Add `Screen::Landing`, `Screen::Thread`, `Screen::Dm` (keep the `[1]-[0]` order for the numbered menu; new screens are reached by drill-down / bottom bar, not menu numbers). Add command aliases. | F3, F7, F8 |
| `src/chrome.rs` (`BbsState`) | Add `zone: RwSignal<Option<usize>>`, `thread: RwSignal<Option<String>>`, and a `looking_around: RwSignal<bool>` gate; extend `go()`/`open_board()`, add `open_thread()`/`close_thread()`; add the third StatusBar state `◐ SIGN IN TO READ` (`chrome.rs:80-82`). Add a `BottomNav` component + render it in `App`. Reword the footer touch hint to name the bottom bar. | F5, F6, §2.3 status |
| `src/app.rs` | Provide the new signals; mount `BottomNav` (`app.rs:50-60`); gate first render on `Landing` when signed-out and not looking-around. | F3, F6 |
| `src/screens.rs` | **The bulk.** (a) New `landing()` screen (F3). (b) Rebuild `sign_in_panel` (`:1057-1115`) as a vertical stack with ≥44 px controls + input `id`/`name` (F1, F2). (c) Split `boards()` into `zones_screen()` → `board_list_for_zone()` → `thread_list()` → `thread_view()`; fix `board_row` (`:131-176`) to a left accent chip + ellipsised name (F4, F7). (d) Replace the `[ESC] back to boards` label (`:251`) with a tappable `← Back` + breadcrumb (F5). (e) Add `[ ▸ image ]` to `board_composer` (`:445-535`) (F10). (f) Add `dm_screen()` (F8). (g) Reword keyboard-centric copy (`:459`, `:910`, `:1129`). | F1-F8, F10 |
| `assets/bbs.css` | Sign-in stack (`flex-direction:column`, `white-space:nowrap`, `min-height:44px`, `width:100%` on `[role=button]` inside the sign-in card); board-row chip + ellipsis on mobile (override `.bbs-row{white-space:pre}` at `:172`/`:362-369`); top-anchor board/thread bodies (relax the `flex:1 1 auto` centring at `:370`); bottom-nav styles + safe-area padding; bump mobile status/footer type from ~10 px toward 12 px (`:334`); onboarding value-prop chips. | F1, F3, F4, F5, F6, F13 |
| `src/pod.rs` | Add an upload path (or call the shared client — §5.2) alongside the read-only `fetch_container` (`:119-158`); `container_url` (`:35-43`) already builds pod URLs. | F10 |
| `src/config.rs` | Optionally read the viewer's zone-access flags (home/members/private) if the host injects them, to drive a zone-first landing (F3/ADR-107) without a whitelist fetch. | F3 |
| `src/nip07.rs` | Unchanged logic; the extension button just moves in the view. | F2 |
| `Cargo.toml` | Add path deps only if the shared modules (§5.2) are pulled in as a crate dependency (image compress, pod client, search client, dm). | F8, F10, F11 |
| `index.html` | The touch script (swipe/tap) stays; ensure the new bottom bar doesn't fight `touch-action:none` on lists (`bbs.css:323`). Nothing new for PWA (out of scope). | F6 |

### 5.2 Shared-code opportunities with the forum client

These already exist in `nostr-bbs-forum-client` and take the shared `nostr_bbs_core::signer::Signer` trait, which `BbsSigner` satisfies (`get_signer()` returns `Rc<dyn Signer>`, `src/screens.rs:481-487`) — so they are reusable **without an auth rewrite**. Preferred: promote each into a shared kit crate (e.g. `nostr-bbs-core` or a new `nostr-bbs-web-util`) and depend on it from both clients, rather than duplicating.

| Capability | Reuse source | Notes |
|---|---|---|
| Image compression + validation | `forum-client/src/utils/image_compress.rs` | Pure canvas/wasm; `compress_image_default`, `generate_thumbnail`, `is_accepted_image`, `MAX_FILE_SIZE`. F10. |
| Pod upload (PUT + NIP-98) | `forum-client/src/utils/pod_client.rs` (`upload_to_pod_signer`) | Signer-based; PUT verb requirement is load-bearing (§4.1). F10. |
| Encrypted DM (NIP-44/59) | `forum-client/src/dm/mod.rs`, `pages/dm_chat.rs` | Gift-wrap send/receive; Jarvis 1:1 is just a DM to `VITE_JARVIS_PUBKEY`. F8. |
| Global search | `forum-client/src/utils/search_client.rs`, `components/global_search.rs` | Hits `search-worker`. F11. |
| Zone-first landing / home zone | `forum-client/src/stores/zone_access.rs` (`home_zone()`, ADR-107) | The BBS has no `home_zone` today `[PARITY:zone-first-landing]`; port the flag model. F3. |
| Passkey / WebAuthn | `forum-client/src/auth/{passkey,webauthn,nip98}.rs` | For native BBS sign-in (F9) without leaving to `/community/`. |
| nsec backup / recovery | `forum-client/src/components/{nsec_backup,recovery_sheet}.rs` | F14. |
| Empty-state / mobile-nav patterns | `forum-client/src/components/{empty_state,mobile_bottom_nav}.rs` | Copy the *pattern* (auth-gated `Show`, active-route highlight); re-skin to phosphor. F5, F6. |

**Relay pacing / zone store already shared.** The BBS already reuses the kit's relay client and zone/governance schemas (`flat_zone_order`, `channel_zone_index`, `parse_panel`, `nostr_bbs_config::schema::Zone`) — keep those as-is; do not fork.

### 5.3 What stays untouched

- The **relay layer** (`src/relay.rs`) — NIP-42 AUTH incl. `PendingAuth` deferred-challenge, `flat_zone_order`, `subscribe_board`, `publish_with_ack` are correct and at parity `[PARITY:zone-access]`. Read-path image surfacing (`extract_image_urls`) is unchanged.
- **`src/ascii_img.rs`** — the ASCII renderer is a keeper; the pipeline (§4) only adds an upload feeder.
- **`src/agent.rs` + the Agents screen** — full governance parity `[PARITY:governance]`; leave the write surface alone.
- **`src/theme.rs`** and the four palettes, CRT effects, phosphor-ghost, and the **sentry Easter egg** (`bbs.css:395-483`) — pure delight, no usability cost.
- The **keyboard model** (`src/chrome.rs:222-298`) — extended (new screens) but not removed; hotkeys remain accelerators.
- The **numbered main menu** (`src/chrome.rs:120-143`, `bbs.css:336-352`) — the audit's strongest screen; keep its mobile treatment.

---

## 6. Test plan

Method mirrors the audit: **mobile-emulated `browser-gpu` (chrome-devtools-mcp sidecar)** with iOS UA + touch, live a11y snapshots, DOM/geometry/contrast measurement, console capture, and screenshots per iteration. Live target: `https://dreamlab-ai.com/community/bbs/` (and a local Trunk build during dev). Native `cargo test` covers the pure modules (`menu.rs`, `config.rs`, `theme.rs`, `pod.rs`, `screens.rs` mention tests already green).

### 6.1 Device profiles (every iteration)

| Profile | Viewport | Emulation |
|---|---|---|
| iPhone 12/13 class | 390 × 844 | iOS UA, touch, DPR 3 |
| Small Android | 360 × 640 | Android UA, touch |
| (regression) desktop | ≥1024 wide | keyboard model still works |

### 6.2 Per-iteration flows to verify

1. **Overflow invariant (all screens):** `document.documentElement.scrollWidth === clientWidth` at 360 and 390. Today Boards fails by 101-128 px `[AUDIT:ZONE-CLIP]` — must be 0.
2. **Sign-in geometry:** every sign-in control ≥44 px tall and ≥44 px wide; no button < single-line label; input has `id`/`name`. Today buttons are 32×57 / 62×57 `[AUDIT:HIGH-1]`.
3. **Extension-free sign-in:** with `window.nostr` **removed**, a newcomer can still sign in (nsec / generate / `/community/` passkey). Today only the broken row remains `[AUDIT:HIGH-2]`.
4. **Newcomer comprehension:** logged-out landing states what the BBS is + how to join **without opening Help**; Create/Sign-in CTAs visible above the fold `[AUDIT:HIGH-3]`.
5. **Zone legibility:** both "Fairfield Events" boards are distinguishable; zone chip fully visible at 360 px `[AUDIT:ZONE-CLIP]`; rows show names not hex `[AUDIT:HEX]`.
6. **Back-nav by tap:** `← Back` from a board/thread returns without a physical ESC; bottom-bar `≡ Menu` always returns home `[AUDIT:BACK-DEADEND]`.
7. **Vertical fill:** board/thread content top-anchored; no screen >40% blank above content `[AUDIT:WASTED-SPACE]`.
8. **Thread drill-down (F7):** Zone → Board → Thread list → Thread; reply lands under the root (`e`-tag); agent `@mention` still resolves to a `p`-tag (existing `mention_ptags` tests, `src/screens.rs:378-440`).
9. **Image upload (F10):** pick > 5 MB → friendly reject; pick valid → compress → PUT to pod → URL posted → ASCII preview renders; console has no raw `JsValue` error.
10. **DMs (F8):** open a 1:1 with `VITE_JARVIS_PUBKEY`; send/receive a NIP-44/59 wrap; "DMs are coming" copy gone `[AUDIT:DMS]`.
11. **Status clarity:** connected-but-unauthenticated shows `◐ SIGN IN TO READ`, not an ambiguous `○ CONNECTING` `[AUDIT:STATUS-FLIP]`.
12. **Hotkey parity (desktop regression):** number keys, `j/k`, `ESC`, `T`, `/`, `?` still work; focus still yields to inputs (`chrome.rs:238-246`).
13. **Contrast/type:** amber palette AA maintained (baseline 10.8:1 / 6.6:1 `[AUDIT:A11Y]`); mobile status/footer ≥12 px.
14. **No JS errors:** clean WASM boot, relay connect, no console errors across the whole walk (today already clean — must stay clean).

### 6.3 Feature-parity acceptance checklist

- [ ] F1 Sign-in row fixed (geometry test #2)
- [ ] F2 Extension-free sign-in path (test #3)
- [ ] F3 Onboarding landing (test #4)
- [ ] F4 Zones visible, no clip, names not hex (test #5)
- [ ] F5 Tappable back + breadcrumb + top-anchor (tests #6, #7)
- [ ] F6 Persistent bottom nav (test #6)
- [ ] F7 Threaded topics (test #8)
- [ ] F8 Encrypted DMs incl. Jarvis (test #10)
- [ ] F9 Native passkey sign-in (test #3 without leaving BBS)
- [ ] F10 Image upload + ASCII preview (test #9)
- [ ] F11 Global search (command + tap)
- [ ] F12 Notifications badge
- [ ] F13 A11y/density prefs in Settings (test #13)
- [ ] F14 nsec backup/recovery sheet
- [ ] F15 Profile detail
- [ ] Overflow invariant 0 px on all screens at 360 & 390 (test #1)
- [ ] Desktop hotkey regression green (test #12)
- [ ] Zero console errors across the walk (test #14)

---

## Appendix — source anchors (BBS client)

- Nav state machine + key handler: `src/app.rs`, `src/chrome.rs:222-298`
- Screen enum + command parsing: `src/menu.rs`
- Screens (sign-in, boards, composer, agents, pod, chat): `src/screens.rs`
- Runtime config + forum-session adoption: `src/config.rs`
- Themes + CSS (layout lives here): `src/theme.rs`, `assets/bbs.css`
- ASCII renderer: `src/ascii_img.rs`
- Pod read: `src/pod.rs`
- Signer (adopt/generate/NIP-07): `src/signer.rs`, `src/nip07.rs`

Reuse sources (forum client): `src/utils/{image_compress,pod_client,search_client}.rs`, `src/dm/mod.rs`, `src/stores/zone_access.rs`, `src/auth/{passkey,webauthn,nip98}.rs`, `src/components/{mobile_bottom_nav,empty_state,nsec_backup,recovery_sheet}.rs`.
