# 5.b: Understanding Model Choices

The effectiveness of AI-assisted coding can vary significantly based on the underlying model used. Both the Codex Cloud Agent and the Codex CLI leverage specific models, and the CLI offers the flexibility to choose from a broader range.

## Specialised Codex Models

OpenAI has developed models specifically optimised for coding tasks, which power the core Codex experiences.

*   **`codex-1`**:
    *   **Powers:** Codex Cloud Agent (within ChatGPT).
    *   **Architecture:** A version of OpenAI's `o3` architecture.
    *   **Optimisation:** Specifically fine-tuned for software engineering tasks through reinforcement learning on real-world coding assignments and human feedback.
    *   **Strengths:** Designed to generate code that aligns with human style and pull request preferences. It can iteratively run tests until a passing result is achieved. Benchmarks indicate `codex-1` outperforms `o3-high` on tasks like SWE-Bench Verified and internal OpenAI software engineering challenges.
    *   The workshop discussion emphasized this deep training:
        > "a lot of what we've done with with codeex one is basically give it its first few years of job experience uh and like that's effectively what the training is right so that it just it kind of knows more of these things and like if you think about it like a PR description is an classic example of that like writing a good PR description" - Alexander, OpenAI

*   **`codex-mini-latest`**:
    *   **Optimised for:** Codex CLI.
    *   **Characteristics:** Described as a fast reasoning model specifically tailored for the interactive and potentially more rapid tasks common in a terminal environment.

## General Purpose Models Available via CLI

The Codex CLI allows users to select other OpenAI models or even models from different providers using the `--model` flag.

*   **`o4-mini`**:
    *   **Often Default for:** Codex CLI.
    *   **Positioning:** A faster and more affordable reasoning model from OpenAI's `o` series (presumably `o4` or `o4.x` family).

*   **`gpt-4o` and `o1` series**:
    *   **Availability:** Can be specified in the Codex CLI.
    *   **Strengths:** Current flagship OpenAI models known for handling complex tasks, with notable enhancements in code generation, interpretation, and debugging capabilities. `gpt-4o` provides excellent balanced performance, while `o1` offers advanced reasoning for complex problem-solving. Both are commonly used in ChatGPT Plus for coding tasks.
    *   The workshop mentioned the impact of such models:
        > "recently we released GPT 4.1 like really good coding model and again that was like based on like working we were like hey we want to invest better in this area let's hang out with a bunch of developers understand their feedback how things work um you know create some evals and you know like you said this is like it's a lot of work to do that um but then we end up with a great model" - Alexander, OpenAI
    *   Note: OpenAI continues to improve their models, with o1 representing the latest advancement in reasoning capabilities for coding tasks.

## Considerations for Model Selection (Primarily for CLI)

When using the Codex CLI, which offers model choice, consider the following:

*   **Task Complexity:** More complex tasks might benefit from more powerful (and potentially more expensive) models like `gpt-4.1`. Simpler tasks or quick iterations might be well-served by `o4-mini` or `codex-mini-latest`.
*   **Speed vs. Capability:** Faster models like `o4-mini` might provide quicker responses, which is ideal for interactive CLI use. More capable models might take longer but produce more nuanced or accurate results.
*   **Cost:** Different models have different pricing structures. For frequent use or automated tasks, cost can be a significant factor.
*   **Specific Strengths:**
    *   Specialised models (`codex-1`, `codex-mini-latest`) are fine-tuned for coding nuances, potentially leading to better adherence to coding styles or more idiomatic code for their intended tools.
    *   General models (`gpt-4.1`) offer broader reasoning power and a vast knowledge base, which might be advantageous for tasks requiring understanding of diverse concepts or less common libraries.
*   **Context Window:** More advanced models often have larger context windows, allowing them to consider more surrounding code or longer conversation histories, which can be crucial for complex tasks.
*   **Fluctuations:** Model capabilities can evolve, and performance might fluctuate over time due to updates or changes in training. It's good practice to occasionally re-evaluate if the chosen model still best fits your needs.

The workshop highlighted the philosophy of continuous model improvement:
> "the model isn't all the product but the model is the product right and you kind of like need to have this kind of like humility um in terms of like thinking about like okay well what are the things that like we there's like three parties right there's the user the developer and like the model maybe right what are the things that the user like just needs to decide up front and then what are the things that like we the developer are going to be able to decide better than the model and then what are the things that the model can is decide best" - Alexander, OpenAI

The existence of specialised models for the Cloud Agent and CLI, alongside the CLI's flexibility, underscores a key trade-off: **specialised optimisation vs. general capability.** Advanced users, particularly with the CLI, will benefit from understanding these distinctions and selecting models based on specific task requirements, desired performance characteristics, and cost. The "best" model is often context-dependent.

---

Next: [5.c: The Evolving Toolkit: New OpenAI APIs](./05_c_the_evolving_toolkit.md)