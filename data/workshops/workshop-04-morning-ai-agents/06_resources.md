# Resources for AI Agents

## Official Documentation

### Anthropic Claude
- **Tool Use Guide**: https://docs.anthropic.com/claude/docs/tool-use
- **Best Practices**: https://docs.anthropic.com/claude/docs/tool-use-best-practices
- **Python SDK**: https://github.com/anthropics/anthropic-sdk-python
- **Cookbook**: https://github.com/anthropics/anthropic-cookbook

### OpenAI
- **Function Calling**: https://platform.openai.com/docs/guides/function-calling
- **Agents Guide**: https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models
- **Python SDK**: https://github.com/openai/openai-python

### LangChain
- **Agents Documentation**: https://python.langchain.com/docs/modules/agents/
- **Agent Types**: https://python.langchain.com/docs/modules/agents/agent_types/
- **Tools**: https://python.langchain.com/docs/integrations/tools/
- **GitHub**: https://github.com/langchain-ai/langchain

## Frameworks and Libraries

| Framework | Purpose | Best For | GitHub |
|-----------|---------|----------|--------|
| **LangChain** | Agent orchestration | General-purpose agents | [link](https://github.com/langchain-ai/langchain) |
| **CrewAI** | Multi-agent systems | Collaborative agents | [link](https://github.com/joaomdmoura/crewAI) |
| **AutoGPT** | Autonomous agents | Long-running tasks | [link](https://github.com/Significant-Gravitas/AutoGPT) |
| **AutoGen** | Multi-agent conversations | Complex dialogues | [link](https://github.com/microsoft/autogen) |
| **LlamaIndex** | Data-aware agents | RAG + agents | [link](https://github.com/run-llama/llama_index) |
| **Semantic Kernel** | Agent SDK | Enterprise agents | [link](https://github.com/microsoft/semantic-kernel) |
| **Claude Flow** | Agent orchestration | Production swarms | [link](https://github.com/ruvnet/claude-flow) |

## Research Papers

### Foundational Papers

1. **ReAct: Synergizing Reasoning and Acting in Language Models** (2023)
   - Authors: Yao et al.
   - arXiv: https://arxiv.org/abs/2210.03629
   - Key contribution: Interleaving reasoning and action

2. **Toolformer: Language Models Can Teach Themselves to Use Tools** (2023)
   - Authors: Schick et al.
   - arXiv: https://arxiv.org/abs/2302.04761
   - Key contribution: Self-supervised tool learning

3. **HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging Face** (2023)
   - Authors: Shen et al.
   - arXiv: https://arxiv.org/abs/2303.17580
   - Key contribution: LLM as controller for AI models

4. **Generative Agents: Interactive Simulacra of Human Behavior** (2023)
   - Authors: Park et al.
   - arXiv: https://arxiv.org/abs/2304.03442
   - Key contribution: Agent memory architectures

5. **AutoGPT: An Autonomous GPT-4 Experiment** (2023)
   - Project: https://github.com/Significant-Gravitas/AutoGPT
   - Key contribution: Fully autonomous agents

### Recent Advances (2024)

6. **Agent-as-a-Judge: Evaluating Multi-Agent Systems** (2024)
   - Focus: Agent evaluation methodologies

7. **Multi-Agent Collaboration Patterns** (2024)
   - Focus: Communication protocols

8. **Memory Systems for Long-Running Agents** (2024)
   - Focus: Persistent memory architectures

## Code Examples and Tutorials

### Beginner-Friendly

1. **LangChain Agents Tutorial**
   ```
   https://python.langchain.com/docs/use_cases/tool_use/quickstart
   ```
   Complete walkthrough of building your first agent

2. **Anthropic Tool Use Examples**
   ```
   https://github.com/anthropics/anthropic-cookbook/tree/main/tool_use
   ```
   Official examples from Anthropic

3. **OpenAI Function Calling Cookbook**
   ```
   https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models
   ```
   Step-by-step function calling guide

### Intermediate

4. **Building Production Agents**
   ```
   https://blog.langchain.dev/building-production-ready-llm-applications/
   ```
   Best practices for production deployment

5. **Agent Memory Patterns**
   ```
   https://github.com/langchain-ai/langchain/tree/master/templates
   ```
   Templates for different memory strategies

6. **Multi-Tool Agents**
   ```
   https://github.com/anthropics/anthropic-cookbook/blob/main/tool_use/
customer_service_agent.ipynb
   ```
   Customer service agent with multiple tools

### Advanced

7. **Multi-Agent Systems with CrewAI**
   ```
   https://github.com/joaomdmoura/crewAI-examples
   ```
   Complex multi-agent scenarios

8. **AutoGen Multi-Agent Conversations**
   ```
   https://microsoft.github.io/autogen/docs/Examples/
   ```
   Agent-to-agent communication patterns

9. **LangGraph for Agent Workflows**
   ```
   https://github.com/langchain-ai/langgraph
   ```
   Building complex agent workflows with graphs

## Tools and Utilities

### Development Tools

```python
# Essential packages
pip install anthropic openai langchain langchain-anthropic langchain-openai

# Vector stores for memory
pip install chromadb faiss-cpu pinecone-client

# Search tools
pip install duckduckgo-search wikipedia

# Utilities
pip install python-dotenv pydantic tenacity
```

### Testing and Debugging

1. **LangSmith**: Agent tracing and debugging
   - https://docs.smith.langchain.com/

2. **Helicone**: LLM observability
   - https://www.helicone.ai/

3. **Weights & Biases**: Experiment tracking
   - https://wandb.ai/

### Sandboxing and Safety

1. **E2B Sandboxes**: Safe code execution
   - https://e2b.dev/

2. **RestrictedPython**: Safe Python execution
   - https://github.com/zopefoundation/RestrictedPython

## Community and Learning

### Discord Communities
- LangChain Discord: https://discord.gg/langchain
- Claude AI Community: https://discord.gg/anthropic
- OpenAI Developer Community: https://community.openai.com/

### YouTube Channels
- **AI Jason**: Practical AI agent tutorials
- **Sam Witteveen**: LangChain and agent development
- **Matt Wolfe**: AI news and agent demos

### Blogs and Newsletters
- **The Batch** (Andrew Ng): https://www.deeplearning.ai/the-batch/
- **LangChain Blog**: https://blog.langchain.dev/
- **Anthropic Research**: https://www.anthropic.com/research

## Sample Projects

### Open Source Agent Projects

1. **Agent Protocol**: Standardized agent API
   ```
   https://github.com/AI-Engineer-Foundation/agent-protocol
   ```

2. **SuperAGI**: Open-source AGI infrastructure
   ```
   https://github.com/TransformerOptimus/SuperAGI
   ```

3. **BabyAGI**: Task-driven autonomous agent
   ```
   https://github.com/yoheinakajima/babyagi
   ```

4. **GPT Engineer**: AI software engineer
   ```
   https://github.com/AntonOsika/gpt-engineer
   ```

5. **MetaGPT**: Multi-agent meta programming
   ```
   https://github.com/geekan/MetaGPT
   ```

## Best Practices

### Design Patterns

1. **ReAct Agent Pattern**
   ```python
   def react_agent(goal):
       while not goal_achieved():
           thought = think_about_next_step()
           action = choose_action(thought)
           observation = execute_action(action)
           update_state(observation)
       return final_answer()
   ```

2. **Plan-and-Execute Pattern**
   ```python
   def plan_execute(goal):
       plan = create_plan(goal)
       for step in plan:
           result = execute_step(step)
           if should_replan(result):
               plan = replan(goal, results)
       return synthesize_results(results)
   ```

3. **Reflection Pattern**
   ```python
   def reflective_agent(task):
       attempt = execute_task(task)
       reflection = reflect_on_attempt(attempt)
       if needs_retry(reflection):
           improved_attempt = retry_with_reflection(task, reflection)
           return improved_attempt
       return attempt
   ```

### Safety Guidelines

1. **Input Validation**: Always validate tool parameters
2. **Sandboxing**: Execute code in isolated environments
3. **Rate Limiting**: Prevent runaway agents
4. **Human-in-the-Loop**: Critical actions require approval
5. **Audit Logging**: Track all agent actions
6. **Timeout Controls**: Set maximum execution time
7. **Cost Caps**: Limit API spending

### Performance Optimization

1. **Caching**: Cache repeated tool calls
2. **Batching**: Combine multiple operations
3. **Streaming**: Stream responses for better UX
4. **Prompt Optimization**: Minimize token usage
5. **Tool Selection**: Only include relevant tools
6. **Memory Management**: Clean up old context

## Production Deployment

### Infrastructure

1. **Hosting Options**:
   - AWS Lambda (serverless)
   - Google Cloud Run (containers)
   - Modal (ML infrastructure)
   - E2B (agent sandboxes)

2. **Monitoring**:
   - LangSmith for tracing
   - Datadog for metrics
   - Sentry for error tracking

3. **Scaling**:
   - Redis for distributed state
   - Queue systems (Celery, RQ)
   - Load balancing

### Security

1. **API Key Management**:
   - Use environment variables
   - Rotate keys regularly
   - Implement key scoping

2. **Authentication**:
   - OAuth for user auth
   - API keys for service auth
   - JWT tokens

3. **Data Protection**:
   - Encrypt sensitive data
   - PII redaction
   - Audit compliance

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Agent loops indefinitely | Add iteration limits, improve stop conditions |
| Tool selection errors | Better tool descriptions, few-shot examples |
| Out of memory | Implement context trimming, use summarization |
| Slow responses | Cache results, optimize prompts |
| Hallucinated tool calls | Validate parameters, add error handling |
| Cost overruns | Set spending limits, optimize tool usage |

### Debugging Techniques

1. **Verbose Logging**: Enable detailed output
2. **Step-by-Step Execution**: Run agent manually
3. **Tool Testing**: Test tools independently
4. **Prompt Analysis**: Review LLM reasoning
5. **Tracing**: Use LangSmith or similar

## Future Directions

### Emerging Trends (2024-2025)

1. **Multi-Modal Agents**: Vision + text + audio
2. **Agent-to-Agent Protocols**: Standardized communication
3. **Specialized Agent Markets**: Pre-built agent templates
4. **Agent Orchestration Platforms**: Cloud-native agent hosting
5. **Hybrid Approaches**: Combining symbolic AI + LLMs

### Research Areas

- Long-term memory systems
- Multi-agent consensus mechanisms
- Agent evaluation frameworks
- Safety and alignment
- Efficient inference

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)
