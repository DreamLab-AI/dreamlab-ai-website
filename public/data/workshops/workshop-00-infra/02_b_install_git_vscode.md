# Chapter 2b: Installing Git & VS Code

With your GitHub account created, the next step is to install the essential local tools: [Git](https://git-scm.com/) and [Visual Studio Code (VS Code)](https://code.visualstudio.com/), our recommended code editor.

## 2b.1 Installing Git

Git is the version control system that operates locally on your computer. Even if you primarily use GitHub's web interface, Git must be installed locally for many operations, particularly when working with VS Code.

### macOS Users:

Git may already be installed on your Mac as part of the Xcode Command Line Tools. To check, open Terminal (Applications > Utilities > Terminal) and type:

```bash
git --version
```

If Git is not installed or you prefer the latest version, install it using [Homebrew](https://brew.sh/):

```bash
brew install git
```

### Windows Users:

1. Download the official **Git for Windows** installer from [https://gitforwindows.org](https://gitforwindows.org).
2. Run the installer. The default options are generally suitable, but ensure "Git from the command line and also from 3rd-party software" is selected.
3. After installation, restart any open command prompts or terminals.

### Verify Installation (All Operating Systems):

Open your terminal and type:

```bash
git --version
```

You should see a version number (ideally 2.40 or newer).

## 2b.2 Initial Git Configuration

After installing Git, configure your global settings. These settings identify you as the author of your commits. Run these commands in your terminal, replacing placeholders with your actual details:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main
```

- `user.name`: Your full name.
- `user.email`: The email associated with your GitHub account.
- `init.defaultBranch main`: Sets the default branch name for new repositories to `main`.

## 2b.3 Installing Visual Studio Code (VS Code)

VS Code is a powerful, free, and widely-used source code editor developed by Microsoft. It integrates seamlessly with Git and GitHub and supports numerous extensions.

### macOS Users:

Install via Homebrew:

```bash
brew install --cask visual-studio-code
```

Alternatively, download directly from [https://code.visualstudio.com](https://code.visualstudio.com).

### Windows Users:

Download the installer from [https://code.visualstudio.com](https://code.visualstudio.com). Run the installer, accepting default options. Consider enabling "Open with Code" context menus for convenience.

Launch VS Code after installation. You will see a welcome screen; you can explore the introductory materials or proceed directly to the next steps.

## 2b.4 Recommended VS Code Extensions

VS Code's functionality is significantly enhanced by extensions. Install extensions via the Extensions view (click the square icon in the Activity Bar or press `Ctrl+Shift+X` / `Cmd+Shift+X`):

- **Roo Code (AI Assistant):**
  - Provides AI-powered code generation, explanation, and refactoring.
  - Search for `Roo Code` and install it. Configuration details are covered in [Chapter 2d](./02_d_roo_code_config.md).

- **Git Graph:**
  - Visualises your Git repository's history, branches, and merges.
  - Search for `Git Graph` (by mhutchie) and install it.

- **Markdown Preview Mermaid Support:**
  - Adds Mermaid diagram support to VS Code's Markdown preview.
  - Search for `Markdown Preview Mermaid Support` and install it.

After installing extensions, reload VS Code if prompted.

With Git and VS Code installed and configured, your local development environment is now ready.

---

Next: [Chapter 2c: Setting up a Google Cloud API Key for AI](./02_c_gcp_api_key.md)