# Chapter 7: Reference Cheat Sheet

This chapter provides a quick reference for some of the most common [Git](https://git-scm.com/) commands you'll use. Keep this handy as you work on your projects. This is based on the cheat sheet from the original `workshop.md`.

## Essential Git Commands

### Configuration (Usually done once)

Set your name and email (important for commit attribution):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Set the default branch name for new repositories to `main`:
```bash
git config --global init.defaultBranch main
```

### Starting a New Local Project

Create a new directory, navigate into it, and initialise a Git repository:
```bash
mkdir my-new-project
cd my-new-project
git init
```

### Connecting a Local Repository to a Remote (e.g., GitHub)

If you've created a new repository on GitHub and want to link your local project to it:
```bash
# (Assumes you've already run 'git init' locally)
# Replace URL with your actual GitHub repository URL
git remote add origin https://github.com/yourusername/your-repository-name.git
```
To push your initial `main` branch to the remote and set it to track:
```bash
git push -u origin main
```

### Everyday Workflow

Check the status of your files (what's changed, what's staged):
```bash
git status
```

Stage all changes in the current directory and subdirectories:
```bash
git add .
```

Stage changes in a specific file:
```bash
git add path/to/your/file.txt
```

Commit staged changes with a descriptive message:
```bash
git commit -m "Your descriptive commit message"
```

Push your committed changes from your local branch to the remote repository:
```bash
git push
```

Pull changes from the remote repository to your local branch (fetches and merges):
```bash
git pull
```

### Branching

List all local branches (current branch is marked with `*`):
```bash
git branch
```

Create a new branch:
```bash
git branch new-feature-branch
```

Switch to an existing branch:
```bash
git checkout existing-branch-name
```

Create a new branch and switch to it in one command:
```bash
git checkout -b new-feature-branch
```

Merge changes from another branch into your current branch:
```bash
# (First, make sure you are on the branch you want to merge INTO, e.g., 'main')
# git checkout main
git merge other-branch-name
```

Delete a local branch (usually after it has been merged):
```bash
git branch -d branch-to-delete
```
Force delete a local branch (if it hasn't been merged, use with caution):
```bash
git branch -D branch-to-delete
```

### Viewing History

View commit history (basic):
```bash
git log
```

View commit history in a compact, graphed format:
```bash
git log --oneline --graph --decorate --all
```

### Undoing Things (Use with care, especially `reset` on shared history)

Unstage a file (remove from staging area, keep changes in working directory):
```bash
git reset HEAD path/to/your/file.txt
# Or, for newer Git versions:
git restore --staged path/to/your/file.txt
```

Discard changes in a specific file in your working directory (revert to last commit):
```bash
git checkout -- path/to/your/file.txt
# Or, for newer Git versions:
git restore path/to/your/file.txt
```

Amend the last commit (change message, add more files):
```bash
# (Stage any additional files with 'git add' first if needed)
git commit --amend -m "New or corrected commit message"
```
### Cost Sanity Checks (Roo Code)

- Watch the Roo Code context bar.
- Reset context at ≈300k tokens or if logic degrades.
- A rate-limited profile helps save on costs.

This cheat sheet covers many of the day-to-day commands. For more advanced scenarios or detailed explanations, refer to the official [Git documentation](https://git-scm.com/doc) or use `git help <command>`.

---

Next: [Chapter 8: Advanced Typesetting: LaTeX with WSL2, TeXLive, and VS Code](./08_latex_wsl_vscode.md)