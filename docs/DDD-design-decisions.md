# Design Decision Document (DDD)
## DreamLab AI Landing Page Redesign

**Version:** 1.0
**Date:** 2026-01-23
**Author:** Multi-Agent Swarm (Claude Flow v3)
**Related Documents:** PRD-landing-page-redesign.md, AFD-landing-page-architecture.md

---

## 1. Executive Design Summary

This document captures the key design decisions for the DreamLab AI landing page redesign, including rationale, alternatives considered, and implementation guidance.

---

## 2. Design Decisions

### DD-001: Theme Direction

**Decision:** Implement **dark glassmorphism theme** as primary, with light theme as configurable alternative.

**Context:**
- Current live site uses light theme with warm grey (#F5F5F0) and illustrated style
- Local repository uses dark theme with 3D TorusKnot visualization
- Target audience: CTOs, tech leads, developers

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **A. Dark Glassmorphism** | Premium feel, tech-forward, differentiates from commodity trainers, aligns with developer aesthetic | May feel less approachable to non-technical |
| B. Light Minimal (current live) | Clean, approachable, established brand | Generic, doesn't signal technical sophistication |
| C. Hybrid (light hero, dark sections) | Best of both | Complex to maintain, inconsistent |

**Rationale:**
1. Target audience (CTOs, tech leads) associates dark themes with technical credibility
2. Glassmorphism signals modern, premium offering
3. Differentiates from generic business training providers
4. Supports the £2999 price point perception

**Implementation:**
```css
.dark {
  --bg-primary: #0F0F23;
  --bg-surface: #1A1A2E;
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --accent-primary: #8B5CF6;
  --accent-cta: #E97B35;
}
```

**Risk Mitigation:**
- Provide theme toggle for user preference
- Ensure WCAG AA contrast compliance
- Test with stakeholder before full rollout

---

### DD-002: Hero Visual Element

**Decision:** Replace generic illustrated workbench with **architectural diagram** showing multi-agent system.

**Context:**
- Current live site has hand-drawn illustration of workbench with laptop
- Local repo has 3D TorusKnot visualization
- Target audience wants to see technical substance, not decoration

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. Keep illustrated style | Brand consistency, approachable | Doesn't signal technical depth |
| B. 3D TorusKnot | Visually impressive, unique | Performance concerns, may distract from value prop |
| **C. Architectural diagram** | Signals technical credibility, shows what they'll learn | Requires custom creation |
| D. Authentic workshop photo | Social proof, real | May not have suitable photos |

**Rationale:**
1. CTOs/tech leads respond to technical diagrams over decorative illustrations
2. Diagram can be reused in marketing materials
3. Shows the actual architecture participants will learn
4. Less performance overhead than 3D visualization

**Implementation:**
- Create SVG diagram showing: User → Agent Orchestrator → Multiple Agents → Tools/APIs
- Animate subtly on load (connections drawing in)
- Provide static fallback for reduced motion preference

**Fallback:**
If architectural diagram unavailable in Phase 1, use the 3D TorusKnot with performance optimizations, then replace in Phase 2.

---

### DD-003: Social Proof Strategy

**Decision:** Prioritize **outcome-based trust signals** over company logos initially.

**Context:**
- No company logos currently available
- No participant testimonials readily available
- Have Jojo Crago quote from LinkedIn post
- Need to build trust for £2999 purchase

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. Wait for logos/testimonials | Most credible | Delays launch |
| **B. Outcome-based trust signals** | Achievable now, still builds trust | Less concrete |
| C. Instructor credentials only | Available now | Single point of trust |

**Implementation:**

**Phase 1 (Immediate):**
```
"Join 50+ technical leaders who've built production agents"
```
- Position below hero CTA
- Use neutral language that doesn't overstate

**Phase 2 (With testimonials):**
```tsx
<TestimonialCard
  quote="AI is moving from chat to agents."
  author="Jojo Crago"
  role="AI Consultant"
  company="Independent"
/>
```

**Phase 3 (With company logos):**
```tsx
<TrustBar
  title="Trusted by engineers from"
  logos={[/* Company logos */]}
/>
```

**Action Items:**
1. Reach out to past participants for testimonials
2. Request logo permissions from participant employers
3. Track conversion rates at each phase to measure trust impact

---

### DD-004: CTA Strategy

**Decision:** Single primary CTA above fold with **"Get the AI Agent Masterclass →"** text, leading to booking flow.

**Context:**
- Current live site has "Get started" header button and "Get the AI Agent Masterclass now" hero CTA
- Multiple competing CTAs can reduce conversion
- Need to minimize friction for £2999 decision

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. "Get started" (current header) | Action-oriented | Vague, unclear what happens |
| **B. "Get the AI Agent Masterclass →"** | Clear, outcome-focused | Longer text |
| C. "Book Your Spot" | Creates urgency | Less specific |
| D. "Apply Now" | Implies selectivity | May add friction |

**Rationale:**
1. Matches the primary product name (AI Agent Masterclass)
2. Arrow indicates progression
3. Consistent with current live site (proven copy)

**Implementation:**
```tsx
// Header CTA (always visible)
<Button variant="cta" asChild>
  <Link to="/get-started">Get started</Link>
</Button>

// Hero CTA (primary conversion point)
<Button variant="cta" size="lg" asChild>
  <Link to="/get-started">
    Get the AI Agent Masterclass →
  </Link>
</Button>

// Urgency subtext
<span className="text-sm text-muted-foreground mt-2">
  Limited to 15 participants per cohort
</span>
```

**Secondary CTAs (below fold):**
- "Book a call →" - After pricing section
- "Book the call now" - Footer

---

### DD-005: Pricing Visibility

**Decision:** Keep pricing **below fold** but make it **easily findable** with scroll anchor.

**Context:**
- £2999 is significant investment
- Showing price too early may cause bounce before value is communicated
- Hiding price may seem deceptive to technical audience

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. Price in hero | Full transparency | May bounce before understanding value |
| **B. Price below fold with clear path** | Build value first, easy to find | Extra scroll required |
| C. Price only on dedicated page | Maximum value build | Feels hidden, frustrating |

**Rationale:**
1. Technical audience appreciates value explanation before price
2. Current live site structure works well (price after value props)
3. "What's included" section justifies the investment

**Implementation:**
```tsx
// Header includes "Pricing" link
<nav>
  <a href="#pricing">Pricing</a>
</nav>

// Pricing section has id
<section id="pricing">
  <PricingSection price={2999} ... />
</section>
```

---

### DD-006: Typography System

**Decision:** Use **Space Grotesk for headings** and **DM Sans for body text**.

**Context:**
- Need modern, technical feel
- Must be highly readable
- Free Google Fonts for no licensing issues

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. Inter (default) | Ubiquitous, highly readable | Generic, overused |
| **B. Space Grotesk + DM Sans** | Technical feel, good pairing | Less familiar |
| C. System fonts only | Fast loading, no FOUT | Generic appearance |
| D. Geist (Vercel) | Modern, technical | May have licensing concerns |

**Rationale:**
1. Space Grotesk has geometric, technical character
2. DM Sans is highly readable for body text
3. Both are free Google Fonts
4. Recommended by UI/UX Pro Max skill for "Tech Startup" products

**Implementation:**
```css
/* Font loading */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

/* Tailwind config */
fontFamily: {
  'heading': ['Space Grotesk', 'system-ui', 'sans-serif'],
  'body': ['DM Sans', 'system-ui', 'sans-serif'],
}
```

---

### DD-007: 3D Visualization Strategy

**Decision:** **Defer to team consultation** - use architectural diagram/static hero for initial launch, explore enhanced 3D solution collaboratively.

**Context:**
- TorusKnot has potential but needs refinement
- QE audit found memory leaks (CanvasTexture not disposed, Vector3 allocations in useFrame)
- QE audit found excessive re-renders (setNodeSkills inside useFrame)
- UI/UX Pro Max skill rates 3D/Hyperrealism performance as "❌ Poor"
- Team input needed for production-quality 3D experience

**Alternatives Considered:**

| Option | Pros | Cons |
|--------|------|------|
| A. Remove entirely | Simplicity, performance | Loses unique element |
| B. Keep as-is | Quick, visual interest | Memory leaks, poor mobile |
| C. Fix & enhance with shaders | Premium feel, eye candy | Complex, still poor mobile |
| **D. Team consultation + static fallback** | Best quality outcome | Requires team time |

**Current Issues (from QE Audit):**
1. CanvasTexture never disposed → memory leak
2. `new THREE.Vector3()` in every useFrame → GC pressure
3. `setNodeSkills` inside useFrame → React re-renders
4. `state.invalidate()` called unconditionally
5. No disposal cleanup on unmount

**Implementation (Phase 1 - Static Hero):**
```tsx
// Use architectural diagram SVG as hero visual
// Shows multi-agent system architecture
// Aligns with PRD recommendation (DD-002)
const HeroVisual = () => (
  <div className="relative w-full h-full">
    <ArchitecturalDiagram
      className="w-full max-w-2xl mx-auto"
      animate={!prefersReducedMotion}
    />
  </div>
);
```

**Phase 2 - Team Consultation:**
- Discuss WebGL shader options (aurora, particle systems, neural network viz)
- Evaluate GSAP/Framer Motion alternatives for lighter eye candy
- Consider pre-rendered video/Lottie as middle ground
- Set performance budget: <100ms frame time, <50MB memory

**Team Questions:**
1. What visual metaphor best represents "AI agents"?
2. Budget for custom 3D development vs. pre-made solutions?
3. Target devices - mobile parity or desktop-first?

---

### DD-008: Navigation Structure

**Decision:** Simplify navigation to **5 primary items** focused on conversion path.

**Context:**
- Current local repo has complex nav with submenus
- Too many options dilutes conversion focus
- Need clear path to "Get the AI Agent Masterclass"

**Current Navigation (Local Repo):**
- Home
- Team
- Residential Training (with submenu)
- Workshops (with submenu)
- Previous Work
- System Design
- Contact

**Proposed Navigation:**
| Item | Target | Visibility |
|------|--------|------------|
| Home | `/` | Always |
| Masterclass | `/#about` (scroll) | Always |
| About Dr. John | `/team` or `/#instructor` | Always |
| Pricing | `/#pricing` | Always |
| **Get Started (CTA)** | `/get-started` | Always (styled as button) |

**Rationale:**
1. Reduces cognitive load
2. Every nav item supports conversion
3. "Residential Training" content can be consolidated or linked from Masterclass

**Implementation:**
```tsx
const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Masterclass', href: '/#about' },
  { label: 'About', href: '/#instructor' },
  { label: 'Pricing', href: '/#pricing' },
];

const ctaItem = { label: 'Get started', href: '/get-started' };
```

---

### DD-009: Mobile Experience

**Decision:** Implement **mobile-first responsive design** with specific mobile optimizations.

**Context:**
- Target audience (CTOs) may first see site on mobile
- Complex animations hurt mobile performance
- CTA must be easily tappable

**Mobile-Specific Decisions:**

| Element | Desktop | Mobile |
|---------|---------|--------|
| Hero visual | TorusKnot/Diagram | Static image |
| Parallax | Enabled | Disabled |
| Trust bar | Horizontal | Horizontal scroll |
| Testimonials | Carousel | Stacked |
| FAQ | Side-by-side Q/A | Accordion |
| CTA | Standard | Sticky bottom bar |

**Implementation:**
```tsx
// Sticky mobile CTA
<div className="
  fixed bottom-0 left-0 right-0
  md:hidden
  p-4 bg-background/95 backdrop-blur
  border-t border-border
  z-50
">
  <Button className="w-full" size="lg">
    Get the Masterclass →
  </Button>
</div>
```

---

### DD-010: Color Accent Strategy

**Decision:** Use **purple (#8B5CF6) as primary accent** with **orange (#E97B35) for CTAs**.

**Context:**
- Current live site uses orange (#E97B35) for CTAs
- Local repo uses purple/blue gradients
- Need high-contrast CTAs that draw attention

**Rationale:**
1. Purple connotes premium, innovation, creativity
2. Orange CTAs stand out against both light and dark backgrounds
3. Two-color accent system creates visual hierarchy
4. Orange inherited from live site maintains some brand continuity

**Color System:**
```css
/* Accent hierarchy */
--accent-primary: #8B5CF6;    /* Links, highlights, secondary elements */
--accent-cta: #E97B35;        /* Primary CTAs, urgent elements */
--accent-success: #10B981;    /* Checkmarks, positive indicators */
--accent-error: #EF4444;      /* X marks, negative indicators */
```

---

## 3. Design Principles

Based on the above decisions, these principles guide implementation:

### P1: Technical Credibility First
Every design element should reinforce that this is serious technical training, not generic business coaching.

### P2: Conversion Over Decoration
Visual elements must serve the conversion goal. Remove anything that doesn't build trust or move toward CTA.

### P3: Performance Is Design
A slow page destroys trust. Performance budgets are design constraints.

### P4: Mobile Parity
Mobile experience must be first-class, not a degraded desktop experience.

### P5: Accessibility Is Non-Negotiable
WCAG AA compliance is minimum. Design must work for all users.

---

## 4. Design System Tokens

### 4.1 Color Tokens

```css
:root {
  /* Background */
  --color-bg-primary: #0F0F23;
  --color-bg-surface: #1A1A2E;
  --color-bg-elevated: #252542;

  /* Glass */
  --color-glass-bg: rgba(255, 255, 255, 0.08);
  --color-glass-border: rgba(255, 255, 255, 0.12);
  --color-glass-blur: 15px;

  /* Text */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B4B4B4;
  --color-text-muted: #666680;

  /* Accent */
  --color-accent-primary: #8B5CF6;
  --color-accent-primary-hover: #A78BFA;
  --color-accent-cta: #E97B35;
  --color-accent-cta-hover: #F59E0B;

  /* Semantic */
  --color-success: #10B981;
  --color-error: #EF4444;
  --color-warning: #F59E0B;
}
```

### 4.2 Typography Tokens

```css
:root {
  /* Font families */
  --font-heading: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  /* Font sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  --text-5xl: 3rem;      /* 48px */
  --text-6xl: 3.75rem;   /* 60px */

  /* Line heights */
  --leading-tight: 1.1;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### 4.3 Spacing Tokens

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
}
```

### 4.4 Animation Tokens

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;

  /* Easings */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 5. Component Variants

### 5.1 Button Variants

| Variant | Use Case | Style |
|---------|----------|-------|
| `primary` | Main CTAs | Orange bg, white text |
| `secondary` | Secondary actions | Transparent, purple border |
| `ghost` | Tertiary actions | Transparent, text only |
| `link` | Inline links | Purple text, underline on hover |

### 5.2 Card Variants

| Variant | Use Case | Style |
|---------|----------|-------|
| `glass` | Feature cards, value props | Glassmorphism effect |
| `solid` | Pricing, guarantees | Solid surface color |
| `outline` | FAQ items, lists | Border only |

---

## 6. Decision Log

| Date | Decision | Made By | Rationale |
|------|----------|---------|-----------|
| 2026-01-23 | Dark glassmorphism theme | Swarm | Technical audience preference |
| 2026-01-23 | Architectural diagram hero | Swarm | Technical credibility |
| 2026-01-23 | Space Grotesk + DM Sans | Swarm | UI/UX Pro Max recommendation |
| 2026-01-23 | Conditional TorusKnot | Swarm | Performance/uniqueness balance |
| 2026-01-23 | Simplified navigation | Swarm | Conversion focus |

---

## 7. Open Questions for Stakeholder

1. **Theme preference:** Dark glassmorphism (recommended) or keep light theme?
2. **Company logos:** Any companies we can get permission from?
3. **Testimonials:** Can we reach out to past participants?
4. **Pricing display:** Keep below fold or move to hero?
5. **TorusKnot:** Keep, remove, or replace with diagram?

---

*Document generated by Claude Flow v3 multi-agent swarm with design intelligence from UI/UX Pro Max skill*
