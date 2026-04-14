import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";
import type { PersonWorkload, TeamWorkload, TaskWithRelations } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Fetch workload views
  const [
    { data: personWorkload },
    { data: teamWorkload },
    { data: urgentUnassigned },
  ] = await Promise.all([
    supabase.from("person_workload").select("*").order("open_effort_hours", { ascending: false }),
    supabase.from("team_workload").select("*").order("open_effort_hours", { ascending: false }),
    supabase
      .from("tasks")
      .select(`*, team:teams(id, name)`)
      .is("assignee_id", null)
      .in("priority", ["high", "urgent"])
      .not("status", "in", '("done","cancelled")')
      .order("priority", { ascending: false })
      .limit(10),
  ]);

  const people: PersonWorkload[] = (personWorkload as PersonWorkload[]) ?? [];
  const teams: TeamWorkload[] = (teamWorkload as TeamWorkload[]) ?? [];
  const urgent: TaskWithRelations[] = (urgentUnassigned as TaskWithRelations[]) ?? [];

  function OverloadBadge({ effort, capacity }: { effort: number; capacity: number }) {
    if (capacity === 0) return null;
    const pct = (effort / capacity) * 100;
    if (pct >= 100) return <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overloaded</span>;
    if (pct >= 80) return <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Near capacity</span>;
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workload Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Open effort and capacity as of{" "}
            {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Team workload */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Open Effort by Team
          </h2>
          {teams.length === 0 ? (
            <p className="text-gray-400 text-sm">No team data yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Team</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Open Tasks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Open Hrs</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Capacity /wk</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Overdue</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Urgent Unassigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map((t) => (
                    <tr key={t.team_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {t.team_name}
                        <OverloadBadge effort={t.open_effort_hours} capacity={t.total_capacity_hours} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{t.open_tasks}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{t.open_effort_hours}h</td>
                      <td className="px-4 py-3 text-right text-gray-500">{t.total_capacity_hours}h</td>
                      <td className="px-4 py-3 text-right">
                        {t.overdue_tasks > 0 ? (
                          <span className="text-red-600 font-medium">{t.overdue_tasks}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.unassigned_urgent_tasks > 0 ? (
                          <span className="text-amber-600 font-medium">{t.unassigned_urgent_tasks}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Person workload */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Open Effort by Person
          </h2>
          {people.length === 0 ? (
            <p className="text-gray-400 text-sm">No assignments yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Person</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Team</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Open Tasks</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Open Hrs</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Capacity /wk</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {people.map((p) => (
                    <tr key={p.assignee_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">
                          {p.full_name ?? p.email}
                        </span>
                        <OverloadBadge effort={p.open_effort_hours} capacity={p.capacity_hours_per_week} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.team_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{p.open_tasks}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{p.open_effort_hours}h</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.capacity_hours_per_week}h</td>
                      <td className="px-4 py-3 text-right">
                        {p.overdue_tasks > 0 ? (
                          <span className="text-red-600 font-medium">{p.overdue_tasks}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Urgent unassigned */}
        {urgent.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 mb-4">
              Urgent Unassigned Tasks ({urgent.length})
            </h2>
            <div className="space-y-2">
              {urgent.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.team?.name ?? "No team"} ·{" "}
                      {t.due_date
                        ? `Due ${t.due_date < today ? "⚠ " : ""}${t.due_date}`
                        : "No due date"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      t.priority === "urgent"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
