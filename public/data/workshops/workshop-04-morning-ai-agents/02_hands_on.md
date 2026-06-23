# Hands-on Agent Development

## Setup

### Option A: Claude API (Python)

```bash
pip install anthropic python-dotenv
```

Create `.env` file:
```bash
ANTHROPIC_API_KEY=your_claude_key_here
```

### Option B: Claude Code (Terminal Agent)

```bash
npm install -g @anthropic-ai/claude-code
```

Claude Code reads your `ANTHROPIC_API_KEY` from the environment. No additional configuration is needed to get started.

### Option C: Full Stack (for later exercises)

```bash
pip install anthropic langchain langchain-anthropic langchain-community \
    chromadb duckduckgo-search python-dotenv tenacity
```

## Project 1: Basic Claude Agent with Tool Use

### Step 1: Define Tools

```python
# basic_agent.py
import anthropic
import os
from datetime import datetime

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Define available tools
tools = [
    {
        "name": "get_current_time",
        "description": "Get the current date and time",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "calculator",
        "description": "Perform mathematical calculations",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate"
                }
            },
            "required": ["expression"]
        }
    },
    {
        "name": "web_search",
        "description": "Search the internet for information",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                }
            },
            "required": ["query"]
        }
    }
]
```

### Step 2: Implement Tool Functions

```python
def execute_tool(tool_name, tool_input):
    """Execute a tool and return the result"""

    if tool_name == "get_current_time":
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    elif tool_name == "calculator":
        try:
            result = eval(tool_input["expression"], {"__builtins__": {}}, {})
            return str(result)
        except Exception as e:
            return f"Error: {str(e)}"

    elif tool_name == "web_search":
        query = tool_input["query"]
        # In production, connect to a real search API (Brave, Tavily, etc.)
        return f"Search results for '{query}': [Connect a search MCP server for real results]"

    return "Unknown tool"
```

### Step 3: Agent Loop Implementation

```python
def run_agent(user_message, max_iterations=10):
    """
    Run the agent loop with tool use.
    This is the core pattern used by all Claude-based agents.
    """
    messages = [{"role": "user", "content": user_message}]

    print(f"User: {user_message}\n")

    for iteration in range(max_iterations):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        print(f"--- Iteration {iteration + 1} ---")

        assistant_message = {
            "role": "assistant",
            "content": response.content
        }
        messages.append(assistant_message)

        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input

                    print(f"Tool: {tool_name}")
                    print(f"Input: {tool_input}")

                    result = execute_tool(tool_name, tool_input)

                    print(f"Result: {result}\n")

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({
                "role": "user",
                "content": tool_results
            })

        elif response.stop_reason == "end_turn":
            final_response = next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response"
            )
            print(f"Assistant: {final_response}")
            return final_response

    return "Max iterations reached"


if __name__ == "__main__":
    result = run_agent("What time is it? Then calculate 15 * 23")
    print("\n" + "="*50 + "\n")
    result = run_agent("Search for the latest AI news and summarise")
```

## Project 2: Claude Code as an Agent

Claude Code itself is a production agent. Let us explore how to use it programmatically.

### Using Claude Code from scripts

```bash
# Simple one-shot task (--print flag returns output without interactive mode)
claude-code --print "List all Python files in this directory and count the lines of code"

# Pipe input for context
cat requirements.txt | claude-code --print "Are there any outdated or insecure dependencies?"

# Use a specific model
claude-code --model claude-opus-4-8 --print "Review this codebase for architectural issues"
```

### Configuring Claude Code with CLAUDE.md

Create a `CLAUDE.md` file in your project root:

```markdown
# Project Agent Configuration

## Build Commands
- python -m pytest tests/
- python -m mypy src/

## Architecture
- FastAPI REST API
- SQLAlchemy ORM with PostgreSQL
- Pydantic v2 for validation

## Rules
- All functions must have type hints
- All endpoints must have docstrings
- Use British English in user-facing strings
- Run tests before committing
```

Claude Code reads this file automatically and follows its instructions. This is how you give an agent persistent project knowledge.

### Configuring MCP Servers

Create `.mcp.json` in your project root to give Claude Code access to external tools:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-key"
      }
    }
  }
}
```

## Project 3: Agent with Memory

### Vector Memory Implementation

```python
# agent_with_memory.py
import anthropic
from datetime import datetime

client = anthropic.Anthropic()

class SimpleMemory:
    """Lightweight memory using a local list (upgrade to vector DB for production)"""

    def __init__(self):
        self.facts = []

    def remember(self, fact: str):
        self.facts.append({
            "content": fact,
            "timestamp": datetime.now().isoformat()
        })
        return f"Stored: {fact}"

    def recall(self, query: str, k: int = 3):
        # Simple keyword matching; in production use embeddings + vector search
        matches = [
            f["content"] for f in self.facts
            if any(word.lower() in f["content"].lower() for word in query.split())
        ]
        return matches[:k] if matches else ["No relevant memories found"]


memory = SimpleMemory()

tools = [
    {
        "name": "remember_fact",
        "description": "Store important information in long-term memory for later recall",
        "input_schema": {
            "type": "object",
            "properties": {
                "fact": {"type": "string", "description": "The fact to remember"}
            },
            "required": ["fact"]
        }
    },
    {
        "name": "recall_memory",
        "description": "Search long-term memory for relevant information",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to search for"}
            },
            "required": ["query"]
        }
    }
]

def execute_tool(name, inputs):
    if name == "remember_fact":
        return memory.remember(inputs["fact"])
    elif name == "recall_memory":
        results = memory.recall(inputs["query"])
        return "\n".join(results)
    return "Unknown tool"

def chat(user_message, conversation):
    """Single turn of a memory-enabled agent"""
    conversation.append({"role": "user", "content": user_message})

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            tools=tools,
            system="You are a helpful assistant with memory. Store important facts the user tells you, and recall them when relevant.",
            messages=conversation
        )

        conversation.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            text = next((b.text for b in response.content if hasattr(b, "text")), "")
            print(f"Agent: {text}")
            return conversation

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })
            conversation.append({"role": "user", "content": tool_results})


if __name__ == "__main__":
    conv = []

    print("=== Storing Information ===")
    conv = chat("My favourite colour is blue and I work as a software engineer", conv)

    print("\n=== Recall ===")
    conv = chat("What's my favourite colour?", conv)

    print("\n=== Contextual Advice ===")
    conv = chat("What programming languages should I learn?", conv)
```

## Project 4: Research Agent with Web Search

### Web Research Agent with Citations

```python
# research_agent.py
import anthropic
from datetime import datetime

client = anthropic.Anthropic()

tools = [
    {
        "name": "web_search",
        "description": "Search the web for current information. Returns titles, snippets, and URLs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "read_url",
        "description": "Fetch and read the text content of a webpage",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL to read"
                }
            },
            "required": ["url"]
        }
    }
]

def execute_tool(name, inputs):
    if name == "web_search":
        # In production, use Brave Search API, Tavily, or an MCP search server
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(inputs["query"], max_results=5))
        formatted = []
        for i, r in enumerate(results):
            formatted.append(f"[{i+1}] {r['title']}\n{r['body']}\nURL: {r['href']}")
        return "\n\n".join(formatted)

    elif name == "read_url":
        import urllib.request
        try:
            with urllib.request.urlopen(inputs["url"]) as resp:
                # Read first 5000 chars of text
                return resp.read(10000).decode("utf-8", errors="ignore")[:5000]
        except Exception as e:
            return f"Error reading URL: {e}"

    return "Unknown tool"


def research(topic: str) -> str:
    """Run a research agent on a topic"""
    messages = [{
        "role": "user",
        "content": f"""Research this topic thoroughly: {topic}

Steps:
1. Search for recent, authoritative information
2. Read the most relevant sources
3. Synthesise findings into a clear summary with citations

Provide a comprehensive summary with [numbered] source references."""
    }]

    for _ in range(15):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
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
                    result = execute_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })
            messages.append({"role": "user", "content": tool_results})

    return "Research incomplete -- max iterations reached"


if __name__ == "__main__":
    report = research("Latest developments in AI agents and MCP protocol 2026")
    print("\n=== RESEARCH REPORT ===")
    print(report)
```

## Testing and Debugging

### Agent Testing Framework

```python
# test_agent.py
import unittest
from basic_agent import run_agent

class TestAgent(unittest.TestCase):

    def test_time_tool(self):
        """Test that time tool works"""
        result = run_agent("What time is it?")
        self.assertIn(":", result)

    def test_calculator_tool(self):
        """Test mathematical calculation"""
        result = run_agent("Calculate 25 * 4")
        self.assertIn("100", result)

    def test_multi_tool(self):
        """Test using multiple tools"""
        result = run_agent("What time is it, then calculate 10 + 5")
        self.assertIn("15", result)


if __name__ == "__main__":
    unittest.main()
```

### Debugging Tips

1. **Enable verbose logging**: Print every tool call and result
2. **Inspect the message history**: The full conversation state reveals where the agent went wrong
3. **Test tools independently**: Verify each tool function works before integrating
4. **Use `--verbose` with Claude Code**: See exactly what the agent is thinking and doing
5. **Check token usage**: Unexpected cost often means the agent is looping or using overly large contexts

```python
import logging
logging.basicConfig(level=logging.DEBUG)

def execute_tool_with_logging(tool_name, tool_input):
    print(f"\n[TOOL CALL] {tool_name}")
    print(f"[INPUT] {json.dumps(tool_input, indent=2)}")
    result = execute_tool(tool_name, tool_input)
    print(f"[OUTPUT] {result}\n")
    return result
```

## Navigation
- Previous: [Core Concepts](01_concepts.md)
- Next: [Exercises](03_exercises.md)
- [Back to Workshop Overview](README.md)
