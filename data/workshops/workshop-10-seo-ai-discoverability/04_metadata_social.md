# Chapter 4: Metadata and Social Previews

> The `<head>` is where a page introduces itself — to search results, to chat apps that unfurl links, and to assistants deciding whether a page answers a question.

## The Essential Tags

```html
<html lang="en-GB">
<head>
  <title>SEO & AI Discoverability | DreamLab AI Workshops</title>
  <meta name="description" content="Free six-hour workshop: technical SEO, structured data, AI crawler controls and writing for answer engines." />
  <link rel="canonical" href="https://dreamlab-ai.com/workshops/workshop-10-seo-ai-discoverability" />
</head>
```

### Titles

- Unique on every page. Duplicate titles are one of the clearest signs of an SPA that never updates its `<head>`.
- Lead with what the page is, then the brand: `Topic | Brand`.
- Roughly 50–60 characters before truncation in results. Engines may rewrite titles that are vague, stuffed or misleading.

### Descriptions

- Not a ranking factor in Google, but often used as the snippet — and the snippet decides the click.
- One or two sentences that answer "what will I get here?" Around 150–160 characters.
- Unique per page. Missing is better than duplicated boilerplate.

### Language

Declare `lang` on `<html>`. For UK English content, `en-GB`. If you publish translations, use `hreflang` links between them.

## Open Graph and Twitter Cards

When someone pastes your link into Slack, LinkedIn, WhatsApp, Teams, Discord or X, a fetcher reads these tags to build the preview card. **None of these fetchers run JavaScript.**

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="SEO & AI Discoverability" />
<meta property="og:description" content="Free self-guided workshop from DreamLab AI." />
<meta property="og:url" content="https://dreamlab-ai.com/workshops/workshop-10-seo-ai-discoverability" />
<meta property="og:image" content="https://example.com/images/og/workshops-1200x630.png" />
<meta property="og:image:alt" content="DreamLab AI workshops" />
<meta name="twitter:card" content="summary_large_image" />
```

Rules that save hours of debugging:

- **Absolute URLs** for `og:image` and `og:url`.
- **The image must exist.** A preview pointing at a missing file silently shows nothing. The DreamLab codebase has an explicit rule: OG image URLs must reference files that are actually in `public/`, because there is no image-generation pipeline to create them.
- Around **1200 × 630** pixels works across most platforms. Some platforms handle WebP poorly; PNG or JPEG is the safest choice.
- Platforms cache previews aggressively. Use their debuggers (LinkedIn Post Inspector, Facebook Sharing Debugger) to refresh after changes.

## The SPA Metadata Problem

In a client-rendered app, a hook like this updates the head after navigation:

```tsx
useEffect(() => {
  document.title = `${lesson.title} | DreamLab AI Workshops`;
  setMeta('og:title', lesson.title);
}, [lesson]);
```

That is enough for browsers and for Google (which renders). It is **not** enough for link-preview fetchers or most AI fetchers, which see whatever `index.html` shipped — usually the homepage's tags on every route.

Fixes, in order of preference:

1. **Prerender each route** with its own `<head>` (Chapter 2). The same route data that drives the router drives the titles.
2. **Edge rewriting** — a CDN worker injects per-route tags into `index.html` on the fly.
3. **At minimum,** make the default tags in `index.html` describe the site well, so every route at least previews sensibly.

## Headings and Document Outline

Metadata introduces the page; headings structure it. Both search engines and answer engines lean on headings to work out which passage answers which question.

- One `<h1>` that matches the page's purpose (and usually echoes the title).
- `<h2>`/`<h3>` in order, without skipping levels for visual effect.
- Headings that say something. "Pricing for residential programmes" beats "Details".

The workshop renderer on this site uses the first `#` heading of each Markdown file as the lesson title, which keeps the `<h1>`, the navigation label and the page title in step automatically.

## Images

- Descriptive `alt` text: what the image shows, in a sentence. This serves screen-reader users first, and image search and multimodal models second.
- Meaningful file names (`lake-district-venue.webp`, not `IMG_4021.webp`).
- Explicit `width` and `height` to avoid layout shift, which affects Core Web Vitals.

## Chapter Checklist

- [ ] Every route has a unique `<title>`, description and canonical
- [ ] `lang` is set on `<html>`
- [ ] Open Graph and Twitter tags use absolute URLs and an image that exists
- [ ] You have checked a pasted link in at least two chat apps
- [ ] You know whether your per-route meta survives without JavaScript
- [ ] One `<h1>` per page, headings in order, images with real `alt` text

---

**Next:** [Chapter 5: AI Crawlers and Access Controls](./05_ai_crawlers.md)
