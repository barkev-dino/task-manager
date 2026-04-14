import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import TaskCard from "@/components/TaskCard";
import type { TaskWithRelations } from "@/types";

export const dynamic = "force-dynamic";

function Section({
  title,
  tasks,
  accent,
}: {
  title: string;
  tasks: TaskWithRelations[];
  accent?: string;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${accent ?? "text-gray-500"}`}>
        {title} ({tasks.length})
      </h2>
      <div className="space-y-3">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
      </div>
    </section>
  );
}

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, email),
      requester:profiles!tasks_requester_id_fkey(id, full_name, email),
      team:teams(id, name)
    `)
    .eq("assignee_id", user.id)
    .not("status", "in", '("done","cancelled")')
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-red-600">Error loading tasks: {error.message}</p>
        </div>
      </div>
    );
  }

  const allTasks: TaskWithRelations[] = (tasks as TaskWithRelations[]) ?? [];

  const overdue = allTasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== "done"
  );
  const dueToday = allTasks.filter((t) => t.due_date === today);
  const blocked = allTasks.filter((t) => t.is_blocked);
  const highPriority = allTasks.filter(
    (t) =>
      (t.priority === "high" || t.priority === "urgent") &&
      !overdue.includes(t) &&
      !dueToday.includes(t)
  );
  const rest = allTasks.filter(
    (t) =>
      !overdue.includes(t) &&
      !dueToday.includes(t) &&
      !highPriority.includes(t)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <a
            href="/capture"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            + New tasks
          </a>
        </div>

        {allTasks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">You have no open tasks.</p>
            <a href="/capture" className="text-indigo-600 text-sm mt-2 block hover:underline">
              Capture some tasks →
            </a>
          </div>
        ) : (
          <>
            <Section title="Overdue" tasks={overdue} accent="text-red-600" />
            <Section title="Due Today" tasks={dueToday} accent="text-amber-600" />
            <Section title="Blocked" tasks={blocked} accent="text-orange-500" />
            <Section title="High Priority" tasks={highPriority} accent="text-indigo-600" />
            <Section title="Other Open Tasks" tasks={rest} />
          </>
        )}
      </div>
    </div>
  );
}
