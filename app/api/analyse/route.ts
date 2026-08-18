import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, PublicError } from "@/lib/github";
import { evaluateRepo } from "@/lib/evaluator";

export const maxDuration = 300;

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
    const repo = `${data.owner}/${data.repo}`;
    const stripeUrl = process.env.STRIPE_PAYMENT_URL || null;

    // Full report (the paid view fetches with full: true).
    if (body?.full) {
      return NextResponse.json({ repo, evaluation, stripeUrl });
    }

    // Free teaser: score, verdict, summary, the single biggest problem
    // (without its fix), locked titles for the rest, one strength. The full
    // findings, fixes, breakdown reasons, and generated files never leave the
    // server on a free call.
    const [top, ...rest] = evaluation.problems;
    return NextResponse.json({
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
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("analyse failed:", err);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
