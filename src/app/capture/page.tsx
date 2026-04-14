import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CaptureClient from "./CaptureClient";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load teams and profiles for the review form dropdowns
  const [{ data: teams }, { data: profiles }] = await Promise.all([
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  return (
    <CaptureClient
      userId={user.id}
      teams={teams ?? []}
      profiles={profiles ?? []}
    />
  );
}
