// Vite/React build adapter. Render existing components rather than maintaining
// crawler-only copy. No browser, external fetches or new runtime are required.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const origin = 'https://dreamlab-ai.com';
// Vite's SSR server compiles JSX with the dev runtime (jsxDEV); an inherited
// NODE_ENV=production would load React's production build, which lacks it.
delete process.env.NODE_ENV;
const template = await fs.readFile('dist/index.html', 'utf8');
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', mode: 'production' });
try {
  const { marketingPaths, renderPage } = await vite.ssrLoadModule('/src/prerender.tsx');
  const workshops = JSON.parse(await fs.readFile('src/data/workshop-list.json', 'utf8'));
  const routes = [...marketingPaths];
  const aliases = [];
  const curriculum = ['# DreamLab curriculum', '', '> Free self-guided lessons. Follow the source links for Markdown; each lesson also has a readable HTML page.', ''];
  for (const workshop of workshops) {
    const manifest = JSON.parse(await fs.readFile(`public/data/workshops/${workshop.id}/manifest.json`, 'utf8'));
    if (!manifest.pages.length) throw new Error(`Empty workshop: ${workshop.id}`);
    aliases.push({ from: workshop.path, to: `${workshop.path}/${manifest.pages[0].slug}` });
    curriculum.push(`## ${manifest.title}`, '');
    for (const lesson of manifest.pages) {
      routes.push(`${workshop.path}/${lesson.slug}`);
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
  // No deployment-time lastmod: a rebuild is not a content revision.
  await fs.writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${pageUrl(route)}</loc></url>`).join('\n')}\n</urlset>\n`);
  await fs.writeFile('dist/workshops/llms.txt', curriculum.join('\n'));
  console.log(`Prerendered ${routes.length} canonical pages and ${aliases.length} workshop entry points.`);
} finally {
  await vite.close();
}
