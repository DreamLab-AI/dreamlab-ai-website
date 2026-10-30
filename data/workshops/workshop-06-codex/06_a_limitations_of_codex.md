# 6.a: Limitations of AI Coding Agents — What They Cannot Do (Yet)

> **June 2026:** AI coding agents are remarkably capable, but they are not omniscient. Understanding their limitations is essential for setting realistic expectations, focusing your review effort where it matters most, and avoiding the costly over-reliance that comes from treating probabilistic systems as deterministic ones.

## Context Window Constraints

Every AI coding agent operates within a finite context window — the total amount of text (code, conversation history, file contents, tool output) the model can process at once. While context windows have grown dramatically (Claude models offer 200K tokens; some models approach 1M tokens), they are not infinite, and their practical limits are tighter than their theoretical maximums.

### How Context Limits Manifest

- **Long sessions degrade.** As a conversation accumulates history — prompts, responses, file reads, command outputs — the model's effective attention on any single piece of information diminishes. A task that works perfectly at the start of a session may produce weaker results after an hour of accumulated context.
- **Large codebases exceed capacity.** A monorepo with hundreds of thousands of lines cannot be loaded entirely into context. The agent navigates by reading specific files on demand, but it cannot hold the entire codebase in working memory simultaneously.
- **Context eviction is silent.** When context fills up, older information is silently dropped or compressed. The agent does not warn you that it has forgotten your earlier instructions.

### Mitigation Strategies

| Strategy | Tool | Effect |
|----------|------|--------|
| Use `/compact` regularly | Claude Code | Summarises conversation history, freeing context for new work |
| Start fresh sessions for new tasks | All tools | Prevents context pollution from unrelated prior work |
| Point the agent to specific files | All tools | Reduces unnecessary file scanning that consumes context |
| Use CLAUDE.md / AGENTS.MD | Claude Code, Codex CLI | Persistent instructions that do not need to be repeated in every prompt |
| Break large tasks into subtasks | All tools | Each subtask operates within a manageable context budget |

```bash
# Claude Code: compact a long session
/compact

# Codex CLI: start fresh for a new task
codex "New task: add rate limiting to the /api/users endpoint"

# Both: scope your prompts to specific files
claude "Read src/services/auth.ts and add token refresh logic"
```

## Domain-Specific Blindness

AI coding agents are trained on vast corpora of publicly available code, documentation, and technical writing. They excel at tasks that resemble patterns in that training data — standard web frameworks, common design patterns, popular libraries, well-documented APIs. They struggle with the bespoke.

### Where Domain Blindness Appears

- **Proprietary business logic.** If your application implements a complex pricing algorithm, regulatory compliance workflow, or domain-specific calculation that exists only in your codebase, the agent has no external reference for correctness. It will generate code that looks plausible but may be semantically wrong.

- **Industry-specific conventions.** Financial services, healthcare, aerospace, and other regulated industries have coding standards and safety requirements that are not well-represented in general-purpose training data. An agent may produce code that compiles and passes basic tests but violates industry-specific regulations.

- **Proprietary frameworks and internal libraries.** If your team uses an in-house ORM, a custom build system, or a proprietary testing framework, the agent will not know its API. It will fall back on the nearest public equivalent, producing code that looks right but uses the wrong function signatures.

- **Novel algorithmic problems.** Tasks that require genuinely novel algorithms — not implementations of known algorithms, but new approaches to unsolved problems — are beyond the agent's capability. It can implement a known sorting algorithm flawlessly but cannot invent a new one.

### Mitigation Strategies

- **Invest heavily in CLAUDE.md / AGENTS.MD for domain-specific projects.** Document your proprietary APIs, conventions, and constraints in the configuration file. The agent reads this on every task.
- **Provide examples of correct implementations.** "Follow the pattern in `src/services/billing.ts` when implementing the new discount calculation" is far more effective than describing the pattern from scratch.
- **Use the agent for the mechanical parts.** Let the agent handle boilerplate, test scaffolding, and structural changes while you handle the domain-specific logic.
- **Review domain logic with extra scrutiny.** Apply your deepest review effort to the areas where the agent is least likely to be correct.

## Hallucination and Confabulation

AI models can generate confident, syntactically correct, entirely wrong code. This is not a bug — it is a fundamental property of how large language models work. They predict the most likely next token based on patterns in training data, and sometimes the most likely continuation is incorrect.

### Common Hallucination Patterns

**Invented APIs.** The agent generates a function call to a library method that does not exist. The code looks correct, the method name is plausible, but the library has no such function.

```python
# Hallucinated API — requests.get does not have a 'retry_count' parameter
response = requests.get(url, retry_count=3, timeout=30)
```

**Incorrect edge-case handling.** The happy path works; the boundary conditions do not. The agent handles the common case correctly but makes assumptions about error states, null values, or concurrent access that are wrong.

```typescript
// Looks correct, but fails when items is undefined (not just empty)
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
// Agent assumed items is always an array — but the API can return undefined
```

**Fabricated configuration options.** The agent suggests a configuration flag, environment variable, or command-line option that does not exist in the tool it is configuring.

**Outdated information presented as current.** The agent uses a deprecated API, references a library version that has been superseded, or applies a security practice that is no longer recommended — all without indicating uncertainty.

### Mitigation Strategies

- **Run the tests.** Automated testing catches most hallucinated APIs and incorrect logic. If a hallucinated method does not exist, the test will fail with a clear error.
- **Use static type checking.** TypeScript, Rust, and other statically-typed languages catch many hallucinated APIs at compile time.
- **Enable linters and hooks.** Claude Code hooks that run ESLint, mypy, or clippy after every edit catch a significant class of hallucination immediately.
- **Verify against documentation.** When the agent suggests using a library function you have not seen before, check the library's docs before accepting.
- **Be sceptical of confidence.** The agent never hedges. It presents every suggestion with the same level of assurance, whether it is certain or guessing. Your review process must compensate for this.

## Consistency and Reproducibility

The same prompt given to the same model can produce different outputs across runs. This is by design — language models use sampling with a temperature parameter that introduces controlled randomness — but it can be surprising and frustrating when you need deterministic results.

### How Inconsistency Manifests

- **Style variation.** One run uses `async/await`; another uses `.then()` chains. One uses early returns; another uses nested conditionals. The code is functionally equivalent but structurally different.
- **Architectural variation.** Asked to "add error handling to the API," the agent might add try-catch blocks in one run, a global error middleware in another, and a custom error class hierarchy in a third.
- **Naming variation.** Variable names, function names, and file names may differ between runs for the same task.

### Mitigation Strategies

- **Use CLAUDE.md / AGENTS.MD to enforce conventions.** Specifying "use async/await, never .then() chains" and "use early returns instead of nested conditionals" eliminates style-level inconsistency.
- **Provide examples.** "Follow the error handling pattern in `src/middleware/errors.ts`" constrains architectural variation.
- **Use lower temperature when available.** Some tools and API configurations allow reducing the temperature parameter for more deterministic output.
- **Accept reasonable variation.** Not all inconsistency is problematic. If the code is correct and follows your conventions, minor structural differences between runs are acceptable.

## Knowledge Cutoff and Outdated Information

AI models are trained on data with a specific cutoff date. While both Anthropic and OpenAI regularly update their models with newer training data, there is always a gap between the latest real-world developments and the model's knowledge.

### Practical Consequences

- **Deprecated APIs.** The agent may suggest using `componentWillMount` in React (deprecated since React 16.3) or `new Buffer()` in Node.js (deprecated since Node 10).
- **Outdated library versions.** The agent may reference library APIs from older versions that have changed in the current release.
- **Superseded security practices.** Security recommendations evolve. The agent may suggest MD5 for hashing (broken for security purposes since the early 2000s) or recommend against practices that are now standard.
- **Missing awareness of new tools.** A tool or library released after the training cutoff will be unknown to the agent.

### Mitigation Strategies

- **Document current versions in CLAUDE.md.** Specifying "React 18.3, Node 22, TypeScript 5.9" helps the agent target the right API versions.
- **Use dependency management tools.** `npm outdated`, `pip list --outdated`, and similar tools catch outdated suggestions.
- **Verify security recommendations independently.** Do not rely on the agent for security best practices without cross-referencing current guidance (OWASP, vendor advisories, CVE databases).

## Task Complexity Ceiling

AI coding agents have practical limits on the complexity and duration of tasks they can handle effectively.

### Where Complexity Limits Appear

- **Very long tasks.** Tasks that run for more than 15-30 minutes tend to accumulate context, lose coherence, and produce diminishing returns. Most agents have a practical ceiling of approximately 30-60 minutes per task.
- **Deeply interleaved dependencies.** Tasks where every change depends on the result of a previous change — and the chain is long — can exceed the agent's ability to maintain coherence across the full sequence.
- **Ambiguous requirements.** The vaguer the task, the more likely the agent is to produce something that technically satisfies the prompt but misses the intent. "Make the app better" will produce results; they are unlikely to be the results you wanted.
- **Cross-system changes.** Tasks that span multiple repositories, services, or deployment environments are beyond what a single agent session can handle coherently.

### Mitigation Strategies

- **Decompose aggressively.** Break large features into independent, testable subtasks. Each subtask should be completable in a single, focused session.
- **Use clear acceptance criteria.** "Add a POST /api/orders endpoint that validates the request body with Zod, creates a record in the orders table, and returns 201 with the order ID" is better than "add the order creation feature."
- **Iterate rather than specify exhaustively.** It is often faster to give a reasonable instruction, review the output, and ask for corrections than to write a perfect specification upfront.

## Concurrency and State Management

AI coding agents are notably weak at reasoning about concurrent systems. Code that involves shared mutable state, race conditions, deadlocks, or distributed coordination is among the hardest for agents to get right.

### Why Concurrency Is Hard for Agents

Concurrency bugs are inherently non-local — they arise from the interaction of multiple components over time, not from the logic of any single function. Agents reason about code one function at a time and struggle to model the temporal interactions that cause race conditions.

**Common failure modes:**

- **Missing locks or synchronisation.** The agent generates code that reads and writes shared state without proper locking, producing intermittent bugs that pass simple tests.
- **Incorrect async patterns.** In JavaScript/TypeScript, the agent may produce code that looks correct but has subtle async issues — missing `await` on a promise, incorrect error propagation in `Promise.all`, or race conditions in state updates.
- **Database transaction boundaries.** The agent may place operations outside a transaction that should be atomic, or use an incorrect isolation level.

### Mitigation

- Review all concurrent and async code with particular attention to shared state.
- Use established concurrency primitives from your language's standard library or well-tested libraries — do not let the agent invent its own synchronisation mechanisms.
- Write integration tests that exercise concurrent access patterns, not just unit tests that test functions in isolation.

## Tool-Specific Limitations

Different tools have different limitations worth noting:

| Tool | Specific Limitation |
|------|-------------------|
| **Claude Code** | No inline completion — use alongside Copilot/Cursor for typing assistance |
| **Claude Code** | Requires internet connectivity; no fully offline mode |
| **Codex CLI** | No built-in MCP server support; tool integration is more limited |
| **Codex CLI** | Subagents not supported; cannot parallelise subtasks natively |
| **Cursor** | Agent mode is less mature than Claude Code for complex multi-step workflows |
| **Copilot** | Copilot Workspace is less capable than terminal agents for large refactors |
| **All tools** | Performance degrades on very large files (5,000+ lines) |
| **All tools** | Binary files, images, and non-text assets are not handled well |

## What the Agent Is Not

It is worth stating explicitly what AI coding agents are not, to prevent misunderstandings that lead to misuse:

- **Not a replacement for software engineers.** Agents handle implementation; humans handle architecture, judgement, domain expertise, and quality assurance.
- **Not a reasoning engine.** Agents do not reason from first principles. They predict likely outputs based on training data patterns. This distinction matters for novel problems.
- **Not deterministic.** The same input does not always produce the same output. Build your workflow around this reality.
- **Not infallible.** Agents make mistakes. Some of those mistakes are subtle and hard to catch. Review is not optional.
- **Not omniscient.** Agents know what was in their training data. They do not know your business, your users, or your specific production environment.

Acknowledging these realities is not pessimism — it is the foundation of effective tool use. The developers who get the most from AI coding agents are those who understand exactly where human judgement is needed and apply it there.

## Summary: Where to Focus Your Review Effort

Based on the limitations described above, here is a practical guide to where your review effort should be highest:

| Area | Review Intensity | Why |
|------|-----------------|-----|
| **Domain-specific business logic** | Highest | Agent has no external reference for correctness |
| **Security-sensitive code** | Highest | Hallucinated patterns may introduce vulnerabilities |
| **Concurrency and state management** | High | Agent struggles with temporal reasoning |
| **Edge cases and error handling** | High | Happy path is usually correct; boundaries are not |
| **API and library usage** | Medium | Check for hallucinated or deprecated APIs |
| **Boilerplate and scaffolding** | Low | Well-represented in training data; rarely wrong |
| **Formatting and style** | Lowest | Handled by linters and formatters |

---

**Next:** [6.b: Security Implications](./06_b_security_implications.md)

---

*Last Updated: June 2026 | Limitations of Claude Code, Codex CLI, and the broader AI coding agent category*
