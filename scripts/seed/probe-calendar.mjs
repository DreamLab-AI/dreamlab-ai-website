// Probe: AUTH (NIP-42) as a given user, then REQ kind-31923 — print what the
// relay serves. Usage: node probe-calendar.mjs <label|anon> [--no-auth]
import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';

const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const label = process.argv[2] || 'anon';
const noAuth = process.argv.includes('--no-auth') || label === 'anon';
let sk = null;
if (!noAuth) {
  const keys = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
  if (keys[label]) sk = Uint8Array.from(Buffer.from(keys[label].privkey, 'hex'));
  else if (label === 'admin') {
    const envText = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
    sk = Uint8Array.from(Buffer.from(envText.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
  } else throw new Error('unknown label');
}

const ws = new WebSocket(RELAY);
const events = [];
let authed = false, reqSent = false;
const sendReq = () => { if (!reqSent) { reqSent = true; ws.send(JSON.stringify(['REQ', 'cal', { kinds: [31923] }])); } };
const timer = setTimeout(() => { finish('timeout'); }, 15000);
function finish(why) {
  clearTimeout(timer);
  console.log(`[${label}] authed=${authed} reason=${why} events=${events.length}`);
  for (const e of events) {
    const t = Object.fromEntries(e.tags.filter(x => ['title', 'zone', 'venue', 'busy', 'start'].includes(x[0])).map(x => [x[0], x[1]]));
    console.log(`  kind=${e.kind} sig=${e.sig ? 'yes' : 'EMPTY'} zone=${t.zone || '-'} venue=${t.venue || '-'} busy=${t.busy || '-'} title=${t.title || '(stripped)'} content=${(e.content || '').slice(0, 40) || '(empty)'}`);
  }
  ws.close(); process.exit(0);
}
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH' && sk) {
    const ev = finalizeEvent({ kind: 22242, created_at: Math.floor(Date.now() / 1000), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk);
    ws.send(JSON.stringify(['AUTH', ev]));
    authed = true;
    setTimeout(sendReq, 800); // let AUTH settle before REQ
  } else if (d[0] === 'EVENT' && d[1] === 'cal') events.push(d[2]);
  else if (d[0] === 'EOSE') finish('eose');
  else if (d[0] === 'OK' && authed && !reqSent) sendReq();
};
ws.onopen = () => { if (noAuth) setTimeout(sendReq, 500); /* authed path waits for AUTH challenge */ setTimeout(sendReq, 4000); };
