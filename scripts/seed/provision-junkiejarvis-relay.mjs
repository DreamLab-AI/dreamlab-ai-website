import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const sk = Uint8Array.from(Buffer.from(env.match(/^JUNKIEJARVIS_PRIVKEY_HEX=([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);
const kind0 = finalizeEvent({ kind: 0, created_at: now(), tags: [], content: JSON.stringify({
  name: 'junkiejarvis',
  display_name: 'JunkieJarvis',
  about: 'DreamLab forum agent. DM me or @junkiejarvis in any section to organise calendar events, check venue availability, or ask anything. Brisk, professional, always on.',
  bot: true,
}) }, sk);
await new Promise((resolve, reject) => {
  const ws = new WebSocket(RELAY_WS);
  setTimeout(() => reject(new Error('timeout')), 15000);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d[0] === 'AUTH') { ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, sk)])); setTimeout(() => ws.send(JSON.stringify(['EVENT', kind0])), 600); }
    else if (d[0] === 'OK') { console.log('kind-0 junkiejarvis:', d[2] ? 'ACCEPTED' : 'REJECTED ' + (d[3] || '')); ws.close(); resolve(); }
  };
});
console.log('pubkey:', getPublicKey(sk));
