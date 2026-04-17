from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(text: str) -> list[str]:
    """
    Split a long text into smaller overlapping chunks.

    RecursiveCharacterTextSplitter tries these separators in order:
        1. "\n\n"  — paragraph break (best split point)
        2. "\n"    — line break
        3. ". "    — sentence end
        4. " "     — word boundary
        5. ""      — character (last resort)

    It tries the "best" separator first. If a chunk is still too big,
    it falls back to the next separator. This keeps chunks semantically
    cleaner than a naive fixed-length cut.

    Overlap: the last CHUNK_OVERLAP characters of chunk N are repeated
    at the start of chunk N+1. This prevents an answer from being
    split awkwardly across a chunk boundary.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    # Filter out empty or whitespace-only chunks
    return [c.strip() for c in chunks if c.strip()]
