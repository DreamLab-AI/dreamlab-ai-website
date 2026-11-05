# 3.a: Effective Prompting Strategies

The quality of output from AI coding agents is heavily dependent on the quality of your input. Whether you are using Claude Code, Codex CLI, or any other tool, developing strong prompting skills is essential.

## Clarity and Specificity

Vague instructions lead to ambiguous or incorrect outputs. Your prompts should be as clear and specific as possible.

*   **Define the action:** Clearly state what you want the agent to do (e.g., "refactor," "generate," "explain," "fix," "add unit tests").
*   **Specify the context:** Mention specific files, functions, or classes. Instead of "fix this code," use:
    > "Refactor the `calculateTotal` function in `billing.js` to use a `for...of` loop instead of `forEach` and ensure it handles empty arrays gracefully."
*   **Outline constraints:** Include requirements, library preferences, version constraints, or patterns to avoid.

## Providing Context

Supply relevant context within the prompt or ensure the agent has access to it through configuration files.

*   **For Claude Code:** The CLAUDE.md file provides persistent project context. Within a session, you can also reference specific files:
    > "Look at src/auth/middleware.ts and add rate limiting. Follow the patterns in src/auth/validator.ts."

*   **For Codex CLI:** The AGENTS.MD file provides project context. Scope your prompts to specific areas:
    > "I'm working in the src/api/ subdirectory. Add input validation to all POST endpoints using Zod schemas."

*   **Error messages:** When fixing bugs, provide the full error message and stack trace.
*   **Desired output:** If you need a specific format, describe it explicitly.

## Iterative Refinement

Complex tasks benefit from being broken down into a sequence of smaller prompts. This "prompt chaining" approach allows for validation at each step.

**Example workflow with Claude Code:**

```
Session 1:
> "Modernise the user service to use async/await instead of callbacks"

> "Now review your changes for potential race conditions or unhandled rejections"

> "Generate unit tests for the refactored user service"

> "Run the tests and fix any failures"
```

**Example workflow with Codex CLI:**

```bash
# Step 1: Refactor
codex "Convert the user service from callbacks to async/await"

# Step 2: Review
codex "Review the user service for race conditions"

# Step 3: Test
codex "Generate unit tests for the user service"
```

## Asking for Reflection

Prompting the agent to review its own output can catch errors and improve quality:

*   "Review the code you just generated. Are there any potential off-by-one errors or unhandled exceptions?"
*   "What edge cases does this implementation miss?"
*   "Is there a simpler way to achieve the same result?"

## The "Abundance Mindset" for Agentic Tools

With terminal agents, particularly those that support parallel execution, a rapid-fire approach to task delegation is often more effective than over-crafting a single prompt:

- Think for 30 seconds about what you want, then send the task
- Let the agent iterate on failures autonomously
- Review the final result rather than micromanaging each step
- Send multiple independent tasks in parallel (Claude Code subagents)

This approach works because agentic tools can:
- Read your codebase for context (you do not need to paste it)
- Run tests to verify their own work
- Iterate on failures without your intervention
- Consult CLAUDE.md/AGENTS.MD for project standards

## Prompting Patterns That Work Well

### The Scoped Task Pattern

```
"In the src/components/Dashboard/ directory, refactor the chart components
to use the new ChartJS v4 API. Keep the same visual output.
Run the existing tests to verify nothing breaks."
```

### The "Fix and Verify" Pattern

```
"Fix the failing test in tests/auth.test.ts. The error is:
[paste error message]
Run the test suite after fixing to confirm it passes."
```

### The "Implement Like This" Pattern

```
"Add a delete endpoint to the posts API. Follow the same patterns
used in src/routes/users.ts for error handling, validation, and response format."
```

### The "Explain Then Implement" Pattern

```
"First, explain how the payment processing flow works in this codebase.
Then, add support for refunds following the same architectural patterns."
```

## Common Pitfalls

*   **Being too vague:** "Make the code better" gives the agent no direction.
*   **Providing too much context:** Pasting entire files when only one function is relevant wastes context window.
*   **Not specifying the tech stack:** "Add tests" is ambiguous. "Add Vitest unit tests using Testing Library" is actionable.
*   **Ignoring the agent's questions:** If the agent asks for clarification, answer it rather than repeating the original prompt.
*   **Not reviewing output:** Always examine diffs and test results before accepting changes.

Mastering these prompting strategies transforms your interaction with AI coding agents from a simple command-response exchange into a nuanced dialogue that produces consistently high-quality results.

---

Next: [3.b: CLAUDE.md and AGENTS.MD Configuration](./03_b_the_crucial_role_of_agents_md.md)
