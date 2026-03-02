# Chapter 2d: Configuring AI Code Assistants in VS Code (2025 Edition)

⏱️ **Time:** 20-30 minutes | 🎯 **Difficulty:** 🟡 Intermediate

With your API keys ready, it's time to configure AI coding assistants in VS Code. In 2025, you have several excellent options. This chapter covers the major AI coding tools and how to set them up.

## 2d.1 Overview of AI Coding Tools (2025)

| Tool | Type | Best For | Setup Complexity | Cost |
|------|------|----------|------------------|------|
| **GitHub Copilot** | Inline suggestions + Chat | Real-time autocomplete | 🟢 Easy | $10/mo (free for students) |
| **Continue** | Open-source assistant | Flexibility, multiple models | 🟡 Medium | Free (bring API key) |
| **Cursor** | AI-first editor | Deep codebase understanding | 🟢 Easy | $20/mo |
| **Cody (Sourcegraph)** | Context-aware assistant | Large codebases | 🟡 Medium | Free tier + paid |
| **Windsurf** | Advanced assistant | Multi-file coordination | 🟡 Medium | $10-15/mo |

> **💡 Recommendation:** Start with GitHub Copilot (if student) or Continue (for flexibility and cost control).

## 2d.2 Option 1: GitHub Copilot (Recommended for Students)

### Why GitHub Copilot?
- **Free for verified students and educators**
- Seamless VS Code integration
- Real-time inline suggestions
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
   - Authorize VS Code to access your GitHub account
   - Confirm Copilot activation

4. **Configure Settings:**

   Open VS Code settings (Ctrl+, / Cmd+,) and search for "Copilot":

   ```json
   {
     "github.copilot.enable": {
       "*": true,
       "yaml": true,
       "plaintext": false,
       "markdown": true
     },
     "github.copilot.editor.enableAutoCompletions": true,
     "github.copilot.chat.localeOverride": "en"
   }
   ```

### Using GitHub Copilot

**Inline Suggestions:**
- Start typing code, Copilot suggests completions in gray text
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

> **🎯 Pro Tip:** Select code before asking questions in Copilot Chat for context-aware responses.

## 2d.3 Option 2: Continue (Best for Flexibility)

### Why Continue?
- **100% free and open source**
- Use any AI model (Claude, GPT-4, Gemini, etc.)
- Bring your own API keys
- Highly customizable
- Great for learning AI integration

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
         "title": "Claude 3.5 Sonnet",
         "provider": "anthropic",
         "model": "claude-3-5-sonnet-20241022",
         "apiKey": "YOUR_ANTHROPIC_API_KEY"
       },
       {
         "title": "GPT-4 Turbo",
         "provider": "openai",
         "model": "gpt-4-turbo-preview",
         "apiKey": "YOUR_OPENAI_API_KEY"
       },
       {
         "title": "Gemini Pro",
         "provider": "gemini",
         "model": "gemini-1.5-pro",
         "apiKey": "YOUR_GOOGLE_API_KEY"
       }
     ],
     "tabAutocompleteModel": {
       "title": "Gemini Flash (Fast)",
       "provider": "gemini",
       "model": "gemini-1.5-flash",
       "apiKey": "YOUR_GOOGLE_API_KEY"
     }
   }
   ```

3. **Configure Context Providers:**

   Continue can pull context from various sources:

   ```json
   {
     "contextProviders": [
       {
         "name": "code",
         "params": {}
       },
       {
         "name": "docs",
         "params": {}
       },
       {
         "name": "diff",
         "params": {}
       },
       {
         "name": "terminal",
         "params": {}
       },
       {
         "name": "problems",
         "params": {}
       }
     ]
   }
   ```

### Using Continue

**Chat Interface:**
- Click Continue icon in sidebar
- Type your question
- Use `@` to reference files: `@filename.py`
- Use `/` for slash commands:
  - `/edit` - Make changes to code
  - `/comment` - Add comments
  - `/share` - Share conversation

**Tab Autocomplete:**
- Enabled by default if configured
- Works similarly to GitHub Copilot
- Uses your chosen model for suggestions

**Keyboard Shortcuts:**
- `Ctrl+L` / `Cmd+L` - Open Continue chat
- `Ctrl+I` / `Cmd+I` - Quick edit selected code

## 2d.4 Option 3: Cody by Sourcegraph

### Why Cody?
- Excellent for large codebases
- Context-aware with advanced code graph understanding
- Free tier available
- Supports multiple LLMs

### Setup Steps

1. **Install Cody Extension:**
   - Search for "Cody AI" in VS Code Extensions
   - Install the extension

2. **Sign Up:**
   - Click "Sign in to Sourcegraph"
   - Create a free account at [sourcegraph.com](https://sourcegraph.com/)

3. **Configure Model:**
   - Choose from Claude, GPT-4, or Mixtral
   - Free tier includes limited usage
   - Pro tier: $9/month for unlimited

### Using Cody

- Similar chat interface to Continue
- Excellent at understanding large projects
- Can search across your entire codebase
- Provides cited sources for answers

## 2d.5 Option 4: Cursor (Standalone Editor)

### Why Cursor?
- Purpose-built AI editor (fork of VS Code)
- Composer mode for multi-file edits
- Tab autocomplete
- Chat with codebase

### Setup

> **📝 Note:** Cursor is a separate editor, not a VS Code extension.

1. Download from [cursor.sh](https://cursor.sh/)
2. Install and launch
3. Import your VS Code settings (optional)
4. Sign up for Cursor account
5. Choose subscription tier:
   - **Free:** Limited AI requests
   - **Pro ($20/mo):** Unlimited requests

### Features

- **Composer Mode:** `Ctrl+I` / `Cmd+I` for multi-file edits
- **Chat:** `Ctrl+K` / `Cmd+K` for inline chat
- **Tab Autocomplete:** Built-in, very fast
- **Codebase Indexing:** Understands your entire project

## 2d.6 Best Practices for AI-Assisted Coding

Regardless of which tool you choose:

> **💡 Golden Rules of AI Coding:**

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
   ❌ Bad: "Write a function"
   ✅ Good: "Write a Python function that validates email
           addresses using regex, returns True if valid,
           False otherwise, and includes error handling"
   ```

4. **Provide Context**
   - Share relevant code snippets
   - Explain your project structure
   - Mention constraints or requirements

5. **Iterate and Refine**
   - First AI response might not be perfect
   - Ask follow-up questions
   - Request improvements

## 2d.7 Keyboard Shortcuts Reference

| Action | GitHub Copilot | Continue | Cursor |
|--------|---------------|----------|--------|
| Accept suggestion | `Tab` | `Tab` | `Tab` |
| Reject suggestion | `Esc` | `Esc` | `Esc` |
| Next suggestion | `Alt+]` | `Alt+]` | `Alt+]` |
| Open chat | `Ctrl+Shift+I` | `Ctrl+L` | `Ctrl+K` |
| Inline edit | - | `Ctrl+I` | `Ctrl+I` |

## 2d.8 Managing API Costs

To avoid unexpected charges with Continue or custom configurations:

```json
{
  "models": [
    {
      "title": "Cheap Model (Gemini Flash)",
      "provider": "gemini",
      "model": "gemini-1.5-flash",
      "apiKey": "YOUR_KEY",
      "contextLength": 100000
    },
    {
      "title": "Premium Model (Claude Sonnet)",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "YOUR_KEY",
      "usageNote": "Use sparingly - costs more"
    }
  ]
}
```

> **⚠️ Cost Warning:** Monitor your API usage dashboards regularly:
> - Anthropic: [console.anthropic.com](https://console.anthropic.com/)
> - OpenAI: [platform.openai.com/usage](https://platform.openai.com/usage)
> - Google: [console.cloud.google.com](https://console.cloud.google.com/)

## 2d.9 Advanced: MCP Servers with Claude

If using Claude Code or Continue with Claude:

**Model Context Protocol (MCP)** allows AI to access external tools and data.

Example MCP configuration for Continue:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
      }
    }
  }
}
```

> **🔴 Advanced Feature:** MCP configuration is optional and for advanced users.

<details>
<summary>🎯 Exercise: Set Up Your AI Assistant</summary>

**Task:** Install and configure one AI coding assistant.

**For Students (GitHub Copilot):**
1. Verify student status on GitHub Education
2. Install GitHub Copilot extension
3. Install GitHub Copilot Chat extension
4. Sign in and activate
5. Try generating code: Type `// Function to reverse a string` and see suggestions

**For Others (Continue):**
1. Install Continue extension
2. Get API key from Google Gemini (free tier)
3. Configure Continue with your API key
4. Test with a simple prompt: "Write a hello world function"

**Verification:**
- [ ] Extension installed successfully
- [ ] Authenticated/configured
- [ ] Test prompt works
- [ ] Generated code is reasonable
- [ ] You understand how to accept/reject suggestions

</details>

<details>
<summary>🎯 Knowledge Check</summary>

1. Which AI coding tool is free for students?
2. What's the keyboard shortcut to accept a Copilot suggestion?
3. Why is version control important when using AI assistants?
4. How do you provide context to AI assistants?
5. What's the difference between inline suggestions and chat interfaces?

**Answers:**
1. GitHub Copilot (also Cody has a free tier)
2. `Tab` (across most tools)
3. Easy to revert AI mistakes; provides audit trail
4. Select code, use @-mentions, provide clear descriptions
5. Inline appears while typing; chat is for questions/complex tasks

</details>

---

**Next**: [Chapter 3: The Core Git Workflow](./03_core_workflow.md)
