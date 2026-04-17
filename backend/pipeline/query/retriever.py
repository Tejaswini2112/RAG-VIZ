from pipeline.ingest.embedder import embed_query
from pipeline.ingest.vectorstore import query_collection
from config import TOP_K


def retrieve(question: str) -> tuple[list[float], list[dict]]:
    """
    Embed the user's question and find the most relevant chunks.

    Returns:
        query_embedding: the vector representation of the question
        chunks: list of matching chunks with text, score, source
    """
    query_embedding = embed_query(question)
    chunks = query_collection(query_embedding, top_k=TOP_K)
    return query_embedding, chunks
