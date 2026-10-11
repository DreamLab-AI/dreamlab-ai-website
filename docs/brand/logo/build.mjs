#!/usr/bin/env node
// Generates the DreamLab logo options in this folder. Every letter is a path
// (no fonts), every file is self-contained (no scripts, no external refs), and
// the animated files use CSS inside the SVG so prefers-reduced-motion can stop
// them. Run: node docs/brand/logo/build.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const C = {
  cyan: '#22D3EE', sky: '#38BDF8', indigo: '#6366F1', violet: '#A855F7',
  magenta: '#E879F9', fuchsia: '#C026D3', ink: '#0E0E11', paper: '#FAFAFA',
};

// ---------------------------------------------------------------- wordmark
// Geometric "DreamLab AI": capitals 68 high, x-height 40, bowl radius 20,
// baseline y=80. Stroked paths with round caps; italicised by a skew.
// (Lowercase "dreamlab" is the North West collective's own name and logo;
// this company's mark is DreamLab AI.)
const B = 80, X = 40, A = 12, R = 20, CY = 60;
const circle = (cx, cy, r) =>
  `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
const glyphs = {
  d: (x) => ({ d: `${circle(x + R, CY, R)} M${x + 2 * R},${A} V${B}`, w: 2 * R }),
  r: (x) => ({ d: `M${x},${B} V${CY - 6} Q${x},${X} ${x + 20},${X}`, w: 20 }),
  e: (x) => {
    const ex = x + R + R * Math.cos((40 * Math.PI) / 180);
    const ey = CY + R * Math.sin((40 * Math.PI) / 180);
    return { d: `M${x},${CY} H${x + 2 * R} A${R},${R} 0 1,0 ${ex.toFixed(2)},${ey.toFixed(2)}`, w: 2 * R };
  },
  a: (x) => ({ d: `${circle(x + R, CY, R)} M${x + 2 * R},${X} V${B}`, w: 2 * R }),
  m: (x) => ({
    d: `M${x},${B} V${X + 12} a12,12 0 0,1 24,0 V${B} M${x + 24},${X + 12} a12,12 0 0,1 24,0 V${B}`,
    w: 48,
  }),
  l: (x) => ({ d: `M${x},${A} V${B}`, w: 0 }),
  b: (x) => ({ d: `M${x},${A} V${B} ${circle(x + R, CY, R)}`, w: 2 * R }),
  D: (x) => ({ d: `M${x},${A} H${x + 12} A34,34 0 0,1 ${x + 12},${B} H${x} Z`, w: 46 }),
  L: (x) => ({ d: `M${x},${A} V${B} H${x + 30}`, w: 30 }),
  A: (x) => ({ d: `M${x},${B} L${x + 21},${A} L${x + 42},${B} M${x + 9},${B - 22} H${x + 33}`, w: 42 }),
  I: (x) => ({ d: `M${x},${A} V${B}`, w: 0 }),
  ' ': () => ({ d: '', w: 8 }),
};
function wordmark(word = 'DreamLab AI', gap = 15) {
  let x = 0;
  const parts = [];
  for (const ch of word) {
    const g = glyphs[ch](x);
    if (g.d) parts.push(g.d);
    x += g.w + gap;
  }
  return { d: parts.join(' '), width: x - gap };
}

// --------------------------------------------------------- spaced capitals
// The current header wordmark in wide-tracked capitals, as paths. Cap height 20.
const caps = {
  D: (x) => ({ d: `M${x},0 H${x + 5} A10,10 0 0,1 ${x + 5},20 H${x} Z`, w: 15 }),
  R: (x) => ({ d: `M${x},20 V0 H${x + 8} A5.5,5.5 0 0,1 ${x + 8},11 H${x} M${x + 7},11 L${x + 13},20`, w: 13.5 }),
  E: (x) => ({ d: `M${x + 12},0 H${x} V20 H${x + 12} M${x},10 H${x + 9}`, w: 12 }),
  A: (x) => ({ d: `M${x},20 L${x + 7},0 L${x + 14},20 M${x + 2.8},13 H${x + 11.2}`, w: 14 }),
  M: (x) => ({ d: `M${x},20 V0 L${x + 8},12 L${x + 16},0 V20`, w: 16 }),
  L: (x) => ({ d: `M${x},0 V20 H${x + 11}`, w: 8.5 }),
  B: (x) => ({ d: `M${x},10 V0 H${x + 7} A5,5 0 0,1 ${x + 7},10 H${x} V20 H${x + 8} A5,5 0 0,0 ${x + 8},10`, w: 13.5 }),
  I: (x) => ({ d: `M${x},0 V20`, w: 0 }),
  C: (x) => ({ d: `M${x + 15},3.5 A10,10 0 1,0 ${x + 15},16.5`, w: 15 }),
  O: (x) => ({ d: circle(x + 10, 10, 10), w: 20 }),
  N: (x) => ({ d: `M${x},20 V0 L${x + 14},20 V0`, w: 14 }),
  S: (x) => ({ d: `M${x + 12},3 Q${x + 6},-1 ${x + 1.5},4 Q${x - 1},9 ${x + 6},10 Q${x + 13},11 ${x + 11},16.5 Q${x + 7},21 ${x},17`, w: 12 }),
  U: (x) => ({ d: `M${x},0 V13 A6,6 0 0,0 ${x + 12},13 V0`, w: 12 }),
  T: (x) => ({ d: `M${x},0 H${x + 14} M${x + 7},0 V20`, w: 14 }),
  G: (x) => ({ d: `M${x + 15},3.5 A10,10 0 1,0 ${x + 19},11 H${x + 12}`, w: 19 }),
  ' ': () => ({ d: '', w: 10 }),
};
function spaced(word = 'DREAMLAB AI', track = 7) {
  let x = 0;
  const parts = [];
  for (const ch of word) {
    const g = caps[ch](x);
    if (g.d) parts.push(g.d);
    x += g.w + track;
  }
  return { d: parts.join(' '), width: x - track };
}

// ------------------------------------------------------------------- mark
// The alchemist's bowl from the original raster logo: a vessel with a
// constellation of linked nodes rising out of it and a magenta wisp.
// Drawn on a 64x64 grid.
const NODES = [[21, 27], [29, 18], [38, 24], [46, 13]];
const EDGES = [[0, 1], [1, 2], [2, 3], [0, 2]];
const RIM = [32, 37];
const bowl = 'M7,37 H57 M10,37 C12,52 22,57 32,57 C42,57 52,52 54,37';
const foot = 'M24,60 H40';
const wisp = 'M46,13 C51,10 47,7 51,5 C54,3 58,5 56,8';

function defs(id) {
  return `<defs>
    <linearGradient id="${id}-g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${C.cyan}"/><stop offset=".55" stop-color="${C.indigo}"/><stop offset="1" stop-color="${C.violet}"/>
    </linearGradient>
    <linearGradient id="${id}-w" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/>
    </linearGradient>
    <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

function markGroup(id, { animated = false, mono = null, simple = false } = {}) {
  const stroke = mono ?? `url(#${id}-g)`;
  const wispStroke = mono ?? `url(#${id}-w)`;
  const node = mono ?? C.cyan;
  const sw = simple ? 4.5 : 3;
  const nodes = simple ? NODES.slice(0, 3) : NODES;
  const edges = simple ? [[0, 1], [1, 2]] : EDGES;
  const lines = edges
    .map(([a, b], i) => `<line class="edge e${i}" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}"/>`)
    .concat(`<line class="edge e9" x1="${RIM[0]}" y1="${RIM[1]}" x2="${nodes[0][0]}" y2="${nodes[0][1]}"/>`)
    .join('');
  const dots = nodes
    .map(([x, y], i) => `<circle class="node n${i}" cx="${x}" cy="${y}" r="${simple ? 4.2 : i === 3 ? 3.4 : 2.8}"/>`)
    .join('');
  return `<g ${mono || simple ? '' : `filter="url(#${id}-glow)"`} stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path class="bowl" d="${bowl}" stroke="${stroke}" stroke-width="${sw + 0.5}"/>
    <path d="${foot}" stroke="${stroke}" stroke-width="${sw}"/>
    <g stroke="${stroke}" stroke-width="${simple ? 3 : 1.6}">${lines}</g>
    <g fill="${node}" stroke="none">${dots}</g>
    ${simple ? '' : `<path class="wisp" d="${wisp}" stroke="${wispStroke}" stroke-width="2.4"/>`}
  </g>`;
}

const ANIM = `<style>
    .edge{stroke-dasharray:40;stroke-dashoffset:40;animation:draw 1.4s ease-out forwards}
    .e1{animation-delay:.15s}.e2{animation-delay:.3s}.e3{animation-delay:.45s}.e9{animation-delay:0s}
    .node{transform-box:fill-box;transform-origin:center;animation:pulse 3.2s ease-in-out infinite}
    .n1{animation-delay:.4s}.n2{animation-delay:.8s}.n3{animation-delay:1.2s}
    .wisp{stroke-dasharray:60;stroke-dashoffset:60;transform-box:fill-box;transform-origin:0% 100%;
      animation:draw 1.6s .9s ease-out forwards,sway 6s 2.5s ease-in-out infinite}
    @keyframes draw{to{stroke-dashoffset:0}}
    @keyframes pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.35)}}
    @keyframes sway{0%,100%{transform:rotate(0)}50%{transform:rotate(-9deg)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important;stroke-dashoffset:0!important}}
  </style>`;

const svg = (w, h, body, title, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">
  <title>${title}</title>${extra}
  ${body}
</svg>
`;

const files = {};

// 1. Faithful: bowl mark + italic gradient wordmark (static and animated).
const wm = wordmark();
const SKEW = -12;
// Company line set under the wordmark in small spaced capitals.
const desc = spaced('CONSULTING', 9);
function lockup(id, animated, mono, descriptor = false) {
  const markScale = 1.55;
  const markW = 64 * markScale;
  const wx = markW + 18;
  const w = Math.ceil(wx + wm.width + 30);
  const h = descriptor ? 122 : 96;
  const ds = 0.62;
  const descLine = descriptor
    ? `<g transform="translate(${wx + 6 + wm.width - desc.width * ds},98) scale(${ds})"><path d="${desc.d}" fill="none" stroke="${mono ?? C.paper}" stroke-opacity="${mono ? 1 : 0.8}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>`
    : '';
  const body = `${mono ? '' : defs(id)}${animated ? ANIM : ''}
  <g transform="translate(0,${descriptor ? 10 : -2}) scale(${markScale})">${markGroup(id, { animated, mono })}</g>
  <g transform="translate(${wx + 12},0) skewX(${SKEW})">
    <path d="${wm.d}" fill="none" stroke="${mono ?? `url(#${id}-g)`}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>${descLine}`;
  return svg(w, h, body, descriptor ? 'DreamLab AI Consulting' : 'DreamLab AI');
}
files['01-classic-lockup.svg'] = lockup('cl', false, null);
files['01-classic-lockup-animated.svg'] = lockup('cla', true, null);
files['01-classic-lockup-mono-light.svg'] = lockup('clm', false, C.paper);
files['01-classic-lockup-mono-dark.svg'] = lockup('cld', false, C.ink);
files['01-classic-lockup-consulting.svg'] = lockup('clc', false, null, true);
files['01-classic-lockup-consulting-mono-dark.svg'] = lockup('clcd', false, C.ink, true);

// 2. Mark only: full detail, and a simplified version for favicons (16/32px).
files['02-mark.svg'] = svg(64, 64, `${defs('mk')}${markGroup('mk')}`, 'DreamLab AI mark');
files['02-mark-animated.svg'] = svg(64, 64, `${defs('mka')}${ANIM}${markGroup('mka', { animated: true })}`, 'DreamLab AI mark');
files['02-mark-favicon.svg'] = svg(
  64, 64,
  `${defs('fv')}<rect width="64" height="64" rx="14" fill="${C.ink}"/><g transform="translate(-6.5,-6) scale(1.2)">${markGroup('fv', { simple: true })}</g>`,
  'DreamLab AI',
);
files['02-mark-mono-light.svg'] = svg(64, 64, markGroup('mml', { mono: C.paper }), 'DreamLab AI mark');
files['02-mark-mono-dark.svg'] = svg(64, 64, markGroup('mmd', { mono: C.ink }), 'DreamLab AI mark');

// 3. The current header, evolved: the cyan dot becomes a three-node
// constellation; DREAMLAB AI in wide-tracked capitals, as paths.
const sp = spaced();
function header(id, animated, ink) {
  const body = `${animated ? `<style>
    .hn{transform-box:fill-box;transform-origin:center;animation:hp 2.8s ease-in-out infinite}
    .hn2{animation-delay:.45s}.hn3{animation-delay:.9s}
    .hl{stroke-dasharray:20;stroke-dashoffset:20;animation:hd 1s ease-out forwards}.hl2{animation-delay:.25s}
    @keyframes hp{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
    @keyframes hd{to{stroke-dashoffset:0}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important;stroke-dashoffset:0!important}}
  </style>` : ''}
  <g stroke="${C.cyan}" stroke-width="1.4" stroke-linecap="round" opacity=".8">
    <line class="hl" x1="5" y1="18" x2="12" y2="8"/><line class="hl hl2" x1="12" y1="8" x2="19" y2="17"/>
  </g>
  <g fill="${C.cyan}"><circle class="hn" cx="5" cy="18" r="3"/><circle class="hn hn2" cx="12" cy="8" r="3.6"/><circle class="hn hn3" cx="19" cy="17" r="2.6"/></g>
  <g transform="translate(34,3)"><path d="${sp.d}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  return svg(Math.ceil(34 + sp.width + 4), 26, body, 'DreamLab AI');
}
files['03-header-constellation.svg'] = header('h', false, C.paper);
files['03-header-constellation-animated.svg'] = header('ha', true, C.paper);
files['03-header-constellation-on-light.svg'] = header('hl', false, C.ink);

// 4. Freer: a golden-angle field (the hero's Voronoi seeds) gathering into a
// glowing core, the "dream" forming in the lab. Seeds twinkle in spiral order.
function phyllotaxis(id, animated) {
  const n = 89, golden = Math.PI * (3 - Math.sqrt(5));
  let dots = '';
  for (let i = 1; i <= n; i++) {
    const r = 3.1 * Math.sqrt(i), t = i * golden;
    const x = (32 + r * Math.cos(t)).toFixed(2), y = (32 + r * Math.sin(t)).toFixed(2);
    const size = (1.9 - i / n).toFixed(2);
    const delay = animated ? ` style="animation-delay:${((i * 0.045) % 4).toFixed(2)}s"` : '';
    dots += `<circle class="s" cx="${x}" cy="${y}" r="${size}"${delay}/>`;
  }
  const body = `<defs>
    <radialGradient id="${id}-core"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.indigo}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-f" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.magenta}"/></linearGradient>
  </defs>${animated ? `<style>
    .s{animation:tw 4s ease-in-out infinite}
    .core{transform-box:fill-box;transform-origin:center;animation:br 5s ease-in-out infinite}
    .field{transform-origin:32px 32px;animation:spin 60s linear infinite}
    @keyframes tw{0%,100%{opacity:.35}50%{opacity:1}}
    @keyframes br{0%,100%{transform:scale(.85);opacity:.85}50%{transform:scale(1.08);opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>` : ''}
  <g class="field" fill="url(#${id}-f)">${dots}</g>
  <circle class="core" cx="32" cy="32" r="9" fill="url(#${id}-core)"/>`;
  return body;
}
files['04-golden-field.svg'] = svg(64, 64, phyllotaxis('gf', false), 'DreamLab AI golden field');
files['04-golden-field-animated.svg'] = svg(64, 64, phyllotaxis('gfa', true), 'DreamLab AI golden field');
{
  const markW = 96;
  const body = `<g transform="scale(1.5)">${phyllotaxis('gfl', true)}</g>
  <g transform="translate(${markW + 26},4) skewX(${SKEW})">
    <path d="${wm.d}" fill="none" stroke="${C.paper}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
  files['04-golden-field-lockup-animated.svg'] = svg(Math.ceil(markW + 26 + wm.width + 30), 96, body, 'DreamLab AI');
}

for (const [name, content] of Object.entries(files)) writeFileSync(join(OUT, name), content);
console.log(`wrote ${Object.keys(files).length} files to ${OUT}`);
