# Chapter 8: Advanced Typesetting: LaTeX with WSL2, TeXLive, and VS Code

For creative technologists and academics, producing high-quality documents, reports, or publications often necessitates tools beyond standard word processors. [LaTeX](https://www.latex-project.org/) is a powerful typesetting system renowned for its ability to produce beautifully formatted documents, especially those with complex mathematical formulae, structured layouts, and extensive bibliographies.

This chapter guides you through setting up a robust LaTeX environment using Windows Subsystem for Linux (WSL2), TeXLive (a comprehensive LaTeX distribution), and Visual Studio Code (VS Code) with the highly-regarded LaTeX Workshop extension. While the setup involves several steps, the resulting workflow offers a seamless and powerful experience for LaTeX development within a familiar coding environment.

## 8.1 Prerequisites and Overview

This guide assumes you have a working Windows environment and are familiar with the basics of VS Code, as covered in earlier chapters. We will cover:

1.  Installing Windows Subsystem for Linux (WSL2) and Ubuntu.
2.  Installing TeXLive, a comprehensive LaTeX distribution, on Ubuntu.
3.  Connecting VS Code to your WSL2 environment.
4.  Configuring the LaTeX Workshop extension in VS Code for an optimal experience.
5.  Leveraging Roo Code for AI-assisted LaTeX development.

## 8.2 Setting up Windows Subsystem for Linux (WSL2) and Ubuntu

WSL2 allows you to run a genuine Linux environment directly on Windows, providing access to Linux-native tools and workflows.

1.  **Install Ubuntu via Microsoft Store:**
    *   Open the Microsoft Store on your Windows machine.
    *   Search for "Ubuntu" (e.g., "Ubuntu 22.04 LTS") and install it.
    *   Launch Ubuntu once installed to complete the initial setup, which includes creating a username and password for your Linux environment.

2.  **Install Windows Terminal (Recommended):**
    *   For a superior terminal experience, install "Windows Terminal" from the Microsoft Store. It offers tabbed access to various shells, including your WSL2 Ubuntu instance.

3.  **Basic Linux Command Familiarity:**
    *   Once inside your Ubuntu terminal (via Windows Terminal or the Ubuntu app), familiarise yourself with these essential commands:
        *   `cd <directory>`: Change directory (e.g., `cd /mnt/c/Users/YourUser/Documents` to access your Windows Documents). Your Linux home directory is `~`.
        *   `ls`: List directory contents (`ls -hl` for detailed, human-readable output).
        *   `mkdir <directory_name>`: Create a new directory.
        *   `mv <source> <destination>`: Move or rename a file/directory.
        *   `cp <source> <destination>`: Copy a file/directory.
        *   `rm <file>`: Remove a file (`rm -r <directory>` to remove a directory recursively).
        *   `sudo <command>`: Execute a command with superuser (administrator) privileges.
        *   `apt`: The Advanced Package Tool used for managing software on Debian-based Linux distributions like Ubuntu.
            *   `sudo apt update`: Refresh the list of available packages.
            *   `sudo apt upgrade`: Upgrade all installed packages to their newest versions.
        *   `man <command>`: Display the manual page for a command (e.g., `man ls`).

## 8.3 Installing TeXLive on Ubuntu

TeXLive is a comprehensive and widely used LaTeX distribution.

1.  **Update Package Lists:**
    Ensure your package lists are up to date:
    ```bash
    sudo apt update
    ```

2.  **Install TeXLive:**
    Install a substantial set of TeXLive packages, including common LaTeX tools and extra features. The `texlive-latex-extra` package includes many useful classes and styles.
    ```bash
    sudo apt install texlive texlive-latex-extra
    ```
    *   **Note:** This command installs a version of TeXLive available in Ubuntu's repositories, which might not be the absolute latest. However, it is generally stable and sufficient for most purposes.
    *   You can add other specific packages as needed, such as `texlive-science` for scientific publications or language-specific packages like `texlive-lang-french`.

3.  **Explore CTAN (Optional but Recommended):**
    The [Comprehensive TeX Archive Network (CTAN)](https://ctan.org/) is the central repository for LaTeX packages, documentation, and related software. It's an invaluable resource for finding packages and their documentation (often in PDF format).

## 8.4 Connecting VS Code to WSL2

VS Code integrates seamlessly with WSL2, allowing you to edit files and use terminals within your Linux environment directly from the VS Code interface on Windows.

1.  **Install the WSL Extension in VS Code:**
    *   Open VS Code.
    *   Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
    *   Search for "WSL" by Microsoft and install it.

2.  **Connect to WSL:**
    *   Once the extension is installed, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
    *   Type "WSL: Connect to WSL" and select it. You may be prompted to choose your installed Linux distribution (e.g., Ubuntu).
    *   A new VS Code window will open, connected to your WSL2 environment. You can identify this by the green indicator in the bottom-left corner, which should show your WSL distribution (e.g., "WSL: Ubuntu").

3.  **Open Your Project Folder:**
    *   Within the WSL-connected VS Code window, you can open folders located within your Linux file system (e.g., `/home/your_linux_username/projects`) or access your Windows file system via `/mnt/c/`.

## 8.5 Setting up LaTeX Workshop in VS Code

The [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) extension for VS Code provides a rich set of features for LaTeX development.

1.  **Install LaTeX Workshop:**
    *   In your WSL-connected VS Code window, go to the Extensions view.
    *   Search for "LaTeX Workshop" by James Yu and install it *within the WSL environment*.

2.  **Understanding Root Files:**
    *   LaTeX Workshop typically identifies the main `.tex` file of your project (the "root" file) by looking for the `\documentclass{...}` command.

3.  **Configure Build Tools (Workspace Settings):**
    *   To ensure LaTeX Workshop uses `pdflatex` (a common LaTeX compiler that produces PDF output) correctly within WSL, you'll configure its settings.
    *   Open VS Code settings (`Ctrl+,` or `Cmd+,`).
    *   It's best to apply these settings at the **Workspace** level. If you have a specific LaTeX project folder open, switch to the "Workspace" tab in the settings UI.
    *   Click the "Open Settings (JSON)" icon in the top-right corner of the settings UI (it looks like a document with curly braces).
    *   This will open (or create) a `.vscode/settings.json` file in your project's root directory. Add the following configuration:

    ```json
    {
        "latex-workshop.latex.tools": [
            {
                "name": "pdflatex",
                "command": "pdflatex",
                "args": [
                    "--shell-escape",
                    "-synctex=1",
                    "-interaction=nonstopmode",
                    "-file-line-error",
                    "%DOC%"
                ]
            }
        ],
        "latex-workshop.latex.recipes": [
            {
                "name": "pdflatex",
                "tools": [
                    "pdflatex"
                ]
            }
        ],
        "latex-workshop.view.pdf.viewer": "tab" // Optional: open PDF in a VS Code tab
    }
    ```
    *   Save the `settings.json` file.

4.  **Using LaTeX Workshop:**
    *   Open a `.tex` file.
    *   When you save your `.tex` file, LaTeX Workshop should automatically compile it.
    *   You can view the PDF output directly within VS Code (often in a separate tab or side-by-side).
    *   **SyncTeX:** Ctrl+Click (or Cmd+Click) on text in the PDF viewer to jump to the corresponding LaTeX source, and vice-versa (Ctrl+Alt+J or Cmd+Alt+J from source to PDF).
    *   Explore the LaTeX Workshop side panel (usually a TeX icon in the Activity Bar) for more commands and options.
    *   For detailed information, consult the [LaTeX Workshop Wiki](https://github.com/James-Yu/LaTeX-Workshop/wiki).

5.  **Spell Checking:**
    *   Consider installing a spell-checking extension like "Code Spell Checker" (by Street Side Software) for your LaTeX documents. It supports multiple languages, including UK English.

## 8.6 Enhancing Your LaTeX Workflow with Roo Code

Just as Roo Code can assist with general programming tasks (as discussed in [Chapter 6](./06_ai_workflows_roo_code.md)), it can also be a valuable companion for writing LaTeX:

*   **Understanding Complex Syntax:**
    *   Select a convoluted LaTeX command or environment and ask Roo Code: "Explain this LaTeX code."
*   **Generating Structures:**
    *   Prompt: "Generate a LaTeX `article` document structure with sections for Introduction, Methods, Results, and Conclusion."
    *   Prompt: "Create a LaTeX `beamer` slide template for a presentation titled 'My Research'."
*   **Debugging Errors:**
    *   Copy a LaTeX compilation error message and ask Roo Code: "What does this LaTeX error mean and how can I fix it? Error: `[error message]`"
*   **Finding Packages:**
    *   Prompt: "What LaTeX package can I use to create timelines?"
*   **Refining Content:**
    *   Select a paragraph and ask: "Suggest alternative phrasing for this text in a formal academic style."

Remember to use Git for version control, especially when incorporating AI-generated LaTeX code, to easily track changes and revert if necessary.

## 8.7 Manual Compilation (For Understanding)

Before relying entirely on the LaTeX Workshop extension, it can be instructive to compile a document manually from the WSL terminal:

1.  **Create a Simple `.tex` File:**
    *   In your WSL environment, create a file named `mydocument.tex` with the following content:
        ```latex
        \documentclass{article}
        \title{My First LaTeX Document via WSL}
        \author{Your Name}
        \date{\today}
        \begin{document}
          \maketitle
          Hello, LaTeX world from WSL2 and VS Code!
        \end{document}
        ```

2.  **Compile from Terminal:**
    *   Open a WSL terminal in the directory containing `mydocument.tex`.
    *   Run the `pdflatex` command:
        ```bash
        pdflatex mydocument.tex
        ```
    *   This will generate several files, including `mydocument.pdf`. You can open this PDF to view your compiled document.

This manual step helps confirm that TeXLive is installed correctly and provides a basic understanding of the compilation process.

This comprehensive LaTeX setup empowers you to create professional-quality documents efficiently, combining the strengths of LaTeX, the Linux environment via WSL2, and the versatile VS Code editor, further enhanced by AI assistance from Roo Code.

---

Next: [Chapter 9: Context Management & Advanced Agent Workflows](./09_context_management.md)