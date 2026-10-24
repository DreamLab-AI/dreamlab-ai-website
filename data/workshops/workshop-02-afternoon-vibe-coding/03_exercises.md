# Chapter 3: Creative Challenges — Progressive Exercises

## 30 Minutes to Master the Vibe Coding Workflow

These exercises build on the hands-on session. They progress from straightforward to ambitious, each one practising a different aspect of conversational creation. Complete them in order, and tackle the stretch challenges if you finish early.

## Exercise 1: The One-Prompt Landing Page (5 minutes)

### Objective
Test how much you can achieve with a single, well-crafted prompt.

### The Challenge

Write one prompt — and only one — that produces a complete, usable landing page. No follow-up refinements allowed.

### Setup

```bash
# In Claude Code:
mkdir landing-page && cd landing-page
claude
```

Or open a new chat in your preferred tool.

### Your Prompt

Craft a single prompt that covers all of these: purpose, layout, colours, typography, content, and responsiveness. Here's an example to study (don't copy it — write your own):

```
Create a landing page for a Lake District dog walking service called 
"Fell Paws". It should have:

- A full-screen hero section with a warm photograph-style background 
  (use a placeholder gradient in earthy greens and browns), a large 
  white heading "Adventures for Every Paw", and a subtitle 
  "Professional dog walking in the heart of the Lake District"
- A "Services" section with 3 cards side by side: "Group Walks £15", 
  "Solo Adventures £25", "Puppy Socialisation £20" — each with a 
  short description and a "Book Now" button
- A testimonial section with a quote from "Sarah, Keswick" saying 
  she trusts them completely with her border collie
- A simple footer with phone number, email, and "© 2026 Fell Paws"

Style: warm, friendly, outdoorsy. Use rounded corners, soft shadows, 
and a colour palette of forest green (#2D5016), warm cream (#FFF8E7), 
and bark brown (#5C4033). Sans-serif font. Mobile-responsive — cards 
should stack vertically on small screens. Single HTML file with 
embedded CSS, no frameworks.
```

### Evaluate Your Result

Open the generated file in your browser and score yourself:

| Criterion | Yes / Partly / No |
|-----------|-------------------|
| All sections present? | |
| Colours match your description? | |
| Looks good on desktop? | |
| Looks good on mobile (resize the window)? | |
| Would you show this to someone? | |

### Key Learning
A detailed, specific prompt produces dramatically better first drafts than a vague one. The time you invest in describing is time saved in iterating.

## Exercise 2: The Refinement Sprint (7 minutes)

### Objective
Practise the iterative refinement loop under time pressure.

### Setup

Use the landing page from Exercise 1 (or generate a fresh one quickly).

### The Challenge

You have exactly 5 rounds of refinement. Each round, send one message to your AI tool. Make each message count.

### Round 1 — Layout Fix
Look at your page and describe the single biggest layout issue:
```
The services cards are too close together — add more spacing between 
them and give each card a subtle border.
```

### Round 2 — Visual Polish
Improve the aesthetics:
```
The hero section feels flat. Add a semi-transparent dark overlay on 
the background so the white text is easier to read. Also make the 
heading larger — it should dominate the section.
```

### Round 3 — Interactivity
Add one interactive element:
```
When hovering over a service card, lift it slightly and deepen the 
shadow — like picking a card up off the table. Add a smooth transition.
```

### Round 4 — Mobile Fix
Resize your browser to phone width and fix what breaks:
```
On mobile, the hero heading is too large — scale it down. The cards 
should have full width with a small gap between them. The testimonial 
text should be centred.
```

### Round 5 — Final Polish
One last touch to make it shine:
```
Add a smooth fade-in animation to each section as the user scrolls 
down the page. Each section should appear half a second after the 
previous one enters view.
```

### Reflection
- Which round had the most visible impact?
- Did the AI ever misunderstand you? How did you adjust?
- What would your sixth round have been?

## Exercise 3: The Reference Mashup (8 minutes)

### Objective
Practise using real-world references to guide AI output.

### The Challenge

Combine elements from three different websites into one original creation. Choose a topic (restaurant, gym, bookshop, photography studio) and describe it using references.

### Example Prompt

```
Create a landing page for an independent bookshop called "The Binding".

Design references:
- Layout like Stripe.com — clean, generous white space, content 
  centred in a narrow column
- Typography like Medium.com — large, elegant serif headings with 
  clean sans-serif body text
- Colour mood like a warm library — deep navy (#1B2A4A), antique 
  gold (#C9A84C), parchment cream (#F5F0E1), and charcoal text

Sections:
1. Hero with the shop name in large serif type and a tagline: 
   "Where every shelf holds a surprise"
2. "This Week's Picks" — 4 book cards in a grid, each with a 
   coloured placeholder square, title, author, and a one-line review
3. "Events" — upcoming author readings and book club meetings in 
   a simple list format with dates
4. "Visit Us" — address, opening hours, and a placeholder for 
   a map
5. Footer with social media links and newsletter signup field

Single HTML file, responsive, no frameworks.
```

### After Generation

Iterate with 2-3 rounds to perfect the mashup:

```
The typography doesn't feel serif enough — use Georgia or a 
similar serif for headings. Also, the book cards need more 
padding inside and a subtle cream background to distinguish 
them from the page.
```

### Key Learning
References give AI concrete visual anchors. "Like Stripe's layout" communicates more effectively than describing every spacing decision.

## Exercise 4: Data Visualisation Without Libraries (8 minutes)

### Objective
Build a data-driven dashboard using only HTML and CSS — no chart libraries, no JavaScript frameworks.

### The Challenge

Create a simple analytics dashboard that displays meaningful data visually.

### Prompt

```
Create a web dashboard page titled "Community Garden 2026 Season".

Include these sections:

1. Summary bar at the top with 4 metric cards side by side:
   - "Plots Active: 42/50" with a green accent
   - "Harvest This Month: 287 kg" with an orange accent
   - "Volunteer Hours: 156" with a blue accent
   - "New Members: 8" with a purple accent

2. A horizontal bar chart showing harvest by vegetable type, 
   built with pure CSS (coloured div bars, no chart library):
   - Tomatoes: 84 kg (longest bar)
   - Courgettes: 62 kg
   - Beans: 48 kg
   - Lettuce: 35 kg
   - Herbs: 28 kg
   - Carrots: 30 kg
   Each bar should have the label on the left and the value 
   on the right.

3. A "Plot Status" section with a simple grid of 50 small 
   squares — 42 coloured green (active), 5 amber (available), 
   3 red (maintenance). Include a colour legend.

4. A "Recent Activity" list showing 5 entries like:
   "Jun 15 — Plot 12 harvested 8kg tomatoes"
   "Jun 14 — 3 new volunteer sign-ups"

Style: clean dashboard aesthetic, white background, light grey 
card backgrounds, clear sans-serif font, subtle shadows on 
cards. Responsive — metric cards should wrap on mobile.
Single HTML file with embedded CSS, no JavaScript needed.
```

### Stretch: Add Interactivity

If you finish early, add JavaScript through conversation:

```
When I hover over a bar in the bar chart, show a tooltip with 
the exact percentage of total harvest that vegetable represents. 
Also, make the plot status squares show a tooltip with the plot 
number when hovered.
```

### Key Learning
AI can generate surprisingly effective data visualisations using pure CSS. You don't need D3.js or Chart.js for straightforward dashboards.

## Exercise 5: The Deployment Race (7 minutes)

### Objective
Take a creation live on the internet using GitHub Pages.

### The Challenge

Deploy one of your pages from the previous exercises to a live URL. Speed matters — see how quickly you can go from local file to live site.

### Steps

**Step 1 — Prepare your file (1 minute):**
Ensure your best HTML file is named `index.html` in its own folder.

**Step 2 — Create a GitHub repository (2 minutes):**

Using Claude Code:
```
Create a new GitHub repository called "my-vibe-site" and push 
this index.html file to it. Then enable GitHub Pages to serve 
from the main branch.
```

Or manually:
1. Go to [github.com/new](https://github.com/new)
2. Name it `my-vibe-site`, set to Public, tick "Add a README"
3. Click Create Repository
4. Upload your `index.html` via the "Add file" button

**Step 3 — Enable GitHub Pages (1 minute):**
1. Go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: `main`, folder: `/ (root)`
4. Click Save

**Step 4 — Wait and visit (2 minutes):**
Your site will be live at:
```
https://YOUR-USERNAME.github.io/my-vibe-site/
```

It may take 1-2 minutes for the first deployment.

**Step 5 — Share (1 minute):**
Send the URL to a friend, colleague, or the workshop chat. You just deployed a website.

### Success Criteria
- [ ] Page is accessible at a public URL
- [ ] It loads correctly on someone else's device
- [ ] You understand how to update it (push new code, wait for deploy)

## Stretch Challenges

### For Fast Finishers

**Challenge A: The 3-Page Site**
```
Expand your single page into a 3-page site: Home, About, and 
Contact. Add a navigation bar that links between them. Each page 
should share the same header and footer styling.
```

**Challenge B: The Animated Hero**
```
Create a hero section with a gradient background that slowly shifts 
between three colours on an infinite loop. Add floating translucent 
circles that drift upward like bubbles, purely with CSS animations. 
The heading should type itself out letter by letter.
```

**Challenge C: The Interactive Quiz**
```
Create a "What Type of Learner Are You?" quiz with 5 multiple-choice 
questions. After answering all questions, show a result based on the 
most-selected category: Visual, Auditory, Reading, or Kinaesthetic. 
Include a "Retake" button. No page reloads — everything happens on 
one page with JavaScript.
```

**Challenge D: Dark Mode Portfolio**
```
Build a developer-style portfolio with a terminal/hacker aesthetic: 
dark background, green monospace text, blinking cursor effects. 
Include a working command-line interface where typing "help" shows 
available commands, "about" shows a bio, "projects" lists work, 
and "contact" shows email. Make it feel like you're SSHing into 
someone's personal server.
```

## Exercise Reflection

After completing the exercises, assess yourself:

### Prompt Quality
- [ ] I can write a detailed first prompt that produces 80%+ of what I want
- [ ] I use specific colour codes, layout descriptions, and content
- [ ] I reference real websites for visual inspiration
- [ ] I specify responsive behaviour in my prompts

### Iteration Skill
- [ ] I describe changes in terms of what I see, not code
- [ ] Each refinement round produces a visible improvement
- [ ] I know when to make small changes vs. start fresh
- [ ] I can identify and articulate what's wrong with a design

### Deployment Confidence
- [ ] I can get a page from my computer to a live URL
- [ ] I understand the GitHub Pages workflow
- [ ] I can update a deployed site
- [ ] I could deploy a new project on my own

## Common Patterns You've Practised

### The Vision Prompt
```
Detailed description → Specific colours/layout/content → Responsive 
requirements → Single first-draft message
```

### The Refinement Sprint
```
Review → Identify one issue → Describe the fix naturally → Review 
again → Repeat
```

### The Reference Technique
```
"Layout like X, colours like Y, typography like Z" → Original 
creation informed by proven designs
```

### The Deployment Pipeline
```
Local file → GitHub repository → Enable Pages → Live URL → Share
```

## What's Next?

You've practised the core vibe coding patterns through structured exercises. In the next chapter, you'll apply everything to a capstone project of your own choosing — building and deploying something that matters to you.

---

Next: [Chapter 4: Capstone Project — Your Live Creation](./04_project.md)

[Back to Hands-On](./02_hands_on.md) | [Back to Phase Overview](README.md)
