# Chapter 9: Context Management & Advanced Agent Workflows

Welcome to a deeper exploration of mastering your AI coding assistant! While tools like Claude Code are powerful, unlocking their full potential for complex tasks requires understanding how they process information and how to manage your interactions. This chapter consolidates key insights for advanced workflows, focusing on context, cost, and strategy.

## The Core: Context, Tokens, and Costs

The **context window** is the AI's short-term memory, encompassing your current session's discussion and any provided files. This information is broken into **tokens** (roughly, words or parts of words), and models have a token limit. A large or overflowing context can lead to "confusion," forgotten instructions, or irrelevant output.

Crucially, AI usage is often tied to token consumption: **Token Cost is roughly Context Size multiplied by Number of Calls**. Large contexts queried repeatedly escalate costs. Therefore, actively managing the context window is vital.

**Practical cost management in Claude Code:**

*   Use `/fast` for routine questions and quick tasks -- this switches to a faster, cheaper model.
*   Use `/compact` to summarise the conversation when context grows large.
*   Use `/clear` to start fresh when switching to a completely different task.
*   Keep your CLAUDE.md file concise -- it is loaded into every session, so bloated project files eat into your context budget.

## Tooling Choices and Interaction Styles

The AI tool you choose impacts your workflow. Understanding the differences helps you select appropriately:

| Feature | Claude Code | GitHub Copilot | Cursor |
|---------|------------|----------------|--------|
| **How it works** | Terminal agent; reads/writes files, runs commands | Inline suggestions + chat sidebar | Full editor with AI built in |
| **Context** | Reads your whole project; you control what is shared | Analyses open files and nearby code | Indexes your entire codebase |
| **Cost visibility** | Token usage shown; `/fast` for cheaper model | Subscription-based (flat rate) | Subscription-based (flat rate) |
| **Transparency** | High -- you see what it reads and writes | Moderate | Moderate |
| **Best for** | Complex, multi-file tasks | Quick completions while typing | Immersive AI-first editing |

Claude Code's **CLAUDE.md file** and **slash commands** give you direct control over context and behaviour. This transparency is beneficial for learning the nuances of AI interaction and managing costs.

## Strategic Prompting and Workflow Patterns

Effective AI interaction means providing the *right* information correctly.

### The Tree-plus-Docs Pattern

For code generation or file manipulation, provide a directory tree and relevant file snippets with each significant request. This narrow, deterministic approach minimises hallucinations and ensures the AI uses current information.

In Claude Code, you rarely need to do this manually -- it reads your files directly. But for complex requests, being explicit helps:

```
> Here is my current project structure. I want you to add a
  contact form page that follows the same patterns as about.html.
  The form should submit to Formspree.
```

### Invest Time in Planning

Refine your initial scaffold prompt and consider using diagrams (e.g., Mermaid class or sequence diagrams) to clarify structure and flow before asking the AI to generate code. Upfront planning reduces downstream refactoring.

### The Reset Pattern

When interactions become lengthy or AI responses degrade:

1. Use `/compact` to summarise the conversation
2. Or use `/clear` and start a fresh session
3. Key project knowledge persists in your CLAUDE.md file, so you do not lose context between sessions

As a rule of thumb, consider a reset when you notice the AI repeating itself, forgetting earlier instructions, or producing less relevant output.

### The Debug Pattern

If the AI seems off track, ask it to explain its understanding:

```
> Tell me about this project -- what files exist and what is the
  overall structure?
```

The AI's summary reveals its current "mental model," allowing you to correct misunderstandings or provide better context.

## Security Considerations

Remember, sending project context to an AI is sending data to a remote server.

*   **Claude Code's approach:** Your code is sent to Anthropic's servers for processing. Anthropic does not train on API data. Review [Anthropic's privacy policy](https://www.anthropic.com/privacy) for details.
*   **Be cautious** about sending sensitive information (API keys, passwords, proprietary algorithms) to any AI tool. Use `.gitignore` and Claude Code's built-in file filtering to exclude sensitive files.
*   **MCP (Model Context Protocol) servers** can run locally, keeping some tool interactions on your machine rather than sending everything to the cloud.

By internalising these strategies, your AI assistant can become a true collaborator on complex creative and technical projects.

## PromptCode: Bridging Codebase and AI

When your AI coding agent needs help with a particularly complex task, or when you want to use a different AI model, PromptCode offers a structured way to bridge the gap between your codebase and any AI:

*   Select specific files as context for your prompts
*   Add custom instructions or use prompt templates for clarity
*   Work with any AI model, including those accessed via web interfaces

Tailor PromptCode to your needs with these options:

*   **Ignore Patterns:** Define which files to skip when selecting context (e.g., `node_modules/` or `.git/`).
*   **Prompt Folders:** Point to directories housing your custom prompt templates for quick access.

### Installation

You can install the PromptCode extension from the Visual Studio Code marketplace.

### Further Reading
*   For Claude Code documentation, visit [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code).
*   For model capabilities, check [console.anthropic.com](https://console.anthropic.com/) and [aistudio.google.dev](https://aistudio.google.dev/).

---

This concludes the main content of the tutorial. Happy coding and collaborating!
