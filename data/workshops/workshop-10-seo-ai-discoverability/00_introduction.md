# Chapter 0: Introduction — How Discovery Works in 2026

> **October 2026** — Search engines still send most referral traffic, but AI assistants increasingly answer the question before anyone clicks. Both depend on the same pipeline.

## Two Front Doors, One Pipeline

Ten years ago, "SEO" meant one thing: rank well in Google. Today a person looking for an AI training provider in the north of England might:

- search Google and click a result,
- read Google's AI Overview at the top of that page and never scroll,
- ask ChatGPT or Claude "who runs residential AI training in the Lake District?",
- ask Perplexity, which searches the web live and lists its sources.

Each of these is a different product, but all of them rely on the same underlying steps. If your page fails an early step, every later step is irrelevant.

![The discovery pipeline: discover, fetch, render, understand, index, rank or retrieve, then show a link or cite in an answer](/data/workshops/workshop-10-seo-ai-discoverability/diagrams/00-discovery-pipeline.svg)

- **Discover** — the crawler learns your URL exists, from a link, a sitemap or a submission.
- **Fetch** — it requests the page. `robots.txt`, firewalls and bot-protection services can stop it here.
- **Render** — if the content is produced by JavaScript, something has to execute it. Google does; many AI fetchers do not.
- **Understand** — headings, text, links and structured data tell the system what the page is about and who published it.
- **Index** — the page is stored in a search index, a retrieval index, or (for training crawlers) a dataset.
- **Rank or retrieve** — when a query arrives, the system selects candidate pages.
- **Show or cite** — a search engine shows a link; an answer engine writes prose and may cite the page.

## Three Kinds of AI Access

The most important idea in this workshop is that "AI bots" are not one thing. The major vendors document three distinct behaviours:

| Behaviour | What it does | Example tokens |
|-----------|--------------|----------------|
| **Training crawl** | Collects public content that may be used to train future models | `GPTBot`, `ClaudeBot`, `CCBot` |
| **Search / retrieval crawl** | Builds an index the assistant searches when answering | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` |
| **User-initiated fetch** | Fetches a page because a user asked about it right now | `ChatGPT-User`, `Claude-User`, `Perplexity-User` |

These deserve different decisions. You might reasonably block training while allowing search, because search can send you visitors and citations whereas training cannot. Chapter 5 covers this in detail.

## What Has Not Changed

Google's own guidance on AI Overviews and AI Mode is direct: there are no extra technical requirements. A page must be indexed and eligible to appear with a snippet in normal Search. No special file, no special schema. The fundamentals — crawlable pages, useful text content, accurate structured data, good internal links — are what matter.

That is reassuring. Most "AI optimisation" is good SEO done properly, applied with the awareness that some readers are machines that do not run JavaScript and do quote sentences verbatim.

## What Has Changed

Three things are genuinely different:

1. **Zero-click answers.** Many questions are answered on the results page or in a chat window. You may be the source without receiving the visit. Being cited — and cited accurately — becomes a goal in itself.
2. **Non-rendering readers.** A React app that shows a blank `<div id="root">` before JavaScript loads may index acceptably in Google but be close to empty for an AI fetcher.
3. **Brand as an entity.** Assistants answer "who is good at X?" from what the wider web says about you, not just what your own site says. Consistent facts and third-party mentions matter more.

## The Running Case Study

This workshop uses the DreamLab site as a worked example. It is a Vite + React single-page application hosted on GitHub Pages with no server-side rendering — a common and quite difficult starting point.

In August 2026 we ran three third-party AI-readiness analysers against the homepage. Crawl access scored well. Content structure and structured data scored poorly: the HTML delivered before JavaScript ran contained around 110 words, and the JSON-LD contained several outright errors. The decision record for the fixes, ADR-043 in the site repository, is referenced through the chapters that follow. You will reproduce the same audit on your own site in Chapter 8.

## What You Will Build

By the end of the exercises you will have:

- a crawl and render audit of your own site, done with `curl` and webmaster tools,
- a deliberate `robots.txt` policy for search and AI crawlers,
- validated JSON-LD for your organisation and key pages,
- at least one page rewritten for answer-engine extraction,
- a simple measurement setup for search and AI referrals.

---

**Next:** [Chapter 1: Crawling and Indexing](./01_crawling_indexing.md)
