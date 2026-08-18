"use client";

import { useState } from "react";

interface FreeReport {
  score: number;
  verdict: string;
  summary: string;
  topProblem: {
    severity: string;
    title: string;
    evidence: string;
    impact: string;
  } | null;
  lockedProblems: { severity: string; title: string }[];
  strength: string | null;
  problemCount: number;
}

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
    free: FreeReport;
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
      try {
        sessionStorage.setItem("agentready:paid-repo", data.repo);
      } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const free = result?.free;

  return (
    <main className="wrap">
      <p className="eyebrow">
        <span className="spark"></span>Free agent readiness score
      </p>
      <h1>
        How well can coding agents work in your <em>repo</em>?
      </h1>
      <p className="sub">
        Paste a public GitHub repository. Get a readiness score and your
        biggest problem, with evidence from the actual repo — free.
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
          1–3 minutes.
        </p>
      )}

      {result && free && (
        <>
          <div className="card">
            <div className="card-kicker">{result.repo} · Agent Readiness</div>
            <div className="score-row">
              <div className="score-big">
                {free.score}
                <small> / 100</small>
              </div>
              <div className={`verdict ${verdictClass(free.score)}`}>
                {free.verdict}
              </div>
            </div>
            <p className="summary">{free.summary}</p>
          </div>

          {free.topProblem && (
            <>
              <div className="section-label">Your biggest problem</div>
              <div className={`problem ${free.topProblem.severity}`}>
                <h3>
                  {severityIcon[free.topProblem.severity]}{" "}
                  {free.topProblem.title}
                </h3>
                <p>{free.topProblem.evidence}</p>
                <p>
                  <strong>Why it matters:</strong> {free.topProblem.impact}
                </p>
              </div>
            </>
          )}

          {free.lockedProblems.length > 0 && (
            <>
              <div className="section-label">
                Also found in {result.repo.split("/")[1]}
              </div>
              {free.lockedProblems.map((p, i) => (
                <div className={`problem locked ${p.severity}`} key={i}>
                  <h3>
                    {severityIcon[p.severity]} {p.title}
                  </h3>
                  <p className="locked-note">
                    🔒 Evidence and the exact fix are in the full report
                  </p>
                </div>
              ))}
            </>
          )}

          {free.strength && (
            <>
              <div className="section-label">What already works</div>
              <div className="strength">{free.strength}</div>
            </>
          )}

          <div className="upsell">
            <h2>Make {result.repo.split("/")[1]} agent-ready</h2>
            <ul>
              <li>
                Full readiness breakdown across all 5 dimensions, with reasons
              </li>
              <li>
                All {free.problemCount} findings with evidence, impact and the
                exact fix
              </li>
              <li>Prioritized fix-first plan</li>
              <li>Repository-specific AGENTS.md, generated for {result.repo}</li>
              <li>CLAUDE.md for Claude Code, plus a print-ready PDF report</li>
            </ul>
            {result.stripeUrl ? (
              <a href={result.stripeUrl}>
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
        Agent Ready reads your repo through the GitHub API — no clone, no
        OAuth, nothing stored.
      </p>
    </main>
  );
}
