import json
from pipeline.query.generator import get_client
from config import CLAUDE_MODEL


EVALUATE_PROMPT = """You are a relevance evaluation module inside a RAG system.
You will be given a user's question and a list of retrieved text chunks.
Your job: judge whether each chunk is relevant to answering the question.

For each chunk, assign one of these labels:
- "relevant" — the chunk directly helps answer the question
- "partially_relevant" — the chunk is related but doesn't directly answer
- "irrelevant" — the chunk has nothing to do with the question

Respond with ONLY a JSON array, one object per chunk, no markdown:
[
  {"index": 0, "relevance": "relevant", "reason": "one sentence"},
  {"index": 1, "relevance": "irrelevant", "reason": "one sentence"},
  ...
]

User question: {question}

Retrieved chunks:
{chunks_text}
"""


def evaluate_chunks(question: str, chunks: list[dict]) -> dict:
    """
    Evaluate whether each retrieved chunk is relevant to the question.

    Makes a single LLM call with all chunks, returns per-chunk verdicts
    and a source decision based on how many chunks are useful.

    Returns:
        {
            "verdicts": [
                {"index": 0, "relevance": "relevant", "reason": "..."},
                ...
            ],
            "decision": "documents" | "web_search" | "both",
            "kept_count": 3,
            "filtered_count": 2,
            "kept_chunks": [{ text, score, source, chunk_index, relevance, reason }, ...]
        }
    """
    if not chunks:
        return {
            "verdicts": [],
            "decision": "web_search",
            "kept_count": 0,
            "filtered_count": 0,
            "kept_chunks": [],
        }

    # Format chunks for the prompt
    chunks_text = ""
    for i, chunk in enumerate(chunks):
        chunks_text += f"\n[Chunk {i}] (source: {chunk['source']})\n{chunk['text']}\n"

    # Use .replace() instead of .format() — if chunk text contains curly braces
    # (e.g. JSON, code), .format() would misinterpret them as format placeholders
    # and raise a KeyError. .replace() is a safe literal substitution.
    prompt = EVALUATE_PROMPT.replace("{question}", question).replace("{chunks_text}", chunks_text)

    try:
        client = get_client()
        if client is None or client.api_key is None:
            raise ValueError("Anthropic API key is not configured. Set ANTHROPIC_API_KEY in .env file.")

        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as e:
        import traceback
        print(f"ERROR in evaluate_chunks: {type(e).__name__}: {str(e)}")
        print(f"Model: {CLAUDE_MODEL}")
        print(traceback.format_exc())
        raise

    raw = message.content[0].text.strip()

    # Parse the JSON response
    try:
        verdicts = json.loads(raw)
        if not isinstance(verdicts, list):
            raise ValueError("Expected a JSON array")
    except (json.JSONDecodeError, ValueError):
        # If parsing fails, assume all chunks are relevant (safe fallback)
        verdicts = [
            {"index": i, "relevance": "relevant", "reason": "Evaluation parse failed — keeping chunk"}
            for i in range(len(chunks))
        ]

    # Ensure we have a verdict for every chunk (LLM might skip some)
    verdict_map: dict[int, dict] = {}
    for v in verdicts:
        idx = v.get("index", -1)
        if 0 <= idx < len(chunks):
            verdict_map[idx] = v

    # Fill in missing verdicts
    for i in range(len(chunks)):
        if i not in verdict_map:
            verdict_map[i] = {"index": i, "relevance": "relevant", "reason": "No verdict returned — keeping chunk"}

    final_verdicts = [verdict_map[i] for i in range(len(chunks))]

    # Count relevance categories
    relevant_count = sum(
        1 for v in final_verdicts if v["relevance"] in ("relevant", "partially_relevant")
    )
    irrelevant_count = len(final_verdicts) - relevant_count

    # Build the list of chunks we're keeping (relevant + partially_relevant)
    kept_chunks = []
    for i, chunk in enumerate(chunks):
        verdict = final_verdicts[i]
        if verdict["relevance"] in ("relevant", "partially_relevant"):
            kept_chunks.append({
                **chunk,
                "relevance": verdict["relevance"],
                "reason": verdict["reason"],
            })

    # Source decision logic
    if relevant_count == 0:
        decision = "web_search"
    elif relevant_count / len(final_verdicts) >= 0.5:
        decision = "documents"
    else:
        decision = "both"

    return {
        "verdicts": final_verdicts,
        "decision": decision,
        "kept_count": len(kept_chunks),
        "filtered_count": irrelevant_count,
        "kept_chunks": kept_chunks,
    }
