import asyncio
import traceback

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pipeline.tracer import PipelineTracer
from pipeline.query.router import route_query
from pipeline.query.transformer import transform_query
from pipeline.query.retriever import retrieve_multi
from pipeline.query.reranker import rerank
from pipeline.query.evaluator import evaluate_chunks
from pipeline.query.web_searcher import web_search
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
            # Step 1: Route — decide which transformation strategy to use
            await tracer.emit("route", "running", {"query": request.question})
            route_result = await loop.run_in_executor(
                None, route_query, request.question
            )
            await tracer.emit("route", "complete", {
                "query": request.question,
                "strategy": route_result["strategy"],
                "reason": route_result["reason"],
            })

            # Step 2: Transform — apply the chosen strategy
            strategy = route_result["strategy"]
            await tracer.emit("transform", "running", {"method": strategy})
            transform_result = await loop.run_in_executor(
                None, lambda: transform_query(request.question, strategy)
            )
            transform_data = {
                "method": transform_result["method"],
                "original": transform_result["original"],
                "queries": transform_result["queries"],
                "note": transform_result.get("note", ""),
            }
            # Pass through extra fields for specific strategies
            if "hypothesis" in transform_result:
                transform_data["hypothesis"] = transform_result["hypothesis"]
            if "broad_query" in transform_result:
                transform_data["broad_query"] = transform_result["broad_query"]
            await tracer.emit("transform", "complete", transform_data)

            # Step 3: Retrieve — embed each query, search, merge, deduplicate
            queries = transform_result["queries"]
            await tracer.emit("retrieve", "running", {
                "query_count": len(queries),
            })
            retrieval_result = await loop.run_in_executor(
                None, retrieve_multi, queries
            )
            await tracer.emit("retrieve", "complete", {
                "total_retrieved": retrieval_result["total_retrieved"],
                "after_dedup": retrieval_result["after_dedup"],
                "results": retrieval_result["results"],
            })

            # Step 4: Re-rank — cross-encoder re-scoring + top-K cut
            raw_chunks = retrieval_result["results"]
            await tracer.emit("rerank", "running", {
                "chunk_count": len(raw_chunks),
            })
            rerank_result = await loop.run_in_executor(
                None, lambda: rerank(request.question, raw_chunks)
            )
            await tracer.emit("rerank", "complete", {
                "before_rerank": rerank_result["before_rerank"],
                "after_rerank": rerank_result["after_rerank"],
                "results": rerank_result["results"],
            })

            # Step 5: Evaluate — CRAG relevance check on each chunk
            reranked_chunks = rerank_result["results"]
            await tracer.emit("evaluate", "running", {
                "chunk_count": len(reranked_chunks),
            })
            try:
                eval_result = await loop.run_in_executor(
                    None, lambda: evaluate_chunks(request.question, reranked_chunks)
                )
                await tracer.emit("evaluate", "complete", {
                    "verdicts": eval_result["verdicts"],
                    "decision": eval_result["decision"],
                    "kept_count": eval_result["kept_count"],
                    "filtered_count": eval_result["filtered_count"],
                })
            except Exception as e:
                error_msg = f"Evaluate step failed: {type(e).__name__}: {str(e)}"
                print(f"ERROR: {error_msg}")
                print(traceback.format_exc())
                await tracer.emit("evaluate", "error", {"message": error_msg})
                return

            # Step 6: Web search (conditional — only if decision requires it)
            decision = eval_result["decision"]
            chunks = eval_result["kept_chunks"]

            if decision in ("web_search", "both"):
                await tracer.emit("web_search", "running", {
                    "query": request.question,
                    "reason": decision,
                })
                search_result = await loop.run_in_executor(
                    None, lambda: web_search(request.question)
                )
                web_chunks = search_result["results"]

                if decision == "web_search":
                    # Replace document chunks entirely with web results
                    chunks = web_chunks
                else:
                    # "both" — supplement document chunks with web results
                    chunks = chunks + web_chunks

                await tracer.emit("web_search", "complete", {
                    "query": search_result["query"],
                    "result_count": len(web_chunks),
                    "results": web_chunks,
                    "note": search_result.get("note", ""),
                })

            # Step 7: Build context
            await tracer.emit("context", "running", {})
            prompt, token_count = await loop.run_in_executor(
                None, lambda: build_context(request.question, chunks)
            )
            await tracer.emit("context", "complete", {
                "chunk_count": len(chunks),
                "token_count": token_count,
            })

            # Step 8: Generate answer
            await tracer.emit("generate", "running", {"model": "claude-sonnet-4-6"})
            try:
                answer = await loop.run_in_executor(None, generate, prompt)
            except Exception as e:
                await tracer.emit("generate", "error", {"message": str(e)})
                return
            await tracer.emit("generate", "complete", {"model": "claude-sonnet-4-6"})

            # Done
            await tracer.emit("done", "complete", {"answer": answer})

        except Exception as e:
            error_msg = f"Pipeline error: {type(e).__name__}: {str(e)}"
            print(f"ERROR: {error_msg}")
            print(traceback.format_exc())
            await tracer.emit("error", "error", {"message": error_msg})

    asyncio.create_task(run_pipeline())

    return StreamingResponse(
        tracer.stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
