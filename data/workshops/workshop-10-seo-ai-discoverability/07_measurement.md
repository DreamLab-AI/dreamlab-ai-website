# Chapter 7: Measuring Discoverability

> You cannot see inside the ranking systems, but you can measure what goes in (crawls), what comes out (impressions, citations) and what reaches you (visits).

## What You Can and Cannot Measure

| Signal | Measurable? | Where |
|--------|-------------|-------|
| Which bots fetch which pages | Yes, if you have logs | Server or CDN logs |
| Indexing status per URL | Yes | Search Console, Bing Webmaster Tools |
| Search impressions, clicks, queries | Yes | Search Console, Bing Webmaster Tools |
| Clicks arriving from AI assistants | Partly | Analytics referrers and UTM parameters |
| How often an assistant mentions you | Only by sampling | Your own prompt panel |
| Why a system chose a competitor | No | — |

## Search Console and Bing Webmaster Tools

The basics, checked monthly:

- **Page indexing report** — which URLs are indexed, and why others are not ("Crawled — currently not indexed", "Duplicate without user-selected canonical", "Soft 404"). Each reason maps to a chapter in this workshop.
- **Performance report** — queries, impressions, clicks and average position. Google includes AI Overviews and AI Mode traffic in the overall Web search figures rather than reporting it separately, so look at trends rather than expecting an "AI" line.
- **URL Inspection** — after any significant change, inspect a representative page and confirm the rendered HTML contains your content.
- **Bing Webmaster Tools** — Bing's index also feeds other search products, so it is worth the ten minutes to set up.

## AI Referral Traffic

When a user clicks a citation in an assistant, the visit usually arrives with a referrer or a tag:

- OpenAI documents that ChatGPT search adds `utm_source=chatgpt.com` to referral links, so these visits are easy to segment.
- Other assistants are typically identifiable by their referrer domain — for example `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`.
- Some visits arrive with no referrer at all (apps, privacy settings), so treat AI referral numbers as a lower bound.

Create a segment or channel in your analytics for these sources. Watch which **landing pages** they arrive on: those are the pages assistants find worth citing, and they tell you what to write more of.

## Crawl Monitoring

If you have access logs (Chapter 5 shows the command), track per month:

- requests per bot,
- the most-fetched URLs per bot,
- error rates served to bots (a spike in `403` or `429` usually means a firewall or rate limiter is blocking someone you wanted).

A sudden drop to zero for a search crawler you allow is an incident worth investigating the same day.

## A Prompt Panel

The only way to see how assistants describe you is to ask them, consistently.

1. Write 10–20 questions a real prospect might ask. Mix **category** questions ("residential AI training in the UK"), **comparison** questions ("DreamLab vs …"), and **brand** questions ("what does DreamLab AI do?").
2. Run them monthly in the assistants your audience uses, with web search on and off where the product allows.
3. Record: were you mentioned, were you cited with a link, were the facts correct, and who else appeared?
4. Track the trend, not individual answers. Responses vary between runs; a single answer proves little.

An illustrative log might look like this:

| Question | Assistant | Mentioned | Cited | Facts correct | Others named |
|----------|-----------|-----------|-------|---------------|--------------|
| Residential AI training in the Lake District | ChatGPT (search on) | Yes | Yes | Yes | — |
| What does DreamLab AI do? | Claude (search off) | Yes | — | Partly (old team size) | — |

That "Partly" is the most useful entry in the table: it tells you which fact is stale somewhere on the web.

You can automate the panel with the API skills from Phase 3 and the agents from Phase 7 — but respect each provider's terms of service, and keep a human reviewing the results.

## Third-Party "AI Visibility" Graders

Several tools now score sites for "AI readiness". DreamLab ran three of them before writing ADR-043. They are useful as checklists — they flagged the thin pre-rendered HTML and rated the structured data as shallow — but the concrete JSON-LD errors listed in Chapter 3 came from a separate manual audit, not from any grader. Their overall scores are each vendor's own model, not a measurement of any real assistant. Use them to find issues; do not chase the number.

## A Monthly Routine

1. Search Console and Bing: indexing errors and performance trends (15 minutes).
2. Analytics: AI referral sessions and their landing pages (10 minutes).
3. Logs or CDN: bot volumes and error rates (10 minutes).
4. Prompt panel: run, record, compare with last month (30 minutes).
5. Pick **one** improvement for the month and ship it.

## Chapter Checklist

- [ ] Search Console and Bing Webmaster Tools verified and reviewed
- [ ] An analytics segment for AI assistant referrals
- [ ] Some form of bot crawl visibility (logs or CDN analytics)
- [ ] A written prompt panel with a baseline run recorded
- [ ] A monthly routine on someone's calendar

---

**Next:** [Chapter 8: Hands-On Exercises](./08_exercises.md)
