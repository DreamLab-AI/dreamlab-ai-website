# Chapter 2c: Setting up AI API Keys (2025 Edition)

⏱️ **Time:** 15-20 minutes | 🎯 **Difficulty:** 🟡 Intermediate

To utilize AI-powered features in modern coding tools, you'll need API keys from AI providers. This chapter covers the major options available in 2025, their free tiers, and how to get started.

## 2c.1 Overview of AI API Options (2025)

In 2025, you have several excellent options for AI coding assistance:

| Provider | Free Tier | Best For | Rate Limits |
|----------|-----------|----------|-------------|
| **Anthropic Claude** | Limited free credits | Complex reasoning, long contexts | 5 requests/min (free) |
| **Google Gemini** | Generous free tier | Multimodal tasks, cost-effective | 15 requests/min |
| **OpenAI** | $5 free credits (new users) | General purpose, widely supported | Varies by model |
| **Groq** | Free tier available | Ultra-fast inference | High rate limits |
| **GitHub Copilot** | Free for students/educators | Native VS Code integration | Unlimited (with subscription) |

> **💡 Tip:** Start with Google Gemini for the most generous free tier, or use GitHub Copilot if you're a student (completely free!).

## 2c.2 Option 1: Google Gemini API (Recommended for Beginners)

### Why Gemini?
- **Most generous free tier** in 2025
- Excellent performance on coding tasks
- Supports multimodal inputs (text, images, code)
- Easy to set up

### Steps to Get Your Gemini API Key

1. **Visit Google AI Studio:**
   - Go to [https://ai.google.dev/](https://ai.google.dev/)
   - Click "Get API key" or "Try Gemini API"

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

> **🔐 Security Note:** Never commit API keys to Git repositories. Store them in environment variables or `.env` files (add `.env` to `.gitignore`).

<details>
<summary><strong>⚙️ Advanced: Restricting Your API Key</strong></summary>

For production use, restrict your API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Click on your API key
4. Under "API restrictions," select "Restrict key"
5. Choose only "Generative Language API"
6. Optionally add application restrictions (HTTP referrers, IP addresses)

</details>

### Gemini Free Tier Details (2025)

- **Models included:** Gemini 1.5 Flash, Gemini 1.5 Pro (limited)
- **Rate limits:** 15 requests per minute, 1500 per day
- **Context window:** Up to 1M tokens (Gemini 1.5 Pro)
- **Cost after free tier:** Very affordable ($0.00025/1k tokens for Flash)

## 2c.3 Option 2: Anthropic Claude API

### Why Claude?
- Best-in-class reasoning abilities
- Excellent for complex code generation and refactoring
- 200k token context window
- Strong safety and ethics focus

### Steps to Get Your Claude API Key

1. **Visit Anthropic Console:**
   - Go to [https://console.anthropic.com/](https://console.anthropic.com/)
   - Sign up for an account

2. **Get API Credits:**
   - New users receive limited free credits
   - Navigate to "API Keys" section
   - Click "Create Key"

3. **Copy and Store Key:**
   - Copy your API key
   - Store securely in a password manager

### Claude Free Tier Details (2025)

- **Free credits:** Limited (typically $5 for new users)
- **Models:** Claude 3.5 Sonnet, Claude 3.5 Haiku
- **Rate limits:** 5 requests/minute (free tier)
- **Best for:** Complex reasoning, code review, architecture decisions

> **📝 Note:** Claude's free tier is more limited than Gemini's, but the quality is exceptional for complex tasks.

## 2c.4 Option 3: OpenAI API

### Why OpenAI?
- Industry standard with wide tool support
- GPT-4 and GPT-4 Turbo available
- Extensive ecosystem

### Steps to Get Your OpenAI API Key

1. **Visit OpenAI Platform:**
   - Go to [https://platform.openai.com/](https://platform.openai.com/)
   - Sign up or log in

2. **Get Free Credits:**
   - New users get $5 in free credits (valid for 3 months)
   - Navigate to "API keys"
   - Click "Create new secret key"

3. **Set Usage Limits:**
   - Go to "Billing" > "Usage limits"
   - Set a monthly budget limit
   - Enable email alerts

### OpenAI Free Tier Details (2025)

- **Free credits:** $5 (new users, expires after 3 months)
- **Models:** GPT-3.5-turbo (cheapest), GPT-4-turbo, GPT-4
- **Rate limits:** Varies by tier
- **Pricing:** ~$0.002/1k tokens (GPT-3.5-turbo)

## 2c.5 Option 4: GitHub Copilot (Best for Students)

### Why GitHub Copilot?
- **Free for verified students and educators**
- Native integration with VS Code
- No API key management needed
- Unlimited usage (with subscription)

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
   - Use `Ctrl+Enter` (or `Cmd+Enter`) to see more suggestions

> **💡 Pro Tip:** If you're not a student, GitHub Copilot is $10/month and includes Copilot Chat—a great investment for serious developers.

## 2c.6 Option 5: Groq (Ultra-Fast Inference)

### Why Groq?
- **Extremely fast** inference (up to 300 tokens/second)
- Free tier with generous rate limits
- Great for prototyping and rapid iteration

### Steps to Get Your Groq API Key

1. **Visit Groq Console:**
   - Go to [https://console.groq.com/](https://console.groq.com/)
   - Sign up for an account

2. **Create API Key:**
   - Navigate to "API Keys"
   - Click "Create API Key"
   - Copy and store securely

3. **Choose a Model:**
   - Llama 3.1 (recommended)
   - Mixtral 8x7B
   - Gemma 2

## 2c.7 Storing API Keys Securely

> **⚠️ Critical Security Warning:** Never, ever commit API keys to Git repositories!

### Best Practices for API Key Storage

**1. Use Environment Variables:**

Create a `.env` file in your project root:
```bash
# .env (DO NOT COMMIT THIS FILE)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
GOOGLE_API_KEY=xxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
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
GROQ_API_KEY=your_key_here
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

## 2c.8 Rate Limiting Best Practices

To avoid unexpected costs and respect free tier limits:

> **💡 Tip:** Configure rate limiting in your AI tools to stay within free tiers.

**Example rate limit configurations:**

```javascript
// For Google Gemini (15 requests/min)
const rateLimiter = {
  requests: 15,
  period: 60000 // milliseconds
};

// For Claude (5 requests/min)
const rateLimiter = {
  requests: 5,
  period: 60000
};
```

<details>
<summary>🎯 Exercise: Set Up Your First API Key</summary>

**Task:** Choose one AI provider and set up your API key securely.

1. Select a provider (Gemini recommended for beginners)
2. Create your API key following the steps above
3. Create a `.env` file in a test project
4. Add your API key to `.env`
5. Add `.env` to `.gitignore`
6. Create a `.env.example` template
7. Test your key with a simple API call or in an AI tool

**Verification:**
- [ ] API key created successfully
- [ ] `.env` file contains key
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` template created
- [ ] Key tested and working

</details>

<details>
<summary>🎯 Knowledge Check</summary>

1. Which AI provider offers the most generous free tier in 2025?
2. Why should you never commit API keys to Git?
3. What's the advantage of GitHub Copilot for students?
4. How do you restrict a Google Gemini API key for security?
5. What file should contain API keys? What file should be in `.gitignore`?

**Answers:**
1. Google Gemini (15 req/min, 1500/day free)
2. Anyone with access to your repository could steal and abuse your key
3. It's completely free with unlimited usage for verified students
4. Use Google Cloud Console to restrict to specific APIs and applications
5. `.env` file should contain keys; `.env` should be in `.gitignore`

</details>

---

**Next**: [Chapter 2d: Configuring AI Code Assistants in VS Code](./02_d_roo_code_config.md)
