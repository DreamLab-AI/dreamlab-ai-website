# Discourse vs DreamLab Forum: Pattern Audit & Professionalisation Roadmap

**Date:** 2026-04-03
**Scope:** User patterns, admin patterns, moderation, engagement, trust
**Method:** Source-level audit of Discourse (Rails, 682-line Guardian, ~35 admin controllers, 4325-line site_settings.yml, 70+ staff action types) vs DreamLab community-forum-rs (Leptos/WASM, 5 CF Workers, Nostr protocol, ~57K LOC, 457 tests)

---

## Executive Summary

Discourse is the gold standard for self-hosted forum software — 13 years of iteration, ~200K LOC, powering communities from small hobby groups to large enterprises. DreamLab's forum is architecturally novel (Nostr protocol, passkey-first auth, Solid pods, Cloudflare edge) but functionally immature compared to Discourse's battle-tested patterns.

The comparison is not apples-to-apples: Discourse is a monolithic Rails app with PostgreSQL; DreamLab is a decentralised event-sourced system on edge infrastructure. Many Discourse patterns cannot be directly ported. But the **product thinking** behind them absolutely can.

This document identifies the patterns that matter most for professionalising DreamLab's forum, given its protocol constraints and community scale.

---

## System Comparison Table

| Dimension | Discourse | DreamLab Forum | Gap | Priority |
|-----------|-----------|----------------|-----|----------|
| **Trust System** | 5 trust levels (TL0-TL4) with automatic promotion based on read time, topics entered, posts read, days visited. Configurable thresholds via site settings. TL3 has rolling 100-day window and can be lost. | Binary: whitelisted or not. 3 zone flags (home, dreamlab, minimoonoir). Admin is first-user-is-admin or D1 flag. No graduated trust. | **Critical** | P0 |
| **Permission Model** | Guardian class (682 LOC) with 16 mixins (BookmarkGuardian, PostGuardian, TopicGuardian, etc.). Fine-grained: can_create_topic?, can_edit_post?, can_flag_post? etc. Group-based category permissions. | ZoneAccess with 3 boolean flags. Client-side enforcement only (relay is source of truth but doesn't enforce zone-level read permissions). NIP-29 admin-only kinds enforced server-side. | **Critical** | P0 |
| **User Onboarding** | Interactive tutorial bot (discobot), welcome modal, guided first-post experience, badge rewards for learning. ReadGuidelines badge. Admin-configurable welcome topic. | Passkey registration → direct entry. No onboarding flow, no tutorial, no guidance. Admin checklist for admins only (3 items). | **High** | P1 |
| **Badges & Gamification** | 48+ built-in badges (BasicUser, Member, Regular, Leader, Welcome, NicePost, GoodPost, GreatPost, FirstLike, FirstShare, etc.). SQL-query-based badge granting. Custom badge creation. Badge grouping and display. | None. No badge system, no achievement tracking, no gamification. | **High** | P1 |
| **Moderation Queue** | Reviewable system: ReviewableFlaggedPost, ReviewableQueuedPost, ReviewableUser. Priority scoring, sensitivity settings, claimed topics. Flag types with custom descriptions. Staff review workflow with approve/reject/defer. | NIP-09 deletion (author-only or admin). No flag/report system. No moderation queue. No post approval queue. Admin can delete via relay, but no UI workflow for reports. | **Critical** | P0 |
| **Admin Dashboard** | Comprehensive: daily/monthly stats, new signups, active users, posts/topics created, page views, reports system (~40 report types), admin notices, health checks. | Overview tab with stats (fetched from relay), connection status bar, user table, channel form. Basic but functional for current scale. | **Medium** | P2 |
| **Site Settings** | ~600 settings in config/site_settings.yml across 20+ categories (required, basic, login, users, email, navigation, security, onboarding, spam, rate_limits, developer, etc.). Type-safe with enums. | No settings system. Configuration is compile-time or hardcoded. Relay settings page exists but minimal. | **High** | P1 |
| **User Management** | Admin user list with search, sort, filter. Bulk actions: suspend, silence, trust level adjust, delete, merge, anonymize. User logs, IP lookup, action history. Impersonation for debugging. | User table in admin panel. Whitelist add/remove, cohort update, admin toggle. No suspend, silence, merge, anonymize. No user action history. | **High** | P1 |
| **Content Organisation** | Categories with subcategories, descriptions, logos, permissions, featured topics. Tags with groups, tag-groups, synonyms. Topic states: pinned, unpinned, closed, archived, unlisted, visible. | Channels (kind-40 events) with name, description, section, picture. Sections are flat strings. No subcategories, no tags, no pinning/archiving beyond deletion. | **Medium** | P2 |
| **Notifications** | 35+ notification types in NotificationTypes. Push notifications, email digests, per-topic tracking levels (watching, tracking, normal, muted). Consolidated notifications. Desktop notifications. | 7 kinds: Message, Mention, DM, JoinRequest, JoinApproved, EventRSVP, System. localStorage-backed with 7-day eviction. No push notifications, no email, no per-topic tracking. | **Medium** | P2 |
| **Search** | Full-text PostgreSQL search with ranking, blended results (topics + posts + users + categories + tags). Search logs for analytics. Filtered by category, tag, user, date range. | RuVector cosine k-NN search via search-worker. Hash-based embeddings (ONNX not yet deployed). Functional but no faceted search, no search logs. | **Medium** | P2 |
| **User Profiles** | Bio (3000 chars), location, website, card background, profile background, featured topic, granted title badge. Custom fields. Activity summary, post history, badges, groups. Privacy controls per field. | Nostr profile (NIP-01 kind-0 metadata). Name, about, picture, banner. Solid pod WebID profile. No activity summary, no post history view, no custom fields. | **Medium** | P2 |
| **Rate Limiting** | Redis-backed RateLimiter class. Per-action limits: post creation, topic creation, invite, flag, like, etc. Configurable via site settings. IP and user-level. | KV-backed sliding window: auth (20/min), preview (30/min), search (100/min). Relay has basic rate limiting. No per-action granularity. | **Low** | P3 |
| **Anti-Abuse** | ScreenedEmail, ScreenedIpAddress, ScreenedUrl models. IP blocking, email domain blocking, URL blocklist. Akismet integration. New user restrictions (link limits, image limits, mention limits). | Whitelist-only access model (implicit anti-abuse). No IP blocking, no content screening, no spam detection. Whitelist acts as gate but nothing post-entry. | **Medium** | P2 |
| **Email** | Transactional mailers, digest system, email-in (post by email), email templates (admin-editable), bounce handling. | No email system at all. | **Low** | P3 |
| **Webhooks** | WebHook model with event type filtering, category/tag scoping, secret validation, retry logic, delivery status tracking. | No webhook system. | **Low** | P3 |
| **Plugin/Extension** | Plugin::Instance with lifecycle hooks, server-side JS injection, custom routes, custom serializers, theme components. Rich ecosystem of ~200 plugins. | No plugin system. Monolithic crate architecture. | **Low** | P3 |
| **Backup/Restore** | Automated backup to S3/local, restoration with validation, migration-aware. | No backup system. D1/R2 data on Cloudflare with platform-level durability. | **Low** | P3 |
| **Themes & Customisation** | Theme model, color schemes, CSS overrides, header/footer customisation, theme components. | Hardcoded Tailwind styling. No theme system. | **Low** | P3 |
| **API** | Comprehensive REST API with API keys, rate limiting, webhook integration. Documentation auto-generated. | NIP-98 auth on all endpoints. Relay WebSocket API (Nostr protocol). Pod REST API. No API documentation beyond source. | **Low** | P3 |

---

## DreamLab Forum Maturity Assessment

| Area | Maturity | Notes |
|------|----------|-------|
| **Auth & Registration** | 4/5 | 3 auth paths (passkey PRF, local key, NIP-07). Privkey hygiene excellent (never persisted, zeroized on pagehide). Smart UX defaults. Missing: email verification, profile completeness nudge. |
| **Trust & Access** | 4/5 | Dual-layer enforcement (client + server). D1-backed admin. Expiration support exists but unused. Missing: moderator role, per-action ACL, audit log. |
| **Admin & Moderation** | 2.5/5 | Whitelist CRUD works. 5 admin tabs (Overview, Channels, Users, Sections, Calendar). Missing: mod role, ban/lock, case system, audit trail, bulk actions. |
| **Notifications** | 3/5 | localStorage-backed, 7 types, 100-cap, 7-day eviction, unread count. Missing: push/email, aggregation, per-channel tracking, preference enforcement. |
| **Content Organisation** | 3.5/5 | Sections/channels with localStorage cache (stale-while-revalidate). Semantic search via RuVector. Missing: threads, pagination, admin-configurable sections. |
| **Profiles & Settings** | 2.5/5 | NIP-01 kind-0 profiles. Settings page has 5 tabs but many toggles not wired to backend. Privacy settings stored locally but not enforced server-side. |
| **Extensions** | 1/5 | Monolithic. Auth is composable (easy to add 5th path). Event handlers isolated. No plugin hooks. |
| **Anti-Abuse** | 3.5/5 | KV-backed rate limits on 4 workers. Event validation (64KB cap, 2000 tags, 7-day drift). Whitelist as implicit gate. Missing: per-user limits, content screening, spam detection. |

## Key Discourse Design Patterns Worth Adopting

### 1. Trust Level Hysteresis
Discourse demotes TL3 users only when engagement drops below **90%** of the threshold (not at the exact threshold). This prevents "thrashing" where users oscillate between levels. A 6-month forgiveness period after penalties adds stability. **Adopt this** when implementing DreamLab trust levels.

### 2. Notification Consolidation
Discourse batches notifications: "10 people liked your post" instead of 10 separate items. The `ConsolidationPlanner` checks whether a new notification matches a consolidation pattern before creating it. **Adopt this** for DreamLab reactions and mentions.

### 3. Reviewable Scoring with Sensitivity
Multiple users can score the same flagged item. Score is weighted by reporter trust level. Sensitivity thresholds (disabled/low/medium/high) let admins tune how quickly content gets auto-hidden. **Adopt this** for the NIP-56 moderation queue.

### 4. Staff Action Audit Trail
70+ action types logged with `acting_user_id`, `target_user_id`, `previous_value`, `new_value`, `ip_address`. Every admin action is auditable. **Adopt this** from day one — retrofitting audit logs is painful.

### 5. Settings with Backfill
Discourse's `bulk_update` endpoint can retroactively apply new defaults to existing users (e.g., changing notification defaults applies to all users who haven't customised). **Adopt this** pattern for DreamLab settings to avoid stale-default problems.

### 6. Problem Checks Dashboard
30+ health checks run on admin dashboard load: S3 config, Sidekiq health, RAM usage, SSL validity, email deliverability. Each check has `perform_every`, `max_retries`, and priority. **Adopt a lightweight version** checking relay connectivity, D1 health, KV availability, moderation backlog size.

---

## Detailed Recommendations

### P0: Critical — Without These, the Forum Feels Like a Prototype

#### 1. Graduated Trust System

**Current state:** Binary whitelisted/not-whitelisted with 3 zone flags.

**Discourse pattern:** 5 trust levels (New → Basic → Member → Regular → Leader) with automatic promotion based on measurable activity: topics entered, posts read, time spent reading, days visited. Thresholds are admin-configurable. TL3 (Regular) uses a rolling 100-day window and can be lost through inactivity.

**Recommendation for DreamLab:**

Implement a 4-level trust system that maps to the Nostr event model:

| Level | Name | How Earned | Unlocks |
|-------|------|-----------|---------|
| TL0 | Newcomer | Passkey registration + whitelist | Read public channels, post in lobby |
| TL1 | Member | 3+ days active, 10+ posts read, 1+ post created | Post in all zones they have access to, react, DM |
| TL2 | Regular | 14+ days active, 50+ posts read, 10+ posts created, 0 mod actions against | Create channels (in permitted zones), pin own posts, edit own posts beyond 24h window |
| TL3 | Trusted | Admin-granted | Moderate (flag review), move topics, close threads |

**Implementation:** Store trust level as a field on the whitelist entry in D1. Relay-worker computes promotion eligibility on a daily alarm (Durable Object alarm). Client reads TL from `/api/check-whitelist` response alongside zone flags. Relay enforces TL-gated kinds server-side (e.g., kind-40 channel creation requires TL2+).

**Effort:** ~3 days relay-worker + ~2 days forum-client

#### 2. Content Moderation Queue

**Current state:** Admin can delete events (NIP-09). No flag/report flow. No queue.

**Discourse pattern:** Users flag posts with a reason (off-topic, inappropriate, spam, custom). Flags create Reviewable records scored by reporter trust level. Staff see a review queue sorted by priority. Actions: agree (hide/delete), disagree (dismiss), defer, delete + suspend user. Reviewable history tracks all decisions.

**Recommendation for DreamLab:**

Use NIP-56 (Reporting) with a lightweight review queue:

1. **Client:** Add "Report" button on posts. Creates kind-1984 event (NIP-56) with reason tag (`nudity`, `profanity`, `illegal`, `spam`, `impersonation`, or free-text).
2. **Relay:** Store kind-1984 events. Admin query endpoint `/api/reports?status=pending` returns pending reports with the reported event.
3. **Admin UI:** New "Reports" tab in admin panel. Shows reported content with context, reporter info, report reason. Actions: dismiss, hide (add `hidden` tag via kind-5 replacement), delete (kind-5 deletion), warn user, adjust trust level.
4. **Auto-escalation:** If 3+ reports from TL1+ users on the same event, auto-hide pending review.

**Effort:** ~2 days relay-worker (NIP-56 storage + query endpoint) + ~3 days forum-client (report UI + admin queue)

#### 3. Relay-Side Permission Enforcement

**Current state:** Zone access is client-side (UX optimisation). Relay broadcasts all events to all subscribers. The comment in `zone_access.rs` says "relay is the source of truth per ADR-022" but enforcement is incomplete.

**Discourse pattern:** Guardian class enforces permissions server-side for every action. `can_see_topic?`, `can_create_post?`, etc. Client never trusts itself.

**Recommendation for DreamLab:**

Relay-worker must enforce zone-based read filtering:

1. **On REQ:** Check session's pubkey against whitelist. Filter returned events by the user's zone access flags. If user only has `home` access, exclude events tagged with `dreamlab` or `minimoonoir` zone markers.
2. **On EVENT:** Reject writes to channels the user doesn't have zone access for. Return `["OK", id, false, "zone access denied"]`.
3. **Channel→Zone mapping:** Store channel-zone assignment in D1 (or as a tag on kind-40 channel creation events). Relay reads this mapping on startup.

This is the single most important architectural change. Without it, the zone model is decorative.

**Effort:** ~3-4 days relay-worker

---

#### 4. Admin Audit Trail

**Current state:** No audit log of admin actions. No record of who-added-whom, trust level changes, suspensions, or deletions.

**Discourse pattern:** `UserHistory` model with 70+ action types. Every admin action logs: acting user, target user, previous/new values, IP address, timestamp. Filterable by date, action type, actor, target. Diff view for setting changes.

**Recommendation for DreamLab:**

Add an `admin_log` table to relay-worker D1:

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
  created_at INTEGER NOT NULL
);
```

Actions to log: `whitelist_add`, `whitelist_remove`, `cohort_update`, `admin_grant`, `admin_revoke`, `trust_level_change`, `user_suspend`, `user_silence`, `channel_create`, `channel_delete`, `event_delete`, `report_resolve`.

Admin UI: New "Audit Log" tab in admin panel. Filterable by action type, actor, target, date range.

**Effort:** ~1-2 days relay-worker + ~1 day forum-client

---

### P1: High — Makes the Forum Feel Professional

#### 4. Onboarding Flow

**Discourse pattern:** "Discobot" — an automated bot that DMs new users with an interactive tutorial: how to reply, how to format, how to use emoji, how to quote, how to search. Awards badges for completing it.

**Recommendation for DreamLab:**

A lightweight welcome sequence (not a bot — the community is too small for that):

1. After first login, show a 3-step modal: (a) "Welcome to the community" with community guidelines summary, (b) "Your profile" — prompt to set display name and avatar, (c) "Explore" — direct links to the main channels with brief descriptions.
2. Store `onboarded: true` flag in localStorage or as a kind-30078 (application-specific) event.
3. First post in the public lobby triggers a system notification to the poster: "Welcome! Your first post is live."

**Effort:** ~2 days forum-client

#### 5. Basic Badge / Achievement System

**Discourse pattern:** 48+ badges with SQL queries for automatic granting. Badges are displayed on profile, in posts, and as notifications.

**Recommendation for DreamLab (lightweight version):**

Define 8-10 badges as kind-30009 (NIP-58 Badges) events published by the admin pubkey:

| Badge | Criteria | Auto-grant |
|-------|----------|-----------|
| Pioneer | First 20 registrants | Manual |
| First Post | 1+ post | Auto |
| Conversationalist | 10+ posts | Auto |
| Contributor | 50+ posts | Auto |
| Helpful | 5+ posts with 3+ reactions | Auto |
| Explorer | Visited 5+ channels | Auto |
| Trusted | Reached TL3 | Auto |
| Founding Member | Pre-launch registration | Manual |

Badge computation runs on relay-worker daily alarm. Client displays badges on profile page and in post author card. This is native Nostr (NIP-58) so it federates if the community ever opens up.

**Effort:** ~2 days relay-worker (NIP-58 badge events + computation) + ~2 days forum-client (display)

#### 6. Admin Site Settings

**Discourse pattern:** ~600 settings in YAML, categorised, type-safe. Admin UI for editing.

**Recommendation for DreamLab:**

Start with 20-30 essential settings stored in relay-worker D1:

| Category | Settings |
|----------|----------|
| General | Community name, description, welcome message, logo URL |
| Access | Default zone for new members, auto-whitelist (on/off), registration mode (open/invite/closed) |
| Moderation | Auto-hide threshold (report count), max post length, new user post rate limit |
| Trust | TL1/TL2 thresholds (posts read, days active, posts created) |
| Engagement | Enable reactions (on/off), enable DMs (on/off), enable calendar (on/off) |

Admin reads/writes via NIP-98 authenticated `/api/settings` endpoint. Client fetches settings on app load and caches in localStorage.

**Effort:** ~2 days relay-worker + ~1 day forum-client

#### 7. User Management Improvements

**Discourse pattern:** Suspend (timed ban with reason), silence (can read but not post), trust level adjustment, anonymize, merge accounts, impersonate.

**Recommendation for DreamLab:**

Add to the existing admin user table:

1. **Suspend:** Set `suspended_until` timestamp on whitelist entry. Relay rejects events from suspended pubkeys with `["OK", id, false, "suspended"]`. Admin UI: "Suspend" button with duration picker (1 day, 1 week, 1 month, permanent) and reason field.
2. **Silence:** Set `silenced: true` on whitelist entry. Relay accepts reads but rejects writes (except DMs to admin). Shows "silenced" badge in client.
3. **User notes:** Admin can attach notes to whitelist entries (visible only to admin). Stored as a D1 column.
4. **Activity summary:** Show in user table: last seen, post count, report count, join date.

**Effort:** ~2 days relay-worker + ~2 days forum-client

---

### P2: Medium — Polish and Depth

#### 8. Content Organisation Improvements

- **Pinned topics:** Admin can pin a kind-42 message to the top of a channel (kind-41 pin event, or custom tag on the channel's kind-40 metadata).
- **Channel archive:** Close a channel to new posts but keep it readable. Relay enforces: reject new kind-42 events targeting archived channels.
- **Thread/topic distinction:** Currently channels are flat message streams. Consider implementing kind-1111 (threaded replies) or NIP-22 comment threads so conversations can branch without polluting the main channel.

**Effort:** ~3-4 days total

#### 9. Notification Improvements

- **Push notifications:** Service worker + Web Push API. Relay-worker can trigger notifications via the existing pod-worker notification webhook system.
- **Per-channel tracking:** Let users set tracking level per channel: watching (notify on every post), tracking (notify on replies to my posts), normal (notify on mentions), muted. Store as kind-30078 events.
- **Notification grouping:** "5 new messages in #general" instead of 5 separate notifications.

**Effort:** ~4-5 days total

#### 10. Post-Entry Anti-Abuse

- **Mute user (client-side):** Already have `mute.rs` store — ensure it's surfaced in UI with "Mute" button on user profiles and posts.
- **Content screening:** On relay-worker EVENT handler, check message content against a configurable blocklist of words/patterns stored in KV. Reject or auto-flag.
- **Rate limits per trust level:** TL0 users: 5 posts/hour. TL1: 20 posts/hour. TL2+: 60 posts/hour. Enforced relay-side.

**Effort:** ~2-3 days total

---

### P3: Low — Nice to Have, Not Urgent

| Item | Description | Effort |
|------|-------------|--------|
| Email digests | Daily/weekly digest of activity sent to users who haven't visited | Large (need email service) |
| Webhooks | Admin-configurable webhooks for events (new post, new user, report) | ~2 days |
| Themes | User-selectable colour themes (dark/light + accent colours) | ~2 days client |
| API documentation | OpenAPI spec for relay and worker endpoints | ~1 day |
| Search analytics | Log search queries for admin insight | ~1 day |
| Profile custom fields | Admin-defined custom profile fields | ~2 days |

---

## Architecture Notes

### What DreamLab Does Better Than Discourse

| Advantage | Detail |
|-----------|--------|
| **Auth model** | Passkey-first with PRF key derivation is significantly more secure than Discourse's email/password + optional 2FA. No passwords to breach. |
| **Edge deployment** | Cloudflare Workers + Durable Objects gives global edge presence. Discourse requires a beefy server with PostgreSQL. |
| **Data sovereignty** | Solid pods give users actual data ownership. Discourse data is entirely server-controlled. |
| **Protocol** | Nostr events are portable and interoperable. Discourse data is locked in a Rails-specific schema. |
| **Cost at scale** | CF Workers pricing (pay-per-request) vs always-on Rails server. At DreamLab's community size, Workers is essentially free. |
| **Real-time** | WebSocket-first via Durable Objects. Discourse uses MessageBus polling (long-poll, not true WebSocket). |

### What Cannot / Should Not Be Ported

| Discourse Feature | Why Not |
|-------------------|---------|
| Email-in (post by email) | Nostr events need signing — can't create from email |
| Plugin ecosystem | Community too small; monolithic Rust is fine for now |
| SEO-optimised server rendering | Forum is auth-gated; SEO doesn't apply to private community content |
| PostgreSQL full-text search | RuVector cosine k-NN is architecturally superior for the use case |
| User merge / anonymize | Nostr pubkeys are identity — can't merge cryptographic identities |

---

## Recommended Implementation Order

| Phase | Scope | Effort | Impact |
|-------|-------|--------|--------|
| **Phase 1** | Relay-side zone enforcement + moderation queue (NIP-56) + graduated trust (4 levels) + audit trail | ~12 days | Turns prototype into a credible community platform |
| **Phase 2** | Onboarding flow + user management (suspend/silence) + admin settings + problem checks | ~8 days | Makes admin experience professional |
| **Phase 3** | Badges (NIP-58) + pinned topics + notification improvements + per-channel tracking | ~8 days | Drives engagement and retention |
| **Phase 4** | Threaded replies + content screening + search improvements + profile enhancements | ~8 days | Depth and polish |

**Total: ~36 days of focused development to reach Discourse-level product maturity in the areas that matter for a private community.**

---

## Conclusion

DreamLab's forum has strong architectural foundations (edge-native, passkey-first, Nostr-portable, Solid-compatible) but weak product foundations (no trust system, no moderation queue, no onboarding, no badges, client-side-only permissions). The sprawl is real — there are 107 Rust files, 58 components, 17 pages, but the feature depth in each is thin.

The fix is not more files or more components. It's depth in the right places:

1. **Server-side trust and permissions** (the relay must be the authority, not the client)
2. **Moderation workflow** (reports → queue → action, not just admin-deletes)
3. **Progressive engagement** (onboarding → badges → trust levels → moderator status)

These three patterns are what make Discourse communities self-sustaining. They're protocol-agnostic and can be implemented natively on Nostr events.
