# Chapter 1: Crawling and Indexing

> A page that is never fetched cannot rank, and a page that is never indexed cannot be retrieved. Start here.

## robots.txt: The Front Gate

`robots.txt` lives at the root of your domain (`https://example.com/robots.txt`). It tells compliant crawlers which paths they may fetch. It is a request, not a security control: anything sensitive must be protected by authentication, not hidden by a `Disallow` line.

A minimal, permissive file:

```text
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

### How the rules are read

- A crawler looks for the **most specific `User-agent` group** that names it, and follows only that group. If you write a `User-agent: Googlebot` group, Googlebot ignores the `*` group entirely.
- Within a group, the **longest matching path** wins. `Allow: /docs/public/` beats `Disallow: /docs/`.
- `*` matches any sequence of characters and `$` anchors the end of a URL: `Disallow: /*.json$` blocks every URL ending in `.json`.
- `Crawl-delay` is ignored by Google. Some other crawlers honour it.

### A trap from our own site

When this module was written, the DreamLab `robots.txt` contained:

```text
User-agent: *
Disallow: /*.json$

User-agent: Googlebot
Allow: /
```

Because Googlebot has its own group, it ignores the `*` group — so the `.json` rule never applied to Google, while other bots were blocked from runtime JSON the site might need for rendering. Neither outcome was intended. **When you add a named group, repeat every rule you still want that bot to follow.**

### Do not block your own assets

If the CSS, JavaScript or data files your pages need are disallowed, a rendering crawler sees a broken page. Google's URL Inspection tool shows you blocked resources; check it after any `robots.txt` change.

## Sitemaps: The Map You Hand Over

An XML sitemap lists the URLs you want indexed, optionally with a last-modified date.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/workshops</loc>
    <lastmod>2026-10-01</lastmod>
  </url>
</urlset>
```

Practical rules:

- List **canonical** URLs only — the version you want shown, with the same protocol, host and trailing-slash style everywhere.
- Keep `lastmod` honest. Google has said it uses `lastmod` only when it is consistently accurate; stamping today's date on every page teaches engines to ignore it.
- `priority` and `changefreq` are ignored by Google. You can omit them.
- Reference the sitemap from `robots.txt` and submit it in Google Search Console and Bing Webmaster Tools.
- Generate it from the same source as your routes. A hand-maintained sitemap drifts the moment someone adds a page.

## Canonical URLs

The same content often lives at several addresses: with and without `www`, with tracking parameters, with and without a trailing slash. Pick one and declare it:

```html
<link rel="canonical" href="https://example.com/workshops/workshop-10-seo-ai-discoverability" />
```

Every page should carry a self-referencing canonical. In a single-page app, that tag must change on navigation — a fixed canonical in `index.html` pointing at the homepage tells engines that every route is a duplicate of `/`. That is one of the most common SPA indexing failures.

## Status Codes Matter

| Code | Meaning to a crawler |
|------|---------------------|
| `200` | Here is the page |
| `301` / `308` | Permanently moved — transfer signals to the new URL |
| `302` / `307` | Temporarily moved — keep the old URL indexed |
| `404` / `410` | Gone — drop it from the index |
| `5xx` | Server trouble — try again later; repeated errors reduce crawling |

Static hosts such as GitHub Pages serve a `404.html` for unknown paths, and SPA setups often use that file to boot the app for deep links. The result is a **soft 404 in reverse**: real pages served with a `404` status. If your deep links return `404` and only work because JavaScript repairs them, search engines may refuse to index them. Prerendering each route to its own `index.html` (Chapter 2) fixes this at the root.

## Meta Robots and X-Robots-Tag

To keep a fetchable page out of the index, use a `noindex` directive rather than `robots.txt`:

```html
<meta name="robots" content="noindex" />
```

A crawler must be able to fetch the page to see `noindex`. If you `Disallow` it in `robots.txt` as well, the directive is never read, and the URL can still appear in results from external links.

Useful values:

- `noindex` — do not show this page in results
- `nofollow` — do not follow links from this page
- `nosnippet` — do not show a text snippet (Google also applies this to AI Overviews)
- `max-snippet:50` — limit snippet length
- `data-nosnippet` attribute — exclude one element from snippets

For non-HTML files such as PDFs, send the same directives in an `X-Robots-Tag` HTTP header.

## Webmaster Tools

Register your site with both:

- **Google Search Console** — coverage reports, URL Inspection (shows the rendered HTML Google saw), sitemap submission, search performance.
- **Bing Webmaster Tools** — the same for Bing, whose index also feeds several other search products.

URL Inspection is the single most useful diagnostic in this chapter. It answers "did Google fetch it, what did it render, and is it indexed?" without guesswork.

## IndexNow: Push Instead of Wait

IndexNow is an open protocol for telling participating search engines that a URL has been added, changed or deleted. Bing, Yandex, Seznam, Naver and Yep participate; a notification sent to one is shared with the others. Google does not participate, so it complements rather than replaces sitemaps.

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "example.com",
    "key": "YOUR_KEY",
    "keyLocation": "https://example.com/YOUR_KEY.txt",
    "urlList": ["https://example.com/workshops/workshop-10-seo-ai-discoverability"]
  }'
```

You host the key file yourself to prove ownership. Calling this from your deploy pipeline is a small, worthwhile automation.

## Chapter Checklist

- [ ] `robots.txt` exists, allows what you want indexed, and repeats rules inside every named group
- [ ] No CSS, JS or data needed for rendering is disallowed
- [ ] A generated sitemap lists canonical URLs with honest `lastmod` values
- [ ] Every page has a correct, self-referencing canonical
- [ ] Deep links return `200`, not `404`
- [ ] Search Console and Bing Webmaster Tools are verified and the sitemap is submitted

---

**Next:** [Chapter 2: Rendering JavaScript Sites](./02_rendering_javascript.md)
