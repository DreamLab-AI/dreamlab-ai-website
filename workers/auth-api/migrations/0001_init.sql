-- WebAuthn credentials store
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  pubkey TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  prf_salt TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (pubkey, credential_id)
);

-- Authentication challenges (ephemeral, cleaned after verification)
CREATE TABLE IF NOT EXISTS challenges (
  pubkey TEXT NOT NULL,
  challenge TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_challenges_pubkey ON challenges(pubkey);
CREATE INDEX IF NOT EXISTS idx_credentials_pubkey ON webauthn_credentials(pubkey);
