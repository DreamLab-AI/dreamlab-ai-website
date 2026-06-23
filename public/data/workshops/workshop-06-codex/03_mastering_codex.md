# Chapter 3: Mastering AI Coding Agents — From Basic Prompts to Advanced Workflows

> **June 2026:** Agentic coding tools are only as effective as your ability to direct them. This chapter teaches you the four core skills that separate productive agent users from frustrated ones: prompting, project configuration, task management, and advanced automation.

## The Shift from Chat to Agency

The biggest conceptual leap for developers adopting AI coding agents is understanding that these tools are not chat interfaces — they are autonomous systems that read your codebase, plan multi-step changes, execute shell commands, and iterate on results. Your role shifts from writing code to directing an agent: providing context, decomposing problems, reviewing output, and refining instructions.

This is not a minor workflow adjustment. It is a fundamentally different mode of software development. The developer who writes "fix the bug in auth" and the developer who writes "read `src/auth/middleware.ts`, identify why the JWT validation fails for expired tokens, fix the issue, add a test case that covers token expiry, and run the test suite to confirm the fix" will get dramatically different results — even from the same tool and model.

The skills in this chapter apply equally to Claude Code and OpenAI Codex CLI, with tool-specific details noted where they diverge.

## What You Will Learn

By the end of this chapter, you will be able to:

- **Craft effective prompts** that consistently produce high-quality, production-ready code
- **Configure CLAUDE.md and AGENTS.MD files** that encode your project's conventions, constraints, and context for every session
- **Decompose complex tasks** into agent-executable subtasks, managing parallel workstreams and iterating on results
- **Use advanced features** including MCP servers, hooks, subagents, CI/CD integration, model selection strategies, and multimodal input

## Chapter Structure

### [3.a: Effective Prompting Strategies](./03_a_effective_prompting_strategies.md)

Prompting is the primary interface between you and the agent. This section covers the principles and patterns that produce reliable results:

- **Clarity and specificity** — Why "add input validation to the `createUser` function in `src/routes/users.ts` using Zod schemas" outperforms "add validation to the user route"
- **Providing context** — When to reference specific files, include error messages, or describe the desired output format
- **Iterative refinement** — Breaking complex tasks into sequential prompts, validating at each step, and building on partial results
- **Anti-patterns** — Common prompting mistakes that waste tokens and produce poor results
- **Tool-specific tips** — Differences in how Claude Code and Codex CLI interpret and execute prompts

The prompting strategies here are grounded in real-world usage patterns. A well-constructed prompt does not just describe the desired output — it gives the agent enough context to make good decisions about implementation details you have not explicitly specified.

### [3.b: CLAUDE.md and AGENTS.MD Configuration](./03_b_the_crucial_role_of_agents_md.md)

Project configuration files are the single highest-leverage action you can take to improve agent output. This section covers:

- **CLAUDE.md** — Claude Code's hierarchical configuration system (global, project, subdirectory), what to include (tech stack, conventions, forbidden actions, build/test commands), and real-world examples
- **AGENTS.MD** — Codex CLI's equivalent, with its own format and conventions
- **What to include** — Tech stack, coding conventions, testing procedures, forbidden actions, architectural decisions, and known edge cases
- **What to exclude** — Secrets, overly verbose documentation, and instructions that change frequently
- **Maintenance** — Treating configuration files as living documentation that evolves with your project

A five-line CLAUDE.md that specifies your framework, test runner, and key conventions will eliminate half of the avoidable mistakes agents make on your codebase. A fifty-line one can eliminate nearly all of them.

### [3.c: Managing Tasks Efficiently](./03_c_managing_tasks_efficiently.md)

Agentic tools excel at well-scoped tasks and struggle with vague, unbounded ones. This section covers:

- **Task decomposition** — Breaking features into agent-sized units of work
- **Approval modes** — Choosing the right autonomy level (Claude Code's interactive mode, Codex CLI's suggest/auto-edit/full-auto) for each task
- **Parallel execution** — Using Claude Code's subagents or multiple terminal sessions to work on independent tasks simultaneously
- **Review workflows** — Evaluating agent output with the same rigour you apply to human pull requests
- **Session management** — When to start fresh, when to resume, and how to use `/compact` to manage long conversations

### [3.d: Advanced Techniques](./03_d_advanced_techniques.md)

Once you are comfortable with the fundamentals, these advanced features unlock the full potential of agentic coding:

- **MCP servers** — Connecting Claude Code to databases, GitHub, browsers, Slack, and custom APIs via the Model Context Protocol
- **Hooks** — Automating pre/post actions (run linters after edits, execute tests before commits, send notifications on completion)
- **Subagents** — Spawning parallel child agents for independent subtasks
- **Agent SDK** — Building custom agent workflows programmatically with Claude Code's TypeScript SDK
- **CI/CD integration** — Running Claude Code and Codex CLI in GitHub Actions, GitLab CI, and other pipelines
- **Model selection** — Choosing the right model (Opus 4.8, Sonnet 4.6, Haiku 4.5, Fable 5, GPT-4o, o3) for each task based on complexity, speed, and cost
- **Multimodal input** — Using screenshots and diagrams as input for UI implementation and architecture generation

## Estimated Time

| Section | Time Required | Outcome |
|---------|--------------|---------|
| 3.a: Prompting Strategies | 45-60 min | Ability to craft prompts that produce reliable, production-quality output |
| 3.b: CLAUDE.md / AGENTS.MD | 30-45 min | Project configuration files written for your active projects |
| 3.c: Task Management | 30-45 min | Task decomposition and review workflow established |
| 3.d: Advanced Techniques | 60-90 min | MCP, hooks, subagents, CI/CD integration understood and partially configured |
| **Total** | **3-4 hours** | **Full mastery of agent workflows** |

## Key Takeaways

The core insight of this chapter is that mastering AI coding agents is less about learning specific commands and more about developing a new way of working:

1. **Invest in configuration upfront.** A good CLAUDE.md or AGENTS.MD pays for itself on the first task.
2. **Be specific in your prompts.** The agent cannot read your mind — but it can read your codebase, your configuration file, and your exact instructions.
3. **Decompose before delegating.** Break large features into focused, verifiable tasks.
4. **Review everything.** Agents produce good code most of the time, but not all of the time. Your judgement is the quality gate.
5. **Use the right tool for the right task.** Opus for architecture, Sonnet for routine work, Haiku for bulk operations.

The skills developed in this chapter are transferable across tools and will remain relevant as the underlying models and products evolve.

---

**Next:** [3.a: Effective Prompting Strategies](./03_a_effective_prompting_strategies.md)

---

*Last Updated: June 2026 | Claude Code + OpenAI Codex CLI prompting, configuration, and advanced workflows*
