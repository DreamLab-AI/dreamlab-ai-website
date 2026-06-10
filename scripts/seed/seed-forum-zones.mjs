// Seed the freshly-wiped DreamLab forum with the four-zone test fixture.
// - whitelists test users into family/friends/business cohorts (NIP-98 admin)
// - creates one NIP-28 channel (kind 40) per zone, maps it via /api/admin/channel-zone
// - posts kind-42 messages as each tier user (validates write gates)
// - publishes NIP-52 calendar events exercising the §4 projection matrix
// - re-indexes search with real BGE embeddings
// Admin privkey is read from agentbox/.env (AGENTBOX_PRIVKEY_HEX) and never printed.
// Generated test keypairs are written to scripts/seed/.test-keys.json (gitignored).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const SEARCH = 'https://dreamlab-search-api.solitary-paper-764d.workers.dev';

const envText = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const adminSk = Uint8Array.from(Buffer.from(envText.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const adminPk = getPublicKey(adminSk);
if (adminPk !== '11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c') throw new Error('admin key mismatch');

// ── test identities ─────────────────────────────────────────────────────────
const users = {};
for (const [label, cohorts] of [
  ['family-dave', ['family']],
  ['friends-carol', ['friends']],
  ['business-bob', ['business']],
]) {
  const sk = randomBytes(32);
  users[label] = { sk: Uint8Array.from(sk), pk: getPublicKey(Uint8Array.from(sk)), cohorts };
}
writeFileSync(new URL('./.test-keys.json', import.meta.url), JSON.stringify(
  Object.fromEntries(Object.entries(users).map(([l, u]) => [l, { privkey: Buffer.from(u.sk).toString('hex'), pubkey: u.pk, cohorts: u.cohorts }])), null, 2));

// ── NIP-98 signed fetch ─────────────────────────────────────────────────────
function nip98(sk, url, method, bodyStr) {
  const tags = [['u', url], ['method', method]];
  if (bodyStr) tags.push(['payload', createHash('sha256').update(bodyStr).digest('hex')]);
  const ev = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags, content: '' }, sk);
  return 'Nostr ' + Buffer.from(JSON.stringify(ev)).toString('base64');
}
async function adminPost(path, body) {
  const url = RELAY_HTTP + path;
  const bodyStr = JSON.stringify(body);
  const r = await fetch(url, { method: 'POST', headers: { Authorization: nip98(adminSk, url, 'POST', bodyStr), 'Content-Type': 'application/json' }, body: bodyStr });
  const j = await r.json().catch(() => ({}));
  console.log(`${path} -> ${r.status} ${JSON.stringify(j).slice(0, 140)}`);
  return { status: r.status, json: j };
}

// ── WS publish ──────────────────────────────────────────────────────────────
function publish(events) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_WS);
    const acks = new Map();
    const timer = setTimeout(() => { ws.close(); reject(new Error('ws timeout; acks: ' + JSON.stringify([...acks]))); }, 20000);
    ws.onopen = () => { for (const ev of events) ws.send(JSON.stringify(['EVENT', ev])); };
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d[0] === 'OK') {
        acks.set(d[1], { ok: d[2], msg: d[3] || '' });
        if (acks.size === events.length) { clearTimeout(timer); ws.close(); resolve(acks); }
      }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(e); };
  });
}
const now = () => Math.floor(Date.now() / 1000);

// ── main ────────────────────────────────────────────────────────────────────
// 1. whitelist: admin (all cohorts incl agent for public write) + test users
await adminPost('/api/whitelist/add', { pubkey: adminPk, cohorts: ['family', 'friends', 'business', 'agent'] });
for (const u of Object.values(users)) await adminPost('/api/whitelist/add', { pubkey: u.pk, cohorts: u.cohorts });

// 2. channels (kind 40) — one per zone, signed by admin
const zones = ['public', 'friends', 'family', 'business'];
const chanNames = { public: 'Public', friends: 'Friends', family: 'Family', business: 'Business' };
const channels = {};
const chanEvents = zones.map((z) => {
  const ev = finalizeEvent({ kind: 40, created_at: now(), tags: [['section', z]], content: JSON.stringify({ name: chanNames[z], about: `${z} zone channel`, picture: '' }) }, adminSk);
  channels[z] = ev.id;
  return ev;
});
console.log('channel publish:', Object.fromEntries([...(await publish(chanEvents))].map(([id, v]) => [id.slice(0, 8), v.ok])));

// 3. map channel -> zone
for (const z of zones) await adminPost('/api/admin/channel-zone', { channel_id: channels[z], zone: z });

// 4. kind-42 posts AS each tier user (validates the write gate per zone)
const msg = (sk, zone, text) => finalizeEvent({ kind: 42, created_at: now(), tags: [['e', channels[zone], RELAY_WS, 'root'], ['section', zone]], content: text }, sk);
const posts = [
  msg(users['friends-carol'].sk, 'public', 'Welcome to MiniMooNoir — the public landing. Music, photos, events.'),
  msg(users['friends-carol'].sk, 'friends', 'Friends-only: planning the next listening session — who is around this weekend?'),
  msg(users['family-dave'].sk, 'family', 'Family-only: shall we book Fairfield for the reunion in July?'),
  msg(users['business-bob'].sk, 'business', 'Training cohort: tomorrow we cover the agentic pipeline modules.'),
  msg(adminSk, 'family', 'Admin checking in on the family room.'),
];
console.log('posts publish:', Object.fromEntries([...(await publish(posts))].map(([id, v]) => [id.slice(0, 8), `${v.ok}${v.msg ? ':' + v.msg : ''}`])));

// negative write check: business-bob attempts to post into family (must be rejected)
try {
  const bad = msg(users['business-bob'].sk, 'family', 'I should not be able to post here.');
  const res = await publish([bad]);
  console.log('NEGATIVE business->family write:', JSON.stringify([...res][0][1]));
} catch (e) { console.log('NEGATIVE business->family write: rejected (no OK):', e.message.slice(0, 80)); }

// 5. calendar events (kind 31923) — exercising the §4 projection matrix
const cal = (sk, zone, venue, title, start, end, extra = []) => finalizeEvent({
  kind: 31923, created_at: now(),
  tags: [['d', `${zone}-${title.toLowerCase().replace(/\s+/g, '-')}`], ['title', title], ['start', String(start)], ['end', String(end)], ['zone', zone], ...(venue ? [['venue', venue]] : []), ...extra],
  content: `${title} — details visible per tier`,
}, sk);
const day = 86400;
const calEvents = [
  cal(adminSk, 'family', 'fairfield', 'Family Reunion', now() + 30 * day, now() + 32 * day),       // friends => free/busy
  cal(adminSk, 'business', 'dreamlab', 'Corporate Training Week', now() + 14 * day, now() + 19 * day), // friends => free/busy
  cal(adminSk, 'family', null, 'Family Dinner Offsite', now() + 7 * day, now() + 7 * day + 7200),  // friends => OMIT
  cal(users['friends-carol'].sk, 'friends', 'dreamlab', 'Vinyl Listening Night', now() + 10 * day, now() + 10 * day + 14400), // friends => full
];
console.log('calendar publish:', Object.fromEntries([...(await publish(calEvents))].map(([id, v]) => [id.slice(0, 8), `${v.ok}${v.msg ? ':' + v.msg : ''}`])));

// 6. search re-index with real BGE embeddings
const texts = posts.slice(0, 4).map((p) => p.content);
const er = await fetch(SEARCH + '/embed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts }) });
const ej = await er.json();
console.log('embed:', er.status, 'model:', ej.model);
if (ej.embeddings?.length) {
  const ingestUrl = SEARCH + '/ingest';
  const ingestBody = JSON.stringify({ entries: ej.embeddings.map((e, i) => ({ id: posts[i].id, embedding: e })) });
  const ir = await fetch(ingestUrl, { method: 'POST', headers: { Authorization: nip98(adminSk, ingestUrl, 'POST', ingestBody), 'Content-Type': 'application/json' }, body: ingestBody });
  console.log('ingest:', ir.status, JSON.stringify(await ir.json().catch(() => ({}))).slice(0, 140));
}

console.log('\nSEED COMPLETE');
console.log('channels:', JSON.stringify(channels, null, 2));
console.log('test users:', Object.fromEntries(Object.entries(users).map(([l, u]) => [l, u.pk.slice(0, 16) + '…'])));
