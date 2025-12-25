# Assessment: Local AI Models Mastery

## Knowledge Check

Test your understanding of local AI concepts and practical skills.

### Section 1: Conceptual Understanding (30 points)

**Question 1: Model Architecture (5 points)**

Explain in your own words how the Transformer architecture enables LLMs to understand context. Include:
- Role of self-attention
- How tokens are processed
- Why positional encoding matters

<details>
<summary>Sample Answer</summary>

The Transformer architecture processes all tokens in parallel using self-attention mechanisms. Self-attention allows each token to "look at" and weight the importance of every other token in the sequence, capturing contextual relationships. Positional encoding adds information about token positions since the architecture doesn't inherently understand order. This combination enables the model to understand both meaning and structure simultaneously, making it powerful for language understanding.

</details>

**Question 2: Quantization Trade-offs (5 points)**

You have an 8B parameter model and need to choose between Q4_K_M and Q8_0 quantization. Your hardware is a laptop with 16GB RAM and no dedicated GPU. Which would you choose and why?

<details>
<summary>Sample Answer</summary>

Q4_K_M is the better choice because:
1. **Memory**: ~4.6GB vs ~8.5GB (Q8_0), leaving more RAM for OS and other applications
2. **Speed**: ~1.8x faster inference on CPU
3. **Quality**: Only ~5% quality degradation, acceptable for most use cases
4. **Hardware**: Without GPU acceleration, the speed benefit of smaller quantization is more significant

Q8_0 would be unnecessary overhead given the minimal quality improvement and significantly higher resource requirements.

</details>

**Question 3: Hardware Selection (5 points)**

Compare running Llama 3.1 70B Q4_K_M on:
- Option A: NVIDIA RTX 4090 (24 GB VRAM) + 32 GB system RAM
- Option B: Apple M3 Max (64 GB unified memory)

Which is better and why?

<details>
<summary>Sample Answer</summary>

**Apple M3 Max is better** for this specific model:

Llama 3.1 70B Q4_K_M requires ~39GB memory.

- **RTX 4090**: Can only fit partial model in VRAM, requiring constant CPU-GPU transfers, severely degrading performance
- **M3 Max**: Entire model fits in unified memory (39GB < 64GB), enabling smooth inference at ~35-45 tok/s

While RTX 4090 has more raw compute power, the memory bottleneck makes it impractical. For smaller models (8B-13B), the RTX 4090 would be faster.

</details>

**Question 4: Privacy Analysis (5 points)**

A healthcare company wants to use AI for analyzing patient records. List 3 specific advantages of local AI over cloud APIs and 1 potential disadvantage.

<details>
<summary>Sample Answer</summary>

**Advantages:**
1. **HIPAA Compliance**: Patient data never leaves local infrastructure, avoiding data breach risks and simplifying regulatory compliance
2. **Zero Data Retention**: No third-party stores conversation logs or learns from sensitive medical data
3. **Air-Gapped Operation**: Can operate in secure, network-isolated environments

**Disadvantage:**
- **Model Updates**: Requires manual model updates and fine-tuning, whereas cloud models continuously improve. Healthcare-specific optimizations need in-house ML expertise.

</details>

**Question 5: Model Selection (5 points)**

Match each task to the most appropriate model:

Tasks:
A. Generate a complex Python web scraping script
B. Answer "What is the capital of France?"
C. Explain why neural networks need activation functions
D. Write and analyze code for a sorting algorithm

Models:
1. phi3:3.8b
2. llama3.1:8b
3. qwen2.5-coder:7b
4. qwen2.5:7b

<details>
<summary>Answer</summary>

- A → 3 (qwen2.5-coder:7b) - Code generation specialist
- B → 1 (phi3:3.8b) - Simple factual query, fast model
- C → 4 (qwen2.5:7b) - Reasoning/explanation task
- D → 3 (qwen2.5-coder:7b) - Code-focused task

</details>

**Question 6: Performance Optimization (5 points)**

You're running llama3.1:8b on a system with NVIDIA RTX 3060 (12GB VRAM). Inference is slow. List 3 optimization strategies in order of impact.

<details>
<summary>Sample Answer</summary>

1. **Ensure GPU acceleration is enabled** (biggest impact):
   ```bash
   # Verify GPU detected
   ollama run llama3.1:8b  # Should show "Using GPU"
   # Set all layers to GPU
   OLLAMA_NUM_GPU_LAYERS=32 ollama run llama3.1:8b
   ```

2. **Use Q4_K_M instead of Q5/Q8** (20-30% speedup):
   - Smaller quantization = faster processing
   - 12GB VRAM can handle it easily

3. **Reduce context window if not needed**:
   ```python
   ollama.generate(
       model='llama3.1:8b',
       prompt=prompt,
       options={'num_ctx': 2048}  # Instead of default 4096
   )
   ```

</details>

### Section 2: Practical Skills (40 points)

**Task 1: Model Installation and Testing (10 points)**

Complete these steps and document the results:

```bash
# 1. Install two models
ollama pull llama3.1:8b-q4_k_m
ollama pull phi3:3.8b

# 2. Test both with the same prompt
echo "Compare these models on: 'Explain machine learning in 50 words'"

# 3. Measure performance
time ollama run llama3.1:8b-q4_k_m "Explain machine learning in 50 words"
time ollama run phi3:3.8b "Explain machine learning in 50 words"

# 4. Document:
# - Response quality comparison
# - Time taken for each
# - Which would you use when?
```

**Deliverable**: Screenshot or text output showing both results with timing.

**Task 2: Python Integration (15 points)**

Create a Python script that:
1. Accepts a user query
2. Automatically selects the best model (code vs general vs fast)
3. Streams the response
4. Tracks total generation time

```python
#!/usr/bin/env python3
"""
Smart AI query handler with automatic model selection.
"""

import ollama
import time
import sys

# YOUR CODE HERE

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python query.py 'your question here'")
        sys.exit(1)

    query = ' '.join(sys.argv[1:])
    # Implement the functionality
```

**Evaluation Criteria:**
- Correct model selection logic (5 pts)
- Streaming implementation (5 pts)
- Time tracking and display (3 pts)
- Code quality and error handling (2 pts)

**Task 3: Configuration Optimization (15 points)**

Given this scenario:
- Hardware: 32 GB RAM, AMD Ryzen 9 5950X (no GPU)
- Use case: Code review assistant for a development team
- Requirements: Good quality, reasonable speed, handle 8K token contexts

Design the optimal configuration:

1. Which model and quantization?
2. What Ollama environment variables?
3. What generation parameters?
4. Expected performance?

Write a configuration file and justify each choice.

**Template:**
```yaml
# config.yaml
model: "???"
quantization: "???"

environment:
  OLLAMA_NUM_THREAD: ???
  OLLAMA_NUM_KEEP: ???

generation_params:
  temperature: ???
  top_p: ???
  num_ctx: ???
  num_predict: ???

justification: |
  Model choice: ...
  Thread count: ...
  Parameters: ...
  Expected performance: ...
```

### Section 3: Problem Solving (30 points)

**Scenario 1: Troubleshooting (10 points)**

A user reports: "I installed Ollama and ran `ollama run llama3.1:8b` but it's extremely slow, taking 30+ seconds per response on a computer with RTX 4070."

Diagnose the issue and provide step-by-step troubleshooting:

<details>
<summary>Solution Approach</summary>

**Diagnosis Steps:**

1. **Verify GPU detection:**
   ```bash
   nvidia-smi  # Check GPU is detected
   ollama run llama3.1:8b "test"  # Should print "Using GPU: NVIDIA..."
   ```

2. **Check CUDA installation:**
   ```bash
   nvcc --version  # Verify CUDA toolkit
   ```

3. **Verify Ollama built with CUDA:**
   ```bash
   ollama --version
   # Reinstall if needed
   ```

4. **Check layer distribution:**
   ```bash
   OLLAMA_DEBUG=1 ollama run llama3.1:8b "test"
   # Look for GPU layer allocation
   ```

**Common causes:**
- Ollama not built with CUDA support → Reinstall
- Outdated NVIDIA drivers → Update drivers
- Insufficient VRAM → Check other applications using GPU
- CPU-only mode enabled → Check environment variables

**Fix:**
```bash
# Reinstall Ollama with GPU support
curl -fsSL https://ollama.ai/install.sh | sh

# Verify GPU usage
OLLAMA_DEBUG=1 ollama run llama3.1:8b "test"
```

</details>

**Scenario 2: Architecture Design (10 points)**

Design a system for a small business that needs:
- Customer support chatbot (handles 50-100 queries/day)
- Document Q&A (search company policies, ~500 pages)
- Code generation for internal scripts
- Must run on-premises for data security
- Budget: $3,000 for hardware

Specify:
1. Hardware configuration
2. Model selection for each use case
3. System architecture diagram
4. Deployment approach

<details>
<summary>Sample Solution</summary>

**Hardware: $2,800**
- Dell PowerEdge T340 Server: $1,500
  - Xeon E-2288G (8 cores)
  - 64 GB RAM
- NVIDIA RTX 4060 Ti (16 GB): $600
- 2TB NVMe SSD: $150
- UPS Battery backup: $200
- Monitoring/misc: $350

**Models:**
- Support chatbot: `llama3.1:8b-q4_k_m` (general purpose, good quality)
- Document Q&A: `llama3.1:8b-q4_k_m` + ChromaDB for RAG
- Code generation: `qwen2.5-coder:7b-q4_k_m`

**Architecture:**
```
┌─────────────────┐
│   Web Frontend  │
└────────┬────────┘
         │
┌────────▼────────┐
│  FastAPI Server │
│  - Routing      │
│  - Auth         │
│  - Rate Limit   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Router  │
    └────┬─────┘
         │
   ┌─────┴─────┬─────────┐
   │           │         │
┌──▼───┐  ┌───▼────┐ ┌──▼────┐
│Chat  │  │Doc Q&A │ │Code   │
│Model │  │+ RAG   │ │Model  │
└──────┘  └────────┘ └───────┘
```

**Deployment:**
- Docker containers for isolation
- Nginx reverse proxy
- Systemd for auto-restart
- Prometheus + Grafana monitoring
- Daily backups to network storage

**Cost breakdown justifies $3K budget with room for expansion**

</details>

**Scenario 3: Ethical Considerations (10 points)**

Your company wants to use a local AI model fine-tuned on customer support conversations to improve response quality. Discuss:

1. Privacy implications
2. Potential biases
3. Transparency requirements
4. Mitigation strategies

**Expected elements:**
- Data anonymization approaches
- Bias detection methods
- User disclosure policies
- Model evaluation criteria

<details>
<summary>Sample Answer</summary>

**Privacy Implications:**
- Fine-tuning on actual conversations risks embedding personal information in model weights
- Even local models can "memorize" sensitive data
- Need secure storage and access controls

**Mitigation:**
1. **Data Anonymization:**
   - Remove PII before training
   - Use differential privacy techniques
   - Aggregate similar queries
   - Regular security audits

2. **Bias Detection:**
   - Test on diverse demographic groups
   - Monitor for discriminatory responses
   - A/B testing against baseline
   - Regular bias audits

3. **Transparency:**
   - Disclose AI usage to customers
   - Provide opt-out mechanisms
   - Document training data sources
   - Explain decision-making process

4. **Governance:**
   - Ethical review board
   - Regular model updates
   - Incident response plan
   - User feedback integration

**Key principle: Local doesn't mean unaccountable**

</details>

## Practical Exam (Optional, 40 points)

Build a complete application that demonstrates your local AI skills.

### Requirements:

1. **Multi-Model System** (15 points)
   - Support at least 2 different models
   - Automatic model selection based on query type
   - Show model switching in UI

2. **User Interface** (10 points)
   - Clean, functional UI (web or CLI)
   - Real-time streaming responses
   - Error handling

3. **Performance** (10 points)
   - Response time < 5 seconds for typical queries
   - Efficient resource usage
   - Proper cleanup

4. **Documentation** (5 points)
   - Setup instructions
   - Architecture explanation
   - API documentation (if applicable)

### Evaluation Rubric:

| Criteria | Excellent (100%) | Good (75%) | Acceptable (50%) | Poor (25%) |
|----------|-----------------|------------|------------------|------------|
| Functionality | All features work perfectly | Minor bugs | Some features broken | Mostly broken |
| Code Quality | Clean, well-organized, commented | Mostly clean | Messy but functional | Hard to understand |
| Performance | Fast, efficient | Acceptable speed | Slow but works | Very slow/crashes |
| UX | Intuitive, polished | Functional | Confusing but usable | Poor experience |
| Documentation | Comprehensive, clear | Adequate | Minimal | Missing/unclear |

## Certification Criteria

To earn the **Local AI Practitioner Certificate**, you must:

- [ ] Score 70% or higher on conceptual questions
- [ ] Complete all practical tasks successfully
- [ ] Pass the problem-solving scenarios
- [ ] (Optional) Build and present the practical exam project

**Mastery Level:**
- 90-100%: Expert - Ready for production deployments
- 80-89%: Advanced - Can handle complex scenarios
- 70-79%: Proficient - Solid foundation
- Below 70%: Review material and retry

## Self-Assessment Checklist

After completing this module, you should be able to:

**Concepts:**
- [ ] Explain how LLMs work at a high level
- [ ] Understand quantization and its trade-offs
- [ ] Choose appropriate models for different use cases
- [ ] Optimize for different hardware configurations
- [ ] Evaluate privacy and security implications

**Technical Skills:**
- [ ] Install and configure Ollama
- [ ] Run models from command line
- [ ] Integrate local AI into Python applications
- [ ] Implement streaming responses
- [ ] Monitor and optimize performance

**Problem Solving:**
- [ ] Troubleshoot common issues
- [ ] Design local AI systems for specific requirements
- [ ] Make informed hardware purchasing decisions
- [ ] Balance performance, quality, and resource constraints

**Advanced:**
- [ ] Build multi-model routing systems
- [ ] Implement session management
- [ ] Create production-ready APIs
- [ ] Deploy with proper monitoring and logging

## Next Steps

Based on your performance:

**If you scored 90%+:**
- Move to advanced topics (fine-tuning, RAG systems)
- Explore model merging and custom training
- Contribute to open-source AI tools

**If you scored 70-89%:**
- Review weak areas
- Build more projects for practice
- Explore real-world use cases

**If you scored below 70%:**
- Re-review concepts that were unclear
- Practice with hands-on exercises again
- Seek additional resources or mentoring

---

## Navigation
- Previous: [Project](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Module Overview](README.md)

## Submit Your Work

If this is a formal course, submit:
1. Answers to conceptual questions
2. Code for practical tasks
3. Configuration files and justifications
4. (Optional) Practical exam project with documentation

**Submission format:** Create a GitHub repository or ZIP file with:
```
submission/
├── theory_answers.md
├── practical_tasks/
│   ├── task1_output.txt
│   ├── task2_query.py
│   └── task3_config.yaml
├── project/ (if applicable)
└── README.md (self-assessment)
```
