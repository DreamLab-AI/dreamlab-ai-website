# 3.d: Advanced Techniques

Beyond basic prompting and task management, several advanced techniques can dramatically enhance the utility of AI coding agents. This section covers MCP servers, hooks, subagents, CI/CD integration, model selection, and multimodal input.

## MCP Servers (Claude Code)

Model Context Protocol (MCP) is an open standard that lets Claude Code connect to external tools and data sources. This transforms Claude Code from a code editor into a general-purpose development agent with access to databases, APIs, browsers, and more.

### Configuring MCP Servers

Create a `.mcp.json` file in your project root:

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
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/docs"]
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

### What MCP Enables

With MCP servers configured, Claude Code can:

- **Query your database:** "Show me all users who signed up in the last 7 days"
- **Browse documentation:** "Read the API docs in /docs and update the client to match"
- **Interact with GitHub:** "Create a PR for these changes with a description"
- **Control a browser:** "Navigate to the staging site and check if the login flow works"
- **Access Slack/email:** "Post a summary of today's changes to the #dev channel"

### Available MCP Servers

The MCP ecosystem is growing rapidly. Key servers include:

| Server | Purpose |
|--------|---------|
| `@modelcontextprotocol/server-postgres` | Query PostgreSQL databases |
| `@modelcontextprotocol/server-filesystem` | Read/write specific file trees |
| `@modelcontextprotocol/server-github` | GitHub API operations |
| `@modelcontextprotocol/server-memory` | Persistent key-value memory |
| Community servers | Slack, Jira, browser automation, and more |

## Hooks System (Claude Code)

Hooks are automated actions triggered before or after specific Claude Code events. They run shell commands or scripts at defined points in the workflow.

### Configuring Hooks

Hooks are configured in your Claude Code settings (`.claude/settings.json` or project-level):

```json
{
  "hooks": {
    "PostEditFile": [
      {
        "command": "npx eslint --fix ${file}",
        "description": "Auto-fix ESLint issues after each edit"
      }
    ],
    "PreCommit": [
      {
        "command": "npm run lint && npm test",
        "description": "Verify lint and tests before committing"
      }
    ],
    "PostCommit": [
      {
        "command": "echo 'Committed: ${commitHash}'",
        "description": "Log commit hash"
      }
    ]
  }
}
```

### Hook Events

| Event | Trigger |
|-------|---------|
| `PreEditFile` | Before Claude Code modifies a file |
| `PostEditFile` | After a file is modified |
| `PreCommit` | Before creating a Git commit |
| `PostCommit` | After a commit is created |
| `SessionStart` | When a Claude Code session begins |
| `SessionEnd` | When a session ends |

Hooks ensure consistent code quality without requiring you to remember to run linters or tests manually.

## Subagents (Claude Code)

Subagents are child Claude Code processes that can work on independent tasks in parallel. This is particularly powerful for large, decomposable tasks.

### How Subagents Work

When Claude Code encounters a task that can be parallelised, it can spawn subagents:

```
> "I need to update all 12 API endpoints to use the new response envelope format.
   Each endpoint is independent — work on them in parallel."
```

Claude Code may spawn multiple subagents, each handling a subset of endpoints, then merge the results.

### The Agent SDK

For programmatic control, Claude Code offers an Agent SDK that lets you build custom agent workflows:

```typescript
import { Agent } from '@anthropic-ai/claude-code';

const agent = new Agent({
  model: 'claude-sonnet-4-6',
  cwd: '/path/to/project',
});

const result = await agent.run('Add input validation to all API endpoints');
console.log(result.changes);
```

This enables building custom CI/CD integrations, code review bots, or specialised coding workflows.

## CI/CD Integration

Both Claude Code and Codex CLI can be integrated into automated pipelines.

### Claude Code in CI/CD

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Review PR
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "Review the changes in this PR for:
            1. Security vulnerabilities
            2. Performance issues
            3. Missing error handling
            4. Test coverage gaps
            Provide a summary of findings."
```

### Codex CLI in CI/CD

```yaml
# .github/workflows/codex-review.yml
name: Codex Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Codex CLI
        run: npm install -g @openai/codex
      - name: Review PR
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          codex --approval-mode suggest \
            "Review the changed files for security issues and suggest improvements"
```

## Model Selection Strategies

Choosing the right model for each task balances capability, speed, and cost.

### Claude Code Model Selection

| Task Type | Recommended Model | Rationale |
|-----------|------------------|-----------|
| Complex architecture | Opus 4.8 (default) | Best reasoning capability |
| Routine refactoring | Sonnet 4.6 (`/fast`) | Good quality, faster, cheaper |
| Simple formatting/fixes | Haiku 4.5 | Fastest, most cost-effective |
| Novel/creative problems | Fable 5 | Latest capabilities |

```bash
# Use Sonnet for routine work
claude --model claude-sonnet-4-6

# Inside a session, toggle fast mode
/fast
```

### Codex CLI Model Selection

```bash
# Default: codex-mini-latest (fast, optimised for CLI)
codex "Fix the typo in the README"

# GPT-4o for more complex tasks
codex --model gpt-4o "Architect a caching strategy for the API layer"

# o4-mini for cost-effective reasoning
codex --model o4-mini "Add comprehensive error handling"

# Use Claude models via Codex CLI
codex --provider anthropic --model claude-sonnet-4-6 "Refactor this module"
```

### Cost Optimisation Tips

- Use cheaper models (Sonnet, o4-mini, Haiku) for routine tasks
- Reserve expensive models (Opus, o3) for complex reasoning
- Monitor per-session costs (Claude Code's `/cost` command)
- Use non-interactive mode for batch operations to avoid idle token costs
- Leverage CLAUDE.md/AGENTS.MD to reduce prompt repetition

## Multimodal Input

Both agents support visual input, enabling powerful new workflows.

### Image-to-Code

```bash
# Claude Code: paste or reference screenshots
claude
> "Implement the UI shown in this screenshot: [paste image]"

# Codex CLI: pass image files
codex --image mockup.png "Implement this UI design using React and Tailwind CSS"
```

### Diagram-to-Architecture

```bash
# Describe architecture from a whiteboard photo
claude
> "Here's a photo of our architecture whiteboard. [paste image]
   Generate the infrastructure-as-code for this architecture using Terraform."
```

## Automation Recipes

### Git Hooks Integration

```bash
# .git/hooks/pre-commit (with Claude Code)
#!/bin/bash
claude -p "Review staged changes for obvious bugs or security issues. Exit 1 if critical issues found."

# .git/hooks/pre-commit (with Codex CLI)
#!/bin/bash
codex --approval-mode suggest "Review staged changes for issues"
```

### Batch Operations

```bash
# Process multiple files with Claude Code
for file in src/services/*.ts; do
  claude -p "Add comprehensive JSDoc comments to all exported functions in $file"
done

# Parallel batch with Codex CLI
find src/components -name "*.tsx" | xargs -P 4 -I {} \
  codex "Add accessibility attributes to all interactive elements in {}"
```

The adoption of these advanced techniques — MCP integration, hooks, subagents, CI/CD automation, model selection, and multimodal input — marks a shift from using AI as a chat interface to orchestrating AI as a development platform.

---

Next: [Chapter 4: Practical Applications](./04_practical_codex.md)
