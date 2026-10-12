// Unit tests for the nightly SEO / agent-searchability watch (ADR-2010).
// Everything here is the pure layer: HTML analysis, robots.txt matching,
// parity, Lighthouse parsing and regression logic, the roster, the patch
// validator (including bypass attempts), secret scrubbing, SSE framing and
// the advise decision. The network and git layers are exercised nightly.
import { describe, test, expect } from 'vitest';
import * as C from '../seo-watch/lib/checks.mjs';
import { parseSseFrames } from '../seo-watch/lib/mcp-sse.mjs';
import { extractAdvice, validatePatch, clearedEnv, isProposalBranch, porcelainEntries } from '../seo-watch/lib/propose.mjs';
import { scrubSecrets, redactHeaders } from '../seo-watch/lib/safety.mjs';
import { decideAdvise, buildPrompt, monthTokens } from '../seo-watch/lib/advise.mjs';

const ORIGIN = 'https://dreamlab-ai.com';
const page = (url, { title = 'AI & Agents Residential Training in the Lake District | DreamLab', desc = 'Residential AI and agentic training in the Lake District, Cumbria. Teams build with specialists in AI, XR, cyber trust and creative technology.', canonical = url, extraHead = '', body = `<main><h1>Applied Innovation Lab</h1><p>${'Real content. '.repeat(30)}</p></main>`, lang = 'en-GB' } = {}) => `<!doctype html><html${lang ? ` lang="${lang}"` : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title><meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:image" content="${ORIGIN}/images/venue/aerial.webp"><meta property="og:url" content="${url}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json" id="route-structured-data">{"@context":"https://schema.org","@type":"WebPage","name":"${title}","url":"${url}"}</script>
${extraHead}</head><body><div id="root">${body}</div></body></html>`;

const analyse = (url, html, extra = {}) => C.analysePage({ url, status: 200, finalUrl: url, redirects: [], contentType: 'text/html; charset=utf-8', headers: {}, html, ...extra });

describe('analysePage', () => {
  test('a well-formed prerendered page yields no findings', () => {
    expect(analyse(`${ORIGIN}/`, page(`${ORIGIN}/`))).toEqual([]);
  });
  test('non-200 is a single high finding', () => {
    const out = analyse(`${ORIGIN}/missing/`, '', { status: 404 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ check: 'page-status', severity: 'high' });
  });
  test('canonical mismatch, noindex and thin body are high', () => {
    const html = page(`${ORIGIN}/team/`, { canonical: `${ORIGIN}/`, extraHead: '<meta name="robots" content="noindex">', body: '<main><h1>x</h1></main>' });
    const checks = analyse(`${ORIGIN}/team/`, html).map((f) => `${f.check}:${f.severity}`);
    expect(checks).toContain('canonical-mismatch:high');
    expect(checks).toContain('page-noindex-meta:high');
    expect(checks).toContain('body-thin:high');
  });
  test('x-robots-tag noindex header is caught even with a clean document', () => {
    const out = analyse(`${ORIGIN}/`, page(`${ORIGIN}/`), { headers: { 'x-robots-tag': 'noindex, nofollow' } });
    expect(out.map((f) => f.check)).toContain('page-noindex-header');
  });
  test('lesson pages need a markdown alternate; invalid JSON-LD is high', () => {
    const url = `${ORIGIN}/workshops/foo/01-intro/`;
    const out = analyse(url, page(url, { extraHead: '<script type="application/ld+json">{not json</script>' }));
    expect(out.map((f) => f.check)).toEqual(expect.arrayContaining(['lesson-markdown-alternate', 'jsonld-invalid']));
    const ok = analyse(url, page(url, { extraHead: `<link rel="alternate" type="text/markdown" href="/data/workshops/foo/01-intro.md">` }));
    expect(ok.map((f) => f.check)).not.toContain('lesson-markdown-alternate');
  });
  test('redirect chains and missing og tags are medium', () => {
    const html = page(`${ORIGIN}/`).replace(/<meta property="og:image"[^>]*>/, '');
    const out = analyse(`${ORIGIN}/`, html, { redirects: ['301 https://dreamlab-ai.com/'] });
    expect(out).toEqual(expect.arrayContaining([expect.objectContaining({ check: 'page-redirect-chain', severity: 'medium' }), expect.objectContaining({ check: 'og-missing', detail: 'missing og:image' })]));
  });
  test('length checks are low and quote the lengths', () => {
    const out = analyse(`${ORIGIN}/`, page(`${ORIGIN}/`, { title: 'Short', desc: 'x'.repeat(200) }));
    expect(out.find((f) => f.check === 'title-length')).toMatchObject({ severity: 'low' });
    expect(out.find((f) => f.check === 'description-length').detail).toMatch(/200 chars/);
  });
});

describe('robots.txt', () => {
  const txt = `User-agent: *\nAllow: /\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: PerplexityBot\nUser-agent: ClaudeBot\nAllow: /\nDisallow: /admin/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
  test('longest match per RFC 9309 and group selection', () => {
    const { groups } = C.parseRobots(txt);
    expect(C.robotsAllows(groups, 'Googlebot', '/')).toBe(true);
    expect(C.robotsAllows(groups, 'Googlebot', '/api/x')).toBe(false);
    expect(C.robotsAllows(groups, 'GPTBot', '/')).toBe(false);
    expect(C.robotsAllows(groups, 'ClaudeBot', '/')).toBe(true);
    expect(C.robotsAllows(groups, 'ClaudeBot', '/admin/')).toBe(false);
  });
  test('a blocked agent is a high finding; unaddressed agents are a note, not a finding', () => {
    const r = C.analyseRobots(txt, { agents: ['GPTBot', 'ClaudeBot', 'Bingbot'], sitemapUrl: `${ORIGIN}/sitemap.xml` });
    expect(r.out).toEqual([expect.objectContaining({ check: 'robots-agent-blocked', severity: 'high', detail: expect.stringContaining('GPTBot') })]);
    expect(r.notes[0]).toMatch(/Bingbot/);
    expect(r.notes[0]).not.toMatch(/ClaudeBot/);
  });
  test('missing sitemap directive and empty file', () => {
    expect(C.analyseRobots('User-agent: *\nAllow: /', { agents: [] }).out.map((f) => f.check)).toEqual(['robots-no-sitemap']);
    expect(C.analyseRobots('', { agents: [] }).out[0].check).toBe('robots-missing');
  });
});

describe('sitemap and llms.txt', () => {
  test('sitemap duplicates, foreign origins and small counts', () => {
    const xml = `<urlset><url><loc>${ORIGIN}/</loc><lastmod>2099-01-01</lastmod></url><url><loc>${ORIGIN}/</loc></url><url><loc>https://other.example/</loc></url></urlset>`;
    const r = C.analyseSitemap(xml, { origin: ORIGIN, minUrls: 20, now: new Date('2026-10-12') });
    expect(r.urls).toEqual([`${ORIGIN}/`, 'https://other.example/']);
    expect(r.out.map((f) => f.check).sort()).toEqual(['sitemap-duplicates', 'sitemap-foreign-origin', 'sitemap-lastmod-future', 'sitemap-small']);
  });
  test('llms.txt shape and links', () => {
    const r = C.analyseLlms(`# DreamLab\n\n> Summary\n\n- [Programmes](${ORIGIN}/programmes/)\n- [Full](${ORIGIN}/llms-full.txt)\n`, { origin: ORIGIN });
    expect(r.out).toEqual([]);
    expect(r.links).toHaveLength(2);
    expect(C.analyseLlms('hello', { origin: ORIGIN }).out.map((f) => f.check)).toEqual(expect.arrayContaining(['llms-title', 'llms-summary', 'llms-no-links', 'llms-no-full']));
  });
});

describe('parity and render comparison', () => {
  test('a crawler UA getting a different status or body is reported', () => {
    const base = { url: `${ORIGIN}/`, status: 200, textHash: 'aaaa', textLength: 1000 };
    const out = C.compareParity(base, [
      { agent: 'GPTBot', status: 403, textHash: '', textLength: 0 },
      { agent: 'ClaudeBot', status: 200, textHash: 'bbbb', textLength: 400 },
      { agent: 'Googlebot', status: 200, textHash: 'aaaa', textLength: 1000 },
    ]);
    expect(out.map((f) => `${f.check}:${f.severity}`)).toEqual(['agent-parity-status:high', 'agent-parity-body:medium']);
  });
  test('JS-only content and shrinking hydration are both findings', () => {
    const url = `${ORIGIN}/`;
    expect(C.compareRender({ url, raw: { h1: 'A', title: 'T', textLength: 100 }, rendered: { h1: 'A', title: 'T', textLength: 1000 } }).map((f) => f.check)).toEqual(['render-js-only-content']);
    expect(C.compareRender({ url, raw: { h1: 'A', title: 'T', textLength: 1000 }, rendered: { h1: 'B', title: 'T', textLength: 100 }, consoleErrors: ['boom'] }).map((f) => f.check)).toEqual(['render-h1-drift', 'render-text-shrinks', 'console-errors']);
  });
});

describe('Lighthouse', () => {
  const text = '## Lighthouse Audit Results\nMode: navigation\nDevice: mobile\n### Category Scores\n- Accessibility: 98 (accessibility)\n- Best Practices: 100 (best-practices)\n- SEO: 100 (seo)\n- Agentic Browsing: 100 (agentic-browsing)\n### Audit Summary\nPassed: 52\nFailed: 2\n';
  test('parses the sidecar text report', () => {
    expect(C.parseLighthouse(text)).toEqual({ scores: { accessibility: 98, 'best-practices': 100, seo: 100, 'agentic-browsing': 100 }, passed: 52, failed: 2 });
  });
  test('a one-night dip is not a regression; two nights are; floors always are', () => {
    const url = `${ORIGIN}/`;
    const hist = { [url]: [{ scores: { seo: 100 } }, { scores: { seo: 100 } }, { scores: { seo: 100 } }] };
    expect(C.lighthouseRegressions(hist, { [url]: { seo: 92 } })).toEqual([]);
    const hist2 = { [url]: [{ scores: { seo: 100 } }, { scores: { seo: 100 } }, { scores: { seo: 93 } }] };
    expect(C.lighthouseRegressions(hist2, { [url]: { seo: 92 } }).map((f) => f.check)).toEqual(['lighthouse-seo-regression']);
    expect(C.lighthouseRegressions({}, { [url]: { seo: 80 } }).map((f) => f.check)).toEqual(['lighthouse-seo-floor']);
  });
});

describe('roster and fingerprint', () => {
  test('fixed pages first, then least recently audited', () => {
    const all = ['/a/', '/b/', '/c/', '/d/'].map((p) => ORIGIN + p);
    const last = { [`${ORIGIN}/b/`]: '2026-10-01', [`${ORIGIN}/c/`]: '2026-09-01' };
    expect(C.pickRoster(all, [`${ORIGIN}/a/`], last, 3)).toEqual([`${ORIGIN}/a/`, `${ORIGIN}/d/`, `${ORIGIN}/c/`]);
  });
  test('fingerprint ignores detail text and info findings', () => {
    const a = [C.finding('x', 'low', '/p', 'one'), C.finding('i', 'info', '', 'sidecar down')];
    const b = [C.finding('x', 'low', '/p', 'two')];
    expect(C.fingerprint(a)).toBe(C.fingerprint(b));
    expect(C.fingerprint(a)).not.toBe(C.fingerprint([C.finding('x', 'high', '/p', 'one')]));
  });
  test('fingerprint with stable pages ignores the rotating roster but keeps site-level findings', () => {
    const fixed = [`${ORIGIN}/`];
    const core = [C.finding('x', 'low', `${ORIGIN}/`, 'a'), C.finding('robots', 'medium', '', 'site-level')];
    const withRotating = [...core, C.finding('x', 'low', `${ORIGIN}/workshops/foo/lesson-3/`, 'b')];
    expect(C.fingerprint(withRotating, fixed)).toBe(C.fingerprint(core, fixed));
    expect(C.fingerprint(withRotating, fixed)).not.toBe(C.fingerprint(core.slice(0, 1), fixed));
    expect(C.fingerprint(withRotating, fixed)).not.toBe(C.fingerprint(withRotating));
  });
});

describe('SSE framing', () => {
  test('splits frames, joins data lines, keeps the remainder', () => {
    const { frames, rest } = parseSseFrames('event: endpoint\ndata: /messages?sessionId=1\n\nevent: message\ndata: {"a":\ndata: 1}\n\ndata: partial');
    expect(frames).toEqual([{ event: 'endpoint', data: '/messages?sessionId=1' }, { event: 'message', data: '{"a":\n1}' }]);
    expect(rest).toBe('data: partial');
  });
});

describe('patch extraction and validation', () => {
  const allowlist = ['public/robots.txt', 'public/llms.txt', 'src/lib/og-meta.ts', 'index.html'];
  const diff = (file, extra = '') => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1,2 +1,2 @@\n-old\n+new\n context\n${extra}`;
  test('extracts the flag and the seo-patch block', () => {
    const text = `## Summary\nfine\n\nPROPOSE: YES\n\n\`\`\`seo-patch\n${diff('public/llms.txt')}\`\`\`\n`;
    const r = extractAdvice(text);
    expect(r.flag).toBe('YES');
    expect(r.patch).toContain('+++ b/public/llms.txt');
    expect(r.body).not.toContain('diff --git');
    expect(extractAdvice('PROPOSE: NO').patch).toBeNull();
  });
  test('accepts a small diff to an allowlisted file', () => {
    expect(validatePatch(diff('public/llms.txt'), { allowlist })).toMatchObject({ ok: true, files: ['public/llms.txt'], changed: 2 });
  });
  test('rejects paths off the allowlist, traversal, renames, creations and binaries', () => {
    expect(validatePatch(diff('scripts/prerender.mjs'), { allowlist }).reason).toMatch(/allowlist/);
    expect(validatePatch(diff('public/../.github/workflows/deploy.yml'), { allowlist }).reason).toMatch(/allowlist/);
    expect(validatePatch(`diff --git a/public/llms.txt b/index.html\n--- a/public/llms.txt\n+++ b/index.html\n@@ -1 +1 @@\n-a\n+b\n`, { allowlist }).reason).toMatch(/rename/);
    expect(validatePatch(`diff --git a/index.html b/index.html\nrename from index.html\nrename to x\n`, { allowlist }).reason).toMatch(/forbidden/);
    expect(validatePatch(`diff --git a/public/llms.txt b/public/llms.txt\n--- /dev/null\n+++ b/public/llms.txt\n@@ -0,0 +1 @@\n+x\n`, { allowlist }).ok).toBe(false);
    expect(validatePatch(`diff --git a/index.html b/index.html\nGIT binary patch\n`, { allowlist }).reason).toMatch(/forbidden/);
    expect(validatePatch(`--- a/public/llms.txt\n+++ b/.env\n@@ -1 +1 @@\n-a\n+b\n`, { allowlist }).reason).toMatch(/allowlist/);
  });
  test('caps the number of changed lines', () => {
    const big = diff('index.html', Array.from({ length: 70 }, (_, i) => `+line ${i}`).join('\n'));
    expect(validatePatch(big, { allowlist, maxChangedLines: 60 }).reason).toMatch(/> 60/);
    expect(validatePatch(diff('public/llms.txt'), { allowlist, cooldown: { 'public/llms.txt': '2026-10-30' } }).reason).toMatch(/cool-down/);
    expect(validatePatch(`diff --git a/public/llms.txt b/public/llms.txt\n--- a/public/llms.txt\n+++ b/public/llms.txt\n@@ -1,2 +1,2 @@\n-++x\n+--y\n`, { allowlist }).changed).toBe(2);
  });
});

describe('secrets and environment hygiene', () => {
  test('scrubs env secret values and token shapes but not 64-hex pubkeys', () => {
    const env = { ZAI_API_KEY: 'zk-live-ABCDEFGH12345', GITHUB_TOKEN: 'ghp_abcdefghijklmnopqrstuvwxyz0123456789', HOME: '/home/x', VITE_ADMIN_PUBKEY: '11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c' };
    const out = scrubSecrets('key zk-live-ABCDEFGH12345 token ghp_abcdefghijklmnopqrstuvwxyz0123456789 nsec1qqqqqqqqqqqqqqqqqqqqqqqqqqqqq pub 11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c home /home/x', env);
    expect(out).toBe('key [REDACTED] token [REDACTED] [REDACTED] pub 11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c home /home/x');
  });
  test('only allowlisted response headers survive', () => {
    expect(redactHeaders(new Headers({ 'set-cookie': 'a=b', 'content-type': 'text/html', 'cf-ray': 'x', 'x-robots-tag': 'noindex' }))).toEqual({ 'content-type': 'text/html', 'x-robots-tag': 'noindex' });
  });
  test('the build environment carries only plumbing and VITE_* values', () => {
    const env = clearedEnv({ VITE_RELAY_URL: 'wss://r', NOT_VITE: 'x', 'VITE_bad-name': 'y' }, { PATH: '/bin', HOME: '/h', ZAI_API_KEY: 'secret', GITHUB_TOKEN: 't' });
    expect(env).toEqual({ CI: '1', PATH: '/bin', HOME: '/h', VITE_RELAY_URL: 'wss://r' });
  });
});

describe('advise decision and prompt', () => {
  const config = { monthly_token_budget: 1000, weekly_digest_weekday: 1 };
  test('quiet nights are free, changes and regressions call, budget wins over everything', () => {
    const now = new Date('2026-10-14T05:40:00Z'); // a Wednesday
    expect(decideAdvise({ fingerprint: 'a', lastFingerprint: 'a', regressions: 0, now, config, spentTokens: 0 }).call).toBe(false);
    expect(decideAdvise({ fingerprint: 'a', lastFingerprint: 'b', regressions: 0, now, config, spentTokens: 0 })).toMatchObject({ call: true, reason: 'finding set changed' });
    expect(decideAdvise({ fingerprint: 'a', lastFingerprint: 'a', regressions: 1, now, config, spentTokens: 0 }).call).toBe(true);
    expect(decideAdvise({ fingerprint: 'a', lastFingerprint: 'a', regressions: 0, now: new Date('2026-10-12T05:40:00Z'), config, spentTokens: 0 }).reason).toBe('weekly digest');
    expect(decideAdvise({ fingerprint: 'a', lastFingerprint: 'b', regressions: 3, force: true, now, config, spentTokens: 1000 }).call).toBe(false);
  });
  test('month token spend sums the ledger', () => {
    expect(monthTokens([{ date: '2026-10-01', advise: { tokens: { input: 10, output: 5 } } }, { date: '2026-09-30', advise: { tokens: { input: 100, output: 0 } } }], new Date('2026-10-12'))).toBe(15);
  });
  test('prompt carries findings, cool-down marks and the allowlisted sources, and is capped', () => {
    const audit = { findings: [C.finding('title-length', 'low', `${ORIGIN}/`, 'x')], roster: ['a'], sources: { sitemapCount: 199 }, notes: [], lighthouse: {}, parity: { pages: 1 } };
    const p = buildPrompt({ date: '2026-10-12', origin: ORIGIN, audit, ledgerTail: [], sources: { 'public/llms.txt': '# DreamLab' }, references: { 'index.html': '<html>' }, allowlist: ['public/llms.txt'], cooldown: { 'public/robots.txt': '2026-10-30' }, blocked: 'open proposal awaits review', maxChars: 100_000 });
    expect(p.user).toContain('- public/robots.txt until 2026-10-30');
    expect(p.user).toContain('=== FILE: public/llms.txt ===');
    expect(p.user).toContain('=== REFERENCE: index.html ===');
    expect(p.user).toContain('## Proposal gate');
    const sorted = buildPrompt({ date: '2026-10-12', origin: ORIGIN, audit: { ...audit, findings: [C.finding('a', 'low', '', '1'), C.finding('b', 'high', '', '2')] }, ledgerTail: [], sources: {}, allowlist: [], cooldown: {}, maxChars: 100_000 }).user;
    expect(sorted.indexOf('"check": "b"')).toBeLessThan(sorted.indexOf('"check": "a"'));
    expect(p.system).toMatch(/PROPOSE: YES/);
    expect(buildPrompt({ date: '2026-10-12', origin: ORIGIN, audit, ledgerTail: [], sources: { big: 'x'.repeat(5000) }, allowlist: [], cooldown: {}, maxChars: 1000 }).user.length).toBeLessThan(1100);
  });
});

describe('proposal branch ownership and tree parsing', () => {
  test('only our own date-stamped branches qualify', () => {
    expect(isProposalBranch('seo/nightly-2026-10-12', 'seo/')).toBe(true);
    expect(isProposalBranch('jj/seo/nightly-2026-10-12', 'seo/')).toBe(false);
    expect(isProposalBranch('seo/meta-fix', 'seo/')).toBe(false);
    expect(isProposalBranch('seo/nightly-2026-10-12-extra', 'seo/')).toBe(false);
  });
  test('porcelain entries keep status and unquote paths', () => {
    expect(porcelainEntries(' M public/llms.txt\n?? "docs/seo/nightly/2026-10-12.md"\n')).toEqual([
      { status: ' M', file: 'public/llms.txt' },
      { status: '??', file: 'docs/seo/nightly/2026-10-12.md' },
    ]);
  });
  test('cleared env swaps HOME for the throwaway one and points npm at it', () => {
    const env = clearedEnv({ VITE_X: '1' }, { PATH: '/bin', HOME: '/home/devuser', GITHUB_TOKEN: 'ghp_x' }, '/tmp/build-home');
    expect(env.HOME).toBe('/tmp/build-home');
    expect(env.npm_config_cache).toBe('/tmp/build-home/.npm');
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect(env.VITE_X).toBe('1');
  });
});
