import asyncio
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from config import UPLOAD_DIR, SUPPORTED_EXTENSIONS, CHUNK_SIZE, EMBEDDING_MODEL, COLLECTION_NAME
from pipeline.tracer import PipelineTracer
from pipeline.ingest.loader import load_document
from pipeline.ingest.chunker import chunk_text
from pipeline.ingest.embedder import embed_texts
from pipeline.ingest.vectorstore import store_chunks

router = APIRouter()

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # Validate file type before doing anything else
    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Supported: .pdf, .txt, .docx",
        )

    # Read file content and save to disk
    # Path(file.filename).name strips any directory components (security: prevents path traversal)
    safe_name = Path(file.filename).name
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    tracer = PipelineTracer()

    async def run_pipeline():
        """
        Runs the 4-step ingest pipeline.

        Each slow step runs in a thread pool via run_in_executor so it
        doesn't block the asyncio event loop (which would freeze the SSE stream).
        We emit 'running' before the step and 'complete' after.
        """
        loop = asyncio.get_running_loop()
        try:
            # Step 1: Load
            await tracer.emit("load", "running", {"filename": safe_name})
            text = await loop.run_in_executor(None, load_document, file_path)
            await tracer.emit("load", "complete", {
                "filename": safe_name,
                "char_count": len(text),
            })

            # Step 2: Chunk
            await tracer.emit("chunk", "running", {})
            chunks = await loop.run_in_executor(None, chunk_text, text)
            await tracer.emit("chunk", "complete", {
                "chunk_count": len(chunks),
                "chunk_size": CHUNK_SIZE,
            })

            # Step 3: Embed
            await tracer.emit("embed", "running", {"model": EMBEDDING_MODEL})
            embeddings = await loop.run_in_executor(None, embed_texts, chunks)
            await tracer.emit("embed", "complete", {
                "model": EMBEDDING_MODEL,
                "dimensions": len(embeddings[0]),
                "vectors_created": len(embeddings),
            })

            # Step 4: Store
            await tracer.emit("store", "running", {})
            await loop.run_in_executor(
                None, lambda: store_chunks(chunks, embeddings, safe_name)
            )
            await tracer.emit("store", "complete", {
                "collection": COLLECTION_NAME,
                "total_stored": len(chunks),
            })

            # Signal the stream to close
            await tracer.emit("done", "complete", {"chunk_count": len(chunks)})

        except Exception as e:
            await tracer.emit("error", "error", {"message": str(e)})

    # Start the pipeline as a background task — it runs concurrently
    # with the StreamingResponse sending events to the client
    asyncio.create_task(run_pipeline())

    return StreamingResponse(
        tracer.stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disables nginx buffering if deployed behind nginx
        },
    )
