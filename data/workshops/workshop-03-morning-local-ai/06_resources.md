# Resources: Local AI Models

Comprehensive resource guide for mastering local AI.

## Official Documentation

### Ollama
- **Website**: https://ollama.ai
- **GitHub**: https://github.com/ollama/ollama
- **Model Library**: https://ollama.ai/library
- **API Reference**: https://github.com/ollama/ollama/blob/main/docs/api.md

### LM Studio
- **Website**: https://lmstudio.ai
- **Download**: https://lmstudio.ai/download
- **Documentation**: https://lmstudio.ai/docs

### llama.cpp
- **GitHub**: https://github.com/ggerganov/llama.cpp
- **Documentation**: https://github.com/ggerganov/llama.cpp/blob/master/README.md
- **Model Conversion**: https://github.com/ggerganov/llama.cpp/blob/master/convert.py

## Model Sources

### Hugging Face
Primary hub for downloading models:
- **Main**: https://huggingface.co/models
- **GGUF Models**: https://huggingface.co/models?library=gguf
- **TheBloke** (quantized models): https://huggingface.co/TheBloke

**Popular Model Cards:**
- Llama 3.1: https://huggingface.co/meta-llama/Meta-Llama-3.1-8B
- Qwen 2.5: https://huggingface.co/Qwen/Qwen2.5-7B
- Mistral: https://huggingface.co/mistralai/Mistral-7B-v0.1
- Phi-3: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct

### Model-Specific Resources

**Llama Family (Meta)**
- Official: https://ai.meta.com/llama/
- License: https://ai.meta.com/llama/license/
- Research Paper: https://arxiv.org/abs/2307.09288

**Mistral**
- Official: https://mistral.ai
- Mixtral Paper: https://arxiv.org/abs/2401.04088
- Models: https://docs.mistral.ai/guides/models/

**Qwen (Alibaba)**
- GitHub: https://github.com/QwenLM/Qwen
- Technical Report: https://arxiv.org/abs/2309.16609

## Hardware Guides

### GPU Selection Guide

**Entry Level ($200-400)**
| GPU | VRAM | Best For | Price |
|-----|------|----------|-------|
| NVIDIA RTX 3050 | 8 GB | 3B-7B models | $250 |
| NVIDIA RTX 3060 | 12 GB | 7B-13B models | $300 |
| AMD RX 6600 XT | 8 GB | 7B with ROCm | $280 |

**Mid-Range ($400-800)**
| GPU | VRAM | Best For | Price |
|-----|------|----------|-------|
| NVIDIA RTX 4060 Ti | 16 GB | 13B-30B models | $550 |
| NVIDIA RTX 4070 | 12 GB | 7B-13B (fast) | $600 |
| AMD RX 7900 XT | 20 GB | 30B models | $750 |

**High-End ($800-2000)**
| GPU | VRAM | Best For | Price |
|-----|------|----------|-------|
| NVIDIA RTX 4080 | 16 GB | 30B models | $1,100 |
| NVIDIA RTX 4090 | 24 GB | 70B models | $1,600 |
| AMD RX 7900 XTX | 24 GB | 70B models | $1,000 |

**Professional ($2000+)**
| GPU | VRAM | Best For | Price |
|-----|------|----------|-------|
| NVIDIA A6000 | 48 GB | 70B+ models | $4,500 |
| NVIDIA L40S | 48 GB | Production | $7,500 |
| NVIDIA H100 | 80 GB | Research | $30,000+ |

### Apple Silicon Performance

**M1/M2/M3 Family**
| Chip | Memory | Recommended Models | Performance |
|------|--------|-------------------|-------------|
| M1 (8 GB) | 8 GB | 3B-7B Q4 | 12-15 tok/s |
| M1 Pro (16 GB) | 16 GB | 7B-13B Q4 | 18-22 tok/s |
| M1 Max (32 GB) | 32 GB | 13B-30B Q4 | 25-30 tok/s |
| M2 Pro (16 GB) | 16 GB | 7B-13B Q5 | 22-28 tok/s |
| M2 Max (64 GB) | 64 GB | 30B-70B Q4 | 30-40 tok/s |
| M3 Max (128 GB) | 128 GB | 70B+ Q4 | 45-55 tok/s |

**Resource**: [Does it ARM?](https://doesitarm.com/formula/ollama/) - Check M-series compatibility

### CPU-Only Systems

**Minimum Specs:**
- 16 GB RAM: 3B-7B Q4
- 32 GB RAM: 7B-13B Q4/Q5
- 64 GB RAM: 13B-30B Q4
- 128 GB RAM: 30B-70B Q4

**CPU Recommendations:**
- **Intel**: i7-12700K or higher (12th gen+)
- **AMD**: Ryzen 7 5800X or higher (Zen 3+)
- **Cores**: 8+ cores recommended
- **Cache**: Larger L3 cache improves performance

**Budget Build (~$800):**
```
CPU: AMD Ryzen 7 5700X - $180
Motherboard: B550 - $120
RAM: 64 GB DDR4-3600 - $180
Storage: 1TB NVMe - $80
Case + PSU: $150
Total: ~$710
```

**Performance Build (~$2000):**
```
CPU: AMD Ryzen 9 7950X - $550
Motherboard: X670 - $250
RAM: 128 GB DDR5-6000 - $450
GPU: RTX 4060 Ti 16GB - $550
Storage: 2TB NVMe - $150
Case + PSU + Cooling: $250
Total: ~$2,200
```

## Learning Resources

### Tutorials & Courses

**Beginner:**
- [Ollama Getting Started](https://ollama.ai/blog/getting-started)
- [Run Llama Locally](https://www.youtube.com/watch?v=Wjrdr0NU4Sk)
- [Local AI Basics](https://simonwillison.net/2023/Oct/17/open-llms/)

**Intermediate:**
- [Fine-Tuning Guide](https://huggingface.co/blog/llama2)
- [RAG with Local Models](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [Model Quantization Explained](https://huggingface.co/blog/quantization)

**Advanced:**
- [GGML Format Spec](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Mixture of Experts](https://arxiv.org/abs/2101.03961)
- [Model Merging](https://github.com/cg123/mergekit)

### Video Tutorials

**YouTube Channels:**
- **Matthew Berman**: Model reviews and comparisons
  - https://www.youtube.com/@matthew_berman
- **AI Explained**: Technical deep dives
  - https://www.youtube.com/@ai-explained-
- **WorldofAI**: News and tutorials
  - https://www.youtube.com/@intheworldofai

**Specific Videos:**
- "Running Llama 3 Locally": https://youtu.be/Wjrdr0NU4Sk
- "Ollama Complete Guide": https://youtu.be/lZLprB5fWfw
- "Quantization Explained": https://youtu.be/0VQ3N1cwZ3s

### Books

**Free Resources:**
- "Understanding LLMs" - Sebastian Raschka
  - https://magazine.sebastianraschka.com/p/understanding-large-language-models
- "The Illustrated Transformer" - Jay Alammar
  - https://jalammar.github.io/illustrated-transformer/
- "Attention Is All You Need" (Original Paper)
  - https://arxiv.org/abs/1706.03762

**Paid Books:**
- "Build a Large Language Model" - Sebastian Raschka ($40)
- "Designing Machine Learning Systems" - Chip Huyen ($60)
- "Natural Language Processing with Transformers" - O'Reilly ($50)

## Tools & Libraries

### Python Libraries

```bash
# Core
pip install ollama                 # Ollama Python client
pip install llama-cpp-python       # llama.cpp bindings
pip install transformers          # Hugging Face

# API Frameworks
pip install fastapi uvicorn       # REST API
pip install streamlit             # Quick UIs
pip install gradio                # ML interfaces

# Utilities
pip install pydantic              # Data validation
pip install python-dotenv         # Environment vars
pip install rich                  # Beautiful terminal output
```

### Development Tools

**Model Management:**
- **Ollama**: https://ollama.ai
- **LM Studio**: https://lmstudio.ai
- **Jan**: https://jan.ai (privacy-focused)
- **GPT4All**: https://gpt4all.io

**Model Conversion:**
- **llama.cpp converter**: `convert.py`
- **GGUF Tools**: https://github.com/ggerganov/ggml/tree/master/docs

**Benchmarking:**
- **LM Harness**: https://github.com/EleutherAI/lm-evaluation-harness
- **vLLM**: https://github.com/vllm-project/vllm
- **llama-bench**: Built into llama.cpp

**Monitoring:**
- **nvitop**: GPU monitoring - `pip install nvitop`
- **htop**: CPU monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards

## Communities

### Forums & Discussion

**Reddit:**
- r/LocalLLaMA: https://reddit.com/r/LocalLLaMA (best community)
- r/MachineLearning: https://reddit.com/r/MachineLearning
- r/ArtificialIntelligence: https://reddit.com/r/artificial

**Discord:**
- Ollama: https://discord.gg/ollama
- LM Studio: https://discord.gg/lmstudio
- Hugging Face: https://hf.co/join/discord

**Forums:**
- Hugging Face Discussions: https://discuss.huggingface.co
- EleutherAI: https://discord.gg/eleutherai

### GitHub Repositories

**Essential:**
- Ollama: https://github.com/ollama/ollama
- llama.cpp: https://github.com/ggerganov/llama.cpp
- Text Generation WebUI: https://github.com/oobabooga/text-generation-webui
- LocalAI: https://github.com/go-skynet/LocalAI

**Awesome Lists:**
- Awesome LLM: https://github.com/Hannibal046/Awesome-LLM
- Awesome Local LLMs: https://github.com/janhq/awesome-local-ai

## Benchmarks & Leaderboards

### Model Performance

**Official Benchmarks:**
- **Open LLM Leaderboard**: https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard
- **LMSYS Chatbot Arena**: https://chat.lmsys.org/?arena
- **AlpacaEval**: https://tatsu-lab.github.io/alpaca_eval/

**Hardware Benchmarks:**
- **LLaMA Benchmarks**: https://github.com/ggerganov/llama.cpp/discussions/2094
- **GPU Performance**: https://www.reddit.com/r/LocalLLaMA/wiki/gpu-performance

### Comparison Tools

- **Model Comparison**: https://huggingface.co/spaces/open-llm-leaderboard/blog
- **Quantization Impact**: https://github.com/ggerganov/llama.cpp/pull/1684

## Papers & Research

### Foundational

1. **"Attention Is All You Need" (Transformers)**
   - https://arxiv.org/abs/1706.03762
   - Introduced transformer architecture

2. **"Language Models are Few-Shot Learners" (GPT-3)**
   - https://arxiv.org/abs/2005.14165
   - Demonstrated scaling laws

3. **"LLaMA: Open and Efficient Foundation Models"**
   - https://arxiv.org/abs/2302.13971
   - Meta's open model family

### Quantization

1. **"GGML - GPT-Generated Model Language"**
   - https://github.com/ggerganov/ggml
   - Efficient inference library

2. **"QLoRA: Efficient Finetuning of Quantized LLMs"**
   - https://arxiv.org/abs/2305.14314
   - Training quantized models

3. **"AWQ: Activation-aware Weight Quantization"**
   - https://arxiv.org/abs/2306.00978
   - Advanced quantization

### Optimization

1. **"FlashAttention: Fast and Memory-Efficient Attention"**
   - https://arxiv.org/abs/2205.14135
   - Attention optimization

2. **"Mixture of Experts"**
   - https://arxiv.org/abs/2101.03961
   - Efficient large models

## Troubleshooting Resources

### Common Issues

**Issue: Out of Memory**
- Solution Guide: https://github.com/ggerganov/llama.cpp/issues/2087
- Memory Calculator: https://huggingface.co/spaces/Vokturz/can-it-run-llm

**Issue: Slow Inference**
- Optimization Guide: https://github.com/ggerganov/llama.cpp/discussions/2094
- Performance Tips: https://www.reddit.com/r/LocalLLaMA/comments/15rjyc5/

**Issue: GPU Not Detected**
- CUDA Setup: https://docs.nvidia.com/cuda/cuda-installation-guide-linux/
- ROCm Setup: https://rocm.docs.amd.com/

### FAQ Collections

- Ollama FAQ: https://github.com/ollama/ollama/blob/main/docs/faq.md
- llama.cpp FAQ: https://github.com/ggerganov/llama.cpp/discussions
- LocalLLaMA Wiki: https://reddit.com/r/LocalLLaMA/wiki/

## Advanced Topics

### Fine-Tuning

**Tools:**
- **Unsloth**: https://github.com/unslothai/unsloth (fastest)
- **Axolotl**: https://github.com/OpenAccess-AI-Collective/axolotl
- **LLaMA-Factory**: https://github.com/hiyouga/LLaMA-Factory

**Guides:**
- "Fine-tune Llama 3": https://huggingface.co/blog/llama3
- "QLoRA Fine-tuning": https://github.com/artidoro/qlora

### Model Merging

**Tools:**
- **MergeKit**: https://github.com/cg123/mergekit
- **Model Soup**: https://arxiv.org/abs/2203.05482

**Guides:**
- "Merge Models Tutorial": https://huggingface.co/blog/mlabonne/merge-models

### Deployment

**Production:**
- **vLLM**: https://github.com/vllm-project/vllm
- **TGI**: https://github.com/huggingface/text-generation-inference
- **TensorRT-LLM**: https://github.com/NVIDIA/TensorRT-LLM

**Edge:**
- **llama.cpp**: For mobile/embedded
- **ONNX Runtime**: https://onnxruntime.ai
- **Core ML**: https://github.com/apple/coremltools

## Datasets

### Pre-training Data

- **The Pile**: https://pile.eleuther.ai
- **RedPajama**: https://github.com/togethercomputer/RedPajama-Data
- **ROOTS**: https://huggingface.co/bigscience/misc

### Fine-tuning Datasets

- **Alpaca**: https://github.com/tatsu-lab/stanford_alpaca
- **Dolly**: https://github.com/databrickslabs/dolly
- **ShareGPT**: https://huggingface.co/datasets/RyokoAI/ShareGPT52K

### Evaluation Datasets

- **MMLU**: https://github.com/hendrycks/test
- **HellaSwag**: https://rowanzellers.com/hellaswag/
- **TruthfulQA**: https://github.com/sylinrl/TruthfulQA

## Security & Privacy

### Best Practices

- **OWASP LLM Top 10**: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- **Privacy Preserving ML**: https://github.com/OpenMined/PySyft
- **Secure Deployment**: https://llmsecurity.net

### Compliance

- **GDPR Compliance**: https://gdpr.eu
- **HIPAA Guidelines**: https://www.hhs.gov/hipaa
- **SOC 2**: https://www.aicpa.org/soc

## Stay Updated

### News & Updates

**Newsletters:**
- The Batch (DeepLearning.AI): https://www.deeplearning.ai/the-batch/
- Import AI: https://jack-clark.net
- TLDR AI: https://tldr.tech/ai

**Blogs:**
- Hugging Face: https://huggingface.co/blog
- Meta AI: https://ai.meta.com/blog/
- OpenAI: https://openai.com/blog

**Twitter/X:**
- @ollama_ai
- @ggerganov (llama.cpp creator)
- @reach_vb (AI news)
- @simonw (Simon Willison)

### Conferences & Events

- **NeurIPS**: https://neurips.cc
- **ICML**: https://icml.cc
- **ACL**: https://www.aclweb.org
- **Local Events**: Search Meetup.com for AI groups

## Contribute

Help improve these resources:

1. **Report Issues**: Found a broken link or outdated info? Let us know
2. **Share Resources**: Know a great tutorial? Submit it
3. **Community**: Join discussions and help others
4. **Code**: Contribute to open-source projects

---

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)

## Quick Reference

**Start Here:**
1. Install Ollama: https://ollama.ai
2. Join r/LocalLLaMA: https://reddit.com/r/LocalLLaMA
3. Read "Illustrated Transformer": https://jalammar.github.io/illustrated-transformer/

**Need Help:**
- Discord: https://discord.gg/ollama
- GitHub Issues: https://github.com/ollama/ollama/issues
- Community Forum: https://reddit.com/r/LocalLLaMA

**Keep Learning:**
- Subscribe to newsletters
- Follow key developers
- Join community projects
- Experiment and share findings

Remember: The local AI community is collaborative and welcoming. Don't hesitate to ask questions and share your experiences!
