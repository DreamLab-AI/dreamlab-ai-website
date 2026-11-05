# Chapter 2: Rendering JavaScript Sites

> If your content only exists after JavaScript runs, assume some of your most important readers never see it.

## The Single-Page App Problem

A typical React, Vue or Svelte app built with Vite ships an `index.html` that looks like this:

```html
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-a1b2c3.js"></script>
</body>
```

A browser downloads the script, runs it, and paints the page. A reader that does not run JavaScript sees an empty `<div>`.

Who runs JavaScript?

| Reader | Executes JavaScript? |
|--------|---------------------|
| Googlebot | Yes — pages are queued for rendering after the initial fetch, which can add delay |
| Bingbot | Yes, with some limitations |
| AI training and search crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, …) | Not documented by their vendors; do not assume it |
| Link-preview fetchers (Slack, LinkedIn, Facebook, X) | No — they read the raw HTML `<head>` |
| Screen readers and text browsers | Varies |

Google itself recommends server-side rendering, static rendering or prerendering where practical, rather than relying solely on its renderer. For AI fetchers, it is the only safe assumption.

## Test What a Crawler Sees

You do not need special tools. `curl` fetches the raw HTML exactly as a non-rendering bot would:

```bash
# Raw HTML, as a non-rendering crawler receives it
curl -s https://example.com/workshops | sed -n '/<body/,/<\/body>/p' | head -40

# Count visible words in the raw HTML (rough but useful)
curl -s https://example.com/workshops \
  | sed -e 's/<script[^>]*>.*<\/script>//g' -e 's/<[^>]*>/ /g' \
  | wc -w

# Fetch with a bot's user agent, in case your CDN treats bots differently
curl -s -A "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" \
  -o /dev/null -w "%{http_code}\n" https://example.com/
```

Then compare with what Google rendered, using **URL Inspection → View crawled page → HTML** in Search Console.

If the raw HTML has a few dozen words and the rendered page has a few thousand, you have the SPA problem.

## The Fixes, From Heaviest to Lightest

### 1. Server-side rendering (SSR)

A server renders each request to full HTML, then the client "hydrates" it. Next.js, Nuxt, SvelteKit, Remix and Astro offer this. It needs a server or edge runtime, which static hosts like GitHub Pages do not provide.

### 2. Static site generation / prerendering

At build time, render every route to its own HTML file. The output is still static, so it works on GitHub Pages, Netlify, Cloudflare Pages or an S3 bucket. On load, the client app takes over.

```
dist/
  index.html                         ← full homepage HTML
  workshops/index.html               ← full workshop index HTML
  workshops/workshop-10-.../README.md/index.html
```

This is usually the best fit for marketing sites and documentation. The route list should come from the same data as the app's router so new pages are prerendered automatically.

### 3. A static fallback inside `index.html`

The lightest fix, and the one DreamLab used first. Put meaningful HTML — headings, a summary, key links, a call to action — inside `#root`. React replaces it when it mounts, so users never see it, but non-rendering readers get real content.

```html
<div id="root">
  <header>
    <h1>DreamLab AI — residential AI training in the Lake District</h1>
    <p>Applied innovation lab offering residential programmes, R&amp;D residencies
       and free self-guided AI courses.</p>
    <nav>
      <a href="/programmes">Programmes</a>
      <a href="/workshops">Free self-guided workshops</a>
      <a href="/contact">Book a discovery call</a>
    </nav>
  </header>
</div>
```

Its limitation is that it is one block for the whole site: every route serves the homepage's fallback. It is a sensible first step, not a finish line. In ADR-043 we measured the effect: the server-delivered homepage went from roughly 110 words to over 800, including an FAQ that is mirrored in `FAQPage` JSON-LD.

### 4. Dynamic rendering (avoid)

Serving pre-rendered HTML to bots and the JavaScript app to people. Google describes this as a workaround rather than a recommended long-term solution. It is fragile, and it creates the risk of showing bots different content from users.

## Rendering Pitfalls That Survive the Fix

- **Links that are not links.** `<div onClick={() => navigate('/x')}>` is invisible to crawlers. Use real `<a href>` elements (React Router's `<Link>` renders one).
- **Content behind interactions.** Text that appears only after a click, a tab change or infinite scroll may never be rendered by a crawler.
- **Fetched content without fallbacks.** If a page fetches its body from `/data/page.md` at runtime, prerendering must wait for that fetch or inline the content at build time.
- **Hash routing.** URLs like `/#/workshops` are treated as one page. Use history-based routes.
- **Per-route `<head>` set only in the browser.** Titles and Open Graph tags set by JavaScript are invisible to link-preview fetchers. Prerendering solves this too (Chapter 4).

## Worked Example: Markdown-Backed Lessons

The workshop you are reading is stored as Markdown under `public/data/workshops/` and fetched by the React app at runtime. That has a pleasant side effect for discoverability: the Markdown files are themselves static, readable, plain-text resources at stable URLs, for example:

```
https://dreamlab-ai.com/data/workshops/workshop-10-seo-ai-discoverability/README.md
```

Clean Markdown copies of important pages are exactly what the `llms.txt` proposal (Chapter 6) recommends offering to language models. If your content already lives in Markdown, exposing it costs nothing.

## Chapter Checklist

- [ ] You have compared raw HTML (`curl`) with rendered HTML (URL Inspection) for your key pages
- [ ] Important text, headings and links exist in the HTML before JavaScript runs
- [ ] Navigation uses real `<a href>` links and history-based URLs
- [ ] Each route has its own HTML, or you have a plan to prerender
- [ ] You are not serving bots different content from people

---

**Next:** [Chapter 3: Structured Data with JSON-LD](./03_structured_data.md)
