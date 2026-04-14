// Deterministic mock extractor — no external API calls.
// Uses heuristics to pull task-like sentences from pasted text.
// Replace this with a real LLM adapter by implementing ExtractorAdapter.

import type { ExtractorAdapter, ExtractionResult, CandidateTask } from "./types";
import type { TaskPriority } from "@/types";

// Patterns that suggest a sentence contains an action item
const ACTION_PATTERNS = [
  /\b(need to|needs to|should|must|will|please|can you|could you|would you|has to|have to|going to|gonna)\b/i,
  /\b(follow up|follow-up|action item|TODO|task|deliver|complete|finish|review|update|check|send|schedule|fix|deploy|migrate|set up|create|write|document|test)\b/i,
  /\b(by|before|until|deadline|due|asap|urgent|eod|eow|end of (day|week|month))\b/i,
];

const URGENT_WORDS = /\b(asap|urgent|critical|blocker|p0|immediately|right away|fire)\b/i;
const HIGH_WORDS = /\b(high priority|important|p1|soon|this week|eow|end of week)\b/i;
const LOW_WORDS = /\b(low priority|nice to have|eventually|someday|backlog|p3)\b/i;

// Rough date extraction — catches common patterns like "by Friday", "by April 20", "by next week"
const DATE_PATTERNS: [RegExp, (match: string) => string][] = [
  [/\b(today)\b/i, () => todayPlus(0)],
  [/\b(tomorrow)\b/i, () => todayPlus(1)],
  [/\bnext week\b/i, () => todayPlus(7)],
  [/\bend of (the )?week\b/i, () => endOfWeek()],
  [/\bend of (the )?month\b/i, () => endOfMonth()],
  [/\bby (monday|tuesday|wednesday|thursday|friday)\b/i, (m: string) => nextWeekday(m)],
  [/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}\b/i, (m: string) => parseMonthDay(m)],
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function endOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  return d.toISOString().split("T")[0];
}

function endOfMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split("T")[0];
}

function nextWeekday(match: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const target = days.findIndex((d) => match.toLowerCase().includes(d));
  if (target === -1) return todayPlus(7);
  const today = new Date().getDay();
  const diff = (target - today + 7) % 7 || 7;
  return todayPlus(diff);
}

function parseMonthDay(match: string): string {
  const year = new Date().getFullYear();
  const parsed = new Date(`${match} ${year}`);
  if (isNaN(parsed.getTime())) return todayPlus(14);
  return parsed.toISOString().split("T")[0];
}

function guessDueDate(sentence: string): string | null {
  for (const [pattern, resolver] of DATE_PATTERNS) {
    const m = sentence.match(pattern);
    if (m) return resolver(m[0]);
  }
  return null;
}

function guessPriority(sentence: string): TaskPriority {
  if (URGENT_WORDS.test(sentence)) return "urgent";
  if (HIGH_WORDS.test(sentence)) return "high";
  if (LOW_WORDS.test(sentence)) return "low";
  return "medium";
}

// Extract a plausible name from "assign to X", "X will", "@X", etc.
function guessAssignee(sentence: string): string | null {
  const patterns = [
    /assign(?:ed)? to ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/,
    /@([A-Za-z]+)/,
    /([A-Z][a-z]+(?: [A-Z][a-z]+)?) (will|should|needs to|has to)/,
    /(can you|could you) ([A-Z][a-z]+)/i,
  ];
  for (const p of patterns) {
    const m = sentence.match(p);
    if (m) return m[1] || m[2] || null;
  }
  return null;
}

function scoreConfidence(sentence: string, matchCount: number): number {
  // Higher when more action patterns match, sentence is shorter, and has a date
  const dateBonus = guessDueDate(sentence) ? 0.1 : 0;
  const lengthPenalty = sentence.length > 200 ? 0.1 : 0;
  return Math.min(0.95, 0.4 + matchCount * 0.15 + dateBonus - lengthPenalty);
}

function buildTitle(sentence: string): string {
  // Strip leading filler, capitalise, trim to ~80 chars
  const cleaned = sentence
    .replace(/^(so|and|but|also|then|okay|ok|yeah|right|like|well)[,\s]+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 80) return cleaned;
  return cleaned.slice(0, 77) + "…";
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const mockExtractor: ExtractorAdapter = {
  async extract(text: string): Promise<ExtractionResult> {
    // Split on sentence boundaries
    const sentences = text
      .split(/(?<=[.!?\n])\s+|[\n]{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const candidates: CandidateTask[] = [];

    for (const sentence of sentences) {
      const matchCount = ACTION_PATTERNS.filter((p) => p.test(sentence)).length;
      if (matchCount === 0) continue;

      candidates.push({
        title: buildTitle(sentence),
        summary: sentence,
        suggested_assignee: guessAssignee(sentence),
        due_date_guess: guessDueDate(sentence),
        priority_guess: guessPriority(sentence),
        source_text: sentence,
        confidence: scoreConfidence(sentence, matchCount),
      });
    }

    return { candidates, raw_text: text };
  },
};
