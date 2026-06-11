// Derive the deterministic mirror child key from the operator key
// (HMAC-SHA256(op_sk, tag)), whitelist it, publish its kind-0, and write the
// child nsec to a 600-perm file for out-of-band phone import. Prints ONLY npub.
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { createHmac, createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { nsecEncode, npubEncode } from 'nostr-tools/nip19';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const opSk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const TAG = 'agentbox-mirror-v1';
const childSk = Uint8Array.from(createHmac('sha256', Buffer.from(opSk)).update(TAG).digest());
const childPk = getPublicKey(childSk);
const now = () => Math.floor(Date.now() / 1000);
function nip98(url, method, body) { const tags=[['u',url],['method',method]]; if(body)tags.push(['payload',createHash('sha256').update(body).digest('hex')]); return 'Nostr '+Buffer.from(JSON.stringify(finalizeEvent({kind:27235,created_at:now(),tags,content:''},opSk))).toString('base64'); }
// 1. whitelist the child (cohort agent so it can read its own gift wraps)
const wurl = RELAY_HTTP + '/api/whitelist/add';
const wbody = JSON.stringify({ pubkey: childPk, cohorts: ['agent'] });
const wr = await fetch(wurl, { method:'POST', headers:{Authorization:nip98(wurl,'POST',wbody),'Content-Type':'application/json'}, body:wbody });
console.log('whitelist child:', wr.status);
// 2. kind-0 identity for the child (signed by child)
const kind0 = finalizeEvent({ kind:0, created_at:now(), tags:[], content: JSON.stringify({ name:'agentbox-mirror', display_name:'AgentBox Session Mirror', about:'Read-only mirror of this agentbox’s Claude Code sessions. Self-DM thread. Derived child key — not the operator identity.', bot:true }) }, childSk);
await new Promise((res,rej)=>{ const ws=new WebSocket(RELAY_WS); setTimeout(()=>rej(new Error('timeout')),15000); ws.onmessage=(m)=>{const d=JSON.parse(m.data); if(d[0]==='AUTH'){ws.send(JSON.stringify(['AUTH',finalizeEvent({kind:22242,created_at:now(),tags:[['relay',RELAY_WS],['challenge',d[1]]],content:''},childSk)]));setTimeout(()=>ws.send(JSON.stringify(['EVENT',kind0])),500);} else if(d[0]==='OK'){console.log('child kind-0:',d[2]?'ACCEPTED':'REJECTED');ws.close();res();}}; });
// 3. write nsec to a 600 file for out-of-band phone import (never printed)
const dir = '/home/devuser/.claude/nostr-mirror';
mkdirSync(dir, { recursive: true });
const f = `${dir}/mirror-key.txt`;
writeFileSync(f, `# AgentBox Session Mirror — derived child key (tag ${TAG})\n# Import this nsec into Amethyst, set the relay to ${RELAY_WS} ONLY,\n# then DELETE THIS FILE. Re-derivable anytime from the operator key.\nnsec: ${nsecEncode(childSk)}\nnpub: ${npubEncode(childPk)}\nhex_pubkey: ${childPk}\n`);
chmodSync(f, 0o600);
console.log('child npub:', npubEncode(childPk));
console.log('nsec written (mode 600):', f);
