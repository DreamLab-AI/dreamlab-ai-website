# Learning Objectives -- RAG System Implementation

## Workshop Overview

Build a complete Retrieval-Augmented Generation system that answers questions from your own documents, with source citations and quality evaluation. By the end of this 3-hour afternoon session, you will have a working knowledge base you can continue to develop.

## Primary Learning Outcomes

By the end of this workshop, you will be able to:

### 1. RAG Architecture and Concepts

**You will be able to:**
- Explain the RAG pipeline: ingestion, embedding, retrieval, generation
- Identify when RAG is the right approach (vs fine-tuning, prompt engineering, or web search)
- Choose appropriate vector databases for different use cases
- Describe how embeddings represent semantic meaning as vectors
- Understand the trade-offs between local and cloud embedding models

**Success Criteria:**
- Can draw and explain the RAG pipeline from memory
- Can justify technology choices for a given scenario
- Can explain cosine similarity and distance scores

### 2. Document Processing and Chunking

**You will be able to:**
- Load documents from multiple formats (markdown, text, PDF)
- Apply recursive character splitting with configurable chunk size and overlap
- Choose chunk parameters appropriate to your document type
- Preserve source metadata through the chunking pipeline

**Success Criteria:**
- Successfully loaded and chunked at least 3 documents
- Can explain why chunk size and overlap matter
- Can describe when to use small vs large chunks

### 3. Vector Store Setup and Management

**You will be able to:**
- Create and configure a ChromaDB persistent collection
- Add documents with metadata to a vector store
- Run semantic similarity searches with distance scores
- Incrementally add new documents without rebuilding the entire index

**Success Criteria:**
- ChromaDB collection created and queryable
- Search returns relevant results for test queries
- New documents added successfully to existing collection

### 4. Embedding Model Selection and Usage

**You will be able to:**
- Use local embedding models (Sentence Transformers, Ollama)
- Optionally configure cloud embedding models (OpenAI)
- Compare embedding model quality, speed, and privacy characteristics
- Choose the right embedding model for your deployment context

**Success Criteria:**
- At least one embedding model producing vectors
- Can articulate the privacy implications of cloud vs local embeddings
- Understand dimension count and its relationship to quality

### 5. Query Pipeline Construction

**You will be able to:**
- Build a complete retrieve-then-generate pipeline
- Construct effective prompts that constrain the LLM to retrieved context
- Implement citation tracking with source attribution
- Create an interactive question-answering interface

**Success Criteria:**
- Pipeline produces grounded answers from retrieved context
- Answers include [Reference N] style citations
- Interactive chat mode works for ad-hoc queries

### 6. Advanced Retrieval Techniques

**You will be able to:**
- Apply metadata filtering to scope searches
- Implement hybrid search (vector + keyword)
- Use query expansion to improve recall
- Apply cross-encoder re-ranking for improved precision

**Success Criteria:**
- Metadata filtering narrows results correctly
- Hybrid search handles exact-term queries better than vector-only
- Re-ranking demonstrably improves result ordering

### 7. Quality Evaluation

**You will be able to:**
- Write test cases with expected facts and sources
- Verify that retrieved chunks come from the correct documents
- Check that generated answers are grounded in context (not hallucinated)
- Identify when chunking or embedding choices need adjustment

**Success Criteria:**
- Evaluation script runs and produces pass/fail results
- At least 80% of test cases pass
- Can diagnose and explain test failures

## Skill Levels

### Beginner Level (First 45 Minutes)

**Knowledge:**
- [ ] Understand what RAG is and why it exists
- [ ] Know the difference between vector search and keyword search
- [ ] Recognise the main components: embeddings, vector store, LLM

**Skills:**
- [ ] Set up a Python environment with RAG libraries
- [ ] Load and chunk documents
- [ ] Create a ChromaDB collection
- [ ] Run basic similarity searches

### Intermediate Level (45-120 Minutes)

**Knowledge:**
- [ ] Understand chunking trade-offs (size, overlap, strategy)
- [ ] Know how to evaluate retrieval quality
- [ ] Comprehend the role of prompting in RAG quality

**Skills:**
- [ ] Build a complete RAG pipeline end to end
- [ ] Add citation tracking to generated answers
- [ ] Apply metadata filtering
- [ ] Implement hybrid search

### Advanced Level (120-180 Minutes)

**Knowledge:**
- [ ] Understand re-ranking and when it helps
- [ ] Know production deployment considerations
- [ ] Recognise limitations and failure modes

**Skills:**
- [ ] Apply cross-encoder re-ranking
- [ ] Implement query expansion
- [ ] Build a domain-specific knowledge base
- [ ] Evaluate and iterate on system quality

## Profession-Specific Outcomes

### For Researchers and Academics
- Build a literature search assistant over your paper collection
- Cross-reference findings across multiple studies
- Generate cited summaries of research topics

### For Business Professionals
- Create a policy and compliance advisor
- Build a project knowledge hub across meeting notes and reports
- Enable quick retrieval of decisions and action items

### For Technical Teams
- Index internal documentation for instant search
- Build a troubleshooting assistant from support tickets
- Create an onboarding knowledge base for new team members

### For Creative and Content Professionals
- Search and retrieve from content archives
- Find and cite previous work for consistency
- Build a brand voice reference system

## Assessment Criteria

### Knowledge Assessment (10 points)
- RAG fundamentals and architecture (2 points)
- Embedding and vector concepts (2 points)
- Chunking strategy reasoning (2 points)
- Search and retrieval methods (2 points)
- Production considerations (2 points)

### Practical Skills (15 points)
- Environment setup and verification (2 points)
- Document loading and chunking (3 points)
- Vector store creation and querying (3 points)
- Complete RAG pipeline with citations (4 points)
- Advanced technique implementation (3 points)

### Application and Reflection (5 points)
- Domain-specific project completion (3 points)
- Quality evaluation and iteration (2 points)

**Passing Score:** 24/30 (80%)

## Success Indicators

### Immediate (End of Workshop)
- [ ] Working RAG pipeline on your laptop
- [ ] At least 5 documents indexed and searchable
- [ ] Citation-backed answers to domain queries
- [ ] Understanding of how to extend and improve the system

### Short-term (1 Week)
- [ ] Added your own real documents to the knowledge base
- [ ] Tried at least one alternative embedding model
- [ ] Shared the system with a colleague
- [ ] Identified 3+ use cases for your organisation

### Long-term (1 Month)
- [ ] Production-ready knowledge base in daily use
- [ ] Evaluation pipeline catching quality regressions
- [ ] Team members contributing documents
- [ ] Measurable time savings in information retrieval

---

[Begin Workshop -->](./00_introduction.md) | [Check Prerequisites](./prerequisites.md) | [Back to Workshop Overview](README.md)
