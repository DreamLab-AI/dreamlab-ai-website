import { useEffect, useRef, useCallback } from "react";

/**
 * Image preload priority levels
 */
export type PreloadPriority = "critical" | "high" | "medium" | "low";

/**
 * Image preload configuration
 */
export interface PreloadConfig {
  /** Image URL to preload */
  src: string;
  /** Priority level for preloading */
  priority?: PreloadPriority;
  /** Image type hint */
  as?: "image";
  /** CORS mode */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Media query for responsive preloading */
  media?: string;
  /** Image MIME type */
  type?: string;
  /** Fetch priority hint */
  fetchPriority?: "high" | "low" | "auto";
  /** Image srcset for responsive preloading */
  srcset?: string;
  /** Image sizes for responsive preloading */
  sizes?: string;
}

/**
 * Preload manager for tracking preloaded images
 */
class PreloadManager {
  private preloadedUrls = new Set<string>();
  private pendingPreloads = new Map<string, Promise<void>>();
  private linkElements = new Map<string, HTMLLinkElement>();

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /**
   * Check if an image is currently being preloaded
   */
  isPending(url: string): boolean {
    return this.pendingPreloads.has(url);
  }

  /**
   * Preload an image using link[rel="preload"]
   */
  preloadWithLink(config: PreloadConfig): Promise<void> {
    const { src, crossOrigin, media, type, fetchPriority, srcset, sizes } = config;

    if (this.isPreloaded(src) || typeof document === "undefined") {
      return Promise.resolve();
    }

    if (this.isPending(src)) {
      return this.pendingPreloads.get(src)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;

      if (crossOrigin) link.crossOrigin = crossOrigin;
      if (media) link.media = media;
      if (type) link.type = type;
      if (fetchPriority) (link as HTMLLinkElement & { fetchPriority: string }).fetchPriority = fetchPriority;
      if (srcset) link.setAttribute("imagesrcset", srcset);
      if (sizes) link.setAttribute("imagesizes", sizes);

      link.onload = () => {
        this.preloadedUrls.add(src);
        this.pendingPreloads.delete(src);
        resolve();
      };

      link.onerror = () => {
        this.pendingPreloads.delete(src);
        reject(new Error(`Failed to preload image: ${src}`));
      };

      this.linkElements.set(src, link);
      document.head.appendChild(link);
    });

    this.pendingPreloads.set(src, promise);
    return promise;
  }

  /**
   * Preload an image using Image() constructor
   */
  preloadWithImage(config: PreloadConfig): Promise<void> {
    const { src, crossOrigin, srcset } = config;

    if (this.isPreloaded(src)) {
      return Promise.resolve();
    }

    if (this.isPending(src)) {
      return this.pendingPreloads.get(src)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();

      if (crossOrigin) img.crossOrigin = crossOrigin;
      if (srcset) img.srcset = srcset;

      img.onload = () => {
        this.preloadedUrls.add(src);
        this.pendingPreloads.delete(src);
        resolve();
      };

      img.onerror = () => {
        this.pendingPreloads.delete(src);
        reject(new Error(`Failed to preload image: ${src}`));
      };

      img.src = src;
    });

    this.pendingPreloads.set(src, promise);
    return promise;
  }

  /**
   * Preload an image based on priority
   */
  preload(config: PreloadConfig): Promise<void> {
    const { priority = "medium" } = config;

    // Use link preload for critical/high priority (better browser integration)
    if (priority === "critical" || priority === "high") {
      return this.preloadWithLink(config);
    }

    // Use Image() for lower priorities (doesn't block rendering)
    return this.preloadWithImage(config);
  }

  /**
   * Preload multiple images with priority ordering
   */
  preloadBatch(configs: PreloadConfig[]): Promise<void[]> {
    // Sort by priority
    const priorityOrder: Record<PreloadPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sorted = [...configs].sort((a, b) => {
      const aPriority = priorityOrder[a.priority || "medium"];
      const bPriority = priorityOrder[b.priority || "medium"];
      return aPriority - bPriority;
    });

    return Promise.all(sorted.map((config) => this.preload(config)));
  }

  /**
   * Cancel a pending preload
   */
  cancel(url: string): void {
    const link = this.linkElements.get(url);
    if (link && link.parentNode) {
      link.parentNode.removeChild(link);
    }
    this.linkElements.delete(url);
    this.pendingPreloads.delete(url);
  }

  /**
   * Cancel all pending preloads
   */
  cancelAll(): void {
    this.linkElements.forEach((link, url) => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      this.linkElements.delete(url);
    });
    this.pendingPreloads.clear();
  }

  /**
   * Clear all preload tracking
   */
  clear(): void {
    this.cancelAll();
    this.preloadedUrls.clear();
  }

  /**
   * Get preload statistics
   */
  getStats(): {
    preloaded: number;
    pending: number;
    urls: string[];
  } {
    return {
      preloaded: this.preloadedUrls.size,
      pending: this.pendingPreloads.size,
      urls: Array.from(this.preloadedUrls),
    };
  }
}

// Global preload manager instance
export const preloadManager = new PreloadManager();

/**
 * Preload a single image
 */
export const preloadImage = (
  src: string,
  options?: Partial<PreloadConfig>
): Promise<void> => {
  return preloadManager.preload({ src, ...options });
};

/**
 * Preload multiple images
 */
export const preloadImages = (
  sources: Array<string | PreloadConfig>
): Promise<void[]> => {
  const configs: PreloadConfig[] = sources.map((source) =>
    typeof source === "string" ? { src: source } : source
  );
  return preloadManager.preloadBatch(configs);
};

/**
 * Preload critical above-fold images
 */
export const preloadCriticalImages = (
  sources: string[]
): Promise<void[]> => {
  return preloadImages(
    sources.map((src) => ({
      src,
      priority: "critical" as PreloadPriority,
      fetchPriority: "high" as const,
    }))
  );
};

/**
 * Hook for preloading images on component mount
 */
export const useImagePreload = (
  sources: Array<string | PreloadConfig>,
  options?: {
    /** Run on mount */
    immediate?: boolean;
    /** Delay before preloading (ms) */
    delay?: number;
    /** Callback when all images are preloaded */
    onComplete?: () => void;
    /** Callback on error */
    onError?: (error: Error) => void;
  }
): {
  preload: () => Promise<void>;
  cancel: () => void;
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
} => {
  const { immediate = true, delay = 0, onComplete, onError } = options || {};
  const loadedCount = useRef(0);
  const totalCount = sources.length;
  const cancelledRef = useRef(false);

  const getProgress = useCallback(() => {
    return totalCount > 0 ? (loadedCount.current / totalCount) * 100 : 0;
  }, [totalCount]);

  const preload = useCallback(async () => {
    if (sources.length === 0) {
      onComplete?.();
      return;
    }

    cancelledRef.current = false;
    loadedCount.current = 0;

    try {
      const configs: PreloadConfig[] = sources.map((source) =>
        typeof source === "string" ? { src: source } : source
      );

      await Promise.all(
        configs.map(async (config) => {
          if (cancelledRef.current) return;
          try {
            await preloadManager.preload(config);
            if (!cancelledRef.current) {
              loadedCount.current++;
            }
          } catch (err) {
            // Continue with other images even if one fails
            console.warn(`Failed to preload: ${config.src}`, err);
          }
        })
      );

      if (!cancelledRef.current) {
        onComplete?.();
      }
    } catch (err) {
      if (!cancelledRef.current) {
        onError?.(err instanceof Error ? err : new Error("Preload failed"));
      }
    }
  }, [sources, onComplete, onError]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    sources.forEach((source) => {
      const src = typeof source === "string" ? source : source.src;
      preloadManager.cancel(src);
    });
  }, [sources]);

  useEffect(() => {
    if (!immediate) return;

    const timeoutId = setTimeout(preload, delay);

    return () => {
      clearTimeout(timeoutId);
      cancel();
    };
  }, [immediate, delay, preload, cancel]);

  return {
    preload,
    cancel,
    isLoading: loadedCount.current < totalCount && loadedCount.current > 0,
    isComplete: loadedCount.current === totalCount && totalCount > 0,
    progress: getProgress(),
  };
};

/**
 * Hook for preloading images when they enter viewport
 */
export const useViewportPreload = (
  sources: Array<string | PreloadConfig>,
  options?: {
    rootMargin?: string;
    threshold?: number;
  }
): {
  ref: (node: HTMLElement | null) => void;
  isPreloaded: boolean;
} => {
  const { rootMargin = "200px", threshold = 0 } = options || {};
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isPreloadedRef = useRef(false);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isPreloadedRef.current) {
              isPreloadedRef.current = true;
              preloadImages(sources).catch(console.warn);
              observerRef.current?.disconnect();
            }
          });
        },
        { rootMargin, threshold }
      );

      observerRef.current.observe(node);
    },
    [sources, rootMargin, threshold]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    ref,
    isPreloaded: isPreloadedRef.current,
  };
};

/**
 * Component that preloads images when mounted
 */
export const ImagePreloader: React.FC<{
  sources: Array<string | PreloadConfig>;
  delay?: number;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}> = ({ sources, delay = 0, onComplete, onError, children }) => {
  useImagePreload(sources, {
    immediate: true,
    delay,
    onComplete,
    onError,
  });

  return <>{children}</>;
};

export default preloadManager;
