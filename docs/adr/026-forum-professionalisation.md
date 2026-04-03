# ADR-026: Forum Professionalisation Upgrade

## Status: Accepted

## Date: 2026-04-03

## Context

A source-level audit comparing DreamLab's community forum against Discourse identified critical maturity gaps (see `docs/audit-discourse-vs-dreamlab-forum.md`). DreamLab's forum has strong architectural foundations -- passkey-first auth, Nostr protocol portability, Cloudflare edge deployment, Solid pod data sovereignty -- but weak product foundations. Specifically:

- **Trust is binary**: users are whitelisted or not. No graduated privileges, no automatic promotion, no demotion for inactivity. The 3-flag zone model (`home`, `dreamlab`, `minimoonoir`) gates access areas but does not gate actions within them.
- **Moderation is admin-only deletion**: no user-facing report flow, no moderation queue, no priority scoring, no auto-hide on multiple reports. Admin must manually discover problematic content.
- **No audit trail**: admin actions (whitelist changes, deletions, cohort updates) leave no record. Retrofitting audit logs after a community grows is painful.
- **No badge or achievement system**: no gamification, no recognition for contribution, no visual trust indicators.
- **No admin-configurable settings**: all configuration is compile-time or hardcoded. Changing thresholds requires a code deploy.
- **Notifications are shallow**: 7 types, localStorage-only, no push, no per-channel tracking levels, no consolidation.
- **Content organisation is flat**: channels are linear message streams with no pinning, archiving, or threading.

The audit rated the forum at 2.5/5 for admin/moderation maturity and identified trust, moderation, and relay-side enforcement as P0 (critical). This ADR defines the architecture for addressing all P0 and P1 gaps in a single coordinated upgrade.

## Decision

### 1. Trust System Architecture

#### Data Model

Add a `trust_level` column to the existing D1 `whitelist` table:

```sql
ALTER TABLE whitelist ADD COLUMN trust_level INTEGER DEFAULT 0;
```

Four trust levels stored as integers 0-3:

| Level | Name | Thresholds (auto-promotion) | Capabilities Unlocked |
|-------|------|----------------------------|----------------------|
| TL0 | Newcomer | Passkey registration + whitelist entry | Read public channels, post in lobby, view profiles |
| TL1 | Member | 3+ days active, 10+ posts read, 1+ post created | Post in all accessible zones, react, DM, report content |
| TL2 | Regular | 14+ days active, 50+ posts read, 10+ posts created, 0 unresolved mod actions | Create channels (kind-40) in permitted zones, pin own posts, edit own posts beyond 24h |
| TL3 | Trusted | Admin-granted only (not automatic) | Review moderation queue, move topics between channels, close threads, grant TL0-TL2 |

#### Promotion Engine

Auto-promotion runs via the relay-worker Durable Object alarm system. The existing `alarm()` handler in `relay_do/mod.rs` (line 263) currently only handles idle timeout. Extend it with a daily trust recomputation alarm:

- On first WebSocket connection each day, schedule a `trust_recompute` alarm for 03:00 UTC if one is not already scheduled.
- The alarm queries D1 for all TL0 and TL1 users, computes their activity metrics from the `events` table (post count, distinct days with events, distinct events read via kind-7 reactions), and promotes eligible users.
- Demotion applies **hysteresis** (Discourse pattern): a TL1 user is demoted to TL0 only when activity drops below 90% of the TL1 threshold. This prevents thrashing at boundary values.
- TL3 is never auto-granted or auto-revoked. Only admin mutation via `/api/whitelist/set-trust-level`.

#### Relay-Side Enforcement

In `relay_do/nip_handlers.rs`, `handle_event()` gains trust-level checks after the existing whitelist gate (line 67):

- **kind-40 (channel creation)**: reject if `trust_level < 2` with `["OK", id, false, "restricted: TL2+ required for channel creation"]`.
- **kind-1984 (reports)**: reject if `trust_level < 1`.
- **kind-5 (deletion of others' events)**: reject if `trust_level < 3` and pubkey is not admin.
- **kind-41 (channel metadata edits)**: reject if `trust_level < 2` or user is not channel creator.

In `handle_req()`, no trust-level filtering is applied to REQ responses -- zone access controls read visibility, trust controls write actions.

#### Client Integration

The existing `ZoneAccess` store in `forum-client/src/stores/zone_access.rs` is extended with a `trust_level: RwSignal<u8>` field, populated from the `/api/check-whitelist` response (which already returns cohort and admin data). The `WhitelistRow` struct in `relay-worker/src/whitelist.rs` gains a `trust_level` field. Client uses trust level for UI gating (hide "Create Channel" button for TL0/TL1, show "Report" button for TL1+).

### 2. Moderation Queue Architecture

#### Report Storage

NIP-56 (kind-1984) events are stored in the existing D1 `events` table like any other event. A new D1 table tracks report lifecycle:

```sql
CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    reported_event_id TEXT NOT NULL,
    reporter_pubkey TEXT NOT NULL,
    reporter_trust_level INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    reason_text TEXT,
    score REAL NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_by TEXT,
    resolved_action TEXT,
    resolved_at INTEGER,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_event ON reports(reported_event_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_pubkey);
```

Status enum: `pending`, `resolved_approve` (content hidden/deleted), `resolved_dismiss` (report rejected).

#### Sensitivity Scoring

When a kind-1984 event arrives in `handle_event()`:

1. Store the Nostr event normally.
2. Insert a row into `reports` with `score` weighted by reporter trust level: TL1 = 1.0, TL2 = 1.5, TL3 = 2.0.
3. Query total score for the reported event: `SELECT SUM(score) FROM reports WHERE reported_event_id = ?1 AND status = 'pending'`.
4. If total score >= 3.0 (configurable via settings, see section 4), auto-hide the reported event by inserting a `hidden` tag marker into a new D1 column or a kind-5 soft-delete event from the relay pubkey.
5. Notify the reported event's author via a kind-1 DM from a system pubkey (optional, TL3+ moderators can opt in).

#### Admin API

New NIP-98 authenticated endpoints in `relay-worker/src/lib.rs`:

- `GET /api/reports?status=pending&limit=50&offset=0` -- paginated report queue.
- `POST /api/reports/resolve` -- body: `{ report_id, action: "approve"|"dismiss", reason }`. On `approve`: delete or hide the reported event (kind-5 deletion), optionally adjust reporter trust. On `dismiss`: mark report dismissed, no action on content.

#### Forum Client

New admin tab "Reports" in `forum-client/src/pages/admin.rs` (currently 599 lines, 5 tabs). The tab shows pending reports with: reported content preview, reporter identity, reason, cumulative score, action buttons (Dismiss, Hide, Delete, Warn Author).

User-facing: "Report" context menu item on all message bubbles (`forum-client/src/components/message_bubble.rs`), gated to TL1+. Opens a modal with NIP-56 reason categories: spam, nudity, profanity, illegal, impersonation, other (free text).

### 3. Badge System Architecture

#### Badge Definitions

Badges are NIP-58 events:

- **kind-30009** (Badge Definition): parameterised replaceable event. Published by the admin pubkey. Tags: `d` (badge identifier), `name`, `description`, `image` (badge icon URL on Solid pod), `thumb`.
- **kind-8** (Badge Award): references the badge definition via an `a` tag and the recipient via a `p` tag.

8-10 initial badges:

| Badge ID | Name | Criteria | Grant Method |
|----------|------|----------|-------------|
| `pioneer` | Pioneer | First 20 registrants | Manual (admin) |
| `first-post` | First Post | 1+ kind-42 event published | Auto (daily alarm) |
| `conversationalist` | Conversationalist | 10+ posts | Auto |
| `contributor` | Contributor | 50+ posts | Auto |
| `helpful` | Helpful | 5+ posts with 3+ kind-7 reactions each | Auto |
| `explorer` | Explorer | Posted in 5+ distinct channels | Auto |
| `trusted` | Trusted | Reached TL3 | Auto (on TL3 grant) |
| `founding-member` | Founding Member | Pre-launch registration | Manual |
| `moderator` | Moderator | Actively resolved 10+ reports | Auto |
| `welcome` | Welcome | Completed onboarding flow | Auto |

#### Computation

Badge eligibility runs on the same daily DO alarm as trust recomputation (section 1). The alarm handler:

1. Queries D1 for all whitelisted pubkeys.
2. For each auto-grant badge, runs a D1 query against the `events` table to check criteria.
3. For newly earned badges, publishes kind-8 award events signed by the admin pubkey (requires the admin privkey to be available as an environment secret `ADMIN_SIGNING_KEY` in the relay-worker wrangler.toml).
4. Skips users who already have the badge (check existing kind-8 events for the `a` + `p` tag combination).

#### Client Display

- `forum-client/src/components/badge.rs` (existing file, currently a shell) renders badge icons.
- Profile page (`forum-client/src/pages/profile.rs`) shows earned badges.
- Message author card in chat shows the user's highest-tier badge as a small icon next to their name.
- Badge definitions are fetched once on app load and cached in the `preferences` store.

### 4. Settings Architecture

#### Storage

New D1 table:

```sql
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string',
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
);
```

Type enum: `string`, `integer`, `boolean`, `json`. Client parses value according to type.

#### Initial Settings (20-30)

| Category | Key | Type | Default | Description |
|----------|-----|------|---------|-------------|
| general | `community_name` | string | "DreamLab" | Community display name |
| general | `community_description` | string | "AI Training Community" | Tagline |
| general | `welcome_message` | string | "Welcome to the community!" | Shown in onboarding |
| general | `logo_url` | string | "" | Community logo |
| access | `registration_mode` | string | "open" | open / invite / closed |
| access | `default_cohort` | string | "dreamlab" | Default zone for new members |
| access | `auto_whitelist` | boolean | true | Auto-whitelist on kind-0 publish |
| moderation | `auto_hide_score` | integer | 3 | Report score threshold for auto-hide |
| moderation | `max_post_length` | integer | 65536 | Maximum event content size |
| moderation | `new_user_rate_limit` | integer | 5 | Posts per hour for TL0 |
| trust | `tl1_days_active` | integer | 3 | Days active for TL1 promotion |
| trust | `tl1_posts_read` | integer | 10 | Posts read for TL1 |
| trust | `tl1_posts_created` | integer | 1 | Posts created for TL1 |
| trust | `tl2_days_active` | integer | 14 | Days active for TL2 |
| trust | `tl2_posts_read` | integer | 50 | Posts read for TL2 |
| trust | `tl2_posts_created` | integer | 10 | Posts created for TL2 |
| trust | `demotion_hysteresis` | integer | 90 | Demotion threshold as % of promotion threshold |
| engagement | `enable_reactions` | boolean | true | Enable kind-7 reactions |
| engagement | `enable_dms` | boolean | true | Enable direct messages |
| engagement | `enable_calendar` | boolean | true | Enable NIP-52 calendar |
| engagement | `enable_badges` | boolean | true | Enable badge system |
| notifications | `push_enabled` | boolean | false | Enable Web Push notifications |
| notifications | `digest_enabled` | boolean | false | Enable notification digest |
| anti_abuse | `tl0_rate_limit` | integer | 5 | Posts/hour for TL0 |
| anti_abuse | `tl1_rate_limit` | integer | 20 | Posts/hour for TL1 |
| anti_abuse | `tl2_rate_limit` | integer | 60 | Posts/hour for TL2+ |
| anti_abuse | `blocklist_patterns` | json | "[]" | Content screening patterns |

#### API

NIP-98 authenticated endpoints:

- `GET /api/settings` -- returns all settings as a JSON object. Public (no admin required) for read, so the client can fetch on load.
- `POST /api/settings` -- body: `{ key, value }`. Admin-only. Validates type constraint, writes to D1, logs to `admin_log`.
- `POST /api/settings/bulk` -- body: `{ settings: [{ key, value }] }`. Admin-only. Atomic batch update.

#### Client Caching

Forum client fetches settings on app load and stores in `localStorage` with a 5-minute TTL key (`dreamlab:settings:ts`). The `preferences` store in `forum-client/src/stores/preferences.rs` exposes settings as reactive signals. The existing settings page (`forum-client/src/pages/settings.rs`, 5 tabs) gains an "Admin" section for admin users showing all configurable settings grouped by category.

#### Backfill Pattern

When a setting default changes (e.g., increasing `tl1_posts_read` from 10 to 15), the relay-worker trust recomputation alarm automatically applies the new threshold on its next run. No explicit backfill needed for trust thresholds. For settings that affect per-user state (future: notification preferences), the `POST /api/settings/bulk` endpoint can include a `backfill: true` flag to retroactively apply to users who have not customised the value.

### 5. Audit Trail Architecture

#### Storage

New D1 table in the relay-worker database:

```sql
CREATE TABLE admin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_pubkey TEXT NOT NULL,
    action TEXT NOT NULL,
    target_pubkey TEXT,
    target_id TEXT,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_admin_log_action ON admin_log(action);
CREATE INDEX idx_admin_log_actor ON admin_log(actor_pubkey);
CREATE INDEX idx_admin_log_created ON admin_log(created_at);
```

#### Action Types (12+)

`whitelist_add`, `whitelist_remove`, `cohort_update`, `admin_grant`, `admin_revoke`, `trust_level_change`, `trust_level_auto_promote`, `trust_level_auto_demote`, `user_suspend`, `user_silence`, `channel_create`, `channel_archive`, `event_delete`, `report_resolve`, `report_dismiss`, `setting_update`.

#### Write Points

Every admin-mutating handler in `relay-worker/src/whitelist.rs` and the new report/settings endpoints writes to `admin_log` as the final step of the transaction. The trust recomputation alarm also logs auto-promotions and auto-demotions with `actor_pubkey = "system"`.

The `ip_address` field is populated from the `CF-Connecting-IP` header available on all Worker requests. For DO-internal actions (alarm-triggered promotions), `ip_address` is null.

#### Admin UI

New "Audit Log" tab in `forum-client/src/pages/admin.rs`. Displays a paginated, filterable table with columns: timestamp, actor (with profile link), action (colour-coded badge), target, previous/new values, reason.

API: `GET /api/admin-log?action=&actor=&target=&from=&to=&limit=50&offset=0`. Admin-only, NIP-98 authenticated.

### 6. Notification Enhancement Architecture

#### Web Push

- Service worker in `forum-client/` registers for Push API via `navigator.serviceWorker.register()`.
- Push subscription (endpoint + keys) stored as a kind-30078 (application-specific data) event with `d` tag `push-subscription`.
- Relay-worker, on events that trigger notifications (mentions via `p` tag, DM kind-4, report resolution), sends a push message via the Web Push protocol to the subscription endpoint. This requires a VAPID key pair stored as Worker secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
- Initial implementation: push for mentions and DMs only. Expand to report notifications and badge awards in Phase 3.

#### Per-Channel Tracking Levels

Users set tracking level per channel: **watching** (notify on every new post), **tracking** (notify on replies to own posts), **normal** (notify on direct mentions only), **muted** (no notifications).

Stored as kind-30078 events with `d` tag `channel-tracking:{channel_id}` and content `watching|tracking|normal|muted`. Client reads these on load and caches in `forum-client/src/stores/notifications.rs`.

Relay-worker references tracking level when deciding whether to trigger a push notification for a new event in a channel.

#### Consolidation

Client-side consolidation in `NotificationStoreV2` (`forum-client/src/stores/notifications.rs`): before inserting a new notification, check if an existing unread notification matches on `(kind, link)`. If so, increment a `count` field and update the body to "N new messages in #channel" rather than creating separate entries. This matches the Discourse `ConsolidationPlanner` pattern.

### 7. Content Organisation Architecture

#### Pinned Messages

Channel metadata (kind-41) gains a `pinned` tag array listing event IDs of pinned messages. Pinning is a kind-41 replacement event published by the channel creator or a TL3+ user:

```json
{
  "kind": 41,
  "tags": [
    ["e", "<channel_creation_event_id>"],
    ["pinned", "<event_id_1>"],
    ["pinned", "<event_id_2>"]
  ],
  "content": "{\"name\":\"general\",\"about\":\"...\"}"
}
```

Client renders pinned messages at the top of the channel view in `forum-client/src/pages/channel.rs`.

#### Channel Archive

An `archived` field in the kind-41 channel metadata JSON content marks a channel as read-only:

```json
{ "name": "old-channel", "about": "...", "archived": true }
```

Relay-worker enforces: when a kind-42 (channel message) event references an archived channel (via `e` tag to the kind-40 event), reject with `["OK", id, false, "restricted: channel is archived"]`. The relay reads the latest kind-41 for the channel to check the `archived` flag.

Admin and TL3+ users can archive/unarchive by publishing a new kind-41 replacement event.

#### Threaded Replies

Adopt NIP-22 comment model using kind-1111 (comment) events:

- A reply to a kind-42 channel message creates a kind-1111 event with tags:
  - `K` (root kind): `42`
  - `E` (root event): the original kind-42 event ID
  - `e` (reply-to): the specific event being replied to
  - `p` (mention): the author of the parent event
- Client renders threads as indented replies below the parent message in `forum-client/src/pages/chat.rs`.
- Relay stores and broadcasts kind-1111 events normally. No special relay-side handling needed beyond allowing the kind.
- Thread depth is limited client-side to 3 levels to prevent deeply nested conversations.

### 8. User Management Enhancements

#### Suspend and Silence

Two new columns on the `whitelist` table:

```sql
ALTER TABLE whitelist ADD COLUMN suspended_until INTEGER;
ALTER TABLE whitelist ADD COLUMN silenced INTEGER DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN admin_notes TEXT;
```

- **Suspended**: `suspended_until` is a Unix timestamp. Relay-worker checks in `handle_event()` after whitelist validation: if `suspended_until > now`, reject with `["OK", id, false, "blocked: account suspended"]`. Also reject on REQ to prevent reading (full suspension).
- **Silenced**: `silenced = 1` allows REQ (reading) but rejects EVENT (writing, except kind-4 DMs to admin pubkeys). Shows a "silenced" indicator in the client user profile.
- **Admin notes**: free-text field visible only in the admin user table. Not exposed to the noted user.

Admin API:

- `POST /api/whitelist/suspend` -- body: `{ pubkey, duration: "1d"|"7d"|"30d"|"permanent", reason }`. Sets `suspended_until`. Logs to `admin_log`.
- `POST /api/whitelist/silence` -- body: `{ pubkey, silenced: true|false, reason }`. Logs to `admin_log`.

### 9. Onboarding Flow

A lightweight 3-step modal shown on first login (not a bot):

1. **Welcome** -- community guidelines summary, rendered from the `welcome_message` setting.
2. **Profile** -- prompt to set display name and avatar (kind-0 metadata publish).
3. **Explore** -- direct links to main channels with descriptions.

Completion stored as a kind-30078 event with `d` tag `onboarded` and content `true`. Client checks for this event on auth and skips the modal if present. Also stored in `localStorage` as a fast path.

First post in the public lobby triggers the `welcome` badge (section 3) and a system notification.

Implementation is entirely in `forum-client` -- no relay changes needed.

## Consequences

### Positive

- **Server-side authority**: trust levels and zone access enforced at the relay, not just the client. Eliminates the decorative-only permission model identified in the audit.
- **Self-sustaining moderation**: the report-queue-action workflow distributes moderation work to TL3 trusted users, reducing admin burden as the community grows.
- **Progressive engagement**: newcomer -> member -> regular -> trusted is a visible growth path. Badges provide dopamine feedback loops. Onboarding reduces first-session confusion.
- **Auditability**: every admin action is logged with actor, target, values, and timestamp. Supports accountability and dispute resolution.
- **Configurability**: admin-tunable settings eliminate the need for code deploys to adjust thresholds, rate limits, or feature flags.
- **Nostr-native**: trust levels are stored in D1 (relay-private) but badges use NIP-58, reports use NIP-56, and tracking levels use kind-30078 -- all standard Nostr event kinds. If the community ever federates, badges and reports are portable.
- **Incremental deployment**: each subsystem (trust, reports, badges, settings, audit, notifications, content org) can be deployed independently. No big-bang migration required.

### Negative

- **Alarm complexity**: the daily DO alarm now handles trust recomputation, badge granting, and potentially notification digests. If the whitelist grows to thousands of users, the alarm may exceed the 30-second Durable Object alarm execution limit. Mitigation: batch queries, process in pages of 100, and schedule continuation alarms if time runs short.
- **Admin signing key**: badge awards (kind-8) require a Nostr private key to sign events. This key must be stored as a Worker secret (`ADMIN_SIGNING_KEY`). If compromised, an attacker could forge badge awards. Mitigation: use a dedicated badge-signing key (not the admin user's personal key), rotate on suspicion.
- **D1 schema growth**: 3 new tables (`reports`, `settings`, `admin_log`) and 3 new columns on `whitelist` (`trust_level`, `suspended_until`, `silenced`, `admin_notes`). D1 has a 10GB storage limit per database. At community scale (< 10K users), this is not a concern.
- **Settings cache staleness**: 5-minute localStorage TTL means setting changes take up to 5 minutes to propagate to all clients. Mitigation: admin can broadcast a kind-30078 `settings-updated` event that clients listen for to trigger an immediate refetch.
- **NIP-56 privacy**: reports are Nostr events visible to the relay. Reporters are not anonymous to admins. This is intentional (prevents abuse of the report system) but may chill reporting in small communities where social dynamics are sensitive.

### Migration

All D1 schema changes are additive (new tables, new columns with defaults). The relay-worker `ensure_schema()` function in `lib.rs` (line 276) already handles idempotent migrations via `ALTER TABLE ... ADD COLUMN` wrapped in error-swallowing try blocks. Extend this pattern:

```rust
// Existing: is_admin column
let _ = db.prepare("ALTER TABLE whitelist ADD COLUMN is_admin INTEGER DEFAULT 0").run().await;

// New columns
let _ = db.prepare("ALTER TABLE whitelist ADD COLUMN trust_level INTEGER DEFAULT 0").run().await;
let _ = db.prepare("ALTER TABLE whitelist ADD COLUMN suspended_until INTEGER").run().await;
let _ = db.prepare("ALTER TABLE whitelist ADD COLUMN silenced INTEGER DEFAULT 0").run().await;
let _ = db.prepare("ALTER TABLE whitelist ADD COLUMN admin_notes TEXT").run().await;

// New tables (CREATE TABLE IF NOT EXISTS is idempotent)
let _ = db.prepare("CREATE TABLE IF NOT EXISTS reports (...)").run().await;
let _ = db.prepare("CREATE TABLE IF NOT EXISTS settings (...)").run().await;
let _ = db.prepare("CREATE TABLE IF NOT EXISTS admin_log (...)").run().await;
```

Existing users get `trust_level = 0` (Newcomer). The first trust recomputation alarm will promote eligible users based on their existing post history. No manual data migration needed.

The `/api/check-whitelist` response is extended with `trust_level`, `suspended_until`, and `silenced` fields. The forum client must be deployed simultaneously or the new fields are silently ignored (JavaScript/WASM deserialization is lenient with extra fields).

### Backwards Compatibility

- Existing Nostr events are unaffected. No event kinds are removed or reinterpreted.
- The whitelist table gains columns but existing queries continue to work (new columns have defaults).
- Clients that do not understand trust levels still function -- they just cannot see trust-gated UI elements.
- NIP-58 badge events and NIP-56 report events are standard Nostr kinds that older clients can safely ignore.

## Alternatives Considered

### 1. Store trust levels as Nostr events (kind-30078) instead of D1

**Rejected.** Trust levels must be enforced server-side by the relay. If trust is stored as a Nostr event, the relay must query its own event store to check permissions on every EVENT -- adding latency to the hot path. A D1 column on the whitelist table is a single indexed lookup that already happens for whitelist validation. Additionally, trust levels are relay-private policy, not user-portable data, so Nostr event storage (which implies portability) is semantically wrong.

### 2. Implement a full RBAC permission system (Discourse Guardian pattern)

**Rejected.** Discourse's Guardian class (682 lines, 16 mixins) is appropriate for a 200K LOC monolith with 13 years of feature accretion. DreamLab's forum has ~57K LOC and 4 trust levels. A trust-level integer with per-kind checks in `handle_event()` is sufficient and far simpler. If the permission model grows beyond what trust levels can express, RBAC can be introduced later without breaking the trust system.

### 3. Use Cloudflare KV instead of D1 for settings

**Rejected.** KV is eventually consistent with no transactional guarantees. Settings need immediate consistency (admin changes a rate limit, it must apply on the next request). D1 provides strong consistency within a single location, which is appropriate for a single-relay deployment. KV remains appropriate for caching (sessions, rate limits) where eventual consistency is acceptable.

### 4. Build a separate moderation microservice (new Worker)

**Rejected.** The relay-worker Durable Object already processes every event and has access to D1. Adding a separate moderation worker would require inter-worker communication (either via fetch or a queue), adding latency and complexity. Moderation logic belongs in the relay because it must make synchronous accept/reject decisions during `handle_event()`. The report query endpoints are simple D1 reads that fit naturally in the existing HTTP router in `lib.rs`.

### 5. Use WebSocket push for notifications instead of Web Push API

**Rejected for primary notification channel.** WebSocket notifications only work when the client is connected. Web Push works when the browser is closed. However, WebSocket-based in-app notifications remain the primary real-time channel (the existing `NotificationStoreV2` handles this). Web Push is additive -- it catches users who are not currently on the site.

### 6. Thread-first architecture (replace channels with threaded topics)

**Rejected.** Channels (kind-40/42) are the established Nostr pattern for group chat. Replacing them with a thread-first model would break compatibility with other Nostr clients and require rewriting the entire chat system. Adding NIP-22 comment threads (kind-1111) as an opt-in layer on top of channels gives threading benefits without breaking the existing model.
