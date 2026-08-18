"use client";

import { useState } from "react";
import type { Evaluation, Problem } from "@/lib/evaluator";

function verdictClass(score: number) {
  if (score >= 80) return "good";
  if (score >= 40) return "mid";
  return "bad";
}

const severityIcon: Record<string, string> = {
  high: "🔴",
  medium: "🟠",
  low: "🟡",
};

export default function Home() {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    repo: string;
    evaluation: Evaluation;
    stripeUrl: string | null;
  } | null>(null);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    if (!repo.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      // Stash for the /report page so the paid view doesn't re-run analysis.
      try {
        sessionStorage.setItem("agentready:last", JSON.stringify(data));
      } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const ev = result?.evaluation;
  const topProblems: Problem[] = ev?.problems.slice(0, 3) ?? [];

  return (
    <main className="wrap">
      <div className="logo">
        Agent <span>Ready</span>
      </div>

      <h1>How well can coding agents work in your repo?</h1>
      <p className="sub">
        Paste a public GitHub repository. Get a readiness score, the biggest
        problems, and evidence from your actual repo — free.
      </p>

      <form className="repo-form" onSubmit={analyse}>
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          spellCheck={false}
        />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Analysing…" : "Check my repo"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && (
        <p className="loading">
          Reading repository structure, README, manifests and CI config, then
          evaluating agent readiness <span className="dot">●</span> this takes
          20–60 seconds.
        </p>
      )}

      {result && ev && (
        <>
          <div className="card">
            <div style={{ color: "var(--muted)", marginBottom: 12 }}>
              {result.repo} · Agent Readiness
            </div>
            <div className="score-row">
              <div className="score-big">
                {ev.score}
                <small> / 100</small>
              </div>
              <div className={`verdict ${verdictClass(ev.score)}`}>
                {ev.verdict}
              </div>
            </div>
            <p className="summary">{ev.summary}</p>
          </div>

          {topProblems.length > 0 && (
            <>
              <div className="section-label">Biggest problems</div>
              {topProblems.map((p, i) => (
                <div className={`problem ${p.severity}`} key={i}>
                  <h3>
                    {severityIcon[p.severity]} {p.title}
                  </h3>
                  <p>{p.evidence}</p>
                  <p>
                    <strong>Why it matters:</strong> {p.impact}
                  </p>
                </div>
              ))}
            </>
          )}

          {ev.strengths.length > 0 && (
            <>
              <div className="section-label">What already works</div>
              {ev.strengths.slice(0, 3).map((s, i) => (
                <div className="strength" key={i}>
                  {s}
                </div>
              ))}
            </>
          )}

          <div className="upsell">
            <h2>Make this repo agent-ready</h2>
            <ul>
              <li>Full readiness assessment across all 5 dimensions</li>
              <li>Every issue ranked by impact</li>
              <li>Specific fixes with exact changes</li>
              <li>
                Repository-specific AGENTS.md, generated for {result.repo}
              </li>
              <li>Optional CLAUDE.md for Claude Code</li>
            </ul>
            {result.stripeUrl ? (
              <a
                href={result.stripeUrl}
                onClick={() => {
                  try {
                    sessionStorage.setItem("agentready:paid-repo", result.repo);
                  } catch {}
                }}
              >
                <button className="primary">
                  Make my repo agent-ready · $49
                </button>
              </a>
            ) : (
              <button className="primary" disabled>
                Payments coming shortly
              </button>
            )}
            <p className="fine">
              One-time payment. After checkout you land straight on your full
              report. Already paid?{" "}
              <a href={`/report?repo=${encodeURIComponent(result.repo)}`}>
                View your report
              </a>
              .
            </p>
          </div>
        </>
      )}

      <p className="footer">
        Agent Ready reads your repo through the GitHub API — no clone, no OAuth,
        nothing stored.
      </p>
    </main>
  );
}
