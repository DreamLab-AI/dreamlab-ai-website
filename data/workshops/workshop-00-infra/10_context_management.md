# Chapter 10: Context Management & Advanced Agent Workflows

Welcome to a deeper exploration of mastering your AI coding assistant! While tools like Roo Code are powerful, unlocking their full potential for complex tasks requires understanding how they process information and how to manage your interactions. This chapter consolidates key insights for advanced workflows, focusing on context, cost, and strategy, many of which are also discussed in [Applied Best Practices in § 6.5](./06_ai_workflows_roo_code.md#65-context-windows-cost--tool-comparison).

## The Core: Context, Tokens, and Costs

The **context window** is the AI's short-term memory, encompassing your current session's discussion and any provided files (Insight 1). This information is broken into **tokens** (roughly, words/parts of words), and models have a token limit. A large or overflowing context can lead to "confusion," forgotten instructions, or irrelevant output.

Crucially, AI usage is often tied to token consumption: **Token Cost ≈ Context Size × Number of Calls** (Insight 9). Large contexts queried repeatedly escalate costs. Therefore, actively monitoring the context window (e.g., Roo Code's "context bar") and token costs is vital.

A **two-profile model strategy** in Roo Code helps manage this (Insight 2): a rate-limited (slower, cheaper/free) profile for routine tasks, and an "unleashed" profile with a powerful model (no rate limits) for intensive bursts of creativity, carefully monitoring costs. This balances capability with cost-effectiveness.

## Tooling Choices and Interaction Styles

The AI tool you choose impacts your workflow. Roo Code (with your own API key) versus a more abstracted tool like Cursor highlights differences in transparency (Insight 3). Roo Code typically shows context and direct costs, with plain prompts. Cursor might offer a streamlined experience but can obscure details like hidden RAG or pre-prompts, making behaviour and spend less transparent. Understanding these trade-offs helps you select appropriately.

Roo Code's **Ask, Code, and Architect modes** function as **permission presets with small, focused pre-prompts** (Insight 5). This is often preferable to tools with large system prompts, keeping you "closer to the metal" for more direct control.

## Strategic Prompting and Workflow Patterns

Effective AI interaction means providing the *right* information correctly. The **Tree-plus-Docs pattern** is key for code generation or file manipulation (Insight 4): provide a directory tree (`tree` command output) and relevant file snippets with each significant request. This narrow, deterministic approach minimises hallucinations and ensures the AI uses current information.

**Invest time in planning before coding** (Insight 6). Refine your initial scaffold prompt and consider using diagrams (e.g., Mermaid class/sequence diagrams) to clarify structure and flow. Upfront planning reduces downstream refactoring and hidden errors.

When interactions become lengthy or AI responses degrade, perform a **manual reset or summary** (Insight 8). Don't let context grow indefinitely; consider a reset when the context is about one-third full. Ask the AI to summarise the session, then start a new one with that summary as the initial context.

If the AI seems off track, use the **debug pattern**: "Tell me about this project" (Insight 10), providing the file tree and key document snippets. The AI's summary reveals its understanding, allowing you to correct its course.

## Security Considerations

Remember, sending project context to an AI is sending data. Using **local MCP (Model Control Protocol) servers, or none if using a direct API key, is good security practice** (Insight 7). Be cautious about sending sensitive information to unknown third-party AI endpoints.

By internalising these strategies, your AI assistant can become a true collaborator on complex creative and technical projects.

### Further Reading
*   For model capabilities and costs, see the [Google Gemini Pricing Page](URL_PLACEHOLDER_GEMINI_PRICING).
*   For Roo Code features, visit the [Roo Code Documentation](URL_PLACEHOLDER_ROO_CODE_DOCS).

---

Next: (This will be updated once the manifest is updated)