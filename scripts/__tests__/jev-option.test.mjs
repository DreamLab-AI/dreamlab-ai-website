// Jev option (DW-02-S1-01 enquiry topic tag, DW-06-S1-01 claim checker).
// Transport is mocked: no test here touches the network or process.env.
import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import { resolveJev, callSystemOne, readChoice, readNoul } from '../lib/jev.mjs';
import { tagEnquiries, buildTopicRequest, ENQUIRY_TOPICS } from '../lib/enquiry-topic.mjs';
import { digestLines } from '../lib/digest.mjs';
import { extractClaims, classifyDeterministic, checkClaims, buildClaimRequest, formatReport, STATUSES } from '../lib/claims.mjs';

const LOCAL = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://127.0.0.1:9/v1/systemone', DREAMLAB_JEV_LOCAL: '1' };
const okFetch = (answers, spy) => async (url, init) => {
  spy?.push({ url, init, body: JSON.parse(init.body) });
  return { ok: true, status: 200, json: async () => ({ model: 'm', answers }) };
};
const statusFetch = (status) => async () => ({ ok: false, status, json: async () => ({}) });
const badJsonFetch = async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad'); } });
const throwingFetch = async () => { throw new Error('boom'); };
const hangingFetch = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));

describe('resolveJev', () => {
  test('flag off by default, whatever else is set', () => {
    expect(resolveJev({}, { prefix: 'DREAMLAB_JEV', localOnly: true })).toEqual({ ok: false, reason: 'flag-off' });
    expect(resolveJev({ ...LOCAL, DREAMLAB_JEV: '0' }, { prefix: 'DREAMLAB_JEV', localOnly: true }).reason).toBe('flag-off');
  });
  test('local-only: explicit needs _LOCAL, proxy needs BACKEND_LOCAL, vendor never', () => {
    const o = { prefix: 'DREAMLAB_JEV', localOnly: true };
    expect(resolveJev({ DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' }, o).reason).toBe('no-endpoint');
    expect(resolveJev(LOCAL, o).ok).toBe(true);
    const proxy = { DREAMLAB_JEV: '1', AGENTBOX_SYSTEM_ONE_PROXY: '1', AGENTBOX_SYSTEM_ONE_ENDPOINT: 'http://p', AGENTBOX_SYSTEM_ONE_MODEL: 'm' };
    expect(resolveJev(proxy, o).reason).toBe('no-endpoint');
    const r = resolveJev({ ...proxy, AGENTBOX_SYSTEM_ONE_BACKEND_LOCAL: '1' }, o);
    expect(r.ok && r.cfg.bearer === undefined && r.cfg.endpoint === 'http://p').toBe(true);
    expect(resolveJev({ DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k' }, o).reason).toBe('no-endpoint');
  });
  test('public consumer: explicit > proxy > vendor with key; no key => unavailable', () => {
    const o = { prefix: 'DREAMLAB_JEV', localOnly: false };
    expect(resolveJev({ DREAMLAB_JEV: '1' }, o).reason).toBe('no-endpoint');
    const v = resolveJev({ DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k' }, o);
    expect(v.cfg).toMatchObject({ endpoint: 'https://api.typesafe.ai/v1/systemone', model: 'jev-latest', bearer: 'k' });
    const p = resolveJev({ DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k', AGENTBOX_SYSTEM_ONE_PROXY: '1', AGENTBOX_SYSTEM_ONE_ENDPOINT: 'http://p', AGENTBOX_SYSTEM_ONE_MODEL: 'pm' }, o);
    expect(p.cfg).toMatchObject({ endpoint: 'http://p', model: 'pm' });
    expect(p.cfg.bearer).toBeUndefined();
    const e = resolveJev({ DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://e', DREAMLAB_JEV_KEY_ENV: 'K', K: 's', TYPESAFE_API_KEY: 'k' }, o);
    expect(e.cfg).toMatchObject({ endpoint: 'http://e', bearer: 's' });
  });
  test('accepts the boot projector aliases without leaking vendor credentials', () => {
    const env = { DREAMLAB_JEV: '1', AGENTBOX_SYSTEM_ONE_PROXY: '1',
      AGENTBOX_SKILL_ROUTE_API: 'http://127.0.0.1:8094/v1/systemone',
      AGENTBOX_SKILL_ROUTE_MODEL: 'subq-snap-preview', TYPESAFE_API_KEY: 'unused' };
    const result = resolveJev(env, { prefix: 'DREAMLAB_JEV', localOnly: false });
    expect(result.cfg.endpoint).toBe(env.AGENTBOX_SKILL_ROUTE_API);
    expect(result.cfg.model).toBe('subq-snap-preview');
    expect(result.cfg.bearer).toBeUndefined();
    expect(resolveJev(env, { prefix: 'DREAMLAB_JEV', localOnly: true }).ok).toBe(false);
  });
  test('deadline is capped at 4 s', () => {
    expect(resolveJev({ ...LOCAL, DREAMLAB_JEV_TIMEOUT_MS: '60000' }, { prefix: 'DREAMLAB_JEV', localOnly: true }).cfg.timeoutMs).toBe(4000);
  });
});

describe('callSystemOne', () => {
  const cfg = { endpoint: 'http://x', model: 'jev-latest', bearer: 'tok', timeoutMs: 50 };
  test('sends model, JSON content type and bearer; no bearer for proxy', async () => {
    const spy = [];
    await callSystemOne(cfg, { state: 's', questions: {} }, okFetch({ a: { type: 'noul', noul: 0.5 } }, spy));
    expect(spy[0].body.model).toBe('jev-latest');
    expect(spy[0].init.headers.Authorization).toBe('Bearer tok');
    const spy2 = [];
    await callSystemOne({ ...cfg, bearer: undefined }, { state: 's', questions: {} }, okFetch({ a: { type: 'noul', noul: 0.5 } }, spy2));
    expect(spy2[0].init.headers.Authorization).toBeUndefined();
  });
  test('maps every failure to a reason and never throws', async () => {
    expect(await callSystemOne(cfg, {}, throwingFetch)).toEqual({ ok: false, reason: 'timeout' });
    expect(await callSystemOne(cfg, {}, hangingFetch)).toEqual({ ok: false, reason: 'timeout' });
    expect(await callSystemOne(cfg, {}, statusFetch(429))).toEqual({ ok: false, reason: 'http-429' });
    expect(await callSystemOne(cfg, {}, statusFetch(529))).toEqual({ ok: false, reason: 'http-529' });
    expect(await callSystemOne(cfg, {}, statusFetch(500))).toEqual({ ok: false, reason: 'http-500' });
    expect(await callSystemOne(cfg, {}, badJsonFetch)).toEqual({ ok: false, reason: 'malformed' });
    expect(await callSystemOne(cfg, {}, okFetch({}))).toEqual({ ok: false, reason: 'malformed' });
  });
  test('readChoice rejects keys outside the set and derives confidence', () => {
    expect(readChoice({ q: { type: 'choice', choice: 'x', confidence: 0.9 } }, 'q', ['a', 'b'])).toBeNull();
    expect(readChoice({ q: { type: 'noul', noul: 1 } }, 'q', ['a'])).toBeNull();
    const c = readChoice({ q: { type: 'choice', choice: 'a', probabilities: { a: 0.6, b: 0.2, c: 0.2 } } }, 'q', ['a', 'b', 'c']);
    expect(c.confidence).toBeCloseTo(0.4, 9);
    expect(readNoul({ n: { type: 'noul', noul: 1.5 } }, 'n')).toBeNull();
  });
});

describe('DW-02 enquiry topic tag', () => {
  const fresh = [
    { kind: 'enquiry', source: 'website_contact_form', name: 'Ann', email: 'a@x.co', detail: 'ktp', excerpt: 'We would like a KTP', excerptFull: 'We would like a KTP with our university', at: 1 },
    { kind: 'signup', source: 's', name: '', email: 'b@x.co', detail: '', excerpt: '', at: 2 },
    { kind: 'chat', source: 'talk_to_ai', excerpt: 'hello', at: 3 },
    { kind: 'enquiry', source: 'website_contact_form', name: 'Bo', email: 'b@y.co', detail: 'other', excerpt: 'hi', excerptFull: 'hi', at: 4 },
  ];
  const baseline = digestLines(fresh);
  const good = { topic: { type: 'choice', choice: 'ktp', confidence: 0.9 }, missing_input: { type: 'noul', noul: 0.8 } };

  test('Contact.tsx ENQUIRY_TYPES and the topic catalogue agree', () => {
    const src = fs.readFileSync('src/pages/Contact.tsx', 'utf8');
    const block = src.match(/const ENQUIRY_TYPES = \[([\s\S]*?)\] as const;/)[1];
    const values = [...block.matchAll(/value:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(Object.keys(ENQUIRY_TOPICS).sort()).toEqual(values.sort());
  });

  test('wire shape: Choice criteria is a map incl. other, Noul present, no name/email sent', () => {
    const r = buildTopicRequest(fresh[0]);
    expect(Array.isArray(r.questions.topic.criteria)).toBe(false);
    expect(r.questions.topic.criteria.other).toBeTruthy();
    expect(r.questions.missing_input.type).toBe('noul');
    const wire = JSON.stringify(r);
    expect(wire).not.toContain('a@x.co');
    expect(wire).not.toContain('Ann');
    expect(r.state.enquiry_message).toContain('KTP');
  });

  test('fallback equivalence: off / no endpoint / non-local / error / timeout / malformed / low confidence => digest identical', async () => {
    const cases = [
      { env: {}, fetchImpl: okFetch(good) },
      { env: { DREAMLAB_JEV: '1' }, fetchImpl: okFetch(good) },
      { env: { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x', DREAMLAB_JEV_TOPIC_LOCAL_ONLY: '1' }, fetchImpl: okFetch(good) }, // local-only, not declared local
      { env: { DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k', DREAMLAB_JEV_TOPIC_LOCAL_ONLY: '1' }, fetchImpl: okFetch(good) }, // local-only refuses the vendor
      { env: LOCAL, fetchImpl: statusFetch(500) },
      { env: LOCAL, fetchImpl: statusFetch(429) },
      { env: LOCAL, fetchImpl: throwingFetch },
      { env: { ...LOCAL, DREAMLAB_JEV_TIMEOUT_MS: '20' }, fetchImpl: hangingFetch },
      { env: LOCAL, fetchImpl: badJsonFetch },
      { env: LOCAL, fetchImpl: okFetch({ topic: { type: 'choice', choice: 'workshop', confidence: 0.99 }, missing_input: { type: 'noul', noul: 0.1 } }) },
      { env: LOCAL, fetchImpl: okFetch({ topic: good.topic }) },
      { env: LOCAL, fetchImpl: okFetch({ topic: { type: 'choice', choice: 'ktp', confidence: 0.1 }, missing_input: good.missing_input }) },
    ];
    for (const c of cases) {
      const out = await tagEnquiries(fresh, c);
      expect(out).toEqual(fresh);
      expect(digestLines(out)).toEqual(baseline);
    }
  });

  test('default is not local-only: proxy and vendor are used; DREAMLAB_JEV_TOPIC_LOCAL_ONLY=1 refuses them', async () => {
    const proxy = { DREAMLAB_JEV: '1', AGENTBOX_SYSTEM_ONE_PROXY: '1', AGENTBOX_SYSTEM_ONE_ENDPOINT: 'http://agentbox:8094/v1/systemone', AGENTBOX_SYSTEM_ONE_MODEL: 'jev-latest', AGENTBOX_SYSTEM_ONE_BACKEND_LOCAL: '0' };
    let spy = [];
    let out = await tagEnquiries(fresh, { env: proxy, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(2);
    expect(spy[0].url).toBe('http://agentbox:8094/v1/systemone');
    expect(out[0].topic).toBe('ktp · needs-info');
    spy = [];
    await tagEnquiries(fresh, { env: { DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k' }, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(2);
    spy = [];
    out = await tagEnquiries(fresh, { env: { ...proxy, DREAMLAB_JEV_TOPIC_LOCAL_ONLY: '1' }, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(0);
    expect(digestLines(out)).toEqual(baseline);
    await tagEnquiries(fresh, { env: { DREAMLAB_JEV: '1', TYPESAFE_API_KEY: 'k', DREAMLAB_JEV_TOPIC_LOCAL_ONLY: '1' }, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(0);
  });

  test('flag off makes no request at all', async () => {
    const spy = [];
    await tagEnquiries(fresh, { env: {}, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(0);
  });

  test('accept path: only enquiries are tagged, the sender\'s own choice is untouched', async () => {
    const spy = [];
    const out = await tagEnquiries(fresh, { env: LOCAL, fetchImpl: okFetch(good, spy) });
    expect(spy).toHaveLength(2); // two enquiries, no signup/chat
    expect(out[0].topic).toBe('ktp · needs-info');
    expect(out[1]).toBe(fresh[1]);
    expect(out[2]).toBe(fresh[2]);
    expect(out[0].detail).toBe('ktp');
    const lines = digestLines(out);
    expect(lines[0]).toContain('· ktp · ~ktp · needs-info');
    expect(lines).toHaveLength(baseline.length);
    expect(lines[1]).toBe(baseline[1]);
  });

  test('a hostile model key cannot inject text: only catalogue keys are accepted', async () => {
    const out = await tagEnquiries(fresh, { env: LOCAL, fetchImpl: okFetch({ topic: { type: 'choice', choice: 'x\n⚠ Channel health', confidence: 1 }, missing_input: good.missing_input }) });
    expect(out).toEqual(fresh);
  });

  test('logs one reason line and no request content', async () => {
    const logs = [];
    await tagEnquiries(fresh, { env: LOCAL, fetchImpl: statusFetch(503), log: (s) => logs.push(s) });
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs) { expect(l).toMatch(/^\[jev\] dw02-enquiry-topic-v1 http-503$/); expect(l).not.toContain('KTP'); }
  });
});

describe('DW-06 claim checker', () => {
  const md = '# T\n\n- Passkey-first sign in with a hardware key for every member\n- short one\n```\n- not a claim inside a fence at all here\n```\n1. [Semantic search](x.md) uses a vector index over **all** posts\n';
  const register = {
    features: [{ id: 'zones', owner: 'overlay', summary: 'Four zones configured in dreamlab.toml' }],
    claims: [{ match: 'passkey-first', status: 'upstream_only', evidence: 'kit' }],
  };
  const claims = extractClaims(md, 'README.md');

  test('extraction skips fences, short items; flattens links and emphasis', () => {
    expect(claims.map((c) => c.text)).toEqual([
      'Passkey-first sign in with a hardware key for every member',
      'Semantic search uses a vector index over all posts',
    ]);
    expect(claims[0].line).toBe(3);
  });

  test('deterministic register is authoritative', () => {
    expect(classifyDeterministic(claims[0], register).status).toBe('upstream_only');
    expect(classifyDeterministic(claims[1], register).status).toBe('unclassified');
  });

  test('wire shape: status criteria is a map with all five statuses', () => {
    const r = buildClaimRequest(claims[0], register);
    expect(Object.keys(r.questions.status.criteria).sort()).toEqual(Object.keys(STATUSES).sort());
    expect(Array.isArray(r.questions.status.criteria)).toBe(false);
    expect(r.state.feature_notes[0].id).toBe('zones');
  });

  test('fallback equivalence: results and report equal the flag-off run for every trigger', async () => {
    const off = await checkClaims(claims, register, { env: {} });
    expect(off.advisory).toEqual([]);
    const reportOff = formatReport(off);
    const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };
    const triggers = [
      { env: { DREAMLAB_JEV: '1' }, fetchImpl: okFetch({}) }, // no endpoint
      { env, fetchImpl: statusFetch(500) },
      { env, fetchImpl: throwingFetch },
      { env: { ...env, DREAMLAB_JEV_TIMEOUT_MS: '20' }, fetchImpl: hangingFetch },
      { env, fetchImpl: badJsonFetch },
      { env, fetchImpl: okFetch({ status: { type: 'choice', choice: 'nonsense', confidence: 1 }, evidence_sufficient: { type: 'noul', noul: 1 } }) },
      { env, fetchImpl: okFetch({ status: { type: 'choice', choice: 'stale', confidence: 0.05 }, evidence_sufficient: { type: 'noul', noul: 1 } }) },
    ];
    for (const t of triggers) {
      const r = await checkClaims(claims, register, t);
      expect(r.results).toEqual(off.results); // verdicts never change
      expect(r.advisory).toEqual([]);
    }
    expect(reportOff).toContain('1 upstream_only');
  });

  test('accept path: suggests for unclassified, flags disagreement, never alters verdicts', async () => {
    const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };
    const answers = { status: { type: 'choice', choice: 'supported_here', confidence: 0.9 }, evidence_sufficient: { type: 'noul', noul: 0.7 } };
    const off = await checkClaims(claims, register, { env: {} });
    const on = await checkClaims(claims, register, { env, fetchImpl: okFetch(answers) });
    expect(on.results).toEqual(off.results);
    expect(on.advisory.map((a) => a.kind)).toEqual(['disagreement', 'suggestion']);
    const report = formatReport(on);
    expect(report).toContain('advisory only, never a verdict');
  });

  test('no feature notes in the register => no request is made (ungrounded)', async () => {
    const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };
    const spy = [];
    const answers = { status: { type: 'choice', choice: 'supported_here', confidence: 0.9 }, evidence_sufficient: { type: 'noul', noul: 0.9 } };
    const r = await checkClaims(claims, { features: [], claims: register.claims }, { env, fetchImpl: okFetch(answers, spy) });
    expect(spy).toHaveLength(0);
    expect(r.advisory).toEqual([]);
    expect(r.jev).toBe('no-evidence');
    expect(r.results).toEqual((await checkClaims(claims, { features: [], claims: register.claims }, { env: {} })).results);
  });

  test('insufficient evidence suppresses the advisory', async () => {
    const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };
    const answers = { status: { type: 'choice', choice: 'supported_here', confidence: 0.9 }, evidence_sufficient: { type: 'noul', noul: 0.2 } };
    const r = await checkClaims(claims, register, { env, fetchImpl: okFetch(answers) });
    expect(r.advisory).toEqual([]);
  });

  test('agreement with the register produces no note', async () => {
    const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };
    const answers = { status: { type: 'choice', choice: 'upstream_only', confidence: 0.9 }, evidence_sufficient: { type: 'noul', noul: 0.7 } };
    const on = await checkClaims([claims[0]], register, { env, fetchImpl: okFetch(answers) });
    expect(on.advisory).toEqual([]);
  });
});

describe('DW-06 seeded claims register (real README + docs/claims-register.json)', () => {
  const rd = (f) => fs.readFileSync(f, 'utf8'); // vitest runs from the repo root
  const register = JSON.parse(rd('docs/claims-register.json'));
  const claims = extractClaims(rd('README.md'), 'README.md');
  const env = { DREAMLAB_JEV: '1', DREAMLAB_JEV_ENDPOINT: 'http://x' };

  test('every register evidence citation resolves to an existing file and line', () => {
    for (const c of register.claims) {
      for (const m of c.evidence.matchAll(/([\w./-]+\.(?:toml|mjs)):(\d+)/g)) {
        const lines = rd(m[1]).split('\n');
        expect(lines.length).toBeGreaterThanOrEqual(Number(m[2]));
      }
    }
  });

  test('flag-off: only the two cited claims classify; verdicts and report are stable', async () => {
    const off = await checkClaims(claims, register, { env: {} });
    expect(off.jev).toBe('flag-off');
    expect(off.advisory).toEqual([]);
    expect(off.results.filter((r) => r.status === 'supported_here').map((r) => r.line)).toEqual([80, 83]);
    expect(off.results.filter((r) => r.status === 'unclassified')).toHaveLength(claims.length - 2);
  });

  test('accept path via mocked transport: advisory on an uncited claim, verdicts unchanged', async () => {
    const off = await checkClaims(claims, register, { env: {} });
    const answers = { status: { type: 'choice', choice: 'upstream_only', confidence: 0.9 }, evidence_sufficient: { type: 'noul', noul: 0.8 } };
    const spy = [];
    const on = await checkClaims(claims, register, { env, fetchImpl: okFetch(answers, spy) });
    expect(spy.length).toBeGreaterThan(0);
    expect(on.results).toEqual(off.results);
    expect(on.advisory.some((a) => a.kind === 'suggestion' && a.jev === 'upstream_only')).toBe(true);
    expect(on.advisory.some((a) => a.kind === 'disagreement' && a.register === 'supported_here')).toBe(true);
  });
});

test('shipped claims register cites files and classifies the README claims', () => {
  const register = JSON.parse(fs.readFileSync('docs/claims-register.json', 'utf8'));
  expect(register.features.length).toBeGreaterThan(0);
  for (const feature of register.features) {
    expect(feature.evidence.length).toBeGreaterThan(0);
    for (const path of feature.evidence) expect(fs.existsSync(path), path).toBe(true);
  }
  const claims = extractClaims(fs.readFileSync('README.md', 'utf8'));
  for (const entry of register.claims) {
    const claim = claims.find((c) => c.text.toLowerCase().includes(entry.match.toLowerCase()));
    expect(claim, entry.match).toBeDefined();
    expect(classifyDeterministic(claim, register).status).toBe(entry.status);
  }
});

test('reads native System One answers without redundant type discriminators', () => {
  expect(readChoice({ pick: { choice: 'a', confidence: 0.8 } }, 'pick', ['a', 'b']))
    .toEqual({ key: 'a', confidence: 0.8 });
  expect(readNoul({ support: { noul: 0.7 } }, 'support')).toBe(0.7);
  expect(readChoice({ pick: { type: 'noul', choice: 'a', confidence: 0.8 } }, 'pick', ['a', 'b'])).toBeNull();
  expect(readNoul({ support: { type: 'choice', noul: 0.7 } }, 'support')).toBeNull();
  expect(readChoice({ pick: { choice: 'outside', confidence: 0.8 } }, 'pick', ['a', 'b'])).toBeNull();
  expect(readNoul({ support: { noul: 1.1 } }, 'support')).toBeNull();
});
