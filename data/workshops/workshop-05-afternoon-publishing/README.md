# Phase 9: QA, Publishing & Capstone

## Ship Your Work to the World with Modern Publishing & Deployment

Welcome to Phase 9 (QA, Publishing & Capstone). Over the next 3 hours, you will learn how to take applications from your local machine to production-ready deployments on modern cloud platforms. You will build automated CI/CD pipelines, deploy to multiple environments, and publish professional documentation -- the complete publishing toolkit that professional teams rely on in 2026.

## Workshop Overview

Building software is only half the story. Getting it in front of users -- reliably, securely, and repeatably -- is the other half. This workshop covers the entire journey from code commit to live production URL, including deployment platforms (Vercel, Railway, Cloudflare Pages), GitHub Actions automation, environment management, and documentation publishing with MkDocs Material, Storybook, and OpenAPI. By the end, you will have live deployments with automated pipelines that update every time you push.

## Learning Outcomes

By completing this workshop, you will:

### Core Capabilities
- Deploy a React application to Vercel with automatic HTTPS and global CDN
- Deploy a Node.js API to Railway with PostgreSQL database provisioning
- Build and publish a documentation site using MkDocs Material
- Configure separate development, preview, and production environments
- Manage secrets and environment variables securely across platforms

### CI/CD & Automation Skills
- Write GitHub Actions workflows from scratch for automated testing and deployment
- Set up preview deployments that give every pull request its own live URL
- Implement quality gates that prevent broken code from reaching production
- Configure automated rollbacks and health-check monitoring

### Documentation & Publishing
- Create interactive API documentation with OpenAPI and Swagger UI
- Build component library documentation with Storybook
- Publish user guides with MkDocs Material, complete with search and dark mode
- Automate documentation updates via CI/CD on every merge to main

### Immediate Benefits
- Leave with three live deployments: a React app, an API, and a documentation site
- Own a reusable GitHub Actions workflow template for future projects
- Understand the deployment landscape well enough to choose the right platform for any project
- Deploy confidently, knowing that automated tests and quality gates protect production

## Workshop Structure

### Chapter Navigation

1. **[Introduction](00_introduction.md)** -- Modern Publishing & Deployment (20 min)
   - What you will build today: deployment pipeline, live apps, documentation site
   - Why deployment has changed: preview URLs, zero-downtime, AI-assisted config
   - Session overview and success metrics
   - Prerequisites check

2. **[Core Concepts](01_concepts.md)** -- Deployment Platforms & Strategies (60 min)
   - Frontend-first platforms: Vercel, Netlify, Cloudflare Pages
   - Backend and full-stack platforms: Railway, Render
   - GitHub Actions architecture: workflows, events, jobs, and steps
   - The three-environment strategy (development, preview, production)
   - Documentation publishing: Storybook, OpenAPI/Swagger, MkDocs Material
   - Platform comparison matrix for informed decision-making

3. **[Hands-On Practice](02_hands_on.md)** -- Deploy to Production (90 min)
   - Exercise 1: Deploy a React app to Vercel (CLI and dashboard methods)
   - Exercise 2: Deploy a Node.js Express API to Railway with PostgreSQL
   - Exercise 3: Build and deploy a documentation site with MkDocs Material
   - Bonus: GitHub Actions automation for all three deployments
   - Troubleshooting guide for common deployment issues

4. **[Exercises](03_exercises.md)** -- Advanced Deployment Patterns (45 min)
   - Exercise 1: Preview deployments for pull requests
   - Exercise 2: Multi-environment setup (dev, staging, production)
   - Exercise 3: Storybook component library deployment
   - Exercise 4: Interactive API documentation with OpenAPI/Swagger
   - Challenges: zero-downtime deployment, automated rollbacks, Sentry monitoring

5. **[Project](04_project.md)** -- Full-Stack Deployment Pipeline (60 min)
   - Build and deploy a complete AI-powered task manager
   - Phase 1: Backend API on Railway with JWT auth and PostgreSQL
   - Phase 2: React frontend on Vercel with state management
   - Phase 3: Documentation site on GitHub Pages
   - Phase 4: End-to-end CI/CD pipeline with GitHub Actions
   - Success criteria checklist and bonus enhancements

6. **[Assessment](05_assessment.md)** -- Publishing & Deployment Mastery (20 min)
   - 20 multiple-choice questions across platform selection, CI/CD, environments, and best practices
   - 3 practical tasks: deploy a React app, create a CI/CD workflow, set up documentation
   - Passing score: 36/45 (80%)

7. **[Resources](06_resources.md)** -- Platforms, Tools & Further Learning
   - Official documentation links for Vercel, Railway, Netlify, Cloudflare Pages
   - GitHub Actions reference and starter workflows
   - Documentation tool guides (MkDocs Material, Storybook, Docusaurus, OpenAPI)
   - CLI cheat sheets, video tutorials, books, and community links

## Who This Workshop Is For

### Ideal Participants
- **Web Developers** who build locally but have never deployed to production platforms
- **Full-Stack Engineers** ready to automate their deployment workflows with CI/CD
- **Team Leads** establishing deployment standards and environment strategies
- **Freelancers and Consultants** who need to ship client projects with professional hosting
- **Open Source Maintainers** who want automated documentation publishing and preview deployments

### You Will Succeed If You
- Have basic Git and GitHub experience (branches, commits, pull requests)
- Can work with npm and run Node.js applications locally
- Understand what a REST API is (even if you have not built one from scratch)
- Are comfortable with a terminal and a code editor

### No Prior Experience Required In
- Cloud deployment platforms (Vercel, Railway, Netlify)
- GitHub Actions or any CI/CD tool
- Docker or containerisation
- Documentation site generators

## What You Will Build

By the end of this workshop, you will have:

- **A live React application** deployed to Vercel with automatic HTTPS, CDN, and preview URLs per PR
- **A live Node.js API** deployed to Railway with environment variables and optional PostgreSQL
- **A documentation site** published to GitHub Pages via MkDocs Material with search, dark mode, and code highlighting
- **GitHub Actions workflows** that automatically test, build, and deploy on every push to main
- **Environment variable management** across development, preview, and production tiers

## Technical Requirements

### Software
- **Node.js 20+** and npm 9+
- **Git 2.30+** with a configured GitHub account
- **VS Code** with YAML and GitHub Actions extensions (recommended)
- **Python 3.10+** (for MkDocs Material -- installed during the workshop)
- **Modern browser** (Chrome, Firefox, or Edge)

### Platform Accounts (Free Tiers)
- **GitHub** -- repository hosting and Actions CI/CD
- **Vercel** -- frontend deployment (sign up with GitHub, no credit card)
- **Railway** -- backend deployment ($5 hobby credit included)

### Hardware
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free storage
- Stable internet connection for deployments and npm downloads

### Installed During the Workshop
- Vercel CLI, Railway CLI
- MkDocs Material (Python package)
- Project dependencies (Vite, Express, cors, dotenv)

## Workshop Timing

| Section | Duration | Format |
|---------|----------|--------|
| Introduction | 20 min | Context setting and prerequisites |
| Core Concepts | 60 min | Platform deep-dives with diagrams |
| Hands-On Practice | 90 min | Three guided deployments |
| Exercises | 45 min | Advanced patterns, self-paced |
| **Total** | **3 hours** | 70% hands-on, 30% concepts |

The project and assessment extend naturally into self-study time. Take breaks as needed -- you will be switching between platforms frequently.

## Ready to Start?

### Quick Readiness Check
- [ ] Node.js 20+ installed (`node --version`)
- [ ] Git configured and GitHub account active
- [ ] Vercel account created (free tier, signed up with GitHub)
- [ ] Railway account created (free tier)
- [ ] Code editor open with terminal access
- [ ] 3 hours of focused time blocked

### Begin the Workshop

**[Start with the Introduction -->](00_introduction.md)**

Or jump directly to:
- [Core Concepts](01_concepts.md) -- Deployment platforms and CI/CD strategies
- [Hands-On Practice](02_hands_on.md) -- Deploy your first application immediately
- [Prerequisites](prerequisites.md) -- Detailed setup, accounts, and troubleshooting

---

## Navigation

| Direction | Link |
|-----------|------|
| Objectives | [Learning Objectives](objectives.md) |
| Prerequisites | [Prerequisites & Setup](prerequisites.md) |
| First Chapter | [Introduction](00_introduction.md) |

---

*Building software is half the job. Shipping it reliably is the other half. Let's get your work live.*

**[Start Phase 9: Introduction -->](00_introduction.md)**
