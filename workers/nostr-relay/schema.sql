-- DreamLab Nostr Relay D1 Schema
-- Events table (NIP-01)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  tags TEXT NOT NULL,  -- JSON array
  content TEXT NOT NULL,
  sig TEXT NOT NULL,
  d_tag TEXT DEFAULT '',  -- NIP-33 d-tag for parameterized replaceable events
  received_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey);
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_kind_created ON events(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind ON events(pubkey, kind);
CREATE INDEX IF NOT EXISTS idx_events_d_tag ON events(pubkey, kind, d_tag);

-- Whitelist table (cohort management)
CREATE TABLE IF NOT EXISTS whitelist (
  pubkey TEXT PRIMARY KEY,
  cohorts TEXT NOT NULL DEFAULT '[]',  -- JSON array of cohort names
  added_at INTEGER DEFAULT (unixepoch()),
  added_by TEXT,
  expires_at INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_whitelist_added_at ON whitelist(added_at DESC);
