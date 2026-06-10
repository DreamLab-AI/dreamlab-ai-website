import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const keys = JSON.parse(readFileSync('/home/devuser/workspace/dreamlab-ai-website/scripts/seed/.test-keys.json', 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['friends-carol'].privkey, 'hex'));
const ws = new WebSocket(RELAY);
const evs = [];
let authed = false;
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 15000);
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now()/1000), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk);
    ws.send(JSON.stringify(['AUTH', ev]));
    authed = true;
    setTimeout(() => ws.send(JSON.stringify(['REQ', 'q', { kinds: [40, 42] }])), 800);
  } else if (d[0] === 'EVENT') evs.push(d[2]);
  else if (d[0] === 'EOSE') {
    console.log(`authed=${authed} got=${evs.length}`);
    for (const e of evs) {
      const sec = (e.tags.find(t => t[0] === 'section') || [])[1];
      const etag = (e.tags.find(t => t[0] === 'e') || [])[1];
      console.log(`  kind=${e.kind} section=${sec || '-'} e=${(etag||'').slice(0,8)} content=${e.content.slice(0,50)}`);
    }
    process.exit(0);
  }
};
