import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, PublicError } from "@/lib/github";
import { evaluateRepo } from "@/lib/evaluator";

export const maxDuration = 300;

// The Astro landing page on getreadyforagents.com calls this API cross-origin.
const ALLOWED_ORIGINS = new Set([
  "https://www.getreadyforagents.com",
  "https://getreadyforagents.com",
  "http://localhost:4321",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

type FullAuth =
  | { ok: true; repo: string | null }
  | { ok: false; error: string };

// Full reports are gated: either the owner access key, or a Stripe Checkout
// Session that is actually paid. When the session carries a
// client_reference_id (set by /checkout), that repo is authoritative.
async function authorizeFullReport(body: any): Promise<FullAuth> {
  const accessKey = process.env.REPORT_ACCESS_KEY;
  if (
    accessKey &&
    typeof body?.accessKey === "string" &&
    body.accessKey === accessKey
  ) {
    return { ok: true, repo: null };
  }

  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return {
      ok: false,
      error:
        "The full report requires payment. Run your repo on the homepage and complete checkout to unlock it.",
    };
  }
  const stripeKey = sessionId.startsWith("cs_test_")
    ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { ok: false, error: "Payment verification is not configured" };
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  );
  if (!res.ok) {
    return {
      ok: false,
      error:
        "We couldn't verify this payment. If you did pay, reply to your Stripe receipt and we'll sort it out.",
    };
  }
  const session = await res.json();
  if (session.payment_status !== "paid") {
    return {
      ok: false,
      error:
        "This checkout wasn't completed. Finish payment to unlock the full report.",
    };
  }
  let repo: string | null = null;
  if (typeof session.client_reference_id === "string") {
    try {
      repo = Buffer.from(session.client_reference_id, "base64url").toString(
        "utf8"
      );
    } catch {}
  }
  return { ok: true, repo };
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: cors });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  let repoInput = typeof body?.repo === "string" ? body.repo : "";

  // Gate BEFORE any expensive work: a rejected full request must not fetch
  // the repo or run the model.
  if (body?.full) {
    const auth = await authorizeFullReport(body);
    if (!auth.ok) {
      return json({ error: auth.error, paymentRequired: true }, 402);
    }
    // The repo bound to the paid session wins over whatever the client sent.
    if (auth.repo) repoInput = auth.repo;
  }

  if (!repoInput) {
    return json({ error: "Missing repo" }, 400);
  }

  try {
    const data = await fetchRepoData(repoInput);

    // Ingestion-only mode for smoke testing without burning model tokens.
    if (body?.dryRun) {
      return json({
        repo: `${data.owner}/${data.repo}`,
        found: data.found,
        missing: data.missing,
        tree: data.tree,
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return json(
        {
          error:
            "Evaluation service not configured (missing ANTHROPIC_API_KEY)",
        },
        500
      );
    }

    const evaluation = await evaluateRepo(data);
    const repo = `${data.owner}/${data.repo}`;
    const stripeUrl = process.env.STRIPE_PAYMENT_URL || null;

    // Full report (the paid view fetches with full: true).
    if (body?.full) {
      return json({ repo, evaluation, stripeUrl });
    }

    // Free teaser: score, verdict, summary, the single biggest problem
    // (without its fix), locked titles for the rest, one strength. The full
    // findings, fixes, breakdown reasons, and generated files never leave the
    // server on a free call.
    const [top, ...rest] = evaluation.problems;
    return json({
      repo,
      free: {
        score: evaluation.score,
        verdict: evaluation.verdict,
        summary: evaluation.summary,
        topProblem: top
          ? {
              severity: top.severity,
              title: top.title,
              evidence: top.evidence,
              impact: top.impact,
            }
          : null,
        lockedProblems: rest.map((p) => ({
          severity: p.severity,
          title: p.title,
        })),
        strength: evaluation.strengths[0] ?? null,
        problemCount: evaluation.problems.length,
      },
      stripeUrl,
    });
  } catch (err: any) {
    if (err instanceof PublicError) {
      return json({ error: err.message }, 400);
    }
    console.error("analyse failed:", err);
    return json({ error: "Analysis failed. Please try again." }, 500);
  }
}
