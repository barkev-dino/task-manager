"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ageLabel } from "@/lib/utils";
import type { TaskWithRelations, TaskStatus, TaskPriority, TaskComment } from "@/types";

interface Props {
  task: TaskWithRelations;
  userId: string;
  profiles: { id: string; full_name: string | null; email: string }[];
  teams: { id: string; name: string }[];
  onSave: (updated: TaskWithRelations) => void;
  onClose: () => void;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done", "cancelled"];

function initials(name: string | null | undefined, email: string | undefined): string {
  const str = name ?? email ?? "?";
  return str.charAt(0).toUpperCase();
}

export default function TaskEditModal({ task, userId, profiles, teams, onSave, onClose }: Props) {
  const supabase = createClient();

  // ── Form state (initialised from task) ───────────────────────────
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? "");
  const [teamId, setTeamId] = useState(task.team_id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [effort, setEffort] = useState(task.estimated_effort_hours?.toString() ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [project, setProject] = useState(task.project ?? "");
  const [department, setDepartment] = useState(task.department ?? "");
  const [isBlocked, setIsBlocked] = useState(task.is_blocked);

  // ── Comments ─────────────────────────────────────────────────────
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Save state ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments once on mount
  useEffect(() => {
    supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at, author:profiles(full_name, email)")
      .eq("task_id", task.id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setComments(data as TaskComment[]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Scroll to newest comment whenever the list grows
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description || null,
        assignee_id: assigneeId || null,
        team_id: teamId || null,
        due_date: dueDate || null,
        estimated_effort_hours: effort ? parseFloat(effort) : null,
        priority,
        status,
        project: project || null,
        department: department || null,
        is_blocked: isBlocked,
      })
      .eq("id", task.id)
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(id, full_name, email),
        requester:profiles!tasks_requester_id_fkey(id, full_name, email),
        team:teams(id, name)
      `)
      .single();

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    onSave(data as TaskWithRelations);
  }

  async function handleAddComment() {
    const body = newComment.trim();
    if (!body) return;
    setAddingComment(true);

    const { data, error: dbError } = await supabase
      .from("task_comments")
      .insert({ task_id: task.id, author_id: userId, body })
      .select("id, task_id, author_id, body, created_at, author:profiles(full_name, email)")
      .single();

    setAddingComment(false);
    if (!dbError && data) {
      setComments((prev) => [...prev, data as TaskComment]);
      setNewComment("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">
              {task.team?.name ?? "No team"}
              {task.project ? ` · ${task.project}` : ""}
            </p>
            <h2 className="font-semibold text-gray-900 leading-snug">Edit Task</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 text-2xl leading-none mt-0.5 transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Field grid */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={selectCls}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={selectCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignee">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={selectCls}
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Team">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={selectCls}
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Effort (hours)">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={effort}
                onChange={(e) => setEffort(e.target.value)}
                placeholder="e.g. 2"
                className={inputCls}
              />
            </Field>

            <Field label="Project">
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Department">
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Blocked toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isBlocked}
              onChange={(e) => setIsBlocked(e.target.checked)}
              className="rounded border-gray-300 text-orange-500 focus:ring-orange-300"
            />
            <span className="text-sm text-gray-700">Mark as blocked</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* ── Comments ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>

            {comments.length === 0 && (
              <p className="text-xs text-gray-300 pb-1">No comments yet.</p>
            )}

            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(c.author?.full_name, c.author?.email ?? undefined)}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-gray-700">
                      {c.author?.full_name ?? c.author?.email ?? "Unknown"}
                    </span>
                    <span className="text-xs text-gray-300">{ageLabel(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}

            <div ref={commentsEndRef} />

            {/* Add comment input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Add a comment… (Enter to post)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400 space-x-2">
            <span>Created {ageLabel(task.created_at)}</span>
            <span>·</span>
            <span>Updated {ageLabel(task.updated_at)}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const selectCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400";
const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
