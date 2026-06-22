# Practical Exercises

## Exercise 1: Build a Weather Agent with MCP

Create an agent that provides weather information using the Claude API and tool use.

### Requirements
- Tool to get current weather for a location
- Tool to get a multi-day forecast
- Tool to suggest activities based on conditions
- Agent loop that chains tool calls as needed

### Starter Code

```python
import anthropic

client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name, e.g. 'London, UK'"}
            },
            "required": ["location"]
        }
    },
    {
        "name": "get_forecast",
        "description": "Get weather forecast for the next few days",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"},
                "days": {"type": "integer", "description": "Number of days (1-7)"}
            },
            "required": ["location"]
        }
    },
    {
        "name": "suggest_activities",
        "description": "Suggest outdoor activities based on weather conditions",
        "input_schema": {
            "type": "object",
            "properties": {
                "conditions": {"type": "string", "description": "Weather summary"}
            },
            "required": ["conditions"]
        }
    }
]

# TODO: Implement tool functions
# TODO: Implement agent loop (refer to Project 1 pattern)
# TODO: Test with: "What's the weather in London? Should I go hiking tomorrow?"
```

### Expected Behaviour
```
User: "What's the weather in London? Should I go hiking tomorrow?"
Agent: Uses get_weather -> Uses get_forecast -> Uses suggest_activities -> Provides recommendation
```

---

## Exercise 2: Code Review Agent

Build an agent that reviews Python code for quality and security issues using Claude's tool use.

### Requirements
- Tool to analyse code complexity
- Tool to check for security vulnerabilities
- The agent synthesises findings into a structured review

### Starter Code

```python
import anthropic
import ast
import re

client = anthropic.Anthropic()

def analyse_complexity(code: str) -> str:
    """Analyse code complexity metrics"""
    try:
        tree = ast.parse(code)
        functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
        classes = [node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
        return f"Lines: {len(code.splitlines())}, Functions: {len(functions)}, Classes: {len(classes)}"
    except SyntaxError as e:
        return f"Syntax error: {e}"

def check_security(code: str) -> str:
    """Check for common security issues"""
    issues = []
    if "eval(" in code:
        issues.append("CRITICAL: Use of eval() -- potential code injection")
    if "exec(" in code:
        issues.append("CRITICAL: Use of exec() -- potential code injection")
    if re.search(r"f['\"].*SELECT.*{", code):
        issues.append("HIGH: Possible SQL injection via f-string")
    if "pickle.loads" in code:
        issues.append("HIGH: Unsafe deserialisation with pickle")
    if not issues:
        issues.append("No obvious security issues detected")
    return "\n".join(issues)

tools = [
    {
        "name": "analyse_complexity",
        "description": "Analyse Python code for complexity metrics (line count, functions, classes)",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python source code to analyse"}
            },
            "required": ["code"]
        }
    },
    {
        "name": "check_security",
        "description": "Check Python code for common security vulnerabilities",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python source code to check"}
            },
            "required": ["code"]
        }
    }
]

# TODO: Implement execute_tool and agent loop
# TODO: Test with code containing eval(), SQL injection, and complex nesting
```

### Test Case
```python
test_code = """
def process_user_input(user_data):
    query = f"SELECT * FROM users WHERE name = '{user_data}'"
    eval(user_data)
    return query
"""
# Agent should identify: SQL injection, eval() usage, no input validation
```

---

## Exercise 3: Claude Code Workflow Exercise

Use Claude Code to perform a multi-step coding task.

### Task

Create a `CLAUDE.md` file and use Claude Code to build a small utility:

1. Create the project configuration:

```markdown
# Exercise Project

## Task
Build a Python CLI tool that converts CSV files to JSON.

## Requirements
- Accept input file path as argument
- Support --pretty flag for formatted output
- Handle errors gracefully (missing file, invalid CSV)
- Include type hints on all functions

## Testing
- Run: python -m pytest tests/
```

2. Run Claude Code to implement:
```bash
claude-code --print "Read CLAUDE.md and implement the CSV-to-JSON converter according to the requirements. Create the main script and test file."
```

3. Verify the output:
```bash
claude-code --print "Run the tests and fix any failures"
```

### What to observe
- How Claude Code reads and follows CLAUDE.md instructions
- How it creates multiple files in a single session
- How it self-corrects when tests fail

---

## Exercise 4: MCP Server Integration

Connect an MCP server to your agent and use it for a practical task.

### Requirements
- Set up the filesystem MCP server
- Create an agent that can read, list, and search files
- Use it to analyse a directory of source code

### Setup

```json
// .mcp.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/your/project"]
    }
  }
}
```

### Task

Using Claude Code with the filesystem MCP server:

```bash
# List all Python files
claude-code --print "Use the filesystem tools to list all .py files in this project"

# Analyse imports
claude-code --print "Read every Python file and list all third-party imports used across the project"

# Find potential issues
claude-code --print "Search for any TODO or FIXME comments across all source files"
```

### Stretch goal
Write a Python script that programmatically connects to an MCP server using the `mcp` package and lists available tools.

---

## Exercise 5: Task Decomposition Agent

Build an agent that breaks down complex tasks into step-by-step plans.

### Requirements
- Analyse a complex task description
- Decompose into subtasks with dependencies
- Estimate time for each subtask
- Output a structured plan

### Starter Code

```python
import anthropic
import json

client = anthropic.Anthropic()

tools = [
    {
        "name": "create_plan",
        "description": "Create a structured task plan with subtasks, dependencies, and time estimates",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan": {
                    "type": "object",
                    "properties": {
                        "subtasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "integer"},
                                    "name": {"type": "string"},
                                    "time_estimate": {"type": "string"},
                                    "dependencies": {
                                        "type": "array",
                                        "items": {"type": "integer"}
                                    }
                                }
                            }
                        },
                        "critical_path": {
                            "type": "array",
                            "items": {"type": "integer"}
                        }
                    }
                }
            },
            "required": ["plan"]
        }
    }
]

# TODO: Build agent that decomposes tasks like:
# "Build and deploy a web application with user authentication"
# "Migrate a monolithic Python app to microservices"
# "Set up a CI/CD pipeline for a Rust project"
```

### Expected Output
```json
{
  "subtasks": [
    {"id": 1, "name": "Design database schema", "time_estimate": "2 hours", "dependencies": []},
    {"id": 2, "name": "Implement authentication", "time_estimate": "4 hours", "dependencies": [1]},
    {"id": 3, "name": "Build API endpoints", "time_estimate": "6 hours", "dependencies": [1, 2]},
    {"id": 4, "name": "Create frontend", "time_estimate": "8 hours", "dependencies": [3]},
    {"id": 5, "name": "Write tests", "time_estimate": "4 hours", "dependencies": [4]},
    {"id": 6, "name": "Deploy", "time_estimate": "2 hours", "dependencies": [5]}
  ],
  "critical_path": [1, 2, 3, 4, 5, 6]
}
```

---

## Exercise 6: Multi-Agent Preview

Build a simple multi-agent pipeline where different "agents" (separate Claude API calls with different system prompts) collaborate.

### Scenario: Content Creation Pipeline

```python
import anthropic

client = anthropic.Anthropic()

def run_specialist(system_prompt: str, task: str) -> str:
    """Run a specialist agent with a focused system prompt"""
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": task}]
    )
    return response.content[0].text

def content_pipeline(topic: str) -> str:
    """Three-agent content creation pipeline"""

    # Agent 1: Researcher
    print("--- Researcher ---")
    research = run_specialist(
        system_prompt="You are a thorough research analyst. Gather key facts, statistics, and perspectives on the given topic. Be concise but comprehensive.",
        task=f"Research this topic: {topic}"
    )
    print(f"Research complete: {len(research)} chars\n")

    # Agent 2: Writer
    print("--- Writer ---")
    draft = run_specialist(
        system_prompt="You are an engaging technical writer. Write clear, well-structured content based on the provided research. Use British English.",
        task=f"Write an article about: {topic}\n\nResearch notes:\n{research}"
    )
    print(f"Draft complete: {len(draft)} chars\n")

    # Agent 3: Editor
    print("--- Editor ---")
    final = run_specialist(
        system_prompt="You are a meticulous editor. Improve clarity, fix errors, tighten prose, and ensure British English spelling throughout. Return only the edited text.",
        task=f"Edit and polish this article:\n\n{draft}"
    )
    print(f"Final version: {len(final)} chars\n")

    return final

if __name__ == "__main__":
    article = content_pipeline("The impact of AI agents on software development in 2026")
    print("=== FINAL ARTICLE ===")
    print(article)
```

This preview introduces concepts we will explore deeply in the afternoon session on orchestration.

---

## Submission Guidelines

For each exercise:
1. Complete the implementation
2. Add error handling (retries, timeouts, input validation)
3. Test with at least two different inputs
4. Document what you learned about agent behaviour

## Navigation
- Previous: [Hands-on Development](02_hands_on.md)
- Next: [Final Project](04_project.md)
- [Back to Module Overview](README.md)
