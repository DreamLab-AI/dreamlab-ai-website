import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const keys = JSON.parse(readFileSync('/home/devuser/workspace/dreamlab-ai-website/scripts/seed/.test-keys.json', 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['family-dave'].privkey, 'hex'));
const CH = 'a7684cbc4b2005b16eefd70537b28d33fb5a71aeff4184a3ea080dbc69c73a5e'; // family channel
const ws = new WebSocket(RELAY);
let phase = 0; const out = { reads: [], ack: null };
setTimeout(() => { console.log(JSON.stringify(out)); process.exit(0); }, 14000);
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now()/1000), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk);
    ws.send(JSON.stringify(['AUTH', ev]));
    setTimeout(() => {
      // 1) write a kind-42 to family as dave
      const post = finalizeEvent({ kind: 42, created_at: Math.floor(Date.now()/1000), tags: [['e', CH, RELAY, 'root'], ['section', 'family']], content: 'probe: dave family write check' }, sk);
      ws.send(JSON.stringify(['EVENT', post]));
    }, 700);
  } else if (d[0] === 'OK') {
    out.ack = { ok: d[2], msg: d[3] || '' };
    // 2) read back via #e
    ws.send(JSON.stringify(['REQ', 'fam', { kinds: [42], '#e': [CH] }]));
  } else if (d[0] === 'EVENT') out.reads.push(d[2].content.slice(0, 45));
  else if (d[0] === 'EOSE') { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
};
