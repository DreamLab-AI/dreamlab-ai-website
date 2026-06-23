# Module 09: Local AI Models

## Run AI on Your Own Machine — Private, Free, and Fully Under Your Control

Welcome to the session that puts real AI power directly into your hands. Over the next 3 hours you will install, run, and compare large language models on your own hardware — no cloud accounts, no API keys, no recurring fees, and no data leaving your machine.

## Module Overview

This morning session takes you from "AI is a website I visit" to "AI is a tool running on my laptop." You will learn how local inference works, install the industry-standard Ollama runtime, explore models from Meta, Mistral, Microsoft and others, and build a simple AI assistant that works entirely offline.

## Learning Outcomes

By completing this module, you will:

### Core Capabilities
- Install and configure Ollama on Windows, macOS, or Linux
- Download and run open-weight models (Llama 3.3, Mistral, Phi-4, Qwen 2.5, DeepSeek-R1)
- Understand quantisation formats (GGUF) and choose the right size for your hardware
- Interact with models through the terminal, the REST API, and Python scripts
- Compare model performance, quality, and speed on your own machine

### Professional Skills
- Evaluate the privacy, cost, and compliance advantages of local inference
- Match model families and sizes to real-world tasks
- Tune generation parameters (temperature, top-p, context length)
- Integrate local AI into existing workflows via the OpenAI-compatible API
- Set up a graphical alternative (LM Studio) for team members who prefer a GUI

### Immediate Benefits
- Run an AI chat session without internet access
- Benchmark models on your hardware and know exactly what to expect
- Build a working local AI assistant you can keep using after the workshop
- Make informed purchasing decisions about GPUs and Apple Silicon upgrades

## Module Structure

### Chapter Navigation

1. **[Introduction](00_introduction.md)** — Why Local AI Matters (15 min)
   - Privacy, cost, and offline advantages
   - The 2026 model landscape: families, formats, hardware
   - What you will build today

2. **[Core Concepts](01_concepts.md)** — How Local Inference Works (30 min)
   - GGUF format and quantisation levels
   - Hardware requirements: GPU, CPU, Apple Silicon
   - Model selection guide for every budget
   - Tool comparison: Ollama, LM Studio, llama.cpp, LocalAI, MLX

3. **[Hands-On Setup](02_hands_on.md)** — Install and Run Models (60 min)
   - Step-by-step Ollama installation
   - Downloading and chatting with your first model
   - REST API and Python integration
   - Performance benchmarking
   - LangChain chains and VS Code extensions

4. **[Practical Exercises](03_exercises.md)** — Test Your Skills (30 min)
   - Five progressive exercises from first chat to multi-model routing
   - Timed challenges with clear success criteria
   - Reflection prompts to connect learning to your own work

5. **[Build Project](04_project.md)** — Local AI Assistant Application (45 min)
   - Multi-model FastAPI backend with smart routing
   - Web-based chat and code-assistance interface
   - Session management with SQLite persistence
   - Full source code you can extend

6. **[Assessment](05_assessment.md)** — Validate Your Mastery (15 min)
   - Conceptual questions on architecture and trade-offs
   - Practical tasks: installation, Python integration, configuration
   - Problem-solving scenarios: troubleshooting, system design, ethics

7. **[Resources](06_resources.md)** — Continue Your Journey
   - Official documentation and model sources
   - Hardware buying guides and benchmark data
   - Communities, papers, and advanced topics

## Who This Module Is For

### Perfect For:
- **Privacy-conscious professionals** who cannot send data to cloud services
- **Researchers and academics** who need reproducible AI experiments
- **Business leaders** evaluating on-premises AI for their organisation
- **Hobbyists and tinkerers** who want to understand how LLMs actually run
- **Anyone** curious about running AI without a subscription

### You Will Succeed If You:
- Can install software on your computer
- Are comfortable typing commands in a terminal (or willing to learn)
- Have a computer with at least 16 GB of RAM
- Have 50 GB of free disk space for model files
- Are open to experimenting and observing results

### No Experience Required In:
- Machine learning or data science
- Programming (Python basics are helpful but not essential)
- GPU hardware or driver configuration
- Prior use of AI tools

## Technical Requirements

### Minimum System Requirements
- **Operating System:** Windows 10+, macOS 12+, or a modern Linux distribution
- **RAM:** 16 GB (8 GB will work for the smallest models only)
- **Storage:** 50 GB free disk space
- **Internet:** Required for initial model downloads; offline thereafter
- **Python:** 3.8 or newer (for API exercises)

### Recommended for Best Experience
- **RAM:** 32 GB or more
- **GPU:** NVIDIA with 8+ GB VRAM, or Apple M1 Pro / M2 / M3 / M4 with 16+ GB unified memory
- **Storage:** SSD with 100 GB free

### Software Installed During Workshop
- Ollama (free, open source)
- Python packages: `requests`, `openai`, `ollama`, `langchain` (all free)
- LM Studio (free, optional GUI alternative)

## Learning Approach

### Teaching Philosophy
- **Hands-on first:** Every concept is immediately practised on your own machine
- **Real hardware, real results:** Performance numbers come from your computer, not a slide deck
- **Profession-agnostic:** Whether you are a solicitor, nurse, teacher, or engineer, local AI serves you
- **No fluff:** Direct, practical, results-focused

### Module Timing
- **Total Duration:** 3 hours (morning half-day)
- **Format:** Self-paced with suggested timings
- **Breaks:** Coffee break at the midpoint (10:30-11:00)
- **Practice:** 70% hands-on, 30% concepts

## Quick Readiness Check

- [ ] Computer with 16+ GB RAM and 50 GB free space
- [ ] Administrator access to install software
- [ ] Python 3.8+ installed (run `python3 --version` to verify)
- [ ] Basic comfort with the command line (or willingness to follow along)
- [ ] 3 hours of focused time blocked in your calendar

### Begin

**[Start with the Introduction →](00_introduction.md)**

Or jump directly to:
- [Core Concepts](01_concepts.md) — Understand the fundamentals
- [Hands-On Setup](02_hands_on.md) — Start installing immediately
- [Check Prerequisites](prerequisites.md) — Ensure you are ready

## Support

- **Questions?** Use the workshop Discord channel
- **Stuck?** Reference the [troubleshooting section](02_hands_on.md#troubleshooting-guide)
- **Share success:** Post your benchmark results in #module-09-wins

---

**[Start Module 09: Introduction →](00_introduction.md)**
