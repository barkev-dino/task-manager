"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import TaskForm from "@/components/TaskForm";
import type { CandidateTask } from "@/lib/extractor/types";
import type { TaskPriority, TaskStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";

const DEMO_TEXT = `Quick recap from today's standup:

Sarah needs to finish the API documentation by Friday. It's blocking the frontend team.

Can you review the database migration script, John? We need it done ASAP before the release next week.

Also, someone should update the onboarding checklist — it's outdated. Low priority but would be nice to have.

I'll schedule a meeting with the design team next Tuesday to go over the new dashboard mockups.

Please make sure the staging environment is back online — it's been down since yesterday and several people are blocked.`;

interface Props {
  userId: string;
  teams: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null; email: string }[];
}

export interface TaskDraft {
  id: string;
  // From extractor
  title: string;
  description: string;
  suggested_assignee: string | null;
  due_date_guess: string | null;
  priority_guess: TaskPriority;
  source_text: string;
  confidence: number;
  // User-filled fields
  assignee_id: string | null;
  team_id: string | null;
  due_date: string | null;
  estimated_effort_hours: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  project: string;
  department: string;
  skip: boolean;
}

function candidateToDraft(c: CandidateTask, idx: number): TaskDraft {
  return {
    id: `draft-${idx}-${Date.now()}`,
    title: c.title,
    description: c.summary,
    suggested_assignee: c.suggested_assignee,
    due_date_guess: c.due_date_guess,
    priority_guess: c.priority_guess,
    source_text: c.source_text,
    confidence: c.confidence,
    assignee_id: null,
    team_id: null,
    due_date: c.due_date_guess,
    estimated_effort_hours: null,
    priority: c.priority_guess,
    status: "todo",
    project: "",
    department: "",
    skip: false,
  };
}

function isDraftComplete(d: TaskDraft): boolean {
  return (
    d.title.trim() !== "" &&
    d.team_id !== null &&
    d.estimated_effort_hours !== null &&
    d.estimated_effort_hours > 0
  );
}

export default function CaptureClient({ userId, teams, profiles }: Props) {
  const supabase = createClient();
  const [rawText, setRawText] = useState("");
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText }),
    });

    if (!res.ok) {
      setError("Extraction failed. Please try again.");
      setExtracting(false);
      return;
    }

    const data = await res.json();
    const candidates: CandidateTask[] = data.candidates ?? [];

    if (candidates.length === 0) {
      setError("No action items detected. Try adding more actionable sentences.");
      setExtracting(false);
      return;
    }

    setDrafts(candidates.map(candidateToDraft));
    setExtracting(false);
  }

  function updateDraft(id: string, patch: Partial<TaskDraft>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    const toSave = drafts.filter((d) => !d.skip && isDraftComplete(d));
    if (toSave.length === 0) {
      setError("Fill in the required fields (team, effort) for at least one task.");
      return;
    }

    setSaving(true);
    setError(null);

    const rows = toSave.map((d) => ({
      title: d.title,
      description: d.description || null,
      assignee_id: d.assignee_id || null,
      requester_id: userId,
      team_id: d.team_id,
      department: d.department || null,
      project: d.project || null,
      status: d.status,
      priority: d.priority,
      due_date: d.due_date || null,
      estimated_effort_hours: d.estimated_effort_hours,
      source_type: "paste" as const,
      source_text: d.source_text || null,
      confidence: d.confidence ?? null,
      is_blocked: false,
    }));

    const { error: dbError } = await supabase.from("tasks").insert(rows);
    setSaving(false);

    if (dbError) {
      setError(`Save failed: ${dbError.message}`);
      return;
    }

    setSaved(true);
    setDrafts([]);
    setRawText("");
  }

  const activeDrafts = drafts.filter((d) => !d.skip);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capture Tasks</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Paste a meeting recap, Slack thread, or hallway note. We&apos;ll find the action items.
          </p>
        </div>

        {/* Paste box — hidden once drafts are loaded */}
        {drafts.length === 0 && (
          <div className="space-y-3">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder="Paste your text here…"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
            />
            <div className="flex gap-3">
              <button
                onClick={handleExtract}
                disabled={extracting || !rawText.trim()}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {extracting ? "Extracting…" : "Extract Tasks"}
              </button>
              <button
                onClick={() => setRawText(DEMO_TEXT)}
                className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Load demo text
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            Tasks saved.{" "}
            <a href="/tasks" className="underline font-medium">
              View my tasks →
            </a>
          </div>
        )}

        {/* Review cards */}
        {drafts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {activeDrafts.length} candidate task{activeDrafts.length !== 1 ? "s" : ""} found
              </h2>
              <button
                onClick={() => { setDrafts([]); setRawText(""); setError(null); }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Start over
              </button>
            </div>

            {drafts.map((draft) => (
              <TaskForm
                key={draft.id}
                draft={draft}
                teams={teams}
                profiles={profiles}
                onChange={(patch) => updateDraft(draft.id, patch)}
              />
            ))}

            <div className="pt-2 flex gap-3 items-center">
              <button
                onClick={handleSave}
                disabled={saving || activeDrafts.length === 0}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : `Save ${activeDrafts.length} task${activeDrafts.length !== 1 ? "s" : ""}`}
              </button>
              <span className="text-xs text-gray-400">
                Skipped tasks will not be saved.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
