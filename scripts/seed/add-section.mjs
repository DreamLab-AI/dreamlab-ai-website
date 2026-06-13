// Publish ONE section channel (kind-40) + map it to a zone. Reliable single-
// event publish on its own connection (under the relay's per-IP/per-sec limits)
// — used to add a straggler that a bulk reseed dropped.
//
//   node scripts/seed/add-section.mjs <slug> <name> <zone> [about]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent } from 'nostr-tools/pure';

const [slug, name, zone, about = ''] = process.argv.slice(2);
if (!slug || !name || !zone) { console.error('usage: add-section.mjs <slug> <name> <zone> [about]'); process.exit(1); }

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

const ev = finalizeEvent({ kind: 40, created_at: now(), tags: [['section', slug]], content: JSON.stringify({ name, about, picture: '' }) }, sk);
await new Promise((res, rej) => {
  const ws = new WebSocket(RELAY_WS);
  const t = setTimeout(() => { ws.close(); res('timeout'); }, 12000);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === 'AUTH') { ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, sk)])); setTimeout(() => ws.send(JSON.stringify(['EVENT', ev])), 500); }
    else if (d[0] === 'OK' && d[1] === ev.id) { clearTimeout(t); console.log('publish OK:', d[1].slice(0, 8), d[2]); ws.close(); res('ok'); }
  };
  ws.onerror = (e) => { clearTimeout(t); rej(e); };
});
const body = JSON.stringify({ channel_id: ev.id, zone });
const r = await fetch(RELAY_HTTP + '/api/admin/channel-zone', { method: 'POST', headers: { Authorization: nip98(RELAY_HTTP + '/api/admin/channel-zone', 'POST', body), 'Content-Type': 'application/json' }, body });
console.log('zone-map status:', r.status, '| channel', ev.id.slice(0, 8), '->', zone);
