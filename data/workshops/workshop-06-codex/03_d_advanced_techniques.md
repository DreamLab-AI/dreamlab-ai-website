# 3.d: Advanced Techniques

Beyond basic prompting and task management, several advanced techniques can enhance the utility of Codex, particularly the CLI, and provide a deeper understanding of the underlying AI technology.

## CLI for Automation and Recipes

The Codex CLI is well-suited for automation and leveraging pre-defined "recipes" for common tasks.

*   **Non-Interactive Mode:** The CLI can be run in non-interactive or "quiet" mode (often using flags like `-q` or `--quiet`, check `codex --help` for specifics). This makes it suitable for integration into:
    *   CI/CD (Continuous Integration/Continuous Deployment) pipelines.
    *   Git hooks (e.g., pre-commit hooks to format code or run linters).
    *   Other automated scripts and workflows.
*   **Recipes:** The CLI supports "recipes," which are essentially pre-defined, reusable prompts tailored for common developer tasks. Examples include:
    *   Refactoring components (e.g., `codex "Refactor the Dashboard component in src/components/Dashboard.jsx to use React Hooks instead of class components."`)
    *   Generating SQL migrations (e.g., `codex "Generate a SQL migration using SQLAlchemy to add an 'email_verified' boolean column to the 'users' table."`)
    *   Writing unit tests for specific files or functions.
    *   Bulk-renaming files and updating their imports/usages across a project.
    *   Explaining complex regular expressions.
    *   Proposing impactful Pull Requests based on an analysis of the repository.
    *   Finding potential security vulnerabilities.

## Model Selection with CLI

A significant advantage of the Codex CLI is its flexibility in model selection.
*   **`--model` Flag:** Use the `--model` flag to specify different OpenAI models (e.g., `gpt-4.1`, `o4-mini`) or even models from other providers that support the OpenAI Chat Completions API.
    ```bash
    codex --model gpt-4.1 "Translate this Python function to idiomatic Rust."
    ```
*   **Experimentation:** This allows for experimentation to find the best model for specific tasks, balancing capability, speed, and cost. Different models have varying strengths in reasoning, code generation quality, and context window size. (More on model choices in [Chapter 5.b: Understanding Model Choices](./05_b_understanding_model_choices.md)).

## Multimodal Input (CLI)

A powerful, emerging feature of the Codex CLI is its ability to accept multimodal inputs.
*   **Visual Guidance:** Developers can pass in screenshots (e.g., of a UI mockup) or diagrams (e.g., a flowchart of desired logic) to guide the AI in implementing features or UI elements.
*   **Example:**
    ```bash
    codex "Implement an HTML and CSS structure that looks like this: [path/to/screenshot.png]"
    ```
    (The exact syntax for passing images may vary; consult the CLI's documentation.)
*   The workshop mentioned this as a key area of development:
    > "multimmodal inputs um you know we've we've tal Yeah that right yeah like another another example would be like you know just giving it a little bit more access to the world" - Alexander, OpenAI (though this quote also touches on network access, the multimodal aspect is relevant for advanced CLI use).

## Understanding Fine-tuning (General OpenAI Concept)

While end-users typically do not fine-tune the core `codex-1` model (powering the Cloud Agent) directly, understanding the principles of fine-tuning provides crucial context on how specialised models like Codex are created and optimised.

*   **What is Fine-tuning?** Fine-tuning involves taking a base pre-trained OpenAI model (like GPT-3 or GPT-4) and further training it on a smaller, domain-specific dataset of example prompts and their corresponding ideal outputs. This dataset is usually provided in JSONL (JSON Lines) format.
*   **Purpose:** This process enhances the model's performance for specific tasks, styles, or domains, making it more aligned with particular needs. For example, `codex-1` is fine-tuned for software engineering tasks.
*   **Dataset Size:** OpenAI generally recommends starting with 50-100 high-quality examples to see noticeable improvements, although the minimum is around 10. More data typically leads to better results.
*   **Platforms:** Platforms like Azure AI Studio (formerly Azure AI Foundry) provide interfaces and tools for fine-tuning OpenAI models.
*   **Relevance to Codex Users:** This knowledge is more for a "hero" level understanding of AI model specialisation rather than a daily operational task for most Codex users. It helps appreciate why specialised models like `codex-1` or `codex-mini-latest` might perform better on coding tasks than general-purpose models out-of-the-box.

The adoption of these advanced techniques and AI-specific development patterns—such as sophisticated prompt engineering, structured guidance via `AGENTS.MD`, leveraging CLI recipes, utilising multimodal inputs, and understanding the implications of model specialisation—marks a shift in development methodologies. Mastering these new patterns is key to unlocking the full potential of AI coding assistants like Codex.

---

Next: [Chapter 4: Practical Codex](./04_practical_codex.md)