import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      // Cloud SQL Unix socket connections (?host=/cloudsql/...) don't use SSL.
      // Only enable SSL for direct TCP connections (local dev with sslmode=require).
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: true } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database pool error', err);
    });
  }
  return pool;
}

const MIGRATIONS = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL UNIQUE,
  did_nostr TEXT NOT NULL,
  webid TEXT,
  pod_url TEXT,
  public_key_bytes BYTEA NOT NULL,
  counter BIGINT DEFAULT 0,
  device_type TEXT DEFAULT 'singleDevice',
  backed_up BOOLEAN DEFAULT false,
  transports TEXT[],
  prf_salt BYTEA NOT NULL DEFAULT gen_random_bytes(32),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,
  pubkey TEXT,
  used BOOLEAN DEFAULT FALSE,
  prf_salt BYTEA,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_expires ON webauthn_challenges(expires_at);
`;

export async function runMigrations(): Promise<void> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query(MIGRATIONS);
    console.log('Database migrations applied successfully');
  } finally {
    client.release();
  }
}

export interface ChallengeRow {
  id: string;
  challenge: string;
  pubkey: string | null;
  used: boolean;
  prf_salt: Buffer | null;
  expires_at: Date;
  created_at: Date;
}

export interface CredentialRow {
  credential_id: string;
  pubkey: string;
  did_nostr: string;
  webid: string | null;
  pod_url: string | null;
  public_key_bytes: Buffer;
  counter: string;
  device_type: string;
  backed_up: boolean;
  transports: string[] | null;
  prf_salt: Buffer;
  created_at: Date;
}

export async function storeChallenge(challenge: string, pubkey?: string, prfSalt?: Buffer): Promise<void> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await db.query(
    `INSERT INTO webauthn_challenges (challenge, pubkey, prf_salt, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (challenge) DO NOTHING`,
    [challenge, pubkey ?? null, prfSalt ?? null, expiresAt]
  );
}

export async function consumeChallenge(challenge: string): Promise<ChallengeRow | null> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query<ChallengeRow>(
      `SELECT * FROM webauthn_challenges
       WHERE challenge = $1
         AND used = FALSE
         AND expires_at > NOW()
       FOR UPDATE`,
      [challenge]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE webauthn_challenges SET used = TRUE WHERE challenge = $1`,
      [challenge]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface StoreCredentialParams {
  credentialId: string;
  pubkey: string;
  didNostr: string;
  webId: string | null;
  podUrl: string | null;
  publicKeyBytes: Buffer;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[] | null;
  prfSalt: Buffer;
}

export async function storeCredential(params: StoreCredentialParams): Promise<void> {
  const db = getDb();
  await db.query(
    `INSERT INTO webauthn_credentials
       (credential_id, pubkey, did_nostr, webid, pod_url, public_key_bytes,
        counter, device_type, backed_up, transports, prf_salt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      params.credentialId,
      params.pubkey,
      params.didNostr,
      params.webId,
      params.podUrl,
      params.publicKeyBytes,
      params.counter,
      params.deviceType,
      params.backedUp,
      params.transports,
      params.prfSalt,
    ]
  );
}

export async function getCredentialByPubkey(pubkey: string): Promise<CredentialRow | null> {
  const db = getDb();
  const result = await db.query<CredentialRow>(
    `SELECT * FROM webauthn_credentials WHERE pubkey = $1`,
    [pubkey]
  );
  return result.rows[0] ?? null;
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  const db = getDb();
  const result = await db.query(
    `UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2 AND counter < $1`,
    [counter, credentialId]
  );
  if (result.rowCount === 0) {
    throw new Error(`updateCredentialCounter: counter regression or credential not found for id ${credentialId}`);
  }
}

export async function purgeExpiredChallenges(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM webauthn_challenges WHERE expires_at < NOW()`);
}
