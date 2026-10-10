/**
 * React hook for managing Open Graph meta tags
 * Updates document meta tags on mount and when config changes
 */

import { createContext, useContext, useEffect } from 'react';
import { updateOGMetaTags, OGMetaConfig } from '@/lib/og-meta';

/**
 * Hook to update OG meta tags when component mounts or config changes
 *
 * Usage:
 * ```tsx
 * import { useOGMeta, PAGE_OG_CONFIGS } from '@/lib/og-meta';
 *
 * const MyPage = () => {
 *   useOGMeta(PAGE_OG_CONFIGS.home);
 *   return <div>...</div>;
 * };
 * ```
 */
// Build-time rendering captures the same metadata used by the browser.
export const StaticMetaContext = createContext<((config: Partial<OGMetaConfig>) => void) | null>(null);

export function useOGMeta(config: Partial<OGMetaConfig>): void {
  const collect = useContext(StaticMetaContext);
  collect?.(config);
  // Callers pass inline object literals, so the effect keys on the serialised
  // config: it re-runs when any field changes, not on every render.
  const serialised = JSON.stringify(config);
  useEffect(() => {
    updateOGMetaTags(JSON.parse(serialised) as Partial<OGMetaConfig>);
  }, [serialised]);
}

export default useOGMeta;
