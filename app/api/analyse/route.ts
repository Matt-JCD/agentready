import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, PublicError } from "@/lib/github";
import { evaluateRepo } from "@/lib/evaluator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const repoInput = typeof body?.repo === "string" ? body.repo : "";
  if (!repoInput) {
    return NextResponse.json({ error: "Missing repo" }, { status: 400 });
  }

  try {
    const data = await fetchRepoData(repoInput);

    // Ingestion-only mode for smoke testing without burning model tokens.
    if (body?.dryRun) {
      return NextResponse.json({
        repo: `${data.owner}/${data.repo}`,
        found: data.found,
        missing: data.missing,
        tree: data.tree,
      });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Evaluation service not configured (missing ANTHROPIC_API_KEY)",
        },
        { status: 500 }
      );
    }

    const evaluation = await evaluateRepo(data);

    return NextResponse.json({
      repo: `${data.owner}/${data.repo}`,
      evaluation,
      stripeUrl: process.env.STRIPE_PAYMENT_URL || null,
    });
  } catch (err: any) {
    if (err instanceof PublicError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("analyse failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
