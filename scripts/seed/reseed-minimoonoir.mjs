// Reseed the Minimoonoir zone after the friends->minimoonoir zone-id rename:
//  - kind-5 delete the orphaned friends-* channels (kind-40 section tag is
//    immutable, so they can't be re-bucketed; they fall into the catch-all
//    zone in the client). Operator authored them, so the delete is valid.
//  - create 4 minimoonoir-* channels + zone-map each to `minimoonoir`.
// Operator-signed (AGENTBOX_PRIVKEY_HEX). Run with --apply to mutate.
//   node scripts/seed/reseed-minimoonoir.mjs --apply
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent } from 'nostr-tools/pure';

const APPLY = process.argv.includes('--apply');
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const sk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);
const nip98 = (url, m, b) => {
  const t = [['u', url], ['method', m]];
  if (b) t.push(['payload', createHash('sha256').update(b).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent({ kind: 27235, created_at: now(), tags: t, content: '' }, sk))).toString('base64');
};

const NEW = [
  { slug: 'minimoonoir-rants', name: 'Rants', about: 'Vent, debate, and hot takes' },
  { slug: 'minimoonoir-photos', name: 'Photos', about: 'Share photos and moments' },
  { slug: 'minimoonoir-music', name: 'Music', about: 'Records, gigs, and recommendations' },
  { slug: 'minimoonoir-fairfield-events', name: 'Fairfield Events', about: 'Events and nights out at Fairfield' },
];

// Single authed socket: collect kind-40, then delete orphans + publish new.
function run() {
  return new Promise((res) => {
    const ws = new WebSocket(RELAY_WS);
    const sub = 'rs' + now();
    const orphans = [];
    const sent = new Set();
    let phase = 'auth';
    const done = () => { ws.close(); res({ orphans }); };
    const t = setTimeout(done, 30000);
    ws.onmessage = async (m) => {
      const d = JSON.parse(m.data);
      if (d[0] === 'AUTH') {
        ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, sk)]));
        setTimeout(() => ws.send(JSON.stringify(['REQ', sub, { kinds: [40], limit: 200 }])), 500);
      } else if (d[0] === 'EVENT' && d[1] === sub) {
        const ev = d[2];
        const section = (ev.tags.find((x) => x[0] === 'section') || [])[1] || '';
        if (section.startsWith('friends-')) orphans.push({ id: ev.id, section });
      } else if (d[0] === 'EOSE' && d[1] === sub) {
        console.log(`orphans found: ${orphans.map((o) => o.section).join(', ') || '(none)'}`);
        if (!APPLY) { console.log('(dry run — pass --apply to mutate)'); clearTimeout(t); return done(); }
        phase = 'delete';
        for (const o of orphans) {
          const del = finalizeEvent({ kind: 5, created_at: now(), tags: [['e', o.id]], content: 'orphaned by friends->minimoonoir zone rename' }, sk);
          sent.add(del.id);
          ws.send(JSON.stringify(['EVENT', del]));
          await new Promise((r) => setTimeout(r, 350));
        }
        phase = 'create';
        for (const c of NEW) {
          const ev = finalizeEvent({ kind: 40, created_at: now(), tags: [['section', c.slug]], content: JSON.stringify({ name: c.name, about: c.about, picture: '' }) }, sk);
          c.id = ev.id; sent.add(ev.id);
          ws.send(JSON.stringify(['EVENT', ev]));
          await new Promise((r) => setTimeout(r, 400));
        }
        setTimeout(async () => {
          // zone-map the new channels
          for (const c of NEW) {
            const body = JSON.stringify({ channel_id: c.id, zone: 'minimoonoir' });
            const r = await fetch(RELAY_HTTP + '/api/admin/channel-zone', { method: 'POST', headers: { Authorization: nip98(RELAY_HTTP + '/api/admin/channel-zone', 'POST', body), 'Content-Type': 'application/json' }, body });
            console.log(`zone-map ${c.slug} -> minimoonoir: ${r.status}`);
          }
          clearTimeout(t); done();
        }, 1500);
      } else if (d[0] === 'OK' && sent.has(d[1])) {
        console.log(`  ${phase} OK ${d[1].slice(0, 8)} accepted=${d[2]} ${d[3] || ''}`);
      }
    };
    ws.onerror = () => { clearTimeout(t); done(); };
  });
}
await run();
console.log('done');
