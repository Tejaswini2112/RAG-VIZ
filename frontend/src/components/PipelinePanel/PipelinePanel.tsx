import React from "react";
import { PipelineStep } from "../../types/pipeline";
import StepCard from "./StepCard";

const connectorStyles: Record<string, string> = {
  complete: "bg-green-500/60",
  running:  "bg-blue-400/60 animate-pulse",
  error:    "bg-red-500/60",
};

function StepConnector({ status }: { status: string }) {
  const color = connectorStyles[status] ?? "bg-gray-600/40";
  return (
    <div className="flex justify-center h-5">
      <div className={`w-0.5 ${color}`} />
    </div>
  );
}

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
  retrieve:  "Retrieval",
  rerank:    "Re-Ranking",
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
      <div className="flex-none border-b border-gray-800">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Pipeline Trace</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Real-time view of every step — click any card to expand
            </p>
          </div>
          {visibleSteps.length > 0 && (
            <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded-full px-2.5 py-0.5 font-medium tabular-nums flex-shrink-0">
              {visibleSteps.length} {visibleSteps.length === 1 ? "step" : "steps"}
            </span>
          )}
        </div>
      </div>

      {/* Step cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {visibleSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 px-2">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
                <line x1="8.5" y1="11" x2="15.5" y2="7" /><line x1="8.5" y1="13" x2="15.5" y2="17" />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400">Pipeline trace</p>
              <p className="text-xs text-gray-600 mt-0.5">Steps stream in as your query runs</p>
            </div>

            {/* Ghost step previews */}
            <div className="w-full max-w-xs space-y-0 opacity-25 pointer-events-none select-none">
              {[
                { w: "w-24", chip: "bg-sky-800" },
                { w: "w-32", chip: "bg-indigo-800" },
                { w: "w-20", chip: "bg-violet-800" },
              ].map(({ w, chip }, i) => (
                <React.Fragment key={i}>
                  <div className="rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2.5 flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md ${chip} flex-shrink-0`} />
                    <div className={`h-2 rounded ${w} bg-gray-700`} />
                  </div>
                  {i < 2 && (
                    <div className="flex justify-center h-5">
                      <div className="w-px bg-gray-700" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
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

            const isLast = i === visibleSteps.length - 1;

            return (
              <React.Fragment key={key}>
                <StepCard
                  step={step}
                  label={label}
                  index={i + 1}
                  style={{ animationDelay: `${i * 60}ms` }}
                />
                {!isLast && <StepConnector status={step.status} />}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
