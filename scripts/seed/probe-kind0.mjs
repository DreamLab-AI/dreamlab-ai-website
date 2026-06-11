import { readFileSync } from 'node:fs';
import { finalizeEvent } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const keys = JSON.parse(readFileSync('/home/devuser/workspace/dreamlab-ai-website/scripts/seed/.test-keys.json', 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['friends-carol'].privkey, 'hex'));
const ws = new WebSocket(RELAY);
const k0 = [];
setTimeout(() => { console.log('kind-0 events:', k0.length); for (const e of k0) { let n=''; try{n=JSON.parse(e.content).name||JSON.parse(e.content).display_name||'(no name)';}catch{n='(parse fail)';} console.log(`  pk=${e.pubkey.slice(0,8)} name="${n}" content=${e.content.slice(0,80)}`);} process.exit(0); }, 12000);
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') { const ev = finalizeEvent({ kind:22242, created_at:Math.floor(Date.now()/1000), tags:[['relay',RELAY],['challenge',d[1]]], content:'' }, sk); ws.send(JSON.stringify(['AUTH',ev])); setTimeout(()=>ws.send(JSON.stringify(['REQ','k0',{kinds:[0]}])),600); }
  else if (d[0]==='EVENT') k0.push(d[2]);
  else if (d[0]==='EOSE') { console.log('kind-0 events:', k0.length); for (const e of k0){let n='';try{const c=JSON.parse(e.content);n=c.name||c.display_name||'(no name)';}catch{n='(parse fail)';}console.log(`  pk=${e.pubkey.slice(0,8)} name="${n}"`);} process.exit(0); }
};
