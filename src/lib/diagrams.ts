// Mermaid-syntax diagrams on workshop pages, rendered with Pele
// (obsidianmd/pele, pinned exactly in package.json; VisionFlow ADR-2020).
//
// P2-11 hardening, kept from the Mermaid era and now tested against the real
// renderer rather than a copy of it:
//   1. the source is sanitised before Pele sees it (defence in depth);
//   2. Pele runs with links and images off, so no diagram can navigate or load;
//   3. Pele's SVG passes DOMPurify before it reaches the DOM.
// Pele is imported dynamically only: a static import anywhere would pull the
// whole renderer into the route chunk.
import DOMPurify from 'dompurify';
import type { Mounted, MountOptions } from 'pele/lazy';

/** Render options every workshop diagram uses. */
export const DIAGRAM_OPTIONS = { links: false, images: false } as const;

/** Neutralise script tags, click callbacks, javascript: URIs and on* handlers. */
export function sanitizeDiagramSource(input: string): string {
  return input
    .replace(/<script[\s>]/gi, '&lt;script')
    .replace(/\bclick\s+\S+\s+(call|href)\b/gi, '%% click removed %%')
    .replace(/\bhref\s*\(\s*["']javascript:/gi, 'href("about:blank')
    .replace(/\bon\w+\s*=/gi, 'data-removed=');
}

/** DOMPurify pass over Pele's SVG; the fragment is what Pele mounts. */
export function sanitizeDiagramSvg(svg: string): DocumentFragment {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    RETURN_DOM_FRAGMENT: true,
  });
}

/** An id prefix Pele accepts (letters, digits, `-`, `_`) from any React id. */
export function diagramIdPrefix(reactId: string): string {
  return `dl-diagram-${reactId.replace(/[^A-Za-z0-9_-]/g, '')}`;
}

/** Mount one diagram into `element`; Pele shows its own error text on failure. */
export async function mountDiagram(
  element: HTMLElement,
  source: string,
  idPrefix: string,
  extra: Partial<MountOptions> = {},
): Promise<Mounted> {
  const { mountAsync } = await import('pele/lazy');
  return mountAsync(element, sanitizeDiagramSource(source), {
    ...DIAGRAM_OPTIONS,
    idPrefix,
    sanitize: sanitizeDiagramSvg,
    ...extra,
  });
}
