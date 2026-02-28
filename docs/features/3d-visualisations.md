---
title: "3D Visualisations"
description: "Three.js and Rust WASM-powered mathematical visualisations for the DreamLab AI landing page"
category: reference
tags: ['3d', 'three.js', 'wasm', 'rust', 'visualisation', 'developer']
difficulty: intermediate
last-updated: 2026-02-28
---

# 3D Visualisations

The DreamLab AI landing page features two mathematical visualisations that communicate "premium intellectual warmth" -- structured, mathematically precise geometry rather than generic AI gradients or sci-fi effects.

## VoronoiGoldenHero

**File**: `src/components/VoronoiGoldenHero.tsx`

A 2D Canvas-based Voronoi tessellation with seed points placed according to the golden ratio. This is the primary hero background on the landing page.

### Mathematical Foundation

- **Golden angle**: 137.508 degrees = 360 degrees x (1 - 1/phi), where phi = (1 + sqrt(5)) / 2
- **Vogel's model**: seed placement at theta = n x 137.508 degrees with Fermat's spiral r = c x sqrt(n) for uniform density
- **Voronoi cells**: each cell contains all points closest to its seed, computed via Delaunay triangulation
- **Simplex noise**: Perlin-like noise drives organic, non-random animation of seed positions

### Colour Palette

| Role | Hex | Name |
|------|-----|------|
| Background | `#0e0e11` | Deep anthracite |
| Far cells | `#CD7F32` | Bronze |
| Mid cells | `#D4A574` | Gold |
| Near cells | `#FFD700` | Bright gold |

### Performance

- Pre-computed Delaunay triangulation for Voronoi cell boundaries
- Batch rendering with single stroke calls per frame
- 60fps target using `requestAnimationFrame`
- Seeded simplex noise (seed 12345) for deterministic animation

### Rust WASM Implementation

The `wasm-voronoi/` directory contains a Rust implementation of the same Voronoi tessellation for higher performance on supported browsers.

**File**: `wasm-voronoi/src/lib.rs`

- Built with `wasm-bindgen` and `web-sys` for direct Canvas API access
- Implements the Bowyer-Watson algorithm for Delaunay triangulation
- Golden angle constant: `PI * (3 - sqrt(5))` = 2.39996323 radians
- Same colour palette (bronze, gold, bright gold)
- Circumcircle containment test for triangle invalidation
- Falls back to the JavaScript/React implementation if WASM is unavailable

```bash
# Build WASM module
cd wasm-voronoi
wasm-pack build --target web
```

## TesseractProjection

**File**: `src/components/TesseractProjection.tsx`

A real-time 4D hypercube (tesseract) wireframe projection rendered on a 2D Canvas. Demonstrates authentic higher-dimensional mathematics.

### Mathematical Foundation

- **16 vertices** at all combinations of (+/-1, +/-1, +/-1, +/-1) in 4D space
- **32 edges** connecting vertices that differ in exactly one coordinate
- **4D to 3D projection**: `scale = hyperplane / (hyperplane + w)` (perspective division on the W axis)
- **3D to 2D projection**: standard perspective projection
- **W-axis rotations**: XW, YW, ZW rotation matrices create the "impossible depth" effect characteristic of tesseract visualisations

### Rendering

- Offscreen canvas for glow layer (single composite operation rather than three passes per edge)
- Batched path drawing (all 32 edges in one stroke call)
- Pre-computed colour strings to avoid runtime string operations
- Deep gold primary colour with 50% alpha for heavy glow effect
- Ambient particle system around vertices
- 60fps target, optional 30fps throttle for heavy glow mode
- CSS filter fallback for outer glow on less capable GPUs

### Design Philosophy

Structure over blur: wireframe precision communicates intellectual rigour, differentiating from generic AI gradient backgrounds. The W-axis foreshortening creates a sense of "impossible depth" that rewards close inspection.

## Integration

Both visualisations are React components imported into the landing page (`src/pages/Index.tsx`):

```tsx
import VoronoiGoldenHero from '@/components/VoronoiGoldenHero';
import TesseractProjection from '@/components/TesseractProjection';
```

They use standard React hooks (`useEffect`, `useRef`, `useState`, `useMemo`, `useCallback`) and render directly to HTML Canvas elements -- no Three.js or @react-three/fiber dependency for the canvas rendering path. The Three.js dependency is used elsewhere in the project for potential future 3D scenes.

## Performance Considerations

- Both components use `requestAnimationFrame` for animation and clean up on unmount
- Canvas dimensions are responsive to viewport changes
- The Voronoi component pre-computes triangulation rather than recomputing per frame
- The tesseract component batches all edge drawing into single stroke calls
- WASM Voronoi provides a ~2-3x speedup over the JavaScript implementation for the Delaunay triangulation step
- Neither component blocks the main thread during initial render -- seed computation is synchronous but fast (sub-millisecond for typical seed counts)

## Related Documentation

- [Workshop Content System](./workshops.md) -- workshop pages that also use visual components
- [ADR-006](../adr/006-client-side-wasm-search.md) -- WASM usage in the project
