# Chapter 10: Context Management & Advanced Agent Workflows

Welcome to a deeper exploration of mastering your AI coding assistant! While tools like Claude Code are powerful, unlocking their full potential for complex tasks requires understanding how they process information and how to manage your interactions. This chapter consolidates key insights for advanced workflows, focusing on context, cost, and strategy. Many of these topics are also introduced in [Chapter 6](./06_ai_workflows_roo_code.md#66-context-management-and-cost-control).

## The Core: Context, Tokens, and Costs

The **context window** is the AI's short-term memory, encompassing your current session's discussion and any provided files. This information is broken into **tokens** (roughly, words or parts of words), and models have a token limit. A large or overflowing context can lead to "confusion," forgotten instructions, or irrelevant output.

Crucially, AI usage is often tied to token consumption: **Token Cost is roughly Context Size multiplied by Number of Calls**. Large contexts queried repeatedly escalate costs. Therefore, actively managing your context window is vital.

**Practical cost management in Claude Code:**

*   Use `/fast` for routine questions and quick tasks -- this switches to a faster, cheaper model.
*   Use `/compact` to summarise the conversation when context grows large.
*   Use `/clear` to start fresh when switching to a completely different task.
*   Keep your CLAUDE.md file concise -- it loads into every session.

## Tooling Choices and Interaction Styles

The AI tool you choose impacts your workflow. Claude Code offers high transparency -- you can see what files it reads, what commands it runs, and what changes it proposes before they are applied. More abstracted tools like Cursor may offer a streamlined experience but can obscure details such as which files are being sent to the AI and how context is being managed. Understanding these trade-offs helps you select the right tool for each task.

## Strategic Prompting and Workflow Patterns

Effective AI interaction means providing the *right* information correctly. The **Tree-plus-Docs pattern** is key for code generation or file manipulation: provide a directory tree and relevant file snippets with each significant request. In Claude Code, the tool reads your files directly, but being explicit about what you want modified still leads to better results.

**Invest time in planning before coding.** Refine your initial scaffold prompt and consider using diagrams (e.g., Mermaid class or sequence diagrams) to clarify structure and flow. Upfront planning reduces downstream refactoring and hidden errors.

When interactions become lengthy or AI responses degrade, perform a **context reset.** In Claude Code, use `/compact` to summarise the session, or `/clear` to start fresh. Your CLAUDE.md file ensures project-level knowledge persists across sessions.

If the AI seems off track, use the **debug pattern**: ask "Tell me about this project" and review its summary. This reveals the AI's current understanding, allowing you to correct its course.

## Security Considerations

Remember, sending project context to an AI is sending data to a remote server. Be mindful of what you share:

*   **Use `.gitignore` and file filtering** to keep sensitive files (API keys, credentials, proprietary code) out of the AI's context.
*   **Review privacy policies** for any AI tool you use. Anthropic does not train on API data -- see [anthropic.com/privacy](https://www.anthropic.com/privacy).
*   **MCP (Model Context Protocol) servers** can run locally, keeping some tool interactions on your machine.

By internalising these strategies, your AI assistant can become a true collaborator on complex creative and technical projects.

### Further Reading
*   For Claude Code documentation, visit [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code).
*   For model capabilities and pricing, check [console.anthropic.com](https://console.anthropic.com/) and [aistudio.google.dev](https://aistudio.google.dev/).

---

Next: (This will be updated once the manifest is updated)
