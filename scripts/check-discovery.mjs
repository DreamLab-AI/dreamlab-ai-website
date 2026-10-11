// Validate emitted files, not source strings: a green check means a crawler can
// extract the right content from every canonical page without running scripts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
const origin = 'https://dreamlab-ai.com';
const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert(urls.length > 20, 'Sitemap must include curriculum lessons');
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap entries');
const list = JSON.parse(await fs.readFile('src/data/workshop-list.json', 'utf8'));
let lessons = 0;
for (const workshop of list) {
  const manifest = JSON.parse(await fs.readFile(`public/data/workshops/${workshop.id}/manifest.json`, 'utf8'));
  for (const page of manifest.pages) {
    assert(urls.includes(`${origin}${workshop.path}/${page.slug}/`), `Lesson missing from sitemap: ${page.slug}`);
    lessons++;
  }
}
for (const url of urls) {
  const route = new URL(url).pathname.replace(/(.)\/$/, '$1');
  const html = await fs.readFile(path.join('dist', route, 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, url);
  assert.equal(doc.querySelector('meta[property="og:url"]').content, url);
  assert.equal(doc.querySelector('meta[property="og:title"]').content, doc.title);
  assert(doc.querySelector('main h1, #root h1'), `No heading: ${url}`);
  assert(doc.querySelector('#root').textContent.trim().length > 150, `Empty body: ${url}`);
  assert(!html.includes('__BUILD_DATE__'), `Artificial freshness token: ${url}`);
  const schema = JSON.parse(doc.getElementById('route-structured-data').textContent);
  assert.equal(schema.url, url);
  assert.equal(schema.name, doc.title);
  for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(node.textContent);
  if (route.startsWith('/workshops/')) {
    assert.equal(schema['@type'], 'LearningResource');
    const raw = doc.querySelector('link[rel="alternate"][type="text/markdown"]');
    assert(raw, `No source alternate: ${url}`);
    await fs.access(path.join('dist', raw.getAttribute('href')));
    const source = await fs.readFile(path.join('dist', raw.getAttribute('href')), 'utf8');
    const heading = source.match(/^#\s+(.+)/m)?.[1]?.replace(/[*_`]/g, '');
    if (heading) assert(doc.querySelector('#root').textContent.includes(heading), `Wrong lesson body: ${url}`);
  }
  if (route === '/team') assert(doc.getElementById('john-ohare'), 'Person identity anchor missing');
  dom.window.close();
}
for (const file of ['dist/llms.txt', 'dist/workshops/llms.txt']) {
  const markdown = await fs.readFile(file, 'utf8');
  for (const match of markdown.matchAll(/\]\((https:\/\/dreamlab-ai\.com[^)]*)\)/g)) {
    const route = new URL(match[1]).pathname;
    if (route.startsWith('/community')) continue; // Separate kit, merged in CI.
    const local = path.join('dist', route);
    const stat = await fs.stat(local);
    if (stat.isDirectory()) await fs.access(path.join(local, 'index.html'));
  }
}
console.log(`Discovery check passed: ${urls.length} canonical HTML pages, ${lessons} lessons, metadata, schema and agent links.`);
