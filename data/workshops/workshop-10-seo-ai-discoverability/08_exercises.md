# Chapter 8: Hands-On Exercises

> Use a site you control. The GitHub Pages site you published in the Professional Output Suite workshop is ideal; so is your organisation's site, with permission.

Each exercise produces a short written finding. Keep them in one file, `discoverability-audit.md`, in your repository — by the end it is a complete audit you can share.

---

## Exercise 1: What Does a Crawler See? (30 minutes)

**Goal:** Compare raw and rendered HTML for three pages.

1. Choose your homepage, one deep page and one page that changes often.
2. For each, run:

   ```bash
   curl -s -o raw.html -w "%{http_code}\n" https://YOUR-SITE/PAGE
   sed -e 's/<script[^>]*>.*<\/script>//g' -e 's/<[^>]*>/ /g' raw.html | wc -w
   grep -o '<title>[^<]*' raw.html
   grep -c 'application/ld+json' raw.html
   ```

3. Open the same page in Search Console's URL Inspection (or simply a browser) and estimate the rendered word count.
4. Record for each page: status code, raw word count, rendered word count, title, number of JSON-LD blocks.

**Success looks like:** every page returns `200`, the raw HTML contains your main heading and the substance of the page, and each page has its own title.

**If not:** you have found your first priority — see Chapter 2.

---

## Exercise 2: robots.txt and Sitemap Review (30 minutes)

1. Fetch `https://YOUR-SITE/robots.txt` and `https://YOUR-SITE/sitemap.xml`.
2. For each named `User-agent` group, list which rules from the `*` group it no longer inherits.
3. Check that no CSS, JavaScript or data path the site needs is disallowed.
4. Pick five URLs from the sitemap and confirm each returns `200` with a matching canonical.
5. Pick five real pages on your site and confirm each appears in the sitemap.

**Deliverable:** a corrected `robots.txt` and a list of sitemap fixes.

---

## Exercise 3: Write Your AI Crawler Policy (45 minutes)

1. From your logs or CDN analytics, list the AI-related bots visiting your site in the last 30 days. (No logs? Note that, and use the table in Chapter 5.)
2. Write three sentences: what you want from search and answer engines, what you want regarding model training, and what must never be read without authentication.
3. Translate those sentences into `robots.txt` groups.
4. Check your CDN or firewall bot settings do not contradict the file.

**Deliverable:** the policy sentences and the `robots.txt` that implements them, side by side, so a colleague can check one against the other.

---

## Exercise 4: Fix Your Structured Data (60 minutes)

1. Extract every JSON-LD block from your homepage:

   ```bash
   curl -s https://YOUR-SITE/ \
     | sed -n '/application\/ld+json/,/<\/script>/p'
   ```

2. Run the homepage through the Schema Markup Validator and Google's Rich Results Test.
3. For every property, ask: *can a visitor see or verify this on the page?* List empty values, placeholder data, ratings without visible reviews, and links to things that do not exist.
4. Write a corrected `Organization` block with a stable `@id`, real logo, and `sameAs` links to your actual profiles.
5. Add one page-level type for your most important page (`Course`, `LearningResource`, `Article`, `Event` or `Service`).

**Success looks like:** both validators pass with no errors, and every value is true.

---

## Exercise 5: Rewrite One Page for Answer Engines (60 minutes)

1. Choose a page that answers a question people ask about you — services, pricing, "about", or a guide.
2. Write down the three questions that page should answer.
3. Rewrite it so that:
   - each question has a heading,
   - the first sentence under each heading answers it directly,
   - each passage names its subject rather than relying on "it" or "we",
   - specific facts (numbers, dates, places) are present,
   - a "last updated" date is visible.
4. Add a short visible FAQ and mirror it exactly in `FAQPage` JSON-LD.
5. Paste one passage alone into a chat with a colleague, or an assistant, and ask "what is this about and who is it from?" If they cannot tell, rewrite it.

---

## Exercise 6: Publish an llms.txt (20 minutes)

1. Write `/llms.txt` following the structure in Chapter 6: H1, blockquote summary, a short paragraph, and `##` sections of annotated links to your most important pages.
2. Keep it under one screen. It is a guide, not a sitemap.
3. Note in your audit that it is an optional convention, and that you are not expecting it to change rankings.

---

## Exercise 7: Baseline Your Prompt Panel (45 minutes)

1. Write ten questions a real prospect might ask — four category, three comparison, three brand.
2. Run each in two assistants your audience actually uses.
3. Fill in the table from Chapter 7: mentioned, cited, facts correct, others named.
4. Highlight every incorrect fact and trace where on the web it might come from.

**Deliverable:** the baseline table, dated, to compare against next month.

---

## Capstone: The One-Page Discoverability Report (60 minutes)

Combine your findings into a single page for a decision-maker:

1. **Where we are** — three numbers: raw-HTML word count on the homepage, pages indexed vs pages that exist, prompt-panel mention rate.
2. **What is broken** — the top five issues, each with its chapter reference.
3. **What we decided** — your AI crawler policy in three sentences.
4. **What we will do next** — one change per month for the next three months, each with how you will measure it.

**Using Claude Code (Phase 4):** many of these steps automate well. Try asking Claude Code to run the Exercise 1 commands across every URL in your sitemap and produce a table, or to draft JSON-LD from your page content and then validate it. Review everything it produces — especially structured data, where a confident but false value is worse than none.

---

**Next:** [Chapter 9: Resources](./09_resources.md)
