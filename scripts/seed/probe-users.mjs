// Read-only: dump the relay whitelist + registrations (operator NIP-98) to see
// who is whitelisted vs pending, and whether a given handle (e.g. RedDreadTest2)
// has signed up / been whitelisted.   node scripts/seed/probe-users.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

const HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const sk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);
const nip98 = (url, m, b) => {
  const t = [['u', url], ['method', m]];
  if (b) t.push(['payload', createHash('sha256').update(b).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent({ kind: 27235, created_at: now(), tags: t, content: '' }, sk))).toString('base64');
};
const get = async (path) => {
  const url = HTTP + path;
  const r = await fetch(url, { headers: { Authorization: nip98(url, 'GET') } });
  let body; try { body = await r.json(); } catch { body = await r.text(); }
  return { status: r.status, body };
};

const wl = await get('/api/whitelist/list');
console.log('=== /api/whitelist/list ===', wl.status);
const users = wl.body?.users || wl.body?.whitelist || wl.body || [];
const arr = Array.isArray(users) ? users : (Array.isArray(wl.body) ? wl.body : []);
console.log('whitelisted count:', arr.length);
for (const u of arr) {
  const pk = (u.pubkey || u.pk || '').slice(0, 12);
  console.log(`  ${pk}  cohorts=${JSON.stringify(u.cohorts||u.cohort||'')} admin=${u.is_admin||u.admin||0} name=${u.name||u.display_name||u.nickname||''}`);
}
const reg = await get('/api/admin/registrations');
console.log('\n=== /api/admin/registrations ===', reg.status);
const regs = reg.body?.registrations || [];
console.log('registrations count:', Array.isArray(regs) ? regs.length : '(shape:'+JSON.stringify(reg.body).slice(0,120)+')');
if (Array.isArray(regs)) for (const r of regs) console.log(`  ${(r.pubkey||'').slice(0,12)} real_name=${r.real_name||r.name||''} status=${r.status||''}`);
