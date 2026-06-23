# Module 13: Quality Assurance & Automation

## Build Bulletproof Software with AI-Powered Testing

Welcome to the morning session of Day 5. Over the next 3 hours, you will master the testing strategies that separate hobbyist code from production-grade software. You will learn to write comprehensive test suites, harness AI tools to generate and maintain tests, and wire everything into automated pipelines that catch bugs before they ever reach your users.

## Module Overview

Quality assurance is the backbone of reliable software delivery. This module takes you from manual, ad-hoc testing through to a fully automated QA pipeline with unit tests, integration tests, end-to-end browser tests, and continuous integration. You will use industry-standard frameworks alongside AI assistants to build safety nets that give you the confidence to ship fast without breaking things.

## Learning Outcomes

By completing this module, you will:

### Core Capabilities
- Understand the testing pyramid and know when to apply each testing level
- Write fast, isolated unit tests with Vitest for JavaScript and TypeScript
- Create integration tests that verify how components and services interact
- Build end-to-end tests with Playwright that simulate real user workflows
- Measure and enforce code coverage thresholds across your projects

### AI-Enhanced Testing Skills
- Use Claude Code to generate comprehensive test suites from existing source files
- Identify untested edge cases with AI-assisted analysis
- Maintain and refactor tests efficiently using AI coding tools
- Generate realistic test data and mock configurations with AI prompts

### Professional Automation
- Configure GitHub Actions workflows to run tests on every commit
- Set up pre-commit hooks that prevent broken code from entering the repository
- Implement mutation testing with Stryker to verify your tests actually catch bugs
- Integrate security scanning and code quality checks into your CI/CD pipeline

### Immediate Benefits
- Leave with a fully automated testing pipeline you can apply to any project
- Achieve 80%+ code coverage as a baseline, with clear paths to 90%+
- Gain confidence to refactor and iterate without fear of regressions
- Understand how professional teams maintain quality at scale

## Module Structure

### Chapter Navigation

1. **[Introduction](00_introduction.md)** -- QA Fundamentals & AI Testing (30 min)
   - Why automated testing matters in 2026
   - The testing pyramid: unit, integration, E2E, visual
   - AI-enhanced testing with Claude Code, GitHub Copilot, and Cursor AI
   - Tools overview: Vitest, Playwright, Stryker, Codecov

2. **[Core Concepts](01_concepts.md)** -- Testing Strategies & Best Practices (45 min)
   - Unit, integration, E2E, and visual regression testing in depth
   - The AAA pattern (Arrange, Act, Assert)
   - Test naming conventions and independence
   - Code coverage metrics and configuration
   - Mutation testing principles
   - Test-driven development (TDD) with the red-green-refactor cycle

3. **[Hands-On Setup](02_hands_on.md)** -- Building Your Testing Environment (60 min)
   - Set up a task manager API project from scratch
   - Configure Vitest with coverage thresholds
   - Write unit tests for validators and models
   - Run tests and interpret coverage reports

4. **[Exercises](03_exercises.md)** -- Build Your Testing Pipeline (45 min)
   - Exercise 1: Integration tests with Supertest for API endpoints
   - Exercise 2: E2E browser tests with Playwright
   - Exercise 3: GitHub Actions CI/CD workflow configuration
   - Exercise 4: ESLint and pre-commit hooks with Husky
   - Exercise 5: Mutation testing with Stryker

5. **[Project](04_project.md)** -- Complete QA Automation Pipeline (45 min)
   - Build a production-ready testing pipeline for a real application
   - Phase 1: Comprehensive test suite (unit, integration, E2E)
   - Phase 2: CI/CD pipeline with quality gates
   - Phase 3: Coverage reporting, mutation testing, performance monitoring
   - Graded deliverables with a 100-point rubric

6. **[Assessment](05_assessment.md)** -- QA Automation Knowledge Check (20 min)
   - 10 multiple-choice questions on testing fundamentals
   - 3 code analysis exercises (identify problems, fix tests, write tests)
   - Practical exercise: build a testing pipeline for an API endpoint
   - Passing score: 70/100

7. **[Resources](06_resources.md)** -- Tools, Libraries & Further Learning
   - Testing framework reference (Vitest, Jest, Playwright, pytest)
   - Quality tools (Codecov, Stryker, ESLint, Prettier)
   - CI/CD platform guides (GitHub Actions, GitLab CI, CircleCI)
   - Books, courses, and community links

## Who This Module Is For

### Ideal Participants
- **Web Developers** building React, Node.js, or Python applications who want automated quality gates
- **Full-Stack Engineers** who need to test APIs, databases, and browser workflows end-to-end
- **Team Leads** responsible for establishing testing culture and CI/CD practices
- **Career Changers** preparing for developer roles where testing is a core competency
- **Open Source Contributors** who need to write tests that meet project standards

### You Will Succeed If You
- Have basic JavaScript or TypeScript knowledge (functions, async/await, modules)
- Can run npm commands in a terminal
- Understand Git fundamentals (clone, commit, push)
- Are comfortable with a code editor (VS Code recommended)

### No Prior Experience Required In
- Testing frameworks or test-driven development
- CI/CD platforms or GitHub Actions
- Mutation testing or coverage analysis
- AI-assisted coding tools

## What You Will Build

By the end of this module, you will have a working project that includes:

- **Unit tests** covering validators, models, and utility functions with 90%+ coverage
- **Integration tests** verifying full CRUD operations through API endpoints
- **End-to-end tests** simulating user workflows across browsers with Playwright
- **GitHub Actions workflow** that runs all tests, enforces coverage, and gates deployments
- **Pre-commit hooks** that lint and test locally before code enters the repository
- **Mutation testing configuration** that verifies your tests genuinely catch bugs

## Technical Requirements

### Software
- **Node.js 20+** and npm 9+
- **Git 2.30+** with a GitHub account
- **VS Code** with Vitest and Playwright extensions (recommended)
- **Modern browser** (Chrome, Firefox, or Edge)

### Hardware
- 8 GB RAM minimum (16 GB recommended)
- 5 GB free storage for Node.js, dependencies, and Playwright browsers
- Stable internet connection for npm downloads

### Installed During the Workshop
- Vitest, @vitest/ui, @vitest/coverage-v8
- @playwright/test (plus browser binaries, ~500 MB)
- Supertest, Husky, lint-staged
- @stryker-mutator/core

## Module Timing

| Section | Duration | Format |
|---------|----------|--------|
| Introduction | 30 min | Concepts + demonstration |
| Core Concepts | 45 min | Theory with code examples |
| Hands-On Setup | 60 min | Guided coding |
| Exercises | 45 min | Self-paced with support |
| **Total** | **3 hours** | 60% hands-on, 40% concepts |

Take breaks as needed -- this is dense, practical material. The project and assessment can extend into self-study time if required.

## Ready to Start?

### Quick Readiness Check
- [ ] Node.js 20+ installed (`node --version`)
- [ ] Git configured and GitHub account ready
- [ ] Code editor open with terminal access
- [ ] 3 hours of focused time blocked
- [ ] A project in mind that needs better testing (or use our starter)

### Begin the Module

**[Start with the Introduction -->](00_introduction.md)**

Or jump directly to:
- [Core Concepts](01_concepts.md) -- Testing strategies and best practices
- [Hands-On Setup](02_hands_on.md) -- Start building your test environment
- [Prerequisites](prerequisites.md) -- Detailed setup and troubleshooting guide

---

## Navigation

| Direction | Link |
|-----------|------|
| Objectives | [Learning Objectives](objectives.md) |
| Prerequisites | [Prerequisites & Setup](prerequisites.md) |
| First Chapter | [Introduction](00_introduction.md) |

---

*Quality is not something you bolt on at the end -- it is built into every line of code from day one. Let's make testing effortless, automatic, and effective.*

**[Start Module 13: Introduction -->](00_introduction.md)**
