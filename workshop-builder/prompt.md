# Workshop Builder: Architecture & Design

This document defines the architecture for a Python CLI–based, multi-agent workshop generator. It lives under `workshop-builder/`.

## 1. Project Structure

```
workshop-builder/
├── .env
├── cli.py
├── orchestrator/
│   ├── __init__.py
│   ├── orchestrator.py
│   └── config.py
├── agents/
│   ├── __init__.py
│   ├── research_agent.py
│   ├── compiler_agent.py  # Renamed from docgen_agent/workshop_agent
│   └── git_agent.py
├── templates/
│   ├── workshop_manifest.json.j2
│   └── README.md.j2
└── tests/
    ├── test_research_agent.py
    ├── test_compiler_agent.py
    └── test_git_agent.py
```

## 2. CLI Entry Point

File: [`cli.py`](workshop-builder/cli.py:1)

- Uses `argparse` or `click` to parse:
  - `--topic` (required)
  - `--verbose` (optional)
- Loads environment via [`orchestrator/config.py`](workshop-builder/orchestrator/config.py:1)
- Calls `Orchestrator.run(topic: str)`

## 3. Orchestrator

File: [`orchestrator/orchestrator.py`](workshop-builder/orchestrator/orchestrator.py:1)

Class: `Orchestrator`

Responsibilities:
- Sequence of steps:
  1. `ResearchAgent.fetch_unstructured_data(topic: str) -> List[PathToDataFile]`
  2. `CompilerAgent.compile_workshop(topic: str, data_files: List[PathToDataFile]) -> ModulePath`
  3. `GitAgent.publish_workshop(module_path: str, topic: str, workshop_number: str) -> PullRequestURL`
- Error handling with retries (`backoff` decorator)
- Logging at levels INFO/DEBUG/ERROR

Config: [`orchestrator/config.py`](workshop-builder/orchestrator/config.py:1)
- Loads `.env` via `python-dotenv`
- Sets API keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`
- Defines timeouts and retry policies

## 4. Agents

### 4.1 ResearchAgent

File: [`agents/research_agent.py`](workshop-builder/agents/research_agent.py:1)

Class: `ResearchAgent`

- Method: `fetch_unstructured_data(topic: str) -> List[PathToDataFile]`
- Calls Gemini 2.5 Flash endpoint.
- Gathers raw information, articles, notes related to the topic.
- Saves this data into temporary files.
- Returns a list of paths to these temporary data files.

### 4.2 CompilerAgent

File: [`agents/compiler_agent.py`](workshop-builder/agents/compiler_agent.py:1) (Replaces DocGenAgent & WorkshopAgent)

Class: `CompilerAgent`

- Method: `compile_workshop(topic: str, unstructured_data_paths: List[str]) -> str`
- Determines the next workshop number (e.g., by scanning `public/data/workshops/`).
- Creates the workshop module directory (e.g., `public/data/workshops/workshop-XX-{slug}/`).
- **Core Task**: Invokes the OpenAI Chat Completions API using structured messages and the prompt defined in `workshop-builder/workshop_compiler_agent_prompt.md`.
    - The OpenAI API is responsible for analyzing the `unstructured_data_paths` and generating a JSON object containing the content for all workshop files (`manifest.json`, `README.md`, `00_introduction.md`, etc.).
- **File Creation**: After the OpenAI API generates the JSON content, the `CompilerAgent` parses this JSON and writes the individual files directly into the new module directory.
- **Templating**: The `CompilerAgent` can still use Jinja2 templates for certain files if needed, but the primary content generation is now JSON-based from the API.
    - Renders `manifest.json` using `templates/workshop_manifest.json.j2`.
    - Renders `README.md` for the module using `templates/README.md.j2`.
    - It collects necessary context for templates (workshop number, topic, list of generated .md files).
- Returns the absolute path to the newly created and populated workshop module directory.

### 4.3 GitAgent

File: [`agents/git_agent.py`](workshop-builder/agents/git_agent.py:1)

Class: `GitAgent`

- Method: `publish_workshop(module_path: str, topic: str, workshop_number: str) -> str`
- Branch name: `workshop-{workshop_number}-{topic_slug}`
- Uses `PyGithub` or direct REST to:
  - Create branch off `main`
  - Commit all new files
  - Push branch
  - Open pull request titled `[Workshop] Add #{XX} {Topic}`
  - Returns PR URL

## 5. Templates

Directory: `templates/`

- `workshop_manifest.json.j2`  
  JSON schema for `manifest.json`:  
  ```json
  {
    "id": "workshop-{{ workshop_number }}-{{ topic_slug }}",
    "title": "Workshop: {{ topic_title }}",
    "description": "A workshop on {{ topic_title }}.",
    "files": [
      {% for file_info in files %}"{{ file_info.name }}"{% if not loop.last %},{% endif %}{% endfor %}
    ]
  }
  ```
- `README.md.j2`  
  ```markdown
  # Workshop {{ workshop_number }}: {{ topic_title }}

  Welcome to the workshop on **{{ topic_title }}**!

  This workshop will guide you through the fundamental concepts and practical applications of {{ topic_title }}. By the end of this module, you will have a better understanding of [mention key learning outcomes, e.g., "how to implement X", "the core principles of Y", "best practices for Z"].

  ## Workshop Structure

  This workshop is divided into the following sections:

  {% for file_info in files %}
  - **[{{ file_info.title | default(file_info.name | replace(".md", "") | replace("_", " ") | title) }}](./{{ file_info.name }})**: {{ file_info.description | default("Covers " + (file_info.title | default(file_info.name | replace(".md", "") | replace("_", " ") | title)) + ".") }}
  {%- endfor %}

  ## Prerequisites

  (To be filled in by the CompilerAgent based on content, or a generic placeholder)
  - Basic understanding of [relevant prerequisite technology/concept].
  - Access to a computer with [necessary software, e.g., Python 3.x, a text editor].

  ## Getting Started

  To begin, please navigate to the first section:
  - [{{ files[0].title | default(files[0].name | replace(".md", "") | replace("_", " ") | title) }}](./{{ files[0].name }})

  We hope you find this workshop informative and engaging!
  ```

## 6. Workflow Summary

1. **CLI** parses args & loads config  
2. **Orchestrator** sequences agents
3. **ResearchAgent** → paths to unstructured data files
4. **CompilerAgent** → uses OpenAI Chat Completions API (via `workshop_compiler_agent_prompt.md` and structured messages) to generate JSON content, then parses JSON and writes files → path to complete workshop module
5. **GitAgent** → branch, commit, PR

## 7. Error Handling & Logging

- All agent methods raise `AgentError` on failure  
- Wrapped in retries with exponential backoff  
- `orchestrator` logs context and aborts gracefully on unrecoverable errors  

## 8. Security & Best Practices

- **.env** file (never committed) for secrets  
- OpenAI API integration
- Limit GitHub token scope (`repo`, `pull_request`)  
- Validate all external input (topic slug sanitation)  

## 9. Extensibility

- Agents implement ABC interfaces (`BaseAgent`) for easy replacement  
- Templates support multiple workshop styles by selecting template set via CLI flag  
- Future: add `ReviewAgent` for automated PR reviews