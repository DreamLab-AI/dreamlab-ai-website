# Hands-on Agent Development

## Setup

First, install required packages:

```bash
pip install anthropic openai langchain langchain-anthropic langchain-openai \
    langchain-community chromadb duckduckgo-search python-dotenv
```

Create `.env` file:
```bash
ANTHROPIC_API_KEY=your_claude_key_here
OPENAI_API_KEY=your_openai_key_here
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
            # Safe eval for mathematical expressions
            result = eval(tool_input["expression"], {"__builtins__": {}}, {})
            return str(result)
        except Exception as e:
            return f"Error: {str(e)}"

    elif tool_name == "web_search":
        # Simple mock search (replace with real search API)
        query = tool_input["query"]
        return f"Search results for '{query}': [Mock results - integrate DuckDuckGo API]"

    return "Unknown tool"
```

### Step 3: Agent Loop Implementation

```python
def run_agent(user_message, max_iterations=10):
    """
    Run the agent loop with tool use
    """
    messages = [{"role": "user", "content": user_message}]

    print(f"User: {user_message}\n")

    for iteration in range(max_iterations):
        # Call Claude with tools
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        print(f"--- Iteration {iteration + 1} ---")

        # Process response
        assistant_message = {
            "role": "assistant",
            "content": response.content
        }
        messages.append(assistant_message)

        # Check if we need to use tools
        if response.stop_reason == "tool_use":
            # Find tool use blocks
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input

                    print(f"Tool: {tool_name}")
                    print(f"Input: {tool_input}")

                    # Execute tool
                    result = execute_tool(tool_name, tool_input)

                    print(f"Result: {result}\n")

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            # Add tool results to messages
            messages.append({
                "role": "user",
                "content": tool_results
            })

        elif response.stop_reason == "end_turn":
            # Agent is done
            final_response = next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response"
            )
            print(f"Assistant: {final_response}")
            return final_response

    return "Max iterations reached"


# Example usage
if __name__ == "__main__":
    # Test the agent
    result = run_agent("What time is it? Then calculate 15 * 23")
    print("\n" + "="*50 + "\n")

    result = run_agent("Search for the latest AI news and summarize")
```

## Project 2: LangChain ReAct Agent

### Complete Implementation

```python
# langchain_agent.py
from langchain.agents import create_react_agent, AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain.tools import Tool
from langchain import hub
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
import math

# Initialize LLM
llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

# Create tools
def calculator_func(expression: str) -> str:
    """Evaluate mathematical expression"""
    try:
        # Safe math operations
        allowed_names = {k: v for k, v in math.__dict__.items() if not k.startswith("__")}
        return str(eval(expression, {"__builtins__": {}}, allowed_names))
    except Exception as e:
        return f"Error: {str(e)}"


def python_repl(code: str) -> str:
    """Execute Python code"""
    try:
        exec_globals = {}
        exec(code, {"__builtins__": __builtins__}, exec_globals)
        return str(exec_globals.get("result", "Code executed"))
    except Exception as e:
        return f"Error: {str(e)}"


# Initialize search
search = DuckDuckGoSearchAPIWrapper()

tools = [
    Tool(
        name="Search",
        func=search.run,
        description="Search the internet for current information. Use this when you need to answer questions about current events or find specific information online."
    ),
    Tool(
        name="Calculator",
        func=calculator_func,
        description="Perform mathematical calculations. Input should be a valid mathematical expression."
    ),
    Tool(
        name="PythonREPL",
        func=python_repl,
        description="Execute Python code. Store results in a variable called 'result'. Useful for data analysis and computations."
    )
]

# Get ReAct prompt template
prompt = hub.pull("hwchase17/react")

# Create agent
agent = create_react_agent(llm, tools, prompt)

# Create agent executor
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    max_iterations=10,
    handle_parsing_errors=True
)

# Test the agent
if __name__ == "__main__":
    print("=== Test 1: Math ===")
    result = agent_executor.invoke({
        "input": "What is 15% of 1234? Then multiply that by 3.14"
    })
    print(f"\nResult: {result['output']}\n")

    print("\n=== Test 2: Research ===")
    result = agent_executor.invoke({
        "input": "Search for the latest breakthrough in quantum computing and summarize it"
    })
    print(f"\nResult: {result['output']}\n")

    print("\n=== Test 3: Code Generation ===")
    result = agent_executor.invoke({
        "input": "Write Python code to calculate the Fibonacci sequence up to n=10 and store in 'result'"
    })
    print(f"\nResult: {result['output']}\n")
```

## Project 3: Agent with Memory

### Vector Memory Implementation

```python
# agent_with_memory.py
from langchain.agents import create_react_agent, AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain.tools import Tool
from langchain.memory import ConversationBufferMemory
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.prompts import PromptTemplate

class AgentWithMemory:
    def __init__(self):
        self.llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

        # Conversation memory
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        # Long-term memory (vector store)
        self.long_term_memory = Chroma(
            collection_name="agent_memory",
            embedding_function=OpenAIEmbeddings(),
            persist_directory="./agent_memory_db"
        )

        # Tools
        self.tools = self._create_tools()

        # Custom prompt with memory
        self.prompt = self._create_prompt()

        # Create agent
        self.agent = create_react_agent(self.llm, self.tools, self.prompt)
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            verbose=True,
            memory=self.memory,
            max_iterations=10
        )

    def _create_tools(self):
        def remember_fact(fact: str) -> str:
            """Store a fact in long-term memory"""
            self.long_term_memory.add_texts([fact])
            return f"Remembered: {fact}"

        def recall_memory(query: str) -> str:
            """Retrieve relevant memories"""
            docs = self.long_term_memory.similarity_search(query, k=3)
            if docs:
                return "\n".join([doc.page_content for doc in docs])
            return "No relevant memories found"

        return [
            Tool(
                name="RememberFact",
                func=remember_fact,
                description="Store important information in long-term memory"
            ),
            Tool(
                name="RecallMemory",
                func=recall_memory,
                description="Search long-term memory for relevant information"
            )
        ]

    def _create_prompt(self):
        template = """You are an AI assistant with memory capabilities.

You have access to:
1. Short-term conversation history
2. Long-term memory storage and retrieval

When users tell you important information, use RememberFact to store it.
When you need to recall past information, use RecallMemory.

Available tools:
{tools}

Tool names: {tool_names}

Use the following format:
Question: the input question
Thought: think about what to do
Action: the action to take (tool name)
Action Input: the input to the action
Observation: the result of the action
... (repeat Thought/Action/Observation as needed)
Thought: I now know the final answer
Final Answer: the final answer

Previous conversation:
{chat_history}

Question: {input}
{agent_scratchpad}"""

        return PromptTemplate(
            template=template,
            input_variables=["input", "tools", "tool_names", "chat_history", "agent_scratchpad"]
        )

    def chat(self, message):
        """Send a message to the agent"""
        return self.agent_executor.invoke({"input": message})


# Example usage
if __name__ == "__main__":
    agent = AgentWithMemory()

    # Conversation with memory
    print("=== Storing Information ===")
    agent.chat("My favorite color is blue and I work as a software engineer")

    print("\n=== New Conversation ===")
    agent.chat("What programming languages should I learn?")

    print("\n=== Recall Past Information ===")
    agent.chat("What's my favorite color?")

    print("\n=== Continue Conversation ===")
    agent.chat("Tell me more about software engineering careers")
```

## Project 4: Specialized Research Agent

### Web Research Agent with Citations

```python
# research_agent.py
from langchain.agents import create_react_agent, AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain.tools import Tool
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain_community.document_loaders import WebBaseLoader
from typing import List
import json

class ResearchAgent:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0
        )
        self.search = DuckDuckGoSearchAPIWrapper()
        self.sources = []
        self.tools = self._create_tools()

    def _create_tools(self):
        def web_search(query: str) -> str:
            """Search and return results with sources"""
            results = self.search.results(query, max_results=5)
            formatted = []

            for i, result in enumerate(results):
                source = {
                    "title": result.get("title", ""),
                    "url": result.get("link", ""),
                    "snippet": result.get("snippet", "")
                }
                self.sources.append(source)
                formatted.append(
                    f"[{i+1}] {result['title']}\n{result['snippet']}\nURL: {result['link']}"
                )

            return "\n\n".join(formatted)

        def read_webpage(url: str) -> str:
            """Read and extract text from a webpage"""
            try:
                loader = WebBaseLoader(url)
                docs = loader.load()
                content = docs[0].page_content[:5000]  # First 5000 chars
                return content
            except Exception as e:
                return f"Error loading page: {str(e)}"

        def synthesize_research(topic: str) -> str:
            """Create a research summary with citations"""
            return f"Synthesizing research on: {topic}\nUse gathered information to create summary."

        return [
            Tool(
                name="WebSearch",
                func=web_search,
                description="Search the web for information. Returns titles, snippets, and URLs."
            ),
            Tool(
                name="ReadWebpage",
                func=read_webpage,
                description="Read full content from a specific webpage URL"
            ),
            Tool(
                name="SynthesizeResearch",
                func=synthesize_research,
                description="Signal to create final research summary with citations"
            )
        ]

    def research(self, topic: str) -> dict:
        """
        Conduct research on a topic
        """
        self.sources = []  # Reset sources

        prompt = f"""Conduct thorough research on: {topic}

        Steps:
        1. Search for recent information
        2. Read relevant webpages
        3. Synthesize findings with citations

        Provide a comprehensive summary with source references."""

        from langchain import hub
        react_prompt = hub.pull("hwchase17/react")

        agent = create_react_agent(self.llm, self.tools, react_prompt)
        executor = AgentExecutor(agent=agent, tools=self.tools, verbose=True)

        result = executor.invoke({"input": prompt})

        return {
            "summary": result["output"],
            "sources": self.sources
        }


# Example usage
if __name__ == "__main__":
    agent = ResearchAgent()

    # Research a topic
    result = agent.research("Latest developments in AI agents 2024")

    print("\n=== RESEARCH SUMMARY ===")
    print(result["summary"])

    print("\n=== SOURCES ===")
    for i, source in enumerate(result["sources"]):
        print(f"\n[{i+1}] {source['title']}")
        print(f"    {source['url']}")
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
        self.assertIn(":", result)  # Should contain time format

    def test_calculator_tool(self):
        """Test mathematical calculation"""
        result = run_agent("Calculate 25 * 4")
        self.assertIn("100", result)

    def test_multi_tool(self):
        """Test using multiple tools"""
        result = run_agent("What time is it, then calculate 10 + 5")
        self.assertIn("15", result)

    def test_error_handling(self):
        """Test error handling"""
        result = run_agent("Calculate invalid expression: abc + xyz")
        self.assertIn("Error", result)


if __name__ == "__main__":
    unittest.main()
```

### Debugging Tips

```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Log tool calls
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
- [Back to Module Overview](README.md)
