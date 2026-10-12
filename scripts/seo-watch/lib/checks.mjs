// Pure analysis for the nightly SEO / agent-searchability audit. No network,
// no filesystem: every function takes text in and returns typed findings out,
// so the whole module is unit-testable against fixtures.
//
// A finding is { check, severity, page, detail }. `check` is a stable id (the
// cool-down and the fingerprint key on it); `severity` is high | medium | low
// | info; `page` is a URL or '' for site-wide checks.

import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 };

export const finding = (check, severity, page, detail) => ({ check, severity, page, detail });

export function sortFindings(findings) {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.check.localeCompare(b.check) || a.page.localeCompare(b.page));
}

export function countBySeverity(findings) {
  const out = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) out[f.severity] = (out[f.severity] ?? 0) + 1;
  return out;
}

// What changed tonight? Keyed on (check, page, severity); detail text is
// excluded so a changing byte count does not read as a new problem. With
// `stablePages` given, only site-level findings (no page) and findings on
// those pages count: the rotating roster would otherwise change the set
// almost every night and defeat the "quiet night, no model call" rule.
export function fingerprint(findings, stablePages = null) {
  const stable = stablePages ? new Set(stablePages.map(normaliseUrl)) : null;
  const keys = findings
    .filter((f) => f.severity !== 'info')
    .filter((f) => !stable || !f.page || stable.has(normaliseUrl(f.page)))
    .map((f) => `${f.check}|${f.page}|${f.severity}`)
    .sort();
  return createHash('sha256').update(keys.join('\n')).digest('hex').slice(0, 16);
}

export const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

export function normaliseUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    if (!/\.[a-z0-9]+$/i.test(u.pathname) && !u.pathname.endsWith('/')) u.pathname += '/';
    return u.toString();
  } catch {
    return url;
  }
}

export function isLessonPath(pathname) {
  return /^\/workshops\/[^/]+\/[^/]+\/?$/.test(pathname);
}

// ── HTML ────────────────────────────────────────────────────────────────────

export function parseHtml(html) {
  return new JSDOM(html).window.document;
}

export function mainText(doc) {
  const clone = doc.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, svg, template, [aria-hidden="true"]').forEach((n) => n.remove());
  const root = clone.querySelector('main') || clone.querySelector('#root') || clone.body;
  return (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const meta = (doc, sel) => doc.querySelector(sel)?.getAttribute('content')?.trim() ?? '';

export function analysePage({ url, status, finalUrl, redirects = [], contentType = '', headers = {}, html = '' }) {
  const out = [];
  const page = url;
  if (status !== 200) {
    out.push(finding('page-status', 'high', page, `HTTP ${status}${finalUrl && finalUrl !== url ? ` (ended at ${finalUrl})` : ''}`));
    return out;
  }
  if (redirects.length) out.push(finding('page-redirect-chain', 'medium', page, `canonical URL redirects ${redirects.length} time(s): ${redirects.join(' → ')}`));
  if (!/text\/html/i.test(contentType)) out.push(finding('page-content-type', 'high', page, `content-type ${contentType || 'missing'}`));
  const xRobots = headers['x-robots-tag'] ?? '';
  if (/noindex/i.test(xRobots)) out.push(finding('page-noindex-header', 'high', page, `X-Robots-Tag: ${xRobots}`));

  const doc = parseHtml(html);
  const robotsMeta = meta(doc, 'meta[name="robots"]');
  if (/noindex/i.test(robotsMeta)) out.push(finding('page-noindex-meta', 'high', page, `meta robots: ${robotsMeta}`));

  if (!doc.documentElement.getAttribute('lang')) out.push(finding('page-lang', 'low', page, '<html> has no lang attribute'));
  if (!doc.querySelector('meta[name="viewport"]')) out.push(finding('page-viewport', 'low', page, 'no viewport meta'));

  const title = doc.title?.trim() ?? '';
  if (!title) out.push(finding('title-missing', 'high', page, 'no <title>'));
  else if (title.length < 15 || title.length > 65) out.push(finding('title-length', 'low', page, `title is ${title.length} chars: "${title}"`));

  const desc = meta(doc, 'meta[name="description"]');
  if (!desc) out.push(finding('description-missing', 'medium', page, 'no meta description'));
  else if (desc.length < 70 || desc.length > 165) out.push(finding('description-length', 'low', page, `description is ${desc.length} chars`));

  const canonicals = doc.querySelectorAll('link[rel="canonical"]');
  if (canonicals.length !== 1) out.push(finding('canonical-count', 'high', page, `${canonicals.length} canonical links`));
  else {
    const href = normaliseUrl(canonicals[0].getAttribute('href') ?? '');
    if (href !== normaliseUrl(url)) out.push(finding('canonical-mismatch', 'high', page, `canonical is ${href}`));
  }

  for (const [prop, sev] of [['og:title', 'medium'], ['og:description', 'medium'], ['og:image', 'medium'], ['og:url', 'medium'], ['og:type', 'low']]) {
    if (!meta(doc, `meta[property="${prop}"]`)) out.push(finding(`og-missing`, sev, page, `missing ${prop}`));
  }
  const ogUrl = meta(doc, 'meta[property="og:url"]');
  if (ogUrl && normaliseUrl(ogUrl) !== normaliseUrl(url)) out.push(finding('og-url-mismatch', 'medium', page, `og:url is ${ogUrl}`));
  const ogTitle = meta(doc, 'meta[property="og:title"]');
  if (ogTitle && title && ogTitle !== title) out.push(finding('og-title-mismatch', 'low', page, `og:title "${ogTitle}" ≠ <title> "${title}"`));
  const ogImage = meta(doc, 'meta[property="og:image"]');
  if (ogImage && !/^https:\/\//.test(ogImage)) out.push(finding('og-image-scheme', 'low', page, `og:image is not https: ${ogImage}`));
  if (!meta(doc, 'meta[name="twitter:card"]')) out.push(finding('twitter-card-missing', 'low', page, 'no twitter:card'));

  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  if (!ld.length) out.push(finding('jsonld-missing', 'medium', page, 'no JSON-LD'));
  const schemas = [];
  for (const node of ld) {
    try {
      schemas.push(JSON.parse(node.textContent));
    } catch (err) {
      out.push(finding('jsonld-invalid', 'high', page, `JSON-LD does not parse: ${err.message.slice(0, 80)}`));
    }
  }
  const route = doc.getElementById('route-structured-data');
  if (ld.length && !route) out.push(finding('jsonld-route-missing', 'medium', page, 'no #route-structured-data block'));
  if (route) {
    try {
      const schema = JSON.parse(route.textContent);
      if (schema.url && normaliseUrl(schema.url) !== normaliseUrl(url)) out.push(finding('jsonld-url-mismatch', 'medium', page, `route schema url is ${schema.url}`));
      if (!schema['@type']) out.push(finding('jsonld-type-missing', 'medium', page, 'route schema has no @type'));
      if (!schema.name) out.push(finding('jsonld-name-missing', 'low', page, 'route schema has no name'));
    } catch {
      /* already reported as jsonld-invalid */
    }
  }
  for (const s of schemas.flatMap((x) => (Array.isArray(x) ? x : [x]))) {
    const type = s?.['@type'];
    if (type === 'Organization' && !(s.name && s.url)) out.push(finding('jsonld-organization-incomplete', 'medium', page, 'Organization lacks name or url'));
    if ((type === 'Course' || type === 'LearningResource') && !(s.name && (s.description || s.about))) out.push(finding('jsonld-learning-incomplete', 'low', page, `${type} lacks name or description`));
  }

  const h1s = doc.querySelectorAll('h1');
  if (h1s.length === 0) out.push(finding('h1-missing', 'high', page, 'no <h1>'));
  else if (h1s.length > 1) out.push(finding('h1-multiple', 'low', page, `${h1s.length} <h1> elements`));

  const text = mainText(doc);
  if (text.length < 150) out.push(finding('body-thin', 'high', page, `rendered-without-JS body is ${text.length} chars (prerender missing?)`));

  if (html.includes('__BUILD_DATE__')) out.push(finding('build-token-leak', 'medium', page, 'unreplaced __BUILD_DATE__ token'));

  const pathname = new URL(url).pathname;
  if (isLessonPath(pathname)) {
    const alt = doc.querySelector('link[rel="alternate"][type="text/markdown"]');
    if (!alt) out.push(finding('lesson-markdown-alternate', 'medium', page, 'lesson has no text/markdown alternate for agents'));
  }

  const imgs = [...doc.querySelectorAll('img')];
  const noAlt = imgs.filter((i) => !i.hasAttribute('alt')).length;
  if (noAlt) out.push(finding('img-alt-missing', 'low', page, `${noAlt} of ${imgs.length} images have no alt attribute`));

  const insecure = [...doc.querySelectorAll('a[href^="http://dreamlab-ai.com"], a[href^="http://www.dreamlab-ai.com"]')].length;
  if (insecure) out.push(finding('internal-http-links', 'low', page, `${insecure} internal link(s) use http://`));

  return out;
}

export function pageSummary({ url, html }) {
  const doc = parseHtml(html);
  const text = mainText(doc);
  return {
    url,
    title: doc.title?.trim() ?? '',
    h1: doc.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    textLength: text.length,
    textHash: sha(text),
    sameAs: [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((n) => {
      try {
        const s = JSON.parse(n.textContent);
        return [].concat(...[].concat(s).map((x) => x?.sameAs ?? []));
      } catch {
        return [];
      }
    }).filter((x) => typeof x === 'string' && /^https?:\/\//.test(x)),
  };
}

// ── robots.txt (RFC 9309 longest-match) ──────────────────────────────────────

export function parseRobots(text) {
  const groups = [];
  let current = null;
  const sitemaps = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && current) {
      current.rules.push({ type: key, path: value });
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    }
  }
  return { groups, sitemaps };
}

export function robotsGroupFor(groups, agent) {
  const ua = agent.toLowerCase();
  const exact = groups.find((g) => g.agents.some((a) => a !== '*' && (ua === a || ua.startsWith(a))));
  return exact ?? groups.find((g) => g.agents.includes('*')) ?? null;
}

export function robotsAllows(groups, agent, path) {
  const group = robotsGroupFor(groups, agent);
  if (!group) return true;
  let best = null;
  for (const rule of group.rules) {
    if (!rule.path) continue;
    const pattern = rule.path.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    if (new RegExp(`^${pattern}`).test(path)) {
      if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.type === 'allow')) best = rule;
    }
  }
  return !best || best.type === 'allow';
}

export function analyseRobots(text, { agents, sitemapUrl, probePaths = ['/', '/llms.txt', '/workshops/'] }) {
  const out = [];
  const notes = [];
  if (!text.trim()) {
    out.push(finding('robots-missing', 'high', '/robots.txt', 'robots.txt is empty or missing'));
    return { out, notes, parsed: { groups: [], sitemaps: [] } };
  }
  const parsed = parseRobots(text);
  if (!parsed.sitemaps.length) out.push(finding('robots-no-sitemap', 'medium', '/robots.txt', 'no Sitemap: directive'));
  else if (sitemapUrl && !parsed.sitemaps.includes(sitemapUrl)) out.push(finding('robots-sitemap-mismatch', 'low', '/robots.txt', `Sitemap: ${parsed.sitemaps.join(', ')}`));
  for (const agent of agents) {
    const blocked = probePaths.filter((p) => !robotsAllows(parsed.groups, agent, p));
    if (blocked.length) out.push(finding('robots-agent-blocked', 'high', '/robots.txt', `${agent} is disallowed from ${blocked.join(', ')}`));
  }
  const named = new Set(parsed.groups.flatMap((g) => g.agents));
  const unaddressed = agents.filter((a) => !named.has(a.toLowerCase()));
  if (unaddressed.length) notes.push(`robots.txt relies on the * group for ${unaddressed.join(', ')} (policy question for a human, not a patch target)`);
  return { out, notes, parsed };
}

// ── sitemap.xml ──────────────────────────────────────────────────────────────

export function analyseSitemap(xml, { origin, minUrls = 20, now = new Date() }) {
  const out = [];
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) {
    out.push(finding('sitemap-empty', 'high', '/sitemap.xml', 'no <loc> entries'));
    return { urls, out };
  }
  if (urls.length < minUrls) out.push(finding('sitemap-small', 'medium', '/sitemap.xml', `${urls.length} URLs (expected ≥ ${minUrls}; lessons missing?)`));
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) out.push(finding('sitemap-duplicates', 'medium', '/sitemap.xml', `${dupes.length} duplicate entries`));
  const foreign = urls.filter((u) => !u.startsWith(origin));
  if (foreign.length) out.push(finding('sitemap-foreign-origin', 'medium', '/sitemap.xml', `${foreign.length} entries not under ${origin}`));
  const insecure = urls.filter((u) => u.startsWith('http://'));
  if (insecure.length) out.push(finding('sitemap-http', 'medium', '/sitemap.xml', `${insecure.length} http:// entries`));
  const future = [...xml.matchAll(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/g)].map((m) => m[1]).filter((d) => new Date(d) > now);
  if (future.length) out.push(finding('sitemap-lastmod-future', 'low', '/sitemap.xml', `${future.length} lastmod dates in the future`));
  return { urls: [...new Set(urls)], out };
}

// ── llms.txt ─────────────────────────────────────────────────────────────────

export function analyseLlms(text, { origin }) {
  const out = [];
  if (!text.trim()) {
    out.push(finding('llms-missing', 'high', '/llms.txt', 'llms.txt is empty or missing'));
    return { links: [], out };
  }
  if (!/^#\s+\S/m.test(text.split('\n')[0] ?? '')) out.push(finding('llms-title', 'low', '/llms.txt', 'first line is not an H1 title'));
  if (!/^>\s+\S/m.test(text)) out.push(finding('llms-summary', 'low', '/llms.txt', 'no blockquote summary'));
  const links = [...text.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  if (!links.length) out.push(finding('llms-no-links', 'medium', '/llms.txt', 'no markdown links'));
  const foreign = links.filter((l) => !l.startsWith(origin));
  if (foreign.length) out.push(finding('llms-foreign-links', 'low', '/llms.txt', `${foreign.length} link(s) leave ${origin}`));
  if (!links.some((l) => /llms-full\.txt$/.test(l))) out.push(finding('llms-no-full', 'low', '/llms.txt', 'no link to llms-full.txt'));
  return { links: [...new Set(links)], out };
}

// ── parity between user agents and between raw and rendered ─────────────────

export function compareParity(baseline, variants) {
  const out = [];
  for (const v of variants) {
    if (v.status !== baseline.status) out.push(finding('agent-parity-status', 'high', baseline.url, `${v.agent} got HTTP ${v.status}, default UA got ${baseline.status}`));
    else if (v.textHash !== baseline.textHash) out.push(finding('agent-parity-body', 'medium', baseline.url, `${v.agent} sees different main text (${v.textLength} vs ${baseline.textLength} chars)`));
  }
  return out;
}

export function compareRender({ url, raw, rendered, consoleErrors = [] }) {
  const out = [];
  if (rendered.h1 && raw.h1 && rendered.h1 !== raw.h1) out.push(finding('render-h1-drift', 'medium', url, `prerendered h1 "${raw.h1}" but hydrated h1 "${rendered.h1}"`));
  if (rendered.title && raw.title && rendered.title !== raw.title) out.push(finding('render-title-drift', 'low', url, `prerendered title "${raw.title}" but hydrated title "${rendered.title}"`));
  if (raw.textLength && rendered.textLength < raw.textLength * 0.6) out.push(finding('render-text-shrinks', 'medium', url, `hydrated text ${rendered.textLength} chars vs prerendered ${raw.textLength}`));
  if (rendered.textLength && raw.textLength < rendered.textLength * 0.5) out.push(finding('render-js-only-content', 'medium', url, `crawlers without JS see ${raw.textLength} chars, browsers see ${rendered.textLength}`));
  if (consoleErrors.length) out.push(finding('console-errors', 'low', url, `${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 2).join(' | ').slice(0, 160)}`));
  return out;
}

// ── Lighthouse (text report from chrome-devtools-mcp lighthouse_audit) ───────

export function parseLighthouse(text) {
  const scores = {};
  for (const m of text.matchAll(/^- ([A-Za-z ]+): (\d+) \(([a-z-]+)\)/gm)) scores[m[3]] = Number(m[2]);
  const passed = Number(/Passed:\s*(\d+)/.exec(text)?.[1] ?? NaN);
  const failed = Number(/Failed:\s*(\d+)/.exec(text)?.[1] ?? NaN);
  return { scores, passed: Number.isNaN(passed) ? null : passed, failed: Number.isNaN(failed) ? null : failed };
}

// A drop is a finding only when it holds across `nights` consecutive readings
// against the best of the earlier window; single-run jitter is not a regression.
export function lighthouseRegressions(history, current, { drop = 5, nights = 2, floor = { seo: 90, accessibility: 90, 'best-practices': 90, 'agentic-browsing': 90 } } = {}) {
  const out = [];
  for (const [url, scores] of Object.entries(current)) {
    for (const [cat, score] of Object.entries(scores)) {
      if (floor[cat] !== undefined && score < floor[cat]) out.push(finding(`lighthouse-${cat}-floor`, 'medium', url, `${cat} ${score} < ${floor[cat]}`));
      const past = (history[url] ?? []).map((h) => h.scores?.[cat]).filter((x) => typeof x === 'number');
      if (past.length < nights) continue;
      const recent = [...past.slice(-(nights - 1)), score];
      const earlier = past.slice(0, -(nights - 1));
      if (!earlier.length) continue;
      const best = Math.max(...earlier);
      if (recent.every((r) => best - r >= drop)) out.push(finding(`lighthouse-${cat}-regression`, 'medium', url, `${cat} fell from ${best} to ${score} over ${nights} nights`));
    }
  }
  return out;
}

// ── roster: which pages tonight ─────────────────────────────────────────────

export function pickRoster(allUrls, always, lastAudited, perNight) {
  const norm = (u) => normaliseUrl(u);
  const fixed = [...new Set(always.map(norm))];
  const rest = [...new Set(allUrls.map(norm))].filter((u) => !fixed.includes(u));
  rest.sort((a, b) => (lastAudited[a] ?? '').localeCompare(lastAudited[b] ?? '') || a.localeCompare(b));
  return [...new Set([...fixed, ...rest.slice(0, Math.max(0, perNight - fixed.length))])];
}

// ── report ───────────────────────────────────────────────────────────────────

export function renderReport({ date, origin, findings, notes, lighthouse, parity, presence, advice, proposal, pagesAudited, runId }) {
  const sorted = sortFindings(findings);
  const counts = countBySeverity(findings);
  const lines = [
    `# SEO & agent-searchability watch — ${date}`,
    '',
    `Site: ${origin} · pages audited: ${pagesAudited} · run \`${runId}\``,
    '',
    `Findings: **${counts.high} high**, ${counts.medium} medium, ${counts.low} low, ${counts.info} info.`,
    '',
  ];
  if (lighthouse && Object.keys(lighthouse).length) {
    lines.push('## Lighthouse (mobile)', '', '| Page | SEO | Accessibility | Best practices | Agentic browsing |', '|---|---|---|---|---|');
    for (const [url, s] of Object.entries(lighthouse)) lines.push(`| ${url} | ${s.seo ?? '–'} | ${s.accessibility ?? '–'} | ${s['best-practices'] ?? '–'} | ${s['agentic-browsing'] ?? '–'} |`);
    lines.push('');
  }
  lines.push('## Findings', '');
  if (!sorted.length) lines.push('None.', '');
  for (const sev of ['high', 'medium', 'low', 'info']) {
    const group = sorted.filter((f) => f.severity === sev);
    if (!group.length) continue;
    lines.push(`### ${sev}`, '');
    for (const f of group) lines.push(`- \`${f.check}\` ${f.page ? `${f.page} — ` : ''}${f.detail}`);
    lines.push('');
  }
  if (notes?.length) {
    lines.push('## Notes for a human (never patched automatically)', '');
    for (const n of notes) lines.push(`- ${n}`);
    lines.push('');
  }
  if (parity) {
    lines.push('## Agent parity', '', `Checked ${parity.pages} page(s) as ${parity.agents.join(', ')}: ${parity.findings} difference(s).`, '');
  }
  if (presence) {
    lines.push('## AI search presence (weekly)', '');
    for (const p of presence.results) lines.push(`- "${p.query}" → ${p.cited ? `cited (${p.citations.filter((c) => c.includes(origin.replace(/^https?:\/\//, ''))).length} of ${p.citations.length})` : 'not cited'}${p.error ? ` — ${p.error}` : ''}`);
    lines.push('');
  }
  lines.push('## Advice (GLM)', '');
  if (advice?.text) lines.push(advice.text);
  else if (advice?.called) lines.push(`Consulted (${advice.reason}) but the call failed: ${advice.error ?? 'unknown error'}.`);
  else lines.push(`Not consulted: ${advice?.reason ?? 'no reason recorded'}.`);
  lines.push('');
  lines.push('## Proposal', '', proposal ? `${proposal.status}${proposal.pr ? `: ${proposal.pr}` : ''}${proposal.reason ? ` — ${proposal.reason}` : ''}` : 'none', '');
  return lines.join('\n');
}
