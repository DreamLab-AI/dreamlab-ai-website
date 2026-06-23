# Prerequisites - Workshop 02 Morning: Direct AI API Access

## Before You Begin

This workshop connects you directly to AI model APIs. You'll create accounts, generate API keys, and start making calls within the first hour. Ensure you meet these requirements for a smooth experience.

## Required Knowledge

### Essential Skills
- ✅ **Basic Computer Literacy**
  - Can create online accounts and verify email addresses
  - Comfortable navigating web browsers
  - Can copy and paste text accurately
  - Understands the concept of passwords and account security

- ✅ **VS Code Familiarity (from Module 05)**
  - VS Code installed and launching correctly
  - Can open files and folders
  - Comfortable with the basic interface layout
  - Have used at least one extension

- ✅ **No Coding Experience Required**
  - We explain every API concept from first principles
  - Code snippets are provided — you copy and paste, not write from scratch
  - The focus is on understanding and using APIs, not programming

### Helpful (But Not Required)
- 📝 Experience with ChatGPT, Claude, or Gemini web interfaces
- 📧 Familiarity with JSON format (we'll explain it)
- 📁 Basic understanding of environment variables (we'll set them up together)
- 💳 Previous experience with pay-as-you-go online services

## Technical Requirements

### Hardware Specifications

**Minimum Requirements:**
- **Processor**: Any modern CPU (2016 or newer)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free disk space
- **Display**: 1280x720 resolution minimum

**Recommended Specifications:**
- **Processor**: Quad-core CPU
- **RAM**: 8GB or more
- **Storage**: 5GB free (for VS Code, extensions, and project files)
- **Display**: 1920x1080 or higher

### Operating System

**Supported Platforms:**
- ✅ Windows 10 or 11 (64-bit)
- ✅ macOS 10.15 (Catalina) or newer
- ✅ Ubuntu 20.04+, Debian 10+, Fedora 36+

**Administrator Access:**
- Ability to install VS Code extensions
- Permission to create `.env` files in your project folder
- No firewall restrictions blocking `api.openai.com`, `api.anthropic.com`, or `generativelanguage.googleapis.com`

### Internet Connection

**Requirements:**
- **Speed**: 5 Mbps minimum (API calls are lightweight)
- **Stability**: Consistent connection — API calls fail on dropouts
- **Data**: Minimal (~50MB for the workshop; API responses are text)
- **Ports**: Standard HTTPS (port 443) must be open

## Software Prerequisites

### Must Have Before Starting

**1. VS Code (from Module 05)**
- Installed and running
- Markdown extensions configured
- If not yet installed, complete Module 05 first or visit [code.visualstudio.com](https://code.visualstudio.com)

**2. Modern Web Browser**
- Google Chrome (recommended)
- Firefox, Edge, or Safari
- Needed for creating provider accounts and viewing dashboards

**3. Email Access**
- For account verification codes
- Ensure you can receive emails promptly during the session

### Will Install During Workshop

We'll set up these together:
- Claude Code CLI (Anthropic's terminal AI agent)
- Continue extension for VS Code (optional multi-model switcher)
- Python 3 (optional — for running SDK examples)

## Account & Billing Setup

### What You'll Create

This workshop requires accounts with AI providers. Here is what to expect:

**1. Anthropic Console (Claude models)**
- URL: https://console.anthropic.com
- Requires: Email verification
- Billing: Prepaid credits — start with $5-10 (approximately £4-8)
- Models available: Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5
- API key format: `sk-ant-api03-...`

**2. OpenAI Platform (GPT models)**
- URL: https://platform.openai.com
- Requires: Email verification + payment method
- Billing: Pay-as-you-go with monthly limits — start with $5-10
- Models available: GPT-4o, GPT-4o-mini, o3
- API key format: `sk-proj-...`

**3. Google AI Studio (Gemini models)**
- URL: https://aistudio.google.dev
- Requires: Google account
- Billing: **Free tier** — no credit card needed to start
- Models available: Gemini 2.5 Pro, Gemini 2.5 Flash
- API key format: `AIzaSy...`

**4. Groq Console (open-source models, optional)**
- URL: https://console.groq.com
- Requires: Email verification
- Billing: **Free** — no payment required
- Models available: Llama 4 and other open models
- API key format: `gsk_...`

### Total Expected Spend

- **During the workshop**: £0-2 (most testing uses pennies of credit)
- **First month**: £3-5 for typical professional usage
- **Compared to subscriptions**: £57+/month for ChatGPT Plus + Claude Pro + Gemini Advanced
- **Savings**: 90%+ from day one

### Pre-Workshop Account Setup (Optional)

You can create accounts before the workshop to save time, or we'll walk through it together:

1. Visit each provider's console URL listed above
2. Create an account with your email
3. **Do not generate API keys yet** — we'll do that together with proper security steps
4. Add payment methods where required (Anthropic, OpenAI)
5. Set an initial spending limit of $10 on each paid provider

## Project Preparation

### Bring Real Work

**Most Effective Learning:**
Have a real task in mind that you currently use AI for:
- A document you need to write or improve
- Research you need to summarise
- Content you need to generate
- Analysis you need to perform

**Suggested Tasks for Testing:**
- Draft a professional email or proposal
- Summarise a lengthy report or article
- Generate social media posts or marketing copy
- Create a structured document from rough notes
- Analyse pros and cons of a business decision

### Create Workshop Folder

**Before the workshop:**
```
Documents/
  └── AI-Workshop/
      └── day-2-morning/
          ├── api-tests/
          ├── model-comparisons/
          └── my-project/
```

This structure helps you organise test outputs, comparison notes, and your final project.

## Mental Preparation

### Set Expectations

**This Workshop IS:**
- ✅ Hands-on: you'll make real API calls within the first hour
- ✅ Cost-transparent: we track every penny spent
- ✅ Multi-provider: you'll use at least 3 different AI services
- ✅ Practical: everything applies to your real work immediately
- ✅ Non-developer friendly: no programming background needed

**This Workshop IS NOT:**
- ❌ A programming course
- ❌ About building software applications
- ❌ Theory-heavy or academic
- ❌ Limited to a single AI provider
- ❌ Expensive (total workshop spend: under £2)

### Time Commitment

**Workshop Duration:** 3 hours

**Schedule:**
- 00:00-00:30: Core concepts (what APIs are, how they work)
- 00:30-02:00: Hands-on setup (accounts, keys, configuration, testing)
- 02:00-02:30: Practical exercises (model comparisons, workflows)
- 02:30-02:50: Real project work (apply to your actual tasks)
- 02:50-03:00: Assessment and reflection

**Post-Workshop:**
- 30 minutes: Review model comparison notes
- 1 week: Track daily API costs vs old subscription costs
- 1 month: Refine model preferences, cancel unnecessary subscriptions

## What to Bring

### Physical Items
- 💻 Laptop (fully charged, with VS Code installed)
- 🔌 Power adapter
- 📓 Notebook and pen (for model comparison notes)
- 💳 Credit or debit card (for Anthropic and OpenAI billing setup)

### Digital Items
- 📧 Email access (for provider verification codes)
- 🔑 Password manager or secure place to store API keys
- 📁 Real project files to work on during the project chapter
- 🌐 Browser bookmarks for provider consoles (optional)

## Pre-Workshop Checklist

### One Day Before

- [ ] Verify VS Code is installed and running
- [ ] Test internet connection and HTTPS access
- [ ] Charge laptop fully
- [ ] Create the workshop folder structure
- [ ] Identify a real task to use during the project chapter
- [ ] Clear calendar (3 uninterrupted hours)
- [ ] Have credit/debit card accessible

### One Hour Before

- [ ] Close unnecessary applications (free up RAM)
- [ ] Disable notifications
- [ ] Open VS Code
- [ ] Open web browser with provider console URLs bookmarked
- [ ] Have email inbox ready for verification codes
- [ ] Open this workshop page

## Getting Help

### During the Workshop

**If you encounter issues:**
1. Check the troubleshooting section in Chapter 2
2. Raise your hand or ask in chat
3. Note the issue for office hours if it's not blocking

**Common Setup Issues:**
- "Can't create account" — Check email spam folder for verification
- "Payment declined" — Try a different card or use Google/Groq free tiers first
- "API key not working" — Check for trailing spaces when pasting
- "Firewall blocking requests" — Ask IT to whitelist the provider domains

### After the Workshop

**Support Channels:**
- 📧 Email: workshop@dreamlab.ai
- 💬 Discord: Workshop Channel
- 📅 Office Hours: Fridays 2-3pm GMT
- 📖 Documentation: Chapter 6 (Resources)

## Accessibility

### Accommodations Available

**We support:**
- Screen readers (all instructions are text-based)
- Keyboard-only navigation
- High-contrast themes in VS Code
- Adjustable font sizes
- Step-by-step written instructions for every visual step

**Request Accommodations:**
- Email: accessibility@dreamlab.ai
- Notice: 48 hours preferred
- Alternative formats available on request

## FAQ: Prerequisites

### "I've never used an API before. Is this for me?"
**Yes.** We explain APIs from scratch using everyday analogies. If you can order food at a restaurant, you can understand how an API works. Every step is guided.

### "Do I have to spend money?"
**A small amount.** Anthropic and OpenAI require prepaid credit (£4-8 each). Google and Groq are free. Your total spend during the workshop will be under £2. You'll save far more by reducing subscriptions.

### "What if my organisation blocks these websites?"
**Contact IT in advance.** Ask them to whitelist `api.openai.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`, and `api.groq.com`. All traffic is HTTPS on port 443.

### "Can I use my existing ChatGPT/Claude subscriptions instead?"
**This workshop uses the API, not the chat interface.** Your subscription and your API account are separate. You'll create API-specific credentials. You can cancel subscriptions later once you see the savings.

### "What if I only complete Module 05 partially?"
**You'll be fine** as long as VS Code is installed and launching. We'll configure everything else during this workshop.

### "Do I need Python or any programming language?"
**No.** All exercises can be completed using Claude Code and the Continue extension. Python examples are provided for reference but are entirely optional.

## Ready to Transform Your AI Access?

If you meet these prerequisites, you're about to dramatically change how you use and pay for AI. Direct API access is simpler than it sounds, cheaper than you'd expect, and more powerful than any subscription.

**See you in the workshop!**

---

[Proceed to Workshop -->](./00_introduction.md) | [Back to Module Overview](README.md)
