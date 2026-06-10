import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const envText = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const sk = Uint8Array.from(Buffer.from(envText.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const CH = '0bf49b70d978d50a9a6679e8ebff85f163d84e8641ff6b9cd7d42897f4d977b9'; // friends channel
const ws = new WebSocket(RELAY);
const out = {};
setTimeout(() => { console.log(JSON.stringify(out)); process.exit(0); }, 12000);
let phase = 0;
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now()/1000), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk);
    ws.send(JSON.stringify(['AUTH', ev]));
    setTimeout(() => ws.send(JSON.stringify(['REQ', 'etag', { kinds: [42], '#e': [CH] }])), 600);
  } else if (d[0] === 'EVENT') (out[d[1]] ||= []).push(d[2].content.slice(0, 45));
  else if (d[0] === 'EOSE') {
    if (phase === 0) { phase = 1; ws.send(JSON.stringify(['REQ', 'all42', { kinds: [42] }])); }
    else { console.log('ADMIN sees:', JSON.stringify(out, null, 1)); process.exit(0); }
  }
};
