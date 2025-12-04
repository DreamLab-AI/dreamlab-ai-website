# Chapter 1: Understanding the Codex Ecosystem: Cloud Agent vs. CLI

OpenAI Codex manifests primarily in two distinct forms for developers: a cloud-based agent integrated within the ChatGPT interface and a Command Line Interface (CLI) tool. This bifurcation caters to different user preferences and development workflows, offering flexibility in how developers interact with AI for coding tasks. Understanding the characteristics and intended use cases of each is crucial for leveraging Codex effectively.

As Josh from OpenAI mentioned in the workshop, the form factor is a key consideration:
> "I remember actually you know In our interview we ripped on the form factor right should it be CLI the issues with that waiting for it to finish and not be able to interrupt all the time wanting to run it four times 10 times in parallel um and you know at that point I said maybe it should be both and we sort of are you know going for that right now..."

## A. The Codex Cloud Agent (Integrated with ChatGPT)

The Codex cloud agent is accessible via the ChatGPT sidebar, providing a user-friendly interface for interacting with a powerful AI coding assistant. This agent is powered by `codex-1`, a specialised version of OpenAI's `o3` model that has been fine-tuned for software engineering tasks using reinforcement learning on real-world coding challenges. This fine-tuning aims to produce code that aligns closely with human coding preferences and standards, often resulting in cleaner and more reviewable patches than general-purpose models.

Alexander from OpenAI elaborated on the vision for this agent:
> "...this is an agent that is good at like independent software engineering work and like the more we lent into that the more like things started to feel really special... we don't just want it to be co good at code and like we don't just want it to like solve like say like SWEBench tasks... we spent a lot of time like making sure that our model is like great at adhering to instructions uh great at inferring code style so that you don't have to tell it."

**Key features of the cloud agent include:**

*   **Isolated Cloud Sandbox:** Operates within an isolated cloud sandbox environment for each task. This sandbox comes preloaded with the user's specified repository and branch.
*   **File and Command Execution:** Allows the agent to read and edit files, run commands (including test harnesses, linters, and type checkers).
*   **Git Operations:** Manages Git operations like committing changes and proposing pull requests.
*   **Parallel Task Handling:** Can handle multiple tasks in parallel, each within its own micro-VM, ensuring safety and reproducibility.
*   **Real-time Monitoring:** Users can monitor task progress in real-time and review detailed logs, diffs, and test outputs upon completion.

The workshop discussion highlighted the power of this cloud-based approach:
> "maybe we should give the model its own computer um the agent its own computer and then at the same time we were also experimenting with like putting the CLI in like RCI so it could automatically fix tests... and so then we ended up sort of like creating this this uh this project um that is codeex uh which is basically like really the concept of giving uh the agent access to a computer" - Alexander, OpenAI

This integrated environment is designed for tasks that benefit from a rich interactive experience and direct manipulation of a cloud-hosted version of the codebase.

## B. The Codex CLI (Command Line Interface)

For developers who prefer working within their terminal, OpenAI offers the Codex CLI, a lightweight, open-source coding agent. This tool brings chat-driven development capabilities directly to the command line, enabling users to instruct the AI to run code, manipulate files, and iterate on solutions, all while understanding the context of the local repository.

Alexander also touched upon the origins of the CLI:
> "a lot of those those learnings ended up becoming the codec CLI was shipped recently um you know a lot of the work there like you know the the thinking that I'm like most proud of is like enabling things like full auto mode and like when you do that we actually like increase the amount of sandboxing so that's still safe for you"

**Key advantages of the Codex CLI:**

*   **Sandboxed Execution:** Supports execution within a sandboxed environment (macOS: Apple Seatbelt; Linux: Docker recommended) for security and reproducibility, including network restrictions.
*   **Model Flexibility:** While it may default to a model like `o4-mini` or use the specialised `codex-mini-latest`, users can specify other powerful OpenAI models (e.g., `gpt-4.1`) or even models from different providers supporting the OpenAI Chat Completions API.
*   **Multimodal Input:** Supports multimodal input, allowing developers to pass in screenshots or diagrams to guide feature implementation.
*   **Open Source:** Allows for community contributions and greater transparency.

## C. Key Distinctions and Choosing the Right Tool

The choice between the Codex cloud agent and the Codex CLI depends largely on the developer's workflow, the nature of the task, and personal preferences.

Josh from OpenAI framed the cloud agent as more than just a hosted CLI:
> "I think that's a short of it right allowing you to run codeex agents um in OpenAI's cloud um but I think that the form factor like it's a lot more than just where the computer runs right it's um how does this bind to the UI how does this scale out over time um how do you manage uh caching and permissioning and how do you do the collaboration story and so I let me know if you disagree but I think the really is like form factor is the core of it."

Here's a summary of the key distinctions:

| Feature                 | Codex Cloud Agent (ChatGPT)                                  | Codex CLI (Terminal)                                                                 |
| :---------------------- | :----------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Interface**           | Graphical, chat-based within ChatGPT                         | Terminal-based, command-line interaction                                             |
| **Primary Model**       | `codex-1` (specialised `o3` fine-tuned for software engineering) | `codex-mini-latest`, `o4-mini` (default), other GPT/provider models selectable         |
| **Execution Environment** | OpenAI's cloud, clones repo into managed sandbox             | Local machine (sandboxed: Seatbelt/Docker), interacts with local files               |
| **Typical Use Cases**   | Complex, multi-step tasks, deep repo interaction, automated testing in cloud, PR generation | Quick prototyping, code snippets, "recipes", local file manipulation, scripted workflows |
| **Autonomy**            | Designed for more independent, longer-running tasks          | More interactive, often with quicker iterations and approvals                        |
| **Open Source**         | Service                                                      | Yes                                                                                  |

The workshop participants emphasized that these two forms are not mutually exclusive but rather complementary:
> "you really want both modes" - Josh, OpenAI

The cloud agent provides a more holistic, managed environment for complex software engineering tasks, particularly those requiring significant, independent work and integration with cloud-based repository workflows. The CLI, on the other hand, offers a more direct, flexible, and potentially faster tool for developers comfortable with command-line operations and local development iteration. This dual offering allows users to select the tool that best aligns with their immediate task and long-term development style.

---

Next: [Chapter 2: Getting Started](./02_getting_started.md)