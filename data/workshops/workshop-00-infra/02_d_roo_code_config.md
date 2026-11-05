# Chapter 2d: Configuring AI Coding Assistants in VS Code (2026 Edition)

**Time:** 20-30 minutes | **Difficulty:** Intermediate

With your accounts and tools ready, it is time to configure AI coding assistants. In 2026, the landscape has matured considerably. This chapter covers the major AI coding tools and how to set them up, with Claude Code as our primary recommendation.

## 2d.1 Overview of AI Coding Tools (2026)

| Tool | Type | Best For | Setup Complexity | Cost |
|------|------|----------|------------------|------|
| **Claude Code** | Terminal agent + IDE integration | Full-project understanding, complex tasks | Easy | Free tier via claude.ai; pay-as-you-go API |
| **GitHub Copilot** | Inline suggestions + Chat | Real-time autocomplete while typing | Easy | From $10/mo (free for students) |
| **Continue.dev** | Open-source assistant | Flexibility, multiple models | Medium | Free (bring your own API key) |
| **Cursor** | AI-first editor (VS Code fork) | Deep codebase understanding | Easy | From $20/mo |
| **Windsurf** | Advanced assistant | Multi-file coordination | Medium | From $10/mo |

> **Recommendation:** Start with Claude Code -- it is free to get started, works from the terminal, and understands entire projects. Add GitHub Copilot alongside it if you want inline autocomplete while typing.

## 2d.2 Option 1: Claude Code (Primary Recommendation)

### Why Claude Code?

- **Understands your entire project** -- reads files, runs commands, and navigates codebases
- **Works everywhere** -- standalone terminal tool, desktop app (Mac/Windows), web app, and inside VS Code
- **No API key needed** to get started -- authenticates with your claude.ai account
- **CLAUDE.md configuration** -- teach it about your project with a simple markdown file
- **MCP servers** -- connect it to external tools (GitHub, databases, file systems, and more)
- **Built-in slash commands** and workflows for common tasks

### Setup Steps

**Step 1: Install Claude Code**

You need Node.js installed first (version 18 or higher). Then:

```bash
npm install -g @anthropic-ai/claude-code
```

**Step 2: Launch and Authenticate**

Open your terminal (or the VS Code integrated terminal) and run:

```bash
claude
```

On first launch, Claude Code will open your browser to authenticate with your claude.ai account. Follow the prompts to log in. Once authenticated, you are ready to go.

**Step 3: Navigate to Your Project**

Claude Code works best when launched from your project directory:

```bash
cd ~/my-project
claude
```

It will automatically read your project files and understand the codebase.

**Step 4: Create a CLAUDE.md File (Optional but Recommended)**

Create a `CLAUDE.md` file in your project root to give Claude Code context about your project:

```markdown
# My Project

## Overview
This is a portfolio website built with HTML, CSS, and JavaScript.

## Key Files
- index.html -- main page
- styles/main.css -- all styling
- scripts/app.js -- interactive features

## Conventions
- Use British English in all content
- Follow BEM naming for CSS classes
- Keep JavaScript vanilla (no frameworks)
```

Claude Code reads this file automatically each time you start a session in that directory.

### Using Claude Code

**Basic commands in the terminal:**

```
> Help me write a function to validate email addresses
> Explain what this project does
> Create a new page called "about.html" matching the style of index.html
> Find and fix any broken links in my HTML files
```

**Useful slash commands:**

| Command | What it Does |
|---------|-------------|
| `/help` | Show all available commands |
| `/fast` | Switch to a faster (cheaper) model for quick tasks |
| `/clear` | Clear the conversation and start fresh |
| `/compact` | Summarise the conversation to save context space |

**Using Claude Code in VS Code:**

Claude Code is not a VS Code extension in the traditional sense. Instead, you run it in the VS Code integrated terminal:

1. Open VS Code
2. Open the integrated terminal (`Ctrl+`` ` or `Cmd+`` `)
3. Navigate to your project folder
4. Type `claude` and press Enter
5. Interact with Claude Code directly in the terminal

> **Tip:** You can also install the Claude Code VS Code extension from the marketplace, which provides a dedicated panel for Claude Code within VS Code.

## 2d.3 Option 2: GitHub Copilot (Best for Students)

### Why GitHub Copilot?

- **Free for verified students and educators**
- Seamless VS Code integration
- Real-time inline suggestions as you type
- Copilot Chat for explanations and debugging
- No API key management needed

### Setup Steps

1. **Verify Student Status (if applicable):**
   - Visit [GitHub Education](https://education.github.com/)
   - Sign up with your student email
   - Wait for verification (usually instant)

2. **Install GitHub Copilot Extension:**
   ```
   1. Open VS Code
   2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   3. Search for "GitHub Copilot"
   4. Click "Install"
   5. Also install "GitHub Copilot Chat"
   ```

3. **Sign In:**
   - Click "Sign in to GitHub" when prompted
   - Authorise VS Code to access your GitHub account

4. **Configure Settings:**

   Open VS Code settings (`Ctrl+,` / `Cmd+,`) and search for "Copilot":

   ```json
   {
     "github.copilot.enable": {
       "*": true,
       "yaml": true,
       "plaintext": false,
       "markdown": true
     },
     "github.copilot.editor.enableAutoCompletions": true
   }
   ```

### Using GitHub Copilot

**Inline Suggestions:**
- Start typing code, and Copilot suggests completions in grey text
- Press `Tab` to accept
- Press `Esc` to dismiss
- `Alt+]` or `Option+]` to cycle through suggestions

**Copilot Chat:**
- Open with `Ctrl+Shift+I` / `Cmd+Shift+I`
- Or click the chat icon in the sidebar
- Ask questions like:
  - "Explain this code"
  - "Write a function to validate email addresses"
  - "How do I fix this error?"

> **Tip:** Select code before asking questions in Copilot Chat for context-aware responses.

## 2d.4 Option 3: Continue.dev (Best for Flexibility)

### Why Continue.dev?

- **100% free and open source**
- Use any AI model (Claude, GPT-4, Gemini, and more)
- Bring your own API keys
- Highly customisable
- Great for learning how AI integration works

### Setup Steps

1. **Install Continue Extension:**
   ```
   1. Open VS Code Extensions
   2. Search for "Continue"
   3. Click "Install"
   ```

2. **Configure Your API Keys:**

   Click the Continue icon in the sidebar, then click the gear icon for settings.

   Create/edit `~/.continue/config.json`:

   ```json
   {
     "models": [
       {
         "title": "Claude Sonnet 4.6",
         "provider": "anthropic",
         "model": "claude-sonnet-4-6",
         "apiKey": "YOUR_ANTHROPIC_API_KEY"
       },
       {
         "title": "GPT-4o",
         "provider": "openai",
         "model": "gpt-4o",
         "apiKey": "YOUR_OPENAI_API_KEY"
       },
       {
         "title": "Gemini 2.5 Pro",
         "provider": "gemini",
         "model": "gemini-2.5-pro",
         "apiKey": "YOUR_GOOGLE_API_KEY"
       }
     ],
     "tabAutocompleteModel": {
       "title": "Gemini Flash (Fast)",
       "provider": "gemini",
       "model": "gemini-2.5-flash",
       "apiKey": "YOUR_GOOGLE_API_KEY"
     }
   }
   ```

### Using Continue.dev

**Chat Interface:**
- Click the Continue icon in the sidebar
- Type your question
- Use `@` to reference files: `@filename.py`
- Use `/` for slash commands: `/edit`, `/comment`

**Keyboard Shortcuts:**
- `Ctrl+L` / `Cmd+L` -- Open Continue chat
- `Ctrl+I` / `Cmd+I` -- Quick edit selected code

## 2d.5 Option 4: Cursor (Standalone Editor)

### Why Cursor?

- Purpose-built AI editor (fork of VS Code)
- Composer mode for multi-file edits
- Tab autocomplete
- Chat with your entire codebase

### Setup

> **Note:** Cursor is a separate editor, not a VS Code extension.

1. Download from [cursor.sh](https://cursor.sh/)
2. Install and launch
3. Import your VS Code settings (optional)
4. Sign up for a Cursor account
5. Choose subscription tier:
   - **Free:** Limited AI requests
   - **Pro:** Unlimited requests (check [cursor.sh](https://cursor.sh/) for current pricing)

## 2d.6 Combining Tools: A Practical Setup

Many people use more than one tool. Here is a sensible combination:

| Task | Tool |
|------|------|
| **Complex project work** (refactoring, architecture, debugging) | Claude Code |
| **Quick inline suggestions** while typing | GitHub Copilot |
| **Experimenting with different models** | Continue.dev |
| **Understanding code** you have just encountered | Any of the above |

These tools do not conflict with each other. Claude Code runs in the terminal, Copilot provides inline suggestions, and Continue.dev offers a chat sidebar -- all can work simultaneously in VS Code.

## 2d.7 Best Practices for AI-Assisted Coding

Regardless of which tool you choose:

> **Golden Rules of AI Coding:**

1. **Always Review AI-Generated Code**
   - AI makes mistakes
   - Verify logic, security, and performance
   - Test thoroughly

2. **Use Version Control**
   - Commit before applying AI suggestions
   - Create branches for AI experiments
   - Easy to revert if things go wrong

3. **Be Specific in Prompts**
   ```
   Bad:  "Write a function"
   Good: "Write a Python function that validates email
         addresses using regex, returns True if valid,
         False otherwise, and includes error handling"
   ```

4. **Provide Context**
   - Share relevant code snippets
   - Explain your project structure
   - Mention constraints or requirements

5. **Iterate and Refine**
   - The first AI response might not be perfect
   - Ask follow-up questions
   - Request improvements

## 2d.8 Keyboard Shortcuts Reference

| Action | Claude Code | GitHub Copilot | Continue.dev | Cursor |
|--------|------------|---------------|-------------|--------|
| Start/Open | `claude` (terminal) | Auto-active | `Ctrl+L` | `Ctrl+K` |
| Accept suggestion | N/A | `Tab` | `Tab` | `Tab` |
| Reject suggestion | N/A | `Esc` | `Esc` | `Esc` |
| Open chat | N/A | `Ctrl+Shift+I` | `Ctrl+L` | `Ctrl+K` |
| Inline edit | N/A | -- | `Ctrl+I` | `Ctrl+I` |
| Fast mode | `/fast` (in Claude Code) | -- | -- | -- |
| Clear context | `/clear` (in Claude Code) | -- | -- | -- |

## 2d.9 Managing API Costs

To avoid unexpected charges when using API keys:

> **Cost Warning:** Monitor your API usage dashboards regularly:
> - Anthropic: [console.anthropic.com](https://console.anthropic.com/)
> - OpenAI: [platform.openai.com/usage](https://platform.openai.com/usage)
> - Google: [console.cloud.google.com](https://console.cloud.google.com/)

**Tips for keeping costs low:**
- Use Claude Code with your claude.ai account (included in your subscription)
- Use `/fast` in Claude Code for routine tasks (uses a cheaper model)
- Use `/compact` or `/clear` to keep context small
- Set billing alerts and monthly limits on your API provider dashboards
- Start with free tiers and upgrade only when you need to

<details>
<summary>Exercise: Set Up Your AI Assistant</summary>

**Task:** Install and configure at least one AI coding assistant.

**Path A -- Claude Code (Recommended):**
1. Ensure Node.js 18+ is installed (`node --version`)
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
3. Open a terminal in a project folder
4. Run `claude` and authenticate with your claude.ai account
5. Try: "What files are in this project?" and "Explain what this project does"
6. Try: `/fast` to switch to a faster model, then ask a quick question

**Path B -- GitHub Copilot (Students):**
1. Verify student status on GitHub Education
2. Install GitHub Copilot and GitHub Copilot Chat extensions
3. Sign in and activate
4. Create a new file and start typing -- observe the inline suggestions
5. Open Copilot Chat and ask: "Write a hello world function in Python"

**Path C -- Continue.dev:**
1. Install the Continue extension
2. Get an API key from your preferred provider
3. Configure Continue with your API key
4. Test with a simple prompt

**Verification:**
- [ ] Tool installed successfully
- [ ] Authenticated / configured
- [ ] Test prompt works
- [ ] Generated output is reasonable
- [ ] You understand how to accept/reject suggestions (or how to interact via chat)

</details>

<details>
<summary>Knowledge Check</summary>

1. What is the quickest way to start using Claude Code?
2. Which AI coding tool is free for students?
3. What does the `/fast` command do in Claude Code?
4. Why is version control important when using AI assistants?
5. What is the difference between Claude Code and GitHub Copilot?

**Answers:**
1. Install with `npm install -g @anthropic-ai/claude-code`, run `claude`, and log in with your claude.ai account
2. GitHub Copilot (free for verified students, educators, and open-source maintainers)
3. It switches to a faster, cheaper model for quick tasks
4. Easy to revert AI mistakes; provides an audit trail of changes
5. Claude Code is a terminal-based agent that understands entire projects and can read/write files; Copilot provides inline suggestions as you type in the editor

</details>

---

**Next**: [Chapter 3: The Core Git Workflow](./03_core_workflow.md)
