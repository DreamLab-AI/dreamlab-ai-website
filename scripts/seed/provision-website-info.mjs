// Adopt the monitor key as the forum's "website information" user (ADR-2011).
//
//   node scripts/seed/provision-website-info.mjs [--dry-run]
//
// Does three things, each idempotent, and nothing else:
//   1. Publishes the identity's kind-0 profile (name, bot flag, NIP-05 handle),
//      signed by the monitor key itself. Kind-0 is replaceable.
//   2. Registers it in the agent registry via the auth worker's NIP-98 admin
//      `register` route, so the disclosure badge and the admin Agents roster
//      name it and its authorising principal.
//   3. Reads /api/agents/disclosure back and fails unless it is listed.
//
// It never grants cohorts. `register` is used, not `provision`, because
// provision merges cohorts and the `agent` cohort receives the zone-4 key. The
// recipient must already be admitted (a whitelist row or a declared [[ingress]]
// entry, else contact copies are refused); if not, this stops and says so rather
// than adding one.
//
// Keys are read, never printed. RE-RUN HAZARD: POST /api/admin/reset-db drops
// the whitelist and registry rows; the nightly inbox watch flags both.
import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import {
  buildProfileContent,
  buildRegisterBody,
  classifyDisclosure,
  nip98Header,
  privilegeProblem,
} from '../lib/website-info.mjs';

const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const AUTH_API = 'https://dreamlab-auth-api.solitary-paper-764d.workers.dev';
const WATCH_DIR = process.env.INBOX_WATCH_DIR || '/home/devuser/workspace/.agentbox/inbox-watch';
const ADMIN_ENV = process.env.AGENTBOX_ENV_FILE || '/home/devuser/workspace/project/agentbox/.env';
const dryRun = process.argv.includes('--dry-run');

const hexKey = (text, what) => {
  if (!/^[0-9a-f]{64}$/i.test(text)) throw new Error(`${what} is not 64 hex characters`);
  return Uint8Array.from(Buffer.from(text, 'hex'));
};
const now = () => Math.floor(Date.now() / 1000);
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

const monitorSk = hexKey(readFileSync(`${WATCH_DIR}/monitor.key`, 'utf8').trim(), 'monitor.key');
const pubkey = getPublicKey(monitorSk);
console.log(`identity: ${pubkey.slice(0, 12)}…${dryRun ? '  (dry run: no writes)' : ''}`);

// 0. The recipient gate row must exist and must carry no privilege.
const checkWhitelist = async () => (await fetch(`${RELAY_HTTP}/api/check-whitelist?pubkey=${pubkey}`)).json();
const wlBefore = privilegeProblem(await checkWhitelist());
if (wlBefore === 'not whitelisted on the relay') fail('neither whitelisted nor a declared ingress recipient; declare it under [[ingress]] in dreamlab.toml (or run scripts/seed/whitelist-admin-recipient.mjs --pubkey=<monitor>)');
if (wlBefore) fail(`${wlBefore}; remove it before adopting the identity`);
console.log('relay row: admitted, no cohorts, not admin');

// 1. kind-0 profile, published by the identity itself.
const kind0 = finalizeEvent({ kind: 0, created_at: now(), tags: [], content: buildProfileContent() }, monitorSk);
function publishKind0() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(RELAY_WS);
    const timer = setTimeout(() => { ws.close(); reject(new Error('relay timeout')); }, 20000);
    // Never send before the relay's NIP-42 challenge has been answered; if the
    // relay sends none within 1.5s it does not want AUTH, so send anyway. One
    // EVENT only: no retry path to race against the challenge.
    let sent = false;
    const sendOnce = () => { if (!sent) { sent = true; ws.send(JSON.stringify(['EVENT', kind0])); } };
    ws.onopen = () => setTimeout(sendOnce, 1500);
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d[0] === 'AUTH') {
        const auth = finalizeEvent({ kind: 22242, created_at: now(), tags: [['relay', RELAY_WS], ['challenge', d[1]]], content: '' }, monitorSk);
        ws.send(JSON.stringify(['AUTH', auth]));
        setTimeout(sendOnce, 400);
      } else if (d[0] === 'OK' && d[1] === kind0.id) {
        clearTimeout(timer);
        ws.close();
        d[2] ? resolve() : reject(new Error(`relay rejected kind-0: ${d[3] || 'no reason'}`));
      }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('websocket error')); };
  });
}

// 2. Registry row, only if it is not already listed.
const disclosureUrl = `${RELAY_HTTP}/api/agents/disclosure`;
const before = classifyDisclosure(await (await fetch(disclosureUrl)).json(), pubkey);

if (dryRun) {
  console.log(`would publish kind-0 (${buildProfileContent().length} bytes)`);
  console.log(before.listed ? 'registry: already listed, would skip' : 'would register via /api/governance/agents/register (no cohorts)');
  process.exit(0);
}

await publishKind0().catch((e) => fail(e.message));
console.log('kind-0: accepted');

if (before.listed) {
  console.log(`registry: already listed as ${before.name}, skipped`);
} else {
  const env = readFileSync(ADMIN_ENV, 'utf8');
  const adminSk = hexKey(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)?.[1] ?? '', 'AGENTBOX_PRIVKEY_HEX');
  const url = `${AUTH_API}/api/governance/agents/register`;
  const body = JSON.stringify(buildRegisterBody(pubkey));
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: nip98Header(adminSk, url, 'POST', body), 'Content-Type': 'application/json' },
    body,
  });
  const out = await r.json().catch(() => ({}));
  if (!r.ok) fail(`register rejected ${r.status} ${JSON.stringify(out).slice(0, 200)}`);
  console.log(`registry: registered (${r.status})`);
}

// 3. Read it back, and prove nothing above granted privilege.
const wlAfter = privilegeProblem(await checkWhitelist());
if (wlAfter) fail(`after provisioning: ${wlAfter}`);
console.log('relay row after: still no cohorts, not admin');
const after = classifyDisclosure(await (await fetch(disclosureUrl)).json(), pubkey);
if (!after.listed) fail('registered but not visible in /api/agents/disclosure');
console.log(`verified: ${after.name}, registered_by ${String(after.registeredBy).slice(0, 12)}…`);
