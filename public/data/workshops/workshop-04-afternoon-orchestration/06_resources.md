# Resources for Agent Orchestration & Safety

## Official Documentation

### Anthropic
- **Claude Code Documentation**: https://docs.anthropic.com/en/docs/claude-code
- **Claude Code Subagents**: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- **Claude Code Hooks**: https://docs.anthropic.com/en/docs/claude-code/hooks
- **Agent SDK**: https://docs.anthropic.com/en/docs/build-with-claude/agent-sdk
- **Tool Use Guide**: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Prompt Caching**: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- **Python SDK**: https://github.com/anthropics/anthropic-sdk-python
- **TypeScript SDK**: https://github.com/anthropics/anthropic-sdk-node

### Model Context Protocol (MCP)
- **MCP Specification**: https://modelcontextprotocol.io/
- **MCP Server Registry**: https://github.com/modelcontextprotocol/servers
- **Building MCP Servers**: https://modelcontextprotocol.io/docs/concepts/servers

### Orchestration Frameworks
- **LangGraph**: https://github.com/langchain-ai/langgraph
- **LangGraph Documentation**: https://langchain-ai.github.io/langgraph/
- **CrewAI**: https://github.com/crewAIInc/crewAI
- **AutoGen**: https://github.com/microsoft/autogen

## Orchestration Patterns

### Framework Comparison

| Framework | Pattern | Best For | Complexity |
|-----------|---------|----------|------------|
| **Claude Code subagents** | Delegation | Coding tasks, file operations | Low |
| **Custom (Anthropic SDK)** | Any pattern | Full control, production systems | Medium |
| **LangGraph** | State machines | Complex workflows with branching | High |
| **CrewAI** | Role-based teams | Content creation, research | Medium |
| **AutoGen** | Conversations | Multi-agent dialogue | Medium |

### Pattern Reference

```python
# Quick reference for each pattern

# 1. Subagent Delegation
parent_result = synthesise([
    subagent_1.execute(task_a),
    subagent_2.execute(task_b),
])

# 2. Pipeline
result = stage_3(stage_2(stage_1(input)))

# 3. Fan-out / Fan-in
parallel_results = parallel_execute([search_a, search_b, search_c])
result = synthesise(parallel_results)

# 4. LangGraph State Machine
graph.add_edge("plan", "execute")
graph.add_conditional_edges("review", decide, {"revise": "execute", "done": END})
```

## Safety and Cost Management

### Safety Checklist

Use this checklist for every production agent system:

- [ ] Token budget controller with per-task limits
- [ ] Iteration limiter (max loops per agent)
- [ ] Timeout controls (max wall-clock time)
- [ ] Sandboxed code execution (E2B, Docker, or restricted Python)
- [ ] Human-in-the-loop approval for destructive actions
- [ ] Audit logging (every tool call, every LLM call)
- [ ] Input validation on all tool parameters
- [ ] Network restrictions (allowlist for outbound connections)
- [ ] Error recovery with retries and fallbacks
- [ ] Cost alerting when approaching budget thresholds

### Cost Estimation

Model selection has the biggest impact on cost. Check the [Anthropic pricing page](https://www.anthropic.com/pricing) for current rates. General guidance:

| Model | Use For | Relative Cost |
|-------|---------|---------------|
| Haiku 4.5 | Classification, routing, formatting, simple extraction | Lowest |
| Sonnet 4.6 | General work, coding, analysis, synthesis | Medium |
| Opus 4.8 | Complex reasoning, architecture, critical decisions | Highest |

**Cost reduction strategies**:
1. Route simple tasks to Haiku (saves significantly per call)
2. Use prompt caching for repeated system prompts
3. Trim conversation context aggressively
4. Batch multiple classifications into one call
5. Set hard token budgets and stop early

### Observability Tools

| Tool | Purpose | Link |
|------|---------|------|
| **LangSmith** | Agent tracing, debugging, evaluation | https://docs.smith.langchain.com/ |
| **Helicone** | LLM observability, cost tracking, caching | https://www.helicone.ai/ |
| **Braintrust** | Evaluation and monitoring | https://www.braintrust.dev/ |
| **Weights & Biases** | Experiment tracking | https://wandb.ai/ |

### Code Execution Sandboxes

| Tool | Type | Link |
|------|------|------|
| **E2B** | Cloud sandboxes | https://e2b.dev/ |
| **Modal** | Serverless compute | https://modal.com/ |
| **Docker** | Local containers | Standard Docker |
| **RestrictedPython** | In-process sandbox | https://github.com/zopefoundation/RestrictedPython |

## Research Papers

### Multi-Agent Systems

1. **ReAct: Synergizing Reasoning and Acting** (2023)
   - arXiv: https://arxiv.org/abs/2210.03629
   - Foundation for agent loops

2. **Generative Agents: Interactive Simulacra of Human Behavior** (2023)
   - arXiv: https://arxiv.org/abs/2304.03442
   - Memory architectures for long-running agents

3. **Model Context Protocol Specification** (2024-2025)
   - https://modelcontextprotocol.io/
   - Standardised tool integration

### Safety and Alignment

4. **Constitutional AI** (2023)
   - arXiv: https://arxiv.org/abs/2212.08073
   - Self-supervision for safe agent behaviour

5. **Agent Safety in Production Systems** (2025)
   - Focus: Guardrails, cost control, and audit patterns for deployed agents

## Development Setup

### Required Packages

```bash
# Core
pip install anthropic tenacity python-dotenv

# For LangGraph exercises
pip install langgraph langchain langchain-anthropic

# For testing
pip install pytest
```

### Project Template

```
my_agent_system/
    orchestrator.py      # Main orchestration
    safety.py            # Budget, limits, audit
    router.py            # Model routing
    agents.py            # Subagent implementations
    config.py            # Configuration
    main.py              # Entry point
    tests/
        test_safety.py
        test_router.py
        test_orchestrator.py
    logs/                # Audit logs (gitignored)
    requirements.txt
    .env                 # API keys (gitignored)
    CLAUDE.md            # Agent configuration
```

## Community

- **Anthropic Discord**: https://discord.gg/anthropic
- **LangChain Discord**: https://discord.gg/langchain
- **Anthropic Research Blog**: https://www.anthropic.com/research
- **LangChain Blog**: https://blog.langchain.dev/

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)
