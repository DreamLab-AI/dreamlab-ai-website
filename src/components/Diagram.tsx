import { useEffect, useId, useRef } from 'react';
import type { Mounted } from 'pele/lazy';
import { diagramIdPrefix, mountDiagram } from '@/lib/diagrams';

/**
 * A Mermaid-syntax diagram rendered by Pele. The container's width drives the
 * layout and Pele re-renders on resize; colours come from the `--pele-*`
 * variables on `.dl-diagram` (index.css), so no re-render is needed for theme.
 */
export function Diagram({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const idPrefix = diagramIdPrefix(useId());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let mounted: Mounted | null = null;
    let cancelled = false;
    mountDiagram(element, source, idPrefix, {
      onError: (error) => {
        if (import.meta.env.DEV) console.warn('Diagram render failed:', error);
      },
    }).then((m) => {
      if (cancelled) m.destroy();
      else mounted = m;
    }).catch((error) => {
      // The renderer itself failed to load: show the source as plain text.
      if (import.meta.env.DEV) console.warn('Diagram renderer unavailable:', error);
      if (!cancelled) element.textContent = source;
    });
    return () => {
      cancelled = true;
      mounted?.destroy();
    };
  }, [source, idPrefix]);

  return <div ref={ref} className="dl-diagram" role="figure" aria-label="Diagram" />;
}
