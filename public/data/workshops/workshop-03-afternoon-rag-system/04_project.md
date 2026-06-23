# Project Work: Build a Personal Knowledge Base

## Overview

In this project session, you will bring together everything you have learnt to build a RAG system tailored to your own work. Choose a project path that matches your profession, then follow the steps to create a working knowledge base you can continue to develop after the workshop.

**Time:** 30-45 minutes
**Outcome:** A personalised RAG system you can use immediately

---

## Choose Your Project Path

Select the path most relevant to your daily work:

| Path | Best for | Documents you will use |
|------|----------|----------------------|
| **A: Policy & Compliance Advisor** | HR, Legal, Governance | Policies, regulations, handbooks |
| **B: Research Literature Assistant** | Academics, Analysts | Papers, reports, literature reviews |
| **C: Project Knowledge Hub** | Project Managers, Consultants | Meeting notes, plans, status reports |
| **D: Customer Support Bot** | Support Teams, Product Teams | FAQs, product docs, troubleshooting guides |

---

## Path A: Policy & Compliance Advisor

### Scenario

You manage a library of policies, procedures, and compliance documents. Staff frequently ask questions about what they can and cannot do. You want an AI assistant that gives accurate, cited answers from the authoritative documents.

### Step 1: Gather Your Documents (5 minutes)

Collect 5-10 policy documents. If you do not have real ones to hand, create sample files:

```bash
mkdir -p ~/rag-workshop/project-docs

# Create sample policies (or copy your own real documents)
cat > ~/rag-workshop/project-docs/data_protection.md << 'EOF'
# Data Protection Policy v3.2

## Scope
This policy applies to all employees, contractors, and third-party
processors who handle personal data on behalf of the organisation.

## Data Classification
- Public: Published materials, marketing content
- Internal: Business documents, meeting notes
- Confidential: Customer PII, financial records, HR data
- Restricted: Board papers, M&A documents, security credentials

## Retention Periods
- Customer records: 7 years after last interaction
- Employee records: 6 years after departure
- Financial records: 7 years (statutory requirement)
- Marketing consent: Until withdrawn, reviewed annually

## Subject Access Requests
Respond within 30 calendar days. The Data Protection Officer must
review all SARs before response. No fee may be charged unless the
request is manifestly unfounded or excessive.

## Breach Notification
Report breaches to the DPO within 24 hours of discovery.
The DPO must notify the ICO within 72 hours if the breach poses
a risk to individuals' rights and freedoms.
EOF
```

### Step 2: Build and Index (10 minutes)

```python
# scripts/project_policy.py
"""Policy Advisor RAG system."""

import os
import chromadb
from chromadb.utils import embedding_functions
from load_documents import load_all_documents, chunk_documents
import ollama


def build_policy_index():
    docs = load_all_documents("project-docs")
    chunks = chunk_documents(docs, chunk_size=400, chunk_overlap=80)

    client = chromadb.PersistentClient(path="data/policy_db")
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    try:
        client.delete_collection("policies")
    except ValueError:
        pass

    collection = client.create_collection(
        name="policies", embedding_function=embedding_fn,
    )

    collection.add(
        ids=[f"policy_{i}" for i in range(len(chunks))],
        documents=[c.page_content for c in chunks],
        metadatas=[{
            "source": c.metadata.get("source", ""),
            "file_type": c.metadata.get("file_type", ""),
        } for c in chunks],
    )

    print(f"Indexed {collection.count()} policy chunks.")
    return collection


def ask_policy(collection, question):
    results = collection.query(query_texts=[question], n_results=3)

    context_parts = []
    for i in range(len(results["documents"][0])):
        source = results["metadatas"][0][i]["source"]
        text = results["documents"][0][i]
        context_parts.append(f"[Ref {i+1}: {source}]\n{text}")

    context = "\n\n---\n\n".join(context_parts)

    response = ollama.chat(
        model="llama3.3:8b",
        messages=[{
            "role": "user",
            "content": f"""You are a compliance advisor. Answer the question
using ONLY the policy documents provided. Cite each claim with [Ref N].
If the answer is not in the policies, say so.

POLICY DOCUMENTS:
{context}

QUESTION: {question}

ANSWER:"""
        }],
    )

    return response["message"]["content"], results


if __name__ == "__main__":
    collection = build_policy_index()

    questions = [
        "How long must we keep customer records?",
        "What do I do if there is a data breach?",
        "How quickly must we respond to a subject access request?",
    ]

    for q in questions:
        answer, sources = ask_policy(collection, q)
        print(f"\nQ: {q}")
        print(f"A: {answer}\n")
```

### Step 3: Test and Iterate (15 minutes)

Run the system and refine:
- Try questions that span multiple policies
- Check whether citations point to the correct documents
- Adjust chunk size if answers are incomplete or too broad

---

## Path B: Research Literature Assistant

### Scenario

You have a collection of research papers, reports, and literature reviews. You want an AI assistant that can answer questions about specific findings, compare results across studies, and always cite which paper the information comes from.

### Step 1: Prepare Your Research Documents (5 minutes)

```bash
mkdir -p ~/rag-workshop/research-docs

# Add your own PDFs or create sample abstracts
cat > ~/rag-workshop/research-docs/study_attention.md << 'EOF'
# Attention Is All You Need (Vaswani et al., 2017)

## Abstract
We propose a new network architecture, the Transformer, based entirely
on attention mechanisms, dispensing with recurrence and convolutions.
The architecture achieves 28.4 BLEU on the WMT 2014 English-to-German
translation task, surpassing the best existing results by over 2 BLEU.

## Key Findings
- Self-attention allows modelling dependencies regardless of distance
- Training time is significantly reduced compared to recurrent models
- The model parallelises much better than architectures using recurrence
- Multi-head attention allows joint attention from different subspaces

## Methodology
Encoder-decoder architecture with 6 layers each. 8 attention heads.
Model dimension 512. Trained on 8 P100 GPUs for 3.5 days.
EOF

cat > ~/rag-workshop/research-docs/study_bert.md << 'EOF'
# BERT: Pre-training of Deep Bidirectional Transformers (Devlin et al., 2018)

## Abstract
BERT is designed to pre-train deep bidirectional representations from
unlabelled text by jointly conditioning on both left and right context.
Fine-tuned BERT achieves state-of-the-art on 11 NLP tasks.

## Key Findings
- Bidirectional pre-training is crucial for language understanding
- Masked language modelling enables deep bidirectional representations
- Fine-tuning requires minimal task-specific architecture
- BERT Large achieves 80.5% accuracy on MultiNLI

## Impact
Established the pre-train then fine-tune paradigm that dominates NLP.
Led to hundreds of BERT variants: RoBERTa, ALBERT, DistilBERT, etc.
EOF
```

### Step 2: Build the Research Index (10 minutes)

```python
# scripts/project_research.py
"""Research Literature Assistant."""

from load_documents import load_all_documents, chunk_documents
import chromadb
from chromadb.utils import embedding_functions
import ollama


def build_research_index():
    docs = load_all_documents("research-docs")
    # Smaller chunks for precise citation of specific findings
    chunks = chunk_documents(docs, chunk_size=300, chunk_overlap=60)

    client = chromadb.PersistentClient(path="data/research_db")
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    try:
        client.delete_collection("research")
    except ValueError:
        pass

    collection = client.create_collection(
        name="research", embedding_function=ef,
    )

    collection.add(
        ids=[f"paper_{i}" for i in range(len(chunks))],
        documents=[c.page_content for c in chunks],
        metadatas=[{"source": c.metadata.get("source", "")}
                   for c in chunks],
    )

    print(f"Indexed {collection.count()} research chunks.")
    return collection


def ask_research(collection, question):
    results = collection.query(query_texts=[question], n_results=4)

    context_parts = []
    for i in range(len(results["documents"][0])):
        source = results["metadatas"][0][i]["source"]
        text = results["documents"][0][i]
        context_parts.append(f"[Paper {i+1}: {source}]\n{text}")

    context = "\n\n---\n\n".join(context_parts)

    response = ollama.chat(
        model="llama3.3:8b",
        messages=[{
            "role": "user",
            "content": f"""You are a research assistant. Answer the question
using ONLY the papers provided. Cite each claim as [Paper N]. Compare
findings across papers where relevant.

PAPERS:
{context}

QUESTION: {question}

ANSWER:"""
        }],
    )

    return response["message"]["content"]


if __name__ == "__main__":
    collection = build_research_index()

    questions = [
        "How does the Transformer compare to recurrent models?",
        "What is masked language modelling?",
        "Compare the training approaches of Transformer and BERT.",
    ]

    for q in questions:
        answer = ask_research(collection, q)
        print(f"\nQ: {q}\nA: {answer}\n")
```

### Step 3: Test and Iterate (15 minutes)

- Ask questions that require synthesising across multiple papers
- Check that citations correctly attribute claims to the right study
- Try adding more papers and re-indexing

---

## Path C: Project Knowledge Hub

### Scenario

You manage multiple projects and need quick access to decisions, action items, and status across all of them.

### Step 1: Gather Project Documents (5 minutes)

```bash
mkdir -p ~/rag-workshop/project-docs
# Copy meeting notes, project plans, status reports, or create samples
```

### Step 2: Build with Meeting-Aware Metadata (10 minutes)

Use the same pattern as Path A, but add metadata fields for:
- `project_name` -- which project the document belongs to
- `meeting_date` -- when the meeting occurred
- `document_type` -- "meeting_notes", "status_report", "decision_log"

This enables filtered queries like: "Show me decisions from Project Alpha in March."

### Step 3: Test Queries (15 minutes)

Useful test queries:
- "What are the open action items for Project Alpha?"
- "What decisions were made in the last board meeting?"
- "What risks have been identified across all projects?"

---

## Path D: Customer Support Bot

### Scenario

You want a support assistant that answers customer questions using your product documentation, FAQs, and troubleshooting guides.

### Step 1: Gather Support Documents (5 minutes)

```bash
mkdir -p ~/rag-workshop/support-docs
# Add product manuals, FAQ pages, troubleshooting guides
```

### Step 2: Build with Support-Specific Prompting (10 minutes)

Use the same RAG pipeline but adjust the system prompt:

```python
prompt = f"""You are a friendly customer support assistant. Answer the
customer's question using ONLY the product documentation provided.
Be clear and concise. If you cannot find the answer, say:
"I don't have that information. Please contact support@company.com."

Use step-by-step instructions where appropriate.
Always cite the source document.

DOCUMENTATION:
{context}

CUSTOMER QUESTION: {query}

ANSWER:"""
```

### Step 3: Test Edge Cases (15 minutes)

- Questions that are outside the documentation scope
- Questions with ambiguous wording
- Questions that need information from multiple documents

---

## Project Deliverable

### What to Submit

By the end of this session, you should have:

1. **A working RAG system** tailored to your chosen domain
2. **At least 5 documents** indexed in your vector store
3. **3 test queries** with verified correct answers and citations
4. **Notes on your chunking and embedding choices** and why you made them

### Self-Assessment Checklist

- [ ] My system loads documents without errors
- [ ] Search returns relevant results for my domain queries
- [ ] The LLM generates answers grounded in retrieved context
- [ ] Citations correctly point to source documents
- [ ] I can add new documents without rebuilding from scratch
- [ ] I understand which parameters to tune for better results

---

## Extending Your Project After the Workshop

### Immediate Next Steps

1. **Add more documents** -- the system improves with more data
2. **Try Ollama embeddings** (`nomic-embed-text`) for better quality
3. **Add re-ranking** from Exercise 5 to your pipeline
4. **Build a simple web interface** using Streamlit or Gradio:

```python
# Install: pip install streamlit
# Run: streamlit run app.py

import streamlit as st
from rag_pipeline import ask, get_collection

st.title("My Knowledge Base")
collection = get_collection()

query = st.text_input("Ask a question:")
if query:
    result = ask(query, collection=collection)
    st.write(result["answer"])

    with st.expander("Sources"):
        for src in result["sources"]:
            st.write(f"- {src['source']} (relevance: "
                     f"{1 - src['distance']:.0%})")
```

### Longer-Term Ideas

- Schedule automatic document ingestion from shared drives
- Add access control so different teams see different documents
- Implement feedback loops -- let users rate answer quality
- Deploy as an internal API for other tools to consume
- Add a Slack or Teams integration for team-wide access

---

## Navigation
- Previous: [Exercises](03_exercises.md)
- Next: [Assessment](05_assessment.md)
- [Back to Workshop Overview](README.md)
