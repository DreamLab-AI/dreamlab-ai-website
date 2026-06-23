# Prerequisites — Module 09: Local AI Models

## Before You Begin

This workshop puts real AI models on your own machine. The hardware and software requirements are more demanding than a typical software workshop because language models need significant memory and disk space. Read through this page carefully and complete the checklist at the bottom before the session begins.

## Required Knowledge

### Essential Skills
- **Basic computer literacy**
  - Can install software and follow on-screen instructions
  - Comfortable navigating files and folders
  - Can open a terminal or command prompt (we will guide you through the rest)

- **Basic command-line familiarity**
  - Can type a command and press Enter
  - Can copy and paste commands from instructions
  - Knows how to navigate to a folder (`cd`)
  - If you completed Module 05 (VS Code Setup), you have more than enough

- **No AI or machine-learning experience required**
  - We explain every concept from first principles
  - You do not need to know how neural networks work
  - Prior use of ChatGPT or similar tools is helpful but not essential

### Helpful (But Not Required)
- Basic Python knowledge (variables, functions, running a script)
- Experience with VS Code from earlier workshop modules
- Familiarity with JSON format
- Understanding of what an API is

## Hardware Requirements

### Minimum Specifications

| Component | Requirement | Notes |
|-----------|------------|-------|
| **RAM** | 16 GB | Absolute minimum for 7B-parameter models at Q4 |
| **Free disk space** | 50 GB | Each model is 2-8 GB; you will download several |
| **CPU** | Intel i5 / AMD Ryzen 5 (2018+) or Apple M1 | Older CPUs work but inference will be slow |
| **Operating system** | Windows 10+, macOS 12+, or modern Linux | 64-bit only |
| **Internet** | Required for initial setup | Model downloads are 2-8 GB each |

### Recommended Specifications

| Component | Recommendation | Why |
|-----------|---------------|-----|
| **RAM** | 32 GB or more | Comfortably run 13B models; OS and other apps have room |
| **GPU** | NVIDIA RTX 3060+ (12 GB VRAM) | 10-50x faster inference than CPU alone |
| **Apple Silicon** | M1 Pro / M2 / M3 / M4 with 16+ GB unified memory | Excellent local AI performance out of the box |
| **Free disk space** | 100 GB+ SSD | Room for multiple models and quantisation variants |
| **Internet** | 20+ Mbps | Faster model downloads; not needed after setup |

### What If My Hardware Is Below Minimum?

- **8 GB RAM:** You can still participate using the smallest models (Phi-3 at 3.8B, Llama 3.2 at 1B/3B). Performance will be limited but the concepts still apply.
- **No dedicated GPU:** CPU-only inference works. Expect 2-5 tokens per second on a 7B model. This is slow but functional for learning.
- **Limited disk space:** Download only one model (Llama 3.3 8B Q4_K_M at ~4.7 GB) and follow along with the multi-model exercises conceptually.
- **Older CPU:** The workshop will still run; benchmarking exercises will simply show lower numbers.

### Hardware Check Commands

Run these before the workshop to know your starting point:

```bash
# Check RAM (Linux)
free -h

# Check RAM (macOS)
system_profiler SPHardwareDataType | grep Memory

# Check RAM (Windows PowerShell)
Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum

# Check free disk space
df -h          # Linux/macOS
Get-PSDrive C  # Windows PowerShell

# Check GPU (NVIDIA only)
nvidia-smi

# Check Python version
python3 --version
```

## Software Prerequisites

### Must Install Before the Workshop

**1. Python 3.8 or newer**
- Download from [python.org](https://www.python.org/downloads/) if not already installed
- Verify: `python3 --version` (or `python --version` on Windows)
- We use Python for API integration exercises

**2. A text editor or IDE**
- VS Code is recommended (especially if you completed Module 05)
- Any editor that can open `.py` and `.md` files will do

**3. A terminal / command prompt**
- **macOS:** Terminal.app or iTerm2
- **Windows:** PowerShell or Windows Terminal
- **Linux:** Your distribution's default terminal

### Will Install During the Workshop

We will install these together, step by step:
- **Ollama** — the primary local AI runtime (free, open source)
- **Python packages** — `requests`, `openai`, `ollama`, `langchain`, `langchain-community`
- **LM Studio** (optional) — graphical interface for those who prefer a GUI

### NVIDIA GPU Drivers (If Applicable)

If you have an NVIDIA GPU, ensure your drivers are up to date before the workshop:

1. Check current driver: `nvidia-smi` (top line shows driver version)
2. Update from [nvidia.com/drivers](https://www.nvidia.com/Download/index.aspx)
3. After updating, restart your computer and verify with `nvidia-smi` again

Ollama automatically detects and uses NVIDIA GPUs via CUDA. No separate CUDA toolkit installation is required.

### Apple Silicon (M1/M2/M3/M4)

No additional drivers needed. Ollama uses Metal acceleration automatically. Ensure your macOS is version 12 (Monterey) or newer.

## Account Setup

### No Accounts Required

This is a local AI workshop. You do not need:
- An OpenAI account
- An Anthropic account
- A Hugging Face account
- Any cloud AI subscription

Everything runs on your machine. The only internet access needed is to download model files during setup.

### Optional (For Extended Learning)

- **Hugging Face account** (free) — for browsing and downloading additional GGUF models
- **GitHub account** (free) — if you want to version-control your project work

## Project Preparation

### What to Have Ready

**A real use case in mind.** Think about a task where you would like AI assistance but cannot (or prefer not to) send data to the cloud:
- Summarising confidential documents
- Drafting text for internal reports
- Reviewing code from a private repository
- Generating ideas without usage tracking

**A folder for workshop files:**

```
Documents/
  └── local-ai-workshop/
      ├── scripts/        # Python files from exercises
      ├── benchmarks/     # Performance results
      └── project/        # Your AI assistant project
```

Create this structure before the session so you have a clean workspace.

## Pre-Workshop Checklist

### One Week Before

- [ ] Verify your computer meets the minimum hardware requirements
- [ ] Check available disk space (at least 50 GB free)
- [ ] Update NVIDIA GPU drivers (if applicable)
- [ ] Install Python 3.8+ and verify with `python3 --version`
- [ ] Install or update VS Code (if using it)

### One Day Before

- [ ] Run the hardware check commands above and note your specs
- [ ] Create the workshop folder structure
- [ ] Ensure you have administrator/sudo access to install software
- [ ] Identify your real use case for local AI
- [ ] Clear 3 hours in your calendar

### One Hour Before

- [ ] Close unnecessary applications (free up RAM)
- [ ] Connect to a reliable internet connection
- [ ] Charge your laptop fully (or plug in)
- [ ] Open a terminal and verify Python works
- [ ] Have this workshop page open and ready

## What to Expect

### This Workshop IS:
- Hands-on and practical — you will run real models on your machine
- Self-paced with suggested timings
- Suitable for people without AI or programming backgrounds
- Focused on tools you can keep using after the session
- Respectful of your hardware limitations

### This Workshop IS NOT:
- A deep-dive into neural network theory
- Dependent on cloud services or paid subscriptions
- A programming course (Python is used lightly for API calls)
- Requiring a powerful GPU — CPU-only setups are supported

### Time Commitment

**Workshop Duration:** 3 hours

**Schedule:**
- 09:00-09:30 — Introduction and core concepts
- 09:30-10:30 — Hands-on installation and first models
- 10:30-11:00 — Coffee break and model exploration
- 11:00-12:00 — Project build and assessment

**Post-Workshop:**
- 30 minutes: Explore additional models
- 1 week: Apply local AI to your real work
- 1 month: Build expertise through daily use

## Getting Help

### During the Workshop

1. Check the [troubleshooting section](02_hands_on.md#troubleshooting-guide) first
2. Ask in the workshop Discord channel
3. Note the issue for the office-hours session

### Common Setup Issues

| Issue | Likely Cause | Quick Fix |
|-------|-------------|-----------|
| `ollama: command not found` | Installer did not add to PATH | Restart your terminal; on Linux, run the install script again |
| Model download stalls | Unstable internet | Retry with `ollama pull <model>` (it resumes) |
| Very slow inference | GPU not detected | Run `nvidia-smi` to check; ensure drivers are current |
| "Out of memory" error | Model too large for available RAM | Switch to a smaller model (`phi3` or `llama3.2:3b`) |
| Python `ModuleNotFoundError` | Package not installed | Run `pip install <package>` |

### After the Workshop

- **Documentation:** [Resources page](06_resources.md)
- **Community:** r/LocalLLaMA on Reddit, Ollama Discord server
- **Office Hours:** Fridays 2-3pm GMT

## Accessibility

### Accommodations Available

- All exercises have both command-line and GUI (LM Studio) paths
- Screen-reader compatible terminal instructions
- High-contrast themes available in VS Code and LM Studio
- Adjustable font sizes in all tools
- All content available as text (no video-only instructions)

**Request Accommodations:**
- Email: accessibility@dreamlab.ai
- 48 hours notice preferred

## FAQ

### "My computer only has 8 GB of RAM. Can I still participate?"
Yes. You will be limited to the smallest models (Phi-3 at 3.8B, Llama 3.2 at 1B), but all the core concepts and workflow steps apply. You will still install Ollama, run a model, and use the API.

### "Do I need a GPU?"
No. A GPU dramatically improves speed (10-50x), but CPU inference works and is sufficient for learning. Many Apple Silicon Macs deliver excellent performance without a discrete GPU.

### "How much internet data will this use?"
Expect to download 10-20 GB of model files during the workshop. After that, everything runs offline.

### "Can I use a Chromebook or tablet?"
Not for this workshop. Ollama requires a full desktop operating system (Windows, macOS, or Linux).

### "I am on a corporate laptop with restricted install permissions."
Contact your IT department before the workshop to request permission to install Ollama and Python packages. Alternatively, ask about using a personal device.

### "Will the models I download still work after the workshop?"
Absolutely. Everything stays on your machine. You can keep using Ollama and your downloaded models indefinitely at no cost.

---

[Proceed to Workshop →](./00_introduction.md) | [Back to Module Overview](README.md)
