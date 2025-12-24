# Chapter 1: Core Concepts - Understanding AI APIs

## Demystifying the Technology That Powers AI

Before we connect to AI models, let's understand what's really happening behind the scenes. This knowledge will transform you from a passive user to an active commander of AI technology.

## 1.1 What Is an API?

### The Restaurant Analogy

Think of an API (Application Programming Interface) like a restaurant:

```mermaid
graph TD
    subgraph "Restaurant (API) Model"
        Customer[You] -->|Order<br/>(API Request)| Waiter[API]
        Waiter -->|Passes to| Kitchen[AI Model]
        Kitchen -->|Prepares| Food[Response]
        Food -->|Delivered by| Waiter2[API]
        Waiter2 -->|Serves| Customer2[You]
    end
    
    style Kitchen fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

- **You**: The customer wanting a service
- **Menu**: Available API endpoints and models
- **Waiter**: The API that takes your request
- **Kitchen**: The AI model processing your request
- **Food**: The response you receive

### Why This Matters

**Web Interface (ChatGPT/Claude.ai):**
- Fixed menu with no substitutions
- Eat only in the restaurant
- Pay expensive prix fixe pricing

**API Access:**
- Order anything you want
- Get delivery anywhere
- Pay only for what you order

## 1.2 Understanding AI Models

### The Model Landscape

```mermaid
mindmap
  root((AI Models))
    OpenAI
      GPT-4o
        Best reasoning
        Code generation
        128k context
      GPT-4o-mini
        Fast & cheap
        Good for simple tasks
      o1
        Advanced reasoning
        Complex problem solving
    Anthropic
      Claude 4 Opus
        Best writing & reasoning
        200k context
        Nuanced understanding
      Claude 4 Sonnet
        Balanced performance
        Fast & capable
      Claude 4 Haiku
        Lightning fast
        Cost effective
    Google
      Gemini 2.0 Pro
        2M context window
        Multimodal excellence
        Research tasks
      Gemini 2.0 Flash
        Quick responses
        Highly efficient
    Open Models
      Llama 3.3
        Free to use
        Privacy focused
      Mistral Large 2
        European
        Strong performance
      Qwen 2.5
        Multilingual excellence
```

### Model Strengths Comparison

| Model | Best For | Context Window | Cost | Speed |
|-------|----------|----------------|------|-------|
| GPT-4o | Complex reasoning, coding | 128k tokens | £££ | Medium |
| Claude 4 Opus | Writing, deep analysis | 200k tokens | £££ | Medium |
| Claude 4 Sonnet | Balanced tasks, coding | 200k tokens | ££ | Fast |
| Gemini 2.0 Pro | Research, long documents | 2M tokens | ££ | Fast |
| GPT-4o-mini | Simple tasks, drafts | 128k tokens | £ | Very Fast |
| Llama 3.3 70B | Privacy-sensitive work | 128k tokens | Free* | Fast |
| o1 | Complex reasoning | 200k tokens | ££££ | Slower |

*When self-hosted or via free providers

## 1.3 The Token Economy

### What Are Tokens?

Tokens are how AI models process text:

```mermaid
graph LR
    A["Hello, world!"] -->|Tokenisation| B[3 tokens]
    C["The quick brown fox"] -->|Tokenisation| D[4 tokens]
    E["Antidisestablishmentarianism"] -->|Tokenisation| F[7 tokens]
    
    style B fill:#4fc3f7
    style D fill:#4fc3f7
    style F fill:#4fc3f7
```

**Rule of Thumb:**
- 1 token ≈ 4 characters
- 1 token ≈ 0.75 words
- 1,000 tokens ≈ 750 words
- 1 page ≈ 500 tokens

### Understanding Costs

```mermaid
graph TD
    subgraph "Token Costs Visualised"
        A[Input Tokens] -->|Cheaper| Model[AI Processing]
        Model -->|More Expensive| B[Output Tokens]
        
        C[1,000 input tokens:<br/>£0.01] -.-> Model
        Model -.-> D[1,000 output tokens:<br/>£0.03]
    end
    
    style Model fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

### Real-World Examples

**Email Generation (GPT-4o):**
- Input: 50 tokens (brief instruction)
- Output: 200 tokens (full email)
- Cost: £0.0035

**Document Analysis (Claude 4 Sonnet):**
- Input: 5,000 tokens (full document)
- Output: 500 tokens (summary)
- Cost: £0.018

**Monthly Comparison:**
- ChatGPT Plus: £20 (unlimited*)
- Typical API use: £3-5 (truly unlimited)

## 1.4 API Keys: Your Access Credentials

### What Is an API Key?

An API key is like a hotel room key:

```mermaid
graph TD
    A[API Key] --> B{Provides Access To}
    B --> C[Specific Models]
    B --> D[Usage Tracking]
    B --> E[Billing Account]
    B --> F[Rate Limits]
    
    G[Keep Secret!] --> A
    H[Regenerate if Compromised] --> A
    
    style A fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px
```

### Security Best Practices

1. **Never Share Keys**
   - Treat like passwords
   - Don't put in public code
   - Don't email them

2. **Use Environment Variables**
   - Store securely in VS Code
   - Not in your documents
   - We'll set this up properly

3. **Set Spending Limits**
   - Start with £5/month
   - Monitor usage
   - Increase as needed

## 1.5 Context Windows Explained

### What Is a Context Window?

The context window is how much the AI can "see" at once:

```mermaid
graph TD
    subgraph "Small Context (Legacy Models)"
        S[4k tokens] --> S1[~3 pages]
    end
    
    subgraph "Medium Context (GPT-4)"
        M[128k tokens] --> M1[~96 pages]
    end
    
    subgraph "Large Context (Claude 4)"
        L[200k tokens] --> L1[~150 pages]
    end

    subgraph "Massive Context (Gemini 2.0)"
        G[2M tokens] --> G1[~1500 pages]
    end
    
    style G fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

### Practical Implications

**Small Context:**
- Quick questions
- Short documents
- Focused tasks

**Large Context:**
- Entire books
- Multiple documents
- Complex analysis
- Maintaining long conversations

## 1.6 Rate Limits and Quotas

### Understanding Limits

APIs have protective limits:

```mermaid
graph LR
    A[Rate Limits] --> B[Requests per minute]
    A --> C[Tokens per minute]
    A --> D[Tokens per day]
    
    B --> B1[Usually 60-500 RPM]
    C --> C1[Usually 40k-150k TPM]
    D --> D1[Usually 1M-10M TPD]
    
    style A fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

### What This Means for You

**Normal Use: Never Hit Limits**
- Writing documents: ✓
- Research tasks: ✓
- Content creation: ✓

**Might Hit Limits:**
- Processing 100s of documents rapidly
- Running automated workflows
- Solution: Use multiple models

## 1.7 The Integration Advantage

### Traditional Workflow

```mermaid
sequenceDiagram
    participant You
    participant Browser
    participant AI
    participant Document
    
    You->>Browser: Open ChatGPT
    You->>Browser: Type prompt
    Browser->>AI: Send request
    AI->>Browser: Return response
    You->>Browser: Copy response
    You->>Document: Paste & edit
    Note over You,Document: Context lost, manual process
```

### API-Integrated Workflow

```mermaid
sequenceDiagram
    participant You
    participant VSCode
    participant API
    participant Document
    
    You->>VSCode: Select text + prompt
    VSCode->>API: Context + request
    API->>VSCode: Targeted response
    VSCode->>Document: Direct insertion
    Note over You,Document: Context preserved, automated
```

## 1.8 Cost Optimisation Strategies

### Smart Model Selection

```mermaid
graph TD
    Task{Task Type} -->|Complex Analysis| Expensive[GPT-4o/Claude 4 Opus]
    Task -->|Simple Writing| Cheap[GPT-4o-mini/Claude 4 Haiku]
    Task -->|Long Context| Efficient[Gemini 2.0 Pro]
    Task -->|Privacy Sensitive| Free[Local Llama 3.3]

    Expensive --> E1[£0.01-0.03/1k tokens]
    Cheap --> C1[£0.0001-0.001/1k tokens]
    Efficient --> F1[£0.001-0.005/1k tokens]
    Free --> F2[£0.00/1k tokens]
    
    style Cheap fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

### Practical Cost-Saving Tips

1. **Use Appropriate Models**
   - First draft: Cheap model
   - Final polish: Premium model

2. **Optimise Prompts**
   - Be concise but clear
   - Avoid redundant context

3. **Cache Common Responses**
   - Templates for repeated tasks
   - Reuse good outputs

4. **Monitor Usage**
   - Check daily spend
   - Identify expensive operations
   - Adjust accordingly

## 1.9 Provider Comparison

### Quick Decision Matrix

| Need | Best Provider | Model | Why |
|------|---------------|-------|-----|
| Best writing | Anthropic | Claude 4 Opus | Nuanced, natural prose |
| Complex reasoning | OpenAI | o1 | Advanced reasoning capabilities |
| Long documents | Google | Gemini 2.0 Pro | 2M token context window |
| Fast & cheap | OpenAI | GPT-4o-mini | Best value proposition |
| Privacy | Local | Llama 3.3 | Runs on your machine |
| Code generation | Anthropic | Claude 4 Sonnet | Excellent programming |
| Balanced tasks | Anthropic | Claude 4 Sonnet | Speed + capability |

## Key Takeaways

✅ **APIs** are just restaurants where you order AI services  
✅ **Tokens** are the currency (1000 tokens ≈ 750 words)  
✅ **Different models** excel at different tasks  
✅ **Context windows** determine how much AI can process  
✅ **API keys** are your access credentials (keep safe!)  
✅ **Costs are 90% lower** than subscriptions  
✅ **Integration** beats copy-paste every time  

## Mental Model for Success

```mermaid
graph TD
    A[Choose Task] --> B{Complex?}
    B -->|Yes| C[Premium Model]
    B -->|No| D[Efficient Model]
    
    C --> E[Get Quality Result]
    D --> F[Get Fast Result]
    
    E --> G[Happy & Productive]
    F --> G
    
    style G fill:#4fc3f7,stroke:#01579b,stroke-width:3px
```

## Ready for Hands-On?

Now that you understand the concepts, let's set up your multi-model AI command centre. The next chapter will walk you through getting API keys and connecting everything in VS Code.

Remember: This isn't complex—it's just new. Every professional using AI started exactly where you are now.

---

Next: [Chapter 2: Hands-On API Setup](./02_hands_on.md)

[Back to Introduction](./00_introduction.md) | [Back to Module Overview](README.md)
