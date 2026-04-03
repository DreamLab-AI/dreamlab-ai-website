# DDD: Forum Professionalisation Upgrade -- Bounded Contexts

**Date:** 2026-04-03
**Source:** `docs/audit-discourse-vs-dreamlab-forum.md`
**Scope:** Trust, moderation, badges, settings, audit trail, user management
**System:** Nostr relay on Cloudflare Workers (Rust) + Leptos WASM client

---

## Domain Map

```
+-----------------------------------------------------------------------+
|                DreamLab Forum -- Professionalisation Contexts          |
|                                                                       |
|  +------------------+   events    +------------------+                |
|  | Trust &          |------------>| Identity &       |                |
|  | Reputation       |   TL check  | Access           |                |
|  | [NEW]            |<------------| [EXTENDED]       |                |
|  +------------------+             +------------------+                |
|         |                                |                            |
|         | TL gates mod actions           | suspend/silence flags      |
|         v                                v                            |
|  +------------------+   reports   +------------------+                |
|  | Moderation       |------------>| Administration   |                |
|  | [NEW]            |   audit log | [EXTENDED]       |                |
|  +------------------+             +------------------+                |
|         |                                |                            |
|         | hide/delete                    | settings, health checks    |
|         v                                v                            |
|  +------------------+   badge     +------------------+                |
|  | Content          |   awards    | Engagement       |                |
|  | [EXTENDED]       |<------------| [NEW]            |                |
|  +------------------+             +------------------+                |
|                                                                       |
+-----------------------------------------------------------------------+
```

### Context Classification

| Context | Type | Status | Priority |
|---------|------|--------|----------|
| **Trust & Reputation** | Core | New | P0 |
| **Moderation** | Core | New | P0 |
| **Identity & Access** | Core | Existing, extended | P0 |
| **Engagement** | Supporting | New | P1 |
| **Content** | Core | Existing, extended | P2 |
| **Administration** | Supporting | Existing, extended | P1 |

---

## 1. Trust & Reputation Context

### Purpose

Replaces the binary whitelisted/not-whitelisted model with graduated trust levels that gate capabilities. Trust levels are computed from measurable activity stored in D1, checked at the relay on every EVENT submission and REQ subscription.

### Aggregates

#### TrustLevel (Value Object)

```
TL0 = Newcomer   -- passkey registration + whitelist entry
TL1 = Member     -- 3+ days active, 10+ posts read, 1+ post created
TL2 = Regular    -- 14+ days active, 50+ posts read, 10+ posts, 0 active mod actions
TL3 = Trusted    -- admin-granted only (moderator capabilities)
```

Invariant: trust level can only change by +/-1 per evaluation cycle. No jumps from TL0 to TL2.

#### UserStats (Entity)

Tracks per-user activity metrics used for trust level computation.

| Field | Type | Source |
|-------|------|--------|
| pubkey | TEXT PK | whitelist.pubkey |
| days_active | INTEGER | distinct days with at least one kind-42 event |
| posts_read | INTEGER | count of kind-42 events in subscriptions (approximated by REQ filter matches) |
| posts_created | INTEGER | count of kind-42 events authored |
| reactions_received | INTEGER | count of kind-7 events targeting user's posts |
| active_mod_actions | INTEGER | count of unresolved reports against user |
| last_seen | INTEGER | unix timestamp of most recent event |
| first_seen | INTEGER | unix timestamp of first event |

#### PromotionRule (Value Object)

Admin-configurable thresholds stored in the `settings` table.

| Setting Key | Default | Description |
|-------------|---------|-------------|
| `trust.tl1.days_active` | 3 | Min days active for TL1 |
| `trust.tl1.posts_read` | 10 | Min posts read for TL1 |
| `trust.tl1.posts_created` | 1 | Min posts created for TL1 |
| `trust.tl2.days_active` | 14 | Min days active for TL2 |
| `trust.tl2.posts_read` | 50 | Min posts read for TL2 |
| `trust.tl2.posts_created` | 10 | Min posts created for TL2 |
| `trust.demotion_hysteresis` | 0.9 | Demotion only when stats drop below 90% of threshold |
| `trust.evaluation_interval_hours` | 24 | How often the DO alarm recomputes trust levels |

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `TrustLevelChanged` | Daily alarm evaluation or admin override | pubkey, old_level, new_level, reason |
| `StatsUpdated` | After each EVENT processed by relay | pubkey, field, old_value, new_value |
| `TrustLevelOverridden` | Admin manually sets TL | pubkey, new_level, admin_pubkey, reason |

### Invariants

1. Trust level changes by at most 1 per evaluation cycle (no jumps).
2. Demotion applies hysteresis: stats must fall below `threshold * demotion_hysteresis` (default 90%).
3. TL3 is admin-granted only and cannot be reached through automatic promotion.
4. A user with active_mod_actions > 0 cannot be promoted to TL2.
5. Trust level is stored on the whitelist row. The relay reads it on every permission check. The client receives it in the `/api/check-whitelist` response.

### D1 Schema

```sql
-- New table: user activity stats
CREATE TABLE user_stats (
  pubkey TEXT PRIMARY KEY,
  days_active INTEGER NOT NULL DEFAULT 0,
  posts_read INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  reactions_received INTEGER NOT NULL DEFAULT 0,
  active_mod_actions INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL DEFAULT 0
);

-- Extend whitelist table
ALTER TABLE whitelist ADD COLUMN trust_level INTEGER NOT NULL DEFAULT 0;
```

### Nostr Event Kind Mapping

| Kind | Role in Trust Context |
|------|----------------------|
| 42 (channel message) | Increments posts_created for author, posts_read for subscribers |
| 7 (reaction) | Increments reactions_received for target post author |
| 1984 (report, NIP-56) | Increments active_mod_actions for reported user |

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| Trust level storage | `relay-worker/src/whitelist.rs` | Add `trust_level` to WhitelistRow, return in `/api/check-whitelist` response |
| Stats accumulation | `relay-worker/src/relay_do/storage.rs` | After `save_event()`, update `user_stats` row |
| Promotion alarm | `relay-worker/src/relay_do/mod.rs` | Add DO alarm handler for daily trust evaluation |
| TL-gated kinds | `relay-worker/src/relay_do/nip_handlers.rs` | In `handle_event()`, check TL before allowing kind-40 creation (TL2+) |
| Client display | `forum-client/src/stores/zone_access.rs` | Add `trust_level: RwSignal<u8>` to `ZoneAccess`, parse from `/api/check-whitelist` |
| Trust badge | `forum-client/src/components/badge.rs` | Render TL badge next to username |

---

## 2. Moderation Context

### Purpose

Provides a report-review-action workflow so content problems are surfaced, queued, and resolved with audit trails. Replaces the current admin-deletes-directly model.

### Aggregates

#### Report (Aggregate Root)

A report ties a reporter to a reported event, with a reason and resolution state.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| reporter_pubkey | TEXT NOT NULL | Who filed the report |
| reporter_trust_level | INTEGER | TL of reporter at time of report (for scoring) |
| reported_event_id | TEXT NOT NULL | Nostr event ID being reported |
| reported_pubkey | TEXT NOT NULL | Author of the reported event |
| reason | TEXT NOT NULL | `nudity`, `profanity`, `illegal`, `spam`, `impersonation`, `other` |
| description | TEXT | Free-text explanation |
| status | TEXT NOT NULL DEFAULT 'pending' | `pending`, `resolved_agree`, `resolved_disagree`, `deferred` |
| resolved_by | TEXT | Admin pubkey who resolved |
| resolved_at | INTEGER | Unix timestamp |
| created_at | INTEGER NOT NULL | Unix timestamp |

Invariant: a report must reference an existing event in D1. Enforced by foreign key or application-level check.

#### ReviewQueue (Read Model)

Not a separate table. A query projection over the `reports` table:

```sql
SELECT r.*, e.content, e.kind, e.created_at as event_created_at
FROM reports r
JOIN events e ON e.id = r.reported_event_id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;
```

Grouped by reported_event_id to consolidate multiple reports against the same event.

#### ModAction (Value Object)

The action taken when resolving a report. Logged to admin_log (see Administration Context).

| Action | Effect |
|--------|--------|
| `agree_hide` | Add event to `hidden_events` table. Client omits hidden events from display. Relay still stores the event but marks it hidden in query results. |
| `agree_delete` | Issue kind-5 deletion (admin pubkey). Removes event from D1. |
| `agree_suspend` | Set `suspended_until` on whitelist row (see Identity & Access). |
| `agree_silence` | Set `silenced = 1` on whitelist row. |
| `disagree` | Dismiss report. No action on content or user. |
| `defer` | Keep in queue for later review. |

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `ReportCreated` | User publishes kind-1984 event | reporter, event_id, reason |
| `ReportResolved` | Admin resolves from queue | report_id, action, admin_pubkey |
| `ContentHidden` | `agree_hide` action | event_id, admin_pubkey |
| `UserSuspended` | `agree_suspend` action | target_pubkey, duration, admin_pubkey |
| `AutoHideTriggered` | 3+ TL1+ reporters on same event | event_id, report_count |

### Invariants

1. A user cannot report the same event twice (unique constraint on reporter_pubkey + reported_event_id).
2. Auto-hide triggers when 3 or more distinct TL1+ reporters flag the same event. The event is hidden pending admin review.
3. Only TL3+ users (or admins) can resolve reports.
4. Resolved reports are immutable. The resolution cannot be changed, only a new report can be filed.
5. Reporter trust level is captured at report creation time (snapshot, not live reference).

### D1 Schema

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_pubkey TEXT NOT NULL,
  reporter_trust_level INTEGER NOT NULL DEFAULT 0,
  reported_event_id TEXT NOT NULL,
  reported_pubkey TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(reporter_pubkey, reported_event_id)
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_event ON reports(reported_event_id);
CREATE INDEX idx_reports_reported_pubkey ON reports(reported_pubkey);

CREATE TABLE hidden_events (
  event_id TEXT PRIMARY KEY,
  hidden_by TEXT NOT NULL,
  hidden_at INTEGER NOT NULL,
  reason TEXT
);
```

### Nostr Event Kind Mapping

| Kind | Role in Moderation Context |
|------|---------------------------|
| 1984 (NIP-56 report) | Client creates this event. Relay intercepts, stores in `reports` table, and also stores as a normal event for protocol compatibility. |
| 5 (NIP-09 deletion) | Admin-issued deletion when resolving a report with `agree_delete`. |

### NIP-56 Event Structure

```json
{
  "kind": 1984,
  "tags": [
    ["e", "<reported_event_id>", "<relay_url>"],
    ["p", "<reported_pubkey>"],
    ["l", "spam", "nip56"]
  ],
  "content": "Optional free-text description of the report"
}
```

Label tag `l` values: `nudity`, `profanity`, `illegal`, `spam`, `impersonation`.

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| NIP-56 handler | `relay-worker/src/relay_do/nip_handlers.rs` | In `handle_event()`, intercept kind-1984. Validate referenced event exists. Insert into `reports` table. Check auto-hide threshold. |
| Reports API | `relay-worker/src/whitelist.rs` (or new `moderation.rs`) | `GET /api/reports?status=pending`, `POST /api/reports/:id/resolve` (NIP-98 admin) |
| Hidden event filter | `relay-worker/src/relay_do/filter.rs` | In `query_events()`, LEFT JOIN `hidden_events` and exclude hidden events from results (unless requester is admin) |
| Report button | `forum-client/src/components/message_bubble.rs` | Add "Report" option to message context menu |
| Report modal | `forum-client/src/components/report_modal.rs` | New component: reason picker + optional description, publishes kind-1984 |
| Admin reports tab | `forum-client/src/admin/reports.rs` | New admin tab: pending reports list, reported content preview, action buttons |
| Admin mod.rs | `forum-client/src/admin/mod.rs` | Add `Reports` variant to `AdminTab` enum, add `pub mod reports;` |

---

## 3. Identity & Access Context (Extended)

### Purpose

Extends the existing auth/whitelist model with suspend and silence states, user notes, and trust-level-aware zone enforcement on the relay side.

### Aggregates

#### AuthSession (Aggregate Root -- existing)

No changes. Passkey PRF, local key, and NIP-07 auth paths remain as-is.

Key files:
- `forum-client/src/auth/passkey.rs` -- WebAuthn PRF ceremony
- `forum-client/src/auth/session.rs` -- session state management
- `forum-client/src/auth/nip98.rs` -- NIP-98 token creation

#### ZoneAccess (Entity -- extended)

Currently holds 3 boolean flags (home, dreamlab, minimoonoir) plus is_admin. Extended with:

| New Field | Type | Description |
|-----------|------|-------------|
| trust_level | u8 | 0-3, from whitelist row |
| is_suspended | bool | true if suspended_until > now |
| suspended_until | Option<u64> | unix timestamp, None if not suspended |
| is_silenced | bool | true if silenced flag set |

#### WhitelistEntry (Entity -- extended)

D1 `whitelist` table extensions:

```sql
ALTER TABLE whitelist ADD COLUMN trust_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN suspended_until INTEGER;
ALTER TABLE whitelist ADD COLUMN silenced INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN admin_notes TEXT;
```

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `UserRegistered` | Kind-0 + auto-whitelist | pubkey, cohorts |
| `UserSuspended` | Admin action | pubkey, until, reason, admin_pubkey |
| `UserUnsuspended` | Expiry or admin action | pubkey, admin_pubkey |
| `UserSilenced` | Admin action | pubkey, reason, admin_pubkey |
| `UserUnsilenced` | Admin action | pubkey, admin_pubkey |
| `ZoneGranted` | Cohort update | pubkey, zone, admin_pubkey |
| `AdminGranted` | set-admin endpoint | pubkey, admin_pubkey |

### Invariants

1. A suspended user's events are rejected by the relay with `["OK", id, false, "suspended"]`.
2. A silenced user can read (REQ) but not write (EVENT) except kind-4 DMs to admins.
3. Suspension has an expiry. The relay checks `suspended_until > now` on every EVENT.
4. The last admin cannot be suspended or demoted (existing invariant in `handle_set_admin`).
5. Zone enforcement is server-side: REQ results filtered by the session's pubkey zone access. This is the most critical architectural change.

### Relay-Side Zone Enforcement (New)

Currently, the relay broadcasts all events to all subscribers. The `zone_access.rs` comment acknowledges this: "Zone enforcement is client-side (UX optimization); the relay is the source of truth per ADR-022."

Required changes to `relay-worker/src/relay_do/nip_handlers.rs`:

**On EVENT (write):**
1. Look up the target channel's zone tag from the kind-40 event in D1.
2. Look up the author's zone access from the whitelist.
3. If the channel's zone is not in the author's access set, reject with `["OK", id, false, "zone access denied"]`.

**On REQ (read):**
1. Look up the session's authed_pubkey from `session.authed_pubkey`.
2. Look up that pubkey's zone access from the whitelist.
3. When querying D1, JOIN with channel zone data and filter results to only include events the user has zone access for.

### `/api/check-whitelist` Response (Extended)

```json
{
  "isWhitelisted": true,
  "isAdmin": false,
  "cohorts": ["home", "dreamlab"],
  "access": {
    "home": true,
    "dreamlab": true,
    "minimoonoir": false
  },
  "trustLevel": 1,
  "isSuspended": false,
  "suspendedUntil": null,
  "isSilenced": false,
  "verifiedAt": 1743638400,
  "source": "relay"
}
```

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| Whitelist row | `relay-worker/src/whitelist.rs` | Add trust_level, suspended_until, silenced, admin_notes to WhitelistRow. Return in check-whitelist response. |
| Suspend check | `relay-worker/src/relay_do/nip_handlers.rs` | In `handle_event()`, after whitelist check: query `suspended_until` and `silenced`. Reject if suspended. Reject writes if silenced (except DMs to admin). |
| Zone enforcement | `relay-worker/src/relay_do/nip_handlers.rs` + `filter.rs` | Channel-zone lookup in `handle_event()` for writes. Zone-filtered query in `query_events()` for reads. |
| Suspend endpoint | `relay-worker/src/whitelist.rs` | New `POST /api/whitelist/suspend` (NIP-98 admin). Body: `{ pubkey, duration_secs, reason }`. |
| Silence endpoint | `relay-worker/src/whitelist.rs` | New `POST /api/whitelist/silence` (NIP-98 admin). Body: `{ pubkey, silenced: bool, reason }`. |
| Client zone store | `forum-client/src/stores/zone_access.rs` | Add `trust_level`, `is_suspended`, `is_silenced` signals. Parse from check-whitelist response. |
| Suspend UI | `forum-client/src/admin/user_table.rs` | Add "Suspend" and "Silence" buttons per user row with duration picker modal. |

---

## 4. Engagement Context

### Purpose

Adds badges and improved notifications to drive progressive engagement. Badges use NIP-58 (Badges) and are native Nostr events, making them portable if the community federates.

### Aggregates

#### Badge (Entity)

A badge definition is a kind-30009 (NIP-58 Badge Definition) event published by the admin pubkey.

| Tag | Value | Example |
|-----|-------|---------|
| `d` | badge identifier | `first-post` |
| `name` | display name | `First Post` |
| `description` | criteria description | `Created your first post in the community` |
| `image` | badge icon URL | `https://dreamlab-ai.com/images/badges/first-post.svg` |
| `thumb` | thumbnail URL | (optional) |

#### BadgeAward (Entity)

A badge award is a kind-8 (NIP-58 Badge Award) event published by the admin pubkey.

| Tag | Value |
|-----|-------|
| `a` | `30009:<admin_pubkey>:<badge_d_tag>` |
| `p` | `<recipient_pubkey>` |

#### Badge Catalog

| Badge ID | Name | Criteria | Auto |
|----------|------|----------|------|
| `pioneer` | Pioneer | First 20 registrants | Manual |
| `first-post` | First Post | 1+ posts authored | Auto |
| `conversationalist` | Conversationalist | 10+ posts authored | Auto |
| `contributor` | Contributor | 50+ posts authored | Auto |
| `helpful` | Helpful | 5+ posts with 3+ reactions each | Auto |
| `explorer` | Explorer | Posted in 5+ distinct channels | Auto |
| `trusted` | Trusted | Reached TL3 | Auto |
| `founding-member` | Founding Member | Pre-launch registration | Manual |

#### Notification (Entity -- extended)

Extend `NotificationKind` enum in `forum-client/src/stores/notifications.rs`:

```rust
pub enum NotificationKind {
    Message,
    Mention,
    DM,
    JoinRequest,
    JoinApproved,
    EventRSVP,
    System,
    // New kinds
    BadgeEarned,
    TrustLevelChanged,
    ReportResolved,    // notify reporter of outcome
    ContentHidden,     // notify author when their content is hidden
}
```

#### Reaction (Entity -- existing)

Kind-7 reactions already exist. No aggregate changes needed, but reactions feed into badge computation ("Helpful" badge) and user stats (reactions_received).

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `BadgeEarned` | Daily alarm badge computation | pubkey, badge_id |
| `BadgeRevoked` | TL demotion (Trusted badge) or admin action | pubkey, badge_id |
| `NotificationCreated` | Any notifiable action | pubkey, kind, title, body |

### Invariants

1. A badge can only be awarded once per user (unique constraint on badge_id + recipient_pubkey in the awards query).
2. Notifications are capped at 100 per user (existing cap in `notifications.rs`).
3. Badge definitions are published only by the admin pubkey. The relay rejects kind-30009 from non-admin pubkeys.
4. Badge computation runs on the relay-worker DO alarm, same cycle as trust level evaluation.

### Nostr Event Kind Mapping

| Kind | Role in Engagement Context |
|------|---------------------------|
| 30009 (NIP-58 badge definition) | Admin publishes badge catalog. Stored in D1. |
| 8 (NIP-58 badge award) | Admin publishes per-user badge grants. Stored in D1. |
| 7 (reaction) | Feeds "helpful" badge computation via reactions_received stat. |

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| Badge computation | `relay-worker/src/relay_do/mod.rs` | In DO alarm handler, after trust evaluation: query user_stats, compute badge eligibility, publish kind-8 awards for newly earned badges. |
| Badge kind gate | `relay-worker/src/relay_do/nip_handlers.rs` | Reject kind-30009 and kind-8 from non-admin pubkeys. |
| Badge display | `forum-client/src/components/badge.rs` | Render earned badges on profile and in post author cards. Query kind-8 events where `p` tag matches the viewed user. |
| Badge catalog page | `forum-client/src/pages/profile.rs` | In profile view, show earned badges section. |
| Notification kinds | `forum-client/src/stores/notifications.rs` | Add new `NotificationKind` variants. Push badge and trust notifications. |

---

## 5. Content Context (Extended)

### Purpose

Adds pinning, archiving, and threading to the existing channel/message model.

### Aggregates

#### Channel (Entity -- extended)

New fields on kind-40 channel metadata:

| Tag | Value | Description |
|-----|-------|-------------|
| `archived` | `true` / absent | If present, channel is read-only |
| `zone` | `0`-`3` | Zone level (existing, used by zone enforcement) |
| `cohort` | cohort name | Optional cohort restriction (existing) |

#### PinnedMessage (Entity)

A pinned message is a kind-41 (NIP-29 channel metadata update) event that references a kind-42 message.

Alternative: use a dedicated `pinned_messages` D1 table managed via admin API, avoiding protocol overhead.

Recommended approach: D1 table (simpler, admin-only action, no NIP conflict).

```sql
CREATE TABLE pinned_messages (
  channel_event_id TEXT NOT NULL,
  message_event_id TEXT NOT NULL,
  pinned_by TEXT NOT NULL,
  pinned_at INTEGER NOT NULL,
  PRIMARY KEY (channel_event_id, message_event_id)
);
```

#### Thread (Value Object)

Threads use NIP-22 comment events (kind 1111) or the existing reply tag structure (`e` tag with `reply` marker). No new D1 tables needed -- threading is a client-side grouping of events that share a root `e` tag.

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `ChannelArchived` | Admin sets archived tag | channel_id, admin_pubkey |
| `ChannelUnarchived` | Admin removes archived tag | channel_id, admin_pubkey |
| `MessagePinned` | Admin/TL2+ pins a message | channel_id, message_id, pinned_by |
| `MessageUnpinned` | Admin/TL2+ unpins | channel_id, message_id |

### Invariants

1. Archived channels reject new kind-42 events. The relay checks the channel's `archived` tag (or D1 flag) before accepting a message.
2. Only admins and TL2+ users can pin messages.
3. Maximum 5 pinned messages per channel.
4. Only admins can archive/unarchive channels.

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| Archive enforcement | `relay-worker/src/relay_do/nip_handlers.rs` | In `handle_event()` for kind-42, check if target channel is archived. Reject if so. |
| Pin API | `relay-worker/src/whitelist.rs` (or new `content.rs`) | `POST /api/channels/:id/pin` and `/unpin` (NIP-98, TL2+ or admin). |
| Pinned query | `relay-worker/src/relay_do/storage.rs` | `GET /api/channels/:id/pins` returns pinned messages. |
| Pin display | `forum-client/src/components/pinned_messages.rs` | Already exists. Wire to new API endpoint instead of client-side-only logic. |
| Archive UI | `forum-client/src/admin/channel_form.rs` | Add archive toggle to channel edit form. |
| Thread view | `forum-client/src/pages/channel.rs` | Group messages by root `e` tag into collapsible thread views. |

---

## 6. Administration Context (Extended)

### Purpose

Adds site settings, audit logging, and problem checks to the existing admin panel.

### Aggregates

#### Setting (Entity)

Admin-configurable settings stored in D1, fetched by the client on app load.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  category TEXT NOT NULL DEFAULT 'general',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
```

Type column values: `string`, `integer`, `boolean`, `json`.

Initial settings catalog:

| Key | Type | Default | Category |
|-----|------|---------|----------|
| `general.community_name` | string | `DreamLab AI` | general |
| `general.description` | string | `AI training community` | general |
| `general.welcome_message` | string | `Welcome to the community!` | general |
| `access.registration_mode` | string | `whitelist` | access |
| `access.default_zone` | string | `home` | access |
| `access.auto_whitelist` | boolean | `true` | access |
| `moderation.auto_hide_threshold` | integer | `3` | moderation |
| `moderation.max_post_length` | integer | `65536` | moderation |
| `moderation.new_user_rate_limit` | integer | `5` | moderation |
| `trust.tl1.days_active` | integer | `3` | trust |
| `trust.tl1.posts_read` | integer | `10` | trust |
| `trust.tl1.posts_created` | integer | `1` | trust |
| `trust.tl2.days_active` | integer | `14` | trust |
| `trust.tl2.posts_read` | integer | `50` | trust |
| `trust.tl2.posts_created` | integer | `10` | trust |
| `trust.demotion_hysteresis` | string | `0.9` | trust |
| `engagement.enable_reactions` | boolean | `true` | engagement |
| `engagement.enable_dms` | boolean | `true` | engagement |
| `engagement.enable_calendar` | boolean | `true` | engagement |
| `engagement.enable_badges` | boolean | `true` | engagement |

#### AuditLogEntry (Entity)

Append-only log of all admin actions.

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

Action types:

| Action | Description |
|--------|-------------|
| `whitelist_add` | User added to whitelist |
| `whitelist_remove` | User removed from whitelist |
| `cohort_update` | User's cohorts changed |
| `admin_grant` | User promoted to admin |
| `admin_revoke` | User demoted from admin |
| `trust_level_change` | Trust level changed (manual or auto) |
| `user_suspend` | User suspended |
| `user_unsuspend` | User unsuspended |
| `user_silence` | User silenced |
| `user_unsilence` | User unsilenced |
| `channel_create` | Channel created |
| `channel_archive` | Channel archived |
| `channel_unarchive` | Channel unarchived |
| `event_delete` | Event deleted by admin |
| `event_hide` | Event hidden by admin |
| `report_resolve` | Report resolved |
| `setting_change` | Setting value changed |
| `db_reset` | Database reset |

#### ProblemCheck (Read Model)

Lightweight health checks run when admin loads the overview tab. Not stored in D1 -- computed on-demand.

| Check | Method | Severity |
|-------|--------|----------|
| Relay connection | WebSocket ping | critical |
| D1 health | `SELECT 1` | critical |
| Pending reports | `SELECT COUNT(*) FROM reports WHERE status = 'pending'` | warning if > 0 |
| Moderation backlog | Pending reports older than 48 hours | high |
| Suspended users | Count of currently suspended users | info |
| Trust evaluation | Last alarm run timestamp | warning if > 48h ago |

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `SettingChanged` | Admin updates setting | key, old_value, new_value, admin_pubkey |
| `AdminActionLogged` | Any auditable action | action, actor, target, values |

### Invariants

1. Audit log is append-only. No UPDATE or DELETE on `admin_log`.
2. Settings are validated by type before storage (integer settings reject non-numeric values, boolean settings accept only `true`/`false`).
3. Every admin endpoint that mutates state must log to `admin_log`. This is enforced at the handler level in relay-worker.
4. Settings changes take effect immediately. The client fetches settings on app load and caches in localStorage with a 5-minute TTL.

### Code Mapping

| Component | File | Changes |
|-----------|------|---------|
| Settings API | `relay-worker/src/whitelist.rs` (or new `settings.rs`) | `GET /api/settings` (public, cached), `POST /api/settings` (NIP-98 admin). |
| Audit log writes | Every admin endpoint in `relay-worker/src/whitelist.rs` | After each mutation, INSERT into `admin_log`. |
| Audit log API | `relay-worker/src/whitelist.rs` | `GET /api/admin/audit-log?action=&limit=&offset=` (NIP-98 admin). |
| Problem checks | `relay-worker/src/whitelist.rs` | `GET /api/admin/health` returns check results. |
| Settings UI | `forum-client/src/admin/relay_settings.rs` | Extend existing settings page with full settings form, categorized. |
| Audit log UI | `forum-client/src/admin/audit_log.rs` | New admin tab: filterable audit log table. |
| Admin tabs | `forum-client/src/admin/mod.rs` | Add `AuditLog` and `Reports` to `AdminTab` enum. |
| Client settings cache | `forum-client/src/stores/preferences.rs` | Fetch settings on load, provide via context, TTL refresh. |

---

## 2. Context Map

### Integration Patterns

```
Trust & Reputation ---[Partnership]---> Identity & Access
  - Trust reads whitelist table (shared D1)
  - Trust writes trust_level to whitelist row
  - Tight coupling: same D1 database, same relay-worker crate

Moderation ---[Customer-Supplier]---> Trust & Reputation
  - Moderation reads reporter's trust_level for scoring
  - Moderation writes active_mod_actions to user_stats
  - Trust is upstream (defines levels), Moderation is downstream (consumes them)

Moderation ---[Customer-Supplier]---> Identity & Access
  - Moderation triggers suspend/silence via Identity & Access endpoints
  - Identity & Access enforces suspension on every relay interaction

Moderation ---[Anti-Corruption Layer]---> Content
  - Moderation hides/deletes content via hidden_events table and kind-5 events
  - Content context is unaware of moderation internals
  - ACL: hidden_events table is the boundary

Engagement ---[Published Language]---> Trust & Reputation
  - Badge computation reads trust_level and user_stats
  - Communication via D1 tables (shared read, badge-specific write)
  - NIP-58 events are the published language

Administration ---[Open Host Service]---> All Contexts
  - Settings API provides configuration to Trust, Moderation, Engagement
  - Audit log accepts writes from all admin endpoints
  - Health checks probe all contexts

Content ---[Conformist]---> Identity & Access
  - Content enforces zone restrictions defined by Identity & Access
  - Content conforms to the zone model without negotiation
```

### Shared Kernel

The `nostr-core` crate (`community-forum-rs/crates/nostr-core/`) is the shared kernel:
- `event.rs` -- NostrEvent type used by all contexts
- `nip98.rs` -- NIP-98 auth verification used by all worker endpoints
- `keys.rs` -- secp256k1 key operations
- `deletion.rs` -- NIP-09 deletion logic
- `groups.rs` -- NIP-29 group types

All contexts depend on `nostr-core` for event types and cryptographic verification. No context modifies `nostr-core` types -- it is a stable kernel.

### Anti-Corruption Layers

| Boundary | ACL Pattern | Implementation |
|----------|-------------|----------------|
| Moderation -> Content | `hidden_events` table | Moderation writes to `hidden_events`. Content reads JOIN `hidden_events` to filter. Neither context imports the other's types. |
| Trust -> Relay Protocol | trust_level column on whitelist | Trust computation writes a single integer. The relay protocol layer reads it as a permission check. No NIP-specific logic in trust computation. |
| Client -> Relay API | JSON response contracts | The forum client depends on JSON shapes from `/api/*` endpoints, not on internal D1 schemas. Changes to D1 schema do not break the client if the API response shape is maintained. |

---

## 3. Ubiquitous Language

| Term | Definition | Context |
|------|------------|---------|
| **Trust Level (TL)** | An integer 0-3 representing a user's standing in the community, computed from activity metrics. | Trust & Reputation |
| **Newcomer (TL0)** | A freshly registered user with whitelist entry but no demonstrated activity. | Trust & Reputation |
| **Member (TL1)** | A user who has met minimum activity thresholds (days active, posts read, posts created). | Trust & Reputation |
| **Regular (TL2)** | An active user with sustained engagement and no moderation actions against them. Can create channels and pin posts. | Trust & Reputation |
| **Trusted (TL3)** | An admin-granted moderator who can review reports and take mod actions. | Trust & Reputation |
| **Hysteresis** | The 90% threshold buffer that prevents trust level oscillation. A user is only demoted when their stats fall below 90% of the promotion threshold. | Trust & Reputation |
| **Report** | A user-initiated flag against a specific event, with a reason category and optional description. Creates a kind-1984 NIP-56 event. | Moderation |
| **Review Queue** | The set of pending reports, ordered by creation time, awaiting admin/TL3 resolution. | Moderation |
| **Auto-hide** | Automatic hiding of content when 3+ TL1+ users report the same event, pending admin review. | Moderation |
| **Suspended** | A user state where the relay rejects all events from the pubkey until the suspension expires. | Identity & Access |
| **Silenced** | A user state where the relay allows reads but rejects writes (except admin DMs). | Identity & Access |
| **Zone** | A named access partition (home, dreamlab, minimoonoir). Channels belong to zones. Users have zone flags. The relay enforces zone-based read and write filtering. | Identity & Access |
| **Cohort** | A named group stored as a JSON array on the whitelist entry. Cohorts map to zone flags via pattern matching. | Identity & Access |
| **Badge** | A NIP-58 achievement (kind-30009 definition, kind-8 award) earned through activity milestones or admin grant. | Engagement |
| **Badge Award** | A kind-8 event linking a badge definition to a recipient pubkey, published by the admin pubkey. | Engagement |
| **Pinned Message** | A message elevated to the top of a channel display, managed via admin API. | Content |
| **Archived Channel** | A read-only channel that accepts no new messages. | Content |
| **Setting** | An admin-configurable key-value pair stored in D1, categorized by domain (trust, moderation, engagement, access). | Administration |
| **Audit Log** | An append-only record of all admin actions with actor, target, previous/new values, and timestamp. | Administration |
| **Problem Check** | A lightweight health check that runs on admin dashboard load and reports system status. | Administration |
| **EOSE** | End Of Stored Events -- relay signal that all historical events matching a subscription filter have been sent. | Protocol (nostr-core) |
| **Kind** | A Nostr event type number. Determines how the event is processed, stored, and displayed. | Protocol (nostr-core) |
| **NIP-98** | HTTP Authentication via Nostr events (kind 27235). Used for all admin API calls. | Protocol (nostr-core) |

---

## 4. Aggregate Design Rules

### Event Sourcing on Nostr

The Nostr protocol is inherently event-sourced: all state changes are immutable signed events. DreamLab's relay-worker stores these events in D1 as the event log.

**Pattern:** Nostr events are the write model. D1 tables (`user_stats`, `reports`, `hidden_events`, `admin_log`, `settings`, `pinned_messages`) are projection/read-model tables that the relay-worker maintains as side effects of processing events.

```
Kind-42 message arrives
  -> save_event() writes to events table (event log)
  -> update user_stats (projection)
  -> check auto-hide threshold (policy)
  -> broadcast to subscribers (read model push)
```

### D1 as Projection Store

D1 is not the event log -- the `events` table is. The projection tables (`user_stats`, `reports`, `hidden_events`, etc.) are derived from the event log and can theoretically be rebuilt from it. In practice, rebuilding is expensive and unnecessary given D1's durability guarantees, but the conceptual separation matters:

- **Never query projection tables for event data.** Always query the `events` table.
- **Projection tables exist for performance.** Counting posts_created per user by scanning all kind-42 events would be O(n). The `user_stats` table makes it O(1).
- **Projection updates are idempotent.** Processing the same event twice should not corrupt a projection.

### Client-Side Eventual Consistency

The forum client uses a stale-while-revalidate pattern:

1. **On load:** Read cached data from localStorage (stale).
2. **Immediately:** Fetch fresh data from relay API or WebSocket subscription (revalidate).
3. **On update:** Optimistically update local state, then confirm via relay OK/EOSE.

Trust level, zone access, and settings are fetched via HTTP (`/api/check-whitelist`, `/api/settings`). Messages and events flow via WebSocket subscriptions. The client never assumes its local state is authoritative -- the relay is always the source of truth.

### Consistency Boundaries

| Aggregate | Consistency Boundary | Concurrency Model |
|-----------|---------------------|-------------------|
| WhitelistEntry + TrustLevel | Single D1 row (whitelist) | Durable Object serializes writes |
| Report | Single D1 row (reports) | UNIQUE constraint prevents duplicate reports |
| UserStats | Single D1 row (user_stats) | DO single-threaded, no concurrent writes |
| Setting | Single D1 row (settings) | Admin-only writes, serialized by DO |
| AuditLogEntry | Append-only insert | No conflicts possible |
| PinnedMessage | Composite PK (channel + message) | Admin-only writes |
| HiddenEvent | Single PK (event_id) | Admin-only writes |

### Cross-Aggregate References

Aggregates reference each other by ID (pubkey or event_id), never by direct object reference:

- Report references `reported_event_id` (string), not the event object.
- UserStats references `pubkey` (string), not the WhitelistEntry object.
- BadgeAward references badge via `a` tag string (`30009:pubkey:d-tag`), not the badge definition object.

This ensures aggregates can be loaded independently and contexts remain decoupled.

---

## Complete D1 Migration Script

```sql
-- Trust & Reputation
CREATE TABLE IF NOT EXISTS user_stats (
  pubkey TEXT PRIMARY KEY,
  days_active INTEGER NOT NULL DEFAULT 0,
  posts_read INTEGER NOT NULL DEFAULT 0,
  posts_created INTEGER NOT NULL DEFAULT 0,
  reactions_received INTEGER NOT NULL DEFAULT 0,
  active_mod_actions INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL DEFAULT 0
);

-- Whitelist extensions
ALTER TABLE whitelist ADD COLUMN trust_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN suspended_until INTEGER;
ALTER TABLE whitelist ADD COLUMN silenced INTEGER NOT NULL DEFAULT 0;
ALTER TABLE whitelist ADD COLUMN admin_notes TEXT;

-- Moderation
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_pubkey TEXT NOT NULL,
  reporter_trust_level INTEGER NOT NULL DEFAULT 0,
  reported_event_id TEXT NOT NULL,
  reported_pubkey TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(reporter_pubkey, reported_event_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_event ON reports(reported_event_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_pubkey ON reports(reported_pubkey);

CREATE TABLE IF NOT EXISTS hidden_events (
  event_id TEXT PRIMARY KEY,
  hidden_by TEXT NOT NULL,
  hidden_at INTEGER NOT NULL,
  reason TEXT
);

-- Content
CREATE TABLE IF NOT EXISTS pinned_messages (
  channel_event_id TEXT NOT NULL,
  message_event_id TEXT NOT NULL,
  pinned_by TEXT NOT NULL,
  pinned_at INTEGER NOT NULL,
  PRIMARY KEY (channel_event_id, message_event_id)
);

-- Administration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  category TEXT NOT NULL DEFAULT 'general',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_log (
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

CREATE INDEX IF NOT EXISTS idx_admin_log_action ON admin_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_log_actor ON admin_log(actor_pubkey);
CREATE INDEX IF NOT EXISTS idx_admin_log_created ON admin_log(created_at);
```

---

## Nostr Kind Summary

| Kind | NIP | Name | Context | New/Existing |
|------|-----|------|---------|-------------|
| 0 | 01 | Profile metadata | Identity & Access | Existing |
| 5 | 09 | Deletion | Moderation, Content | Existing |
| 7 | 25 | Reaction | Engagement | Existing |
| 8 | 58 | Badge award | Engagement | New |
| 40 | 29 | Channel creation | Content | Existing |
| 41 | 29 | Channel metadata | Content | Existing |
| 42 | 29 | Channel message | Content | Existing |
| 1984 | 56 | Report | Moderation | New |
| 9000 | 29 | Group admin (add user) | Identity & Access | Existing |
| 9001 | 29 | Group admin (remove user) | Identity & Access | Existing |
| 9005 | 29 | Group admin (delete event) | Moderation | Existing |
| 9021 | custom | Join request | Identity & Access | Existing |
| 9024 | custom | Registration metadata | Identity & Access | Existing |
| 22242 | 42 | AUTH | Identity & Access | Existing |
| 30009 | 58 | Badge definition | Engagement | New |
| 30078 | custom | Application-specific data | Engagement (onboarding flag) | New |
| 39000 | 29 | Group metadata | Content | Existing |

---

## Implementation Dependency Graph

```
Phase 1 (P0 -- Foundation)
  |
  +-- D1 migration (all new tables + whitelist columns)
  |     |
  |     +-- Trust level storage + evaluation alarm
  |     |     |
  |     |     +-- TL-gated kind enforcement in handle_event()
  |     |
  |     +-- Suspend/silence enforcement in handle_event()
  |     |
  |     +-- Zone enforcement in handle_event() + query_events()
  |     |
  |     +-- Audit log writes in all admin endpoints
  |     |
  |     +-- Reports table + NIP-56 handler + auto-hide
  |
  +-- Client: extended check-whitelist parsing (trust_level, suspended, silenced)

Phase 2 (P1 -- Professional)
  |
  +-- Settings API + client settings UI
  |
  +-- User management: suspend/silence UI in admin panel
  |
  +-- Reports admin tab
  |
  +-- Audit log admin tab
  |
  +-- Problem checks on admin overview

Phase 3 (P1-P2 -- Engagement)
  |
  +-- Badge definitions (kind-30009) + badge computation in DO alarm
  |
  +-- Badge awards (kind-8) + client display
  |
  +-- Onboarding welcome modal
  |
  +-- Notification kind extensions

Phase 4 (P2 -- Polish)
  |
  +-- Pinned messages API + UI
  |
  +-- Channel archiving
  |
  +-- Thread grouping in channel view
```

---

## References

- Audit source: `docs/audit-discourse-vs-dreamlab-forum.md`
- Previous DDD: `docs/ddd-forum-parity-sprint.md`
- Relay worker: `community-forum-rs/crates/relay-worker/src/`
- Forum client: `community-forum-rs/crates/forum-client/src/`
- Shared kernel: `community-forum-rs/crates/nostr-core/src/`
- Zone access model: `community-forum-rs/crates/forum-client/src/stores/zone_access.rs`
- Admin store: `community-forum-rs/crates/forum-client/src/admin/mod.rs`
- NIP-56: https://github.com/nostr-protocol/nips/blob/master/56.md
- NIP-58: https://github.com/nostr-protocol/nips/blob/master/58.md
- NIP-29: https://github.com/nostr-protocol/nips/blob/master/29.md
