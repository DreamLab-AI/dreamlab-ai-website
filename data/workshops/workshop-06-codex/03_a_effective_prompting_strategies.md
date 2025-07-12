# 3.a: Effective Prompting Strategies

The quality of output from Codex, much like other large language models, is heavily dependent on the quality of the input prompt. Developing strong prompting skills is therefore essential for getting the best results. The workshop discussion touched on this, with one participant noting the tendency to "just prompt it and trust the model." While trust is part of the process, effective prompting guides that trust.

## Clarity and Specificity

Vague instructions can lead to ambiguous or incorrect outputs. Your prompts should be as clear and specific as possible.

*   **Define the Action:** Clearly state what you want Codex to do (e.g., "refactor," "generate," "explain," "fix," "add unit tests").
*   **Specify the Context:** Mention the specific file(s), function(s), or class(es) involved. For example, instead of "fix this code," a more effective prompt would be:
    > "Refactor the `calculateTotal` function in `billing.js` to use a `for...of` loop instead of `forEach` and ensure it handles empty arrays gracefully."
*   **Outline Constraints:** If there are any specific requirements, libraries to use, versions to adhere to, or patterns to avoid, include them in the prompt.

## Providing Context

Supply relevant context within the prompt or ensure the agent has access to it.

*   **Code Snippets:** Include snippets of existing code if relevant.
*   **Error Messages:** If fixing a bug, provide the full error message and stack trace.
*   **Desired Output Formats:** If you need output in a specific format (e.g., JSON with certain keys, a Markdown table), describe it.
*   **Implicit Context (Cloud Agent):** For the Codex cloud agent, the connected repository provides a lot of implicit context. However, explicitly mentioning key files or modules in your prompt can still help focus its attention.
*   **Scoping (CLI):** As mentioned in the workshop:
    > "a lot of my prompts start with like I'm working in this subdirectory um here's what I like to accomplish right can you please um do it for me um and so giving that guidance at scoping uh helps" - Josh, OpenAI

The more context Codex has, the better it can tailor its response to your specific situation.

## Iterative Refinement (Multi-Prompt/Prompt Chaining)

Complex tasks often benefit from being broken down into a sequence of smaller, more manageable prompts. This "prompt chaining" or multi-pass approach allows for iterative refinement and validation at each step.

*   **Example Workflow:**
    1.  Ask Codex to modernise a piece of code.
    2.  In a subsequent prompt, ask it to review its own output for logical errors or edge cases.
    3.  Finally, ask it to generate unit tests for the refined code.
*   This structured interaction can yield more accurate and robust results than a single, overly complex prompt.

## Asking for Reflection/Self-Correction

Prompting techniques like "reflexion," where the AI is asked to review its own response or explain "why it was wrong," can improve accuracy and help mitigate issues like hallucinations or logical errors. This encourages a form of self-correction within the model's generation process.

*   Example: "Review the Python code you just generated. Are there any potential off-by-one errors or unhandled exceptions?"

## Abundance Mindset in Prompting

An interesting point from the workshop was about the "abundance mindset" when using the cloud agent:
> "the way we see people who like love codeex the most using it is they don't they think for like maybe 30 seconds max about their prompt it's just like oh I have this idea like boom oh there's this thing I want to do like boom oh like I just saw this bug or like this customer feedback thing like and you just send it off." - Alexander, OpenAI

This suggests that for certain workflows, especially with the cloud agent designed for longer, more autonomous tasks, rapid-fire prompting for multiple independent tasks can be very effective, rather than over-crafting a single prompt for a single computer session.

Mastering these prompting strategies transforms your interaction with Codex from a simple command-response exchange into a more nuanced dialogue, enabling you to guide the AI more effectively towards your desired outcomes. This skill is becoming increasingly valuable as AI tools become more integrated into development workflows.

---

Next: [3.b: The Crucial Role of AGENTS.MD](./03_b_the_crucial_role_of_agents_md.md)