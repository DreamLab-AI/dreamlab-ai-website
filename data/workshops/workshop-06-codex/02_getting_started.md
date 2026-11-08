# Chapter 2: Getting Started — Setup and Initial Configuration

> **June 2026:** Whether you prefer a terminal agent, an IDE extension, or a web-based chat interface, the tooling is mature enough that you can be productive within minutes. This chapter walks you through every path from first install to first result.

## Why Setup Matters

The difference between a frustrating first experience and a productive one almost always comes down to configuration. AI coding agents are powerful out of the box, but they perform dramatically better when they can authenticate cleanly, access the right models, and read your project context. A well-configured environment means the agent understands your tech stack, respects your coding conventions, and avoids wasting tokens on irrelevant context — from the very first prompt.

This chapter covers three progressively deeper levels of setup, matching the three tiers of AI coding tools available in 2026.

## What You Will Learn

By the end of this chapter, you will be able to:

- **Access web-based AI coding tools** — Use ChatGPT (Canvas mode), Claude.ai (Artifacts), and cloud-based IDEs without any local installation
- **Install and configure terminal agents** — Get Claude Code and OpenAI Codex CLI running on macOS, Linux, or Windows (WSL2) with proper authentication
- **Set up IDE-integrated tools** — Configure Cursor, GitHub Copilot, Windsurf, or Continue.dev in your existing editor
- **Manage API keys securely** — Obtain, store, rotate, and monitor keys across Anthropic, OpenAI, and other providers
- **Verify your setup** — Run quick diagnostic commands to confirm everything works before moving on

## Chapter Structure

This chapter is divided into three sections, each targeting a different setup pathway:

### [2.a: Web & IDE Tools](./02_a_accessing_the_codex_cloud_agent.md)

The lowest-friction entry point. If you have never used an AI coding tool before, start here. This section covers:

- **ChatGPT for coding** — GPT-4o and o3 via the web, including Canvas mode for interactive code editing
- **Claude.ai** — Web-based access to Claude models with Artifacts for rendering and iterating on code
- **Cursor AI** — A VS Code fork with built-in Composer for multi-file natural language editing
- **GitHub Copilot** — Inline completions, Copilot Chat, and Copilot Workspace for planning and implementing features
- **Windsurf and Continue.dev** — Additional IDE options for different preferences and budgets

No API keys or terminal setup required for most of these tools — just a browser and an account.

### [2.b: Setting Up Terminal Agents](./02_b_setting_up_the_codex_cli.md)

The core of this workshop. Terminal agents give you the full power of agentic coding: reading your codebase, executing shell commands, running tests, creating commits, and iterating autonomously. This section covers:

- **Claude Code CLI** — Installation via npm, authentication with your Anthropic API key, first-run walkthrough, essential slash commands, and creating your first CLAUDE.md
- **OpenAI Codex CLI** — Installation, API key setup, approval modes (suggest, auto-edit, full-auto), multi-provider support, and creating your first AGENTS.MD
- **Side-by-side comparison** — A quick-reference table covering install commands, config files, default models, and key differences
- **MCP server setup** — Optional but powerful: connecting Claude Code to databases, GitHub, and other external tools via the Model Context Protocol

Most developers completing this workshop will want at least one terminal agent configured. We recommend Claude Code as the primary tool, with Codex CLI as a strong alternative — especially for teams that value open-source tooling or need sandboxed execution.

### [2.c: API Keys and Authentication](./02_c_api_keys_and_authentication.md)

API keys are the gateway to every AI coding tool that charges per token. This section covers:

- **Obtaining keys** from Anthropic (console.anthropic.com), OpenAI (platform.openai.com), Azure, Google, and local providers like Ollama
- **Secure storage** — Environment variables, shell configuration files, `.env` files (gitignored), and credential managers
- **Key rotation and monitoring** — Best practices for rotating keys, setting spending limits, and tracking usage across providers
- **Common pitfalls** — Why keys should never appear in CLAUDE.md or AGENTS.MD (they are committed to Git), and how to handle CI/CD environments safely

## Recommended Setup Path

For developers new to AI coding agents, we recommend this sequence:

```
1. Try a web tool (5 min)          → ChatGPT or Claude.ai
2. Install a terminal agent (10 min) → Claude Code or Codex CLI
3. Create a config file (5 min)     → CLAUDE.md or AGENTS.MD
4. Run your first real task (5 min)  → Fix a bug or add a test
```

The entire setup takes under 30 minutes. By the end, you will have a working terminal agent configured for your project, ready for the deeper techniques covered in Chapters 3 and 4.

## Key Concepts

| Concept | What It Means |
|---------|---------------|
| **Terminal agent** | A standalone tool (Claude Code, Codex CLI) that runs in your shell and operates directly on your codebase |
| **IDE-integrated tool** | An extension (Copilot, Cursor) that adds AI capabilities inside your existing editor |
| **CLAUDE.md / AGENTS.MD** | Project configuration files that give the agent persistent context about your tech stack, conventions, and constraints |
| **MCP server** | A tool integration endpoint that lets Claude Code interact with databases, APIs, and external services |
| **Approval mode** | The level of autonomy you grant the agent — from showing diffs for approval to fully autonomous execution |
| **API key** | Your authentication credential for a model provider, billed per token of input and output |

## Estimated Time

| Section | Time Required | Outcome |
|---------|--------------|---------|
| 2.a: Web & IDE Tools | 15-20 min | Web-based and IDE tools configured |
| 2.b: Terminal Agents | 15-20 min | Claude Code and/or Codex CLI installed and running |
| 2.c: API Keys | 10-15 min | API keys obtained, stored securely, and verified |
| **Total** | **40-55 min** | **Full development environment ready** |

## Prerequisites Checklist

Before starting this chapter, ensure you have:

- [ ] Node.js 22+ installed (`node --version`)
- [ ] An Anthropic account (console.anthropic.com) and/or an OpenAI account (platform.openai.com)
- [ ] Git installed and configured (`git --version`)
- [ ] A code editor installed (VS Code recommended)
- [ ] A project directory to work in (any existing codebase will do)

---

**Next:** [2.a: Web & IDE Tools](./02_a_accessing_the_codex_cloud_agent.md)

---

*Last Updated: June 2026 | Claude Code, OpenAI Codex CLI, Cursor, Copilot, and the full AI coding setup guide*
