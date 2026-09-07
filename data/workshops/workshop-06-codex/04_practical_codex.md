# Chapter 4: Practical Applications — Real-World Examples and Walkthroughs

> **June 2026:** Theory is useful; practice is essential. This chapter provides 50+ real-world scenarios spanning beginner tasks through advanced agent workflows, with step-by-step walkthroughs for Claude Code, Codex CLI, and IDE-integrated tools.

## From Reading to Doing

The previous chapters covered the landscape, setup, and mastery techniques for AI coding agents. This chapter is where you apply that knowledge to real work. Each section presents progressively more complex tasks, showing exactly how to prompt the agent, what to expect, and how to verify the results.

The examples here are drawn from common development workflows — the kinds of tasks that software engineers encounter daily. They are not contrived demonstrations; they are the scenarios where AI coding agents deliver measurable productivity gains. Whether you are fixing a typo, implementing a feature across multiple files, or running a security audit on an entire codebase, this chapter shows you how.

### How to Use This Chapter

Each task walkthrough follows a consistent structure:

1. **Scenario** — What you are trying to accomplish and why
2. **Prompt** — The exact instruction you would give to Claude Code or Codex CLI
3. **Agent Action** — What the agent does: which files it reads, what changes it makes, which commands it runs
4. **Expected Output** — What the result looks like, including code samples where relevant
5. **Verification** — How to confirm the agent did the right thing

We recommend working through the beginner tasks even if you are an experienced developer. They establish the interaction patterns — prompting, reviewing, iterating — that scale to more complex work.

## What You Will Learn

By the end of this chapter, you will be able to:

- **Handle everyday tasks efficiently** — Typo fixes, code explanation, boilerplate generation, and simple refactors
- **Tackle intermediate challenges** — Bug fixing with stack traces, component refactoring, adding comprehensive test suites, and API endpoint implementation
- **Execute advanced workflows** — Full project scaffolding, automated pull request reviews, security audits, code transpilation, database migration generation, and multi-agent task decomposition

## Chapter Structure

### [4.a: Beginner Tasks](./04_a_beginner_tasks.md)

Quick wins that demonstrate core agent capabilities and build confidence:

- **Quick fixes and typos** — Finding and correcting errors in code and documentation
- **Code explanation** — Understanding unfamiliar code, from complex regular expressions to entire modules
- **Boilerplate generation** — Scaffolding common patterns: API routes, React components, database models, configuration files
- **Simple refactoring** — Renaming variables, extracting functions, converting between coding styles
- **Documentation generation** — Creating JSDoc comments, README sections, and inline documentation from existing code

These tasks typically complete in under a minute and require minimal review. They are the "quick delegation" pattern from Chapter 7's best practices: send a 30-second prompt, get an 80% complete result, and iterate if needed.

### [4.b: Intermediate Tasks](./04_b_intermediate_tasks.md)

Tasks that demonstrate the agent's ability to reason about code and make multi-step changes:

- **Bug fixing with stack traces** — Providing an error trace and letting the agent locate, diagnose, and fix the root cause
- **Component refactoring** — Restructuring React components, extracting shared logic into hooks, or migrating class components to functional ones
- **Adding unit tests** — Generating comprehensive test suites for existing code, including edge cases, mocks, and test data
- **Feature implementation** — Building new features that integrate with existing code patterns and conventions
- **API endpoint creation** — Adding new routes with validation, error handling, and database integration

These tasks require more review than beginner ones. The agent will read multiple files, plan a multi-step approach, and make changes across several locations. Your CLAUDE.md or AGENTS.MD configuration becomes important here — it guides the agent toward your project's patterns rather than generic solutions.

### [4.c: Advanced Scenarios](./04_c_advanced_scenarios.md)

Complex, multi-file workflows that showcase the full power of agentic coding:

- **Project scaffolding** — Generating entire project structures from a natural language description, complete with build configuration, test setup, and CI/CD pipelines
- **Pull request reviews** — Automated code review that analyses diffs, identifies issues, and provides actionable feedback
- **Security audits** — Scanning a codebase for common vulnerabilities (XSS, SQL injection, IDOR, insecure authentication) and proposing fixes
- **Code transpilation** — Converting codebases between languages or frameworks (JavaScript to TypeScript, REST to GraphQL, Express to Fastify)
- **Database migration generation** — Creating migration files from schema changes, with rollback support
- **Multi-agent workflows** — Using Claude Code's subagents to parallelise independent tasks across a large codebase

These scenarios often involve Claude Code's advanced features: MCP servers for database access, hooks for automated testing, and subagents for parallel execution. They represent the kind of work where AI coding agents save hours rather than minutes.

## Tool Recommendations by Task Complexity

| Complexity | Recommended Tool | Model | Typical Duration |
|------------|-----------------|-------|-----------------|
| **Beginner** | Any (Claude Code, Codex CLI, ChatGPT, Copilot) | Sonnet 4.6, o4-mini | Under 1 minute |
| **Intermediate** | Claude Code or Codex CLI | Sonnet 4.6 or GPT-4o | 1-5 minutes |
| **Advanced** | Claude Code (MCP, hooks, subagents) | Opus 4.8 or Fable 5 | 5-30 minutes |

For intermediate and advanced tasks, terminal agents significantly outperform chat-based tools because they can read your codebase, execute commands, and iterate autonomously. IDE tools like Cursor (via Composer) can handle intermediate tasks well but lack the automation capabilities of terminal agents for advanced scenarios.

## Estimated Time

| Section | Time Required | Outcome |
|---------|--------------|---------|
| 4.a: Beginner Tasks | 30-45 min | Core interaction patterns mastered |
| 4.b: Intermediate Tasks | 60-90 min | Multi-step agent workflows practised |
| 4.c: Advanced Scenarios | 90-120 min | Complex, multi-file agent use cases completed |
| **Total** | **3-4 hours** | **Practical fluency with real-world tasks** |

## A Note on Verification

Every example in this chapter should be verified before merging into production code. AI agents produce correct, working code the majority of the time — but "the majority" is not "always." Run the tests. Read the diff. Check the edge cases. The exercises in this chapter include verification steps precisely because building the habit of reviewing agent output is as important as learning to prompt effectively.

---

**Next:** [4.a: Beginner Tasks](./04_a_beginner_tasks.md)

---

*Last Updated: June 2026 | 50+ real-world examples for Claude Code, Codex CLI, Cursor, and Copilot*
