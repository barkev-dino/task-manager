// ─── Database row types (mirror Supabase tables) ────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type SourceType = "paste" | "manual" | "api";
export type UserRole = "member" | "manager" | "admin";

export interface Team {
  id: string;
  name: string;
  manager_name: string | null;
  manager_email: string | null;
  default_capacity_hours_per_week: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  role: UserRole;
  capacity_hours_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  requester_id: string | null;
  team_id: string | null;
  department: string | null;
  project: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  estimated_effort_hours: number | null;
  source_type: SourceType;
  source_text: string | null;
  confidence: number | null;
  is_blocked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  // joined
  author?: { full_name: string | null; email: string } | null;
}

export interface IntakeEvent {
  id: string;
  submitted_by: string | null;
  raw_text: string;
  source_type: SourceType;
  extracted_task_count: number;
  created_at: string;
}

// ─── Joined / enriched types used in views ──────────────────────────────────

export interface TaskWithRelations extends Task {
  assignee?: Pick<Profile, "id" | "full_name" | "email"> | null;
  requester?: Pick<Profile, "id" | "full_name" | "email"> | null;
  team?: Pick<Team, "id" | "name"> | null;
}

// ─── Workload summary shapes (returned by SQL views) ────────────────────────

export interface PersonWorkload {
  assignee_id: string;
  full_name: string | null;
  email: string;
  team_name: string | null;
  open_tasks: number;
  open_effort_hours: number;
  capacity_hours_per_week: number;
  overdue_tasks: number;
}

export interface TeamWorkload {
  team_id: string;
  team_name: string;
  open_tasks: number;
  open_effort_hours: number;
  total_capacity_hours: number;
  overdue_tasks: number;
  unassigned_urgent_tasks: number;
}
