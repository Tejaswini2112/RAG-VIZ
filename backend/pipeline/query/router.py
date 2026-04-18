# import json
# from pipeline.query.generator import get_client
# from config import CLAUDE_MODEL

# # The five strategies the router can choose from.
# VALID_STRATEGIES = {"none", "multi_query", "decomposition", "hyde", "step_back"}

# ROUTER_PROMPT = """You are a query analysis module inside a RAG system.
# Your job: look at the user's question and decide which query transformation strategy will produce the best retrieval results.

# The strategies:

# 1. "none" — The question is simple, specific, and clear. Use it as-is.
#    Example: "What is the company's revenue?"

# 2. "multi_query" — The question is ambiguous or could be interpreted in multiple ways. Generate multiple reworded versions to cover different angles.
#    Example: "How does the system handle errors?" (could mean error logging, error recovery, error display, etc.)

# 3. "decomposition" — The question is complex and asks about multiple things at once. Break it into independent sub-questions.
#    Example: "What are the main features and how do they compare to competitors?"

# 4. "hyde" — The question uses very different language from what the answer document would use. The question and the source text have low word overlap. A hypothetical answer passage would match the document's vocabulary better.
#    Good for: "What makes this approach better than alternatives?" — a document wouldn't use this phrasing, but a hypothetical passage about trade-offs and advantages would.
#    NOT for: questions about specific concepts, techniques, or terms that the document likely mentions directly.

# 5. "step_back" — The question asks about a specific detail, technique, or narrow topic. Broadening to the parent concept will retrieve better background context.
#    Good for: "Why shouldn't I store a PDF as one single chunk?" → step back to "How does text chunking work and why is it important?"
#    Good for: "What overlap size should I use?" → step back to "How do chunk size and overlap affect retrieval quality?"
#    Good for: questions about a specific parameter, setting, technique, or design choice where the document likely explains the broader topic.

# Respond with ONLY a JSON object, no markdown, no explanation:
# {
#   "strategy": "<one of: none, multi_query, decomposition, hyde, step_back>",
#   "reason": "<one sentence explaining why you chose this strategy>"
# }

# User question: """


# def route_query(question: str) -> dict:
#     """
#     Classify the user's question and decide which transformation strategy to use.

#     Returns:
#         { "strategy": "multi_query", "reason": "The question is ambiguous..." }
#     """
#     client = get_client()
#     message = client.messages.create(
#         model=CLAUDE_MODEL,
#         max_tokens=150,
#         messages=[{"role": "user", "content": ROUTER_PROMPT + question}],
#     )

#     raw = message.content[0].text.strip()

#     # Parse the JSON response. If parsing fails, default to "none".
#     try:
#         result = json.loads(raw)
#         strategy = result.get("strategy", "none")
#         reason = result.get("reason", "")

#         if strategy not in VALID_STRATEGIES:
#             strategy = "none"
#             reason = f"Router returned unknown strategy, defaulting to none. Raw: {raw}"

#         return {"strategy": strategy, "reason": reason}

#     except json.JSONDecodeError:
#         return {
#             "strategy": "none",
#             "reason": f"Could not parse router response, defaulting to none.",
#         }


import json
import re
from pipeline.query.generator import get_client
from config import CLAUDE_MODEL

# The five strategies the router can choose from.
VALID_STRATEGIES = {"none", "multi_query", "decomposition", "hyde", "step_back"}


# -------------------------------
# Improved Router Prompt
# -------------------------------
ROUTER_PROMPT = """You are a query classifier for a RAG system.
Pick EXACTLY ONE of five transformation strategies. Classify based on
the SHAPE of the question — what KIND of answer best fits it — not on
surface keywords.

================================================================
THE FIVE STRATEGIES
================================================================

1. "none"          — DEFINITIONAL / FACTUAL / HOW-DOES-X-WORK question
                     whose answer a document would contain directly.
                     Retrieve as-is.

2. "multi_query"   — The MEANING of the question itself is unclear —
                     a reasonable reader could take it to mean several
                     different things. Rewrite multiple ways.

3. "decomposition" — The question covers TWO OR MORE SEPARATE topics
                     that would be answered from different document
                     sections. Split into independent parts.

4. "step_back"     — The meaning is clear, but the question is NARROW —
                     it asks about a specific parameter, numeric
                     setting, concrete design choice, or comparison of
                     named options. Zoom out to the parent concept.

5. "hyde"          — The question's FRAMING invites a conceptual,
                     exploratory, intuition-shaped, or opinion-shaped
                     answer that a document would NOT phrase the same
                     way — even when technical terms appear in the
                     question. Invent a hypothetical answer passage
                     that uses document-style vocabulary.

================================================================
DECISION PROCESS — stop at the first YES
================================================================

Q1. Does the question bundle TWO OR MORE SEPARATE topics that would be
    answered from different document sections?
        YES → "decomposition"

Q2. Is the question's MEANING genuinely ambiguous — could a reasonable
    reader take it in several DIFFERENT directions (not just "give more
    detail", but actually "did you mean A, B, or C")?
        YES → "multi_query"

Q3. Does the question's FRAMING invite a conceptual / intuition-shaped
    / opinion-shaped / exploratory answer that a document would NOT
    phrase the same way?
    Strong HYDE framings (these point to hyde EVEN IF technical terms
    appear in the question):
      - "what's the intuition behind ...", "intuitively ..."
      - "does X actually work", "does X really work"
      - "is X worth it", "is X worth the complexity"
      - "does X make sense", "does this actually make sense"
      - "why would anyone ...", "why would someone ..."
      - "what makes X good / better", "is X any good"
      - "in general, is X ...", "broadly speaking ..."
        YES → "hyde"

Q4. Does the question ask about a NARROW specific thing — a parameter,
    numeric setting, concrete design choice, or comparison of named
    options — rather than a broad definition?
        YES → "step_back"

Q5. Otherwise → "none"    ← default for direct factual questions

================================================================
DISAMBIGUATION — every pair that gets confused
================================================================

• "none" vs "hyde"  (a technical term ALONE does NOT force none —
  the FRAMING decides)
    - "What is a vector embedding?"               → none  (definitional)
    - "How does RAG work?"                        → none  (how-does-X)
    - "Why do we use embeddings in RAG?"          → none  (factual why)
    - "What's the intuition behind embeddings?"   → hyde  ("intuition" framing)
    - "Do embeddings actually capture meaning?"   → hyde  ("actually" framing)
    - "Why would anyone use RAG over fine-tuning?" → hyde ("why would anyone")
    - "Is RAG really worth the complexity?"       → hyde  ("worth" framing)
    - "Does chunking actually help retrieval?"    → hyde  ("actually help" framing)
    Rule: FRAMING decides. Conceptual/opinion-shaped framing
    ("intuition", "actually", "worth it", "make sense", "why would
    anyone", "what makes X good") → hyde, EVEN IF technical terms
    appear. Direct definition or how-does-X framing → none.

• "none" vs "step_back"  (both use technical vocabulary)
    - "What is BM25?"                             → none  (definition)
    - "How does HNSW work?"                       → none  (how-does-X)
    - "What is chunking?"                         → none  (definition)
    - "Why does BM25 use k1=1.2 by default?"      → step_back (narrow parameter)
    - "What overlap size for 512-token chunks?"   → step_back (narrow setting)
    - "Why shouldn't I store a PDF as one chunk?" → step_back (narrow choice)
    Rule: broad definition or how-does-X-work → none. Narrow parameter,
    numeric setting, or specific technical choice → step_back.

• "step_back" vs "multi_query"  (the new confusion)
    - "Should I use BM25 or dense retrieval?"     → step_back
      (meaning is clear — comparing two NAMED options; zoom out to
       the tradeoff passage)
    - "What overlap should I configure for 512-token chunks in my RAG
       pipeline for technical documentation?"     → step_back
      (long question, but ONE clear narrow topic — overlap setting)
    - "How do I improve retrieval quality?"       → multi_query
      (meaning is unclear — improve what? chunking, reranking,
       embeddings, prompts, query expansion?)
    - "How does the system handle errors?"        → multi_query
      (meaning is unclear — logging, recovery, retries, display?)
    Rule: if the MEANING is clear and narrow (even if the question is
    long or mentions multiple named options), it is step_back.
    multi_query is only for questions whose MEANING itself is
    ambiguous. Length does NOT imply ambiguity.

• "step_back" vs "hyde"  (the original pain point)
    - "Is 512 tokens a good chunk size?"          → step_back (narrow setting)
    - "Should I use BM25 or dense retrieval?"     → step_back (named options)
    - "What's the intuition behind embeddings?"   → hyde (conceptual framing)
    - "Does retrieval actually work in practice?" → hyde (evaluative framing)
    Rule: narrow parameter / setting / named choice → step_back.
    Conceptual / opinion / intuition framing → hyde.

• "decomposition" vs "multi_query"
    - "What is chunking and what is embedding?"   → decomposition (two separate topics)
    - "How do retrieval and reranking differ?"    → decomposition
    - "How do I improve retrieval?"               → multi_query (one topic, many angles)
    Rule: two separate topics retrieved independently → decomposition.
    One topic with multiple interpretations → multi_query.

================================================================
HARD RULES — read carefully
================================================================

• A technical term in the question does NOT force "none". FRAMING
  decides between none and hyde:
    - definitional / how-does-X framing        → none
    - "intuition / actually / worth / make
       sense / why would anyone" framing       → hyde

• "step_back" is for NARROW details (parameters, numeric settings,
  concrete choices, named-option comparisons). Broad "what is X" or
  "how does X work" is "none", not step_back.

• "multi_query" is for AMBIGUOUS MEANING, not for long questions and
  not for questions that compare named options. A clear comparison of
  two named things is step_back, not multi_query. Length does NOT
  imply ambiguity.

• "decomposition" is for two or more SEPARATE topics retrieved from
  different sections, not for any question that happens to contain
  multiple named items.

• When classifying, first identify the question's SHAPE:
    definition / factual / how-does-X          → none
    asks about narrow parameter / setting /
      concrete choice / named-option compare   → step_back
    invites intuition / opinion / "actually" /
      "worth it" / conceptual answer            → hyde
    covers multiple separate topics            → decomposition
    meaning itself is ambiguous                → multi_query

================================================================
OUTPUT FORMAT
================================================================

Return ONLY this JSON object — no markdown fences, no prose:

{
  "strategy": "<none | multi_query | decomposition | step_back | hyde>",
  "reason": "<one sentence naming the specific signal — the sub-question split (decomposition), the ambiguous meaning (multi_query), the narrow parameter/setting/named-option compare (step_back), the intuition/opinion/'actually' framing (hyde), or the direct-definition shape (none) — that decided the choice.>"
}

User question:
"""


# -------------------------------
# Utility: Safe JSON extraction
# -------------------------------
def extract_json(text: str):
    """Extract JSON object from model response safely."""
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None


# -------------------------------
# Optional Rule-Based Router (fast + deterministic)
# -------------------------------
def rule_based_router(question: str):
    q = question.lower()

    # Only trigger decomposition when the question clearly bundles
    # two separate topics joined by " and ". Skip "compare" /
    # "difference" — those are usually step_back ("compare BM25 vs
    # dense retrieval" is one comparison, not two topics).
    if " and " in q:
        return {
            "strategy": "decomposition",
            "reason": "Detected multiple parts joined by 'and' (rule-based).",
        }

    # No length-based rule. Long questions are not automatically
    # ambiguous — a descriptive step_back question can easily exceed
    # 20 words. Let the LLM decide.
    return None


# -------------------------------
# Main Router Function
# -------------------------------
def route_query(question: str) -> dict:
    """
    Classify the user's question and decide which transformation strategy to use.

    Returns:
        {
            "strategy": "multi_query",
            "reason": "...",
            "raw_response": "..."  # for debugging
        }
    """

    # Step 0: Try rule-based routing first
    rule_result = rule_based_router(question)
    if rule_result:
        return {
            **rule_result,
            "raw_response": "rule-based",
        }

    # Step 1: Call LLM
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=150,
        messages=[{"role": "user", "content": ROUTER_PROMPT + question}],
    )

    raw = message.content[0].text.strip()

    # Step 2: Extract JSON safely
    parsed = extract_json(raw)

    if parsed:
        strategy = parsed.get("strategy", "none")
        reason = parsed.get("reason", "")

        if strategy not in VALID_STRATEGIES:
            return {
                "strategy": "none",
                "reason": f"Invalid strategy returned. Raw: {raw}",
                "raw_response": raw,
            }

        return {
            "strategy": strategy,
            "reason": reason,
            "raw_response": raw,
        }

    # Step 3: Fallback if parsing fails
    return {
        "strategy": "none",
        "reason": "Failed to parse model response.",
        "raw_response": raw,
    }