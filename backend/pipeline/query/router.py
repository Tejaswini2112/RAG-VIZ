import json
from pipeline.query.generator import get_client
from config import CLAUDE_MODEL

# The five strategies the router can choose from.
VALID_STRATEGIES = {"none", "multi_query", "decomposition", "hyde", "step_back"}

ROUTER_PROMPT = """You are a query analysis module inside a RAG system.
Your job: look at the user's question and decide which query transformation strategy will produce the best retrieval results.

The strategies:

1. "none" — The question is simple, specific, and clear. Use it as-is.
   Example: "What is the company's revenue?"

2. "multi_query" — The question is ambiguous or could be interpreted in multiple ways. Generate multiple reworded versions to cover different angles.
   Example: "How does the system handle errors?" (could mean error logging, error recovery, error display, etc.)

3. "decomposition" — The question is complex and asks about multiple things at once. Break it into independent sub-questions.
   Example: "What are the main features and how do they compare to competitors?"

4. "hyde" — The question uses very different language from what the answer document would use. The question and the source text have low word overlap. A hypothetical answer passage would match the document's vocabulary better.
   Good for: "What makes this approach better than alternatives?" — a document wouldn't use this phrasing, but a hypothetical passage about trade-offs and advantages would.
   NOT for: questions about specific concepts, techniques, or terms that the document likely mentions directly.

5. "step_back" — The question asks about a specific detail, technique, or narrow topic. Broadening to the parent concept will retrieve better background context.
   Good for: "Why shouldn't I store a PDF as one single chunk?" → step back to "How does text chunking work and why is it important?"
   Good for: "What overlap size should I use?" → step back to "How do chunk size and overlap affect retrieval quality?"
   Good for: questions about a specific parameter, setting, technique, or design choice where the document likely explains the broader topic.

Respond with ONLY a JSON object, no markdown, no explanation:
{
  "strategy": "<one of: none, multi_query, decomposition, hyde, step_back>",
  "reason": "<one sentence explaining why you chose this strategy>"
}

User question: """


def route_query(question: str) -> dict:
    """
    Classify the user's question and decide which transformation strategy to use.

    Returns:
        { "strategy": "multi_query", "reason": "The question is ambiguous..." }
    """
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=150,
        messages=[{"role": "user", "content": ROUTER_PROMPT + question}],
    )

    raw = message.content[0].text.strip()

    # Parse the JSON response. If parsing fails, default to "none".
    try:
        result = json.loads(raw)
        strategy = result.get("strategy", "none")
        reason = result.get("reason", "")

        if strategy not in VALID_STRATEGIES:
            strategy = "none"
            reason = f"Router returned unknown strategy, defaulting to none. Raw: {raw}"

        return {"strategy": strategy, "reason": reason}

    except json.JSONDecodeError:
        return {
            "strategy": "none",
            "reason": f"Could not parse router response, defaulting to none.",
        }
