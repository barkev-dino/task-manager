"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/capture", label: "Capture" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/capture" className="font-bold text-gray-900 text-sm tracking-tight">
          Task Manager
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={signOut}
            className="ml-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
