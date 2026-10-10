# 2.a: Web & IDE Tools for AI-Powered Coding

> **June 2026:** Before diving into terminal agents (Chapter 2.b), this section covers web-based and IDE-integrated tools that many developers use alongside or before adopting Claude Code or Codex CLI.

## ChatGPT for Coding

ChatGPT (chat.openai.com) offers robust coding capabilities through GPT-4o and o3 models. It is the most accessible starting point for AI-assisted coding — no local setup required.

### What You Get

| Tier | Code Capabilities | Best For |
|------|-------------------|----------|
| **Free** | GPT-4o (limited) | Learning, simple queries |
| **Plus** | GPT-4o unlimited, o3 limited, Canvas | Professional developers |
| **Pro** | o3 unlimited, priority access | Power users, complex tasks |
| **Team** | Shared workspace, admin controls | Small teams |

### Canvas Mode

ChatGPT's Canvas is an interactive code editing environment:

- Side-by-side code viewing and editing
- Inline AI suggestions
- Direct code execution (Python)
- Syntax highlighting for 50+ languages

```
Example workflow:
> "Create a Python web scraper that handles pagination and rate limiting, in Canvas"
(Canvas opens with interactive code editing)
```

### When to Use ChatGPT for Code

- Learning new frameworks or concepts
- Quick prototyping and brainstorming
- Debugging with error messages
- Generating isolated code snippets
- Mobile coding (via ChatGPT app)

### Limitations

- No direct repository access (cannot clone repos or create PRs)
- Cannot execute most languages locally (Python only via Code Interpreter)
- Context limited to what you paste in
- No persistent project configuration

## Claude.ai for Coding

Claude.ai provides web access to Claude models with Artifacts — an interactive panel for code, documents, and visualisations.

### What You Get

- **Free tier:** Access to Claude Sonnet with limited usage
- **Pro ($20/mo):** Higher usage limits, priority access, Projects feature
- **Artifacts:** Interactive code panels with preview

### When to Use Claude.ai

- Exploring ideas before committing to implementation
- Working with long documents or large code samples (200K context)
- Using Projects to organise related conversations with shared context
- When you want to evaluate Claude's output before adopting Claude Code CLI

## Cursor AI

Cursor is a VS Code fork with deep AI integration. It is the leading IDE-integrated AI coding tool.

### Setup

1. Download from cursor.sh
2. Import your VS Code settings and extensions (automatic)
3. Sign in and choose a plan (free tier available)
4. Configure your preferred AI model (Claude or GPT options)

### Key Features

**Composer** — The standout feature. Describe changes in natural language and Composer applies them across multiple files simultaneously:

```
Example:
> "Add error handling to all API endpoints in src/routes/ and create
   corresponding error response types in src/types/"
(Composer edits multiple files in a single pass)
```

**Tab Completion** — Inline suggestions as you type, with multi-line predictions.

**Chat** — Ask questions about your codebase with full project context.

**Agent Mode** — Autonomous task execution similar to terminal agents, but within the IDE.

### When to Use Cursor

- You prefer a visual IDE experience
- You want inline completions plus agentic capabilities in one tool
- Your workflow centres on a single project at a time
- You want fast iteration with visual diffs

## GitHub Copilot

The most widely adopted AI coding tool, integrated directly into VS Code and JetBrains.

### Setup

1. Install the GitHub Copilot extension in your IDE
2. Sign in with your GitHub account
3. Choose a plan (free for students and open-source maintainers)

### Key Features

**Inline Suggestions** — The original tab-completion experience. Copilot predicts what you will type next.

**Copilot Chat** — Ask questions, explain code, generate tests, all from a sidebar panel.

**Copilot Workspace** — Multi-file planning and implementation from GitHub Issues. You describe what you want, Copilot creates a plan, and you approve or modify each step.

### When to Use Copilot

- You want seamless GitHub integration (Issues, PRs, Actions)
- You need enterprise features (SSO, policy controls, IP indemnity)
- You want the free student/OSS tier
- You prefer unobtrusive inline suggestions over agentic workflows

## Continue.dev

A free, open-source extension for VS Code and JetBrains that connects to any model provider.

### Setup

```bash
# Install from VS Code marketplace or JetBrains plugin repository
# Then configure your model provider in config.json:
{
  "models": [
    {
      "title": "Claude Sonnet 4.6",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "apiKey": "your-key"
    }
  ]
}
```

### When to Use Continue.dev

- You want full control over which models and providers you use
- Privacy is paramount (self-hosted option)
- You want a free, open-source solution
- You want to combine multiple model providers in one interface

## Comparison: Web & IDE Tools

| Feature | ChatGPT | Claude.ai | Cursor | Copilot | Continue.dev |
|---------|---------|-----------|--------|---------|--------------|
| **Cost** | $0-200/mo | $0-20/mo | $0-40/mo | $0-39/mo | Free (+ API) |
| **Interface** | Web/mobile | Web | IDE | IDE extension | IDE extension |
| **Multi-File** | Limited | Artifacts | Excellent | Good (Workspace) | Good |
| **Inline Completion** | No | No | Yes | Yes | Yes |
| **Code Execution** | Python only | No | Local | No | No |
| **Repo Access** | No | No | Full local | GitHub | Full local |
| **Open Source** | No | No | No | No | Yes |
| **Best For** | Learning, mobile | Long context, exploration | IDE-native AI | GitHub ecosystem | OSS, multi-model |

## Tips for Getting the Most from Web & IDE Tools

**DO:**
- Be specific about your tech stack and versions
- Provide context about your project architecture
- Ask for explanations alongside code
- Request tests and error handling
- Iterate and refine incrementally

**DON'T:**
- Paste thousands of lines without context
- Expect the tool to understand your entire codebase from a snippet
- Trust output blindly without review
- Use for production secrets or credentials
- Assume it knows your custom internal libraries

## Next Steps

Web and IDE tools are excellent starting points, but for full agentic coding — where the AI navigates your repository, runs commands, and manages Git — you will want a terminal-based agent. The next section covers setting up Claude Code and OpenAI Codex CLI.

---

**Next:** [2.b: Setting Up Terminal Agents](./02_b_setting_up_the_codex_cli.md)

---

*Last Updated: June 2026 | ChatGPT, Claude.ai, Cursor, Copilot, Continue.dev*
