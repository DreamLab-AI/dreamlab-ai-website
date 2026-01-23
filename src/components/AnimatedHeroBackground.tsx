import { useEffect, useState } from "react";

/**
 * AnimatedHeroBackground - A subtle, performant CSS-based animated background
 * Consistent with the residential training page design patterns.
 * Uses gradient overlays and floating orbs instead of heavy 3D graphics.
 * Respects prefers-reduced-motion for accessibility.
 */
export const AnimatedHeroBackground = () => {
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
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient - matches residential training page */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-purple-950/20" />

      {/* Subtle animated gradient mesh */}
      <div
        className={`absolute inset-0 ${
          prefersReducedMotion ? "opacity-40" : "opacity-50 animate-drift"
        }`}
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 30%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating orbs - subtle depth effect */}
      <div
        className={`absolute top-1/4 left-1/5 w-72 h-72 rounded-full ${
          prefersReducedMotion ? "opacity-15" : "opacity-20 animate-float-subtle"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className={`absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full ${
          prefersReducedMotion ? "opacity-10" : "opacity-15 animate-float-subtle"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(35px)",
          animationDelay: "2s",
        }}
      />
      <div
        className={`absolute top-1/2 left-1/2 w-48 h-48 rounded-full ${
          prefersReducedMotion ? "opacity-8" : "opacity-12 animate-float-subtle"
        }`}
        style={{
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)",
          filter: "blur(30px)",
          animationDelay: "4s",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Subtle grid pattern - tech aesthetic */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Connection nodes - AI agent network visualization */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-blue-400/30 animate-pulse-glow"
              style={{
                left: `${20 + (i * 12)}%`,
                top: `${30 + ((i * 8) % 40)}%`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Vignette effect for focus on content */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </div>
  );
};
