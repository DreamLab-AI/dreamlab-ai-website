# Prerequisites -- RAG System Implementation

## Before You Begin

This afternoon session builds on the morning's Local AI Models workshop. Ensure you meet these requirements for a smooth experience.

## Required Prior Knowledge

### From the Morning Session

- Ollama installed and running on your machine
- At least one language model downloaded (`llama3.3:8b` recommended)
- Basic experience running commands in a terminal
- Understanding of what a language model does (generates text from a prompt)

### General Skills

- **Basic Python familiarity**: You do not need to be a programmer, but you should be comfortable running Python scripts and reading simple code. If you can understand what `for item in list: print(item)` does, you have enough.
- **Terminal / Command Line**: Ability to navigate directories, run scripts, and install packages with pip.
- **File management**: Comfortable creating folders, moving files, and working with text files.

### Helpful but Not Required

- Experience with Jupyter notebooks
- Familiarity with JSON data format
- Previous exposure to APIs (REST endpoints)
- Understanding of databases at a conceptual level

## Technical Requirements

### Hardware Specifications

**Minimum Requirements:**
- **Processor:** Dual-core CPU (2018 or newer)
- **RAM:** 8 GB minimum (16 GB recommended)
- **Storage:** 10 GB free disk space
  - ~5 GB for Python packages and embedding models
  - ~3 GB for the vector database
  - ~2 GB for working space
- **GPU:** Not required but helpful. Ollama uses GPU if available.

**Recommended Specifications:**
- **RAM:** 16 GB or more
- **Storage:** 20 GB free
- **GPU:** NVIDIA with 6+ GB VRAM (for faster embedding and generation)

### Operating System

**Supported:**
- Windows 10 or 11 (64-bit) with Python 3.10+
- macOS 12 (Monterey) or newer
- Ubuntu 20.04+, Debian 11+, Fedora 36+

**Administrator access** is required to install Python packages.

### Internet Connection

- **Required for setup:** Downloading Python packages (~500 MB)
- **Optional during workshop:** If using cloud embedding models (OpenAI)
- **Not needed:** Once local models and packages are installed, the entire RAG pipeline runs offline

## Software Prerequisites

### Must Be Installed Before This Session

**1. Python 3.10 or Later**

```bash
# Check your version
python3 --version
# Must show 3.10 or higher
```

If not installed:
- **Windows:** Download from [python.org](https://www.python.org/downloads/). Tick "Add Python to PATH" during installation.
- **macOS:** `brew install python` (via Homebrew) or download from python.org
- **Linux:** `sudo apt install python3 python3-pip python3-venv` (Debian/Ubuntu)

**2. Ollama**

```bash
# Check Ollama is running
ollama list
# Should show at least one model
```

If not installed, follow the morning session setup or visit [ollama.com](https://ollama.com).

**3. pip (Python Package Manager)**

```bash
# Verify pip
pip --version
# or
pip3 --version
```

### Installed During the Workshop

These are installed as part of the hands-on session -- no need to pre-install:
- ChromaDB (vector database)
- LangChain (RAG framework)
- Sentence Transformers (embedding models)
- PyPDF (PDF processing)

### Recommended Ollama Models

```bash
# Language model for generation (from morning session)
ollama pull llama3.3:8b

# Embedding model (optional, pull during workshop)
ollama pull nomic-embed-text
```

## Account Setup (Optional)

### For Cloud Embeddings

If you want to try OpenAI embeddings (not required -- local models work fine):

- **OpenAI Account**: [platform.openai.com](https://platform.openai.com)
  - API key required
  - Pay-as-you-go pricing
  - text-embedding-3-small costs approximately 0.02 USD per million tokens

### Not Required

- No paid subscriptions needed for the core workshop
- No cloud accounts needed -- everything runs locally
- No database servers -- ChromaDB runs in-process

## Document Preparation

### Bring Your Own Documents

The workshop is most valuable when you use your own documents. Prepare 5-10 files:

**Ideal document types:**
- Company policies or handbooks
- Project documentation or meeting notes
- Research papers or reports
- FAQs or knowledge base articles
- Product documentation or user guides

**Supported formats:**
- Markdown (.md)
- Plain text (.txt)
- PDF (.pdf)

**Document size guidelines:**
- Each document: 1-50 pages (or 500-50,000 words)
- Total collection: 5-100 documents for a good starting point
- Larger collections work but take longer to index

### If You Don't Have Documents

The workshop provides sample documents (company policies, project handbooks, annual reports). You can complete everything with these samples and add your own documents later.

## Pre-Session Checklist

### The Day Before

- [ ] Python 3.10+ installed and verified
- [ ] Ollama installed and running
- [ ] At least one Ollama model downloaded (`llama3.3:8b`)
- [ ] 10 GB free disk space confirmed
- [ ] 5-10 documents gathered (or plan to use workshop samples)
- [ ] Terminal / command line accessible

### 30 Minutes Before

- [ ] Ollama server is running (`ollama list` works)
- [ ] Python virtual environment can be created (`python3 -m venv test_env`)
- [ ] Internet connection stable (for pip install)
- [ ] Documents copied to a known folder
- [ ] Other resource-heavy applications closed (free up RAM)

## Troubleshooting Common Setup Issues

### "Python not found" or Wrong Version

```bash
# Try different Python commands
python --version
python3 --version
python3.11 --version

# On Windows, try:
py --version
py -3 --version
```

### "pip install fails" with Permission Error

```bash
# Use --user flag
pip install --user chromadb

# Or use a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows
pip install chromadb
```

### Ollama Not Responding

```bash
# Start the server manually
ollama serve

# Check if a model is loaded
ollama list

# If no models, download one
ollama pull llama3.3:8b
```

### Low Disk Space

- Remove unused Ollama models: `ollama rm <model-name>`
- Use a smaller model: `ollama pull phi3` (2.4 GB instead of 4.7 GB)
- Clear pip cache: `pip cache purge`

## Getting Help

### During the Workshop

1. Check this troubleshooting section first
2. Ask your workshop neighbour -- they may have seen the same issue
3. Raise your hand for facilitator help
4. Note the issue for the Q&A break

### After the Workshop

- Workshop Discord channel (pinned in your welcome email)
- Email: workshop@dreamlab.ai
- Office hours: Fridays 14:00-15:00 GMT
- Resources page: [06_resources.md](06_resources.md)

## FAQ

### "Do I need to know how to program?"

Not deeply. The workshop provides all code -- you copy, paste, and run it. Understanding basic Python syntax helps you customise the system, but is not required to complete the workshop.

### "Can I use my work laptop with restricted permissions?"

You need the ability to run `pip install` and `ollama`. If your IT department restricts software installation, ask them to pre-approve Python, pip, and Ollama before the session. Alternatively, bring a personal laptop.

### "What if I didn't attend the morning session?"

You can still follow along if you have Ollama and Python installed. The morning session covers local AI fundamentals -- review the [Local AI Models introduction](../workshop-03-morning-local-ai/00_introduction.md) if you need background.

### "How much does this cost?"

Nothing. All tools used in the core workshop are free and open source. Cloud embedding models (OpenAI) are optional and cost fractions of a penny per query.

---

[Proceed to Workshop -->](./00_introduction.md) | [Back to Module Overview](README.md)
