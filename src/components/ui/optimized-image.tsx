import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  forwardRef,
  type ImgHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Image loading states for progressive loading
 */
type ImageLoadingState = "idle" | "loading" | "loaded" | "error";

/**
 * Props for the OptimizedImage component
 */
export interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  /** Primary image source */
  src: string;
  /** Alternative text for accessibility */
  alt: string;
  /** Optional low-quality placeholder image for blur-up effect */
  placeholderSrc?: string;
  /** Optional WebP source for modern browsers */
  webpSrc?: string;
  /** Responsive srcset for different viewport sizes */
  srcSet?: string;
  /** Responsive sizes attribute */
  sizes?: string;
  /** Width for aspect ratio calculation */
  width?: number;
  /** Height for aspect ratio calculation */
  height?: number;
  /** Enable lazy loading with IntersectionObserver */
  lazy?: boolean;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  /** Threshold for IntersectionObserver */
  threshold?: number;
  /** Enable blur-up placeholder effect */
  enableBlurUp?: boolean;
  /** Blur amount in pixels for placeholder */
  blurAmount?: number;
  /** Show loading skeleton */
  showSkeleton?: boolean;
  /** Custom skeleton className */
  skeletonClassName?: string;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Priority loading (disables lazy loading) */
  priority?: boolean;
  /** Object-fit style */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** Object-position style */
  objectPosition?: string;
  /** Fallback image on error */
  fallbackSrc?: string;
  /** Additional wrapper className */
  wrapperClassName?: string;
  /** Disable transition effects */
  disableTransition?: boolean;
  /** Custom transition duration in ms */
  transitionDuration?: number;
  /** Fetch priority hint */
  fetchPriority?: "high" | "low" | "auto";
  /** Decode hint */
  decoding?: "async" | "sync" | "auto";
}

/**
 * Detects WebP support in the browser
 */
const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const webpData =
      "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=";
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = webpData;
  });
};

let webpSupported: boolean | null = null;

/**
 * Generates blur data URL for placeholder
 */
const generateBlurDataUrl = (width: number, height: number): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect fill="#1e293b" width="${width}" height="${height}"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
};

/**
 * Generates responsive srcset from base URL
 */
export const generateSrcSet = (
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): string => {
  const extension = src.split(".").pop()?.toLowerCase();
  const basePath = src.substring(0, src.lastIndexOf("."));

  return widths
    .map((w) => `${basePath}-${w}w.${extension} ${w}w`)
    .join(", ");
};

/**
 * Generates sizes attribute for responsive images
 */
export const generateSizes = (
  breakpoints: Record<string, string> = {
    "(max-width: 640px)": "100vw",
    "(max-width: 768px)": "90vw",
    "(max-width: 1024px)": "80vw",
    default: "70vw",
  }
): string => {
  const entries = Object.entries(breakpoints);
  const defaultSize = breakpoints.default || "100vw";
  const mediaQueries = entries
    .filter(([key]) => key !== "default")
    .map(([query, size]) => `${query} ${size}`)
    .join(", ");

  return mediaQueries ? `${mediaQueries}, ${defaultSize}` : defaultSize;
};

/**
 * OptimizedImage component with lazy loading, WebP detection, and progressive loading
 */
export const OptimizedImage = memo(
  forwardRef<HTMLImageElement, OptimizedImageProps>(
    (
      {
        src,
        alt,
        placeholderSrc,
        webpSrc,
        srcSet,
        sizes,
        width,
        height,
        lazy = true,
        rootMargin = "200px",
        threshold = 0.01,
        enableBlurUp = true,
        blurAmount = 20,
        showSkeleton = true,
        skeletonClassName,
        onLoad,
        onError,
        priority = false,
        objectFit = "cover",
        objectPosition = "center",
        fallbackSrc,
        wrapperClassName,
        disableTransition = false,
        transitionDuration = 500,
        fetchPriority = "auto",
        decoding = "async",
        className,
        style,
        ...props
      },
      ref
    ) => {
      const [loadingState, setLoadingState] = useState<ImageLoadingState>(
        priority ? "loading" : "idle"
      );
      const [currentSrc, setCurrentSrc] = useState<string>("");
      const [isInView, setIsInView] = useState(priority);
      const [hasWebP, setHasWebP] = useState<boolean | null>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const imageRef = useRef<HTMLImageElement>(null);

      // Merge refs
      const mergedRef = useCallback(
        (node: HTMLImageElement | null) => {
          imageRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        },
        [ref]
      );

      // Check WebP support on mount
      useEffect(() => {
        if (webpSupported !== null) {
          setHasWebP(webpSupported);
          return;
        }

        supportsWebP().then((supported) => {
          webpSupported = supported;
          setHasWebP(supported);
        });
      }, []);

      // IntersectionObserver for lazy loading
      useEffect(() => {
        if (priority || !lazy || isInView) return;

        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setIsInView(true);
                observer.unobserve(entry.target);
              }
            });
          },
          {
            rootMargin,
            threshold,
          }
        );

        observer.observe(container);

        return () => {
          observer.disconnect();
        };
      }, [lazy, priority, rootMargin, threshold, isInView]);

      // Determine the appropriate source to use
      useEffect(() => {
        if (!isInView || hasWebP === null) return;

        // Use WebP if supported and available
        if (hasWebP && webpSrc) {
          setCurrentSrc(webpSrc);
        } else {
          setCurrentSrc(src);
        }

        setLoadingState("loading");
      }, [isInView, hasWebP, webpSrc, src]);

      // Preload the image
      useEffect(() => {
        if (!currentSrc || loadingState !== "loading") return;

        const img = new Image();

        if (srcSet) {
          img.srcset = srcSet;
        }

        img.src = currentSrc;
        img.decoding = decoding;

        img.onload = () => {
          setLoadingState("loaded");
          onLoad?.();
        };

        img.onerror = () => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
          } else {
            setLoadingState("error");
            onError?.();
          }
        };

        return () => {
          img.onload = null;
          img.onerror = null;
        };
      }, [currentSrc, srcSet, decoding, fallbackSrc, loadingState, onLoad, onError]);

      // Calculate aspect ratio styles
      const aspectRatio =
        width && height ? { aspectRatio: `${width} / ${height}` } : {};

      // Generate placeholder
      const placeholder =
        placeholderSrc ||
        (width && height ? generateBlurDataUrl(width, height) : undefined);

      const isLoaded = loadingState === "loaded";
      const isLoading = loadingState === "loading" || loadingState === "idle";
      const isError = loadingState === "error";

      return (
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-hidden",
            wrapperClassName
          )}
          style={{
            ...aspectRatio,
          }}
        >
          {/* Skeleton loader */}
          {showSkeleton && isLoading && (
            <div
              className={cn(
                "absolute inset-0 animate-pulse bg-muted rounded-inherit",
                skeletonClassName
              )}
              aria-hidden="true"
            />
          )}

          {/* Blur-up placeholder */}
          {enableBlurUp && placeholder && !isLoaded && !isError && (
            <img
              src={placeholder}
              alt=""
              aria-hidden="true"
              className={cn(
                "absolute inset-0 w-full h-full",
                !disableTransition && "transition-opacity",
                isLoaded ? "opacity-0" : "opacity-100"
              )}
              style={{
                objectFit,
                objectPosition,
                filter: `blur(${blurAmount}px)`,
                transform: "scale(1.1)",
                transitionDuration: `${transitionDuration}ms`,
              }}
            />
          )}

          {/* Main image */}
          {currentSrc && (
            <img
              ref={mergedRef}
              src={currentSrc}
              srcSet={srcSet}
              sizes={sizes}
              alt={alt}
              width={width}
              height={height}
              loading={priority ? "eager" : "lazy"}
              decoding={decoding}
              fetchPriority={priority ? "high" : fetchPriority}
              className={cn(
                "w-full h-full",
                !disableTransition && "transition-opacity",
                isLoaded ? "opacity-100" : "opacity-0",
                className
              )}
              style={{
                objectFit,
                objectPosition,
                transitionDuration: `${transitionDuration}ms`,
                ...style,
              }}
              {...props}
            />
          )}

          {/* Error fallback */}
          {isError && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
              role="img"
              aria-label={alt}
            >
              <svg
                className="w-12 h-12 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>
      );
    }
  )
);

OptimizedImage.displayName = "OptimizedImage";

/**
 * Props for the Picture component with multiple sources
 */
export interface PictureProps extends Omit<OptimizedImageProps, "webpSrc"> {
  /** Array of source objects for different formats/sizes */
  sources?: Array<{
    srcSet: string;
    type?: string;
    media?: string;
    sizes?: string;
  }>;
}

/**
 * Picture component for art direction and multiple formats
 */
export const Picture = memo(
  forwardRef<HTMLImageElement, PictureProps>(
    ({ sources = [], src, alt, className, wrapperClassName, ...props }, ref) => {
      const [loadingState, setLoadingState] = useState<ImageLoadingState>("idle");
      const [isInView, setIsInView] = useState(props.priority ?? false);
      const containerRef = useRef<HTMLDivElement>(null);

      // IntersectionObserver for lazy loading
      useEffect(() => {
        if (props.priority || !props.lazy || isInView) return;

        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setIsInView(true);
                observer.unobserve(entry.target);
              }
            });
          },
          {
            rootMargin: props.rootMargin || "200px",
            threshold: props.threshold || 0.01,
          }
        );

        observer.observe(container);

        return () => {
          observer.disconnect();
        };
      }, [props.lazy, props.priority, props.rootMargin, props.threshold, isInView]);

      const handleLoad = useCallback(() => {
        setLoadingState("loaded");
        props.onLoad?.();
      }, [props.onLoad]);

      const handleError = useCallback(() => {
        setLoadingState("error");
        props.onError?.();
      }, [props.onError]);

      const isLoaded = loadingState === "loaded";

      return (
        <div
          ref={containerRef}
          className={cn("relative overflow-hidden", wrapperClassName)}
        >
          {props.showSkeleton !== false && loadingState !== "loaded" && (
            <div
              className={cn(
                "absolute inset-0 animate-pulse bg-muted",
                props.skeletonClassName
              )}
              aria-hidden="true"
            />
          )}

          {isInView && (
            <picture>
              {sources.map((source, index) => (
                <source
                  key={index}
                  srcSet={source.srcSet}
                  type={source.type}
                  media={source.media}
                  sizes={source.sizes}
                />
              ))}
              <img
                ref={ref}
                src={src}
                alt={alt}
                loading={props.priority ? "eager" : "lazy"}
                decoding={props.decoding || "async"}
                onLoad={handleLoad}
                onError={handleError}
                className={cn(
                  "w-full h-full transition-opacity",
                  isLoaded ? "opacity-100" : "opacity-0",
                  className
                )}
                style={{
                  objectFit: props.objectFit || "cover",
                  objectPosition: props.objectPosition || "center",
                  transitionDuration: `${props.transitionDuration || 500}ms`,
                  ...props.style,
                }}
              />
            </picture>
          )}
        </div>
      );
    }
  )
);

Picture.displayName = "Picture";

export default OptimizedImage;
