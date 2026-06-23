# Chapter 4: Capstone Project — Your Live Creation

## 20 Minutes to Build and Deploy Something Real

This is the culmination of your vibe coding journey. Choose a project path, build it through conversation, and deploy it live. By the end, you'll have a real URL to share.

## Choose Your Project Path

Select the project most relevant to your goals. All paths follow the same structure: describe, build, iterate, deploy.

### Path A: Professional Portfolio
Perfect for: Freelancers, Consultants, Job Seekers, Creatives

### Path B: Business Landing Page
Perfect for: Entrepreneurs, Business Owners, Side Projects

### Path C: Interactive Dashboard
Perfect for: Academics, Analysts, Data Enthusiasts

### Path D: Creative Showcase
Perfect for: Artists, Designers, Hobbyists, Experimenters

---

## Path A: Professional Portfolio

### Project: A Personal Website That Represents You

### Step 1 — Set the Vision (3 minutes)

Think about what makes you distinctive. Then write your opening prompt:

```
Create a single-page personal portfolio website for [Your Name], 
a [your profession] based in [your location].

Sections:
1. Hero: Full-screen with my name in large type, a one-line 
   tagline ("[your tagline]"), and a subtle gradient background 
   in [your colours].

2. About: A short bio paragraph with a circular placeholder 
   for a profile photo on the left, text on the right.

3. Work: A grid of 4-6 project cards. Each card has a coloured 
   placeholder image, project title, one-line description, and 
   a "View Project" link. Cards should have a subtle lift effect 
   on hover.

4. Skills: A horizontal list of skill tags (e.g., "Strategy", 
   "Research", "Data Analysis", "Facilitation") styled as 
   rounded pills with a light background.

5. Contact: Email address, LinkedIn link, and a simple contact 
   form (name, email, message) with validation.

6. Footer: "© 2026 [Your Name]" with links to social profiles.

Style: [choose one: minimal and clean / bold and creative / 
warm and approachable / dark and sophisticated]. Responsive. 
Single HTML file.
```

### Step 2 — Refine (7 minutes)

Review the result and iterate through 3-4 rounds:

**Round 1 — First Impressions:**
Open in your browser. What jumps out as wrong? Describe it:
```
The hero gradient needs to be more subtle. The project cards 
are too close together — add more breathing room. The skills 
tags should wrap onto multiple lines if needed.
```

**Round 2 — Visual Polish:**
```
Add a fixed navigation bar at the top with smooth-scroll links 
to each section. When scrolling past the hero, the nav should 
get a white background with a subtle shadow.
```

**Round 3 — Interactivity:**
```
Add a dark mode toggle (sun/moon icon) in the top-right corner. 
When the contact form is submitted, hide the form and show a 
"Thank you, I'll be in touch!" message with a fade-in animation.
```

**Round 4 — Final Polish:**
```
Add a fade-in animation for each section as it scrolls into view. 
Ensure everything looks perfect on mobile — the about section 
should stack photo above text, and the project grid should become 
a single column.
```

### Step 3 — Deploy (5 minutes)

Using Claude Code:
```
Create a GitHub repository called "my-portfolio", add this 
index.html file, push it, and enable GitHub Pages.
```

Or follow the manual deployment steps from Exercise 5 in Chapter 3.

### Step 4 — Personalise Content (5 minutes)

Replace placeholder text with your real information:
```
Update the bio to: "[Your actual bio]"
Change the project cards to show my real projects:
1. "[Project Name]" - "[Description]"
2. "[Project Name]" - "[Description]"
...
Update the contact email to [your email].
```

### Deliverable
A live, professional portfolio at `https://YOUR-USERNAME.github.io/my-portfolio/`

---

## Path B: Business Landing Page

### Project: A Conversion-Focused Page for Your Business or Idea

### Step 1 — Set the Vision (3 minutes)

```
Create a landing page for [your business/product/service].

Hero section:
- Large heading: "[Your value proposition]"
- Subheading: "[Supporting statement]"
- A prominent "Get Started" / "Book a Call" / "Learn More" button
- Background: [describe the mood — professional, friendly, bold]

Features section:
- 3 feature cards with icon placeholders, headings, and 
  short descriptions explaining what you offer

Social proof:
- 3 testimonials from satisfied clients (I'll provide real 
  ones later — use realistic placeholders for now)
- A row of partner/client logos (grey placeholder squares)

Pricing (optional):
- 2-3 pricing tiers in a card layout
- The recommended tier highlighted

Call to action:
- A final section with "Ready to [desired action]?" heading
- Large button repeating the primary call to action
- Contact email below

Footer: Company name, links (About, Privacy, Terms), social icons.

Colours: [your brand colours or describe the mood].
Style: professional, trustworthy, conversion-focused.
Responsive. Single HTML file.
```

### Step 2 — Refine (7 minutes)

**Round 1 — Above the Fold:**
```
The hero button needs to be larger and more prominent — it should 
be the first thing people's eyes go to. Add a subtle animation 
on the button (a gentle pulse or colour shift on hover).
```

**Round 2 — Trust Signals:**
```
Below the features section, add a stats bar: "500+ Clients", 
"98% Satisfaction", "10 Years Experience" — large numbers with 
labels beneath, arranged in a row.
```

**Round 3 — Mobile Conversion:**
```
On mobile, add a sticky "Get Started" button at the bottom of 
the screen that's always visible while scrolling. Make the pricing 
cards stack vertically with the highlighted tier first.
```

**Round 4 — Animations:**
```
Add a smooth count-up animation for the stats numbers when they 
scroll into view. Feature cards should fade in one by one from 
left to right.
```

### Step 3 — Deploy (5 minutes)

```
Create a GitHub repository called "my-landing-page", push this 
file, and enable GitHub Pages.
```

### Step 4 — Real Content (5 minutes)

Replace all placeholders with your actual business content.

### Deliverable
A live business landing page ready to share with potential clients.

---

## Path C: Interactive Dashboard

### Project: A Data Visualisation Page with Real Information

### Step 1 — Set the Vision (3 minutes)

Choose a dataset that interests you (or use the example below):

```
Create a single-page dashboard titled "UK Renewable Energy 2026".

Header: Dashboard title on the left, "Last updated: June 2026" 
on the right, dark navy background.

Metric cards row (4 cards):
- "Total Capacity: 85.2 GW" (green accent)
- "Wind: 42.1 GW" (blue accent)
- "Solar: 28.7 GW" (amber accent)
- "Other Renewables: 14.4 GW" (teal accent)

Bar chart (pure CSS):
- Horizontal bars showing capacity by source:
  Offshore Wind: 22.3 GW
  Onshore Wind: 19.8 GW
  Solar PV: 28.7 GW
  Biomass: 7.2 GW
  Hydro: 4.8 GW
  Other: 2.4 GW
- Each bar a different colour, label on left, value on right

Pie-style visualisation:
- A CSS-only donut chart showing the percentage split between 
  Wind (49%), Solar (34%), and Other (17%)
- Colour-coded legend beside it

Trend section:
- A simple table showing year-on-year capacity: 2022, 2023, 
  2024, 2025, 2026 with total GW for each year
- Style the table cleanly with alternating row colours

Footer: "Data sources: National Grid ESO, BEIS" and a note 
that this is for demonstration purposes.

Style: professional dashboard, white background, clean sans-serif 
font, light card shadows. Responsive — cards wrap on mobile, 
chart remains readable.
Single HTML file with embedded CSS, no JavaScript libraries.
```

### Step 2 — Refine (7 minutes)

**Round 1 — Data Clarity:**
```
The bar chart bars should be sorted from longest to shortest. 
Add percentage labels after each value. The donut chart needs 
to be larger — at least 200px diameter.
```

**Round 2 — Interactivity:**
```
Add JavaScript so that when hovering over a metric card, it 
slightly enlarges and shows a tooltip with a one-line explanation 
like "Total installed renewable energy generation capacity across 
the UK."
```

**Round 3 — Styling:**
```
Add a thin coloured left border to each metric card matching its 
accent colour. The table should have a fixed header row. Add a 
subtle gradient to the page background — very light grey at top 
to white at bottom.
```

### Step 3 — Deploy (5 minutes)

Push to GitHub and enable Pages as before.

### Step 4 — Personal Data (5 minutes)

Replace the example data with something relevant to your work or interests.

### Deliverable
A live, professional-looking data dashboard accessible via URL.

---

## Path D: Creative Showcase

### Project: Something Unique, Expressive, and Yours

### Step 1 — Set the Vision (3 minutes)

This path is intentionally open. Choose one of these starting points or invent your own:

**Option 1 — Interactive Poem:**
```
Create a web page that presents a poem about [your topic] with 
each stanza revealing on scroll. Use a dark background with 
light text, elegant serif typography, and subtle particle 
effects drifting in the background (CSS only). Each stanza 
fades in as the user scrolls to it.
```

**Option 2 — Recipe Collection:**
```
Create a beautiful recipe page for 3 of my favourite recipes. 
Each recipe in its own card with: name, prep time, difficulty 
rating (1-5 stars), ingredients list, and method steps. Include 
a filter at the top: "All", "Quick (<30 min)", "Vegetarian". 
Style like a premium cookbook — warm colours, clean typography, 
generous spacing.
```

**Option 3 — Interactive Timeline:**
```
Create an interactive timeline of [your topic — career milestones, 
historical events, project phases]. Vertical line down the centre, 
events alternating left and right. Each event has a date, title, 
and short description. When clicking an event, it expands to show 
more detail. Smooth animations throughout.
```

**Option 4 — Your Wild Idea:**
Describe anything. A music playlist page. A personal manifesto. An interactive map of your favourite places. A tribute to your pet. Whatever excites you.

### Step 2 — Refine (7 minutes)

Iterate freely. This is your creative playground. Push the boundaries of what you think is possible through conversation.

### Step 3 — Deploy (5 minutes)

Same deployment flow — GitHub repository, GitHub Pages, live URL.

### Step 4 — Make It Yours (5 minutes)

Add your real content, your real colours, your real personality.

### Deliverable
A unique creative piece live on the web that is entirely yours.

---

## Universal Completion Checklist

Regardless of which path you chose:

- [ ] A complete web page built through conversation (no hand-coding)
- [ ] At least 3 refinement rounds completed
- [ ] At least 1 interactive feature added
- [ ] Page works on both desktop and mobile
- [ ] Deployed to GitHub Pages at a live URL
- [ ] Personalised with real or near-real content

## Showcase Your Creation

### Share With the Group

1. Post your live URL in the workshop chat
2. Briefly describe:
   - What you built
   - Which path you chose
   - Your favourite vibe coding moment
   - One thing you'd improve with more time

### Peer Review

Visit 2-3 other participants' URLs. For each, note:
- What works well
- One element you'd like to learn how to replicate
- How long you think it would have taken without AI

## Time Analysis

Calculate your efficiency:

| | Traditional Approach | Vibe Coding |
|---|---|---|
| Design mockup | ~2-4 hours | 3 minutes (describing) |
| HTML/CSS coding | ~4-8 hours | 5 minutes (AI generation) |
| Interactivity | ~2-4 hours | 3 minutes (conversational) |
| Responsive design | ~2-3 hours | 2 minutes (describing fixes) |
| Deployment | ~1-2 hours | 5 minutes |
| **Total** | **~11-21 hours** | **~20 minutes** |

Even accounting for learning time, vibe coding represents a dramatic acceleration.

## Reflection Questions

1. At what point did the page start to feel like "yours" rather than "AI's"?
2. Which refinement round had the biggest impact?
3. What surprised you about what AI could (or couldn't) do?
4. How will you use this skill in the next month?
5. What's the first real project you'll tackle with vibe coding?

## What You've Proven

You've just built and deployed a real web page — live on the internet, accessible to anyone — through conversation alone. This isn't a toy example. It's a skill you can apply tomorrow to:

- Launch a business idea
- Create a project showcase for a client pitch
- Build an internal tool for your team
- Express yourself creatively online
- Prototype anything before committing resources

The code is yours. The hosting is free. The only ongoing cost is your imagination.

---

Next: [Chapter 5: Assessment — Validate Your Mastery](./05_assessment.md)

[Back to Exercises](./03_exercises.md) | [Back to Module Overview](README.md)
