-- ============================================================================
-- DreamLab Auth D1 — Full Schema Reset (001_init.sql)
-- ============================================================================
--
-- Database: dreamlab-auth
-- Database ID: e3981999-e8f0-4c07-9e4b-2e50859b8524
--
-- This file creates ALL tables required by:
--   - nostr-bbs-auth-worker (binding: DB)
--   - nostr-bbs-pod-worker  (binding: REPLAY_DB, same D1 database)
--
-- Reset procedure
-- ---------------
-- 1. Drop all existing tables (wrangler d1 has no "DROP DATABASE"):
--
--      wrangler d1 execute dreamlab-auth --remote --command \
--        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';"
--
--    Then for each table returned:
--
--      wrangler d1 execute dreamlab-auth --remote --command "DROP TABLE IF EXISTS <table>;"
--
--    Or use the nuclear one-liner (drops every user table):
--
--      wrangler d1 execute dreamlab-auth --remote --command \
--        "PRAGMA writable_schema = ON; DELETE FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'; PRAGMA writable_schema = OFF; VACUUM;"
--
-- 2. Apply this migration:
--
--      wrangler d1 execute dreamlab-auth --file=forum-config/deploy/migrations/001_init.sql --remote
--
-- 3. Verify:
--
--      wrangler d1 execute dreamlab-auth --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
--
-- All statements are idempotent (CREATE IF NOT EXISTS / INSERT OR IGNORE).
-- Safe to re-run on an existing database — no data loss on re-apply.
-- ============================================================================


-- ============================================================================
-- Section 1: WebAuthn (auth-worker core)
-- ============================================================================

-- Ephemeral WebAuthn ceremony challenges. Pruned after 5 minutes.
CREATE TABLE IF NOT EXISTS challenges (
    pubkey      TEXT NOT NULL,
    challenge   TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenges_created
    ON challenges(created_at);

-- Stored WebAuthn credentials (passkeys). One row per registered user.
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    pubkey        TEXT NOT NULL,
    credential_id TEXT NOT NULL,
    public_key    TEXT NOT NULL,
    counter       INTEGER NOT NULL DEFAULT 0,
    prf_salt      TEXT,
    created_at    INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webauthn_credentials_pubkey
    ON webauthn_credentials(pubkey);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_cred_id
    ON webauthn_credentials(credential_id);


-- ============================================================================
-- Section 2: NIP-98 Replay Protection (shared by all workers via D1)
-- ============================================================================

-- Atomic first-seen replay cache. INSERT OR IGNORE on PK gives single-
-- statement atomicity. Expired rows pruned on worker cold start.
CREATE TABLE IF NOT EXISTS nip98_replay (
    event_id    TEXT PRIMARY KEY,
    expires_at  INTEGER NOT NULL
);


-- ============================================================================
-- Section 3: Moderation (WI-2)
-- ============================================================================

-- Admin moderation actions (ban, mute, warn, unban, unmute).
CREATE TABLE IF NOT EXISTS moderation_actions (
    id              TEXT PRIMARY KEY,
    action          TEXT NOT NULL,
    target_pubkey   TEXT NOT NULL,
    performed_by    TEXT NOT NULL,
    reason          TEXT,
    expires_at      INTEGER,
    event_id        TEXT NOT NULL,
    created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_target
    ON moderation_actions(target_pubkey);

CREATE INDEX IF NOT EXISTS idx_mod_actions_active
    ON moderation_actions(action, expires_at);

-- Community-submitted moderation reports (NIP-56 / kind-1984 derived).
CREATE TABLE IF NOT EXISTS mod_reports (
    id                TEXT PRIMARY KEY,
    reporter_pubkey   TEXT NOT NULL,
    target_event_id   TEXT NOT NULL,
    target_pubkey     TEXT NOT NULL,
    reason            TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'open',
    event_id          TEXT NOT NULL,
    created_at        INTEGER NOT NULL,
    actioned_by       TEXT,
    actioned_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mod_reports_status
    ON mod_reports(status);

CREATE INDEX IF NOT EXISTS idx_mod_reports_target
    ON mod_reports(target_pubkey);

-- NIP-1984 standard report events (kind-1984). Populated by relay-worker,
-- read by auth-worker at GET /api/moderation/reports.
CREATE TABLE IF NOT EXISTS nip1984_reports (
    event_id    TEXT PRIMARY KEY,
    pubkey      TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    tags_json   TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_nip1984_reports_created
    ON nip1984_reports(created_at DESC);


-- ============================================================================
-- Section 4: Web-of-Trust (WI-3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wot_entries (
    pubkey    TEXT PRIMARY KEY,
    added_at  INTEGER NOT NULL,
    source    TEXT NOT NULL              -- 'referente' | 'manual_override'
);

CREATE INDEX IF NOT EXISTS idx_wot_source
    ON wot_entries(source);


-- ============================================================================
-- Section 5: Members & Invite Credits (WI-4)
-- ============================================================================

-- Registered forum members. is_admin flag used by both auth-worker and
-- pod-worker admin checks.
CREATE TABLE IF NOT EXISTS members (
    pubkey              TEXT PRIMARY KEY,
    is_admin            INTEGER NOT NULL DEFAULT 0,
    joined_via_invite_id TEXT,
    first_seen_at       INTEGER,
    created_at          INTEGER NOT NULL
);

-- Invite codes. Random 16-char nanoid tokens, tenure-gated creation.
CREATE TABLE IF NOT EXISTS invitations (
    id          TEXT PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    issued_by   TEXT NOT NULL,
    max_uses    INTEGER NOT NULL DEFAULT 1,
    uses        INTEGER NOT NULL DEFAULT 0,
    expires_at  INTEGER NOT NULL,
    revoked_at  INTEGER,
    revoked_by  TEXT,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_code
    ON invitations(code);

CREATE INDEX IF NOT EXISTS idx_invitations_issuer
    ON invitations(issued_by);

-- Tracks which pubkeys have redeemed which invites. Idempotent redemption.
CREATE TABLE IF NOT EXISTS invitation_redemptions (
    invitation_id TEXT NOT NULL,
    pubkey        TEXT NOT NULL,
    redeemed_at   INTEGER NOT NULL,
    PRIMARY KEY (invitation_id, pubkey),
    FOREIGN KEY (invitation_id) REFERENCES invitations(id)
);


-- ============================================================================
-- Section 6: Welcome Bot (WI-5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS welcome_messages (
    event_id       TEXT PRIMARY KEY,
    target_pubkey  TEXT NOT NULL,
    locale         TEXT NOT NULL,
    signed_json    TEXT NOT NULL,
    sent_at        INTEGER,
    created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_welcome_messages_pending
    ON welcome_messages(sent_at) WHERE sent_at IS NULL;


-- ============================================================================
-- Section 7: Instance Settings (single-row config, shared)
-- ============================================================================

CREATE TABLE IF NOT EXISTS instance_settings (
    id                      INTEGER PRIMARY KEY CHECK (id = 1),
    -- WI-3: Web-of-Trust
    wot_enabled             INTEGER NOT NULL DEFAULT 0,
    wot_referente_pubkey    TEXT,
    wot_last_fetched_at     INTEGER,
    wot_follow_count        INTEGER,
    -- WI-4: Invites
    min_days_active         INTEGER NOT NULL DEFAULT 7,
    invites_per_user        INTEGER NOT NULL DEFAULT 3,
    invite_expiry_hours     INTEGER NOT NULL DEFAULT 168,
    -- WI-5: Welcome bot
    welcome_enabled         INTEGER NOT NULL DEFAULT 0,
    welcome_channel_id      TEXT,
    welcome_message_en      TEXT,
    welcome_message_es      TEXT,
    welcome_bot_pubkey      TEXT,
    welcome_bot_nsec_encrypted TEXT
);

-- Seed the single config row if it does not exist.
INSERT OR IGNORE INTO instance_settings (id) VALUES (1);


-- ============================================================================
-- Section 8: Username Reservations (Sprint v10)
-- ============================================================================

CREATE TABLE IF NOT EXISTS username_reservations (
    username    TEXT PRIMARY KEY NOT NULL
                CHECK (length(username) BETWEEN 3 AND 30),
    pubkey      TEXT NOT NULL UNIQUE,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    status      TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_username_reservations_pubkey
    ON username_reservations(pubkey);


-- ============================================================================
-- Section 9: Whitelist (relay-worker reads, auth-worker writes)
--
-- The whitelist table lives in this D1 when workers share a database.
-- It is the authority for cohort-based access control and admin flags.
-- The relay-worker's own Durable Object has a separate events store.
-- ============================================================================

CREATE TABLE IF NOT EXISTS whitelist (
    pubkey                  TEXT PRIMARY KEY,
    cohorts                 TEXT NOT NULL DEFAULT '["home"]',
    added_at                REAL NOT NULL,
    added_by                TEXT,
    expires_at              REAL,
    profile_content         TEXT,
    is_admin                INTEGER DEFAULT 0,
    -- Trust-level columns (relay trust engine)
    trust_level             INTEGER NOT NULL DEFAULT 0,
    days_active             INTEGER NOT NULL DEFAULT 0,
    posts_read              INTEGER NOT NULL DEFAULT 0,
    posts_created           INTEGER NOT NULL DEFAULT 0,
    mod_actions_against     INTEGER NOT NULL DEFAULT 0,
    last_active_at          INTEGER,
    trust_level_updated_at  INTEGER,
    suspended_until         INTEGER,
    silenced                INTEGER NOT NULL DEFAULT 0,
    user_notes              TEXT,
    created_at              INTEGER
);


-- ============================================================================
-- Section 10: Payment / Quota (pod-worker via REPLAY_DB binding)
-- ============================================================================

-- Per-DID satoshi balance for Web Ledgers (HTTP 402) payment system.
-- Accounts keyed by did:nostr:<hex-pubkey>.
CREATE TABLE IF NOT EXISTS webledger_accounts (
    did           TEXT PRIMARY KEY,
    balance_sats  INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL
);

-- TXO deposit replay protection. Composite PK (txid, vout) gives atomic
-- first-seen semantics via INSERT OR IGNORE. Pruned after 90 days.
CREATE TABLE IF NOT EXISTS txo_deposits (
    txid          TEXT NOT NULL,
    vout          INTEGER NOT NULL,
    did           TEXT NOT NULL,
    amount_sats   INTEGER NOT NULL,
    deposited_at  INTEGER NOT NULL,
    PRIMARY KEY (txid, vout)
);

CREATE INDEX IF NOT EXISTS idx_txo_deposits_did
    ON txo_deposits(did);

CREATE INDEX IF NOT EXISTS idx_txo_deposits_deposited_at
    ON txo_deposits(deposited_at);

-- Per-pubkey storage quota (atomic check-and-reserve in pod-worker).
-- Default limit: 50 MB (52428800 bytes).
CREATE TABLE IF NOT EXISTS quota_usage (
    pubkey       TEXT PRIMARY KEY,
    limit_bytes  INTEGER NOT NULL DEFAULT 52428800,
    used_bytes   INTEGER NOT NULL DEFAULT 0,
    updated_at   INTEGER NOT NULL
);


-- ============================================================================
-- Section 11: Admin Audit Log (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_pubkey    TEXT NOT NULL,
    action          TEXT NOT NULL,
    target_pubkey   TEXT,
    target_id       TEXT,
    previous_value  TEXT,
    new_value       TEXT,
    reason          TEXT,
    created_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_log_action
    ON admin_log(action);

CREATE INDEX IF NOT EXISTS idx_admin_log_actor
    ON admin_log(actor_pubkey);

CREATE INDEX IF NOT EXISTS idx_admin_log_target
    ON admin_log(target_pubkey);

CREATE INDEX IF NOT EXISTS idx_admin_log_created
    ON admin_log(created_at);


-- ============================================================================
-- Section 12: Relay-Worker Auxiliary Tables
--
-- These tables are created here so they exist in the shared D1 for workers
-- that need cross-worker data (e.g. relay-worker moderation, channel zones,
-- reports, hidden events). The relay Durable Object's own SQLite holds the
-- events table; these D1 tables hold admin/moderation state.
-- ============================================================================

-- Channel zone assignments for the relay.
CREATE TABLE IF NOT EXISTS channel_zones (
    channel_id  TEXT PRIMARY KEY,
    zone        TEXT NOT NULL DEFAULT 'home',
    archived    INTEGER NOT NULL DEFAULT 0
);

-- Key-value settings store (relay-worker trust thresholds, etc.).
CREATE TABLE IF NOT EXISTS settings (
    key       TEXT PRIMARY KEY,
    value     TEXT NOT NULL,
    type      TEXT NOT NULL DEFAULT 'string',
    category  TEXT NOT NULL DEFAULT 'general'
);

-- NIP-56 / kind-1984 report events (relay-worker moderation).
CREATE TABLE IF NOT EXISTS reports (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    report_event_id       TEXT NOT NULL UNIQUE,
    reporter_pubkey       TEXT NOT NULL,
    reporter_trust_level  INTEGER NOT NULL DEFAULT 0,
    reported_event_id     TEXT NOT NULL,
    reported_pubkey       TEXT NOT NULL,
    reason                TEXT NOT NULL,
    reason_text           TEXT,
    status                TEXT NOT NULL DEFAULT 'pending',
    resolved_by           TEXT,
    resolution            TEXT,
    created_at            INTEGER NOT NULL,
    resolved_at           INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_reported_event
    ON reports(reported_event_id);

CREATE INDEX IF NOT EXISTS idx_reports_reported_pubkey
    ON reports(reported_pubkey);

-- Soft-hidden events (admin moderation without hard delete).
CREATE TABLE IF NOT EXISTS hidden_events (
    event_id    TEXT PRIMARY KEY,
    hidden_by   TEXT NOT NULL,
    reason      TEXT,
    created_at  INTEGER NOT NULL
);

-- Projection of most-recent kind-0 per pubkey (relay-worker profiles).
CREATE TABLE IF NOT EXISTS profiles (
    pubkey          TEXT PRIMARY KEY NOT NULL,
    name            TEXT,
    display_name    TEXT,
    picture         TEXT,
    banner          TEXT,
    about           TEXT,
    nip05           TEXT,
    lud16           TEXT,
    last_kind0_at   INTEGER NOT NULL,
    raw_event       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_name
    ON profiles(name);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name
    ON profiles(display_name);

CREATE INDEX IF NOT EXISTS idx_profiles_last_kind0
    ON profiles(last_kind0_at DESC);


-- ============================================================================
-- Section 13: Agent Job Tracking (inference pricing / nostr-bridge invoicing)
--
-- Forum users task agents via the nostr-nostr bridge. Each job gets a price
-- estimate before execution and a final invoice after. The agent_jobs table
-- tracks the full lifecycle: estimate → hold → running → settled/failed.
-- ============================================================================

-- Agent job requests with price estimation and settlement.
CREATE TABLE IF NOT EXISTS agent_jobs (
    job_id          TEXT PRIMARY KEY,
    requester_did   TEXT    NOT NULL,
    agent_did       TEXT    NOT NULL,
    endpoint        TEXT    NOT NULL,
    params_json     TEXT,
    status          TEXT    NOT NULL DEFAULT 'estimated',
    estimated_sats  INTEGER NOT NULL DEFAULT 0,
    held_sats       INTEGER,
    actual_sats     INTEGER,
    created_at      INTEGER NOT NULL,
    started_at      INTEGER,
    completed_at    INTEGER,
    error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_requester
    ON agent_jobs(requester_did, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_status
    ON agent_jobs(status);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_agent
    ON agent_jobs(agent_did, created_at DESC);


-- ============================================================================
-- Done. All 24 tables created.
-- ============================================================================
