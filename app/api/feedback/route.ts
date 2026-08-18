import { NextRequest, NextResponse } from "next/server";

// Feedback lands in the Prism Supabase project (table agentready_feedback,
// insert-only for the anon key). Same project as the Signals waitlist.
export async function POST(req: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Feedback is not configured" },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) {
    return NextResponse.json(
      { error: "Please write a message (up to 4000 characters)" },
      { status: 400 }
    );
  }
  const clip = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  const res = await fetch(`${url}/rest/v1/agentready_feedback`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      message,
      email: clip(body.email, 320),
      page: clip(body.page, 200),
      repo: clip(body.repo, 200),
    }),
  });

  if (!res.ok) {
    console.error("feedback insert failed:", res.status, await res.text());
    return NextResponse.json(
      { error: "Could not save feedback. Please try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
