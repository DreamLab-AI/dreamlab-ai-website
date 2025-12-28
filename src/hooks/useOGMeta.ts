/**
 * React hook for managing Open Graph meta tags
 * Updates document meta tags on mount and when config changes
 */

import { useEffect } from 'react';
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
export function useOGMeta(config: Partial<OGMetaConfig>): void {
  useEffect(() => {
    updateOGMetaTags(config);

    // Cleanup: restore original title on unmount (optional)
    return () => {
      // Could restore original meta tags here if needed
    };
  }, [
    config.title,
    config.description,
    config.url,
    config.image,
    config.type,
  ]);
}

export default useOGMeta;
