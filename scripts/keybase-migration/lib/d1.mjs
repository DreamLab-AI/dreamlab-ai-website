// Direct Cloudflare D1 bulk insert — the fast path for 100k+ events.
// Writes signed events straight into the relay's `events` table via
// `wrangler d1 execute --remote`, bypassing the websocket rate limit
// (10 events/sec) entirely. Schema per docs/api/NOSTR_RELAY.md.
//
// Auth: wrangler picks up CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) from
// the environment, or an existing `wrangler login` session. This module never
// reads or logs the credentials itself.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const pExecFile = promisify(execFile);

// forum-config/deploy/relay-worker.wrangler.toml
export const D1_DATABASE_NAME = 'dreamlab-relay';
export const D1_DATABASE_ID = '97c77d23-0e24-4325-ada7-1747eab4095b';

const sq = (s) => "'" + String(s).replace(/'/g, "''") + "'";

// INSERT OR IGNORE + deterministic event ids => idempotent re-runs.
export function eventToInsert(ev) {
  return (
    'INSERT OR IGNORE INTO events (id,pubkey,created_at,kind,tags,content,sig,d_tag,received_at) VALUES (' +
    [sq(ev.id), sq(ev.pubkey), ev.created_at, ev.kind, sq(JSON.stringify(ev.tags)), sq(ev.content), sq(ev.sig), "''", ev.created_at].join(',') +
    ');'
  );
}

export async function checkWrangler() {
  try {
    const { stdout } = await pExecFile('npx', ['-y', 'wrangler', '--version'], {
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    return { ok: true, version: stdout.trim().split('\n').pop() };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 300) };
  }
}

async function execSqlFile(file) {
  await pExecFile(
    'npx',
    ['-y', 'wrangler', 'd1', 'execute', D1_DATABASE_NAME, '--remote', '--file', file, '-y'],
    {
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    }
  );
}

/**
 * Bulk-insert signed events. Batches into .sql files under workDir/d1-batches
 * and runs them sequentially. `startBatch` allows resuming.
 */
export async function bulkInsert(events, { workDir, batchSize = 500, startBatch = 0, log = () => {}, onBatchDone } = {}) {
  const dir = path.join(workDir, 'd1-batches');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const totalBatches = Math.ceil(events.length / batchSize);
  for (let b = startBatch; b < totalBatches; b++) {
    const slice = events.slice(b * batchSize, (b + 1) * batchSize);
    const file = path.join(dir, `batch-${String(b).padStart(5, '0')}.sql`);
    await writeFile(file, slice.map(eventToInsert).join('\n') + '\n');
    await execSqlFile(file);
    await rm(file, { force: true });
    log(`d1 batch ${b + 1}/${totalBatches} inserted (${Math.min((b + 1) * batchSize, events.length)}/${events.length} events)`);
    if (onBatchDone) onBatchDone(b, totalBatches, Math.min((b + 1) * batchSize, events.length));
  }
  await rm(dir, { recursive: true, force: true });
  return { totalBatches, inserted: events.length };
}
