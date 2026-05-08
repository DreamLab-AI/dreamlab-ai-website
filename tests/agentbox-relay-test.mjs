#!/usr/bin/env node
/**
 * Agentbox relay integration test.
 * Publishes events to the local agentbox relay (ws://127.0.0.1:7777)
 * and the deployed forum relay, then queries both to verify cross-relay content.
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

const FORUM_RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const AGENTBOX_RELAY = 'ws://127.0.0.1:7777';

const ADMIN_SK_HEX = '05db7bd41258001c7d8b420ebf5710d5d0e5b1eabdf94ba1c03fb1658af29c27';
const ADMIN_SK = hexToBytes(ADMIN_SK_HEX);
const ADMIN_PK = getPublicKey(ADMIN_SK);

const AGENT_SK = generateSecretKey();
const AGENT_PK = getPublicKey(AGENT_SK);
const AGENT_SK_HEX = bytesToHex(AGENT_SK);

console.log('=== Agentbox ↔ Forum Relay Test ===');
console.log(`Admin pubkey:  ${ADMIN_PK.slice(0, 16)}...`);
console.log(`Agent pubkey:  ${AGENT_PK.slice(0, 16)}...`);
console.log(`Forum relay:   ${FORUM_RELAY}`);
console.log(`Agentbox relay: ${AGENTBOX_RELAY}`);
console.log('');

function connectRelay(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error(`Connection timeout: ${url}`)), 15000);
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
        } else if (parsed[0] === 'AUTH') {
          // NIP-42 AUTH challenge — ignore for now
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

async function main() {
  let forumWs, agentWs;
  const results = [];

  try {
    // Connect to both relays
    console.log('Connecting to both relays...');
    [forumWs, agentWs] = await Promise.all([
      connectRelay(FORUM_RELAY),
      connectRelay(AGENTBOX_RELAY),
    ]);
    console.log('Both relays connected\n');

    // 1. Publish agent profile to agentbox relay
    console.log('1. Setting agent profile on AGENTBOX relay...');
    const agentProfile = await publishEvent(agentWs, AGENT_SK, {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: 'AgentBox-Bot',
        display_name: 'AgentBox Bot (DreamLab)',
        about: 'Agentbox autonomous agent — federation test',
      }),
    });
    console.log(`  Result: ${agentProfile.type} accepted=${agentProfile.accepted}`);
    results.push({ test: 'Agent profile on agentbox', ok: agentProfile.accepted });

    // 2. Publish agent profile to forum relay too
    console.log('2. Setting agent profile on FORUM relay...');
    const agentProfileForum = await publishEvent(forumWs, AGENT_SK, {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify({
        name: 'AgentBox-Bot',
        display_name: 'AgentBox Bot (DreamLab)',
        about: 'Agentbox autonomous agent — federation test',
      }),
    });
    console.log(`  Result: ${agentProfileForum.type} accepted=${agentProfileForum.accepted}`);
    results.push({ test: 'Agent profile on forum', ok: agentProfileForum.accepted });

    // 3. Agent posts to agentbox relay
    console.log('\n3. Agent posts note on AGENTBOX relay...');
    const agentNote = await publishEvent(agentWs, AGENT_SK, {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: `[AgentBox] System status: all adapters nominal. Federation test ${new Date().toISOString()}`,
    });
    console.log(`  Result: ${agentNote.type} accepted=${agentNote.accepted}`);
    results.push({ test: 'Agent note on agentbox', ok: agentNote.accepted });

    // 4. Agent posts to forum relay
    console.log('4. Agent posts note on FORUM relay...');
    const agentNoteForum = await publishEvent(forumWs, AGENT_SK, {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: `[AgentBox→Forum] Cross-relay post from agentbox agent. Federation bridge test ${new Date().toISOString()}`,
    });
    console.log(`  Result: ${agentNoteForum.type} accepted=${agentNoteForum.accepted}`);
    results.push({ test: 'Agent note on forum', ok: agentNoteForum.accepted });

    // 5. Admin replies to agent on forum relay
    console.log('\n5. Admin replies to agent on FORUM relay...');
    const adminReply = await publishEvent(forumWs, ADMIN_SK, {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', agentNoteForum.event.id, FORUM_RELAY, 'reply'],
        ['p', AGENT_PK],
      ],
      content: `[Admin→Agent] Received your federation test. Relay bridge operational. ${new Date().toISOString()}`,
    });
    console.log(`  Result: ${adminReply.type} accepted=${adminReply.accepted}`);
    results.push({ test: 'Admin reply to agent', ok: adminReply.accepted });

    // 6. Publish admin reply to agentbox relay too (simulating bridge)
    console.log('6. Bridging admin reply to AGENTBOX relay...');
    const adminReplyBridged = await publishEvent(agentWs, ADMIN_SK, {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', agentNoteForum.event.id, FORUM_RELAY, 'reply'],
        ['p', AGENT_PK],
      ],
      content: `[Admin→Agent bridged] This message was bridged from forum relay. ${new Date().toISOString()}`,
    });
    console.log(`  Result: ${adminReplyBridged.type} accepted=${adminReplyBridged.accepted}`);
    results.push({ test: 'Admin reply bridged to agentbox', ok: adminReplyBridged.accepted });

    // 7. NIP-04 Encrypted DM: Admin → Agent via both relays
    console.log('\n7. Encrypted DM: Admin → Agent on FORUM relay...');
    const dmPlain = `[Encrypted] Mission briefing for agent. Timestamp: ${new Date().toISOString()}`;
    const dmCipher = await nip04.encrypt(ADMIN_SK_HEX, AGENT_PK, dmPlain);
    const dmEvent = await publishEvent(forumWs, ADMIN_SK, {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', AGENT_PK]],
      content: dmCipher,
    });
    console.log(`  Result: ${dmEvent.type} accepted=${dmEvent.accepted}`);

    // Agent decrypts
    const decrypted = await nip04.decrypt(AGENT_SK_HEX, ADMIN_PK, dmCipher);
    console.log(`  Agent decrypted: "${decrypted.slice(0, 60)}..."`);
    console.log(`  Round-trip OK: ${decrypted === dmPlain}`);
    results.push({ test: 'Encrypted DM admin→agent', ok: dmEvent.accepted && decrypted === dmPlain });

    // 8. Agent replies via DM on agentbox relay
    console.log('8. Encrypted DM reply: Agent → Admin on AGENTBOX relay...');
    const replyPlain = `[Encrypted] Agent acknowledges. All systems go. ${new Date().toISOString()}`;
    const replyCipher = await nip04.encrypt(AGENT_SK_HEX, ADMIN_PK, replyPlain);
    const replyDm = await publishEvent(agentWs, AGENT_SK, {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', ADMIN_PK]],
      content: replyCipher,
    });
    console.log(`  Result: ${replyDm.type} accepted=${replyDm.accepted}`);
    const adminDecrypted = await nip04.decrypt(ADMIN_SK_HEX, AGENT_PK, replyCipher);
    console.log(`  Admin decrypted: "${adminDecrypted.slice(0, 60)}..."`);
    results.push({ test: 'Encrypted DM agent→admin (agentbox)', ok: replyDm.accepted && adminDecrypted === replyPlain });

    // 9. Query both relays
    console.log('\n9. Querying both relays...');

    console.log('  FORUM relay:');
    const forumNotes = await sendAndWait(forumWs,
      ['REQ', 'q1', { kinds: [0, 1, 4], authors: [ADMIN_PK, AGENT_PK], limit: 20 }],
      null, 'q1');
    forumWs.send(JSON.stringify(['CLOSE', 'q1']));
    const forumByKind = {};
    (forumNotes.events || []).forEach(e => {
      forumByKind[e.kind] = (forumByKind[e.kind] || 0) + 1;
    });
    console.log(`    Events: ${forumNotes.events?.length || 0} (kind 0: ${forumByKind[0]||0}, kind 1: ${forumByKind[1]||0}, kind 4: ${forumByKind[4]||0})`);

    console.log('  AGENTBOX relay:');
    const agentNotes = await sendAndWait(agentWs,
      ['REQ', 'q2', { kinds: [0, 1, 4], authors: [ADMIN_PK, AGENT_PK], limit: 20 }],
      null, 'q2');
    agentWs.send(JSON.stringify(['CLOSE', 'q2']));
    const agentByKind = {};
    (agentNotes.events || []).forEach(e => {
      agentByKind[e.kind] = (agentByKind[e.kind] || 0) + 1;
    });
    console.log(`    Events: ${agentNotes.events?.length || 0} (kind 0: ${agentByKind[0]||0}, kind 1: ${agentByKind[1]||0}, kind 4: ${agentByKind[4]||0})`);

    results.push({ test: 'Forum relay has events', ok: (forumNotes.events?.length || 0) >= 4 });
    results.push({ test: 'Agentbox relay has events', ok: (agentNotes.events?.length || 0) >= 3 });

    // Summary
    console.log('\n=== SUMMARY ===');
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
    forumWs?.close();
    agentWs?.close();
  }
}

main();
