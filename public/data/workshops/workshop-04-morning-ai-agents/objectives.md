# Learning Objectives - Workshop 04 Morning: Specialised AI Agents

## Workshop Overview

Deploy specialised AI agents that reason, use tools, and solve complex tasks autonomously. By the end of this 3-hour morning session, you will have built working agents across multiple domains and understood the production patterns that make them reliable.

## Primary Learning Outcomes

By the end of this session, you will be able to:

### 1. Agent Architecture and Reasoning (Knowledge)

**You will be able to:**
- [ ] **Explain the ReAct pattern** -- how agents interleave reasoning (thought), tool use (action), and result processing (observation) in a loop
- [ ] **Compare agent architectures** -- ReAct, Plan-and-Execute, Subagent Delegation, and Reflection patterns, including when to choose each
- [ ] **Describe the agent tooling landscape** -- Claude Code, Anthropic Agent SDK, OpenAI Codex CLI, Aider, Cursor, Windsurf, LangChain, CrewAI, and their respective strengths
- [ ] **Distinguish agents from chatbots** -- understand why tool use, planning, and self-correction make agents fundamentally different from conversational AI
- [ ] **Identify the role of memory in agents** -- short-term conversation context, project configuration (CLAUDE.md), and long-term vector-store retrieval

**Success Criteria:**
- Can diagram the ReAct loop from memory (thought, action, observation)
- Can recommend the right agent architecture for a given scenario
- Can name at least three production agent tools and explain their trade-offs

### 2. Tool Use and MCP (Knowledge + Skills)

**You will be able to:**
- [ ] **Define tool schemas** using JSON input_schema format for the Claude API, including property types, descriptions, and required fields
- [ ] **Explain the Model Context Protocol (MCP)** -- how it standardises tool integration across clients (Claude Code, Cursor, Windsurf) and why it matters
- [ ] **Configure MCP servers** in a `.mcp.json` file for Claude Code, including filesystem, GitHub, search, and database servers
- [ ] **Implement tool execution functions** that parse structured input from the LLM and return string results
- [ ] **Handle multi-tool interactions** where the agent chains several tool calls in a single task

**Success Criteria:**
- Written at least two custom tool schemas from scratch
- Configured an MCP server and used it via Claude Code
- Built an agent that chains three or more tool calls in sequence

### 3. Building Agents with the Claude API (Skills)

**You will be able to:**
- [ ] **Implement the agent loop** -- send messages with tool definitions, check `stop_reason`, execute tools, return `tool_result` messages, and repeat until `end_turn`
- [ ] **Use Claude Code as a scripted agent** -- invoke `claude-code --print` for one-shot tasks, pipe context via stdin, and configure behaviour with CLAUDE.md
- [ ] **Add memory to an agent** -- store facts during conversation and recall them on future turns using tool-based memory functions
- [ ] **Build a research agent** -- combine web search and URL-reading tools with a synthesis prompt to produce cited reports
- [ ] **Test and debug agents** -- use verbose logging, inspect message histories, verify individual tools, and track token usage

**Success Criteria:**
- Implemented at least two working agent loops from scratch (basic tool agent and research agent)
- Used Claude Code programmatically for at least one multi-step task
- Debugged at least one agent failure by inspecting the message history

### 4. Agent Design and Safety (Application)

**You will be able to:**
- [ ] **Design agent workflows** for specific domains: research, code review, content creation, and task planning
- [ ] **Select the right model for the job** -- Opus 4.8 for complex reasoning, Sonnet 4.6 for general agent work, Haiku 4.5 for routing and cheap subtasks
- [ ] **Implement cost controls** -- set token budgets, cap iteration counts, and track usage via `response.usage`
- [ ] **Apply safety patterns** -- sandbox code execution, restrict file access, validate tool inputs, and add human-in-the-loop gates for destructive actions
- [ ] **Evaluate agent quality** -- write test cases, compare outputs across runs, and measure success rates

**Success Criteria:**
- Designed an agent system with tools, model selection, and safety controls for a real-world use case
- Implemented at least one cost-control mechanism (token budget or iteration limit)
- Can articulate three safety risks of autonomous agents and how to mitigate each

### 5. Multi-Agent Collaboration (Application -- Preview)

**You will be able to:**
- [ ] **Build a simple multi-agent pipeline** where specialist agents (researcher, writer, editor) each handle one stage of a task
- [ ] **Pass context between agents** -- feed the output of one agent as input to the next
- [ ] **Recognise when multi-agent systems add value** versus when a single agent with multiple tools is sufficient
- [ ] **Identify the coordination patterns** (pipeline, delegation, debate) used in frameworks like CrewAI and Claude Code subagents

**Success Criteria:**
- Built a working three-agent content pipeline (researcher, writer, editor)
- Can explain the trade-offs between single-agent and multi-agent approaches

## Detailed Skill Progression

### Beginner Level (Hour 1: Concepts and First Agent)

**Knowledge:**
- [ ] Understand what an AI agent is and how it differs from a chatbot
- [ ] Recognise the components of the agent stack: LLM, tools, memory, configuration
- [ ] Know what MCP is and why it was created
- [ ] Identify the four main agent architectures (ReAct, Plan-and-Execute, Subagent Delegation, Reflection)
- [ ] Understand model selection basics (Opus, Sonnet, Haiku)

**Skills:**
- [ ] Set up the development environment (Python SDK, API key, virtual environment)
- [ ] Define a tool schema in JSON format
- [ ] Implement a basic tool execution function
- [ ] Write a working agent loop that handles `tool_use` and `end_turn` stop reasons
- [ ] Run a pre-built agent example and observe its behaviour

**Mindset:**
- [ ] See agents as goal-directed systems, not scripted programs
- [ ] Accept that agent outputs are non-deterministic -- the same input may produce different tool-call sequences
- [ ] Understand that tool quality directly determines agent quality

### Intermediate Level (Hour 2: Hands-On Building)

**Knowledge:**
- [ ] Understand how Claude Code uses CLAUDE.md for persistent project context
- [ ] Know how MCP servers are configured and discovered by clients
- [ ] Recognise the difference between short-term memory (conversation), project config, and long-term memory (vector stores)
- [ ] Understand retry logic and exponential backoff for tool failures

**Skills:**
- [ ] Configure Claude Code with a CLAUDE.md file and use it for a multi-step task
- [ ] Set up an MCP server in `.mcp.json` and verify the tools are available
- [ ] Build an agent with memory (store and recall)
- [ ] Build a research agent with web search and URL reading
- [ ] Add verbose logging to debug agent decisions
- [ ] Handle tool errors gracefully (return error messages rather than crashing)

**Mindset:**
- [ ] Think in terms of tool composition -- agents are as capable as their tools
- [ ] Consider cost at every step -- each LLM call has a price
- [ ] Test tools independently before integrating them into agent loops

### Advanced Level (Hour 3: Projects, Multi-Agent, and Safety)

**Knowledge:**
- [ ] Understand cost-control patterns (token budgets, iteration caps, model routing)
- [ ] Know the safety risks of autonomous agents (runaway loops, data exposure, destructive actions)
- [ ] Recognise when to use single-agent vs multi-agent approaches
- [ ] Understand evaluation strategies for non-deterministic agent outputs

**Skills:**
- [ ] Build a production-quality research agent with source tracking, citation management, and configurable depth
- [ ] Implement a multi-agent content pipeline with handoff between stages
- [ ] Add cost controls and safety limits to an agent
- [ ] Write test cases for agent behaviour
- [ ] Design an agent system for a new domain (from tools to workflow to safety)

**Mindset:**
- [ ] Think like a systems designer -- agents need monitoring, limits, and graceful failure
- [ ] Plan for the worst case: what happens if the agent loops forever, costs spike, or produces incorrect output?
- [ ] Treat agent outputs as drafts that may need human review, especially for high-stakes tasks

## Domain-Specific Objectives

### For Researchers and Analysts

**You will be able to:**
- Build a research agent that searches multiple sources and produces cited summaries
- Design a literature-review pipeline that gathers, filters, and synthesises findings
- Create a data-analysis agent that queries databases and explains results
- Evaluate source quality and cross-reference claims across sources

### For Content Creators and Writers

**You will be able to:**
- Build a multi-agent content pipeline (research, draft, edit) for articles and reports
- Create a writing agent with a specific voice, style, and editorial guidelines via system prompts
- Automate first-draft generation for recurring content types (newsletters, briefs, summaries)
- Add quality-control gates that check for accuracy, tone, and completeness

### For Team Leads and Decision-Makers

**You will be able to:**
- Evaluate which agent tools (Claude Code, Codex CLI, Cursor, LangChain) suit your team's needs
- Estimate costs for agent deployments and set appropriate budgets
- Identify tasks in your organisation that are good candidates for agent automation
- Articulate the safety and governance requirements for deploying agents in a team

### For Technical Builders

**You will be able to:**
- Build custom agents with the Anthropic Agent SDK in Python or TypeScript
- Create and register custom MCP servers for domain-specific tools
- Implement advanced patterns: subagent delegation, reflection loops, parallel tool calls
- Set up monitoring and observability using LangSmith, Helicone, or custom logging

## Assessment Criteria

### Knowledge Assessment (40 points)

**You will demonstrate understanding of:**
- Agent architectures and when to use each (10 points)
- MCP protocol and tool-use mechanics (10 points)
- Tool use versus RAG -- when to use each approach (10 points)
- Safety, cost control, and production best practices (10 points)

### Code Analysis (30 points)

**You will successfully:**
- Identify bugs and anti-patterns in agent code (15 points)
- Complete a working agent implementation from a skeleton (15 points)

### Design and Application (30 points)

**You will:**
- Design a complete agent system for a real-world use case (15 points)
- Create a safety and cost-management strategy for an autonomous agent (15 points)

### Bonus: Practical Implementation (20 points)

- Build a working mini-agent (word-problem solver) with proper tool use, agent loop, and error handling

**Passing Score:** 70/100 (70%)

## Success Indicators

### Immediate (End of Workshop)

- [ ] Built at least three working agent examples
- [ ] Implemented a custom tool with proper error handling
- [ ] Created a multi-step agent workflow with five or more tool calls
- [ ] Passed the assessment with 70% or higher
- [ ] Completed the capstone research agent project

### Short-Term (1 Week)

- [ ] Applied agent patterns to a real task at work
- [ ] Built a custom agent for a recurring workflow
- [ ] Configured Claude Code with CLAUDE.md for a real project
- [ ] Explored at least one MCP server not covered in the workshop
- [ ] Shared a working agent example with a colleague

### Long-Term (1 Month)

- [ ] Deployed an agent (or agent-like workflow) in a production or team context
- [ ] Measured time savings or quality improvements from agent automation
- [ ] Built a library of reusable tool schemas for your domain
- [ ] Evaluated and selected agent tools for your team or organisation
- [ ] Completed the afternoon session on multi-agent orchestration and safety

## Learning Pathways

### Minimum Viable Outcome

**Basic Competence:**
- Understand what agents are and how they work
- Can build a simple tool-using agent with the Claude API
- Know how to configure Claude Code for a project
- Awareness of safety and cost considerations

### Target Outcome

**Professional Capability:**
- Confidently build agents for research, analysis, and content tasks
- Can configure MCP servers and compose tools for complex workflows
- Understand production patterns: cost control, retries, logging, testing
- Ready to design agent systems for your own domain

### Stretch Outcome

**Advanced Mastery:**
- Build multi-agent pipelines with coordinated specialists
- Implement custom MCP servers for domain-specific tools
- Design complete agent architectures with safety, monitoring, and model routing
- Lead agent adoption in your team or organisation

## Post-Workshop Goals

### Immediate Next Steps

- [ ] Review and refine your capstone research agent
- [ ] Apply the agent loop pattern to one real task from your work
- [ ] Explore the resources listed in [06_resources.md](06_resources.md)
- [ ] Set up Claude Code with CLAUDE.md for your primary project

### Continuing Education

- [ ] Complete the afternoon session on orchestration and safety
- [ ] Read the Anthropic tool-use cookbook examples
- [ ] Build a custom MCP server for a tool specific to your workflow
- [ ] Explore LangGraph for graph-based agent workflows
- [ ] Join the Anthropic and LangChain Discord communities

## Your Commitment

### I Commit To

- [ ] Active participation in all hands-on exercises
- [ ] Building working code, not just reading examples
- [ ] Asking questions when something is unclear
- [ ] Applying at least one agent pattern to my real work within a week
- [ ] Sharing what I learn with colleagues

### The Workshop Promises

- Clear, copy-pasteable code examples that work
- Real-world applicable patterns, not toy demonstrations
- Honest guidance on costs, limitations, and safety
- Immediate productivity gains you can take back to your desk
- Ongoing support through Discord and office hours

## Ready to Begin?

These objectives represent a step-change in how you work with AI. After this morning, you will not think of AI as a chatbot -- you will see it as a workforce of specialised agents that you design, deploy, and direct.

---

[Begin Workshop -->](00_introduction.md) | [Check Prerequisites](prerequisites.md) | [Back to Module Overview](README.md)
