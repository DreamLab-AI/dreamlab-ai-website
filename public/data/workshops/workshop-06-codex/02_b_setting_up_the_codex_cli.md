# 2.b: Setting Up the Codex CLI

The Codex CLI provides a terminal-based interface for interacting with OpenAI's coding assistance capabilities. It's an open-source tool designed for developers who prefer command-line workflows.

## Prerequisites

*   **Node.js:** Node.js version 22 or newer (LTS recommended) must be installed on your system.
*   **API Key:** An OpenAI API key is required for authentication. Alternatively, API keys from other supported providers (like Azure, Gemini, Anthropic, etc.) can be used.
*   **Operating System:**
    *   macOS 12+
    *   Ubuntu 20.04+ / Debian 10+
    *   Windows 11 via WSL2 (Windows Subsystem for Linux 2)
    *   Git Bash is recommended for Windows users if not using WSL2.

## Installation

The Codex CLI can be installed globally using `npm` (Node Package Manager). Open your terminal and run:

```bash
npm install -g @openai/codex
```

This command downloads and installs the latest version of the Codex CLI, making the `codex` command available in your terminal.

## API Key Setup

You need to configure your API key so the CLI can authenticate with OpenAI (or your chosen provider). There are a couple of common methods:

1.  **Environment Variable (Recommended):**
    Set the API key as an environment variable for your current terminal session or, more permanently, in your shell's configuration file (e.g., `~/.zshrc` for Zsh, `~/.bashrc` for Bash).

    For a single session:
    ```bash
    export OPENAI_API_KEY="your-api-key-here"
    ```
    Replace `"your-api-key-here"` with your actual OpenAI API key. To make it permanent, add this line to your shell's configuration file and then source the file (e.g., `source ~/.zshrc`) or open a new terminal window.

2.  **.env File:**
    Alternatively, you can create a `.env` file at the root of your project directory. Add your API key to this file:
    ```
    OPENAI_API_KEY=your-api-key-here
    ```
    The CLI will automatically load variables from this `.env` file if it exists in the current working directory or any parent directory.

## Support for Other AI Providers

The Codex CLI is flexible and allows you to use AI models from providers other than OpenAI (e.g., Azure, Gemini, Ollama, Mistral).

*   **Provider Flag:** Use the `--provider` flag when running a `codex` command, or set the provider in a configuration file.
*   **Environment Variables for Keys:** For these providers, their respective API keys must be set as environment variables (e.g., `export AZURE_API_KEY="your-key"`).
*   **Custom Base URL:** If a provider is not explicitly listed as supported but offers an OpenAI-compatible API, its base URL must also be provided as an environment variable (e.g., `export CUSTOM_PROVIDER_BASE_URL="https://api.customprovider.com"`).

## Initial Usage

After setup, you can run the CLI interactively by simply typing:

```bash
codex
```

This will start an interactive chat session with the AI. You can also provide a prompt directly on the command line:

```bash
codex "Explain the following Python function to me: [paste function code here]"
```

Or, as mentioned in the [`detailed_overview.md`](../detailed_overview.md):

```bash
codex "explain this function"
```
(Assuming you are in a directory with the relevant code or provide it in the prompt).

The CLI offers various modes and options for more advanced usage, which will be covered in later chapters.

---

Next: [2.c: API Keys and Authentication](./02_c_api_keys_and_authentication.md)