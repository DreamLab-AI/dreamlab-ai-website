# Chapter 3: Structured Data with JSON-LD

> Structured data states plainly what your page is about. It must describe what is visibly on the page, and nothing more.

## What Structured Data Does

Search engines and AI systems already read your prose. Structured data adds a machine-readable statement of the key facts: this is an organisation, this is its address, this is a course, it is free, it was updated on this date.

It is used for:

- **Rich results** in Google (FAQ, breadcrumbs, course listings, organisation knowledge panels, and others — eligibility changes over time, so check the current Search Gallery).
- **Entity understanding** — connecting your site to a consistent identity across the web.
- **Disambiguation** — making it clear that "DreamLab" here is the Lake District training company, not one of the many other DreamLabs.

Google's guidance for AI Overviews states that no special schema is required. Treat structured data as a way to be unambiguous, not as an AI ranking trick.

## JSON-LD, Microdata or RDFa?

Use **JSON-LD**. It is a `<script>` block in the page, separate from your markup, which makes it easy to generate and test. Google recommends it, and because it is data rather than executable script, it works under a strict Content Security Policy.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "DreamLab AI",
  "url": "https://dreamlab-ai.com",
  "logo": "https://dreamlab-ai.com/images/logo-512.png",
  "sameAs": [
    "https://github.com/DreamLab-AI"
  ]
}
</script>
```

## Types Worth Knowing

| Type | Use it for |
|------|-----------|
| `Organization` / `LocalBusiness` | Who you are; name, logo, contact, `sameAs` profiles |
| `WebSite` | The site as a whole |
| `WebPage`, `AboutPage`, `ContactPage` | Individual pages |
| `Article`, `BlogPosting` | Dated written content with an author |
| `Course`, `LearningResource` | Training and educational material |
| `Event` | Dated sessions with a location or online URL |
| `FAQPage` | A visible list of questions with answers |
| `BreadcrumbList` | The page's position in your site hierarchy |
| `Person` | Authors and team members |

### A free self-guided module

```json
{
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "SEO & AI Discoverability",
  "description": "Technical SEO, structured data, AI crawler controls and answer-engine content.",
  "url": "https://dreamlab-ai.com/workshops/workshop-10-seo-ai-discoverability",
  "inLanguage": "en-GB",
  "isAccessibleForFree": true,
  "educationalLevel": "Intermediate",
  "timeRequired": "PT6H",
  "provider": {
    "@type": "Organization",
    "name": "DreamLab AI",
    "url": "https://dreamlab-ai.com"
  },
  "dateModified": "2026-10-10"
}
```

### Connecting entities with `@id`

Give recurring entities a stable identifier and refer to it, rather than repeating the full object on every page:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://dreamlab-ai.com/#org", "name": "DreamLab AI" },
    { "@type": "WebSite", "@id": "https://dreamlab-ai.com/#website",
      "url": "https://dreamlab-ai.com", "publisher": { "@id": "https://dreamlab-ai.com/#org" } }
  ]
}
```

## Hygiene: Errors We Found in Our Own Markup

A manual audit of the DreamLab homepage (recorded in ADR-043) found five defects in its JSON-LD. Each is a common pattern:

| Defect | Why it is wrong | Fix |
|--------|----------------|-----|
| `geo` was a `GeoCoordinates` object containing only `addressCountry` | `GeoCoordinates` takes `latitude` and `longitude`; country belongs in `PostalAddress` | Move the country into `address` |
| `"telephone": ""` | An empty value is worse than none | Remove the property |
| `aggregateRating` of 5 from 1 review, with no reviews on the page | Ratings must reflect visible, genuine reviews; this looks like spam | Remove it |
| `SearchAction` pointing at `/search?q=` | The route did not exist | Remove it, or build the search page |
| `logo` pointing at `favicon.ico` | Logos need a raster image of a reasonable size | Point at a proper PNG or WebP |

The pattern behind all five: markup was copied from a template and never checked against the real site. **Every value in your structured data should be something a visitor can see or verify.**

## The Rules That Keep You Safe

1. **Match visible content.** If the FAQ is in JSON-LD, the same questions and answers are on the page. Google treats mismatches as spam.
2. **No empty or placeholder values.** Leave properties out instead.
3. **No self-serving reviews.** Do not mark up ratings for your own organisation from your own site.
4. **Dates are real.** `dateModified` changes when the content changes, not on every build. (Stamping the build date is defensible only if the build reflects a real content change.)
5. **One source of truth.** Generate JSON-LD from the same data that renders the page, so they cannot drift.

## Validating

- **Schema Markup Validator** (validator.schema.org) — checks against schema.org itself.
- **Google Rich Results Test** — checks Google's eligibility rules for rich results and shows what it parsed after rendering.
- **URL Inspection** in Search Console — shows structured data detected on the live, indexed page.

Validate the rendered output, not your source template. If the JSON-LD is injected by JavaScript, non-rendering readers will not see it at all — another reason to put it in static HTML.

## Chapter Checklist

- [ ] One `Organization` entity with a stable `@id`, real logo and `sameAs` links
- [ ] Page-level types for your important pages (courses, articles, events)
- [ ] Every value matches something visible on the page
- [ ] No empty properties, fake ratings or dead `SearchAction`s
- [ ] JSON-LD is present in the raw HTML, not only after JavaScript runs
- [ ] Both validators pass

---

**Next:** [Chapter 4: Metadata and Social Previews](./04_metadata_social.md)
