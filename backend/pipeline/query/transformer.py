import json
from pipeline.query.generator import get_client
from config import CLAUDE_MODEL


MULTI_QUERY_PROMPT = """You are a query rewriting module. Your job is to take a user question and generate 3 alternative versions that approach the same information need from different angles.

Rules:
- Each version should be self-contained (understandable without the others)
- Cover different phrasings, synonyms, or perspectives
- Keep each version concise

Respond with ONLY a JSON array of 3 strings, no markdown:
["query 1", "query 2", "query 3"]

Original question: """


DECOMPOSITION_PROMPT = """You are a query decomposition module. Your job is to break a complex question into 2-4 simpler, independent sub-questions that together cover the original question.

Rules:
- Each sub-question should be answerable on its own
- Together they should cover the full scope of the original question
- Keep each sub-question concise

Respond with ONLY a JSON array of strings, no markdown:
["sub-question 1", "sub-question 2", ...]

Original question: """


HYDE_PROMPT = """You are a hypothetical document generator inside a RAG system.
Your job: given a user's question, write a short paragraph (3-5 sentences) that would appear in an ideal document answering this question.

Rules:
- Write as if you are the source document, not as a chatbot
- Use factual, informative language — the style of a textbook or technical doc
- Do NOT hedge or say "I think" — state things as facts
- The paragraph does not need to be actually correct — it just needs to capture the right terminology and concepts so that embedding it produces a good search vector

Respond with ONLY the paragraph, no markdown, no quotes, no preamble.

User question: """


STEP_BACK_PROMPT = """You are a query generalization module inside a RAG system.
Your job: take a specific or narrow question and produce a broader version that will retrieve more useful background context.

Rules:
- The broader question should cover the topic area of the original question
- It should be general enough to match explanatory or overview content
- Keep it to a single question, concise

Respond with ONLY the broader question, no markdown, no quotes, no preamble.

Original question: """


def transform_query(question: str, strategy: str) -> dict:
    """
    Apply the chosen transformation strategy to the question.

    Returns:
        {
            "method": "multi_query" | "decomposition" | "hyde" | "step_back" | "none",
            "original": "the original question",
            "queries": ["list", "of", "queries to retrieve for"]
        }

    For "none": queries = [original question]
    For "multi_query": queries = [original + 3 rewrites]
    For "decomposition": queries = [sub-questions]
    For "hyde": queries = [hypothetical answer paragraph]
    For "step_back": queries = [broad question, original question]
    """

    if strategy == "none":
        return {
            "method": "none",
            "original": question,
            "queries": [question],
        }

    if strategy == "multi_query":
        return _multi_query(question)

    if strategy == "decomposition":
        return _decompose(question)

    if strategy == "hyde":
        return _hyde(question)

    if strategy == "step_back":
        return _step_back(question)

    # Unknown strategy — safe fallback
    return {
        "method": "none",
        "original": question,
        "queries": [question],
    }


def _multi_query(question: str) -> dict:
    """Generate 3 alternative query versions + keep the original."""
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": MULTI_QUERY_PROMPT + question}],
    )

    raw = message.content[0].text.strip()

    try:
        rewrites = json.loads(raw)
        if not isinstance(rewrites, list) or len(rewrites) == 0:
            raise ValueError("Expected a non-empty list")

        # Include the original query + the rewrites
        all_queries = [question] + [str(q) for q in rewrites]

        return {
            "method": "multi_query",
            "original": question,
            "queries": all_queries,
        }
    except (json.JSONDecodeError, ValueError):
        # If LLM output is unparseable, fall back to original query
        return {
            "method": "none",
            "original": question,
            "queries": [question],
            "note": "multi_query generation failed — using original query",
        }


def _decompose(question: str) -> dict:
    """Break a complex question into 2-4 sub-questions."""
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": DECOMPOSITION_PROMPT + question}],
    )

    raw = message.content[0].text.strip()

    try:
        sub_questions = json.loads(raw)
        if not isinstance(sub_questions, list) or len(sub_questions) == 0:
            raise ValueError("Expected a non-empty list")

        return {
            "method": "decomposition",
            "original": question,
            "queries": [str(q) for q in sub_questions],
        }
    except (json.JSONDecodeError, ValueError):
        return {
            "method": "none",
            "original": question,
            "queries": [question],
            "note": "decomposition failed — using original query",
        }


def _hyde(question: str) -> dict:
    """
    HyDE: generate a hypothetical document passage that *would* answer the
    question, then use that passage as the search query.

    The hypothesis captures the right terminology and semantic space,
    producing better embedding matches than the raw question.
    """
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=300,
        messages=[{"role": "user", "content": HYDE_PROMPT + question}],
    )

    hypothesis = message.content[0].text.strip()

    if not hypothesis:
        return {
            "method": "none",
            "original": question,
            "queries": [question],
            "note": "HyDE generation returned empty — using original query",
        }

    return {
        "method": "hyde",
        "original": question,
        "queries": [hypothesis],
        "hypothesis": hypothesis,
    }


def _step_back(question: str) -> dict:
    """
    Step-back: generate a broader version of the question to retrieve
    background context, then search with both the broad and original query.
    """
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=150,
        messages=[{"role": "user", "content": STEP_BACK_PROMPT + question}],
    )

    broad_question = message.content[0].text.strip()

    if not broad_question:
        return {
            "method": "none",
            "original": question,
            "queries": [question],
            "note": "Step-back generation returned empty — using original query",
        }

    return {
        "method": "step_back",
        "original": question,
        "queries": [broad_question, question],
        "broad_query": broad_question,
    }
