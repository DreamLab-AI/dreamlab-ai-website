# Chapter 2c: Setting Up AI API Keys (2026 Edition)

**Time:** 15-20 minutes | **Difficulty:** Intermediate

To use AI-powered features in modern coding tools, you may need API keys from AI providers. This chapter covers the major options available in 2026, their free tiers, and how to get started.

> **Good news:** If you plan to use Claude Code with your claude.ai account, you do not need a separate API key -- Claude Code can authenticate directly through your existing claude.ai login. API keys are only needed if you want to use the API directly or configure third-party tools.

## 2c.1 Overview of AI API Options (2026)

In 2026, you have several excellent options for AI coding assistance:

| Provider | Free Tier | Best For | Where to Sign Up |
|----------|-----------|----------|------------------|
| **Anthropic (Claude)** | Claude.ai free tier; API credits for new users | Complex reasoning, long contexts, coding agents | [console.anthropic.com](https://console.anthropic.com/) |
| **Google (Gemini)** | Generous free tier | Multimodal tasks, cost-effective | [aistudio.google.dev](https://aistudio.google.dev/) |
| **OpenAI** | Free credits for new users | General purpose, widely supported | [platform.openai.com](https://platform.openai.com/) |
| **GitHub Copilot** | Free for students/educators and OSS maintainers | Native VS Code integration | [github.com/features/copilot](https://github.com/features/copilot) |

> **Tip:** If you are a student, start with GitHub Copilot (completely free). For everyone else, Claude Code with a claude.ai account is the easiest path -- no API key management needed.

## 2c.2 Option 1: Anthropic Claude (Recommended)

### Why Claude?

- Best-in-class reasoning and coding abilities
- Claude Code works as a standalone terminal tool, a desktop app, and inside VS Code
- Supports up to 200k token context windows
- Model Context Protocol (MCP) for connecting to external tools
- Strong safety and ethics focus

### Getting Started with Claude Code (No API Key Needed)

The simplest path is to use Claude Code with your free claude.ai account:

1. **Create a claude.ai account:**
   - Go to [https://claude.ai/](https://claude.ai/)
   - Sign up with your email address

2. **Install Claude Code:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

3. **Authenticate:**
   ```bash
   claude
   ```
   - Claude Code will open your browser to log in with your claude.ai account
   - That is it -- no API key to copy or manage

### Getting an Anthropic API Key (For Advanced Use)

If you want to use the Claude API directly in your own scripts, or configure third-party tools like Continue.dev:

1. **Visit the Anthropic Console:**
   - Go to [https://console.anthropic.com/](https://console.anthropic.com/)
   - Sign up for an account

2. **Create an API Key:**
   - Navigate to "API Keys" in the sidebar
   - Click "Create Key"
   - Give it a descriptive name (e.g., "Workshop Projects")
   - Copy your API key immediately

3. **Check your credits:**
   - New accounts receive starter credits
   - Check [console.anthropic.com](https://console.anthropic.com/) for current pricing and free-tier details

### Claude Models (2026)

| Model | Best For | Speed |
|-------|----------|-------|
| **Fable 5** | Latest and most capable -- creative and complex tasks | Moderate |
| **Opus 4.8** | Top-tier reasoning and analysis | Slower, most thorough |
| **Sonnet 4.6** | Best balance of speed, quality, and cost | Fast |
| **Haiku 4.5** | Quick tasks, high volume, lowest cost | Fastest |

> **Note:** Claude Code uses Opus by default. Use the `/fast` command within Claude Code to switch to a faster model when you need quicker responses.

## 2c.3 Option 2: Google Gemini API

### Why Gemini?

- Generous free tier -- excellent for experimentation
- Strong performance on coding tasks
- Supports multimodal inputs (text, images, code)
- Easy to set up

### Steps to Get Your Gemini API Key

1. **Visit Google AI Studio:**
   - Go to [https://aistudio.google.dev/](https://aistudio.google.dev/)
   - Click "Get API key"

2. **Sign in with Google Account:**
   - Use any Google account or create one

3. **Create API Key:**
   - Click "Create API key"
   - Select an existing Google Cloud project or create a new one
   - Copy your API key immediately

4. **Test Your Key:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_API_KEY"
   ```

> **Security Note:** Never commit API keys to Git repositories. Store them in environment variables or `.env` files (add `.env` to `.gitignore`).

<details>
<summary><strong>Advanced: Restricting Your API Key</strong></summary>

For production use, restrict your API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click on your API key
4. Under "API restrictions," select "Restrict key"
5. Choose only "Generative Language API"
6. Optionally add application restrictions (HTTP referrers, IP addresses)

</details>

## 2c.4 Option 3: OpenAI API

### Why OpenAI?

- Industry standard with wide tool support
- GPT-4o and o3 models available
- Extensive ecosystem and documentation

### Steps to Get Your OpenAI API Key

1. **Visit the OpenAI Platform:**
   - Go to [https://platform.openai.com/](https://platform.openai.com/)
   - Sign up or log in

2. **Create an API Key:**
   - Navigate to "API keys" in the sidebar
   - Click "Create new secret key"
   - Copy and store securely

3. **Set Usage Limits:**
   - Go to "Billing" > "Usage limits"
   - Set a monthly budget limit
   - Enable email alerts

> **Tip:** Check [platform.openai.com](https://platform.openai.com/) for current free-tier details and pricing, as these change frequently.

## 2c.5 Option 4: GitHub Copilot (Best for Students)

### Why GitHub Copilot?

- **Free for verified students, educators, and open-source maintainers**
- Native integration with VS Code
- No API key management needed
- Unlimited usage with subscription

### Steps to Get GitHub Copilot Free

1. **Verify Student Status:**
   - Go to [GitHub Education](https://education.github.com/)
   - Click "Get benefits"
   - Verify with your student email or ID

2. **Install Copilot Extension:**
   - Open VS Code
   - Install "GitHub Copilot" extension
   - Sign in with your GitHub account

3. **Start Coding:**
   - Copilot will automatically suggest code as you type
   - Press `Tab` to accept suggestions

> **Tip:** If you are not a student, GitHub Copilot starts from $10/month and includes Copilot Chat. Check [github.com/features/copilot](https://github.com/features/copilot) for current pricing.

## 2c.6 Storing API Keys Securely

> **Critical Security Warning:** Never, ever commit API keys to Git repositories!

### Best Practices for API Key Storage

**1. Use Environment Variables:**

Create a `.env` file in your project root:
```bash
# .env (DO NOT COMMIT THIS FILE)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
GOOGLE_API_KEY=xxxxxxxxxxxxx
```

**2. Add `.env` to `.gitignore`:**

```bash
# .gitignore
.env
.env.local
*.key
credentials.json
```

**3. Create a `.env.example` Template:**

```bash
# .env.example (SAFE TO COMMIT)
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

**4. Load Environment Variables in Code:**

Python:
```python
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('ANTHROPIC_API_KEY')
```

JavaScript/TypeScript:
```javascript
require('dotenv').config();
const apiKey = process.env.ANTHROPIC_API_KEY;
```

<details>
<summary>Exercise: Set Up Your AI Tools</summary>

**Task:** Choose your path and get set up.

**Path A -- Claude Code (Recommended):**
1. Create a claude.ai account at [claude.ai](https://claude.ai/)
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
3. Run `claude` in your terminal and log in when prompted
4. Try a simple prompt: "What can you help me with?"

**Path B -- API Key Setup:**
1. Select a provider (Anthropic, Google, or OpenAI)
2. Create your API key following the steps above
3. Create a `.env` file in a test project
4. Add your API key to `.env`
5. Add `.env` to `.gitignore`
6. Create a `.env.example` template

**Verification:**
- [ ] Tool installed or API key created successfully
- [ ] Authentication working
- [ ] `.env` is in `.gitignore` (if using API keys)
- [ ] Test prompt works

</details>

<details>
<summary>Knowledge Check</summary>

1. What is the easiest way to start using Claude Code without an API key?
2. Why should you never commit API keys to Git?
3. What is the advantage of GitHub Copilot for students?
4. Which file should contain API keys, and which file should be in `.gitignore`?
5. Name two reasons you might want an API key even if you use Claude Code with claude.ai auth.

**Answers:**
1. Install Claude Code and authenticate with your claude.ai account -- no API key needed
2. Anyone with access to your repository could steal and abuse your key
3. It is completely free with unlimited usage for verified students and educators
4. `.env` file should contain keys; `.env` should be in `.gitignore`
5. To use the API in your own scripts/applications, or to configure third-party tools like Continue.dev

</details>

---

**Next**: [Chapter 2d: Configuring AI Coding Assistants in VS Code](./02_d_roo_code_config.md)
