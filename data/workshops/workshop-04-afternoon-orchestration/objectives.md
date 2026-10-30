# Learning Objectives - Workshop 04 Afternoon: Agent Orchestration & Safety

## Workshop Overview

Move beyond single agents to production multi-agent systems. By the end of this 3-hour session, you will be able to design, build, and deploy orchestrated agent workflows with proper safety controls, cost management, and observability -- the capabilities that make the difference between a demo and a production system.

## Primary Learning Outcomes

By the end of this workshop, you will be able to:

### 1. Orchestration Architecture (Core Knowledge)

**You will be able to:**
- Explain why multi-agent orchestration is necessary for complex, real-world tasks
- Describe the four core orchestration patterns: subagent delegation, pipeline, fan-out/fan-in, and graph-based state machines
- Identify which pattern suits a given problem (e.g. parallel research vs sequential content creation vs branching workflows)
- Articulate the trade-offs between frameworks: Claude Code subagents, the Anthropic Agent SDK, LangGraph, and CrewAI
- Draw an architecture diagram for a multi-agent system, including orchestrator, subagents, safety layer, and result collector

**Success Criteria:**
- Can compare at least three orchestration patterns with use cases and weaknesses
- Can recommend a framework for a given scenario with reasoning
- Can explain how subagent delegation works in Claude Code
- Can describe a fan-out/fan-in pattern and when to use it

### 2. Safety & Guardrails (Core Skills)

**You will be able to:**
- Implement a token budget controller that tracks input and output tokens and raises an exception when the budget is exceeded
- Build an iteration limiter that prevents runaway agent loops
- Create a human-in-the-loop approval gate for sensitive tool calls (file writes, deployments, destructive actions)
- Design an audit logger that records every LLM call, tool invocation, and approval decision in structured JSON
- Configure Claude Code hooks (`PreToolUse`, `PostToolUse`) to enforce safety rules automatically
- Explain the role of sandboxed execution (Docker, E2B) in preventing agents from damaging the host system

**Success Criteria:**
- Working token budget controller with tracking and enforcement
- Iteration limiter that stops agents after a configurable maximum
- Approval gate that blocks sensitive actions until a human approves
- Audit log file with structured JSON entries for a complete session
- Can explain five safety controls and what happens if each is missing

### 3. Cost Management (Core Skills)

**You will be able to:**
- Implement a model routing strategy that classifies task complexity and selects the cheapest suitable model
- Route simple tasks (classification, formatting, extraction) to Haiku 4.5
- Route moderate tasks (analysis, coding, synthesis) to Sonnet 4.6
- Reserve Opus 4.8 for complex reasoning and critical architectural decisions
- Use prompt caching to reduce costs on repeated system prompts
- Trim conversation context to avoid paying for stale messages
- Estimate the token cost of a multi-agent workflow before running it
- Compare the cost of a routed approach against a naive "all Sonnet" baseline

**Success Criteria:**
- Working model router that classifies and dispatches to three model tiers
- Cost report showing tokens used per model with estimated savings
- Can estimate the token cost of a given multi-agent workflow on paper
- Can identify at least three cost reduction strategies

### 4. Parallel Execution & Synthesis (Applied Skills)

**You will be able to:**
- Use Python's `concurrent.futures.ThreadPoolExecutor` to run subagents in parallel
- Implement a fan-out/fan-in pattern where multiple agents search independently and results are synthesised
- Handle partial failures: if one subagent fails, continue with the others and note the gap
- Build a synthesis agent that combines diverse subtask results into a coherent final output
- Deduplicate overlapping findings from parallel research agents

**Success Criteria:**
- Orchestrator that runs at least 3 subtasks in parallel
- Synthesis output that is coherent and eliminates redundancy
- System handles one subagent failure without crashing
- Cost report shows parallel vs sequential comparison

### 5. Error Recovery & Resilience (Applied Skills)

**You will be able to:**
- Implement exponential backoff for transient API failures (rate limits, network errors)
- Build model fallback logic: if the primary model fails, retry with a cheaper alternative
- Design a circuit breaker that stops retrying after consecutive failures
- Return partial results with clear indication of what succeeded and what failed
- Log all retries, failures, and fallbacks for post-incident review

**Success Criteria:**
- Retry logic with configurable backoff (1s, 2s, 4s)
- Model fallback from Sonnet to Haiku on failure
- Partial results returned with status indicators
- Failure log with timestamps and error details

### 6. Production Deployment Patterns (Applied Knowledge)

**You will be able to:**
- Structure a multi-agent project with proper separation of concerns (`orchestrator.py`, `safety.py`, `router.py`, `agents.py`)
- Write tests for safety controllers, model routers, and orchestration logic
- Use observability tools (LangSmith, Helicone) to trace and debug agent workflows
- Configure Claude Code hooks for automated safety enforcement in real projects
- Design an approval-gated deployment pipeline with full audit trail

**Success Criteria:**
- Modular project structure with separate safety, routing, and orchestration modules
- At least 3 passing tests covering safety and routing logic
- Can explain how to integrate LangSmith or Helicone for production monitoring
- Can describe the workflow for an approval-gated deployment

## Detailed Skill Progression

### Hour 1: Concepts and Understanding (0:00--1:00)

**Knowledge:**
- [ ] Understand why single agents are insufficient for complex tasks
- [ ] Know the four orchestration patterns and their trade-offs
- [ ] Understand the five core safety controls (budget, limits, sandboxing, approval, audit)
- [ ] Know the model routing strategy (Haiku / Sonnet / Opus)
- [ ] Understand prompt caching and context efficiency
- [ ] Recognise the risks of unguarded autonomous agents

**Comprehension:**
- [ ] Can explain subagent delegation with a concrete example
- [ ] Can describe when to use fan-out/fan-in vs pipeline
- [ ] Can articulate why audit logging is essential, not optional
- [ ] Can explain the cost difference between Haiku and Opus

### Hour 2: Hands-On Building (1:00--2:00)

**Implementation:**
- [ ] Build a subagent orchestrator with parallel execution
- [ ] Implement token budget tracking and enforcement
- [ ] Create an iteration limiter and test it
- [ ] Build an approval gate for sensitive tool calls
- [ ] Set up audit logging in structured JSON format
- [ ] Configure Claude Code hooks for automated safety

**Practice:**
- [ ] Run the orchestrator with a real task and observe parallel execution
- [ ] Trigger the token budget limit and observe the graceful stop
- [ ] Test the approval gate by attempting a sensitive action
- [ ] Review the audit log to trace what happened during a run

### Hour 3: Exercises, Project & Assessment (2:00--3:00)

**Application:**
- [ ] Complete at least 3 of the 6 progressive exercises
- [ ] Build a model routing orchestrator with cost reporting
- [ ] Implement retry logic with exponential backoff
- [ ] Design and build the final project: a production multi-agent system

**Evaluation:**
- [ ] Answer conceptual questions about orchestration patterns
- [ ] Identify bugs and missing safety controls in sample code
- [ ] Design a multi-agent system for a given real-world scenario
- [ ] Estimate the token cost of a multi-agent workflow

## Profession-Specific Outcomes

### For Technical Leads & Architects
- Design multi-agent architectures for your team's AI workflows
- Evaluate orchestration frameworks against your requirements
- Set cost budgets and safety policies for agent deployments
- Build observability into AI systems from the start

### For AI/ML Practitioners
- Implement production-grade agent orchestration in Python
- Build custom safety controllers and model routers
- Use LangGraph for complex workflows with branching and loops
- Test and debug multi-agent systems systematically

### For Product Managers & Strategists
- Understand the cost structure of multi-agent systems
- Evaluate which tasks benefit from orchestration vs single agents
- Set realistic budgets for agent-powered features
- Communicate safety requirements to engineering teams

### For Operations & Compliance Teams
- Understand audit logging and traceability for AI agents
- Design approval workflows for sensitive automated actions
- Set token budgets that balance capability with cost control
- Review audit trails to verify agent behaviour

## Assessment Criteria

### Knowledge Assessment (40 points)

**You will demonstrate understanding of:**
- Orchestration patterns: subagent delegation, pipeline, fan-out/fan-in (10 points)
- Safety controls: budgets, limits, sandboxing, approval, audit (10 points)
- Model routing and cost optimisation (10 points)
- Error recovery: retries, fallbacks, circuit breakers (10 points)

### Code Analysis (30 points)

**You will successfully:**
- Identify at least 4 issues in a flawed orchestrator (15 points)
- Design a safe orchestrator with budget handling and partial results (15 points)

### System Design (30 points)

**You will:**
- Design a multi-agent system for a real-world scenario (15 points)
- Estimate and optimise the cost of a multi-agent workflow (15 points)

### Bonus: Practical Implementation (20 points)

- Build a working mini-orchestrator with parallel execution, token tracking, synthesis, and error handling

**Passing Score:** 70/100 (70%)

## Success Indicators

### Immediate (End of Session)

- [ ] Built a working multi-agent orchestrator
- [ ] Safety controls tested and operational
- [ ] Model routing producing cost savings
- [ ] Audit log capturing all agent actions
- [ ] Passed the assessment

### Short-term (1 Week)

- [ ] Applied orchestration patterns to a real work task
- [ ] Set up token budgets for an existing agent workflow
- [ ] Implemented audit logging in a project
- [ ] Shared learnings with a colleague

### Long-term (1 Month)

- [ ] Running a production multi-agent system with safety controls
- [ ] Cost management reducing agent spending measurably
- [ ] Audit trails supporting compliance or debugging needs
- [ ] Evaluating advanced frameworks (LangGraph, CrewAI) for team adoption

## Post-Session Goals

### Immediate Next Steps

- [ ] Review the [Resources](06_resources.md) page for documentation links
- [ ] Complete any unfinished exercises from the session
- [ ] Apply the orchestration patterns to one real task at work
- [ ] Set up cost monitoring for your API usage
- [ ] Document your safety policy for agent deployments

### Continuing Education

- [ ] Explore LangGraph for complex stateful workflows
- [ ] Try CrewAI for role-based agent teams
- [ ] Read the MCP specification for building custom tool servers
- [ ] Build a production dashboard for agent observability
- [ ] Contribute to the workshop community with your experiences

---

[Begin Workshop -->](./00_introduction.md) | [Check Prerequisites](./prerequisites.md) | [Back to Workshop Overview](README.md)
