# Workshop 04 - Morning Session: Specialised AI Agents

## Build Your AI Workforce

Welcome to the most hands-on session of the programme. Over the next 3 hours, you will move beyond chatting with AI and start **deploying specialised agents** that reason, use tools, and complete complex tasks autonomously. By the end of the morning you will have built working agents for research, code review, content creation, and task planning -- and you will understand the production-grade patterns behind them.

## What You Will Build

- **Tool-Using Agent** -- a Claude API agent that calls external tools via structured function calling
- **Claude Code Workflow** -- a multi-step coding agent configured with CLAUDE.md and MCP servers
- **Research Agent** -- an autonomous web-research pipeline with source tracking and citations
- **Multi-Agent Pipeline** -- coordinated specialist agents (researcher, writer, editor) collaborating on a single deliverable

Each project is progressive: later exercises build on patterns introduced in earlier ones, so work through them in order.

## Chapter Navigation

1. **[Introduction](00_introduction.md)** -- Agent Landscape and Architectures (15 min)
   - What makes 2025-2026 agents different from chatbots
   - The ReAct pattern: reasoning plus acting
   - Real-world agent applications across domains

2. **[Core Concepts](01_concepts.md)** -- Tools, MCP, Agent Patterns, and Frameworks (45 min)
   - Claude Code as a production coding agent
   - Anthropic Agent SDK for custom agents
   - MCP (Model Context Protocol) -- the standard for tool integration
   - Agent architectures: ReAct, Plan-and-Execute, Subagent Delegation, Reflection
   - Memory systems and cost control

3. **[Hands-On Practice](02_hands_on.md)** -- Build Your First Agents (60 min)
   - Project 1: Basic Claude API agent with tool use
   - Project 2: Claude Code as an agent (CLAUDE.md, MCP servers, subagents)
   - Project 3: Agent with memory (store and recall facts)
   - Project 4: Research agent with web search and citations

4. **[Exercises](03_exercises.md)** -- Progressive Skill-Building Challenges (30 min)
   - Weather agent with chained tool calls
   - Code review agent (complexity and security analysis)
   - Claude Code workflow with CLAUDE.md configuration
   - MCP server integration and filesystem tools
   - Task decomposition agent
   - Multi-agent content pipeline (preview)

5. **[Project Work](04_project.md)** -- Production Research Agent (30 min)
   - Full implementation: search, source evaluation, synthesis, citations
   - Test suite and evaluation criteria
   - Stretch goals: model routing, parallel search, fact-checking

6. **[Assessment](05_assessment.md)** -- Knowledge Validation (15 min)
   - Conceptual questions on architectures and MCP
   - Code analysis and bug-spotting
   - Agent design and safety scenarios
   - Practical mini-agent implementation (bonus)

7. **[Additional Resources](06_resources.md)** -- Tools, Libraries, and References
   - Official documentation links (Anthropic, MCP, LangChain)
   - Research papers (ReAct, Toolformer, Generative Agents)
   - Development setup for Python and TypeScript
   - Community channels and newsletters

## Learning Objectives

See [objectives.md](objectives.md) for detailed learning outcomes, skill progression, and success criteria.

## Prerequisites

Review [prerequisites.md](prerequisites.md) before starting this session to ensure your environment is ready.

## Key Technologies (2026)

| Technology | Role in This Workshop |
|-----------|----------------------|
| **Claude API** | Tool use with Sonnet 4.6 and Opus 4.8 models |
| **Claude Code** | Terminal coding agent with subagents, hooks, and CLAUDE.md |
| **MCP (Model Context Protocol)** | Standardised tool integration -- filesystem, GitHub, search, databases |
| **Anthropic Agent SDK** | Python and TypeScript SDK for building custom agents |
| **OpenAI Codex CLI** | Open-source terminal agent (comparison tool) |
| **Aider** | Open-source multi-model pair programming |
| **Cursor / Windsurf** | IDE-integrated AI agents |
| **LangChain / LangGraph** | Framework-agnostic orchestration and graph workflows |
| **CrewAI** | Role-based multi-agent teams |

## Who This Session Is For

### Ideal Participants
- Professionals who have completed Days 1-3 of the programme (or equivalent experience)
- Anyone building AI-enhanced workflows for research, analysis, content, or operations
- Team leads evaluating agent tools for their organisations
- Consultants and freelancers who want to automate specialist tasks

### You Will Succeed If You
- Have basic Python or TypeScript familiarity (variables, functions, running scripts)
- Understand what an API call is
- Have used a Large Language Model (ChatGPT, Claude, Gemini) in any capacity
- Are willing to experiment and iterate

### No Experience Required In
- Building AI agents or chatbots
- MCP or tool-use protocols
- Multi-agent frameworks
- Production deployment

## Session Structure

| Block | Duration | Activity |
|-------|----------|----------|
| Introduction and Concepts | 60 min | Agent landscape, tooling decision tree, ReAct pattern, MCP deep-dive |
| Hands-On Practice | 60 min | Build four working agents (tool use, Claude Code, memory, research) |
| Exercises and Project | 45 min | Progressive challenges and production research agent |
| Assessment and Wrap-Up | 15 min | Knowledge check, reflection, afternoon preview |

- **Total Duration**: 3 hours
- **Format**: Instructor-led live coding with hands-on exercises
- **Difficulty**: Intermediate to Advanced
- **Ratio**: 60% hands-on, 40% concepts

## Connection to the Afternoon Session

This morning focuses on **individual specialised agents**. The afternoon session (Workshop 04 Afternoon) builds on these foundations to cover:

- Multi-agent orchestration and subagent delegation
- Claude Code workflow pipelines
- Safety guardrails, cost control, and human-in-the-loop patterns
- Production deployment with monitoring and logging

Everything you build this morning carries directly into the afternoon.

## Quick Readiness Check

- [ ] Python 3.10+ or Node.js 18+ installed
- [ ] Anthropic API key set in your environment
- [ ] Terminal or VS Code integrated terminal open
- [ ] 3 hours of focused time blocked
- [ ] Real project or research topic in mind
- [ ] Read through the [prerequisites](prerequisites.md)

## Getting Started

**[Start with the Introduction -->](00_introduction.md)**

Or jump directly to:
- [Core Concepts](01_concepts.md) -- the tooling decision tree and agent patterns
- [Hands-On Practice](02_hands_on.md) -- start building immediately
- [Prerequisites](prerequisites.md) -- verify your setup
- [Objectives](objectives.md) -- see exactly what you will learn
