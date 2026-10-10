# Chapter 9: Resources

> Primary documentation first. Vendors change crawler names and policies; always check the source before changing your `robots.txt`.

## Search Engine Documentation

- **Google Search Central — SEO Starter Guide:** [developers.google.com/search/docs/fundamentals/seo-starter-guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- **Google — AI features and your website (AI Overviews, AI Mode):** [developers.google.com/search/docs/appearance/ai-features](https://developers.google.com/search/docs/appearance/ai-features)
- **Google — JavaScript SEO basics:** [developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- **Google — robots.txt introduction:** [developers.google.com/search/docs/crawling-indexing/robots/intro](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- **Google — Common crawlers, including the Google-Extended token:** [developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- **Google — Structured data introduction:** [developers.google.com/search/docs/appearance/structured-data/intro-structured-data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- **Google — Spam policies:** [developers.google.com/search/docs/essentials/spam-policies](https://developers.google.com/search/docs/essentials/spam-policies)
- **Bing Webmaster Guidelines:** [bing.com/webmasters/help/webmaster-guidelines-30fba23a](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)

## AI Crawler Documentation

- **OpenAI — Overview of OpenAI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User):** [platform.openai.com/docs/bots](https://platform.openai.com/docs/bots)
- **OpenAI — Publishers and developers FAQ:** [help.openai.com/en/articles/12627856-publishers-and-developers-faq](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- **Anthropic — Crawler and web-content controls (ClaudeBot, Claude-SearchBot, Claude-User):** [support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- **Perplexity — Perplexity crawlers:** [docs.perplexity.ai/guides/bots](https://docs.perplexity.ai/guides/bots)
- **Apple — About Applebot:** [support.apple.com/en-us/119829](https://support.apple.com/en-us/119829)
- **Common Crawl — CCBot:** [commoncrawl.org/ccbot](https://commoncrawl.org/ccbot)
- **Meta — Web crawlers:** [developers.facebook.com/docs/sharing/webmasters/web-crawlers](https://developers.facebook.com/docs/sharing/webmasters/web-crawlers)

If a link has moved, search the vendor's site for "crawler" or the bot name; every vendor above maintains a current page.

## Standards and Proposals

- **Robots Exclusion Protocol (RFC 9309):** [rfc-editor.org/rfc/rfc9309](https://www.rfc-editor.org/rfc/rfc9309)
- **Sitemaps protocol:** [sitemaps.org/protocol.html](https://www.sitemaps.org/protocol.html)
- **schema.org vocabulary:** [schema.org](https://schema.org)
- **JSON-LD 1.1 (W3C):** [w3.org/TR/json-ld11](https://www.w3.org/TR/json-ld11/)
- **Open Graph protocol:** [ogp.me](https://ogp.me)
- **IndexNow:** [indexnow.org](https://www.indexnow.org)
- **llms.txt proposal (not an adopted standard):** [llmstxt.org](https://llmstxt.org)

## Tools

| Tool | Use |
|------|-----|
| [Google Search Console](https://search.google.com/search-console) | Indexing, URL Inspection, performance |
| [Bing Webmaster Tools](https://www.bing.com/webmasters) | The same for Bing; IndexNow integration |
| [Schema Markup Validator](https://validator.schema.org) | Validate JSON-LD against schema.org |
| [Rich Results Test](https://search.google.com/test/rich-results) | Google's rich-result eligibility |
| [PageSpeed Insights](https://pagespeed.web.dev) | Core Web Vitals and Lighthouse |
| `curl` | See exactly what a non-rendering crawler receives |
| Browser DevTools → Network → disable JavaScript | Quick visual check of the no-JS page |

## Related Workshops in This Curriculum

- **[Professional Output Suite](/workshops/workshop-05-afternoon-publishing)** — publish the site you will audit here.
- **[RAG System Implementation](/workshops/workshop-03-afternoon-rag-system)** — the retrieve-then-generate pattern answer engines are built on.
- **[Agent Orchestration & Safety](/workshops/workshop-04-afternoon-orchestration)** — why prompt injection in web content is an attack, not a tactic.
- **[Claude Code Mastery](/workshops/workshop-08-claude-code)** — automate the audits in Chapter 8.

## The DreamLab Case Study

The DreamLab site's own AI-visibility work is recorded in ADR-043 ("AI Search Visibility — Server-HTML Depth, Schema Hygiene, FAQ Layer") in the [site repository](https://github.com/DreamLab-AI/dreamlab-ai-website). Its live outputs are public:

- [dreamlab-ai.com/robots.txt](https://dreamlab-ai.com/robots.txt)
- [dreamlab-ai.com/llms.txt](https://dreamlab-ai.com/llms.txt)
- [dreamlab-ai.com/sitemap.xml](https://dreamlab-ai.com/sitemap.xml)
- View source on [dreamlab-ai.com](https://dreamlab-ai.com) to see the pre-hydration content and JSON-LD.

## Continue Learning

This module completes the self-guided curriculum. If you want to apply it to your organisation with practitioners in the room, our residential programmes cover discoverability alongside agentic AI, product prototyping and secure distributed systems.

**Explore programmes:** [dreamlab-ai.com/programmes](https://dreamlab-ai.com/programmes)

**Get in touch:** [dreamlab-ai.com/contact](https://dreamlab-ai.com/contact)

---

*A DreamLab AI Self-Guided Workshop | Last Updated: October 2026*
