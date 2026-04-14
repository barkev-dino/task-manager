import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Signed-in users go straight to capture
  if (user) redirect("/capture");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo / name */}
        <div>
          <span className="inline-block bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
            Internal Tool
          </span>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Task Manager
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Paste a messy meeting recap or hallway note. We extract the action
            items, fill the gaps, and get your team organised.
          </p>
        </div>

        {/* Features */}
        <ul className="text-left inline-flex flex-col gap-3 text-gray-700">
          {[
            "Paste any text — meeting notes, Slack threads, emails",
            "Auto-extract candidate tasks with priority and due-date guesses",
            "Review and fill missing fields before saving",
            "See your tasks due today, overdue, or blocked",
            "Managers get a real-time workload dashboard by person and team",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="text-indigo-500 mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign in to get started
          </Link>
        </div>

        <p className="text-sm text-gray-400">
          No account yet? Sign up on the login page.
        </p>
      </div>
    </main>
  );
}
