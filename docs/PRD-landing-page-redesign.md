# Product Requirements Document (PRD)
## DreamLab AI Landing Page Redesign

**Version:** 1.0
**Date:** 2026-01-23
**Author:** Multi-Agent Swarm (Claude Flow v3)
**Status:** Draft for Review

---

## 1. Executive Summary

### 1.1 Problem Statement

The current DreamLab website exists in two divergent states:
- **Live Vercel Site** (`dreamlab-website.vercel.app`): Minimal, light-themed, illustrated style focused on "AI Agent Masterclass"
- **Local Repository** (`feature/browser-automation-integration` branch): Dark-themed, 3D TorusKnot visualization focused on "residential training" programs

This disconnect creates brand confusion and fails to leverage the key differentiator: **30% better performance than standard Anthropic tools** for deep agentic AI training.

### 1.2 Objective

Unify and enhance the landing page to:
1. Clearly communicate the £2999 AI Agent Masterclass value proposition
2. Convert CTOs, tech leads, and technical founders
3. Maintain design consistency across all site pages
4. Incorporate conversion optimization best practices

### 1.3 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Above-fold CTA click rate | Unknown | >15% |
| Time to first CTA | ~5s scroll | <2s (visible on load) |
| Trust signal visibility | Below fold | Above fold |
| Mobile conversion parity | Unknown | Within 5% of desktop |

---

## 2. Target Audience

### 2.1 Primary Persona: Technical Decision Maker

**Profile:**
- Role: CTO, VP Engineering, Technical Founder, RevOps Lead
- Company: 50-500 employees
- Budget authority: £3k-10k for training
- Technical comfort: Can follow terminal commands
- Pain point: Moving from "AI experiments" to "AI doing work"

**Motivations:**
- Build production-ready AI agents (not toys)
- Tangible ROI within weeks
- Learn frameworks they can extend
- Reduce dependency on AI consultants

**Objections:**
- "Is this just ChatGPT prompting tips?"
- "Will this work with our data/tools?"
- "£2999 is significant - what's the guarantee?"
- "Who is Dr. John O'Hare?"

### 2.2 Secondary Persona: Team Lead

**Profile:**
- Role: Engineering Manager, Systems Lead
- Bringing 2-6 team members
- Needs to justify training to leadership
- Wants recorded sessions for absent members

---

## 3. Competitive Analysis

### 3.1 Current Live Site Strengths

| Element | Implementation | Rating |
|---------|----------------|--------|
| Value proposition | "Build AI agents for your business, in a day" | ⭐⭐⭐⭐ |
| Instructor credibility | Dr. John O'Hare bio with credentials | ⭐⭐⭐⭐ |
| Use case examples | 5 specific automations (support triage, etc.) | ⭐⭐⭐⭐⭐ |
| Who this is for/not for | Clear qualification criteria | ⭐⭐⭐⭐⭐ |
| Bonus value stack | 6 items totaling £2,350 | ⭐⭐⭐⭐ |
| Risk reversal | "My guarantee" section | ⭐⭐⭐ |

### 3.2 Current Live Site Weaknesses

| Element | Issue | Impact |
|---------|-------|--------|
| Social proof | No company logos, no testimonials | High - reduces trust |
| Pricing | Not visible above fold | Medium - uncertainty |
| Differentiation | Missing "30% better than Anthropic" | High - no competitive edge |
| Urgency | No scarcity elements | Medium - delays decision |
| Technical credibility | Generic illustration, no architecture diagrams | High - doesn't resonate with CTOs |

### 3.3 Local Repository (Dark Theme) Analysis

**Strengths:**
- 3D TorusKnot visualization creates visual interest
- Dark glassmorphism is premium/tech-forward
- Multiple training programs show depth

**Weaknesses:**
- Focuses on "residential training" not "AI Agent Masterclass"
- Complex navigation dilutes conversion focus
- TorusKnot may distract from value proposition

---

## 4. Functional Requirements

### 4.1 Hero Section (Above the Fold)

**FR-001: Headline**
- Primary: "Build Production-Grade AI Agents That Outperform Standard Anthropic Tools by 30%"
- Alternative: "Learn how to build AI agents for your business, in a day"
- Must be visible within 1 second of page load
- Font: Space Grotesk Bold, 48-64px desktop, 32-40px mobile

**FR-002: Subheadline**
- Text: "In one day, walk away with a working agent, reusable templates, and frameworks to build the next one yourself."
- Must address outcome, not features
- Font: DM Sans Regular, 18-24px

**FR-003: Primary CTA**
- Text: "Get the AI Agent Masterclass →" or "Book Your Spot"
- Style: High-contrast button (#E97B35 orange on light, or purple gradient on dark)
- No competing secondary CTA above fold
- Subtext: "Limited to 15 participants per cohort"

**FR-004: Trust Bar**
- Position: Directly below or beside CTA
- Content: "Trusted by engineers from [Company logos]" (minimum 4-6 logos)
- If no logos available: "Join 50+ technical leaders who've built production agents"

**FR-005: Hero Visual**
- Option A: Architectural diagram of multi-agent system (technical credibility)
- Option B: Authentic workshop photo (social proof)
- NOT: Generic stock photos or purely decorative illustrations

### 4.2 Social Proof Section

**FR-006: Testimonials**
- Minimum 3 testimonials from past participants
- Format: Quote + Name + Role + Company + Headshot
- Placement: Early in page (before pricing)
- If testimonials unavailable: Use Jojo Crago quote with attribution

**FR-007: Company Logos**
- Display logos of companies whose engineers attended
- Grayscale treatment for visual cohesion
- Fallback: Industry badges or certifications

### 4.3 Value Proposition Section

**FR-008: "What You'll Walk Away With"**
Preserve existing strong content:
1. A working setup on your computer
2. A real agent you can run on demand
3. The ability to build your own agents

**FR-009: Use Case Examples**
Preserve existing:
- Support triage assistant
- Sales lead follow-up drafter
- Ops reporting helper
- Hiring screen helper
- Internal knowledge finder

### 4.4 Instructor Section

**FR-010: Dr. John O'Hare Profile**
- Illustrated portrait (keep existing style) OR professional photo
- "About me" narrative (existing copy is strong)
- Credentials bulleted list
- Clear positioning: "I'm not a 'tips and tricks' trainer"

### 4.5 Pricing Section

**FR-011: Pricing Display**
- Price: £2999 (clearly visible)
- Value stack: Show individual item values (existing implementation is good)
- Total value: "Worth £2,350+ in bonuses"
- CTA: "Book a call →"

**FR-012: Guarantee**
- Position: Near pricing
- Format: Orange-bordered card with guarantee badge
- Copy: Keep "I want this to feel like a safe decision"

### 4.6 Qualification Section

**FR-013: Who This Is For / Not For**
- Keep existing two-column layout
- Checkmarks (green) for ideal fit
- X marks (red) for not ideal
- This is conversion gold - DO NOT REMOVE

### 4.7 FAQ Section

**FR-014: FAQ Accordion**
- Keep existing questions
- Add: "How does this compare to other AI training?"
- Answer should include the 30% better claim

### 4.8 Footer CTA

**FR-015: Final Conversion Point**
- "Book the call now" CTA repeated
- Email capture form
- Social links

---

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-001: Load Time**
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.5s
- Core Web Vitals: All "Good"

**NFR-002: 3D Visualization (if retained)**
- Must not block main thread
- Fallback to static image on low-power devices
- Performance budget: <100ms frame time

### 5.2 Accessibility

**NFR-003: WCAG 2.1 AA Compliance**
- Color contrast: 4.5:1 minimum for text
- Keyboard navigation: All interactive elements focusable
- Screen reader: Semantic HTML, ARIA labels
- Reduced motion: Respect `prefers-reduced-motion`

### 5.3 Responsive Design

**NFR-004: Breakpoints**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+
- Hero content: Fully visible without scroll on all breakpoints

### 5.4 Browser Support

**NFR-005: Compatibility**
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No critical functionality broken on IE11 (graceful degradation)

---

## 6. Design Requirements

### 6.1 Design System Recommendation

Based on UI/UX Pro Max skill analysis and target audience:

**Primary Style:** Glassmorphism + Dark Mode (OLED-optimized)
- Signals premium, technical sophistication
- Aligns with developer/CTO aesthetic expectations
- Differentiates from commodity training providers

**Color Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | #0F0F23 | Page background |
| `--bg-surface` | #1A1A2E | Card backgrounds |
| `--glass-opacity` | rgba(255,255,255,0.08) | Glass effect |
| `--accent-primary` | #8B5CF6 | Primary buttons, links |
| `--accent-secondary` | #E97B35 | CTAs, highlights |
| `--text-primary` | #FFFFFF | Headlines |
| `--text-secondary` | #B4B4B4 | Body text |

**Typography:**
| Element | Font | Weight | Size |
|---------|------|--------|------|
| H1 | Space Grotesk | 700 | 48-64px |
| H2 | Space Grotesk | 600 | 36-48px |
| Body | DM Sans | 400 | 16-18px |
| CTA | DM Sans | 600 | 16px |

### 6.2 Alternative: Light Theme with Illustrations

If stakeholder prefers to keep live site aesthetic:

**Color Palette:**
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | #F5F5F0 | Page background |
| `--bg-surface` | #FFFFFF | Card backgrounds |
| `--accent-primary` | #E97B35 | Primary buttons, CTAs |
| `--text-primary` | #1A1A1A | Headlines, body |
| `--text-secondary` | #666666 | Muted text |

**Typography:**
- Keep existing font choices
- Ensure consistent sizing across pages

---

## 7. Integration Requirements

### 7.1 Site Navigation Consistency

**IR-001: Header Navigation**
Must be consistent across all pages:
- Home
- AI Agent Masterclass (primary)
- Team / About
- Previous Work (if relevant)
- Contact

**IR-002: Remove Conflicting Content**
- "Residential Training" page: Either remove or clearly differentiate
- "Workshops" page: Consolidate under Masterclass if same offering
- Prevent cannibalization of primary CTA

### 7.2 Technical Integration

**IR-003: Analytics**
- Google Analytics 4 event tracking on all CTAs
- Conversion tracking for "Book a call" clicks
- Scroll depth tracking

**IR-004: Email Capture**
- Integrate with existing EmailSignupForm component
- Store leads in CRM/email platform
- Consider exit-intent popup (optional)

---

## 8. Out of Scope (Phase 1)

- Complete site-wide redesign (focus on landing page)
- New backend functionality
- Payment/booking integration (handled externally)
- Blog/content section
- Multi-language support

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| No testimonials available | High | Medium | Use Jojo Crago quote, offer pilot discounts for testimonials |
| TorusKnot performance on mobile | Medium | Medium | Implement device detection, fallback to static image |
| Stakeholder prefers light theme | Low | Medium | Prepare both variants, A/B test if possible |
| Logo permission issues | Medium | Medium | Use "trusted by engineers from" language without logos |

---

## 10. Implementation Priority

### Phase 1: Critical (Week 1)
1. Hero section with strong headline + CTA
2. Trust bar/social proof
3. Instructor section
4. Pricing with guarantee

### Phase 2: Important (Week 2)
1. FAQ section
2. Use case examples
3. Who this is for/not for
4. Footer CTA

### Phase 3: Enhancement (Week 3+)
1. 3D visualization (if retained)
2. Testimonial carousel
3. Video embed
4. Exit-intent popup

---

## 11. Approval & Sign-off

| Stakeholder | Role | Approval |
|-------------|------|----------|
| Dr. John O'Hare | Founder | Pending |
| Design Lead | UX/UI | Pending |
| Engineering | Tech Lead | Pending |

---

## Appendix A: Competitive Headlines Analysis

| Competitor | Headline | Strength |
|------------|----------|----------|
| Anthropic Training | "Build with Claude" | Brand recognition |
| AI Agent Course X | "Master AI Agents in 5 Days" | Time-specific |
| **DreamLab (Proposed)** | "Build Production-Grade AI Agents That Outperform Standard Anthropic Tools by 30%" | Quantified differentiation + outcome |

## Appendix B: Z.AI Conversion Recommendations

Key insights from AI consultation:
1. **Above-fold priority order:** Headline → CTA → Trust anchors → Subheadline → Hero image
2. **Biggest conversion killer:** Buried credibility - move social proof above fold
3. **CTA copy test:** "Secure Your Spot" vs "Enroll Now" vs "Book Your Spot"
4. **Urgency element:** "Limited to 15 participants — Next cohort: [Date]"

## Appendix C: UI/UX Pro Max Skill Patterns

Recommended patterns from skill search:
- **Before-After Transformation:** 45% higher conversion
- **Comparison Table Focus:** 35% higher conversion
- **Hero + Features + CTA:** Standard SaaS pattern
- **Trust + Testimonials + CTA:** Social proof placement

---

*Document generated by Claude Flow v3 multi-agent swarm with intelligence from:*
- *Z.AI conversion optimization*
- *UI/UX Pro Max design skill*
- *Browser automation visual analysis*
- *Local codebase analysis*
