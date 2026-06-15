// Clean up QA test-pollution from the "chat with agents" channel.
//
// QA scripts (publish-foreign-reply.mjs / notif-followon.mjs) published ~16
// throwaway kind-42 channel messages signed by junkiejarvis (a whitelisted
// foreign agent) into the business-zone channel "chat with agents". They carry
// obvious test titles. This script:
//   1. enumerates kind-42 events in the channel authored by junkiejarvis whose
//      content matches the QA patterns (DRY RUN by default — prints titles+ids),
//   2. with --apply, publishes a kind-5 NIP-09 deletion signed by junkiejarvis
//      referencing those event ids (batched, max 50 e-tags per kind-5),
//   3. re-queries to confirm the relay honoured the deletion.
//
// Genuine threads by john (operator 11ed64…663c) are NEVER touched — we filter
// strictly on author == junkiejarvis AND content matches a QA pattern.
//
// Secrets are read from agentbox/.env in-process and used only to sign; they are
// never printed. Only public keys, event ids, and titles are logged.
//
//   node scripts/seed/cleanup-qa-foreign.mjs           # dry run
//   node scripts/seed/cleanup-qa-foreign.mjs --apply   # delete via NIP-09
import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import WebSocket from 'ws';

const APPLY = process.argv.includes('--apply');
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const CHANNEL = '04d6fd408977bdd1fb515b4bd97881da1ac7f27291b9539184e12ca974b1bf2f';
const ENV_FILE = '/home/devuser/workspace/project/agentbox/.env';
const now = () => Math.floor(Date.now() / 1000);

const env = readFileSync(ENV_FILE, 'utf8');
const jjSk = Uint8Array.from(Buffer.from(env.match(/^JUNKIEJARVIS_PRIVKEY_HEX=([0-9a-f]{64})/m)[1], 'hex'));
const opSk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const JJ_PUB = getPublicKey(jjSk);
const OP_PUB = getPublicKey(opSk);

// QA-pattern matchers against event content (the kind-42 content IS the title/body).
const QA_PATTERNS = [
  /^QA foreign reply .+ — does this notify\?$/,
  /^FOLLOWON-\d+ foreign reply — please notify$/,
  /^GEOM-\d+ foreign reply — geom probe$/,
  /^STORE-\d+/,
  /^RELAYLIVE-\d+/,
  /^DIAG-\d+ foreign reply/,
  /^ONDM-\d+ foreign reply/,
  /^FINAL-\d+ foreign reply — please notify$/,
  /^QA live-repro /,
];
const isQA = (content) => QA_PATTERNS.some((re) => re.test((content || '').trim()));

// Title preview for audit output.
const title = (content) => (content || '').replace(/\s+/g, ' ').trim().slice(0, 80);

// Query all kind-42 events in the channel authored by junkiejarvis. Returns the
// full set so we can show what we keep vs delete.
function queryChannel() {
  return new Promise((res) => {
    const ws = new WebSocket(RELAY);
    const sub = 'cl' + now();
    const events = [];
    const t = setTimeout(() => { ws.close(); res(events); }, 18000);
    ws.on('message', (raw) => {
      const d = JSON.parse(raw);
      if (d[0] === 'AUTH') {
        ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, opSk)]));
        // Filter: kind-42 in this channel (NIP-28 #e root tag). Author filter
        // applied client-side so we can also report john's events for context.
        setTimeout(() => ws.send(JSON.stringify(['REQ', sub, { kinds: [42], '#e': [CHANNEL], limit: 500 }])), 500);
      } else if (d[0] === 'EVENT' && d[1] === sub) {
        events.push(d[2]);
      } else if (d[0] === 'EOSE' && d[1] === sub) {
        clearTimeout(t); ws.close(); res(events);
      }
    });
    ws.on('error', () => { clearTimeout(t); res(events); });
  });
}

// Publish kind-5 deletions (NIP-09) signed by junkiejarvis, batched.
function publishDeletions(ids) {
  return new Promise((res) => {
    const ws = new WebSocket(RELAY);
    const batches = [];
    for (let i = 0; i < ids.length; i += 50) batches.push(ids.slice(i, i + 50));
    const dels = batches.map((batch) =>
      finalizeEvent({ kind: 5, created_at: now(), tags: batch.map((id) => ['e', id]), content: 'QA test-pollution cleanup (NIP-09)' }, jjSk),
    );
    const sent = new Map(dels.map((d) => [d.id, null]));
    const results = [];
    let okCount = 0;
    const finish = () => { ws.close(); res({ dels: dels.map((d) => d.id), results }); };
    const t = setTimeout(finish, 20000);
    ws.on('message', (raw) => {
      const d = JSON.parse(raw);
      if (d[0] === 'AUTH') {
        ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, jjSk)]));
        setTimeout(async () => {
          for (const del of dels) { ws.send(JSON.stringify(['EVENT', del])); await new Promise((r) => setTimeout(r, 400)); }
        }, 500);
      } else if (d[0] === 'OK' && sent.has(d[1])) {
        results.push({ del: d[1].slice(0, 8), accepted: d[2], reason: d[3] || '' });
        if (++okCount >= dels.length) { clearTimeout(t); finish(); }
      }
    });
    ws.on('error', () => { clearTimeout(t); finish(); });
  });
}

async function main() {
  console.log(`junkiejarvis pub: ${JJ_PUB.slice(0, 6)}…${JJ_PUB.slice(-4)}`);
  console.log(`operator/john pub: ${OP_PUB.slice(0, 6)}…${OP_PUB.slice(-4)}`);
  console.log(`channel: ${CHANNEL.slice(0, 8)}…  relay: ${RELAY}\n`);

  const all = await queryChannel();
  const jjAll = all.filter((e) => e.pubkey === JJ_PUB);
  const johnAll = all.filter((e) => e.pubkey === OP_PUB);
  const toDelete = jjAll.filter((e) => isQA(e.content));
  const jjKept = jjAll.filter((e) => !isQA(e.content));

  console.log(`total kind-42 in channel: ${all.length}`);
  console.log(`  by junkiejarvis: ${jjAll.length}  (QA-match: ${toDelete.length}, non-QA kept: ${jjKept.length})`);
  console.log(`  by john (operator, KEEP): ${johnAll.length}`);
  console.log(`  by others: ${all.length - jjAll.length - johnAll.length}\n`);

  console.log('=== DRY-RUN: QA posts to DELETE (junkiejarvis, pattern-matched) ===');
  for (const e of toDelete.sort((a, b) => a.created_at - b.created_at)) {
    console.log(`  ${e.id.slice(0, 8)}  ${title(e.content)}`);
  }
  if (jjKept.length) {
    console.log('\n=== junkiejarvis posts NOT matched (kept — review if unexpected) ===');
    for (const e of jjKept) console.log(`  ${e.id.slice(0, 8)}  ${title(e.content)}`);
  }
  console.log('\n=== john posts (always kept) ===');
  for (const e of johnAll.sort((a, b) => a.created_at - b.created_at)) {
    console.log(`  ${e.id.slice(0, 8)}  ${title(e.content)}`);
  }

  if (!APPLY) {
    console.log('\n(dry run — pass --apply to publish NIP-09 deletions)');
    return;
  }
  if (!toDelete.length) { console.log('\nnothing to delete.'); return; }

  console.log(`\n=== APPLY: publishing NIP-09 kind-5 deletions for ${toDelete.length} events ===`);
  const { dels, results } = await publishDeletions(toDelete.map((e) => e.id));
  console.log(`kind-5 events published: ${dels.map((d) => d.slice(0, 8)).join(', ')}`);
  for (const r of results) console.log(`  del ${r.del} accepted=${r.accepted} ${r.reason}`);

  console.log('\nwaiting 6s then re-querying to confirm relay honoured deletion…');
  await new Promise((r) => setTimeout(r, 6000));
  const after = await queryChannel();
  const stillThere = toDelete.filter((e) => after.some((a) => a.id === e.id));
  console.log(`\nre-query: ${after.filter((e) => e.pubkey === JJ_PUB).length} junkiejarvis kind-42 remain`);
  if (stillThere.length === 0) {
    console.log('SUCCESS: all QA posts gone — relay honours NIP-09.');
  } else {
    console.log(`WARNING: ${stillThere.length} QA posts STILL present — relay did NOT honour NIP-09:`);
    for (const e of stillThere) console.log(`  ${e.id.slice(0, 8)}  ${title(e.content)}`);
    console.log('Fall back to operator-admin moderation delete.');
  }
  // Confirm john's threads survive.
  const johnAfter = after.filter((e) => e.pubkey === OP_PUB);
  console.log(`john posts after: ${johnAfter.length} (must be unchanged: ${johnAll.length})`);
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
