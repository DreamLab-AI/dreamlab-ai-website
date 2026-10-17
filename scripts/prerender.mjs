// Vite/React build adapter. Render existing components rather than maintaining
// crawler-only copy. No browser, external fetches or new runtime are required.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { execFileSync } from 'node:child_process';

const origin = 'https://dreamlab-ai.com';

// Retired URLs. GitHub Pages cannot send a server-side 301, so each gets a
// static page with an instant meta refresh (Google treats that as a permanent
// redirect) and a canonical naming the destination. Mirrors the <Navigate>
// routes in src/App.tsx, plus /bbs for the Rust BBS client.
const legacyRedirects = {
  '/residential-training': '/programmes/',
  '/masterclass': '/programmes/',
  '/system-design': '/research/',
  '/research-paper': '/research/',
  '/work': '/research/',
  '/bbs': '/community/bbs/',
};
const escapeHtml = value => value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const redirectStub = target => {
  const url = escapeHtml(origin + target);
  return `<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<title>Moved to ${url}</title>\n<link rel="canonical" href="${url}">\n<meta name="robots" content="noindex">\n<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">\n</head>\n<body><p>This page has moved to <a href="${escapeHtml(target)}">${url}</a>.</p></body>\n</html>\n`;
};

// <lastmod> comes from the last commit touching a page's own source. A shallow
// clone would date every page to the newest commit, which teaches crawlers to
// ignore the field, so it is omitted rather than faked.
const marketingSources = {
  '/': ['src/pages/Index.tsx', 'src/data/site-facts.ts'], '/programmes': ['src/pages/Programmes.tsx', 'src/data/site-facts.ts'],
  '/co-create': ['src/pages/CoCreate.tsx'], '/research': ['src/pages/Research.tsx'], '/ecosystem': ['src/pages/Ecosystem.tsx'],
  '/team': ['src/pages/Team.tsx', 'public/data/team'], '/workshops': ['src/pages/WorkshopIndex.tsx', 'src/data/workshop-meta.ts'],
  '/testimonials': ['src/pages/Testimonials.tsx', 'content/site-content.yaml'], '/ventures': ['src/pages/Ventures.tsx'],
  '/contact': ['src/pages/Contact.tsx'], '/privacy': ['src/pages/Privacy.tsx'],
  '/clickthrough': ['src/pages/ClickThrough.tsx', 'src/data/site-facts.ts'],
};
const git = args => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
let fullHistory = false;
try { fullHistory = git(['rev-parse', '--is-shallow-repository']) === 'false'; } catch { /* not a git checkout */ }
if (!fullHistory) console.warn('prerender: shallow or missing git history; sitemap written without <lastmod>');
const lastModified = sources => {
  if (!fullHistory || !sources) return null;
  try { return git(['log', '-1', '--format=%cs', '--', ...sources]) || null; } catch { return null; }
};
// Vite's SSR server compiles JSX with the dev runtime (jsxDEV); an inherited
// NODE_ENV=production would load React's production build, which lacks it.
delete process.env.NODE_ENV;
const template = await fs.readFile('dist/index.html', 'utf8');
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  mode: 'production',
  // SSR externalises deps, so the client dep optimiser is never needed here; its
  // background esbuild scan was still running at vite.close(), which logged
  // "✘ [ERROR] The build was canceled" into every build.
  optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const { marketingPaths, hiddenPaths, renderPage } = await vite.ssrLoadModule('/src/prerender.tsx');
  const workshops = JSON.parse(await fs.readFile('src/data/workshop-list.json', 'utf8'));
  const routes = [...marketingPaths];
  const routeSources = new Map(Object.entries(marketingSources));
  const aliases = [];
  const curriculum = ['# DreamLab curriculum', '', '> Free self-guided lessons. Follow the source links for Markdown; each lesson also has a readable HTML page.', ''];
  for (const workshop of workshops) {
    const manifest = JSON.parse(await fs.readFile(`public/data/workshops/${workshop.id}/manifest.json`, 'utf8'));
    if (!manifest.pages.length) throw new Error(`Empty workshop: ${workshop.id}`);
    aliases.push({ from: workshop.path, to: `${workshop.path}/${manifest.pages[0].slug}` });
    curriculum.push(`## ${manifest.title}`, '');
    for (const lesson of manifest.pages) {
      routes.push(`${workshop.path}/${lesson.slug}`);
      routeSources.set(`${workshop.path}/${lesson.slug}`, [`public/data/workshops/${workshop.id}/${lesson.slug}`]);
      curriculum.push(`- [${lesson.title}](${origin}/data/workshops/${workshop.id}/${lesson.slug}): [Read online](${origin}${workshop.path}/${lesson.slug}/)`);
    }
    curriculum.push('');
  }
  const outputs = new Map();
  // Pages serves each route from <route>/index.html and 301s the bare path,
  // so canonical URLs name the trailing-slash form that answers 200.
  const pageUrl = route => `${origin}${route}${route === '/' ? '' : '/'}`;
  for (const route of routes) {
    const { body, meta } = renderPage(route);
    const url = pageUrl(route);
    const dom = new JSDOM(template);
    const doc = dom.window.document;
    doc.querySelector('#root').innerHTML = body;
    if (!doc.querySelector('#root h1') || doc.querySelector('#root').textContent.trim().length < 150) {
      throw new Error(`Missing rendered content: ${route}`);
    }
    // Route metadata is collected from the same useOGMeta calls as the UI.
    doc.title = meta.title;
    for (const [key, value] of Object.entries({
      title: meta.title, description: meta.description,
      'og:title': meta.title, 'og:description': meta.description,
      'og:url': url, 'og:image': meta.image,
      'og:image:alt': meta.imageAlt || meta.title, 'og:type': meta.type,
      'twitter:title': meta.title, 'twitter:description': meta.description,
      'twitter:url': url, 'twitter:image': meta.image,
      'twitter:image:alt': meta.imageAlt || meta.title,
    })) {
      const attr = key.startsWith('og:') ? 'property' : 'name';
      let tag = doc.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) { tag = doc.createElement('meta'); tag.setAttribute(attr, key); doc.head.append(tag); }
      tag.setAttribute('content', value || '');
    }
    doc.querySelector('link[rel="canonical"]').href = url;
    if (hiddenPaths.has(route)) {
      // Replace the template's index,follow directive rather than adding a second one.
      let robots = doc.querySelector('meta[name="robots"]');
      if (!robots) { robots = doc.createElement('meta'); robots.setAttribute('name', 'robots'); doc.head.append(robots); }
      robots.setAttribute('content', 'noindex, nofollow');
    }
    const schema = doc.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'route-structured-data';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': route.startsWith('/workshops/') ? 'LearningResource' : 'WebPage',
      '@id': `${url}#page`, url,
      name: meta.title, description: meta.description, inLanguage: 'en-GB',
      publisher: { '@id': `${origin}/#organisation` },
      ...(route.startsWith('/workshops/') ? { isAccessibleForFree: true } : {}),
    }).replaceAll('<', '\\u003c');
    doc.head.append(schema);
    if (route.startsWith('/workshops/')) {
      const raw = route.replace('/workshops/', '/data/workshops/');
      const alternate = doc.createElement('link');
      alternate.rel = 'alternate'; alternate.type = 'text/markdown'; alternate.href = raw;
      doc.head.append(alternate);
    }
    const main = doc.querySelector('#root main');
    if (main && !doc.getElementById('main-content')) main.id = 'main-content';
    const html = dom.serialize();
    dom.window.close();
    outputs.set(route, html);
  }
  // Directory indexes return HTTP 200 on GitHub Pages. Lesson names retain .md
  // for compatibility, but are directories containing HTML, not raw Markdown.
  for (const { from, to } of aliases) outputs.set(from, outputs.get(to));
  for (const [route, html] of outputs) {
    const directory = path.join('dist', route);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, 'index.html'), html);
  }
  for (const [from, to] of Object.entries(legacyRedirects)) {
    if (outputs.has(from)) throw new Error(`Redirect would overwrite a real page: ${from}`);
    await fs.mkdir(path.join('dist', from), { recursive: true });
    await fs.writeFile(path.join('dist', from, 'index.html'), redirectStub(to));
  }
  const sitemapEntry = route => {
    const lastmod = lastModified(routeSources.get(route));
    return `  <url><loc>${pageUrl(route)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  };
  await fs.writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.filter(route => !hiddenPaths.has(route)).map(sitemapEntry).join('\n')}\n</urlset>\n`);
  await fs.writeFile('dist/workshops/llms.txt', curriculum.join('\n'));
  console.log(`Prerendered ${routes.length} canonical pages, ${aliases.length} workshop entry points and ${Object.keys(legacyRedirects).length} legacy redirects.`);
} finally {
  await vite.close();
}
