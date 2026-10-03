// Bulk-provision every whitelisted forum member with DREAM and fee sats on
// sidestr:dreamlab (website ADR-2009 / forum ADR-2015), so the poker table is
// playable without each member asking the faucet.
//
// Member wallets are their Nostr keys (ADR-2015): the address is the taproot
// script 5120<pubkey>, so nothing is needed from the member. Each grant is
// two transfers from the treasury through the local producer, one carrying
// DREAM and one carrying plain sats, each remembered in a ledger so re-runs
// top up only who is short.
//
//   node scripts/seed/provision-members-dream.mjs [--dry-run] [--units 5000] [--sats 5000]
//
// Reads the roster from the relay's admin list (NIP-98, the admin key from
// the environment, never printed), the balances from the producer's assets
// ledger, and spends with `sidestr-agent` (baked in the agentbox) using the
// treasury key FILE, never a key on the command line.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils.js';
import { nip19 } from 'nostr-tools';

const RELAY_API = process.env.RELAY_API || 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const PRODUCER = process.env.SIDESTR_URL || 'http://127.0.0.1:3450';
const TREASURY_KEY = process.env.TREASURY_KEY_FILE || `${process.env.HOME}/workspace/sidestr/agents/treasury.key`;
const LEDGER = process.env.PROVISION_LEDGER || `${process.env.HOME}/workspace/sidestr/agents/provision-members.json`;
const ASSET_ID = '608005d32a927de46e92f01b7948feac3469411cc0fbcfb1336e4eff49b978a9';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const DRY = args.includes('--dry-run');
const ASSET = process.env.PROVISION_ASSET || 'DREAM';
const UNITS = flag('--units', 5000);
const SATS = flag('--sats', 5000);
// Skip these pubkeys (agents with their own provisioning).
const SKIP = new Set((process.env.SKIP_PUBKEYS || '').split(',').filter(Boolean));

// The admin key: ADMIN_PRIVKEY_HEX, or the agentbox env file the other
// probes read (AGENTBOX_PRIVKEY_HEX). Never printed.
function adminKey() {
  if (process.env.ADMIN_PRIVKEY_HEX) return process.env.ADMIN_PRIVKEY_HEX;
  const envPath = process.env.AGENTBOX_ENV || '/home/devuser/workspace/project/agentbox/.env';
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf8').match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m);
    if (m) return m[1];
  }
  console.error('ADMIN_PRIVKEY_HEX is required (never printed)');
  process.exit(2);
}
const skBytes = hexToBytes(adminKey());

function nip98(url, method) {
  const ev = finalizeEvent(
    { kind: 27235, created_at: Math.floor(Date.now() / 1000), tags: [['u', url], ['method', method]], content: '' },
    skBytes,
  );
  return 'Nostr ' + Buffer.from(JSON.stringify(ev)).toString('base64');
}

async function roster() {
  const url = `${RELAY_API}/api/whitelist/list?limit=500`;
  const r = await fetch(url, { headers: { Authorization: nip98(url, 'GET') } });
  if (!r.ok) throw new Error(`whitelist list ${r.status}`);
  const d = await r.json();
  const rows = Array.isArray(d) ? d : d.users || d.rows || d.items || [];
  return rows.map((u) => u.pubkey || u.pub || u.id).filter((p) => /^[0-9a-f]{64}$/.test(p));
}

async function tip() {
  const r = await fetch(`${PRODUCER}/tip`);
  return (await r.json()).height;
}

async function nextBlock() {
  const h = await tip();
  while ((await tip()) === h) await new Promise((r) => setTimeout(r, 5000));
}

// The treasury's change is unconfirmed until the next block; if the producer
// refuses a spend of it, wait one block and try once more.
// Change from a spend is immature until the next block, so a burst of sends
// drains the mature coins; "insufficient … mature" means wait a block, not
// that the treasury is short. Up to three blocks.
async function spend(subcmd) {
  for (let attempt = 0; ; attempt++) {
    try {
      return agent(subcmd);
    } catch (e) {
      const msg = String(e.stderr || e.message);
      const transient = /mature|unspent|unknown input|not found|mempool|conflict/i.test(msg);
      if (!transient || attempt >= 3) throw e;
      await nextBlock();
    }
  }
}

// PROVISION_CLI: an alternative spender with the same subcommand shapes
// (nostr-bbs-sidestr-admin, which replays BLAKE2b-parent chains the crates.io
// sidestr-agent cannot); PROVISION_CHAIN_ID is its pinned chain id.
const CLI = process.env.PROVISION_CLI || 'sidestr-agent';
const CHAIN_ARGS = process.env.PROVISION_CHAIN_ID ? ['--chain-id', process.env.PROVISION_CHAIN_ID] : [];
function agent(subcmd) {
  const out = execFileSync(CLI, ['--url', PRODUCER, ...CHAIN_ARGS, '--key-file', TREASURY_KEY, ...subcmd], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = out.trim().split('\n').pop();
  if (CLI !== 'sidestr-agent') {
    // nostr-bbs-sidestr-admin prints a text table; the posted txid is on the
    // "posted <txid>" line (or "txid <txid>" when not posted).
    const posted = out.match(/^posted\s+([0-9a-f]{64})/m) || out.match(/^txid\s+([0-9a-f]{64})/m);
    if (!posted) throw new Error(`no txid in spender output: ${out.slice(0, 120)}`);
    return { txid: posted[1] };
  }
  return JSON.parse(line);
}

const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { grants: {} };
const save = () => writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

const members = (await roster()).filter((p) => !SKIP.has(p));
console.log(`members: ${members.length}  grant: ${UNITS} ${ASSET} + ${SATS} sats each${DRY ? '  (dry run)' : ''}`);

let sentDream = 0;
let sentSats = 0;
for (const pk of members) {
  const npub = nip19.npubEncode(pk);
  const prior = ledger.grants[pk] || { dream: 0, sats: 0, txids: [] };
  const needDream = Math.max(0, UNITS - prior.dream);
  const needSats = Math.max(0, SATS - prior.sats);
  if (needDream === 0 && needSats === 0) {
    console.log(`${pk.slice(0, 12)}  ok (granted ${prior.dream} ${ASSET}, ${prior.sats} sats)`);
    continue;
  }
  console.log(`${pk.slice(0, 12)}  +${needDream} ${ASSET} +${needSats} sats`);
  if (DRY) continue;
  try {
    if (needDream > 0) {
      const r = await spend(['send-asset', ASSET, npub, String(needDream), '--memo', 'provision:members', '--post']);
      prior.txids.push(r.txid);
      prior.dream += needDream;
      sentDream += needDream;
    }
    if (needSats > 0) {
      const r = await spend(['send', npub, String(needSats), '--post']);
      prior.txids.push(r.txid);
      prior.sats += needSats;
      sentSats += needSats;
    }
    ledger.grants[pk] = prior;
    save();
  } catch (e) {
    console.error(`${pk.slice(0, 12)}  FAILED: ${String(e.stderr || e.message).slice(0, 200)}`);
    ledger.grants[pk] = prior;
    save();
  }
}
console.log(`sent ${sentDream} DREAM and ${sentSats} sats; ledger ${LEDGER}`);
