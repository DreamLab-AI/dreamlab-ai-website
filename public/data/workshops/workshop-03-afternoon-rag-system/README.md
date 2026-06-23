# Module 10: RAG System Implementation

## Build an AI That Knows Your Documents

Welcome to the afternoon session of Day 3. Over the next 3 hours, you will build a complete Retrieval-Augmented Generation system -- an AI assistant that answers questions using your own documents, with full source citations.

## Module Overview

RAG is the most practical technique for making AI useful with your own data. Instead of relying on a model's general training, RAG retrieves relevant passages from your documents and uses them as context for generating accurate, grounded answers. By the end of this session, you will have a working system you can continue to develop.

## Learning Outcomes

By completing this module, you will:

- Understand the complete RAG pipeline from document ingestion to answer generation
- Set up and populate a ChromaDB vector database
- Implement document chunking and embedding strategies
- Build a query pipeline that retrieves context and generates cited answers
- Apply advanced techniques: hybrid search, re-ranking, and query expansion
- Evaluate retrieval quality and generation accuracy
- Create a personalised knowledge base for your own work

## Module Structure

### Chapter Navigation

1. **[Introduction](00_introduction.md)** -- Why RAG Matters (10 min)
   - The problem with standalone LLMs
   - Real-world RAG applications
   - Session structure and prerequisites

2. **[Core Concepts](01_concepts.md)** -- Architecture and Theory (30 min)
   - RAG pipeline architecture
   - Vector databases and embeddings
   - Document chunking strategies
   - Retrieval patterns and re-ranking

3. **[Hands-On Practice](02_hands_on.md)** -- Build Your RAG System (90 min)
   - Python environment setup
   - Document loading and chunking
   - ChromaDB vector store creation
   - Complete query pipeline with citations
   - Adding new documents incrementally

4. **[Exercises](03_exercises.md)** -- Deepen Your Skills (45 min)
   - Chunking strategy comparison
   - Metadata filtering
   - Hybrid search implementation
   - Query expansion
   - Re-ranking with cross-encoders

5. **[Project Work](04_project.md)** -- Apply to Your Work (30 min)
   - Choose your domain: Policy, Research, Projects, or Support
   - Build a personalised knowledge base
   - Test and iterate with real queries

6. **[Assessment](05_assessment.md)** -- Validate Your Understanding (15 min)
   - Knowledge check (10 questions)
   - Practical verification
   - Reflection and planning

7. **[Resources](06_resources.md)** -- Continue Your Journey
   - Library and framework documentation
   - Evaluation tools
   - Advanced RAG patterns
   - Deployment guides

## Prerequisites

- Completed the morning session on Local AI Models
- Ollama installed with at least one model (`llama3.3:8b` recommended)
- Python 3.10+ with pip
- Basic familiarity with running Python scripts

See [prerequisites.md](prerequisites.md) for full details.

## Learning Objectives

See [objectives.md](objectives.md) for detailed learning outcomes and success criteria.

## Session Timing

| Time | Activity |
|------|----------|
| 13:00 - 13:10 | Introduction and setup verification |
| 13:10 - 13:40 | Core concepts and architecture |
| 13:40 - 15:10 | Hands-on: Build your RAG pipeline |
| 15:10 - 15:30 | Coffee break |
| 15:30 - 16:15 | Exercises and advanced techniques |
| 16:15 - 16:45 | Project work on your own documents |
| 16:45 - 17:00 | Assessment and wrap-up |

## What You Will Build

```
Your Documents (PDF, Markdown, Text)
         |
         v
[Document Loader + Chunking]
         |
         v
[Embedding Model] --> [ChromaDB Vector Store]
         |
         v
[Semantic Search + Re-ranking]
         |
         v
[LLM Generates Cited Answer]
         |
         v
Accurate answer with source references
```

## Who This Module Is For

### Ideal Participants
- **Researchers and Academics** -- index papers, find cross-references, cite sources
- **Business Professionals** -- search policies, meeting notes, project documentation
- **Technical Teams** -- build internal knowledge bases, onboarding assistants
- **Anyone** who needs accurate AI answers from their own documents

### You Will Succeed If You
- Completed the morning session on Local AI Models
- Can run Python scripts from the command line
- Have a real collection of documents to work with (or are happy to use our samples)
- Are comfortable with iterative, hands-on learning

### No Deep Programming Required
- All code is provided -- you copy, paste, and run
- Explanations focus on concepts, not syntax
- Python familiarity helps but is not essential

## Technical Requirements

- **Python:** 3.10 or later
- **Ollama:** Installed with `llama3.3:8b` model
- **RAM:** 8 GB minimum (16 GB recommended)
- **Storage:** 10 GB free disk space
- **Internet:** For initial package installation only -- the RAG system runs fully offline

## Quick Start

If you have completed the prerequisites, jump straight to the hands-on session:

**[Start Building Your RAG System -->](02_hands_on.md)**

Or begin with the fundamentals:

**[Start with the Introduction -->](00_introduction.md)**

## Tips for Success

1. **Use your own documents** -- the system is far more interesting with real data
2. **Do not skip the setup verification** -- a broken environment wastes time later
3. **Experiment with parameters** -- change chunk sizes, swap embedding models, adjust prompts
4. **Read the error messages** -- they almost always tell you what went wrong
5. **Ask questions** -- use the break and Q&A time

---

*This module is part of the DreamLab AI "AI-Powered Knowledge Work" workshop series. Day 3 of 5.*
