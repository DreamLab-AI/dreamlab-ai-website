import { useEffect, useState } from "react";
import { TesseractProjection } from "./TesseractProjection";

/**
 * HyperdimensionalHeroBackground - Authentic 4D Mathematical Visualization
 *
 * DESIGN PHILOSOPHY (from DeepSeek reasoning):
 * - STRUCTURE over BLUR: Sharp geometric wireframes signal "mathematics"
 * - Not gradients: Real 4D projection math creates the visual
 * - Tesseract: 4D hypercube with mathematically correct W-rotation
 * - Premium intellectual feel for £2999 course
 *
 * MATHEMATICAL IMPLEMENTATION:
 * - 16 vertices of tesseract at (±1, ±1, ±1, ±1)
 * - 32 edges connecting vertices differing in one coordinate
 * - 4D→3D projection: scale = hyperplane / (hyperplane + w)
 * - W-axis rotations (XW, YW, ZW) create "impossible" transformations
 *
 * DIFFERENTIATION FROM GENERIC AI OUTPUT:
 * - NO purple gradient blurs
 * - NO ambient glow circles
 * - YES wireframe precision
 * - YES mathematically-correct vertex movement
 */

export const HyperdimensionalHeroBackground = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ perspective: "1500px" }}
    >
      {/* Primary: Authentic tesseract 4D projection */}
      <TesseractProjection />

      {/* Minimal mathematical grid - geometric precision, not blur */}
      <div
        className={`absolute inset-0 ${
          prefersReducedMotion ? "opacity-[0.015]" : "opacity-[0.02]"
        }`}
        style={{
          backgroundImage: `
            linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Secondary grid layer - isometric for depth */}
      <div
        className={`absolute inset-0 ${
          prefersReducedMotion ? "opacity-[0.01]" : "opacity-[0.015]"
        }`}
        style={{
          backgroundImage: `
            linear-gradient(30deg, rgba(96, 165, 250, 0.02) 1px, transparent 1px),
            linear-gradient(150deg, rgba(96, 165, 250, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 104px",
        }}
      />

      {/* Subtle radial vignette for content focus - NOT a gradient glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Top fade for navbar integration */}
      <div
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)",
        }}
      />
    </div>
  );
};

export default HyperdimensionalHeroBackground;
