# Prerequisites - Workshop 01 Afternoon: Visual Tools & Version Control

## Before You Begin

This session builds directly on the Phase 1 (Foundations) VS Code setup. Ensure you meet these requirements for the smoothest experience.

## Required Knowledge

### Essential Skills
- **Phase 1 (Foundations) Complete** (or equivalent)
  - VS Code installed and running
  - Comfortable navigating the VS Code interface
  - Know how to install extensions from the marketplace
  - Can create and edit Markdown files
  - Understand basic AI assistant usage (Continue, Copilot, or similar)

- **Basic Computer Literacy**
  - Comfortable with files and folders
  - Can navigate web browsers
  - Basic typing proficiency
  - Can follow step-by-step instructions

- **No Programming Experience Required**
  - This workshop uses visual tools throughout
  - Git commands are demonstrated but optional — VS Code handles everything
  - Mermaid syntax is closer to writing notes than writing code

### Helpful (But Not Required)
- Experience with Microsoft Word's Track Changes feature
- Familiarity with cloud storage (OneDrive, Google Drive, Dropbox)
- Basic awareness of what "version control" means conceptually
- Experience with any diagramming tool (Visio, Lucidchart, Draw.io)

## Technical Requirements

### Hardware Specifications

**Minimum Requirements:**
- **Processor:** Dual-core CPU (2015 or newer)
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 2GB free disk space
- **Display:** 1280x720 resolution minimum

**Recommended Specifications:**
- **Processor:** Quad-core CPU
- **RAM:** 8GB or more
- **Storage:** 5GB free (for extensions, repositories, and projects)
- **Display:** 1920x1080 or higher (helpful for side-by-side diff views)

### Operating System

**Supported Platforms:**
- Windows 10 or 11 (64-bit)
- macOS 10.15 (Catalina) or newer
- Ubuntu 20.04+, Debian 10+, Fedora 36+

**Administrator Access Required:**
- Ability to install software (Git, extensions)
- Permission to modify system PATH (Git installer handles this)

### Internet Connection

**Requirements:**
- **Speed:** 5 Mbps minimum (for GitHub operations)
- **Stability:** Consistent connection preferred (Git push/pull requires connectivity)
- **Data:** ~200MB for initial Git + extension setup
- **Ongoing:** GitHub operations require internet; local Git works offline

## Software Prerequisites

### Must Be Ready Before This Session

**1. VS Code (from Phase 1)**
- Latest stable version installed
- Basic configuration complete
- Comfortable opening files and using the command palette

**2. Git**
- Usually bundled with VS Code installation
- **Verify:** Open VS Code terminal (`Ctrl+``) and type:
  ```bash
  git --version
  ```
  You should see something like `git version 2.45.0` or newer.

- **If not installed:**
  - **Windows:** Download from https://git-scm.com/download/win
  - **macOS:** Run `xcode-select --install` in Terminal
  - **Linux:** `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora)

**3. Essential VS Code Extensions**
- **GitLens** (`eamodio.gitlens`) — visual Git superpowers
- **Markdown All in One** (`yzhang.markdown-all-in-one`) — Markdown editing
- **Mermaid Markdown** (`bierner.markdown-mermaid`) — diagram preview

  **Install all three:**
  ```bash
  code --install-extension eamodio.gitlens
  code --install-extension yzhang.markdown-all-in-one
  code --install-extension bierner.markdown-mermaid
  ```

  Or search for each in VS Code's Extensions panel (`Ctrl+Shift+X`).

### Will Install/Configure During Workshop

We'll set these up together during the hands-on section:
- Git user identity (name and email)
- GitHub account connection
- GitLens configuration preferences
- Optional: Git Graph extension (`mhutchie.git-graph`)
- Optional: GitHub Pull Requests extension (`GitHub.vscode-pull-request-github`)

## Account Setup

### Required (Free)

**GitHub Account**
- Visit: https://github.com/signup
- Free account is sufficient for everything in this workshop
- Choose a professional username (this becomes your portfolio URL)
- Verify your email address
- Enable two-factor authentication (recommended)

**What you'll use GitHub for:**
- Cloud backup of all your work
- Professional portfolio showcasing projects
- Collaboration with colleagues
- Free website hosting (GitHub Pages)

### Not Required
- No paid subscriptions needed
- No credit card required
- No premium GitHub features needed
- Free tier covers all workshop activities

## Project Preparation

### Bring Real Work

**Most Effective Learning:**
Have at least one real project in mind for the exercises:
- A document or report you're currently working on
- A process or workflow you'd like to diagram
- A project timeline you need to visualise
- Research notes that need better organisation

**Suggested Projects by Profession:**
- **Academic:** Research methodology diagram + paper version history
- **Business:** Quarterly project Gantt chart + proposal tracking
- **Project Manager:** Team workflow diagram + deliverable tracking
- **Creative:** Portfolio case study + visual brand process map
- **Consultant:** Client engagement flowchart + report versioning

### Workspace Setup

**If you completed Phase 1, you should already have:**
```
Documents/
  └── AI-Workshop/
      ├── phase-1-foundations/  (from Phase 1)
      └── phase-2-visual-vc/   (we'll use this today)
```

**If starting fresh, create this structure:**
1. Open VS Code
2. Create a new folder: `Documents/AI-Workshop/phase-2-visual-vc/`
3. Open it in VS Code: `File > Open Folder`

## Git Identity Setup

### Configure Before the Session (2 Minutes)

Git needs to know who you are for commit history. Open VS Code's terminal (`Ctrl+``) and run:

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"
```

**Use the same email** as your GitHub account for proper attribution.

**Verify:**
```bash
git config --global user.name
git config --global user.email
```

## Mental Preparation

### Set Expectations

**This Workshop IS:**
- Hands-on with visual tools (not command-line heavy)
- Focused on practical documentation skills
- Suitable for non-programmers and non-technical professionals
- About building habits you'll use every day
- Progressive — starts simple, builds complexity

**This Workshop IS NOT:**
- A software development course
- Command-line focused (we use visual tools throughout)
- Theory-heavy or academic
- Expecting prior Git knowledge
- Rushing through material (take breaks as needed)

### Time Commitment

**Workshop Duration:** 3 hours

**Schedule:**
- 00:00–00:30: Core concepts (visual thinking + Git fundamentals)
- 00:30–02:00: Hands-on practice (diagrams, GitLens, workflows)
- 02:00–02:30: Practical exercises (progressive challenges)
- 02:30–02:50: Real project application
- 02:50–03:00: Assessment and next steps

**Post-Workshop:**
- 30 minutes: Push your project to GitHub
- 1 week: Daily commits on real work
- 1 month: Visual documentation as standard practice

## Pre-Session Checklist

### One Day Before

- [ ] Verify VS Code is installed and working
- [ ] Confirm Git is installed (`git --version` in terminal)
- [ ] Create a free GitHub account (https://github.com/signup)
- [ ] Install GitLens, Markdown All in One, and Mermaid Markdown extensions
- [ ] Identify a real project to work on
- [ ] Clear your calendar for 3 uninterrupted hours

### One Hour Before

- [ ] Open VS Code and verify extensions are active
- [ ] Run `git config --global user.name` to verify Git identity
- [ ] Close unnecessary applications (free up RAM)
- [ ] Disable notifications for focused work
- [ ] Have this workshop page open and ready
- [ ] Prepare your real project files

## Getting Help

### During the Workshop

**If you encounter issues:**
1. Check the troubleshooting section in the relevant chapter
2. Ask in the workshop Discord channel
3. Note the issue and continue — most steps are independent

**Common Setup Issues:**
- **Git not found:** Restart VS Code after installing Git
- **Extensions not loading:** Run `Developer: Reload Window` from command palette
- **GitHub login fails:** Check email verification and try again
- **Slow performance:** Close other applications, restart VS Code

### After the Workshop

**Support Channels:**
- Workshop Discord channel
- Email: workshop@dreamlab.ai
- Office Hours: Fridays 2–3pm GMT
- Documentation: This website and linked resources

## Accessibility

### Accommodations Available

**We support:**
- Screen readers (VS Code has excellent accessibility)
- Keyboard-only navigation (all Git operations via command palette)
- High-contrast themes (VS Code built-in)
- Adjustable font sizes
- Caption/transcript requests for video content

**Request Accommodations:**
- Email: accessibility@dreamlab.ai
- 48 hours' notice preferred
- Alternative formats available on request

## FAQ

### "I missed Phase 1. Can I still do this?"
**Yes**, if you have VS Code installed with the required extensions. Review the Phase 1 hands-on chapter for basic setup, then proceed here.

### "Do I need to know how to code?"
**No.** Mermaid syntax is descriptive text, not programming. Git operations are handled through VS Code's visual interface. Everything is explained from first principles.

### "Is Git really necessary for non-developers?"
**Absolutely.** Version control is for anyone who creates documents. It replaces the "Final_v2_FINAL_revised.doc" nightmare with clean, trackable history.

### "What if I make a mistake with Git?"
**Git is designed to be forgiving.** Nearly everything can be undone. The hands-on section covers common recovery scenarios, and the visual tools make it clear what's happening at every step.

### "Will my work be public on GitHub?"
**Only if you choose.** You can create private repositories that only you can see. The workshop covers privacy controls explicitly.

## Ready to Transform Your Workflow?

If you meet these prerequisites, you're prepared for an afternoon that will permanently change how you create and manage documentation.

**See you in the session!**

---

[Proceed to Workshop -->](./00_introduction.md) | [Back to Workshop Overview](README.md)
