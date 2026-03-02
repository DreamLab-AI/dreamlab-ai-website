# Assessment: AI Agents Knowledge Check

## Part 1: Conceptual Understanding (40 points)

### Question 1: Agent Architecture (10 points)

Explain the key components of an AI agent and how they work together. Include:
- The role of the LLM
- Tool management
- Memory systems
- Planning engine

**Model Answer**: An AI agent consists of a Large Language Model as the "brain" for reasoning and decision-making. The Tool Manager provides access to external capabilities (APIs, code execution, search). Memory systems maintain both short-term conversation context and long-term knowledge storage using vector databases. The Planning Engine breaks down complex goals into executable steps using strategies like task decomposition and hierarchical planning.

---

### Question 2: ReAct Pattern (10 points)

Describe the ReAct (Reasoning + Acting) pattern. Why is it effective for agent systems?

**Key Points**:
- Interleaving thought and action
- Observation-based iteration
- Self-correction capability
- Transparency in reasoning process

---

### Question 3: Tool Use vs. RAG (10 points)

Compare and contrast tool use in agents versus Retrieval-Augmented Generation (RAG). When would you use each?

**Comparison Table**:
| Aspect | Tool Use | RAG |
|--------|----------|-----|
| Purpose | Execute actions | Retrieve information |
| Dynamism | Real-time data | Static knowledge base |
| Use Case | APIs, calculations | Document Q&A |
| Complexity | Higher | Lower |

---

### Question 4: Memory Systems (10 points)

Explain the difference between:
1. Conversational memory
2. Working memory
3. Long-term memory

When would you use each type?

**Expected Coverage**:
- Conversational: Recent dialogue context
- Working: Current task state
- Long-term: Persistent knowledge across sessions

---

## Part 2: Code Analysis (30 points)

### Question 5: Identify Issues (15 points)

Review this agent code and identify 3 problems:

```python
def buggy_agent(user_query):
    tools = [calculator, search, file_reader]

    response = llm.invoke(user_query)

    if "calculate" in response:
        return calculator(user_query)

    return response
```

**Issues**:
1. No tool use API integration - directly calling LLM
2. Simple keyword matching instead of proper tool selection
3. No error handling
4. No iteration/observation loop
5. Tools not properly formatted for LLM

---

### Question 6: Complete the Code (15 points)

Complete this agent implementation:

```python
from anthropic import Anthropic

client = Anthropic()

tools = [
    {
        "name": "search_web",
        "description": "Search the internet",
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

**Expected Implementation**:
- Message loop with tool results
- Tool execution handling
- Stop condition check
- Error handling

---

## Part 3: Design Questions (30 points)

### Question 7: Agent Design (15 points)

Design an agent system for: **"Automated code review agent"**

Specify:
1. Required tools (minimum 3)
2. Memory requirements
3. Workflow/planning strategy
4. Success criteria

**Example Answer**:
```
Tools:
1. code_analyzer: Parse and analyze code structure
2. security_scanner: Check for vulnerabilities
3. style_checker: Verify code standards
4. test_coverage: Analyze test completeness

Memory:
- Project coding standards (long-term)
- Previous review feedback (episodic)
- Current file context (working)

Workflow:
1. Parse code structure
2. Run security scan
3. Check style compliance
4. Verify test coverage
5. Generate report with suggestions

Success:
- All files reviewed
- Issues categorized by severity
- Actionable recommendations provided
```

---

### Question 8: Error Handling Strategy (15 points)

Design an error handling and recovery strategy for an agent that:
- Searches web
- Executes Python code
- Reads files

What could go wrong and how would you handle it?

**Expected Coverage**:
- Network errors (retry logic)
- Code execution errors (sandboxing, timeouts)
- File access errors (permission checks, path validation)
- LLM errors (fallbacks, rate limiting)
- Invalid tool parameters (validation, helpful errors)

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
- Explains: "Starting with 3 apples, adding 5 gives 8, then removing 2 leaves 6"

Tools provided:
- calculator(expression: str) -> float
- extract_numbers(text: str) -> list[int]
"""

# Your implementation here
```

**Evaluation Criteria**:
- Correct tool usage (5 points)
- Proper ReAct loop (5 points)
- Clear explanations (5 points)
- Error handling (5 points)

---

## Answer Key

### Part 1: Conceptual (Grading Rubric)

**Q1-Q4**: Each worth 10 points
- Full understanding: 9-10 points
- Good understanding: 7-8 points
- Basic understanding: 5-6 points
- Incomplete: 0-4 points

### Part 2: Code (Grading Rubric)

**Q5**: (15 points)
- Identifies 4+ issues: 15 points
- Identifies 3 issues: 12 points
- Identifies 2 issues: 8 points
- Identifies 1 issue: 4 points

**Q6**: (15 points)
- Complete working implementation: 15 points
- Working with minor issues: 12 points
- Partial implementation: 8 points
- Incomplete: 0-6 points

### Part 3: Design (Grading Rubric)

**Q7 & Q8**: Each worth 15 points
- Comprehensive design: 14-15 points
- Good design with gaps: 11-13 points
- Basic design: 8-10 points
- Incomplete: 0-7 points

## Sample Solutions

### Question 6: Complete Solution

```python
def run_agent(user_message):
    messages = [{"role": "user", "content": user_message}]

    for _ in range(5):  # Max 5 iterations
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=tools,
            messages=messages
        )

        # Add assistant response to messages
        messages.append({
            "role": "assistant",
            "content": response.content
        })

        # Check stop reason
        if response.stop_reason == "end_turn":
            # Extract text response
            return next(
                (block.text for block in response.content if hasattr(block, "text")),
                "No response"
            )

        # Handle tool use
        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type == "tool_use":
                    # Execute tool
                    if block.name == "search_web":
                        result = search_web(block.input["query"])
                    else:
                        result = "Unknown tool"

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

    return "Max iterations reached"
```

### Question 9: Complete Solution

```python
from anthropic import Anthropic

client = Anthropic()

def calculator(expression: str) -> float:
    """Safely evaluate mathematical expression"""
    try:
        return eval(expression, {"__builtins__": {}}, {})
    except Exception as e:
        return f"Error: {e}"

def extract_numbers(text: str) -> list:
    """Extract numbers from text"""
    import re
    return [int(n) for n in re.findall(r'\d+', text)]

tools = [
    {
        "name": "calculator",
        "description": "Calculate mathematical expression",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {"type": "string"}
            },
            "required": ["expression"]
        }
    },
    {
        "name": "extract_numbers",
        "description": "Extract numbers from text",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"}
            },
            "required": ["text"]
        }
    }
]

def math_agent(word_problem: str) -> str:
    """Solve mathematical word problems"""
    messages = [
        {
            "role": "user",
            "content": f"""Solve this word problem step by step:
{word_problem}

1. Extract the numbers and operations
2. Create mathematical expression
3. Calculate the answer
4. Explain the solution clearly"""
        }
    ]

    for _ in range(10):
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
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
                    if block.name == "calculator":
                        result = str(calculator(block.input["expression"]))
                    elif block.name == "extract_numbers":
                        result = str(extract_numbers(block.input["text"]))
                    else:
                        result = "Unknown tool"

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })

            messages.append({
                "role": "user",
                "content": tool_results
            })

    return "Could not solve problem"

# Test
if __name__ == "__main__":
    problem = "If I have 3 apples and buy 5 more, then give away 2, how many do I have?"
    solution = math_agent(problem)
    print(solution)
```

## Passing Criteria

- **Part 1**: Minimum 28/40 points
- **Part 2**: Minimum 21/30 points
- **Part 3**: Minimum 21/30 points
- **Overall**: Minimum 70/100 points to pass

Bonus points can help achieve higher grades or compensate for weaker areas.

## Navigation
- Previous: [Final Project](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Module Overview](README.md)
