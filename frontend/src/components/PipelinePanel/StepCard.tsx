import { useState } from "react";
import { PipelineStep, RetrievedChunk, RerankChunk, ChunkVerdict, WebSearchResult } from "../../types/pipeline";

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
  // Auto-expand error steps so users see the error message immediately
  const [expanded, setExpanded] = useState(step.status === "error");

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
  // --- Error step: show error message prominently ---
  if (step.status === "error") {
    const data = step.data as { message?: string };
    return (
      <div className="space-y-2 mt-1 p-3 bg-red-900/20 rounded border border-red-500/30">
        <div className="text-xs font-semibold text-red-300">Error Details</div>
        {data.message && (
          <div className="text-xs text-red-200 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {data.message}
          </div>
        )}
        <div className="text-xs text-red-400/70 mt-2">
          💡 <strong>Troubleshooting tips:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Check your ANTHROPIC_API_KEY in the .env file</li>
            <li>Ensure you have access to the "claude-sonnet-4-6" model</li>
            <li>Check the terminal for the full error trace</li>
          </ul>
        </div>
      </div>
    );
  }

  // --- Route step: show strategy decision + reasoning ---
  if (step.step === "route" && "strategy" in step.data) {
    const data = step.data as { strategy?: string; reason?: string };
    const strategyLabels: Record<string, string> = {
      none: "None (use query as-is)",
      multi_query: "Multi-Query (generate alternative phrasings)",
      decomposition: "Decomposition (break into sub-questions)",
      hyde: "HyDE (hypothetical document embedding)",
      step_back: "Step-Back (broaden the question)",
    };
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Strategy:</span>
          <span className="text-xs font-medium text-blue-400">
            {strategyLabels[data.strategy ?? "none"] ?? data.strategy}
          </span>
        </div>
        {data.reason && (
          <p className="text-xs text-gray-400 italic leading-relaxed">
            &ldquo;{data.reason}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // --- Transform step: show generated queries ---
  if (step.step === "transform" && "queries" in step.data) {
    const data = step.data as {
      method?: string; original?: string; queries?: string[];
      note?: string; hypothesis?: string; broad_query?: string;
    };
    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Method:</span>
          <span className="text-xs font-medium text-purple-400">{data.method}</span>
        </div>
        {data.note && (
          <p className="text-xs text-yellow-400/80">{data.note}</p>
        )}

        {/* HyDE: show the hypothesis paragraph distinctly */}
        {data.method === "hyde" && data.hypothesis && (
          <div className="space-y-1">
            <span className="text-xs text-gray-500">Hypothetical document passage:</span>
            <div className="rounded bg-gray-900/60 px-2.5 py-2 text-xs text-gray-300 leading-relaxed italic border-l-2 border-purple-500/40">
              {data.hypothesis}
            </div>
            <p className="text-xs text-gray-600">
              ↑ This passage is used as the search query instead of the original question
            </p>
          </div>
        )}

        {/* Step-back: show broad query + original */}
        {data.method === "step_back" && data.broad_query && (
          <div className="space-y-1">
            <span className="text-xs text-gray-500">Broad query:</span>
            <div className="rounded bg-gray-900/60 px-2.5 py-1.5 text-xs text-gray-300">
              {data.broad_query}
            </div>
            <span className="text-xs text-gray-500">Original (also searched):</span>
            <div className="rounded bg-gray-900/60 px-2.5 py-1.5 text-xs text-gray-300">
              {data.original}
            </div>
          </div>
        )}

        {/* Other methods: numbered query list */}
        {data.method !== "hyde" && data.method !== "step_back" && data.queries && data.queries.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-gray-500">
              {data.method === "none" ? "Query:" : `Queries (${data.queries.length}):`}
            </span>
            {data.queries.map((q, i) => (
              <div key={i} className="rounded bg-gray-900/60 px-2.5 py-1.5 text-xs text-gray-300">
                {data.method !== "none" && (
                  <span className="text-gray-600 mr-1.5">{i + 1}.</span>
                )}
                {q}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Retrieve step: show chunks with scores ---
  if (step.step === "retrieve" && "results" in step.data) {
    const data = step.data as { results?: RetrievedChunk[]; total_retrieved?: number; after_dedup?: number };
    const results = data.results ?? [];
    return (
      <div className="space-y-2 mt-1">
        <div className="flex gap-3 text-xs text-gray-500">
          {data.total_retrieved !== undefined && (
            <span>Retrieved: {data.total_retrieved}</span>
          )}
          {data.after_dedup !== undefined && data.total_retrieved !== data.after_dedup && (
            <span>After dedup: {data.after_dedup}</span>
          )}
        </div>
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

  // --- Rerank step: show re-scored chunks with before/after scores ---
  if (step.step === "rerank" && "results" in step.data) {
    const data = step.data as { before_rerank?: number; after_rerank?: number; results?: RerankChunk[] };
    const results = data.results ?? [];
    return (
      <div className="space-y-2 mt-1">
        <div className="flex gap-3 text-xs text-gray-500">
          {data.before_rerank !== undefined && (
            <span>Input: {data.before_rerank} chunks</span>
          )}
          {data.after_rerank !== undefined && (
            <span>Kept top: {data.after_rerank}</span>
          )}
        </div>
        {results.map((chunk, i) => (
          <div key={i} className="rounded bg-gray-900/60 p-2.5 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 truncate max-w-[50%]">{chunk.source}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-mono">
                  cos: {chunk.original_score?.toFixed(3)}
                </span>
                <span className="text-gray-600">→</span>
                <span
                  className={`font-mono font-medium ${
                    chunk.rerank_score > 2
                      ? "text-green-400"
                      : chunk.rerank_score > 0
                      ? "text-yellow-400"
                      : "text-gray-500"
                  }`}
                >
                  rank: {chunk.rerank_score?.toFixed(3)}
                </span>
              </div>
            </div>
            <p className="text-gray-300 line-clamp-3 leading-relaxed">{chunk.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // --- Evaluate step: show per-chunk relevance verdicts + decision ---
  if (step.step === "evaluate" && "verdicts" in step.data) {
    const data = step.data as {
      verdicts?: ChunkVerdict[]; decision?: string;
      kept_count?: number; filtered_count?: number;
    };
    const verdicts = data.verdicts ?? [];

    const decisionStyles: Record<string, { label: string; color: string }> = {
      documents: { label: "Use Documents", color: "text-green-400" },
      web_search: { label: "Use Web Search", color: "text-orange-400" },
      both: { label: "Use Both", color: "text-blue-400" },
    };
    const ds = decisionStyles[data.decision ?? "documents"] ?? decisionStyles.documents;

    const relevanceColors: Record<string, string> = {
      relevant: "text-green-400 bg-green-500/10 border-green-500/30",
      partially_relevant: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      irrelevant: "text-red-400 bg-red-500/10 border-red-500/30",
    };

    return (
      <div className="space-y-2 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs text-gray-500">
            {data.kept_count !== undefined && <span>Kept: {data.kept_count}</span>}
            {data.filtered_count !== undefined && data.filtered_count > 0 && (
              <span>Filtered: {data.filtered_count}</span>
            )}
          </div>
          <span className={`text-xs font-medium ${ds.color}`}>{ds.label}</span>
        </div>
        {verdicts.map((v, i) => {
          const colors = relevanceColors[v.relevance] ?? relevanceColors.irrelevant;
          return (
            <div key={i} className="rounded bg-gray-900/60 p-2 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Chunk {v.index + 1}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${colors}`}>
                  {v.relevance.replace("_", " ")}
                </span>
              </div>
              <p className="text-gray-400 italic">{v.reason}</p>
            </div>
          );
        })}
      </div>
    );
  }

  // --- Web search step: show query and web results ---
  if (step.step === "web_search" && "results" in step.data) {
    const data = step.data as {
      query?: string; result_count?: number;
      results?: WebSearchResult[]; note?: string;
    };
    const results = data.results ?? [];
    return (
      <div className="space-y-2 mt-1">
        {data.query && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Query:</span>
            <span className="text-xs text-gray-300">{data.query}</span>
          </div>
        )}
        {data.note && (
          <p className="text-xs text-yellow-400/80">{data.note}</p>
        )}
        {data.result_count !== undefined && (
          <span className="text-xs text-gray-500">Results: {data.result_count}</span>
        )}
        {results.map((result, i) => (
          <div key={i} className="rounded bg-gray-900/60 p-2.5 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-orange-400/80 truncate max-w-[80%]">{result.source}</span>
              <span className="text-gray-600 font-mono">{result.score?.toFixed(3)}</span>
            </div>
            <p className="text-gray-300 line-clamp-3 leading-relaxed">{result.text}</p>
          </div>
        ))}
      </div>
    );
  }

  // --- Default: render all data fields as key-value pairs ---
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
