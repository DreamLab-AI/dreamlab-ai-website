#!/usr/bin/env node
// Keybase → Nostr migration utility — local-only server.
//
//   cd scripts/keybase-migration && npm install && npm start
//   open http://127.0.0.1:8989
//
// SECURITY: binds 127.0.0.1 only. The keybase paper key and the relay admin
// key live in process memory for the duration of a request/job and are never
// logged or written to disk. Generated USER keys ARE persisted (work/keys.json,
// gitignored) — that is the deliverable you hand to your friends.

import http from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as kb from './lib/keybase.mjs';
import { buildPlan } from './lib/convert.mjs';
import * as nostr from './lib/nostr.mjs';
import * as d1 from './lib/d1.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(__dirname, 'work');
const ARCHIVE = path.join(WORK, 'archive');
await mkdir(ARCHIVE, { recursive: true });

const PORT = Number(process.env.PORT || 8989);
const safeName = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');

const readJson = async (rel, fallback) => {
  try { return JSON.parse(await readFile(path.join(WORK, rel), 'utf8')); } catch { return fallback; }
};
const writeJson = (rel, v) => writeFile(path.join(WORK, rel), JSON.stringify(v, null, 2));

// ── job registry ─────────────────────────────────────────────────────────────
const jobs = new Map();
let jobSeq = 0;
function startJob(name, fn) {
  const id = String(++jobSeq);
  const job = { id, name, status: 'running', progress: 0, total: 0, log: [], error: null };
  jobs.set(id, job);
  const log = (s) => {
    job.log.push(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
    if (job.log.length > 800) job.log.splice(0, job.log.length - 800);
  };
  fn(job, log)
    .then(() => { job.status = 'done'; })
    .catch((e) => { job.status = 'error'; job.error = String(e?.message || e); log('ERROR: ' + job.error); });
  return job;
}
const runningJob = (name) => [...jobs.values()].find((j) => j.name === name && j.status === 'running');

// ── identity store ───────────────────────────────────────────────────────────
const publicIdentity = ({ sk: _sk, nsec: _nsec, ...rest }) => rest;

async function upsertIdentities(users) {
  const keys = await readJson('keys.json', {});
  for (const u of users || []) {
    if (!u?.username) continue;
    let k = keys[u.username];
    if (!k && u.include) k = keys[u.username] = nostr.newIdentity();
    if (k) {
      if (u.realName !== undefined) k.realName = u.realName;
      if (u.cohorts !== undefined) k.cohorts = u.cohorts;
      if (u.include !== undefined) k.include = !!u.include;
      k.cohorts = k.cohorts?.length ? k.cohorts : ['friends'];
    }
  }
  await writeJson('keys.json', keys);
  return keys;
}

// ── publish job ──────────────────────────────────────────────────────────────
async function runPublish(job, log, { adminSk, mode, batchSize }) {
  const plan = await readJson('plan.json', null);
  if (!plan) throw new Error('no plan.json — run "Build plan" first');
  const keys = await readJson('keys.json', {});
  const adminPk = nostr.pkOf(adminSk);
  const skCache = new Map();
  const skFor = (username) => {
    if (!skCache.has(username)) skCache.set(username, nostr.skFromInput(keys[username].sk));
    return skCache.get(username);
  };

  // Phase 1 — whitelist admin + all migrated users (NIP-98 admin endpoint)
  log(`phase 1/5: whitelisting ${plan.profiles.length} users (admin ${adminPk.slice(0, 12)}…)`);
  await nostr.adminPost(adminSk, '/api/whitelist/add', { pubkey: adminPk, cohorts: ['family', 'friends', 'business', 'agent'] });
  for (const p of plan.profiles) {
    const k = keys[p.username];
    if (!k) throw new Error(`no identity for ${p.username} — regenerate identities`);
    await nostr.adminPost(adminSk, '/api/whitelist/add', { pubkey: k.pk, cohorts: k.cohorts || ['friends'] });
  }

  // Phase 2 — channels (kind 40, admin-signed) + zone mapping
  log(`phase 2/5: creating ${plan.channels.length} channels`);
  const pub = new nostr.RelayPublisher(log);
  const chanIds = {};
  for (const ch of plan.channels) {
    const ev = nostr.finalize(adminSk, {
      kind: 40,
      created_at: ch.createdAt,
      tags: [['section', ch.zone]],
      content: JSON.stringify({ name: ch.name, about: ch.about, picture: '' }),
    });
    chanIds[ch.topic] = ev.id;
    const { failures } = await pub.publish([ev]);
    if (failures.length) throw new Error(`channel #${ch.topic} rejected: ${failures[0].msg}`);
    await nostr.adminPost(adminSk, '/api/admin/channel-zone', { channel_id: ev.id, zone: ch.zone });
    log(`#${ch.topic} -> ${ev.id.slice(0, 12)}… zone=${ch.zone}`);
  }

  // Phase 3 — profiles (kind 0, signed by each user)
  log(`phase 3/5: publishing ${plan.profiles.length} profiles`);
  const profileEvents = plan.profiles.map((p) =>
    nostr.finalize(skFor(p.username), {
      kind: 0,
      created_at: nostr.nowSec(),
      tags: [],
      content: JSON.stringify({
        name: p.username,
        display_name: p.realName || p.username,
        about: `Migrated from Keybase (${plan.team})`,
      }),
    })
  );
  {
    const { failures } = await pub.publish(profileEvents);
    for (const f of failures) log(`profile rejected: ${f.msg}`);
  }

  // Phase 4 — sign all messages + reactions (deterministic ids; replies
  // resolve because plan.messages is in ascending keybase-id order per channel)
  log(`phase 4/5: signing ${plan.messages.length} messages + ${plan.reactions.length} reactions`);
  const idByKb = {};
  const pkByKb = {};
  const msgEvents = [];
  for (const m of plan.messages) {
    const tags = [['e', chanIds[m.topic], nostr.RELAY_WS, 'root']];
    if (m.replyTo && idByKb[m.replyTo]) tags.push(['e', idByKb[m.replyTo], nostr.RELAY_WS, 'reply']);
    tags.push(['section', m.zone], ['keybase', `${plan.team}#${m.kbKey}`]);
    const ev = nostr.finalize(skFor(m.sender), { kind: 42, created_at: m.createdAt, tags, content: m.body });
    idByKb[m.kbKey] = ev.id;
    pkByKb[m.kbKey] = ev.pubkey;
    msgEvents.push(ev);
    if (msgEvents.length % 5000 === 0) log(`signed ${msgEvents.length}/${plan.messages.length}`);
  }
  const reactEvents = [];
  for (const r of plan.reactions) {
    const targetId = idByKb[r.target];
    if (!targetId) continue;
    reactEvents.push(
      nostr.finalize(skFor(r.sender), {
        kind: 7,
        created_at: r.createdAt,
        tags: [['e', targetId], ['p', pkByKb[r.target]], ['section', r.zone], ['keybase', `${plan.team}#${r.kbKey}`]],
        content: r.body,
      })
    );
  }
  const bulk = [...msgEvents, ...reactEvents];
  job.total = bulk.length;

  // Phase 5 — bulk write
  const planHash = createHash('sha256')
    .update(JSON.stringify([bulk.length, bulk[0]?.id, bulk[bulk.length - 1]?.id]))
    .digest('hex');
  if (mode === 'd1') {
    log(`phase 5/5: D1 bulk insert (${bulk.length} events, batches of ${batchSize})`);
    const state = await readJson('publish-state.json', {});
    const startBatch = state.planHash === planHash ? state.batchesDone || 0 : 0;
    if (startBatch) log(`resuming at batch ${startBatch}`);
    await d1.bulkInsert(bulk, {
      workDir: WORK,
      batchSize,
      startBatch,
      log,
      onBatchDone: async (b, total, count) => {
        job.progress = count;
        await writeJson('publish-state.json', { planHash, batchesDone: b + 1, totalBatches: total });
      },
    });
  } else {
    log(`phase 5/5: relay websocket publish (${bulk.length} events @ ~8/sec)`);
    const { okCount, failures } = await pub.publish(bulk, {
      ratePerSec: 8,
      onProgress: (n) => { job.progress = n; },
    });
    log(`relay accepted ${okCount}/${bulk.length}`);
    for (const f of failures.slice(0, 20)) log(`rejected ${f.id.slice(0, 12)}…: ${f.msg}`);
    if (failures.length > 20) log(`(${failures.length - 20} more rejections not shown)`);
  }
  pub.close();
  log('MIGRATION PUBLISH COMPLETE');
  log(`verify in the forum at https://dreamlab-ai.com/community/ — channels: ${Object.keys(chanIds).map((t) => '#' + t).join(', ')}`);
}

// ── HTTP plumbing ────────────────────────────────────────────────────────────
const body = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 64 * 1024 * 1024) reject(new Error('body too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
  });
const send = (res, code, obj, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(obj) : obj);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = `${req.method} ${url.pathname}`;
  try {
    if (route === 'GET /') {
      return send(res, 200, await readFile(path.join(__dirname, 'public', 'index.html'), 'utf8'), 'text/html; charset=utf-8');
    }

    if (route === 'GET /api/state') {
      const [inventory, selection, keys, plan, kbStatus, archiveFiles] = await Promise.all([
        readJson('inventory.json', null),
        readJson('selection.json', null),
        readJson('keys.json', {}),
        readJson('plan.json', null),
        kb.status(),
        readdir(ARCHIVE).catch(() => []),
      ]);
      const archive = {};
      for (const f of archiveFiles.filter((f) => f.endsWith('.json'))) {
        const msgs = await readJson(path.join('archive', f), []);
        archive[f.replace(/\.json$/, '')] = msgs.length;
      }
      return send(res, 200, {
        keybase: kbStatus,
        inventory,
        selection,
        archive,
        identities: Object.fromEntries(Object.entries(keys).map(([u, k]) => [u, publicIdentity(k)])),
        planStats: plan?.stats || null,
        adminKeyInEnv: !!process.env.DREAMLAB_ADMIN_KEY,
        job: [...jobs.values()].pop() || null,
      });
    }

    if (route === 'POST /api/keybase/login') {
      const { username, paperkey } = await body(req);
      if (!username || !paperkey) return send(res, 400, { error: 'username and paperkey required' });
      await kb.oneshot(username, paperkey);
      return send(res, 200, await kb.status());
    }

    if (route === 'POST /api/inventory') {
      const { team } = await body(req);
      if (!team) return send(res, 400, { error: 'team required' });
      const [channels, members] = await Promise.all([kb.listChannels(team), kb.listMembers(team)]);
      const inventory = { team, fetchedAt: nostr.nowSec(), channels, members };
      await writeJson('inventory.json', inventory);
      return send(res, 200, inventory);
    }

    if (route === 'POST /api/selection') {
      const sel = await body(req); // { channels: [{topic, zone, include}], options: {...} }
      await writeJson('selection.json', sel);
      return send(res, 200, { ok: true });
    }

    if (route === 'POST /api/identities') {
      const { users } = await body(req);
      const keys = await upsertIdentities(users);
      return send(res, 200, Object.fromEntries(Object.entries(keys).map(([u, k]) => [u, publicIdentity(k)])));
    }

    if (route === 'GET /api/identities.csv') {
      const keys = await readJson('keys.json', {});
      const rows = [['keybase_username', 'real_name', 'pubkey_hex', 'npub', 'nsec']];
      for (const [u, k] of Object.entries(keys)) {
        if (!k.include) continue;
        rows.push([u, k.realName || '', k.pk, k.npub, k.nsec]);
      }
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="keybase-nostr-identities.csv"',
      });
      return res.end(csv);
    }

    if (route === 'POST /api/export') {
      const { team, topics } = await body(req);
      if (!team || !topics?.length) return send(res, 400, { error: 'team and topics required' });
      if (runningJob('export')) return send(res, 409, { error: 'export already running' });
      const job = startJob('export', async (job, log) => {
        for (const topic of topics) {
          log(`reading #${topic}…`);
          const msgs = await kb.exportChannel(team, topic, (count, page) => {
            job.progress = count;
            if (page % 10 === 0) log(`#${topic}: page ${page}, ${count} messages so far`);
          });
          msgs.sort((a, b) => a.id - b.id);
          await writeJson(path.join('archive', `${safeName(topic)}.json`), msgs);
          log(`#${topic}: ${msgs.length} messages archived`);
        }
        log('EXPORT COMPLETE');
      });
      return send(res, 200, { jobId: job.id });
    }

    if (route === 'POST /api/plan') {
      const { includeReactions = true } = await body(req);
      const [inventory, selection, keys] = await Promise.all([
        readJson('inventory.json', null),
        readJson('selection.json', null),
        readJson('keys.json', {}),
      ]);
      if (!inventory || !selection) return send(res, 400, { error: 'run inventory + selection first' });
      const channels = (selection.channels || []).filter((c) => c.include);
      const archive = {};
      for (const ch of channels) {
        archive[ch.topic] = await readJson(path.join('archive', `${safeName(ch.topic)}.json`), null);
        if (!archive[ch.topic]) return send(res, 400, { error: `channel #${ch.topic} not exported yet` });
      }
      const plan = buildPlan({ team: inventory.team, channels, archive, identities: keys, includeReactions });
      await writeJson('plan.json', plan);
      return send(res, 200, { stats: plan.stats });
    }

    if (route === 'POST /api/publish') {
      const { adminKey, mode = 'd1', batchSize = 500 } = await body(req);
      const keySource = adminKey || process.env.DREAMLAB_ADMIN_KEY;
      if (!keySource) return send(res, 400, { error: 'admin key required (paste it or set DREAMLAB_ADMIN_KEY)' });
      if (runningJob('publish')) return send(res, 409, { error: 'publish already running' });
      const adminSk = nostr.skFromInput(keySource);
      if (mode === 'd1') {
        const w = await d1.checkWrangler();
        if (!w.ok) return send(res, 400, { error: 'wrangler unavailable: ' + w.error });
      }
      const job = startJob('publish', (job, log) => runPublish(job, log, { adminSk, mode, batchSize: Number(batchSize) || 500 }));
      return send(res, 200, { jobId: job.id });
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/job/')) {
      const job = jobs.get(url.pathname.split('/').pop());
      return job ? send(res, 200, job) : send(res, 404, { error: 'no such job' });
    }

    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 500, { error: String(e?.message || e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`keybase-migration ui: http://127.0.0.1:${PORT}`);
  console.log(`relay: ${nostr.RELAY_HTTP}`);
  console.log(`d1 target: ${d1.D1_DATABASE_NAME} (${d1.D1_DATABASE_ID})`);
});
