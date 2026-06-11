import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const ENV = '/home/devuser/workspace/project/agentbox/.env';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync(ENV, 'utf8');
const now = () => Math.floor(Date.now() / 1000);
// generate carol's agent key (privkey never printed), persist to .env
let agentSk, agentPk;
const m = env.match(/^CAROL_AGENT_PRIVKEY_HEX=([0-9a-f]{64})/m);
if (m) { agentSk = Uint8Array.from(Buffer.from(m[1], 'hex')); agentPk = getPublicKey(agentSk); console.log('reuse existing carol-agent key'); }
else {
  const sk = randomBytes(32); agentSk = Uint8Array.from(sk); agentPk = getPublicKey(agentSk);
  appendFileSync(ENV, `\n# Carol's per-user agent (PUAF prototype, ADR-028) — owner d7cfe37e…\nCAROL_AGENT_PRIVKEY_HEX=${sk.toString('hex')}\nCAROL_AGENT_PUBKEY=${agentPk}\n`);
  console.log('generated carol-agent key');
}
// admin-whitelist the agent key (cohort agent) + kind-0
const adminSk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
function nip98(sk, url, method, body) { const tags=[['u',url],['method',method]]; if(body)tags.push(['payload',createHash('sha256').update(body).digest('hex')]); return 'Nostr '+Buffer.from(JSON.stringify(finalizeEvent({kind:27235,created_at:now(),tags,content:''},sk))).toString('base64'); }
const wurl = RELAY_HTTP + '/api/whitelist/add';
const wbody = JSON.stringify({ pubkey: agentPk, cohorts: ['agent', 'friends'] });
const wr = await fetch(wurl, { method:'POST', headers:{Authorization:nip98(adminSk,wurl,'POST',wbody),'Content-Type':'application/json'}, body:wbody });
console.log('whitelist carol-agent:', wr.status);
const kind0 = finalizeEvent({ kind:0, created_at:now(), tags:[], content: JSON.stringify({ name:'carol-agent', display_name:"Carol's Agent", about:"Carol's personal pod-backed agent (PUAF prototype). DM me — I act on Carol's behalf.", bot:true }) }, agentSk);
await new Promise((res,rej)=>{ const ws=new WebSocket(RELAY_WS); setTimeout(()=>rej(new Error('timeout')),15000); ws.onmessage=(mm)=>{const d=JSON.parse(mm.data); if(d[0]==='AUTH'){ws.send(JSON.stringify(['AUTH',finalizeEvent({kind:22242,created_at:now(),tags:[['relay',RELAY_WS],['challenge',d[1]]],content:''},agentSk)]));setTimeout(()=>ws.send(JSON.stringify(['EVENT',kind0])),500);} else if(d[0]==='OK'){console.log('carol-agent kind-0:',d[2]?'ACCEPTED':'REJECTED');ws.close();res();}}; });
console.log('carol-agent pubkey:', agentPk);
