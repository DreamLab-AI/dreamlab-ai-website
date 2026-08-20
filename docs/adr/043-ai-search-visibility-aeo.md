# ADR 043: AI Search Visibility (AEO) — Server-HTML Depth, Schema Hygiene, FAQ Layer

## Status

Accepted — implemented 2026-08-20 (W1–W4 shipped in `index.html` +
`vite.config.ts`; `__BUILD_DATE__` tokens are replaced by a Vite
`transformIndexHtml` plugin at build time). Interim deviation: no dedicated
logo asset exists in the repo, so `Organization.logo` points at
`images/heroes/dreamlab-hero.webp` — superseded when ADR-044 (brand logo
asset) lands. Pre-hydration body measures 817 words with 6 FAQ pairs
mirrored verbatim in `FAQPage` JSON-LD.

## Context

Three third-party AI-readiness analysers were run against the homepage
(Am I Visible on AI, HubSpot AI Search Grader, Search Influence AI Website
Grader). Aggregate picture:

- **Technical/crawl access is already strong** (95–100): robots.txt, llms.txt,
  HTTPS, bot access, sitemap all pass. ADR-relevant prior work: the static
  pre-hydration header and llms.txt shipped in commit `9aacee3`.
- **Content structure is the weak axis** (56–68): the server-delivered HTML
  carries only ~110 words; answer engines that do not execute JavaScript see
  almost nothing of the React-rendered page. No question-form headings, no FAQ
  section, only 3 in-body internal links.
- **Structured data is present but shallow** (46–71): three JSON-LD blocks
  exist, but with hygiene problems (below) and no FAQPage, no freshness
  signals (`dateModified`), no per-page schema.
- **Brand-level scores** (HubSpot: 40–42 across OpenAI/Perplexity/Gemini) show
  low brand recognition and near-zero share of voice. This is an off-site
  problem (citations, mentions, comparison content) that on-page changes only
  partially move.

Existing constraints that shape the solution:

1. The site is a Vite SPA on GitHub Pages — **no SSR**. Anything answer
   engines must reliably read has to live in `index.html` (or per-route static
   HTML) before hydration.
2. CSP `script-src 'self'` with no `unsafe-inline`; JSON-LD is exempt (data,
   not executable), so schema can stay inline.
3. React replaces the entire `#root` subtree on mount, so pre-hydration
   content must be safe to discard visually yet complete semantically.

Audit of the current JSON-LD found concrete defects, independent of the
analysers:

- `ProfessionalService.geo` is a `GeoCoordinates` object containing only
  `addressCountry` — invalid (GeoCoordinates takes latitude/longitude).
- `telephone: ""` — empty properties are worse than absent ones.
- `aggregateRating` with `ratingValue: 5, reviewCount: 1` is a schema-spam
  signal with no supporting on-page review content.
- `WebSite.potentialAction` declares a `SearchAction` targeting
  `/search?q=…`, a route that does not exist.
- `Organization.logo` points at `favicon.ico` (ICO is not a valid logo image
  type for most consumers; needs a raster ≥112×112).

## Decision

Adopt a four-workstream Answer Engine Optimisation (AEO) plan, ordered by
impact-per-effort. All on-page work targets the server-delivered HTML, not the
React runtime.

### W1 — Schema hygiene and freshness (quick wins, ~1 hour)

1. Fix the `ProfessionalService` block: drop the malformed `geo` and empty
   `telephone`; add a real `PostalAddress` (locality "Lake District",
   `addressRegion` "Cumbria") if publishable. Remove `aggregateRating` until
   there are genuinely marked-up reviews; replace with nothing (testimonials
   can later become `Review` items sourced from `content/site-content.yaml`).
2. Remove the fake `SearchAction` from the `WebSite` block, or implement a
   real `/search` route first. Add `dateModified` (injected at build time —
   see W4) to `WebSite`.
3. Point `Organization.logo` at a proper PNG/WebP ≥112×112 under
   `public/images/`, and add `foundingLocation`, `knowsAbout` (AI, XR, cyber
   trust, creative technology) to strengthen entity grounding.

### W2 — Title/meta and semantic HTML (quick wins, ~1 hour)

1. Shorten `<title>` to 30–60 chars: `DreamLab — Applied Innovation Lab, UK`
   (37 chars) or similar; keep the long descriptor in `og:title` if desired.
2. Trim `meta description` to 120–160 chars (currently 195).
3. Restructure the pre-hydration block with semantic HTML5: wrap the existing
   header in `<main>`, add `<section>` landmarks, keep exactly one `<h1>`.
4. Fix the 3 HTML validation errors (run `npx html-validate index.html` or
   validator.nu; likely candidates are the `role="main"` on `#root`
   conflicting with a `<main>` landmark, and legacy meta tags).

### W3 — Pre-hydration content depth + FAQ (the main lever, ~half day)

Expand the static pre-hydration content in `index.html` from ~110 to ≥800
words, structured for answer extraction:

1. **Section-level detail** with `<h2>` headings mirroring the route pages:
   Programmes, Co-Create residencies, Research, the specialist network, the
   free workshop curriculum. Each section: 2–4 sentences of concrete,
   factual copy plus a contextual internal link (target ≥6 in-body internal
   links; currently 3).
2. **A real FAQ section**: `<section><h2>Frequently Asked Questions</h2>`
   with ≥4 question-form `<h3>` headings and direct 2–3 sentence answers
   (What is DreamLab? Where is it? What do residential programmes involve?
   Are the workshops free? Who is it for?). Answers must be self-contained —
   answer engines quote them verbatim.
3. **Matching `FAQPage` JSON-LD** whose Q/A text is copied verbatim from the
   visible FAQ section (schema that mismatches visible content is a spam
   signal). Note: this feeds answer engines, not Google rich results (FAQ
   rich results were withdrawn May 2026).
4. Keep the block visually consistent with the current dark pre-paint style;
   React still replaces the whole subtree on mount, so there is no runtime
   cost — only initial-HTML weight (~4–6 KB, acceptable).
5. The React `Index` page should render equivalent (or richer) content so
   JS-executing crawlers see no cloaking mismatch.

### W4 — Freshness signal automation (small build change)

Add a build-time stamp: the pre-build script (alongside
`generate-workshop-list.mjs`) injects the build date into a
`<meta property="article:modified_time">` / JSON-LD `dateModified`
placeholder in `index.html` at `npm run build`. Deploys are frequent enough
that this gives an honest, always-current freshness signal without manual
upkeep.

### Out of scope (deliberately)

- **SSR/prerender migration** — a per-route prerender (e.g. vite-plugin
  prerender into `dist/`) would lift every route's content score, but is a
  larger architectural change; revisit as a follow-up ADR if W3 measurably
  moves scores and per-route visibility is still weak.
- **Off-site share-of-voice work** (directory listings, comparison articles,
  Wikipedia/Wikidata entity, press citations) — the biggest lever for the
  HubSpot brand-recognition scores, but not a code change in this repo.
- Accessibility push to >90 — worthwhile, tracked separately in the snag
  list, not an AEO blocker.

## Consequences

**Positive**

- Non-JS crawlers (most answer-engine retrievers) get a complete, quotable
  representation of the offer, matching what `llms.txt` promises.
- Schema becomes valid and honest — removes two active spam-risk signals
  (1-review aggregateRating, phantom SearchAction) that could suppress
  rather than boost visibility.
- FAQ copy + FAQPage schema gives answer engines direct extractable Q/A
  pairs, the format they preferentially cite.
- Freshness is automated, not a manual chore.

**Negative / risks**

- Duplicate-maintenance surface: pre-hydration copy in `index.html` and the
  React `Index` page must stay in step. Mitigation: keep pre-hydration copy
  factual and stable (offer descriptions, not campaign copy); consider
  sourcing both from `content/site-content.yaml` later.
- `index.html` grows by a few KB before first paint (negligible; text gzips
  well).
- Homepage-only fix: `/programmes`, `/workshops` etc. still serve the shell
  to non-JS crawlers. Accepted for now; prerender ADR is the escalation path.

**Verification**

- Re-run all three analysers after deploy; targets: Content Structure ≥80,
  Structured Data ≥80, overall ≥85 on Search Influence.
- Validate JSON-LD with schema.org validator; HTML with validator.nu
  (0 errors).
- `curl -s https://dreamlab-ai.com/ | wc -w` as a crude non-JS word-count
  smoke check (≥800 in-content words).

## References

- ADR-042 (website agent chat routing), commit `9aacee3` (llms.txt +
  server-HTML CTA — the foundation this ADR extends)
- Analyser reports: Am I Visible on AI (88/100), HubSpot AI Search Grader
  (40–42), Search Influence AI Website Grader (69%), all 2026-08-20
- schema.org `FAQPage`, `ProfessionalService`; Google FAQ rich-result
  withdrawal (May 2026)
