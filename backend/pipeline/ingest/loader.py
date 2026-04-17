from pathlib import Path


def load_document(file_path: str) -> str:
    """
    Read a file and return its full text content as a plain string.
    Supports: .txt, .pdf, .docx
    """
    ext = Path(file_path).suffix.lower()

    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    elif ext == ".pdf":
        from langchain_community.document_loaders import PyPDFLoader
        loader = PyPDFLoader(file_path)
        pages = loader.load()
        # Each page is a separate Document object — join them all into one string
        return "\n\n".join(page.page_content for page in pages)

    elif ext == ".docx":
        from langchain_community.document_loaders import Docx2txtLoader
        loader = Docx2txtLoader(file_path)
        docs = loader.load()
        return "\n\n".join(doc.page_content for doc in docs)

    else:
        raise ValueError(f"Unsupported file type: {ext}")
