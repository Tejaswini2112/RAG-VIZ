"""
Phase 5 — Response verification (faithfulness + relevance).

After the LLM generates an answer, this module checks:
  1. Faithfulness — are all claims grounded in the provided context?
  2. Relevance   — does the answer actually address the user's question?

Returns verdicts + an accept/retry decision.
"""

import json
from pipeline.query.generator import get_client
from config import CLAUDE_MODEL


VERIFY_PROMPT = """You are a response verification module inside a RAG system.
You will receive three inputs:
1. The user's original question
2. The context chunks that were provided to the answer generator
3. The generated answer

Your job: evaluate the answer on TWO dimensions.

## Dimension 1 — Faithfulness
Is every factual claim in the answer supported by the provided context?

Labels:
- "faithful" — all claims are grounded in the context
- "minor_issues" — mostly grounded, but 1-2 small claims lack support
- "hallucinated" — significant claims are made up or contradict the context

## Dimension 2 — Relevance
Does the answer actually address the user's question?

Labels:
- "relevant" — directly and fully answers the question
- "partial" — addresses part of the question or goes off on tangents
- "off_topic" — does not address what was asked

Respond with ONLY a JSON object, no markdown:
{
  "faithfulness": "faithful",
  "faithfulness_reason": "one sentence explaining your judgement",
  "relevance": "relevant",
  "relevance_reason": "one sentence explaining your judgement",
  "issues": ["list of specific issues found, empty if none"]
}

User question: {question}

Context chunks:
{context}

Generated answer:
{answer}
"""


def verify_answer(question: str, chunks: list[dict], answer: str) -> dict:
    """
    Evaluate a generated answer for faithfulness and relevance.

    Returns:
        {
            "faithfulness": "faithful" | "minor_issues" | "hallucinated",
            "faithfulness_reason": "...",
            "relevance": "relevant" | "partial" | "off_topic",
            "relevance_reason": "...",
            "issues": [...],
            "accepted": True/False
        }
    """
    # Format the context chunks for the prompt
    context_text = ""
    for i, chunk in enumerate(chunks):
        context_text += f"\n[Chunk {i}] (source: {chunk['source']})\n{chunk['text']}\n"

    prompt = (
        VERIFY_PROMPT
        .replace("{question}", question)
        .replace("{context}", context_text)
        .replace("{answer}", answer)
    )

    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    try:
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")
    except (json.JSONDecodeError, ValueError):
        # Parse failure — accept the answer rather than blocking the user
        return {
            "faithfulness": "faithful",
            "faithfulness_reason": "Verification parse failed — accepting answer",
            "relevance": "relevant",
            "relevance_reason": "Verification parse failed — accepting answer",
            "issues": [],
            "accepted": True,
        }

    # Normalise fields with safe defaults
    faithfulness = result.get("faithfulness", "faithful")
    relevance = result.get("relevance", "relevant")
    issues = result.get("issues", [])
    if not isinstance(issues, list):
        issues = []

    # Decision: accept if both checks pass or have only minor issues
    accepted = (
        faithfulness in ("faithful", "minor_issues")
        and relevance in ("relevant", "partial")
    )

    return {
        "faithfulness": faithfulness,
        "faithfulness_reason": result.get("faithfulness_reason", ""),
        "relevance": relevance,
        "relevance_reason": result.get("relevance_reason", ""),
        "issues": issues,
        "accepted": accepted,
    }
