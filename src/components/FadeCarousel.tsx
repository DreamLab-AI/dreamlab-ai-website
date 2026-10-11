import { useState } from "react";

interface FadeCarouselProps {
  images: string[];
  /** Index of the image currently shown; the parent owns the timer. */
  index: number;
  alt: string;
}

/**
 * Cross-fading image stack. Every image is absolutely stacked in one spot, so
 * `loading="lazy"` cannot help (they all count as on screen). Instead an
 * image is mounted only once it is the current or the next slide, and stays
 * mounted afterwards so the fade back to it is instant from cache.
 */
export const FadeCarousel = ({ images, index, alt }: FadeCarouselProps) => {
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1]));
  const next = (index + 1) % images.length;
  if (!mounted.has(index) || !mounted.has(next)) {
    setMounted(new Set([...mounted, index, next]));
  }
  return (
    <>
      {images.map((src, i) =>
        mounted.has(i) ? (
          <img
            key={src}
            src={src}
            alt={alt}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null,
      )}
    </>
  );
};

export default FadeCarousel;
