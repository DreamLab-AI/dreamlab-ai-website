# Prerequisites - Workshop 04 Afternoon: Agent Orchestration & Safety

## Before You Begin

This afternoon session builds directly on the morning AI Agents session. You will move from building individual agents to coordinating multiple agents as a system, with safety controls, cost management, and production-grade observability. Ensure you meet these requirements for the best experience.

## Required Prior Knowledge

### Essential: Morning Session Completion

This session assumes you have completed the **Day 4 Morning Session: AI Agents & Tool Use**. Specifically, you should be comfortable with:

- **Agent loops**: How an LLM reasons, decides to call a tool, processes the result, and iterates
- **Tool use**: Defining tools with JSON schemas and handling tool calls via the Anthropic API
- **The Anthropic SDK**: Making `client.messages.create()` calls in Python with system prompts, messages, and tools
- **Claude Code basics**: Using Claude Code from the command line, including the `--print` flag for non-interactive output
- **MCP servers**: Understanding what Model Context Protocol servers provide (tools for agents to call)

If you have not completed the morning session, review its materials before proceeding. The afternoon exercises will not make sense without this foundation.

### Helpful but Not Required

- **Python fluency**: You do not need to be a developer, but comfort reading Python code (functions, classes, loops, try/except) will help significantly
- **Concurrent programming concepts**: We introduce `concurrent.futures` from scratch, but familiarity with the idea of running tasks in parallel is helpful
- **API experience**: Understanding of HTTP APIs, JSON, and environment variables
- **Version control**: Basic Git knowledge (commits, branches) is useful for the deployment exercise but not essential

## Technical Requirements

### Hardware Specifications

**Minimum Requirements:**
- **Processor:** Dual-core CPU (2018 or newer)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 5GB free disk space
- **Display:** 1280x720 resolution minimum

**Recommended Specifications:**
- **Processor:** Quad-core CPU
- **RAM:** 16GB or more
- **Storage:** 10GB free (for packages, logs, and project files)
- **Display:** 1920x1080 or higher (multiple code files side by side)

### Operating System

**Supported Platforms:**
- Windows 10 or 11 (64-bit) with WSL2 recommended
- macOS 12 (Monterey) or newer
- Ubuntu 20.04+, Debian 11+, Fedora 36+

### Internet Connection

- **Speed:** 10 Mbps minimum (multiple concurrent API calls during exercises)
- **Stability:** Consistent connection required throughout the session
- **Data:** Approximately 200MB for package installation; ongoing API traffic during exercises

## Software Prerequisites

### Must Have Before the Session

**1. Python 3.10 or newer**

Verify your installation:
```bash
python3 --version   # Should show 3.10 or higher
```

If not installed:
- **macOS:** `brew install python@3.12`
- **Windows:** Download from https://www.python.org/downloads/
- **Linux:** `sudo apt install python3.12 python3.12-venv` (Ubuntu/Debian)

**2. pip and virtual environments**

```bash
python3 -m pip --version    # Verify pip is available
python3 -m venv --help      # Verify venv is available
```

**3. Required Python packages**

Install these before the session to avoid delays:
```bash
# Create and activate a virtual environment
python3 -m venv agent-workshop
source agent-workshop/bin/activate     # macOS/Linux
# agent-workshop\Scripts\activate      # Windows

# Install core packages
pip install anthropic tenacity python-dotenv

# Optional: for LangGraph exercises
pip install langgraph langchain langchain-anthropic

# Optional: for testing
pip install pytest
```

**4. A code editor**

- **VS Code** (recommended -- configured in Workshop 01)
- Any editor that can work with Python files

**5. A terminal / command line**

- **macOS:** Terminal or iTerm2
- **Windows:** Windows Terminal with WSL2, or PowerShell
- **Linux:** Any terminal emulator

### Must Have: API Access

**Anthropic API Key (Required)**

You need an Anthropic API key with credit loaded. This session makes multiple API calls across exercises and projects.

1. Visit https://console.anthropic.com
2. Create an account or sign in
3. Generate an API key under Settings > API Keys
4. Add credit to your account (the full session typically costs under $5 in API usage)

Set the key in your environment:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or create a `.env` file in your project directory:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Estimated API Costs:**
- Hands-on exercises: approximately $1--2
- Final project: approximately $1--2
- Total session: under $5 at current rates

Check the [Anthropic pricing page](https://www.anthropic.com/pricing) for current token rates.

**Claude Code (Recommended)**

Several exercises use Claude Code's subagent and hooks features. If you set this up in the morning session, you are ready.

```bash
claude --version    # Verify Claude Code is installed
```

If not installed, follow the instructions at https://docs.anthropic.com/en/docs/claude-code/getting-started

### Optional Software

**Docker** (for sandboxed execution exercises):
```bash
docker --version    # Verify Docker is available
```
The sandboxing exercise has a Docker-based option. If Docker is not installed, you can use the E2B cloud sandbox alternative or skip the sandboxing exercise.

## Project Preparation

### Create a Workshop Directory

```bash
mkdir -p ~/agent-workshop/afternoon
cd ~/agent-workshop/afternoon
```

### Verify Your Environment

Run this quick check before the session:

```bash
# 1. Python version
python3 --version

# 2. Required packages
python3 -c "import anthropic; print(f'Anthropic SDK: {anthropic.__version__}')"
python3 -c "import tenacity; print('Tenacity: OK')"

# 3. API key (should print a partial key)
python3 -c "
import os
key = os.environ.get('ANTHROPIC_API_KEY', '')
if key:
    print(f'API key: {key[:12]}...{key[-4:]}')
else:
    print('WARNING: ANTHROPIC_API_KEY not set')
"

# 4. Quick API test
python3 -c "
import anthropic
client = anthropic.Anthropic()
resp = client.messages.create(
    model='claude-haiku-4-5-20251001',
    max_tokens=50,
    messages=[{'role': 'user', 'content': 'Say hello in one word.'}]
)
print(f'API test: {resp.content[0].text}')
print(f'Tokens used: {resp.usage.input_tokens + resp.usage.output_tokens}')
"
```

If all four checks pass, you are ready.

### Bring Real Work

The final project asks you to build a multi-agent system. It is most effective when applied to a real problem. Think about:

- A research task that requires searching multiple sources
- A review process with multiple specialist perspectives (security, performance, style)
- A workflow that currently requires manual coordination between steps
- A reporting task that combines data from different areas

## What to Expect

### Session Structure

| Time | Activity | Intensity |
|------|----------|-----------|
| 0:00--0:15 | Introduction and architecture overview | Light -- absorb the big picture |
| 0:15--1:00 | Core concepts: patterns, safety, cost | Moderate -- guided walkthrough with examples |
| 1:00--1:45 | Hands-on: build orchestrated systems | High -- live coding, building real systems |
| 1:45--2:15 | Progressive exercises | High -- self-paced challenges |
| 2:15--2:45 | Project work: production system | High -- independent build |
| 2:45--3:00 | Assessment and wrap-up | Moderate -- knowledge validation |

### What This Session IS

- Hands-on building of multi-agent systems
- Practical safety and cost controls you can use immediately
- Real code that runs against real APIs
- Production patterns, not theoretical frameworks
- Focused on the Anthropic ecosystem with LangGraph and CrewAI for comparison

### What This Session IS NOT

- A deep-dive into any single framework (we survey multiple)
- A software engineering course (code is provided; you adapt it)
- Purely theoretical (every concept is implemented and tested)
- A replacement for the morning session (this builds on it directly)

## Getting Help

### During the Session

1. Check the troubleshooting section below first
2. Ask in the workshop chat channel
3. Flag for facilitator attention
4. Note issues for office hours if they are not blocking

### Common Setup Issues

**"ModuleNotFoundError: No module named 'anthropic'"**
- Ensure you activated your virtual environment: `source agent-workshop/bin/activate`
- Reinstall: `pip install anthropic`

**"AuthenticationError" or "Invalid API key"**
- Check: `echo $ANTHROPIC_API_KEY` (should show your key)
- Ensure the key starts with `sk-ant-`
- Verify credit is loaded at https://console.anthropic.com

**"RateLimitError" during exercises**
- This is normal during parallel execution exercises
- The retry logic covered in the session handles this automatically
- If persistent, reduce `max_workers` in the `ThreadPoolExecutor`

**"Python version too old"**
- This session requires Python 3.10+ for `TypedDict` and `match` statement support
- Upgrade via your package manager or https://www.python.org/downloads/

**LangGraph installation fails**
- LangGraph exercises are optional; you can skip them
- If needed: `pip install --upgrade pip setuptools wheel` then retry

### After the Session

- **Documentation:** Review the [Resources](06_resources.md) page
- **Community:** Join the Anthropic Discord for ongoing support
- **Office Hours:** Fridays 2--3pm GMT
- **Email:** workshop@dreamlab.ai

## Accessibility

### Accommodations Available

- Screen reader compatible materials
- High-contrast themes supported in VS Code
- All code examples available as plain text (no images of code)
- Session recording available for review at your own pace
- Alternative formats on request (48 hours notice preferred)

**Request accommodations:** accessibility@dreamlab.ai

## Pre-Session Checklist

### The Day Before

- [ ] Verify Python 3.10+ is installed
- [ ] Install required packages (`anthropic`, `tenacity`, `python-dotenv`)
- [ ] Set `ANTHROPIC_API_KEY` in your environment
- [ ] Run the verification script above -- all checks pass
- [ ] Create the workshop directory
- [ ] Identify a real task for the final project
- [ ] Review your notes from the morning session

### One Hour Before

- [ ] Activate your Python virtual environment
- [ ] Verify the API key is still set (`echo $ANTHROPIC_API_KEY`)
- [ ] Close unnecessary applications to free RAM
- [ ] Open your code editor and terminal
- [ ] Have this prerequisites page open for reference

## Ready to Begin?

If you have completed the morning session and all checks above pass, you are ready to build production multi-agent systems.

**Let's orchestrate.**

---

[Proceed to Workshop -->](./00_introduction.md) | [Learning Objectives](./objectives.md) | [Back to Module Overview](README.md)
