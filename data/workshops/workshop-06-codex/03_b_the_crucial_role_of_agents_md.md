# 3.b: The Crucial Role of AGENTS.MD

For both the Codex cloud agent and the Codex CLI, `AGENTS.MD` files serve as a powerful mechanism for providing persistent, repository-specific instructions to the AI. These Markdown files act as a "developer manual for AI teammates," guiding how Codex should navigate the codebase, which commands to run for testing and linting, and how to adhere to project standards.

The workshop discussion heavily emphasized the importance and utility of `AGENTS.MD`:
> "agents.md and um like we put a lot of effort into making sure the agent like understand this hierarchy of instructions right you can put them in subdirectories and it'll understand which ones take presence over um which others" - Josh, OpenAI

## Purpose and Content

The primary purpose of `AGENTS.MD` is to inform Codex about project-specific conventions and requirements. It's a way to encode "tribal knowledge" and project standards into a machine-readable format.

**Common content includes:**

*   **Code Style:**
    *   Preferred formatting (e.g., "Use Black for Python formatting," "Use Prettier for JavaScript/TypeScript formatting. Run `npx prettier --write`.")
    *   Naming conventions (e.g., "Avoid abbreviations in variable names," "Variable names should be in camelCase.")
    *   Commenting standards (e.g., "Add JSDoc comments for all public functions.")
*   **Testing Procedures:**
    *   Commands to run tests (e.g., "Run `pytest tests/` before finalizing a PR," "Run `npm test` to execute all tests.")
    *   Requirements for test coverage (e.g., "All new features must include unit tests using Jest," "Ensure test coverage does not decrease.")
    *   Mocking strategies (e.g., "Mock all external API calls in tests. Use `msw` for mocking.")
*   **Pull Request (PR) Instructions:**
    *   Templates for PR titles and messages (e.g., "PR titles must follow the format: `<type>: Brief description`").
    *   Required sections in PR body (e.g., "Include a one-line summary and a 'Testing Done' section," "PR body must include: Summary of changes, How to test, Any relevant issue numbers.").
    *   The workshop highlighted how Codex can be trained for this: "some of the other stuff we started to train was like PR descriptions like let's really nail this idea of like a good concise PR description that like highlights the relevant things so our model will actually write like a nice short PR description with like a PR title that like adheres to your like you know repo format we have a way to prompt that more if you want with agents.mmd" - Alexander, OpenAI.
*   **Forbidden Actions:**
    *   Directives on what the agent should *not* do (e.g., "Never call `npm install` directly," "Never enable network during tests," "Do not commit directly to the `main` or `develop` branches," "Do not introduce new dependencies without prior approval noted in the task," "Never disable linting or type-checking rules," "Do not write to `src/generated/` directory by hand.").
*   **Codebase Specifics:**
    *   Information about parts of the codebase being migrated or requiring special attention.
*   **Presentation of Work:**
    *   How the agent should present its work (e.g., when to write documentation).
*   **General Instructions:**
    *   Guidance on refactoring (e.g., "When refactoring, prioritize readability and maintainability.").
    *   Instructions for UI changes (e.g., "If a task involves UI changes, describe the visual impact if possible.").
    *   Logging requirements (e.g., "Log failing commands and their output for review.").

Alexander from OpenAI suggested starting simple:
> "I would start simple and not try to overdo it and like a simple agent MD will get you a long way rather than no agents MD... it's more of like you learn over time right what we would really like to do is autogenerate this at some point for you based on the PRs you create and the feedback you give"

## Structure

`AGENTS.MD` is a standard Markdown file. While the exact structure can vary, a common approach is to use headings for different categories of instructions (e.g., `# Code Style`, `# Testing`, `# PR Instructions`).

## Hierarchy and Merging

Codex tools look for `AGENTS.MD` files in a specific hierarchical order and merge their contents, with more specific files overriding more general ones. This cascading system provides flexibility in managing configurations.

**Typical lookup order:**

1.  **`~/.codex/AGENTS.MD`** (or `~/.codex/instructions.md`): Personal, global guidance applicable across all projects.
2.  **`AGENTS.MD` at the repository root:** Shared project-wide notes and rules.
3.  **`AGENTS.MD` in the current working directory (or sub-folder):** Specific instructions for a particular component or feature.

This allows for global defaults, project-level standards, and fine-grained control for specific parts of a codebase.

## Why `AGENTS.MD` and not `README.MD` or a Branded Name?

The workshop provided insight into the naming choice:

*   **Specificity for Agents:**
    > "probably there's things that you want to tell an agent that you don't need to tell a contributor and similarly there's things you want to tell contributors... that you don't need to tell the agent... so we kind of made that decision [to have a separate file]" - Alexander, OpenAI
    > "for agents I don't think you have really had to tell it a code style it it looks at your codebase and just writes code that's consistent to that um whereas like a human's not going to take its time... to go through the codebase and uh you know follow all the conventions" - Josh, OpenAI
*   **Avoiding Namespace Clutter / Promoting Openness:**
    > "we just think it kind of sucks if you have to like create like all these different agents and whatever you know is like part of why we made the codeex CCLI open source... so that's why we went for like a non-branded uh name [`AGENTS.MD`]" - Alexander, OpenAI

The goal is to have a common, non-proprietary way to instruct AI agents, regardless of the specific model or vendor.

## Example `AGENTS.MD` Structure

```markdown
# AGENTS.MD - Project-Specific Guidance for Codex

## Code Style
- Use Prettier for JavaScript/TypeScript formatting. Run `npx prettier --write .`
- Variable names should be in camelCase.
- Add JSDoc comments for all public functions.

## Testing
- All new features must include unit tests using Jest.
- Run `npm test` to execute all tests. All tests must pass before proposing a PR.
- Ensure test coverage does not decrease.
- Mock all external API calls in tests. Use `msw` for mocking.

## PR Instructions
- PR titles must follow the format: `<type>(<scope>): <subject>` (e.g., `feat(api): Add user authentication endpoint`).
- PR body must include:
  - Summary of changes.
  - How to test.
  - Any relevant issue numbers.

## Forbidden Actions
- Do not commit directly to the `main` or `develop` branches.
- Do not introduce new dependencies without prior approval noted in the task.
- Never disable linting or type-checking rules.
- Do not write to `src/generated/` directory by hand.

## General Instructions
- When refactoring, prioritize readability and maintainability.
- If a task involves UI changes, describe the visual impact if possible.
- Log failing commands and their output for review.
```

The use of `AGENTS.MD` files represents a significant step in formalising the interaction between human developers and AI coding assistants. It compels teams to explicitly document their development standards, which not only guides the AI effectively but can also improve consistency among human developers and serve as a valuable onboarding resource.

---

Next: [3.c: Managing Tasks Efficiently](./03_c_managing_tasks_efficiently.md)