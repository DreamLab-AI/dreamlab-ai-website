import { useEffect, useState, useCallback, useRef } from "react";
import {
  preloadCriticalImages,
  preloadImages,
  type PreloadConfig,
} from "@/components/ui/image-preloader";
import {
  isWebPSupported,
  isAVIFSupported,
  getOptimalImageFormat,
  CRITICAL_IMAGES,
} from "@/lib/image-utils";

/**
 * Hook to detect supported image formats
 */
export const useImageFormatSupport = (): {
  webpSupported: boolean | null;
  avifSupported: boolean | null;
  isLoading: boolean;
} => {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const [avifSupported, setAvifSupported] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const detectFormats = async () => {
      const [webp, avif] = await Promise.all([
        isWebPSupported(),
        isAVIFSupported(),
      ]);

      if (mounted) {
        setWebpSupported(webp);
        setAvifSupported(avif);
        setIsLoading(false);
      }
    };

    detectFormats();

    return () => {
      mounted = false;
    };
  }, []);

  return { webpSupported, avifSupported, isLoading };
};

/**
 * Hook to get optimal image source based on format support
 */
export const useOptimalImageSource = (
  basePath: string
): {
  src: string;
  isLoading: boolean;
} => {
  const [src, setSrc] = useState(basePath);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const getOptimalSrc = async () => {
      const optimalSrc = await getOptimalImageFormat(basePath);
      if (mounted) {
        setSrc(optimalSrc);
        setIsLoading(false);
      }
    };

    getOptimalSrc();

    return () => {
      mounted = false;
    };
  }, [basePath]);

  return { src, isLoading };
};

/**
 * Hook to preload page-specific critical images
 */
export const useCriticalImagePreload = (
  pageKey: keyof typeof CRITICAL_IMAGES
): {
  isPreloaded: boolean;
  progress: number;
  error: Error | null;
} => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const images = CRITICAL_IMAGES[pageKey];
    if (!images || images.length === 0) {
      setIsPreloaded(true);
      setProgress(100);
      return;
    }

    let loadedCount = 0;
    const totalCount = images.length;

    preloadCriticalImages(images)
      .then(() => {
        loadedCount = totalCount;
        setProgress(100);
        setIsPreloaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("Preload failed"));
      });

    // Update progress periodically
    const interval = setInterval(() => {
      if (loadedCount < totalCount) {
        setProgress((loadedCount / totalCount) * 100);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [pageKey]);

  return { isPreloaded, progress, error };
};

/**
 * Hook for lazy loading images with viewport detection
 */
export const useLazyImageLoad = (
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): {
  isVisible: boolean;
  hasLoaded: boolean;
} => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasLoaded(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "200px",
        threshold: 0.01,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return { isVisible, hasLoaded };
};

/**
 * Hook for carousel/slideshow image preloading
 */
export const useCarouselPreload = (
  images: string[],
  currentIndex: number,
  preloadCount: number = 2
): {
  preloadedIndices: Set<number>;
} => {
  const preloadedIndicesRef = useRef<Set<number>>(new Set());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const indicesToPreload: number[] = [];

    // Current image
    indicesToPreload.push(currentIndex);

    // Next images
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = (currentIndex + i) % images.length;
      if (!preloadedIndicesRef.current.has(nextIndex)) {
        indicesToPreload.push(nextIndex);
      }
    }

    // Previous images (for going back)
    for (let i = 1; i <= preloadCount; i++) {
      const prevIndex = (currentIndex - i + images.length) % images.length;
      if (!preloadedIndicesRef.current.has(prevIndex)) {
        indicesToPreload.push(prevIndex);
      }
    }

    const imagesToPreload = indicesToPreload
      .filter((idx) => !preloadedIndicesRef.current.has(idx))
      .map((idx) => images[idx]);

    if (imagesToPreload.length > 0) {
      preloadImages(imagesToPreload)
        .then(() => {
          indicesToPreload.forEach((idx) => {
            preloadedIndicesRef.current.add(idx);
          });
          forceUpdate({});
        })
        .catch(console.warn);
    }
  }, [images, currentIndex, preloadCount]);

  return { preloadedIndices: preloadedIndicesRef.current };
};

/**
 * Hook for responsive image source selection
 */
export const useResponsiveImage = (
  breakpoints: Record<number, string>,
  fallbackSrc: string
): {
  currentSrc: string;
  currentBreakpoint: number | null;
} => {
  const [currentSrc, setCurrentSrc] = useState(fallbackSrc);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      const width = window.innerWidth;
      const sortedBreakpoints = Object.keys(breakpoints)
        .map(Number)
        .sort((a, b) => b - a);

      for (const bp of sortedBreakpoints) {
        if (width >= bp) {
          setCurrentSrc(breakpoints[bp]);
          setCurrentBreakpoint(bp);
          return;
        }
      }

      setCurrentSrc(fallbackSrc);
      setCurrentBreakpoint(null);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoints, fallbackSrc]);

  return { currentSrc, currentBreakpoint };
};

/**
 * Hook for image loading state management
 */
export const useImageLoadingState = (
  src: string
): {
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  reload: () => void;
} => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setIsLoading(true);
    setIsLoaded(false);
    setIsError(false);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      setIsError(true);
      return;
    }

    const img = new Image();

    img.onload = () => {
      setIsLoading(false);
      setIsLoaded(true);
      setIsError(false);
    };

    img.onerror = () => {
      setIsLoading(false);
      setIsLoaded(false);
      setIsError(true);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, reloadKey]);

  return { isLoading, isLoaded, isError, reload };
};

/**
 * Hook for batch image preloading with progress tracking
 */
export const useBatchImagePreload = (
  sources: Array<string | PreloadConfig>,
  options?: {
    immediate?: boolean;
    onProgress?: (loaded: number, total: number) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
  }
): {
  isLoading: boolean;
  progress: number;
  loaded: number;
  total: number;
  start: () => Promise<void>;
  cancel: () => void;
} => {
  const { immediate = false, onProgress, onComplete, onError } = options || {};
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const cancelledRef = useRef(false);
  const total = sources.length;

  const start = useCallback(async () => {
    if (sources.length === 0) {
      onComplete?.();
      return;
    }

    setIsLoading(true);
    setLoaded(0);
    cancelledRef.current = false;

    const configs: PreloadConfig[] = sources.map((source) =>
      typeof source === "string" ? { src: source } : source
    );

    let loadedCount = 0;

    try {
      await Promise.all(
        configs.map(async (config) => {
          if (cancelledRef.current) return;

          const img = new Image();
          return new Promise<void>((resolve) => {
            img.onload = () => {
              if (!cancelledRef.current) {
                loadedCount++;
                setLoaded(loadedCount);
                onProgress?.(loadedCount, total);
              }
              resolve();
            };
            img.onerror = () => {
              // Continue even if one fails
              if (!cancelledRef.current) {
                loadedCount++;
                setLoaded(loadedCount);
                onProgress?.(loadedCount, total);
              }
              resolve();
            };
            img.src = config.src;
          });
        })
      );

      if (!cancelledRef.current) {
        setIsLoading(false);
        onComplete?.();
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error("Batch preload failed"));
      }
    }
  }, [sources, total, onProgress, onComplete, onError]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      start();
    }

    return () => {
      cancel();
    };
  }, [immediate, start, cancel]);

  return {
    isLoading,
    progress: total > 0 ? (loaded / total) * 100 : 0,
    loaded,
    total,
    start,
    cancel,
  };
};

export default useImageFormatSupport;
