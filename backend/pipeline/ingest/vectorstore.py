from __future__ import annotations

import chromadb
from config import CHROMA_PATH, COLLECTION_NAME

# Module-level singleton — one ChromaDB client per process.
_client: chromadb.PersistentClient | None = None


def get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        # PersistentClient saves everything to disk at CHROMA_PATH.
        # The data survives restarts — unlike the in-memory client.
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client


def store_chunks(
    chunks: list[str],
    embeddings: list[list[float]],
    source: str,
) -> None:
    """
    Store chunks + their embeddings into ChromaDB.

    Decision A: always wipe the old collection before storing.
    This means each upload replaces the previous document set.
    """
    client = get_client()

    # Delete old collection if it exists, then create fresh
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass  # collection didn't exist — that's fine

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},  # use cosine similarity, not L2
    )

    # ChromaDB requires a unique string ID per document
    ids = [f"{source}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": source, "chunk_index": i} for i in range(len(chunks))]

    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def query_collection(query_embedding: list[float], top_k: int) -> list[dict]:
    """
    Find the top_k most similar chunks to the query embedding.

    ChromaDB returns distances (lower = more similar for cosine space).
    We convert: similarity = 1 - distance, so higher = more relevant.

    Returns a list of dicts: [{ text, score, source, chunk_index }, ...]
    """
    client = get_client()
    collection = client.get_collection(COLLECTION_NAME)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "distances", "metadatas"],
    )

    chunks = []
    for i in range(len(results["documents"][0])):
        chunks.append({
            "text": results["documents"][0][i],
            "score": round(1 - results["distances"][0][i], 4),
            "source": results["metadatas"][0][i]["source"],
            "chunk_index": results["metadatas"][0][i]["chunk_index"],
        })

    return chunks
