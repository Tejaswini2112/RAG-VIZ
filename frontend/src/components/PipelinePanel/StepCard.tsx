import { useState } from "react";
import { PipelineStep, RetrievedChunk } from "../../types/pipeline";

interface Props {
  step: PipelineStep;
  label: string;
  index: number;
}

// Visual treatment per status
const statusStyles = {
  running: {
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
    icon: (
      <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block flex-shrink-0" />
    ),
    badge: "text-blue-400",
  },
  complete: {
    border: "border-green-500/40",
    bg: "bg-green-500/5",
    icon: <span className="text-green-400 flex-shrink-0">✓</span>,
    badge: "text-green-400",
  },
  error: {
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    icon: <span className="text-red-400 flex-shrink-0">✗</span>,
    badge: "text-red-400",
  },
};

export default function StepCard({ step, label, index }: Props) {
  const [expanded, setExpanded] = useState(false);

  const styles = statusStyles[step.status];
  const hasData = Object.keys(step.data).length > 0;
  const statusLabel = step.status === "running" ? "running..." : step.status;

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} transition-all`}>
      {/* Card header — always visible, clickable to expand */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 ${hasData ? "cursor-pointer" : ""}`}
        onClick={() => hasData && setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs text-gray-600 w-4 text-right flex-shrink-0">{index}</span>
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={`text-xs ${styles.badge}`}>{statusLabel}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {styles.icon}
          {hasData && (step.status === "complete" || step.status === "error") && (
            <span className="text-xs text-gray-600">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </div>

      {/* Expanded detail view */}
      {expanded && hasData && (step.status === "complete" || step.status === "error") && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-700/50">
          <StepDetail step={step} />
        </div>
      )}
    </div>
  );
}

/**
 * Renders step-specific detail content.
 * The "retrieve" step gets special treatment to show chunks nicely.
 * Everything else shows formatted JSON.
 */
function StepDetail({ step }: { step: PipelineStep }) {
  if (step.step === "retrieve" && "results" in step.data) {
    const results = step.data.results as RetrievedChunk[];
    return (
      <div className="space-y-2 mt-1">
        <p className="text-xs text-gray-500">{results.length} chunks retrieved</p>
        {results.map((chunk, i) => (
          <div key={i} className="rounded bg-gray-900/60 p-2.5 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 truncate max-w-[70%]">{chunk.source}</span>
              <span
                className={`font-mono font-medium ${
                  chunk.score > 0.7
                    ? "text-green-400"
                    : chunk.score > 0.5
                    ? "text-yellow-400"
                    : "text-gray-500"
                }`}
              >
                {chunk.score.toFixed(3)}
              </span>
            </div>
            <p className="text-gray-300 line-clamp-3 leading-relaxed">{chunk.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // Default: render all data fields as a clean key-value list
  return (
    <div className="space-y-1 mt-1">
      {Object.entries(step.data).map(([key, value]) => (
        <div key={key} className="flex gap-2 text-xs">
          <span className="text-gray-500 flex-shrink-0">{key}:</span>
          <span className="text-gray-300 font-mono break-all">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
