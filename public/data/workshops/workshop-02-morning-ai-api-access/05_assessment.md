# Chapter 5: Assessment — Validating Your AI API Mastery

## Introduction: Proving Your New Skills

This assessment validates that you can connect to AI APIs, choose the right model for any task, manage costs effectively, and work securely. It combines knowledge checks with practical demonstrations.

**Time:** 10 minutes
**Passing Score:** 80% (24/30 points)
**Format:** Multiple choice, practical tasks, and reflection

---

## Part 1: Knowledge Check (10 points)

### Question 1: API Fundamentals (2 points)

What does an API key do when you send a request to an AI provider?

A) It encrypts your prompt so nobody can read it
B) It authenticates your identity, tracks your usage, and enables billing
C) It selects which AI model to use
D) It limits how long the response can be

**Answer:** B

---

### Question 2: Token Economics (2 points)

You send a 500-token prompt and receive a 2,000-token response using a model that charges $3.00 per million input tokens and $15.00 per million output tokens. What is the approximate cost of this single request?

A) $0.0015
B) $0.0315
C) $0.315
D) $3.15

**Answer:** B

**Working:** Input: 500 / 1,000,000 x $3.00 = $0.0015. Output: 2,000 / 1,000,000 x $15.00 = $0.03. Total = $0.0315.

---

### Question 3: Model Selection (2 points)

You need to analyse a 400-page PDF document in a single prompt. Which model family is the best choice?

A) GPT-4o (128K context window)
B) Claude Haiku 4.5 (200K context window)
C) Gemini 2.5 Pro (2M context window)
D) GPT-4o-mini (128K context window)

**Answer:** C

**Explanation:** A 400-page document is approximately 200,000-300,000 tokens. Gemini 2.5 Pro's 2M context window handles this comfortably. The other models' context windows may be too small.

---

### Question 4: Security (2 points)

Which of the following is the CORRECT way to store an API key?

A) Paste it directly into your Python script: `api_key = "sk-ant-api03-xyz..."`
B) Store it in a `.env` file and load it via environment variables
C) Include it in your Git commit message for easy reference
D) Save it in a shared Google Doc with your team

**Answer:** B

---

### Question 5: Cost Optimisation (2 points)

You need to proofread 50 short emails per day. Which approach minimises cost while maintaining acceptable quality?

A) Use Claude Fable 5 for every email (highest quality)
B) Use Claude Opus 4.8 for every email (premium reasoning)
C) Use GPT-4o-mini or Haiku 4.5 for all emails (fast and cheap)
D) Use o3 for every email (best reasoning)

**Answer:** C

**Explanation:** Proofreading short emails is a simple task. Budget models like GPT-4o-mini (~$0.15/M input) or Haiku 4.5 (~$0.25/M input) handle this perfectly. Using premium models would cost 10-60x more with no meaningful quality improvement for this task.

---

## Part 2: Practical Skills (15 points)

### Task 1: Provider Verification (4 points)

**Instructions:** Demonstrate that you have working API connections.

Open your configured Claude Code or Continue extension and confirm:

1. **Anthropic**: Send a prompt to any Claude model and receive a response
2. **OpenAI**: Send a prompt to GPT-4o or GPT-4o-mini and receive a response
3. **Google/Groq**: Send a prompt to Gemini or Llama via a free-tier provider

**Evaluation Criteria:**
- ✓ Anthropic connection working (1 point)
- ✓ OpenAI connection working (1 point)
- ✓ At least one free-tier provider working (1 point)
- ✓ Spending limits configured on paid accounts (1 point)

---

### Task 2: Model Comparison (3 points)

**Instructions:** Send this exact prompt to two different models and compare:

```
Explain what an API is to someone who has never heard the term.
Use a real-world analogy. Keep it under 100 words.
```

Document:
- Which two models you used
- Which response you preferred and why (1-2 sentences)
- Which model responded faster

**Evaluation Criteria:**
- ✓ Two models tested with identical prompt (1 point)
- ✓ Comparison documented with reasoning (1 point)
- ✓ Speed difference noted (1 point)

---

### Task 3: Cost Calculation (4 points)

**Instructions:** Calculate the cost for this realistic scenario:

**Scenario:** You need to generate 20 blog articles per month. Each article requires:
- Input prompt: ~800 tokens
- Output article: ~2,500 tokens

Calculate the monthly cost using:
1. Claude Sonnet 4.6 (~$3.00/M input, ~$15.00/M output)
2. GPT-4o-mini (~$0.15/M input, ~$0.60/M output)

Compare both to a £20/month ChatGPT Plus subscription.

**Template:**

```markdown
# Cost Calculation

## Sonnet 4.6 (20 articles)
- Input: 20 x 800 = 16,000 tokens = $___
- Output: 20 x 2,500 = 50,000 tokens = $___
- Monthly total: $___

## GPT-4o-mini (20 articles)
- Input: 16,000 tokens = $___
- Output: 50,000 tokens = $___
- Monthly total: $___

## ChatGPT Plus subscription: £20/month

## Savings: ___% with Sonnet, ___% with GPT-4o-mini
```

**Evaluation Criteria:**
- ✓ Sonnet 4.6 calculation correct (1 point)
- ✓ GPT-4o-mini calculation correct (1 point)
- ✓ Comparison to subscription cost (1 point)
- ✓ Percentage savings calculated (1 point)

**Expected Answers:**
- Sonnet 4.6: Input $0.048 + Output $0.75 = ~$0.80/month (~96% saving vs £20)
- GPT-4o-mini: Input $0.0024 + Output $0.03 = ~$0.03/month (~99.8% saving vs £20)

---

### Task 4: Multi-Model Workflow (4 points)

**Instructions:** Demonstrate a 3-step workflow using different models:

1. **Step 1** — Use any model to generate a 3-bullet summary of a topic you choose
2. **Step 2** — Use a *different* model to expand one bullet into a full paragraph
3. **Step 3** — Use a *third* model (or a budget model) to proofread the paragraph

Document which model you chose for each step and why.

**Evaluation Criteria:**
- ✓ Three distinct steps completed (1 point)
- ✓ Different models used for at least 2 of the 3 steps (1 point)
- ✓ Model choices justified (1 point)
- ✓ Final output is coherent and polished (1 point)

---

## Part 3: Reflection & Application (5 points)

### Question 1: Personal Impact (2 points)

**Describe your current AI spending and how direct API access changes it:**

```markdown
## My AI Cost Transformation

### Before (Subscriptions)
- Service 1: [name] — £___/month
- Service 2: [name] — £___/month
- Service 3: [name] — £___/month
- Total: £___/month (£___/year)

### After (API Access)
- Estimated monthly API spend: £___
- Number of models accessible: ___
- Monthly saving: £___
- Annual saving: £___
```

**Evaluation:**
- Specific current costs listed (1 point)
- Realistic API cost estimate with clear saving (1 point)

---

### Question 2: Model Selection Strategy (3 points)

**Complete this model routing table for your typical work tasks:**

```markdown
## My Model Routing Strategy

| Task Type | Model Choice | Why |
|-----------|-------------|-----|
| Quick emails/messages | [model] | [reason] |
| Long document analysis | [model] | [reason] |
| Creative writing/content | [model] | [reason] |
| Complex reasoning/strategy | [model] | [reason] |
| Proofreading/editing | [model] | [reason] |
```

**Evaluation Criteria:**
- ✓ All 5 task types filled with specific models (1 point)
- ✓ Reasoning demonstrates understanding of model strengths (1 point)
- ✓ Cost-awareness evident (e.g. not using premium models for simple tasks) (1 point)

---

## Scoring Guide

### Total Points: 30

**Scoring Breakdown:**

- **27-30 points (90-100%):** Master Level
  - Full command of multi-model API access
  - Ready to build automated workflows
  - Can teach others confidently

- **24-26 points (80-89%):** Proficient Level
  - Strong practical skills across providers
  - Understands cost optimisation
  - Minor areas to refine with practice

- **18-23 points (60-79%):** Developing Level
  - Basic skills established
  - Needs more practice with model selection and cost calculation
  - Review Chapters 1 and 2

- **Below 18 points (<60%):** Needs Review
  - Revisit core concepts and hands-on setup
  - Complete exercises again with guided support
  - Schedule office hours

## Self-Assessment Checklist

Beyond the formal assessment, can you confidently say:

**Technical Skills:**
- [ ] I can create API keys for Anthropic, OpenAI, and Google
- [ ] I can configure Claude Code or Continue with multiple providers
- [ ] I can send prompts to different models and compare outputs
- [ ] I can store API keys securely in environment variables
- [ ] I can read and understand a token usage report

**Cost Management:**
- [ ] I can estimate token counts for a piece of text
- [ ] I can calculate the cost of a specific task across providers
- [ ] I have spending limits set on all paid accounts
- [ ] I know which models are free-tier and which are paid
- [ ] I can explain why API access is cheaper than subscriptions

**Model Selection:**
- [ ] I can name at least 6 models across 3 providers
- [ ] I know which model to use for creative writing
- [ ] I know which model to use for long document analysis
- [ ] I know which model to use for quick, cheap tasks
- [ ] I can justify my model choices to a colleague

**Professional Practices:**
- [ ] My API keys are not hardcoded anywhere
- [ ] My `.env` file is in `.gitignore`
- [ ] I know how to rotate API keys
- [ ] I can troubleshoot common API errors (401, 429)
- [ ] I have a plan for monitoring my monthly spend

## Areas for Improvement

Based on your results, identify 2-3 areas to focus on:

1. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

2. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

3. **Area:** _____________
   **Action:** _____________
   **Timeline:** _____________

## Certification Statement

Upon achieving 80% or higher:

```
+--------------------------------------------+
|                                            |
|   CERTIFICATE OF COMPLETION                |
|                                            |
|   This certifies that                      |
|                                            |
|   [Your Name]                              |
|                                            |
|   has successfully completed               |
|   Direct AI API Access Workshop            |
|   Phase 3: AI APIs & Vibe Coding           |
|                                            |
|   and demonstrated mastery of:             |
|   - Multi-provider API configuration       |
|   - Model selection and comparison         |
|   - Token economics and cost management    |
|   - Secure API key practices               |
|                                            |
|   Score: ____ / 30                         |
|   Date: ___________                        |
|                                            |
+--------------------------------------------+
```

## Next Steps Based on Performance

### If You Scored 90%+

**You're Ready For:**
- Building automated multi-model pipelines
- Exploring the Python/TypeScript SDKs for deeper integration
- Teaching colleagues the multi-model approach
- Advanced prompt engineering and caching strategies

**Recommended Actions:**
1. Set up a weekly cost review calendar event
2. Build reusable prompt templates for your top 5 tasks
3. Experiment with streaming responses and batch processing
4. Explore MCP (Model Context Protocol) for tool integration

### If You Scored 80-89%

**You're Ready For:**
- Daily use of multi-model API access
- Gradual cancellation of redundant AI subscriptions
- Sharing your model comparison findings with colleagues
- The next phase

**Recommended Actions:**
1. Track your actual API costs for one full week
2. Refine your model routing table based on real usage
3. Practice cost calculations until they're second nature
4. Complete any exercises you skipped

### If You Scored Below 80%

**You Should:**
- Revisit Chapters 1 (Concepts) and 2 (Hands-On Setup)
- Repeat the model comparison exercises in Chapter 3
- Focus on getting at least 2 providers fully working
- Ask for help with any provider setup that's stuck

**Recommended Actions:**
1. Complete the hands-on setup for all 4 providers
2. Redo Exercises 1-3 from Chapter 3
3. Schedule office hours for one-on-one support
4. Practise daily for one week before reassessment

## Reassessment Policy

If you scored below 80%:
- You may retake after completing additional practice
- Review the recommended chapters
- Complete the supplementary exercises
- A 1:1 help session is available on request

## Continuous Improvement

### 7-Day Challenge

Track these metrics for one week after the workshop:

| Day | Models Used | Tasks Completed | Total Cost | Notes |
|-----|------------|-----------------|------------|-------|
| Mon | | | | |
| Tue | | | | |
| Wed | | | | |
| Thu | | | | |
| Fri | | | | |
| Sat | | | | |
| Sun | | | | |
| **Week Total** | | | **£___** | |

**Target:** Under £2 for the entire week with daily multi-model usage.

### 30-Day Goals

- [ ] Use API access for 100% of AI tasks (retire web interfaces)
- [ ] Track total monthly API spend (target: under £10)
- [ ] Cancel or downgrade at least one AI subscription
- [ ] Help one colleague set up their own API access
- [ ] Refine your model routing table based on a month of real data

### 90-Day Goals

- [ ] Monthly API spend optimised and predictable
- [ ] Custom prompt templates for all recurring tasks
- [ ] Comfortable trying new models as they launch
- [ ] Contributing model comparison insights to the community
- [ ] Exploring programmatic API access (Python SDK or similar)

## Feedback & Support

**Questions about the assessment?**
- Review the answer explanations provided above
- Check the discussion forum
- Email workshop@dreamlab.ai
- Schedule office hours: Fridays 2-3pm GMT

**Want to go further?**
- Explore the Python SDKs for all three providers
- Read about prompt caching (Anthropic, Google)
- Investigate function calling and tool use
- Look into building AI agents with Claude Code

## Well Done

You've validated a genuinely valuable professional skill. Direct API access to AI models is a capability that most professionals don't know exists — and you've not only learned it but demonstrated competence in model selection, cost management, and secure practices.

**The economics speak for themselves:** professional-grade AI access for pennies instead of pounds. Use this knowledge wisely, keep experimenting, and stay curious as the landscape evolves.

---

Next: [Chapter 6: Resources & Continued Learning](./06_resources.md)

[Back to Project](./04_project.md) | [Back to Workshop Overview](README.md)
