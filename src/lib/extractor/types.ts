import type { TaskPriority } from "@/types";

// ─── Public interface for the extraction layer ───────────────────────────────
// Any adapter (mock, OpenAI, etc.) must implement this interface.

export interface CandidateTask {
  title: string;
  summary: string;
  suggested_assignee: string | null;   // free-text name hint from text
  due_date_guess: string | null;       // ISO date string or null
  priority_guess: TaskPriority;
  source_text: string;                  // the sentence/chunk that produced this task
  confidence: number;                  // 0–1 float
}

export interface ExtractionResult {
  candidates: CandidateTask[];
  raw_text: string;
}

export interface ExtractorAdapter {
  extract(text: string): Promise<ExtractionResult>;
}
