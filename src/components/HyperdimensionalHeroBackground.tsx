import { useEffect, useState } from "react";
import { VoronoiGoldenHero } from "./VoronoiGoldenHero";

/**
 * HyperdimensionalHeroBackground - Mathematical Elegance in Bronze and Gold
 *
 * DESIGN PHILOSOPHY (from swarm research synthesis):
 * - Voronoi tessellation with golden ratio (φ) seed placement
 * - Based on Vogel's model: θ = n × 137.508° (golden angle)
 * - Signals "we understand advanced mathematics" without being showy
 * - "Premium intellectual warmth" - signals expertise and precision
 *
 * MATHEMATICAL FOUNDATION:
 * - Golden angle: 137.508° = 360° × (1 - 1/φ) where φ = (1 + √5) / 2
 * - Fermat's spiral: r = c × √n for uniform density
 * - Voronoi: Each cell contains all points closest to its seed
 * - Delaunay triangulation dual for edge rendering
 * - Perlin noise for organic, non-random animation
 *
 * COLOR PALETTE (research-validated):
 * - Background: #0e0e11 (deep anthracite, not pure black)
 * - Bronze: #CD7F32 (outer cells)
 * - Gold: #D4A574 (middle cells)
 * - Bright Gold: #FFD700 (inner cells, accents)
 *
 * DIFFERENTIATION FROM GENERIC AI OUTPUT:
 * - NO purple gradient blurs
 * - NO sci-fi particle effects
 * - YES mathematical precision (Fibonacci, golden ratio)
 * - YES slow, deliberate motion (suggests quality and weight)
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
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ perspective: "1500px" }}
    >
      {/* Primary: Voronoi tessellation with golden ratio seed placement */}
      {/* Scaled 150% and centered to extend beyond text boundaries */}
      {/* pointer-events-auto to enable mouse interaction for gravitational effect */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: '-25%',
          left: '-25%',
          width: '150%',
          height: '150%',
        }}
      >
        <VoronoiGoldenHero seedCount={104} goldMode={true} className="w-full h-full" />
      </div>

      {/* Minimal mathematical grid - geometric precision, not blur */}
      <div
        className={`absolute inset-0 pointer-events-none ${
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
        className={`absolute inset-0 pointer-events-none ${
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
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Top fade for navbar integration */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 100%)",
        }}
      />
    </div>
  );
};

export default HyperdimensionalHeroBackground;
