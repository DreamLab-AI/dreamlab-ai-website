# Learning Objectives — Module 09: Local AI Models

## Workshop Overview

Run AI models on your own hardware — private, free, and fully under your control. By the end of this 3-hour morning session you will have Ollama installed, multiple models downloaded, and a working local AI assistant that operates without any internet connection.

## Primary Learning Outcomes

By the end of this workshop, you will be able to:

### 1. Installation and Configuration (Core Skills)

**You will be able to:**
- Install Ollama on Windows, macOS, or Linux in under five minutes
- Download models from the Ollama library with a single command
- Verify that GPU acceleration is active (NVIDIA CUDA or Apple Metal)
- List, inspect, and remove installed models
- Start and stop the Ollama API server
- Install LM Studio as a graphical alternative

**Success Criteria:**
- Ollama runs and reports its version
- At least two models downloaded (e.g. Llama 3.3 8B and Phi-3)
- `ollama list` shows correct model sizes
- `curl http://localhost:11434/api/version` returns a response

### 2. Model Selection and Understanding

**You will be able to:**
- Name the major open-weight model families (Llama, Mistral, Qwen, Phi, DeepSeek, Gemma)
- Explain the GGUF format and common quantisation levels (Q4_K_M, Q5_K_M, Q8_0)
- Estimate memory requirements for a given model size and quantisation
- Choose an appropriate model for a specific task (general chat, coding, reasoning, lightweight)
- Articulate the trade-offs between model size, quality, and speed

**Success Criteria:**
- Can explain why Q4_K_M is the default recommendation
- Can calculate approximate VRAM needed for a 7B model at Q4 vs Q8
- Can recommend a model for three different real-world scenarios

### 3. Running and Interacting with Models

**You will be able to:**
- Chat with a model interactively in the terminal (`ollama run`)
- Send requests to the Ollama REST API using `curl`
- Write a Python script that queries Ollama and prints the response
- Stream tokens in real time from the API
- Use the OpenAI-compatible endpoint so existing OpenAI code works locally

**Success Criteria:**
- Completed an interactive chat session and exited cleanly
- Made a successful `curl` request to the generate endpoint
- Ran a Python script that prints a model's response
- Demonstrated streaming output in the terminal

### 4. Performance Benchmarking and Optimisation

**You will be able to:**
- Measure tokens per second for a given model on your hardware
- Compare inference speed across two or more models
- Adjust generation parameters: temperature, top-p, top-k, context length
- Explain how GPU offloading, quantisation level, and context window affect speed
- Identify bottlenecks (VRAM limits, CPU fallback, thermal throttling)

**Success Criteria:**
- Ran the benchmark script and recorded tokens/second for at least one model
- Can explain the effect of raising temperature from 0.1 to 1.5
- Can describe one concrete optimisation step for your hardware

### 5. Integration and Practical Application

**You will be able to:**
- Integrate Ollama into a LangChain chain (prompt template, conversation memory)
- Configure Continue.dev in VS Code to use a local model for code assistance
- Build a simple multi-model router that directs queries to the best model
- Understand how LocalAI provides an OpenAI-compatible drop-in server
- Explain when local AI is preferable to cloud AI and vice versa

**Success Criteria:**
- LangChain conversation chain works with Ollama backend
- VS Code autocomplete or chat uses a local model
- Can articulate three scenarios where local AI wins and one where cloud AI is better

## Detailed Skill Breakdown

### Beginner Level (First Hour)

**Knowledge:**
- [ ] Understand what "local AI" means and why it matters
- [ ] Know the names of three model families and their rough sizes
- [ ] Recognise the GGUF file format and what quantisation numbers mean
- [ ] Understand minimum hardware requirements (RAM, VRAM, disk)
- [ ] Know the privacy and cost advantages over cloud APIs

**Skills:**
- [ ] Install Ollama from the command line
- [ ] Download a model with `ollama pull`
- [ ] Start an interactive chat with `ollama run`
- [ ] Exit a chat session with `/bye`
- [ ] List installed models with `ollama list`

**Mindset:**
- [ ] Confidence that local AI is accessible, not just for experts
- [ ] Willingness to wait for model downloads (patience with large files)
- [ ] Curiosity about what different models can do

### Intermediate Level (Second Hour)

**Knowledge:**
- [ ] Understand the Ollama REST API endpoints (generate, chat, embeddings)
- [ ] Know how temperature, top-p, and context length affect output
- [ ] Understand the OpenAI compatibility layer
- [ ] Recognise when a model is running on GPU vs CPU
- [ ] Know the difference between Ollama, LM Studio, and llama.cpp

**Skills:**
- [ ] Query the API with `curl` and with Python `requests`
- [ ] Stream responses token by token
- [ ] Benchmark a model and record tokens per second
- [ ] Compare two models on the same prompt
- [ ] Adjust generation parameters and observe the effect

**Mindset:**
- [ ] Comfort with experimenting and comparing results
- [ ] Strategic thinking about which model fits which task
- [ ] Appreciation for measurable performance data

### Advanced Level (Third Hour)

**Knowledge:**
- [ ] Understand model routing: sending different queries to different models
- [ ] Know how to create a Modelfile for custom system prompts
- [ ] Understand session management and conversation history
- [ ] Grasp the architecture of a local AI assistant application
- [ ] Recognise ethical considerations of local AI deployment

**Skills:**
- [ ] Build a LangChain chain backed by Ollama
- [ ] Configure VS Code with Continue.dev for local code assistance
- [ ] Run the local AI assistant project (FastAPI + web UI)
- [ ] Troubleshoot common issues (GPU not detected, out of memory, slow inference)
- [ ] Evaluate output quality across models for a realistic task

**Mindset:**
- [ ] Confidence to deploy local AI for real work tasks
- [ ] Ability to advise colleagues on model and hardware choices
- [ ] Forward-looking awareness of the local AI ecosystem's trajectory

## Profession-Specific Objectives

### For Healthcare and Legal Professionals

**You will be able to:**
- Run AI analysis on sensitive documents without data leaving your premises
- Explain the compliance advantages to stakeholders (GDPR, HIPAA)
- Set up an air-gapped AI environment for maximum security
- Choose models that balance quality with strict privacy requirements

### For Researchers and Academics

**You will be able to:**
- Pin exact model versions for reproducible experiments
- Benchmark models systematically and record results
- Process research texts locally without sharing unpublished work
- Evaluate open-weight models for domain-specific tasks

### For Business and Operations Teams

**You will be able to:**
- Calculate the total cost of ownership for local AI vs cloud subscriptions
- Propose a hardware budget for a team-scale local AI deployment
- Demonstrate working prototypes to decision-makers
- Identify use cases with the highest return on investment

### For Educators and Trainers

**You will be able to:**
- Set up AI assistants that work offline in classrooms without reliable internet
- Explain model behaviour to non-technical learners
- Create demonstration environments for AI literacy courses
- Manage multiple models on a single machine for varied teaching scenarios

## Assessment Criteria

### Knowledge Assessment (30 points)

**You will demonstrate understanding of:**
- Model architecture and quantisation trade-offs (10 points)
- Hardware selection and performance expectations (5 points)
- Privacy and compliance advantages (5 points)
- Model selection for different tasks (5 points)
- Performance optimisation strategies (5 points)

### Practical Skills (40 points)

**You will successfully:**
- Install Ollama and download models (10 points)
- Write a Python script with model selection and streaming (15 points)
- Design an optimal configuration for a given hardware scenario (15 points)

### Problem Solving (30 points)

**You will:**
- Troubleshoot a slow-inference scenario (10 points)
- Design a local AI system for a small business (10 points)
- Discuss ethical considerations of local AI deployment (10 points)

**Passing Score:** 70/100 (70%)

## Success Indicators

### Immediate (End of Workshop)

- [ ] Ollama installed and GPU acceleration verified
- [ ] At least two models downloaded and tested
- [ ] Python API integration working
- [ ] Benchmark results recorded for your hardware
- [ ] Local AI assistant project running

### Short-term (1 Week)

- [ ] Using local AI for real work tasks (drafting, summarising, coding)
- [ ] Explored at least one additional model family
- [ ] Shared local AI capabilities with a colleague
- [ ] Configured VS Code with a local model for daily use

### Long-term (1 Month)

- [ ] Established a personal model library tailored to your tasks
- [ ] Made an informed hardware upgrade decision (if needed)
- [ ] Integrated local AI into a repeatable professional workflow
- [ ] Contributing to or following the local AI community (r/LocalLLaMA, Ollama Discord)

## Measuring Success

### Quantitative Metrics

**Track these numbers:**
- Models installed and tested: ___
- Tokens per second on your hardware: ___
- Time to generate a 200-word summary: ___ seconds
- API integration scripts written: ___
- Colleagues introduced to local AI: ___

### Qualitative Indicators

**Assess these factors:**
- Confidence running models locally (1-10): ___
- Understanding of model trade-offs (1-10): ___
- Ability to choose the right model for a task (1-10): ___
- Comfort with the command line and API (1-10): ___

## Ready to Begin?

These objectives represent a fundamental shift in how you interact with AI — from renting intelligence in the cloud to owning it on your own hardware. By the end of today, you will have the knowledge and tools to run AI privately, freely, and on your own terms.

**Let's get started.**

---

[Begin Workshop →](./00_introduction.md) | [Check Prerequisites](./prerequisites.md) | [Back to Overview](README.md)
