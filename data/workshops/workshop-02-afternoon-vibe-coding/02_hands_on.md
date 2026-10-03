# Chapter 2: Hands-On - Building Your First Vibe Creation

⏱️ **Estimated time**: 90 minutes
🎯 **Difficulty**: Beginner-friendly (no coding experience required)
💡 **What you'll achieve**: A working web page built entirely through conversation with AI

## What We Are Building

In this session you will create a personal portfolio page using nothing but natural language. You will describe what you want, refine it through conversation, and end up with a polished, mobile-friendly result — without writing a single line of code by hand.

## Choosing Your Tool

Pick **one** of the following approaches. We recommend Option A if you completed the Phase 2 API setup.

### Option A: Claude Code (Recommended)

Claude Code is the most natural fit for vibe coding. You describe what you want, and it creates files, runs a preview server, and iterates based on your feedback.

```bash
# Create a project folder and launch Claude Code
mkdir my-portfolio && cd my-portfolio
claude
```

### Option B: Cursor AI or Windsurf

Open your project folder in Cursor or Windsurf and use the built-in chat panel. The workflow is the same — describe, review, refine.

### Option C: ChatGPT / Claude.ai (Copy-Paste)

If you prefer a browser-based approach, use ChatGPT (canvas mode) or Claude.ai (artifacts). You will need to copy the generated code into files manually, but the creative process is identical.

## Exercise 1: The Big Picture (15 minutes)

### Step 1 — Set the Vision

Start your session with a clear, descriptive prompt. Here is an example:

```
Create a single-page personal portfolio website for a freelance 
photographer called Alex Chen. It should have:

- A hero section with a large heading and a short tagline
- A gallery section showing 6 placeholder images in a grid
- An "About Me" section with a short bio
- A contact section with email and social media links
- A footer with copyright

Style: clean, minimal, lots of white space, modern sans-serif font.
Colour palette: white background, charcoal text, accent colour of 
warm coral (#FF6B6B).
Make it responsive so it looks good on phones too.
Use a single HTML file with embedded CSS — no frameworks needed.
```

### Step 2 — Review the Result

Open the generated HTML file in your browser (or ask Claude Code to serve it). Look at it on both desktop and mobile widths.

### Step 3 — Note What to Change

Write down 2-3 things you want to adjust. For example:
- "The gallery images are too small on desktop"
- "I want the hero section to take up the full screen height"
- "The font feels too heavy"

## Exercise 2: Iterative Refinement (20 minutes)

### Round 1 — Layout Adjustments

Take your notes from Step 3 and describe the changes conversationally:

```
Make the hero section full-height (it should fill the whole screen).
Centre the heading vertically. Make the gallery images larger on 
desktop — three per row with some spacing between them.
```

### Round 2 — Visual Polish

```
Add a subtle shadow to the gallery images on hover. 
Make the navigation links at the top stick to the top of 
the page when scrolling. Add smooth scrolling when clicking 
navigation links.
```

### Round 3 — Content Refinement

```
Change the "About Me" text to something more personal and engaging.
Add a subtle background colour to the about section — very light 
grey — to visually separate it from the gallery.
```

### The Key Principle

Each round should be small and focused. Describe one or two changes at a time, review the result, then continue. This iterative loop is the heart of vibe coding.

## Exercise 3: Adding Interactivity (20 minutes)

### A Simple Image Lightbox

```
When someone clicks a gallery image, show it larger in a dark 
overlay that covers the whole page. Clicking the overlay or 
pressing Escape should close it. Add a smooth fade-in animation.
```

### A Contact Form

```
Replace the contact links section with an actual contact form.
Fields: name, email, message. Style it to match the rest of 
the page. Add basic validation — all fields required, email 
must look like an email address. When submitted, show a 
"Thank you" message instead of the form.
```

### Dark Mode Toggle

```
Add a small moon/sun icon in the top-right corner. When clicked, 
switch the entire page to dark mode (dark background, light text, 
adjusted colours). Remember the user's preference.
```

## Exercise 4: Mobile-First Thinking (15 minutes)

Test your page at different screen widths. Describe any issues naturally:

```
On phone screens:
- The gallery should show one image per row, not three
- The navigation links are too close together — add more spacing 
  or collapse them into a hamburger menu
- The hero heading is too large for small screens — scale it down
```

## Exercise 5: Going Further (20 minutes)

Choose one of these challenges based on your interest:

### Challenge A: Animated Hero

```
Add a subtle animation to the hero section. The heading should 
fade in and slide up slightly when the page loads. The tagline 
should appear half a second later with the same animation.
```

### Challenge B: Testimonials Carousel

```
Add a testimonials section between the gallery and contact form.
Show one testimonial at a time with the person's name and a short 
quote. Include left/right arrows to cycle through three testimonials.
Auto-advance every 5 seconds.
```

### Challenge C: Performance Dashboard

```
Create a completely different page — a simple analytics dashboard 
with some fake data. Show:
- A large number showing "Total Visitors: 12,847"
- Three smaller cards: "This Week: 342", "Bounce Rate: 34%", 
  "Avg Time: 2m 15s"
- A simple bar chart showing visitors per day for the last 7 days
Use CSS only — no chart libraries needed.
```

## Tips for Better Vibe Coding

### Be Specific About What You See

Instead of "this looks wrong", try:
- "The gap between the heading and the paragraph is too large"
- "The button text is hard to read against the coral background"
- "The gallery looks uneven — the third row only has two images"

### Use Comparisons

- "Make the heading similar in size to the one on apple.com"
- "I want the card hover effect to feel like Airbnb's listing cards"
- "The spacing should feel more like a magazine layout"

### Describe the Feeling

- "This feels too cramped — add more breathing room"
- "The page feels static — add some subtle movement"
- "The colours feel too harsh — soften them"

### Save Versions

If you are using Claude Code, your changes are saved automatically in the files. If using a chat interface, copy your code after each major milestone so you can go back if needed.

## What You Have Achieved

By the end of this session, you have:

- Built a complete, responsive web page through conversation alone
- Practised the iterative refinement loop (describe, review, refine)
- Added interactivity without understanding JavaScript
- Adapted a design for mobile screens using plain English
- Experienced how AI coding agents translate intent into working code

The same approach works for any project — a business landing page, an internal tool, a prototype for a client pitch, or a personal project. The only limit is how clearly you can describe what you want.

---

Next: [Chapter 3: Exercises - Creative Challenges](./03_exercises.md)

[Back to Concepts](./01_concepts.md) | [Back to Phase Overview](README.md)
