// Reseed the forum SECTION channels (NIP-28 kind-40) for all four zones.
//
// Sections are NOT in dreamlab.toml — they are kind-40 channels on the relay,
// tagged ["section", <slug>] (prefix-routed to a zone) and mapped via
// POST /api/admin/channel-zone. This script is the version-controlled source of
// truth for the section set; re-run it after `DELETE FROM events WHERE kind=40`
// to reset the boards. Signed by the power-user admin key (AGENTBOX_PRIVKEY_HEX).
//
// Casing: dreamlab (business) sections are lowercase per operator direction;
// all other zones use normal caps.
//
//   node scripts/seed/reseed-sections.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';

const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const adminSk = Uint8Array.from(
  Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'),
);
const adminPk = getPublicKey(adminSk);
const now = () => Math.floor(Date.now() / 1000);

function nip98(url, method, body) {
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', createHash('sha256').update(body).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(
    finalizeEvent({ kind: 27235, created_at: now(), tags, content: '' }, adminSk),
  )).toString('base64');
}

async function adminPost(path, obj) {
  const url = RELAY_HTTP + path;
  const body = JSON.stringify(obj);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: nip98(url, 'POST', body), 'Content-Type': 'application/json' },
    body,
  });
  return r.status;
}

function publish(events) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_WS);
    const acks = new Map();
    // Resolve (not reject) on timeout with whatever acked, so the zone-mapping
    // step still runs even if a relay OK is dropped. Channel events are sent
    // best-effort; the mapping loop keys off the computed ids regardless.
    const t = setTimeout(() => { ws.close(); resolve(acks); }, 12000);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d[0] === 'AUTH') {
        ws.send(JSON.stringify(['AUTH', finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, adminSk)]));
        // Stagger sends (~300ms apart) to stay under the relay's per-connection
        // event rate limit — a tight burst of 12 was throttling the last couple.
        setTimeout(() => { events.forEach((ev, i) => setTimeout(() => ws.send(JSON.stringify(['EVENT', ev])), i * 300)); }, 500);
      } else if (d[0] === 'OK' && events.some((e) => e.id === d[1])) {
        // Only count OKs for events we sent — the relay also OKs the NIP-42
        // AUTH (kind-22242), which otherwise fills the count one short.
        acks.set(d[1], d[2]);
        if (acks.size === events.length) { clearTimeout(t); ws.close(); resolve(acks); }
      }
    };
    ws.onerror = (e) => { clearTimeout(t); reject(e); };
  });
}

// zone, slug (lowercase kebab, prefix-routed), display name, about
const SECTIONS = [
  // public / Landing
  { zone: 'public', slug: 'public-support',          name: 'Support',          about: 'Help, questions, and support' },
  { zone: 'public', slug: 'public-introductions',    name: 'Introductions',    about: 'Say hello — who you are and what you make' },
  // minimoonoir (social zone — formerly 'friends'; zone id renamed, cohort 'friends' kept)
  { zone: 'minimoonoir', slug: 'minimoonoir-rants',           name: 'Rants',            about: 'Vent, debate, and hot takes' },
  { zone: 'minimoonoir', slug: 'minimoonoir-photos',          name: 'Photos',           about: 'Share photos and moments' },
  { zone: 'minimoonoir', slug: 'minimoonoir-music',           name: 'Music',            about: 'Records, gigs, and recommendations' },
  { zone: 'minimoonoir', slug: 'minimoonoir-fairfield-events', name: 'Fairfield Events', about: 'Events and nights out at Fairfield' },
  // family
  { zone: 'family', slug: 'family-chat',              name: 'Family Chat',      about: 'Family catch-up and chat' },
  { zone: 'family', slug: 'family-fairfield-events',  name: 'Fairfield Events', about: 'Family events at Fairfield' },
  // business / dreamlab (lowercase display per operator direction)
  { zone: 'business', slug: 'business-dream-team-chat',   name: 'dream team chat',   about: 'team chat' },
  { zone: 'business', slug: 'business-training-and-lab',  name: 'training and lab',  about: 'training and lab work' },
  { zone: 'business', slug: 'business-projects',          name: 'projects',          about: 'active project discussion' },
  { zone: 'business', slug: 'business-chat-with-agents',  name: 'chat with agents',  about: 'talk to the AI agents' },
];

const chanEvents = SECTIONS.map((s) => {
  const ev = finalizeEvent(
    { kind: 40, created_at: now(), tags: [['section', s.slug]], content: JSON.stringify({ name: s.name, about: s.about, picture: '' }) },
    adminSk,
  );
  s.id = ev.id;
  return ev;
});

// Single connection, sends staggered ~300ms apart (see publish()): ~3/sec stays
// well under the relay's 10-events/sec/IP limit, and one connection avoids the
// per-IP connection cap that a connection-per-event approach trips.
const acks = await publish(chanEvents);
console.log('channels:', SECTIONS.map((s) => `${s.slug}:${acks.get(s.id) ? 'ok' : 'FAIL'}`).join('  '));

for (const s of SECTIONS) {
  const st = await adminPost('/api/admin/channel-zone', { channel_id: s.id, zone: s.zone });
  if (st !== 200) console.log('map FAIL', s.slug, st);
}
console.log('zone mappings done — admin pubkey', adminPk.slice(0, 8));
