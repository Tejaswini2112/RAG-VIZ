import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

# Singleton client — reused across requests
_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def generate(prompt: str) -> str:
    """
    Send the assembled prompt to Claude and return the answer text.

    max_tokens=1024 is enough for most answers. We'll make this
    configurable in a later phase.
    """
    client = get_client()
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
