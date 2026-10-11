# SEO & AI Discoverability: Being Found by Search Engines and Answer Engines

> **Last Updated: October 2026** — Covers classic technical SEO, rendering for JavaScript sites, structured data, AI crawler controls, answer-engine content patterns and measurement.

## Executive Summary

People now find your work in two ways. They type a query into a search engine and click a blue link, or they ask an AI assistant — ChatGPT, Claude, Perplexity, Gemini, Google's AI Overviews — and read an answer that may or may not cite you. The second route is growing quickly, and it rewards a slightly different set of habits.

The good news is that the two routes share most of their plumbing. A page that a crawler cannot fetch, cannot render, or cannot understand is invisible to both. This workshop starts with that shared foundation, then covers what is specific to AI systems: which bots exist and what they do with your content, how to decide which ones to allow, and how to write pages that answer engines can quote accurately.

Throughout, we use the DreamLab website you are reading as a worked example — including the mistakes we found and fixed.

### Search Engines vs Answer Engines

| Concern | Classic search engine | AI answer engine |
|---------|----------------------|------------------|
| What the user sees | A ranked list of links | A written answer, sometimes with citations |
| How content is gathered | Crawler + renderer + index | Training crawl, search index, and live fetches on behalf of a user |
| JavaScript | Google renders it (with delay) | Many AI fetchers do not execute it |
| Success metric | Ranking and click-through | Being cited, quoted accurately, and recommended |
| Control surface | `robots.txt`, meta robots, sitemaps | The same, plus per-bot and training-specific tokens |

### Key Learning Outcomes

By completing this workshop, you will:

- **Explain the discovery pipeline** — crawl, render, index, rank or retrieve, cite — and where pages fall out of it
- **Audit crawlability** with `robots.txt`, sitemaps, canonical URLs, status codes and webmaster tools
- **Diagnose the single-page-app problem** and fix it with prerendering or static generation
- **Write valid JSON-LD structured data** that matches visible content
- **Make an informed policy** for AI crawlers, separating training, search and user-initiated fetches
- **Structure content** so answer engines can extract and cite it correctly
- **Measure** search and AI referral traffic, and test how assistants describe you

### Workshop Structure

```
Chapter 0: Introduction             — How discovery works in 2026
Chapter 1: Crawling & Indexing      — robots.txt, sitemaps, canonicals, webmaster tools
Chapter 2: Rendering JavaScript     — The SPA problem and how to fix it
Chapter 3: Structured Data          — JSON-LD, schema.org, hygiene and validation
Chapter 4: Metadata & Social        — Titles, descriptions, Open Graph, per-route meta
Chapter 5: AI Crawlers & Controls   — Who is fetching your site and what to allow
Chapter 6: Answer-Engine Content    — Writing pages that can be quoted and cited
Chapter 7: Measurement              — Search Console, logs, referrals and prompt panels
Chapter 8: Exercises                — Audit and improve your own site
Chapter 9: Resources                — Primary documentation and tools
```

### Target Audience

- **Founders, marketers and consultants** who need their organisation to be findable
- **Developers** shipping React, Vue or other client-rendered sites
- **Researchers and writers** who want their work cited correctly by AI assistants
- **Anyone who completed Phase 9** and has just published something

### Prerequisites

- A website you control (a GitHub Pages site from the Professional Output Suite workshop is ideal)
- Comfort with a terminal and `curl`
- Basic HTML — you should recognise a `<head>` and a `<meta>` tag
- Optional: Claude Code (Phase 4) to automate the audits

### Estimated Time Investment

- **Quick Start:** 1–2 hours (Chapters 0–2)
- **Core Skills:** 3–4 hours (Chapters 0–5)
- **Complete Workshop:** 6 hours (all chapters + exercises)

### A Note on Honesty

This field attracts confident claims. Where something is documented by the engine that uses it, we say so and link the source. Where something is a proposal or an industry hypothesis — `llms.txt` is the obvious example — we say that too. Nobody outside the search and AI companies knows their ranking systems; treat any tool promising a guaranteed "AI visibility score" with care.

### Workshop Navigation

**Start Here:** [Chapter 0: Introduction](./00_introduction.md)

**Complete Chapter List:**

1. [Introduction: How Discovery Works in 2026](./00_introduction.md)
2. [Crawling and Indexing](./01_crawling_indexing.md)
3. [Rendering JavaScript Sites](./02_rendering_javascript.md)
4. [Structured Data with JSON-LD](./03_structured_data.md)
5. [Metadata and Social Previews](./04_metadata_social.md)
6. [AI Crawlers and Access Controls](./05_ai_crawlers.md)
7. [Writing for Answer Engines](./06_answer_engine_content.md)
8. [Measuring Discoverability](./07_measurement.md)
9. [Hands-On Exercises](./08_exercises.md)
10. [Resources](./09_resources.md)

### Recommended Learning Path

**If you run a static or server-rendered site:** Skim Chapter 2, and spend your time on Chapters 3, 5 and 6.

**If you ship a single-page app:** Chapter 2 is the most important chapter in this workshop. Do it before anything else.

**If you only care about AI assistants:** You still need Chapters 1 and 2 — answer engines cannot cite what they cannot fetch.

### About DreamLab AI

DreamLab AI delivers intensive AI training programmes from our dedicated facility in the Lake District, UK. Our workshops combine hands-on practical exercises with deep technical understanding, taught by practitioners who build with these tools every day.

**Explore more workshops:** [dreamlab-ai.com/workshops](https://dreamlab-ai.com/workshops)

**Get in touch:** [dreamlab-ai.com/contact](https://dreamlab-ai.com/contact)

---

**Ready to be found?** Start with [Chapter 0: Introduction](./00_introduction.md)

---

*A DreamLab AI Self-Guided Workshop | Last Updated: October 2026*
