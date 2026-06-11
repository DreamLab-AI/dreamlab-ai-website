import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const POD = 'https://dreamlab-pod-api.solitary-paper-764d.workers.dev';
const k = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const sk = Uint8Array.from(Buffer.from(k['friends-carol'].privkey, 'hex'));
const pk = getPublicKey(sk);
const now = () => Math.floor(Date.now() / 1000);
function nip98(url, method, body) {
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', createHash('sha256').update(body).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent({ kind: 27235, created_at: now(), tags, content: '' }, sk))).toString('base64');
}
const SOUL = `# SOUL.md — Carol's personal agent

You are Carol's personal agent on the DreamLab forum. Carol (handle: carol) is a
member of the Friends zone. You act on her behalf: triage her pod inbox, draft
replies, organise her calendar, and answer her questions.

Voice: warm, concise, a little dry. Carol likes vinyl listening nights, the
dreamlab venue, and Friday evenings. Never act outside Carol's interests;
escalate anything needing forum-admin power to "ask john". When her pod inbox
has something needing attention, summarise it for her in one line.
`;
// PUT SOUL.md into carol's pod public/agent/ (readable by her agent in the prototype)
for (const path of ['public/agent/SOUL.md', 'private/agent/SOUL.md']) {
  const url = `${POD}/pods/${pk}/${path}`;
  const r = await fetch(url, { method: 'PUT', headers: { Authorization: nip98(url, 'PUT', SOUL), 'Content-Type': 'text/markdown' }, body: SOUL });
  console.log(`PUT ${path}: ${r.status} ${r.ok ? 'OK' : await r.text().catch(()=>'')}`.slice(0, 90));
}
// read it back (public, authed)
const rurl = `${POD}/pods/${pk}/public/agent/SOUL.md`;
const rb = await fetch(rurl, { headers: { Authorization: nip98(rurl, 'GET') } });
console.log(`GET back: ${rb.status}, ${rb.ok ? (await rb.text()).split('\n')[0] : 'fail'}`);
console.log('carol pubkey:', pk);
