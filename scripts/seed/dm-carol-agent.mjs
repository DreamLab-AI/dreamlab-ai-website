import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { wrapEvent, unwrapEvent } from 'nostr-tools/nip59';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const CAROL_AGENT = 'f8c798c686428606c71cf3348a401c7d90b25633d6c818b08e30d473f4082533';
const k = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const sk = Uint8Array.from(Buffer.from(k['friends-carol'].privkey, 'hex')); // carol DMs her own agent
const me = getPublicKey(sk);
const now = () => Math.floor(Date.now() / 1000);
const QUESTION = 'Hey — what kind of event should I throw this weekend, and where?';
const ws = new WebSocket(RELAY);
let sent = false;
setTimeout(() => { console.log('TIMEOUT — no reply from carol-agent'); process.exit(1); }, 60000);
ws.onmessage = async (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind:22242, created_at:now(), tags:[['relay',RELAY],['challenge',d[1]]], content:'' }, sk)]));
    setTimeout(() => {
      ws.send(JSON.stringify(['REQ','dm',{ kinds:[1059], '#p':[me], since: now()-2 }]));
      const rumor = { kind:14, created_at:now(), tags:[['p',CAROL_AGENT]], content: QUESTION, pubkey: me };
      const wrap = wrapEvent(rumor, sk, CAROL_AGENT);
      ws.send(JSON.stringify(['EVENT', wrap]));
      sent = true; console.log('carol → her agent:', JSON.stringify(QUESTION));
    }, 700);
  } else if (d[0]==='OK' && sent) { /* ack */ }
  else if (d[0]==='EVENT' && d[1]==='dm') {
    try { const r = unwrapEvent(d[2], sk);
      if (r && r.pubkey === CAROL_AGENT) {
        console.log('\nCAROL-AGENT REPLIED:'); console.log('  ' + JSON.stringify(r.content)); console.log('  length:', r.content.length, 'chars');
        process.exit(0);
      }
    } catch {}
  }
};
