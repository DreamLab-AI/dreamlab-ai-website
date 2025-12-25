# 3.c: Managing Tasks Efficiently (Cloud Agent & CLI)

Efficient task management is key to maximising productivity with Codex, whether you're using the Cloud Agent or the CLI. This involves breaking down work, understanding how the agents handle tasks, and effectively reviewing their output.

## Breaking Down Large Work

Decompose large or complex features into smaller, incremental tasks or pull requests.
*   **Easier for Codex:** Smaller, well-defined tasks are generally easier for the AI to understand and execute accurately.
*   **Simplified Review:** Reviewing smaller chunks of changes is more manageable for human developers.
*   **Iterative Progress:** Allows for iterative development and course correction if needed.

## Parallel Execution (Cloud Agent)

The Codex cloud agent allows users to launch multiple tasks simultaneously.
*   **Isolated Micro-VMs:** Each task runs in its own isolated micro-VM.
*   **Dashboard Monitoring:** Progress for all active tasks can be monitored on a central dashboard in ChatGPT.
*   **Use Cases:** Particularly useful for tackling several unrelated fixes, improvements, or feature experiments at once.

The workshop discussion highlighted this as a key benefit:
> "it is so so like long term we actually don't want you to have to think about if you're like delegating or like pairing with AI... you just talk to it and it just does stuff... but in the near term like yeah this is a tool you delegate to and um the way to use it that we see... it's like you must have an abundance mindset... often when something a model is going to work on your computer and agent's going to work on your computer you'll like really craft the the prompt because you know then it's it's going to use your computer for a while... but the way we see people who like love codeex the most using it is they don't they think for like maybe 30 seconds max about their prompt... and you just send it off and so yeah like the more you're running in parallel actually I think the I mean the happier we are" - Alexander, OpenAI

## Reviewing Results

Thoroughly review the outputs from Codex. Never blindly trust AI-generated code.

*   **Cloud Agent Indicators:**
    *   Successful tasks are often indicated by green checkmarks (signifying passing tests, if applicable).
    *   Click on a task card to view:
        *   The generated diff (code changes).
        *   The AI's explanation of its work.
        *   A full work-log including terminal outputs and test results.
    *   The workshop described this feedback loop:
        > "perhaps my favorite thing is actually the way we handle testing so the model will attempt to test its change um and then it will tell you in this like really nice way with just like a checkbox kind of thing whether or not those tests passed and again it will cite if the test passed like a deterministic reference to the log so you can like read it and be like okay I know that this test passed right or if the test failed it'll be like hey like I this didn't work i feel like you need to install like PNPM or whatever and you can like read the log and like see what it is" - Alexander, OpenAI

*   **Both Cloud Agent and CLI:**
    *   Always examine the generated code differences (diffs).
    *   Review terminal logs.
    *   Check test outputs to verify correctness and understand the changes made by the agent.

## Iterating or Merging

Based on your review:

*   **Open a Pull Request:** If the changes are satisfactory, instruct the agent (Cloud Agent) or manually (CLI) create a pull request to integrate the changes.
*   **Request Modifications:** Respond to the agent with follow-up comments or instructions to request additional modifications, corrections, or clarifications. This iterative feedback loop is crucial.

## CLI Approval Modes

The Codex CLI offers different approval modes to control the agent's autonomy:

1.  **`Suggest` (default):**
    *   Reads files and suggests changes.
    *   Requires manual application of the suggested patches. This is the safest mode for initial use.
2.  **`Auto Edit`:**
    *   Reads files and automatically applies patches to your local files.
3.  **`Full Auto`:**
    *   Reads/writes files and executes shell commands.
    *   **Safety Measures:** In this mode, commands are run network-disabled and directory-sandboxed for safety. A warning is shown if the directory is not tracked by Git, providing an additional safety net.
    *   The workshop highlighted the careful thought behind this:
        > "enabling things like full auto mode and like when you do that we actually like increase the amount of sandboxing so that's still safe for you" - Alexander, OpenAI

## Handing Off Blockers

If a developer is stuck on a particular problem or bug:
1.  Create a new branch in Git.
2.  Describe the issue clearly to Codex.
3.  Ask it to propose fixes or alternative approaches. This can be a great way to get "unstuck" or explore different solutions.

## Launching Slow Jobs First

For time-consuming operations like full repository test runs or comprehensive linting passes:
*   Initiate these tasks early (e.g., at the start of the workday or before a break).
*   Review the results later. This is particularly effective with the Cloud Agent's parallel execution capabilities.

By employing these task management strategies, you can work more effectively with Codex, leveraging its strengths while maintaining control and ensuring the quality of the output.

---

Next: [3.d: Advanced Techniques](./03_d_advanced_techniques.md)