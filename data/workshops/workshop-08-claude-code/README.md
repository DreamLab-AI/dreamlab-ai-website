# Claude Code Mastery: From First Command to Autonomous Agents

> **Last Updated: June 2026** — Covers Claude Code CLI, desktop app, web app, and IDE extensions. Models: Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5.

## Executive Summary

Claude Code is Anthropic's agentic coding tool — your AI pair programmer that lives in the terminal. Unlike chat-based assistants that give you code to copy-paste, Claude Code works directly with your files, runs your commands, searches the web, and manages your git workflow. It understands your entire project, follows your rules, and asks permission before making changes.

This workshop takes you from installation to building autonomous multi-agent workflows. Whether you are a developer looking to supercharge your daily work, a technical writer automating documentation, or a team lead evaluating AI tooling, you will leave with practical skills you can use immediately.

### What Makes Claude Code Different

| Capability | Claude Code | Traditional AI Chat |
|------------|------------|-------------------|
| File editing | Reads, writes, and edits files directly | Generates code blocks you copy-paste |
| Command execution | Runs shell commands with your approval | Suggests commands for you to run |
| Project awareness | Reads CLAUDE.md for project context | Starts fresh every conversation |
| Git integration | Creates commits, branches, and PRs | Tells you what commands to run |
| Extensibility | MCP servers, hooks, subagents | Plugins (limited) |
| Availability | CLI, desktop app, web app, IDE extensions | Web interface only |

### Key Learning Outcomes

By completing this workshop, you will:

- **Install and configure** Claude Code across CLI, desktop, and IDE environments
- **Master the core tools** — file operations, bash commands, web search, and slash commands
- **Write effective CLAUDE.md files** that teach Claude about your project's conventions
- **Connect MCP servers** to extend Claude's reach into databases, APIs, and services
- **Build event-driven hooks** that automate formatting, validation, and notifications
- **Orchestrate multi-agent workflows** using subagents for parallel, specialised tasks
- **Apply proven patterns** for codebase onboarding, debugging, refactoring, and documentation

### Workshop Structure

```
Chapter 0: Introduction           — What Claude Code is and why it matters
Chapter 1: Getting Started        — Installation, authentication, first commands
Chapter 2: Core Features          — Tools, slash commands, permission modes
Chapter 3: CLAUDE.md              — Project configuration and best practices
Chapter 4: MCP Servers            — Extending capabilities with external tools
Chapter 5: Hooks & Automation     — Event-driven workflows
Chapter 6: Subagents & Workflows  — Multi-agent orchestration
Chapter 7: Practical Patterns     — Real-world use cases
Chapter 8: Exercises              — Hands-on practice
Chapter 9: Resources              — Official docs and community
```

### Target Audience

- **Software developers** of all levels wanting AI-assisted development
- **Technical writers and documentarians** looking to automate content creation
- **DevOps and platform engineers** interested in AI-driven automation
- **Team leads and architects** evaluating AI coding tools for adoption
- **Non-developers** who want to use AI for writing, analysis, and file management

### Prerequisites

- Basic familiarity with a terminal (command line)
- Node.js 18 or later installed on your machine
- An Anthropic account (free tier available at console.anthropic.com)
- A code editor (VS Code recommended, but any will do)
- Optional: a project you would like to try Claude Code on

### Estimated Time Investment

- **Quick Start:** 1-2 hours (Chapters 0-2)
- **Core Mastery:** 3-4 hours (Chapters 0-5)
- **Complete Workshop:** 6 hours (All chapters + exercises)

### Current Models (June 2026)

| Model | Best For |
|-------|----------|
| **Fable 5** | Most powerful, highest intelligence |
| **Opus 4.8** | Long-horizon agentic work, coding, knowledge work |
| **Sonnet 4.6** | Best speed/intelligence balance, daily coding |
| **Haiku 4.5** | Fast, cost-effective simple tasks |

Claude Code uses Opus by default. The `/fast` slash command switches to faster output for quick tasks. Check [console.anthropic.com](https://console.anthropic.com) for current model pricing and availability.

### How Claude Code Fits the AI Coding Landscape

Claude Code occupies a distinct position among AI coding tools. It is terminal-native and agentic — it does not just suggest code, it executes tasks end-to-end. Compared to GitHub Copilot (which excels at inline autocomplete within an editor) or Cursor (a VS Code fork with deep IDE integration), Claude Code operates at a higher level of autonomy. It can take a task like "add pagination to this endpoint" and handle the entire implementation across multiple files, run the tests, and commit the result.

For developers who already use Copilot or Cursor, Claude Code is not a replacement but a complement. Use Copilot for moment-to-moment autocomplete, Cursor for IDE-centric AI assistance, and Claude Code for larger tasks that span multiple files or require shell access, git operations, and external tool integration.

### Quick Reference Card

```bash
# Install
npm install -g @anthropic-ai/claude-code

# Run
claude                    # Start interactive session
claude "explain this"     # One-shot question

# Key slash commands
/help                     # Show all commands
/clear                    # Clear conversation
/config                   # Open configuration
/fast                     # Toggle fast mode (faster output)
/review                   # Code review current changes
/init                     # Generate a CLAUDE.md for this project
/code-review              # Deep code review with findings
```

### Workshop Navigation

**Start Here:** [Chapter 0: Introduction](./00_introduction.md)

**Complete Chapter List:**

1. [Introduction: What Is Claude Code?](./00_introduction.md)
2. [Getting Started: Installation and First Run](./01_getting_started.md)
3. [Core Features: Commands, Slash Commands, and Tools](./02_core_features.md)
4. [CLAUDE.md: Teaching Claude About Your Project](./03_claude_md.md)
5. [MCP Servers: Extending Claude's Capabilities](./04_mcp_servers.md)
6. [Hooks and Automation: Event-Driven Workflows](./05_hooks_automation.md)
7. [Subagents and Workflows: Multi-Agent Orchestration](./06_subagents_workflows.md)
8. [Practical Patterns: Real-World Use Cases](./07_practical_patterns.md)
9. [Hands-On Exercises](./08_exercises.md)
10. [Resources & Community](./09_resources.md)

### What Sets This Workshop Apart

This material is based on real-world usage patterns, not abstract overviews. Every chapter includes commands you can run, configuration you can copy, and patterns you can apply to your work today. We cover not just what Claude Code can do, but how to structure your projects and workflows to get the most from it.

The exercises in Chapter 8 use your own projects — the best way to learn Claude Code is to use it on real work.

### Recommended Learning Path

**If you are new to AI coding tools:** Work through every chapter in order. The workshop builds progressively — each chapter assumes knowledge from the previous ones.

**If you already use Claude Code casually:** Skim Chapters 0-2 for any features you may have missed, then focus on Chapters 3-6 (CLAUDE.md, MCP, hooks, and subagents) — these are the features that separate casual use from mastery.

**If you are evaluating tools for your team:** Read Chapter 0 for the competitive landscape, Chapter 3 for project configuration (the key to team-wide consistency), and Chapter 7 for practical patterns your team can adopt immediately.

**If you are not a developer:** Chapters 0-2 and Pattern 7 in Chapter 7 (writing and content) cover everything you need. Claude Code is a powerful tool for anyone who works with files, data, and documents — you do not need to be a programmer.

### About DreamLab AI

DreamLab AI delivers intensive AI training programmes from our dedicated facility in the Lake District, UK. Our workshops combine hands-on practical exercises with deep technical understanding, taught by practitioners who build with these tools every day.

**Explore more workshops:** [dreamlab-ai.com/workshops](https://dreamlab-ai.com/workshops)

**Get in touch:** [dreamlab-ai.com/contact](https://dreamlab-ai.com/contact)

---

**Ready to transform how you work with code?** Start with [Chapter 0: Introduction](./00_introduction.md)

---

*A DreamLab AI Self-Guided Workshop | Last Updated: June 2026 | Claude Code with Fable 5, Opus 4.8, Sonnet 4.6*
