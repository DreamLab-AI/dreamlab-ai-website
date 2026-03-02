# Hands-On Practice: Setting Up Local AI

## Overview

This hands-on session walks you through installing, configuring, and using local AI models. You'll compare different tools and measure real performance.

---

## Exercise 1: Install Ollama (15 minutes)

### Difficulty: ⭐ Beginner

### Objective
Install Ollama and download your first local model.

### Steps

**1. Install Ollama**

```bash
# Linux/macOS
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
```

> **Windows**: Download installer from [ollama.com/download](https://ollama.com/download)

**2. Download a Model**

```bash
# Small, fast model (recommended first)
ollama pull llama3.3:8b

# Check download progress
# Model size: ~4.7GB
```

**3. Run Interactive Chat**

```bash
# Start chatting
ollama run llama3.3:8b

# Try these prompts:
# - "Explain how transformers work in simple terms"
# - "Write a Python function to calculate fibonacci numbers"
# - "What are the benefits of local AI models?"

# Exit with /bye
```

**4. List Installed Models**

```bash
ollama list
```

### Expected Output

```
NAME              ID              SIZE    MODIFIED
llama3.3:8b      abc123def456    4.7 GB  2 minutes ago
```

### Troubleshooting

**GPU Not Detected:**
```bash
# Check CUDA availability
nvidia-smi

# Ollama logs
journalctl -u ollama -f
```

**Slow Download:**
- Use mirror if available
- Check network connection
- Download smaller model first (phi3)

---

## Exercise 2: Ollama API Usage (20 minutes)

### Difficulty: ⭐⭐ Intermediate

### Objective
Interact with Ollama through its REST API and Python SDK.

### Steps

**1. Start API Server**

```bash
# Server runs automatically, verify:
curl http://localhost:11434/api/version
```

**2. Simple API Call**

```python
# simple_api.py
import requests
import json

def query_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "llama3.3:8b",
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(url, json=data)
    return response.json()['response']

# Test
result = query_ollama("What is machine learning?")
print(result)
```

**3. Streaming Responses**

```python
# streaming_api.py
import requests
import json

def stream_ollama(prompt):
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "llama3.3:8b",
        "prompt": prompt,
        "stream": True
    }

    with requests.post(url, json=data, stream=True) as response:
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line)
                if not chunk.get('done'):
                    print(chunk['response'], end='', flush=True)

# Test
stream_ollama("Explain quantum computing")
```

**4. OpenAI SDK Compatibility**

```python
# openai_compatible.py
from openai import OpenAI

# Point to Ollama
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # Required but not used
)

response = client.chat.completions.create(
    model="llama3.3:8b",
    messages=[
        {"role": "system", "content": "You are a helpful AI assistant."},
        {"role": "user", "content": "Explain RAG in one paragraph."}
    ]
)

print(response.choices[0].message.content)
```

### Expected Output

```
RAG (Retrieval-Augmented Generation) is an AI technique that enhances
language models by combining them with external knowledge retrieval...
```

---

## Exercise 3: Performance Benchmarking (15 minutes)

### Difficulty: ⭐⭐ Intermediate

### Objective
Measure inference speed and compare different models.

### Steps

**1. Create Benchmark Script**

```python
# benchmark.py
import time
import requests
import json

def benchmark_model(model_name, prompt, iterations=5):
    url = "http://localhost:11434/api/generate"

    times = []
    tokens_per_second = []

    for i in range(iterations):
        start = time.time()

        data = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }

        response = requests.post(url, json=data)
        result = response.json()

        elapsed = time.time() - start
        times.append(elapsed)

        # Calculate tokens/second
        tokens = result.get('eval_count', 0)
        if tokens > 0:
            tps = tokens / elapsed
            tokens_per_second.append(tps)

    return {
        'model': model_name,
        'avg_time': sum(times) / len(times),
        'avg_tokens_per_sec': sum(tokens_per_second) / len(tokens_per_second) if tokens_per_second else 0,
        'iterations': iterations
    }

# Test different models
prompt = "Explain the concept of neural networks in 100 words."

# Benchmark
results = [
    benchmark_model("llama3.3:8b", prompt),
    # Add more models if you've downloaded them
    # benchmark_model("mistral", prompt),
    # benchmark_model("phi3", prompt),
]

# Print results
for result in results:
    print(f"\n{result['model']}:")
    print(f"  Average time: {result['avg_time']:.2f}s")
    print(f"  Tokens/second: {result['avg_tokens_per_sec']:.1f}")
```

**2. Run Benchmark**

```bash
python benchmark.py
```

**3. Compare Results**

Expected performance on RTX 4070:
```
llama3.3:8b:
  Average time: 2.34s
  Tokens/second: 42.5

mistral:
  Average time: 1.87s
  Tokens/second: 53.2
```

---

## Exercise 4: LangChain Integration (20 minutes)

### Difficulty: ⭐⭐ Intermediate

### Objective
Integrate Ollama with LangChain for advanced workflows.

### Steps

**1. Install Dependencies**

```bash
pip install langchain langchain-community
```

**2. Basic Chain**

```python
# langchain_basic.py
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

# Initialize Ollama LLM
llm = Ollama(model="llama3.3:8b")

# Create prompt template
prompt = PromptTemplate(
    input_variables=["language", "task"],
    template="Write a {language} function that {task}. Include comments."
)

# Create chain
chain = LLMChain(llm=llm, prompt=prompt)

# Run
result = chain.run(language="Python", task="sorts a list using quicksort")
print(result)
```

**3. Conversation Memory**

```python
# langchain_memory.py
from langchain_community.llms import Ollama
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

llm = Ollama(model="llama3.3:8b")
memory = ConversationBufferMemory()

conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True
)

# Multi-turn conversation
print(conversation.predict(input="My name is Alice"))
print(conversation.predict(input="What's my name?"))
print(conversation.predict(input="What did we talk about?"))
```

**4. Document QA Chain**

```python
# langchain_qa.py
from langchain_community.llms import Ollama
from langchain.chains.question_answering import load_qa_chain
from langchain.docstore.document import Document

llm = Ollama(model="llama3.3:8b")

# Create documents
docs = [
    Document(page_content="Python is a high-level programming language."),
    Document(page_content="It was created by Guido van Rossum in 1991."),
    Document(page_content="Python emphasizes code readability.")
]

# Create QA chain
chain = load_qa_chain(llm, chain_type="stuff")

# Ask question
query = "Who created Python?"
answer = chain.run(input_documents=docs, question=query)
print(answer)
```

---

## Exercise 5: Multi-Model Comparison (20 minutes)

### Difficulty: ⭐⭐⭐ Advanced

### Objective
Download multiple models and compare their strengths.

### Steps

**1. Download Additional Models**

```bash
# General purpose
ollama pull mistral

# Code-focused
ollama pull codellama:7b

# Lightweight
ollama pull phi3

# Check sizes
ollama list
```

**2. Create Comparison Script**

```python
# model_comparison.py
import requests
import json
import time

def test_model(model, prompt):
    """Test a model with a specific prompt"""
    url = "http://localhost:11434/api/generate"

    start = time.time()
    response = requests.post(url, json={
        "model": model,
        "prompt": prompt,
        "stream": False
    })
    elapsed = time.time() - start

    result = response.json()
    return {
        'model': model,
        'response': result['response'][:200] + '...',  # First 200 chars
        'time': elapsed,
        'tokens': result.get('eval_count', 0)
    }

# Test prompts
prompts = {
    'reasoning': "Explain why the sky is blue in simple terms.",
    'coding': "Write a Python function to reverse a string.",
    'creative': "Write a haiku about artificial intelligence."
}

models = ['llama3.3:8b', 'mistral', 'codellama:7b', 'phi3']

# Compare
for prompt_type, prompt in prompts.items():
    print(f"\n{'='*60}")
    print(f"TEST: {prompt_type}")
    print('='*60)

    for model in models:
        try:
            result = test_model(model, prompt)
            print(f"\n{model}:")
            print(f"  Time: {result['time']:.2f}s")
            print(f"  Response: {result['response']}")
        except:
            print(f"\n{model}: Not available")
```

**3. Run Comparison**

```bash
python model_comparison.py
```

**4. Analyze Results**

Create a comparison table:

| Model         | Reasoning | Coding | Creative | Speed  |
|---------------|-----------|--------|----------|--------|
| llama3.3:8b   | ⭐⭐⭐⭐  | ⭐⭐⭐  | ⭐⭐⭐⭐  | Fast   |
| mistral       | ⭐⭐⭐    | ⭐⭐⭐  | ⭐⭐⭐    | Faster |
| codellama:7b  | ⭐⭐      | ⭐⭐⭐⭐⭐| ⭐⭐      | Fast   |
| phi3          | ⭐⭐      | ⭐⭐    | ⭐⭐      | Fastest|

---

## Exercise 6: VS Code Integration (15 minutes)

### Difficulty: ⭐ Beginner

### Objective
Set up Continue.dev for AI-powered coding assistance.

### Steps

**1. Install Continue Extension**

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Continue"
4. Click Install

**2. Configure Ollama**

```json
// ~/.continue/config.json
{
  "models": [
    {
      "title": "Llama 3.3",
      "provider": "ollama",
      "model": "llama3.3:8b"
    },
    {
      "title": "CodeLlama",
      "provider": "ollama",
      "model": "codellama:7b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "CodeLlama",
    "provider": "ollama",
    "model": "codellama:7b"
  }
}
```

**3. Test Features**

**Chat Interface:**
- Press Ctrl+L (Cmd+L on Mac)
- Ask: "Explain this code"
- Select code and ask questions

**Autocomplete:**
- Start typing a function
- Wait for suggestions
- Press Tab to accept

**Code Actions:**
- Select code
- Right-click → Continue
- Choose: Explain, Document, Test, Refactor

**4. Example Workflow**

```python
# Type this comment and let AI complete:
# Function to calculate factorial recursively

# AI should suggest something like:
def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)
```

---

## Exercise 7: Custom Model Parameters (15 minutes)

### Difficulty: ⭐⭐ Intermediate

### Objective
Fine-tune model behavior with parameters.

### Steps

**1. Temperature Control**

```python
# temperature_test.py
import requests

def generate_with_params(prompt, temperature):
    response = requests.post('http://localhost:11434/api/generate', json={
        "model": "llama3.3:8b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature
        }
    })
    return response.json()['response']

prompt = "Complete this sentence: The future of AI is"

# Test different temperatures
for temp in [0.1, 0.5, 0.9, 1.5]:
    print(f"\nTemperature {temp}:")
    print(generate_with_params(prompt, temp))
```

**2. Context Length**

```python
# context_test.py
def generate_with_context(prompt, num_ctx):
    response = requests.post('http://localhost:11434/api/generate', json={
        "model": "llama3.3:8b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": num_ctx  # Context window size
        }
    })
    return response.json()

# Test with long document
long_document = "..." * 1000  # Long text
result = generate_with_context(
    f"Summarize: {long_document}",
    num_ctx=4096
)
```

**3. Top-K and Top-P Sampling**

```python
def generate_with_sampling(prompt, top_k=40, top_p=0.9):
    response = requests.post('http://localhost:11434/api/generate', json={
        "model": "llama3.3:8b",
        "prompt": prompt,
        "stream": False,
        "options": {
            "top_k": top_k,      # Limit to top K tokens
            "top_p": top_p,      # Nucleus sampling
            "repeat_penalty": 1.1  # Reduce repetition
        }
    })
    return response.json()['response']
```

---

## Bonus Exercise: LM Studio Setup (Optional)

### Difficulty: ⭐ Beginner

### Objective
Try the GUI-based alternative to Ollama.

### Steps

**1. Download LM Studio**
- Visit [lmstudio.ai](https://lmstudio.ai)
- Download for your OS
- Install and launch

**2. Download a Model**
- Click "Search" tab
- Search for "llama-3.3-8b"
- Click download
- Wait for completion

**3. Chat Interface**
- Go to "Chat" tab
- Select your model
- Start chatting

**4. Local Server**
- Go to "Local Server" tab
- Click "Start Server"
- Server runs on http://localhost:1234
- Test with same API code (change port)

---

## Practice Challenges

### Challenge 1: Build a Code Review Bot
**Time**: 30 minutes
**Difficulty**: ⭐⭐

Create a script that:
- Reads Python files
- Sends code to local model
- Gets suggestions for improvements
- Saves review to markdown

### Challenge 2: Multi-Model Router
**Time**: 40 minutes
**Difficulty**: ⭐⭐⭐

Build a system that:
- Analyzes the query type
- Routes to appropriate model:
  - Code → CodeLlama
  - General → Llama 3.3
  - Fast → Phi-3
- Returns result with metadata

### Challenge 3: Streaming Chat UI
**Time**: 45 minutes
**Difficulty**: ⭐⭐⭐

Create a terminal chat app with:
- Streaming responses
- Conversation history
- Model switching
- Parameter controls

---

## Key Takeaways

✅ Ollama provides the easiest local AI setup
✅ Models can be accessed via REST API or Python SDK
✅ Performance varies significantly by model and hardware
✅ LangChain enables complex AI workflows
✅ VS Code extensions bring AI into your editor

---

## Troubleshooting Guide

### Issue: Model download fails
**Solution:**
```bash
# Use resume feature
ollama pull llama3.3:8b --resume

# Or download manually from Hugging Face
```

### Issue: Out of memory
**Solution:**
- Use smaller model (phi3)
- Reduce context window
- Close other applications
- Use CPU mode if GPU insufficient

### Issue: Slow performance
**Solution:**
```bash
# Check GPU usage
nvidia-smi

# Verify CUDA
ollama run llama3.3 --verbose
```

---

## Navigation
- Previous: [Core Concepts](01_concepts.md)
- Next: [Exercises](03_exercises.md)
- [Back to Module Overview](README.md)
