import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/**
 * TesseractProjection - Authentic 4D Mathematical Visualization (OPTIMIZED)
 *
 * This component implements REAL 4D geometry mathematics:
 * - Actual tesseract (4D hypercube) vertex coordinates
 * - True 4D→3D→2D projection using: scale = hyperplane / (hyperplane + w)
 * - Mathematically correct W-axis (XW, YW, ZW) rotations
 * - OPTIMIZED: Single-pass glow with offscreen canvas compositing
 * - Lightweight particle system around vertices
 *
 * Performance Optimizations (v2):
 * - Offscreen canvas for glow layer (single composite vs 3 passes per edge)
 * - Batched path drawing (all edges in one stroke call)
 * - Pre-computed color strings (avoid runtime string ops)
 * - Optional 30fps throttle for heavy glow mode
 * - CSS filter fallback for outer glow
 *
 * Design Philosophy:
 * - STRUCTURE over BLUR (differentiates from generic AI gradients)
 * - Deep gold primary with 50% alpha - HEAVY GLOW
 * - Wireframe precision for intellectual premium feel
 * - W-axis foreshortening creates "impossible" depth
 * - Smooth 60fps target
 */

// Particle type for ambient floating particles
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

// 4D Vector type
interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

// 2D projected point with depth info
interface ProjectedPoint {
  x: number;
  y: number;
  scale: number; // W-depth scaling factor
  w: number; // Original W coordinate for color coding
}

// Tesseract edge definition
interface Edge {
  from: number;
  to: number;
}

// Generate the 16 vertices of a tesseract (4D hypercube)
// Each vertex is at (±1, ±1, ±1, ±1) in 4D space
const generateTesseractVertices = (): Vec4[] => {
  const vertices: Vec4[] = [];
  for (let i = 0; i < 16; i++) {
    vertices.push({
      x: (i & 1) ? 1 : -1,
      y: (i & 2) ? 1 : -1,
      z: (i & 4) ? 1 : -1,
      w: (i & 8) ? 1 : -1,
    });
  }
  return vertices;
};

// Generate the 32 edges of a tesseract
// Two vertices are connected if they differ in exactly one coordinate
const generateTesseractEdges = (): Edge[] => {
  const edges: Edge[] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      // XOR to find differing bits
      const diff = i ^ j;
      // Connected if exactly one bit differs (power of 2)
      if (diff && (diff & (diff - 1)) === 0) {
        edges.push({ from: i, to: j });
      }
    }
  }
  return edges;
};

// 4D Rotation matrices - these create "impossible" rotations
// that have no equivalent in 3D space

// Rotation in XW plane (X rotates "into" W dimension)
const rotateXW = (v: Vec4, theta: number): Vec4 => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: v.x * cos - v.w * sin,
    y: v.y,
    z: v.z,
    w: v.x * sin + v.w * cos,
  };
};

// Rotation in YW plane
const rotateYW = (v: Vec4, theta: number): Vec4 => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: v.x,
    y: v.y * cos - v.w * sin,
    z: v.z,
    w: v.y * sin + v.w * cos,
  };
};

// Rotation in ZW plane
const rotateZW = (v: Vec4, theta: number): Vec4 => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: v.x,
    y: v.y,
    z: v.z * cos - v.w * sin,
    w: v.z * sin + v.w * cos,
  };
};

// Rotation in XY plane (standard 3D Z-axis rotation)
const rotateXY = (v: Vec4, theta: number): Vec4 => {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
    z: v.z,
    w: v.w,
  };
};

// 4D to 2D projection using the mathematically correct formula
// scale = hyperplane / (hyperplane + w)
// This creates the "impossible" foreshortening effect
const project4Dto2D = (v: Vec4, hyperplane: number, viewDistance: number): ProjectedPoint => {
  // First: 4D to 3D projection (W-axis foreshortening)
  const wScale = hyperplane / (hyperplane + v.w);
  const x3d = v.x * wScale;
  const y3d = v.y * wScale;
  const z3d = v.z * wScale;

  // Then: 3D to 2D projection (Z-axis perspective)
  const zScale = viewDistance / (viewDistance + z3d);
  const x2d = x3d * zScale;
  const y2d = y3d * zScale;

  return {
    x: x2d,
    y: y2d,
    scale: wScale * zScale,
    w: v.w,
  };
};

interface TesseractProjectionProps {
  className?: string;
  /** Target 30fps instead of 60fps for heavy glow on slower devices */
  throttle30fps?: boolean;
  /** Deep gold color mode (default: blue) */
  goldMode?: boolean;
}

export const TesseractProjection = ({
  className = "",
  throttle30fps = false,
  goldMode = true  // Default to deep gold per user request
}: TesseractProjectionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen glow layer
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const glowCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameTimeRef = useRef<number>(0); // For 30fps throttling
  const canvasSizeRef = useRef<{ width: number; height: number; dpr: number }>({ width: 0, height: 0, dpr: 1 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Pre-allocated buffers to avoid GC pressure
  const projectedVerticesBuffer = useRef<ProjectedPoint[]>(
    Array.from({ length: 16 }, () => ({ x: 0, y: 0, scale: 0, w: 0 }))
  );
  const sortedEdgesBuffer = useRef<Array<{ edge: Edge; depth: number }>>(
    Array.from({ length: 32 }, () => ({ edge: { from: 0, to: 0 }, depth: 0 }))
  );

  // Memoized geometry
  const vertices = useMemo(() => generateTesseractVertices(), []);
  const edges = useMemo(() => generateTesseractEdges(), []);

  // Particle colors - blue/cyan/warm accent palette (NO PURPLE)
  const particleColors = useMemo(() => [
    "rgba(59, 130, 246, 0.6)",   // blue-500
    "rgba(34, 211, 238, 0.5)",   // cyan-400
    "rgba(246, 130, 59, 0.4)",   // warm accent
    "rgba(96, 165, 250, 0.5)",   // blue-400
  ], []);

  // Initialize particles (lightweight - only 25 particles max)
  const initParticles = useCallback((width: number, height: number) => {
    if (particlesRef.current.length > 0) return; // Already initialized
    const particles: Particle[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxParticles = prefersReducedMotion ? 8 : 25;

    for (let i = 0; i < maxParticles; i++) {
      // Spawn in a ring around center (where tesseract is)
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 150;
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.3,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        life: Math.random() * 200,
        maxLife: 200 + Math.random() * 100,
      });
    }
    particlesRef.current = particles;
  }, [particleColors, prefersReducedMotion]);

  // Update particles - optimized with for loop
  const updateParticles = useCallback((width: number, height: number, centerX: number, centerY: number) => {
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Gentle drift toward center (gravity well around tesseract)
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const distSq = dx * dx + dy * dy; // Avoid sqrt when possible
      if (distSq > 40000) { // 200^2
        const invDist = 0.00005;
        p.vx += dx * invDist;
        p.vy += dy * invDist;
      }

      // Respawn if life exceeded or out of bounds
      if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 80 + Math.random() * 120;
        p.x = centerX + Math.cos(angle) * radius;
        p.y = centerY + Math.sin(angle) * radius;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = (Math.random() - 0.5) * 0.3;
        p.life = 0;
        p.alpha = 0.1 + Math.random() * 0.3;
      }
    }
  }, []);

  // Draw particles with subtle glow - optimized with for loop and cached PI*2
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    const TWO_PI = Math.PI * 2;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const fadeIn = Math.min(1, p.life / 30);
      const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 30) / 30);
      const alpha = p.alpha * fadeIn * fadeOut;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TWO_PI);
      // Avoid regex in hot path - use substring manipulation instead
      const lastParen = p.color.lastIndexOf(",");
      ctx.fillStyle = p.color.substring(0, lastParen + 1) + alpha + ")";
      ctx.fill();
    }
  }, []);

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

  // Reset particles when reduced motion preference changes
  useEffect(() => {
    particlesRef.current = [];
  }, [prefersReducedMotion]);

  // Handle canvas resize with ResizeObserver (not every frame!)
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

        // Also resize offscreen glow canvas
        if (glowCanvasRef.current) {
          glowCanvasRef.current.width = rect.width * dpr;
          glowCanvasRef.current.height = rect.height * dpr;
          // Re-acquire context after resize
          glowCtxRef.current = glowCanvasRef.current.getContext("2d");
        }

        canvasSizeRef.current = { width: rect.width, height: rect.height, dpr };
        particlesRef.current = []; // Reinit particles on resize
      }
    };

    // Initial sizing
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  // Pre-computed color palette to avoid runtime string operations
  // Gold mode: Deep gold with amber/bronze depth coding
  // Blue mode: Blue primary with cyan/orange depth coding
  const colorPalette = useMemo(() => {
    if (goldMode) {
      return {
        far: { r: 205, g: 133, b: 63 },    // Bronze (far in 4D, w < -0.3)
        mid: { r: 218, g: 165, b: 32 },    // Deep Gold (middle)
        near: { r: 255, g: 215, b: 0 },    // Bright Gold (near in 4D, w > 0.3)
        glow: "rgba(218, 165, 32, 0.8)",   // Glow color for shadowBlur
      };
    }
    return {
      far: { r: 34, g: 211, b: 238 },      // Cyan-400
      mid: { r: 59, g: 130, b: 246 },      // Blue-500
      near: { r: 246, g: 130, b: 59 },     // Warm accent
      glow: "rgba(59, 130, 246, 0.8)",
    };
  }, [goldMode]);

  // Optimized color function - returns pre-interpolated RGBA string
  const getEdgeColor = useCallback((w1: number, w2: number, alpha: number): string => {
    const avgW = (w1 + w2) / 2;
    const palette = colorPalette;
    let color;

    if (avgW < -0.3) {
      color = palette.far;
    } else if (avgW > 0.3) {
      color = palette.near;
    } else {
      color = palette.mid;
    }

    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }, [colorPalette]);

  // Main render loop - OPTIMIZED v2: Single-pass glow with offscreen compositing
  const render = useCallback(
    (time: number) => {
      // 30fps throttling (skip every other frame)
      if (throttle30fps) {
        const delta = time - lastFrameTimeRef.current;
        if (delta < 33.33) { // ~30fps = 33.33ms per frame
          animationRef.current = requestAnimationFrame(render);
          return;
        }
        lastFrameTimeRef.current = time;
      }

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      // Use cached dimensions (ResizeObserver handles updates)
      const { width, height } = canvasSizeRef.current;
      if (width === 0 || height === 0) return;

      // Initialize offscreen glow canvas if needed
      if (!glowCanvasRef.current) {
        glowCanvasRef.current = document.createElement("canvas");
        glowCanvasRef.current.width = canvas.width;
        glowCanvasRef.current.height = canvas.height;
        glowCtxRef.current = glowCanvasRef.current.getContext("2d");
      }
      const glowCtx = glowCtxRef.current;

      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.12;

      // Clear both canvases
      ctx.clearRect(0, 0, width, height);
      if (glowCtx) {
        glowCtx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Initialize and update particles
      initParticles(width, height);
      if (!prefersReducedMotion) {
        updateParticles(width, height, centerX, centerY);
      }

      // Draw particles first (behind tesseract)
      drawParticles(ctx);

      // Rotation angles - slow, subtle movement
      const baseSpeed = prefersReducedMotion ? 0 : 0.00008;
      const xwAngle = time * baseSpeed * 0.7;
      const ywAngle = time * baseSpeed * 0.5;
      const zwAngle = time * baseSpeed * 0.3;
      const xyAngle = time * baseSpeed * 0.2;

      // Pre-compute trig functions ONCE per frame (not per-vertex)
      const cosXW = Math.cos(xwAngle), sinXW = Math.sin(xwAngle);
      const cosYW = Math.cos(ywAngle), sinYW = Math.sin(ywAngle);
      const cosZW = Math.cos(zwAngle), sinZW = Math.sin(zwAngle);
      const cosXY = Math.cos(xyAngle), sinXY = Math.sin(xyAngle);

      // Project all vertices using pre-allocated buffer
      const projectedVertices = projectedVerticesBuffer.current;
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];

        // Apply 4D rotations with pre-computed trig (inlined for performance)
        // XW rotation
        let x = v.x * cosXW - v.w * sinXW;
        let y = v.y;
        let z = v.z;
        let w = v.x * sinXW + v.w * cosXW;

        // YW rotation
        const y2 = y * cosYW - w * sinYW;
        const w2 = y * sinYW + w * cosYW;
        y = y2;
        w = w2;

        // ZW rotation
        const z2 = z * cosZW - w * sinZW;
        const w3 = z * sinZW + w * cosZW;
        z = z2;
        w = w3;

        // XY rotation
        const x2 = x * cosXY - y * sinXY;
        const y3 = x * sinXY + y * cosXY;
        x = x2;
        y = y3;

        // 4D to 2D projection (inlined)
        const wScale = 2.0 / (2.0 + w);
        const x3d = x * wScale;
        const y3d = y * wScale;
        const z3d = z * wScale;
        const zScale = 4.0 / (4.0 + z3d);

        // Write to pre-allocated buffer (no object creation)
        projectedVertices[i].x = x3d * zScale;
        projectedVertices[i].y = y3d * zScale;
        projectedVertices[i].scale = wScale * zScale;
        projectedVertices[i].w = w;
      }

      // Sort edges using pre-allocated buffer with insertion sort (fast for small N=32)
      const sortedEdges = sortedEdgesBuffer.current;
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const depth = (projectedVertices[edge.from].scale + projectedVertices[edge.to].scale) / 2;
        sortedEdges[i].edge = edge;
        sortedEdges[i].depth = depth;
      }
      // Insertion sort (O(n) for nearly sorted, better than Array.sort for n=32)
      for (let i = 1; i < sortedEdges.length; i++) {
        const current = sortedEdges[i];
        let j = i - 1;
        while (j >= 0 && sortedEdges[j].depth > current.depth) {
          sortedEdges[j + 1] = sortedEdges[j];
          j--;
        }
        sortedEdges[j + 1] = current;
      }

      // ===== OPTIMIZED SINGLE-PASS GLOW RENDERING =====
      // Strategy: Draw glow to offscreen canvas, then composite

      const dpr = canvasSizeRef.current.dpr;
      const glowColor = colorPalette.glow;

      // PASS 1: Draw thick glow lines to offscreen canvas (SINGLE shadowBlur)
      if (glowCtx && !prefersReducedMotion) {
        glowCtx.save();
        glowCtx.scale(dpr, dpr);
        glowCtx.lineCap = "round";
        glowCtx.lineJoin = "round";

        // Single shadow blur for entire glow pass
        glowCtx.shadowColor = glowColor;
        glowCtx.shadowBlur = 25;
        glowCtx.globalAlpha = 0.5; // 50% alpha per user request

        // Batch all edges into one path for glow
        glowCtx.beginPath();
        for (let i = 0; i < sortedEdges.length; i++) {
          const { edge } = sortedEdges[i];
          const p1 = projectedVertices[edge.from];
          const p2 = projectedVertices[edge.to];

          const x1 = centerX + p1.x * scale;
          const y1 = centerY + p1.y * scale;
          const x2 = centerX + p2.x * scale;
          const y2 = centerY + p2.y * scale;

          glowCtx.moveTo(x1, y1);
          glowCtx.lineTo(x2, y2);
        }
        glowCtx.strokeStyle = glowColor;
        glowCtx.lineWidth = 6; // Thick for glow spread
        glowCtx.stroke();

        // Draw vertex glow points
        const TWO_PI = Math.PI * 2;
        glowCtx.beginPath();
        for (let i = 0; i < projectedVertices.length; i++) {
          const p = projectedVertices[i];
          const x = centerX + p.x * scale;
          const y = centerY + p.y * scale;
          const radius = Math.max(4, p.scale * 6);

          glowCtx.moveTo(x + radius, y);
          glowCtx.arc(x, y, radius, 0, TWO_PI);
        }
        glowCtx.fillStyle = glowColor;
        glowCtx.fill();

        glowCtx.restore();

        // Composite glow layer onto main canvas (with blur effect)
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.filter = "blur(8px)"; // CSS filter for soft outer glow
        ctx.drawImage(glowCanvasRef.current, 0, 0, width, height);
        ctx.filter = "none";
        ctx.globalAlpha = 0.4;
        ctx.drawImage(glowCanvasRef.current, 0, 0, width, height); // Second pass sharper
        ctx.restore();
      }

      // PASS 2: Draw crisp core edges (no shadow, fast)
      ctx.lineCap = "round";
      for (let i = 0; i < sortedEdges.length; i++) {
        const { edge } = sortedEdges[i];
        const p1 = projectedVertices[edge.from];
        const p2 = projectedVertices[edge.to];

        const x1 = centerX + p1.x * scale;
        const y1 = centerY + p1.y * scale;
        const x2 = centerX + p2.x * scale;
        const y2 = centerY + p2.y * scale;

        const avgScale = (p1.scale + p2.scale) / 2;
        const baseAlpha = 0.5; // 50% alpha per user request
        const alpha = baseAlpha * avgScale * avgScale;
        const lineWidth = Math.max(1.5, avgScale * 2.2);

        const edgeColor = getEdgeColor(p1.w, p2.w, Math.min(alpha, 0.5));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      // Draw vertices as bright points (single pass)
      const TWO_PI_VERT = Math.PI * 2;
      for (let i = 0; i < projectedVertices.length; i++) {
        const p = projectedVertices[i];
        const x = centerX + p.x * scale;
        const y = centerY + p.y * scale;

        const radius = Math.max(2, p.scale * 3.5);
        const alpha = Math.min(0.5, p.scale * 0.4); // 50% max alpha
        const vertexColor = getEdgeColor(p.w, p.w, alpha);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TWO_PI_VERT);
        ctx.fillStyle = vertexColor;
        ctx.fill();
      }

      // Continue animation
      animationRef.current = requestAnimationFrame(render);
    },
    [vertices, edges, getEdgeColor, colorPalette, prefersReducedMotion, throttle30fps, initParticles, updateParticles, drawParticles]
  );

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clear particles and offscreen canvas on unmount to prevent memory leak
      particlesRef.current = [];
      glowCanvasRef.current = null;
      glowCtxRef.current = null;
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
};

export default TesseractProjection;
