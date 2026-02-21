"""
Cloud Run Embedding API Service
Generates text embeddings using sentence-transformers all-MiniLM-L6-v2 model (384 dimensions)
"""

import os
from typing import Any, Dict, List, Optional, Union
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import numpy as np


# Global model instance (loaded once at startup)
model = None

# In-memory embedding storage: namespace -> key -> entry dict.
# This is ephemeral (lost on restart); suitable for stateless Cloud Run when paired
# with client-side IndexedDB caching (ruvector-search.ts).
embedding_storage: Dict[str, Dict[str, Any]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model at startup to avoid cold start delays"""
    global model
    print("Loading sentence-transformers model...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print(f"Model loaded. Embedding dimensions: {model.get_sentence_embedding_dimension()}")
    yield
    # Cleanup (if needed)
    model = None


app = FastAPI(
    title="Embedding API",
    description="Generate text embeddings using sentence-transformers",
    version="1.0.0",
    lifespan=lifespan
)


# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmbedRequest(BaseModel):
    """Request model for embedding generation"""
    text: Union[str, List[str]] = Field(
        ...,
        description="Single text string or list of text strings to embed"
    )


class EmbedResponse(BaseModel):
    """Response model for embedding generation"""
    embeddings: List[List[float]] = Field(
        ...,
        description="Generated embeddings (list of vectors)"
    )
    dimensions: int = Field(
        ...,
        description="Dimensionality of each embedding vector"
    )
    count: int = Field(
        ...,
        description="Number of embeddings generated"
    )


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "dimensions": model.get_sentence_embedding_dimension() if model else None
    }


@app.post("/embed", response_model=EmbedResponse)
async def generate_embeddings(request: EmbedRequest):
    """
    Generate embeddings for input text(s)

    Args:
        request: EmbedRequest with text (string or list of strings)

    Returns:
        EmbedResponse with embeddings, dimensions, and count
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Normalize input to list
    texts = [request.text] if isinstance(request.text, str) else request.text

    if not texts:
        raise HTTPException(status_code=400, detail="No text provided")

    if len(texts) > 100:
        raise HTTPException(
            status_code=400,
            detail="Too many texts. Maximum 100 per request"
        )

    try:
        # Generate embeddings
        embeddings = model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=True  # L2 normalization for cosine similarity
        )

        # Convert to list of lists for JSON serialization
        embeddings_list = embeddings.tolist()

        return EmbedResponse(
            embeddings=embeddings_list,
            dimensions=model.get_sentence_embedding_dimension(),
            count=len(embeddings_list)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {str(e)}"
        )


class StoreRequest(BaseModel):
    key: str
    namespace: str = "default"
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None


class ListRequest(BaseModel):
    namespace: str = "default"
    limit: int = Field(default=1000, ge=1, le=10000)


class SearchRequest(BaseModel):
    embedding: List[float]
    namespace: str = "default"
    k: int = Field(default=10, ge=1, le=100)
    minScore: float = Field(default=0.5, ge=0.0, le=1.0)


@app.post("/api/embeddings/store")
async def store_embedding(request: StoreRequest):
    """Store an embedding vector with optional metadata"""
    if request.namespace not in embedding_storage:
        embedding_storage[request.namespace] = {}
    embedding_storage[request.namespace][request.key] = {
        "key": request.key,
        "embedding": request.embedding,
        "metadata": request.metadata or {},
    }
    return {"success": True, "key": request.key, "namespace": request.namespace}


@app.post("/api/embeddings/list")
async def list_embeddings(request: ListRequest):
    """List stored embeddings in a namespace"""
    namespace_data = embedding_storage.get(request.namespace, {})
    entries = list(namespace_data.values())[: request.limit]
    return {"embeddings": entries, "count": len(entries), "namespace": request.namespace}


@app.post("/api/embeddings/search")
async def search_embeddings(request: SearchRequest):
    """Search for similar embeddings using cosine similarity"""
    if not request.embedding:
        raise HTTPException(status_code=400, detail="Empty embedding vector")

    namespace_data = embedding_storage.get(request.namespace, {})
    if not namespace_data:
        return {"results": [], "count": 0}

    query = np.array(request.embedding, dtype=np.float32)
    query_norm = float(np.linalg.norm(query))
    if query_norm > 0:
        query = query / query_norm

    results = []
    for entry in namespace_data.values():
        vec = np.array(entry["embedding"], dtype=np.float32)
        vec_norm = float(np.linalg.norm(vec))
        if vec_norm == 0:
            continue
        vec = vec / vec_norm
        score = float(np.dot(query, vec))
        if score >= request.minScore:
            results.append({
                "key": entry["key"],
                "score": score,
                "metadata": entry.get("metadata", {}),
            })

    results.sort(key=lambda r: r["score"], reverse=True)
    top = results[: request.k]
    return {"results": top, "count": len(top)}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Embedding API",
        "version": "1.0.0",
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST)",
            "store": "/api/embeddings/store (POST)",
            "list": "/api/embeddings/list (POST)",
            "search": "/api/embeddings/search (POST)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)
