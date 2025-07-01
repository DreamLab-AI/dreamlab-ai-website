# 6. API Reference (Python CLI & Internal Components)

This section provides a reference for the Workshop Builder's command-line interface and an overview of the key classes and methods within its internal Python modules.

## Command-Line Interface (CLI) - `cli.py`

The primary interface for users is the `cli.py` script.

```bash
python workshop-builder/cli.py [OPTIONS]
```

### Options:

*   `--topic "TOPIC_STRING"`
    *   **Required:** Yes
    *   **Type:** String
    *   **Description:** Specifies the subject matter for the workshop to be generated. This string is used by the `ResearchAgent` to gather initial data and by other agents to title and categorize the workshop.
    *   **Example:** `python workshop-builder/cli.py --topic "Introduction to REST APIs"`

*   `--verbose`
    *   **Required:** No
    *   **Type:** Flag (boolean)
    *   **Description:** If present, sets the logging level to DEBUG, providing more detailed output about the internal operations of the Workshop Builder. Useful for troubleshooting.
    *   **Example:** `python workshop-builder/cli.py --topic "Data Structures in Python" --verbose`

## Core Python Modules and Classes

The following are the main Python classes and their key methods. This is not an exhaustive list of all private methods but covers the primary public interfaces between components.

### 1. `orchestrator.config.AppConfig`

*   **File:** [`workshop-builder/orchestrator/config.py`](../orchestrator/config.py)
*   **Description:** Handles loading and providing access to application configuration, primarily from environment variables defined in the `.env` file.
*   **Key Attributes (loaded from `.env`):**
    *   `gemini_api_key: str`
    *   `openai_api_key: str`
    *   `github_token: str`
    *   `log_level: str` (e.g., "INFO", "DEBUG")
    *   `workshops_base_dir: str` (Path to where workshop modules are stored/created)
    *   `github_repo_owner: str`
    *   `github_repo_name: str`
    *   `compiler_agent_prompt_path: str` (Path to the base prompt for the OpenAI API)
    *   `temp_data_dir: str` (Path for temporary research data)
*   **Methods:**
    *   `__init__(self)`: Loads configuration from `.env`. Raises `ValueError` if required variables are missing.
    *   `get_logger(self, name: str) -> logging.Logger`: Returns a configured logger instance.

### 2. `orchestrator.orchestrator.Orchestrator`

*   **File:** [`workshop-builder/orchestrator/orchestrator.py`](../orchestrator/orchestrator.py)
*   **Description:** Manages the end-to-end workflow of workshop generation by coordinating the different agents.
*   **Methods:**
    *   `__init__(self, config: AppConfig)`: Initializes the orchestrator with application configuration.
    *   `run(self, topic: str)`: Executes the full workshop generation pipeline for the given `topic`.
        1.  Initializes `ResearchAgent`, `CompilerAgent`, `GitAgent`.
        2.  Calls `ResearchAgent.fetch_unstructured_data()`.
        3.  Calls `CompilerAgent.compile_workshop()`.
        4.  Calls `GitAgent.publish_module()`.
        *   Handles exceptions from agents and manages temporary data directory cleanup.

### 3. `agents.research_agent.ResearchAgent`

*   **File:** [`workshop-builder/agents/research_agent.py`](../agents/research_agent.py)
*   **Description:** Responsible for gathering unstructured information about the workshop topic.
*   **Methods:**
    *   `__init__(self, config: AppConfig, temp_data_dir: str)`: Initializes with config and the path to the temporary directory for storing fetched data.
    *   `fetch_unstructured_data(self, topic: str) -> list[str]`:
        *   Queries an AI model (e.g., Gemini via its API) using the `topic`.
        *   Saves the retrieved information into one or more files within the `temp_data_dir`.
        *   Returns a list of absolute file paths to the saved data files.
        *   Raises `ResearchAgentError` on failure.

### 4. `agents.compiler_agent.CompilerAgent`

*   **File:** [`workshop-builder/agents/compiler_agent.py`](../agents/compiler_agent.py)
*   **Description:** Transforms unstructured data into a structured workshop module using the OpenAI Chat Completions API and Jinja2 templates where applicable.
*   **Methods:**
    *   `__init__(self, config: AppConfig)`: Initializes with application configuration.
    *   `compile_workshop(self, topic: str, unstructured_data_paths: list[str]) -> str`:
        1.  Determines the next workshop number (e.g., `05`).
        2.  Creates the main workshop module directory (e.g., `public/data/workshops/workshop-05-topic-slug/`).
        3.  Invokes the OpenAI Chat Completions API using structured messages (based on the master prompt [`workshop_compiler_agent_prompt.md`](../workshop_compiler_agent_prompt.md)) and the `unstructured_data_paths`. The API returns a JSON object containing the content for all workshop files.
        4.  Parses the JSON response and writes the individual files (`00_*.md`, `01_*.md`, `manifest.json`, `README.md`, etc.) into the new module directory. Jinja2 templates may still be used for structuring parts of these files if needed.
        5.  Returns the absolute path to the created workshop module directory.
        6.  Raises `CompilerAgentError` on failure.

### 5. `agents.git_agent.GitAgent`

*   **File:** [`workshop-builder/agents/git_agent.py`](../agents/git_agent.py)
*   **Description:** Handles all Git and GitHub operations for publishing the generated workshop.
*   **Methods:**
    *   `__init__(self, config: AppConfig)`: Initializes with application configuration.
    *   `publish_module(self, module_path: str, topic: str, workshop_number: str) -> str`:
        1.  Constructs a branch name (e.g., `workshop-05-topic-slug`).
        2.  Performs local Git operations: creates/checks out the branch, adds all files from `module_path`, commits changes.
        3.  Pushes the new branch to the remote GitHub repository.
        4.  Uses the GitHub API (via `PyGithub` or direct calls) to create a pull request targeting the default branch of the configured repository.
        5.  Returns the URL of the created pull request.
        6.  Raises `GitAgentError` on failure.

## Custom Exceptions

*   `ResearchAgentError(Exception)`
*   `CompilerAgentError(Exception)`
*   `GitAgentError(Exception)`

These are raised by their respective agents to indicate failures in their specific processing stages. The `Orchestrator` may catch these to provide more specific error feedback.

Next: [Troubleshooting](./07_troubleshooting.md)