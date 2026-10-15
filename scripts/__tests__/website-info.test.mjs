// Unit tests for the website-information service identity (ADR-2011).
//
// Expectations (EDD), each with its counter-example:
//   E1  The monitor pubkey is presented as one named, bot-flagged identity with a
//       NIP-05 handle.            NOT: an anonymous hex member.
//   E2  Registering it writes a registry row only.
//                                  NOT: cohorts, an `agent` cohort, or any key grant
//                                  (the `agent` cohort receives the zone-4 key).
//   E3  Every place that names the key agrees: deploy env, embed, roster, NIP-05.
//                                  NOT: a rotated key left behind in one mirror.
//   E4  The nightly watch notices when the registry row is gone (reset-db hazard).
//                                  NOT: silent loss of the identity.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateSecretKey, getPublicKey, verifyEvent } from 'nostr-tools/pure';
import { parseToml } from '../lib/toml-lite.mjs';
import {
  WEBSITE_INFO,
  WEBSITE_INFO_NIP05,
  buildProfileContent,
  buildRegisterBody,
  buildNostrJson,
  nip98Header,
  classifyDisclosure,
  disclosureProblem,
  privilegeProblem,
} from '../lib/website-info.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const PK = '4ed429aa7f30d6e63c41be50685cffeb03cd7b07e37d37a0c4ae5321e642aad7';

describe('E1 profile', () => {
  const profile = JSON.parse(buildProfileContent());
  test('is named, bot-flagged and carries the NIP-05 handle', () => {
    expect(profile.name).toBe('website-info');
    expect(profile.display_name).toBe('DreamLab website information');
    expect(profile.bot).toBe(true);
    expect(profile.nip05).toBe('website@dreamlab-ai.com');
    expect(WEBSITE_INFO_NIP05).toBe(profile.nip05);
  });
  test('says what it is for and that it has no access', () => {
    expect(profile.about).toMatch(/enquir/i);
    expect(profile.about).toMatch(/no (zone|forum) access/i);
  });
  test('stays inside a conservative kind-0 size', () => {
    expect(buildProfileContent().length).toBeLessThan(600);
  });
});

describe('E2 registration is a registry row and nothing else', () => {
  test('body carries pubkey, name, description and a rate limit only', () => {
    const b = buildRegisterBody(PK);
    expect(Object.keys(b).sort()).toEqual(['description', 'name', 'pubkey', 'rate_limit_per_min']);
    expect(b.pubkey).toBe(PK);
    expect(b.name).toBe(WEBSITE_INFO.name);
    expect(b.rate_limit_per_min).toBeGreaterThan(0);
  });
  test('never carries cohorts', () => {
    expect(buildRegisterBody(PK)).not.toHaveProperty('cohorts');
  });
  test('lowercases an upper-case pubkey', () => {
    expect(buildRegisterBody(PK.toUpperCase()).pubkey).toBe(PK);
  });
  test.each(['', 'abc', 'z'.repeat(64), PK + '0'])('rejects malformed pubkey %j', (bad) => {
    expect(() => buildRegisterBody(bad)).toThrow(/64 hex/);
  });
});

describe('nip98Header', () => {
  const sk = generateSecretKey();
  const decode = (h) => JSON.parse(Buffer.from(h.replace(/^Nostr /, ''), 'base64').toString());
  test('signs a kind-27235 event bound to url, method and body hash', () => {
    const body = JSON.stringify({ a: 1 });
    const ev = decode(nip98Header(sk, 'https://x.test/api', 'POST', body));
    expect(ev.kind).toBe(27235);
    expect(ev.pubkey).toBe(getPublicKey(sk));
    expect(ev.tags).toContainEqual(['u', 'https://x.test/api']);
    expect(ev.tags).toContainEqual(['method', 'POST']);
    expect(ev.tags).toContainEqual(['payload', createHash('sha256').update(body).digest('hex')]);
    expect(verifyEvent(ev)).toBe(true);
  });
  test('omits the payload tag when there is no body', () => {
    const ev = decode(nip98Header(sk, 'https://x.test/api', 'GET'));
    expect(ev.tags.some((t) => t[0] === 'payload')).toBe(false);
  });
});

describe('E4 disclosure check', () => {
  const doc = (agents) => ({ agents });
  test('classifies a listed agent, case-insensitively', () => {
    const c = classifyDisclosure(doc([{ name: 'website-info', pubkey: PK.toUpperCase(), registered_by: 'abc' }]), PK);
    expect(c).toEqual({ listed: true, name: 'website-info', registeredBy: 'abc' });
  });
  test('classifies an absent agent', () => {
    expect(classifyDisclosure(doc([{ name: 'x', pubkey: 'f'.repeat(64), registered_by: 'a' }]), PK).listed).toBe(false);
  });
  test('treats a malformed document as not listed rather than throwing', () => {
    for (const bad of [null, undefined, {}, { agents: 'no' }, 'x']) {
      expect(classifyDisclosure(bad, PK).listed).toBe(false);
    }
  });
  test('problem is null when listed and names the hazard when not', () => {
    expect(disclosureProblem(doc([{ name: 'website-info', pubkey: PK, registered_by: 'a' }]), PK)).toBeNull();
    expect(disclosureProblem(doc([]), PK)).toMatch(/website-info.*not.*registered.*reset-db/i);
  });
});

describe('E2 live privilege check', () => {
  test('accepts a whitelisted row with no cohorts and no admin', () => {
    expect(privilegeProblem({ isWhitelisted: true, isAdmin: false, cohorts: [] })).toBeNull();
  });
  test.each([
    [{ isWhitelisted: true, isAdmin: false, cohorts: ['agent'] }, /cohorts=\["agent"\]/],
    [{ isWhitelisted: true, isAdmin: true, cohorts: [] }, /isAdmin=true/],
    [{ isWhitelisted: false }, /not whitelisted/],
    [null, /not whitelisted/],
  ])('flags %j', (wl, re) => {
    expect(privilegeProblem(wl)).toMatch(re);
  });
});

describe('E3 mirrors agree on the key', () => {
  const toml = parseToml(read('forum-config/dreamlab.toml'));
  const entry = toml.agents.find((a) => a.label === 'website-info');

  test('NIP-05 document maps the handle to the monitor key', () => {
    const j = JSON.parse(read('public/.well-known/nostr.json'));
    expect(j).toEqual(buildNostrJson(PK));
    expect(j.names.website).toBe(PK);
  });
  test('deploy env, embed and roster all name the same key', () => {
    expect(read('.github/workflows/deploy.yml')).toContain(`VITE_MONITOR_PUBKEY: '${PK}'`);
    expect(read('scripts/contact-embed/entry.ts')).toContain(`MONITOR_PUBKEY = "${PK}"`);
    expect(entry.pubkey).toBe(PK);
  });
  test('roster entry is authorised by the operator and carries no cohorts', () => {
    expect(entry.authorised_by).toBe('6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a');
    expect(entry.cohorts).toEqual([]);
  });
  test('COUNTER-EXAMPLE: no agent-cohort grant, which would hand over the zone-4 key', () => {
    expect(entry.cohorts).not.toContain('agent');
  });
});
