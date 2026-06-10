import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const keys = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['friends-carol'].privkey, 'hex'));
const CH = process.argv[2]; // friends channel id
const ws = new WebSocket(RELAY);
let phase = 0; const out = {};
setTimeout(() => { console.log(JSON.stringify(out)); process.exit(0); }, 12000);
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now()/1000), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk);
    ws.send(JSON.stringify(['AUTH', ev]));
    setTimeout(() => ws.send(JSON.stringify(['REQ', 'etag', { kinds: [42], '#e': [CH] }])), 600);
  } else if (d[0] === 'EVENT') (out[d[1]] ||= []).push(d[2].content.slice(0, 40));
  else if (d[0] === 'EOSE') {
    if (d[1] === 'etag' && phase === 0) { phase = 1; ws.send(JSON.stringify(['REQ', 'plain', { kinds: [42] }])); }
    else { console.log(JSON.stringify(out)); process.exit(0); }
  }
};
