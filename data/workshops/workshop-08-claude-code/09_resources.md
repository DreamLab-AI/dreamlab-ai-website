# Chapter 9: Resources & Community

> Links, references, and further reading to continue your Claude Code journey after completing this workshop.

## Official Documentation

### Primary Resources

| Resource | URL | What You Find There |
|----------|-----|-------------------|
| **Claude Code documentation** | [docs.anthropic.com/claude-code](https://docs.anthropic.com/en/docs/claude-code) | Installation, configuration, tool reference, permissions, CLAUDE.md spec |
| **Anthropic API documentation** | [docs.anthropic.com](https://docs.anthropic.com) | API reference, models, pricing, rate limits, best practices |
| **Model Context Protocol** | [modelcontextprotocol.io](https://modelcontextprotocol.io) | MCP specification, server registry, SDK documentation |
| **Claude Code GitHub** | [github.com/anthropics/claude-code](https://github.com/anthropics/claude-code) | Source code, issue tracker, release notes |

### Reference Pages

| Topic | Where to Find It |
|-------|-----------------|
| Current model IDs and pricing | [docs.anthropic.com/en/docs/about-claude/models](https://docs.anthropic.com/en/docs/about-claude/models) |
| CLAUDE.md specification | [docs.anthropic.com/en/docs/claude-code/claude-md](https://docs.anthropic.com/en/docs/claude-code/claude-md) |
| Hooks reference | [docs.anthropic.com/en/docs/claude-code/hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) |
| MCP server configuration | [docs.anthropic.com/en/docs/claude-code/mcp](https://docs.anthropic.com/en/docs/claude-code/mcp) |
| Permission model | [docs.anthropic.com/en/docs/claude-code/permissions](https://docs.anthropic.com/en/docs/claude-code/permissions) |
| Slash commands | [docs.anthropic.com/en/docs/claude-code/slash-commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) |

## Installation Quick Reference

```bash
# Install Claude Code (requires Node.js 18+)
npm install -g @anthropic-ai/claude-code

# Update to the latest version
npm update -g @anthropic-ai/claude-code

# Verify installation
claude --version

# Start a session
claude

# One-shot command (no interactive session)
claude "explain this project"

# Pipe input
cat error.log | claude "explain this error"
```

## Model Quick Reference (June 2026)

| Model | ID | Best For |
|-------|-----|----------|
| **Fable 5** | `claude-fable-5` | Maximum reasoning, complex multi-step tasks |
| **Opus 4.8** | `claude-opus-4-8` | Default for most work, excellent at code and analysis |
| **Sonnet 4.6** | `claude-sonnet-4-6` | Fast and capable, lower cost for simpler tasks |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Fastest, lowest cost, ideal for quick lookups and subagents |

Check [console.anthropic.com](https://console.anthropic.com) for current pricing and rate limits. Anthropic offers both pay-as-you-go API billing and subscription plans.

## Slash Commands Reference

| Command | What It Does |
|---------|-------------|
| `/help` | Show help and available commands |
| `/clear` | Clear conversation context |
| `/config` | Open configuration settings |
| `/fast` | Toggle fast mode (uses a lighter model for speed) |
| `/review` | Review uncommitted changes |
| `/code-review` | Deep code review with severity ratings |
| `/init` | Generate a CLAUDE.md for the current project |
| `/loop` | Run a command on a recurring interval |
| `/schedule` | Create automated cloud agents on a cron schedule |

## Tools Reference

| Tool | What Claude Uses It For |
|------|------------------------|
| **Read** | Reading files from your project |
| **Edit** | Making targeted edits to existing files |
| **Write** | Creating new files or completely rewriting existing ones |
| **Bash** | Running shell commands (build, test, git, etc.) |
| **WebSearch** | Searching the web for documentation, solutions, and references |
| **WebFetch** | Fetching content from a specific URL |
| **Agent** | Spawning subagents for parallel tasks |
| **Workflow** | Running multi-step scripted pipelines |

## MCP Server Registry

The MCP ecosystem continues to grow. These are the most commonly used servers:

| Server | Package | Primary Use |
|--------|---------|-------------|
| GitHub | `@modelcontextprotocol/server-github` | Issues, PRs, repos, actions |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Database queries and schema exploration |
| SQLite | `@modelcontextprotocol/server-sqlite` | Local database operations |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File access outside project directory |
| Slack | `@modelcontextprotocol/server-slack` | Channel messages and notifications |
| Google Drive | `@modelcontextprotocol/server-gdrive` | Document access and search |
| Memory | `@modelcontextprotocol/server-memory` | Persistent key-value storage |

Browse the full registry at [modelcontextprotocol.io/servers](https://modelcontextprotocol.io).

## CLAUDE.md Quick Reference

A minimal but effective CLAUDE.md template:

```markdown
# Project Name

## Overview
One or two sentences about what the project does and what it is built with.

## Commands
- `npm run dev` — Development server
- `npm run build` — Production build
- `npm test` — Run tests
- `npm run lint` — Lint check
- Always run build and lint before committing.

## Architecture
- `src/routes/` — HTTP handlers
- `src/services/` — Business logic
- `src/lib/` — Shared utilities

## Conventions
- TypeScript strict mode. No `any`.
- React function components with named exports.
- Zod validation at API boundaries.

## Rules
- Never commit .env files or hardcode secrets.
- Always run tests before committing.
```

## Hook Configuration Quick Reference

A starter `.claude/settings.json` with useful defaults:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(npm run build)",
      "Bash(git status)",
      "Bash(git diff)",
      "Bash(git log)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "npx prettier --write $CLAUDE_FILE_PATH"
      }
    ]
  }
}
```

## Community and Support

### Getting Help

- **GitHub Issues** — [github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues) for bug reports and feature requests
- **Anthropic Discord** — [discord.gg/anthropic](https://discord.gg/anthropic) for community discussion and support
- **Stack Overflow** — Tag questions with `claude-code` and `anthropic`

### Staying Up to Date

- **Anthropic Blog** — [anthropic.com/news](https://www.anthropic.com/news) for model releases and feature announcements
- **Release notes** — Check the Claude Code GitHub repository for per-version changelogs
- **npm updates** — Run `npm outdated -g @anthropic-ai/claude-code` to check for new versions

### Contributing

Claude Code is open source. Contributions are welcome:
- Report bugs via GitHub Issues
- Submit feature requests with clear use cases
- Contribute MCP servers to the ecosystem
- Share your CLAUDE.md configurations with the community

## Related Tools and Ecosystem

### Anthropic Tools

| Tool | What It Does |
|------|-------------|
| **Claude.ai** | Web interface for Claude — useful for conversations without file access |
| **Claude Desktop** | Native desktop application with MCP support |
| **Claude for VS Code** | IDE extension integrating Claude into Visual Studio Code |
| **Claude for JetBrains** | IDE extension for IntelliJ, PyCharm, WebStorm, and other JetBrains IDEs |
| **Anthropic API** | Direct API access for building Claude into your own applications |
| **Agent SDK** | Programmatic SDK for building custom agentic applications |

### Complementary Tools

| Tool | How It Pairs with Claude Code |
|------|------------------------------|
| **Git** | Claude Code has deep git integration — branches, commits, diffs, merge conflict resolution |
| **Docker** | Ask Claude to write and debug Dockerfiles, docker-compose configurations |
| **Terraform/Pulumi** | Infrastructure as code — Claude reads and writes IaC configurations |
| **CI/CD** | Claude can generate and debug GitHub Actions, GitLab CI, and other pipeline configs |
| **Monitoring** | Pipe error logs and metrics into Claude for analysis |

### Alternative AI Coding Tools

| Tool | Category | Pricing |
|------|----------|---------|
| **GitHub Copilot** | IDE inline suggestions + chat | From $10/month (free for students/OSS) |
| **Cursor AI** | VS Code fork with deep AI integration | From $20/month |
| **Windsurf** | IDE with AI assistance (formerly Codeium) | From $10-15/month |
| **Continue.dev** | Open-source, multi-model IDE extension | Free |
| **Aider** | Open-source terminal agent, multi-provider | Free |
| **OpenAI Codex CLI** | Open-source terminal agent | Free (API costs apply) |

## What to Learn Next

Now that you have completed this workshop, here are some directions to explore:

### Deepen Your Practice

1. **Use Claude Code daily for a week.** Build muscle memory with the commands and patterns. The more you use it, the better you will understand when to use which pattern.

2. **Refine your CLAUDE.md.** After a week of use, review your CLAUDE.md and add conventions you discovered were missing. The best CLAUDE.md files evolve over time.

3. **Set up MCP servers for your full tool stack.** Connect your database, issue tracker, and communication tools. The more context Claude has, the more effective it becomes.

### Explore Advanced Topics

4. **Build a custom MCP server.** If your team uses a proprietary tool, create an MCP server that exposes it to Claude. The SDK makes this straightforward.

5. **Design a hook pipeline.** Create a comprehensive set of hooks that auto-format, lint, type-check, and log every change. Tune it until the pipeline is fast enough to be invisible.

6. **Orchestrate with subagents.** Tackle a large codebase task (refactoring, documentation, test generation) using subagents. Learn to decompose work for parallel execution.

### Share Your Knowledge

7. **Write a CLAUDE.md for your team's shared repository.** Encode team conventions so every team member's Claude Code sessions follow the same rules.

8. **Create a team onboarding workflow.** New team members can start a Claude Code session and ask "explain this project" to get up to speed quickly.

9. **Share patterns with your team.** The practical patterns from Chapter 7 work in any codebase. Show colleagues how to use Claude Code for their specific tasks.

## Workshop Summary

Over nine chapters, you have learned:

| Chapter | Core Skill |
|---------|-----------|
| 0. Introduction | What Claude Code is and how it differs from other AI coding tools |
| 1. Getting Started | Installation, authentication, first commands |
| 2. Core Features | Tools, slash commands, permission modes, context management |
| 3. CLAUDE.md | Project configuration, hierarchy, best practices |
| 4. MCP Servers | Connecting to external tools and data sources |
| 5. Hooks | Event-driven automation and workflows |
| 6. Subagents & Workflows | Multi-agent orchestration, /loop, /schedule |
| 7. Practical Patterns | Real-world use cases from onboarding to code review |
| 8. Exercises | Hands-on practice with all skills |

Claude Code is a tool that improves with use. The more you work with it, the better you become at prompting, configuring, and orchestrating it. Start with the basics, build habits, and gradually adopt the more advanced features as your needs grow.

---

## About DreamLab AI

DreamLab AI delivers intensive AI training programmes from our dedicated facility in the Lake District, UK. Our workshops combine hands-on practical exercises with deep technical understanding, taught by practitioners who build with these tools every day.

**Explore more workshops:** [dreamlab-ai.com/workshops](https://dreamlab-ai.com/workshops)

**Get in touch:** [dreamlab-ai.com/contact](https://dreamlab-ai.com/contact)

---

*DreamLab AI Self-Guided Workshop | June 2026*

*This workshop was last updated on 22 June 2026. Claude Code evolves rapidly — check the [official documentation](https://docs.anthropic.com/en/docs/claude-code) for the latest features and changes.*
