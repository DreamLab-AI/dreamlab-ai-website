// Read-only: list all kind-40 section channels on the relay (operator-authed),
// with their `section` tag — to see which zone each maps to and spot orphans.
//   node scripts/seed/list-channels.mjs
import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';

const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const sk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);

const channels = [];
await new Promise((res) => {
  const ws = new WebSocket(RELAY_WS);
  const sub = 'ch' + now();
  const t = setTimeout(() => { ws.close(); res(); }, 14000);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === 'AUTH') {
      ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, sk)]));
      setTimeout(() => ws.send(JSON.stringify(['REQ', sub, { kinds: [40], limit: 200 }])), 500);
    } else if (d[0] === 'EVENT' && d[1] === sub) {
      const ev = d[2];
      const section = (ev.tags.find((x) => x[0] === 'section') || [])[1] || '(none)';
      let name = ''; try { name = JSON.parse(ev.content).name || ''; } catch {}
      channels.push({ id: ev.id.slice(0, 12), section, name, created: ev.created_at });
    } else if (d[0] === 'EOSE' && d[1] === sub) { clearTimeout(t); ws.close(); res(); }
  };
  ws.onerror = () => { clearTimeout(t); res(); };
});

channels.sort((a, b) => a.section.localeCompare(b.section));
const byPrefix = {};
for (const c of channels) { const p = c.section.split('-')[0]; (byPrefix[p] ||= []).push(c); }
console.log(`total kind-40 channels: ${channels.length}\n`);
for (const [p, list] of Object.entries(byPrefix)) {
  console.log(`[${p}]  (${list.length})`);
  for (const c of list) console.log(`   ${c.id}  section=${c.section}  "${c.name}"`);
}
