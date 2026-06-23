# Practical Exercises: RAG System Implementation

## Overview

These exercises build on the hands-on session. Each exercise targets a specific RAG skill, progressing from fundamental retrieval to advanced techniques. Complete them in order -- each one builds on concepts from the previous.

**Time:** 45-60 minutes total
**Format:** Progressive difficulty with clear success criteria

---

## Exercise 1: Chunking Strategy Comparison (15 minutes)

### Difficulty: Beginner

### Objective

Compare different chunking strategies and observe how they affect retrieval quality.

### Task

Create a script that indexes the same documents with three different chunking configurations, then runs identical queries against each to compare results.

### Steps

**1. Create `scripts/exercise_chunking.py`:**

```python
# scripts/exercise_chunking.py
"""Compare chunking strategies and their effect on retrieval."""

import chromadb
from chromadb.utils import embedding_functions
from load_documents import load_all_documents, chunk_documents


def build_collection(chunks, collection_name, db_path="data/chromadb"):
    """Build a ChromaDB collection from chunks."""
    client = chromadb.PersistentClient(path=db_path)
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    try:
        client.delete_collection(collection_name)
    except ValueError:
        pass

    collection = client.create_collection(
        name=collection_name,
        embedding_function=embedding_fn,
    )

    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        documents=[c.page_content for c in chunks],
        metadatas=[{"source": c.metadata.get("source", "")} for c in chunks],
    )

    return collection


def search_and_display(collection, query, label):
    """Search a collection and display the top result."""
    results = collection.query(query_texts=[query], n_results=1)
    doc = results["documents"][0][0]
    dist = results["distances"][0][0]
    print(f"  [{label}] Distance: {dist:.4f}")
    print(f"  Top result: {doc[:100]}...")
    print()


def main():
    docs = load_all_documents()

    # Strategy 1: Small chunks, small overlap
    small_chunks = chunk_documents(docs, chunk_size=200, chunk_overlap=30)
    coll_small = build_collection(small_chunks, "ex1_small")

    # Strategy 2: Medium chunks, medium overlap (our default)
    medium_chunks = chunk_documents(docs, chunk_size=500, chunk_overlap=100)
    coll_medium = build_collection(medium_chunks, "ex1_medium")

    # Strategy 3: Large chunks, large overlap
    large_chunks = chunk_documents(docs, chunk_size=1000, chunk_overlap=200)
    coll_large = build_collection(large_chunks, "ex1_large")

    print(f"Chunk counts: small={len(small_chunks)}, "
          f"medium={len(medium_chunks)}, large={len(large_chunks)}\n")

    # Test queries
    queries = [
        "What is the remote working policy?",
        "What was the revenue?",
        "How do I escalate a project issue?",
    ]

    for query in queries:
        print(f"Query: '{query}'")
        search_and_display(coll_small, query, "Small (200)")
        search_and_display(coll_medium, query, "Medium (500)")
        search_and_display(coll_large, query, "Large (1000)")
        print("-" * 50)


if __name__ == "__main__":
    main()
```

**2. Run and observe:**

```bash
cd ~/rag-workshop
python scripts/exercise_chunking.py
```

### Success Criteria

- [ ] Script runs without errors
- [ ] You can see the difference in chunk counts between strategies
- [ ] You observe how distance scores change with chunk size
- [ ] You can explain which strategy works best for different query types

### Discussion Questions

1. Which chunk size gives the lowest distance (best match) for factual queries?
2. Which gives the most context in the returned result?
3. Why might smaller chunks be better for precise questions but worse for broad ones?

---

## Exercise 2: Metadata Filtering (15 minutes)

### Difficulty: Intermediate

### Objective

Use ChromaDB's metadata filtering to restrict searches to specific document types or sources.

### Task

Add metadata tags to your documents and build a filtered search that only looks at specific categories.

### Steps

**1. Create `scripts/exercise_filtering.py`:**

```python
# scripts/exercise_filtering.py
"""Demonstrate metadata filtering in ChromaDB."""

import chromadb
from chromadb.utils import embedding_functions


def build_tagged_collection():
    """Create a collection with rich metadata tags."""
    client = chromadb.PersistentClient(path="data/chromadb")
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    try:
        client.delete_collection("ex2_filtered")
    except ValueError:
        pass

    collection = client.create_collection(
        name="ex2_filtered",
        embedding_function=embedding_fn,
    )

    # Documents with category metadata
    documents = [
        {
            "text": "Employees may work remotely up to 3 days per week.",
            "category": "policy",
            "department": "hr",
            "year": 2026,
        },
        {
            "text": "All remote workers must use the company VPN.",
            "category": "policy",
            "department": "it",
            "year": 2026,
        },
        {
            "text": "Revenue reached 12.4 million GBP in 2025.",
            "category": "finance",
            "department": "executive",
            "year": 2025,
        },
        {
            "text": "Customer retention rate stood at 94 percent.",
            "category": "finance",
            "department": "sales",
            "year": 2025,
        },
        {
            "text": "Risk registers are mandatory for projects over 50000 GBP.",
            "category": "process",
            "department": "pmo",
            "year": 2026,
        },
        {
            "text": "Weekly status reports are due every Friday by 16:00.",
            "category": "process",
            "department": "pmo",
            "year": 2026,
        },
        {
            "text": "Approved budget of 500000 GBP for AI platform.",
            "category": "finance",
            "department": "executive",
            "year": 2026,
        },
        {
            "text": "New VP of Engineering starts April 2026.",
            "category": "hr",
            "department": "executive",
            "year": 2026,
        },
    ]

    collection.add(
        ids=[f"doc_{i}" for i in range(len(documents))],
        documents=[d["text"] for d in documents],
        metadatas=[
            {
                "category": d["category"],
                "department": d["department"],
                "year": d["year"],
            }
            for d in documents
        ],
    )

    return collection


def filtered_search(collection, query, where_filter=None, label=""):
    """Search with optional metadata filter."""
    kwargs = {
        "query_texts": [query],
        "n_results": 3,
    }
    if where_filter:
        kwargs["where"] = where_filter

    results = collection.query(**kwargs)

    print(f"\n  [{label}] Query: '{query}'")
    if where_filter:
        print(f"  Filter: {where_filter}")
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        dist = results["distances"][0][i]
        print(f"    {i + 1}. [{meta['category']}/{meta['department']}] "
              f"{doc[:60]}... (dist: {dist:.3f})")


def main():
    collection = build_tagged_collection()

    query = "What are the financial figures?"

    # Unfiltered search
    filtered_search(collection, query, label="No filter")

    # Filter by category
    filtered_search(
        collection, query,
        where_filter={"category": "finance"},
        label="Finance only"
    )

    # Filter by department
    filtered_search(
        collection, query,
        where_filter={"department": "executive"},
        label="Executive only"
    )

    # Filter by year
    filtered_search(
        collection, query,
        where_filter={"year": 2026},
        label="2026 only"
    )

    # Compound filter (AND)
    filtered_search(
        collection, query,
        where_filter={
            "$and": [
                {"category": "finance"},
                {"year": 2026},
            ]
        },
        label="Finance + 2026"
    )

    print()


if __name__ == "__main__":
    main()
```

**2. Run:**

```bash
python scripts/exercise_filtering.py
```

### Success Criteria

- [ ] Filtered searches return only matching documents
- [ ] You can combine multiple filters with `$and`
- [ ] You understand when filtering improves result quality
- [ ] You can see how filtering changes the distance scores

### Reflection

Metadata filtering is powerful in production RAG systems. Consider:
- Filtering by document date to prefer recent information
- Filtering by department so each team only sees their own data
- Filtering by confidentiality level for access control

---

## Exercise 3: Hybrid Search (15 minutes)

### Difficulty: Intermediate

### Objective

Combine vector (semantic) search with keyword (exact match) search for better retrieval.

### Background

Pure vector search is excellent at understanding meaning but can miss exact terms (product codes, policy numbers, specific names). Keyword search catches exact matches but misses paraphrases. Hybrid search combines both.

### Steps

**1. Create `scripts/exercise_hybrid.py`:**

```python
# scripts/exercise_hybrid.py
"""Implement hybrid search: vector + keyword matching."""

import re
import chromadb
from chromadb.utils import embedding_functions
from load_documents import load_all_documents, chunk_documents


def keyword_search(chunks, query, top_k=5):
    """Simple keyword search using term frequency."""
    query_terms = set(query.lower().split())
    scored = []

    for i, chunk in enumerate(chunks):
        text = chunk.page_content.lower()
        # Count how many query terms appear in the chunk
        matches = sum(1 for term in query_terms if term in text)
        # Also check for exact phrase matches (bonus)
        phrase_bonus = 2 if query.lower() in text else 0
        score = matches + phrase_bonus
        if score > 0:
            scored.append((i, chunk, score))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:top_k]


def vector_search(collection, query, top_k=5):
    """Semantic vector search via ChromaDB."""
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
    )
    return results


def hybrid_search(collection, chunks, query, top_k=3,
                  vector_weight=0.7, keyword_weight=0.3):
    """Combine vector and keyword search results."""

    # Get vector results
    v_results = vector_search(collection, query, top_k=top_k * 2)

    # Get keyword results
    k_results = keyword_search(chunks, query, top_k=top_k * 2)

    # Normalise and merge scores
    combined = {}

    # Vector results: convert distance to score (lower distance = higher score)
    for i in range(len(v_results["documents"][0])):
        doc_id = v_results["ids"][0][i]
        distance = v_results["distances"][0][i]
        score = (1 - distance) * vector_weight
        combined[doc_id] = {
            "text": v_results["documents"][0][i],
            "source": v_results["metadatas"][0][i].get("source", ""),
            "score": score,
            "methods": ["vector"],
        }

    # Keyword results: normalise to 0-1 range
    if k_results:
        max_kw_score = max(r[2] for r in k_results)
        for idx, chunk, kw_score in k_results:
            doc_id = f"kw_{idx}"
            normalised = (kw_score / max_kw_score) * keyword_weight
            if doc_id in combined:
                combined[doc_id]["score"] += normalised
                combined[doc_id]["methods"].append("keyword")
            else:
                combined[doc_id] = {
                    "text": chunk.page_content,
                    "source": chunk.metadata.get("source", ""),
                    "score": normalised,
                    "methods": ["keyword"],
                }

    # Sort by combined score
    ranked = sorted(combined.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:top_k]


def main():
    # Load documents and build collection
    docs = load_all_documents()
    chunks = chunk_documents(docs)

    client = chromadb.PersistentClient(path="data/chromadb")
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    try:
        client.delete_collection("ex3_hybrid")
    except ValueError:
        pass

    collection = client.create_collection(
        name="ex3_hybrid", embedding_function=embedding_fn,
    )
    collection.add(
        ids=[f"chunk_{i}" for i in range(len(chunks))],
        documents=[c.page_content for c in chunks],
        metadatas=[{"source": c.metadata.get("source", "")} for c in chunks],
    )

    # Test: a query that benefits from keyword matching
    queries = [
        "ISO 27001 certification",     # Exact term -- keywords help
        "working from home allowance",  # Semantic -- vector helps
        "50000 GBP risk register",      # Mixed -- hybrid wins
    ]

    for query in queries:
        print(f"\nQuery: '{query}'")
        print("-" * 50)

        results = hybrid_search(collection, chunks, query)
        for i, r in enumerate(results):
            methods = " + ".join(r["methods"])
            print(f"  {i + 1}. [{methods}] score={r['score']:.3f}")
            print(f"     Source: {r['source']}")
            print(f"     Text: {r['text'][:80]}...")

    print()


if __name__ == "__main__":
    main()
```

**2. Run:**

```bash
python scripts/exercise_hybrid.py
```

### Success Criteria

- [ ] Hybrid search returns results from both methods
- [ ] Exact-term queries show keyword matches contributing
- [ ] Semantic queries show vector search dominating
- [ ] Combined score properly ranks the best results

### Bonus Challenge

Experiment with the `vector_weight` and `keyword_weight` parameters. What happens when you set keyword_weight to 0.8 and vector_weight to 0.2? When is this useful?

---

## Exercise 4: Query Expansion (10 minutes)

### Difficulty: Advanced

### Objective

Improve retrieval by generating multiple phrasings of the user's question and searching with all of them.

### Steps

**1. Create `scripts/exercise_expansion.py`:**

```python
# scripts/exercise_expansion.py
"""Use the LLM to expand queries for better retrieval."""

import ollama
import chromadb
from chromadb.utils import embedding_functions


def expand_query(original_query, model="llama3.3:8b"):
    """Generate alternative phrasings of a query using the LLM."""
    response = ollama.chat(
        model=model,
        messages=[{
            "role": "user",
            "content": f"""Generate exactly 3 alternative phrasings of this
question. Return only the alternatives, one per line, no numbering.

Original question: {original_query}"""
        }],
    )

    alternatives = [
        line.strip()
        for line in response["message"]["content"].strip().split("\n")
        if line.strip()
    ]
    return [original_query] + alternatives[:3]


def search_with_expansion(collection, query, n_results=3):
    """Search using the original query plus expanded variants."""
    # Generate query variants
    queries = expand_query(query)
    print(f"  Query variants:")
    for q in queries:
        print(f"    - {q}")

    # Search with all variants
    all_results = {}

    for q in queries:
        results = collection.query(query_texts=[q], n_results=n_results)
        for i in range(len(results["ids"][0])):
            doc_id = results["ids"][0][i]
            if doc_id not in all_results:
                all_results[doc_id] = {
                    "text": results["documents"][0][i],
                    "best_distance": results["distances"][0][i],
                    "matched_by": 1,
                }
            else:
                all_results[doc_id]["matched_by"] += 1
                all_results[doc_id]["best_distance"] = min(
                    all_results[doc_id]["best_distance"],
                    results["distances"][0][i],
                )

    # Rank by number of query variants that matched, then by distance
    ranked = sorted(
        all_results.values(),
        key=lambda x: (-x["matched_by"], x["best_distance"]),
    )
    return ranked[:n_results]


def main():
    client = chromadb.PersistentClient(path="data/chromadb")
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    collection = client.get_collection(
        name="workshop_docs", embedding_function=embedding_fn,
    )

    queries = [
        "What perks do remote workers get?",
        "How is the business doing financially?",
    ]

    for query in queries:
        print(f"\nOriginal query: '{query}'")
        results = search_with_expansion(collection, query)
        print(f"\n  Results:")
        for i, r in enumerate(results):
            print(f"    {i + 1}. matched by {r['matched_by']} variants, "
                  f"distance={r['best_distance']:.4f}")
            print(f"       {r['text'][:80]}...")
        print()


if __name__ == "__main__":
    main()
```

**2. Run:**

```bash
python scripts/exercise_expansion.py
```

### Success Criteria

- [ ] The LLM generates meaningful alternative phrasings
- [ ] Results matched by multiple variants rank higher
- [ ] Retrieval quality improves compared to single-query search

---

## Exercise 5: Re-ranking Retrieved Results (10 minutes)

### Difficulty: Advanced

### Objective

Use a cross-encoder model to re-rank initial retrieval results for higher precision.

### Steps

**1. Create `scripts/exercise_reranking.py`:**

```python
# scripts/exercise_reranking.py
"""Re-rank retrieved results using a cross-encoder model."""

from sentence_transformers import CrossEncoder
import chromadb
from chromadb.utils import embedding_functions


def retrieve_and_rerank(collection, query, initial_k=8, final_k=3):
    """Retrieve broadly, then re-rank for precision."""

    # Step 1: Broad retrieval (cast a wide net)
    results = collection.query(
        query_texts=[query],
        n_results=initial_k,
    )

    candidates = []
    for i in range(len(results["documents"][0])):
        candidates.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "vector_distance": results["distances"][0][i],
        })

    # Step 2: Re-rank with cross-encoder
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    pairs = [[query, c["text"]] for c in candidates]
    scores = reranker.predict(pairs)

    # Attach scores
    for candidate, score in zip(candidates, scores):
        candidate["rerank_score"] = float(score)

    # Sort by reranker score (higher is better)
    candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

    return candidates[:final_k]


def main():
    client = chromadb.PersistentClient(path="data/chromadb")
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    collection = client.get_collection(
        name="workshop_docs", embedding_function=embedding_fn,
    )

    queries = [
        "What equipment does the company provide for home offices?",
        "What are next year's strategic priorities?",
        "How long does a project manager have to resolve an issue?",
    ]

    for query in queries:
        print(f"\nQuery: '{query}'")
        print("-" * 50)

        results = retrieve_and_rerank(collection, query)
        for i, r in enumerate(results):
            print(f"  {i + 1}. Rerank score: {r['rerank_score']:.4f} "
                  f"| Vector dist: {r['vector_distance']:.4f}")
            print(f"     {r['text'][:100]}...")
        print()


if __name__ == "__main__":
    main()
```

**2. Run:**

```bash
python scripts/exercise_reranking.py
```

> **Note:** The cross-encoder model downloads on first run (~23 MB). It is much smaller than a generative model.

### Success Criteria

- [ ] Re-ranking changes the order of results compared to vector-only search
- [ ] The most relevant result has the highest rerank score
- [ ] You understand the trade-off: re-ranking is slower but more accurate

---

## Checkpoint: Review Your Progress

By this point you should have:

- [ ] Compared three chunking strategies and understood the trade-offs
- [ ] Used metadata filters to scope searches to specific categories
- [ ] Built a hybrid search combining vector and keyword methods
- [ ] Expanded queries using LLM-generated paraphrases
- [ ] Applied cross-encoder re-ranking for improved precision

These are the core techniques used in production RAG systems. The project work in the next section brings them all together.

---

## Navigation
- Previous: [Hands-On Practice](02_hands_on.md)
- Next: [Project Work](04_project.md)
- [Back to Module Overview](README.md)
