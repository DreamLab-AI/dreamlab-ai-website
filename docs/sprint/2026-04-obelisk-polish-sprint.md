---
title: Obelisk-Polish Sprint — Forum Upgrade
status: active
started: 2026-04-20
sprint_lead: Dr John O'Hare
swarm: forum-upgrade-sprint
topology: hierarchical-mesh
max_agents: 15
---

# Obelisk-Polish Sprint

Single-sprint upgrade to `community-forum-rs` driven by high-value, high-concordance ideas extracted from the Obelisk project (`external/obelisk/`), plus a full UX/UI and user-journey audit.

**Non-goals:** feature parity with Obelisk, voice/games/zaps/LiveKit, rewriting in TypeScript.

## Guiding principle

Steal the ideas that make the forum more **trustworthy**, more **operable**, and more **welcoming**. Reject anything that breaks the Nostr-native edge-deployed architecture.

## Sprint scope (ranked by value density)

### MUST land this sprint

1. **Admin CLI** — headless Rust binary that authenticates with NIP-98 and drives the same HTTP endpoints the forum UI uses. Claude Code / Codex / Cursor can admin any instance. Crate: `community-forum-rs/crates/admin-cli/`.

2. **Moderation data model** — `Ban`, `Mute`, `Warning`, `Report`, `ModerationAction` as Nostr parameterized-replaceable events + D1 tables in auth-worker. API endpoints for issue/list/revoke. No UI yet (that's next sprint).

3. **UX/UI audit report** — `docs/sprint/ux-ui-audit-2026-04.md`. Visual hierarchy, typography, spacing, empty states, error states, loading states, accessibility (WCAG 2.2), responsive breakpoints, theming. Actionable findings with file:line references.

4. **User-journey audit report** — `docs/sprint/user-journey-audit-2026-04.md`. End-to-end flows: first-time registration (passkey PRF), returning login, new-device login, posting, following a post, DM flow, error recovery. Friction points + recommendations.

### SHOULD land this sprint

5. **Web-of-Trust gating** — auth-worker reads `referente_pubkey` per whitelist scope, fetches kind-3 from relays, auto-whitelists the referente's follows. Config stored in D1 `instance_settings` table. Refresh endpoint.

6. **Invite credits with tenure** — member with `days_active >= min_days_active` (default 7) can mint up to `invites_per_user` (default 3) single-use invites, auto-expiring after `invite_expiry_hours` (default 168h). Tracked in D1 `invitations` table.

7. **Welcome bot** — when a new member's first NIP-98 auth lands, auth-worker publishes a kind-1 greeting event signed by an admin-configured welcome key to the configured channel. Per-locale message.

### COULD if time (parked otherwise)

8. Forum cover images on posts
9. Reply-row hover reactions
10. Followed-post subchannel tree in sidebar

## Work items

### WI-1: Admin CLI

**Owner:** `admin-cli-builder` agent
**Crate:** `community-forum-rs/crates/admin-cli/` (new)
**Dependencies:** `nostr-core` (for NIP-98 signing), `reqwest`, `clap`, `tokio`

**API surface:**
```bash
forum-admin login --nsec <nsec>           # or --bunker <connect-uri>
forum-admin whitelist list
forum-admin whitelist add <pubkey>
forum-admin whitelist remove <pubkey>
forum-admin wot set-referente <pubkey>
forum-admin wot refresh
forum-admin invite create --expiry 168 --max-uses 1
forum-admin invite list
forum-admin invite revoke <id>
forum-admin mod ban <pubkey> --reason "spam"
forum-admin mod mute <pubkey> --hours 24
forum-admin mod warn <pubkey> --reason "off-topic"
forum-admin mod report-list
forum-admin channel list
forum-admin channel create <slug> --name "General"
```

**Non-negotiables:**
- No nsec ever written to disk; read once via `--nsec` arg or `FORUM_ADMIN_NSEC` env, zeroed after signing
- NIP-46 bunker support via `--bunker` for hardware-backed keys
- All commands output JSON with `--json` flag for AI-agent parsing
- Exit code 0 on success, non-zero on error
- `--dry-run` flag on all write commands

**Acceptance:**
- `cargo build -p admin-cli` succeeds
- Integration test against local auth-worker (miniflare) passes for at least `whitelist add` and `invite create`
- `AGENT.md` written inside the crate covering AI-agent usage

---

### WI-2: Moderation data model

**Owner:** `moderation-implementor` agent
**Crates touched:** `nostr-core` (event types), `auth-worker` (API + D1), `relay-worker` (event validation)

**Nostr event schema (custom kinds, parameterized-replaceable):**

| Event | Kind | `d` tag | Use |
|---|---|---|---|
| Ban | `30910` | banned pubkey | permanent ban, admin-signed |
| Mute | `30911` | muted pubkey | temporary silence with `expires` tag |
| Warning | `30912` | warned pubkey + timestamp | audit trail, visible to user |
| Report | `30913` | reported event id | user-submitted, admin-processed |
| ModerationAction | `30914` | action id (uuid) | audit log entry |

Each event signed by admin pubkey. Relay enforces:
- Only whitelisted admin pubkeys can publish kinds 30910–30914
- Kind 30910 (ban) blocks all subsequent events from target pubkey
- Kind 30911 (mute) blocks kind-1/42 events from target until `expires`

**D1 tables (projection for fast queries):**
```sql
CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,             -- uuid
  action TEXT NOT NULL,            -- ban|mute|warn|unban|unmute
  target_pubkey TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  reason TEXT,
  expires_at INTEGER,              -- null for permanent
  event_id TEXT NOT NULL,          -- Nostr event id
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_mod_target ON moderation_actions(target_pubkey);
CREATE INDEX idx_mod_active ON moderation_actions(action, expires_at);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_pubkey TEXT NOT NULL,
  target_event_id TEXT NOT NULL,
  target_pubkey TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open|actioned|dismissed
  event_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  actioned_by TEXT,
  actioned_at INTEGER
);
CREATE INDEX idx_reports_status ON reports(status);
```

**API endpoints on auth-worker:**
- `POST /api/mod/ban` (admin only) — creates kind-30910, inserts row
- `POST /api/mod/mute` (admin only) — creates kind-30911, inserts row
- `POST /api/mod/warn` (admin only) — creates kind-30912, inserts row
- `POST /api/mod/report` (any authed user) — creates kind-30913, inserts row
- `GET /api/mod/actions?target=<pubkey>` — list actions against pubkey
- `GET /api/mod/reports?status=open` (admin only) — list open reports
- `POST /api/mod/reports/:id/action` (admin only) — mark actioned/dismissed

All API calls NIP-98 authed. Admin pubkeys determined by `is_admin` column in `members` D1 table (existing).

**Acceptance:**
- Migration file applied, tables created
- All endpoints tested with `cargo test -p auth-worker` (miniflare)
- Relay-worker rejects kind-1 from a muted pubkey while mute is active
- Admin CLI `mod ban/mute/warn` commands hit these endpoints

---

### WI-3: Web-of-Trust gating

**Owner:** `wot-implementor` agent
**Crate:** `auth-worker`

**Config (instance_settings D1 table — extend existing):**
```sql
ALTER TABLE instance_settings ADD COLUMN wot_enabled INTEGER DEFAULT 0;
ALTER TABLE instance_settings ADD COLUMN wot_referente_pubkey TEXT;
ALTER TABLE instance_settings ADD COLUMN wot_last_fetched_at INTEGER;
ALTER TABLE instance_settings ADD COLUMN wot_follow_count INTEGER;
```

**WoT table:**
```sql
CREATE TABLE wot_entries (
  pubkey TEXT PRIMARY KEY,
  added_at INTEGER NOT NULL,
  source TEXT NOT NULL    -- 'referente' | 'manual_override'
);
```

**Logic:**
- Admin sets `wot_referente_pubkey` and toggles `wot_enabled=1`
- Background cron (daily) or manual `/api/wot/refresh` fetches kind-3 (contact list) of referente from configured relays
- Populates `wot_entries` with referente's follows (source='referente')
- Registration gate: if `wot_enabled=1`, registration succeeds only if `target_pubkey` exists in `wot_entries` OR valid `invite_token` supplied
- Admin override: manually add pubkeys with source='manual_override' (survives refresh)

**API:**
- `POST /api/wot/set-referente` (admin) — `{pubkey: string}`
- `POST /api/wot/refresh` (admin) — fetches kind-3, returns follow count
- `POST /api/wot/override/add` (admin) — `{pubkey: string}`
- `POST /api/wot/override/remove` (admin) — `{pubkey: string}`
- `GET /api/wot/status` — returns `{enabled, referente, count, last_fetched}`

**Acceptance:**
- Registration without valid WoT membership returns 403 when `wot_enabled=1`
- Registration with invite token bypasses WoT check
- Manual overrides survive refresh
- Test against fixture kind-3 event

---

### WI-4: Invite credits with tenure

**Owner:** `invite-credits-implementor` agent
**Crate:** `auth-worker`

**Config (instance_settings):**
```sql
ALTER TABLE instance_settings ADD COLUMN min_days_active INTEGER DEFAULT 7;
ALTER TABLE instance_settings ADD COLUMN invites_per_user INTEGER DEFAULT 3;
ALTER TABLE instance_settings ADD COLUMN invite_expiry_hours INTEGER DEFAULT 168;
```

**Invitations table:**
```sql
CREATE TABLE invitations (
  id TEXT PRIMARY KEY,               -- nanoid 8
  code TEXT UNIQUE NOT NULL,         -- nanoid 16 for the URL
  issued_by TEXT NOT NULL,           -- pubkey
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoked_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE invitation_redemptions (
  invitation_id TEXT NOT NULL,
  pubkey TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL,
  PRIMARY KEY (invitation_id, pubkey),
  FOREIGN KEY (invitation_id) REFERENCES invitations(id)
);
```

**Member table extension:**
```sql
ALTER TABLE members ADD COLUMN joined_via_invite_id TEXT;
ALTER TABLE members ADD COLUMN first_seen_at INTEGER;
```

**Logic:**
- `days_active = (now - first_seen_at) / 86400`
- User can mint invite iff `days_active >= min_days_active` AND `active_invites < invites_per_user`
- Admin can mint without tenure check
- Redeeming: atomic increment `uses`, insert into `invitation_redemptions`
- Revoked invite returns 410 Gone with "Invitation revoked"

**API:**
- `POST /api/invites/create` — `{expiry_hours?, max_uses?}` → `{code, url, expires_at}`
- `GET /api/invites/mine` — list caller's invites
- `GET /api/invites/:code` — resolve for pre-redemption preview (no auth)
- `POST /api/invites/:code/redeem` — NIP-98 authed, creates member
- `POST /api/invites/:id/revoke` — issuer or admin

**Acceptance:**
- Non-tenured user: 403 on create, 200 after `first_seen_at` back-dated
- Revoked invite: 410 on redeem
- Double-redeem same pubkey: idempotent, 200 with existing member
- Admin CLI `invite create` uses these endpoints

---

### WI-5: Welcome bot

**Owner:** `welcome-bot-implementor` agent
**Crate:** `auth-worker` + `relay-worker`

**Config:**
```sql
ALTER TABLE instance_settings ADD COLUMN welcome_enabled INTEGER DEFAULT 0;
ALTER TABLE instance_settings ADD COLUMN welcome_channel_id TEXT;
ALTER TABLE instance_settings ADD COLUMN welcome_message_en TEXT;
ALTER TABLE instance_settings ADD COLUMN welcome_message_es TEXT;
ALTER TABLE instance_settings ADD COLUMN welcome_bot_pubkey TEXT;
ALTER TABLE instance_settings ADD COLUMN welcome_bot_nsec_encrypted TEXT;  -- age-encrypted at rest
```

**Logic:**
- On successful first registration (no prior `members` row), if `welcome_enabled=1`, auth-worker decrypts welcome-bot nsec, signs kind-42 message to `welcome_channel_id` tagging the new member, publishes to relay-worker via internal WebSocket client.
- Template variables: `{name}` (from profile), `{pubkey_short}`.
- Locale resolution: query Cloudflare `CF-IPCountry` header → map to locale → fallback `en`.
- Welcome event marked with `welcome-bot` tag to distinguish from human greetings.

**API:**
- `POST /api/welcome/configure` (admin) — set channel, messages, enable
- `POST /api/welcome/set-bot-key` (admin) — encrypted nsec upload
- `GET /api/welcome/config` (admin) — current config
- `POST /api/welcome/test` (admin) — trigger test welcome to admin pubkey

**Acceptance:**
- First registration triggers welcome event published to relay
- Second registration of same pubkey does NOT trigger (idempotent)
- Disabled: no event published
- Test locale fallback: unknown CF-IPCountry → en

---

### WI-6: UX/UI audit

**Owner:** `ux-ui-auditor` agent
**Output:** `docs/sprint/ux-ui-audit-2026-04.md`

**Scope:** `community-forum-rs/crates/forum-client/` — 17 pages, 58 components

**Audit dimensions:**
1. **Visual hierarchy** — headings, spacing, scale, contrast
2. **Typography** — font stacks, line-height, measure, rhythm
3. **Colour system** — semantic tokens, dark-mode, WCAG AA/AAA contrast
4. **Spacing system** — consistent spacing scale (4/8/12/16/24/32/48)
5. **Component consistency** — buttons, inputs, cards, modals, toasts
6. **States** — empty, loading, error, success, partial, offline
7. **Accessibility (WCAG 2.2)** — semantic HTML, ARIA, focus management, keyboard nav, screen-reader labels, reduced motion
8. **Responsive** — mobile (320-767), tablet (768-1023), desktop (1024+), large (1440+)
9. **Micro-interactions** — transitions, loading indicators, skeleton screens, optimistic updates
10. **Dark-mode fidelity** — contrast shifts, surface elevations

**Deliverable format:**
Each finding: file:line, severity (critical/high/medium/low), category, current state, recommended fix, estimated effort.

**Required count:** minimum 40 findings across dimensions.

---

### WI-7: User-journey audit

**Owner:** `user-journey-auditor` agent
**Output:** `docs/sprint/user-journey-audit-2026-04.md`

**Journeys to map:**

1. **First-time registration** — landing → register button → passkey ceremony → PRF derivation → pod provisioning → first view
2. **Returning login (same device)** — landing → login → passkey ceremony → authenticated view
3. **Returning login (new device, discoverable credential)** — authenticator list → select → PRF → in
4. **Registration with WoT gate** — blocked path, invite link path
5. **Posting first channel message** — navigation → compose → sign → publish → see it appear
6. **Creating a forum post** — navigation → new post → cover image upload → publish
7. **Following a post / receiving a notification** — mark follow → receive reply → see badge
8. **DM flow** — open DM with user → encrypted send → receive
9. **Moderation — receiving a warning** — what does the target see and when?
10. **Recovery** — what happens when passkey is lost? Today: nothing (recovery is impossible because key derives from passkey). Document this constraint prominently.
11. **Settings / profile edit** — edit display name, avatar → save → propagate

**For each journey:**
- Step-by-step walkthrough with screenshots (Playwright against running dev server if feasible, else code trace with file:line)
- Friction points (every point a user might be confused, blocked, or lost)
- Time-to-value estimate (clicks + waits from start to primary goal)
- Comparison column: "how Obelisk does this" where applicable
- Recommendations ranked by impact/effort

---

## Agent topology

Hierarchical-mesh: queen coordinator (me) spawns parallel workstreams, each workstream agent writes code + tests, then `qe-test-architect` runs validation pass.

```
main thread (queen)
├── Wave 1 — Audit (parallel, read-only)
│   ├── ux-ui-auditor              → docs/sprint/ux-ui-audit-2026-04.md
│   └── user-journey-auditor       → docs/sprint/user-journey-audit-2026-04.md
├── Wave 2 — Implementation (parallel, write)
│   ├── admin-cli-builder          → crates/admin-cli/
│   ├── moderation-implementor     → auth-worker, relay-worker, nostr-core
│   ├── wot-implementor            → auth-worker
│   ├── invite-credits-implementor → auth-worker
│   └── welcome-bot-implementor    → auth-worker, relay-worker
└── Wave 3 — QE validation (sequential, after waves 1+2)
    └── qe-test-architect          → generate tests, run full suite
```

## Acceptance gate for the sprint

- [ ] `cargo build --workspace` succeeds
- [ ] `cargo test --workspace` all tests pass (targets: nostr-core 129+, auth-worker 20+, relay-worker 10+, admin-cli 5+)
- [ ] `cargo check --target wasm32-unknown-unknown -p forum-client` succeeds
- [ ] `cargo clippy --workspace -- -D warnings` clean
- [ ] New crates added to workspace `Cargo.toml`
- [ ] All D1 migrations applied and reversible
- [ ] UX audit ≥ 40 findings
- [ ] Journey audit covers 11 journeys
- [ ] Admin CLI smoke test passes against miniflare
- [ ] Sprint spec (this doc) updated with `completed` markers per WI

## Out of scope (next sprint)

- Full moderation UI in forum-client (panels, action buttons, report queue)
- Forum cover image upload + display
- Reply-row hover reactions
- Followed-post sidebar subchannel tree
- i18n framework
- Admin role dashboard
- Instance-owner setup wizard
