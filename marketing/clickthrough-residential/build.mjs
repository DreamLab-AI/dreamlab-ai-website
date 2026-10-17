#!/usr/bin/env node
// Builds the Click Through × DreamLab A4 flyer.
//
//   node marketing/clickthrough-residential/build.mjs
//
// 1. Writes qr.svg (links to the unlinked landing page, src/pages/ClickThrough.tsx).
// 2. Renders flyer.html with WeasyPrint (an estate tool, not an npm package;
//    `weasyprint --version` must work) to public/downloads/.
// 3. Rasterises page 1 to preview.png with pdftoppm when it is available, so the
//    result can be eyeballed without a PDF viewer.
//
// Estate edition: Space Grotesk subsets under fonts/, the Blender isometric
// diorama (mini-lab.png), the ComfyUI studio render (studio.jpg) and the SVG
// lockup. The earlier corporate layout is kept under legacy/ for reference. Pricing on the flyer is hand-written: check it
// against src/data/site-facts.ts before a reprint (the test in
// src/data/__tests__ does this for the website, not for this file).
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const landing = 'https://dreamlab-ai.com/clickthrough/';
const out = join(repo, 'public', 'downloads');
const pdf = join(out, 'clickthrough-dreamlab-residential-a4.pdf');

await QRCode.toFile(join(here, 'qr.svg'), landing, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 0,
  color: { dark: '#18406c', light: '#0000' },
});

mkdirSync(out, { recursive: true });
execFileSync('weasyprint', ['--base-url', here, '--optimize-images', '--jpeg-quality', '90', '--dpi', '220', join(here, 'flyer.html'), pdf], { stdio: 'inherit' });
console.log(`wrote ${pdf}`);

try {
  execFileSync('pdftoppm', ['-png', '-r', '110', '-singlefile', pdf, join(here, 'preview')], { stdio: 'inherit' });
  console.log(`wrote ${join(here, 'preview.png')}`);
} catch {
  console.log('pdftoppm not available; skipped preview.png');
}
if (!existsSync(pdf)) process.exit(1);
