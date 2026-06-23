# Assessment: RAG System Implementation

## Introduction

This assessment validates your understanding of RAG systems -- from core concepts through to practical implementation. It combines knowledge checks, practical tasks, and reflective analysis.

**Time:** 15-20 minutes
**Passing Score:** 80% (24/30 points)
**Format:** Multiple choice, practical verification, and reflection

---

## Part 1: Knowledge Check (10 points)

### Question 1: RAG Fundamentals (2 points)

What is the primary purpose of Retrieval-Augmented Generation?

A) To make language models run faster
B) To ground language model responses in specific, retrieved documents
C) To replace the need for a language model entirely
D) To translate text between languages

**Answer:** B

---

### Question 2: Embeddings (2 points)

What does an embedding model produce?

A) A summary of the input text
B) A translation of the text into another language
C) A dense numerical vector representing the text's semantic meaning
D) A list of keywords extracted from the text

**Answer:** C

---

### Question 3: Chunking Strategy (2 points)

Why is document chunking necessary in RAG systems?

A) To reduce storage costs
B) To make documents look prettier
C) To fit relevant passages within the LLM's context window and improve retrieval precision
D) To encrypt the documents for security

**Answer:** C

---

### Question 4: Vector Search (2 points)

In a vector database, when you search for a query embedding, what does a lower distance score indicate?

A) The result is less relevant
B) The result is more relevant (closer in meaning)
C) The document is shorter
D) The document was added more recently

**Answer:** B

---

### Question 5: Hybrid Search (2 points)

What advantage does hybrid search (vector + keyword) provide over pure vector search?

A) It is always faster
B) It catches exact terms and identifiers that semantic search may miss
C) It requires no embedding model
D) It works without a vector database

**Answer:** B

---

## Part 2: Concept Application (10 points)

### Question 6: Choosing Chunk Size (2 points)

You have a collection of legal contracts where users need to find specific clauses. Which chunking approach is most appropriate?

A) Very large chunks (2000+ characters) to preserve full contract sections
B) Small-to-medium chunks (300-500 characters) with sufficient overlap to capture individual clauses precisely
C) No chunking -- store entire contracts as single documents
D) Single-sentence chunks with no overlap

**Answer:** B

**Explanation:** Legal queries often target specific clauses. Small-to-medium chunks ensure that individual clauses are retrievable without being diluted by surrounding text. Overlap prevents clauses that fall on chunk boundaries from being lost.

---

### Question 7: Embedding Model Selection (2 points)

You are building a RAG system for a healthcare organisation that processes patient data. Which embedding approach is most appropriate?

A) OpenAI text-embedding-3-small (cloud API)
B) A local embedding model like all-MiniLM-L6-v2 or nomic-embed-text
C) Google's cloud embedding API
D) Any cloud provider -- they all have the same privacy guarantees

**Answer:** B

**Explanation:** Patient data is subject to strict privacy regulations. Local embedding models ensure that sensitive data never leaves the organisation's infrastructure. Cloud APIs would send patient information to third-party servers, creating compliance and privacy risks.

---

### Question 8: Citation Quality (2 points)

Your RAG system returns an answer with citations, but the citations point to irrelevant chunks. What is the most likely cause?

A) The language model is broken
B) The embedding model was not installed correctly
C) The retrieval step is returning poor results -- chunking strategy, embedding quality, or query formulation may need adjustment
D) The documents are too short

**Answer:** C

**Explanation:** Citation quality depends directly on retrieval quality. If the wrong chunks are retrieved, even a perfect LLM will cite the wrong sources. The fix is to improve retrieval through better chunking, a higher-quality embedding model, query expansion, or re-ranking.

---

### Question 9: Scaling Decisions (2 points)

You have built a working prototype with ChromaDB on your laptop. The system will be deployed to serve 50 users with 100,000 documents. Which change is most important?

A) Switch to a cloud-hosted vector database (Qdrant Cloud, Pinecone, or pgvector on a proper database server)
B) Use bigger document chunks
C) Remove all metadata from the documents
D) Switch from Python to a different programming language

**Answer:** A

**Explanation:** ChromaDB works well for prototyping but is not designed for multi-user production workloads at scale. A production vector database provides concurrent access, horizontal scaling, backup, and monitoring. The rest of the pipeline (chunking, embedding, prompting) largely stays the same.

---

### Question 10: Prompt Engineering for RAG (2 points)

Which prompting technique most effectively prevents the LLM from hallucinating beyond the retrieved context?

A) Asking the model to be creative
B) Providing no system instructions
C) Explicitly instructing the model to use ONLY the provided context and to say "not found" when the context does not contain the answer
D) Setting the temperature to maximum

**Answer:** C

**Explanation:** Strong system prompts that constrain the model to the retrieved context significantly reduce hallucination. Combined with citation requirements, this forces the model to ground every claim in a specific source.

---

## Part 3: Practical Verification (5 points)

Complete these checks against your working RAG system.

### Task 1: System Health (1 point)

Run the verification script and confirm all checks pass:

```bash
cd ~/rag-workshop
python scripts/verify_setup.py
```

- [ ] All dependencies installed
- [ ] Ollama connected and responsive
- [ ] ChromaDB data directory exists

---

### Task 2: Retrieval Accuracy (2 points)

Run a query against your vector store and verify the results:

```bash
python scripts/rag_pipeline.py --chat
```

Ask a question you know the answer to from your documents:
- [ ] The top result is from the correct source document
- [ ] The distance score is below 0.5 (indicating good relevance)

---

### Task 3: Citation Correctness (2 points)

Run the citation pipeline and verify:

```bash
python scripts/rag_with_citations.py
```

- [ ] The answer contains [Reference N] markers
- [ ] Each reference points to the correct source file
- [ ] The answer does not contain information absent from the retrieved context

---

## Part 4: Reflection and Planning (5 points)

### Question 11: Architecture Reflection (2 points)

**In 3-4 sentences, describe:**
- What chunking strategy did you choose and why?
- What embedding model did you use and why?
- What would you change if you were deploying this to production?

**Scoring:**
- 2 points: Clear reasoning linked to your specific use case
- 1 point: Generic answer without specific reasoning
- 0 points: No response or incorrect understanding

---

### Question 12: Troubleshooting Scenario (1 point)

**A colleague reports that the RAG system often returns answers about the wrong topic. The question is about "project budgets" but the top results are about "employee benefits." What are the two most likely causes and how would you investigate?**

**Scoring:**
- 1 point: Identifies chunking issues (chunks mixing unrelated content) or embedding quality as likely causes, and describes a concrete investigation step
- 0 points: No response or incorrect diagnosis

---

### Question 13: Use Case Planning (2 points)

**Describe a real-world RAG application you could build for your work or organisation:**

1. What documents would you index and who would use the system? (1 point)
2. What privacy, accuracy, or scale considerations would you need to address? (1 point)

**Scoring:**
- Full marks: Specific, realistic plan with concrete details
- Partial marks: Reasonable plan lacking specifics
- No marks: No response or implausible plan

---

## Scoring Summary

| Section | Points Available | Your Score |
|---------|-----------------|------------|
| Part 1: Knowledge Check | 10 | ___ / 10 |
| Part 2: Concept Application | 10 | ___ / 10 |
| Part 3: Practical Verification | 5 | ___ / 5 |
| Part 4: Reflection | 5 | ___ / 5 |
| **Total** | **30** | **___ / 30** |

**Passing Score: 24/30 (80%)**

---

## Interpreting Your Score

### 27-30 Points: Excellent

You have a strong grasp of RAG concepts and implementation. You are ready to build production-grade systems and can confidently advise others.

**Next steps:** Explore advanced patterns (agentic RAG, multi-modal retrieval) and consider contributing to open-source RAG tooling.

### 24-26 Points: Proficient

You understand the fundamentals and can build working RAG systems. A few areas may benefit from deeper exploration.

**Next steps:** Review any questions you missed, re-run the exercises for those topics, and build a second project to reinforce your skills.

### 18-23 Points: Developing

You have a foundation but some concepts need reinforcement. This is normal -- RAG involves many interacting components.

**Next steps:** Revisit the Core Concepts section, re-do the hands-on tutorial step by step, and focus on the areas where you scored lowest.

### Below 18 Points: Needs Review

The core concepts need more time. Do not be discouraged -- this is a complex topic.

**Next steps:** Re-read the Introduction and Core Concepts sections. Work through the hands-on tutorial again, taking extra time at each step. Ask questions in the workshop community channel.

---

## Certificate of Completion

Upon achieving a passing score (24/30), you have demonstrated:

- Understanding of RAG architecture and its components
- Ability to set up and configure a vector database
- Competence in document chunking and embedding strategies
- Skill in building query pipelines with citation tracking
- Knowledge of evaluation and quality assurance techniques
- Readiness to apply RAG systems to real-world problems

**Congratulations on completing the RAG System Implementation module!**

---

## Navigation
- Previous: [Project Work](04_project.md)
- Next: [Resources](06_resources.md)
- [Back to Module Overview](README.md)
