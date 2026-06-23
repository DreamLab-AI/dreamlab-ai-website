# Prerequisites - Module 08: Vibe Coding Mastery

## Before You Begin

This afternoon session builds on the morning's foundation. You'll go from having AI tools configured to using them to build real, deployable web pages through conversation. Ensure you meet these requirements for the best experience.

## Required: Morning Session Completion

### From Workshop 01 (Morning)

This module assumes you have completed the morning session and have:

- **VS Code installed and working** with essential extensions
- **At least one AI assistant configured** — Claude Code CLI (recommended), Cursor AI, Windsurf, or access to Claude.ai / ChatGPT
- **An active API key** with credit available (free tier is sufficient for all exercises)
- **Basic comfort** with opening files, using the terminal panel, and invoking AI assistance

If you missed the morning session, see the [Quick Setup](#quick-setup-for-latecomers) section below.

### What You Do NOT Need

- Any programming experience
- Any understanding of HTML, CSS, or JavaScript
- Previous web design experience
- Command line expertise
- A domain name or hosting account (we use free GitHub Pages)

## Technical Requirements

### Hardware

**Minimum Requirements:**
- **Processor**: Any modern CPU (2016 or newer)
- **RAM**: 8GB minimum
- **Storage**: 2GB free disk space
- **Display**: 1280x720 minimum (larger is better for side-by-side preview)

**Recommended:**
- **RAM**: 16GB (for running AI tools and browser simultaneously)
- **Display**: 1920x1080 or higher (side-by-side editing and preview)
- **Second monitor** (optional, but excellent for preview)

### Operating System

**Supported:**
- Windows 10 or 11 (64-bit)
- macOS 10.15 (Catalina) or newer
- Ubuntu 18.04+, Debian 9+, Fedora 34+

### Internet Connection

**Required:**
- **Speed**: 5 Mbps minimum (AI API calls and deployment)
- **Stability**: Consistent connection throughout the session
- **Data**: ~200MB for the session (API traffic and GitHub operations)

## Software Prerequisites

### Already Installed (from Morning Session)

- **VS Code** with extensions:
  - Markdown All in One
  - AI assistant (Continue, Copilot, or Codeium)
  - Live Server (for local preview — we'll install if missing)
- **Claude Code CLI** (recommended) or alternative AI tool
- **Git** (installed with VS Code or separately)
- **Modern web browser** (Chrome, Firefox, or Edge)

### Will Set Up During This Session

- **GitHub account** (free) — for deploying your pages
- **GitHub Pages** — free static hosting, activated during the project chapter
- **Live Server extension** (if not already installed) — for instant local preview

### Recommended AI Tool Setup

**Option A — Claude Code (Recommended):**
```bash
# Verify Claude Code is installed and working
claude --version

# Test it responds
claude "Say hello"
```

**Option B — Cursor AI or Windsurf:**
- Open your editor
- Verify the AI chat panel responds to prompts
- Test with: "Create a simple HTML page that says Hello World"

**Option C — Claude.ai or ChatGPT (Browser-Based):**
- Log in to your preferred chat interface
- Verify you can send prompts and receive responses
- You'll copy generated code into files manually

## Account Requirements

### GitHub Account (Required for Deployment)

If you don't have one yet:

1. Visit [github.com/signup](https://github.com/signup)
2. Create a free account
3. Verify your email address
4. No paid plan required — free tier includes GitHub Pages

**Already have an account?** Ensure you can log in and remember your password.

### AI API Access (Required)

Verify at least one of these is working:

- **Anthropic API key** — for Claude Code (console.anthropic.com)
- **OpenAI API key** — for ChatGPT-based tools
- **Cursor / Windsurf subscription** — if using those editors
- **Free chat access** — Claude.ai or ChatGPT (fallback option)

## Project Preparation

### Think About What You Want to Create

The most productive participants arrive with an idea. It doesn't need to be detailed — even a vague notion is enough. Some starting points:

**Business Ideas:**
- A landing page for your company, product, or service
- A pricing comparison page
- A "coming soon" page for a new venture

**Personal Ideas:**
- A portfolio showcasing your work
- A personal homepage or digital business card
- A CV / resume as a web page

**Creative Ideas:**
- An interactive art gallery
- A fan page for something you love
- A recipe collection with beautiful presentation

**Practical Ideas:**
- A unit converter or calculator
- A simple dashboard with fake data
- A countdown timer for an event

### Gather Inspiration

Spend five minutes collecting 2-3 websites you admire:
- Screenshot them or note the URLs
- Think about what you like: the colours, the layout, the feel
- You'll reference these during your vibe coding sessions

## Quick Setup for Latecomers

If you're joining without the morning session, here's the minimum setup to participate:

### 5-Minute Express Setup

**Step 1 — Install VS Code:**
- Download from [code.visualstudio.com](https://code.visualstudio.com)
- Install with default settings

**Step 2 — Install Claude Code (Recommended):**
```bash
# macOS / Linux
npm install -g @anthropic-ai/claude-code

# Or use the installer
curl -fsSL https://claude.ai/install | sh
```

**Step 3 — Set Your API Key:**
- Visit [console.anthropic.com](https://console.anthropic.com)
- Create an account and generate an API key
- Add credit (minimum $5 recommended)

**Step 4 — Verify:**
```bash
claude "Create a simple HTML page that says Hello World with blue text"
```

If that produces an HTML file, you're ready.

**Alternative — Browser Only:**
- Open [claude.ai](https://claude.ai) or [chatgpt.com](https://chatgpt.com)
- Create a free account
- You can follow along using the copy-paste workflow (slightly slower, but fully functional)

## Mental Preparation

### Set Expectations

**This Session IS:**
- Hands-on creation from start to finish
- Building real things that go live on the internet
- Conversational and creative, not technical
- About your vision, expressed in your words
- Immediately applicable to real projects

**This Session IS NOT:**
- A programming course (you won't learn to code)
- Template-based web design (you'll create from scratch)
- Theory-heavy (90% doing, 10% explaining)
- Restrictive (build whatever you imagine)

### Time Commitment

**Session Duration:** 3 hours

**Schedule:**
- 00:00–00:30: Concepts and principles
- 00:30–02:00: Hands-on building (the main event)
- 02:00–02:30: Creative challenge exercises
- 02:30–02:50: Capstone project and deployment
- 02:50–03:00: Assessment and reflection

**Post-Session:**
- 1 hour: Refine and share your creation
- 1 week: Build something new on your own
- 1 month: Maintain and evolve your web presence

## What to Have Ready

### On Your Screen
- VS Code (or your chosen editor) open and ready
- A web browser open for previewing creations
- This workshop page open for reference

### In Your Mind
- An idea for what you want to create (however vague)
- 2-3 reference websites you admire
- Willingness to describe, iterate, and experiment

### Optional but Helpful
- A second monitor (for preview alongside editor)
- Images you might want to include (photos, logos)
- Text content (bio, product descriptions, etc.)

## Pre-Session Checklist

### The Day Before

- [ ] Verify morning session setup still works
- [ ] Test AI assistant responds to prompts
- [ ] Create a GitHub account (if you don't have one)
- [ ] Think about what you want to build
- [ ] Gather 2-3 inspiration websites

### 30 Minutes Before

- [ ] Close unnecessary applications (free up RAM)
- [ ] Open VS Code and verify extensions loaded
- [ ] Open a web browser
- [ ] Test internet connection
- [ ] Have water and a snack ready — creating is hungry work

## Getting Help

### During the Session

1. Try describing the problem to your AI tool — it can often help
2. Ask in the workshop chat or raise your hand
3. Check the [troubleshooting section](06_resources.md) in resources
4. Note the issue and move on — we'll cover it in office hours

### Common Pre-Session Issues

**"Claude Code isn't installed"** — Follow the [Quick Setup](#quick-setup-for-latecomers) above or use Claude.ai/ChatGPT as a browser-based alternative.

**"My API key isn't working"** — Check that you have credit loaded. Visit your provider's dashboard to verify the key is active.

**"I don't have any ideas"** — That's fine! The exercises provide plenty of guided projects. You can also build the photographer portfolio from Chapter 2 and make it your own.

**"I've never made a website before"** — Neither have most participants. That's the entire point of vibe coding.

## Accessibility

### Accommodations Available

- Screen reader compatible workshop materials
- Keyboard-only navigation for all exercises
- High-contrast theme options in VS Code
- Adjustable font sizes throughout
- Alternative text descriptions for all diagrams

**Request Accommodations:**
- Email: accessibility@dreamlab.ai
- Notice: 48 hours preferred, but same-day requests welcome

## Ready to Build?

If you can tick most of the boxes on the pre-session checklist, you're ready. The rest we'll handle together as we go.

**Let's turn ideas into reality!**

---

[Proceed to Workshop →](./00_introduction.md) | [Back to Module Overview](README.md)
