import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Progressive loading stages
 */
type LoadingStage = "idle" | "thumbnail" | "low" | "medium" | "high" | "complete" | "error";

/**
 * Image quality level configuration
 */
export interface QualityLevel {
  /** Source URL for this quality level */
  src: string;
  /** Quality identifier */
  quality: "thumbnail" | "low" | "medium" | "high";
  /** Optional blur amount for this level */
  blur?: number;
}

/**
 * Props for ProgressiveImage component
 */
export interface ProgressiveImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /** Final high-quality source */
  src: string;
  /** Alternative text */
  alt: string;
  /** Thumbnail/LQIP source (optional) */
  thumbnailSrc?: string;
  /** Low quality source (optional) */
  lowQualitySrc?: string;
  /** Medium quality source (optional) */
  mediumQualitySrc?: string;
  /** Array of quality levels for custom progression */
  qualityLevels?: QualityLevel[];
  /** Width for aspect ratio */
  width?: number;
  /** Height for aspect ratio */
  height?: number;
  /** Enable lazy loading */
  lazy?: boolean;
  /** Root margin for lazy loading */
  rootMargin?: string;
  /** Blur amount for initial stages */
  initialBlur?: number;
  /** Transition duration in ms */
  transitionDuration?: number;
  /** Object fit */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** Object position */
  objectPosition?: string;
  /** Callback when fully loaded */
  onFullyLoaded?: () => void;
  /** Callback on error */
  onError?: () => void;
  /** Show loading indicator */
  showLoadingIndicator?: boolean;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Wrapper className */
  wrapperClassName?: string;
  /** Priority loading */
  priority?: boolean;
  /** Background color while loading */
  backgroundColor?: string;
  /** Enable Ken Burns effect during loading */
  enableKenBurns?: boolean;
  /** Disable progressive loading (load final immediately) */
  disableProgressive?: boolean;
}

/**
 * Generates inline SVG blur placeholder
 */
const generatePlaceholderSvg = (
  width: number,
  height: number,
  color: string = "#1e293b"
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect fill="${color}" width="${width}" height="${height}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Creates a tiny (~40 byte) transparent placeholder
 */
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * ProgressiveImage component for multi-stage progressive loading
 */
export const ProgressiveImage = memo(
  forwardRef<HTMLImageElement, ProgressiveImageProps>(
    (
      {
        src,
        alt,
        thumbnailSrc,
        lowQualitySrc,
        mediumQualitySrc,
        qualityLevels,
        width,
        height,
        lazy = true,
        rootMargin = "200px",
        initialBlur = 20,
        transitionDuration = 400,
        objectFit = "cover",
        objectPosition = "center",
        onFullyLoaded,
        onError,
        showLoadingIndicator = false,
        loadingIndicator,
        wrapperClassName,
        className,
        priority = false,
        backgroundColor,
        enableKenBurns = false,
        disableProgressive = false,
        style,
        ...props
      },
      ref
    ) => {
      const [stage, setStage] = useState<LoadingStage>(priority ? "thumbnail" : "idle");
      const [currentSrc, setCurrentSrc] = useState<string>(
        thumbnailSrc ||
          (width && height ? generatePlaceholderSvg(width, height, backgroundColor) : TRANSPARENT_PIXEL)
      );
      const [currentBlur, setCurrentBlur] = useState(initialBlur);
      const [isInView, setIsInView] = useState(priority);
      const containerRef = useRef<HTMLDivElement>(null);
      const loadedStagesRef = useRef<Set<string>>(new Set());

      // Build quality progression
      const getQualityProgression = useCallback((): QualityLevel[] => {
        if (qualityLevels && qualityLevels.length > 0) {
          return qualityLevels;
        }

        const levels: QualityLevel[] = [];

        if (thumbnailSrc) {
          levels.push({ src: thumbnailSrc, quality: "thumbnail", blur: initialBlur });
        }
        if (lowQualitySrc) {
          levels.push({ src: lowQualitySrc, quality: "low", blur: 10 });
        }
        if (mediumQualitySrc) {
          levels.push({ src: mediumQualitySrc, quality: "medium", blur: 5 });
        }
        levels.push({ src, quality: "high", blur: 0 });

        return levels;
      }, [qualityLevels, thumbnailSrc, lowQualitySrc, mediumQualitySrc, src, initialBlur]);

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
          { rootMargin, threshold: 0.01 }
        );

        observer.observe(container);

        return () => {
          observer.disconnect();
        };
      }, [lazy, priority, rootMargin, isInView]);

      // Progressive loading logic
      useEffect(() => {
        if (!isInView) return;

        if (disableProgressive) {
          // Skip to final image directly
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setCurrentSrc(src);
            setCurrentBlur(0);
            setStage("complete");
            onFullyLoaded?.();
          };
          img.onerror = () => {
            setStage("error");
            onError?.();
          };
          return;
        }

        const progression = getQualityProgression();
        let currentIndex = 0;
        let isCancelled = false;

        const loadNextLevel = () => {
          if (isCancelled || currentIndex >= progression.length) return;

          const level = progression[currentIndex];
          const img = new Image();

          img.onload = () => {
            if (isCancelled) return;

            loadedStagesRef.current.add(level.quality);
            setCurrentSrc(level.src);
            setCurrentBlur(level.blur ?? 0);

            // Map quality to stage
            const stageMap: Record<string, LoadingStage> = {
              thumbnail: "thumbnail",
              low: "low",
              medium: "medium",
              high: "complete",
            };
            setStage(stageMap[level.quality] || "complete");

            currentIndex++;

            if (level.quality === "high") {
              onFullyLoaded?.();
            } else {
              // Load next level after a brief delay
              setTimeout(loadNextLevel, 50);
            }
          };

          img.onerror = () => {
            if (isCancelled) return;

            // Skip failed level and try next
            currentIndex++;
            if (currentIndex < progression.length) {
              loadNextLevel();
            } else {
              setStage("error");
              onError?.();
            }
          };

          img.src = level.src;
        };

        loadNextLevel();

        return () => {
          isCancelled = true;
        };
      }, [
        isInView,
        src,
        disableProgressive,
        getQualityProgression,
        onFullyLoaded,
        onError,
      ]);

      // Calculate aspect ratio
      const aspectRatio = width && height ? { aspectRatio: `${width} / ${height}` } : {};

      const isLoading = stage !== "complete" && stage !== "error";
      const isComplete = stage === "complete";
      const isError = stage === "error";

      return (
        <div
          ref={containerRef}
          className={cn(
            "relative overflow-hidden",
            enableKenBurns && isLoading && "animate-ken-burns",
            wrapperClassName
          )}
          style={{
            ...aspectRatio,
            backgroundColor: backgroundColor || "var(--muted)",
          }}
        >
          {/* Main image with progressive blur */}
          <img
            ref={ref}
            src={currentSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "w-full h-full transition-all",
              isComplete && "scale-100",
              className
            )}
            style={{
              objectFit,
              objectPosition,
              filter: currentBlur > 0 ? `blur(${currentBlur}px)` : "none",
              transform: currentBlur > 0 ? "scale(1.05)" : "scale(1)",
              transitionDuration: `${transitionDuration}ms`,
              transitionProperty: "filter, transform, opacity",
              ...style,
            }}
            {...props}
          />

          {/* Loading indicator */}
          {showLoadingIndicator && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {loadingIndicator || (
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-primary/20 rounded-full" />
                  <div
                    className="absolute inset-0 w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading progress bar */}
          {isLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-primary/60 transition-all duration-300"
                style={{
                  width:
                    stage === "thumbnail"
                      ? "25%"
                      : stage === "low"
                        ? "50%"
                        : stage === "medium"
                          ? "75%"
                          : "100%",
                }}
              />
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2"
              role="img"
              aria-label={alt}
            >
              <svg
                className="w-10 h-10 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-xs">Failed to load image</span>
            </div>
          )}
        </div>
      );
    }
  )
);

ProgressiveImage.displayName = "ProgressiveImage";

/**
 * Hook for generating progressive image sources
 */
export const useProgressiveImageSources = (
  basePath: string,
  options?: {
    thumbnailSuffix?: string;
    lowSuffix?: string;
    mediumSuffix?: string;
    extension?: string;
  }
): {
  thumbnailSrc: string;
  lowQualitySrc: string;
  mediumQualitySrc: string;
  highQualitySrc: string;
} => {
  const {
    thumbnailSuffix = "-thumb",
    lowSuffix = "-low",
    mediumSuffix = "-medium",
    extension,
  } = options || {};

  const parts = basePath.split(".");
  const ext = extension || parts.pop() || "jpg";
  const base = parts.join(".");

  return {
    thumbnailSrc: `${base}${thumbnailSuffix}.${ext}`,
    lowQualitySrc: `${base}${lowSuffix}.${ext}`,
    mediumQualitySrc: `${base}${mediumSuffix}.${ext}`,
    highQualitySrc: basePath,
  };
};

/**
 * BlurHash placeholder component
 */
export interface BlurHashPlaceholderProps {
  /** BlurHash string */
  hash: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Punch factor for saturation */
  punch?: number;
  /** Additional className */
  className?: string;
}

/**
 * Decode BlurHash to canvas (simplified version)
 * For production, consider using the blurhash library
 */
export const BlurHashPlaceholder: React.FC<BlurHashPlaceholderProps> = memo(
  ({ hash, width, height, punch = 1, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // For production, decode the actual blurhash here
      // This is a simplified placeholder that creates a gradient
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Create a simple gradient as fallback
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#1e293b");
      gradient.addColorStop(1, "#334155");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }, [hash, width, height, punch]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn("w-full h-full", className)}
        style={{ imageRendering: "pixelated" }}
      />
    );
  }
);

BlurHashPlaceholder.displayName = "BlurHashPlaceholder";

export default ProgressiveImage;
