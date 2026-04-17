from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

# Module-level singleton — loaded once, reused on every request.
# SentenceTransformer takes ~1-2 seconds to load; we don't want
# that delay on every single query.
_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Convert a list of text strings into a list of embedding vectors.
    Used during document ingestion to embed all chunks.

    Returns: list of float lists, one vector per input text.
    Vector dimension: 384 (all-MiniLM-L6-v2 output size)
    """
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Convert a single query string into an embedding vector.
    Used during retrieval to embed the user's question.
    """
    model = get_model()
    embedding = model.encode([query], show_progress_bar=False)
    return embedding[0].tolist()
