import asyncio
import json
import time
from typing import Any, AsyncGenerator


class PipelineTracer:
    """
    Central event bus for the RAG pipeline.

    How it works:
    1. Each pipeline module calls `await tracer.emit(step, status, data)`
    2. emit() puts the event into an asyncio Queue
    3. The API route calls `tracer.stream()` which reads from the Queue
    4. Each event is formatted as SSE (Server-Sent Events) and sent to the browser
    5. The browser receives events one by one as they're produced — not all at once

    The Queue is the key: producer (pipeline) and consumer (HTTP stream) run
    concurrently, so the client sees each step the moment it happens.
    """

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()

    async def emit(self, step: str, status: str, data: dict[str, Any] | None = None) -> None:
        """
        Called by pipeline modules to announce a step.

        Args:
            step:   name of the step, e.g. "load", "chunk", "retrieve"
            status: "running" | "complete" | "error"
            data:   any dict of info to show in the UI for this step
        """
        event = {
            "step": step,
            "status": status,
            "data": data or {},
            "timestamp": time.time(),
        }
        await self._queue.put(event)

    async def stream(self) -> AsyncGenerator[str, None]:
        """
        Async generator consumed by FastAPI's StreamingResponse.

        Yields SSE-formatted strings. Each looks like:
            data: {"step": "retrieve", "status": "complete", ...}\n\n

        The double newline at the end is required by the SSE protocol —
        it tells the browser "this event is complete, process it now".

        Stops when it sees a "done" step or an "error" status.
        """
        while True:
            event = await self._queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["step"] == "done" or event["status"] == "error":
                break
