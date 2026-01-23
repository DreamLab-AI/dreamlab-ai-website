# Architecture & Feature Document (AFD)
## DreamLab AI Landing Page Redesign

**Version:** 1.0
**Date:** 2026-01-23
**Author:** Multi-Agent Swarm (Claude Flow v3)
**Related PRD:** PRD-landing-page-redesign.md

---

## 1. Technical Architecture Overview

### 1.1 Current Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Stack                           │
├─────────────────────────────────────────────────────────────────┤
│  React 18        │  Vite          │  TypeScript                │
│  @react-three    │  Three.js      │  Tailwind CSS             │
│  shadcn/ui       │  lucide-react  │  React Router DOM         │
│  @tanstack/query │  Framer Motion │  clsx/tailwind-merge      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Build Configuration

| Tool | Version | Purpose |
|------|---------|---------|
| Vite | 5.x | Build tool, dev server, HMR |
| SWC | - | Fast Rust-based transpilation |
| PostCSS | - | Tailwind processing |
| TypeScript | 5.x | Type safety |

### 1.3 Deployment

- **Platform:** Vercel (inferred from URL)
- **Branch:** `feature/browser-automation-integration`
- **Build command:** `npm run build`
- **Output:** `/dist` (static files)

---

## 2. Component Architecture

### 2.1 Current Component Tree (Local Repo)

```
src/
├── App.tsx                    # Router configuration
├── pages/
│   ├── Index.tsx              # Landing page (focus of redesign)
│   ├── Team.tsx               # Team page
│   ├── ResidentialTraining.tsx # Training programs
│   ├── WorkshopIndex.tsx      # Workshop listing
│   ├── WorkshopPage.tsx       # Individual workshop
│   ├── Work.tsx               # Portfolio/previous work
│   ├── Contact.tsx            # Contact form
│   ├── Privacy.tsx            # Privacy policy
│   ├── SystemDesign.tsx       # System design page
│   └── ResearchPaper.tsx      # Research paper
├── components/
│   ├── Header.tsx             # Site header/nav
│   ├── TorusKnot.tsx          # 3D visualization
│   ├── EmailSignupForm.tsx    # Email capture
│   ├── TestimonialMoments.tsx # Testimonials
│   ├── FeaturedInstructors.tsx # Instructor profiles
│   ├── ExclusivityBanner.tsx  # Scarcity/exclusivity
│   ├── CaseStudyNarrative.tsx # Case study section
│   └── ui/                    # shadcn/ui components
├── hooks/
│   └── useOGMeta.tsx          # OG meta tag management
├── lib/
│   ├── og-meta.ts             # OG configuration
│   └── utils.ts               # Utility functions
└── data/
    └── skills.json            # Skills data for TorusKnot
```

### 2.2 Proposed Component Tree (Redesign)

```
src/
├── pages/
│   └── Index.tsx              # REDESIGNED landing page
│       ├── HeroSection
│       │   ├── Headline
│       │   ├── Subheadline
│       │   ├── PrimaryCTA
│       │   ├── TrustBar
│       │   └── HeroVisual (TorusKnot or static)
│       ├── SocialProofSection
│       │   ├── CompanyLogos
│       │   └── TestimonialCarousel
│       ├── ValuePropSection
│       │   ├── WhatYouWalkAway
│       │   └── UseCaseCards
│       ├── InstructorSection
│       │   ├── InstructorPortrait
│       │   ├── InstructorBio
│       │   └── CredentialsList
│       ├── QualificationSection
│       │   ├── WhoThisIsFor
│       │   └── WhoThisIsNotFor
│       ├── PricingSection
│       │   ├── PriceDisplay
│       │   ├── ValueStack
│       │   ├── GuaranteeCard
│       │   └── PricingCTA
│       ├── FAQSection
│       │   └── FAQAccordion
│       └── FooterCTA
│           ├── FinalCTA
│           └── EmailCapture
└── components/
    ├── landing/               # NEW: Landing-specific components
    │   ├── HeroSection.tsx
    │   ├── TrustBar.tsx
    │   ├── ValuePropCard.tsx
    │   ├── TestimonialCard.tsx
    │   ├── QualificationGrid.tsx
    │   ├── PricingCard.tsx
    │   ├── GuaranteeCard.tsx
    │   └── FAQAccordion.tsx
    └── shared/                # Reusable across pages
        ├── Header.tsx
        ├── Footer.tsx
        ├── Button.tsx
        └── SectionWrapper.tsx
```

---

## 3. Feature Specifications

### 3.1 Hero Section

**Component:** `HeroSection.tsx`

```typescript
interface HeroSectionProps {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  trustItems: TrustItem[];
  visualType: 'torusknot' | 'diagram' | 'image';
  visualSrc?: string;
}

interface TrustItem {
  type: 'logo' | 'stat' | 'badge';
  content: string;
  imageUrl?: string;
}
```

**Behavior:**
- Parallax scroll effect on visual (disabled on mobile)
- CTA button with hover animation
- Trust bar animates in on load (0.3s delay)
- Responsive: stacks vertically on mobile

**Performance:**
- TorusKnot lazy-loaded with Suspense
- Image hero uses `loading="eager"` for LCP
- Critical CSS inlined

### 3.2 Trust Bar

**Component:** `TrustBar.tsx`

```typescript
interface TrustBarProps {
  logos: CompanyLogo[];
  fallbackText?: string;
}

interface CompanyLogo {
  name: string;
  src: string;
  alt: string;
}
```

**Behavior:**
- Horizontal scroll on mobile if >4 logos
- Grayscale filter with hover color reveal
- Accessible: logos have alt text

### 3.3 Testimonial Section

**Component:** `TestimonialCarousel.tsx`

```typescript
interface TestimonialCarouselProps {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}
```

**Behavior:**
- Auto-advance every 5 seconds (pauses on hover)
- Touch swipe on mobile
- Keyboard navigable (arrow keys)
- Dots indicator for position

### 3.4 Qualification Grid

**Component:** `QualificationGrid.tsx`

```typescript
interface QualificationGridProps {
  forItems: QualificationItem[];
  notForItems: QualificationItem[];
}

interface QualificationItem {
  text: string;
  isPositive: boolean;
}
```

**Behavior:**
- Two-column layout on desktop
- Stacked on mobile
- Icons: checkmark (green) for positive, X (red) for negative
- Fade-in animation on scroll into view

### 3.5 Pricing Section

**Component:** `PricingSection.tsx`

```typescript
interface PricingSectionProps {
  price: number;
  currency: string;
  valueItems: ValueItem[];
  guaranteeText: string;
  ctaText: string;
  ctaLink: string;
}

interface ValueItem {
  title: string;
  value: number;
  description?: string;
}
```

**Behavior:**
- Price animates on scroll into view
- Value stack items animate sequentially
- Total calculated and displayed
- CTA sticky on mobile (optional)

### 3.6 FAQ Accordion

**Component:** `FAQAccordion.tsx`

```typescript
interface FAQAccordionProps {
  items: FAQItem[];
  allowMultiple?: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
}
```

**Behavior:**
- One open at a time (default) or multiple
- Smooth height animation (0.3s ease)
- Keyboard accessible (Enter/Space to toggle)
- Schema.org FAQ markup for SEO

---

## 4. Data Flow

### 4.1 Static Data Sources

```typescript
// src/data/landing.ts
export const landingContent = {
  hero: {
    headline: "Build Production-Grade AI Agents...",
    subheadline: "In one day, walk away with...",
    ctaText: "Get the AI Agent Masterclass →",
    ctaLink: "/get-started"
  },

  trust: {
    logos: [/* CompanyLogo[] */],
    fallback: "Join 50+ technical leaders..."
  },

  valueProps: [
    { title: "A working setup on your computer", icon: "laptop" },
    { title: "A real agent you can run on demand", icon: "play" },
    { title: "The ability to build your own agents", icon: "hammer" }
  ],

  useCases: [
    { title: "Support triage assistant", input: "...", output: "..." },
    // ...
  ],

  instructor: {
    name: "Dr John O'Hare",
    title: "Founder at Dreamlab",
    bio: "I'm John. I build practical AI systems...",
    credentials: [/* string[] */],
    imageSrc: "/images/john-ohare.jpg"
  },

  pricing: {
    price: 2999,
    currency: "GBP",
    valueItems: [
      { title: "Starter repo + project structure", value: 750 },
      { title: "Terminal quickstart", value: 200 },
      // ...
    ],
    guarantee: "I want this to feel like a safe decision for you."
  },

  faq: [
    { question: "What is an AI agent, in plain English?", answer: "..." },
    // ...
  ],

  qualification: {
    forItems: [
      "An ops lead, RevOps lead, systems person, technical founder",
      "Comfortable following steps in a terminal",
      // ...
    ],
    notForItems: [
      "Want general ChatGPT productivity tips",
      "Cannot use a terminal at all",
      // ...
    ]
  }
};
```

### 4.2 Component Data Consumption

```
┌─────────────────────────────────────────────────────────────────┐
│                          Index.tsx                              │
│                                                                 │
│  import { landingContent } from '@/data/landing'                │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   HeroSection   │    │  TrustBar       │                    │
│  │ {...hero}       │    │ {...trust}      │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ ValuePropSection│    │ UseCaseSection  │                    │
│  │ {...valueProps} │    │ {...useCases}   │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │InstructorSection│    │QualificationGrid│                    │
│  │ {...instructor} │    │{...qualification}│                   │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ PricingSection  │    │  FAQAccordion   │                    │
│  │ {...pricing}    │    │ {...faq}        │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Styling Architecture

### 5.1 Tailwind Configuration Extensions

```typescript
// tailwind.config.ts additions
{
  theme: {
    extend: {
      colors: {
        'dreamlab': {
          'bg': '#0F0F23',
          'surface': '#1A1A2E',
          'accent': '#8B5CF6',
          'cta': '#E97B35',
          'text': '#FFFFFF',
          'muted': '#B4B4B4',
        }
      },
      fontFamily: {
        'heading': ['Space Grotesk', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '15px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'trust-slide': 'trustSlide 0.5s ease-out 0.3s backwards',
      },
    }
  }
}
```

### 5.2 CSS Custom Properties

```css
/* src/index.css */
:root {
  /* Light theme (if used) */
  --bg-primary: #F5F5F0;
  --bg-surface: #FFFFFF;
  --accent-primary: #E97B35;
  --text-primary: #1A1A1A;
}

.dark {
  /* Dark theme (recommended) */
  --bg-primary: #0F0F23;
  --bg-surface: #1A1A2E;
  --accent-primary: #8B5CF6;
  --accent-cta: #E97B35;
  --text-primary: #FFFFFF;
  --text-secondary: #B4B4B4;
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
}
```

### 5.3 Component Styling Patterns

**Glassmorphism Card:**
```tsx
<div className="
  bg-white/[0.08]
  backdrop-blur-glass
  border border-white/[0.12]
  rounded-2xl
  p-8
">
  {/* content */}
</div>
```

**CTA Button:**
```tsx
<button className="
  bg-gradient-to-r from-purple-600 to-purple-500
  hover:from-purple-500 hover:to-purple-400
  text-white font-semibold
  px-8 py-4 rounded-lg
  transform hover:scale-105
  transition-all duration-300
  shadow-lg shadow-purple-500/25
">
  {ctaText}
</button>
```

---

## 6. Performance Architecture

### 6.1 Code Splitting Strategy

```typescript
// App.tsx - Existing lazy loading
const Index = lazy(() => import("./pages/Index"));
const Team = lazy(() => import("./pages/Team"));
// ... other pages

// Index.tsx - Component-level splitting for heavy components
const TorusKnot = lazy(() => import("@/components/TorusKnot"));

// Usage with Suspense
<Suspense fallback={<HeroFallback />}>
  <TorusKnot skills={skills} />
</Suspense>
```

### 6.2 Image Optimization

```typescript
// Use Vite's image optimization
import heroImage from '@/assets/hero-diagram.webp?w=1200&format=webp';

// Responsive images
<picture>
  <source
    media="(min-width: 1024px)"
    srcSet={heroImageLg}
  />
  <source
    media="(min-width: 768px)"
    srcSet={heroImageMd}
  />
  <img
    src={heroImageSm}
    alt="AI Agent Architecture"
    loading="eager"
    fetchPriority="high"
  />
</picture>
```

### 6.3 Font Loading

```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap"
  rel="stylesheet"
>
```

### 6.4 Three.js Performance

```typescript
// TorusKnot.tsx optimizations
<Canvas
  frameloop="demand"        // Only render on changes
  dpr={[1, 2]}              // Limit device pixel ratio
  gl={{
    powerPreference: "high-performance",
    antialias: false        // Disable on mobile
  }}
  performance={{ min: 0.5 }} // Adaptive performance
>
```

---

## 7. SEO & Meta Architecture

### 7.1 Open Graph Configuration

```typescript
// src/lib/og-meta.ts
export const PAGE_OG_CONFIGS = {
  home: {
    title: "AI Agent Masterclass | DreamLab AI",
    description: "Build production-grade AI agents that outperform standard Anthropic tools by 30%. 1-day intensive training with Dr. John O'Hare.",
    image: "/og/home.png",
    type: "website"
  },
  // ... other pages
};
```

### 7.2 Structured Data

```tsx
// Index.tsx - Add FAQ Schema
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }))
})}
</script>
```

---

## 8. Analytics Integration

### 8.1 Event Tracking

```typescript
// src/lib/analytics.ts
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  // Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }
};

// Usage
trackEvent('cta_click', {
  location: 'hero',
  cta_text: 'Get the AI Agent Masterclass'
});
```

### 8.2 Conversion Tracking

```typescript
// Track key conversion points
const conversionEvents = {
  hero_cta_click: 'click_hero_cta',
  pricing_cta_click: 'click_pricing_cta',
  footer_cta_click: 'click_footer_cta',
  email_signup: 'submit_email',
  faq_expand: 'expand_faq',
};
```

---

## 9. Accessibility Architecture

### 9.1 Semantic Structure

```html
<main id="main-content">
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">...</h1>
  </section>

  <section aria-labelledby="value-heading">
    <h2 id="value-heading">What You'll Walk Away With</h2>
  </section>

  <!-- ... -->
</main>
```

### 9.2 Focus Management

```typescript
// Skip link already exists
<a
  href="#main-content"
  className="sr-only focus:not-sr-only..."
>
  Skip to main content
</a>

// Ensure all interactive elements are focusable
// Tab order follows visual order
// Focus visible styles maintained
```

---

## 10. Testing Strategy

### 10.1 Component Tests

```typescript
// __tests__/components/HeroSection.test.tsx
describe('HeroSection', () => {
  it('renders headline and CTA', () => {
    render(<HeroSection {...mockProps} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /masterclass/i })).toBeInTheDocument();
  });

  it('displays trust bar items', () => {
    render(<HeroSection {...mockProps} />);
    expect(screen.getAllByRole('img')).toHaveLength(mockProps.trustItems.length);
  });
});
```

### 10.2 Visual Regression

```typescript
// Use Playwright for visual testing
test('landing page visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing-page.png', {
    fullPage: true,
    animations: 'disabled'
  });
});
```

---

## 11. Deployment Considerations

### 11.1 Environment Variables

```bash
# .env.local
VITE_GA_ID=G-XXXXXXXXXX
VITE_SITE_URL=https://dreamlab-website.vercel.app
```

### 11.2 Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
});
```

---

## 12. Migration Path

### 12.1 Phase 1: Component Creation
1. Create new `/components/landing/` directory
2. Build individual section components
3. Create `/data/landing.ts` with content

### 12.2 Phase 2: Index Page Replacement
1. Backup existing `Index.tsx`
2. Replace with new implementation
3. Preserve routing and lazy loading

### 12.3 Phase 3: Integration
1. Update Header navigation
2. Ensure consistent styling across pages
3. Test all routes

---

*Document generated by Claude Flow v3 multi-agent swarm*
