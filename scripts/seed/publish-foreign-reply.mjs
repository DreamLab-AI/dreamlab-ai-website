// QA: publish a fresh kind-42 reply into an existing channel, signed by a
// NON-operator (throwaway) key, so the operator's forum should surface it as a
// notification. Operator-AUTH'd relay write over WS (NIP-42).
//
//   node scripts/seed/publish-foreign-reply.mjs <channelIdPrefix|fullId> [keyName]
//
// Default channel: business-chat-with-agents root id, default key: business-bob.
// Prints the published event id + relay OK so the repro can correlate.
import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import WebSocket from 'ws';

const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const now = () => Math.floor(Date.now() / 1000);

// Channel root ids (full) keyed by 12-char prefix from list-channels.mjs.
const CHANNELS = {
  '04d6fd408977': '04d6fd408977bdd1fb515b4bd97881da1ac7f27291b9539184e12ca974b1bf2f', // business chat with agents
};

const arg = process.argv[2] || '04d6fd408977';
const channelId = CHANNELS[arg] || arg; // accept a full id too
const keyName = process.argv[3] || 'junkiejarvis';

// junkiejarvis is a real whitelisted forum agent (a genuine FOREIGN author the
// operator wants notifications from). Other keys come from .test-keys.json but
// are not relay-whitelisted, so writes are blocked.
let sk;
if (keyName === 'junkiejarvis') {
  const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
  const hex = env.match(/^JUNKIEJARVIS_PRIVKEY_HEX=([0-9a-f]{64})/m)?.[1];
  if (!hex) {
    console.error('JUNKIEJARVIS_PRIVKEY_HEX not found in agentbox/.env');
    process.exit(1);
  }
  sk = Uint8Array.from(Buffer.from(hex, 'hex'));
} else {
  const keys = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
  if (!keys[keyName]) {
    console.error('no key', keyName, 'available:', Object.keys(keys).join(', '));
    process.exit(1);
  }
  sk = Uint8Array.from(Buffer.from(keys[keyName].privkey, 'hex'));
}
const pk = getPublicKey(sk);

const content = `QA foreign reply ${new Date().toISOString()} — does this notify?`;
const ev = finalizeEvent(
  {
    kind: 42,
    created_at: now(),
    tags: [['e', channelId, '', 'root']],
    content,
  },
  sk,
);

const ws = new WebSocket(RELAY);
let okSeen = false;
const t = setTimeout(() => {
  console.log(JSON.stringify({ ok: okSeen, eventId: ev.id, author: pk, channelId, content }));
  ws.close();
  process.exit(okSeen ? 0 : 2);
}, 12000);

ws.on('message', (raw) => {
  const d = JSON.parse(raw);
  if (d[0] === 'AUTH') {
    ws.send(
      JSON.stringify([
        'AUTH',
        finalizeEvent(
          { kind: 22242, created_at: now(), tags: [['relay', RELAY], ['challenge', d[1]]], content: '' },
          sk,
        ),
      ]),
    );
    setTimeout(() => ws.send(JSON.stringify(['EVENT', ev])), 500);
  } else if (d[0] === 'OK' && d[1] === ev.id) {
    okSeen = d[2];
    console.log(JSON.stringify({ ok: d[2], reason: d[3] || '', eventId: ev.id, author: pk, channelId, content }));
    clearTimeout(t);
    ws.close();
    process.exit(d[2] ? 0 : 2);
  }
});
ws.on('error', (e) => {
  console.error('WS error', e.message);
  clearTimeout(t);
  process.exit(3);
});
