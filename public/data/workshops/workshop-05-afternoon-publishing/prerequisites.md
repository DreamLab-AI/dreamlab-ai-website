# Prerequisites - Publishing & Deployment

## Required Knowledge

### Git & GitHub (Essential)
- Basic Git commands (clone, add, commit, push, pull)
- Understanding of branches and pull requests
- Experience with GitHub repositories
- **Completion of Workshop 04 recommended**

### Web Development Fundamentals
- Basic understanding of frontend frameworks (React, Vue, or similar)
- Node.js and npm/yarn package management
- RESTful API concepts
- Environment variables and configuration

### Command Line Basics
- Navigating directories (cd, ls, pwd)
- Running npm commands
- Using package managers
- Basic shell scripting knowledge (helpful but not required)

---

## Required Setup

### Essential Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version   # Should be 9.0.0 or higher
   ```
   Install from: [nodejs.org](https://nodejs.org/)

2. **Git**
   ```bash
   git --version  # Should be 2.30.0 or higher
   ```
   Install from: [git-scm.com](https://git-scm.com/)

3. **Code Editor**
   - VS Code (recommended) with extensions:
     - YAML
     - GitHub Actions
     - Vercel
   - Or any text editor you're comfortable with

4. **GitHub CLI (Optional but Recommended)**
   ```bash
   gh --version
   ```
   Install from: [cli.github.com](https://cli.github.com/)

### Platform Accounts (All Free Tiers)

Create accounts on these platforms **before the workshop**:

1. **GitHub Account**
   - Sign up: [github.com](https://github.com/)
   - Enable two-factor authentication (2FA)
   - Have a test repository ready

2. **Vercel Account**
   - Sign up with GitHub: [vercel.com/signup](https://vercel.com/signup)
   - No credit card required for hobby tier

3. **Railway Account**
   - Sign up with GitHub: [railway.app](https://railway.app/)
   - $5 free trial credit provided

4. **Optional: Netlify**
   - Sign up: [netlify.com](https://netlify.com/)
   - Useful for JAMstack deployments

---

## Recommended Preparation

### Before the Workshop

1. **Review Git Basics** (30 minutes)
   - Ensure you can create branches, commit, and push
   - Test SSH or HTTPS authentication with GitHub

2. **Have a Test Project Ready** (15 minutes)
   - Simple React app (or create during workshop with Vite)
   - Basic Node.js Express API (or create during workshop)
   - Any project you want to deploy

3. **Install CLI Tools** (15 minutes)
   ```bash
   # Vercel CLI
   npm install -g vercel

   # Railway CLI
   npm install -g @railway/cli

   # GitHub CLI (optional)
   # See: https://cli.github.com/
   ```

4. **Test GitHub Authentication**
   ```bash
   # SSH method
   ssh -T git@github.com

   # Or HTTPS method
   git clone https://github.com/your-username/test-repo.git
   ```

### Optional Preparation

- **Python 3.8+** (for MkDocs documentation)
  ```bash
  python3 --version
  pip3 --version
  ```

- **Docker** (for advanced deployment scenarios)
  ```bash
  docker --version
  ```

---

## Technical Requirements

### Hardware
- **CPU:** Dual-core processor (2+ cores)
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB free space
- **Display:** 1920x1080 or higher recommended

### Software
- **Operating System:** Windows 10+, macOS 10.15+, or Linux
- **Browser:** Chrome, Firefox, Safari, or Edge (latest version)
- **Terminal:** Command Prompt, PowerShell, Terminal, or iTerm2

### Network
- **Internet Connection:** Stable broadband (10+ Mbps)
- **Firewall:** Must allow HTTPS traffic (port 443)
- **Proxy:** If behind corporate proxy, ensure CLI tools can access internet

---

## Pre-Workshop Checklist

Complete this checklist **24 hours before** the workshop:

### Accounts & Authentication
- [ ] GitHub account created and 2FA enabled
- [ ] Vercel account created (signed up with GitHub)
- [ ] Railway account created (signed up with GitHub)
- [ ] Git authentication working (SSH or HTTPS)

### Software Installation
- [ ] Node.js 18+ installed and verified
- [ ] npm or yarn package manager working
- [ ] Git installed and configured
- [ ] Code editor installed with recommended extensions

### CLI Tools
- [ ] Vercel CLI installed (`vercel --version` works)
- [ ] Railway CLI installed (`railway --version` works)
- [ ] GitHub CLI installed (optional)

### Test Project
- [ ] Have a simple React/Node.js project ready, or
- [ ] Ready to create new project during workshop

### Knowledge Review
- [ ] Can create Git branches and commits
- [ ] Understand what a pull request is
- [ ] Know how to push code to GitHub
- [ ] Familiar with npm/yarn commands

---

## Troubleshooting Common Setup Issues

### Node.js Installation Issues

**Problem:** `node: command not found`

**Solution:**
1. Download installer from [nodejs.org](https://nodejs.org/)
2. Restart terminal after installation
3. Verify PATH includes Node.js

### Git Authentication Issues

**Problem:** `Permission denied (publickey)`

**Solution:**
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to SSH agent: `ssh-add ~/.ssh/id_ed25519`
3. Add public key to GitHub: Settings → SSH and GPG keys

**Alternative:** Use HTTPS with Personal Access Token (PAT)

### Vercel CLI Login Issues

**Problem:** Can't authenticate Vercel CLI

**Solution:**
```bash
# Login via browser
vercel login

# Or use token
vercel login --token YOUR_TOKEN
```

### Railway CLI Issues

**Problem:** `railway: command not found`

**Solution:**
```bash
# Reinstall globally
npm install -g @railway/cli

# Or use npx
npx @railway/cli login
```

---

## Getting Help

If you encounter setup issues:

1. **Check Documentation**
   - [Vercel Docs](https://vercel.com/docs)
   - [Railway Docs](https://docs.railway.app/)
   - [GitHub Docs](https://docs.github.com/)

2. **Workshop Discord Channel**
   - Ask questions in `#workshop-05-help`
   - Share error messages and screenshots

3. **Office Hours**
   - Schedule 15-minute session before workshop
   - Available Monday-Friday, 9 AM - 5 PM

4. **Day-Of Support**
   - Arrive 15 minutes early for setup help
   - Teaching assistants available

---

## What You'll Install During Workshop

These will be installed together during hands-on exercises:

- MkDocs Material (Python package for documentation)
- Specific project dependencies (Vite, Express, etc.)
- GitHub Actions workflows (created in repository)

**No need to install these beforehand!**

---

## Ready to Deploy?

Once you've completed the pre-workshop checklist, you're ready for the afternoon session. We'll take you from zero to production deployment in 3 hours!

**See you at the workshop!** 🚀
