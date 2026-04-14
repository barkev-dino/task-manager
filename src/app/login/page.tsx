"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        router.push("/capture");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "info",
          text: "Check your email for a confirmation link, then sign in.",
        });
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Task Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <p
              className={`text-sm rounded-lg px-3 py-2 ${
                message.type === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button
            className="text-indigo-600 hover:underline font-medium"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMessage(null);
            }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
