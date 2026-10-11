#!/usr/bin/env node
// Post-build: write dist/llms-full.txt, the plain text of the main site pages
// for AI agents that want the whole picture in one fetch (llms.txt points
// here). It is built from the prerendered HTML, so it says exactly what the
// pages say. Lessons are listed, not inlined: the curriculum is ~2.3MB of
// Markdown and each lesson already has a Markdown source URL in
// /workshops/llms.txt.
import fs from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const origin = 'https://dreamlab-ai.com';
const PAGES = [
  ['/', 'Home'],
  ['/programmes/', 'Programmes'],
  ['/co-create/', 'Co-create'],
  ['/ventures/', 'Venture Lab'],
  ['/workshops/', 'Free self-guided workshops'],
  ['/research/', 'Research'],
  ['/team/', 'Team'],
  ['/testimonials/', 'Testimonials'],
  ['/contact/', 'Contact'],
];
const MAX_BYTES = 400_000;

const text = (html) => {
  const { document } = new JSDOM(html).window;
  document.querySelectorAll('script, style, noscript, svg, nav, header, footer, [aria-hidden="true"]').forEach((n) => n.remove());
  // <br> carries no text, so words either side would run together.
  document.querySelectorAll('br').forEach((n) => n.replaceWith(' '));
  const root = document.querySelector('main') || document.querySelector('#root') || document.body;
  const out = [];
  for (const el of root.querySelectorAll('h1, h2, h3, h4, p, li, summary, dt, dd, blockquote')) {
    if (el.closest('li') && el.tagName !== 'LI' && el.closest('li') !== el) continue;
    const t = el.textContent.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const level = /^H(\d)$/.exec(el.tagName)?.[1];
    out.push(level ? `${'#'.repeat(Number(level) + 1)} ${t}` : el.tagName === 'LI' ? `- ${t}` : t);
  }
  // Collapse exact repeats (both layouts can carry the same copy).
  return out.filter((line, i) => out.indexOf(line) === i).join('\n\n');
};

const parts = [
  '# DreamLab AI — full site text',
  '',
  `> The main pages of ${origin} as plain text, generated at build time from the published HTML. ` +
    `The short index is ${origin}/llms.txt; every free lesson has a Markdown source listed in ${origin}/workshops/llms.txt.`,
  '',
];
for (const [route, label] of PAGES) {
  const file = `dist${route === '/' ? '/index.html' : `${route}index.html`}`;
  let html;
  try {
    html = await fs.readFile(file, 'utf8');
  } catch {
    continue;
  }
  parts.push(`## ${label}`, '', `Source: ${origin}${route}`, '', text(html), '');
}
try {
  const curriculum = await fs.readFile('dist/workshops/llms.txt', 'utf8');
  parts.push('## Curriculum index', '', curriculum.replace(/^# .*\n/, '').trim(), '');
} catch {
  /* curriculum index is optional */
}
const body = parts.join('\n');
if (Buffer.byteLength(body) > MAX_BYTES) {
  throw new Error(`llms-full.txt is ${Buffer.byteLength(body)} bytes; cap is ${MAX_BYTES}. Trim PAGES.`);
}
await fs.writeFile('dist/llms-full.txt', body);
console.log(`llms-full.txt: ${PAGES.length} pages, ${Math.round(Buffer.byteLength(body) / 1024)} KB`);
