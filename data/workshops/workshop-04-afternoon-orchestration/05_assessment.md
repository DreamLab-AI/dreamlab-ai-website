# Assessment: Agent Orchestration & Safety

## Part 1: Conceptual Understanding (40 points)

### Question 1: Orchestration Patterns (10 points)

Compare these three orchestration patterns: subagent delegation, pipeline, and fan-out/fan-in. For each, describe the pattern, give one practical use case, and identify a weakness.

**Model Answer**:

| Pattern | Description | Use Case | Weakness |
|---------|-------------|----------|----------|
| **Subagent delegation** | Parent decomposes task, spawns focused child agents in parallel | Codebase refactoring -- each subagent handles one module | Coordination overhead; synthesising diverse results can be difficult |
| **Pipeline** | Sequential stages where each feeds the next | Content creation: research -> write -> edit -> publish | No parallelism; bottlenecked by the slowest stage |
| **Fan-out/Fan-in** | Parallel search/processing with final synthesis | Multi-source research: academic, news, and technical sources searched simultaneously | Deduplication is hard; synthesis quality depends on overlap handling |

---

### Question 2: Safety Controls (10 points)

List five safety controls that a production agent system must implement. For each, explain why it is necessary and what happens if it is missing.

**Expected Coverage**:
1. **Token budget** -- prevents cost explosions from runaway loops
2. **Iteration limit** -- stops agents that cannot converge on an answer
3. **Sandboxed execution** -- prevents code execution from damaging the host system
4. **Human approval gates** -- prevents destructive actions (file deletion, deployment)
5. **Audit logging** -- enables debugging and compliance; without it, failures are invisible
6. (Also acceptable: rate limiting, model fallbacks, timeout controls, input validation)

---

### Question 3: Model Routing (10 points)

Explain the model routing strategy for a cost-optimised multi-agent system. Which tasks should use Haiku, Sonnet, and Opus? Why?

**Expected Answer**:
- **Haiku 4.5**: Classification, routing, simple extraction, formatting -- tasks where speed and cost matter more than deep reasoning
- **Sonnet 4.6**: General agent work, code generation, analysis, synthesis -- the workhorse model with good quality-to-cost ratio
- **Opus 4.8**: Complex architectural decisions, nuanced reasoning, final review of critical outputs -- used sparingly because it is the most expensive
- The classifier itself should run on Haiku to avoid the cost overhead of routing

---

### Question 4: Error Recovery (10 points)

Design an error recovery strategy for a multi-agent system where one subagent fails. Consider: retry logic, fallback models, partial results, and user notification.

**Expected Coverage**:
- **Retry with backoff**: Exponential backoff (1s, 2s, 4s) for transient failures (rate limits, network errors)
- **Model fallback**: If the primary model fails, retry with a different model (e.g. Sonnet -> Haiku)
- **Partial results**: If one subagent fails after retries, continue with results from successful subagents; note the gap in the synthesis
- **Circuit breaker**: After N consecutive failures, stop retrying and report to the user
- **User notification**: Clearly indicate which subtasks succeeded and which failed

---

## Part 2: Code Analysis (30 points)

### Question 5: Identify Issues (15 points)

Review this orchestrator code and identify at least 4 problems:

```python
def orchestrate(task):
    subtasks = task.split(". ")

    results = []
    for st in subtasks:
        response = client.messages.create(
            model="claude-opus-4-8",
            max_tokens=4096,
            messages=[{"role": "user", "content": st}]
        )
        results.append(response.content[0].text)

    return "\n".join(results)
```

**Issues**:
1. **Naive decomposition**: Splitting on ". " is not intelligent task decomposition -- use an LLM to plan
2. **No model routing**: Uses Opus for every subtask, which is expensive and unnecessary for simple tasks
3. **Sequential execution**: Tasks run one after another; independent subtasks should run in parallel
4. **No safety controls**: No token budget, no iteration limit, no error handling
5. **No synthesis**: Results are just joined with newlines instead of being synthesised into a coherent answer
6. **No audit logging**: No way to debug failures or track costs
7. **No error handling**: If any API call fails, the entire function crashes

---

### Question 6: Design a Safe Orchestrator (15 points)

Given these requirements, design (pseudocode is fine) an orchestrator with proper safety:

- Task: Process 10 customer support tickets
- Budget: Maximum 50,000 tokens total
- Each ticket should be classified (simple/complex) and routed appropriately
- Simple tickets: Haiku, complex tickets: Sonnet
- All actions must be logged
- If budget runs out mid-processing, return partial results

**Expected Design**:
```
INIT safety_controller(max_tokens=50000)
INIT results = []

FOR EACH ticket IN tickets:
    IF safety_controller.budget_remaining() < 1000:
        LOG "Budget low, stopping with partial results"
        BREAK

    complexity = classify(ticket, model=haiku)  # cheap classification
    safety_controller.track(classification_response)

    model = haiku IF complexity == "simple" ELSE sonnet
    
    TRY:
        result = process_ticket(ticket, model)
        safety_controller.track(result_response)
        results.append({ticket, result, model, "success"})
    CATCH BudgetError:
        results.append({ticket, "budget exceeded", model, "skipped"})
        BREAK
    CATCH Exception as e:
        results.append({ticket, str(e), model, "error"})
        LOG error

safety_controller.save_audit()
RETURN {results, cost_report, processed_count}
```

---

## Part 3: Design Questions (30 points)

### Question 7: Production Multi-Agent System (15 points)

Design a multi-agent system for: **"Automated weekly codebase health report"**

The system should:
- Run weekly (scheduled)
- Analyse code quality, test coverage, dependency freshness, and security
- Produce a Markdown report
- Cost less than a reasonable budget per run

Specify:
1. Agent roles and their models
2. Orchestration pattern
3. Safety controls
4. Output format

**Example Answer**:
```
Agents:
1. Code Quality Agent (Sonnet 4.6) -- runs linter, analyses complexity
2. Test Coverage Agent (Haiku 4.5) -- checks coverage percentages, identifies untested code
3. Dependency Agent (Haiku 4.5) -- checks for outdated/vulnerable dependencies
4. Security Agent (Sonnet 4.6) -- scans for common vulnerabilities
5. Synthesis Agent (Sonnet 4.6) -- combines all findings into report

Orchestration: Fan-out/Fan-in
- Agents 1-4 run in parallel (independent analyses)
- Agent 5 synthesises after all complete

Safety:
- Token budget: 30,000 tokens per run
- Timeout: 5 minutes per agent, 15 minutes total
- Audit log: stored for review
- No destructive actions (read-only)

Output: Markdown report with sections:
- Executive summary (traffic light: green/amber/red)
- Code quality metrics
- Test coverage gaps
- Dependency update recommendations
- Security findings (if any)
```

---

### Question 8: Cost Estimation (15 points)

Estimate the token cost of this workflow and suggest optimisations:

```
1. Decompose task into 5 subtasks (1 Sonnet call)
2. Classify each subtask (5 Haiku calls)
3. Execute subtasks: 2 with Haiku, 2 with Sonnet, 1 with Opus
4. Synthesise results (1 Sonnet call)
```

Assume approximate per-call token usage: Haiku ~500 tokens, Sonnet ~1500 tokens, Opus ~2000 tokens.

**Expected Analysis**:
- Decomposition: 1 x 1500 = 1,500 tokens
- Classification: 5 x 500 = 2,500 tokens
- Execution: (2 x 500) + (2 x 1500) + (1 x 2000) = 1,000 + 3,000 + 2,000 = 6,000 tokens
- Synthesis: 1 x 1500 = 1,500 tokens
- **Total: ~11,500 tokens**

Optimisations:
1. Use Haiku for decomposition (saves ~1000 tokens at Sonnet rates)
2. Batch classification into a single Haiku call with all 5 subtasks
3. Evaluate whether the Opus subtask truly needs Opus, or if Sonnet suffices
4. Use prompt caching for the synthesis system prompt if running multiple tasks
5. Check the [Anthropic pricing page](https://www.anthropic.com/pricing) for current token rates to convert to actual cost

---

## Part 4: Practical Implementation (Bonus 20 points)

### Question 9: Build a Mini-Orchestrator

Implement a working orchestrator that:
1. Accepts a task
2. Decomposes into subtasks
3. Executes at least 2 subtasks in parallel
4. Synthesises results
5. Reports token usage

```python
# Your implementation here
# Must use: concurrent.futures, anthropic SDK, token tracking
```

**Evaluation Criteria**:
- Parallel execution works: 5 points
- Token tracking is accurate: 5 points
- Synthesis is coherent: 5 points
- Error handling present: 5 points

## Passing Criteria

- **Part 1**: Minimum 28/40 points
- **Part 2**: Minimum 21/30 points
- **Part 3**: Minimum 21/30 points
- **Overall**: Minimum 70/100 points to pass

## Navigation
- Previous: [Final Project](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Workshop Overview](README.md)
