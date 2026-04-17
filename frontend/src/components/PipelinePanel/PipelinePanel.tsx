import { PipelineStep } from "../../types/pipeline";
import StepCard from "./StepCard";

interface Props {
  steps: PipelineStep[];
}

// Human-readable label for each step name
const STEP_LABELS: Record<string, string> = {
  load:      "Load Document",
  chunk:     "Chunk Text",
  embed:     "Generate Embeddings",
  store:     "Store in Vector DB",
  route:     "Route Query",
  transform: "Transform Query",
  retrieve:  "Retrieve Chunks",
  rerank:    "Re-rank Chunks",
  evaluate:  "Evaluate Relevance",
  web_search: "Web Search",
  context:    "Build Context",
  verify:     "Verify Answer",
  generate:  "Generate Answer",
  error:     "Error",
};

export default function PipelinePanel({ steps }: Props) {
  // Filter out the "done" step — it's internal, not meaningful to show
  const visibleSteps = steps.filter((s) => s.step !== "done");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-800">
        <h2 className="text-base font-semibold tracking-tight">Pipeline Trace</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Real-time view of every step — click any card to expand
        </p>
      </div>

      {/* Step cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {visibleSteps.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm text-center">
              Pipeline steps will appear here when you upload a document or ask a question.
            </p>
          </div>
        ) : (
          visibleSteps.map((step, i) => {
            // Retry-able steps (generate, verify) include an attempt number
            // to distinguish attempt 1 from attempt 2 in React keys
            const attempt = (step.data && "attempt" in step.data)
              ? (step.data as { attempt?: number }).attempt
              : undefined;
            const key = attempt ? `${step.step}-${attempt}` : step.step;
            const label = attempt && attempt > 1
              ? `${STEP_LABELS[step.step] ?? step.step} (retry)`
              : STEP_LABELS[step.step] ?? step.step;

            return (
              <StepCard
                key={key}
                step={step}
                label={label}
                index={i + 1}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
