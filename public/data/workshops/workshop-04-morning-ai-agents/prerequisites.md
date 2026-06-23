# Prerequisites - Workshop 04 Morning: Specialised AI Agents

## Before You Begin

This session moves quickly from concepts to working code. Arriving with your environment ready means you can focus entirely on building agents rather than troubleshooting installation. Allow 20-30 minutes for setup if you are starting from scratch.

## Required Knowledge

### Essential Skills

- **Basic Python or TypeScript** -- you can write a function, assign variables, and run a script from the terminal. You do not need to be a developer; scripting-level comfort is sufficient.
- **API Basics** -- you understand what an API call is, what request/response means, and you have used a REST endpoint or cloud service before (even via a web dashboard).
- **LLM Familiarity** -- you have interacted with at least one Large Language Model (ChatGPT, Claude, Gemini, or similar). You understand prompts, responses, and that models can produce different outputs each time.

### Helpful but Not Required

- Experience with the command line or terminal (we provide exact commands to copy)
- Familiarity with JSON format (tool schemas use JSON)
- Previous exposure to VS Code or any code editor
- Completion of earlier workshop days (Days 1-3 cover foundational AI skills)

### Not Required

- No prior experience building AI agents or chatbots
- No knowledge of MCP, function calling, or tool-use protocols
- No experience with multi-agent frameworks (LangChain, CrewAI, AutoGen)
- No DevOps or deployment skills

## Technical Requirements

### Hardware Specifications

**Minimum Requirements:**
- **Processor:** Dual-core CPU (2018 or newer recommended)
- **RAM:** 8 GB minimum
- **Storage:** 5 GB free disk space (for packages, virtual environments, and project files)
- **Display:** 1280x720 resolution minimum

**Recommended Specifications:**
- **Processor:** Quad-core CPU
- **RAM:** 16 GB or more
- **Storage:** 10 GB free
- **Display:** 1920x1080 or higher (helpful for side-by-side terminal and editor)

### Operating System

**Supported Platforms:**
- Windows 10 or 11 (64-bit) with WSL2 recommended for Python
- macOS 11 (Big Sur) or newer
- Ubuntu 20.04+, Debian 11+, Fedora 36+, or other mainstream Linux distributions

**Administrator Access Required:**
- Ability to install packages via `pip` or `npm`
- Permission to set environment variables
- Terminal or command-line access

### Internet Connection

- **Speed:** 10 Mbps minimum (API calls and package downloads)
- **Stability:** Consistent connection required throughout -- every agent exercise makes live API calls
- **Data:** Approximately 200 MB for initial package installation; ongoing API traffic is lightweight
- **Firewalls:** Ensure outbound HTTPS access to `api.anthropic.com`, `registry.npmjs.org`, and `pypi.org`

## Software Prerequisites

### Must Install Before the Workshop

**1. Python 3.10+ (recommended) or Node.js 18+**

Most exercises use Python. TypeScript alternatives are noted where available.

```bash
# Check Python version
python3 --version   # Should show 3.10 or higher

# Check Node.js version (for Claude Code and MCP servers)
node --version      # Should show 18 or higher
```

**Installing Python (if needed):**
- **Windows:** Download from https://www.python.org/downloads/ -- tick "Add to PATH" during installation
- **macOS:** `brew install python@3.12` (requires Homebrew) or download from python.org
- **Linux:** `sudo apt install python3 python3-pip python3-venv` (Debian/Ubuntu)

**Installing Node.js (if needed):**
- All platforms: https://nodejs.org/ (LTS version recommended)
- Or use a version manager: `nvm install --lts`

**2. A Code Editor**

- **VS Code** (recommended) -- https://code.visualstudio.com/
- Any text editor with a built-in terminal will work (Cursor, Windsurf, Sublime Text, etc.)

**3. A Terminal**

- **Windows:** PowerShell, Windows Terminal, or WSL2 bash
- **macOS / Linux:** The built-in Terminal application, or the VS Code integrated terminal

### Will Install During the Workshop

We will install these together in the hands-on section:

- **Claude Code** (Anthropic's terminal coding agent): `npm install -g @anthropic-ai/claude-code`
- **Anthropic Python SDK**: `pip install anthropic`
- **Supporting packages**: `python-dotenv`, `duckduckgo-search`, `tenacity`
- **MCP servers** (as needed): installed via `npx` on demand

## Account Setup

### Required: Anthropic API Key

All core exercises use the Claude API. You need an API key before the session begins.

1. **Create an account** at https://console.anthropic.com
2. **Add billing** -- a credit card is required for API access. Workshop exercises typically cost less than $2 in total.
3. **Generate an API key** from the console dashboard
4. **Set the key in your environment:**

```bash
# macOS / Linux -- add to your shell profile (~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish)
export ANTHROPIC_API_KEY="sk-ant-..."

# Windows PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Or create a .env file in your project folder (never commit this file)
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

### Optional: Additional Accounts

These are not required but expand what you can explore:

- **Brave Search API** (free tier) -- for real web search in research agents: https://brave.com/search/api/
- **GitHub Account** (free) -- for MCP GitHub server integration: https://github.com/signup
- **OpenAI API Key** -- only if you want to compare with Codex CLI or GPT models: https://platform.openai.com

### Cost Expectations

| Activity | Estimated Cost |
|----------|---------------|
| Core exercises (Sonnet 4.6) | $0.50-1.00 |
| Project work (Sonnet 4.6) | $0.50-1.00 |
| Claude Code usage | $0.50-1.50 |
| **Total for the morning** | **$1.50-3.50** |

Set a spending limit in the Anthropic console to avoid surprises. We recommend $10 for the full day (morning plus afternoon).

## Environment Setup

### Recommended: Create a Workshop Project

```bash
# Create and enter the workshop directory
mkdir ai-agents-workshop
cd ai-agents-workshop

# Create a Python virtual environment (keeps packages isolated)
python3 -m venv venv

# Activate the virtual environment
# macOS / Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install core packages
pip install anthropic python-dotenv

# Install optional packages (used in later exercises)
pip install duckduckgo-search tenacity chromadb

# Verify the Anthropic SDK
python3 -c "import anthropic; print('Anthropic SDK ready')"
```

### Verify Claude Code Installation

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Verify it works (this should start the interactive agent)
claude-code --version
```

### Verify Your API Key

```bash
# Quick test -- should return a response from Claude
python3 -c "
import anthropic, os
client = anthropic.Anthropic()
resp = client.messages.create(
    model='claude-sonnet-4-6',
    max_tokens=50,
    messages=[{'role': 'user', 'content': 'Say hello in one sentence.'}]
)
print(resp.content[0].text)
"
```

If you see a greeting from Claude, your setup is complete.

## Project Preparation

### Bring a Real Use Case

The workshop is most valuable when you apply agent patterns to your own work. Think about a task you do regularly that involves:

- **Research** -- gathering information from multiple sources and synthesising findings
- **Analysis** -- reviewing documents, code, or data for patterns or issues
- **Content creation** -- writing reports, proposals, summaries, or documentation
- **Automation** -- repetitive multi-step workflows you currently do manually

Examples from past participants:
- "I spend 3 hours per week compiling competitor analysis reports"
- "I review 20+ pull requests a week and always check for the same security patterns"
- "I write quarterly research summaries from dozens of journal articles"

### Prepare a Test Topic

For the research agent exercises, have a topic ready:
- Something you genuinely want to research
- Specific enough to produce useful results (e.g. "EU AI Act compliance requirements for SMEs" rather than "AI regulation")
- Current enough that web search will find relevant sources

## Pre-Workshop Checklist

### One Day Before

- [ ] Python 3.10+ installed and working
- [ ] Node.js 18+ installed and working
- [ ] Anthropic API key created and set as environment variable
- [ ] Workshop project directory created
- [ ] `pip install anthropic python-dotenv` completed successfully
- [ ] API key verified with the quick test above
- [ ] Real use case or research topic identified
- [ ] 3 uninterrupted hours blocked in your calendar

### One Hour Before

- [ ] Terminal or VS Code open and ready
- [ ] Virtual environment activated
- [ ] API key accessible (check with `echo $ANTHROPIC_API_KEY`)
- [ ] Browser open to https://console.anthropic.com (for monitoring usage)
- [ ] Notifications silenced
- [ ] Water and refreshments to hand

## Troubleshooting Common Setup Issues

### "pip: command not found"
Use `pip3` instead, or install pip: `python3 -m ensurepip --upgrade`

### "ModuleNotFoundError: No module named 'anthropic'"
Ensure your virtual environment is activated (`source venv/bin/activate`) before running `pip install`.

### "AuthenticationError" from the API
Verify your key is set: `echo $ANTHROPIC_API_KEY`. If it shows nothing, re-export the key in your current terminal session.

### "npm: command not found"
Install Node.js from https://nodejs.org/ -- the installer includes npm.

### "Permission denied" when installing global npm packages
On macOS/Linux, either use `sudo npm install -g` or configure npm to use a user-level directory: `npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to your PATH.

### Network or Firewall Issues
If your organisation blocks outbound traffic, ensure these domains are accessible: `api.anthropic.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`.

## Getting Help

### During the Workshop
1. Check the troubleshooting section above
2. Ask in the workshop chat or Discord channel
3. Flag the instructor -- setup issues are priority in the first 15 minutes

### After the Workshop
- Workshop Discord channel for ongoing support
- Email: workshop@dreamlab.ai
- Office hours: Fridays 14:00-15:00 GMT
- All workshop materials remain available on this site

## What Comes Next

Once your setup is verified, you are ready to begin. The session starts with the agent landscape and quickly moves to live coding.

---

[Proceed to Workshop -->](00_introduction.md) | [View Objectives](objectives.md) | [Back to Module Overview](README.md)
