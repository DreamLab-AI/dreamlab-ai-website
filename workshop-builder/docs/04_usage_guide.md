# 4. Usage Guide

This guide explains how to use the Workshop Builder CLI to generate new workshop modules.

## Basic Command

The primary way to use Workshop Builder is through its command-line interface (`cli.py`). The most basic command requires you to specify the topic for the workshop you want to create.

```bash
python workshop-builder/cli.py --topic "Your Workshop Topic Here"
```

**Example:**

To generate a workshop about "Introduction to Docker Containers":
```bash
python workshop-builder/cli.py --topic "Introduction to Docker Containers"
```

## Command-Line Arguments

The CLI supports the following arguments:

*   `--topic "TOPIC_STRING"` (Required)
    *   Specifies the subject matter for the workshop to be generated.
    *   The string should be descriptive enough for the AI agents to understand the scope.
    *   Example: `--topic "Advanced Python Decorators"`

*   `--verbose` (Optional)
    *   Increases the verbosity of the logging output to DEBUG level. This is useful for troubleshooting or understanding the internal workings of the agents.
    *   Example: `python workshop-builder/cli.py --topic "Async Programming in JavaScript" --verbose`

## Workflow Execution

When you run the command, the Workshop Builder will execute the following orchestrated workflow:

1.  **Initialization:**
    *   The CLI parses arguments.
    *   `AppConfig` loads environment variables from `.env` (API keys, paths, etc.).
    *   Logging is configured.
    *   The `Orchestrator` is initialized.

2.  **Research Phase (`ResearchAgent`):**
    *   The `Orchestrator` instructs the `ResearchAgent` to gather unstructured data about the specified `--topic`.
    *   The `ResearchAgent` queries the configured AI model (e.g., Gemini) and saves the results into temporary files in the `temp_research_data` directory (or as configured).
    *   You will see log messages indicating the progress of this phase.

3.  **Compilation Phase (`CompilerAgent`):**
    *   The `Orchestrator` passes the topic and the paths to the researched data files to the `CompilerAgent`.
    *   The `CompilerAgent` determines the next available workshop number and creates a new directory for the module (e.g., `public/data/workshops/workshop-XX-your-topic-slug/`).
    *   It then invokes the OpenAI Chat Completions API, using structured messages and the detailed instructions from [`workshop_compiler_agent_prompt.md`](../workshop_compiler_agent_prompt.md) to:
        *   Analyze the research data.
        *   Generate a structured JSON object containing the content for all workshop files.
    *   After the AI generates the JSON response, the `CompilerAgent` parses it and writes the individual files (`00_introduction.md`, `01_*.md`, `manifest.json`, `README.md`, etc.) into the new module directory.
    *   Log messages will indicate the progress of content generation and file creation.

4.  **Publishing Phase (`GitAgent`):**
    *   The `Orchestrator` provides the path to the newly created workshop module, the topic, and the workshop number to the `GitAgent`.
    *   The `GitAgent` performs the following Git operations against the repository configured in your `.env` file:
        *   Checks out the default branch (e.g., `main`) and pulls the latest changes.
        *   Creates a new local branch (e.g., `workshop-XX-your-topic-slug`).
        *   Adds all files within the generated module directory to the Git staging area.
        *   Commits the changes with a descriptive message (e.g., `feat: Add workshop XX - Your Workshop Topic Here`).
        *   Pushes the new branch to the remote repository (e.g., `origin`).
        *   Creates a pull request targeting the default branch. The PR title and body are automatically generated.
    *   Log messages will detail these Git operations.

5.  **Output:**
    *   If successful, the CLI will print a success message, the local path to the generated workshop module, and the URL of the newly created pull request on GitHub.
    *   If any phase encounters an unrecoverable error, the process will halt, and an error message will be displayed. Verbose logs can provide more details.

## Expected Output Location

-   **Locally:** The generated workshop module will be created in the directory specified by `WORKSHOPS_BASE_DIR` in your `.env` file (e.g., `public/data/workshops/`), under a subdirectory named `workshop-XX-topic-slug`.
-   **Remotely:** A new branch and a pull request will be created in the GitHub repository specified by `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME`.

## Example Scenario Walkthrough

Let's say you run:
```bash
python workshop-builder/cli.py --topic "Understanding Kubernetes" --verbose
```

1.  The system initializes. `ResearchAgent` queries Gemini for "Understanding Kubernetes."
2.  Raw data is saved to `workshop-builder/temp_research_data/`.
3.  `CompilerAgent` is invoked. It sees the next workshop number is, for example, `05`.
4.  It creates `public/data/workshops/workshop-05-understanding-kubernetes/`.
5.  The OpenAI API (guided by the prompt and structured messages) generates a JSON object containing all workshop content.
6.  `CompilerAgent` then parses this JSON and creates `00_introduction.md`, `01_what_is_kubernetes.md`, `manifest.json`, `README.md`, etc., inside this new directory.
7.  `GitAgent` creates a branch `workshop-05-understanding-kubernetes`.
8.  It adds, commits, and pushes the contents of `public/data/workshops/workshop-05-understanding-kubernetes/`.
9.  It opens a PR titled `[Workshop] Add Workshop 05: Understanding Kubernetes`.
10. The CLI prints the PR URL.

## Important Considerations

*   **API Key Configuration:** Ensure your `.env` file is correctly set up with valid API keys and repository details. The tool will fail if these are missing or incorrect.
*   **Internet Connection:** Active internet connection is required for AI model API calls and GitHub operations.
*   **Git Environment:** The `GitAgent` performs local Git operations. Ensure the `workshop-builder` project is within a clone of the target repository structure, or that the `GitAgent` is robust enough to handle different execution contexts (currently, it assumes execution from within the project that contains the target `WORKSHOPS_BASE_DIR`).
*   **Execution Time:** Generating a full workshop can take several minutes, depending on the complexity of the topic and the responsiveness of the AI models. Use `--verbose` to monitor progress.

Next: [The OpenAI API Compiler Agent](./05_codex_compiler_agent.md)