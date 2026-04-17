import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pipeline.tracer import PipelineTracer
from pipeline.query.retriever import retrieve
from pipeline.query.context_builder import build_context
from pipeline.query.generator import generate

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
async def query_documents(request: QueryRequest):
    tracer = PipelineTracer()

    async def run_pipeline():
        loop = asyncio.get_running_loop()
        try:
            # Step 1: Retrieve (embed query + search ChromaDB)
            await tracer.emit("retrieve", "running", {"query": request.question})
            query_embedding, chunks = await loop.run_in_executor(
                None, retrieve, request.question
            )
            await tracer.emit("retrieve", "complete", {
                "query": request.question,
                "results": chunks,  # full chunk list shown in UI
            })

            # Step 2: Build context (assemble the prompt)
            await tracer.emit("context", "running", {})
            prompt, token_count = await loop.run_in_executor(
                None, lambda: build_context(request.question, chunks)
            )
            await tracer.emit("context", "complete", {
                "chunk_count": len(chunks),
                "token_count": token_count,
            })

            # Step 3: Generate answer
            await tracer.emit("generate", "running", {"model": "claude-sonnet-4-6"})
            try:
                answer = await loop.run_in_executor(None, generate, prompt)
            except Exception as e:
                await tracer.emit("generate", "error", {"message": str(e)})
                return
            await tracer.emit("generate", "complete", {"model": "claude-sonnet-4-6"})

            # Done — answer is sent in the final event so the frontend
            # can display it in the chat panel
            await tracer.emit("done", "complete", {"answer": answer})

        except Exception as e:
            await tracer.emit("error", "error", {"message": str(e)})

    asyncio.create_task(run_pipeline())

    return StreamingResponse(
        tracer.stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
