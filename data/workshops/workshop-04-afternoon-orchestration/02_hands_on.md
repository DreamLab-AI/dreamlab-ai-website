# Hands-on: Building Orchestrated Agent Systems

## Setup

Ensure you have the packages from the morning session, plus:

```bash
pip install anthropic tenacity python-dotenv
```

Optional (for LangGraph exercises):
```bash
pip install langgraph langchain langchain-anthropic
```

## Project 1: Subagent Orchestrator

Build a parent agent that decomposes tasks and delegates to specialist subagents.

### Complete Implementation

```python
# orchestrator.py
import anthropic
import concurrent.futures
from datetime import datetime

client = anthropic.Anthropic()

class SubagentOrchestrator:
    """Parent agent that delegates work to specialist subagents"""

    def __init__(self, budget_limit: int = 100000):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.budget_limit = budget_limit
        self.log = []

    def _call_llm(self, system: str, user: str, model: str = "claude-sonnet-4-6") -> str:
        """Make an LLM call with tracking"""
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}]
        )

        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens
        self._check_budget()

        text = next((b.text for b in response.content if hasattr(b, "text")), "")

        self.log.append({
            "timestamp": datetime.now().isoformat(),
            "model": model,
            "system_preview": system[:80],
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens
        })

        return text

    def _check_budget(self):
        total = self.total_input_tokens + self.total_output_tokens
        if total > self.budget_limit:
            raise Exception(
                f"Token budget exceeded: {total}/{self.budget_limit}"
            )

    def decompose(self, task: str) -> list:
        """Break a task into independent subtasks"""
        plan = self._call_llm(
            system="You are a task decomposition specialist. Break the given task into 2-5 independent subtasks that can be executed in parallel. Return ONLY a numbered list, one subtask per line. No additional commentary.",
            user=task,
            model="claude-haiku-4-5-20251001"  # Cheap for planning
        )
        subtasks = [
            line.strip().lstrip("0123456789.-) ")
            for line in plan.strip().split("\n")
            if line.strip() and any(c.isalpha() for c in line)
        ]
        return subtasks

    def execute_subtask(self, subtask: str, context: str = "") -> dict:
        """Execute a single subtask via a subagent"""
        prompt = subtask
        if context:
            prompt = f"{subtask}\n\nContext:\n{context}"

        result = self._call_llm(
            system="You are a focused specialist. Complete the assigned task thoroughly and concisely. Return only the result.",
            user=prompt,
            model="claude-sonnet-4-6"
        )
        return {"subtask": subtask, "result": result}

    def synthesise(self, task: str, results: list) -> str:
        """Combine subtask results into a final answer"""
        results_text = "\n\n---\n\n".join(
            f"**{r['subtask']}**:\n{r['result']}" for r in results
        )
        return self._call_llm(
            system="You are a synthesis expert. Combine the provided subtask results into a coherent, well-structured final answer. Eliminate redundancy and ensure consistency. Use British English.",
            user=f"Original task: {task}\n\nSubtask results:\n{results_text}",
            model="claude-sonnet-4-6"
        )

    def run(self, task: str, max_parallel: int = 4) -> dict:
        """Full orchestration: decompose, execute in parallel, synthesise"""
        print(f"Task: {task}\n")

        # Decompose
        print("Decomposing task...")
        subtasks = self.decompose(task)
        print(f"Subtasks ({len(subtasks)}):")
        for i, st in enumerate(subtasks, 1):
            print(f"  {i}. {st}")
        print()

        # Execute in parallel
        print("Executing subtasks in parallel...")
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_parallel) as executor:
            futures = {
                executor.submit(self.execute_subtask, st): st
                for st in subtasks
            }
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                results.append(result)
                print(f"  Completed: {result['subtask'][:60]}...")

        print()

        # Synthesise
        print("Synthesising final answer...")
        final = self.synthesise(task, results)

        return {
            "result": final,
            "subtasks": len(subtasks),
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "calls": len(self.log)
        }


if __name__ == "__main__":
    orch = SubagentOrchestrator(budget_limit=50000)

    result = orch.run(
        "Compare React, Vue, and Svelte for building a new internal dashboard. "
        "Consider developer experience, performance, ecosystem maturity, and hiring availability."
    )

    print("\n=== RESULT ===")
    print(result["result"])
    print(f"\n--- Stats: {result['subtasks']} subtasks, "
          f"{result['calls']} LLM calls, "
          f"{result['total_input_tokens']} input tokens, "
          f"{result['total_output_tokens']} output tokens ---")
```

## Project 2: Guardrailed Agent

Build an agent with full safety controls: budget, iteration limits, approval gates, and audit logging.

```python
# safe_agent.py
import anthropic
import json
from datetime import datetime
from pathlib import Path

client = anthropic.Anthropic()

class SafeAgent:
    """Agent with production safety controls"""

    def __init__(
        self,
        max_iterations: int = 15,
        max_tokens_budget: int = 30000,
        require_approval_for: set = None,
        log_dir: str = "./agent_logs"
    ):
        self.max_iterations = max_iterations
        self.max_tokens = max_tokens_budget
        self.tokens_used = 0
        self.iteration = 0
        self.require_approval = require_approval_for or {"write_file", "delete_file", "execute_code"}

        # Audit log
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.audit_log = []

    def _audit(self, event: str, data: dict):
        entry = {"timestamp": datetime.now().isoformat(), "event": event, **data}
        self.audit_log.append(entry)

    def _save_audit(self):
        log_file = self.log_dir / f"audit_{self.session_id}.jsonl"
        with open(log_file, "w") as f:
            for entry in self.audit_log:
                f.write(json.dumps(entry) + "\n")

    def _check_budget(self, response):
        self.tokens_used += response.usage.input_tokens + response.usage.output_tokens
        if self.tokens_used > self.max_tokens:
            self._audit("budget_exceeded", {"tokens_used": self.tokens_used})
            raise Exception(f"Token budget exceeded: {self.tokens_used}/{self.max_tokens}")

    def _check_approval(self, tool_name: str, tool_input: dict) -> str:
        """Check if tool requires approval; return result or raise"""
        if tool_name not in self.require_approval:
            return None  # No approval needed

        print(f"\n--- APPROVAL REQUIRED ---")
        print(f"Tool: {tool_name}")
        print(f"Input: {json.dumps(tool_input, indent=2)}")
        choice = input("Approve? [y/N]: ").strip().lower()

        self._audit("approval_request", {
            "tool": tool_name,
            "approved": choice == "y"
        })

        if choice != "y":
            return f"Action denied by user: {tool_name}"
        return None  # Approved, proceed

    def run(self, task: str, tools: list, tool_executor) -> str:
        """Run the agent with full safety controls"""
        self._audit("session_start", {"task": task})

        messages = [{"role": "user", "content": task}]

        try:
            for self.iteration in range(1, self.max_iterations + 1):
                self._audit("iteration", {"number": self.iteration})

                response = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=2048,
                    tools=tools,
                    messages=messages
                )

                self._check_budget(response)
                self._audit("llm_call", {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "stop_reason": response.stop_reason
                })

                messages.append({"role": "assistant", "content": response.content})

                if response.stop_reason == "end_turn":
                    result = next(
                        (b.text for b in response.content if hasattr(b, "text")), ""
                    )
                    self._audit("session_end", {"status": "success", "iterations": self.iteration})
                    return result

                if response.stop_reason == "tool_use":
                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            # Check approval
                            denial = self._check_approval(block.name, block.input)
                            if denial:
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": block.id,
                                    "content": denial,
                                    "is_error": True
                                })
                                continue

                            # Execute tool
                            try:
                                result = tool_executor(block.name, block.input)
                            except Exception as e:
                                result = f"Tool error: {e}"

                            self._audit("tool_call", {
                                "tool": block.name,
                                "input": block.input,
                                "result_length": len(str(result))
                            })

                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": str(result)
                            })

                    messages.append({"role": "user", "content": tool_results})

            self._audit("session_end", {"status": "max_iterations"})
            return "Agent stopped: maximum iterations reached"

        finally:
            self._save_audit()
            print(f"\nAudit log saved: {self.log_dir / f'audit_{self.session_id}.jsonl'}")
            print(f"Total tokens: {self.tokens_used}/{self.max_tokens}")
            print(f"Iterations: {self.iteration}/{self.max_iterations}")


# Example usage
if __name__ == "__main__":
    tools = [
        {
            "name": "calculator",
            "description": "Evaluate a mathematical expression",
            "input_schema": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string"}
                },
                "required": ["expression"]
            }
        },
        {
            "name": "write_file",
            "description": "Write content to a file (requires approval)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }
        }
    ]

    def execute_tool(name, inputs):
        if name == "calculator":
            return str(eval(inputs["expression"], {"__builtins__": {}}, {}))
        elif name == "write_file":
            Path(inputs["path"]).write_text(inputs["content"])
            return f"Written to {inputs['path']}"
        return "Unknown tool"

    agent = SafeAgent(max_iterations=10, max_tokens_budget=20000)
    result = agent.run(
        "Calculate 2^10, then write the result to result.txt",
        tools=tools,
        tool_executor=execute_tool
    )
    print(f"\nResult: {result}")
```

## Project 3: Claude Code Workflow with Hooks

Use Claude Code's hooks system to add safety controls to an existing workflow.

### Setting up hooks in CLAUDE.md

```markdown
# Project Configuration

## Build Commands
- python -m pytest tests/
- python -m mypy src/

## Rules
- Never modify files in the config/ directory without explicit approval
- Always run tests after making code changes
- Use British English in all user-facing strings
```

### Setting up hooks in settings

Claude Code hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "echo 'File change detected' >> .claude/hook-log.txt"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "python -m pytest tests/ --tb=short -q 2>&1 | tail -5"
      }
    ]
  }
}
```

### Using Claude Code for orchestrated tasks

```bash
# Multi-step workflow: refactor, test, document
claude-code --print "
1. Read all files in src/
2. Identify functions longer than 30 lines
3. Refactor each one into smaller functions
4. Run the test suite after each change
5. Update docstrings for all changed functions
"

# Parallel subagent pattern from the command line
ANALYSIS=$(claude-code --print "Analyse src/api.py for security issues")
TESTS=$(claude-code --print "Check test coverage for src/api.py")
echo "Analysis: $ANALYSIS" > /tmp/review_context.txt
echo "Tests: $TESTS" >> /tmp/review_context.txt
cat /tmp/review_context.txt | claude-code --print "Synthesise these findings into a code review report"
```

## Testing Your Orchestration

### Testing the Orchestrator

```python
# test_orchestrator.py
import unittest
from orchestrator import SubagentOrchestrator

class TestOrchestrator(unittest.TestCase):

    def test_decomposition(self):
        """Verify task gets decomposed into subtasks"""
        orch = SubagentOrchestrator()
        subtasks = orch.decompose("Compare Python and Rust for CLI tools")
        self.assertGreater(len(subtasks), 1)
        self.assertLess(len(subtasks), 6)

    def test_budget_enforcement(self):
        """Verify budget limit is enforced"""
        orch = SubagentOrchestrator(budget_limit=100)  # Very low limit
        with self.assertRaises(Exception) as ctx:
            orch.run("Write a detailed essay about every country in the world")
        self.assertIn("budget", str(ctx.exception).lower())

    def test_synthesis(self):
        """Verify synthesis produces coherent output"""
        orch = SubagentOrchestrator()
        results = [
            {"subtask": "Research A", "result": "Finding A is important"},
            {"subtask": "Research B", "result": "Finding B is also important"}
        ]
        synthesis = orch.synthesise("Compare A and B", results)
        self.assertGreater(len(synthesis), 50)


if __name__ == "__main__":
    unittest.main()
```

### Testing the Safe Agent

```python
# test_safe_agent.py
import unittest
from safe_agent import SafeAgent

class TestSafeAgent(unittest.TestCase):

    def test_iteration_limit(self):
        """Agent stops at max iterations"""
        agent = SafeAgent(max_iterations=1, max_tokens_budget=100000)
        tools = [{
            "name": "search",
            "description": "Search",
            "input_schema": {
                "type": "object",
                "properties": {"q": {"type": "string"}},
                "required": ["q"]
            }
        }]
        # With 1 iteration, agent should stop quickly
        result = agent.run(
            "Search for 100 different topics",
            tools=tools,
            tool_executor=lambda n, i: "result"
        )
        self.assertLessEqual(agent.iteration, 2)

    def test_audit_log_created(self):
        """Verify audit log is written"""
        agent = SafeAgent(max_iterations=2, max_tokens_budget=100000)
        agent.run("Say hello", tools=[], tool_executor=lambda n, i: "")
        self.assertGreater(len(agent.audit_log), 0)
        self.assertEqual(agent.audit_log[0]["event"], "session_start")


if __name__ == "__main__":
    unittest.main()
```

## Navigation
- Previous: [Core Concepts](01_concepts.md)
- Next: [Exercises](03_exercises.md)
- [Back to Workshop Overview](README.md)
