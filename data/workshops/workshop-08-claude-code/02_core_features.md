# Chapter 2: Core Features — Commands, Slash Commands, and Tools

> A deep dive into everything Claude Code can do: file operations, shell commands, web search, slash commands, context management, and permission modes.

## The Tools

Claude Code's power comes from its tools — discrete capabilities it can invoke during a conversation. Understanding these tools is the foundation of effective use.

### Read — Understanding Your Codebase

The Read tool lets Claude examine files in your project. It is the most frequently used tool and requires no approval.

```
> What's in the src/config directory?
```

Claude reads the directory listing and then individual files as needed. It can read:

- Source code in any language
- Configuration files (JSON, YAML, TOML, INI)
- Markdown and documentation
- Images (Claude has vision capabilities)
- PDF files
- Jupyter notebooks

**Tip:** Be specific about what you need. "Read src/auth/" is better than "read everything" — it keeps context focused and reduces token usage.

### Edit — Precise Code Changes

The Edit tool makes targeted modifications to existing files. This is Claude's primary way of changing your code.

When Claude proposes an edit, you see a diff:

```diff
  // src/api/users.ts
- export function getUser(id: string) {
+ export async function getUser(id: string): Promise<User> {
    const response = await db.users.findUnique({ where: { id } });
-   return response;
+   if (!response) throw new NotFoundError(`User ${id} not found`);
+   return response;
  }
```

You can:
- **Approve** — Press Enter to apply the change
- **Reject** — Tell Claude to try a different approach
- **Modify** — "That's good but also add input validation for the id parameter"

The Edit tool is surgical. It replaces specific strings in specific files, minimising the risk of unintended side effects.

### Write — Creating New Files

The Write tool creates new files from scratch. Claude shows you the full content before writing.

```
> Create a new utility file at src/lib/validation.ts with email and URL validators.
```

Claude generates the file and shows it to you. Approve to write it to disk.

### Bash — Running Shell Commands

The Bash tool executes commands in your shell. Every command requires your explicit approval.

Common uses:

```
> Run the tests
Claude proposes: npm test
[Approve? y/n]

> Install the lodash package
Claude proposes: npm install lodash
[Approve? y/n]

> Check git status
Claude proposes: git status
[Approve? y/n]
```

Claude picks the right commands for your project. In a Python project, it runs `pytest`. In a Rust project, `cargo test`. In a Go project, `go test ./...`. It reads your project configuration to determine the correct tools.

**Safety:** Claude will never run destructive commands (like `rm -rf /` or `git push --force`) without showing you exactly what it plans to do. The permission model is your safety net.

### WebSearch — Finding Information

The WebSearch tool searches the web for documentation, solutions, and current information.

```
> How do I configure rate limiting in Express 5?
```

Claude searches the web, reads relevant results, and synthesises an answer grounded in current documentation. This is particularly valuable for:

- API documentation that changes frequently
- Error messages you have not seen before
- New library versions and their migration guides
- Best practices for specific frameworks

### WebFetch — Retrieving Specific Pages

The WebFetch tool fetches content from a specific URL. Use it when you know exactly where the information is:

```
> Fetch the migration guide from https://docs.example.com/v3/migration
```

Claude retrieves the page content and can use it to inform its responses and code changes.

## Slash Commands — Built-In Shortcuts

Slash commands are typed directly at the Claude Code prompt. They provide quick access to common operations.

### Essential Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/help` | Shows all commands and keyboard shortcuts | When you cannot remember a command |
| `/clear` | Clears conversation history | When context gets too large or you want a fresh start |
| `/config` | Opens configuration settings | To change permissions, model, or other settings |
| `/fast` | Toggles fast mode | For quick, simple tasks where speed matters more than depth |

### Development Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/review` | Reviews uncommitted changes | Before committing — like a self-code-review |
| `/init` | Generates a CLAUDE.md for your project | When setting up Claude Code on a new project |
| `/code-review` | Deep code review with findings | For thorough review of changes, optionally posts PR comments |

### The `/init` Command

This is one of the most valuable commands when starting with Claude Code on a new project:

```
> /init
```

Claude analyses your project — its language, framework, build tools, test setup, directory structure — and generates a CLAUDE.md file with relevant configuration. This gives Claude persistent context about your project that carries across sessions.

We cover CLAUDE.md in depth in [Chapter 3](./03_claude_md.md).

### The `/review` Command

Before committing changes, run:

```
> /review
```

Claude examines your uncommitted changes (staged and unstaged) and provides feedback: potential bugs, style issues, missing tests, and suggestions for improvement. Think of it as an instant code review from a colleague who knows your project.

### The `/code-review` Command

For a more thorough review:

```
> /code-review
```

This performs a deep analysis at configurable effort levels. It can post findings as inline PR comments (with the `--comment` flag) or apply fixes directly (with the `--fix` flag).

## Context Management

Claude Code maintains conversation context — the accumulated history of your messages, Claude's responses, and tool results. Understanding how context works helps you use Claude Code effectively.

### How Context Grows

Every interaction adds to the context:
- Your messages (small)
- Claude's responses (medium)
- File reads (can be large)
- Command output (can be large)
- Web search results (medium)

### When Context Gets Too Large

As context grows, responses slow down and costs increase. Signs that context is too large:

- Responses take noticeably longer
- Claude starts "forgetting" things from earlier in the conversation
- You are working on a completely different task than where you started

**Solution:** Use `/clear` to start fresh. If you need Claude to remember specific context, re-state it after clearing: "I'm working on the authentication module. The test suite is in tests/auth/."

### Being Efficient with Context

1. **Read specific files**, not entire directories
2. **Clear between distinct tasks** — debugging a test and then writing documentation are separate conversations
3. **Summarise when context matters** — "We just refactored the user service to use async/await. Now I want to update the tests."
4. **Use CLAUDE.md** for persistent context that should survive across sessions

## Permission Modes Explained

Claude Code offers three distinct permission modes. The right choice depends on your workflow and trust level.

### Default Mode

The default mode asks for approval on every write and command:

- File reads: automatic
- File edits: approval required (diff shown)
- New files: approval required (content shown)
- Shell commands: approval required (command shown)

**Best for:** Learning Claude Code, working on critical code, shared codebases.

### Auto Mode

Auto mode lets you pre-approve specific operations. Configure in `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff)"
    ]
  }
}
```

With this configuration, Claude can run `npm test` and `npm run lint` without asking, but still needs approval for other commands like `npm install` or `git push`.

**Best for:** Experienced users with well-defined workflows, repetitive tasks.

### Plan Mode

Plan mode is read-only. Claude analyses, plans, and explains, but never executes:

- File reads: automatic
- File edits: **blocked** — Claude shows what it would change
- Shell commands: **blocked** — Claude shows what it would run

**Best for:** Code review, architecture planning, understanding unfamiliar codebases, when you want ideas without changes.

## Working with Conversations

### Multi-Turn Conversations

Claude Code shines in multi-turn conversations where you iteratively refine a solution:

```
You: Add input validation to the signup form.
Claude: [proposes validation logic with Zod schemas]
You: Good, but also add server-side validation in the API route.
Claude: [proposes matching server-side validation]
You: The error messages should be user-friendly, not technical.
Claude: [revises error messages to be clear and helpful]
You: Perfect. Now add tests for the validation.
Claude: [generates comprehensive test cases]
```

Each turn builds on the previous context. Claude remembers what has been discussed and decided.

### Effective Prompting

Claude Code responds to natural language. You do not need special syntax or prompt engineering. However, some patterns work better than others:

**Be specific about what you want:**
```
Bad:  "Fix the bug."
Good: "The user list page shows a blank screen when the API returns an empty
       array. Handle the empty state with a helpful message."
```

**Provide context when changing direction:**
```
Good: "We've finished the auth module. Now let's work on the payment
       integration. The Stripe SDK is already installed."
```

**Reference files directly:**
```
Good: "In src/api/routes.ts, the /users endpoint is missing pagination.
       Add limit and offset query parameters."
```

**State constraints upfront:**
```
Good: "Add a caching layer for the product API. Use Redis — the client is
       already configured in src/lib/redis.ts. Cache TTL should be 5 minutes."
```

## Keyboard Shortcuts

Claude Code responds to standard terminal shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel the current generation |
| `Ctrl+D` | Exit Claude Code |
| `Up Arrow` | Recall previous messages |
| `Tab` | Accept autocomplete suggestions |
| `Esc` | Dismiss the current prompt |

## What's Next

You now have a solid understanding of Claude Code's core capabilities. The next chapter covers the most powerful feature for long-term productivity: **CLAUDE.md** — project configuration files that teach Claude about your specific codebase, conventions, and workflows.

---

**Next:** [Chapter 3: CLAUDE.md — Teaching Claude About Your Project](./03_claude_md.md)

---

*DreamLab AI Self-Guided Workshop | June 2026*
