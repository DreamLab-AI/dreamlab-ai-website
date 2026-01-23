# DreamLab AI Landing Page Technical Architecture Document

**Version:** 1.0
**Date:** 2026-01-23
**Author:** System Architecture Team
**Status:** Draft for Review

---

## Executive Summary

This document outlines the technical architecture for the DreamLab AI landing page redesign. The analysis is based on the existing codebase (Vite + React 18 + TypeScript + Three.js + Tailwind CSS + shadcn/ui) and addresses performance optimization, component architecture, animation strategy, and SEO requirements.

---

## 1. Current State Analysis

### 1.1 Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Build | Vite | 5.4.21 |
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| 3D Rendering | Three.js | 0.156.1 |
| 3D Integration | @react-three/fiber | 8.18.0 |
| Styling | Tailwind CSS | 3.4.11 |
| UI Components | shadcn/ui (Radix) | Various |
| Routing | React Router | 6.26.2 |
| State | React Query | 5.56.2 |

### 1.2 Current Bundle Analysis
```
Critical Path Assets (First Load):
- vendor.js:     162.17 kB (gzip: 52.95 kB)  - React, ReactDOM, Router
- three.js:      775.78 kB (gzip: 209.68 kB) - THREE.JS LIBRARY
- ui.js:         129.16 kB (gzip: 39.82 kB)  - Radix UI components
- Index.js:       29.56 kB (gzip: 10.05 kB)  - Landing page

Total Initial Load: ~1.1 MB (gzip: ~312 kB)
```

### 1.3 Current Page Structure (Index.tsx)
```
Index Page
├── Header (reveal-on-scroll)
├── Hero Section
│   ├── Gradient Orbs (CSS)
│   ├── TorusKnot (Three.js Canvas)
│   │   └── SkillNode sprites (dynamic)
│   ├── Content Overlay (h1, tagline, CTAs)
│   └── Scroll Indicator
├── TestimonialMoments (3 cards)
├── FeaturedInstructors (3 cards)
├── ExclusivityBanner (waitlist CTA)
├── CaseStudyNarrative (story block)
├── EmailSignupForm
└── Footer
```

---

## 2. Architecture Decisions

### ADR-001: Three.js Hero Strategy

**Decision:** ENHANCE the existing TorusKnot hero rather than replace it.

**Context:**
- The TorusKnot is a distinctive brand element showing "skills in orbit"
- Current implementation is well-optimized (demand frameloop, performance hints)
- Three.js bundle (775 kB) is already chunked separately
- Removing it saves ~210 kB gzip but loses visual differentiation

**Rationale:**
1. The visualization communicates "AI training skills" conceptually
2. It's already lazy-loaded via route-based code splitting
3. The `frameloop="demand"` prevents continuous GPU usage
4. Alternative: Pure CSS animations cannot achieve this effect

**Enhancement Plan:**
```typescript
// Proposed enhancements to TorusKnot.tsx
const TorusKnotScene = ({ skills }: TorusKnotProps) => {
  // 1. Add intersection observer to pause when not visible
  const { ref, inView } = useInView({ threshold: 0.1 });

  // 2. Progressive quality based on device capability
  const dpr = useMemo(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.hardwareConcurrency > 4 ? [1, 2] : [1, 1.5];
    }
    return [1, 1.5];
  }, []);

  // 3. Reduced geometry on mobile
  const segments = isMobile ? 32 : 64;
};
```

**Mobile Strategy:**
- Reduce geometry complexity (32 vs 64 segments)
- Lower DPR ceiling (1.5 vs 2.0)
- Disable parallax scroll effect (already implemented)
- Consider static fallback image for very low-end devices

---

### ADR-002: Animation Library Selection

**Decision:** Use **CSS animations (Tailwind)** as primary, **Framer Motion** for complex interactions.

**Evaluation Matrix:**

| Criteria | CSS/Tailwind | Framer Motion | Three.js |
|----------|--------------|---------------|----------|
| Bundle Size | 0 kB | ~40 kB | Already loaded |
| Scroll Triggers | Limited | Excellent | Custom |
| GPU Acceleration | Yes | Yes | Yes |
| Accessibility | Manual | Built-in | Manual |
| Learning Curve | Low | Medium | High |
| Current Usage | Heavy | None | Hero only |

**Recommendation:**
```
┌─────────────────────────────────────────────────────────┐
│  Animation Strategy Hierarchy                           │
├─────────────────────────────────────────────────────────┤
│  1. CSS/Tailwind (default)                              │
│     - Fade-in, slide-up, scale-in                       │
│     - Hover states, micro-interactions                  │
│     - Gradient animations                               │
│                                                         │
│  2. Framer Motion (optional addition)                   │
│     - Scroll-linked animations                          │
│     - Layout animations                                 │
│     - Gesture-based interactions                        │
│     - AnimatePresence for route transitions             │
│                                                         │
│  3. Three.js (hero only)                                │
│     - 3D TorusKnot visualization                        │
│     - Skill label sprites                               │
└─────────────────────────────────────────────────────────┘
```

**If Framer Motion is added:**
```json
{
  "dependencies": {
    "framer-motion": "^11.0.0"  // +40kB gzip
  }
}
```

---

### ADR-003: Component Architecture

**Decision:** Implement a feature-based component hierarchy with atomic design principles.

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (existing)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   ├── layout/                # NEW: Layout components
│   │   ├── Header.tsx         # (move from components/)
│   │   ├── Footer.tsx         # (extract from Index.tsx)
│   │   ├── Section.tsx        # Reusable section wrapper
│   │   └── Container.tsx      # Responsive container
│   │
│   ├── landing/               # NEW: Landing page specific
│   │   ├── hero/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── TorusKnot.tsx  # (move from components/)
│   │   │   ├── HeroContent.tsx
│   │   │   └── ScrollIndicator.tsx
│   │   │
│   │   ├── social-proof/
│   │   │   ├── TestimonialMoments.tsx
│   │   │   ├── TestimonialCard.tsx
│   │   │   ├── FeaturedInstructors.tsx
│   │   │   └── InstructorCard.tsx
│   │   │
│   │   ├── conversion/
│   │   │   ├── ExclusivityBanner.tsx
│   │   │   ├── EmailSignupForm.tsx
│   │   │   └── CTAButton.tsx
│   │   │
│   │   └── narrative/
│   │       └── CaseStudyNarrative.tsx
│   │
│   └── shared/                # NEW: Cross-page components
│       ├── OptimizedImage.tsx # (consolidate image components)
│       └── AnimatedSection.tsx
│
├── hooks/
│   ├── useIsMobile.ts         # (extract from Index.tsx)
│   ├── useInView.ts           # Intersection Observer wrapper
│   ├── useOGMeta.ts           # (existing)
│   └── useReducedMotion.ts    # Accessibility
│
└── pages/
    └── Index.tsx              # Composes landing page sections
```

---

## 3. Component Hierarchy Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Index Page                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Header (fixed, reveal-on-scroll)                                │ │
│  │ ├── Logo/Menu Dropdown                                          │ │
│  │ └── Contact CTA                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ HeroSection (100vh)                                             │ │
│  │ ├── GradientOrbs (CSS positioned)                               │ │
│  │ ├── TorusKnot (Three.js Canvas, z-index: 0)                     │ │
│  │ │   └── SkillNode[] (sprite labels)                             │ │
│  │ ├── HeroContent (z-index: 10)                                   │ │
│  │ │   ├── Heading (gradient text)                                 │ │
│  │ │   ├── Subheading                                              │ │
│  │ │   └── CTAGroup                                                │ │
│  │ │       ├── PrimaryCTA → /residential-training                  │ │
│  │ │       └── SecondaryCTA → /team                                │ │
│  │ └── ScrollIndicator (animated chevron)                          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ TestimonialMoments                                              │ │
│  │ ├── SectionHeader                                               │ │
│  │ └── Grid (3 columns)                                            │ │
│  │     └── TestimonialCard[] (3)                                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ FeaturedInstructors                                             │ │
│  │ ├── Badge ("The Collective")                                    │ │
│  │ ├── SectionHeader                                               │ │
│  │ ├── Grid (3 columns)                                            │ │
│  │ │   └── InstructorCard[] (3)                                    │ │
│  │ └── BottomNote                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ ExclusivityBanner                                               │ │
│  │ ├── StatusBadges (Q1 Booked, Max 4)                             │ │
│  │ ├── Headline                                                    │ │
│  │ ├── Subheadline                                                 │ │
│  │ └── WaitlistForm                                                │ │
│  │     ├── EmailInput                                              │ │
│  │     └── SubmitButton                                            │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ CaseStudyNarrative                                              │ │
│  │ ├── SectionHeader                                               │ │
│  │ ├── NarrativeCard                                               │ │
│  │ │   ├── Paragraphs (story)                                      │ │
│  │ │   └── Blockquote                                              │ │
│  │ └── CTALink → /residential-training                             │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ EmailSignupSection                                              │ │
│  │ ├── GlassmorphismCard                                           │ │
│  │ │   ├── Heading                                                 │ │
│  │ │   ├── Description                                             │ │
│  │ │   └── EmailSignupForm                                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Footer                                                          │ │
│  │ ├── Copyright                                                   │ │
│  │ ├── SocialLinks                                                 │ │
│  │ └── PrivacyLink                                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Performance Budget

### 4.1 Core Web Vitals Targets

| Metric | Target | Current (Est.) | Strategy |
|--------|--------|----------------|----------|
| **LCP** | < 2.5s | ~3.5s | Defer Three.js, optimize images |
| **FID** | < 100ms | ~50ms | Already good (React 18 concurrent) |
| **CLS** | < 0.1 | ~0.05 | Reserve space for lazy content |
| **TTI** | < 3.8s | ~4.5s | Code split, defer non-critical JS |
| **FCP** | < 1.8s | ~2.0s | Inline critical CSS, preconnect |

### 4.2 Bundle Budget

```
┌──────────────────────────────────────────────────────────────────┐
│                    Landing Page Bundle Budget                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Critical Path (must load before interaction):                    │
│  ┌────────────────────────────────────────────────────┐          │
│  │ vendor.js (React core)           │ 53 kB gzip     │ KEEP     │
│  │ index-entry.js (router, app)     │ 30 kB gzip     │ KEEP     │
│  │ index.css (Tailwind)             │ 25 kB gzip     │ KEEP     │
│  └────────────────────────────────────────────────────┘          │
│  Critical Total: ~108 kB gzip                                     │
│                                                                   │
│  Deferred (load after FCP):                                       │
│  ┌────────────────────────────────────────────────────┐          │
│  │ ui.js (Radix components)         │ 40 kB gzip     │ DEFER    │
│  │ three.js (3D library)            │ 210 kB gzip    │ DEFER    │
│  │ Index.js (page components)       │ 10 kB gzip     │ DEFER    │
│  └────────────────────────────────────────────────────┘          │
│  Deferred Total: ~260 kB gzip                                     │
│                                                                   │
│  Page Total Budget: 370 kB gzip (target < 400 kB)                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Performance Optimization Strategies

```typescript
// 1. Intersection Observer for Three.js
const HeroSection = () => {
  const [shouldRender3D, setShouldRender3D] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShouldRender3D(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={heroRef}>
      {shouldRender3D && <TorusKnot skills={skills} />}
    </section>
  );
};

// 2. Static fallback for SSR/low-power devices
const TorusKnotWithFallback = ({ skills }) => {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    // Check WebGL support and device capability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const isCapable = gl && navigator.hardwareConcurrency > 2;
    setCanRender(isCapable);
  }, []);

  if (!canRender) {
    return <StaticHeroFallback />;
  }

  return <TorusKnot skills={skills} />;
};

// 3. Preload critical assets
<link rel="preload" href="/fonts/inter-var.woff2" as="font" crossOrigin="" />
<link rel="preconnect" href="https://dreamlab-ai.com" />

// 4. Dynamic imports for below-fold sections
const TestimonialMoments = lazy(() => import('./landing/social-proof/TestimonialMoments'));
const FeaturedInstructors = lazy(() => import('./landing/social-proof/FeaturedInstructors'));
```

---

## 5. Mobile-First Responsive Architecture

### 5.1 Breakpoint Strategy

```css
/* Mobile-first breakpoints (matches Tailwind defaults) */
:root {
  /* Base: Mobile (< 640px) */
  /* sm: 640px  - Large phones, small tablets */
  /* md: 768px  - Tablets */
  /* lg: 1024px - Laptops */
  /* xl: 1280px - Desktops */
  /* 2xl: 1400px - Large screens (custom container) */
}
```

### 5.2 Component Responsive Patterns

```
┌─────────────────────────────────────────────────────────────────┐
│                    Responsive Behavior Matrix                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Hero Section                                                    │
│  ├── Mobile:  Single column, reduced 3D complexity              │
│  ├── Tablet:  Same layout, enhanced 3D                          │
│  └── Desktop: Full parallax, max DPR                            │
│                                                                  │
│  Testimonials Grid                                               │
│  ├── Mobile:  1 column (stack)                                  │
│  ├── Tablet:  2 columns                                         │
│  └── Desktop: 3 columns                                         │
│                                                                  │
│  Instructors Grid                                                │
│  ├── Mobile:  1 column (stack)                                  │
│  ├── Tablet:  2 columns                                         │
│  └── Desktop: 3 columns                                         │
│                                                                  │
│  CTA Buttons                                                     │
│  ├── Mobile:  Full width, stacked                               │
│  └── Desktop: Inline, side-by-side                              │
│                                                                  │
│  Navigation                                                      │
│  ├── Mobile:  Hamburger dropdown (current)                      │
│  └── Desktop: Same (keep consistent)                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Touch Interaction Considerations

```typescript
// hooks/useIsMobile.ts (already exists in Index.tsx, extract)
export const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [breakpoint]);

  return isMobile;
};

// Touch target sizes (WCAG 2.2 requirement)
// Minimum: 44x44px for all interactive elements
```

---

## 6. SEO and Meta Tag Strategy

### 6.1 Current Implementation (og-meta.ts)

The existing implementation is solid:
- Dynamic OG tags via `useOGMeta` hook
- Twitter Card support
- Structured data generation (JSON-LD)
- Page-specific configurations

### 6.2 Enhancements Needed

```typescript
// 1. Add prerender hints for critical resources
// index.html
<link rel="modulepreload" href="/assets/vendor-[hash].js" />
<link rel="preload" href="/og/home.png" as="image" />

// 2. Enhance structured data for landing page
const landingPageSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "DreamLab AI Consulting Ltd.",
  "description": "Expert AI consulting and immersive residential training",
  "url": "https://dreamlab-ai.com",
  "logo": "https://dreamlab-ai.com/logo.png",
  "sameAs": [
    "https://bsky.app/profile/thedreamlab.bsky.social",
    "https://www.linkedin.com/company/dreamlab-ai-consulting/"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@dreamlab-ai.com",
    "contactType": "customer service"
  },
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "GBP",
    "offerCount": 5,
    "offers": [
      {
        "@type": "Offer",
        "name": "Residential AI Training",
        "description": "5-day immersive AI training in Lake District"
      }
    ]
  }
};

// 3. Service-specific schemas for workshop pages
const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "AI-Powered Knowledge Work",
  "description": "Transform from AI consumer to AI commander",
  "provider": {
    "@type": "Organization",
    "name": "DreamLab AI Consulting Ltd."
  }
};
```

### 6.3 Meta Tag Checklist

```
┌─────────────────────────────────────────────────────────────────┐
│                    Meta Tag Implementation                       │
├─────────────────────────────────────────────────────────────────┤
│ [x] title - Dynamic per page                                    │
│ [x] description - Dynamic per page                              │
│ [x] og:title, og:description, og:image                          │
│ [x] og:type (website, article, product)                         │
│ [x] og:url (canonical)                                          │
│ [x] twitter:card, twitter:title, twitter:description            │
│ [x] twitter:image, twitter:site, twitter:creator                │
│ [x] canonical link                                              │
│ [ ] robots meta (add for pagination)                            │
│ [ ] article:published_time (for blog/news if added)             │
│ [ ] preconnect/dns-prefetch for external resources              │
│ [ ] hreflang (if multilingual added)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Build and Deployment Considerations

### 7.1 Current Vite Configuration

```typescript
// vite.config.ts - Current chunking strategy
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom', 'react-router-dom'],
        'three': ['three', '@react-three/fiber', '@react-three/drei'],
        'ui': [/* Radix components */]
      }
    }
  }
}
```

### 7.2 Recommended Enhancements

```typescript
// vite.config.ts - Enhanced configuration
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Dynamic chunking based on imports
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three';
            }
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            if (id.includes('react')) {
              return 'vendor';
            }
            // Mermaid and heavy deps - lazy load
            if (id.includes('mermaid') || id.includes('cytoscape') || id.includes('katex')) {
              return 'diagrams';
            }
          }
        }
      }
    },
    // Enable source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Target modern browsers
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
  },
  plugins: [
    react(),
    // Bundle analyzer (dev only)
    process.env.ANALYZE && visualizer({
      open: true,
      gzipSize: true,
    }),
  ].filter(Boolean),
});
```

### 7.3 Deployment Checklist (GitHub Pages)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Checklist                          │
├─────────────────────────────────────────────────────────────────┤
│ [x] base: '/' configured in vite.config.ts                      │
│ [x] 404.html handling (React Router SPA)                        │
│ [ ] Cache headers for static assets                             │
│ [ ] Compression (gzip/brotli) via CDN                           │
│ [ ] HTTPS enforced                                              │
│ [ ] Performance monitoring (Web Vitals)                         │
│ [ ] Error tracking integration                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Roadmap

### Phase 1: Quick Wins (Week 1)
- [ ] Extract `useIsMobile` hook from Index.tsx
- [ ] Add Intersection Observer to pause Three.js when offscreen
- [ ] Implement reduced motion media query support
- [ ] Add critical CSS inlining

### Phase 2: Component Refactoring (Week 2)
- [ ] Create `/components/layout/` directory
- [ ] Extract Footer from Index.tsx
- [ ] Create `/components/landing/` directory structure
- [ ] Refactor hero components

### Phase 3: Performance Optimization (Week 3)
- [ ] Implement Three.js device capability detection
- [ ] Add static fallback for low-end devices
- [ ] Optimize images with WebP/AVIF formats
- [ ] Add preload hints for critical resources

### Phase 4: Optional Framer Motion (Week 4)
- [ ] Evaluate scroll-linked animation needs
- [ ] If needed: Add Framer Motion for specific interactions
- [ ] Implement AnimatePresence for route transitions

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Three.js breaks on old devices | Medium | High | Capability detection + fallback |
| Animation jank on mobile | Medium | Medium | Use `will-change` sparingly, prefer transforms |
| Bundle size growth | Low | Medium | Strict chunking, tree-shaking |
| SEO impact from SPA | Low | High | Proper meta tags, structured data |
| CLS from lazy loading | Medium | Medium | Reserve space with aspect ratios |

---

## 10. Appendix

### A. File Structure (Post-Refactor)

```
src/
├── components/
│   ├── ui/                        # shadcn/ui (no changes)
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Section.tsx
│   │   └── index.ts
│   ├── landing/
│   │   ├── hero/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── TorusKnot.tsx
│   │   │   ├── HeroContent.tsx
│   │   │   ├── ScrollIndicator.tsx
│   │   │   ├── StaticHeroFallback.tsx
│   │   │   └── index.ts
│   │   ├── social-proof/
│   │   │   ├── TestimonialMoments.tsx
│   │   │   ├── TestimonialCard.tsx
│   │   │   ├── FeaturedInstructors.tsx
│   │   │   ├── InstructorCard.tsx
│   │   │   └── index.ts
│   │   ├── conversion/
│   │   │   ├── ExclusivityBanner.tsx
│   │   │   ├── EmailSignupSection.tsx
│   │   │   ├── EmailSignupForm.tsx
│   │   │   └── index.ts
│   │   └── narrative/
│   │       ├── CaseStudyNarrative.tsx
│   │       └── index.ts
│   └── shared/
│       ├── OptimizedImage.tsx
│       ├── AnimatedSection.tsx
│       └── index.ts
├── hooks/
│   ├── useIsMobile.ts
│   ├── useInView.ts
│   ├── useReducedMotion.ts
│   ├── useOGMeta.ts
│   └── index.ts
├── lib/
│   ├── utils.ts
│   ├── og-meta.ts
│   └── device-capability.ts       # NEW: WebGL/device detection
├── pages/
│   └── Index.tsx                  # Slim composition file
└── data/
    └── skills.json
```

### B. Key Dependencies (Current)

```json
{
  "three": "^0.156.1",              // 3D rendering
  "@react-three/fiber": "^8.18.0", // React integration
  "@react-three/drei": "^9.122.0", // Helpers
  "tailwindcss": "^3.4.11",        // Styling
  "tailwindcss-animate": "^1.0.7"  // Animation utilities
}
```

### C. References

- [Web Vitals](https://web.dev/vitals/)
- [Three.js Performance Tips](https://threejs.org/manual/#en/optimize-lots-of-objects)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [Framer Motion](https://www.framer.com/motion/)

---

**Document Status:** Ready for review
**Next Steps:** Stakeholder approval, then Phase 1 implementation
