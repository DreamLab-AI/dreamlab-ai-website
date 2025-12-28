/**
 * Image optimization utilities for DreamLab AI website
 */

/**
 * Check if the browser supports WebP format
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    // Check via canvas (faster, synchronous fallback)
    const canvas = document.createElement("canvas");
    if (canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0) {
      resolve(true);
      return;
    }

    // Fallback to image loading test
    const webpData =
      "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA=";
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = webpData;
  });
};

/**
 * Check if the browser supports AVIF format
 */
export const supportsAVIF = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const avifData =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABtAQEAwgCgUBfWuYIxAQEAwgCgUBfWuYIw==";
    const img = new Image();
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = avifData;
  });
};

// Cache format support detection
let webpSupportedCache: boolean | null = null;
let avifSupportedCache: boolean | null = null;

/**
 * Get cached WebP support status
 */
export const isWebPSupported = async (): Promise<boolean> => {
  if (webpSupportedCache !== null) return webpSupportedCache;
  webpSupportedCache = await supportsWebP();
  return webpSupportedCache;
};

/**
 * Get cached AVIF support status
 */
export const isAVIFSupported = async (): Promise<boolean> => {
  if (avifSupportedCache !== null) return avifSupportedCache;
  avifSupportedCache = await supportsAVIF();
  return avifSupportedCache;
};

/**
 * Generate srcset from image path with multiple widths
 */
export const generateResponsiveSrcSet = (
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536, 1920],
  options?: {
    pathTransform?: (src: string, width: number) => string;
    quality?: number;
  }
): string => {
  const { pathTransform, quality } = options || {};

  if (pathTransform) {
    return widths
      .map((w) => `${pathTransform(src, w)} ${w}w`)
      .join(", ");
  }

  // Default: assume images follow naming convention {name}-{width}w.{ext}
  const lastDot = src.lastIndexOf(".");
  const basePath = src.substring(0, lastDot);
  const extension = src.substring(lastDot + 1);

  return widths
    .map((w) => {
      let path = `${basePath}-${w}w.${extension}`;
      if (quality) {
        path += `?q=${quality}`;
      }
      return `${path} ${w}w`;
    })
    .join(", ");
};

/**
 * Generate sizes attribute for responsive images
 */
export const generateSizes = (
  breakpoints: Record<string, string> = {
    "(max-width: 640px)": "100vw",
    "(max-width: 768px)": "90vw",
    "(max-width: 1024px)": "80vw",
    "(max-width: 1280px)": "70vw",
    default: "60vw",
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
 * Get optimal image format based on browser support
 */
export const getOptimalImageFormat = async (
  basePath: string,
  options?: {
    checkAvif?: boolean;
    checkWebp?: boolean;
  }
): Promise<string> => {
  const { checkAvif = true, checkWebp = true } = options || {};
  const lastDot = basePath.lastIndexOf(".");
  const pathWithoutExt = basePath.substring(0, lastDot);

  if (checkAvif) {
    const avifSupported = await isAVIFSupported();
    if (avifSupported) {
      return `${pathWithoutExt}.avif`;
    }
  }

  if (checkWebp) {
    const webpSupported = await isWebPSupported();
    if (webpSupported) {
      return `${pathWithoutExt}.webp`;
    }
  }

  return basePath;
};

/**
 * Calculate optimal image dimensions based on container and device pixel ratio
 */
export const getOptimalImageSize = (
  containerWidth: number,
  containerHeight?: number,
  options?: {
    maxDpr?: number;
    roundToNearest?: number;
  }
): { width: number; height?: number } => {
  const { maxDpr = 2, roundToNearest = 100 } = options || {};
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const optimalWidth =
    Math.ceil((containerWidth * dpr) / roundToNearest) * roundToNearest;

  if (containerHeight) {
    const optimalHeight =
      Math.ceil((containerHeight * dpr) / roundToNearest) * roundToNearest;
    return { width: optimalWidth, height: optimalHeight };
  }

  return { width: optimalWidth };
};

/**
 * Generate low-quality image placeholder (LQIP) URL
 */
export const getLQIPUrl = (
  src: string,
  options?: {
    width?: number;
    quality?: number;
    blur?: number;
  }
): string => {
  const { width = 20, quality = 20, blur = 10 } = options || {};
  const lastDot = src.lastIndexOf(".");
  const basePath = src.substring(0, lastDot);
  const extension = src.substring(lastDot + 1);

  return `${basePath}-lqip.${extension}?w=${width}&q=${quality}&blur=${blur}`;
};

/**
 * Generate inline SVG placeholder
 */
export const generateSVGPlaceholder = (
  width: number,
  height: number,
  color: string = "#1e293b"
): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect fill="${color}" width="${width}" height="${height}"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Generate gradient placeholder
 */
export const generateGradientPlaceholder = (
  width: number,
  height: number,
  colors: [string, string] = ["#1e293b", "#334155"]
): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]}"/>
          <stop offset="100%" style="stop-color:${colors[1]}"/>
        </linearGradient>
      </defs>
      <rect fill="url(#grad)" width="${width}" height="${height}"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Calculate aspect ratio from dimensions
 */
export const calculateAspectRatio = (
  width: number,
  height: number
): { ratio: number; paddingBottom: string } => {
  const ratio = width / height;
  const paddingBottom = `${(height / width) * 100}%`;
  return { ratio, paddingBottom };
};

/**
 * Parse image dimensions from URL or filename
 */
export const parseImageDimensions = (
  src: string
): { width?: number; height?: number } | null => {
  // Try to parse from filename pattern: image-{width}x{height}.ext
  const dimensionMatch = src.match(/[-_](\d+)x(\d+)\./i);
  if (dimensionMatch) {
    return {
      width: parseInt(dimensionMatch[1], 10),
      height: parseInt(dimensionMatch[2], 10),
    };
  }

  // Try to parse from URL params: ?w=100&h=100
  const urlMatch = src.match(/[?&]w=(\d+)(?:&h=(\d+))?/i);
  if (urlMatch) {
    return {
      width: parseInt(urlMatch[1], 10),
      height: urlMatch[2] ? parseInt(urlMatch[2], 10) : undefined,
    };
  }

  return null;
};

/**
 * Debounce function for resize handlers
 */
export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function for scroll handlers
 */
export const throttle = <T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Calculate dominant color from image (simplified)
 * For production, consider using a library like node-vibrant or color-thief
 */
export const getDominantColor = async (
  imageSrc: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("#1e293b");
        return;
      }

      // Sample at small size for performance
      const sampleSize = 10;
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      let r = 0, g = 0, b = 0;
      const pixelCount = sampleSize * sampleSize;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);

      resolve(`rgb(${r}, ${g}, ${b})`);
    };

    img.onerror = () => {
      resolve("#1e293b");
    };

    img.src = imageSrc;
  });
};

/**
 * Critical images for the DreamLab AI website
 * These should be preloaded on page load
 */
export const CRITICAL_IMAGES = {
  home: [
    "/showcase/image (9).png",
    "/showcase/image (6).png",
  ],
  systemDesign: [
    "/showcase/image (9).png",
    "/showcase/image (6).png",
    "/showcase/image (1).png",
    "/showcase/image (2).png",
  ],
  residentialTraining: [
    "/data/media/aerial.jpeg",
    "/data/media/fairfield-front.jpg",
  ],
  research: [
    "/showcase/image (9).png",
    "/showcase/image (6).png",
    "/showcase/image (1).png",
  ],
};

/**
 * Default image optimization settings
 */
export const IMAGE_DEFAULTS = {
  rootMargin: "200px",
  threshold: 0.01,
  blurAmount: 20,
  transitionDuration: 500,
  placeholderColor: "#1e293b",
  formats: ["avif", "webp", "jpg"] as const,
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },
  defaultSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw",
};
