# Practical Exercises

## Exercise 1: Build a Weather Agent

Create an agent that provides weather information and recommendations.

### Requirements
- Tool to get current weather
- Tool to get forecast
- Tool to suggest activities based on weather
- Memory to remember user's location preferences

### Starter Code

```python
from langchain.agents import create_react_agent, AgentExecutor
from langchain_anthropic import ChatAnthropic
from langchain.tools import Tool
import requests

# TODO: Implement these functions
def get_current_weather(location: str) -> str:
    """Get current weather for a location"""
    # Use OpenWeather API or similar
    pass

def get_forecast(location: str, days: int = 3) -> str:
    """Get weather forecast"""
    pass

def suggest_activities(weather_condition: str) -> str:
    """Suggest activities based on weather"""
    pass

# Create tools
tools = [
    Tool(name="GetWeather", func=get_current_weather, description="..."),
    Tool(name="GetForecast", func=get_forecast, description="..."),
    Tool(name="SuggestActivities", func=suggest_activities, description="...")
]

# TODO: Create and test agent
```

### Expected Behavior
```
User: "What's the weather in London?"
Agent: Uses GetWeather → Provides current conditions

User: "Should I go hiking tomorrow?"
Agent: Uses GetForecast → Uses SuggestActivities → Recommends based on forecast
```

---

## Exercise 2: Code Review Agent

Build an agent that reviews Python code for quality and security issues.

### Requirements
- Tool to analyze code complexity
- Tool to check for security vulnerabilities
- Tool to suggest improvements
- Return structured feedback

### Starter Code

```python
def analyze_complexity(code: str) -> dict:
    """Analyze code complexity metrics"""
    # Calculate cyclomatic complexity, lines of code, etc.
    return {
        "lines_of_code": 0,
        "complexity_score": 0,
        "functions": 0
    }

def check_security(code: str) -> list:
    """Check for common security issues"""
    issues = []
    # Check for: eval(), exec(), SQL injection patterns, etc.
    if "eval(" in code:
        issues.append("Dangerous use of eval()")
    # Add more checks
    return issues

def suggest_improvements(code: str, issues: list) -> str:
    """Generate improvement suggestions"""
    # Use LLM to suggest refactorings
    pass

# TODO: Combine into agent
```

### Test Cases
```python
test_code = """
def process_user_input(user_data):
    query = f"SELECT * FROM users WHERE name = '{user_data}'"
    eval(user_data)  # Dangerous!
    return query
"""

# Agent should identify: SQL injection, eval() usage, no input validation
```

---

## Exercise 3: Multi-Tool Research Assistant

Create an agent that researches topics using multiple data sources.

### Requirements
- Wikipedia search
- ArXiv paper search
- News search
- Synthesize findings from all sources
- Provide citations

### Implementation Challenge

```python
from langchain.tools import Tool
from langchain_community.utilities import WikipediaAPIWrapper

# Tool 1: Wikipedia
wikipedia = WikipediaAPIWrapper()

# Tool 2: ArXiv (implement this)
def search_arxiv(query: str) -> str:
    """Search arXiv for academic papers"""
    # Use arxiv API
    pass

# Tool 3: News Search (implement this)
def search_news(query: str, days: int = 7) -> str:
    """Search recent news articles"""
    # Use NewsAPI or similar
    pass

# Tool 4: Synthesizer
def synthesize_sources(topic: str, sources: list) -> str:
    """Create comprehensive summary with citations"""
    pass

# TODO: Create agent that:
# 1. Searches all sources in parallel
# 2. Synthesizes findings
# 3. Provides properly formatted citations
```

### Example Output Format
```markdown
# Research Summary: Quantum Computing

## Overview
[2-3 paragraph summary synthesizing all sources]

## Key Findings
1. Finding one [Wikipedia]
2. Finding two [ArXiv: Title, 2024]
3. Finding three [News Source, Date]

## Sources
- Wikipedia: Quantum Computing
- ArXiv: "Advances in Quantum Error Correction" (2024)
- TechNews: "IBM Announces 1000-Qubit Processor" (Jan 2024)
```

---

## Exercise 4: Task Decomposition Agent

Build an agent that breaks down complex tasks into step-by-step plans.

### Requirements
- Analyze complex task
- Decompose into subtasks
- Estimate time for each subtask
- Create dependency graph
- Generate executable plan

### Starter Code

```python
class TaskPlanner:
    def __init__(self):
        self.llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

    def decompose_task(self, task: str) -> dict:
        """Break task into subtasks"""
        prompt = f"""Analyze this task and break it down:
        Task: {task}

        Return JSON with:
        - subtasks: list of subtasks
        - dependencies: which tasks depend on others
        - estimated_time: time estimate for each
        """
        # TODO: Implement
        pass

    def create_timeline(self, subtasks: list) -> str:
        """Create visual timeline"""
        # TODO: Generate Gantt-style timeline
        pass

# Test with complex task
task = "Build and deploy a web application with user authentication"
```

### Expected Output
```json
{
  "subtasks": [
    {"id": 1, "name": "Design database schema", "time": "2 hours", "deps": []},
    {"id": 2, "name": "Implement authentication", "time": "4 hours", "deps": [1]},
    {"id": 3, "name": "Build API endpoints", "time": "6 hours", "deps": [1, 2]},
    {"id": 4, "name": "Create frontend", "time": "8 hours", "deps": [3]},
    {"id": 5, "name": "Testing", "time": "4 hours", "deps": [4]},
    {"id": 6, "name": "Deployment", "time": "2 hours", "deps": [5]}
  ],
  "total_time": "26 hours",
  "critical_path": [1, 2, 3, 4, 5, 6]
}
```

---

## Exercise 5: Data Analysis Agent

Create an agent that analyzes CSV data and generates insights.

### Requirements
- Load and validate CSV
- Perform statistical analysis
- Create visualizations
- Generate natural language insights
- Answer questions about data

### Starter Code

```python
import pandas as pd
import matplotlib.pyplot as plt
from langchain.tools import Tool

def load_dataset(file_path: str) -> str:
    """Load and describe dataset"""
    df = pd.read_csv(file_path)
    return f"""Dataset loaded:
    Rows: {len(df)}
    Columns: {list(df.columns)}
    Data types: {df.dtypes.to_dict()}
    """

def analyze_column(dataset: str, column: str) -> str:
    """Analyze a specific column"""
    df = pd.read_csv(dataset)
    col = df[column]

    stats = {
        "mean": col.mean() if col.dtype in ['int64', 'float64'] else None,
        "median": col.median() if col.dtype in ['int64', 'float64'] else None,
        "mode": col.mode()[0],
        "null_count": col.isnull().sum(),
        "unique_values": col.nunique()
    }
    return str(stats)

def create_visualization(dataset: str, viz_type: str, columns: list) -> str:
    """Create visualization"""
    # TODO: Generate chart and save
    # Return path to saved image
    pass

def generate_insights(dataset: str) -> str:
    """Generate AI insights about dataset"""
    # TODO: Use LLM to analyze patterns
    pass

# Create tools and agent
```

### Test Dataset
```csv
date,sales,region,product
2024-01-01,1250,North,Widget A
2024-01-01,800,South,Widget B
2024-01-02,1100,North,Widget A
...
```

### Example Interaction
```
User: "Analyze sales_data.csv and show trends"
Agent:
1. LoadDataset → "Dataset has 365 rows, 4 columns"
2. AnalyzeColumn(sales) → "Mean: $1,200, Trend: +15% YoY"
3. CreateVisualization(line, [date, sales]) → "chart_sales.png"
4. GenerateInsights → "Sales show strong Q4 growth, North region outperforms"
```

---

## Exercise 6: Smart File Organizer

Build an agent that organizes files based on content and context.

### Requirements
- Scan directory
- Analyze file contents
- Suggest organization structure
- Move files to appropriate folders
- Create README for each folder

### Implementation

```python
import os
from pathlib import Path

def scan_directory(path: str) -> list:
    """Scan directory and list files"""
    files = []
    for file in Path(path).rglob("*"):
        if file.is_file():
            files.append({
                "path": str(file),
                "name": file.name,
                "extension": file.suffix,
                "size": file.stat().st_size
            })
    return files

def analyze_file_content(file_path: str) -> str:
    """Analyze what file contains"""
    # For text files, read and analyze
    # For code files, detect language and purpose
    # For images, use vision API
    pass

def suggest_organization(files: list) -> dict:
    """Suggest folder structure"""
    # Use LLM to suggest logical groupings
    # Return: {folder_name: [files]}
    pass

def create_folder_readme(folder: str, files: list) -> str:
    """Generate README for folder"""
    # Describe what's in the folder and why
    pass

# TODO: Combine into agent
```

### Example Output
```
Analyzing 47 files in ~/Downloads...

Suggested organization:
📁 Projects/
  📁 Python_Scripts/
    - data_processor.py
    - api_client.py
  📁 Documentation/
    - setup_guide.pdf
    - api_docs.md
📁 Media/
  📁 Screenshots/
    - screenshot_1.png
    - screenshot_2.png
📁 Archives/
  - old_backup.zip

Create this structure? [y/n]
```

---

## Exercise 7: Meeting Minutes Agent

Create an agent that processes meeting transcripts and generates structured minutes.

### Requirements
- Extract key points
- Identify action items
- Assign owners and deadlines
- Create summary
- Generate follow-up emails

### Starter Code

```python
def extract_action_items(transcript: str) -> list:
    """Find action items in meeting transcript"""
    # Look for: "John will...", "TODO:", "Action:", etc.
    pass

def identify_participants(transcript: str) -> list:
    """Identify meeting participants"""
    pass

def create_summary(transcript: str) -> dict:
    """Create structured meeting summary"""
    return {
        "date": "",
        "participants": [],
        "duration": "",
        "key_points": [],
        "decisions": [],
        "action_items": [],
        "next_meeting": ""
    }

def generate_followup_email(summary: dict) -> str:
    """Generate follow-up email"""
    pass

# TODO: Create agent
```

### Example Input
```
Meeting Transcript (Jan 15, 2024):

John: Let's discuss the Q1 roadmap. We need to prioritize the new API.
Sarah: Agreed. I'll work on the specification this week.
Mike: I can handle the backend implementation. Targeting end of February.
John: Great. Sarah, can you also review the security requirements?
Sarah: Yes, I'll have that done by Friday.
...
```

### Example Output
```markdown
# Meeting Minutes: Q1 Planning
Date: January 15, 2024
Participants: John (Lead), Sarah (Product), Mike (Engineering)

## Key Points
- New API is top priority for Q1
- Security review needed before implementation

## Decisions
- Target launch: End of February 2024
- Sarah owns specification
- Mike owns backend implementation

## Action Items
- [ ] Sarah: Complete API specification (Due: Jan 20)
- [ ] Sarah: Review security requirements (Due: Jan 19)
- [ ] Mike: Backend implementation (Due: Feb 28)

## Next Meeting
TBD - After specification complete
```

---

## Bonus Challenge: Multi-Agent System Preview

Build a simple multi-agent system where different agents collaborate.

### Scenario: Content Creation Pipeline

```python
# Agent 1: Researcher
researcher = create_agent(
    name="Researcher",
    tools=[web_search, read_article],
    task="Research topic and gather information"
)

# Agent 2: Writer
writer = create_agent(
    name="Writer",
    tools=[generate_content, format_markdown],
    task="Write article based on research"
)

# Agent 3: Editor
editor = create_agent(
    name="Editor",
    tools=[check_grammar, improve_style],
    task="Edit and polish content"
)

# Coordinator
def content_pipeline(topic: str):
    # 1. Research
    research = researcher.run(f"Research: {topic}")

    # 2. Write
    draft = writer.run(f"Write article about: {topic}\nResearch: {research}")

    # 3. Edit
    final = editor.run(f"Edit this article:\n{draft}")

    return final

# Test
article = content_pipeline("The Future of AI Agents")
```

This preview introduces concepts we'll explore deeply in the afternoon session!

---

## Submission Guidelines

For each exercise:
1. Complete implementation
2. Add error handling
3. Write test cases
4. Document your code
5. Create example usage

## Navigation
- Previous: [Hands-on Development](02_hands_on.md)
- Next: [Final Project](04_project.md)
- [Back to Module Overview](README.md)
