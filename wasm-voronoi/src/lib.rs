//! Voronoi Golden Hero - Rust WASM Implementation
//!
//! Mathematical Voronoi tessellation with golden ratio (φ) seed placement
//! for premium web hero backgrounds.
//!
//! Based on Vogel's model: θ = n × 137.508° (golden angle)
//! Color palette: Bronze #CD7F32 → Gold #D4A574 → Bright Gold #FFD700

use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

/// Golden angle in radians: 137.508° = 2π × (2 - φ) where φ = (1 + √5) / 2
/// Computed: PI * (3 - sqrt(5)) ≈ 2.39996323
const GOLDEN_ANGLE: f64 = 2.39996322972865332;

/// Color palette
const BRONZE: (u8, u8, u8) = (205, 127, 50);    // #CD7F32
const GOLD: (u8, u8, u8) = (212, 165, 116);     // #D4A574
const BRIGHT_GOLD: (u8, u8, u8) = (255, 215, 0); // #FFD700

/// Voronoi seed point
#[derive(Clone, Copy)]
struct Seed {
    x: f64,
    y: f64,
    base_x: f64,
    base_y: f64,
}

/// Delaunay edge for rendering
struct Edge {
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
}

/// Triangle for Bowyer-Watson algorithm
#[derive(Clone)]
struct Triangle {
    p1: usize,
    p2: usize,
    p3: usize,
}

impl Triangle {
    fn circumcircle_contains(&self, seeds: &[Seed], px: f64, py: f64) -> bool {
        let a = &seeds[self.p1];
        let b = &seeds[self.p2];
        let c = &seeds[self.p3];

        let d = 2.0 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
        if d.abs() < 1e-10 {
            return false;
        }

        let ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y)
            + (b.x * b.x + b.y * b.y) * (c.y - a.y)
            + (c.x * c.x + c.y * c.y) * (a.y - b.y))
            / d;
        let uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x)
            + (b.x * b.x + b.y * b.y) * (a.x - c.x)
            + (c.x * c.x + c.y * c.y) * (b.x - a.x))
            / d;

        let r_sq = (a.x - ux).powi(2) + (a.y - uy).powi(2);
        let d_sq = (px - ux).powi(2) + (py - uy).powi(2);

        d_sq < r_sq
    }
}

/// Simple 2D Simplex noise for organic animation
struct SimplexNoise {
    perm: [u8; 512],
}

impl SimplexNoise {
    fn new(seed: u32) -> Self {
        let mut perm = [0u8; 512];
        let mut p: [u8; 256] = core::array::from_fn(|i| i as u8);

        // Fisher-Yates shuffle with seed
        let mut rng = seed;
        for i in (1..256).rev() {
            rng = rng.wrapping_mul(1103515245).wrapping_add(12345);
            let j = (rng >> 16) as usize % (i + 1);
            p.swap(i, j);
        }

        for i in 0..512 {
            perm[i] = p[i & 255];
        }

        Self { perm }
    }

    fn noise2d(&self, x: f64, y: f64) -> f64 {
        const F2: f64 = 0.5 * (1.732050808 - 1.0); // (sqrt(3) - 1) / 2
        const G2: f64 = (3.0 - 1.732050808) / 6.0; // (3 - sqrt(3)) / 6

        let s = (x + y) * F2;
        let i = (x + s).floor();
        let j = (y + s).floor();

        let t = (i + j) * G2;
        let x0 = x - (i - t);
        let y0 = y - (j - t);

        let (i1, j1) = if x0 > y0 { (1.0, 0.0) } else { (0.0, 1.0) };

        let x1 = x0 - i1 + G2;
        let y1 = y0 - j1 + G2;
        let x2 = x0 - 1.0 + 2.0 * G2;
        let y2 = y0 - 1.0 + 2.0 * G2;

        let ii = (i as i32 & 255) as usize;
        let jj = (j as i32 & 255) as usize;

        let gi0 = self.perm[ii + self.perm[jj] as usize] % 12;
        let gi1 = self.perm[ii + i1 as usize + self.perm[jj + j1 as usize] as usize] % 12;
        let gi2 = self.perm[ii + 1 + self.perm[jj + 1] as usize] % 12;

        let grad = |gi: u8, x: f64, y: f64| -> f64 {
            let g = match gi {
                0 => (1.0, 1.0),
                1 => (-1.0, 1.0),
                2 => (1.0, -1.0),
                3 => (-1.0, -1.0),
                4 => (1.0, 0.0),
                5 => (-1.0, 0.0),
                6 => (0.0, 1.0),
                7 => (0.0, -1.0),
                8 => (1.0, 1.0),
                9 => (-1.0, 1.0),
                10 => (1.0, -1.0),
                _ => (-1.0, -1.0),
            };
            g.0 * x + g.1 * y
        };

        let mut n0 = 0.0;
        let mut t0 = 0.5 - x0 * x0 - y0 * y0;
        if t0 > 0.0 {
            t0 *= t0;
            n0 = t0 * t0 * grad(gi0, x0, y0);
        }

        let mut n1 = 0.0;
        let mut t1 = 0.5 - x1 * x1 - y1 * y1;
        if t1 > 0.0 {
            t1 *= t1;
            n1 = t1 * t1 * grad(gi1, x1, y1);
        }

        let mut n2 = 0.0;
        let mut t2 = 0.5 - x2 * x2 - y2 * y2;
        if t2 > 0.0 {
            t2 *= t2;
            n2 = t2 * t2 * grad(gi2, x2, y2);
        }

        70.0 * (n0 + n1 + n2)
    }
}

/// VoronoiHero WASM renderer
#[wasm_bindgen]
pub struct VoronoiHero {
    seeds: Vec<Seed>,
    edges: Vec<Edge>,
    noise: SimplexNoise,
    width: f64,
    height: f64,
    center_x: f64,
    center_y: f64,
    radius: f64,
    time: f64,
}

#[wasm_bindgen]
impl VoronoiHero {
    /// Create a new VoronoiHero renderer
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64, seed_count: usize) -> Self {
        #[cfg(feature = "console_error_panic_hook")]
        console_error_panic_hook::set_once();

        let center_x = width / 2.0;
        let center_y = height / 2.0;
        let radius = width.min(height) * 0.45;

        let seeds = generate_golden_seeds(seed_count, center_x, center_y, radius);
        let edges = compute_delaunay_edges(&seeds, width, height);
        let noise = SimplexNoise::new(42);

        Self {
            seeds,
            edges,
            noise,
            width,
            height,
            center_x,
            center_y,
            radius,
            time: 0.0,
        }
    }

    /// Advance animation by dt milliseconds
    pub fn tick(&mut self, dt: f64) {
        self.time += dt * 0.00005; // Very slow animation

        // Update seed positions with Perlin noise
        for seed in &mut self.seeds {
            let nx = self.noise.noise2d(seed.base_x * 0.003, self.time) * 8.0;
            let ny = self.noise.noise2d(seed.base_y * 0.003, self.time + 100.0) * 8.0;
            seed.x = seed.base_x + nx;
            seed.y = seed.base_y + ny;
        }

        // Recompute edges with updated positions
        self.edges = compute_delaunay_edges(&self.seeds, self.width, self.height);
    }

    /// Render to canvas context
    pub fn render(&self, ctx: &CanvasRenderingContext2d) {
        ctx.clear_rect(0.0, 0.0, self.width, self.height);

        // Draw edges with distance-based coloring
        for edge in &self.edges {
            let mid_x = (edge.x1 + edge.x2) / 2.0;
            let mid_y = (edge.y1 + edge.y2) / 2.0;
            let dist = ((mid_x - self.center_x).powi(2) + (mid_y - self.center_y).powi(2)).sqrt();
            let ratio = (dist / self.radius).min(1.0);

            let color = interpolate_color(ratio);
            let alpha = 0.15 + (1.0 - ratio) * 0.25;

            ctx.begin_path();
            ctx.move_to(edge.x1, edge.y1);
            ctx.line_to(edge.x2, edge.y2);
            ctx.set_stroke_style_str(&format!(
                "rgba({}, {}, {}, {})",
                color.0, color.1, color.2, alpha
            ));
            ctx.set_line_width(0.5 + (1.0 - ratio) * 0.8);
            ctx.stroke();
        }

        // Draw seed nodes
        for seed in &self.seeds {
            let dist =
                ((seed.x - self.center_x).powi(2) + (seed.y - self.center_y).powi(2)).sqrt();
            let ratio = (dist / self.radius).min(1.0);
            let color = interpolate_color(ratio);
            let node_size = 1.5 + (1.0 - ratio) * 1.5;

            ctx.begin_path();
            ctx.arc(seed.x, seed.y, node_size, 0.0, std::f64::consts::TAU)
                .unwrap();
            ctx.set_fill_style_str(&format!(
                "rgba({}, {}, {}, {})",
                color.0,
                color.1,
                color.2,
                0.4 + (1.0 - ratio) * 0.4
            ));
            ctx.fill();
        }
    }

    /// Get current time for external sync
    pub fn get_time(&self) -> f64 {
        self.time
    }

    /// Resize the renderer
    pub fn resize(&mut self, width: f64, height: f64, seed_count: usize) {
        self.width = width;
        self.height = height;
        self.center_x = width / 2.0;
        self.center_y = height / 2.0;
        self.radius = width.min(height) * 0.45;
        self.seeds = generate_golden_seeds(seed_count, self.center_x, self.center_y, self.radius);
        self.edges = compute_delaunay_edges(&self.seeds, width, height);
    }
}

/// Generate seeds using Vogel's model (golden angle spiral)
fn generate_golden_seeds(count: usize, center_x: f64, center_y: f64, radius: f64) -> Vec<Seed> {
    let mut seeds = Vec::with_capacity(count);
    let scaling_factor = radius / (count as f64).sqrt();

    for i in 0..count {
        let n = i as f64;
        // Fermat's spiral with golden angle
        let r = scaling_factor * n.sqrt();
        let theta = n * GOLDEN_ANGLE;

        let x = center_x + r * theta.cos();
        let y = center_y + r * theta.sin();

        seeds.push(Seed {
            x,
            y,
            base_x: x,
            base_y: y,
        });
    }

    seeds
}

/// Compute Delaunay triangulation edges using Bowyer-Watson algorithm
fn compute_delaunay_edges(seeds: &[Seed], width: f64, height: f64) -> Vec<Edge> {
    if seeds.len() < 3 {
        return Vec::new();
    }

    // Create super-triangle that contains all points
    let margin = width.max(height) * 2.0;
    let mut all_seeds = seeds.to_vec();
    let st_idx = all_seeds.len();

    all_seeds.push(Seed {
        x: width / 2.0,
        y: -margin,
        base_x: 0.0,
        base_y: 0.0,
    });
    all_seeds.push(Seed {
        x: -margin,
        y: height + margin,
        base_x: 0.0,
        base_y: 0.0,
    });
    all_seeds.push(Seed {
        x: width + margin,
        y: height + margin,
        base_x: 0.0,
        base_y: 0.0,
    });

    let mut triangles = vec![Triangle {
        p1: st_idx,
        p2: st_idx + 1,
        p3: st_idx + 2,
    }];

    // Insert each point
    for i in 0..seeds.len() {
        let px = all_seeds[i].x;
        let py = all_seeds[i].y;

        let mut bad_triangles = Vec::new();

        for (idx, tri) in triangles.iter().enumerate() {
            if tri.circumcircle_contains(&all_seeds, px, py) {
                bad_triangles.push(idx);
            }
        }

        // Find polygon hole
        let mut polygon: Vec<(usize, usize)> = Vec::new();

        for &bi in &bad_triangles {
            let tri = &triangles[bi];
            let edges_tri = [(tri.p1, tri.p2), (tri.p2, tri.p3), (tri.p3, tri.p1)];

            for edge in edges_tri {
                let mut shared = false;
                for &bj in &bad_triangles {
                    if bi != bj {
                        let other = &triangles[bj];
                        let other_edges =
                            [(other.p1, other.p2), (other.p2, other.p3), (other.p3, other.p1)];
                        for oe in other_edges {
                            if (edge.0 == oe.0 && edge.1 == oe.1)
                                || (edge.0 == oe.1 && edge.1 == oe.0)
                            {
                                shared = true;
                                break;
                            }
                        }
                    }
                    if shared {
                        break;
                    }
                }
                if !shared {
                    polygon.push(edge);
                }
            }
        }

        // Remove bad triangles (in reverse order to preserve indices)
        bad_triangles.sort_by(|a, b| b.cmp(a));
        for idx in bad_triangles {
            triangles.remove(idx);
        }

        // Create new triangles
        for edge in polygon {
            triangles.push(Triangle {
                p1: edge.0,
                p2: edge.1,
                p3: i,
            });
        }
    }

    // Remove triangles connected to super-triangle vertices
    triangles.retain(|t| t.p1 < st_idx && t.p2 < st_idx && t.p3 < st_idx);

    // Extract unique edges
    let mut edge_set: std::collections::HashSet<(usize, usize)> =
        std::collections::HashSet::new();

    for tri in &triangles {
        let mut add_edge = |a: usize, b: usize| {
            let key = if a < b { (a, b) } else { (b, a) };
            edge_set.insert(key);
        };
        add_edge(tri.p1, tri.p2);
        add_edge(tri.p2, tri.p3);
        add_edge(tri.p3, tri.p1);
    }

    edge_set
        .into_iter()
        .map(|(a, b)| Edge {
            x1: seeds[a].x,
            y1: seeds[a].y,
            x2: seeds[b].x,
            y2: seeds[b].y,
        })
        .collect()
}

/// Interpolate color based on distance ratio (0=center, 1=edge)
fn interpolate_color(ratio: f64) -> (u8, u8, u8) {
    if ratio < 0.5 {
        // Bright gold to gold
        let t = ratio * 2.0;
        (
            lerp_u8(BRIGHT_GOLD.0, GOLD.0, t),
            lerp_u8(BRIGHT_GOLD.1, GOLD.1, t),
            lerp_u8(BRIGHT_GOLD.2, GOLD.2, t),
        )
    } else {
        // Gold to bronze
        let t = (ratio - 0.5) * 2.0;
        (
            lerp_u8(GOLD.0, BRONZE.0, t),
            lerp_u8(GOLD.1, BRONZE.1, t),
            lerp_u8(GOLD.2, BRONZE.2, t),
        )
    }
}

fn lerp_u8(a: u8, b: u8, t: f64) -> u8 {
    (a as f64 + (b as f64 - a as f64) * t).round() as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_golden_seeds() {
        let seeds = generate_golden_seeds(10, 500.0, 500.0, 200.0);
        assert_eq!(seeds.len(), 10);
    }

    #[test]
    fn test_noise() {
        let noise = SimplexNoise::new(42);
        let val = noise.noise2d(0.5, 0.5);
        assert!(val >= -1.0 && val <= 1.0);
    }
}
