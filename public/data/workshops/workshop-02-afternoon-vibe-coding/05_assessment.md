# Chapter 5: Assessment — Validate Your Mastery

## Introduction: Proving Your Creative Power

This assessment validates that you've mastered vibe coding — the ability to create real, deployed web pages through conversational AI. It combines knowledge checks, practical demonstrations, and reflection.

**Time:** 10 minutes
**Passing Score:** 80% (24/30 points)
**Format:** Multiple choice, practical tasks, and reflection

## Part 1: Knowledge Check (10 points)

### Question 1: Vibe Coding Fundamentals (2 points)

What is the single most important factor in getting a good first draft from a vibe coding prompt?

A) Using technical HTML/CSS terminology
B) Writing a long prompt with many paragraphs
C) Being specific and descriptive about what you want (colours, layout, content, responsiveness)
D) Asking the AI to use the latest JavaScript framework

**Answer:** C — Specificity and descriptiveness beat length and technicality every time.

---

### Question 2: The Iterative Loop (2 points)

What is the recommended approach when your AI-generated page doesn't look right?

A) Delete everything and start from scratch
B) Open the HTML file and manually fix the code
C) Describe what's wrong in natural language and ask for targeted changes
D) Try a completely different AI tool

**Answer:** C — The iterative refinement loop (describe the issue, request changes, review) is the core vibe coding workflow.

---

### Question 3: Tool Selection (2 points)

When should you use Claude Code (or Cursor/Windsurf) instead of a browser chat interface like Claude.ai or ChatGPT?

A) When you want prettier responses
B) When you're building a multi-file project, need local file access, or want automated deployment
C) Only when building complex applications with databases
D) There's no meaningful difference

**Answer:** B — File-based AI agents excel when you need to manage files, run commands, and iterate on a real project structure. Chat interfaces work well for single-file prototypes.

---

### Question 4: Prompt Writing (2 points)

Which of these prompts will produce a better result?

**Prompt A:**
```
Make a nice website for my business.
```

**Prompt B:**
```
Create a landing page for a yoga studio called "Stillpoint". 
Hero section with calming blue-green gradient, white text reading 
"Find Your Centre". Below that, 3 class cards (Hatha, Vinyasa, 
Yin) with descriptions and times. Contact form at the bottom. 
Clean, minimal style with lots of white space. Responsive.
```

A) Prompt A — it gives the AI more creative freedom
B) Prompt B — the specificity guides AI toward your vision
C) Both produce similar results
D) Neither — you should always provide a wireframe image instead

**Answer:** B — Specific prompts with named elements, colours, layout descriptions, and responsiveness requirements produce dramatically better first drafts.

---

### Question 5: Deployment (2 points)

What is GitHub Pages?

A) A premium web hosting service costing £10/month
B) A free static site hosting service that serves files from a GitHub repository
C) A tool for designing web pages visually
D) A JavaScript framework for building websites

**Answer:** B — GitHub Pages serves static files (HTML, CSS, JavaScript) directly from a public repository, free of charge, with a URL like `username.github.io/repo-name`.

---

## Part 2: Practical Skills (15 points)

### Task 1: The Cold Start (4 points)

**Instructions:**
Without any warm-up, write a single prompt and generate a complete web page. You have 3 minutes.

**Requirements:**
- Page must have at least 3 distinct sections
- Specific colour palette mentioned
- Responsive behaviour requested
- At least one interactive element requested

**Evaluation Criteria:**
- Prompt includes all required elements (1 point)
- Generated page displays correctly (1 point)
- Page is responsive (resize to phone width) (1 point)
- Interactive element functions (1 point)

---

### Task 2: The Refinement Challenge (4 points)

**Instructions:**
Take the page from Task 1 and improve it through exactly 2 rounds of refinement. Each round should produce a visible improvement.

**Round 1 — Describe and Fix:**
Look at the page and identify the most impactful change needed. Describe it naturally and have AI implement it.

**Round 2 — Polish:**
Identify a second improvement — visual polish, animation, mobile fix, or content refinement. Describe and implement it.

**Evaluation Criteria:**
- Round 1 description is clear and natural (1 point)
- Round 1 change is visibly implemented (1 point)
- Round 2 description addresses a different aspect (1 point)
- Final page is noticeably improved from the first draft (1 point)

---

### Task 3: Debugging Through Conversation (3 points)

**Instructions:**
A page has the following issues. For each one, write the natural-language prompt you'd send to fix it (you don't need to actually run these — just write the prompts).

**Issue 1:** The navigation links at the top don't scroll to the right sections when clicked.

**Issue 2:** On mobile phones, the three feature cards overlap each other instead of stacking vertically.

**Issue 3:** The contact form's "Submit" button is almost invisible because the text colour matches the button background.

**Evaluation Criteria:**
- Issue 1 prompt describes the problem clearly (1 point)
- Issue 2 prompt specifies the desired mobile behaviour (1 point)
- Issue 3 prompt identifies the colour conflict and requests a fix (1 point)

**Example Good Answers:**

Issue 1:
```
The navigation links don't work — when I click "About" or "Contact" 
in the nav bar, nothing happens. They should smooth-scroll to the 
matching section on the page.
```

Issue 2:
```
On phone screens, the three feature cards are overlapping and 
unreadable. Make them stack into a single column with spacing 
between each card on screens smaller than 768px.
```

Issue 3:
```
The Submit button text is invisible — the text colour is the 
same as the button background. Change the text to white so it 
contrasts clearly against the button colour.
```

---

### Task 4: Deployment Demonstration (4 points)

**Instructions:**
Deploy your page from Task 1 (or any page from today's session) to a live URL. Demonstrate that it's accessible from a web browser.

**Evaluation Criteria:**
- Page is in a GitHub repository (1 point)
- GitHub Pages is enabled (1 point)
- Page loads at a live public URL (1 point)
- Page displays correctly at the live URL (1 point)

**If time is short:** Describe the exact steps you would take to deploy, even if you don't complete the process.

---

## Part 3: Reflection and Application (5 points)

### Question 1: Personal Application (2 points)

**Describe a specific project you'll build using vibe coding in the next two weeks.**

Be concrete:
- What will you build? (e.g., "a landing page for my consultancy")
- Who is it for? (e.g., "potential clients finding me via LinkedIn")
- What will it include? (e.g., "hero with value proposition, 3 service cards, testimonials, contact form")
- How will you deploy it? (e.g., "GitHub Pages, linked from my LinkedIn profile")

**Evaluation:**
- Specific, realistic project identified (1 point)
- Clear plan for building and deploying (1 point)

---

### Question 2: Teaching the Concept (3 points)

**Explain vibe coding to a colleague who has never heard of it.**

Write 4-6 sentences that a non-technical person would understand. Cover:
- What it is
- How it works
- Why it matters
- What they could build with it

**Your Explanation:**

[Write here]

**Evaluation Criteria:**
- Explains the concept without jargon (1 point)
- Mentions the conversational/iterative nature (1 point)
- Gives a concrete example of what can be built (1 point)

**Example Strong Answer:**
"Vibe coding is a way to build websites and tools by describing what you want in plain English to an AI assistant. You say something like 'create a landing page for my business with a blue hero section and three service cards', and the AI writes all the code for you. You refine it through conversation — 'make the heading larger, add a contact form' — until it's exactly what you want. It means anyone with an idea can build a professional web page in under an hour, without learning to code. I built and deployed a live portfolio site this afternoon."

---

## Scoring Guide

### Total Points: 30

**Scoring Breakdown:**

- **27-30 points (90-100%): Master Level**
  - You've fully grasped vibe coding as a creative tool
  - Ready to build real projects independently
  - Can teach others the approach
  - Able to evaluate and select the right AI tools

- **24-26 points (80-89%): Proficient Level**
  - Strong understanding of conversational creation
  - Can work independently on most projects
  - Minor areas to refine (likely prompt specificity or deployment)
  - Ready for more ambitious projects

- **18-23 points (60-79%): Developing Level**
  - Core concepts understood
  - Need more practice with iteration and deployment
  - Review weaker areas and repeat exercises
  - Consider practising with simpler projects first

- **Below 18 points (<60%): Needs Review**
  - Revisit core concepts chapter
  - Complete the hands-on exercises again
  - Focus on prompt writing fundamentals
  - Consider scheduling additional practice time

## Self-Assessment Checklist

Beyond the formal assessment, can you confidently say:

**Creative Skills:**
- [ ] I can describe a web page clearly enough for AI to build it
- [ ] I iterate effectively — small changes, frequent reviews
- [ ] I use references and comparisons to guide AI
- [ ] I can describe interactivity in natural language
- [ ] I know the difference between a good and a weak prompt

**Technical Confidence:**
- [ ] I can create and preview HTML files locally
- [ ] I can deploy to GitHub Pages
- [ ] I can update a deployed site
- [ ] I understand what responsive design means
- [ ] I can choose the right tool for a given task

**Creative Ownership:**
- [ ] I've built something I'm genuinely proud of
- [ ] I can envision applying this to my real work
- [ ] I feel confident saying "I can build a website"
- [ ] I understand that the code belongs to me
- [ ] I'm excited to build something new

## Areas for Improvement

Based on your results, identify 2-3 areas to develop:

1. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

2. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

3. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

## Certification Statement

Upon achieving 80% or higher:

```
+--------------------------------------------+
|                                            |
|   CERTIFICATE OF COMPLETION                |
|                                            |
|   This certifies that                      |
|                                            |
|   [Your Name]                              |
|                                            |
|   has successfully completed               |
|   Vibe Coding Mastery Workshop             |
|                                            |
|   and demonstrated the ability to:         |
|   - Build web pages through conversation   |
|   - Iterate designs using natural language  |
|   - Deploy creations to the live internet  |
|                                            |
|   Score: ____ / 30                         |
|   Date: ___________                        |
|                                            |
+--------------------------------------------+
```

## Next Steps Based on Performance

### If You Scored 90%+

**You're Ready For:**
- Building multi-page websites
- Adding backend functionality (databases, APIs)
- Exploring frameworks (React, Svelte) through vibe coding
- Teaching others the approach
- Building tools and applications, not just pages

**Recommended Actions:**
1. Build a real project this week
2. Experiment with Cursor or Windsurf if you used Claude Code (or vice versa)
3. Try vibe coding a web application with JavaScript interactivity
4. Share your live URL and help a colleague get started

### If You Scored 80-89%

**You're Ready For:**
- Daily use for prototyping and building
- Single-page projects of any complexity
- Confident deployment to GitHub Pages
- Sharing the skill with colleagues

**Recommended Actions:**
1. Build one new page per week for the next month
2. Focus on improving your prompt specificity
3. Practise the refinement loop until it feels natural
4. Deploy at least 3 different projects

### If You Scored Below 80%

**You Should:**
- Review the core concepts chapter
- Repeat the hands-on exercises
- Practise writing detailed prompts
- Focus on one tool (Claude Code recommended)

**Recommended Actions:**
1. Redo Exercises 1-3 from Chapter 3
2. Write 5 different opening prompts and compare results
3. Complete one full build-and-deploy cycle
4. Schedule practice time for the coming week

## Continuous Improvement

### 7-Day Challenge

Build something new each day for a week:
- **Day 1:** Personal homepage
- **Day 2:** Event invitation page
- **Day 3:** Simple calculator or converter
- **Day 4:** Photo gallery or portfolio
- **Day 5:** Restaurant or business menu
- **Day 6:** Interactive quiz or survey
- **Day 7:** Your wildest idea

### 30-Day Goal
- [ ] 5+ pages deployed to GitHub Pages
- [ ] Helped one other person try vibe coding
- [ ] Built something for real use (not just practice)
- [ ] Comfortable with the full workflow end to end
- [ ] Experimented with at least 2 different AI tools

## Congratulations!

Whether you achieved a perfect score or identified areas for growth, you've crossed a meaningful threshold. You now know that building for the web is not reserved for developers. It belongs to anyone who can describe what they want.

**The question is no longer "can I build this?" — it's "what shall I build next?"**

---

Next: [Chapter 6: Resources — Continue Creating](./06_resources.md)

[Back to Project](./04_project.md) | [Back to Module Overview](README.md)
