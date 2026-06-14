/**
 * Image optimization components and utilities
 *
 * This module provides image optimization including:
 * - OptimizedImage: Lazy loading with IntersectionObserver, WebP detection, blur-up placeholders
 * - Picture: Art direction with multiple sources
 * - Utility functions for srcset, sizes, format detection, and placeholders
 *
 * @example
 * ```tsx
 * import { OptimizedImage } from "@/components/ui/image";
 *
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={630}
 *   priority // Above-fold critical image
 * />
 * ```
 */

// Main components
export {
  OptimizedImage,
  Picture,
  type OptimizedImageProps,
  type PictureProps,
} from "../optimized-image";

// Responsive helpers + utilities — single source of truth in image-utils.
// `generateResponsiveSrcSet` is also exported as `generateSrcSet` for
// backwards-compatible imports from this barrel.
export {
  supportsWebP,
  supportsAVIF,
  isWebPSupported,
  isAVIFSupported,
  generateResponsiveSrcSet,
  generateResponsiveSrcSet as generateSrcSet,
  generateSizes,
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
