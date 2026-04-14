"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-safe Supabase client — uses only the publishable anon key.
// Import this in Client Components only.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
