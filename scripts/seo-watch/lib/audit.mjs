// The deterministic half of the night: fetch the live site the way crawlers
// and agents do, drive the browser sidecar for hydration parity and Lighthouse,
// and return typed findings. No model is involved here; the receipts this
// produces are what the model later reasons over.

import * as C from './checks.mjs';
import { redactHeaders, clip } from './safety.mjs';
import { McpSseClient } from './mcp-sse.mjs';

const DEFAULT_UA = 'Mozilla/5.0 (X11; Linux x86_64) dreamlab-seo-watch/1 (+https://dreamlab-ai.com/.well-known/security.txt)';

async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }));
  return out;
}

// Follows redirects by hand so the chain is visible: a canonical URL that
// bounces is itself a finding.
export async function fetchPage(url, { ua = DEFAULT_UA, timeoutMs = 20_000, maxRedirects = 5, fetchImpl = globalThis.fetch } = {}) {
  const redirects = [];
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    let res;
    try {
      res = await fetchImpl(current, { redirect: 'manual', headers: { 'user-agent': ua, accept: 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8' }, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      return { url, status: 0, finalUrl: current, redirects, contentType: '', headers: {}, body: '', error: err.message };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), current).toString();
      redirects.push(`${res.status} ${next}`);
      current = next;
      continue;
    }
    const body = await res.text();
    return { url, status: res.status, finalUrl: current, redirects, contentType: res.headers.get('content-type') ?? '', headers: redactHeaders(res.headers), body };
  }
  return { url, status: 0, finalUrl: current, redirects, contentType: '', headers: {}, body: '', error: 'too many redirects' };
}

async function fetchText(url, opts) {
  const r = await fetchPage(url, opts);
  return r.status === 200 ? r.body : '';
}

// ── browser: hydration parity + Lighthouse through the sidecar ──────────────

// A function declaration, as chrome-devtools-mcp's evaluate_script wants it;
// the tool returns the JSON-serialised return value inside a ```json fence.
const EXTRACT_JS = `() => {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, svg, template, [aria-hidden="true"]').forEach((n) => n.remove());
  const root = clone.querySelector('main') || clone.querySelector('#root') || clone.querySelector('body');
  const text = (root ? root.textContent : '').replace(/\\s+/g, ' ').trim();
  return { title: document.title, h1: (document.querySelector('h1')?.textContent || '').replace(/\\s+/g, ' ').trim(), textLength: text.length };
}`;

export function parseToolJson(text) {
  const fenced = /```json\s*\n([\s\S]*?)\n```/.exec(text);
  try {
    return JSON.parse(fenced ? fenced[1] : text);
  } catch {
    return {};
  }
}

// new_page answers with the page list, e.g. "2: Title (https://…) [selected]".
export function selectedPageId(text) {
  const m = /^(\d+):\s.*\[selected\]\s*$/m.exec(text);
  return m ? Number(m[1]) : null;
}

export function consoleErrorsFrom(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !/^<no console messages/i.test(l)).map((l) => clip(l, 200));
}

export async function browserPass({ urls, lighthouseUrls, config, log, mcpFactory }) {
  const findings = [];
  const lighthouse = {};
  const rendered = {};
  const client = mcpFactory ? mcpFactory() : new McpSseClient(config.browser.mcp_url, { timeoutMs: config.browser.tool_timeout_ms ?? 90_000, log });
  try {
    await client.connect();
  } catch (err) {
    findings.push(C.finding('browser-sidecar', 'info', '', `browser sidecar unavailable: ${clip(err.message, 120)}; hydration and Lighthouse skipped`));
    try { client.close(); } catch { /* a half-open stream must not keep the process alive */ }
    return { findings, lighthouse, rendered };
  }
  try {
    for (const url of urls) {
      let pageId = null;
      try {
        // The sidecar is shared with interactive sessions: open our own tab,
        // act only on it (new_page selects it), and close it by id afterwards.
        pageId = selectedPageId(await client.tool('new_page', { url, timeout: config.browser.navigate_timeout_ms ?? 30_000 }));
        await new Promise((r) => setTimeout(r, config.browser.settle_ms ?? 2_500));
        const parsed = parseToolJson(await client.tool('evaluate_script', { function: EXTRACT_JS }));
        const consoleErrors = consoleErrorsFrom(await client.tool('list_console_messages', { types: ['error'] }).catch(() => ''));
        rendered[url] = { ...parsed, consoleErrors };
        if (lighthouseUrls.includes(url)) {
          const lhText = await client.tool('lighthouse_audit', { mode: 'navigation', device: config.browser.lighthouse_device ?? 'mobile' }, config.browser.lighthouse_timeout_ms ?? 180_000);
          const lh = C.parseLighthouse(lhText);
          if (Object.keys(lh.scores).length) lighthouse[url] = lh.scores;
          else findings.push(C.finding('lighthouse-unparsed', 'info', url, clip(lhText, 160)));
        }
      } catch (err) {
        findings.push(C.finding('browser-page-error', 'info', url, clip(err.message, 160)));
      } finally {
        if (pageId !== null) await client.tool('close_page', { pageId }).catch(() => {});
      }
    }
  } finally {
    client.close();
  }
  return { findings, lighthouse, rendered };
}

// ── the audit ───────────────────────────────────────────────────────────────

export async function runAudit({ config, state, log = () => {}, fetchImpl = globalThis.fetch, mcpFactory, now = new Date(), browser = true }) {
  const origin = config.origin.replace(/\/+$/, '');
  const f = (u, o) => fetchPage(u, { fetchImpl, timeoutMs: config.fetch_timeout_ms ?? 20_000, ...o });
  const findings = [];
  const notes = [];

  const [robotsTxt, sitemapXml, llmsTxt, llmsFull, security] = await Promise.all([
    fetchText(`${origin}/robots.txt`, { fetchImpl }),
    fetchText(`${origin}/sitemap.xml`, { fetchImpl }),
    f(`${origin}/llms.txt`),
    f(`${origin}/llms-full.txt`),
    f(`${origin}/.well-known/security.txt`),
  ]);

  const robots = C.analyseRobots(robotsTxt, { agents: config.agents.map((a) => a.token), sitemapUrl: `${origin}/sitemap.xml` });
  findings.push(...robots.out);
  notes.push(...robots.notes);

  const sitemap = C.analyseSitemap(sitemapXml, { origin, minUrls: config.sitemap_min_urls ?? 20, now });
  findings.push(...sitemap.out);

  if (llmsTxt.status !== 200) findings.push(C.finding('llms-missing', 'high', '/llms.txt', `HTTP ${llmsTxt.status}`));
  else {
    if (!/text\/plain|text\/markdown/i.test(llmsTxt.contentType)) findings.push(C.finding('llms-content-type', 'low', '/llms.txt', `content-type ${llmsTxt.contentType}`));
    const llms = C.analyseLlms(llmsTxt.body, { origin });
    findings.push(...llms.out);
    const linkResults = await pool(llms.links.filter((l) => l.startsWith(origin) && !l.includes('/community')).slice(0, config.llms_link_cap ?? 60), 4, (l) => f(l));
    for (const r of linkResults) if (r.status !== 200) findings.push(C.finding('llms-link-broken', 'medium', r.url, `linked from llms.txt but HTTP ${r.status}`));
  }
  if (llmsFull.status !== 200) findings.push(C.finding('llms-full-missing', 'medium', '/llms-full.txt', `HTTP ${llmsFull.status}`));
  else if (llmsFull.body.length < 5_000) findings.push(C.finding('llms-full-thin', 'medium', '/llms-full.txt', `${llmsFull.body.length} bytes`));
  if (security.status !== 200) findings.push(C.finding('security-txt-missing', 'low', '/.well-known/security.txt', `HTTP ${security.status}`));
  else {
    const exp = /^Expires:\s*(\S+)/m.exec(security.body)?.[1];
    if (exp && new Date(exp) < now) findings.push(C.finding('security-txt-expired', 'low', '/.well-known/security.txt', `Expires ${exp}`));
  }

  // Pages: the fixed set every night plus the least-recently-seen remainder.
  const roster = C.pickRoster(sitemap.urls, config.always_pages.map((p) => `${origin}${p}`), state.lastAudited ?? {}, config.pages_per_night ?? 25);
  const pages = await pool(roster, config.concurrency ?? 4, (url) => f(url));
  const summaries = {};
  for (const p of pages) {
    findings.push(...C.analysePage({ url: p.url, status: p.status, finalUrl: p.finalUrl, redirects: p.redirects, contentType: p.contentType, headers: p.headers, html: p.body }));
    if (p.status === 200) summaries[p.url] = C.pageSummary({ url: p.url, html: p.body });
  }
  // Every fixed marketing page must be discoverable through the sitemap.
  const inSitemap = new Set(sitemap.urls.map(C.normaliseUrl));
  for (const p of config.always_pages) {
    const u = C.normaliseUrl(`${origin}${p}`);
    if (sitemap.urls.length && !inSitemap.has(u)) findings.push(C.finding('sitemap-missing-page', 'medium', u, 'canonical page absent from sitemap.xml'));
  }

  // Organisation sameAs links must resolve: they are how agents link entities.
  const home = summaries[C.normaliseUrl(`${origin}/`)];
  if (home?.sameAs?.length) {
    const same = await pool(home.sameAs.slice(0, 8), 4, (l) => f(l, { timeoutMs: 15_000 }));
    for (const r of same) if (r.status === 0 || r.status >= 400) findings.push(C.finding('sameas-unresolved', 'low', `${origin}/`, `sameAs ${r.url} → HTTP ${r.status}${r.error ? ` (${clip(r.error, 60)})` : ''}`));
  }

  // Agent parity: the same page fetched as each AI/search crawler.
  const parityPages = roster.filter((u) => config.always_pages.map((p) => C.normaliseUrl(`${origin}${p}`)).includes(u)).slice(0, config.parity_pages ?? 4);
  let parityCount = 0;
  for (const url of parityPages) {
    const base = summaries[url];
    if (!base) continue;
    const variants = await pool(config.agents, 3, async (a) => {
      const r = await f(url, { ua: a.ua });
      const s = r.status === 200 ? C.pageSummary({ url, html: r.body }) : { textHash: '', textLength: 0 };
      return { agent: a.token, status: r.status, textHash: s.textHash, textLength: s.textLength };
    });
    const pf = C.compareParity({ url, status: 200, textHash: base.textHash, textLength: base.textLength }, variants);
    parityCount += pf.length;
    findings.push(...pf);
  }

  // Browser: hydration parity for the fixed pages, Lighthouse for a rotating few.
  let lighthouse = {};
  if (browser && config.browser?.enabled) {
    const lhHistory = state.lighthouse ?? {};
    const lhCandidates = parityPages.length ? parityPages : roster.slice(0, 2);
    const lhUrls = [...lhCandidates].sort((a, b) => ((lhHistory[a] ?? []).at(-1)?.date ?? '').localeCompare((lhHistory[b] ?? []).at(-1)?.date ?? '')).slice(0, config.browser.lighthouse_pages_per_night ?? 3);
    const bp = await browserPass({ urls: parityPages, lighthouseUrls: lhUrls, config, log, mcpFactory });
    findings.push(...bp.findings);
    lighthouse = bp.lighthouse;
    for (const [url, r] of Object.entries(bp.rendered)) {
      const raw = summaries[url];
      if (raw) findings.push(...C.compareRender({ url, raw, rendered: r, consoleErrors: r.consoleErrors }));
    }
    findings.push(...C.lighthouseRegressions(lhHistory, lighthouse, config.browser.regression ?? {}));
  }

  // Static hosting facts worth a human's eye once, never a patch.
  if (config.hosting === 'github-pages') notes.push('Hosting is GitHub Pages: a public/_redirects file is ignored there; deep links rely on prerendered index.html per route, so a sitemap URL answering 404 means the prerender missed it');

  return {
    findings: C.sortFindings(findings),
    notes,
    roster,
    lighthouse,
    parity: { pages: parityPages.length, agents: config.agents.map((a) => a.token), findings: parityCount },
    sources: { robotsTxt, llmsTxt: llmsTxt.body, sitemapCount: sitemap.urls.length },
  };
}
