# Chapter 6: Resources — Continue Creating

## Introduction: Your Vibe Coding Toolkit

This resource collection supports your ongoing journey as a vibe coder. Everything is organised by what you need, when you need it — from your first solo project after the workshop to advanced techniques you'll explore over the coming months.

## AI Coding Tools Directory

### Claude Code (Recommended for Vibe Coding)

**What It Is:** Anthropic's AI coding agent. Describe what you want in the terminal or desktop app; it reads your files, writes code, runs commands, and iterates based on your feedback.

**Links:**
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/overview) — official guide
- [Claude.ai](https://claude.ai) — browser-based chat (artifacts for quick prototypes)
- [Anthropic Console](https://console.anthropic.com) — API key management and usage dashboard
- [Claude Code VS Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) — use Claude Code inside VS Code

**Getting Started:**
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Start a vibe coding session
mkdir my-project && cd my-project
claude

# Useful commands inside Claude Code
/cost          # Check how much you've spent this session
/compact       # Summarise conversation to free up context
```

**Cost Tips:**
- Use `/cost` regularly to monitor spending
- Set a monthly budget in the Anthropic Console
- Shorter, focused sessions are more cost-effective than marathon ones
- The `/compact` command helps manage context on long sessions

### Cursor AI

**What It Is:** A VS Code fork with deep AI integration. Chat with your codebase, get inline suggestions, and make multi-file changes through conversation.

**Links:**
- [cursor.com](https://cursor.com) — download and pricing
- [Cursor Documentation](https://docs.cursor.com) — getting started guide

**Best For:** People who want a familiar VS Code experience with built-in AI. Good middle ground between Claude Code's terminal approach and browser-based tools.

**Pricing:** Free tier available; Pro from $20/month with increased usage.

### Windsurf

**What It Is:** An AI-native code editor (formerly Codeium). Its "Flow" mode can complete multi-step tasks autonomously.

**Links:**
- [windsurf.com](https://windsurf.com) — download and documentation

**Best For:** Autonomous multi-step tasks. Good at understanding larger project context.

**Pricing:** Free tier available; Pro from $10/month.

### GitHub Copilot

**What It Is:** Microsoft/GitHub's AI coding assistant. Works inside VS Code with inline suggestions, chat, and workspace-level understanding.

**Links:**
- [GitHub Copilot](https://github.com/features/copilot) — features and pricing
- [Copilot Documentation](https://docs.github.com/en/copilot) — setup guide
- [Free for Students and Open Source](https://github.com/education/students) — apply here

**Best For:** Inline code suggestions and chat within VS Code. Excellent if you already have a GitHub account.

**Pricing:** Free for verified students and OSS maintainers; Individual from $10/month.

### Browser-Based Chat Tools

For quick prototyping without installing anything:

| Tool | Best For | Link |
|------|----------|------|
| **Claude.ai** (Artifacts) | Single-file prototypes with live preview | [claude.ai](https://claude.ai) |
| **ChatGPT** (Canvas mode) | Conversational code generation with visual editing | [chatgpt.com](https://chatgpt.com) |
| **Google AI Studio** | Large context window for big projects | [aistudio.google.com](https://aistudio.google.com) |

### Free and Open Source Options

| Tool | What It Is | Link |
|------|-----------|------|
| **Continue.dev** | Free, open-source AI extension for VS Code | [continue.dev](https://continue.dev) |
| **Aider** | Free terminal-based pair programmer | [aider.chat](https://aider.chat) |
| **Ollama** | Run AI models locally, completely free | [ollama.com](https://ollama.com) |

## Deployment and Hosting

### GitHub Pages (Free — Used in This Workshop)

**Links:**
- [GitHub Pages Documentation](https://docs.github.com/en/pages) — complete guide
- [Quickstart Guide](https://docs.github.com/en/pages/quickstart) — get a site live in minutes
- [Custom Domain Setup](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) — use your own domain name

**Quick Reference:**
```bash
# Deploy a page to GitHub Pages using Claude Code:
# 1. Create repo
gh repo create my-site --public

# 2. Push your files
git init
git add index.html
git commit -m "Initial site"
git remote add origin https://github.com/USERNAME/my-site.git
git push -u origin main

# 3. Enable Pages in Settings → Pages → Source: main branch

# Your site: https://USERNAME.github.io/my-site/
```

### Other Free Hosting Options

| Service | Best For | Limit | Link |
|---------|----------|-------|------|
| **Netlify** | Static sites with forms and serverless functions | 100GB bandwidth/month | [netlify.com](https://netlify.com) |
| **Vercel** | React/Next.js projects and static sites | 100GB bandwidth/month | [vercel.com](https://vercel.com) |
| **Cloudflare Pages** | Global CDN, very fast | Unlimited bandwidth | [pages.cloudflare.com](https://pages.cloudflare.com) |
| **Render** | Static sites and simple backends | 100GB bandwidth/month | [render.com](https://render.com) |

### Custom Domain Names

If you want a professional URL (e.g., `www.yourname.com`):

- **Registrars:** [Namecheap](https://namecheap.com), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/), [Google Domains](https://domains.google)
- **Cost:** Typically £8-15/year for a `.com` or `.co.uk` domain
- **Setup:** All the free hosting options above support custom domains

## Prompt Writing Resources

### Prompt Libraries and Examples

**General Prompt Engineering:**
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) — official Claude prompting guide
- [Prompt Engineering Guide](https://www.promptingguide.ai/) — comprehensive community resource

### Vibe Coding Prompt Templates

**Landing Page Template:**
```
Create a landing page for [BUSINESS/PROJECT].

Hero: [heading text], [subheading], [call-to-action button text], 
[background description].

Features: [number] cards showing [what each card contains].

Social proof: [testimonials / stats / logos].

Call to action: [final CTA section description].

Footer: [what to include].

Style: [mood — professional/playful/minimal/bold]. 
Colours: [primary], [secondary], [accent].
Responsive. Single HTML file.
```

**Portfolio Template:**
```
Create a personal portfolio for [NAME], a [PROFESSION].

Sections: Hero with name and tagline, About with bio and photo 
placeholder, Work with [number] project cards, Skills as tags, 
Contact form, Footer.

Style: [aesthetic]. Colours: [palette].
Include: dark mode toggle, smooth scroll navigation, 
fade-in animations on scroll. Responsive. Single HTML file.
```

**Dashboard Template:**
```
Create a data dashboard titled "[TITLE]".

Metrics row: [list cards with values and accent colours].
Chart: [type] showing [data points].
Table: [columns and sample data].
Activity feed: [recent events].

Style: clean dashboard, white background, card shadows.
Responsive. Single HTML file, CSS-only charts.
```

## Learning and Reference

### Web Design Fundamentals (No Code Required)

Understanding design principles helps you describe what you want more effectively:

- [Refactoring UI](https://www.refactoringui.com/) — design tips that non-designers can apply immediately
- [Laws of UX](https://lawsofux.com/) — simple, visual explanations of user experience principles
- [Typescale](https://typescale.com/) — choose font sizes that work together harmoniously
- [Coolors](https://coolors.co/) — generate colour palettes to reference in your prompts
- [Realtime Colors](https://www.realtimecolors.com/) — preview colour combinations on a live page layout

### CSS and HTML Reference (When Curiosity Strikes)

You don't need to learn these, but knowing they exist helps you understand what AI generates:

- [MDN Web Docs](https://developer.mozilla.org/en-US/) — the definitive web reference
- [CSS-Tricks](https://css-tricks.com/) — practical examples and guides
- [Can I Use](https://caniuse.com/) — check what browsers support which features

### Responsive Design

Understanding responsive concepts helps you describe mobile behaviour:

- [Responsive Design Basics](https://web.dev/responsive-web-design-basics/) — Google's guide
- [Am I Responsive?](https://ui.dev/amiresponsive) — preview your site at multiple screen sizes
- [Responsively App](https://responsively.app/) — free tool to view your page on many devices at once

### Free Assets for Your Projects

**Images:**
- [Unsplash](https://unsplash.com/) — free high-quality photographs
- [Pexels](https://pexels.com/) — free stock photos and videos
- [Undraw](https://undraw.co/) — free, customisable illustrations

**Icons:**
- [Heroicons](https://heroicons.com/) — clean SVG icons (by the Tailwind CSS team)
- [Lucide](https://lucide.dev/) — beautiful, consistent icon set
- [Font Awesome (free tier)](https://fontawesome.com/) — massive icon library

**Fonts:**
- [Google Fonts](https://fonts.google.com/) — free web fonts, easy to include
- [Fontsource](https://fontsource.org/) — self-hosted open source fonts

## Community and Continued Learning

### Communities for Vibe Coders

- [Anthropic Discord](https://discord.gg/anthropic) — Claude Code discussions and help
- [Reddit r/vibecoding](https://reddit.com/r/vibecoding) — community of conversational coders
- [Reddit r/ClaudeAI](https://reddit.com/r/ClaudeAI) — Claude-specific tips and showcases
- [Indie Hackers](https://www.indiehackers.com/) — entrepreneurs building with AI tools

### Newsletters and Blogs

- [Anthropic Blog](https://www.anthropic.com/blog) — Claude updates and capabilities
- [Simon Willison's Weblog](https://simonwillison.net/) — prolific AI tools commentary
- [Smashing Magazine](https://www.smashingmagazine.com/) — web design and development
- [CSS Weekly](https://css-weekly.com/) — stay current with web design trends

### Video Learning

- [Fireship](https://www.youtube.com/@Fireship) — fast, clear web technology explainers
- [Kevin Powell](https://www.youtube.com/@KevinPowell) — CSS techniques explained simply
- [Web Dev Simplified](https://www.youtube.com/@WebDevSimplified) — beginner-friendly web development

## Troubleshooting Guide

### Common Issues and Solutions

**Problem: AI generates code but it doesn't display correctly**
```
Solution: Ensure your file is saved as .html (not .txt). Open 
it directly in a browser — File → Open, or drag the file onto 
a browser window. If using Live Server in VS Code, right-click 
the file and select "Open with Live Server".
```

**Problem: Page looks fine on desktop but broken on mobile**
```
Solution: In your next prompt, describe specifically what breaks:
"On phone screens, the three columns overlap. Make them stack 
into a single column on screens narrower than 768px."

Check mobile view by resizing your browser window, or use 
Chrome DevTools (F12 → toggle device toolbar).
```

**Problem: GitHub Pages shows a 404 error**
```
Solution: 
1. Ensure your file is called index.html (lowercase)
2. Check Settings → Pages — is it enabled?
3. Wait 2-3 minutes after enabling (first deploy takes time)
4. Verify the URL: https://USERNAME.github.io/REPO-NAME/
5. Ensure you pushed to the correct branch (usually main)
```

**Problem: Claude Code says "I can't access the internet"**
```
Solution: Claude Code generates code locally — it doesn't need 
internet for code generation. For deployment, use git commands 
which Claude Code can run. If API calls fail, check your API 
key and credit balance at console.anthropic.com.
```

**Problem: The AI keeps changing things I already liked**
```
Solution: Be specific about what to keep:
"Change only the footer — everything else should stay exactly 
as it is. In the footer, make the text smaller and add a 
second row with privacy and terms links."

In Claude Code, you can also use /compact to summarise the 
conversation and reduce context confusion.
```

**Problem: I've run out of free API credits**
```
Solution: 
- Switch to Claude.ai free tier (limited but functional)
- Use ChatGPT free tier as a fallback
- Try Continue.dev with free Groq or Gemini API access
- Consider adding $5-10 credit — a full workshop session 
  typically costs under $2
```

## Cost Management

### Typical Vibe Coding Costs

| Activity | Approximate Cost |
|----------|-----------------|
| Building a single-page site (30 min session) | $0.50-2.00 |
| Full workshop afternoon (3 hours) | $2.00-5.00 |
| Complex multi-page project (2-3 hours) | $3.00-8.00 |
| Quick refinement session (10 minutes) | $0.10-0.50 |

### Keeping Costs Low

1. **Write detailed first prompts** — fewer iterations means less cost
2. **Use `/compact` in Claude Code** — reduces context and token usage
3. **Use `/cost` to monitor** — check spending regularly
4. **Set budget alerts** — configure at console.anthropic.com
5. **Use free tiers for experimentation** — save paid access for real projects
6. **Use Claude.ai artifacts** for quick single-file prototypes (often free)

## Cheat Sheets

### Vibe Coding Quick Reference

```
+-----------------------------------------------+
|           VIBE CODING QUICK REFERENCE          |
+-----------------------------------------------+
|                                                |
| START A PROJECT                                |
|   mkdir project && cd project && claude        |
|                                                |
| FIRST PROMPT CHECKLIST                         |
|   [ ] What is the page for?                    |
|   [ ] What sections does it need?              |
|   [ ] What colours and style?                  |
|   [ ] Responsive? (almost always yes)          |
|   [ ] Any interactivity?                       |
|   [ ] Single HTML file? (simplest to start)    |
|                                                |
| REFINEMENT PHRASES                             |
|   "Make it more [spacious/bold/subtle/clean]"  |
|   "The [X] feels too [big/small/bright/dark]"  |
|   "Add [animation/hover effect/transition]"    |
|   "On mobile, [stack/hide/resize/simplify]"    |
|   "Like [website.com]'s [feature/layout]"      |
|                                                |
| DEPLOY TO GITHUB PAGES                         |
|   1. Push to GitHub repository                 |
|   2. Settings > Pages > Source: main           |
|   3. Wait 2 min > visit the URL                |
|                                                |
| USEFUL CLAUDE CODE COMMANDS                    |
|   /cost     - check session spending           |
|   /compact  - summarise conversation           |
|   /clear    - start fresh context              |
|                                                |
+-----------------------------------------------+
```

### Describing Colours

Instead of memorising hex codes, use these descriptive approaches:

| What You Say | What You Get |
|-------------|-------------|
| "Corporate navy" | Dark blue, trustworthy |
| "Sunset gradient" | Orange-to-pink blend |
| "Sage green" | Soft, muted green |
| "Warm cream background" | Off-white, cosy |
| "Electric blue accent" | Bright, energetic blue |
| "Charcoal text" | Dark grey, softer than black |

Or provide specific hex codes from [Coolors](https://coolors.co/) for precision.

### Describing Layout

| What You Say | What You Get |
|-------------|-------------|
| "Three cards in a row" | Horizontal grid |
| "Stack vertically on mobile" | Responsive column |
| "Centred narrow column" | Medium-style layout |
| "Full-width hero" | Edge-to-edge section |
| "Sticky navigation" | Nav stays on scroll |
| "Lots of breathing room" | Generous padding/margins |

## Next Steps

### This Week

- [ ] Build one new page using vibe coding
- [ ] Deploy it to GitHub Pages
- [ ] Share the URL with someone
- [ ] Try a different AI tool than you used in the workshop
- [ ] Bookmark this resources page for reference

### This Month

- [ ] Complete the 7-day challenge from Chapter 5
- [ ] Build something for real use (business, portfolio, personal)
- [ ] Explore adding a custom domain to your GitHub Pages site
- [ ] Help a colleague or friend try vibe coding
- [ ] Join one of the communities listed above

### This Quarter

- [ ] Maintain 3+ live web pages on GitHub Pages
- [ ] Try building a multi-page site
- [ ] Experiment with adding a backend (forms that email you, databases)
- [ ] Consider using Tailwind CSS through vibe coding for more polished designs
- [ ] Explore building simple web applications, not just static pages

## Getting Help

### Workshop Support
- **Email:** workshop@dreamlab.ai
- **Discord:** Workshop Channel
- **Office Hours:** Fridays 2-3pm GMT

### AI Tool Support
- **Claude Code:** [Anthropic Support](https://support.anthropic.com)
- **Cursor:** [Cursor Forum](https://forum.cursor.com)
- **GitHub Pages:** [GitHub Community](https://github.com/community)

## Final Thought

Vibe coding is not a workaround or a hack. It is a genuine paradigm shift in who gets to create on the web. The tools will keep improving, the possibilities will keep expanding, and the skills you practised today — describing clearly, iterating thoughtfully, deploying confidently — will remain valuable regardless of which AI tool you use.

The web is now your canvas. Go create something.

---

**Workshop Complete!**

[Back to Assessment](./05_assessment.md) | [Back to Module Overview](README.md) | [Return to Workshop Index](../workshop-02-morning-ai-api-access/README.md)
