import { useState } from "react";
import { PipelineStep } from "../types/pipeline";
import { useSSEStream } from "./useSSEStream";

export function useQuery(onStep: (step: PipelineStep) => void) {
  const [isQuerying, setIsQuerying] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startStream, abortStream } = useSSEStream();

  const submitQuery = async (question: string) => {
    setIsQuerying(true);
    setError(null);
    setAnswer(null);

    try {
      await startStream(
        "/query",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        },
        (step) => {
          // Extract the answer from the final "done" event
          if (step.step === "done" && step.data && "answer" in step.data) {
            setAnswer(step.data.answer as string);
          }
          onStep(step);
        }
      );
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User cancelled — not an error
      } else {
        const msg = e instanceof Error ? e.message : "Query failed";
        console.error("[Query Error]", msg, e);
        setError(msg);
      }
    } finally {
      setIsQuerying(false);
    }
  };

  const cancelQuery = () => abortStream();

  return { submitQuery, cancelQuery, isQuerying, answer, error };
}
