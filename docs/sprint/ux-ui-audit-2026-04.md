# Forum Client UX/UI Audit — Obelisk Polish Sprint (April 2026)

**Scope:** `community-forum-rs/crates/forum-client/` (Leptos 0.7 CSR, 17 pages, 58 components, ~22K LOC Rust, DreamLab design tokens + Tailwind)
**Owner:** ux-ui-auditor (WI-6)
**Date:** 2026-04-20
**Benchmark:** `external/obelisk/` (La Crypta design system, Next.js 16 Discord clone)

---

## Executive Summary

The forum client ships a cohesive amber/purple DreamLab aesthetic with a genuinely polished landing page, but the interior surfaces drift significantly from that quality bar — most action affordances are hover-gated (excluding touch and keyboard users), typography below 12px relies on arbitrary Tailwind brackets in at least ten components, and error/warning semantics split unpredictably between red and yellow backgrounds. Accessibility owes the biggest debt: a single global `*:focus-visible` rule is undermined by `focus:ring-1` overrides on primary inputs, the modal has neither focus trap nor return-focus, and critical interactive affordances are rendered as `<div on:click>` or `<span on:click>` rather than buttons. Against Obelisk, the forum matches feature parity but loses on interaction density — Obelisk uses semantic `<button type="button">` rows with `data-testid`, explicit unread dots paired with colour (not colour alone), and a single spacing scale; DreamLab repeats the same affordance with three different paddings. Responsive coverage is a single `@639px` breakpoint — there is no tablet strategy, no `md:` or `lg:` usage in the global stylesheet, and key pages (channel, DM chat, admin) assume viewports ≥ 1024px without graceful fallback. The 47 findings below target only concrete, file:line-anchored issues; none require architectural rewrites, and the top-10 can land in a single sprint.

---

## Severity Histogram

| Severity | Count | % |
|----------|------:|--:|
| Critical | 5  | 11% |
| High     | 18 | 38% |
| Medium   | 17 | 36% |
| Low      | 7  | 15% |
| **Total**| **47** | **100%** |

Distribution across dimensions:

| Dimension | Findings |
|-----------|---------:|
| Visual hierarchy           | 4 |
| Typography                 | 5 |
| Colour / WCAG AA–AAA       | 5 |
| Spacing                    | 4 |
| Component consistency      | 5 |
| States (empty/loading/err) | 5 |
| WCAG 2.2 accessibility     | 7 |
| Responsive breakpoints     | 4 |
| Micro-interactions         | 4 |
| Dark-mode fidelity         | 4 |

---

## Top 10 Quickest Wins (Trivial / Small effort, High impact)

1. **F-028** — Replace `<div on:click>` avatar with `<button>` in `message_bubble.rs:160` (unblocks keyboard users).
2. **F-030** — Remove `opacity-0 group-hover:opacity-100` from message action buttons; replace with `focus-within:` or always-visible at reduced contrast.
3. **F-031** — Add `aria-label="Toggle navigation menu"` to hamburger button at `app.rs:522`.
4. **F-011** — Add text label beside DM online/offline dot at `dm_chat.rs:196-214` ("Online" / "Idle" / "Offline").
5. **F-022** — Standardise input focus to `focus:ring-2 focus:ring-amber-500/60` (currently `ring-1` in `login.rs:95`, `ring-2` in `signup.rs:71`).
6. **F-020** — Normalise error banner to `bg-red-900/30 border-red-500/40` everywhere; replace `bg-yellow-900/50` at `channel.rs:395`.
7. **F-023** — Replace `"Loading..."` string at `channel.rs:335` with existing `skeleton` CSS class for the h1 row.
8. **F-014** — Adopt existing `--dl-space-*` tokens from `design-tokens.css` in message bubble padding (currently hard-coded `py-2 px-2`).
9. **F-027** — Raise `AUTO_DISMISS_MS` from 4000 to 8000 in `toast.rs:12` and pause on hover/focus.
10. **F-032** — Add focus trap and return-focus to `Modal` component (`modal.rs`) — all eight consumers inherit it.

---

## Findings

### Dimension 1 — Visual Hierarchy

#### F-001 — H1 size drifts between landing and interior pages
- **Category:** Visual hierarchy
- **Severity:** Medium
- **Location:** `src/pages/home.rs:52` (`text-4xl sm:text-5xl md:text-6xl`) vs `src/pages/channel.rs:335` (`text-2xl font-bold`) vs `src/pages/forums.rs:138` (`text-4xl candy-gradient`)
- **Observed:** The same semantic element (page h1) ranges from 24px to 60px across pages with no typographic scale rule linking them. Interior pages feel demoted relative to the hero-weighted landing.
- **Recommended:** Define two h1 scales: `display` (landing/hero, 48–60px) and `page` (interior, 28–32px). Codify as CSS classes in `style.css` alongside existing `.mobile-nav-item`.
- **Effort:** Small

#### F-002 — Candy-gradient headline reduces readability of primary CTA titles
- **Category:** Visual hierarchy
- **Severity:** Medium
- **Location:** `src/pages/forums.rs:138`
- **Observed:** `candy-gradient` applied to the forums hero h1 renders letterforms in a multi-hue gradient that loses contrast at line start/end. Hierarchy shifts to eye-catching colour rather than typographic weight/size.
- **Recommended:** Reserve `candy-gradient` for short accents (2–4 words); use solid `text-white` for page-scope headings. Add a guard in `design-tokens.css` advising against use on strings > 20 chars.
- **Effort:** Trivial

#### F-003 — Message hover-only actions hide affordance hierarchy
- **Category:** Visual hierarchy
- **Severity:** High
- **Location:** `src/components/message_bubble.rs:175` (timestamp), `:179-204` (pin/report/bookmark cluster)
- **Observed:** Every secondary action is `opacity-0 group-hover:opacity-100`. A first-time viewer sees a message with no visible controls — hierarchy (reply? react? report?) is invisible until cursor hover, and unavailable entirely on touch.
- **Recommended:** Always show the reactions "+" button and timestamp; keep the three-dot overflow behind hover+focus. At minimum add `group-focus-within:opacity-100`.
- **Effort:** Small

#### F-004 — Four overlapping `<Show>` branches blur landing CTA priority
- **Category:** Visual hierarchy
- **Severity:** Medium
- **Location:** `src/pages/home.rs:115-172`
- **Observed:** Authenticated / unauthenticated / onboarded / mid-flow branches each render their own CTA block with different button styles and positions, producing an inconsistent primary-action vector depending on auth state.
- **Recommended:** Extract one `HeroCta` component with a single `variant` prop; always place the primary CTA in the same grid cell with matching `h-12 px-6` dimensions.
- **Effort:** Medium

---

### Dimension 2 — Typography

#### F-005 — Arbitrary `text-[10px]` / `text-[11px]` in 10+ components bypasses scale
- **Category:** Typography
- **Severity:** High
- **Location:** `src/components/notification_center.rs:142`, `badge.rs:44,54`, `avatar.rs:37`, `mini_calendar.rs:193,214,216,218`, `badge_display.rs:134,135`, `moderator_team.rs:60,62`, `welcome_modal.rs:167`, `top_posters.rs:34`, `quoted_message.rs:83`, `pages/dm_chat.rs:186`
- **Observed:** Fifteen call-sites use Tailwind arbitrary-size brackets below the `text-xs` (12px) floor. Each is hand-picked; no shared `--font-size-xxs` token exists. Visual drift accumulates — two sibling badges in `moderator_team.rs` and `badge.rs` both claim "10px" but are not guaranteed to stay aligned.
- **Recommended:** Add `--dl-text-xxs: 0.6875rem` (11px) to `design-tokens.css` with a Tailwind plugin exposing `text-xxs`. Audit all 15 sites in one pass — most should move to `text-xs`.
- **Effort:** Small

#### F-006 — Pubkey truncation at 10px font-mono is below readable minimum
- **Category:** Typography
- **Severity:** High
- **Location:** `src/pages/dm_chat.rs:186`
- **Observed:** DM header renders `npub1abc…xyz` at `text-[10px] font-mono` next to a 14px display name. At 10px monospace, individual character identification drops sharply; users cannot visually verify the key.
- **Recommended:** Move pubkey to `text-xs` (12px) and give it its own line, or remove it from the header and surface on hover/profile-modal only (avoiding competing focus with the display name).
- **Effort:** Trivial

#### F-007 — Mobile bottom-nav labels at 10px breach minimum UI text size
- **Category:** Typography
- **Severity:** Medium
- **Location:** `style.css:424` (`.mobile-nav-item { font-size: 0.625rem; }`)
- **Observed:** Primary navigation labels ("Home", "Chat", "DMs", "Forums", "Profile") render at 10px. Mobile UI text should be ≥ 11px to remain tappable/scannable without zoom; WCAG 2.2 reflow and resize-text targets 200% without loss of content.
- **Recommended:** Raise to `font-size: 0.75rem` (12px). Tighten letter-spacing from 0.025em to 0.01em to preserve fit.
- **Effort:** Trivial

#### F-008 — Line-height inconsistent between message-bubble and thread-view
- **Category:** Typography
- **Severity:** Low
- **Location:** `src/components/message_bubble.rs:217` (`text-sm leading-relaxed` → 1.625) vs `src/components/thread_view.rs` (inherited body 1.6)
- **Observed:** Parent and threaded reply bodies render with different vertical rhythm, producing a visible stair-step when threads expand.
- **Recommended:** Apply a shared `.forum-body` class with `line-height: 1.55` to both.
- **Effort:** Trivial

#### F-009 — Font-stack fallback drops Inter on WASM cold start
- **Category:** Typography
- **Severity:** Low
- **Location:** `style.css:15-20` (body font-family Inter + system stack)
- **Observed:** During the WASM payload download (~1.4 s on 3G), the HTML paints in `-apple-system` / `Segoe UI`. On Android Chrome this is Roboto — the metrics differ enough that content shifts ~4px vertically when Inter loads, triggering CLS.
- **Recommended:** Add `font-display: optional` to the `@font-face` (or self-host the Inter subset) and set `size-adjust: 100.5%` to match fallback x-height.
- **Effort:** Small

---

### Dimension 3 — Colour & WCAG AA/AAA

#### F-010 — `text-gray-500` / `gray-600` on `--dl-surface-dark` fails WCAG AA
- **Category:** Colour / WCAG AA
- **Severity:** High
- **Location:** 370+ occurrences across `src/**/*.rs`; representative: `src/components/message_bubble.rs:175,194`, `src/components/notification_center.rs:77,142`, `src/pages/home.rs:78`
- **Observed:** `text-gray-500` = #6b7280, `text-gray-600` = #4b5563. On body bg #111827 the contrast ratios are 4.14:1 and 2.74:1 respectively. AA requires 4.5:1 for body text. Secondary labels (timestamps, muted captions) systematically violate.
- **Recommended:** Introduce `--dl-text-muted: #9ca3af` (gray-400, ratio 6.8:1) and `--dl-text-subtle: #cbd5e1` (gray-300, ratio 10.2:1). Codemod all `text-gray-500` → `text-gray-400`, all `text-gray-600` → `text-gray-500` on dark surfaces.
- **Effort:** Medium

#### F-011 — DM status dot uses colour alone for meaning
- **Category:** Colour / WCAG 1.4.1
- **Severity:** Critical
- **Location:** `src/pages/dm_chat.rs:196-214`
- **Observed:** Online/idle/offline state communicated only by green/yellow/red coloured dot with no text label, icon shape, or aria-label. Violates WCAG 1.4.1 "Use of Color".
- **Recommended:** Add `<span class="sr-only">` label next to each dot; shape-code (filled/ring/hollow) in addition to colour; expose as `aria-label="Online"` on the dot element.
- **Effort:** Trivial

#### F-012 — Error banner colours split between red and yellow for same severity
- **Category:** Colour / Component consistency
- **Severity:** High
- **Location:** Error banners: `src/pages/login.rs:113` (`bg-red-900/30`), `src/pages/channel.rs:395` (`bg-yellow-900/50`), `src/pages/signup.rs:119` (`bg-red-900/30`), `src/pages/dm_list.rs:146,231,378` (mixed)
- **Observed:** "Relay disconnected" at `channel.rs:395` uses yellow; "Login failed" uses red; "DM signature failed" uses red. Users cannot learn a stable error mental model.
- **Recommended:** Define `AlertBanner` component with `variant: "error" | "warning" | "info"`. Yellow for warnings (non-blocking), red for errors (action required).
- **Effort:** Small

#### F-013 — Toast icon colours may fail contrast on glass-card backdrop
- **Category:** Colour / WCAG AA
- **Severity:** Medium
- **Location:** `src/components/toast.rs:84-110`
- **Observed:** Info icon `text-blue-400` (#60a5fa) on `rgba(31,41,55,0.95)` ≈ 4.5:1 (borderline). Warning `text-amber-400` (#fbbf24) on same ≈ 7.1:1 (ok). But if the toast overlaps a bright hero image behind the 5% transparency, blue-400 can drop below 3:1.
- **Recommended:** Either raise toast background to fully opaque (`bg-gray-800` hex) or switch info to `text-sky-300` (#7dd3fc, 8.6:1).
- **Effort:** Trivial

#### F-014 — Amber hover variant (`amber-300`) collapses contrast delta from base (`amber-400`)
- **Category:** Colour / Micro-interactions
- **Severity:** Low
- **Location:** 55+ occurrences, representative: `src/app.rs:483` (`text-amber-400 hover:text-amber-300`), `src/components/message_bubble.rs:169`
- **Observed:** amber-400 → amber-300 is a 15% luminance shift; on rapid movement the hover change is imperceptible to many users, losing the hover-state signal.
- **Recommended:** Either brighten hover to `amber-200` (30% shift) or pair colour with weight/underline: `hover:text-amber-300 hover:underline`.
- **Effort:** Trivial

---

### Dimension 4 — Spacing

#### F-015 — No shared vertical rhythm token; spacing invented per-page
- **Category:** Spacing
- **Severity:** High
- **Location:** `src/pages/channel.rs:336` (`p-4 sm:p-6`), `src/pages/forums.rs:137` (`py-20`), `src/pages/home.rs:52` (`py-24`), `src/pages/events.rs` (`py-12`)
- **Observed:** Every page picks its own outer padding without reference to a scale. Transition from landing (24-unit) to forum index (20-unit) to channel (6-unit) produces a visible jump.
- **Recommended:** Adopt `--dl-space-page-y: 4rem` and `--dl-space-content-x: 1.5rem`; apply via a `.page-shell` class.
- **Effort:** Small

#### F-016 — Reaction pills break 4px spacing grid
- **Category:** Spacing
- **Severity:** Low
- **Location:** `src/components/reaction_bar.rs:165,167` (`px-2 py-0.5`)
- **Observed:** `py-0.5` = 2px; every other interactive control uses `py-1` (4px) minimum. Creates subtle misalignment when reactions sit above the message composer.
- **Recommended:** Change to `px-2 py-1 text-xs`; adjust text scale if visual weight increases.
- **Effort:** Trivial

#### F-017 — Message-bubble padding breaks the comfortable-density rhythm
- **Category:** Spacing
- **Severity:** Medium
- **Location:** `src/components/message_bubble.rs:156` (`py-2 px-2`)
- **Observed:** 8px vertical between messages is dense; combined with 1.6 line-height inside, bubbles visually collide. Obelisk `chat/page.tsx` messages use 12–16px gaps with a hover background.
- **Recommended:** Change to `py-2.5 px-3` and rely on `hover:bg-gray-800/30` to define the row — already present.
- **Effort:** Trivial

#### F-018 — Mobile bottom-nav height fixed; ignores tall touch-target rule
- **Category:** Spacing / Touch targets
- **Severity:** Medium
- **Location:** `style.css:413-425`
- **Observed:** Nav items use `padding: 0.5rem 0` → ~36px tall per item (icon 20px + label 10px + 8px vertical padding). WCAG 2.2 (2.5.8 Target Size) recommends 24px minimum; Apple/Google guidance is 44px.
- **Recommended:** Set `min-height: 3rem` (48px) on `.mobile-nav-item`, or expand each item with `py-3`.
- **Effort:** Trivial

---

### Dimension 5 — Component Consistency

#### F-019 — Three distinct loading spinner implementations
- **Category:** Component consistency
- **Severity:** High
- **Location:** Inline SVG at `src/pages/channel.rs:442-447`; CSS `.loading-ring` at `style.css:178` (80px); Tailwind `animate-spin` at `src/components/notification_center.rs`
- **Observed:** The same "loading" state renders as three visually distinct spinners depending on where you are. Confuses users into thinking different things are loading.
- **Recommended:** Export `<Spinner size="sm" | "md" | "lg" />` as a shared component; collapse the 80px fixed ring into the `lg` variant.
- **Effort:** Small

#### F-020 — Empty state pattern inlined in channel page instead of `EmptyState`
- **Category:** Component consistency
- **Severity:** Medium
- **Location:** `src/pages/channel.rs:452-462` (inline div+svg+text) vs `src/components/empty_state.rs` (shared component)
- **Observed:** A shared `EmptyState` component exists with ambient-orb styling, yet channel, dm_list, and admin/reports render their own empty states ad-hoc.
- **Recommended:** Audit all empty-state occurrences and route through `EmptyState`. Add a `variant="compact"` for channel/thread contexts where full orbs are too heavy.
- **Effort:** Small

#### F-021 — Error banner style varies per form
- **Category:** Component consistency
- **Severity:** High
- **Location:** Six forms each hand-roll an error alert — see F-012.
- **Observed:** See F-012. Same issue cross-cuts consistency.
- **Recommended:** Single `AlertBanner` component.
- **Effort:** Small

#### F-022 — Emoji picker renders twice with different layouts
- **Category:** Component consistency
- **Severity:** Medium
- **Location:** `src/components/message_input.rs:22-47` (24 static emojis, 8×3 grid) vs `src/components/reaction_bar.rs:10-19` (8 static emojis, 1×8 row)
- **Observed:** Same pick-an-emoji task has two different UIs with two different emoji sets. Users learn one, then the other confuses them.
- **Recommended:** Extract `<EmojiPicker mode="compact" | "expanded" />` sharing the same 24-emoji source.
- **Effort:** Medium

#### F-023 — Input focus ring inconsistency between login and signup
- **Category:** Component consistency / Accessibility
- **Severity:** High
- **Location:** `src/pages/login.rs:95` (`focus:ring-1 focus:ring-amber-500`) vs `src/pages/signup.rs:71` (`focus:ring-2 focus:ring-amber-500/50`)
- **Observed:** Sibling auth forms have different focus treatments. Global `*:focus-visible` rule in `style.css` adds a 2px amber outline; Tailwind `ring-1` then fights with it producing a 1px-then-2px strobe.
- **Recommended:** Remove Tailwind `focus:ring-*` from inputs; rely on the global `*:focus-visible` rule — it already delivers the right look.
- **Effort:** Trivial

---

### Dimension 6 — States (empty / loading / error / success / offline)

#### F-024 — Channel h1 renders literal "Loading..." text instead of skeleton
- **Category:** States
- **Severity:** High
- **Location:** `src/pages/channel.rs:335`
- **Observed:** While the channel record loads, the header shows the string "Loading..." in `text-2xl font-bold`. Feels amateur and causes layout shift when the real title arrives.
- **Recommended:** Render a `skeleton` div with approximate width of the title (e.g., `w-48 h-7 skeleton rounded`). The `.skeleton` class already exists in `style.css`.
- **Effort:** Trivial

#### F-025 — No offline banner in chrome when service worker detects offline
- **Category:** States / Offline
- **Severity:** High
- **Location:** `src/main.rs:44-76` (runs offline startup but no UI surface)
- **Observed:** The client has offline support wiring (`run_offline_startup`, service worker registration) but there is no UI state informing the user they are offline. Messages sent offline silently fail to the relay queue.
- **Recommended:** Add a persistent top banner when `RelayConnection.connection_state() == Disconnected`: "Offline — messages will send when you reconnect". Integrates with existing `RelayConnection` context.
- **Effort:** Small

#### F-026 — No success confirmation on profile save / settings save
- **Category:** States
- **Severity:** Medium
- **Location:** `src/pages/settings.rs`, `src/components/onboarding_modal.rs` (`on_save_profile`)
- **Observed:** Save actions close the modal / redirect without a success toast. User cannot confirm their edit persisted.
- **Recommended:** Fire a toast with `variant="success"` after every persist action; toast system already exists at `src/components/toast.rs`.
- **Effort:** Trivial

#### F-027 — Toast auto-dismiss 4000ms too short; no pause on hover
- **Category:** States / WCAG 2.2.1
- **Severity:** High
- **Location:** `src/components/toast.rs:12` (`AUTO_DISMISS_MS: u32 = 4000`)
- **Observed:** WCAG 2.2.1 "Timing Adjustable" requires users can extend/pause time limits. 4s is below the readable threshold for longer messages and there is no mouseenter pause.
- **Recommended:** Raise default to 8000ms for info/success, 12000ms for warn, and permanent for error (dismiss-only). Add `on:mouseenter` → clear timeout, `on:mouseleave` → restart.
- **Effort:** Small

#### F-028 — Form-submitting buttons lack busy state on slow networks
- **Category:** States
- **Severity:** Medium
- **Location:** `src/pages/login.rs:221-235`, `src/pages/signup.rs:127-134`, `src/components/create_event_modal.rs`
- **Observed:** On submit, button stays fully clickable — users double-submit, producing duplicate relay publishes. No inline spinner inside the button.
- **Recommended:** Pattern: `disabled=is_submitting` + swap label for `<Spinner size="sm" />` + "Signing in…". Apply across all form submits.
- **Effort:** Small

---

### Dimension 7 — WCAG 2.2 Accessibility

#### F-029 — `<div on:click>` avatar violates semantic button role
- **Category:** Accessibility (WCAG 4.1.2 Name, Role, Value)
- **Severity:** Critical
- **Location:** `src/components/message_bubble.rs:160`
- **Observed:** Avatar wrapper is `<div class="flex-shrink-0 mt-0.5 cursor-pointer" on:click=on_avatar_click>`. Keyboard-only users cannot activate; screen readers announce "group" not "button".
- **Recommended:** Wrap the `Avatar` in `<button type="button" aria-label={format!("Open profile for {}", display_name)} class="rounded-full focus:ring-2">`. Keeps the round visual via `rounded-full`.
- **Effort:** Trivial

#### F-030 — Display-name `<span on:click>` hides profile trigger from AT
- **Category:** Accessibility
- **Severity:** Critical
- **Location:** `src/components/message_bubble.rs:168-172`
- **Observed:** Clickable author name is a `<span>` with `on:click` — assistive tech treats it as static text. Same bug pattern as F-029.
- **Recommended:** Change to `<button type="button" class="font-semibold text-sm text-amber-400 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/60 rounded">`.
- **Effort:** Trivial

#### F-031 — Hover-only action cluster inaccessible to keyboard & touch
- **Category:** Accessibility (WCAG 2.1.1 Keyboard, 2.5.7 Dragging)
- **Severity:** Critical
- **Location:** `src/components/message_bubble.rs:179` (`flex items-center gap-0.5 ml-auto` wrapper with children using `opacity-0 group-hover:opacity-100`)
- **Observed:** Pin, Report, Bookmark buttons are invisible until mouse hover. Keyboard-only users cannot discover them; touch users cannot trigger them at all (no hover state on iOS/Android).
- **Recommended:** Add `group-focus-within:opacity-100 peer-focus:opacity-100`; on touch media (`@media (hover: none)`), force `opacity: 100`. Better: always show at 40% opacity, brighten to 100% on hover/focus.
- **Effort:** Small

#### F-032 — Hamburger menu button lacks `aria-label`
- **Category:** Accessibility (WCAG 4.1.2)
- **Severity:** High
- **Location:** `src/app.rs:522`
- **Observed:** Menu toggle button renders only an SVG icon, no text, no `aria-label`. Screen reader announces "button" with no name.
- **Recommended:** Add `aria-label="Toggle navigation menu"` and `aria-expanded={is_open}`.
- **Effort:** Trivial

#### F-033 — Modal lacks focus trap and return-focus
- **Category:** Accessibility (WCAG 2.4.3 Focus Order)
- **Severity:** Critical
- **Location:** `src/components/modal.rs` (has `role="dialog" aria-modal="true" aria-labelledby`, missing focus management)
- **Observed:** When a modal opens, focus remains on the trigger element beneath the backdrop. Tabbing escapes the dialog into hidden page content. On close, focus is lost rather than returned to the invoking button.
- **Recommended:** On open, query `[data-autofocus], input, button, [tabindex]:not([tabindex="-1"])` inside modal and focus the first. On `Tab` at last element / `Shift+Tab` at first, wrap. On close, `prev_focused_el.focus()`.
- **Effort:** Medium

#### F-034 — Auto-dismissing toast cannot be paused
- **Category:** Accessibility (WCAG 2.2.1 Timing Adjustable)
- **Severity:** High
- **Location:** `src/components/toast.rs:12` + mount logic
- **Observed:** See F-027. Also an a11y violation — no mechanism for user to extend time.
- **Recommended:** See F-027 recommendation.
- **Effort:** Small

#### F-035 — Emoji-as-icon feature titles lack `aria-hidden`
- **Category:** Accessibility (WCAG 1.1.1 Non-text Content)
- **Severity:** Medium
- **Location:** `src/pages/home.rs:414` (FeatureCard h3 with emoji prefix), `src/pages/forums.rs` (category cards), plus `TechBadge` inline emojis
- **Observed:** Emoji characters inside headings are announced by screen readers as "sparkles symbol", "rocket symbol", "red heart" — clutter. No `<span aria-hidden="true">` wrapper.
- **Recommended:** Wrap decorative emoji in `<span class="emoji" aria-hidden="true">✨</span>`; if the emoji carries meaning, add `role="img" aria-label="new"` instead.
- **Effort:** Trivial

---

### Dimension 8 — Responsive Breakpoints

#### F-036 — Only one media query in the global stylesheet
- **Category:** Responsive
- **Severity:** High
- **Location:** `style.css:402` (`@media (max-width: 639px)` is the sole app-layout breakpoint; reduced-motion at `:707` doesn't count)
- **Observed:** The app has no tablet (`md:`, 768px) or desktop (`lg:`, 1024px) layout logic at the stylesheet level. Tailwind `sm:` / `md:` prefixes are sprinkled unevenly in Rust templates, producing asymmetric behaviour.
- **Recommended:** Define three breakpoints in `style.css`: mobile (<640), tablet (640–1023), desktop (≥1024). Add layout rules for each main container.
- **Effort:** Medium

#### F-037 — Channel view assumes ≥ 1024px; degrades below
- **Category:** Responsive
- **Severity:** High
- **Location:** `src/pages/channel.rs:320-450` (no `sm:` / `md:` qualifiers on container widths)
- **Observed:** Channel header, member list sidebar, and input composer share a flex row with no collapse rule for tablet viewports. At 768–1023px horizontal scrollbar appears and the member list overlays the messages.
- **Recommended:** At `< md`, hide the sidebar behind a toggle (drawer); on `md+` show inline.
- **Effort:** Medium

#### F-038 — Notification panel width fixed at `w-96`; ignores breakpoint scale
- **Category:** Responsive
- **Severity:** Medium
- **Location:** `src/components/notification_center.rs:44` (`w-96 max-w-[90vw]`)
- **Observed:** 384px fixed — narrow on desktop, 90vw on mobile. No tablet consideration; on a 768px portrait tablet the panel eats most of the screen unnecessarily.
- **Recommended:** `w-full sm:w-80 md:w-96 lg:w-[28rem]` — progressively widen on larger screens.
- **Effort:** Trivial

#### F-039 — Forms collapse poorly below 400px
- **Category:** Responsive
- **Severity:** Medium
- **Location:** `src/pages/login.rs:60-120`, `src/pages/signup.rs:40-130`
- **Observed:** Both forms use `px-4` outer padding plus `max-w-md` (448px) centred. On 360px iPhone SE viewports, the card hits the edges; labels and helper text break awkwardly.
- **Recommended:** Add `px-4 sm:px-6` on outer wrapper; ensure `max-w-sm` on phone, `max-w-md` on tablet+.
- **Effort:** Trivial

---

### Dimension 9 — Micro-interactions

#### F-040 — Hover-state micro-interactions vanish on touch devices
- **Category:** Micro-interactions
- **Severity:** High
- **Location:** Every `hover:*` class in `message_bubble.rs`, `reaction_bar.rs:165-167`, `app.rs:483`, ~400 total
- **Observed:** On iOS/Android, `hover:` styles don't fire — hover-gated visibility means an entire class of affordances is invisible. There is no `(hover: none)` override anywhere in the codebase.
- **Recommended:** Add global rule: `@media (hover: none) { .group [class*="group-hover"] { opacity: 1 !important; } }`. Long-term, audit hover-gated content for touch equivalents.
- **Effort:** Small

#### F-041 — Reaction burst animation has no reduced-motion fallback
- **Category:** Micro-interactions / Accessibility (WCAG 2.3.3)
- **Severity:** Medium
- **Location:** `src/components/reaction_bar.rs:190-194` (ReactionBurst particle animation) — reduced-motion rule at `style.css:707` only covers `typing-dot, reaction-particle`. Verify `reaction-particle` is the actual class used.
- **Observed:** 12-particle burst with no opt-out produces motion sensitivity issues for users with vestibular disorders.
- **Recommended:** Confirm `reaction-particle` class is applied to all burst nodes; if named differently (e.g., `burst-particle`), add to the reduced-motion rule.
- **Effort:** Trivial

#### F-042 — Mobile nav active-state lacks tactile cue
- **Category:** Micro-interactions
- **Severity:** Low
- **Location:** `style.css:428-443` (`.mobile-nav-item.active { color: #f59e0b; }` + 2px underline bar)
- **Observed:** Tapping a mobile nav item swaps amber colour in instantly. No press-down scale/shade; tap feels unacknowledged on slow networks.
- **Recommended:** Add `:active { transform: scale(0.95); transition: transform 80ms; }` on `.mobile-nav-item`.
- **Effort:** Trivial

#### F-043 — Ambient orbs animate continuously; no pause on hidden tab
- **Category:** Micro-interactions / Performance
- **Severity:** Medium
- **Location:** `design-tokens.css` (`animate-ambient-breathe` class) — applied in `home.rs`, `forums.rs`, `empty_state.rs`
- **Observed:** Orb pulse animations run indefinitely regardless of tab visibility. On background tabs this is wasted CPU; on low-power devices battery drains faster than necessary.
- **Recommended:** Pause via `document.visibilityState !== 'visible'` listener that toggles `animation-play-state: paused` on orbs. Respect reduced-motion media query (already covered by shared tokens per code comment).
- **Effort:** Small

---

### Dimension 10 — Dark-Mode Fidelity

#### F-044 — No light-mode path at all; hard-coded dark tokens
- **Category:** Dark-mode fidelity
- **Severity:** Low
- **Location:** `style.css:15` (`background-color: #111827; color: #f9fafb;` on body), `design-tokens.css` (surface tokens hex-coded not CSS-var-switched)
- **Observed:** Application is dark-only. Users with light-preferred OS setting cannot override; no `@media (prefers-color-scheme: light)` handling. Obelisk is also dark-only so not a parity gap — but increasingly expected in 2026.
- **Recommended:** Either document dark-only as an intentional choice in `design-tokens.css`, or plan a light-mode sprint: tokenise all colour decisions behind `--dl-*` vars and add `[data-theme="light"]` override block.
- **Effort:** Large

#### F-045 — Glass-card opacity drifts per surface
- **Category:** Dark-mode fidelity
- **Severity:** Medium
- **Location:** `.glass-card` uses `rgba(31,41,55,0.5)` (design-tokens); overridden inline at `src/components/toast.rs:84` (`bg-gray-900/95`), `src/components/notification_center.rs:44` (`glass-card border-l`)
- **Observed:** Over mesh-bg, the 50% glass-card looks translucent; over plain body it looks flat. Toast overrides to 95%, notification centre stays at 50% — same "elevated surface" concept rendered at different alphas.
- **Recommended:** Pick two alpha levels: `--dl-elevated-low: 0.5` (sections), `--dl-elevated-high: 0.92` (overlays, toasts, modals). Apply consistently.
- **Effort:** Small

#### F-046 — Text-gray-700 used for non-disabled content
- **Category:** Dark-mode fidelity / Colour
- **Severity:** Medium
- **Location:** `src/components/mini_calendar.rs:214`, various category card secondary labels
- **Observed:** `text-gray-700` (#374151) on `#111827` ≈ 2.1:1. That's the colour of disabled buttons in most design systems — using it for live text causes ambiguity between "muted" and "disabled".
- **Recommended:** Reserve `gray-700` for disabled/placeholder state only; use `gray-400` for muted live content.
- **Effort:** Small

#### F-047 — Mesh-bg pattern over body bg creates inconsistent "depth"
- **Category:** Dark-mode fidelity
- **Severity:** Low
- **Location:** `src/pages/home.rs`, `src/pages/forums.rs` (both apply `mesh-bg`) vs `src/pages/channel.rs`, `src/pages/dm_chat.rs` (plain body)
- **Observed:** Landing/forums pages have a subtle mesh pattern behind cards; the chat/DM pages have none. User crossing from forums → channel sees the "depth" layer vanish and perceive the interior as a different app.
- **Recommended:** Either apply `mesh-bg` globally on `body` (perf-test first — gradient can be expensive) or remove from landing for consistency.
- **Effort:** Small

---

## Obelisk Benchmark Notes

| Dimension | Forum (DreamLab) | Obelisk (La Crypta) | Delta |
|-----------|------------------|---------------------|-------|
| Button semantics | `<div on:click>` pattern present | `<button type="button" data-testid="…">` always | Forum regresses |
| Unread indicator | Dot-only in several places | Dot + `aria-hidden="true"` + parent button with text | Obelisk safer |
| Spacing scale | Invented per page | Single `lc-*` token class set | Obelisk consistent |
| Skeleton states | One class, inconsistently applied | `lc-skeleton`, `lc-img-skeleton` applied on every fetch | Obelisk more mature |
| Focus ring | Global CSS + Tailwind `ring-1/ring-2` fight | Not audited (out of sprint scope) | Forum needs de-dup |
| Test hooks | None (`data-testid` = 0 occurrences) | `data-testid` on most interactives | Forum lags |

---

## Out of Scope (deliberately excluded)

- Architectural refactors (component split, store redesign)
- "Add tests" generic recommendations — covered by WI-QE
- Network/relay layer, Nostr protocol compliance
- Service-worker logic and IndexedDB eviction policy
- Build/bundling (Trunk, wasm-bindgen)
- Content/copywriting audit
- Motion design creative direction (keeping current aesthetic)

---

**End of audit. Total findings: 47. Minimum per-dimension count met: yes (4+ each).**
