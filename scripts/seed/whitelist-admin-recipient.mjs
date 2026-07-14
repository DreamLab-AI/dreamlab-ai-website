// Whitelist a contact-DM recipient so the relay admits the contact form's
// gift-wrapped DMs. ADR-041 Decision 5 runbook step.
//
// STATUS (2026-07-14): the interim recipient is the operator's working admin
// key (11ed6422…663c, visionclaw-server), which is ALREADY whitelisted — so at
// launch this script is a no-op safety check. It becomes mandatory when the
// ADR-040 D3 key split rotates VITE_ADMIN_PUBKEY to the freshly minted operator
// key (run it with --pubkey=<new key>), or after any relay reseed.
//
// WHY: the relay's kind-1059 admission gate (relay_do/nip_handlers.rs) is
// recipient-gated — is_whitelisted() (relay_do/storage.rs) must return true for
// the DM's ["p", ...] recipient. operator-jjohare (the default below) is NOT in
// the D1 `whitelist` table (live-verified 2026-07-14, scripts/seed/probe-users.mjs),
// despite being an ADMIN_PUBKEYS admin — is_whitelisted() does not consult
// ADMIN_PUBKEYS. Without the recipient's row every contact DM is rejected
// OK-false "blocked: gift-wrap recipient not whitelisted", and ADR-041
// Decision 4's OK-gated success surfaces that as a visible failure.
//
// RE-RUN HAZARD: the NIP-98-gated POST /api/admin/reset-db (relay lib.rs) silently
// deletes this row. Any relay reseed drops operator-jjohare again and this step
// MUST be re-run; the form's OK-gated success is the canary that catches it.
//
// Idempotent: probes GET /api/check-whitelist first and exits 0 without POSTing
// if the recipient is already whitelisted — avoids clobbering an existing cohort
// set via the /api/whitelist/add ON CONFLICT upsert.
//
// The admin key is read from agentbox/.env (AGENTBOX_PRIVKEY_HEX) and NEVER
// printed. Static delivery only — the operator runs this as a runbook step; do
// not wire it into CI.
//
//   node scripts/seed/whitelist-admin-recipient.mjs [--pubkey=<64-hex>] [--cohorts=a,b]
//
// --pubkey=<hex> recipient to whitelist (default: operator-jjohare's human-admin
//                key — the post-split VITE_ADMIN_PUBKEY target).
// --cohorts=a,b  optional cohort grants for the row (default: empty — whitelist
//                membership is all the recipient gate needs; the admin's powers
//                come from ADMIN_PUBKEYS/is_admin, not this row's cohorts).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
// operator-jjohare — human admin; the post-split VITE_ADMIN_PUBKEY target (ADR-041 Decision 5)
const DEFAULT_RECIPIENT = '6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a';

// --pubkey=<64-hex> (default: operator-jjohare)
const pubkeyArg = process.argv.find((a) => a.startsWith('--pubkey='));
const RECIPIENT_PUBKEY = pubkeyArg ? pubkeyArg.slice('--pubkey='.length).toLowerCase() : DEFAULT_RECIPIENT;
if (!/^[0-9a-f]{64}$/.test(RECIPIENT_PUBKEY)) {
  console.error('FAIL: --pubkey must be a 64-char lowercase hex pubkey');
  process.exit(1);
}

// --cohorts=a,b (default: empty)
const cohortsArg = process.argv.find((a) => a.startsWith('--cohorts='));
const cohorts = cohortsArg
  ? cohortsArg.slice('--cohorts='.length).split(',').map((c) => c.trim()).filter(Boolean)
  : [];

const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const adminSk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const adminPk = getPublicKey(adminSk);
const now = () => Math.floor(Date.now() / 1000);
function nip98(url, method, body) {
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', createHash('sha256').update(body).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(finalizeEvent({ kind: 27235, created_at: now(), tags, content: '' }, adminSk))).toString('base64');
}

// 1. Idempotency probe — /api/check-whitelist is public and reads the same D1
//    `whitelist` table the gift-wrap admission gate consults.
const checkUrl = `${RELAY_HTTP}/api/check-whitelist?pubkey=${RECIPIENT_PUBKEY}`;
const cr = await fetch(checkUrl);
if (!cr.ok) {
  console.error(`FAIL: check-whitelist probe returned ${cr.status}`);
  process.exit(1);
}
const cbody = await cr.json().catch(() => ({}));
if (cbody.isWhitelisted) {
  console.log(`already whitelisted: recipient ${RECIPIENT_PUBKEY.slice(0, 12)}… cohorts=${JSON.stringify(cbody.cohorts || [])}`);
  console.log('no change — contact-form ingress prerequisite already satisfied (ADR-041 Decision 5).');
  process.exit(0);
}

// 2. Add the recipient (NIP-98 admin POST, signed by AGENTBOX_PRIVKEY_HEX).
const addUrl = `${RELAY_HTTP}/api/whitelist/add`;
const addBody = JSON.stringify({ pubkey: RECIPIENT_PUBKEY, cohorts });
const ar = await fetch(addUrl, {
  method: 'POST',
  headers: { Authorization: nip98(addUrl, 'POST', addBody), 'Content-Type': 'application/json' },
  body: addBody,
});
const abody = await ar.json().catch(() => ({}));
if (!ar.ok) {
  console.error(`FAIL: whitelist/add rejected ${ar.status} ${JSON.stringify(abody).slice(0, 200)}`);
  console.error(`(admin signer ${adminPk.slice(0, 12)}… — must be in the relay ADMIN_PUBKEYS)`);
  process.exit(1);
}
console.log(`whitelisted: recipient ${RECIPIENT_PUBKEY.slice(0, 12)}… cohorts=${JSON.stringify(cohorts)} -> ${ar.status}`);
console.log('ADR-041 Decision 5 prerequisite satisfied — contact-form DMs to this recipient will now be admitted.');
console.log('RE-RUN this after any /api/admin/reset-db; it silently drops this row.');
process.exit(0);
