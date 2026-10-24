# Chapter 5: AI Crawlers and Access Controls

> "Should we block AI bots?" is the wrong question. The right one is: which bots, doing what, in exchange for what?

## The Three Roles, Vendor by Vendor

The tokens below are taken from each vendor's own crawler documentation (linked in Chapter 9). Vendors add and rename agents, so re-check the primary pages before you rely on this table.

| Vendor | Training crawl | Search / retrieval crawl | User-initiated fetch |
|--------|---------------|--------------------------|---------------------|
| OpenAI | `GPTBot` | `OAI-SearchBot` | `ChatGPT-User` |
| Anthropic | `ClaudeBot` | `Claude-SearchBot` | `Claude-User` |
| Perplexity | — | `PerplexityBot` | `Perplexity-User` |
| Google | `Google-Extended` *(control token)* | `Googlebot` | — |
| Apple | `Applebot-Extended` *(control token)* | `Applebot` | — |
| Common Crawl | `CCBot` | — | — |
| Meta | `meta-externalagent` | — | `facebookexternalhit` *(link previews)* |

### Two kinds of entry that are easy to misread

**Control tokens are not crawlers.** `Google-Extended` and `Applebot-Extended` never appear in your server logs. Google and Apple crawl with `Googlebot` and `Applebot` as usual; the extended token only tells them whether content they have already crawled may be used for generative-AI training and related uses. Blocking `Google-Extended` does **not** affect your Google Search ranking or inclusion.

**User-initiated fetchers may not obey `robots.txt`.** OpenAI states that because `ChatGPT-User` acts on a user's request, `robots.txt` rules may not apply. Perplexity says the same of `Perplexity-User`. The reasoning is that the fetch is equivalent to the person opening the page in a browser. If something must not be read, protect it with authentication.

## Making a Policy

Write down what you want before you write any rules. A useful way to frame it:

| Goal | Allow | Consider blocking |
|------|-------|------------------|
| Be cited in AI answers and get referral clicks | Search / retrieval crawlers and user fetchers | — |
| Keep content out of future model training | Search crawlers | `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Applebot-Extended`, `meta-externalagent` |
| Maximum reach, including model knowledge of your brand | Everything | — |
| Paywalled or licensed content | Nothing on the protected paths | Everything, plus authentication |

There is a real trade-off in the training column. A model that has never seen your site cannot know your organisation exists when someone asks it a question without web search turned on. For a training company that wants to be recommended, allowing training is often the right commercial decision. For a publisher whose content *is* the product, it may not be.

### Example: allow search and answers, decline training

```text
# Default: everyone may crawl public pages
User-agent: *
Allow: /
Disallow: /admin/

# AI search and retrieval: explicitly welcome
User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
Allow: /
Disallow: /admin/

# Model training: opt out
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: meta-externalagent
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

Several `User-agent` lines may share one group. Remember the rule from Chapter 1: a named group replaces the `*` group for that bot, so repeat any `Disallow` you still want applied.

### Example: welcome everything (the DreamLab choice)

DreamLab teaches AI and wants assistants to know about its programmes and free courses, so the site allows all major crawlers and publishes an `llms.txt` guide (Chapter 6). The point is that it is a deliberate choice, written down alongside the rest of the site’s AI-visibility decisions (ADR-043), rather than a default nobody thought about.

## Controls Beyond robots.txt

- **Snippet controls.** In Google, `nosnippet`, `max-snippet` and `data-nosnippet` also limit what can be shown in AI Overviews and AI Mode. These apply per page or per element.
- **`noindex`.** Keeps a page out of search indexes entirely, including the AI features that draw on them.
- **CDN bot management.** Cloudflare, Fastly, Akamai and others classify and can block AI bots at the edge. Check these settings: a well-meaning default can block search crawlers you meant to allow, and `robots.txt` cannot override a firewall.
- **Authentication.** The only control that actually prevents reading.

## Verifying That a Bot Is Who It Claims

User-agent strings are trivially spoofed. Scrapers routinely pretend to be Googlebot. To verify:

1. **Published IP ranges.** OpenAI, Google, Apple and others publish the IP ranges their crawlers use. Match the requesting IP against the list.
2. **Reverse DNS.** For Googlebot, reverse-resolve the IP, check the hostname ends in `googlebot.com` or `google.com`, then forward-resolve that hostname and confirm it returns the original IP.

```bash
# Reverse then forward DNS check for a claimed Googlebot IP
host 66.249.66.1
host crawl-66-249-66-1.googlebot.com
```

Only make allow/deny decisions on verified identities. Your CDN's "verified bot" category usually does this for you.

## Reading Your Logs

Before writing a policy, look at what is actually visiting:

```bash
# Count requests by AI-related user agents in an access log
grep -oiE 'GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|CCBot|Applebot|meta-externalagent|Googlebot|bingbot' access.log \
  | sort | uniq -c | sort -rn
```

Static hosts such as GitHub Pages do not expose access logs. If you need them, put a CDN in front of the site — its analytics typically break traffic down by bot category.

## Chapter Checklist

- [ ] You know which of the three roles each bot visiting your site plays
- [ ] You have written down your goals before writing rules
- [ ] `robots.txt` implements those goals, with rules repeated in every named group
- [ ] You understand that control tokens never appear in logs and user fetchers may ignore `robots.txt`
- [ ] Your CDN or firewall is not silently contradicting your `robots.txt`
- [ ] Anything truly private is behind authentication

---

**Next:** [Chapter 6: Writing for Answer Engines](./06_answer_engine_content.md)
