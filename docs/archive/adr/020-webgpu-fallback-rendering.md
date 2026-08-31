# ADR-020: WebGPU Rendering with Progressive Fallback

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                                     |
|-----------|-------------------------------------------|
| Status    | Accepted                                  |
| Date      | 2026-03-09                                |
| Deciders  | DreamLab Engineering                      |
| Related   | PRD v4.0.0, ADR-016 (Nostr SDK)           |

## Context

The forum's visual identity ("WebGPU Candy Tech Demo") requires GPU-accelerated
particle fields, bloom post-processing, and ambient glow effects. WebGPU is
available in Chrome 113+, Edge 113+, and Firefox Nightly — but Safari and older
browsers lack support. The forum must render everywhere.

## Decision

Adopt a **three-tier progressive rendering** strategy:

### Tier 1: WebGPU (preferred)
- `navigator.gpu` detection at app init
- Compute shader for particle physics (force-directed, Fermat spiral)
- Render pipeline: instanced quads → bloom pass → composite
- Used for: hero background, activity graph, reaction bursts

### Tier 2: Canvas2D (fallback)
- `requestAnimationFrame` loop with manual particle updates
- Already implemented in `particle_canvas.rs`
- Performance budget: 60fps at 120 particles on mobile
- Used when: WebGPU unavailable, `prefers-reduced-motion: no-preference`

### Tier 3: CSS-only (minimal)
- Static gradients, `backdrop-filter`, `box-shadow` glow
- Activated when: `prefers-reduced-motion: reduce` OR Canvas2D performance < 30fps
- Zero JavaScript animation overhead

### Detection Flow
```rust
enum RenderTier { WebGPU, Canvas2D, CSSOnly }

fn detect_render_tier() -> RenderTier {
    if prefers_reduced_motion() { return RenderTier::CSSOnly; }
    if has_webgpu() { return RenderTier::WebGPU; }
    RenderTier::Canvas2D
}
```

### Component Architecture
Each visual effect component accepts a `render_tier: Signal<RenderTier>` prop
and renders the appropriate implementation. The tier is detected once at app
startup and provided via Leptos context.

## Consequences

### Positive
- Best visual experience on capable hardware
- No broken rendering on any browser
- Respects user motion preferences (WCAG 2.1 SC 2.3.3)
- Single component API regardless of tier

### Negative
- Three code paths per visual effect (maintenance cost)
- WebGPU shader code adds ~8KB to WASM bundle
- Canvas2D path must be maintained even as WebGPU adoption grows

### Mitigations
- Shared particle physics math in `fx/physics.rs` (tier-agnostic)
- WebGPU shaders in separate `.wgsl` files loaded at runtime (not compiled in)
- Feature flag `webgpu` in Cargo.toml to exclude GPU code from minimal builds
