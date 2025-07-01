# 8. Contribution Guidelines

We welcome contributions to the Workshop Builder project! Whether you're fixing a bug, adding a new feature, improving documentation, or enhancing agent capabilities, your help is appreciated.

## Getting Started

1.  **Fork the Repository:** Start by forking the main Workshop Builder repository to your own GitHub account.
2.  **Clone Your Fork:** Clone your forked repository to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/workshop-builder.git 
    # Replace YOUR_USERNAME with your GitHub username
    cd workshop-builder
    ```
3.  **Set Up Upstream Remote:** Add the original repository as the "upstream" remote to keep your fork synced.
    ```bash
    git remote add upstream https://github.com/ORIGINAL_OWNER/workshop-builder.git 
    # Replace ORIGINAL_OWNER with the actual owner of the main repository
    ```
4.  **Create a Virtual Environment and Install Dependencies:** Follow the [Installation and Setup](./02_installation_setup.md) guide to set up your development environment.
5.  **Create a New Branch:** For any new feature or bug fix, create a new branch from the latest `main` (or `develop` if that's the primary development branch).
    ```bash
    git checkout main
    git pull upstream main
    git checkout -b your-feature-branch-name 
    # e.g., fix/git-agent-pr-template or feat/add-claude-research-agent
    ```

## Development Workflow

1.  **Make Your Changes:** Implement your feature or bug fix.
    *   **Code Style:** Try to follow the existing code style (PEP 8 for Python). Consider using a linter/formatter like Black or Flake8.
    *   **Testing:**
        *   Add unit tests for new functionality, especially for agent logic. Place tests in the `workshop-builder/tests/` directory, mirroring the structure of the module being tested (e.g., `tests/test_compiler_agent.py`).
        *   Ensure existing tests pass after your changes (`python -m unittest discover workshop-builder/tests` or similar).
    *   **Documentation:**
        *   Update any relevant documentation in `workshop-builder/docs/` if you're changing user-facing behavior, CLI options, or architectural components.
        *   Add comments to your code where necessary.
2.  **Commit Your Changes:** Make clear, concise commit messages.
    ```bash
    git add .
    git commit -m "feat: Add support for custom Jinja2 template directory"
    ```
3.  **Keep Your Branch Synced:** Regularly rebase your feature branch on the upstream `main` branch to incorporate the latest changes and avoid complex merge conflicts later.
    ```bash
    git fetch upstream
    git rebase upstream/main
    ```
4.  **Push Your Branch:** Push your feature branch to your fork on GitHub.
    ```bash
    git push origin your-feature-branch-name
    ```
5.  **Open a Pull Request (PR):**
    *   Go to your fork on GitHub and click the "New pull request" button.
    *   Ensure the base repository and branch are set to the original repository's `main` branch, and the head repository and branch are your fork and feature branch.
    *   Provide a clear title and detailed description for your PR:
        *   Explain the problem you're solving or the feature you're adding.
        *   Summarize the changes made.
        *   Reference any relevant issues (e.g., "Closes #123").
    *   If your PR is a work in progress, consider creating a "Draft" PR.

## Areas for Contribution

*   **Agent Enhancements:**
    *   Improving the reliability or capabilities of existing agents (`ResearchAgent`, `CompilerAgent`, `GitAgent`).
    *   Adding support for new AI models or APIs (e.g., different LLMs for research or compilation).
    *   Making agents more configurable.
*   **Prompt Engineering:**
    *   Refining the [`workshop_compiler_agent_prompt.md`](../workshop_compiler_agent_prompt.md) for better quality, structure, or style in generated workshops.
*   **Templating:**
    *   Improving the existing Jinja2 templates or adding new ones for different workshop elements.
*   **Error Handling & Resilience:**
    *   Making the orchestrator and agents more robust against failures.
*   **Testing:**
    *   Increasing test coverage.
    *   Adding integration tests.
*   **Documentation:**
    *   Improving existing documentation, adding more examples, or clarifying complex sections.
*   **New Features:**
    *   Proposing and implementing new functionalities (e.g., a `ReviewAgent` to critique generated content, support for different output formats).
*   **Bug Fixes:**
    *   Addressing any open issues.

## Code of Conduct

Please note that this project may have a Code of Conduct. Participants are expected to follow it in all interactions. (If a CoC file exists, link it here).

## Questions?

If you have questions about contributing or need clarification on something, feel free to open an issue on the GitHub repository.

Thank you for considering contributing to Workshop Builder!

---
Back to [Table of Contents](./index.md)