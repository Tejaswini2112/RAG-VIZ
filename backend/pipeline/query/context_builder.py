from typing import TypedDict, Literal

MAX_CONTEXT_TOKENS = 2000  # educational token budget for context window demo

PROMPT_OVERHEAD = """Use the following retrieved context to answer the question.
Be specific and cite which sources you're drawing from.
If the context doesn't contain enough information to answer confidently, say so.

Context:

Question:

Answer:"""


def count_tokens_approx(text: str) -> int:
    """Rough token count estimate: ~4 characters per token."""
    return len(text) // 4


class ChunkMeta(TypedDict):
    index: int
    source: str
    tokens: int
    token_start: int   # cumulative token offset before this chunk
    token_end: int     # cumulative token offset after this chunk
    status: Literal["full", "truncated", "removed"]
    truncated_pct: int  # 0 for full, 0-100 for truncated, 100 for removed
    text_preview: str   # first 200 chars of the original chunk text


def build_context(question: str, chunks: list[dict]) -> tuple[str, int, list[ChunkMeta]]:
    """
    Assemble the final prompt sent to Claude, tracking how each chunk
    fits within the token budget.

    Returns:
        prompt:         full string sent to Claude
        token_count:    estimated token count of the prompt
        chunk_metadata: per-chunk inclusion details for the UI
    """
    # Fixed overhead: template scaffolding + question
    overhead_tokens = count_tokens_approx(PROMPT_OVERHEAD) + count_tokens_approx(question)
    separator_tokens = count_tokens_approx("\n\n---\n\n")

    chunk_metadata: list[ChunkMeta] = []
    context_parts: list[str] = []
    running_tokens = overhead_tokens  # tracks cumulative usage

    for i, chunk in enumerate(chunks):
        header = f"[Source {i + 1} — {chunk['source']}]\n"
        full_text = header + chunk["text"]
        full_tokens = count_tokens_approx(full_text)
        sep = separator_tokens if context_parts else 0
        token_start = running_tokens

        if running_tokens + sep + full_tokens <= MAX_CONTEXT_TOKENS:
            # Fits entirely
            context_parts.append(full_text)
            running_tokens += sep + full_tokens
            chunk_metadata.append(ChunkMeta(
                index=i,
                source=chunk["source"],
                tokens=full_tokens,
                token_start=token_start,
                token_end=running_tokens,
                status="full",
                truncated_pct=0,
                text_preview=chunk["text"][:200],
            ))

        else:
            remaining = MAX_CONTEXT_TOKENS - running_tokens - sep
            if remaining >= 50:
                # Truncate to whatever fits
                available_chars = remaining * 4
                truncated_body = chunk["text"][:available_chars]
                truncated_text = header + truncated_body
                included_ratio = len(truncated_body) / max(len(chunk["text"]), 1)
                excluded_pct = round((1 - included_ratio) * 100)
                context_parts.append(truncated_text)
                tok = count_tokens_approx(truncated_text)
                running_tokens += sep + tok
                chunk_metadata.append(ChunkMeta(
                    index=i,
                    source=chunk["source"],
                    tokens=tok,
                    token_start=token_start,
                    token_end=running_tokens,
                    status="truncated",
                    truncated_pct=excluded_pct,
                    text_preview=chunk["text"][:200],
                ))
            else:
                # Not enough room even for a partial chunk
                chunk_metadata.append(ChunkMeta(
                    index=i,
                    source=chunk["source"],
                    tokens=full_tokens,
                    token_start=token_start,
                    token_end=token_start,  # contributes nothing
                    status="removed",
                    truncated_pct=100,
                    text_preview=chunk["text"][:200],
                ))

    context_text = "\n\n---\n\n".join(context_parts)
    prompt = f"""Use the following retrieved context to answer the question.
Be specific and cite which sources you're drawing from.
If the context doesn't contain enough information to answer confidently, say so.

Context:
{context_text}

Question: {question}

Answer:"""

    token_count = count_tokens_approx(prompt)
    return prompt, token_count, chunk_metadata
