# Chapter 1: Getting Started — Installation and First Run

> Install Claude Code, authenticate with your Anthropic account, and run your first commands in under ten minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18 or later** — Check with `node --version`. If you need to install it, visit [nodejs.org](https://nodejs.org) or use a version manager like `nvm` or `fnm`.
- **A terminal** — Any terminal will do: Terminal.app on macOS, Windows Terminal, iTerm2, Alacritty, or your IDE's built-in terminal.
- **An Anthropic account** — Sign up at [console.anthropic.com](https://console.anthropic.com) if you have not already.

Optional but recommended:

- **Git** — Claude Code integrates deeply with git. Most of its power shines in git-tracked projects.
- **A code project** — Have a real project ready to try Claude Code on. It works with any language and any framework.

## Installation

### CLI (Recommended)

The CLI is the most powerful surface. Install it globally via npm:

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

You should see the version number printed to your terminal.

### Desktop App

Download the desktop app from [anthropic.com](https://www.anthropic.com) for macOS or Windows. The desktop app provides the same capabilities as the CLI in a standalone window with a graphical interface.

### Web App

Visit [claude.ai/code](https://claude.ai/code) in your browser. No installation required. The web app is ideal for quick tasks or when you are on a machine where you cannot install software.

### IDE Extensions

**VS Code:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Claude Code"
4. Click Install

**JetBrains (IntelliJ, PyCharm, WebStorm, etc.):**
1. Open Settings > Plugins
2. Search for "Claude Code"
3. Click Install and restart

## Authentication

The first time you run Claude Code, it will guide you through authentication:

```bash
claude
```

This opens a browser window where you sign in to your Anthropic account and authorise Claude Code. Once authenticated, the token is stored locally and you will not need to sign in again on this machine.

If you are working in a headless environment (a remote server, Docker container, or CI pipeline), you can authenticate with an API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
claude
```

You can generate API keys at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).

## Your First Conversation

Navigate to any project directory and start Claude Code:

```bash
cd ~/my-project
claude
```

You will see an interactive prompt. Try these first commands:

### Ask about your project

```
> Explain this project's structure and what it does.
```

Claude reads your files — `package.json`, `README.md`, source directories — and gives you a summary. This is an excellent way to onboard onto an unfamiliar codebase.

### Ask a question about a specific file

```
> What does src/auth/middleware.ts do?
```

Claude reads the file and explains it in plain language, including how it fits into the broader codebase.

### Make a small change

```
> Add a comment at the top of src/index.ts explaining what the entry point does.
```

Claude proposes an edit. You will see a diff showing exactly what will change. Press **Enter** to approve, or type feedback to adjust.

### Run a command

```
> Run the test suite and tell me if anything is failing.
```

Claude identifies your test runner (Jest, Vitest, pytest, cargo test, etc.), runs it, and reports the results. You will see the exact command it plans to run and must approve it.

## The Permission Model

Claude Code is built around a simple principle: **it always asks before acting**. This manifests as three permission levels:

### Read Operations (No Approval Needed)

Claude can freely read files in your project. It needs to understand your codebase to help you, and reading files is non-destructive.

### Write Operations (Approval Required)

When Claude wants to edit a file, create a new file, or delete something, it shows you exactly what it plans to do. You see a diff for edits and the full content for new files. You approve, reject, or modify.

### Command Execution (Approval Required)

When Claude wants to run a shell command — `npm test`, `git commit`, `pip install` — it shows you the exact command first. You approve or reject.

### Permission Modes

Claude Code offers three permission modes that control how much autonomy Claude has:

| Mode | Behaviour |
|------|-----------|
| **Default** | Claude asks permission for all writes and commands |
| **Auto** | Claude can execute pre-approved commands without asking (configured in `.claude/settings.json`) |
| **Plan** | Claude analyses and plans but does not execute — useful for review-first workflows |

You can switch modes with `/config` or by setting them in your project's `.claude/settings.json`.

## Basic Slash Commands

Slash commands are built-in shortcuts. Type them at the prompt:

| Command | What It Does |
|---------|-------------|
| `/help` | Shows all available commands and keyboard shortcuts |
| `/clear` | Clears the conversation history, starting fresh |
| `/config` | Opens the configuration panel for settings and permissions |
| `/fast` | Toggles fast mode — uses Claude Opus with faster output |
| `/review` | Reviews your current uncommitted changes |
| `/init` | Generates a CLAUDE.md file for your project |
| `/code-review` | Performs a deep code review of your changes |

Try `/help` now to see the full list.

## One-Shot Mode

You do not always need an interactive session. Pass a question or instruction directly:

```bash
# Ask a question
claude "What does the main function do in this project?"

# Give an instruction
claude "Fix the type error in src/utils.ts"

# Pipe content in
cat error.log | claude "Explain this error and suggest a fix"
```

One-shot mode is powerful for scripting and CI/CD pipelines. Claude processes the request, prints the result, and exits.

## Understanding the Interface

When Claude Code is running interactively, pay attention to these elements:

### Tool Use Indicators

Every action Claude takes is visible. You will see labels like:

- **Read** `src/index.ts` — Claude is reading a file
- **Edit** `src/auth/middleware.ts` — Claude is proposing a file edit (shows diff)
- **Bash** `npm test` — Claude wants to run a command (awaits approval)
- **WebSearch** `"react useEffect cleanup"` — Claude is searching the web

### The Diff View

When Claude proposes an edit, you see a diff with lines added (green) and removed (red). Review it carefully. If the change looks right, approve it. If not, tell Claude what to adjust — "actually, use a named export instead of default" — and it will revise.

### Cost Awareness

Each interaction consumes tokens. The model and context length affect cost. For reference:

- Costs vary by model and conversation length — check [console.anthropic.com](https://console.anthropic.com) for current rates
- `/fast` mode reduces cost for simpler tasks
- Reading large files consumes input tokens; be specific about which files you need

## Tips for Your First Session

1. **Start with explanation, then move to action.** Ask Claude to explain your project before asking it to make changes. This builds shared context.

2. **Be specific.** "Fix the bug" is vague. "The login form submits twice when the user double-clicks the button — add debouncing" gives Claude exactly what it needs.

3. **Review diffs carefully.** Claude is good, but not infallible. The permission model exists so you can catch issues before they reach your codebase.

4. **Use git.** Work on a branch. If Claude makes changes you do not like, `git checkout .` reverts everything. Claude Code works brilliantly with git — it can create commits, branches, and PRs for you.

5. **Iterate.** If the first attempt is not quite right, say so. "That's close, but use async/await instead of callbacks" is all Claude needs to adjust.

## Troubleshooting

**"command not found: claude"**
Your Node.js global bin directory is not in your PATH. Run `npm config get prefix` and add the `/bin` subdirectory to your PATH.

**Authentication fails**
Check that your browser can reach console.anthropic.com. If you are behind a corporate proxy, you may need to set `HTTPS_PROXY` before running `claude`.

**"Model not available"**
Ensure your Anthropic account has API access enabled. Free-tier accounts have access to Claude Code; check your plan at console.anthropic.com.

**Slow responses**
Large context windows (many files loaded) increase response time. Use `/clear` to reset if the conversation has grown too long, or be more targeted about which files Claude reads.

---

**Next:** [Chapter 2: Core Features — Commands, Tools, and Modes](./02_core_features.md)

---

*DreamLab AI Self-Guided Workshop | June 2026*
