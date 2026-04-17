/**
 * Every event the backend emits has this shape.
 * The `data` field is different for each step — see below.
 */
export type StepStatus = "running" | "complete" | "error";

export type StepName =
  | "load"       // ingest: reading the file
  | "chunk"      // ingest: splitting into chunks
  | "embed"      // ingest: generating embeddings
  | "store"      // ingest: saving to ChromaDB
  | "retrieve"   // query: embedding query + searching ChromaDB
  | "context"    // query: building the prompt
  | "generate"   // query: calling Claude
  | "done"       // either flow: pipeline finished
  | "error";     // either flow: something went wrong

export interface RetrievedChunk {
  text: string;
  score: number;
  source: string;
  chunk_index: number;
}

// The `data` payload for each step type
export interface StepDataMap {
  load:     { filename: string; char_count?: number };
  chunk:    { chunk_count?: number; chunk_size?: number };
  embed:    { model: string; dimensions?: number; vectors_created?: number };
  store:    { collection?: string; total_stored?: number };
  retrieve: { query?: string; results?: RetrievedChunk[] };
  context:  { chunk_count?: number; token_count?: number };
  generate: { model: string };
  done:     { answer?: string; chunk_count?: number };
  error:    { message: string };
}

export interface PipelineStep<T extends StepName = StepName> {
  step: T;
  status: StepStatus;
  data: T extends keyof StepDataMap ? StepDataMap[T] : Record<string, unknown>;
  timestamp: number;
}
