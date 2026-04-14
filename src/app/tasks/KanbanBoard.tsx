"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ageLabel } from "@/lib/utils";
import TaskEditModal from "./TaskEditModal";
import type { TaskWithRelations, TaskStatus, TaskPriority } from "@/types";

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string; accent: string; border: string }[] = [
  { id: "todo",        label: "To Do",       accent: "text-gray-600",   border: "border-gray-300" },
  { id: "in_progress", label: "In Progress", accent: "text-blue-600",   border: "border-blue-400" },
  { id: "blocked",     label: "Blocked",     accent: "text-orange-600", border: "border-orange-400" },
  { id: "done",        label: "Done",        accent: "text-green-600",  border: "border-green-400" },
];

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  urgent: "border-l-red-500",
  high:   "border-l-amber-400",
  medium: "border-l-blue-300",
  low:    "border-l-gray-200",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high:   "bg-amber-400",
  medium: "bg-blue-300",
  low:    "bg-gray-300",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialTasks: TaskWithRelations[];
  userId: string;
  profiles: { id: string; full_name: string | null; email: string }[];
  teams: { id: string; name: string }[];
}

// ─── Board ────────────────────────────────────────────────────────────────────

export default function KanbanBoard({ initialTasks, userId, profiles, teams }: Props) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<TaskStatus>>(
    new Set(["todo", "in_progress", "blocked", "done"])
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    // Optimistic update first for instant feedback
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId && taskId !== "") updateStatus(taskId, status);
    setDraggingId(null);
    setDragOverCol(null);
  }

  function toggleColumn(status: TaskStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status) && next.size > 1) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  function handleSaveTask(updated: TaskWithRelations) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingTask(null);
  }

  const visibleColumns = COLUMNS.filter((c) => visibleStatuses.has(c.id));

  return (
    <>
      {/* ── Status filter ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-400 mr-1">Filter:</span>
        {COLUMNS.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          const active = visibleStatuses.has(col.id);
          return (
            <button
              key={col.id}
              onClick={() => toggleColumn(col.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-400"
              }`}
            >
              {col.label}
              <span className={`ml-1.5 ${active ? "text-indigo-400" : "text-gray-300"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Board ──────────────────────────────────────────────── */}
      {tasks.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">No tasks yet.</p>
          <a href="/capture" className="text-indigo-600 text-sm mt-2 block hover:underline">
            Capture some tasks →
          </a>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 items-start">
          {visibleColumns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isOver = dragOverCol === col.id;

            return (
              <div
                key={col.id}
                className="flex-shrink-0 w-72"
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column entirely (not a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.border}`}>
                  <span className={`text-sm font-semibold ${col.accent}`}>{col.label}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full tabular-nums">
                    {colTasks.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  className={`min-h-24 rounded-xl space-y-2 p-1 transition-colors ${
                    isOver ? "bg-indigo-50 ring-1 ring-indigo-200 ring-inset" : ""
                  }`}
                >
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      isDragging={draggingId === task.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("taskId", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(task.id);
                      }}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                      onClick={() => setEditingTask(task)}
                    />
                  ))}

                  {colTasks.length === 0 && (
                    <p className={`text-xs text-center py-8 transition-colors ${
                      isOver ? "text-indigo-300" : "text-gray-200"
                    }`}>
                      {isOver ? "Drop here" : "Empty"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────── */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          userId={userId}
          profiles={profiles}
          teams={teams}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

interface KanbanCardProps {
  task: TaskWithRelations;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function KanbanCard({ task, isDragging, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done";
  // Track whether we actually dragged so we don't fire onClick after a drop
  const didDragRef = useRef(false);

  return (
    <div
      draggable
      onDragStart={(e) => { didDragRef.current = false; onDragStart(e); }}
      onDrag={() => { didDragRef.current = true; }}
      onDragEnd={onDragEnd}
      onClick={() => { if (!didDragRef.current) onClick(); didDragRef.current = false; }}
      className={`bg-white border border-l-4 ${PRIORITY_BORDER[task.priority]} border-gray-200
        rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm
        transition-all select-none group
        ${isDragging ? "opacity-40 scale-95" : "opacity-100"}`}
    >
      {/* Priority dot + title */}
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-3 flex-1">
          {task.title}
        </p>
      </div>

      {/* Team / project */}
      {(task.team?.name || task.project) && (
        <p className="text-xs text-gray-400 mt-1.5 ml-4 truncate">
          {[task.team?.name, task.project].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Assignee */}
      {task.assignee && (
        <p className="text-xs text-gray-500 mt-1.5 ml-4">
          {task.assignee.full_name ?? task.assignee.email}
        </p>
      )}

      {/* Footer */}
      <div className="mt-2.5 ml-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          {task.due_date && (
            <span className={isOverdue ? "text-red-500 font-medium" : "text-gray-400"}>
              {isOverdue ? "⚠ " : ""}
              {task.due_date}
            </span>
          )}
          {task.is_blocked && (
            <span className="text-orange-500 font-medium">Blocked</span>
          )}
        </div>
        {/* Age + activity */}
        <div className="flex items-center gap-1 text-xs text-gray-300 shrink-0" title={`Created ${ageLabel(task.created_at)} · Updated ${ageLabel(task.updated_at)}`}>
          <span>+{ageLabel(task.created_at)}</span>
          {task.updated_at !== task.created_at && (
            <span>· {ageLabel(task.updated_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
