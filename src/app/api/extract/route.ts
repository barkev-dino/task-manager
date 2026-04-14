import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractor } from "@/lib/extractor";

export async function POST(req: NextRequest) {
  // Auth check — only signed-in users may call this
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const text: string = body?.text ?? "";
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = await extractor.extract(text);

  // Record the intake event (best-effort, don't fail the request if this errors)
  await supabase
    .from("intake_events")
    .insert({
      submitted_by: user.id,
      raw_text: text,
      source_type: "paste",
      extracted_task_count: result.candidates.length,
    })
    .then(() => {});

  return NextResponse.json(result);
}
