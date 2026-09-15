# 2.c: API Keys and Authentication

Secure authentication is fundamental for using AI coding tools. This section covers obtaining and managing API keys for Anthropic (Claude Code) and OpenAI (Codex CLI), as well as best practices that apply across all providers.

## Obtaining API Keys

### Anthropic (for Claude Code)

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to "API Keys" in your account settings
4. Click "Create Key" and give it a descriptive name (e.g., "claude-code-laptop")
5. Copy the key immediately — it will not be shown again

### OpenAI (for Codex CLI)

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to "API keys" in your account settings
4. Click "Create new secret key"
5. Copy the key immediately — it will not be shown again

### Other Providers

For tools that support multiple providers (like Codex CLI with its `--provider` flag or Continue.dev):

- **Azure OpenAI:** portal.azure.com — Azure OpenAI Service resource
- **Google (Gemini):** ai.google.dev — API key from Google AI Studio
- **Ollama (local):** No API key needed — models run locally

## Secure Handling of API Keys

API keys are confidential credentials. Treat them with the same care as passwords.

### Essential Practices

*   **Never share publicly:** Do not commit keys to Git, paste them in public forums, or include them in client-side code.
*   **Use environment variables:** The standard and recommended practice. This keeps keys out of your codebase entirely.

    ```bash
    # In your shell config (~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish)
    export ANTHROPIC_API_KEY="sk-ant-..."
    export OPENAI_API_KEY="sk-..."
    ```

*   **Use .env files locally (with .gitignore):** For project-specific keys, create a `.env` file and ensure it is listed in `.gitignore`.

    ```bash
    # .env (never commit this file)
    ANTHROPIC_API_KEY=sk-ant-...
    OPENAI_API_KEY=sk-...
    ```

    ```bash
    # .gitignore
    .env
    .env.local
    .env.*.local
    ```

*   **Use secret managers in production:** For CI/CD and deployed applications, use your platform's secret management:
    - GitHub Actions: Repository secrets
    - AWS: Secrets Manager
    - Google Cloud: Secret Manager
    - Azure: Key Vault

*   **Rotate keys regularly:** Generate new keys periodically, especially if you suspect compromise. Revoke old keys immediately.

*   **Use project-scoped keys where possible:** Both Anthropic and OpenAI support project-level key scoping, which limits what each key can access.

## Authentication for Claude Code

Claude Code handles authentication automatically once your API key is set:

```bash
# Method 1: Environment variable (recommended)
export ANTHROPIC_API_KEY="sk-ant-..."

# Method 2: Claude Code will prompt you to authenticate
# on first run if no key is found — it opens a browser
# for OAuth-style authentication

# Method 3: For CI/CD or non-interactive use
ANTHROPIC_API_KEY="sk-ant-..." claude -p "Run the test suite"
```

### Checking Authentication

```bash
# Claude Code shows your authentication status at startup
claude
# Look for: "Authenticated as: your-email@example.com"
```

## Authentication for Codex CLI

```bash
# Method 1: Environment variable (recommended)
export OPENAI_API_KEY="sk-..."

# Method 2: .env file in project root
echo 'OPENAI_API_KEY=sk-...' > .env

# Method 3: Using a different provider
export ANTHROPIC_API_KEY="sk-ant-..."
codex --provider anthropic "Your task here"
```

## Organisation and Project IDs

### OpenAI

For users belonging to multiple organisations on the OpenAI platform:

*   **Organisation IDs:** Found in your organisation settings on platform.openai.com
*   **Project IDs:** Found in the project settings page

When making direct API calls, include these headers:
```
OpenAI-Organization: YOUR_ORG_ID
OpenAI-Project: YOUR_PROJECT_ID
```

The Codex CLI may handle this automatically based on your default settings.

### Anthropic

Anthropic's console supports Workspaces for team organisation. API keys are scoped to a workspace, providing natural access control.

## Cost Management

Both providers charge based on token usage. Monitor your spending:

### Anthropic
- Check usage at console.anthropic.com under "Usage"
- Set spending limits and alerts
- Claude Code shows per-session costs via the `/cost` command

### OpenAI
- Check usage at platform.openai.com/usage
- Set monthly spending limits
- Configure per-key usage limits

### Practical Tips

- Start with conservative spending limits and increase as needed
- Use faster/cheaper models (Sonnet 4.6, o4-mini) for routine tasks
- Reserve expensive models (Opus 4.8, o3) for complex reasoning
- Monitor cost per task to optimise your model selection

## Summary: Authentication Quick Reference

| Tool | Environment Variable | Where to Get Key |
|------|---------------------|-----------------|
| Claude Code | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Codex CLI (OpenAI) | `OPENAI_API_KEY` | platform.openai.com |
| Codex CLI (Anthropic) | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Cursor | Built-in auth | cursor.sh (account settings) |
| GitHub Copilot | GitHub OAuth | github.com (Copilot settings) |
| Continue.dev | Per-provider | Depends on configured provider |

---

Next: [Chapter 3: Mastering AI Coding Agents](./03_mastering_codex.md)
