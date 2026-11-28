# Chapter 2b: Installing Git & VS Code

⏱️ **Time:** 10-15 minutes | 🎯 **Difficulty:** 🟢 Beginner

With your GitHub account created, the next step is to install the essential local tools: [Git](https://git-scm.com/) and [Visual Studio Code (VS Code)](https://code.visualstudio.com/), our recommended code editor.

## 2b.1 Installing Git

Git is the version control system that operates locally on your computer. Even if you primarily use GitHub's web interface, Git must be installed locally for many operations, particularly when working with VS Code and AI coding assistants.

### macOS Users

Git may already be installed on your Mac as part of the Xcode Command Line Tools. To check, open Terminal (Applications > Utilities > Terminal) and type:

```bash
git --version
```

If you see a version number, Git is already installed. If you get an error or a prompt to install developer tools, follow the on-screen instructions or install Git via [Homebrew](https://brew.sh/):

```bash
brew install git
```

### Windows Users

1. Download the official **Git for Windows** installer from [https://gitforwindows.org](https://gitforwindows.org).
2. Run the installer. The default options are generally suitable, but pay attention to these settings:
   - **"Git from the command line and also from 3rd-party software"** — ensure this is selected.
   - **Default editor** — if you are unsure, leave the default or select "Use Visual Studio Code as Git's default editor" if VS Code is already installed.
   - **Line ending conversion** — the default ("Checkout Windows-style, commit Unix-style line endings") is correct for most users.
3. After installation, restart any open command prompts or terminals.

> **💡 Tip for Windows users:** The installer includes **Git Bash**, a terminal emulator that provides a Unix-like command-line experience on Windows. Many Git tutorials assume a Unix-style terminal, so Git Bash is useful for following along.

### Linux Users

Git is available through your distribution's package manager:

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install git

# Fedora
sudo dnf install git

# Arch Linux
sudo pacman -S git
```

### Verify Installation (All Operating Systems)

Open your terminal and type:

```bash
git --version
```

You should see a version number (ideally 2.40 or newer). If this command fails, revisit the installation steps for your operating system.

## 2b.2 Initial Git Configuration

After installing Git, configure your global settings. These settings identify you as the author of your commits and appear in your Git history. Run these commands in your terminal, replacing the placeholders with your actual details:

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your@email.com"
git config --global init.defaultBranch main
```

- **`user.name`**: Your full name as you want it to appear in commit logs.
- **`user.email`**: The email associated with your GitHub account. If you enabled email privacy in [Chapter 2a](./02_a_github_account.md#2a3-email-privacy-settings), use the `noreply` address GitHub provided.
- **`init.defaultBranch main`**: Sets the default branch name for new repositories to `main` (the modern convention, replacing the older `master`).

### Verifying Your Configuration

Check that your settings are correct:

```bash
git config --global --list
```

You should see your name, email, and default branch listed.

### Optional but Helpful Settings

```bash
# Colourful output makes Git status and diffs easier to read
git config --global color.ui auto

# Set VS Code as your default Git editor (for commit messages, rebase, etc.)
git config --global core.editor "code --wait"

# Set VS Code as your default diff/merge tool
git config --global diff.tool vscode
git config --global difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'
```

## 2b.3 Installing Visual Studio Code (VS Code)

VS Code is a powerful, free, and widely-used source code editor developed by Microsoft. It integrates seamlessly with Git and GitHub and supports thousands of extensions — including AI coding assistants.

### macOS Users

Install via Homebrew (recommended):

```bash
brew install --cask visual-studio-code
```

Alternatively, download directly from [https://code.visualstudio.com](https://code.visualstudio.com).

After installation, open VS Code and enable the shell command: open the Command Palette (`Cmd+Shift+P`), type "Shell Command: Install 'code' command in PATH", and press Enter. This lets you open VS Code from the terminal by typing `code .` in any directory.

### Windows Users

1. Download the installer from [https://code.visualstudio.com](https://code.visualstudio.com).
2. Run the installer, accepting default options.
3. **Recommended:** Tick the following options during installation:
   - "Add 'Open with Code' action to Windows Explorer file context menu"
   - "Add 'Open with Code' action to Windows Explorer directory context menu"
   - "Add to PATH" (should be ticked by default)

### Linux Users

```bash
# Debian/Ubuntu — install via .deb package
# Download the .deb from https://code.visualstudio.com, then:
sudo dpkg -i code_*.deb

# Or via snap:
sudo snap install code --classic
```

Launch VS Code after installation. You will see a welcome screen; you can explore the introductory materials or proceed directly to the next steps.

## 2b.4 Recommended VS Code Extensions

VS Code's functionality is significantly enhanced by extensions. Install extensions via the Extensions view — click the square icon in the Activity Bar on the left or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).

### Essential Extensions

These extensions are used throughout this workshop:

| Extension | Purpose | How to Find It |
|-----------|---------|---------------|
| **Git Graph** | Visualise your repository's commit history, branches, and merges as a graph | Search "Git Graph" (by mhutchie) |
| **GitLens** | See who changed each line and when, inline blame annotations, rich history exploration | Search "GitLens" (by GitKraken) |
| **Markdown Preview Mermaid Support** | Render Mermaid diagrams in VS Code's built-in Markdown preview | Search "Markdown Preview Mermaid Support" |

### AI-Related Extensions

| Extension | Purpose | How to Find It |
|-----------|---------|---------------|
| **Claude Code** | AI-powered coding assistant (terminal-based agent) | Install via terminal: `npm install -g @anthropic-ai/claude-code`. Optionally install the VS Code extension from the marketplace for an integrated panel. Full setup in [Chapter 2d](./02_d_roo_code_config.md). |
| **GitHub Copilot** | Inline AI code suggestions as you type | Search "GitHub Copilot" (free for students/educators) |
| **Continue** | Open-source AI assistant supporting multiple models | Search "Continue" |

> **📝 Note:** You do not need all of these AI extensions. Claude Code alone is sufficient for this workshop. GitHub Copilot is a good complement if you are a student with free access. See [Chapter 2d](./02_d_roo_code_config.md) for detailed setup of each tool.

### Optional but Useful Extensions

| Extension | Purpose |
|-----------|---------|
| **Prettier** | Automatic code formatting for HTML, CSS, JavaScript, and more |
| **Live Server** | Launch a local development server with live reload for HTML files |
| **Error Lens** | Highlight errors and warnings inline in the editor |
| **Path Intellisense** | Autocomplete file names and paths |

## 2b.5 Verifying Your Setup

Let us confirm that everything is working together.

**1. Check Git integration in VS Code:**

Open VS Code, then open the integrated terminal (`Ctrl+`` ` or `Cmd+`` `). Run:

```bash
git --version
```

If VS Code's terminal cannot find Git, you may need to restart VS Code or check that Git is on your system PATH.

**2. Create a test repository:**

In the terminal:

```bash
mkdir ~/git-test
cd ~/git-test
git init
echo "# Test" > README.md
git add README.md
git commit -m "Initial commit"
```

**3. Check Git Graph:**

Open the `git-test` folder in VS Code (`File > Open Folder`). Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), type "Git Graph: View Git Graph", and press Enter. You should see your initial commit visualised.

**4. Clean up (optional):**

```bash
rm -rf ~/git-test
```

<details>
<summary>Troubleshooting Common Issues</summary>

**"git is not recognised as an internal or external command" (Windows)**
- Restart your terminal or computer after installing Git.
- Check that Git was added to PATH during installation. If not, reinstall and ensure that option is ticked.

**"code: command not found" (macOS/Linux)**
- Open VS Code, press `Cmd+Shift+P`, and run "Shell Command: Install 'code' command in PATH".

**Extensions not appearing after installation**
- Reload VS Code: press `Ctrl+Shift+P` / `Cmd+Shift+P`, type "Developer: Reload Window", and press Enter.

**Git commit fails with "Please tell me who you are"**
- You have not configured your Git identity. Run the `git config --global user.name` and `user.email` commands from section 2b.2.

</details>

<details>
<summary>🎯 Knowledge Check</summary>

Before moving forward, ensure you can answer:
1. What command verifies that Git is installed?
2. Why do you need to set `user.name` and `user.email` in Git configuration?
3. What does the Git Graph extension show you?
4. How do you open a terminal inside VS Code?

**Answers:**
1. `git --version`
2. They identify you as the author of commits and link your commits to your GitHub account.
3. A visual graph of your repository's commit history, branches, and merges.
4. Press `Ctrl+`` ` (Windows/Linux) or `Cmd+`` ` (macOS), or go to Terminal > New Terminal in the menu bar.

</details>

---

**Next**: [Chapter 2c: Setting Up AI API Keys (2026 Edition)](./02_c_gcp_api_key.md)
