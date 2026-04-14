// Extraction adapter selector.
// To swap in a real LLM: set EXTRACTOR=openai in env and create src/lib/extractor/openai.ts.

import { mockExtractor } from "./mock";
import type { ExtractorAdapter } from "./types";

export type { ExtractorAdapter, CandidateTask, ExtractionResult } from "./types";

function getExtractor(): ExtractorAdapter {
  const mode = process.env.EXTRACTOR ?? "mock";
  if (mode === "mock") return mockExtractor;
  // Future: if (mode === "openai") return openaiExtractor;
  return mockExtractor;
}

export const extractor = getExtractor();
