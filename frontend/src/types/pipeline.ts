/**
 * Every event the backend emits has this shape.
 * The `data` field is different for each step — see below.
 */
export type StepStatus = "running" | "complete" | "error";

export type StepName =
  // Ingest flow
  | "load"
  | "chunk"
  | "embed"
  | "store"
  // Query flow
  | "route"       // Phase 2: strategy routing decision
  | "transform"   // Phase 2: query transformation
  | "retrieve"
  | "rerank"      // Phase 4: cross-encoder re-ranking
  | "evaluate"    // Phase 4: CRAG relevance evaluation
  | "web_search"  // Phase 4: web search fallback
  | "context"
  | "generate"
  | "verify"      // Phase 5: response verification
  // Control
  | "done"
  | "error";

export interface RetrievedChunk {
  text: string;
  score: number;
  source: string;
  chunk_index: number;
}

export interface RerankChunk extends RetrievedChunk {
  original_score: number;
  rerank_score: number;
}

export interface ChunkVerdict {
  index: number;
  relevance: "relevant" | "partially_relevant" | "irrelevant";
  reason: string;
}

export interface WebSearchResult {
  text: string;
  score: number;
  source: string;
  chunk_index: number;
}

// The `data` payload for each step type
export interface StepDataMap {
  load:      { filename: string; char_count?: number };
  chunk:     { chunk_count?: number; chunk_size?: number };
  embed:     { model: string; dimensions?: number; vectors_created?: number };
  store:     { collection?: string; total_stored?: number };
  route:     { query?: string; strategy?: string; reason?: string };
  transform: { method?: string; original?: string; queries?: string[]; note?: string; hypothesis?: string; broad_query?: string };
  retrieve:  { query?: string; query_count?: number; results?: RetrievedChunk[]; total_retrieved?: number; after_dedup?: number };
  rerank:    { before_rerank?: number; after_rerank?: number; results?: RerankChunk[] };
  evaluate:  { verdicts?: ChunkVerdict[]; decision?: string; kept_count?: number; filtered_count?: number };
  web_search: { query?: string; result_count?: number; results?: WebSearchResult[]; note?: string; reason?: string };
  context:   { chunk_count?: number; token_count?: number };
  generate:  { model: string; attempt?: number };
  verify:    { attempt?: number; faithfulness?: string; faithfulness_reason?: string; relevance?: string; relevance_reason?: string; issues?: string[]; accepted?: boolean; retried?: boolean };
  done:      { answer?: string; chunk_count?: number };
  error:     { message: string };
}

export interface PipelineStep<T extends StepName = StepName> {
  step: T;
  status: StepStatus;
  data: T extends keyof StepDataMap ? StepDataMap[T] : Record<string, unknown>;
  timestamp: number;
}
