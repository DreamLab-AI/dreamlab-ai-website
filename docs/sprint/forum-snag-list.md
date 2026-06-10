# Rust/WASM Community Forum — Snag List

**Date:** 2026-03-10
**Tester:** Automated QA (admin login via hex privkey)
**Admin pubkey:** `a617d2109bdd3f1a607d5a837e885178f6367af296885d7f058c26b2bd03221a`
**URL:** https://dreamlab-ai.com/community/

## Summary

- **Pages tested:** 15 routes across homepage, auth, chat, DMs, forums, events, admin (5 tabs), settings, profile, search
- **Screenshots:** 26 screenshots in `logs/forum-01-*.png` through `logs/forum-26-*.png`
- **Total snags:** 18 (3 CRITICAL, 6 HIGH, 6 MEDIUM, 3 LOW)

---

## CRITICAL (Core functionality broken)

### SNAG 2 — Message send fails completely
- **Page:** `/community/chat/:channelId` (all channels)
- **Steps:** Type message → click Send
- **Expected:** Message published as kind 42 event, appears in chat, input clears
- **Actual:** Message stays in input, "Draft saved" shown, message not published to relay, channel still shows "No messages yet"
- **Impact:** Core chat is non-functional. No user can post messages.
- **Root cause (suspected):** Relay publish failing silently. The WASM signing or relay write may be broken. Status shows "Connected" but writes fail.

### SNAG 13 — Channel message counts all show 0
- **Page:** `/community/chat` (channel list)
- **Expected:** Channels show message counts (Admin Overview reports 78 messages on relay)
- **Actual:** Every channel shows "0 posts" and "No messages yet — be the first to post!"
- **Impact:** All existing messages invisible. Relay has 78 messages but the subscription filter isn't matching them.
- **Root cause (suspected):** Kind 42 subscription filter not matching channel event IDs, or the channel IDs in the WASM client don't match the ones the old SvelteKit client used.

### SNAG 18 — Admin channel creation fails silently
- **Page:** `/community/admin` → Channels tab
- **Steps:** Enter channel name → click Create Channel
- **Expected:** Kind 40 event published, channel appears in list, success feedback
- **Actual:** Form resets, no new channel in list, no error/success toast. Same relay publish failure.
- **Impact:** Admin cannot create new channels.

---

## HIGH (Feature significantly broken)

### SNAG 4 — RSVP Accept has no effect
- **Page:** `/community/events`
- **Steps:** Click "Accept" on hackathon event
- **Expected:** RSVP event published, attending count increments
- **Actual:** No visible change, still shows "0 attending"
- **Impact:** Event RSVP system non-functional.

### SNAG 5 / SNAG 8 — User whitelist empty (0 users)
- **Page:** `/community/admin` → Overview tab + Users tab
- **Expected:** At least the admin user should appear. Whitelist should show registered users.
- **Actual:** Overview shows "Total Users: 0", Users tab shows "No whitelisted users found"
- **Impact:** User management non-functional. Cannot see or manage community members.

### SNAG 9 — Admin Sections tab stuck loading
- **Page:** `/community/admin` → Sections tab
- **Expected:** Section access requests list loads
- **Actual:** Shows "0 pending" then "Loading requests..." indefinitely
- **Impact:** Cannot manage section access requests.

### SNAG 10 — Admin Calendar tab stuck loading
- **Page:** `/community/admin` → Calendar tab
- **Expected:** Calendar events list loads (Events page shows a hackathon)
- **Actual:** Shows "0 events" then "Loading calendar events..." indefinitely
- **Impact:** Cannot manage calendar events from admin panel.

### SNAG 12 — Profile save has no feedback
- **Page:** `/community/settings` → Profile section
- **Steps:** Enter nickname → click Save Profile
- **Expected:** Kind 0 metadata event published, success toast shown
- **Actual:** No visible feedback — no toast, no confirmation. Unclear if it worked.
- **Impact:** User cannot confirm profile was saved. Likely same publish failure.

### SNAG 16 — Profile page returns 404
- **Page:** `/community/profile/:pubkey`
- **Expected:** User profile view with posts, about info
- **Actual:** 404 "Page not found"
- **Impact:** Cannot view any user's profile. Route not registered.

---

## MEDIUM (Feature partially broken or degraded)

### SNAG 1 — Channel header shows "Loading..." (intermittent)
- **Page:** `/community/chat/:channelId` (some channels)
- **Expected:** Channel name shown in header
- **Actual:** Shows "Loading..." instead of channel name for some channels (observed on first test, resolved on second test with different channel)
- **Impact:** Confusing UX. Kind 40 metadata fetch may be slow or fail for some channel IDs.

### SNAG 3 — Forum category page shows no sections
- **Page:** `/community/forums/:category` (e.g., minimoonoir-welcome)
- **Expected:** List of sections/threads within the category
- **Actual:** Only breadcrumb and heading render, body is empty
- **Impact:** Cannot browse forum thread hierarchy deeper than top-level.

### SNAG 7 — Some channels show section "none"
- **Page:** `/community/admin` → Channels tab → Existing Channels
- **Channels affected:** off-topic, help-desk, ai-projects, general
- **Expected:** All channels assigned to a valid section
- **Actual:** These 4 channels show section "none"
- **Impact:** Channels don't appear in correct zone/section groupings.

### SNAG 11 — Profile nickname field empty on load
- **Page:** `/community/settings` → Profile section
- **Expected:** Nickname pre-populated from kind 0 metadata on relay
- **Actual:** Nickname field blank even if profile metadata exists
- **Impact:** User must re-enter nickname each time they visit settings.

### SNAG 14 — Zone filter shows wrong count and lowercase heading
- **Page:** `/community/chat?section=dreamlab`
- **Expected:** Heading shows zone name properly cased, count reflects filtered channels
- **Actual:** Heading shows "dreamlab" (lowercase), count shows "8" (total) not filtered count (2)
- **Impact:** Minor UX confusion.

### SNAG 17 — Search page returns 404
- **Page:** `/community/search`
- **Expected:** Global search interface for messages/users/channels
- **Actual:** 404 "Page not found"
- **Impact:** No search functionality available. Route not registered.

---

## LOW (Cosmetic or minor)

### SNAG 3b — Category icons show "?" placeholder
- **Page:** `/community/forums` (zone listing)
- **Expected:** Category icons/emoji render correctly
- **Actual:** Some categories show "?" instead of icon
- **Impact:** Minor cosmetic issue.

### SNAG 6 — Create Channel button state (expected behavior)
- **Page:** `/community/admin` → Channels tab
- **Note:** Button is disabled when channel name empty, enables when filled. This is correct behavior — removing from snag list. (Originally flagged in error.)

### SNAG 15 — "Loading messages..." briefly shown
- **Page:** `/community/chat/:channelId`
- **Expected:** Quick loading or skeleton state
- **Actual:** Shows "Loading messages..." for 1-2 seconds before resolving to "No messages yet"
- **Impact:** Minor UX — acceptable loading state if it resolves.

---

## Root Cause Analysis

The **single most impactful root cause** behind SNAGs 2, 4, 12, 13, and 18 is likely:

**Relay publish/subscribe failure in the Rust WASM client.**

The relay shows "Connected" in the admin panel and reports 78 existing messages, but:
1. **Writes fail silently** — message send, channel creation, RSVP, and profile save all fail with no error
2. **Reads partially fail** — channel metadata (kind 40) loads but messages (kind 42) don't, suggesting the subscription filter is wrong or the old messages were published with different tag structures

### Likely investigation points:
1. **`community-forum-rs/crates/forum-client/src/relay.rs`** — Check if `publish_event()` returns an error that's being swallowed
2. **`community-forum-rs/crates/forum-client/src/stores/messages.rs`** — Check the subscription filter for kind 42 events (e.g., `#e` tag filter matching channel ID)
3. **`community-forum-rs/crates/forum-client/src/auth/mod.rs`** — Verify that local hex key signing works correctly (the key is loaded into memory but may not be producing valid Schnorr signatures from WASM)
4. **Browser console** — Check for WASM panics or WebSocket errors that might indicate the real failure
5. **Relay WebSocket** — The relay may accept the connection but reject writes (NIP-42 AUTH not completed, or write policy blocking)

### Secondary issues:
- **Missing routes** (SNAGs 16, 17): `/profile/:pubkey` and `/search` not in router
- **Admin data queries** (SNAGs 5, 8, 9, 10): Whitelist, sections, calendar queries returning empty — likely different kind numbers or tag filters
- **Forum category drill-down** (SNAG 3): Section listing component not fetching or rendering children

---

## Pages Working Well

| Page | Status | Notes |
|------|--------|-------|
| Homepage (`/community/`) | OK | WebGPU particles, welcome content, login CTA |
| Login (`/community/login`) | OK | All 3 methods render (passkey, NIP-07, nsec) |
| Chat list (`/community/chat`) | PARTIAL | Channels list renders, zone filters work, but 0 messages everywhere |
| DM list (`/community/dm`) | OK | Empty state correct, New Message form works |
| Forums list (`/community/forums`) | PARTIAL | 4 zones render with descriptions, but category icons broken |
| Events (`/community/events`) | PARTIAL | Event displays, calendar sidebar, Create Event form — but RSVP broken |
| Admin Overview | PARTIAL | Stats display, relay connected — but user count wrong |
| Admin Channels | PARTIAL | Form renders, existing channels listed — but creation fails |
| Admin Users | PARTIAL | Form renders — but whitelist empty |
| Settings | OK | All sections render correctly with proper controls |
| 404 page | OK | Clean 404 with "Go home" link |
