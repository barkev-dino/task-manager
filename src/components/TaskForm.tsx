"use client";

import type { TaskDraft } from "@/app/capture/CaptureClient";
import type { TaskPriority, TaskStatus } from "@/types";

interface Props {
  draft: TaskDraft;
  teams: { id: string; name: string }[];
  profiles: { id: string; full_name: string | null; email: string }[];
  onChange: (patch: Partial<TaskDraft>) => void;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done", "cancelled"];

function confidenceColor(c: number): string {
  if (c >= 0.7) return "text-green-600";
  if (c >= 0.45) return "text-amber-500";
  return "text-gray-400";
}

export default function TaskForm({ draft, teams, profiles, onChange }: Props) {
  if (draft.skip) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between opacity-50">
        <p className="text-sm text-gray-500 line-through">{draft.title}</p>
        <button
          onClick={() => onChange({ skip: false })}
          className="text-xs text-indigo-600 hover:underline ml-4"
        >
          Undo skip
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${confidenceColor(draft.confidence)}`}>
              {Math.round(draft.confidence * 100)}% confidence
            </span>
          </div>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full font-semibold text-gray-900 text-sm border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none pb-0.5 bg-transparent"
            placeholder="Task title"
          />
        </div>
        <button
          onClick={() => onChange({ skip: true })}
          className="text-xs text-gray-400 hover:text-red-500 shrink-0"
        >
          Skip
        </button>
      </div>

      {/* Source text */}
      {draft.source_text && (
        <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-3 leading-relaxed">
          &ldquo;{draft.source_text}&rdquo;
        </p>
      )}

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
        />
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Team */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Team
          </label>
          <select
            value={draft.team_id ?? ""}
            onChange={(e) => onChange({ team_id: e.target.value || null })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
          >
            <option value="">Select team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Assignee
            {draft.suggested_assignee && (
              <span className="ml-1 text-indigo-400 font-normal">
                (suggested: {draft.suggested_assignee})
              </span>
            )}
          </label>
          <select
            value={draft.assignee_id ?? ""}
            onChange={(e) => onChange({ assignee_id: e.target.value || null })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
          >
            <option value="">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email}
              </option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
          <input
            type="date"
            value={draft.due_date ?? ""}
            onChange={(e) => onChange({ due_date: e.target.value || null })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Effort — required */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Effort (hours) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={draft.estimated_effort_hours ?? ""}
            onChange={(e) =>
              onChange({ estimated_effort_hours: e.target.value ? parseFloat(e.target.value) : null })
            }
            placeholder="e.g. 2"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
          <select
            value={draft.priority}
            onChange={(e) => onChange({ priority: e.target.value as TaskPriority })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={draft.status}
            onChange={(e) => onChange({ status: e.target.value as TaskStatus })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Project */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
          <input
            type="text"
            value={draft.project}
            onChange={(e) => onChange({ project: e.target.value })}
            placeholder="Optional"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
          <input
            type="text"
            value={draft.department}
            onChange={(e) => onChange({ department: e.target.value })}
            placeholder="Optional"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>
    </div>
  );
}
