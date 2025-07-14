# 6.a: Limitations of Codex: What It Can't Do (Yet)

Despite its advanced capabilities, Codex is not infallible and has several limitations that users should be aware of. Understanding these limitations is key to setting realistic expectations and using the tool effectively.

*   **Context Window:**
    *   Like all large language models, Codex operates within a finite context window. While models like `gpt-4.1` boast large context capacities (e.g., 1 million tokens have been discussed in relation to some models), extremely large codebases or very long interaction histories can still exceed these limits.
    *   When the context limit is reached, the model may lose track of earlier parts of the conversation or codebase, potentially impacting performance or coherence.
    *   The workshop touched on context management implicitly:
        > "how do you manage caching and um context windows and all that... would you believe me if I told you right now that it all fits in the context window... not the OpenAI repo no but sorry everything that the agent needs... it's a file that the agent knows how to like grab and sad for right and read" - Discussion between Swyx and OpenAI team. This suggests strategies exist but limits are real.
        > "basically the model learns to manage its context and so you when you were talking about like it working in the monor repo it learns how to be like efficient um with the way that it spends its tokens" - Alexander, OpenAI. This points to models becoming better but not infinitely capable.

*   **Complex Domain-Specific Logic:**
    *   Codex may struggle with highly specialised or nuanced business logic that is not well-represented in its vast training data.
    *   Similarly, unclear or ambiguous prompts for complex tasks can lead to suboptimal or incorrect outputs. If the logic is unique to your application and has few public parallels, Codex will need very explicit guidance.

*   **Incomplete or Inaccurate Code:**
    *   Codex can sometimes generate code that is flawed, incomplete, or subtly incorrect, particularly for complex or novel problems.
    *   Models can be "confidently wrong," presenting incorrect information or code with an air of assurance. Rigorous testing and review are essential.

*   **Outdated Knowledge:**
    *   The training data for AI models has a cutoff date (e.g., GPT-4's knowledge was largely based on data up to September 2021, though this gets updated with newer model versions).
    *   Consequently, Codex may not be aware of the very latest libraries, API changes, framework versions, or security vulnerabilities discovered after its last significant training update. It might suggest outdated solutions or use deprecated functions.
    *   Mechanisms like plugins or integrated web search tools (as discussed in [Chapter 5.c](./05_c_the_evolving_toolkit.md)) aim to mitigate this, but it remains a consideration.

*   **Consistency:**
    *   For the same input prompt, Codex might produce different outputs across multiple requests, especially with higher "temperature" settings (which control randomness).
    *   These outputs could vary in style, structure, or the specific idioms used. This can be challenging if strict consistency is required. `AGENTS.MD` files can help enforce some level of stylistic consistency.

*   **Reliability Fluctuations:**
    *   The performance and reliability of AI models can vary. There might be instances where responses are incomplete (e.g., the model "gives up halfway through the response") or where the quality of generation fluctuates over time or between model versions.

*   **No True "Understanding":**
    *   It is crucial to remember that Codex, like other LLMs, does not "understand" code or concepts in a human sense. Its capabilities are based on sophisticated pattern matching and generation from its training data. It doesn't reason from first principles as a human expert would.

*   **Task Length and Complexity Limits (Cloud Agent):**
    *   While the Cloud Agent is designed for longer tasks, there are practical limits. The workshop mentioned:
        > "between 1 to 30 minutes in length um is it is that a hard cut off um have you had it go go for longer... our heart cut off's an hour right now although don't hold us to that it it may change over time um the longest is I've seen two hours when uh in development mode and the model went off the rails... but I think 30 minutes is a great ballpark for the kind of tasks that we're trying to solve" - Josh, OpenAI.
    *   This implies that extremely long or convoluted tasks might still hit operational limits or see diminishing returns.

*   **Perceived Utility:**
    *   The practical value of Codex can be use-case dependent. Some users have reported finding limited relevant applications for complex, real-world projects beyond basic tasks, citing factors like wait times for the cloud agent or the effort required for effective prompting and review.

Being aware of these limitations allows developers to use Codex more strategically, focusing it on tasks where it excels and implementing robust review and testing processes for its outputs.

---

Next: [6.b: Security Implications](./06_b_security_implications.md)