import os
from dotenv import load_dotenv

load_dotenv()

# LLM
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-sonnet-4-6"

# Embeddings — runs locally, no API key needed
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Vector DB — stored as a folder on disk
CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "user_docs"

# Chunking
CHUNK_SIZE = 500      # characters per chunk
CHUNK_OVERLAP = 50    # characters shared between adjacent chunks

# Retrieval
TOP_K = 5             # how many chunks to retrieve per query

# File storage
UPLOAD_DIR = "./uploads"
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx"}
