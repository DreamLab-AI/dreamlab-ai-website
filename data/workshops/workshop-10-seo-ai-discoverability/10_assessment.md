# Chapter 10: Assessment

> **Duration:** 15 minutes
> **Passing Score:** 80% (12/15 correct)

## Multiple Choice Questions

### Eligibility and Rendering (5 questions)

**1. According to Google, what must a page satisfy to be shown as a supporting link in AI Overviews or AI Mode?**
- A) Include FAQPage structured data
- B) Be indexed and eligible to be shown with a snippet in Google Search ✓
- C) Provide an llms.txt file
- D) Be under 2,000 words

**2. Your single-page app works in the browser, but `curl -I https://site.com/pricing` returns `404`. What is the most likely cause?**
- A) The page is too slow
- B) The static host serves its not-found page and JavaScript redirects to the app ✓
- C) Google has penalised the site
- D) The page lacks structured data

**3. Which crawler is documented to render JavaScript before indexing?**
- A) Googlebot ✓
- B) GPTBot
- C) CCBot
- D) None of them

**4. A page's raw HTML contains only `<div id="root"></div>`. What does a crawler that doesn't run JavaScript index?**
- A) The full page, from the sitemap
- B) The title and an empty body ✓
- C) The JSON-LD the app adds after loading
- D) A cached copy from Google

**5. On GitHub Pages, `/about/index.html` exists. What does a request for `/about` return?**
- A) 404
- B) 200 with the page
- C) A 301 redirect to `/about/` ✓
- D) The site's homepage

### Crawlers and robots.txt (4 questions)

**6. You block `GPTBot` in robots.txt. What is the effect?**
- A) Your site disappears from ChatGPT search
- B) OpenAI stops using your pages for model training; ChatGPT search (OAI-SearchBot) is unaffected ✓
- C) Google stops indexing the site
- D) Nothing; GPTBot ignores robots.txt

**7. Blocking `Google-Extended` will…**
- A) Remove the site from Google Search
- B) Remove the site from AI Overviews
- C) Control use of the content for Gemini training and grounding, without affecting Google Search ✓
- D) Block all Google crawlers

**8. Why should robots.txt not disallow `/*.json$` on a single-page app?**
- A) JSON files are too small to matter
- B) Google needs the data files to render pages that load them ✓
- C) robots.txt does not support wildcards
- D) It would block the sitemap

**9. Which user agent may not follow robots.txt, according to its operator?**
- A) OAI-SearchBot
- B) ChatGPT-User ✓
- C) ClaudeBot
- D) Googlebot

### Structured Data and Content (4 questions)

**10. Which structured data is a spam risk?**
- A) BreadcrumbList matching the visible breadcrumbs
- B) An organisation's AggregateRating of itself from one review ✓
- C) A Course with `isAccessibleForFree: true` for a free course
- D) A WebSite node with `@id`

**11. What is the purpose of `@id` in a JSON-LD graph?**
- A) It sets the page's canonical URL
- B) It gives an entity a stable identifier so other nodes and pages can reference it ✓
- C) It is required for rich results
- D) It hides the node from crawlers

**12. Which section opening is most extractable?**
- A) "There are many things to consider, and over time we've found…"
- B) "The residential programme runs for one to three days at our venue in the Lake District, Cumbria." ✓
- C) "Read on to find out more about our exciting offer!"
- D) "As mentioned above, it depends."

**13. Google's guide for generative AI features says you do NOT need to…**
- A) Make content crawlable
- B) Provide a good page experience
- C) Create AI text files, special markup or Markdown copies of pages ✓
- D) Meet Search technical requirements

### Measurement (2 questions)

**14. Where can you see the HTML Google rendered for one of your pages?**
- A) robots.txt tester
- B) Search Console URL Inspection ✓
- C) The sitemap
- D) Bing Webmaster Tools

**15. A sitemap is built in CI from a shallow git clone. What should happen to `<lastmod>`?**
- A) Set every page to today's date
- B) Omit it rather than publish dates that don't reflect real changes ✓
- C) Use the build server's file timestamps
- D) Use a random recent date

---

## Practical Task (optional, ungraded)

Repeat [Exercise 1](08_exercises.md) ("What does a crawler see?") against a site you don't own, such as a competitor or a charity you support. Write three sentences: the most serious problem, its impact on AI visibility, and the fix.

---

<details>
<summary><strong>Answer key</strong></summary>

1-B, 2-B, 3-A, 4-B, 5-C, 6-B, 7-C, 8-B, 9-B, 10-B, 11-B, 12-B, 13-C, 14-B, 15-B
</details>

**Back:** [Resources](09_resources.md) · [Module overview](README.md)

---

*A DreamLab AI Self-Guided Workshop | Last Updated: October 2026*
