# A Creative Technologist's Guide to GitHub & AI-Powered Workflows

Welcome! This self-guided workshop is designed for creative technologists, researchers, academics, and anyone who wants to establish a modern, AI-enhanced development workflow — regardless of prior programming experience.

The journey involves some initial setup, which can feel intensive, but the rewards are substantial: a powerful, largely free toolkit that can transform how you manage projects, collaborate with others, and create.

## Who Is This For?

This workshop is written for a **non-developer audience**:

- **Academics and researchers** who want to manage papers, data, and code more effectively.
- **Creative technologists** exploring interactive installations, generative art, or mixed-reality projects.
- **Designers and artists** who want to version-control their work and collaborate with technical teams.
- **Students** building portfolios and learning industry-standard tools.
- **Anyone curious** about how AI coding assistants can accelerate their work.

No prior experience with Git, GitHub, or AI coding assistants is assumed. Every command is explained, and every step includes context for why it matters. If you have used these tools before, the later chapters on AI workflows and context management will still offer new techniques.

## What You Will Learn

By the end of this workshop, you will be able to:

- **Manage projects with Git** — track every change, experiment safely on branches, and recover from mistakes.
- **Collaborate via GitHub** — share code, review contributions through pull requests, and work with teams.
- **Host websites for free** — publish portfolios, documentation, or project showcases on GitHub Pages.
- **Work with AI coding assistants** — use Claude Code to generate, explain, refactor, and debug code.
- **Manage AI context effectively** — understand token economics, session strategies, and cost control.
- **Create professional documents** — (optional) set up LaTeX for academic papers and reports.

## Workshop Philosophy

This guide is built on the idea of **"vibe coding"** — an iterative, exploratory approach to creation, supercharged by AI. The process is about learning, experimenting, and not being afraid to ask the AI (or your colleagues) for help. Every chapter includes hands-on exercises so you build real skills, not just theoretical knowledge.

## Table of Contents

| # | Chapter | Time | Difficulty |
|:-:|---------|:----:|:----------:|
| 0 | [Introduction & Workshop Overview](./00_introduction.md) | 15 min | Beginner |
| 1 | [Why Git? Understanding Version Control](./01_why_git.md) | 10 min | Beginner |
| **2** | **[Essential Setup: Accounts & Installations](./02_setup_overview.md)** | **5 min** | **Beginner** |
| 2a | [Creating Your GitHub Account](./02_a_github_account.md) | 10 min | Beginner |
| 2b | [Installing Git & VS Code](./02_b_install_git_vscode.md) | 10-15 min | Beginner |
| 2c | [Setting Up AI API Keys (2026 Edition)](./02_c_gcp_api_key.md) | 15-20 min | Intermediate |
| 2d | [Configuring AI Coding Assistants in VS Code (2026 Edition)](./02_d_roo_code_config.md) | 20-30 min | Intermediate |
| 3 | [The Core Git Workflow](./03_core_workflow.md) | 30 min | Beginner |
| 4 | [Collaboration & Recovery](./04_collaboration_recovery.md) | 20 min | Beginner |
| 5 | [GitHub Pages: Your Free Portfolio Site](./05_github_pages.md) | 30 min | Beginner |
| 6 | [AI-Powered Workflows with Claude Code](./06_ai_workflows_roo_code.md) | 30 min | Intermediate |
| 7 | [Reference Cheat Sheet](./07_cheat_sheet.md) | Reference | All |
| 8 | [Advanced Typesetting: LaTeX with WSL2, TeXLive, and VS Code](./08_latex_wsl_vscode.md) | 45 min | Intermediate |
| 9 | [Context Management & Advanced Agent Workflows](./09_context_management.md) | 20 min | Intermediate |
| 10 | [Advanced Context Management & Multi-Session Strategies](./10_context_management.md) | 25 min | Intermediate |

### Suggested Learning Paths

**Getting started (2 hours):** Chapters 0 → 1 → 2 (all sub-chapters) → 3
Complete the setup and learn the core Git workflow.

**Full workshop (4 hours):** Chapters 0 through 6
Covers everything from setup through AI-powered workflows.

**AI focus (1 hour):** Chapters 2c → 2d → 6 → 9 → 10
For those who already use Git and want to learn AI coding workflows.

**Academic writing:** Add Chapter 8 (LaTeX) to any path above.

## Chapter Summaries

- **Chapter 0 — Introduction:** The big picture — why these tools matter, what the workshop covers, and how the modern development landscape looks.
- **Chapter 1 — Why Git:** What version control is, the problems it solves, and why it matters even more in the age of AI assistants.
- **Chapter 2 — Setup:** A hub chapter linking to four sub-chapters that walk through account creation, software installation, API key setup, and AI tool configuration.
- **Chapter 3 — Core Workflow:** The daily Git cycle: edit, stage, commit, push, pull. Branching basics and the `.gitignore` file.
- **Chapter 4 — Collaboration & Recovery:** Working with others via branches, forks, and pull requests. Recovering from common Git mistakes.
- **Chapter 5 — GitHub Pages:** Hosting free websites from your repositories, custom domains, and advanced deployment from private repositories.
- **Chapter 6 — AI Workflows:** Using Claude Code for code generation, explanation, refactoring, debugging, and project scaffolding. The "vibe coding" approach.
- **Chapter 7 — Cheat Sheet:** Quick-reference tables for Git commands, Claude Code commands, and keyboard shortcuts.
- **Chapter 8 — LaTeX:** Setting up a professional typesetting environment using WSL2, TeXLive, and VS Code for academic papers and reports.
- **Chapter 9 — Context Management:** Fundamentals of context windows, token costs, prompting strategies, and security considerations.
- **Chapter 10 — Advanced Context Management:** Token economics in depth, `/compact` and `/clear` strategies, multi-session workflows, and cost management.

## Prerequisites

- A computer running Windows, macOS, or Linux.
- A reliable internet connection (for downloads and GitHub access).
- Willingness to use a terminal — you will type commands, but every command is explained.

No programming experience is required.

## What You Will Need to Install

All of the core tools used in this workshop are **free**:

| Tool | What It Does | Cost |
|------|-------------|------|
| [Git](https://git-scm.com/) | Version control — tracks changes to your files | Free, open source |
| [GitHub](https://github.com/) | Cloud hosting for Git repositories, collaboration, free web hosting | Free plan |
| [VS Code](https://code.visualstudio.com/) | Code editor with extensions and Git integration | Free, open source |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | AI coding assistant — understands projects, generates and edits code | Free tier via claude.ai |

Optional paid tools (GitHub Copilot, Cursor, Anthropic API) are discussed but not required. Chapter 2 walks through every installation step by step.

## How Long Does It Take?

- **Minimum viable setup** (Chapters 0-3): approximately 2 hours. You will have Git, GitHub, VS Code, and Claude Code working, and you will know the core Git workflow.
- **Full workshop** (Chapters 0-6): approximately 4 hours. Adds collaboration, GitHub Pages, and AI-powered workflows.
- **Everything** (all chapters): approximately 6 hours, including LaTeX setup and advanced context management.

You do not need to complete the workshop in one sitting. Each chapter is self-contained and can be picked up where you left off.

## Conventions Used in This Guide

Throughout the workshop, you will encounter the following visual cues:

> **💡 Tip:** Helpful suggestions and shortcuts.

> **📝 Note:** Important context or clarifications.

> **⚠️ Warning:** Things that can go wrong if overlooked — pay attention to these.

**Terminal commands** are shown in code blocks with a `bash` label. You should type these into your terminal (or VS Code's integrated terminal) exactly as shown, replacing any placeholder text (like `yourusername`) with your own details:

```bash
git config --global user.name "Your Name"
```

**Knowledge Check** sections appear at the end of most chapters as expandable sections. Use them to verify your understanding before moving on.

## Getting Help

- **During the workshop:** Raise your hand or message the instructor.
- **Self-guided:** Use Claude Code itself — describe your problem and paste any error messages. It is excellent at diagnosing setup issues and explaining concepts.
- **Online:** The [GitHub Community Forum](https://github.community/) and [Stack Overflow](https://stackoverflow.com/) are reliable resources.

> **💡 Tip:** When asking for help online, include three things: what you were trying to do, what you expected to happen, and what actually happened (including any error messages). This dramatically increases your chances of getting a useful answer.

## About This Workshop

This workshop is part of the [DreamLab AI](https://dreamlab-ai.com/) training programme. It serves as the foundation workshop — the prerequisite infrastructure that all other DreamLab workshops build upon. Whether your next step is web development, data science, creative coding, or academic writing, the tools and workflows established here will serve you throughout.

### What Comes After This Workshop?

Once you have completed this infrastructure workshop, you are prepared for any DreamLab AI specialist workshop. Each builds on the Git, GitHub, VS Code, and AI assistant foundations established here. Check the [DreamLab AI workshops page](https://dreamlab-ai.com/workshops) for the full catalogue.

This guide is a living document. As you work through it, feel free to contribute improvements or ask questions.

---

**Start here**: [Chapter 0: Introduction & Workshop Overview](./00_introduction.md)
