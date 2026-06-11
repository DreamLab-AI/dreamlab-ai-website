/**
 * grant-agent-pod-read.mjs — WAC-native delegation (ADR-028 personalisation path).
 *
 * AS THE OWNER (carol, friends-carol key) PUTs an `.acl` sidecar that grants
 * the per-user AGENT key `acl:Read` on the agent identity folder, so the agent
 * — authenticating with its own NIP-98 (did:nostr:<agent-pubkey>) — can GET
 * SOUL.md / USER.md from both private/agent/ and public/agent/.
 *
 * This is delegation, NOT a worker bypass: the pod worker's existing
 * evaluate_access() matches `acl:agent` @id == "did:nostr:<requester-pubkey>".
 * We simply author an ACL the worker already understands.
 *
 * The pod worker's find_effective_acl() walks UP the container tree looking for
 * the sidecar key `pods/<owner>{path}.acl` and returns the FIRST it finds (no
 * merge). CRITICAL: the walk strips the trailing slash before deriving the
 * parent, so for a resource `/private/agent/SOUL.md` it probes, in order:
 *     /private/agent/SOUL.md.acl  →  /private/agent.acl  →  /private.acl  →  /.acl
 * It NEVER probes `/private/agent/.acl` (a trailing-slash container sidecar) nor
 * the provisioned `/private/.acl`; those keys are unreachable by this resolver.
 * The most-specific REACHABLE key for the agent folder is therefore the flat
 * sidecar `/<tier>/agent.acl`. Because the resolver does not merge, this sidecar
 * must SELF-CONTAIN the owner's full-control grant (else the agent grant would
 * shadow the root owner ACL and lock the owner out of the agent folder) plus the
 * new agent read grant. accessTo/default target the absolute container path so
 * the grant covers `/<tier>/agent` and every child (SOUL.md, USER.md, ...).
 *
 * Run from /home/devuser/workspace/dreamlab-ai-website so nostr-tools resolves:
 *   node scripts/seed/grant-agent-pod-read.mjs
 *
 * The agent pubkey is fixed for the prototype (carol-agent). Override with
 * AGENT_PUBKEY=<64hex> if a different delegate is provisioned.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';

const POD = process.env.POD_BASE || 'https://dreamlab-pod-api.solitary-paper-764d.workers.dev';

const k = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const ownerSk = Uint8Array.from(Buffer.from(k['friends-carol'].privkey, 'hex'));
const ownerPk = getPublicKey(ownerSk);

// The per-user agent's delegated pubkey (carol-agent). Fixed for the prototype.
const AGENT_PUBKEY = (process.env.AGENT_PUBKEY
  || 'f8c798c686428606c71cf3348a401c7d90b25633d6c818b08e30d473f4082533').trim().toLowerCase();

if (!/^[0-9a-f]{64}$/.test(AGENT_PUBKEY)) {
  console.error('AGENT_PUBKEY must be 64 hex chars');
  process.exit(1);
}

const ownerDid = `did:nostr:${ownerPk}`;
const agentDid = `did:nostr:${AGENT_PUBKEY}`;

const now = () => Math.floor(Date.now() / 1000);

// NIP-98 — signed by the OWNER. PUT carries a body, so include the payload tag.
function nip98(url, method, body) {
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', createHash('sha256').update(body).digest('hex')]);
  return 'Nostr ' + Buffer.from(JSON.stringify(
    finalizeEvent({ kind: 27235, created_at: now(), tags, content: '' }, ownerSk),
  )).toString('base64');
}

/**
 * Build a self-contained agent-folder ACL: owner keeps full control, agent gets
 * read. accessTo + default target the absolute container path so the grant
 * covers SOUL.md, USER.md, and anything else the agent folder holds. The
 * worker's evaluate_access matches accessTo == resource OR resource starts with
 * `{accessTo}/`, so the absolute `/private/agent` covers `/private/agent/SOUL.md`.
 */
function agentFolderAcl(containerPath) {
  return JSON.stringify({
    '@context': { acl: 'http://www.w3.org/ns/auth/acl#' },
    '@graph': [
      {
        '@id': '#owner',
        'acl:agent': { '@id': ownerDid },
        'acl:accessTo': { '@id': containerPath },
        'acl:default': { '@id': containerPath },
        'acl:mode': [{ '@id': 'acl:Read' }, { '@id': 'acl:Write' }, { '@id': 'acl:Control' }],
      },
      {
        '@id': '#agent',
        'acl:agent': { '@id': agentDid },
        'acl:accessTo': { '@id': containerPath },
        'acl:default': { '@id': containerPath },
        'acl:mode': { '@id': 'acl:Read' },
      },
    ],
  }, null, 2);
}

async function putAcl(tier) {
  // Flat sidecar key (no trailing-slash container dir) so find_effective_acl's
  // walk-up actually lands on it: it probes `/<tier>/agent.acl`.
  const url = `${POD}/pods/${ownerPk}/${tier}/agent.acl`;
  const body = agentFolderAcl(`/${tier}/agent`);
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: nip98(url, 'PUT', body), 'Content-Type': 'application/ld+json' },
    body,
  });
  const txt = r.ok ? 'OK' : await r.text().catch(() => '');
  console.log(`PUT ${tier}/agent.acl: ${r.status} ${txt}`.slice(0, 140));
  return r.ok;
}

console.log('owner (carol) pubkey:', ownerPk);
console.log('agent pubkey:', AGENT_PUBKEY);
console.log('owner did:', ownerDid);
console.log('agent did:', agentDid);
console.log('pod:', POD);

const okPriv = await putAcl('private');
const okPub = await putAcl('public');

if (!okPriv && !okPub) {
  console.error('Both ACL PUTs failed — owner NIP-98 / Control on agent folder not granted.');
  process.exit(1);
}
console.log('done.');
