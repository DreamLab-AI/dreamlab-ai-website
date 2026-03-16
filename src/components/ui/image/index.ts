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
  generateSrcSet,
  generateSizes,
  type OptimizedImageProps,
  type PictureProps,
} from "../optimized-image";

// Re-export utilities from image-utils
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
