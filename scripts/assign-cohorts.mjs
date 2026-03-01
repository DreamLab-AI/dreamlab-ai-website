#!/usr/bin/env node

/**
 * assign-cohorts.mjs -- Assigns zone cohorts to seeded test users via the relay API.
 *
 * Uses NIP-98 authentication with the admin private key to call
 * POST /api/whitelist/update-cohorts for each user.
 *
 * Usage: node scripts/assign-cohorts.mjs
 */

import { getPublicKey, finalizeEvent } from '/home/devuser/workspace/project2/community-forum/node_modules/nostr-tools/lib/esm/pure.js';
import { bytesToHex, hexToBytes } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/utils.js';
import { sha256 } from '/home/devuser/workspace/project2/community-forum/node_modules/@noble/hashes/esm/sha256.js';

// ── Configuration ──────────────────────────────────────────────────────
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const ADMIN_PRIVKEY_HEX = '60da2527b79aea2e90a0fab5284870a1fc93bf751bab3088a4fe6d47e3995668';
const ADMIN_PRIVKEY = hexToBytes(ADMIN_PRIVKEY_HEX);
const ADMIN_PUBKEY = getPublicKey(ADMIN_PRIVKEY);

// Deterministic keys for test users (same derivation as seed-forum.mjs)
function deriveKey(seed) {
  return sha256(new TextEncoder().encode(seed));
}

// ── User Definitions with Cohort Assignments ─────────────────────────
const USERS = {
  jj: {
    privkey: ADMIN_PRIVKEY,
    pubkey: ADMIN_PUBKEY,
    cohorts: ['admin', 'cross-access', 'approved'],
  },
  sarah: {
    privkey: deriveKey('dreamlab-test-sarah-chen-2026'),
    cohorts: ['family', 'minimoonoir', 'approved'],
  },
  alex: {
    privkey: deriveKey('dreamlab-test-alex-rivera-2026'),
    cohorts: ['business', 'trainers', 'approved'],
  },
  maya: {
    privkey: deriveKey('dreamlab-test-maya-patel-2026'),
    cohorts: ['minimoonoir', 'minimoonoir-business', 'approved'],
  },
  tom: {
    privkey: deriveKey('dreamlab-test-tom-wilson-2026'),
    cohorts: ['family', 'approved'],
  },
  liwei: {
    privkey: deriveKey('dreamlab-test-li-wei-2026'),
    cohorts: ['business', 'cross-access', 'approved'],
  },
};

// Populate pubkeys
for (const user of Object.values(USERS)) {
  if (!user.pubkey) {
    user.pubkey = getPublicKey(user.privkey);
  }
}

// ── NIP-98 Token Generation ────────────────────────────────────────────
async function createNip98Token(privkey, url, method, body) {
  const created_at = Math.floor(Date.now() / 1000);
  const tags = [
    ['u', url],
    ['method', method],
  ];

  if (body) {
    const bodyBytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
    const hash = bytesToHex(sha256(new Uint8Array(bodyBytes)));
    tags.push(['payload', hash]);
  }

  const event = finalizeEvent({
    kind: 27235,
    created_at,
    tags,
    content: '',
  }, privkey);

  return Buffer.from(JSON.stringify(event)).toString('base64');
}

// ── Cohort Assignment ──────────────────────────────────────────────────
async function updateCohorts(pubkey, cohorts) {
  const url = `${RELAY_HTTP}/api/whitelist/update-cohorts`;
  const body = JSON.stringify({ pubkey, cohorts });
  const token = await createNip98Token(ADMIN_PRIVKEY, url, 'POST', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Nostr ${token}`,
    },
    body,
  });

  const data = await res.json();
  if (data.success) {
    console.log(`  [cohorts] ${pubkey.slice(0, 16)}... -> [${cohorts.join(', ')}]`);
  } else {
    console.error(`  [cohorts] FAILED for ${pubkey.slice(0, 16)}...:`, data);
  }
  return data.success;
}

// ── Main Execution ─────────────────────────────────────────────────────
async function main() {
  console.log('=== DreamLab Cohort Assignment Script ===\n');
  console.log(`Relay: ${RELAY_HTTP}`);
  console.log(`Admin pubkey: ${ADMIN_PUBKEY}\n`);

  console.log('--- User Cohort Assignments ---');
  for (const [name, user] of Object.entries(USERS)) {
    console.log(`  ${name}: ${user.pubkey.slice(0, 16)}... -> [${user.cohorts.join(', ')}]`);
  }
  console.log();

  console.log('--- Updating Cohorts via API ---');
  let successCount = 0;
  let failCount = 0;

  for (const [name, user] of Object.entries(USERS)) {
    const ok = await updateCohorts(user.pubkey, user.cohorts);
    if (ok) {
      successCount++;
    } else {
      failCount++;
      console.error(`  Failed to update cohorts for ${name}`);
    }
    // Small delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log();
  console.log('=== Cohort Assignment Complete ===');
  console.log(`  Success: ${successCount}, Failed: ${failCount}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
