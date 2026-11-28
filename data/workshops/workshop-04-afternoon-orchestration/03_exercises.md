# Orchestration Exercises

## Exercise 1: Model Routing Orchestrator

Build an orchestrator that routes subtasks to different models based on complexity.

### Requirements
- Classify each subtask as "simple", "moderate", or "complex"
- Route simple tasks to Haiku 4.5, moderate to Sonnet 4.6, complex to Opus 4.8
- Track cost savings vs using Sonnet for everything

### Starter Code

```python
import anthropic

client = anthropic.Anthropic()

MODEL_MAP = {
    "simple": "claude-haiku-4-5-20251001",
    "moderate": "claude-sonnet-4-6",
    "complex": "claude-opus-4-8"
}

def classify_complexity(subtask: str) -> str:
    """Use Haiku to classify task complexity"""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=50,
        system="Classify the following task as exactly one of: simple, moderate, complex. Return only the word.",
        messages=[{"role": "user", "content": subtask}]
    )
    classification = response.content[0].text.strip().lower()
    if classification not in MODEL_MAP:
        classification = "moderate"
    return classification

def execute_with_routing(subtask: str) -> dict:
    """Route subtask to appropriate model"""
    complexity = classify_complexity(subtask)
    model = MODEL_MAP[complexity]

    # TODO: Execute the subtask with the selected model
    # TODO: Track tokens used and model selected
    # TODO: Return result with metadata

    pass

# TODO: Build full orchestrator that:
# 1. Decomposes a complex task
# 2. Classifies and routes each subtask
# 3. Tracks total cost by model
# 4. Reports cost savings
```

### Expected Output
```
Subtask 1: "Format this list" -> Haiku 4.5 (simple)
Subtask 2: "Analyse market trends" -> Sonnet 4.6 (moderate)
Subtask 3: "Design system architecture" -> Opus 4.8 (complex)

Cost report:
  Haiku calls: 2 (est. saving vs Sonnet: ~80%)
  Sonnet calls: 3
  Opus calls: 1
```

---

## Exercise 2: Retry and Recovery Pipeline

Build a pipeline that handles failures gracefully with retries and fallbacks.

### Requirements
- Implement exponential backoff for transient failures
- Fall back to a different model if the primary model fails
- Log all retries and failures
- Never exceed the total retry budget

### Starter Code

```python
import anthropic
import time
from datetime import datetime

client = anthropic.Anthropic()

class ResilientPipeline:
    def __init__(self, max_retries: int = 3, retry_delay: float = 1.0):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.failure_log = []

    def call_with_retry(self, task: str, model: str = "claude-sonnet-4-6") -> str:
        """Call LLM with exponential backoff and model fallback"""
        fallback_models = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]

        for attempt in range(self.max_retries):
            current_model = model if attempt == 0 else fallback_models[min(attempt, len(fallback_models) - 1)]

            try:
                # TODO: Make the API call
                # TODO: Return result on success
                pass

            except Exception as e:
                delay = self.retry_delay * (2 ** attempt)
                self.failure_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "attempt": attempt + 1,
                    "model": current_model,
                    "error": str(e)
                })
                print(f"Attempt {attempt + 1} failed ({current_model}): {e}")

                if attempt < self.max_retries - 1:
                    print(f"Retrying in {delay}s...")
                    time.sleep(delay)

        return "All retries exhausted"

    # TODO: Build a multi-stage pipeline using call_with_retry
    # TODO: Add circuit breaker logic (stop retrying after N consecutive failures)
```

---

## Exercise 3: Approval-Gated Deployment Agent

Build an agent that can prepare and execute deployments, with human approval required at key gates.

### Requirements
- Agent reviews code changes and prepares deployment
- Approval required before: running tests, deploying to staging, deploying to production
- Full audit trail of all actions and approvals
- Automatic rollback suggestion if tests fail

### Starter Code

```python
import anthropic

client = anthropic.Anthropic()

class DeploymentAgent:
    GATES = {
        "run_tests": "Run test suite",
        "deploy_staging": "Deploy to staging environment",
        "deploy_production": "Deploy to production"
    }

    def __init__(self):
        self.audit_trail = []
        self.approvals = {}

    def request_approval(self, gate: str) -> bool:
        """Request human approval at a gate"""
        description = self.GATES.get(gate, gate)
        print(f"\n=== GATE: {description} ===")
        print(f"Action: {gate}")
        choice = input("Approve? [y/N]: ").strip().lower()
        approved = choice == "y"
        self.audit_trail.append({
            "gate": gate,
            "approved": approved
        })
        return approved

    # TODO: Implement the deployment pipeline:
    # 1. Review changes (no approval needed)
    # 2. GATE: Run tests
    # 3. GATE: Deploy to staging
    # 4. Smoke test staging (no approval needed)
    # 5. GATE: Deploy to production
    # 6. Report final status with audit trail
```

---

## Exercise 4: Parallel Research with Deduplication

Build a fan-out/fan-in research system that searches multiple sources and deduplicates findings.

### Requirements
- Search at least 3 different "sources" (simulate with different search queries)
- Run searches in parallel
- Deduplicate overlapping findings
- Synthesise into a unified report with proper attribution
- Track which findings came from which sources

### Starter Code

```python
import anthropic
import concurrent.futures

client = anthropic.Anthropic()

def search_source(source_type: str, topic: str) -> dict:
    """Simulate searching a specific source"""
    prompts = {
        "academic": f"As an academic researcher, list 3 key findings about: {topic}",
        "industry": f"As an industry analyst, list 3 key trends about: {topic}",
        "technical": f"As a technical reviewer, list 3 implementation details about: {topic}"
    }

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{"role": "user", "content": prompts[source_type]}]
    )

    return {
        "source": source_type,
        "findings": response.content[0].text
    }

# TODO: Implement parallel search across all sources
# TODO: Deduplicate findings (use an LLM call to identify overlaps)
# TODO: Synthesise into final report with source attribution
# TODO: Report which findings were unique to each source vs shared
```

---

## Exercise 5: Cost-Optimised Agent System

Build an agent system that minimises cost while maintaining quality.

### Requirements
- Implement prompt caching for repeated system prompts
- Use Haiku for classification/routing, Sonnet for main work
- Track cost per task and compare with a "naive" approach (all Sonnet)
- Stay within a token budget

### Starter Code

```python
import anthropic

client = anthropic.Anthropic()

class CostOptimisedSystem:
    def __init__(self, token_budget: int = 50000):
        self.token_budget = token_budget
        self.tokens_used = {"haiku": 0, "sonnet": 0, "opus": 0}

    def track_usage(self, model: str, response):
        """Track tokens by model"""
        total = response.usage.input_tokens + response.usage.output_tokens
        if "haiku" in model:
            self.tokens_used["haiku"] += total
        elif "sonnet" in model:
            self.tokens_used["sonnet"] += total
        elif "opus" in model:
            self.tokens_used["opus"] += total

    def budget_remaining(self) -> int:
        return self.token_budget - sum(self.tokens_used.values())

    # TODO: Implement a task processor that:
    # 1. Uses Haiku to classify task difficulty
    # 2. Routes to appropriate model
    # 3. Uses cached system prompts where possible
    # 4. Reports cost breakdown at the end
    # 5. Compares estimated cost vs "all Sonnet" baseline
```

---

## Exercise 6: Claude Code Multi-Agent Workflow

Use Claude Code's subagent capabilities for a real development task.

### Task

Use Claude Code to perform a multi-agent code review:

```bash
# Step 1: Security review subagent
SECURITY=$(claude-code --print "Review src/ for security vulnerabilities. Focus on: injection, authentication, data exposure. Return findings as a numbered list.")

# Step 2: Performance review subagent
PERF=$(claude-code --print "Review src/ for performance issues. Focus on: N+1 queries, unnecessary allocations, blocking operations. Return findings as a numbered list.")

# Step 3: Style review subagent
STYLE=$(claude-code --print "Review src/ for code style issues. Focus on: naming conventions, function length, documentation gaps. Return findings as a numbered list.")

# Step 4: Synthesis
cat <<EOF | claude-code --print "Synthesise these three reviews into a single prioritised report. Categorise by severity (critical/high/medium/low)."
=== Security Review ===
$SECURITY

=== Performance Review ===
$PERF

=== Style Review ===
$STYLE
EOF
```

### What to observe
- How subagents maintain focused contexts
- The cost of parallel vs sequential execution
- How synthesis combines different perspectives

---

## Submission Guidelines

For each exercise:
1. Complete the implementation
2. Run it with at least one real task
3. Document the token usage and cost breakdown
4. Note any failure modes you discovered

## Navigation
- Previous: [Hands-on Practice](02_hands_on.md)
- Next: [Final Project](04_project.md)
- [Back to Workshop Overview](README.md)
