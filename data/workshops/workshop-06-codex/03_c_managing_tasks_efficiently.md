# 3.c: Managing Tasks Efficiently

Efficient task management is key to maximising productivity with AI coding agents. This involves decomposing work into well-scoped tasks, understanding approval modes, reviewing output effectively, and leveraging parallel execution.

## Breaking Down Large Work

Decompose large or complex features into smaller, incremental tasks.

*   **Easier for the agent:** Smaller, well-defined tasks produce more accurate results. An agent asked to "build a complete authentication system" will struggle more than one asked to "add a JWT token generation utility function."
*   **Simplified review:** Reviewing a focused diff of 50 lines is more manageable than reviewing 500 lines across 20 files.
*   **Iterative progress:** Allows for course correction if the agent takes a wrong approach.

### Task Decomposition Example

Instead of: "Build a user management system"

Break it down:
1. "Create the User model with fields: id, email, passwordHash, createdAt, updatedAt"
2. "Add a user repository with CRUD operations using Drizzle ORM"
3. "Implement the registration endpoint with Zod validation"
4. "Add password hashing with bcrypt in the registration flow"
5. "Implement the login endpoint with JWT token generation"
6. "Add authentication middleware that validates JWT tokens"
7. "Write unit tests for the user repository"
8. "Write integration tests for the auth endpoints"

## Approval Modes and Autonomy

### Claude Code

Claude Code operates interactively by default — it shows you what it plans to do and waits for confirmation before making changes. You control the level of autonomy through your responses:

- **Review each change:** The default. Claude Code proposes edits and you approve.
- **Let it run:** Tell the agent "go ahead and make all the changes" to give it more autonomy.
- **Non-interactive mode:** Use `claude -p "task"` for one-shot execution without interaction.

### Codex CLI Approval Modes

The Codex CLI formalises three levels of autonomy:

| Mode | What it Does | Safety Level |
|------|-------------|-------------|
| **Suggest** (default) | Shows proposed changes for your approval | Highest |
| **Auto Edit** | Applies file changes automatically | Medium |
| **Full Auto** | Reads, writes, and executes commands (sandboxed) | Lower (but sandboxed) |

```bash
# Safe mode — review everything
codex --approval-mode suggest "Refactor the payment module"

# Auto-edit — trust the agent with file changes
codex --approval-mode auto-edit "Add TypeScript types to all API responses"

# Full auto — let it run commands too (network-disabled, directory-sandboxed)
codex --approval-mode full-auto "Fix all failing tests and lint warnings"
```

**Full Auto safety:** When running in full-auto mode, the Codex CLI sandboxes command execution — network access is disabled and the agent is confined to the current directory. A warning is shown if the directory is not tracked by Git.

## Parallel Execution

### Claude Code Subagents

Claude Code can spawn child agents that work on independent tasks in parallel:

```
> "I need three things done independently:
   1. Add input validation to all API endpoints
   2. Write missing unit tests for the utils module
   3. Update the README with the current API documentation"
```

Claude Code can delegate these to subagents that work simultaneously, then merge the results.

### Codex CLI Parallel Tasks

Run multiple Codex CLI instances in separate terminal tabs or use shell parallelism:

```bash
# Run independent tasks in parallel
codex "Add TypeScript types to user module" &
codex "Optimise database queries in posts service" &
codex "Update dependencies to latest versions" &
wait
```

## Reviewing Results

Never blindly trust AI-generated code. Always review before committing.

### What to Check

*   **Diff review:** Examine every changed line. Does the change match your intent?
*   **Test results:** Did the agent run tests? Did they pass?
*   **Side effects:** Did the agent modify files you did not expect?
*   **Style consistency:** Does the generated code match your project's conventions?
*   **Security:** Are there hardcoded values, exposed secrets, or injection vulnerabilities?
*   **Edge cases:** Does the implementation handle null values, empty arrays, and error conditions?

### Claude Code Review Workflow

```
> "Show me a summary of all changes you made"
> "Run the test suite and show me the results"
> "Are there any edge cases this implementation doesn't handle?"
```

### Codex CLI Review

```bash
# After Codex makes changes, review the diff
git diff

# Run tests manually
npm test

# If unhappy, reset and try again
git checkout .
codex "Try a different approach: [refined instructions]"
```

## Iterating on Results

Based on your review:

*   **Accept and commit:** If the changes are satisfactory, commit them (or let the agent create a commit).
*   **Request modifications:** Provide follow-up instructions to refine the output.
*   **Reject and retry:** If the approach is fundamentally wrong, discard and try with clearer instructions or a different decomposition.

### Iteration Example with Claude Code

```
> "Add caching to the user service"
[Claude Code makes changes]

> "The cache TTL is too short — increase it to 5 minutes.
   Also, add cache invalidation when a user is updated."
[Claude Code refines]

> "Looks good. Now add tests for the cache behaviour."
[Claude Code adds tests]

> "All tests pass. Create a commit with message: feat(users): add caching to user service"
```

## Handing Off Blockers

When you are stuck on a problem:

1. Create a new branch: `git checkout -b fix/login-bug`
2. Describe the issue clearly to the agent, including error messages and what you have tried
3. Let the agent explore solutions
4. Review its approach before merging

This is one of the most effective uses of AI coding agents — getting "unstuck" on problems that would otherwise require significant research or debugging time.

## Launching Long-Running Tasks

For time-consuming operations:

*   Start them early (before a meeting, at the start of the day)
*   Use non-interactive mode for unattended execution
*   Review results when ready

```bash
# Claude Code non-interactive long task
claude -p "Migrate all Sequelize models to Drizzle ORM. Run tests after each migration." > migration-log.txt &

# Codex CLI full-auto long task
codex --approval-mode full-auto "Add comprehensive test coverage to all services in src/services/" &
```

By employing these task management strategies, you can work more effectively with AI coding agents, leveraging their strengths while maintaining control over code quality.

---

Next: [3.d: Advanced Techniques](./03_d_advanced_techniques.md)
