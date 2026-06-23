# Workshop 04 - Afternoon Session: Agent Orchestration & Safety

## Scale Up: From One Agent to Coordinated Agent Systems

This morning you built individual AI agents that reason, use tools, and solve problems autonomously. This afternoon, we tackle the real-world challenge: **how do you coordinate multiple agents, keep them safe, and manage costs when they operate at scale?**

By the end of this 3-hour session, you will have designed, built, and tested a production-grade multi-agent system with proper safety controls, cost management, and observability -- the skills that separate experimental agent work from deployable systems.

## What You'll Build

- **Subagent Pipeline**: A parent agent that decomposes complex tasks and delegates to specialist child agents running in parallel
- **Parallel Research System**: Multiple agents searching and synthesising information concurrently, with deduplication
- **Guardrailed Agent**: A production agent with token budgets, iteration limits, human-in-the-loop approval gates, and full audit logging
- **Full Orchestration Project**: An end-to-end multi-agent system with model routing, error recovery, cost reporting, and observability

## Who This Session Is For

### Ideal Participants
- Professionals who completed the morning AI Agents session (Day 4 AM)
- Team leads evaluating multi-agent architectures for their organisation
- Technical professionals building AI-powered automation workflows
- Anyone responsible for the cost and safety of AI deployments

### You'll Succeed If You
- Completed the morning session on AI agents and tool use
- Are comfortable reading Python code (you do not need to be a developer)
- Understand the basics of API calls and JSON data
- Are interested in how AI agents can work together safely

### Not Required
- Deep software engineering experience
- Prior experience with multi-agent frameworks
- Knowledge of specific orchestration tools (we cover them from scratch)

## Module Structure

### Chapter Navigation

1. **[Introduction](00_introduction.md)** -- Why Orchestration Matters (15 min)
   - The jump from single agents to agent systems
   - The 2026 orchestration landscape
   - Why safety is non-negotiable
   - Architecture overview of a production multi-agent system

2. **[Core Concepts](01_concepts.md)** -- Orchestration Patterns & Safety Theory (45 min)
   - Subagent delegation (Claude Code's native model)
   - Pipeline and fan-out/fan-in patterns
   - LangGraph state machine orchestration
   - Token budgets, iteration limiters, and approval gates
   - Model routing for cost optimisation
   - Prompt caching and context efficiency

3. **[Hands-On Practice](02_hands_on.md)** -- Build Orchestrated Agent Systems (45 min)
   - Project 1: Subagent orchestrator with parallel execution
   - Project 2: Guardrailed agent with full safety controls
   - Project 3: Claude Code workflow with hooks
   - Testing orchestration and safety modules

4. **[Exercises](03_exercises.md)** -- Progressive Orchestration Challenges (30 min)
   - Model routing orchestrator
   - Retry and recovery pipeline
   - Approval-gated deployment agent
   - Parallel research with deduplication
   - Cost-optimised agent system
   - Claude Code multi-agent workflow

5. **[Project Work](04_project.md)** -- Production Multi-Agent System (30 min)
   - Full system with orchestrator, router, safety controller, and subagents
   - Modular architecture: `orchestrator.py`, `safety.py`, `router.py`, `agents.py`
   - Evaluation on orchestration, safety, cost efficiency, and code quality

6. **[Assessment](05_assessment.md)** -- Knowledge Validation (15 min)
   - Conceptual understanding of orchestration patterns
   - Code analysis and bug identification
   - System design questions
   - Practical implementation (bonus)

7. **[Additional Resources](06_resources.md)** -- Tools, Papers & References
   - Official documentation for all frameworks covered
   - Safety checklist for production deployments
   - Observability and cost management tools
   - Research papers and community links

## Key Technologies (2026)

| Technology | Role in This Session |
|-----------|---------------------|
| **Claude Code Subagents** | Delegating tasks to focused child agents via `--print` |
| **Claude Code Hooks** | Adding safety controls (pre/post-tool-use) to workflows |
| **Anthropic SDK** | Building custom orchestrators in Python with full API control |
| **MCP Servers** | Tool integration for orchestrated agent systems |
| **LangGraph** | Graph-based state machine orchestration with branching and loops |
| **CrewAI** | Role-based multi-agent teams for content and research workflows |

## Session Timing

| Time | Topic | Format |
|------|-------|--------|
| 0:00--0:15 | Introduction and overview | Presentation |
| 0:15--1:00 | Core concepts: patterns, safety, cost | Guided walkthrough |
| 1:00--1:45 | Hands-on: build orchestrated systems | Live coding |
| 1:45--2:15 | Progressive exercises | Self-paced practice |
| 2:15--2:45 | Project work: production system | Independent build |
| 2:45--3:00 | Assessment and wrap-up | Knowledge validation |

## Learning Outcomes at a Glance

By the end of this session, you will be able to:

- Design multi-agent architectures using subagent delegation, pipeline, and fan-out/fan-in patterns
- Implement token budgets, iteration limits, and human-in-the-loop approval gates
- Route tasks to cost-appropriate models (Haiku for simple, Sonnet for moderate, Opus for complex)
- Build error recovery with exponential backoff and model fallback
- Create full audit trails for every agent action and LLM call
- Evaluate orchestration frameworks (Claude Code, LangGraph, CrewAI) for different use cases

See [objectives.md](objectives.md) for the complete learning outcomes breakdown.

## Prerequisites at a Glance

- Completion of the morning AI Agents session (Day 4 AM)
- Anthropic API key with credit
- Python 3.10+ with `anthropic` and `tenacity` packages installed
- Familiarity with reading Python code

Review [prerequisites.md](prerequisites.md) for full details and setup instructions.

## Ready to Start?

### Quick Readiness Check
- [ ] Morning agents session completed
- [ ] Python environment with required packages installed
- [ ] Anthropic API key set in environment
- [ ] 3 hours of focused time available
- [ ] Ready to build production-grade agent systems

### Begin the Session

**[Start with the Introduction -->](00_introduction.md)**

Or jump directly to:
- [Core Concepts](01_concepts.md) -- Understand orchestration patterns and safety theory
- [Hands-On Practice](02_hands_on.md) -- Start building immediately
- [Check Prerequisites](prerequisites.md) -- Ensure your environment is ready

---

[Learning Objectives](objectives.md) | [Prerequisites](prerequisites.md) | [Introduction -->](00_introduction.md)
