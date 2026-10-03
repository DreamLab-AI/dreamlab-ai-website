# Chapter 7: Practical Patterns — Real-World Use Cases

> Tested patterns for the tasks developers and professionals encounter every day. Each pattern includes the prompts, tools, and configuration needed to get results.

## Pattern 1: Codebase Onboarding

**Situation:** You have just joined a team or need to understand an unfamiliar repository.

**Approach:**

```
> Explain this project. What does it do, how is it structured,
  what technologies does it use, and how do I build and run it?
```

Claude reads your project's key files — `README.md`, `package.json` (or `Cargo.toml`, `pyproject.toml`, etc.), directory structure, configuration files — and produces a comprehensive overview.

**Follow-up questions that work well:**

```
> Walk me through the request lifecycle. What happens when a user
  hits the /api/orders endpoint?
```

```
> What are the most important files in this project? Which ones
  should I read first?
```

```
> Show me the data model. What are the main entities and how
  do they relate to each other?
```

**Pro tip:** After the onboarding session, ask Claude to generate a CLAUDE.md:

```
> Based on what you've learned about this project, generate a
  CLAUDE.md file with build commands, architecture notes, and
  code conventions.
```

## Pattern 2: Bug Investigation

**Situation:** A test is failing, a user reported an error, or something is not working as expected.

**Approach:**

Start by giving Claude the error:

```
> This test is failing. Here's the error output:

  FAIL src/services/__tests__/order.service.test.ts
  ● OrderService › createOrder › should apply discount for VIP customers

  Expected: 90.00
  Received: 100.00
```

Claude reads the test file, the service under test, and any related modules. It traces the logic, identifies the bug, and proposes a fix.

**For production errors, pipe the log:**

```bash
cat error.log | claude "Explain this error and suggest a fix"
```

**For intermittent bugs:**

```
> The checkout process sometimes fails with a "duplicate key" error
  on the orders table. It happens roughly 1 in 50 times. Here's the
  relevant code in src/services/order.service.ts. What could cause this?
```

Claude examines the code for race conditions, missing transactions, and other intermittent failure modes.

**Key advantage:** Claude reads the actual code and the actual error. It does not guess based on a description — it traces the execution path through your specific codebase.

## Pattern 3: Feature Implementation

**Situation:** You need to add a new feature, and you know the requirements.

**Approach:**

Be specific about what you want, where it goes, and what constraints apply:

```
> Add pagination to the GET /api/products endpoint.
  Requirements:
  - Query parameters: page (default 1), limit (default 20, max 100)
  - Response includes: items, totalCount, page, totalPages
  - Use the existing Prisma client for database queries
  - Add Zod validation for the query parameters
  - Add tests covering: default values, custom values, max limit enforcement
```

Claude implements the feature across all relevant files — route handler, validation schema, service layer, tests — and shows you each change.

**Iterative refinement works well:**

```
You: Add cursor-based pagination as an alternative to offset pagination.
Claude: [proposes implementation using cursor-based approach]
You: Good, but the cursor should be opaque — encode it as base64.
Claude: [revises to use base64-encoded cursor]
You: Now update the API documentation in docs/api.md to cover both
     pagination styles.
Claude: [updates documentation]
```

## Pattern 4: Documentation

**Situation:** You need API documentation, inline comments, README updates, or architectural documentation.

**Approach:**

```
> Write API documentation for all endpoints in src/routes/.
  For each endpoint, include: method, path, description,
  request parameters, request body schema, response schema,
  error responses, and an example curl command.
```

Claude reads every route file, analyses the handlers, extracts parameter types, and generates comprehensive documentation.

**For inline documentation:**

```
> Add JSDoc comments to all exported functions in src/lib/.
  Include parameter descriptions, return type descriptions,
  and example usage where it would be helpful.
```

**For architectural documentation:**

```
> Create an architecture document explaining how the authentication
  system works in this project. Include a sequence diagram (in Mermaid
  syntax) showing the login flow from the client to the database.
```

## Pattern 5: Refactoring

**Situation:** Code works but needs structural improvement.

**Approach:**

```
> The OrderService class at src/services/order.service.ts is 450 lines
  long and handles too many concerns. Refactor it:
  - Extract discount calculation into a DiscountService
  - Extract notification logic into a NotificationService
  - Keep the OrderService focused on order CRUD
  - Update all imports and tests
```

Claude reads the file, identifies the extraction boundaries, creates new files, updates the original, and adjusts all imports and tests.

**For cross-cutting refactors:**

```
> We're migrating from callbacks to async/await across the codebase.
  Refactor all files in src/services/ that still use callback patterns.
```

```
> Extract the shared validation logic from the route handlers into
  reusable middleware. I see the same Zod validation pattern repeated
  in at least 8 route files.
```

## Pattern 6: Code Review

**Situation:** You want a thorough review of changes before committing or merging.

**Approach — Quick review:**

```
> /review
```

This examines uncommitted changes and provides feedback.

**Approach — Deep review with the slash command:**

```
> /code-review
```

This performs a thorough analysis at configurable effort levels. Use `--comment` to post findings as inline PR comments, or `--fix` to apply the findings directly.

**Approach — Custom review criteria:**

```
> Review the changes in this branch against main. Focus specifically on:
  1. SQL injection vulnerabilities
  2. Proper error handling (no swallowed errors)
  3. Missing input validation
  4. Performance issues (N+1 queries, unnecessary re-renders)
```

Claude examines each changed file and reports findings categorised by severity.

## Pattern 7: Writing and Content (Non-Developers)

Claude Code is not just for coding. Because it can read files, search the web, and create documents, it is a powerful tool for any professional who works with text and data.

### Data Analysis

```bash
claude "Read the CSV file at data/quarterly-results.csv and summarise
        the key trends. Which regions grew fastest? Which product lines
        declined?"
```

### Document Creation

```
> Create a project proposal document at docs/proposal.md.
  The project is a customer feedback analysis system. Include:
  executive summary, problem statement, proposed solution,
  timeline, budget estimate, and risk assessment.
  Base the technical details on what you can see in our current codebase.
```

### Report Generation

```
> Read all the markdown files in reports/weekly/ and create a
  monthly summary report at reports/monthly/june-2026.md.
  Highlight the most important updates and flag any blockers
  that appeared in more than one weekly report.
```

### Email and Communication

```
> Draft a technical update email for stakeholders about the
  v3.0 release. Read the CHANGELOG.md and the git log since
  v2.9.0 to get the details right. Keep it concise — five
  paragraphs maximum.
```

## Pattern 8: Test Generation

**Situation:** You have code that lacks tests.

**Approach:**

```
> Write comprehensive tests for src/services/payment.service.ts.
  Cover:
  - Successful payment processing
  - Insufficient funds
  - Network timeout
  - Invalid card details
  - Refund flow
  Use Vitest and mock the Stripe client.
```

Claude reads the service, understands its dependencies, and generates tests that cover the scenarios you specified.

**For test-driven development:**

```
> I want to implement a rate limiter middleware. Start by writing
  the tests first (TDD style), then implement the middleware to
  pass the tests. Tests should cover: basic rate limiting, sliding
  window, per-IP tracking, and bypass for whitelisted IPs.
```

## Pattern 9: Git Operations

Claude Code integrates deeply with git:

```
> Create a new branch for the session-timeout fix, make the changes,
  commit with a descriptive message, and push.
```

```
> Squash the last 3 commits into one with a clean commit message.
```

```
> Show me what changed in the last 5 commits, summarised by area
  of the codebase.
```

```
> Resolve the merge conflicts in the current branch. The main branch
  changes should take priority for the configuration files, and our
  branch changes should take priority for the feature code.
```

## Combining Patterns

The real power emerges when you combine patterns within a single session:

```
You: Explain how the notification system works.                    [Onboarding]
Claude: [reads code, explains the architecture]

You: I see the email notifications are sent synchronously.         [Bug/Perf]
     That's probably why the API is slow on order creation.
Claude: [confirms, traces the code path, identifies the bottleneck]

You: Refactor it to use a message queue. We have Redis already.    [Refactoring]
Claude: [proposes async notification via Redis queue]

You: Good. Add tests for the queue consumer.                       [Testing]
Claude: [generates tests with mock Redis]

You: Write a brief ADR explaining why we moved to async            [Documentation]
     notifications.
Claude: [creates docs/adr/async-notifications.md]

You: /review                                                       [Code Review]
Claude: [reviews all uncommitted changes, suggests improvements]

You: Commit everything with a descriptive message.                 [Git]
Claude: [creates commit: "refactor: async notification delivery via Redis queue"]
```

One session, six patterns, a complete feature delivered.

## Tips for Maximum Effectiveness

1. **Start broad, then narrow.** Understand the context before diving into changes.

2. **State your constraints.** "Use the existing Redis client" prevents Claude from adding new dependencies. "Follow the patterns in the existing services" ensures consistency.

3. **Ask for tests alongside code.** Claude writes better implementations when it knows tests will validate them.

4. **Use `/review` before committing.** A two-second command that catches issues before they reach your repository.

5. **Iterate rather than restart.** Claude remembers context within a session. Build on previous exchanges instead of repeating yourself.

6. **Leverage your CLAUDE.md.** Every pattern works better when Claude knows your project's conventions.

---

**Next:** [Chapter 8: Hands-On Exercises](./08_exercises.md)

---

*DreamLab AI Self-Guided Workshop | June 2026*
