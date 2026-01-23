import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/**
 * TesseractProjection - Authentic 4D Mathematical Visualization
 *
 * This component implements REAL 4D geometry mathematics:
 * - Actual tesseract (4D hypercube) vertex coordinates
 * - True 4D→3D→2D projection using: scale = hyperplane / (hyperplane + w)
 * - Mathematically correct W-axis (XW, YW, ZW) rotations
 * - Canvas bloom effect via shadowBlur (GPU-accelerated)
 * - Lightweight particle system around vertices
 *
 * Design Philosophy:
 * - STRUCTURE over BLUR (differentiates from generic AI gradients)
 * - Blue primary (#3B82F6) with warm accent - NO PURPLE
 * - Wireframe precision for intellectual premium feel
 * - W-axis foreshortening creates "impossible" depth
 * - Subtle, classy - not sci-fi cheesy
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
}

export const TesseractProjection = ({ className = "" }: TesseractProjectionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

  // Update particles
  const updateParticles = useCallback((width: number, height: number, centerX: number, centerY: number) => {
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Gentle drift toward center (gravity well around tesseract)
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 200) {
        p.vx += dx * 0.00005;
        p.vy += dy * 0.00005;
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
    });
  }, []);

  // Draw particles with subtle glow
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((p) => {
      const fadeIn = Math.min(1, p.life / 30);
      const fadeOut = Math.max(0, 1 - (p.life - p.maxLife + 30) / 30);
      const alpha = p.alpha * fadeIn * fadeOut;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.fill();
    });
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

  // Color based on W-coordinate - BLUE PRIMARY with warm accent (per design experts)
  // NO PURPLE - use blue #3B82F6 as primary, warm accent rgba(246, 130, 59)
  const getEdgeColor = useCallback((w1: number, w2: number, alpha: number): string => {
    const avgW = (w1 + w2) / 2;
    // Map W from [-1, 1] to color spectrum
    // Negative W (far in 4D): cool cyan
    // Middle W: primary blue
    // Positive W (near in 4D): warm accent (mathematical surprise)
    if (avgW < -0.3) {
      return `rgba(34, 211, 238, ${alpha})`; // cyan-400
    } else if (avgW > 0.3) {
      return `rgba(246, 130, 59, ${alpha})`; // warm accent (orange)
    } else {
      return `rgba(59, 130, 246, ${alpha})`; // blue-500 (#3B82F6)
    }
  }, []);

  // Main render loop
  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Handle DPI scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.12; // Size of tesseract

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Initialize and update particles
      initParticles(width, height);
      if (!prefersReducedMotion) {
        updateParticles(width, height, centerX, centerY);
      }

      // Draw particles first (behind tesseract)
      drawParticles(ctx);

      // Rotation angles - slow, subtle movement
      // Key: We rotate through W dimension which creates "impossible" transformations
      const baseSpeed = prefersReducedMotion ? 0 : 0.00008;
      const xwAngle = time * baseSpeed * 0.7; // Primary W-rotation
      const ywAngle = time * baseSpeed * 0.5; // Secondary W-rotation
      const zwAngle = time * baseSpeed * 0.3; // Tertiary W-rotation
      const xyAngle = time * baseSpeed * 0.2; // Subtle 3D rotation

      // Project all vertices
      const projectedVertices: ProjectedPoint[] = vertices.map((v) => {
        // Apply 4D rotations (order matters!)
        let rotated = rotateXW(v, xwAngle);
        rotated = rotateYW(rotated, ywAngle);
        rotated = rotateZW(rotated, zwAngle);
        rotated = rotateXY(rotated, xyAngle);

        // Project to 2D
        return project4Dto2D(rotated, 2.0, 4.0);
      });

      // Sort edges by average depth for proper rendering
      const sortedEdges = [...edges].sort((a, b) => {
        const depthA = (projectedVertices[a.from].scale + projectedVertices[a.to].scale) / 2;
        const depthB = (projectedVertices[b.from].scale + projectedVertices[b.to].scale) / 2;
        return depthA - depthB; // Far edges first (lower scale = farther)
      });

      // Draw edges with depth-based opacity and BLOOM effect
      sortedEdges.forEach((edge) => {
        const p1 = projectedVertices[edge.from];
        const p2 = projectedVertices[edge.to];

        // Screen coordinates
        const x1 = centerX + p1.x * scale;
        const y1 = centerY + p1.y * scale;
        const x2 = centerX + p2.x * scale;
        const y2 = centerY + p2.y * scale;

        // Depth-based opacity (closer = more visible)
        const avgScale = (p1.scale + p2.scale) / 2;
        const baseAlpha = 0.35; // Increased for bloom visibility
        const alpha = baseAlpha * avgScale * avgScale; // Quadratic falloff

        // Line width based on depth
        const lineWidth = Math.max(0.8, avgScale * 1.8);

        // BLOOM EFFECT via shadowBlur (GPU-accelerated, cheap)
        const bloomIntensity = prefersReducedMotion ? 0 : Math.min(12, avgScale * 15);
        const edgeColor = getEdgeColor(p1.w, p2.w, Math.min(alpha, 0.35));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";

        // Apply bloom glow
        if (bloomIntensity > 0) {
          ctx.shadowColor = edgeColor;
          ctx.shadowBlur = bloomIntensity;
        }

        ctx.stroke();

        // Reset shadow for next element
        ctx.shadowBlur = 0;
      });

      // Draw vertices as small points with bloom
      projectedVertices.forEach((p) => {
        const x = centerX + p.x * scale;
        const y = centerY + p.y * scale;

        // Vertex size based on depth
        const radius = Math.max(1.5, p.scale * 2.5);
        const alpha = Math.min(0.5, p.scale * 0.35);
        const vertexColor = getEdgeColor(p.w, p.w, alpha);

        // Bloom glow for vertices
        const vertexBloom = prefersReducedMotion ? 0 : Math.min(8, p.scale * 10);
        if (vertexBloom > 0) {
          ctx.shadowColor = vertexColor;
          ctx.shadowBlur = vertexBloom;
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = vertexColor;
        ctx.fill();

        ctx.shadowBlur = 0;
      });

      // Continue animation
      animationRef.current = requestAnimationFrame(render);
    },
    [vertices, edges, getEdgeColor, prefersReducedMotion, initParticles, updateParticles, drawParticles]
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
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
};

export default TesseractProjection;
