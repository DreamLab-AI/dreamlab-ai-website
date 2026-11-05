# Learning Objectives - Workshop 02 Morning: Direct AI API Access

## Workshop Overview

Move from consumer AI subscriptions to direct, professional API access. By the end of this 3-hour session, you'll have working connections to multiple AI providers, understand the economics behind every API call, and know exactly which model to choose for any given task.

## Primary Learning Outcomes

By the end of this workshop, you will be able to:

### 1. API Fundamentals (Core Knowledge)

**You will be able to:**
- ✅ Explain what an API is and how AI APIs work (request, authentication, response)
- ✅ Identify the major AI API providers and their flagship models
- ✅ Describe the anatomy of an API request: endpoint, headers, body, response
- ✅ Understand HTTP methods (POST for completions) and JSON response format
- ✅ Recognise common error codes (401 Unauthorized, 429 Rate Limited, 400 Bad Request)
- ✅ Explain why direct API access is cheaper and more flexible than subscriptions

**Success Criteria:**
- Can describe the request-response cycle in your own words
- Can identify at least 3 differences between web-interface AI and API-based AI
- Can explain token-based pricing to a colleague

### 2. Provider Account Setup & API Keys

**You will be able to:**
- ✅ Create accounts on Anthropic Console, OpenAI Platform, Google AI Studio, and Groq
- ✅ Generate API keys for each provider
- ✅ Set up billing and spending limits on paid providers
- ✅ Store API keys securely using environment variables
- ✅ Configure Claude Code and/or the Continue extension with your keys
- ✅ Verify each provider connection with a test prompt

**Success Criteria:**
- Working API keys for at least 3 providers
- Spending limits configured on Anthropic and OpenAI
- Keys stored in `.env` file, not hardcoded
- Successful test response from each provider

### 3. Model Knowledge & Selection

**You will be able to:**
- ✅ Name the current model families: Claude (Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5), GPT (4o, 4o-mini, o3), Gemini (2.5 Pro, 2.5 Flash)
- ✅ Describe the strengths and trade-offs of each model
- ✅ Choose the right model based on task type, speed, cost, and context length
- ✅ Explain context windows and why they matter (128K to 2M tokens)
- ✅ Identify when premium models (Fable 5, Opus 4.8, o3) justify their higher cost
- ✅ Know where to check for new models and pricing changes

**Success Criteria:**
- Can recommend a model for at least 5 common task types
- Can explain the context window difference between GPT-4o (128K), Claude Sonnet (200K), and Gemini 2.5 Pro (2M)
- Can justify using a cheaper model for 80% of daily tasks

### 4. Token Economics & Cost Management

**You will be able to:**
- ✅ Define what tokens are and estimate token counts for typical documents
- ✅ Distinguish between input tokens and output tokens in pricing
- ✅ Calculate the approximate cost of a specific task (e.g. generating a 1,500-word article)
- ✅ Compare the monthly cost of API access vs consumer subscriptions
- ✅ Set up budget alerts and auto-refill thresholds
- ✅ Apply cost optimisation strategies: model tiering, prompt trimming, caching

**Success Criteria:**
- Can estimate the token count for a paragraph of text (within 20%)
- Can calculate cost for a realistic task using at least two providers
- Has set monthly budget limits on all paid accounts
- Can explain the 80/20 rule for model selection

### 5. Practical Multi-Model Workflows

**You will be able to:**
- ✅ Send the same prompt to multiple models and compare outputs
- ✅ Build a multi-stage workflow using different models for each stage
- ✅ Switch between models in Claude Code (`/model`) and Continue (model dropdown)
- ✅ Use key API parameters: temperature, max_tokens, system prompts
- ✅ Handle common errors: invalid key, rate limit, context exceeded
- ✅ Create a personal model preference document for your common tasks

**Success Criteria:**
- Completed at least one head-to-head model comparison
- Built a 3-stage workflow (e.g. research with Gemini, draft with Claude, edit with GPT-4o-mini)
- Documented personal model preferences for at least 3 task types
- Troubleshot at least one API error independently

### 6. Security & Professional Practices

**You will be able to:**
- ✅ Store API keys in environment variables and `.env` files
- ✅ Add `.env` to `.gitignore` to prevent accidental exposure
- ✅ Explain why API keys must never be committed to version control
- ✅ Set a 90-day key rotation schedule
- ✅ Enable multi-factor authentication on provider accounts
- ✅ Monitor usage dashboards for unusual activity

**Success Criteria:**
- No API keys visible in any committed file
- `.env` file exists with all keys; `.gitignore` includes `.env`
- Can explain the risk of key exposure to a colleague
- Has MFA enabled on at least one provider account

## Detailed Skill Breakdown

### Beginner Level (First Hour)

**Knowledge:**
- [ ] Understand what an API is (the restaurant analogy)
- [ ] Know the three major providers: Anthropic, OpenAI, Google
- [ ] Recognise that tokens are the unit of cost
- [ ] Understand that different models have different strengths
- [ ] Know that API keys are like passwords

**Skills:**
- [ ] Create provider accounts
- [ ] Generate and copy API keys
- [ ] Set up billing with spending limits
- [ ] Configure Claude Code or Continue with one provider
- [ ] Send a test prompt and receive a response

**Mindset:**
- [ ] Overcome "APIs are for developers" belief
- [ ] See subscriptions as the expensive option
- [ ] Recognise that setup is a one-time investment
- [ ] Trust that spending limits protect you from surprises

### Intermediate Level (Second Hour)

**Knowledge:**
- [ ] Understand input vs output token pricing
- [ ] Know context window sizes for major models
- [ ] Recognise when to use cheap vs premium models
- [ ] Understand rate limits and exponential backoff
- [ ] Know the key API parameters (temperature, max_tokens)

**Skills:**
- [ ] Configure multiple providers in your editor
- [ ] Switch between models mid-task
- [ ] Compare model outputs for the same prompt
- [ ] Calculate costs for real tasks
- [ ] Handle common API errors

**Mindset:**
- [ ] Confidence choosing the right model for a task
- [ ] Strategic thinking about cost vs quality trade-offs
- [ ] Willingness to experiment with different models
- [ ] Appreciation for the competitive landscape driving prices down

### Advanced Level (Third Hour)

**Knowledge:**
- [ ] Understand multi-model workflow design
- [ ] Know provider-specific features (Claude's extended thinking, Gemini's 2M context, OpenAI's reasoning models)
- [ ] Recognise caching and batching opportunities
- [ ] Understand the open-source model ecosystem (Llama, Mistral via Groq)

**Skills:**
- [ ] Build end-to-end multi-model content pipelines
- [ ] Optimise prompts for cost efficiency
- [ ] Create professional deliverables using AI-assisted workflows
- [ ] Document and share model comparison findings
- [ ] Teach the basics to a colleague

**Mindset:**
- [ ] AI commander: choosing models like tools from a toolbox
- [ ] Cost-conscious: never using a premium model for a simple task
- [ ] Quality-focused: knowing when premium models are worth it
- [ ] Forward-looking: staying current as new models launch

## Profession-Specific Objectives

### For Researchers & Academics

**You will be able to:**
- Analyse long papers using Gemini 2.5 Pro's 2M context window
- Generate literature review drafts with Claude Sonnet 4.6
- Compare model quality for academic writing tasks
- Calculate per-paper analysis costs (typically pennies)
- Process entire theses or grant applications in a single prompt

### For Business Professionals

**You will be able to:**
- Generate professional reports, proposals, and executive summaries
- Use different models for different stages of document creation
- Calculate ROI: API costs vs subscription costs vs time saved
- Build reusable prompt templates for recurring deliverables
- Switch to budget models for routine tasks (emails, summaries)

### For Content Creators & Marketers

**You will be able to:**
- Test creative output across Claude, GPT, and Gemini
- Identify which model best matches your brand voice
- Generate content variations at scale for pennies
- Build a production pipeline: ideation, drafting, editing, proofreading
- Track per-article or per-campaign costs precisely

### For Consultants & Freelancers

**You will be able to:**
- Access enterprise-grade AI without enterprise-grade subscriptions
- Offer multi-model analysis as a differentiator to clients
- Calculate and pass through AI costs transparently
- Build rapid-turnaround workflows for client deliverables
- Demonstrate AI fluency across providers

## Assessment Criteria

### Knowledge Assessment (10 points)

**You will demonstrate understanding of:**
- API architecture and authentication (2 points)
- Token economics and cost calculation (2 points)
- Model capabilities and selection strategy (2 points)
- Security best practices for API keys (2 points)
- Rate limits and error handling (2 points)

### Practical Skills (15 points)

**You will successfully:**
- Set up and verify API connections to 3+ providers (4 points)
- Compare model outputs for a real task (3 points)
- Calculate costs and set spending limits (4 points)
- Build a multi-model workflow (4 points)

### Application & Reflection (5 points)

**You will:**
- Apply multi-model AI to a real project from your work (2 points)
- Articulate your model selection strategy and cost savings (3 points)

**Passing Score:** 24/30 (80%)

## Success Indicators

### Immediate (End of Workshop)

- [ ] API keys working for at least 3 providers
- [ ] Spending limits configured
- [ ] Head-to-head model comparison completed
- [ ] Personal model preference document started
- [ ] Real project deliverable created with multi-model workflow

### Short-term (1 Week)

- [ ] Using API access daily instead of web interfaces
- [ ] Tracked actual spending (expected: under £2 for the week)
- [ ] Refined model preferences based on real usage
- [ ] Cancelled or downgraded at least one subscription
- [ ] Shared the cost comparison with a colleague

### Long-term (1 Month)

- [ ] Monthly AI spend under £10 with better results than subscriptions
- [ ] Established model routing habits (right model, right task)
- [ ] Built reusable prompt templates for common work
- [ ] Comfortable experimenting with new models as they launch
- [ ] Contributing model comparison insights to the community

## Learning Pathways

### Minimum Viable Outcome

**Basic Proficiency:**
- At least one provider configured and working
- Understand token pricing conceptually
- Can send prompts via Claude Code or Continue
- Aware of model differences at a high level
- Confident to continue exploring independently

### Target Outcome

**Professional Competence:**
- Three or more providers configured
- Spending limits set, costs tracked
- Multi-model comparison completed
- Strategic model selection for different tasks
- Real project completed with AI-assisted workflow

### Stretch Outcome

**Advanced Mastery:**
- All providers configured including free-tier Groq
- Cost optimisation strategy documented
- Multi-stage workflow built and tested
- Personal model benchmark results recorded
- Ready to build automated pipelines or teach others

## Post-Workshop Goals

### Immediate Next Steps

- [ ] Review and bookmark all provider console URLs
- [ ] Set calendar reminder for 90-day key rotation
- [ ] Track daily AI costs for one week
- [ ] Complete any unfinished exercises
- [ ] Apply learning to one real work deliverable

### Continuing Education

- [ ] Monitor provider blogs for new model releases
- [ ] Experiment with the Python SDK for your preferred provider
- [ ] Explore prompt caching features (Anthropic, Google)
- [ ] Continue to the next phase (content creation)
- [ ] Share cost savings data with your team or manager

## Measuring Success

### Quantitative Metrics

**Track these numbers:**
- Monthly AI subscription cost (before): £___
- Monthly API cost (after): £___
- Cost savings percentage: ___%
- Number of models you can access: ___
- Average cost per document/task: £___

### Qualitative Indicators

**Assess these factors:**
- Confidence choosing a model for any task (1-10): ___
- Understanding of token economics (1-10): ___
- Comfort with API key management (1-10): ___
- Satisfaction with output quality (1-10): ___

## Your Commitment

### I Commit To:

- [ ] Setting up accounts and API keys for at least 3 providers
- [ ] Setting spending limits before making API calls
- [ ] Testing multiple models before settling on preferences
- [ ] Tracking my costs for at least one week
- [ ] Applying these skills to real work, not just exercises
- [ ] Sharing what I learn with at least one colleague

### Workshop Promises To You:

- ✅ Step-by-step setup for every provider
- ✅ Honest cost comparisons with real numbers
- ✅ No coding required — everything explained from first principles
- ✅ Practical skills you'll use from tomorrow
- ✅ Ongoing resources for staying current

## Ready to Begin?

These objectives represent a fundamental shift in how you access and pay for AI. By the end of this morning, you'll have professional-grade access to the world's best AI models at a fraction of subscription costs.

**Let's connect you directly to the source.**

---

[Begin Workshop -->](./00_introduction.md) | [Check Prerequisites](./prerequisites.md) | [Back to Overview](README.md)
