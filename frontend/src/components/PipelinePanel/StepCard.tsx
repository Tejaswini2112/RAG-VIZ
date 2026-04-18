import { useState } from "react";
import React from "react";
import { PipelineStep, RetrievedChunk, RerankChunk, ChunkVerdict, WebSearchResult } from "../../types/pipeline";

interface Props {
  step: PipelineStep;
  label: string;
  index: number;
  style?: React.CSSProperties;
}

function getStepSummary(step: PipelineStep): string | null {
  if (step.status !== "complete") return null;
  const data = step.data as any;

  switch (step.step) {
    case "load":
      return data.filename ?? null;

    case "chunk":
      return data.chunk_count ? `${data.chunk_count} chunks` : null;

    case "embed": {
      const dims = data.dimensions ? `${data.dimensions}-dim` : null;
      const vecs = data.vectors_created ? `${data.vectors_created} vectors` : null;
      if (dims && vecs) return `${vecs} · ${dims}`;
      return vecs ?? dims ?? null;
    }

    case "store": {
      if (!data.total_stored) return null;
      const coll = data.collection ? ` in ${data.collection}` : "";
      return `${data.total_stored} stored${coll}`;
    }

    case "route": {
      const labels: Record<string, string> = {
        none: "none",
        multi_query: "multi_query",
        decomposition: "decomposition",
        hyde: "hyde",
        step_back: "step_back",
      };
      return data.strategy ? (labels[data.strategy] ?? data.strategy) : null;
    }

    case "transform": {
      const method = data.method ?? "unknown";
      if (data.queries?.length) return `${method} · ${data.queries.length} queries`;
      if (data.hypothesis) return `${method} (hypothesis)`;
      if (data.broad_query) return `${method} (broad query)`;
      return method;
    }

    case "retrieve": {
      const total = data.total_retrieved;
      const kept = data.results?.length ?? data.after_dedup;
      if (total && kept && total !== kept)
        return `${total} retrieved → ${kept} kept (dedup+top-k)`;
      if (kept) return `${kept} chunks`;
      return total ? `${total} retrieved` : null;
    }

    case "rerank":
      if (data.before_rerank && data.after_rerank)
        return `${data.before_rerank} → ${data.after_rerank} chunks`;
      return null;

    case "evaluate": {
      const labels: Record<string, string> = {
        documents: "Use Docs",
        web_search: "Use Web",
        both: "Use Both",
      };
      const decision = labels[data.decision ?? "documents"] ?? "Use Docs";
      if (data.kept_count) return `${decision} · ${data.kept_count} kept`;
      return decision;
    }

    case "web_search":
      return data.result_count ? `${data.result_count} results` : null;

    case "context": {
      const chunks = data.chunk_count ? `${data.chunk_count} chunks` : null;
      const tokens = data.token_count ? `~${data.token_count} tokens` : null;
      if (chunks && tokens) return `${chunks} · ${tokens}`;
      return chunks ?? tokens ?? null;
    }

    case "generate": {
      const attempt = data.attempt ?? 1;
      return attempt > 1 ? `attempt ${attempt}` : null;
    }

    case "verify":
      if (data.retried) return "Issues · retrying";
      if (data.accepted) return `Accepted · ${data.faithfulness ?? ""}`.trim();
      if (data.issues?.length) return "Issues remain";
      return null;

    default:
      return null;
  }
}

// Accent color per step type — bg for the chip, text for the SVG stroke
const stepColors: Record<string, { bg: string; text: string }> = {
  load:       { bg: "bg-blue-500/20",    text: "text-blue-400" },
  chunk:      { bg: "bg-amber-500/20",   text: "text-amber-400" },
  embed:      { bg: "bg-purple-500/20",  text: "text-purple-400" },
  store:      { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  route:      { bg: "bg-yellow-500/20",  text: "text-yellow-400" },
  transform:  { bg: "bg-cyan-500/20",    text: "text-cyan-400" },
  retrieve:   { bg: "bg-sky-500/20",     text: "text-sky-400" },
  rerank:     { bg: "bg-indigo-500/20",  text: "text-indigo-400" },
  evaluate:   { bg: "bg-green-500/20",   text: "text-green-400" },
  web_search: { bg: "bg-sky-500/20",     text: "text-sky-400" },
  context:    { bg: "bg-teal-500/20",    text: "text-teal-400" },
  verify:     { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  generate:   { bg: "bg-violet-500/20",  text: "text-violet-400" },
  error:      { bg: "bg-red-500/20",     text: "text-red-400" },
};

// Icon per step type — inline SVGs so there's no icon library dependency
const stepIcons: Record<string, JSX.Element> = {
  load: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="1" width="9" height="12" rx="1" />
      <polyline points="9,1 13,5 13,14 4,14" />
      <line x1="4" y1="6" x2="8" y2="6" /><line x1="4" y1="8.5" x2="8" y2="8.5" /><line x1="4" y1="11" x2="7" y2="11" />
    </svg>
  ),
  chunk: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="2" x2="8" y2="14" /><line x1="3" y1="5" x2="6" y2="8" /><line x1="3" y1="11" x2="6" y2="8" />
      <line x1="13" y1="5" x2="10" y2="8" /><line x1="13" y1="11" x2="10" y2="8" />
    </svg>
  ),
  embed: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" />
      <line x1="5.5" y1="7.2" x2="10.5" y2="4.8" /><line x1="5.5" y1="8.8" x2="10.5" y2="11.2" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="8" cy="5" rx="5" ry="2" /><path d="M3 5v6c0 1.1 2.24 2 5 2s5-.9 5-2V5" /><line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  ),
  route: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="3" cy="8" r="1.5" /><circle cx="13" cy="4" r="1.5" /><circle cx="13" cy="12" r="1.5" />
      <line x1="4.5" y1="7.3" x2="11.5" y2="4.7" /><line x1="4.5" y1="8.7" x2="11.5" y2="11.3" />
      <polyline points="9,3 11.5,4.5 9,6" />
    </svg>
  ),
  transform: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 5h8M2 8h6M2 11h9" /><polyline points="12,3 14,5 12,7" /><polyline points="10,9 12,11 10,13" />
    </svg>
  ),
  retrieve: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="7" r="4" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  ),
  rerank: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="10" y2="8" /><line x1="3" y1="12" x2="7" y2="12" />
      <polyline points="12,6 14,8 12,10" />
    </svg>
  ),
  evaluate: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="3,9 6,12 13,4" />
    </svg>
  ),
  web_search: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" /><path d="M8 2c-2 2-2 10 0 12M8 2c2 2 2 10 0 12" /><line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  ),
  context: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="5" height="5" rx="0.5" /><rect x="9" y="3" width="5" height="5" rx="0.5" />
      <rect x="2" y="10" width="5" height="3" rx="0.5" /><rect x="9" y="10" width="5" height="3" rx="0.5" />
    </svg>
  ),
  verify: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2L3 4.5v4c0 2.8 2.1 5.4 5 6 2.9-.6 5-3.2 5-6v-4L8 2z" /><polyline points="5.5,8.5 7,10 10.5,6" />
    </svg>
  ),
  generate: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2a5 5 0 0 1 0 10H4l-2 2V8a5 5 0 0 1 6-6z" />
      <line x1="5" y1="7" x2="11" y2="7" /><line x1="5" y1="9.5" x2="9" y2="9.5" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8.5" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
    </svg>
  ),
};

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
  terminated: {
    border: "border-orange-500/40",
    bg: "bg-orange-500/5",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-orange-400 flex-shrink-0">
        <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" />
      </svg>
    ),
    badge: "text-orange-400",
  },
};

export default function StepCard({ step, label, index, style }: Props) {
  // Auto-expand error steps so users see the error message immediately
  const [expanded, setExpanded] = useState(step.status === "error");
  const [expandedQueries, setExpandedQueries] = useState<Set<number>>(new Set());

  const styles = statusStyles[step.status];
  const hasData = Object.keys(step.data).length > 0;
  const statusLabel =
    step.status === "running" ? "running..." :
    step.status === "terminated" ? "terminated" :
    step.status;
  const summary = getStepSummary(step);

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} transition-all animate-slide-in`} style={style}>
      {/* Card header — always visible, clickable to expand */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 ${hasData ? "cursor-pointer" : ""}`}
        onClick={() => hasData && setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {(() => {
            const color = stepColors[step.step] ?? { bg: "bg-gray-700/50", text: "text-gray-400" };
            return (
              <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${color.bg} ${color.text}`}>
                {stepIcons[step.step] ?? <span className="text-xs font-medium">{index}</span>}
              </span>
            );
          })()}
          <span className="text-sm font-medium truncate">{label}</span>
          {summary && (
            <span className="text-xs text-gray-500 truncate max-w-[260px] shrink-0">· {summary}</span>
          )}
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
          <StepDetail step={step} expandedQueries={expandedQueries} setExpandedQueries={setExpandedQueries} />
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
function StepDetail({ step, expandedQueries, setExpandedQueries }: { step: PipelineStep; expandedQueries: Set<number>; setExpandedQueries: (s: Set<number>) => void }) {
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

  // --- Retrieve step: summary + per-query comparison + final deduplicated chunks ---
  if (step.step === "retrieve" && "results" in step.data) {
    const data = step.data as {
      results?: RetrievedChunk[];
      total_retrieved?: number;
      after_dedup?: number;
      per_query?: { query: string; results: RetrievedChunk[] }[];
    };
    const results = data.results ?? [];
    const per_query = data.per_query ?? [];
    const finalTexts = new Set(results.map((c) => c.text));

    const avgScore =
      results.length > 0
        ? results.reduce((s, c) => s + c.score, 0) / results.length
        : null;

    const scoreColor = (s: number) =>
      s > 0.75 ? "text-green-400" : s > 0.55 ? "text-yellow-400" : "text-gray-500";

    const toggleQuery = (idx: number) => {
      const next = new Set(expandedQueries);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      setExpandedQueries(next);
    };

    return (
      <div className="space-y-3 mt-1">

        {/* ── Retrieval Overview ────────────────────────────── */}
        <div className="rounded-lg border border-sky-500/20 bg-sky-950/20 p-3 space-y-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400/70">
            Retrieval Overview
          </span>

          {/* Stat grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Queries", value: per_query.length || 1, highlight: false },
              { label: "Retrieved", value: data.total_retrieved ?? results.length, highlight: false },
              { label: "After Dedup", value: data.after_dedup ?? results.length, highlight: false },
              { label: "Final", value: results.length, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div
                key={label}
                className={`rounded-md px-2 py-2 text-center ${
                  highlight
                    ? "bg-sky-500/15 border border-sky-500/30"
                    : "bg-gray-800/60 border border-gray-700/40"
                }`}
              >
                <div className={`text-base font-bold leading-none ${highlight ? "text-sky-300" : "text-gray-200"}`}>
                  {value}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 leading-none">{label}</div>
              </div>
            ))}
          </div>

          {/* Avg score bar */}
          {avgScore !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 flex-shrink-0 w-20">Avg score</span>
              <div className="flex-1 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    avgScore > 0.75 ? "bg-green-500" : avgScore > 0.55 ? "bg-yellow-500" : "bg-gray-500"
                  }`}
                  style={{ width: `${Math.round(avgScore * 100)}%` }}
                />
              </div>
              <span className={`text-[11px] font-mono font-medium flex-shrink-0 ${scoreColor(avgScore)}`}>
                {avgScore.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* ── Per-Query Comparison ──────────────────────────── */}
        {per_query.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Per-Query Breakdown
            </div>

            {per_query.map((qr, qIdx) => {
              const topScore = qr.results.length > 0
                ? Math.max(...qr.results.map((c) => c.score))
                : 0;
              const contributed = qr.results.filter((c) => finalTexts.has(c.text)).length;
              const isOpen = expandedQueries.has(qIdx);

              return (
                <div
                  key={qIdx}
                  className="rounded-lg border border-gray-700/50 bg-gray-900/40 overflow-hidden"
                >
                  {/* Query row — always visible */}
                  <div
                    className="flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
                    onClick={() => toggleQuery(qIdx)}
                  >
                    {/* Query label */}
                    <span className="text-[10px] font-semibold text-sky-400/80 flex-shrink-0 w-5">
                      Q{qIdx + 1}
                    </span>
                    <span className="text-xs text-gray-300 truncate flex-1 min-w-0">
                      {qr.query}
                    </span>

                    {/* Inline stats */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                      <span className="text-gray-500">
                        <span className="text-gray-300 font-medium">{qr.results.length}</span> chunks
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500">
                        top{" "}
                        <span className={`font-mono font-medium ${scoreColor(topScore)}`}>
                          {topScore.toFixed(2)}
                        </span>
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500">
                        <span className="text-sky-400 font-medium">{contributed}</span> selected
                      </span>
                      <span className="text-gray-600 ml-1">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded chunks */}
                  {isOpen && (
                    <div className="border-t border-gray-700/40 px-2.5 py-2 space-y-1.5 bg-gray-950/30">
                      {qr.results.map((chunk, cIdx) => {
                        const inFinal = finalTexts.has(chunk.text);
                        return (
                          <div
                            key={cIdx}
                            className={`rounded p-2 text-xs space-y-1 border ${
                              inFinal
                                ? "border-sky-500/25 bg-sky-950/20"
                                : "border-gray-700/30 bg-gray-900/40"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 truncate max-w-[60%]">{chunk.source}</span>
                              <div className="flex items-center gap-2">
                                {inFinal && (
                                  <span className="text-[9px] text-sky-400 border border-sky-500/30 px-1 py-0.5 rounded">
                                    in final
                                  </span>
                                )}
                                <span className={`font-mono font-medium ${scoreColor(chunk.score)}`}>
                                  {chunk.score.toFixed(3)}
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-400 line-clamp-2 leading-relaxed">{chunk.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Final Results ────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Final Results
            </span>
            <span className="text-[10px] text-gray-600">
              {results.length} chunk{results.length !== 1 ? "s" : ""} · sorted by score
            </span>
          </div>
          {results.map((chunk, i) => (
            <div key={i} className="rounded-lg bg-gray-900/60 border border-gray-700/30 p-2.5 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-600 flex-shrink-0 font-mono text-[10px]">#{i + 1}</span>
                  <span className="text-gray-500 truncate">{chunk.source}</span>
                </div>
                <span className={`font-mono font-medium ${scoreColor(chunk.score)}`}>
                  {chunk.score.toFixed(3)}
                </span>
              </div>
              <p className="text-gray-300 line-clamp-3 leading-relaxed">{chunk.text}</p>
            </div>
          ))}
        </div>

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

  // --- Verify step: show faithfulness + relevance verdicts ---
  if (step.step === "verify" && "faithfulness" in step.data) {
    const data = step.data as {
      attempt?: number; faithfulness?: string; faithfulness_reason?: string;
      relevance?: string; relevance_reason?: string;
      issues?: string[]; accepted?: boolean; retried?: boolean;
    };

    const verdictColors: Record<string, string> = {
      faithful:     "text-green-400 bg-green-500/10 border-green-500/30",
      minor_issues: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      hallucinated: "text-red-400 bg-red-500/10 border-red-500/30",
      relevant:     "text-green-400 bg-green-500/10 border-green-500/30",
      partial:      "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      off_topic:    "text-red-400 bg-red-500/10 border-red-500/30",
      unknown:      "text-gray-400 bg-gray-500/10 border-gray-500/30",
    };

    const faithColors = verdictColors[data.faithfulness ?? "unknown"] ?? verdictColors.unknown;
    const relColors = verdictColors[data.relevance ?? "unknown"] ?? verdictColors.unknown;

    return (
      <div className="space-y-2.5 mt-1">
        {/* Overall decision */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Attempt {data.attempt ?? 1}
          </span>
          {data.retried ? (
            <span className="text-xs font-medium text-orange-400">Issues found — retrying</span>
          ) : data.accepted ? (
            <span className="text-xs font-medium text-green-400">Accepted</span>
          ) : (
            <span className="text-xs font-medium text-red-400">Issues remain</span>
          )}
        </div>

        {/* Faithfulness verdict */}
        <div className="rounded bg-gray-900/60 p-2 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Faithfulness</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${faithColors}`}>
              {(data.faithfulness ?? "unknown").replace("_", " ")}
            </span>
          </div>
          {data.faithfulness_reason && (
            <p className="text-gray-400 italic">{data.faithfulness_reason}</p>
          )}
        </div>

        {/* Relevance verdict */}
        <div className="rounded bg-gray-900/60 p-2 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Relevance</span>
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${relColors}`}>
              {(data.relevance ?? "unknown").replace("_", " ")}
            </span>
          </div>
          {data.relevance_reason && (
            <p className="text-gray-400 italic">{data.relevance_reason}</p>
          )}
        </div>

        {/* Issues list (if any) */}
        {data.issues && data.issues.length > 0 && (
          <div className="rounded bg-red-900/20 p-2 text-xs border border-red-500/20">
            <span className="text-red-300 font-medium">Issues:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-200/80">
              {data.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
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
