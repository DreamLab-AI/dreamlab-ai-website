# PRD: DreamLab Community Forum Professionalisation Upgrade

**Version:** 7.0
**Date:** 2026-04-03
**Author:** DreamLab Engineering
**Status:** Draft
**Depends on:** [Discourse vs DreamLab Audit](./audit-discourse-vs-dreamlab-forum.md), [ADR-022 NIP-29 Group Access](./adr/022-nip29-group-access-model.md), [PRD v6.0](./prd-cloudflare-workers-migration.md), [PRD v4.0 Rust Port](./prd-rust-port-v4.0.md)

---

## 1. Overview & Motivation

### Why

The DreamLab community forum has strong architectural foundations: passkey-first auth with PRF key derivation, edge-native Cloudflare Workers, Nostr protocol portability, Solid pod data sovereignty, and real-time WebSocket relay via Durable Objects. It is architecturally more sophisticated than Discourse in several dimensions (auth security, edge deployment, data ownership, protocol portability).

However, the product layer is thin. The Discourse vs DreamLab audit (2026-04-03) identified critical gaps:

- **No graduated trust system** -- binary whitelisted/not-whitelisted with 3 zone flags
- **No content moderation workflow** -- admin can delete events but there is no report, review, or action pipeline
- **Client-side-only zone enforcement** -- the relay broadcasts all events to all subscribers regardless of zone access
- **No admin audit trail** -- no record of who did what, when, or why
- **No onboarding** -- passkey registration leads to an empty page with no guidance
- **No badges or gamification** -- no progression signals, no engagement incentives
- **No admin settings** -- configuration is compile-time or hardcoded
- **Limited user management** -- no suspend, silence, user notes, or activity summaries

The forum has 107 Rust files, 58 components, 17 pages, 7 stores, and ~57K LOC but the feature depth in each is shallow. The audit scored the forum at 2.5-4/5 across areas, with Admin & Moderation and Profiles & Settings at 2.5/5.

### What

A four-phase professionalisation upgrade that adopts Discourse's battle-tested product patterns adapted for Nostr protocol, Cloudflare edge infrastructure, and Leptos/WASM client. This PRD covers all P0/P1/P2/P3 items from the audit, with specific Nostr event kinds, D1 schema changes, relay-worker handler modifications, and forum-client component additions.

### Scope

| In scope | Out of scope |
|----------|-------------|
| Trust levels (TL0-TL3) with auto-promotion | Email system (post-by-email, digests, transactional) |
| Relay-side zone enforcement on REQ and EVENT | Plugin/extension architecture |
| NIP-56 moderation queue | User merge/anonymize (impossible with Nostr pubkeys) |
| Admin audit trail | SEO server rendering (auth-gated content) |
| Onboarding flow | PostgreSQL full-text search (RuVector is superior) |
| NIP-58 badge system | Mobile native app |
| Admin settings (D1-backed) | |
| User management (suspend, silence, notes) | |
| Content organisation (pins, archive, threads) | |
| Notification improvements (push, per-channel tracking) | |
| Anti-abuse (content screening, per-TL rate limits) | |
| Webhooks, themes, rate limiting, API docs | |

### Codebase Reference

| Component | Location | LOC |
|-----------|----------|-----|
| Relay Worker | `community-forum-rs/crates/relay-worker/src/` | 4 modules (lib.rs, auth.rs, nip11.rs, whitelist.rs) |
| Auth Worker | `community-forum-rs/crates/auth-worker/src/lib.rs` | WebAuthn + NIP-98 + pod provisioning |
| Forum Client | `community-forum-rs/crates/forum-client/src/` | 17 pages, 58 components, 7 stores |
| Nostr Core | `community-forum-rs/crates/nostr-core/src/` | NIP implementations, 129 tests |
| Search Worker | `community-forum-rs/crates/search-worker/src/lib.rs` | RuVector cosine k-NN |
| Preview Worker | `community-forum-rs/crates/preview-worker/src/lib.rs` | OG metadata, SSRF protection |

---

## 2. Success Criteria

### Phase 1 (P0 -- Foundation)

| Metric | Target |
|--------|--------|
| Relay rejects events from pubkeys without zone access for the target channel | 100% enforcement |
| Relay filters REQ responses by session pubkey zone access | 100% enforcement |
| Trust level assigned to every whitelisted user | 100% coverage |
| Auto-promotion from TL0 to TL1 fires within 24h of criteria met | Verified in staging |
| NIP-56 report events stored and queryable by admin | Functional |
| Admin audit log records all 12+ action types | Verified by manual test of each action |
| Existing 457 tests pass with zero regressions | 0 failures introduced |

### Phase 2 (P1 -- Professional)

| Metric | Target |
|--------|--------|
| New users see onboarding modal on first login | 100% of new registrations |
| Profile completion rate after onboarding | >60% set display name |
| Admin can suspend/silence a user and relay enforces it | Verified end-to-end |
| At least 20 admin settings configurable via UI | 20+ settings |
| NIP-58 badges granted automatically within 24h of criteria met | Verified for all auto-grant badges |

### Phase 3 (P2 -- Depth)

| Metric | Target |
|--------|--------|
| Pinned messages visible at top of channel | Functional |
| Archived channels reject new posts relay-side | Verified |
| Web Push notifications delivered on mention | Functional on Chrome, Firefox, Safari |
| Per-channel tracking preferences respected | Verified |
| Content screening blocks configured patterns | Verified with test patterns |

### Phase 4 (P3 -- Polish)

| Metric | Target |
|--------|--------|
| Webhook delivery on configured events | <5s latency, retry on failure |
| Theme switching in client | At least 2 themes (dark, light + accent) |
| API documentation published | OpenAPI spec for all HTTP endpoints |

### Definition of Done (per feature)

1. Relay-side changes pass all existing tests + new tests for the feature
2. Client changes compile to `wasm32-unknown-unknown` without errors
3. `cargo check` passes for all modified crates
4. Feature is documented in the relevant source module doc comments
5. D1 migrations are additive (no destructive schema changes)
6. Manual end-to-end test passes on staging relay

---

## 3. User Stories

### Phase 1: P0 -- Foundation

#### Trust System

- **US-1.1:** As a new member (TL0), I want to be able to read public channels and post in the lobby so that I can participate immediately after registration.
- **US-1.2:** As an active member, I want to be automatically promoted to TL1 after 3 days active, 10 posts read, and 1 post created so that I unlock full posting privileges without admin intervention.
- **US-1.3:** As a regular contributor, I want to earn TL2 after sustained engagement (14 days, 50 reads, 10 posts, 0 mod actions) so that I can create channels and pin my own posts.
- **US-1.4:** As an admin, I want to manually grant TL3 (Trusted) to reliable members so that they can help moderate the community.
- **US-1.5:** As an admin, I want to configure trust level thresholds (days active, posts read, posts created) via settings so that I can tune promotion criteria to my community's size.
- **US-1.6:** As a TL2 user who becomes inactive, I want my trust level to be preserved for 6 months before demotion so that temporary absences do not penalise me (hysteresis pattern).

#### Relay-Side Zone Enforcement

- **US-1.7:** As a member with only `home` zone access, I want the relay to exclude events from `dreamlab` and `minimoonoir` channels in my subscription results so that I only see content I am authorised to view.
- **US-1.8:** As a member, I want the relay to reject my EVENT if I attempt to post in a channel belonging to a zone I lack access to, returning a clear error, so that access control is not merely cosmetic.
- **US-1.9:** As an admin, I want channel-zone mappings stored in D1 so that zone enforcement is deterministic and survives DO hibernation.

#### Moderation Queue

- **US-1.10:** As a member (TL1+), I want to report a post with a reason (spam, inappropriate, off-topic, or free-text) so that problematic content is flagged for admin review.
- **US-1.11:** As an admin, I want to view a moderation queue showing pending reports with the reported content, reporter, reason, and timestamp, so that I can act on them efficiently.
- **US-1.12:** As an admin, I want to dismiss, hide, or delete reported content and optionally warn or adjust the author's trust level, so that I have a graduated response toolkit.
- **US-1.13:** As a member, I want content with 3+ reports from TL1+ users to be auto-hidden pending review so that clearly problematic content is removed quickly.

#### Admin Audit Trail

- **US-1.14:** As an admin, I want every admin action (whitelist add/remove, cohort update, trust level change, suspend, silence, channel create/delete, event delete, report resolve) logged with actor, target, previous/new values, reason, and timestamp so that I have a complete audit trail.
- **US-1.15:** As an admin, I want to filter the audit log by action type, actor, target, and date range so that I can investigate specific incidents.

### Phase 2: P1 -- Professional

#### Onboarding

- **US-2.1:** As a new user logging in for the first time, I want to see a 3-step welcome modal (community guidelines, profile setup, channel exploration) so that I understand the community norms and can set up my identity.
- **US-2.2:** As a new user, I want to receive a system notification after my first post ("Welcome! Your first post is live.") so that I feel acknowledged.
- **US-2.3:** As a returning user, I do not want to see the onboarding modal again, with my completion status persisted as a kind-30078 event.

#### Badge System

- **US-2.4:** As a member, I want to earn badges (First Post, Conversationalist, Contributor, Helpful, Explorer, Trusted) automatically based on my activity so that my contributions are visibly recognised.
- **US-2.5:** As a member, I want to see my badges on my profile page and in the author card next to my posts so that others can see my standing.
- **US-2.6:** As an admin, I want to manually award Pioneer and Founding Member badges to early registrants so that their early support is recognised.
- **US-2.7:** As a member, I want badge awards to be NIP-58 events so that they are Nostr-native and portable if the community federates.

#### Admin Settings

- **US-2.8:** As an admin, I want to configure community settings (name, description, welcome message, logo URL, registration mode, default zone, moderation thresholds, trust level thresholds, feature toggles) via a settings page in the admin panel so that I do not need to redeploy to change configuration.
- **US-2.9:** As an admin, I want settings persisted in D1 and cached client-side so that they survive worker restarts and load quickly.

#### User Management

- **US-2.10:** As an admin, I want to suspend a user for a configurable duration (1 day, 1 week, 1 month, permanent) with a reason, and have the relay reject their events during suspension, so that I can enforce community standards.
- **US-2.11:** As an admin, I want to silence a user (can read but not post, except DMs to admin) so that I have a lighter-weight intervention option.
- **US-2.12:** As an admin, I want to attach private notes to user profiles (visible only to admin) so that I can track context for moderation decisions.
- **US-2.13:** As an admin, I want to see an activity summary for each user (last seen, post count, report count, join date, trust level) in the admin user table so that I can make informed decisions.

### Phase 3: P2 -- Depth

#### Content Organisation

- **US-3.1:** As an admin, I want to pin a message to the top of a channel so that important announcements remain visible.
- **US-3.2:** As an admin, I want to archive a channel (read-only, no new posts) so that inactive channels are preserved without clutter.
- **US-3.3:** As a member, I want to reply to a specific message in a thread so that conversations can branch without polluting the main channel stream.

#### Notifications

- **US-3.4:** As a member, I want to receive push notifications (Web Push API) when I am mentioned or receive a DM while the forum tab is not active, so that I stay engaged.
- **US-3.5:** As a member, I want to set a tracking level per channel (watching, tracking, normal, muted) so that I control my notification volume.
- **US-3.6:** As a member, I want consolidated notifications ("5 new messages in #general") instead of individual items so that my notification list stays manageable.

#### Search

- **US-3.7:** As a member, I want to filter search results by channel, author, and date range so that I can find specific content quickly.
- **US-3.8:** As an admin, I want search query logs so that I can understand what members are looking for.

#### Profiles

- **US-3.9:** As a member, I want to see an activity summary on profiles (posts, reactions given/received, channels participated, join date) so that I can learn about other members.
- **US-3.10:** As a member, I want privacy controls on my profile fields (visible to all, members only, hidden) enforced server-side, not just client-side.

#### Anti-Abuse

- **US-3.11:** As an admin, I want a configurable word/pattern blocklist checked relay-side on incoming events so that prohibited content is rejected or auto-flagged before broadcast.
- **US-3.12:** As a system, I want per-trust-level rate limits (TL0: 5 posts/hr, TL1: 20/hr, TL2+: 60/hr) enforced relay-side so that new accounts cannot flood channels.

### Phase 4: P3 -- Polish

- **US-4.1:** As an admin, I want to configure webhooks that fire on specific events (new post, new user, report filed) with NIP-98-signed payloads so that I can integrate with external systems.
- **US-4.2:** As a member, I want to switch between visual themes (at minimum dark/light with accent colour) so that I can personalise my experience.
- **US-4.3:** As a developer, I want an OpenAPI specification for all relay and worker HTTP endpoints so that I can build integrations.
- **US-4.4:** As an admin, I want per-action rate limits configurable via settings so that I can tune abuse prevention per action type.

---

## 4. Technical Requirements

### 4.1 Phase 1: P0 -- Foundation (~12 days)

#### 4.1.1 Graduated Trust System (TL0-TL3)

**D1 Schema Changes:**

```sql
-- Migration 001: Add trust level and activity tracking to whitelist
ALTER TABLE whitelist ADD COLUMN trust_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN days_active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN posts_read INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN posts_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN mod_actions_against INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN last_active_at INTEGER;
ALTER TABLE whitelist ADD COLUMN trust_level_updated_at INTEGER;
```

**Relay Worker Changes (`community-forum-rs/crates/relay-worker/`):**

1. **New module: `trust.rs`** -- Trust level computation and promotion logic.
   - `compute_trust_level(row: &WhitelistRow, settings: &Settings) -> u8` -- Pure function that evaluates current activity against thresholds.
   - `check_promotion(env: &Env, pubkey: &str) -> Result<Option<u8>>` -- Reads whitelist row, computes eligible TL, updates if promoted.
   - Hysteresis: TL2 demotion only triggers when activity drops below 90% of threshold and user has been inactive for 6+ months.
   - TL3 is admin-granted only (never auto-promoted, never auto-demoted).

2. **Activity tracking in `relay_do.rs`:**
   - On EVENT (kind 42 -- channel message): increment `posts_created` for the event author.
   - On REQ response delivery: increment `posts_read` for the requesting pubkey (batched, not per-event).
   - On any authenticated interaction: update `last_active_at`, recompute `days_active` as count of distinct UTC days with activity.

3. **Daily alarm in Durable Object:**
   - Add a `scheduled()` handler (or DO alarm) that runs trust level promotion checks for all users with `last_active_at` in the past 48 hours.
   - Batch D1 reads/writes (query users due for check, batch update promotions).

4. **API changes in `whitelist.rs`:**
   - `GET /api/check-whitelist?pubkey=<hex>` response adds `trust_level` field.
   - `POST /api/whitelist/set-trust-level` -- Admin endpoint to manually set TL (for TL3 grants). Requires NIP-98 admin auth.

**Forum Client Changes (`community-forum-rs/crates/forum-client/`):**

1. **`stores/zone_access.rs`:** Add `trust_level: RwSignal<u8>` to `ZoneAccess`. Populate from `/api/check-whitelist` response.
2. **`components/trust_badge.rs`** (new): Display TL badge (Newcomer/Member/Regular/Trusted) next to usernames.
3. **`pages/admin.rs`:** Add trust level column to user table. Add "Set Trust Level" action for TL3 grants.
4. **Client-side gating:** Use `trust_level` signal to show/hide UI affordances (channel creation button for TL2+, report button for TL1+, mod actions for TL3+).

**Trust Level Matrix:**

| Level | Name | Criteria | Capabilities |
|-------|------|----------|-------------|
| TL0 | Newcomer | Registration + whitelist | Read public channels, post in lobby, react |
| TL1 | Member | 3+ days active, 10+ posts read, 1+ post created | Post in all accessible zones, DM, report content |
| TL2 | Regular | 14+ days active, 50+ posts read, 10+ posts created, 0 mod actions | Create channels (in permitted zones), pin own posts, edit own posts beyond 24h |
| TL3 | Trusted | Admin-granted | Review moderation queue, move messages between channels, close threads |

#### 4.1.2 Relay-Side Zone Enforcement

**D1 Schema Changes:**

```sql
-- Migration 002: Channel-zone mapping
CREATE TABLE channel_zones (
    channel_id TEXT PRIMARY KEY,
    zone TEXT NOT NULL DEFAULT 'home',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX idx_channel_zones_zone ON channel_zones(zone);
```

**Relay Worker Changes:**

1. **`relay_do.rs` -- EVENT handler modifications:**
   - On kind-42 (channel message) or kind-7 (reaction): extract the `e` tag referencing the channel (kind-40 event ID). Look up `channel_zones` for the channel's zone. Look up the author's whitelist entry. If the user's cohort flags do not include the channel's zone, return `["OK", id, false, "zone access denied"]`.
   - On kind-40 (channel creation): require TL2+ (from whitelist `trust_level`). Assign zone from request tag or default to the user's primary zone. Insert into `channel_zones`.

2. **`relay_do.rs` -- REQ handler modifications:**
   - When building the event result set for a subscription, join against `channel_zones` and the session's whitelist entry. Exclude events belonging to channels in zones the user lacks access to.
   - Cache the session's zone flags in the DO session state (populated on WebSocket connect from whitelist lookup) to avoid per-REQ D1 queries.

3. **Channel zone assignment:**
   - `POST /api/channel-zone` -- Admin endpoint to reassign a channel's zone. Requires NIP-98 admin auth.
   - On kind-40 event storage, auto-populate `channel_zones` from the event's `zone` tag (if present) or default to `home`.

**Forum Client Changes:**

1. **`stores/channels.rs`:** Include zone in channel metadata. Filter channel list by zone access (defence-in-depth; relay also filters).
2. **`pages/admin.rs`:** Add zone assignment dropdown to channel management.

#### 4.1.3 NIP-56 Moderation Queue

**Nostr Event Kinds Used:**

- **Kind 1984 (NIP-56 Reporting):** User reports content. Tags: `e` (reported event ID), `p` (reported pubkey), `report` (reason: `nudity`, `profanity`, `illegal`, `spam`, `impersonation`, or free-text).

**D1 Schema Changes:**

```sql
-- Migration 003: Moderation queue
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_event_id TEXT NOT NULL UNIQUE,
    reporter_pubkey TEXT NOT NULL,
    reported_event_id TEXT NOT NULL,
    reported_pubkey TEXT NOT NULL,
    reason TEXT NOT NULL,
    reason_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by TEXT,
    resolution TEXT,
    resolved_at INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_event ON reports(reported_event_id);
CREATE INDEX idx_reports_reported_pubkey ON reports(reported_pubkey);
```

**Relay Worker Changes:**

1. **`relay_do.rs` -- EVENT handler for kind 1984:**
   - Store the NIP-56 event in the events table (standard Nostr storage).
   - Parse report tags and insert into `reports` table with status `pending`.
   - Reporter must be TL1+ (reject reports from TL0 with `["OK", id, false, "trust level too low to report"]`).
   - **Auto-escalation:** After insert, count pending reports for the same `reported_event_id`. If count >= 3 and all reporters are TL1+, mark the reported event as hidden (add to a `hidden_events` table or set a flag). Broadcast kind-5 (NIP-09 deletion notice) tagged `hidden` to subscribers.

2. **New admin endpoints in `whitelist.rs` (or new `moderation.rs` module):**
   - `GET /api/reports?status=pending&limit=50` -- List pending reports. NIP-98 admin auth.
   - `POST /api/reports/:id/resolve` -- Resolve a report. Body: `{ "resolution": "dismiss" | "hide" | "delete" | "warn", "reason": "..." }`. NIP-98 admin auth.
   - On resolve with `delete`: publish kind-5 deletion event from relay's admin keypair.
   - On resolve with `warn`: adjust target user's `mod_actions_against` count (+1), which affects trust level.

**Forum Client Changes:**

1. **`components/report_button.rs`** (new): "Report" button on message bubbles (visible to TL1+). Opens modal with reason picker and optional free-text.
2. **`pages/admin.rs`:** New "Reports" tab. Lists pending reports with: reported message preview, reporter name, reason, timestamp, report count. Action buttons: Dismiss, Hide, Delete, Warn User.
3. **`components/hidden_message.rs`** (new): Placeholder for hidden content ("This message has been hidden pending review").

#### 4.1.4 Admin Audit Trail

**D1 Schema Changes:**

```sql
-- Migration 004: Admin audit log
CREATE TABLE admin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_pubkey TEXT NOT NULL,
    action TEXT NOT NULL,
    target_pubkey TEXT,
    target_id TEXT,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_admin_log_action ON admin_log(action);
CREATE INDEX idx_admin_log_actor ON admin_log(actor_pubkey);
CREATE INDEX idx_admin_log_target ON admin_log(target_pubkey);
CREATE INDEX idx_admin_log_created ON admin_log(created_at);
```

**Action Types (12+):**

| Action | Description | Target |
|--------|-------------|--------|
| `whitelist_add` | User added to whitelist | target_pubkey |
| `whitelist_remove` | User removed from whitelist | target_pubkey |
| `cohort_update` | User's cohort/zone flags changed | target_pubkey |
| `admin_grant` | User promoted to admin | target_pubkey |
| `admin_revoke` | User demoted from admin | target_pubkey |
| `trust_level_change` | User's trust level manually changed | target_pubkey |
| `user_suspend` | User suspended | target_pubkey |
| `user_unsuspend` | User unsuspended | target_pubkey |
| `user_silence` | User silenced | target_pubkey |
| `user_unsilence` | User unsilenced | target_pubkey |
| `channel_create` | Channel created | target_id (channel event ID) |
| `channel_delete` | Channel deleted | target_id |
| `channel_zone_change` | Channel zone reassigned | target_id |
| `event_delete` | Event deleted by admin | target_id (event ID) |
| `report_resolve` | Moderation report resolved | target_id (report ID) |
| `setting_change` | Admin setting changed | target_id (setting key) |

**Relay Worker Changes:**

1. **New module: `audit.rs`** -- `log_action(env: &Env, action: AuditAction) -> Result<()>` function called from every admin endpoint in `whitelist.rs` and the new moderation endpoints.
2. **New admin endpoint:** `GET /api/admin/audit-log?action=&actor=&target=&from=&to=&limit=50` -- Filterable audit log. NIP-98 admin auth.
3. **Retrofit existing endpoints:** Every admin action in `whitelist.rs` (`handle_add`, `handle_remove`, `handle_update_cohorts`, `handle_set_admin`) must call `audit::log_action()` before returning success.

**Forum Client Changes:**

1. **`pages/admin.rs`:** New "Audit Log" tab. Table with columns: timestamp, actor, action, target, previous value, new value, reason. Filters for action type, actor, target, date range. Paginated (50 per page).

### 4.2 Phase 2: P1 -- Professional (~8 days)

#### 4.2.1 Onboarding Flow

**Nostr Event Kinds Used:**

- **Kind 30078 (Application-Specific Data, NIP-78):** Store `{ "onboarded": true, "onboarded_at": <timestamp> }` with `d` tag `dreamlab:onboarding`.

**Forum Client Changes:**

1. **`components/onboarding_modal.rs`** (new): 3-step modal:
   - Step 1: "Welcome to [Community Name]" -- community guidelines summary (fetched from admin settings). "I agree" button.
   - Step 2: "Set up your profile" -- display name input, avatar upload (via pod-worker). "Skip" and "Save" buttons.
   - Step 3: "Explore channels" -- list of 3-5 main channels with descriptions and "Join" links. "Get started" button.
2. **`pages/home.rs`:** On mount, check for kind-30078 `dreamlab:onboarding` event. If absent, show onboarding modal.
3. **`stores/notifications.rs`:** On first kind-42 post from user (detected client-side), push a System notification: "Welcome! Your first post is live."

**Relay Worker Changes:**

- Kind-30078 events are already handled by NIP-33 replaceable event logic. No relay changes needed.

#### 4.2.2 NIP-58 Badge System

**Nostr Event Kinds Used:**

- **Kind 30009 (Badge Definition, NIP-58):** Published by admin pubkey. Tags: `d` (badge ID), `name`, `description`, `image`, `thumb`.
- **Kind 8 (Badge Award, NIP-58):** Published by admin pubkey. Tags: `a` (badge definition reference), `p` (awardee pubkey).
- **Kind 30008 (Profile Badges, NIP-58):** Published by user. Tags: `a` (badge definitions), `e` (badge award events). User curates which badges to display.

**Badge Definitions:**

| Badge ID | Name | Criteria | Grant |
|----------|------|----------|-------|
| `pioneer` | Pioneer | First 20 registrants | Manual |
| `founding-member` | Founding Member | Pre-launch registration | Manual |
| `first-post` | First Post | 1+ kind-42 post | Auto |
| `conversationalist` | Conversationalist | 10+ posts | Auto |
| `contributor` | Contributor | 50+ posts | Auto |
| `helpful` | Helpful | 5+ posts with 3+ reactions each | Auto |
| `explorer` | Explorer | Posted in 5+ distinct channels | Auto |
| `trusted` | Trusted | Reached TL3 | Auto |
| `moderator` | Community Moderator | Has TL3 and resolved 10+ reports | Auto |
| `og` | OG | 1+ year membership | Auto |

**Relay Worker Changes:**

1. **New module: `badges.rs`** -- Badge computation logic.
   - `compute_badges(env: &Env, pubkey: &str) -> Result<Vec<String>>` -- Queries D1 for user activity stats, returns list of earned badge IDs.
   - `grant_badge(env: &Env, badge_id: &str, pubkey: &str) -> Result<()>` -- Publishes kind-8 award event signed by the relay's admin keypair. Stores in events table.
   - `check_and_grant_all(env: &Env) -> Result<()>` -- Runs in daily alarm. For each active user, compute earned badges, diff against already-granted badges, grant new ones.

2. **Admin endpoints:**
   - `POST /api/badges/grant` -- Manual badge grant. Body: `{ "badge_id": "pioneer", "pubkey": "<hex>" }`. NIP-98 admin auth.
   - `GET /api/badges?pubkey=<hex>` -- List badges for a user. Public endpoint.

**Forum Client Changes:**

1. **`components/badge_display.rs`** (new): Renders badge icons/names. Used in profile page and message author card.
2. **`pages/profile.rs`:** Add badges section. Query kind-8 events where `p` tag matches profile pubkey.
3. **`components/message_bubble.rs`:** Show top 3 badges next to author name.
4. **`pages/admin.rs`:** Add "Badges" section with manual grant UI.

#### 4.2.3 Admin Settings System

**D1 Schema Changes:**

```sql
-- Migration 005: Admin settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL
);
```

**Settings Definitions (20-30):**

| Category | Key | Type | Default | Description |
|----------|-----|------|---------|-------------|
| general | `community_name` | string | "DreamLab" | Community display name |
| general | `community_description` | string | "" | One-line description |
| general | `welcome_message` | string | "" | Shown in onboarding step 1 |
| general | `logo_url` | string | "" | Community logo URL |
| access | `registration_mode` | enum | "invite" | open, invite, closed |
| access | `default_zone` | string | "home" | Zone assigned to new members |
| access | `auto_whitelist` | bool | false | Auto-approve registrations |
| moderation | `auto_hide_threshold` | int | 3 | Reports needed for auto-hide |
| moderation | `max_post_length` | int | 4000 | Max characters per post |
| moderation | `new_user_post_rate` | int | 5 | Posts per hour for TL0 |
| trust | `tl1_days_active` | int | 3 | Days active for TL1 |
| trust | `tl1_posts_read` | int | 10 | Posts read for TL1 |
| trust | `tl1_posts_created` | int | 1 | Posts created for TL1 |
| trust | `tl2_days_active` | int | 14 | Days active for TL2 |
| trust | `tl2_posts_read` | int | 50 | Posts read for TL2 |
| trust | `tl2_posts_created` | int | 10 | Posts created for TL2 |
| trust | `tl2_mod_actions_max` | int | 0 | Max mod actions for TL2 |
| trust | `demotion_grace_days` | int | 180 | Days before TL2 demotion |
| trust | `demotion_threshold_pct` | int | 90 | % of threshold for demotion |
| engagement | `enable_reactions` | bool | true | Enable reaction bar |
| engagement | `enable_dms` | bool | true | Enable direct messages |
| engagement | `enable_calendar` | bool | true | Enable calendar events |
| engagement | `enable_badges` | bool | true | Enable badge system |
| engagement | `enable_push_notifications` | bool | false | Enable Web Push |

**Relay Worker Changes:**

1. **New module: `settings.rs`:**
   - `get_setting(env: &Env, key: &str) -> Result<Option<String>>` -- Read from D1 with in-memory cache (HashMap in DO state, refreshed hourly).
   - `get_all_settings(env: &Env) -> Result<HashMap<String, String>>` -- Bulk read.
   - `set_setting(env: &Env, key: &str, value: &str, actor: &str) -> Result<()>` -- Write to D1, log to audit trail, invalidate cache.
2. **Admin endpoints:**
   - `GET /api/settings` -- Returns all settings. NIP-98 admin auth.
   - `POST /api/settings` -- Bulk update settings. Body: `{ "settings": { "key": "value", ... } }`. NIP-98 admin auth.
3. **Integration:** Trust level thresholds, moderation thresholds, and rate limits read from settings instead of hardcoded values. Fallback to defaults if setting absent.

**Forum Client Changes:**

1. **`pages/admin.rs`:** New "Settings" tab. Grouped by category. Each setting rendered as appropriate input (text, number, toggle, dropdown). Save button calls `POST /api/settings`.
2. **App load:** Fetch settings from `GET /api/settings` (or a public subset endpoint), cache in localStorage, provide via Leptos context.

#### 4.2.4 User Management Improvements

**D1 Schema Changes:**

```sql
-- Migration 006: User management fields
ALTER TABLE whitelist ADD COLUMN suspended_until INTEGER;
ALTER TABLE whitelist ADD COLUMN suspended_reason TEXT;
ALTER TABLE whitelist ADD COLUMN silenced INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN admin_notes TEXT;
ALTER TABLE whitelist ADD COLUMN last_seen_at INTEGER;
ALTER TABLE whitelist ADD COLUMN post_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0;
```

**Relay Worker Changes:**

1. **`relay_do.rs` -- EVENT handler:**
   - Before accepting any event, check `suspended_until` for the author. If `current_time < suspended_until`, return `["OK", id, false, "suspended until <date>"]`.
   - If `silenced = 1`, reject all events except kind-4 (DMs) where the `p` tag is an admin pubkey. Return `["OK", id, false, "silenced"]`.

2. **Admin endpoints in `whitelist.rs`:**
   - `POST /api/whitelist/suspend` -- Body: `{ "pubkey": "<hex>", "duration": "1d" | "1w" | "1m" | "permanent", "reason": "..." }`. Sets `suspended_until` (timestamp or `9999999999` for permanent). Logs to audit trail.
   - `POST /api/whitelist/unsuspend` -- Body: `{ "pubkey": "<hex>" }`. Clears `suspended_until`. Logs to audit trail.
   - `POST /api/whitelist/silence` -- Body: `{ "pubkey": "<hex>" }`. Sets `silenced = 1`. Logs to audit trail.
   - `POST /api/whitelist/unsilence` -- Body: `{ "pubkey": "<hex>" }`. Sets `silenced = 0`. Logs to audit trail.
   - `POST /api/whitelist/notes` -- Body: `{ "pubkey": "<hex>", "notes": "..." }`. Updates `admin_notes`. NIP-98 admin auth.

**Forum Client Changes:**

1. **`pages/admin.rs`:** User table enhancements:
   - Columns: pubkey (truncated), display name, trust level, status (active/suspended/silenced), post count, last seen, join date.
   - Row actions: Suspend (duration picker + reason), Silence, Unsuspend, Unsilence, Set Trust Level, View Notes.
   - User detail modal: full activity summary, admin notes (editable textarea), moderation history (from audit log filtered by target).

### 4.3 Phase 3: P2 -- Depth (~8 days)

#### 4.3.1 Content Organisation

**D1 Schema Changes:**

```sql
-- Migration 007: Content organisation
CREATE TABLE pinned_messages (
    channel_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    pinned_by TEXT NOT NULL,
    pinned_at INTEGER NOT NULL,
    PRIMARY KEY (channel_id, event_id)
);

ALTER TABLE channel_zones ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE channel_zones ADD COLUMN archived_at INTEGER;
ALTER TABLE channel_zones ADD COLUMN archived_by TEXT;
```

**Nostr Event Kinds Used:**

- **Kind 1111 (Comment, NIP-22):** Threaded replies. Tags: `E` (root event), `e` (parent event), `K` (root kind), `k` (parent kind). Enables branching conversations without kind-42 channel pollution.

**Relay Worker Changes:**

1. **Pinned messages:** `POST /api/channels/:id/pin` and `/unpin`. NIP-98 admin or TL2+ (for own posts) auth. Relay returns pinned messages first in REQ responses for a channel (ordered by `pinned_at`, then chronological for non-pinned).
2. **Channel archive:** `POST /api/channels/:id/archive`. Sets `archived = 1` in `channel_zones`. EVENT handler rejects kind-42 targeting archived channels with `["OK", id, false, "channel archived"]`.
3. **Threaded replies:** Accept kind-1111 events. Store normally. REQ filters support `#E` and `#e` tag queries for thread retrieval.

**Forum Client Changes:**

1. **`components/pinned_messages.rs`:** Already exists -- wire it to the new API. Show pinned messages at channel top with "Pinned" indicator and unpin button (admin/author).
2. **`components/message_bubble.rs`:** Add "Reply in thread" action. Opens thread view.
3. **New `components/thread_view.rs`:** Displays a root message and its kind-1111 replies in a tree or flat chronological view. Embedded reply composer.
4. **Channel card:** Show "Archived" badge. Disable message input for archived channels.

#### 4.3.2 Notification Improvements

**Implementation:**

1. **Web Push API:**
   - Forum client registers a Service Worker (`community-forum-rs/crates/forum-client/js/sw.js`).
   - On opt-in, generates VAPID subscription and sends to relay-worker via `POST /api/push/subscribe` (store subscription in D1 `push_subscriptions` table).
   - Relay-worker: on events matching a user's tracking preferences (mentions, DMs, watched channels), send push notification via Web Push protocol from the DO.

2. **Per-channel tracking (kind-30078):**
   - User publishes kind-30078 with `d` tag `dreamlab:channel-tracking:<channel_id>` and content `{ "level": "watching" | "tracking" | "normal" | "muted" }`.
   - Client-side: `stores/preferences.rs` already exists -- extend with channel tracking. Relay fetches user's tracking preferences on session init.

3. **Notification consolidation:**
   - Client-side consolidation in `stores/notifications.rs`: before pushing a new notification, check if a consolidation candidate exists (same channel + same kind within 5 minutes). If so, update the existing notification body ("5 new messages in #general") and increment a counter.

**D1 Schema Changes:**

```sql
-- Migration 008: Push subscriptions
CREATE TABLE push_subscriptions (
    pubkey TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (pubkey, endpoint)
);
```

#### 4.3.3 Search Improvements

**Search Worker Changes (`community-forum-rs/crates/search-worker/src/lib.rs`):**

1. **Faceted search:** Extend `/search` endpoint to accept optional filters: `channel`, `author` (pubkey), `from` (timestamp), `to` (timestamp). Apply as post-filters on k-NN results.
2. **Search logs:** New KV namespace `SEARCH_LOGS`. On each search request, append `{ "query": ..., "pubkey": ..., "results_count": ..., "timestamp": ... }` to a daily log key. Admin endpoint `GET /api/search/logs?date=2026-04-03` returns the day's log.

**Forum Client Changes:**

1. **`pages/search.rs`:** Add filter UI above results: channel dropdown, author input, date range picker. Pass filters as query params to search-worker.

#### 4.3.4 Profile Enhancements

**Forum Client Changes:**

1. **`pages/profile.rs`:** Add activity summary section: post count, reactions given/received, channels participated, member since date. Data sourced from relay REQ queries (count kind-42 by author, count kind-7 by author and targeting author).
2. **Privacy controls:** `stores/preferences.rs` -- extend kind-30078 `dreamlab:privacy` event with field-level visibility (`{ "location": "members", "about": "all", "activity": "hidden" }`). Profile page respects these settings.

**Relay Worker Changes:**

1. **Privacy enforcement:** On REQ for kind-0 (profile metadata), if the requesting pubkey is not whitelisted and the profile owner has set fields to "members" or "hidden", strip those fields from the response. This requires a post-processing step in the REQ handler.

#### 4.3.5 Anti-Abuse

**Relay Worker Changes:**

1. **Content screening:** New KV key `CONTENT_BLOCKLIST` containing JSON array of regex patterns. On EVENT handler, check kind-42 content against patterns. Match triggers auto-report (kind-1984 from system pubkey) or rejection based on admin setting `content_screen_action` (flag/reject).
2. **Per-TL rate limiting:** In `relay_do.rs`, maintain a per-session sliding window counter (in DO in-memory state). On EVENT, check the author's TL against rate limits from settings. Reject with `["OK", id, false, "rate limited"]` if exceeded.

### 4.4 Phase 4: P3 -- Polish (~8 days)

#### 4.4.1 Webhooks

**D1 Schema Changes:**

```sql
-- Migration 009: Webhooks
CREATE TABLE webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    events TEXT NOT NULL,
    secret TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_triggered_at INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0
);
```

**Relay Worker Changes:**

1. **New module: `webhooks.rs`:**
   - On relevant events (configurable: `new_post`, `new_user`, `report_filed`, `user_suspended`), query active webhooks matching the event type.
   - For each webhook, POST JSON payload to the URL. Payload is NIP-98-signed by the relay admin keypair for authenticity.
   - Retry logic: on failure (non-2xx), increment `failure_count`. Retry up to 3 times with exponential backoff (1s, 5s, 25s). Deactivate webhook after 10 consecutive failures.

2. **Admin endpoints:**
   - `POST /api/webhooks` -- Create webhook.
   - `GET /api/webhooks` -- List webhooks.
   - `DELETE /api/webhooks/:id` -- Delete webhook.
   - `POST /api/webhooks/:id/test` -- Send test payload.

#### 4.4.2 Theme System

**Forum Client Changes:**

1. **`stores/preferences.rs`:** Add `theme` field to kind-30078 `dreamlab:preferences`. Values: `dark`, `light`, `system`.
2. **`components/theme_provider.rs`** (new): Reads theme preference, applies CSS custom properties. Supports per-zone accent colours if admin configures `zone_theme_<zone>` setting.
3. **CSS variables:** Define colour palette as CSS custom properties in `index.html` or a Trunk-included stylesheet. Theme switching swaps the property values.

#### 4.4.3 Per-Action Rate Limiting

**Relay Worker Changes:**

1. Extend the existing KV-backed rate limiter to support per-action configuration. Settings keys: `rate_limit_post`, `rate_limit_reaction`, `rate_limit_dm`, `rate_limit_report`, `rate_limit_channel_create`. Each is `<count>/<window>` (e.g., `20/3600` for 20 per hour).
2. Per-TL multipliers from settings: `rate_limit_tl0_multiplier` (default 0.25), `rate_limit_tl1_multiplier` (0.5), `rate_limit_tl2_multiplier` (1.0).

#### 4.4.4 API Documentation

1. Add an `api-docs` module to relay-worker that serves an OpenAPI 3.1 JSON spec at `GET /api/docs`. The spec is generated from a static YAML/JSON file embedded in the binary at compile time.
2. Document all HTTP endpoints across relay-worker, auth-worker, pod-worker, search-worker, and preview-worker.

---

## 5. Non-Functional Requirements

### Compatibility

| Requirement | Constraint |
|-------------|-----------|
| Existing tests | All 457 tests must pass after each phase (129 nostr-core + relay + forum) |
| New tests | Each phase adds tests; target 80%+ coverage on new code |
| WASM target | Forum client must compile to `wasm32-unknown-unknown` (`cargo check --target wasm32-unknown-unknown -p forum-client`) |
| NIP compatibility | Maintain existing NIP-01/07/09/29/33/40/42/45/50/52/98 support |
| NIP additions | Add NIP-22 (comments), NIP-56 (reporting), NIP-58 (badges), NIP-78 (app data) |

### Performance

| Requirement | Target |
|-------------|--------|
| Zone enforcement overhead on REQ | <5ms additional latency per subscription |
| Trust level computation (daily alarm) | <10s for 1000 users |
| Badge computation (daily alarm) | <10s for 1000 users |
| Settings cache hit rate | >95% (in-memory DO cache, hourly refresh) |
| Audit log query (50 rows) | <100ms |

### Deployment

| Requirement | Constraint |
|-------------|-----------|
| Zero downtime | D1 migrations must be additive (ALTER TABLE ADD COLUMN, CREATE TABLE). No DROP COLUMN, no table renames. |
| Rollback | Each migration has a corresponding rollback SQL (DROP TABLE, ALTER TABLE DROP COLUMN where supported). |
| Feature flags | Phase 2+ features gated by admin settings (e.g., `enable_badges`). Can be disabled without redeployment. |
| DO hibernation | All new DO state must survive hibernation (use tags, D1, or KV for persistence; never rely on in-memory HashMap alone). |

### Security

| Requirement | Constraint |
|-------------|-----------|
| Admin endpoints | All admin endpoints require NIP-98 auth with admin pubkey verification |
| Trust level changes | Only admin can set TL3. Auto-promotion only for TL0->TL1 and TL1->TL2. |
| Audit trail | Cannot be deleted or modified (INSERT only on `admin_log` table) |
| Report abuse | Rate limit kind-1984 submissions (max 10 reports per user per day) |
| Webhook secrets | Stored encrypted in D1 (or use HMAC-SHA256 signature header instead of shared secret) |

---

## 6. Data Model Changes

### Complete D1 Migration Summary

| Migration | Phase | Tables Affected | Type |
|-----------|-------|----------------|------|
| 001 | P0 | `whitelist` | ALTER (add trust_level, activity columns) |
| 002 | P0 | `channel_zones` (new) | CREATE |
| 003 | P0 | `reports` (new) | CREATE |
| 004 | P0 | `admin_log` (new) | CREATE |
| 005 | P1 | `settings` (new) | CREATE |
| 006 | P1 | `whitelist` | ALTER (add suspend, silence, notes columns) |
| 007 | P2 | `pinned_messages` (new), `channel_zones` | CREATE + ALTER |
| 008 | P2 | `push_subscriptions` (new) | CREATE |
| 009 | P3 | `webhooks` (new) | CREATE |

### New Nostr Event Kinds

| Kind | NIP | Phase | Usage |
|------|-----|-------|-------|
| 1984 | NIP-56 | P0 | Content reports (user -> relay) |
| 30009 | NIP-58 | P1 | Badge definitions (admin publishes) |
| 8 | NIP-58 | P1 | Badge awards (admin -> user) |
| 30008 | NIP-58 | P1 | Profile badge list (user curates) |
| 30078 | NIP-78 | P1 | App-specific data (onboarding state, channel tracking, privacy prefs) |
| 1111 | NIP-22 | P2 | Threaded replies / comments |

### Existing Nostr Event Kinds (unchanged)

| Kind | NIP | Usage |
|------|-----|-------|
| 0 | NIP-01 | Profile metadata |
| 1 | NIP-01 | Text notes |
| 4 | NIP-04 | DMs (encrypted) |
| 5 | NIP-09 | Deletion |
| 7 | NIP-25 | Reactions |
| 40 | NIP-29 | Channel creation |
| 41 | NIP-29 | Channel metadata |
| 42 | NIP-29 | Channel message |
| 52 | NIP-52 | Calendar events |

---

## 7. Risk Register

| ID | Risk | Probability | Impact | Mitigation |
|----|------|------------|--------|-----------|
| R1 | Zone enforcement adds latency to every REQ, degrading real-time feel | Medium | High | Cache session zone flags in DO memory. Only query D1 on session init, not per-REQ. Pre-compute channel-zone mapping on DO alarm. |
| R2 | DO hibernation wipes in-memory rate limit counters, allowing bursts after wake | High | Medium | Use `accept_websocket_with_tags()` pattern (already proven for session recovery). Store rate limit state in tags or D1. |
| R3 | Daily alarm for trust/badge computation creates D1 contention at scale | Low | Medium | Batch queries (SELECT WHERE last_active_at > cutoff). Process in chunks of 100. Use DO alarm staggering if multiple DOs exist. |
| R4 | NIP-56 report spam -- malicious users flood reports to auto-hide legitimate content | Medium | High | Rate limit kind-1984 (10/day/user). Auto-hide requires 3+ distinct TL1+ reporters. Admin can undo hide instantly. Reporter trust weight increases with TL. |
| R5 | Settings cache staleness causes inconsistent behaviour between DO instances | Medium | Low | Settings cache has 1-hour TTL. Admin settings page shows "Changes may take up to 1 hour to propagate" notice. Add cache-bust endpoint for immediate refresh. |
| R6 | Badge computation is wrong because D1 activity counters drift from actual events | Low | Medium | Badge computation queries actual events (COUNT kind-42 WHERE pubkey), not cached counters. Counters are convenience for display; badges use source-of-truth queries. |
| R7 | Web Push subscription management complexity (endpoint rotation, unsubscribe) | Medium | Low | Use standard Web Push protocol. Store subscriptions in D1 with TTL. Prune failed endpoints after 3 delivery failures. |
| R8 | Breaking change to whitelist D1 schema causes existing data loss | Low | Critical | All migrations are additive (ADD COLUMN with DEFAULT). No DROP or RENAME. Test migrations against production D1 backup before deploy. |
| R9 | Threaded replies (kind-1111) create UI complexity that confuses users | Medium | Medium | Start with flat thread view (chronological, indented). Do not introduce tree navigation until user feedback confirms need. Feature-flag via `enable_threads` setting. |
| R10 | Content blocklist regex causes ReDoS (catastrophic backtracking) | Low | High | Use `regex` crate with default backtrack limit. Validate admin-provided patterns before storing. Reject patterns that take >10ms to compile. |

---

## 8. Milestones & Dependencies

### Dependency Graph

```
Phase 1 (P0): All items are independent of each other but must all complete before Phase 2.
  [1.1 Trust System] ─────┐
  [1.2 Zone Enforcement] ──┤── All required for Phase 2
  [1.3 Moderation Queue] ──┤
  [1.4 Audit Trail] ───────┘
                            │
Phase 2 (P1):              ▼
  [2.1 Onboarding] ──── depends on: Settings (welcome message)
  [2.2 Badges] ─────── depends on: Trust System (TL-based badges)
  [2.3 Settings] ────── depends on: Audit Trail (setting changes logged)
  [2.4 User Mgmt] ──── depends on: Audit Trail (suspend/silence logged), Trust System
                            │
Phase 3 (P2):              ▼
  [3.1 Content Org] ── depends on: Zone Enforcement (archive enforced relay-side)
  [3.2 Notifications] ─ depends on: Settings (enable_push_notifications)
  [3.3 Search] ─────── independent (search-worker)
  [3.4 Profiles] ────── depends on: Trust System (activity data), Badges
  [3.5 Anti-Abuse] ──── depends on: Trust System (per-TL rates), Settings, Moderation Queue
                            │
Phase 4 (P3):              ▼
  [4.1 Webhooks] ────── depends on: Audit Trail, Settings
  [4.2 Themes] ──────── independent (client-only)
  [4.3 Rate Limits] ─── depends on: Settings, Trust System
  [4.4 API Docs] ────── depends on: all endpoints finalized
```

### Timeline

| Milestone | Deliverables | Duration | Cumulative |
|-----------|-------------|----------|-----------|
| **M1: Trust + Audit** | Trust levels (TL0-TL3), activity tracking, daily alarm, audit trail table + API + admin UI tab | 5 days | Day 5 |
| **M2: Zone + Moderation** | Relay-side REQ/EVENT zone filtering, channel_zones table, NIP-56 report storage, moderation queue admin tab, auto-hide | 7 days | Day 12 |
| **M3: Onboarding + Settings** | 3-step onboarding modal, kind-30078 persistence, settings table + API + admin tab, settings integration into trust/moderation | 4 days | Day 16 |
| **M4: Badges + User Mgmt** | NIP-58 badge definitions + awards + display, suspend/silence enforcement, user detail modal, admin notes | 4 days | Day 20 |
| **M5: Content + Notifications** | Pinned messages, channel archive, kind-1111 threaded replies, Web Push registration + delivery, per-channel tracking, notification consolidation | 5 days | Day 25 |
| **M6: Search + Profiles + Abuse** | Faceted search filters, search logs, profile activity summary, privacy enforcement, content blocklist, per-TL rate limits | 3 days | Day 28 |
| **M7: Webhooks + Themes + Docs** | Webhook CRUD + delivery + retry, theme switcher + CSS variables, per-action rate limits, OpenAPI spec | 4 days | Day 32 |
| **M8: Integration Testing + QA** | End-to-end testing across all phases, regression testing, performance validation, staging deployment | 4 days | Day 36 |

### Files Modified Per Phase

**Phase 1 (P0):**
- `community-forum-rs/crates/relay-worker/src/lib.rs` -- new routes
- `community-forum-rs/crates/relay-worker/src/relay_do.rs` -- zone filtering, activity tracking, suspend/TL checks on EVENT
- `community-forum-rs/crates/relay-worker/src/whitelist.rs` -- new endpoints, TL field in responses
- `community-forum-rs/crates/relay-worker/src/trust.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/audit.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/moderation.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/stores/zone_access.rs` -- add trust_level signal
- `community-forum-rs/crates/forum-client/src/pages/admin.rs` -- Reports tab, Audit Log tab, TL column
- `community-forum-rs/crates/forum-client/src/components/trust_badge.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/report_button.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/hidden_message.rs` -- NEW

**Phase 2 (P1):**
- `community-forum-rs/crates/relay-worker/src/lib.rs` -- settings + badge + user mgmt routes
- `community-forum-rs/crates/relay-worker/src/whitelist.rs` -- suspend/silence/notes endpoints
- `community-forum-rs/crates/relay-worker/src/settings.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/badges.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/relay_do.rs` -- suspend/silence enforcement
- `community-forum-rs/crates/forum-client/src/components/onboarding_modal.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/badge_display.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/message_bubble.rs` -- badge display
- `community-forum-rs/crates/forum-client/src/pages/admin.rs` -- Settings tab, Badges section, user detail
- `community-forum-rs/crates/forum-client/src/pages/profile.rs` -- badges section
- `community-forum-rs/crates/forum-client/src/pages/home.rs` -- onboarding check

**Phase 3 (P2):**
- `community-forum-rs/crates/relay-worker/src/relay_do.rs` -- kind-1111, archive enforcement, privacy filtering
- `community-forum-rs/crates/relay-worker/src/lib.rs` -- pin/archive/push endpoints
- `community-forum-rs/crates/search-worker/src/lib.rs` -- faceted search, search logs
- `community-forum-rs/crates/forum-client/src/components/pinned_messages.rs` -- wire to API
- `community-forum-rs/crates/forum-client/src/components/thread_view.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/components/message_bubble.rs` -- reply-in-thread action
- `community-forum-rs/crates/forum-client/src/stores/notifications.rs` -- consolidation logic
- `community-forum-rs/crates/forum-client/src/stores/preferences.rs` -- channel tracking, privacy
- `community-forum-rs/crates/forum-client/src/pages/search.rs` -- filter UI
- `community-forum-rs/crates/forum-client/src/pages/profile.rs` -- activity summary, privacy

**Phase 4 (P3):**
- `community-forum-rs/crates/relay-worker/src/webhooks.rs` -- NEW
- `community-forum-rs/crates/relay-worker/src/lib.rs` -- webhook + docs routes
- `community-forum-rs/crates/forum-client/src/components/theme_provider.rs` -- NEW
- `community-forum-rs/crates/forum-client/src/stores/preferences.rs` -- theme preference
- `community-forum-rs/crates/forum-client/js/sw.js` -- push notification service worker

---

## Appendix A: Discourse Patterns Adopted

| Pattern | Discourse Implementation | DreamLab Adaptation |
|---------|------------------------|---------------------|
| Trust level hysteresis | TL3 demotion at 90% threshold, 6-month forgiveness | TL2 demotion at 90% threshold after 180-day grace period |
| Notification consolidation | ConsolidationPlanner checks pattern before creating | Client-side grouping by channel + kind within 5-minute window |
| Reviewable scoring | Multi-reporter scoring weighted by TL | Report count threshold (3+) from TL1+ users triggers auto-hide |
| Staff action audit trail | 70+ UserHistory action types | 12+ admin_log action types with before/after values |
| Settings with backfill | bulk_update retroactively applies defaults | Settings have defaults; new settings apply immediately via cache refresh |
| Problem checks | 30+ health checks on admin dashboard | Lightweight: relay connectivity, D1 health, KV availability, moderation backlog size (future enhancement) |

## Appendix B: What Is Not Being Ported

| Discourse Feature | Reason |
|-------------------|--------|
| Email-in (post by email) | Nostr events require signing -- cannot create from email |
| Plugin ecosystem | Community too small; monolithic Rust is appropriate |
| SEO server rendering | Forum is auth-gated; SEO does not apply |
| PostgreSQL full-text search | RuVector cosine k-NN is architecturally superior |
| User merge / anonymize | Nostr pubkeys are cryptographic identities -- cannot merge |
| Discobot tutorial bot | Community too small; 3-step modal is sufficient |
| Email digests | No email infrastructure; Web Push is the notification channel |
