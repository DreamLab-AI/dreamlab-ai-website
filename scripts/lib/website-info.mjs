// The website-information service identity (ADR-2011).
//
// One Nostr key receives the marketing site's contact, signup and chat copies
// (VITE_MONITOR_PUBKEY). This module is its pure layer: the profile it
// publishes, the registry row that makes the forum label it, the NIP-98 header
// that authorises the registration, and the check the nightly watch applies.
//
// The identity is LABELLED, never PRIVILEGED. Registration writes an
// `agent_registry` row and nothing else: no cohorts, and above all not the
// `agent` cohort, which receives the zone-4 key wherever `agent_keys = true`.
import { createHash } from 'node:crypto';
import { finalizeEvent } from 'nostr-tools/pure';

export const WEBSITE_INFO = Object.freeze({
  name: 'website-info',
  displayName: 'DreamLab website information',
  about:
    'Receives enquiries, signups and chat messages sent from the DreamLab websites, '
    + 'end-to-end encrypted. Read by a nightly digest for the operator. Not a person, '
    + 'posts nothing, and has no zone access.',
  description:
    'Website information user: recipient of encrypted contact, signup and chat copies; '
    + 'read-only, no cohorts, no zone keys (ADR-2011).',
  nip05Name: 'website',
  domain: 'dreamlab-ai.com',
  rateLimitPerMin: 60,
});

export const WEBSITE_INFO_NIP05 = `${WEBSITE_INFO.nip05Name}@${WEBSITE_INFO.domain}`;

const HEX64 = /^[0-9a-f]{64}$/i;

function canonicalPubkey(pubkey) {
  if (typeof pubkey !== 'string' || !HEX64.test(pubkey)) {
    throw new Error('invalid pubkey: must be 64 hex chars');
  }
  return pubkey.toLowerCase();
}

/** kind-0 content for the identity, as a JSON string. */
export function buildProfileContent() {
  return JSON.stringify({
    name: WEBSITE_INFO.name,
    display_name: WEBSITE_INFO.displayName,
    about: WEBSITE_INFO.about,
    nip05: WEBSITE_INFO_NIP05,
    bot: true,
  });
}

/**
 * Body for POST /api/governance/agents/register. Deliberately has no `cohorts`
 * field: `register` leaves membership untouched, `provision` would not.
 */
export function buildRegisterBody(pubkey) {
  return {
    pubkey: canonicalPubkey(pubkey),
    name: WEBSITE_INFO.name,
    description: WEBSITE_INFO.description,
    rate_limit_per_min: WEBSITE_INFO.rateLimitPerMin,
  };
}

/** The static NIP-05 document served at /.well-known/nostr.json. */
export function buildNostrJson(pubkey) {
  return { names: { [WEBSITE_INFO.nip05Name]: canonicalPubkey(pubkey) } };
}

/** `Authorization` header value for a NIP-98 admin call signed by `sk`. */
export function nip98Header(sk, url, method, body) {
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', createHash('sha256').update(body).digest('hex')]);
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags, content: '' }, sk);
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString('base64')}`;
}

/** Look `pubkey` up in the public GET /api/agents/disclosure document. */
export function classifyDisclosure(doc, pubkey) {
  const want = String(pubkey).toLowerCase();
  const agents = doc && Array.isArray(doc.agents) ? doc.agents : [];
  const hit = agents.find((a) => a && typeof a.pubkey === 'string' && a.pubkey.toLowerCase() === want);
  return hit
    ? { listed: true, name: hit.name, registeredBy: hit.registered_by }
    : { listed: false };
}

/** Nightly-watch problem string, or null when the identity is registered. */
export function disclosureProblem(doc, pubkey) {
  return classifyDisclosure(doc, pubkey).listed
    ? null
    : `${WEBSITE_INFO.name} is not registered in the agent registry (reset-db hazard? re-run scripts/seed/provision-website-info.mjs)`;
}

/**
 * Problem string when a relay /api/check-whitelist answer shows the identity
 * holding any privilege (admin, or any cohort), else null. Run before AND after
 * provisioning so "never privileged" is checked against live state.
 */
export function privilegeProblem(wl) {
  if (!wl || wl.isWhitelisted !== true) return 'not whitelisted on the relay';
  const cohorts = Array.isArray(wl.cohorts) ? wl.cohorts : [];
  if (wl.isAdmin || cohorts.length) {
    return `unexpected privilege (isAdmin=${Boolean(wl.isAdmin)}, cohorts=${JSON.stringify(cohorts)})`;
  }
  return null;
}
