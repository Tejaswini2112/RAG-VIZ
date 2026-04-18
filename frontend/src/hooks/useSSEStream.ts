import { useCallback, useRef, useState } from "react";
import { PipelineStep } from "../types/pipeline";

/**
 * Core streaming hook. Reads a fetch response body as a stream of SSE events.
 *
 * Why fetch() instead of EventSource?
 * EventSource only supports GET requests. Our endpoints use POST (to send
 * a file or a JSON body). fetch() with a readable stream handles both.
 *
 * How SSE parsing works:
 * The server sends lines like:  data: {"step": "load", ...}\n\n
 * We buffer incoming bytes, split on newlines, look for "data: " prefix,
 * strip it, and parse the JSON.
 */
export function useSSEStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const startStream = useCallback(
    async (
      url: string,
      options: RequestInit,
      onStep: (step: PipelineStep) => void
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Server error ${response.status}: ${text}`);
        }

        if (!response.body) {
          throw new Error("Response has no body — streaming not supported");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the new bytes and append to our buffer
          buffer += decoder.decode(value, { stream: true });

          // Split on newlines. The last element may be an incomplete line —
          // keep it in the buffer for the next iteration.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ")) {
              const json = trimmed.slice(6); // remove "data: " prefix
              if (json) {
                try {
                  const step = JSON.parse(json) as PipelineStep;
                  onStep(step);
                  // Log errors and important steps for debugging
                  if (step.status === "error") {
                    console.error(`[Pipeline Error] Step: ${step.step}`, step.data);
                  }
                } catch (parseError) {
                  console.error("[SSE Parse Error] Malformed JSON:", json, parseError);
                }
              }
            }
          }
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return { startStream, abortStream, isStreaming };
}
