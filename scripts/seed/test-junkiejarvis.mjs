// Live E2E: as carol, post a kind-42 in the friends channel p-tagging
// JunkieJarvis, then listen for his kind-42 reply.
import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const JJ = '2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9';
const CH = '0bf49b70d978d50a9a6679e8ebff85f163d84e8641ff6b9cd7d42897f4d977b9'; // friends channel
const keys = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['friends-carol'].privkey, 'hex'));
const me = getPublicKey(sk);
const now = () => Math.floor(Date.now() / 1000);
const ws = new WebSocket(RELAY);
let sent = false; const t0 = Date.now();
setTimeout(() => { console.log('TIMEOUT after 60s — no reply from JunkieJarvis'); process.exit(1); }, 60000);
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d[0] === 'AUTH') {
    ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' }, sk)]));
    setTimeout(() => {
      // subscribe for JJ replies in the channel
      ws.send(JSON.stringify(['REQ', 'jj', { kinds: [42], authors: [JJ], since: now() - 5 }]));
      // post the mention
      const msg = finalizeEvent({ kind: 42, created_at: now(), tags: [['e', CH, RELAY, 'root'], ['section', 'friends'], ['p', JJ]], content: '@junkiejarvis what zones exist on this forum, and can you plan a vinyl listening night next Friday 7pm at dreamlab for the friends?' }, sk);
      ws.send(JSON.stringify(['EVENT', msg]));
      console.log('mention posted as carol:', msg.id.slice(0, 8));
      sent = true;
    }, 700);
  } else if (d[0] === 'OK' && sent) {
    console.log('relay ack:', d[2] ? 'accepted' : 'REJECTED ' + (d[3] || ''));
  } else if (d[0] === 'EVENT' && d[1] === 'jj') {
    const e = d[2];
    console.log(`\nJUNKIEJARVIS REPLIED (+${((Date.now()-t0)/1000).toFixed(1)}s):`);
    console.log('  kind:', e.kind, '| p-tags-me:', e.tags.some(t => t[0]==='p' && t[1]===me), '| in-channel:', e.tags.some(t => t[0]==='e' && t[1]===CH));
    console.log('  content:', JSON.stringify(e.content));
    console.log('  length:', e.content.length, 'chars');
    process.exit(0);
  }
};
