// Unit tests for the pure conversion layer: node test/convert.test.mjs
import assert from 'node:assert/strict';
import { normalizeMessages, buildPlan } from '../lib/convert.mjs';
import { eventToInsert } from '../lib/d1.mjs';
import { compactMessage } from '../lib/keybase.mjs';

// ── fixtures: compacted keybase messages (ascending ids) ─────────────────────
const general = [
  { id: 1, sentAt: 1500000000, sender: 'alice', type: 'text', body: 'hello world', replyTo: null },
  { id: 2, sentAt: 1500000060, sender: 'bob', type: 'text', body: 'hi alice', replyTo: 1 },
  { id: 3, sentAt: 1500000120, sender: 'carol', type: 'text', body: 'typo mesage', replyTo: null },
  { id: 4, sentAt: 1500000180, sender: 'carol', type: 'edit', target: 3, body: 'fixed message' },
  { id: 5, sentAt: 1500000240, sender: 'alice', type: 'text', body: 'delete me', replyTo: null },
  { id: 6, sentAt: 1500000300, sender: 'alice', type: 'delete', targets: [5] },
  { id: 7, sentAt: 1500000360, sender: 'bob', type: 'reaction', target: 1, body: ':+1:' },
  { id: 8, sentAt: 1500000420, sender: 'bob', type: 'reaction', target: 5, body: ':fire:' }, // target deleted
  { id: 9, sentAt: 1500000480, sender: 'mallory', type: 'text', body: 'not migrated', replyTo: null },
  { id: 10, sentAt: 1500000540, sender: 'alice', type: 'attachment', filename: 'pic.jpg', title: 'sunset' },
];

// normalize: edits applied, deletes removed, dead reactions dropped
{
  const { messages, reactions } = normalizeMessages(general);
  assert.equal(messages.length, 5); // 1,2,3,9,10 (5 deleted)
  assert.equal(messages.find((m) => m.id === 3).body, 'fixed message');
  assert.ok(!messages.find((m) => m.id === 5));
  assert.equal(messages.find((m) => m.id === 2).replyTo, 1);
  assert.equal(messages.find((m) => m.id === 10).body, '[attachment: pic.jpg] sunset');
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0].target, 1);
}

// buildPlan: sender mapping, reply keys, deterministic channel createdAt, skips
{
  const identities = {
    alice: { include: true, realName: 'Alice A' },
    bob: { include: true, realName: '' },
    carol: { include: true, realName: 'Carol C' },
    mallory: { include: false },
  };
  const plan = buildPlan({
    team: 'myteam',
    channels: [{ topic: 'general', zone: 'friends' }],
    archive: { general },
    identities,
  });
  assert.equal(plan.stats.channels, 1);
  assert.equal(plan.stats.messages, 4); // mallory's dropped
  assert.equal(plan.stats.reactions, 1);
  assert.equal(plan.stats.profiles, 3);
  assert.deepEqual(plan.stats.skippedSenders, { mallory: 1 });
  assert.equal(plan.channels[0].createdAt, 1500000000 - 2);
  const reply = plan.messages.find((m) => m.kbKey === 'general:2');
  assert.equal(reply.replyTo, 'general:1');
  assert.equal(reply.zone, 'friends');
  // ascending order within channel (required for reply resolution at publish)
  const ids = plan.messages.map((m) => Number(m.kbKey.split(':')[1]));
  assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
}

// long messages truncated under the relay's 65536 event-size cap
{
  const plan = buildPlan({
    team: 't',
    channels: [{ topic: 'g', zone: 'public' }],
    archive: { g: [{ id: 1, sentAt: 1, sender: 'a', type: 'text', body: 'x'.repeat(70000), replyTo: null }] },
    identities: { a: { include: true } },
  });
  assert.equal(plan.stats.truncated, 1);
  assert.ok(plan.messages[0].body.length < 60100);
}

// D1 SQL escaping
{
  const sql = eventToInsert({
    id: 'aa', pubkey: 'bb', created_at: 123, kind: 42,
    tags: [['e', 'cc']], content: "it's o'clock", sig: 'dd',
  });
  assert.ok(sql.includes("'it''s o''clock'"));
  assert.ok(sql.startsWith('INSERT OR IGNORE INTO events'));
  assert.ok(sql.includes(',123)')); // received_at = created_at
}

// compactMessage: raw keybase CLI shapes → compact form
{
  const raw = {
    msg: {
      id: 42, sent_at: 1600000000,
      sender: { username: 'alice', device_name: 'work' },
      content: { type: 'text', text: { body: 'yo', replyTo: 40 } },
    },
  };
  assert.deepEqual(compactMessage(raw), { id: 42, sentAt: 1600000000, sender: 'alice', type: 'text', body: 'yo', replyTo: 40 });
  assert.equal(compactMessage({ msg: { id: 1, sent_at: 1, sender: { username: 'x' }, content: { type: 'join' } } }), null);
  const del = compactMessage({ msg: { id: 2, sent_at: 1, sender: { username: 'x' }, content: { type: 'delete', delete: { messageIDs: [1] } } } });
  assert.deepEqual(del.targets, [1]);
}

console.log('convert.test.mjs: all assertions passed');
