# 7. Troubleshooting

This section provides guidance on common issues you might encounter while using or developing Workshop Builder and how to resolve them.

## Common Issues and Solutions

1.  **Missing Environment Variables / `.env` File Not Found**
    *   **Symptom:** CLI exits early with an error message like "Error: Missing one or more required environment variables..." or "Warning: .env file not found."
    *   **Cause:** The `.env` file is missing from the `workshop-builder/` directory, or it's incomplete.
    *   **Solution:**
        1.  Ensure you have copied [`workshop-builder/.env.example`](../.env.example) to `workshop-builder/.env`.
        2.  Open `.env` and verify that all required API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`) and GitHub repository details (`GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`) are correctly filled in.
        3.  Make sure the `.env` file is in the root of the `workshop-builder` project directory, from where you are typically running `python workshop-builder/cli.py`.

2.  **API Key Errors (Authentication Failures)**
    *   **Symptom:** Errors from agents related to "AuthenticationError", "Invalid API Key", "401 Unauthorized", or similar.
    *   **Cause:**
        *   Incorrect API key in the `.env` file.
        *   API key lacks necessary permissions/scopes (especially for `GITHUB_TOKEN`).
        *   API key has expired or been revoked.
        *   Billing issues with the AI service provider.
    *   **Solution:**
        1.  Double-check the respective API keys in your `.env` file for typos or copy-paste errors.
        2.  Verify that the `GITHUB_TOKEN` has the required scopes (e.g., `repo`, `pull_request`). Regenerate if unsure.
        3.  Check your account status and billing information on the Google AI Studio, OpenAI Platform, and GitHub.
        4.  Ensure the AI services are operational (check their status pages).

3.  **GitAgent Errors (Branching, Committing, Pushing, PR Creation)**
    *   **Symptom:** Errors like "Failed to create branch", "Failed to git commit", "Permission denied to repository", "Could not create Pull Request."
    *   **Cause:**
        *   `GITHUB_TOKEN` lacks permissions.
        *   Incorrect `GITHUB_REPO_OWNER` or `GITHUB_REPO_NAME` in `.env`.
        *   The local Git environment is not clean (e.g., uncommitted changes, detached HEAD).
        *   The Workshop Builder CLI is not being run from within a Git repository that is a clone of the target repository structure.
        *   Network issues preventing communication with GitHub.
        *   Branch naming conflicts (though `GitAgent` attempts to handle this).
    *   **Solution:**
        1.  Verify `GITHUB_TOKEN` permissions and repository details in `.env`.
        2.  Ensure your local Git repository (where `workshop-builder` resides or is linked) is a clone of the target repository and is up-to-date with the default branch.
        3.  Run `git status` in the `workshop-builder` directory (or the root of your project if `workshop-builder` is a subdirectory) to check for local issues. Resolve any uncommitted changes or conflicts.
        4.  Ensure `PyGithub` is installed if not relying on direct CLI calls (`pip install PyGithub`).
        5.  Check network connectivity.

4.  **CompilerAgent Fails to Generate Content / Incorrect Output**
    *   **Symptom:** No markdown files are generated in the module directory, files are empty, or content is nonsensical/irrelevant.
    *   **Cause:**
        *   Poor quality or insufficient `ResearchAgent` output (unstructured_data_paths).
        *   Issues with the [`workshop_compiler_agent_prompt.md`](../workshop_compiler_agent_prompt.md) – it might be unclear, too complex, or have conflicting instructions.
        *   The OpenAI API is unavailable or returning errors.
        *   Context window limitations of the AI model if research data is excessively large.
        *   Incorrect path to `workshop_compiler_agent_prompt.md` in `.env` or `AppConfig`.
    *   **Solution:**
        1.  **Inspect Research Data:** Check the files in `workshop-builder/temp_research_data/` (after a run, before cleanup, or by temporarily disabling cleanup in `Orchestrator`) to ensure `ResearchAgent` produced meaningful content.
        2.  **Review and Refine Prompt:** The `workshop_compiler_agent_prompt.md` is key. Simplify, clarify, or add more specific examples/constraints to it.
        3.  **Test OpenAI API Independently:** Use the `openai` Python library to make a basic Chat Completions API call with a simple prompt to isolate API connectivity or authentication issues.
        4.  **Check AI Model Status:** Ensure the OpenAI API is operational by checking the OpenAI status page.
        5.  Verify the `COMPILER_AGENT_PROMPT_PATH` in your configuration.

5.  **`ModuleNotFoundError` or `ImportError`**
    *   **Symptom:** Python cannot find modules (e.g., `No module named 'dotenv'`, `No module named 'github'`).
    *   **Cause:** Dependencies are not installed, or the virtual environment is not activated.
    *   **Solution:**
        1.  Ensure your Python virtual environment (`.venv`) is activated.
        2.  Run `pip install -r requirements.txt` (ensure `requirements.txt` is created and up-to-date with `python-dotenv`, `PyGithub`, `Jinja2`, etc.).

6.  **File Path Issues (e.g., `FileNotFoundError`)**
    *   **Symptom:** Errors indicating that a file or directory (like `WORKSHOPS_BASE_DIR`, `TEMP_DATA_DIR`, or `COMPILER_AGENT_PROMPT_PATH`) cannot be found.
    *   **Cause:** Incorrect paths configured in `.env` or relative paths not resolving as expected based on the script's execution context.
    *   **Solution:**
        1.  Verify all path configurations in your `.env` file.
        2.  `WORKSHOPS_BASE_DIR` should be the path (absolute or relative to `workshop-builder/`) where workshop modules (e.g., `public/data/workshops/`) are located within your target repository structure.
        3.  `COMPILER_AGENT_PROMPT_PATH` is relative to the `workshop-builder/` root.
        4.  Use absolute paths in `.env` if relative path resolution becomes problematic, or ensure the CLI is always run from the `workshop-builder/` directory. The code attempts to resolve these paths robustly.

## Debugging Tips

1.  **Use `--verbose`:**
    Always try running the CLI with the `--verbose` flag first. This provides detailed DEBUG level logs that can pinpoint where the process is failing.
    ```bash
    python workshop-builder/cli.py --topic "Your Topic" --verbose
    ```

2.  **Check Log Files:**
    If logging to a file is implemented (not by default in current placeholders), check the log file for detailed error messages and stack traces.

3.  **Isolate Agents:**
    If you suspect a specific agent:
    *   Temporarily modify `orchestrator.py` to run only that agent or to print intermediate data (e.g., paths from `ResearchAgent`, path from `CompilerAgent`).
    *   Use the `if __name__ == '__main__':` blocks within each agent file for more direct unit testing of that agent's core functionality with controlled inputs.

4.  **Examine Temporary Data:**
    The `Orchestrator` creates and cleans up a `temp_data_dir` (default: `workshop-builder/temp_research_data/`). To inspect the data produced by the `ResearchAgent`:
    *   Temporarily comment out the `self._cleanup_temp_dir()` call in the `finally` block of `Orchestrator.run()`.
    *   After a run, inspect the files in the temporary directory.

5.  **Simplify the Topic:**
    Test with a very simple, well-known topic to see if the issue is topic complexity or a more fundamental problem.

6.  **Validate AI Model Access:**
    *   For Gemini: Use a simple Python script with the `google-generativeai` library to make a basic API call with your `GEMINI_API_KEY`.
    *   For OpenAI: Use the `openai` Python library for a basic Chat Completions API call.

If you encounter an issue not listed here, the verbose logs are the best starting point for diagnosis.

Next: [Contribution Guidelines](./08_contribution_guidelines.md)