# Chapter 7: Best Practices for Using AI Coding Agents (2026)

These best practices are drawn from real-world experience with Claude Code, OpenAI Codex CLI, and IDE-integrated tools across thousands of development workflows. They go beyond prompting technique to cover how you structure your code, environment, and collaboration patterns for optimal results with agentic tools.

## 1. Make Your Codebase Agent-Friendly

The easier it is for an AI agent to understand your codebase, the better its output. This mirrors good practices for human onboarding — and in practice, improving discoverability for agents also improves it for new team members.

*   **Clear structure and naming:** Use logical directory structures, descriptive file names, and meaningful variable/function names. Agents navigate by reading filenames and directory structures before diving into code.
*   **Scope your prompts:** Tell the agent where to look. "Add input validation to `src/routes/auth.ts`" is far more effective than "add input validation to the auth code."
*   **Use consistent patterns:** If every route handler follows the same structure, the agent can replicate that pattern reliably. Inconsistency leads to inconsistent output.

## 2. Use Static Types

Static typing is one of the highest-leverage changes you can make for AI agent effectiveness.

*   **TypeScript over JavaScript:** Type annotations give the agent dramatically more context about function signatures, data shapes, and expected behaviour.
*   **Python type hints:** Similarly, `def process_order(order: Order) -> Result[Invoice, Error]` tells the agent far more than `def process_order(order)`.
*   **Typed languages in general:** Rust, Go, C#, and other statically-typed languages provide richer context for code generation and refactoring.

The agent can infer types from well-typed code, validate its own output against type signatures, and catch errors that would be invisible in dynamically-typed code.

## 3. Design for Modularity

Modular, well-factored code is easier for agents to work with — and the results are easier for you to review.

*   **Small, focused modules:** Break complex systems into independent modules with clear interfaces. An agent working on a 200-line module is more effective than one navigating a 5,000-line monolith.
*   **Clear boundaries:** Use explicit imports/exports and well-defined API surfaces between modules. This helps the agent understand what it can safely change and what it should not touch.
*   **Architecture matters more than ever:** A well-architected codebase amplifies agent effectiveness. A poorly-architected one limits it. Invest in clean separation of concerns — the agent handles implementation, you handle architecture.

## 4. Invest in CLAUDE.md / AGENTS.MD

As detailed in [Chapter 3.b](./03_b_the_crucial_role_of_agents_md.md), project configuration files are the single highest-impact lever for improving agent output quality.

*   **Start simple, iterate:** Begin with tech stack, test commands, and three or four key conventions. Add more when you notice the agent making avoidable mistakes.
*   **Document forbidden actions:** Explicit "do not" instructions prevent costly mistakes. If there is a directory the agent should never touch, say so.
*   **Keep it current:** Treat your configuration file as living documentation. When you correct the agent, add that correction to the file so it does not recur.
*   **Use the hierarchy:** Global settings in `~/.claude/CLAUDE.md`, project settings at the root, module-specific overrides in subdirectories.

## 5. Use Linters, Formatters, and Hooks

Automated verification tools act as guardrails that catch agent mistakes immediately.

*   **Linters and formatters in the loop:** ESLint, Prettier, Black, rustfmt, and similar tools enforce coding standards. When configured as Claude Code hooks or Codex CLI post-edit checks, they catch style violations before you see them.
*   **Claude Code hooks:** Configure `PostEdit` hooks to run linters automatically after every change. Configure `PreCommit` hooks to run the test suite.
    ```json
    {
      "hooks": {
        "PostEdit": [{"command": "npx eslint --fix ${file}"}],
        "PreCommit": [{"command": "npm test"}]
      }
    }
    ```
*   **Git commit hooks:** `pre-commit` hooks (via Husky, lefthook, or similar) catch issues at commit time regardless of which tool made the change.
*   **CI/CD as final validation:** Even with hooks, run your full test suite in CI. Agents can bypass local checks if hooks are not configured.

## 6. Review Agent Output Like You Review PRs

AI agents produce good code most of the time, but not all of the time. Treat agent output with the same rigour you apply to pull request reviews.

*   **Read the diff, not just the description:** Agents explain what they did, but the explanation can be more confident than the code deserves. Read the actual changes.
*   **Check edge cases:** Agents handle the happy path well. They sometimes miss boundary conditions, error handling, or race conditions.
*   **Verify business logic:** Agents do not understand your business domain as deeply as you do. Double-check any logic that depends on domain-specific rules.
*   **Run the tests:** Do not assume the code works because the agent says it does. Run the test suite yourself.

## 7. Delegate Liberally, Verify Carefully

The most productive developers using agentic tools in 2026 share a common pattern: they delegate aggressively and review carefully.

*   **Quick delegation:** Do not over-think your prompts. State what you want, send it off, and review the result. A 30-second prompt that gets you 80% of the way is better than a 10-minute prompt that gets you 95%.
*   **Parallel tasks:** Both Claude Code (via subagents) and the Codex CLI support working on multiple tasks. Use this to keep your pipeline full.
*   **Iterate rather than specify:** It is often faster to send a rough instruction, review the output, and ask for corrections than to write a perfect specification upfront.

## 8. Choose the Right Tool for the Task

Different tools excel at different tasks. Match the tool to the work.

| Task | Best Tool | Why |
|------|-----------|-----|
| Multi-file refactoring | Claude Code or Codex CLI | Full codebase access, shell execution |
| Quick inline edit | Copilot or Cursor | Immediate, no context switch |
| Architecture discussion | Claude.ai or ChatGPT | Long-form conversation, no side effects |
| Test generation | Claude Code (Sonnet via `/fast`) | Fast, cost-effective, runs tests in loop |
| Code review | Claude Code or Codex CLI | Can read full PRs and run checks |
| Learning a new library | ChatGPT or Claude.ai | Interactive Q&A, web search |
| CI/CD automation | Codex CLI (full-auto) | Sandboxed execution, scriptable |

## 9. Manage Context Deliberately

Even with 200K-token context windows, context management matters.

*   **Use `/compact` in Claude Code** to summarise long conversations and free up context space.
*   **Break large tasks into subtasks:** Instead of "refactor the entire application to use the new API", work module by module.
*   **Start fresh sessions for unrelated tasks:** Leftover context from a previous task can confuse the agent on a new one.
*   **Point the agent to specific files:** "Read `src/lib/auth.ts` and `src/middleware/auth.ts` first" is better than letting the agent search the whole tree.

## 10. Secure Your Workflow

AI agents have significant access to your codebase and shell. Treat security seriously.

*   **Never put secrets in configuration files:** CLAUDE.md and AGENTS.MD are committed to Git. Use environment variables and `.env` files (gitignored) for secrets.
*   **Review commands before execution:** In Claude Code's default mode, you approve each command. Use `full-auto` modes only on trusted tasks in sandboxed environments.
*   **Codex CLI sandboxing:** Codex CLI runs with network disabled and directory-scoped by default in full-auto mode. Do not weaken these defaults without good reason.
*   **Audit what the agent commits:** Review diffs before pushing. Agents occasionally include debug logging, hard-coded test values, or commented-out code.
*   **Rotate API keys** if you suspect they have been exposed.

## 11. Optimise for Cost

AI coding tools consume tokens, and costs can add up with heavy use.

*   **Use cheaper models for simpler tasks:** Sonnet 4.6 (`/fast`) and o4-mini handle routine work well at a fraction of the cost of Opus 4.8 or o3.
*   **Monitor session costs:** Use Claude Code's `/cost` command and OpenAI's usage dashboard.
*   **Avoid unnecessary context:** Do not paste your entire codebase into a prompt. Let the agent navigate to what it needs.
*   **Set spending limits:** Both Anthropic and OpenAI support monthly spending caps.

## 12. Build Team Standards

For teams adopting AI coding tools, consistency matters.

*   **Standardise on a configuration file:** Commit a well-maintained CLAUDE.md (and/or AGENTS.MD) so every team member's agent follows the same conventions.
*   **Share prompt patterns:** Document effective prompts for common tasks (e.g., "add a new API endpoint", "write tests for module X") in your team wiki or CLAUDE.md.
*   **Agree on review standards:** Define how thoroughly AI-generated code should be reviewed. Some teams require the same review rigour as human-written code; others differentiate based on risk.
*   **Track adoption metrics:** Monitor how the team uses AI tools — which tasks, which models, what costs — to optimise over time.

## Summary: The 2026 Best Practices Checklist

- [ ] CLAUDE.md or AGENTS.MD committed to every active repository
- [ ] Static types used throughout (TypeScript, Python type hints, etc.)
- [ ] Linters and formatters configured as hooks or pre-commit checks
- [ ] Modular architecture with clear module boundaries
- [ ] Agent output reviewed with the same rigour as human PRs
- [ ] Cost monitoring enabled (per-session and monthly)
- [ ] Security practices in place (no secrets in config, command review, sandboxing)
- [ ] Team standards documented for AI-assisted workflows

---

Next: [Chapter 8: Conclusion](./08_conclusion.md)
