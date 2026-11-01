// P2-11 hardening for workshop diagrams, tested against the code WorkshopPage
// actually runs (src/lib/diagrams.ts) and the real renderer (Pele), not a copy.
import { describe, it, expect } from 'vitest';
import { render } from 'pele';
import {
  DIAGRAM_OPTIONS,
  diagramIdPrefix,
  sanitizeDiagramSource,
  sanitizeDiagramSvg,
} from '../diagrams';

/** The full pipeline minus the DOM mount: source sanitiser, Pele, DOMPurify. */
function pipeline(source: string): string {
  const { svg } = render(sanitizeDiagramSource(source), { ...DIAGRAM_OPTIONS, idPrefix: 't' });
  const holder = document.createElement('div');
  holder.appendChild(sanitizeDiagramSvg(svg));
  return holder.innerHTML;
}

const DANGEROUS = /<script|\son\w+\s*=|javascript:|<img|<iframe|<foreignobject/i;

describe('sanitizeDiagramSource (P2-11)', () => {
  it('escapes <script> tags', () => {
    const clean = sanitizeDiagramSource('graph TD\nA[<script>alert(1)</script>]');
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('&lt;script');
  });

  it('neutralises click-call and click-href callbacks', () => {
    expect(sanitizeDiagramSource('click nodeA call evil()')).toContain('%% click removed %%');
    expect(sanitizeDiagramSource('click nodeA href "javascript:alert(1)"')).toContain('%% click removed %%');
  });

  it('neutralises javascript: URIs in href()', () => {
    const clean = sanitizeDiagramSource('href("javascript:alert(1)")');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('about:blank');
  });

  it('strips inline event handlers', () => {
    const clean = sanitizeDiagramSource('A["<div onmouseover=steal()>hover</div>"]');
    expect(clean).not.toContain('onmouseover=');
  });

  it('leaves a benign definition untouched', () => {
    const input = 'graph TD\n  A[Start] --> B[End]';
    expect(sanitizeDiagramSource(input)).toBe(input);
  });
});

describe('Pele + DOMPurify pipeline (P2-11)', () => {
  it('renders a benign flowchart with its labels', () => {
    const html = pipeline('flowchart LR\n  A[Start] --> B[End]');
    expect(html).toContain('<svg');
    expect(html).toContain('Start');
    expect(html).toContain('End');
  });

  it.each([
    ['script in a label', 'flowchart LR\n  A["<script>alert(1)</script>"] --> B'],
    ['img onerror in a label', 'flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B'],
    ['javascript: click href', 'flowchart LR\n  A --> B\n  click A href "javascript:alert(1)"'],
    ['javascript: link with the click keyword obscured', 'flowchart LR\n  A --> B\n  click A "javascript:alert(1)"'],
    ['iframe in a sequence message', 'sequenceDiagram\n  A->>B: <iframe src="https://evil.example"></iframe>'],
  ])('produces no executable markup for %s', (_name, source) => {
    expect(pipeline(source)).not.toMatch(DANGEROUS);
  });

  it('keeps Pele colours as CSS variables so the site theme applies', () => {
    expect(pipeline('flowchart LR\n  A --> B')).toContain('var(--pele-fg');
  });
});

describe('diagramIdPrefix', () => {
  it('turns a React useId value into an id Pele accepts', () => {
    expect(diagramIdPrefix(':r1:')).toBe('dl-diagram-r1');
    expect(diagramIdPrefix('«r2»')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
