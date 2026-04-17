def count_tokens_approx(text: str) -> int:
    """
    Rough token count estimate: ~4 characters per token.
    Good enough for display purposes without adding an API call.
    """
    return len(text) // 4


def build_context(question: str, chunks: list[dict]) -> tuple[str, int]:
    """
    Assemble the final prompt we'll send to Claude.

    Structure:
        [Context block — retrieved chunks, numbered with their source]
        [The user's question]

    Returns:
        prompt:      the full string to send to Claude
        token_count: estimated token usage
    """
    context_parts = []
    for i, chunk in enumerate(chunks):
        context_parts.append(
            f"[Source {i + 1} — {chunk['source']}]\n{chunk['text']}"
        )

    context_text = "\n\n---\n\n".join(context_parts)

    prompt = f"""Use the following retrieved context to answer the question.
Be specific and cite which sources you're drawing from.
If the context doesn't contain enough information to answer confidently, say so.

Context:
{context_text}

Question: {question}

Answer:"""

    token_count = count_tokens_approx(prompt)
    return prompt, token_count
