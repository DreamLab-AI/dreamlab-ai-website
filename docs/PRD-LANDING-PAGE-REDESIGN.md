# Product Requirements Document: DreamLab AI Landing Page Redesign

**Document Version:** 1.0
**Date:** 2026-01-23
**Author:** Strategic Planning Agent
**Status:** Draft for Review
**Branch:** feature/browser-automation-integration

---

## 1. Executive Summary

### 1.1 Overview

This PRD defines the requirements for redesigning the DreamLab AI landing page to pivot from the current "residential creative technology training" positioning to a focused "Deep Agentic AI Training" business led by Dr. John O'Hare. The redesign will consolidate the value proposition around practical, deployable AI agent training for business professionals.

### 1.2 Business Objective

Transform DreamLab AI's web presence into a high-converting landing page that:
- Clearly communicates the "AI moving from chat to agents" paradigm shift
- Positions Dr. John O'Hare as the authoritative instructor
- Drives qualified leads for the primary offering: 1-day AI Agent Masterclass (GBP 2,999)
- Supports secondary offerings: online 1:1, online group, residential, forward-deployed embedding

### 1.3 Key Value Propositions

| Metric | Claim | Evidence Required |
|--------|-------|-------------------|
| Performance | 30% better | Benchmark methodology TBD |
| Cost | Reduced | Comparison framework needed |
| Privacy | More privacy | Architecture documentation |
| Tool Use | Wider tool use | Capability matrix |
| Learning | Advanced | Curriculum differentiation |

### 1.4 Success Criteria

- Increase booking call conversions by 40% within 90 days
- Achieve page load time < 2.5s (LCP)
- Maintain 90+ Lighthouse accessibility score
- Generate 50+ qualified leads per month via email capture

---

## 2. Problem Statement

### 2.1 Current State Analysis

**Live Site (dreamlab-website.vercel.app):**
- Title: "AI Agent Masterclass - Dreamlab"
- Focus: 1-day training at GBP 2,999
- Clear value proposition: "Build one working agent with meaningful organizational impact"
- Strong instructor credibility section for Dr. John O'Hare
- Well-defined deliverables and guarantees

**Local Repository (dreamlab-ai-website):**
- Title: "DREAMLAB AI - Deep learning with no distractions"
- Focus: Residential creative technology training (VP, XR, Audio, Engineering)
- Multiple course offerings ranging GBP 1,695 - GBP 3,995
- 43+ instructor collective positioning
- Lake District accommodation focus
- Heavy Three.js visual elements (TorusKnot)

### 2.2 Gap Analysis

| Aspect | Live Site | Local Repo | Gap |
|--------|-----------|------------|-----|
| Primary Focus | AI Agents | Creative Tech | Misaligned |
| Lead Product | 1-day Masterclass | Residential weeks | Different funnel |
| Instructor | Dr. John O'Hare solo | 43+ collective | Diluted authority |
| Price Point | GBP 2,999 | GBP 1,695-3,995 range | Clarity needed |
| CTA | Book a call | Explore programs | Specificity |
| Tech Stack | Next.js | Vite + React + Three.js | Migration consideration |

### 2.3 Problem Statements

1. **Positioning Confusion:** Visitors cannot immediately understand whether DreamLab offers AI training or creative technology training

2. **Authority Dilution:** The 43-instructor collective weakens the personal brand of Dr. John O'Hare as the AI agent expert

3. **Conversion Friction:** Multiple offerings without clear recommendation create decision paralysis

4. **Value Communication:** The "30% better performance" claim lacks supporting evidence or explanation

5. **Funnel Misalignment:** Current residential focus doesn't support the primary 1-day online training product

---

## 3. Target Audience

### 3.1 Primary Persona: The Operations Leader

**Name:** Alex Chen
**Title:** Director of Operations / RevOps Lead
**Company Size:** 50-500 employees
**Industry:** B2B SaaS, Professional Services, Manufacturing

**Demographics:**
- Age: 35-50
- Location: UK, primarily London/Manchester corridor
- Budget Authority: GBP 5,000-20,000 discretionary
- Technical Comfort: Comfortable with terminal, not a developer

**Goals:**
- Automate repetitive workflows without hiring developers
- Demonstrate AI ROI to leadership within 90 days
- Build internal capability vs. perpetual consultancy dependence

**Pain Points:**
- "AI experiments" never translate to production use
- Vendor lock-in concerns with enterprise AI platforms
- Team skill gap blocking automation initiatives
- Difficulty quantifying AI investment returns

**Buying Triggers:**
- Competitor announces AI-powered process
- Q1/Q4 budget allocation windows
- Post-layoff efficiency mandates
- Failed chatbot/copilot pilot

**Objections:**
- "Is one day enough to build something real?"
- "Will my team actually use this after training?"
- "What happens when we get stuck post-training?"

### 3.2 Secondary Persona: The Technical Founder

**Name:** Priya Sharma
**Title:** CTO / Technical Co-founder
**Company Size:** 5-50 employees
**Industry:** Early-stage B2B startup

**Demographics:**
- Age: 28-42
- Location: UK tech hubs
- Budget Authority: Founder-level decisions
- Technical Comfort: Can code, wants to delegate AI architecture

**Goals:**
- Establish AI-first architecture early
- Train founding team on agent development
- Differentiate product with AI capabilities

**Pain Points:**
- Overwhelming landscape of AI tools and frameworks
- Uncertainty about which agent patterns fit their use case
- Time poverty - cannot afford week-long courses
- Need practical knowledge, not academic theory

**Buying Triggers:**
- Fundraising milestone requiring AI roadmap
- Key hire joining who needs onboarding
- Proof-of-concept deadline approaching

### 3.3 Tertiary Persona: The Enterprise Champion

**Name:** Marcus Williams
**Title:** Innovation Lead / Digital Transformation Manager
**Company Size:** 1,000+ employees
**Industry:** Financial Services, Healthcare, Government

**Demographics:**
- Age: 40-55
- Location: London primarily
- Budget Authority: Procurement navigation required
- Technical Comfort: Strategic, relies on technical team

**Goals:**
- Pilot AI agents in controlled environment
- Build internal AI capability center of excellence
- Demonstrate measurable efficiency gains to board

**Pain Points:**
- Compliance and security concerns block vendor solutions
- Internal IT skeptical of AI capabilities
- Previous AI investments underdelivered
- Need "on-premise" or "self-hosted" options

**Buying Triggers:**
- Board mandate for AI strategy
- Competitor case study in trade press
- Regulatory change creating efficiency pressure

---

## 4. User Stories

### 4.1 Discovery Phase

**US-001:** As a visitor, I want to immediately understand what DreamLab offers so I can determine relevance within 5 seconds.

**Acceptance Criteria:**
- Headline clearly states "AI Agent Training"
- Subheadline communicates 1-day format
- Visual hierarchy guides eye to value proposition
- No competing messages about creative technology

**US-002:** As a skeptical buyer, I want to see Dr. John O'Hare's credentials so I can trust the training quality.

**Acceptance Criteria:**
- Photo of instructor
- 3-5 key credentials (PhD, industry experience)
- Social proof from recognizable organizations
- LinkedIn/verification link available

**US-003:** As a technical evaluator, I want to understand what "AI agents" means so I can explain it to stakeholders.

**Acceptance Criteria:**
- Clear definition section
- Comparison: Chat AI vs. Agent AI
- Example use cases relevant to target industries
- Technical depth without jargon

### 4.2 Evaluation Phase

**US-004:** As a budget holder, I want to see the full price upfront so I can assess affordability without a sales call.

**Acceptance Criteria:**
- GBP 2,999 + VAT displayed prominently
- Comparison to market alternatives (optional)
- What's included breakdown
- Payment options if available

**US-005:** As a risk-averse buyer, I want to see guarantees so I can justify the investment internally.

**Acceptance Criteria:**
- "Working proof" guarantee prominently displayed
- Terms clearly stated (attend + complete prep = guarantee)
- Refund or follow-up session options
- Trust signals (reviews, testimonials)

**US-006:** As a team lead, I want to understand the group format so I can assess fit for my team.

**Acceptance Criteria:**
- Group size (2-6 people) stated
- Per-person vs team pricing clear
- Prerequisites for attendees
- Post-training support options

### 4.3 Decision Phase

**US-007:** As a ready buyer, I want to book a qualification call so I can confirm fit before payment.

**Acceptance Criteria:**
- Single, prominent CTA: "Book a 10-minute call"
- Calendar integration for self-scheduling
- Alternative: email capture for not-yet-ready visitors
- Mobile-optimized booking flow

**US-008:** As a returning visitor, I want to access course materials so I can prepare before the session.

**Acceptance Criteria:**
- Login/access area for enrolled participants
- Pre-work checklist visible
- Technical setup requirements
- Contact for pre-session questions

### 4.4 Secondary Offerings

**US-009:** As an enterprise buyer, I want to explore custom/embedded options so I can scale beyond individual training.

**Acceptance Criteria:**
- "Enterprise" or "Teams" section
- Forward-deployed embedding offering visible
- Contact for custom pricing
- Minimum information for procurement initiation

**US-010:** As a residential training seeker, I want to find immersive options so I can access deeper learning formats.

**Acceptance Criteria:**
- Secondary navigation to residential programs
- Clear differentiation from 1-day offering
- Separate conversion path

---

## 5. Functional Requirements

### 5.1 Page Structure

```
LANDING PAGE ARCHITECTURE
========================

[Header]
- Logo (left)
- Navigation: Training | About John | Enterprise | Contact
- CTA Button: "Book a Call" (right)

[Hero Section]
- Headline: "Build AI Agents That Actually Work"
- Subheadline: "1-day training. Working automation. Your team's capability."
- CTA: Primary "Book Your Call" + Secondary "Watch Demo"
- Social Proof: "500+ professionals trained" (or actual metric)

[Problem/Solution Section]
- "AI is moving from chat to agents that execute tasks"
- Visual: Chat AI vs Agent AI comparison
- Key quote from customer/Dr. O'Hare

[What You'll Build Section]
- 5-6 concrete example agents
- Visual cards with icons
- "Support triage", "Lead follow-up", "Ops reporting", etc.

[Instructor Section]
- Dr. John O'Hare feature
- Photo, credentials, quote
- Credibility signals (PhD, industry roles, years)

[Deliverables Section]
- What you receive list
- Templates, recordings, repo access
- Post-training support details

[Pricing Section]
- GBP 2,999 + VAT
- What's included
- Guarantee statement
- CTA: Book call

[Testimonials Section]
- 2-3 customer quotes
- Name, role, company (with permission)
- Specific outcomes mentioned

[FAQ Section]
- 5-7 common objections addressed
- Expandable/collapsible format

[Secondary Offerings Section]
- "Other Ways to Work With Us"
- Online 1:1, Group, Residential, Embedding
- Brief descriptions with CTAs

[Footer]
- Contact information
- Legal links
- Social links
```

### 5.2 Core Features

**FR-001: Hero Video/Animation**
- 15-30 second autoplay (muted) demo of agent in action
- Fallback: animated illustration or static hero image
- Performance: < 1MB total hero assets

**FR-002: Booking Integration**
- Calendly or Cal.com embed for call scheduling
- 10-minute and 30-minute options
- Timezone auto-detection
- Confirmation email automation

**FR-003: Email Capture**
- Alternative CTA for non-ready visitors
- "Get the AI Agent Starter Guide" lead magnet
- Integration with email provider (ConvertKit/Mailchimp)
- GDPR-compliant consent

**FR-004: FAQ Accordion**
- Schema.org FAQ markup for SEO
- Smooth expand/collapse animation
- Deep-linkable questions

**FR-005: Mobile-First Navigation**
- Hamburger menu on mobile
- Sticky header with CTA visible
- Touch targets 44x44px minimum

### 5.3 Content Components (Preserve from Existing)

From current local repo, retain and adapt:
- Header component structure
- Card components (shadcn/ui)
- Button variants
- Color system (purple/blue gradient theme)
- Footer structure

Remove:
- Three.js TorusKnot visualization (performance concern)
- Residential training as primary focus
- 43+ instructor collective messaging
- Lake District accommodation sections

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target | Tool |
|--------|--------|------|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| First Input Delay (FID) | < 100ms | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Total Bundle Size | < 250KB (gzipped) | Webpack analyzer |
| Hero Image | < 200KB (WebP) | Manual optimization |

**Actions:**
- Remove Three.js dependency (saves ~150KB)
- Implement lazy loading for below-fold content
- Use next-gen image formats (WebP, AVIF)
- Minimize JavaScript execution time

### 6.2 Accessibility

| Requirement | Standard | Validation |
|-------------|----------|------------|
| WCAG Level | AA (2.1) | axe DevTools |
| Color Contrast | 4.5:1 minimum | Contrast checker |
| Keyboard Navigation | Full support | Manual testing |
| Screen Reader | VoiceOver/NVDA tested | Manual testing |
| Focus Indicators | Visible on all interactive elements | Manual testing |
| Skip Links | Main content, navigation | Implementation |
| Aria Labels | All interactive elements | Audit |

**Current State:**
- Existing repo has skip link implementation
- Semantic HTML structure present
- Some accessibility attributes exist

### 6.3 SEO

| Requirement | Implementation |
|-------------|----------------|
| Title Tag | "AI Agent Training in 1 Day | Dr. John O'Hare | DreamLab" |
| Meta Description | 160 chars max, include price and guarantee |
| Open Graph | Custom image, title, description |
| Schema.org | Course, Person, FAQPage structured data |
| Canonical URL | https://dreamlab-ai.com |
| Sitemap | Generated, submitted to Search Console |
| Robots.txt | Allow all, sitemap reference |
| Page Speed | Factor in ranking |

**Content Strategy:**
- Target keywords: "ai agent training uk", "build ai agents course", "agentic ai workshop"
- Long-tail: "how to build ai automation for business"
- Local: "ai training london", "ai course manchester"

### 6.4 Security

| Requirement | Implementation |
|-------------|----------------|
| HTTPS | Enforced via GitHub Pages/Cloudflare |
| CSP Headers | Configured for external scripts |
| No Inline Scripts | Content Security Policy compliant |
| Form Validation | Client + server-side |
| Data Handling | GDPR compliant, privacy policy updated |
| Third-Party Audit | Minimal external dependencies |

### 6.5 Browser Support

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| Mobile Safari | iOS 14+ | Full |
| Mobile Chrome | Android 10+ | Full |

---

## 7. Content Strategy

### 7.1 Voice and Tone

**Brand Voice:**
- Authoritative but accessible
- Practical over theoretical
- Direct, no marketing fluff
- Technical confidence without jargon

**Tone Guidelines:**
- "Build" not "Learn about"
- "Working automation" not "AI capabilities"
- "Your team's capability" not "Our expertise"
- Action-oriented language

### 7.2 Key Messages by Section

**Hero:**
```
Headline: "Build AI Agents That Actually Work"
Subheadline: "One-day training. Working automation.
Skills your team keeps."

Supporting: "AI is moving from chat to agents that
execute tasks, build apps, and automate workflows.
Learn to build them in a day."
```

**Problem Statement:**
```
"You've experimented with ChatGPT. Your team has tried Copilot.
But 'AI experiments' aren't the same as 'AI doing work.'

The shift from chat to agents is the difference between
asking for directions and having a driver who knows the route."
```

**What You'll Build:**
```
"Leave with a working agent that:
- Runs on demand from your terminal
- Uses your data, your tools, your workflows
- Can be cloned, modified, and shared across your team

Not a demo. Not a prototype. Working automation."
```

**Instructor Bio:**
```
"Dr. John O'Hare has spent decades building systems that work.
From AI for autonomous marine vessels to immersive media
at scale, his approach is always the same:

Build something that runs. Then build the next thing.

PhD in telepresence. 17 years as Technical Director.
Now focused on one thing: getting your team to agent-first thinking."
```

**Guarantee:**
```
"If you complete the prep work and attend the full day,
you will leave with a working, on-demand agent.

If you don't, I'll either spend 90 minutes with you
until it works, or refund your fee in full."
```

**Pricing:**
```
"GBP 2,999 + VAT

Includes:
- Live training day (up to 6 participants)
- Working project setup on your machine
- Templates, prompts, and patterns pack
- Session recording for your team
- 30-day email support"
```

### 7.3 Testimonials Required

Request from existing clients:
1. Specific outcome achieved
2. Permission for name + company + role
3. Before/after context
4. Quote about Dr. O'Hare specifically

Fallback: Use quotes from live site testimonials with proper attribution.

### 7.4 Visual Content

**Hero Image/Video:**
- Option A: Screen recording of agent executing a task
- Option B: Professional photo of Dr. O'Hare in training context
- Option C: Animated illustration of agent workflow

**Section Illustrations:**
- Simple, modern icons (Lucide icons from existing)
- Minimal animation (CSS transforms, no heavy libraries)
- Consistent color palette (purple/blue gradient system)

**Photography:**
- Dr. John O'Hare headshot (professional quality)
- Optional: Training session in progress
- Avoid: Stock photos of generic "AI" imagery

---

## 8. Success Metrics (KPIs)

### 8.1 Primary Metrics

| Metric | Baseline | Target (90 days) | Measurement |
|--------|----------|------------------|-------------|
| Booking Call Conversion | TBD | +40% | Calendly analytics |
| Qualified Leads/Month | TBD | 50+ | CRM tracking |
| Page Bounce Rate | TBD | < 40% | Google Analytics |
| Average Session Duration | TBD | > 2 min | Google Analytics |

### 8.2 Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email Capture Rate | > 5% of visitors | Form analytics |
| Mobile Traffic Conversion | Parity with desktop | GA device comparison |
| Organic Search Traffic | +25% in 6 months | Search Console |
| Page Speed Score | 90+ | Lighthouse |
| Accessibility Score | 90+ | Lighthouse |

### 8.3 Leading Indicators

| Indicator | Signal | Action Trigger |
|-----------|--------|----------------|
| Hero Scroll Depth | < 60% reach fold | Revise hero content |
| CTA Click Rate | < 3% | A/B test CTA copy |
| FAQ Engagement | Low opens | Add/revise questions |
| Form Abandonment | > 50% | Simplify form fields |

---

## 9. Timeline and Milestones

### 9.1 Phase 1: Foundation (Week 1-2)

| Task | Owner | Due | Status |
|------|-------|-----|--------|
| PRD approval | Product | Day 3 | Draft |
| Content audit | Content | Day 5 | Pending |
| Design mockups | Design | Day 10 | Pending |
| Technical architecture | Engineering | Day 7 | Pending |
| Asset inventory | Content | Day 7 | Pending |

### 9.2 Phase 2: Development (Week 3-4)

| Task | Owner | Due | Status |
|------|-------|-----|--------|
| Hero section | Engineering | Day 14 | Pending |
| Core sections | Engineering | Day 18 | Pending |
| Mobile optimization | Engineering | Day 20 | Pending |
| CMS integration (if needed) | Engineering | Day 21 | Pending |
| Analytics setup | Engineering | Day 21 | Pending |

### 9.3 Phase 3: Content & Testing (Week 5-6)

| Task | Owner | Due | Status |
|------|-------|-----|--------|
| Final copy integration | Content | Day 25 | Pending |
| Photography/video | Content | Day 28 | Pending |
| QA testing | QA | Day 30 | Pending |
| Accessibility audit | QA | Day 32 | Pending |
| Performance optimization | Engineering | Day 35 | Pending |

### 9.4 Phase 4: Launch (Week 7)

| Task | Owner | Due | Status |
|------|-------|-----|--------|
| Staging review | All | Day 38 | Pending |
| Stakeholder approval | Product | Day 40 | Pending |
| Production deployment | Engineering | Day 42 | Pending |
| DNS cutover | Engineering | Day 42 | Pending |
| Post-launch monitoring | Engineering | Day 42-49 | Pending |

---

## 10. Out of Scope

### 10.1 Explicitly Excluded

1. **E-commerce/Payment Processing:** Booking remains via call + manual invoicing
2. **User Accounts/Login:** No participant portal in v1
3. **Course Content Delivery:** Separate system for post-booking
4. **Blog/Content Marketing:** Phase 2 consideration
5. **Multilingual Support:** English-only for initial launch
6. **Chat Widget:** Adds complexity without clear ROI
7. **A/B Testing Infrastructure:** Manual iteration first
8. **CRM Integration:** Spreadsheet/manual tracking initially

### 10.2 Future Considerations (Phase 2)

1. **Testimonial Video Gallery:** When client videos available
2. **Interactive Agent Demo:** Sandbox environment
3. **Enterprise Pricing Calculator:** For team bookings
4. **Case Study Library:** Detailed outcome stories
5. **Integration Guides:** Post-training resources
6. **Partner Program:** Referral tracking

### 10.3 Technical Debt Acceptance

1. **Three.js Removal:** Performance gain justifies loss of visual flourish
2. **Residential Content:** Archive rather than delete, may resurface
3. **Team Page:** Retain but de-emphasize in navigation
4. **Workshop System:** Keep for potential future use

---

## Appendix A: Competitive Landscape

| Competitor | Price | Duration | Differentiator |
|------------|-------|----------|----------------|
| Imperial AI Courses | GBP 5,950+ | Multi-day | Academic credibility |
| General Assembly | GBP 3,500+ | 5 days | Career switching focus |
| Coursera/Udacity | GBP 300-2,000 | Self-paced | Certification path |
| Corporate Training | GBP 10,000+ | Custom | Enterprise compliance |

**DreamLab Positioning:** Premium 1-day intensive with working output guarantee. Not academic certification, not enterprise overhead. Practical capability transfer.

---

## Appendix B: Content Migration Map

| Current Component | Action | New Location |
|-------------------|--------|--------------|
| Header | Keep, modify nav | Header |
| TorusKnot | Remove | N/A |
| TestimonialMoments | Adapt | Testimonials section |
| FeaturedInstructors | Replace | Instructor section (single) |
| ExclusivityBanner | Remove | N/A |
| CaseStudyNarrative | Archive | Future blog |
| EmailSignupForm | Keep | Lead magnet section |
| ResidentialTraining | Archive | Secondary nav link |
| CourseCard | Adapt | Secondary offerings |

---

## Appendix C: Technical Stack Decision

**Retain (Vite + React):**
- Faster build times than Next.js for static site
- Team familiarity
- Existing component library (shadcn/ui)
- GitHub Pages deployment works

**Remove:**
- Three.js / @react-three/fiber (performance)
- Unused shadcn/ui components

**Add:**
- Schema.org structured data
- Calendly embed script
- Analytics (GA4 or Plausible)
- Email capture integration

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Strategic Planning Agent | Initial draft |

---

*End of PRD*
