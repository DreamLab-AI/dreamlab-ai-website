/**
 * Image optimization components and utilities
 *
 * This module provides a comprehensive image optimization strategy including:
 * - OptimizedImage: Lazy loading with IntersectionObserver, WebP detection, blur-up placeholders
 * - ProgressiveImage: Multi-stage progressive loading with quality levels
 * - ImagePreloader: Critical image preloading utilities
 * - Picture: Art direction with multiple sources
 *
 * @example
 * ```tsx
 * // Basic optimized image
 * import { OptimizedImage } from "@/components/ui/image";
 *
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={630}
 *   priority // Above-fold critical image
 * />
 *
 * // Progressive loading with blur-up
 * import { ProgressiveImage } from "@/components/ui/image";
 *
 * <ProgressiveImage
 *   src="/images/large-image.jpg"
 *   thumbnailSrc="/images/large-image-thumb.jpg"
 *   alt="Large feature image"
 *   width={1920}
 *   height={1080}
 * />
 *
 * // Preload critical images
 * import { useImagePreload, preloadCriticalImages } from "@/components/ui/image";
 *
 * // In a component
 * useImagePreload(["/hero.jpg", "/feature.jpg"], { immediate: true });
 *
 * // Or globally
 * preloadCriticalImages(["/hero.jpg", "/feature.jpg"]);
 * ```
 */

// Main components
export {
  OptimizedImage,
  Picture,
  generateSrcSet,
  generateSizes,
  type OptimizedImageProps,
  type PictureProps,
} from "../optimized-image";

export {
  ProgressiveImage,
  BlurHashPlaceholder,
  useProgressiveImageSources,
  type ProgressiveImageProps,
  type QualityLevel,
  type BlurHashPlaceholderProps,
} from "../progressive-image";

export {
  preloadManager,
  preloadImage,
  preloadImages,
  preloadCriticalImages,
  useImagePreload,
  useViewportPreload,
  ImagePreloader,
  type PreloadPriority,
  type PreloadConfig,
} from "../image-preloader";

// Re-export utilities
export {
  supportsWebP,
  supportsAVIF,
  isWebPSupported,
  isAVIFSupported,
  generateResponsiveSrcSet,
  generateSizes as generateImageSizes,
  getOptimalImageFormat,
  getOptimalImageSize,
  getLQIPUrl,
  generateSVGPlaceholder,
  generateGradientPlaceholder,
  calculateAspectRatio,
  parseImageDimensions,
  getDominantColor,
  CRITICAL_IMAGES,
  IMAGE_DEFAULTS,
} from "@/lib/image-utils";
