# Resources for AI Agents

## Official Documentation

### Anthropic Claude
- **Claude API Tool Use Guide**: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Agent SDK Documentation**: https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
- **Claude Code Documentation**: https://docs.anthropic.com/en/docs/claude-code
- **Python SDK**: https://github.com/anthropics/anthropic-sdk-python
- **TypeScript SDK**: https://github.com/anthropics/anthropic-sdk-node
- **Anthropic Cookbook**: https://github.com/anthropics/anthropic-cookbook

### Model Context Protocol (MCP)
- **MCP Specification**: https://modelcontextprotocol.io/
- **MCP Server Registry**: https://github.com/modelcontextprotocol/servers
- **Building MCP Servers**: https://modelcontextprotocol.io/docs/concepts/servers

### OpenAI
- **Codex CLI (open-source)**: https://github.com/openai/codex
- **Function Calling Guide**: https://platform.openai.com/docs/guides/function-calling
- **Agents Guide**: https://platform.openai.com/docs/guides/agents

### LangChain
- **Agents Documentation**: https://python.langchain.com/docs/how_to/#agents
- **LangGraph (workflow orchestration)**: https://github.com/langchain-ai/langgraph
- **LangSmith (observability)**: https://docs.smith.langchain.com/

## Agent Tools and Platforms

| Tool | Type | Best For | Link |
|------|------|----------|------|
| **Claude Code** | Terminal agent | Software development, refactoring, debugging | [docs](https://docs.anthropic.com/en/docs/claude-code) |
| **OpenAI Codex CLI** | Terminal agent | Open-source coding agent with OpenAI models | [github](https://github.com/openai/codex) |
| **Aider** | Terminal agent | Open-source pair programming, multi-model | [github](https://github.com/paul-gauthier/aider) |
| **Cursor** | IDE agent | VS Code fork with deep AI integration | [cursor.com](https://cursor.com) |
| **Windsurf** | IDE agent | Cascade multi-step agent in IDE | [windsurf.com](https://windsurf.com) |
| **Continue.dev** | IDE extension | Free, open-source, multi-model | [github](https://github.com/continuedev/continue) |
| **LangGraph** | Framework | Complex state-machine workflows | [github](https://github.com/langchain-ai/langgraph) |
| **CrewAI** | Framework | Role-based multi-agent teams | [github](https://github.com/crewAIInc/crewAI) |
| **AutoGen** | Framework | Multi-agent conversations | [github](https://github.com/microsoft/autogen) |

## Research Papers

### Foundational Papers

1. **ReAct: Synergizing Reasoning and Acting in Language Models** (2023)
   - Authors: Yao et al.
   - arXiv: https://arxiv.org/abs/2210.03629
   - Key contribution: Interleaving reasoning and action in agents

2. **Toolformer: Language Models Can Teach Themselves to Use Tools** (2023)
   - Authors: Schick et al.
   - arXiv: https://arxiv.org/abs/2302.04761
   - Key contribution: Self-supervised tool learning

3. **Generative Agents: Interactive Simulacra of Human Behavior** (2023)
   - Authors: Park et al.
   - arXiv: https://arxiv.org/abs/2304.03442
   - Key contribution: Agent memory architectures

### Recent Advances (2025-2026)

4. **Model Context Protocol** (2024-2025)
   - Specification: https://modelcontextprotocol.io/
   - Key contribution: Standardised tool integration protocol adopted across the industry

5. **Multi-Agent Coordination in Production Systems** (2025)
   - Focus: Patterns for orchestrating multiple AI agents in production

6. **Agent Safety and Alignment** (2025-2026)
   - Focus: Guardrails, cost control, and safe autonomous execution

## Code Examples and Tutorials

### Getting Started

1. **Anthropic Tool Use Cookbook**
   - https://github.com/anthropics/anthropic-cookbook/tree/main/tool_use
   - Official examples for building tool-using agents

2. **Claude Code Getting Started**
   - https://docs.anthropic.com/en/docs/claude-code/getting-started
   - Installation, configuration, and first workflows

3. **MCP Quickstart**
   - https://modelcontextprotocol.io/quickstart
   - Build your first MCP server in 15 minutes

### Intermediate

4. **Building Agents with the Anthropic SDK**
   - https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
   - Production patterns for custom agents

5. **Claude Code Hooks and Workflows**
   - https://docs.anthropic.com/en/docs/claude-code/hooks
   - Automate agent behaviour with lifecycle hooks

6. **LangGraph Tutorials**
   - https://github.com/langchain-ai/langgraph/tree/main/docs/docs/tutorials
   - Graph-based agent workflows

### Advanced

7. **Multi-Agent Systems with CrewAI**
   - https://github.com/crewAIInc/crewAI-examples
   - Complex multi-agent scenarios

8. **Claude Code Subagents**
   - https://docs.anthropic.com/en/docs/claude-code/sub-agents
   - Delegating tasks to focused child agents

## Development Setup

### Essential Packages (Python)

```bash
# Core
pip install anthropic

# For LangChain-based agents
pip install langchain langchain-anthropic langchain-community

# Vector stores for memory
pip install chromadb

# Search tools
pip install duckduckgo-search

# Utilities
pip install python-dotenv pydantic tenacity
```

### Essential Packages (Node/TypeScript)

```bash
# Core
npm install @anthropic-ai/sdk

# Claude Code (global)
npm install -g @anthropic-ai/claude-code

# MCP servers
npx @modelcontextprotocol/server-filesystem /path
npx @modelcontextprotocol/server-github
```

### Observability and Debugging

| Tool | Purpose | Link |
|------|---------|------|
| **LangSmith** | Agent tracing and debugging | https://docs.smith.langchain.com/ |
| **Helicone** | LLM observability and cost tracking | https://www.helicone.ai/ |
| **Braintrust** | Evaluation and monitoring | https://www.braintrust.dev/ |

### Code Execution Sandboxes

| Tool | Purpose | Link |
|------|---------|------|
| **E2B** | Cloud sandboxes for agent code execution | https://e2b.dev/ |
| **Modal** | Serverless code execution | https://modal.com/ |

## Community

### Official Channels
- **Anthropic Discord**: https://discord.gg/anthropic
- **OpenAI Developer Forum**: https://community.openai.com/
- **LangChain Discord**: https://discord.gg/langchain

### Newsletters and Blogs
- **Anthropic Research Blog**: https://www.anthropic.com/research
- **LangChain Blog**: https://blog.langchain.dev/
- **The Batch** (Andrew Ng): https://www.deeplearning.ai/the-batch/

## Safety and Best Practices

### Safety Guidelines

1. **Input validation**: Always validate tool parameters before execution
2. **Sandboxing**: Execute untrusted code in isolated environments (E2B, Docker)
3. **Rate limiting**: Cap iterations and token usage to prevent runaway agents
4. **Human-in-the-loop**: Require approval for destructive or irreversible actions
5. **Audit logging**: Log every tool call with timestamps, inputs, and outputs
6. **Timeout controls**: Set maximum execution time per agent task
7. **Cost caps**: Monitor and limit API spending per task and per day

### Model Selection Guide

| Task Type | Recommended Model | Reasoning |
|-----------|------------------|-----------|
| Complex analysis | Opus 4.8 | Highest reasoning quality |
| General agent work | Sonnet 4.6 | Best balance of quality, speed, cost |
| Simple tool routing | Haiku 4.5 | Fastest and cheapest |
| Subagent subtasks | Haiku 4.5 or Sonnet 4.6 | Cost-effective at scale |

Check the [Anthropic pricing page](https://www.anthropic.com/pricing) for current rates.

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)
