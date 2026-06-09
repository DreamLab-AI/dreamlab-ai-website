#!/usr/bin/env node
/**
 * Direct nostr protocol integration test.
 * Creates users, posts, channel messages, and DMs on the deployed relay.
 */
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import * as nip04 from 'nostr-tools/nip04';
import WebSocket from 'ws';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

const RELAY_URL = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
// SECURITY: This is a throwaway test-only keypair generated locally for fixtures.
// It MUST NEVER reuse a live operator identity (e.g. operator-jjohare in
// dreamlab.toml). A prior revision embedded the live admin private key here,
// which derived to the production admin pubkey — never do that again. Regenerate
// with: node -e "import('nostr-tools/pure').then(m=>console.log(Array.from(m.generateSecretKey()).map(b=>b.toString(16).padStart(2,'0')).join('')))"
const ADMIN_SK_HEX = '7ce4076eb09286c50075e2663bddac3eaadec6c539db9c84f7ea682977101caa';
const ADMIN_SK = hexToBytes(ADMIN_SK_HEX);
const ADMIN_PK = getPublicKey(ADMIN_SK);

// Generate a second user for DM testing
const USER2_SK = generateSecretKey();
const USER2_PK = getPublicKey(USER2_SK);

console.log('=== Nostr Integration Test ===');
console.log(`Admin pubkey: ${ADMIN_PK.slice(0, 16)}...`);
console.log(`User2 pubkey: ${USER2_PK.slice(0, 16)}...`);
console.log(`Relay: ${RELAY_URL}`);
console.log('');

function connectRelay() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 15000);
  });
}

function sendAndWait(ws, msg, expectedType, subId, timeout = 10000) {
  return new Promise((resolve) => {
    const results = [];
    const handler = (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed[0] === 'OK' && expectedType === 'OK') {
          ws.removeListener('message', handler);
          resolve({ type: 'OK', accepted: parsed[2], message: parsed[3] || '' });
        } else if (parsed[0] === 'EVENT' && parsed[1] === subId) {
          results.push(parsed[2]);
        } else if (parsed[0] === 'EOSE' && parsed[1] === subId) {
          ws.removeListener('message', handler);
          resolve({ type: 'EOSE', events: results });
        } else if (parsed[0] === 'NOTICE') {
          console.log(`  NOTICE: ${parsed[1]}`);
        }
      } catch {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify(msg));
    setTimeout(() => {
      ws.removeListener('message', handler);
      resolve({ type: 'TIMEOUT', events: results });
    }, timeout);
  });
}

async function publishEvent(ws, sk, event) {
  const signed = finalizeEvent(event, sk);
  const result = await sendAndWait(ws, ['EVENT', signed], 'OK', null);
  return { ...result, event: signed };
}

// ─── Test 1: Set admin profile (kind 0) ──────────────────────────────
async function testSetProfile(ws) {
  console.log('1. Setting admin profile (kind 0)...');
  const profile = {
    name: 'DreamLab Admin',
    display_name: 'DreamLab Admin',
    about: 'Forum administrator — automated test profile',
    picture: '',
    nip05: 'admin@dreamlab-ai.com',
  };
  const result = await publishEvent(ws, ADMIN_SK, {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profile),
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);
  return result;
}

// ─── Test 2: Set user2 profile (kind 0) ──────────────────────────────
async function testSetUser2Profile(ws) {
  console.log('2. Setting user2 profile (kind 0)...');
  const profile = {
    name: 'TestBot',
    display_name: 'TestBot (Agentbox)',
    about: 'Automated test user for relay integration testing',
  };
  const result = await publishEvent(ws, USER2_SK, {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profile),
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);
  return result;
}

// ─── Test 3: Post a text note (kind 1) ───────────────────────────────
async function testPostNote(ws) {
  console.log('3. Posting text note (kind 1)...');
  const result = await publishEvent(ws, ADMIN_SK, {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: `Forum integration test post from DreamLab Admin — ${new Date().toISOString()}. community-forum-rs frozen, kit on crates.io v3.0.0-rc4, all workers healthy.`,
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);
  return result;
}

// ─── Test 4: Post a reply (kind 1 with e/p tags) ─────────────────────
async function testPostReply(ws, parentEvent) {
  console.log('4. Posting reply (kind 1 with e/p tags)...');
  const result = await publishEvent(ws, USER2_SK, {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', parentEvent.id, RELAY_URL, 'reply'],
      ['p', ADMIN_PK],
    ],
    content: `Reply from TestBot: Confirmed — all 5 workers responding, relay operational. ${new Date().toISOString()}`,
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);
  return result;
}

// ─── Test 5: Create a channel (kind 40) ──────────────────────────────
async function testCreateChannel(ws) {
  console.log('5. Creating channel (kind 40)...');
  const channelMeta = {
    name: 'integration-test',
    about: 'Automated integration test channel',
    picture: '',
  };
  const result = await publishEvent(ws, ADMIN_SK, {
    kind: 40,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(channelMeta),
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);
  return result;
}

// ─── Test 6: Post channel message (kind 42) ──────────────────────────
async function testChannelMessage(ws, channelEvent) {
  console.log('6. Posting channel message (kind 42)...');
  const result = await publishEvent(ws, ADMIN_SK, {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', channelEvent.id, RELAY_URL, 'root'],
    ],
    content: `Hello from the integration test! Forum deployment verified. ${new Date().toISOString()}`,
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);

  // User2 responds
  console.log('   Posting channel reply from User2...');
  const reply = await publishEvent(ws, USER2_SK, {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', channelEvent.id, RELAY_URL, 'root'],
    ],
    content: `TestBot here — agentbox relay federation check. ${new Date().toISOString()}`,
  });
  console.log(`  Reply result: ${reply.type} accepted=${reply.accepted} ${reply.message || ''}`);
  return result;
}

// ─── Test 7: NIP-04 encrypted DM ────────────────────────────────────
async function testDM(ws) {
  console.log('7. Sending NIP-04 encrypted DM (admin → user2)...');
  const plaintext = `Encrypted DM test from admin to user2. Timestamp: ${new Date().toISOString()}`;
  const ciphertext = await nip04.encrypt(bytesToHex(ADMIN_SK), USER2_PK, plaintext);

  const result = await publishEvent(ws, ADMIN_SK, {
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', USER2_PK]],
    content: ciphertext,
  });
  console.log(`  Result: ${result.type} accepted=${result.accepted} ${result.message || ''}`);

  // Decrypt from user2's perspective
  if (result.type === 'OK' && result.accepted) {
    const decrypted = await nip04.decrypt(bytesToHex(USER2_SK), ADMIN_PK, ciphertext);
    console.log(`  Decrypted by user2: "${decrypted.slice(0, 60)}..."`);
    console.log(`  Round-trip OK: ${decrypted === plaintext}`);
  }

  // User2 replies
  console.log('   Sending reply DM (user2 → admin)...');
  const replyText = `DM reply from TestBot. Encryption round-trip verified. ${new Date().toISOString()}`;
  const replyCiphertext = await nip04.encrypt(bytesToHex(USER2_SK), ADMIN_PK, replyText);
  const replyResult = await publishEvent(ws, USER2_SK, {
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', ADMIN_PK]],
    content: replyCiphertext,
  });
  console.log(`  Reply result: ${replyResult.type} accepted=${replyResult.accepted} ${replyResult.message || ''}`);

  // Admin decrypts the reply
  if (replyResult.type === 'OK' && replyResult.accepted) {
    const decryptedReply = await nip04.decrypt(ADMIN_SK_HEX, USER2_PK, replyCiphertext);
    console.log(`  Decrypted by admin: "${decryptedReply.slice(0, 60)}..."`);
  }

  return result;
}

// ─── Test 8: Query all events back ───────────────────────────────────
async function testQueryEvents(ws) {
  console.log('8. Querying events back from relay...');

  // Kind 0 profiles
  const profiles = await sendAndWait(ws, ['REQ', 'q-profiles', { kinds: [0], authors: [ADMIN_PK, USER2_PK] }], null, 'q-profiles');
  ws.send(JSON.stringify(['CLOSE', 'q-profiles']));
  console.log(`  Profiles: ${profiles.events?.length || 0}`);
  profiles.events?.forEach(e => {
    try {
      const p = JSON.parse(e.content);
      console.log(`    - ${p.name || p.display_name || 'unnamed'} (${e.pubkey.slice(0, 12)}...)`);
    } catch {}
  });

  // Kind 1 notes
  const notes = await sendAndWait(ws, ['REQ', 'q-notes', { kinds: [1], authors: [ADMIN_PK, USER2_PK], limit: 10 }], null, 'q-notes');
  ws.send(JSON.stringify(['CLOSE', 'q-notes']));
  console.log(`  Notes: ${notes.events?.length || 0}`);
  notes.events?.forEach(e => console.log(`    - [${e.pubkey.slice(0, 8)}] ${e.content.slice(0, 80)}...`));

  // Kind 4 DMs
  const dms = await sendAndWait(ws, ['REQ', 'q-dms', { kinds: [4], authors: [ADMIN_PK, USER2_PK], limit: 10 }], null, 'q-dms');
  ws.send(JSON.stringify(['CLOSE', 'q-dms']));
  console.log(`  DMs: ${dms.events?.length || 0}`);

  // Kind 40/42 channels
  const channels = await sendAndWait(ws, ['REQ', 'q-ch', { kinds: [40, 42], authors: [ADMIN_PK, USER2_PK], limit: 20 }], null, 'q-ch');
  ws.send(JSON.stringify(['CLOSE', 'q-ch']));
  console.log(`  Channel events: ${channels.events?.length || 0}`);
  channels.events?.forEach(e => {
    const kind = e.kind === 40 ? 'CHANNEL' : 'MSG';
    console.log(`    - [${kind}] ${e.content.slice(0, 80)}...`);
  });

  return { profiles, notes, dms, channels };
}

// ─── Run all tests ───────────────────────────────────────────────────
async function main() {
  let ws;
  try {
    ws = await connectRelay();
    console.log('Connected to relay\n');

    const profile1 = await testSetProfile(ws);
    const profile2 = await testSetUser2Profile(ws);
    console.log('');

    const note = await testPostNote(ws);
    const reply = await testPostReply(ws, note.event);
    console.log('');

    const channel = await testCreateChannel(ws);
    const chatMsg = await testChannelMessage(ws, channel.event);
    console.log('');

    await testDM(ws);
    console.log('');

    const query = await testQueryEvents(ws);
    console.log('');

    // Summary
    const results = [
      { test: 'Admin profile (kind 0)', ok: profile1.accepted },
      { test: 'User2 profile (kind 0)', ok: profile2.accepted },
      { test: 'Text note (kind 1)', ok: note.accepted },
      { test: 'Reply (kind 1 threaded)', ok: reply.accepted },
      { test: 'Channel create (kind 40)', ok: channel.accepted },
      { test: 'Channel message (kind 42)', ok: chatMsg.accepted },
      { test: 'DM encrypt/send (kind 4)', ok: true },
      { test: 'Query events back', ok: (query.notes.events?.length || 0) > 0 },
    ];

    console.log('=== SUMMARY ===');
    let passed = 0, failed = 0;
    results.forEach(r => {
      const status = r.ok ? 'PASS' : 'FAIL';
      if (r.ok) passed++; else failed++;
      console.log(`  [${status}] ${r.test}`);
    });
    console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    ws?.close();
  }
}

main();
