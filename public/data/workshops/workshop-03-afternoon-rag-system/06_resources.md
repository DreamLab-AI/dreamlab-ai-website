# Resources: RAG System Implementation

## Introduction

This resource collection supports your ongoing RAG development journey. It covers official documentation, community tools, production deployment guides, and further reading -- organised by topic and skill level.

---

## Core Libraries and Documentation

### Vector Databases

**ChromaDB (Local-First)**
- Documentation: [docs.trychroma.com](https://docs.trychroma.com)
- GitHub: [github.com/chroma-core/chroma](https://github.com/chroma-core/chroma)
- Getting Started: [docs.trychroma.com/getting-started](https://docs.trychroma.com/getting-started)
- Embedding Functions: [docs.trychroma.com/integrations](https://docs.trychroma.com/integrations)
- Best for: Learning, prototyping, small-to-medium datasets

**Qdrant (Production-Grade)**
- Documentation: [qdrant.tech/documentation](https://qdrant.tech/documentation/)
- GitHub: [github.com/qdrant/qdrant](https://github.com/qdrant/qdrant)
- Cloud Console: [cloud.qdrant.io](https://cloud.qdrant.io)
- Python Client: [python-client.qdrant.tech](https://python-client.qdrant.tech)
- Best for: Production deployments, advanced filtering, hybrid search

**Pinecone (Managed Cloud)**
- Documentation: [docs.pinecone.io](https://docs.pinecone.io)
- Getting Started: [docs.pinecone.io/docs/quickstart](https://docs.pinecone.io/docs/quickstart)
- Best for: Fully managed service, serverless scaling, enterprise

**Weaviate (Hybrid + GraphQL)**
- Documentation: [weaviate.io/developers/weaviate](https://weaviate.io/developers/weaviate)
- GitHub: [github.com/weaviate/weaviate](https://github.com/weaviate/weaviate)
- Best for: Built-in hybrid search, GraphQL interface, multi-tenancy

**pgvector (PostgreSQL Extension)**
- GitHub: [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- Tutorial: [supabase.com/docs/guides/ai/vector-columns](https://supabase.com/docs/guides/ai/vector-columns)
- Best for: Existing PostgreSQL users, ACID compliance, SQL-native

### RAG Frameworks

**LangChain**
- Documentation: [python.langchain.com/docs](https://python.langchain.com/docs/introduction/)
- GitHub: [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)
- RAG Tutorial: [python.langchain.com/docs/tutorials/rag](https://python.langchain.com/docs/tutorials/rag/)
- LangSmith (observability): [smith.langchain.com](https://smith.langchain.com)

**LlamaIndex**
- Documentation: [docs.llamaindex.ai](https://docs.llamaindex.ai/en/stable/)
- GitHub: [github.com/run-llama/llama_index](https://github.com/run-llama/llama_index)
- Starter Tutorial: [docs.llamaindex.ai/en/stable/getting_started](https://docs.llamaindex.ai/en/stable/getting_started/)
- Best for: Data-centric RAG, document agents, structured data

**Haystack (by deepset)**
- Documentation: [docs.haystack.deepset.ai](https://docs.haystack.deepset.ai/docs/intro)
- GitHub: [github.com/deepset-ai/haystack](https://github.com/deepset-ai/haystack)
- Best for: Production NLP pipelines, evaluation built in

### Embedding Models

**OpenAI Embeddings**
- API Reference: [platform.openai.com/docs/guides/embeddings](https://platform.openai.com/docs/guides/embeddings)
- Models: `text-embedding-3-small` (1536d), `text-embedding-3-large` (3072d)
- Pricing: Check the OpenAI pricing page for current rates

**Sentence Transformers (Local, Free)**
- Documentation: [sbert.net](https://www.sbert.net)
- GitHub: [github.com/UKPLab/sentence-transformers](https://github.com/UKPLab/sentence-transformers)
- Model Hub: [huggingface.co/sentence-transformers](https://huggingface.co/sentence-transformers)
- Recommended models:
  - `all-MiniLM-L6-v2` -- Fast, good quality, 384 dimensions
  - `BAAI/bge-base-en-v1.5` -- Higher quality, 768 dimensions
  - `BAAI/bge-large-en-v1.5` -- Best quality, 1024 dimensions

**Ollama Embeddings (Local, GPU-Accelerated)**
- Embedding models: `nomic-embed-text`, `mxbai-embed-large`
- Documentation: [ollama.com/blog/embedding-models](https://ollama.com/blog/embedding-models)
- Usage: `ollama pull nomic-embed-text`

**Cohere Embed**
- Documentation: [docs.cohere.com/docs/embeddings](https://docs.cohere.com/docs/embeddings)
- Models: `embed-english-v3.0`, `embed-multilingual-v3.0`
- Free tier: 100 API calls/minute

**Voyage AI**
- Documentation: [docs.voyageai.com](https://docs.voyageai.com)
- Models: `voyage-3`, `voyage-code-3`
- Strong performance on retrieval benchmarks

---

## Evaluation and Quality

### RAGAS (RAG Assessment)

The standard framework for evaluating RAG pipeline quality.

- Documentation: [docs.ragas.io](https://docs.ragas.io)
- GitHub: [github.com/explodinggradients/ragas](https://github.com/explodinggradients/ragas)
- Metrics: faithfulness, answer relevancy, context recall, context precision
- Installation: `pip install ragas`

```python
# Quick RAGAS evaluation example
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision

result = evaluate(
    dataset=your_test_dataset,
    metrics=[faithfulness, answer_relevancy, context_precision],
)
print(result)
```

### DeepEval

- Documentation: [docs.confident-ai.com](https://docs.confident-ai.com)
- GitHub: [github.com/confident-ai/deepeval](https://github.com/confident-ai/deepeval)
- Metrics: hallucination, answer relevancy, contextual recall
- Installation: `pip install deepeval`

### TruLens

- Documentation: [trulens.org](https://www.trulens.org)
- GitHub: [github.com/truera/trulens](https://github.com/truera/trulens)
- Focus: Feedback functions for groundedness, relevance, and harmlessness

---

## Re-ranking Models

### Cross-Encoders

- `cross-encoder/ms-marco-MiniLM-L-6-v2` -- Fast, good quality
- `cross-encoder/ms-marco-MiniLM-L-12-v2` -- Better quality, slightly slower
- `BAAI/bge-reranker-base` -- Strong retrieval-focused reranker
- `BAAI/bge-reranker-large` -- Best quality reranker

```bash
# Install
pip install sentence-transformers
```

### Cohere Rerank

- API: [docs.cohere.com/docs/reranking](https://docs.cohere.com/docs/reranking)
- Model: `rerank-english-v3.0`
- Free tier available for development

---

## Document Processing

### PDF Extraction

- **PyPDF**: [github.com/py-pdf/pypdf](https://github.com/py-pdf/pypdf) -- Lightweight, pure Python
- **pdfplumber**: [github.com/jsvine/pdfplumber](https://github.com/jsvine/pdfplumber) -- Better table extraction
- **Unstructured**: [github.com/Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured) -- Multi-format document parsing (PDF, DOCX, HTML, images)

### OCR (Scanned Documents)

- **Tesseract**: [github.com/tesseract-ocr/tesseract](https://github.com/tesseract-ocr/tesseract)
- **PaddleOCR**: [github.com/PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) -- ML-based, multilingual
- **DocTR**: [github.com/mindee/doctr](https://github.com/mindee/doctr) -- Deep learning OCR

### Structured Data

- **LlamaIndex** supports CSV, JSON, SQL, and API data sources
- **Pandas + LangChain** for tabular data integration
- **SQLAlchemy** for database-backed RAG systems

---

## Local AI Infrastructure

### Ollama

- Website: [ollama.com](https://ollama.com)
- Model Library: [ollama.com/library](https://ollama.com/library)
- Recommended models for RAG:
  - **Generation**: `llama3.3:8b`, `mistral`, `qwen2.5:7b`
  - **Embeddings**: `nomic-embed-text`, `mxbai-embed-large`
  - **Code understanding**: `qwen2.5-coder:7b`

### LM Studio

- Website: [lmstudio.ai](https://lmstudio.ai)
- GUI-based model management and inference
- OpenAI-compatible local server
- Good for experimentation and non-technical users

### vLLM (Production Serving)

- Documentation: [docs.vllm.ai](https://docs.vllm.ai/en/latest/)
- GitHub: [github.com/vllm-project/vllm](https://github.com/vllm-project/vllm)
- High-throughput LLM serving with PagedAttention
- Best for: Production deployments serving multiple users

---

## Advanced RAG Patterns

### Agentic RAG

Combine RAG with tool-using agents for multi-step reasoning:

- LangChain Agents: [python.langchain.com/docs/how_to/#agents](https://python.langchain.com/docs/how_to/#agents)
- LlamaIndex Agents: [docs.llamaindex.ai/en/stable/module_guides/deploying/agents/](https://docs.llamaindex.ai/en/stable/module_guides/deploying/agents/)

### Multi-Modal RAG

Retrieve and reason over images, tables, and text together:

- LlamaIndex Multi-Modal: [docs.llamaindex.ai/en/stable/examples/multi_modal/](https://docs.llamaindex.ai/en/stable/examples/multi_modal/)
- ColPali: Visual document retrieval using vision models

### Graph RAG

Combine knowledge graphs with vector retrieval:

- Microsoft GraphRAG: [github.com/microsoft/graphrag](https://github.com/microsoft/graphrag)
- Neo4j + LangChain: [python.langchain.com/docs/integrations/graphs/neo4j_cypher](https://python.langchain.com/docs/integrations/graphs/neo4j_cypher)

### Corrective RAG (CRAG)

Self-correcting retrieval that validates and re-fetches when results are poor:

- Paper: "Corrective Retrieval Augmented Generation" (Yan et al., 2024)
- Combines retrieval evaluation with web search fallback

---

## Deployment and Production

### Web Interfaces

**Streamlit** (Quick prototyping)
- Documentation: [docs.streamlit.io](https://docs.streamlit.io)
- Installation: `pip install streamlit`
- RAG template: [github.com/streamlit/llm-examples](https://github.com/streamlit/llm-examples)

**Gradio** (ML-focused UI)
- Documentation: [gradio.app/docs](https://www.gradio.app/docs/)
- Installation: `pip install gradio`
- Chatbot component for conversational RAG

**Chainlit** (Chat-first UI for LLM apps)
- Documentation: [docs.chainlit.io](https://docs.chainlit.io)
- Built specifically for conversational AI applications

### API Deployment

**FastAPI**
- Documentation: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- Ideal for building RAG-as-a-service APIs
- Async support for high concurrency

```python
# Minimal FastAPI RAG endpoint
from fastapi import FastAPI
from rag_pipeline import ask

app = FastAPI()

@app.post("/ask")
async def ask_question(query: str):
    result = ask(query)
    return result
```

### Docker Deployment

```dockerfile
# Dockerfile for RAG service
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY scripts/ scripts/
COPY data/ data/
CMD ["uvicorn", "scripts.api:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Recommended Reading

### Foundational Papers

1. **"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks"** (Lewis et al., 2020)
   The original RAG paper from Meta AI. Essential reading for understanding the paradigm.

2. **"Dense Passage Retrieval for Open-Domain Question Answering"** (Karpukhin et al., 2020)
   Foundational work on using dense embeddings for document retrieval.

3. **"Attention Is All You Need"** (Vaswani et al., 2017)
   The Transformer paper -- understanding this helps you grasp how embeddings and LLMs work.

4. **"REALM: Retrieval-Augmented Language Model Pre-Training"** (Guu et al., 2020)
   Integrating retrieval directly into the pre-training process.

### Practical Guides

5. **"Building RAG-based LLM Applications for Production"** -- Anyscale Blog
   Comprehensive guide to moving from prototype to production.

6. **"A Survey on Retrieval-Augmented Generation"** (Gao et al., 2024)
   Thorough survey of RAG techniques, evaluation, and future directions.

7. **"Chunking Strategies for LLM Applications"** -- Pinecone Learning Centre
   Detailed comparison of chunking approaches with benchmarks.

### Books

8. **"Building LLM Apps"** by Valentina Alto (O'Reilly, 2024)
   Practical guide covering RAG, agents, and deployment.

9. **"Designing Machine Learning Systems"** by Chip Huyen (O'Reilly, 2022)
   Production ML systems design -- relevant to RAG infrastructure.

---

## Community and Support

### Forums and Communities

- **LangChain Discord**: Active community for LangChain + RAG questions
- **LlamaIndex Discord**: Data framework discussions and support
- **Chroma Discord**: ChromaDB-specific help and feature discussions
- **r/LocalLLaMA** (Reddit): Local model running and RAG discussions
- **Hugging Face Forums**: Model selection and embedding questions

### Newsletters and Blogs

- **The Batch** (deeplearning.ai): Weekly AI news including RAG developments
- **LangChain Blog**: [blog.langchain.dev](https://blog.langchain.dev) -- Tutorials and patterns
- **Pinecone Learning Centre**: [pinecone.io/learn](https://www.pinecone.io/learn/) -- Vector search education
- **Weaviate Blog**: [weaviate.io/blog](https://weaviate.io/blog) -- Hybrid search and RAG patterns

### Video Courses

- **"LangChain for LLM Application Development"** -- DeepLearning.AI (short course, free)
- **"Building and Evaluating Advanced RAG Applications"** -- DeepLearning.AI (short course, free)
- **"Vector Databases: from Embeddings to Applications"** -- DeepLearning.AI (short course, free)

---

## Quick Reference Card

### Essential Commands

```bash
# Environment setup
python -m venv venv && source venv/bin/activate
pip install chromadb langchain sentence-transformers ollama

# Ollama model management
ollama pull llama3.3:8b          # Download generation model
ollama pull nomic-embed-text     # Download embedding model
ollama list                      # List installed models
ollama serve                     # Start server

# Project scripts (from ~/rag-workshop)
python scripts/verify_setup.py         # Check installation
python scripts/build_index.py          # Build vector store
python scripts/rag_pipeline.py --chat  # Interactive Q&A
python scripts/add_document.py <file>  # Add new document
python scripts/evaluate_rag.py         # Run quality tests
```

### Key Python Imports

```python
# Vector store
import chromadb
from chromadb.utils import embedding_functions

# Document processing
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document

# Local embeddings
from sentence_transformers import SentenceTransformer

# Re-ranking
from sentence_transformers import CrossEncoder

# Local LLM
import ollama

# Cloud embeddings (optional)
from openai import OpenAI
```

### Embedding Model Quick Selection

| Use Case | Model | Command |
|----------|-------|---------|
| Learning / Prototyping | all-MiniLM-L6-v2 | `pip install sentence-transformers` |
| Local Production | nomic-embed-text | `ollama pull nomic-embed-text` |
| Cloud (Best Quality) | text-embedding-3-small | OpenAI API key required |
| Multilingual | BAAI/bge-m3 | `pip install sentence-transformers` |

---

## Navigation
- Previous: [Assessment](05_assessment.md)
- [Back to Module Overview](README.md)
