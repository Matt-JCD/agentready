import { NextRequest, NextResponse } from "next/server";

// Feedback goes to Slack (incoming webhook, primary reading surface) and to
// the Prism Supabase project (table agentready_feedback, insert-only for the
// anon key) as the durable store. Either destination alone is enough for the
// submission to count as delivered.
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const slackWebhook = process.env.SLACK_FEEDBACK_WEBHOOK_URL;
  if ((!supabaseUrl || !supabaseKey) && !slackWebhook) {
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

  const email = clip(body.email, 320);
  const page = clip(body.page, 200);
  const repo = clip(body.repo, 200);

  const deliveries: Promise<boolean>[] = [];

  if (slackWebhook) {
    const meta = [
      email ? `*From:* ${email}` : "*From:* (no email left)",
      repo ? `*Repo:* ${repo}` : null,
      page ? `*Page:* ${page}` : null,
    ]
      .filter(Boolean)
      .join("  ·  ");
    deliveries.push(
      fetch(slackWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Agent Ready feedback\n${meta}\n\n${message}`,
        }),
      })
        .then((r) => r.ok)
        .catch(() => false)
    );
  }

  if (supabaseUrl && supabaseKey) {
    deliveries.push(
      fetch(`${supabaseUrl}/rest/v1/agentready_feedback`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ message, email, page, repo }),
      })
        .then((r) => r.ok)
        .catch(() => false)
    );
  }

  const results = await Promise.all(deliveries);
  if (!results.some(Boolean)) {
    console.error("feedback delivery failed on all channels");
    return NextResponse.json(
      { error: "Could not save feedback. Please try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
