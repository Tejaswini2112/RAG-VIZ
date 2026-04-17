from pipeline.ingest.embedder import embed_query
from pipeline.ingest.vectorstore import query_collection
from config import TOP_K


def retrieve(question: str) -> tuple[list[float], list[dict]]:
    """
    Single-query retrieval (kept for backward compatibility / simple cases).
    """
    query_embedding = embed_query(question)
    chunks = query_collection(query_embedding, top_k=TOP_K)
    return query_embedding, chunks


def retrieve_multi(queries: list[str]) -> dict:
    """
    Multi-query retrieval: embed each query, retrieve for each, merge + deduplicate.

    Used when the transformer produces multiple queries (multi_query, decomposition).
    For a single query (strategy=none), this still works — just one retrieval pass.

    Deduplication: if the same chunk text appears from multiple queries,
    keep the instance with the highest similarity score.

    Returns:
        {
            "total_retrieved": 15,      # before dedup
            "after_dedup": 8,           # after dedup
            "per_query": [{ query: "...", results: [...] }, ...],  # per-query breakdown
            "results": [{ text, score, source, chunk_index }, ...]
        }
    """
    all_chunks = []
    per_query = []

    for query in queries:
        query_embedding = embed_query(query)
        chunks = query_collection(query_embedding, top_k=TOP_K)
        per_query.append({"query": query, "results": chunks})
        all_chunks.extend(chunks)

    total_retrieved = len(all_chunks)

    # Deduplicate: group by chunk text, keep highest score
    seen: dict[str, dict] = {}
    for chunk in all_chunks:
        text = chunk["text"]
        if text not in seen or chunk["score"] > seen[text]["score"]:
            seen[text] = chunk

    # Sort by score descending — best chunks first
    deduped = sorted(seen.values(), key=lambda c: c["score"], reverse=True)

    return {
        "total_retrieved": total_retrieved,
        "after_dedup": len(deduped),
        "per_query": per_query,
        "results": deduped,
    }
