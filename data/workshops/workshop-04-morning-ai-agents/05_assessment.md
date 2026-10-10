# Assessment: AI Agents Knowledge Check

## Part 1: Conceptual Understanding (40 points)

### Question 1: Agent Architecture (10 points)

Explain the key components of a modern AI agent and how they work together. Include:
- The role of the LLM (reasoning engine)
- Tool integration via MCP
- Memory systems (short-term, project config, long-term)
- The agent loop (ReAct pattern)

**Model Answer**: A modern AI agent uses a Large Language Model (such as Claude Sonnet 4.6 or Opus 4.8) as its reasoning engine. The LLM decides which actions to take based on the user's goal. Tools are provided via the Model Context Protocol (MCP) or direct function calling -- these give the agent capabilities like web search, file operations, code execution, and API access. Memory operates at three levels: short-term conversation context (the message history), project configuration (CLAUDE.md files that persist across sessions), and long-term storage (vector databases for knowledge retrieval). The agent loop follows the ReAct pattern: think, act, observe, repeat until the goal is achieved or a stopping condition is met.

---

### Question 2: MCP and Tool Use (10 points)

What is the Model Context Protocol (MCP)? Explain how it differs from direct function calling, and give two examples of MCP servers you might use in a development workflow.

**Key Points**:
- MCP is a standardised protocol for connecting AI agents to external tools
- Unlike direct function calling (where tools are defined per-request), MCP servers run as persistent processes that expose tools dynamically
- MCP enables tool reuse across different AI clients (Claude Code, Cursor, Windsurf, etc.)
- Examples: `server-filesystem` for file operations, `server-github` for issue/PR management, `server-postgres` for database queries

---

### Question 3: Tool Use vs. RAG (10 points)

Compare and contrast tool use in agents versus Retrieval-Augmented Generation (RAG). When would you use each?

**Comparison Table**:
| Aspect | Tool Use | RAG |
|--------|----------|-----|
| Purpose | Execute actions, fetch live data | Retrieve from a knowledge base |
| Data freshness | Real-time | Static (updated on indexing schedule) |
| Use case | APIs, calculations, file operations | Document Q&A, knowledge search |
| Protocol | MCP, function calling | Embedding + vector search |
| Complexity | Higher (tool definitions, execution) | Lower (indexing pipeline) |

---

### Question 4: Agent Patterns (10 points)

Describe the difference between these three agent patterns:
1. ReAct (Reasoning + Acting)
2. Subagent delegation
3. Plan-and-Execute

When would you choose each?

**Expected Coverage**:
- **ReAct**: Best for general-purpose tasks; interleaves thinking and tool use; simple to implement
- **Subagent delegation**: Best for large, decomposable tasks; parent spawns focused child agents; enables parallelism (Claude Code's subagent model)
- **Plan-and-Execute**: Best for complex multi-step tasks with dependencies; plans upfront, adapts on failure; more efficient token usage than pure ReAct

---

## Part 2: Code Analysis (30 points)

### Question 5: Identify Issues (15 points)

Review this agent code and identify at least 3 problems:

```python
def buggy_agent(user_query):
    tools = [calculator, search, file_reader]

    response = llm.invoke(user_query)

    if "calculate" in response:
        return calculator(user_query)

    return response
```

**Issues**:
1. No tool use API -- calling LLM without tool schemas, so the model cannot select tools properly
2. Keyword matching ("calculate" in response) instead of structured tool selection via `stop_reason` and `tool_use` blocks
3. No agent loop -- single LLM call cannot handle multi-step tasks
4. No error handling for tool execution failures
5. Tools are not formatted as schemas for the LLM
6. Passes raw `user_query` to calculator instead of extracting the expression from the LLM's tool call

---

### Question 6: Complete the Code (15 points)

Complete this agent implementation:

```python
from anthropic import Anthropic

client = Anthropic()

tools = [
    {
        "name": "search_web",
        "description": "Search the internet for information",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        }
    }
]

def run_agent(user_message):
    messages = [{"role": "user", "content": user_message}]

    # TODO: Implement agent loop
    # 1. Call Claude with tools
    # 2. Check for tool use
    # 3. Execute tools
    # 4. Continue until complete

    pass
```

**Expected Solution**:
```python
def run_agent(user_message):
    messages = [{"role": "user", "content": user_message}]

    for _ in range(5):  # Max 5 iterations
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

        messages.append({
            "role": "assistant",
            "content": response.content
        })

        if response.stop_reason == "end_turn":
            return next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response"
            )

        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    if block.name == "search_web":
                        result = search_web(block.input["query"])
                    else:
                        result = f"Unknown tool: {block.name}"

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({
                "role": "user",
                "content": tool_results
            })

    return "Max iterations reached"
```

**Grading**:
- Correct message loop: 5 points
- Proper tool execution with `tool_use_id`: 5 points
- Stop condition handling: 3 points
- Iteration limit: 2 points

---

## Part 3: Design Questions (30 points)

### Question 7: Agent Design (15 points)

Design an agent system for: **"Automated code review agent"**

Specify:
1. Required tools (minimum 3)
2. Which Claude model to use and why
3. Memory/configuration requirements
4. Workflow strategy
5. Success criteria

**Example Answer**:
```
Tools:
1. read_file -- read source code files via MCP filesystem server
2. run_tests -- execute the project's test suite
3. search_codebase -- grep/search for patterns across files
4. (optional) check_style -- run linter (eslint, ruff, etc.)

Model: Claude Sonnet 4.6 -- good balance of reasoning quality and cost
  for code review. Opus 4.8 only if the codebase is unusually complex.

Configuration (CLAUDE.md):
- Project coding standards and conventions
- Preferred linter and test commands
- Known areas of technical debt

Workflow (Plan-and-Execute):
1. Read the diff or changed files
2. Run existing tests to establish baseline
3. Analyse code for bugs, security issues, style violations
4. Cross-reference with project conventions in CLAUDE.md
5. Generate structured review with severity ratings

Success criteria:
- All changed files reviewed
- Issues categorised by severity (critical/high/medium/low)
- Actionable recommendations with code suggestions
- No false positives on established project patterns
```

---

### Question 8: Safety and Cost Strategy (15 points)

Design a safety and cost management strategy for an agent that:
- Searches the web
- Executes Python code
- Reads and writes files

What could go wrong and how would you handle it?

**Expected Coverage**:
- **Token budget**: Set a maximum token spend per task; track usage via `response.usage`
- **Iteration limit**: Cap the number of agent loop iterations (e.g. 10-20)
- **Code sandboxing**: Execute code in E2B, Modal, or a Docker container -- never on the host
- **File access controls**: Restrict filesystem MCP server to specific directories; never grant write access to system paths
- **Network errors**: Retry with exponential backoff; fail gracefully if a source is unreachable
- **Model selection**: Use Haiku 4.5 for cheap subtasks, Sonnet 4.6 for main reasoning
- **Human-in-the-loop**: Require approval for destructive actions (file writes, deployments)
- **Audit logging**: Log every tool call with timestamp, inputs, and outputs

---

## Part 4: Practical Implementation (Bonus 20 points)

### Question 9: Build a Mini-Agent

Implement a working agent with these requirements:

```python
"""
Create an agent that helps users with mathematical word problems.

Requirements:
1. Parse word problem into mathematical expression
2. Use calculator tool to solve
3. Explain the solution step-by-step

Example:
User: "If I have 3 apples and buy 5 more, then give away 2, how many do I have?"
Agent:
- Parses: 3 + 5 - 2
- Calculates: 6
- Explains: "Starting with 3, adding 5 gives 8, removing 2 leaves 6"

Tools provided:
- calculator(expression: str) -> str
"""

# Your implementation here
```

**Complete Solution**:

```python
from anthropic import Anthropic

client = Anthropic()

def calculator(expression: str) -> str:
    try:
        return str(eval(expression, {"__builtins__": {}}, {}))
    except Exception as e:
        return f"Error: {e}"

tools = [
    {
        "name": "calculator",
        "description": "Evaluate a mathematical expression and return the result",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression, e.g. '3 + 5 - 2'"
                }
            },
            "required": ["expression"]
        }
    }
]

def math_agent(word_problem: str) -> str:
    messages = [{
        "role": "user",
        "content": f"""Solve this word problem step by step:
{word_problem}

1. Identify the numbers and operations
2. Use the calculator tool to compute the answer
3. Explain the solution clearly"""
    }]

    for _ in range(10):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            tools=tools,
            messages=messages
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            return next(
                (b.text for b in response.content if hasattr(b, "text")),
                "No response"
            )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = calculator(block.input["expression"])
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })
            messages.append({"role": "user", "content": tool_results})

    return "Could not solve problem"

if __name__ == "__main__":
    problem = "If I have 3 apples and buy 5 more, then give away 2, how many do I have?"
    print(math_agent(problem))
```

**Evaluation Criteria**:
- Correct tool usage with proper schema: 5 points
- Proper agent loop with stop conditions: 5 points
- Clear step-by-step explanations: 5 points
- Error handling: 5 points

## Passing Criteria

- **Part 1**: Minimum 28/40 points
- **Part 2**: Minimum 21/30 points
- **Part 3**: Minimum 21/30 points
- **Overall**: Minimum 70/100 points to pass

Bonus points can compensate for weaker areas.

## Navigation
- Previous: [Final Project](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Workshop Overview](README.md)
