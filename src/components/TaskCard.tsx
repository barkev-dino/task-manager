import type { TaskWithRelations, TaskPriority, TaskStatus } from "@/types";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-700",
  medium: "bg-blue-50 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-indigo-50 text-indigo-700",
  blocked: "bg-orange-100 text-orange-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-400 line-through",
};

interface Props {
  task: TaskWithRelations;
}

export default function TaskCard({ task }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done";

  return (
    <div
      className={`bg-white border rounded-xl px-4 py-4 space-y-2 ${
        task.is_blocked
          ? "border-orange-300"
          : isOverdue
          ? "border-red-300"
          : "border-gray-200"
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-gray-900 text-sm leading-snug flex-1">{task.title}</p>
        <div className="flex gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[task.status]}`}>
            {task.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{task.description}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        {task.team && <span>Team: {task.team.name}</span>}
        {task.assignee && (
          <span>Assignee: {task.assignee.full_name ?? task.assignee.email}</span>
        )}
        {task.due_date && (
          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
            Due: {task.due_date}
            {isOverdue && " (overdue)"}
          </span>
        )}
        {task.estimated_effort_hours && (
          <span>{task.estimated_effort_hours}h estimated</span>
        )}
        {task.is_blocked && (
          <span className="text-orange-500 font-medium">⚠ Blocked</span>
        )}
      </div>
    </div>
  );
}
