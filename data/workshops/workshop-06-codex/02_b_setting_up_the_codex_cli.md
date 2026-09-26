# 2.b: Setting Up Terminal-Based AI Coding Agents

This section covers installing and configuring the two leading terminal-based coding agents: **Claude Code** and **OpenAI Codex CLI**. Both operate directly in your terminal, reading your codebase and making changes autonomously.

## Claude Code — Setup

Claude Code is Anthropic's agentic coding tool. It is a standalone terminal application (not a VS Code extension, though it can run inside the VS Code terminal panel). It is also available as a desktop app, web app, and IDE extensions.

### Prerequisites

*   **Node.js:** Version 22 or newer (LTS recommended).
*   **API Key:** An Anthropic API key from console.anthropic.com.
*   **Operating System:**
    *   macOS 12+
    *   Ubuntu 20.04+ / Debian 10+
    *   Windows 11 via WSL2
*   **Git:** Required for repository operations.

### Installation

```bash
# Install Claude Code globally via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Authentication

```bash
# Option 1: Set your API key as an environment variable (recommended)
export ANTHROPIC_API_KEY="your-api-key-here"

# Add to your shell config for persistence:
# For bash: echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
# For zsh:  echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.zshrc
# For fish: set -Ux ANTHROPIC_API_KEY "your-key"

# Option 2: Claude Code will prompt you to authenticate on first run
# if no API key is found
```

### First Run

```bash
# Navigate to your project
cd ~/projects/my-app

# Start Claude Code
claude

# Claude Code will:
# 1. Read CLAUDE.md if present (project configuration)
# 2. Scan the repository structure
# 3. Present an interactive prompt

# You can also provide a direct task:
claude "Add input validation to the user registration form"

# Or run in non-interactive mode for automation:
claude -p "List all TODO comments in the codebase"
```

### Key Modes and Commands

```bash
# Interactive mode (default) — conversation with your codebase
claude

# One-shot mode — execute a single task and exit
claude -p "Explain the authentication flow in this project"

# Fast mode — uses Sonnet 4.6 for quicker, cheaper responses
# (toggle inside a session with /fast)

# Resume previous session
claude --resume

# Start with a specific model
claude --model claude-sonnet-4-6
```

### Essential Slash Commands

Once inside a Claude Code session, these commands are available:

| Command | Purpose |
|---------|---------|
| `/fast` | Toggle between Opus (thorough) and Sonnet (fast) |
| `/compact` | Compress conversation to save context |
| `/clear` | Clear conversation history |
| `/help` | Show all available commands |
| `/cost` | Show token usage and cost for the session |

### Creating Your First CLAUDE.md

Claude Code reads a `CLAUDE.md` file at your project root for persistent instructions. Create one to guide the agent:

```bash
cat > CLAUDE.md << 'EOF'
# Project: My App

## Tech Stack
- Framework: React 18 + TypeScript 5
- Backend: Node.js + Express
- Database: PostgreSQL
- Testing: Vitest + Testing Library

## Conventions
- Use functional components with hooks
- Prefer named exports over default exports
- All new code must include unit tests
- Run `npm run lint` before committing

## Forbidden
- Do not modify files in src/generated/
- Do not add new npm dependencies without asking
- Never commit .env files
EOF
```

### Setting Up MCP Servers (Optional)

MCP (Model Context Protocol) lets Claude Code connect to external tools. Configure servers in your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/mydb"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

With MCP configured, Claude Code can query your database, interact with GitHub, or use any other configured tool directly during a session.

## OpenAI Codex CLI — Setup

The OpenAI Codex CLI is an open-source terminal-based coding agent. Its source code is available on GitHub (github.com/openai/codex).

### Prerequisites

*   **Node.js:** Version 22 or newer (LTS recommended).
*   **API Key:** An OpenAI API key from platform.openai.com. Alternatively, keys from other supported providers (Anthropic, Azure, Ollama, etc.) can be used.
*   **Operating System:**
    *   macOS 12+
    *   Ubuntu 20.04+ / Debian 10+
    *   Windows 11 via WSL2

### Installation

```bash
# Install via npm
npm install -g @openai/codex

# Verify installation
codex --version
```

### Authentication

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Or use a .env file in your project root:
echo 'OPENAI_API_KEY=your-api-key-here' > .env

# For other providers:
export ANTHROPIC_API_KEY="your-key"    # To use Claude models
export AZURE_API_KEY="your-key"         # For Azure OpenAI
```

### First Run

```bash
# Navigate to your project
cd ~/projects/my-app

# Start interactive session
codex

# Or provide a direct prompt
codex "Explain the following function and suggest improvements"

# With a specific model
codex --model gpt-4o "Add comprehensive error handling to the API routes"

# With a specific approval mode
codex --approval-mode full-auto "Fix all ESLint warnings in src/"
```

### Approval Modes

The Codex CLI offers three levels of autonomy:

| Mode | Behaviour | When to Use |
|------|-----------|-------------|
| **Suggest** (default) | Shows proposed changes for your approval | Learning, sensitive code |
| **Auto Edit** | Automatically applies file changes | Routine refactoring |
| **Full Auto** | Reads, writes, and executes commands (sandboxed) | Automated pipelines, trusted tasks |

```bash
# Full auto with network-disabled, directory-sandboxed execution
codex --approval-mode full-auto "Add unit tests for the user module"
```

### Multi-Provider Support

```bash
# Use Claude models via Codex CLI
codex --provider anthropic --model claude-sonnet-4-6 "Refactor this module"

# Use a local Ollama model
codex --provider ollama --model codellama "Explain this regex"
```

### Creating Your First AGENTS.MD

Codex CLI reads `AGENTS.MD` files for project-specific instructions:

```bash
cat > AGENTS.MD << 'EOF'
# Project: My App

## Code Style
- Use Prettier for formatting: `npx prettier --write .`
- Variable names in camelCase
- JSDoc comments for all public functions

## Testing
- Run `npm test` before proposing changes
- All new features must include unit tests
- Mock external API calls using msw

## Forbidden Actions
- Do not commit to main branch directly
- Do not introduce new dependencies without approval
- Never disable linting or type-checking rules
EOF
```

## Side-by-Side Comparison

| Aspect | Claude Code | Codex CLI |
|--------|-------------|-----------|
| **Install command** | `npm install -g @anthropic-ai/claude-code` | `npm install -g @openai/codex` |
| **Start command** | `claude` | `codex` |
| **Config file** | `CLAUDE.md` | `AGENTS.MD` |
| **Default model** | Claude Opus 4.8 | codex-mini-latest |
| **Fast mode** | `/fast` (switches to Sonnet) | `--model o4-mini` |
| **Approval modes** | Interactive by default | Suggest / Auto Edit / Full Auto |
| **Tool integration** | MCP servers | Limited |
| **Open source** | No | Yes |
| **Hooks** | Built-in hooks system | Via shell scripts / CI |
| **Subagents** | Built-in | Not supported |
| **API key env var** | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` |

## Verifying Your Setup

Run these quick checks to confirm everything is working:

```bash
# Claude Code
claude -p "What files are in this directory? List them briefly."

# Codex CLI
codex "What files are in this directory? List them briefly."
```

Both commands should scan your current directory and produce a file listing, confirming that the agent can read your local filesystem.

## Next Steps

With your terminal agents installed, the next section covers API key management and authentication best practices across all providers.

---

Next: [2.c: API Keys and Authentication](./02_c_api_keys_and_authentication.md)
