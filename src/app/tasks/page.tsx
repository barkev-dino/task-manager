import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import KanbanBoard from "./KanbanBoard";
import type { TaskWithRelations } from "@/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tasks, error }, { data: profiles }, { data: teams }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, email),
          requester:profiles!tasks_requester_id_fkey(id, full_name, email),
          team:teams(id, name)
        `)
        .eq("assignee_id", user.id)
        .neq("status", "cancelled")
        .order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("teams").select("id, name").order("name"),
    ]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">
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
            + Capture tasks
          </a>
        </div>

        <KanbanBoard
          initialTasks={(tasks as TaskWithRelations[]) ?? []}
          userId={user.id}
          profiles={profiles ?? []}
          teams={teams ?? []}
        />
      </div>
    </div>
  );
}
