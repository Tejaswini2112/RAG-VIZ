from __future__ import annotations

import os

from config import TAVILY_API_KEY


def web_search(question: str, max_results: int = 5) -> dict:
    """
    Search the web using Tavily API and return results in the same
    chunk format as our vector DB retriever.

    Tavily is purpose-built for RAG: it returns clean extracted text,
    relevance scores, and source URLs — not raw HTML.

    If no TAVILY_API_KEY is configured, returns an empty result with a note.

    Returns:
        {
            "results": [{ text, score, source, chunk_index }, ...],
            "query": "the search query",
            "note": "" | "No API key configured"
        }
    """
    if not TAVILY_API_KEY:
        return {
            "results": [],
            "query": question,
            "note": "Web search skipped — no TAVILY_API_KEY configured",
        }

    # Import here so the app doesn't crash if tavily isn't installed
    # but TAVILY_API_KEY is also not set (the check above handles that)
    from tavily import TavilyClient

    client = TavilyClient(api_key=TAVILY_API_KEY)

    response = client.search(
        query=question,
        max_results=max_results,
        search_depth="basic",
        include_answer=False,
    )

    results = []
    for i, item in enumerate(response.get("results", [])):
        results.append({
            "text": item.get("content", ""),
            "score": item.get("score", 0.0),
            "source": item.get("url", "web"),
            "chunk_index": i,
        })

    return {
        "results": results,
        "query": question,
        "note": "",
    }
