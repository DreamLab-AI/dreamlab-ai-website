# Technical Debt Audit — 2026-03-01

Comprehensive audit of the DreamLab community forum codebase, triggered by the
discovery of a broken cohort mapping (`CohortType` with academic names) that
destroyed relay data and caused zone access failures after login.

Five parallel agents audited: stores, nostr modules, route pages, config
alignment, and live endpoint behaviour.

---

## Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 12 | Production-breaking: data loss, access failures, security leaks |
| HIGH | 21 | Functional bugs or silent failures under real usage |
| MEDIUM | 22 | Inconsistencies, dead code, maintenance hazards |
| LOW | 17 | Naming, comments, minor cleanup |

---

## CRITICAL Findings

### C1. Hardcoded `('business' | 'moomaa-tribe')` cohort union type
**Files:** `stores/channels.ts:12,54,60,145,154,293` · `nostr/groups.ts:650` · `CreateEventModal.svelte:85`
**Impact:** Same class of bug as the CohortType mapping. Only 2 of 13 cohorts pass type checks. All others (`family`, `cross-access`, `trainers`, etc.) are silently dropped.
**Fix:** Replace with `string[]` everywhere. Load options from `getCohorts()`.

### C2. Ghost section IDs: `public-lobby` / `community-rooms` / `dreamlab`
**Files:** `stores/channels.ts:205,312-345` · `stores/sections.ts:7,63,82` · `nostr/channels.ts:127,320,555` · `nostr/sections.ts:41,54` · `stores/admin.ts:347` · `CreateEventModal.svelte:32,75` · `SemanticSearch.svelte:48` · `GlobalSearch.svelte:59` · `SectionCard.svelte:13`
**Impact:** These section IDs do not exist in `sections.yaml`. Channels default to `public-lobby` which `getSection()` returns `undefined` for. Three named derived stores always return empty arrays. The sectionStore auto-approves a non-existent section.
**Fix:** Replace `public-lobby` default with `dreamlab-lobby`. Remove or regenerate named derived stores from YAML. Update `CreateEventModal` to use `getSections()`.

### C3. Three competing NDK singletons
**Files:** `nostr/relay.ts` (RelayManager) · `nostr/ndk.ts` (module-level) · `stores/ndk.ts` (writable store)
**Impact:** Events published through one instance are invisible to subscriptions on another. Auth state (signer) doesn't propagate across instances.
**Fix:** Delete `nostr/ndk.ts` and `stores/ndk.ts`. Consolidate into `relay.ts` RelayManager.

### C4. `stores/ndk.ts` connects to hardcoded public relays + NIP-04 plaintext DMs
**File:** `stores/ndk.ts:5-9,119,124,180`
**Impact:** Data leak — queries go to `relay.damus.io`, `relay.nostr.band`, `nos.lol`, `relay.snort.social` instead of the DreamLab relay. DM functions use deprecated kind 4 without encryption.
**Fix:** Delete `stores/ndk.ts` entirely.

### C5. Calendar routes still use legacy `$userStore.profile?.cohorts`
**Files:** `[category]/[section]/calendar/+page.svelte:40,58` · `[section]/calendar/+page.svelte:37,55`
**Impact:** Calendar access decisions use the broken cohort mapping. After the `user.ts` fix deploys, they'll use raw strings, but still lack `waitForPermissions()` so the race condition remains.
**Fix:** Switch to `$userPermissionsStore?.cohorts`. Add `waitForPermissions()` in onMount.

### C6. Admin routes missing `waitForReady()`
**Files:** `admin/stats/+page.svelte:41` · `admin/calendar/+page.svelte:46`
**Impact:** On page refresh, auth hasn't restored yet → admin gets bounced to landing.
**Fix:** Add `await authStore.waitForReady()` as first line of onMount.

---

## HIGH Findings

### H1. `approved` cohort grants no zone access
`whitelist.ts:260,277` assigns `['approved']` to new users. No section in YAML has `requiredCohorts: ['approved']`. Approved users get no section access.
**Fix:** Assign zone-specific cohorts at approval time, or add `approved` to YAML sections.

### H2. `minimoonoir-rooms` / `community-rooms` birthday section IDs don't exist
`[category]/[section]/calendar/+page.svelte:74` checks `'minimoonoir-rooms'`. `[section]/calendar/+page.svelte:71` checks `'community-rooms'`. Neither exists in YAML. Birthday fetch is dead code.
**Fix:** Replace with actual section IDs (`minimoonoir-events`, `family-events`).

### H3. Duplicate `isAuthenticated` export (auth.ts vs user.ts)
Different semantics: auth.ts checks `$auth.isAuthenticated`, user.ts checks `$auth.state === 'authenticated' && $auth.pubkey !== null`.
**Fix:** Remove from user.ts. Use auth.ts as single source.

### H4. Duplicate `isAdmin` export (user.ts vs userPermissions.ts)
Derived from different sources. Consumers must know which to import.
**Fix:** Rename or remove one.

### H5. Inconsistent cohort tag parsing
`admin.ts:344` splits comma-separated `cohort` tag values. `channels.ts:152` reads separate `['cohort', value]` tags. Format mismatch.
**Fix:** Align parsing across both files.

### H6. Incomplete logout cleanup
`auth.ts:781-791` clears `whitelistStatusStore`, `sectionStore`, `clearWhitelistCache()` but NOT: `channelStore`, `adminStore`, `profileCache`, `muteStore`, `notificationStore`.
**Fix:** Add cleanup for all user-scoped stores.

### H7. `getUserMemberStatus()` race condition in channelStore.ts
Async import returns a temporary writable that never updates. Early subscribers see stale state.
**Fix:** Restructure to avoid async import or use a derived store with placeholder.

### H8. Unsafe `as ChannelSection` casts on relay data (13+ sites)
`sections.ts`, `channels.ts`, `section-events.ts`, `admin.ts`, `GlobalSearch.svelte`, `SemanticSearch.svelte`, `calendar route`
**Fix:** Add `isValidSection(id)` guard function. Validate before cast.

### H9. NIP-04 `dmFilter` still exported from events.ts
Kind 4 was removed 2025-12-01. `dm.ts` correctly uses NIP-17/NIP-59.
**Fix:** Delete `dmFilter`. Remove `ENCRYPTED_DM` from kind constants.

### H10. Missing `fetchEvents` timeout in calendar, sections, birthdays, channels
`channels.ts` has timeout pattern but 10+ other files call `fetchEvents()` without one.
**Fix:** Extract shared `fetchEventsWithTimeout()` utility.

### H11. Birthday N+1 query — 500 sequential HTTP calls
`birthdays.ts:41-49` calls `verifyCohortMembership` per profile.
**Fix:** Batch whitelist check or fetch full list once.

### H12. Hardcoded `minimoonoir` cohort in birthdays
`birthdays.ts:105,149` — birthday feature only works for one cohort.
**Fix:** Make configurable or derive from YAML.

### H13. ZoneNav + MobileZoneDrawer fallback chain
Both use `$whitelistStatusStore?.cohorts ?? $userStore.profile?.cohorts ?? []`. Falls back to legacy data.
**Fix:** Use `$userPermissionsStore?.cohorts ?? []`.

### H14. sectionStore initial state hardcodes `public-lobby`
`sections.ts:62-64` — should auto-approve from YAML `autoApprove: true` sections.
**Fix:** Initialize from `getSections().filter(s => s.access.autoApprove)`.

### H15. 3 named derived stores for non-existent sections
`channels.ts:307-358` — `publicLobbyChannels`, `communityRoomsChannels`, `dreamlabChannels` always empty.
**Fix:** Delete. Use `getChannelsBySection(id)` at call sites.

### H16. Duplicate RELAY_URL declarations
`whitelist.ts:43`, `profile-sync.ts:11` define own `RELAY_URL` instead of importing from config.
**Fix:** Import from `$lib/config`.

### H17. `pending/+page.svelte` no `waitForReady()`
Reactive redirect can fire before auth restores.
**Fix:** Add onMount with `waitForReady()`.

### H18. CreateEventModal hardcoded stale section/cohort options
`CreateEventModal.svelte:75-86` — `public-lobby`, `community-rooms`, `moomaa-tribe`.
**Fix:** Load from `getSections()` and `getCohorts()`.

### H19. admin/stats no whitelist timeout
`admin/stats/+page.svelte:49` — can hang indefinitely.
**Fix:** Add `Promise.race` with 8s timeout like `/admin/+page.svelte`.

### H20. admin/calendar uses client-side admin check instead of relay
`admin/calendar/+page.svelte:53` uses `$isAdminVerified` (env var) not relay.
**Fix:** Add relay-based verification.

### H21. view/[noteId] hardcodes `Fairfield` branding
`view/[noteId]/+page.svelte:115,126,207` — should use `getAppConfig().name`.

---

## MEDIUM Findings (abbreviated)

| # | File | Issue |
|---|------|-------|
| M1 | `user.ts:146-147` | `createdAt/updatedAt` set to `Date.now()`, not actual Nostr timestamps |
| M2 | `sections.ts:121-124` | Auto-persist fires on loading states |
| M3 | `profiles.ts` | Not cleared on logout |
| M4 | `notifications.ts:88-91` | Auto-persist, not user-scoped, not cleared on logout |
| M5 | `mute.ts` | Not cleared on logout |
| M6 | `stores/index.ts:23-29` | Dead re-exports of legacy storage utilities |
| M7 | `groups.ts` | Uses raw nostr-tools, not NDK. Conflicting `fetchChannelMessages` export |
| M8 | `groups.ts:112,158,209,...` | 7 unused `pubkey` derivations |
| M9 | `sections.ts:189-239` | Incorrect NIP-59 DM implementation |
| M10 | `events.ts` vs `groups.ts` | Kind 42 (NIP-28) vs kind 9 (NIP-29) undocumented |
| M11 | `nostr/ndk.ts` | Stale architecture, own connection state conflicts with RelayManager |
| M12 | `nostr/index.ts` | Barrel export leaks internal functions |
| M13 | `agents.ts:39-43` | `AGENT_PUBKEYS` all empty strings with `as const` |
| M14 | `setup/+page.svelte:91,96,200` | `goto('/')` missing `${base}` prefix |
| M15 | `[section]/calendar/+page.svelte:139` | Title hardcodes `Nostr BBS` |
| M16 | `+page.svelte:29` | Landing page no `waitForReady()` |
| M17 | `chat/+page.svelte:185-186` | `mounted = true` after `loadChannels()` — reactive watcher race |
| M18 | `chat/[channelId]/+page.svelte:109` | Reads whitelist once at mount, no reactivity |
| M19 | `events/+page.svelte:53` | Same one-time whitelist read |
| M20 | `admin/calendar/+page.svelte:53` | Client-side admin check instead of relay |
| M21 | `config/loader.ts:121-299` | Fallback config completely diverges from YAML |
| M22 | `config/loader.ts:136-156` | Fallback capabilities mismatch (`forum.lock` etc.) |

---

## Remediation Plan

### Phase 1: CRITICAL fixes (deploy immediately)
1. Replace `('business' | 'moomaa-tribe')` with `string[]` in channels.ts, groups.ts, CreateEventModal
2. Delete `stores/ndk.ts` — eliminates public relay leak + NIP-04 DMs
3. Replace `public-lobby` defaults with `dreamlab-lobby`
4. Fix calendar routes: switch to `userPermissionsStore`, add `waitForPermissions()`
5. Add `waitForReady()` to admin/stats and admin/calendar

### Phase 2: HIGH fixes (next deploy)
1. Consolidate NDK into relay.ts (delete nostr/ndk.ts)
2. Fix logout cleanup — clear all user-scoped stores
3. Add `fetchEventsWithTimeout` utility
4. Remove NIP-04 dead code (dmFilter, ENCRYPTED_DM constant, nip07 stubs)
5. Fix sectionStore initial state from YAML autoApprove sections
6. Delete 3 ghost derived stores in channels.ts
7. Fix ZoneNav/MobileZoneDrawer to use userPermissionsStore
8. Deduplicate isAuthenticated/isAdmin exports
9. Fix CreateEventModal to load options from config

### Phase 3: MEDIUM cleanup
1. Fix all `goto('/')` → `goto(\`${base}/\`)`
2. Replace hardcoded branding strings
3. Add centralized `clearAllStores()` for logout
4. Add fetchEvents timeout to all NDK queries
5. Fix birthday N+1 query
6. Align cohort tag parsing (admin vs channels)
7. Clean up fallback config in loader.ts

---

## Files Changed in This Session

The following fixes are already in the working tree (uncommitted):

| File | Change |
|------|--------|
| `stores/user.ts` | Removed broken cohort mapping; pass-through from relay |
| `stores/userPermissions.ts` | Added `permissionsReady` store + `waitForPermissions()` |
| `nostr/whitelist.ts` | `CohortName` → `string`; expanded cohort list removed |
| `nostr/birthdays.ts` | Removed `CohortName` import; use `string` |
| `nostr/admin-security.ts` | Removed `CohortName` import; use `string` |
| `stores/index.ts` | Removed `CohortType` export |
| `routes/forums/+page.svelte` | Uses `waitForPermissions()`; permissions-gated categories |
| `routes/[category]/+page.svelte` | Uses `waitForPermissions()`; optimistic loading |
| `routes/[category]/[section]/+page.svelte` | Uses `waitForPermissions()` before access check |
| `routes/[category]/[section]/[forumId]/+page.svelte` | Uses `waitForPermissions()` before redirect |
| `nostr/whitelist.test.ts` | Removed `CohortName` type reference |
| `config/zone-access.test.ts` | Replaced CohortName gap tests with alignment tests |

### Test Results
- 184 zone-access tests: PASS
- 39 permissions tests: PASS
- 35 whitelist tests: PASS
- Build: SUCCESS (14.88s)
