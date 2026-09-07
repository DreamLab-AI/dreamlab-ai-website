# Practical Exercises: Local AI in Action

## 30 Minutes to Prove You Own Your AI

These five exercises progress from basic to advanced. Each one builds on the previous, so work through them in order. By the end you will have chatted with a model, queried it from code, benchmarked its speed, compared multiple models, and built a simple multi-model router — all running entirely on your own hardware.

---

## Exercise 1: Your First Local Conversation (5 minutes)

### Objective
Verify that Ollama is working and experience an interactive chat session with a model running on your machine.

### Difficulty: Beginner

### Steps

**1. Start a chat session**

```bash
ollama run llama3.3:8b
```

**2. Try these prompts** (type each one, press Enter, and read the response):

```
What are three benefits of running AI models locally instead of using cloud APIs?
```

```
Summarise the plot of Romeo and Juliet in exactly 50 words.
```

```
Write a short thank-you email to a colleague who helped with a project.
```

**3. Observe the output**
- How fast do tokens appear? (This is your baseline inference speed.)
- Does the model follow your instructions accurately?
- Is the language natural and useful?

**4. Exit the chat**

```
/bye
```

### Success Criteria
- The model responded to all three prompts
- You exited cleanly with `/bye`
- You have a rough sense of how fast the model generates text

### Reflection
- How does the response quality compare to cloud AI tools you have used?
- How does the speed compare?
- What tasks from your own work could you run through this model?

---

## Exercise 2: API Integration with Python (7 minutes)

### Objective
Move beyond the chat interface and control Ollama programmatically — the foundation for building any local AI application.

### Difficulty: Intermediate

### Steps

**1. Create a new file** called `local_query.py`:

```python
"""Query Ollama from Python and display the response."""

import requests
import json

def ask_local_ai(prompt, model="llama3.3:8b"):
    """Send a prompt to the local Ollama API and return the response."""
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(url, json=payload)
    result = response.json()

    return result["response"]

# Test with a simple question
answer = ask_local_ai("Explain what quantisation means for AI models, in two sentences.")
print("Model says:")
print(answer)
```

**2. Run the script**

```bash
python3 local_query.py
```

**3. Now add streaming** — create `local_stream.py`:

```python
"""Stream tokens from Ollama in real time."""

import requests
import json

def stream_local_ai(prompt, model="llama3.3:8b"):
    """Stream a response token by token."""
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }

    with requests.post(url, json=payload, stream=True) as response:
        for line in response.iter_lines():
            if line:
                chunk = json.loads(line)
                if not chunk.get("done"):
                    print(chunk["response"], end="", flush=True)
        print()  # Final newline

stream_local_ai("Write a four-line poem about privacy in the digital age.")
```

**4. Run the streaming script**

```bash
python3 local_stream.py
```

Watch the tokens appear one by one, exactly as they do in a cloud AI chat — but everything is happening on your machine.

**5. Try the OpenAI-compatible endpoint** — create `local_openai.py`:

```python
"""Use the OpenAI Python SDK with a local Ollama model."""

from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # Required by the SDK but not used locally
)

response = client.chat.completions.create(
    model="llama3.3:8b",
    messages=[
        {"role": "system", "content": "You are a concise assistant. Answer in under 50 words."},
        {"role": "user", "content": "What is the GGUF file format?"}
    ]
)

print(response.choices[0].message.content)
```

```bash
pip install openai  # If not already installed
python3 local_openai.py
```

### Success Criteria
- `local_query.py` printed a coherent response
- `local_stream.py` streamed tokens to the terminal in real time
- `local_openai.py` worked using the standard OpenAI SDK against your local model

### Key Learning
Any tool or library that supports the OpenAI API can be pointed at your local Ollama server by changing a single URL. Your existing code and workflows transfer directly.

---

## Exercise 3: Benchmark Your Hardware (7 minutes)

### Objective
Measure exactly how fast your machine runs a model, so you can make informed decisions about which models to use for different tasks.

### Difficulty: Intermediate

### Steps

**1. Create `benchmark.py`:**

```python
"""Benchmark local model inference speed."""

import requests
import time
import json

def benchmark(model, prompt, runs=3):
    """Run a prompt multiple times and measure performance."""
    url = "http://localhost:11434/api/generate"
    times = []
    speeds = []

    print(f"\nBenchmarking {model} ({runs} runs)...")

    for i in range(runs):
        start = time.time()
        response = requests.post(url, json={
            "model": model,
            "prompt": prompt,
            "stream": False
        })
        elapsed = time.time() - start
        result = response.json()

        tokens = result.get("eval_count", 0)
        tps = tokens / elapsed if elapsed > 0 else 0

        times.append(elapsed)
        speeds.append(tps)
        print(f"  Run {i + 1}: {elapsed:.1f}s, {tokens} tokens, {tps:.1f} tok/s")

    avg_time = sum(times) / len(times)
    avg_speed = sum(speeds) / len(speeds)

    print(f"\n  Average: {avg_time:.1f}s, {avg_speed:.1f} tokens/second")
    return {"model": model, "avg_time": avg_time, "avg_speed": avg_speed}


# Standard test prompt
prompt = "Explain the difference between a CPU and a GPU in exactly 100 words."

# Benchmark the model you have downloaded
results = []
results.append(benchmark("llama3.3:8b", prompt))

# Uncomment additional models as you download them:
# results.append(benchmark("mistral", prompt))
# results.append(benchmark("phi3", prompt))
# results.append(benchmark("qwen2.5:7b", prompt))

# Summary
print("\n" + "=" * 50)
print("BENCHMARK SUMMARY")
print("=" * 50)
for r in results:
    print(f"  {r['model']:20s}  {r['avg_speed']:6.1f} tok/s  {r['avg_time']:5.1f}s avg")
```

**2. Run the benchmark**

```bash
python3 benchmark.py
```

**3. Record your results**

Write down your tokens-per-second figure. This is your hardware baseline.

**Reference ranges** (Llama 3.3 8B Q4_K_M):

| Hardware | Expected tok/s |
|----------|---------------|
| CPU only (modern i7/Ryzen 7) | 3-8 |
| NVIDIA RTX 3060 (12 GB) | 25-35 |
| NVIDIA RTX 4070 (12 GB) | 35-50 |
| NVIDIA RTX 4090 (24 GB) | 55-80 |
| Apple M1 Pro (16 GB) | 12-18 |
| Apple M2 Max (32 GB) | 22-30 |
| Apple M3 Max (64 GB) | 30-40 |

### Success Criteria
- Benchmark ran to completion without errors
- You recorded your tokens-per-second figure
- You can locate your hardware in the reference table and compare

### Reflection
- Is your speed fast enough for interactive use (above ~10 tok/s)?
- Would a smaller model (Phi-3) give acceptable quality at higher speed?
- What hardware upgrade would give the biggest improvement for your setup?

---

## Exercise 4: Multi-Model Taste Test (7 minutes)

### Objective
Download a second model and compare how different models handle the same prompts. This builds your intuition for when to use which model.

### Steps

**1. Download an additional model**

Choose one based on your available resources:

```bash
# Lightweight and fast (recommended if disk/RAM is limited)
ollama pull phi3

# Good all-rounder (if you have room for another ~5 GB download)
ollama pull mistral

# Code specialist (if you are interested in programming tasks)
ollama pull qwen2.5-coder:7b

# Reasoning specialist
ollama pull deepseek-r1:7b
```

**2. Create `taste_test.py`:**

```python
"""Compare two models on the same set of prompts."""

import requests
import time

def query(model, prompt):
    """Query a model and return the response with timing."""
    start = time.time()
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": model,
        "prompt": prompt,
        "stream": False
    })
    elapsed = time.time() - start
    result = response.json()
    return {
        "text": result["response"][:300],  # First 300 characters
        "time": elapsed,
        "tokens": result.get("eval_count", 0)
    }

# Models to compare (adjust to match what you downloaded)
models = ["llama3.3:8b", "phi3"]

# Test prompts covering different skills
tests = {
    "Factual": "Name the four largest planets in our solar system and give one fact about each.",
    "Creative": "Write a haiku about a computer learning to think.",
    "Reasoning": "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? Explain your reasoning.",
    "Summarisation": "Summarise the key idea behind open-source software in exactly two sentences."
}

# Run comparisons
for test_name, prompt in tests.items():
    print(f"\n{'=' * 60}")
    print(f"TEST: {test_name}")
    print(f"PROMPT: {prompt}")
    print("=" * 60)

    for model in models:
        try:
            result = query(model, prompt)
            print(f"\n  [{model}] ({result['time']:.1f}s, {result['tokens']} tokens)")
            print(f"  {result['text']}")
        except Exception as e:
            print(f"\n  [{model}] Error: {e}")
```

**3. Run the taste test**

```bash
python3 taste_test.py
```

**4. Evaluate the results**

For each test, note:
- Which model gave a better answer?
- Which model was faster?
- Was the speed difference worth the quality difference?

### Success Criteria
- Two models produced responses for all four test categories
- You can articulate which model you prefer for which type of task
- You understand the speed/quality trade-off between a larger and smaller model

### Key Learning
There is no single "best" model. The right choice depends on the task, your speed requirements, and your hardware. A smaller model that answers in one second may be more useful for quick lookups than a larger model that takes ten seconds.

---

## Exercise 5: Build a Simple Model Router (7 minutes)

### Objective
Combine everything you have learned into a script that automatically selects the best model for each query — the core pattern behind production local AI systems.

### Difficulty: Advanced

### Steps

**1. Create `smart_router.py`:**

```python
"""A simple router that picks the best local model for each query."""

import requests
import time

# Configure available models (adjust to match your downloads)
MODELS = {
    "general": "llama3.3:8b",
    "fast": "phi3",
    # Uncomment if downloaded:
    # "code": "qwen2.5-coder:7b",
    # "reasoning": "deepseek-r1:7b",
}

# Keywords that signal a specific category
CODE_KEYWORDS = ["code", "function", "script", "debug", "python", "javascript", "programme"]
FAST_KEYWORDS = ["define", "what is", "who is", "translate", "spell"]
REASONING_KEYWORDS = ["why", "explain", "compare", "analyse", "prove", "reason"]


def classify(query):
    """Classify a query into a model category."""
    lower = query.lower()

    if any(kw in lower for kw in CODE_KEYWORDS) and "code" in MODELS:
        return "code"

    if len(query.split()) < 12 and any(kw in lower for kw in FAST_KEYWORDS):
        return "fast"

    if any(kw in lower for kw in REASONING_KEYWORDS) and "reasoning" in MODELS:
        return "reasoning"

    return "general"


def ask(query):
    """Route a query to the best model and return the result."""
    category = classify(query)
    model = MODELS[category]

    print(f"\n[Router] Category: {category} -> Model: {model}")
    print(f"[Router] Query: {query}")

    start = time.time()
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": model,
        "prompt": query,
        "stream": False
    })
    elapsed = time.time() - start
    result = response.json()

    print(f"[Router] Response time: {elapsed:.1f}s")
    print(f"\n{result['response'][:400]}\n")
    return result["response"]


# Test the router with varied queries
test_queries = [
    "What is the capital of Japan?",
    "Explain why the sky appears blue at sunset compared to midday.",
    "Write a Python function that checks whether a string is a palindrome.",
    "Summarise three advantages of local AI models for healthcare organisations.",
]

print("=" * 60)
print("SMART MODEL ROUTER — LOCAL AI")
print("=" * 60)

for q in test_queries:
    ask(q)
    print("-" * 60)
```

**2. Run the router**

```bash
python3 smart_router.py
```

**3. Observe the routing decisions**

- Did the router pick the expected category for each query?
- Was the fast model noticeably quicker on simple lookups?
- How would you improve the classification logic?

**4. Extend the router (optional challenge)**

If time permits, try adding:
- A "creative" category that uses a higher temperature setting
- User input via `input()` so you can test your own queries interactively
- Timing comparison: run the same query through both models and show which is faster

### Success Criteria
- The router classified all four test queries into appropriate categories
- Different models were used for different query types
- The script ran without errors

### Key Learning
Smart routing is the pattern behind every production local AI system. Instead of picking one model for everything, you match the task to the model's strengths. This gives you the best balance of quality, speed, and resource usage.

---

## Exercise Reflection Checklist

After completing these exercises, you should be able to:

- [ ] Chat with a local model and exit cleanly
- [ ] Query the Ollama API from a Python script
- [ ] Stream responses token by token
- [ ] Use the OpenAI-compatible endpoint with existing SDK code
- [ ] Benchmark a model and state your tokens-per-second figure
- [ ] Compare two models on the same prompt and justify a preference
- [ ] Build a simple model router that classifies queries and selects models

## Patterns You Have Learned

### The API Pattern
```
Python script -> HTTP POST to localhost:11434 -> Model response -> Your application
```

### The Benchmark Pattern
```
Same prompt -> Multiple runs -> Average time and tokens/second -> Hardware baseline
```

### The Comparison Pattern
```
Same prompt -> Two models -> Evaluate quality and speed -> Informed choice
```

### The Router Pattern
```
User query -> Classify by keywords -> Select model -> Generate response
```

## Tips from the Exercises

1. **Start small.** Use `phi3` for quick experiments, `llama3.3:8b` for quality.
2. **Measure everything.** Tokens per second is your single most important metric.
3. **Stream for UX.** Streaming makes even slow models feel responsive.
4. **The OpenAI endpoint is your migration path.** Existing cloud code works locally with one URL change.
5. **Routing beats brute force.** A small model answering fast is often better than a large model answering slowly.

## Ready for the Project?

You now have all the building blocks. In the next section, you will combine them into a complete local AI assistant with a web interface, session management, and multi-model routing.

---

## Navigation
- Previous: [Hands-On Practice](02_hands_on.md)
- Next: [Project: Build a Local AI Assistant](04_project.md)
- [Back to Workshop Overview](README.md)
