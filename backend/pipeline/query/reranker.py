from __future__ import annotations

from sentence_transformers import CrossEncoder

from config import RERANK_MODEL, TOP_K

# Singleton — loaded once, reused across requests
_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    global _model
    if _model is None:
        _model = CrossEncoder(RERANK_MODEL)
    return _model


def rerank(question: str, chunks: list[dict]) -> dict:
    """
    Re-rank retrieved chunks using a cross-encoder model.

    A cross-encoder scores each (question, chunk_text) pair together,
    producing much more accurate relevance scores than cosine similarity
    from a bi-encoder. Then we take only the top-K results.

    Args:
        question: the original user question
        chunks:   list of chunk dicts with at least { text, score, source, chunk_index }

    Returns:
        {
            "before_rerank": 12,        # how many chunks came in
            "after_rerank": 5,          # how many kept (TOP_K)
            "results": [                # top-K chunks, sorted by rerank score
                { text, score, source, chunk_index, original_score, rerank_score },
                ...
            ]
        }
    """
    if not chunks:
        return {"before_rerank": 0, "after_rerank": 0, "dropped_count": 0, "results": []}

    model = _get_model()

    # Build (question, chunk_text) pairs for the cross-encoder
    pairs = [(question, chunk["text"]) for chunk in chunks]

    # Score all pairs in one batch
    scores = model.predict(pairs)

    # Attach rerank_score to each chunk, keep original cosine score.
    # Input order is already cosine-rank order (retriever sorts by score desc),
    # so the input index is the chunk's original rank.
    scored_chunks = []
    for original_rank, (chunk, rerank_score) in enumerate(zip(chunks, scores), start=1):
        scored_chunks.append({
            **chunk,
            "original_score": chunk["score"],      # cosine similarity from retrieval
            "rerank_score": float(rerank_score),    # cross-encoder relevance
            "original_rank": original_rank,         # 1-indexed rank by cosine
        })

    # Sort by rerank_score descending, assign new_rank, take top-K
    scored_chunks.sort(key=lambda c: c["rerank_score"], reverse=True)
    for new_rank, chunk in enumerate(scored_chunks, start=1):
        chunk["new_rank"] = new_rank
    top_k = scored_chunks[:TOP_K]

    # Replace "score" with the rerank score so downstream code uses the better score
    for chunk in top_k:
        chunk["score"] = chunk["rerank_score"]

    return {
        "before_rerank": len(chunks),
        "after_rerank": len(top_k),
        "dropped_count": len(chunks) - len(top_k),
        "results": top_k,
    }
