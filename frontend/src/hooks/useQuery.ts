import { useState } from "react";
import { PipelineStep } from "../types/pipeline";
import { useSSEStream } from "./useSSEStream";

export function useQuery(onStep: (step: PipelineStep) => void) {
  const [isQuerying, setIsQuerying] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { startStream } = useSSEStream();

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
      const msg = e instanceof Error ? e.message : "Query failed";
      setError(msg);
    } finally {
      setIsQuerying(false);
    }
  };

  return { submitQuery, isQuerying, answer, error };
}
