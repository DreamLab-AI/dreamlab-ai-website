# Introduction to RAG Systems

## Why RAG Matters in 2026

Large Language Models are powerful, but they have fundamental limitations: their knowledge is frozen at training time, they cannot access your private data, and they sometimes generate plausible-sounding but incorrect information (hallucinations). Retrieval-Augmented Generation (RAG) addresses all three problems.

### The Core Idea

Instead of relying solely on what a model "knows" from training, RAG retrieves relevant information from your own documents and feeds it to the model as context. The model then generates an answer grounded in your actual data.

```
Your Question
     |
     v
[Retrieve relevant documents from your knowledge base]
     |
     v
[Combine documents + question into a prompt]
     |
     v
[LLM generates answer grounded in retrieved context]
     |
     v
Accurate, sourced answer
```

### Real-World Applications

- **Enterprise knowledge bases**: Ask questions about internal policies, procedures, and documentation
- **Customer support**: Ground chatbot answers in your actual product documentation
- **Legal research**: Search and synthesise information across thousands of case documents
- **Healthcare**: Query medical literature while keeping patient data private
- **Education**: Build tutoring systems that reference specific course materials

## What You'll Learn Today

By the end of this afternoon session, you will:

1. **Understand** the complete RAG pipeline -- from document ingestion to answer generation
2. **Set up** a vector database (ChromaDB) for semantic search
3. **Implement** document chunking and embedding strategies
4. **Build** a working RAG system using local models via Ollama
5. **Evaluate** retrieval quality and generation accuracy
6. **Apply** advanced techniques: hybrid search, re-ranking, and citation tracking

## Session Structure

**Afternoon Schedule (3 hours):**
- 13:00-13:45: Core concepts and architecture patterns
- 13:45-14:30: Hands-on: Build your first RAG pipeline
- 14:30-15:00: Coffee break + experimentation
- 15:00-16:00: Advanced techniques and project work

## Prerequisites

- Completed the morning session on Local AI Models
- Ollama installed with at least one model (llama3.3:8b recommended)
- Python 3.10+ with pip
- Basic familiarity with Python

## Pre-Session Checklist

- [ ] Ollama running with a model loaded
- [ ] Python virtual environment ready
- [ ] 10 GB free disk space (for vector database and embeddings)
- [ ] A collection of documents to use (PDFs, markdown, or text files)

---

## Navigation
- Next: [Core Concepts](01_concepts.md)
- [Back to Module Overview](README.md)
