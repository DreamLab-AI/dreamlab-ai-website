import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/**
 * VoronoiGoldenHero - Mathematical Elegance in Bronze and Gold
 *
 * DESIGN PHILOSOPHY:
 * - Voronoi tessellation with golden ratio (φ) seed placement
 * - Based on Vogel's model: θ = n × 137.508° (golden angle)
 * - Signals "we understand advanced mathematics" without being showy
 * - "Premium intellectual warmth" - not sci-fi, not generic AI gradients
 * - Slow, deliberate motion suggests quality and weight
 *
 * MATHEMATICAL FOUNDATION:
 * - Golden angle: 137.508° = 360° × (1 - 1/φ) where φ = (1 + √5) / 2
 * - Fermat's spiral: r = c × √n for uniform density
 * - Voronoi: Each cell contains all points closest to its seed
 * - Perlin noise for organic, non-random animation
 *
 * COLOR PALETTE:
 * - Background: #0e0e11 (deep anthracite, not pure black)
 * - Bronze: #CD7F32 (far cells)
 * - Gold: #D4A574 (mid cells)
 * - Bright Gold: #FFD700 (near cells, accents)
 *
 * PERFORMANCE:
 * - Pre-computed Delaunay triangulation for Voronoi
 * - Batch rendering with single stroke calls
 * - 60fps target with requestAnimationFrame
 */

// Simplex noise implementation (2D) for organic animation
// Adapted from Stefan Gustavson's implementation
class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed = 12345) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];

    // Initialize permutation array with seed
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    // Seeded shuffle
    let n = seed;
    for (let i = 255; i > 0; i--) {
      n = (n * 16807) % 2147483647;
      const j = n % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.perm = [...p, ...p]; // Duplicate for overflow
  }

  private dot2(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2(this.grad3[gi2], x2, y2);
    }

    return 70 * (n0 + n1 + n2); // Scale to [-1, 1]
  }
}

// Voronoi seed point with animation state
interface VoronoiSeed {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  phase: number; // Animation phase offset
  colorIndex: number; // 0=bronze, 1=gold, 2=bright gold
}

// Delaunay triangulation edge
interface DelaunayEdge {
  from: number;
  to: number;
}

// Light mote traveling along edges
interface LightMote {
  edgeIndex: number;     // Which edge it's traveling on
  progress: number;      // 0-1 position along edge
  speed: number;         // Travel speed (varies per mote)
  size: number;          // Mote size
  brightness: number;    // 0-1 brightness multiplier
  pulsePhase: number;    // For pulsing animation
}

// Golden angle in radians: 137.508° = 2π × (2 - φ)
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.39996 radians

// Generate seeds using Vogel's model (golden angle spiral)
const generateGoldenSeeds = (
  count: number,
  centerX: number,
  centerY: number,
  radius: number
): VoronoiSeed[] => {
  const seeds: VoronoiSeed[] = [];
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio

  for (let n = 0; n < count; n++) {
    // Fermat's spiral with golden angle
    const angle = n * GOLDEN_ANGLE;
    const r = radius * Math.sqrt(n / count); // Uniform density distribution

    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);

    // Color based on radial distance (inner = bright, outer = bronze)
    const normalizedR = r / radius;
    let colorIndex: number;
    if (normalizedR < 0.33) {
      colorIndex = 2; // Bright gold (inner)
    } else if (normalizedR < 0.66) {
      colorIndex = 1; // Gold (middle)
    } else {
      colorIndex = 0; // Bronze (outer)
    }

    seeds.push({
      baseX: x,
      baseY: y,
      x,
      y,
      phase: (n / count) * Math.PI * 2, // Staggered animation phases
      colorIndex,
    });
  }

  return seeds;
};

// Bowyer-Watson algorithm for Delaunay triangulation
// Returns edges for Voronoi dual
const computeDelaunayEdges = (seeds: VoronoiSeed[], width: number, height: number): DelaunayEdge[] => {
  if (seeds.length < 3) return [];

  // Super-triangle that contains all points
  const margin = Math.max(width, height) * 2;
  const superTriangle = [
    { x: width / 2, y: -margin },
    { x: -margin, y: height + margin },
    { x: width + margin, y: height + margin },
  ];

  // All points including super-triangle vertices
  const points = [...seeds.map(s => ({ x: s.x, y: s.y })), ...superTriangle];
  const n = seeds.length;

  // Triangles stored as [i, j, k] vertex indices
  type Triangle = [number, number, number];
  let triangles: Triangle[] = [[n, n + 1, n + 2]]; // Start with super-triangle

  // Circumcircle test
  const inCircumcircle = (
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number
  ): boolean => {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-10) return false;

    const ax2 = ax * ax + ay * ay;
    const bx2 = bx * bx + by * by;
    const cx2 = cx * cx + cy * cy;

    const ux = (ax2 * (by - cy) + bx2 * (cy - ay) + cx2 * (ay - by)) / d;
    const uy = (ax2 * (cx - bx) + bx2 * (ax - cx) + cx2 * (bx - ax)) / d;

    const rSq = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
    const distSq = (px - ux) * (px - ux) + (py - uy) * (py - uy);

    return distSq < rSq;
  };

  // Add each point incrementally
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const badTriangles: Triangle[] = [];

    // Find triangles whose circumcircle contains the new point
    for (const tri of triangles) {
      const [a, b, c] = tri;
      if (inCircumcircle(p.x, p.y, points[a].x, points[a].y, points[b].x, points[b].y, points[c].x, points[c].y)) {
        badTriangles.push(tri);
      }
    }

    // Find boundary edges of the polygonal hole
    const edgeCount = new Map<string, number>();
    for (const tri of badTriangles) {
      const edges: [number, number][] = [
        [tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]
      ];
      for (const [a, b] of edges) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
      }
    }

    // Remove bad triangles
    triangles = triangles.filter(tri => !badTriangles.includes(tri));

    // Add new triangles from boundary edges to the new point
    for (const [key, count] of edgeCount) {
      if (count === 1) { // Boundary edge
        const [a, b] = key.split(",").map(Number);
        triangles.push([a, b, i]);
      }
    }
  }

  // Remove triangles connected to super-triangle vertices
  triangles = triangles.filter(tri =>
    tri[0] < n && tri[1] < n && tri[2] < n
  );

  // Extract unique edges
  const edgeSet = new Set<string>();
  const edges: DelaunayEdge[] = [];

  for (const tri of triangles) {
    const pairs: [number, number][] = [
      [tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]
    ];
    for (const [from, to] of pairs) {
      const key = from < to ? `${from},${to}` : `${to},${from}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ from, to });
      }
    }
  }

  return edges;
};

interface VoronoiGoldenHeroProps {
  className?: string;
  /** Number of Voronoi seeds (default: 80 for elegant density) */
  seedCount?: number;
  /** Target 30fps instead of 60fps for slower devices */
  throttle30fps?: boolean;
  /** Enable gold mode (default: true) - always gold for this component */
  goldMode?: boolean;
}

export const VoronoiGoldenHero = ({
  className = "",
  seedCount = 80,
  throttle30fps = false,
  goldMode = true, // Always gold for this component
}: VoronoiGoldenHeroProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const canvasSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Noise generator for organic animation
  const noiseRef = useRef<SimplexNoise | null>(null);

  // Voronoi geometry (recomputed on resize)
  const seedsRef = useRef<VoronoiSeed[]>([]);
  const edgesRef = useRef<DelaunayEdge[]>([]);

  // Light motes traveling along edges
  const motesRef = useRef<LightMote[]>([]);

  // Color palette - bronze/gold warmth
  const colorPalette = useMemo(() => ({
    background: "#0e0e11", // Deep anthracite
    bronze: { r: 205, g: 127, b: 50 },    // #CD7F32
    gold: { r: 212, g: 165, b: 116 },     // #D4A574
    brightGold: { r: 255, g: 215, b: 0 }, // #FFD700
    // Glow colors at different opacities
    glowBronze: "rgba(205, 127, 50, 0.3)",
    glowGold: "rgba(212, 165, 116, 0.4)",
    glowBright: "rgba(255, 215, 0, 0.5)",
  }), []);

  // Get color for edge based on seed colors
  const getEdgeColor = useCallback((seed1: VoronoiSeed, seed2: VoronoiSeed, alpha: number): string => {
    const avgColorIndex = (seed1.colorIndex + seed2.colorIndex) / 2;
    let color;

    if (avgColorIndex < 0.5) {
      color = colorPalette.bronze;
    } else if (avgColorIndex < 1.5) {
      color = colorPalette.gold;
    } else {
      color = colorPalette.brightGold;
    }

    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }, [colorPalette]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Initialize noise generator
  useEffect(() => {
    noiseRef.current = new SimplexNoise(42); // Fixed seed for consistency
  }, []);

  // Handle canvas resize with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (
        canvasSizeRef.current.width !== rect.width ||
        canvasSizeRef.current.height !== rect.height ||
        canvasSizeRef.current.dpr !== dpr
      ) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctxRef.current = ctx;
        }

        canvasSizeRef.current = { width: rect.width, height: rect.height, dpr };

        // Regenerate Voronoi geometry
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const radius = Math.min(rect.width, rect.height) * 0.45;

        seedsRef.current = generateGoldenSeeds(seedCount, centerX, centerY, radius);
        edgesRef.current = computeDelaunayEdges(seedsRef.current, rect.width, rect.height);

        // Initialize light motes (8-12 motes for subtle effect)
        const moteCount = 10;
        motesRef.current = Array.from({ length: moteCount }, (_, i) => ({
          edgeIndex: Math.floor(Math.random() * edgesRef.current.length),
          progress: Math.random(),
          speed: 0.0003 + Math.random() * 0.0004, // Slow, varied speeds
          size: 2 + Math.random() * 2,
          brightness: 0.6 + Math.random() * 0.4,
          pulsePhase: Math.random() * Math.PI * 2,
        }));
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, [seedCount]);

  // Main render loop
  const render = useCallback(
    (time: number) => {
      // 30fps throttling
      if (throttle30fps) {
        const delta = time - lastFrameTimeRef.current;
        if (delta < 33.33) {
          animationRef.current = requestAnimationFrame(render);
          return;
        }
        lastFrameTimeRef.current = time;
      }

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const noise = noiseRef.current;
      if (!canvas || !ctx || !noise) return;

      const { width, height } = canvasSizeRef.current;
      if (width === 0 || height === 0) return;

      const seeds = seedsRef.current;
      const edges = edgesRef.current;

      // Clear with background color
      ctx.fillStyle = colorPalette.background;
      ctx.fillRect(0, 0, width, height);

      // Animation parameters - SLOW for premium feel
      const timeScale = prefersReducedMotion ? 0 : 0.0001; // Very slow
      const noiseScale = 0.003; // Spatial frequency
      const amplitude = prefersReducedMotion ? 0 : 8; // Max displacement in pixels

      // Update seed positions with Perlin noise
      for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        const noiseX = noise.noise2D(
          seed.baseX * noiseScale,
          seed.baseY * noiseScale + time * timeScale
        );
        const noiseY = noise.noise2D(
          seed.baseX * noiseScale + 100,
          seed.baseY * noiseScale + time * timeScale + seed.phase
        );

        seed.x = seed.baseX + noiseX * amplitude;
        seed.y = seed.baseY + noiseY * amplitude;
      }

      // Draw subtle glow layer first
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      // Draw edges with glow
      for (const edge of edges) {
        const s1 = seeds[edge.from];
        const s2 = seeds[edge.to];

        // Distance-based alpha (edges closer to center are brighter)
        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        const distFromCenter = Math.sqrt(
          (midX - width / 2) ** 2 + (midY - height / 2) ** 2
        );
        const maxDist = Math.min(width, height) * 0.5;
        const distAlpha = Math.max(0.1, 1 - distFromCenter / maxDist);

        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.strokeStyle = getEdgeColor(s1, s2, distAlpha * 0.3);
        ctx.stroke();
      }
      ctx.restore();

      // Draw crisp edges
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      for (const edge of edges) {
        const s1 = seeds[edge.from];
        const s2 = seeds[edge.to];

        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;
        const distFromCenter = Math.sqrt(
          (midX - width / 2) ** 2 + (midY - height / 2) ** 2
        );
        const maxDist = Math.min(width, height) * 0.5;
        const distAlpha = Math.max(0.15, 1 - distFromCenter / maxDist);

        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.strokeStyle = getEdgeColor(s1, s2, distAlpha * 0.5);
        ctx.stroke();
      }

      // Draw seed vertices as subtle bright points
      const TWO_PI = Math.PI * 2;
      for (const seed of seeds) {
        const distFromCenter = Math.sqrt(
          (seed.x - width / 2) ** 2 + (seed.y - height / 2) ** 2
        );
        const maxDist = Math.min(width, height) * 0.5;
        const distAlpha = Math.max(0.2, 1 - distFromCenter / maxDist);

        // Size based on color (inner = larger)
        const radius = seed.colorIndex === 2 ? 2.5 : seed.colorIndex === 1 ? 2 : 1.5;

        ctx.beginPath();
        ctx.arc(seed.x, seed.y, radius, 0, TWO_PI);
        ctx.fillStyle = getEdgeColor(seed, seed, distAlpha * 0.6);
        ctx.fill();
      }

      // === MIST FADE EFFECT - back 30% fading into black ===
      // Creates depth by fading the outer/distant areas into darkness
      const mistGradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.35, // Start fade at 35% radius
        width / 2, height / 2, Math.min(width, height) * 0.55  // Full black by 55%
      );
      mistGradient.addColorStop(0, "rgba(14, 14, 17, 0)");
      mistGradient.addColorStop(0.5, "rgba(14, 14, 17, 0.4)");
      mistGradient.addColorStop(0.8, "rgba(14, 14, 17, 0.75)");
      mistGradient.addColorStop(1, "rgba(14, 14, 17, 0.95)");
      ctx.fillStyle = mistGradient;
      ctx.fillRect(0, 0, width, height);

      // Additional subtle vignette for polish
      const vignetteGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      vignetteGradient.addColorStop(0, "rgba(14, 14, 17, 0)");
      vignetteGradient.addColorStop(0.6, "rgba(14, 14, 17, 0.1)");
      vignetteGradient.addColorStop(1, "rgba(14, 14, 17, 0.4)");
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);

      // === LIGHT MOTES traveling along edges ===
      // Rendered AFTER mist/vignette so they appear on top
      if (!prefersReducedMotion && motesRef.current.length > 0 && edges.length > 0) {
        const motes = motesRef.current;

        for (const mote of motes) {
          // Update mote position
          mote.progress += mote.speed;

          // When mote reaches end, jump to random edge
          if (mote.progress >= 1) {
            mote.progress = 0;
            mote.edgeIndex = Math.floor(Math.random() * edges.length);
          }

          // Ensure valid edge
          if (mote.edgeIndex >= edges.length) {
            mote.edgeIndex = 0;
          }

          const edge = edges[mote.edgeIndex];
          const s1 = seeds[edge.from];
          const s2 = seeds[edge.to];

          // Interpolate position along edge
          const moteX = s1.x + (s2.x - s1.x) * mote.progress;
          const moteY = s1.y + (s2.y - s1.y) * mote.progress;

          // Pulsing brightness (gentle sine wave)
          mote.pulsePhase += 0.02;
          const pulse = 0.7 + 0.3 * Math.sin(mote.pulsePhase);
          const brightness = mote.brightness * pulse;

          // Distance-based visibility (gentler fade for visibility)
          const distFromCenter = Math.sqrt(
            (moteX - width / 2) ** 2 + (moteY - height / 2) ** 2
          );
          const maxDist = Math.min(width, height) * 0.5;
          const distFade = Math.max(0.3, 1 - (distFromCenter / maxDist) * 0.7);

          // Draw mote with radial gradient glow
          const moteRadius = mote.size * (1 + 0.2 * Math.sin(mote.pulsePhase));
          const glowRadius = moteRadius * 5;

          const moteGradient = ctx.createRadialGradient(
            moteX, moteY, 0,
            moteX, moteY, glowRadius
          );

          // Golden glow color - brighter to show through
          const glowAlpha = brightness * distFade;
          moteGradient.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
          moteGradient.addColorStop(0.25, `rgba(255, 200, 50, ${glowAlpha * 0.6})`);
          moteGradient.addColorStop(0.5, `rgba(212, 165, 116, ${glowAlpha * 0.3})`);
          moteGradient.addColorStop(1, "rgba(212, 165, 116, 0)");

          ctx.beginPath();
          ctx.arc(moteX, moteY, glowRadius, 0, TWO_PI);
          ctx.fillStyle = moteGradient;
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(moteX, moteY, moteRadius, 0, TWO_PI);
          ctx.fillStyle = `rgba(255, 248, 220, ${brightness * distFade})`;
          ctx.fill();
        }
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(render);
    },
    [colorPalette, getEdgeColor, prefersReducedMotion, throttle30fps]
  );

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
      style={{
        // Tilt-shift effect: blur top and bottom edges for miniature/scale impression
        maskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: 0.9,
          // Subtle tilt-shift blur via filter
          filter: "blur(0px)", // Base - no blur on canvas itself
        }}
      />
      {/* Top tilt-shift blur overlay */}
      <div
        className="absolute inset-x-0 top-0 h-[20%] pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(14,14,17,0.6) 0%, transparent 100%)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
      {/* Bottom tilt-shift blur overlay */}
      <div
        className="absolute inset-x-0 bottom-0 h-[20%] pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(14,14,17,0.6) 0%, transparent 100%)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />
    </div>
  );
};

export default VoronoiGoldenHero;
