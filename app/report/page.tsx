"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Evaluation } from "@/lib/evaluator";

const DIMENSION_LABELS: Record<string, string> = {
  setup: "Setup",
  testing: "Testing",
  architecture: "Architecture",
  instructions: "Instructions",
  tooling: "Tooling",
};

const severityIcon: Record<string, string> = {
  high: "🔴",
  medium: "🟠",
  low: "🟡",
};

function verdictClass(score: number) {
  if (score >= 80) return "good";
  if (score >= 40) return "mid";
  return "bad";
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

function Report() {
  const params = useSearchParams();
  const [repo, setRepo] = useState<string | null>(null);
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromQuery = params.get("repo");
    let target = fromQuery;
    let cached: { repo: string; evaluation: Evaluation } | null = null;
    try {
      const raw = sessionStorage.getItem("agentready:last");
      if (raw) cached = JSON.parse(raw);
      if (!target) {
        target =
          sessionStorage.getItem("agentready:paid-repo") ||
          cached?.repo ||
          null;
      }
    } catch {}

    if (!target) {
      setError(
        "No repository specified. Run your repo on the homepage first."
      );
      setLoading(false);
      return;
    }
    setRepo(target);

    // Reuse the analysis from this session if it matches; otherwise re-run.
    if (cached && cached.repo === target && cached.evaluation) {
      setEv(cached.evaluation);
      setLoading(false);
      return;
    }

    fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: target }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        setEv(data.evaluation);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params]);

  return (
    <main className="wrap">
      <div className="logo">
        Agent<span>Ready</span>
      </div>
      <p style={{ marginTop: 24 }}>
        <a className="back" href="/">
          ← Check another repo
        </a>
      </p>

      {loading && (
        <p className="loading">
          Preparing your full report <span className="dot">●</span>
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {ev && (
        <>
          <div className="card">
            <div style={{ color: "var(--muted)", marginBottom: 12 }}>
              {repo} · Full Agent Readiness Report
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

          <div className="section-label">Breakdown</div>
          <div className="card">
            {Object.entries(ev.dimensions).map(([key, dim]) => (
              <div key={key} style={{ marginBottom: 18 }}>
                <div className="bar-row">
                  <div>{DIMENSION_LABELS[key] ?? key}</div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(dim.score / 20) * 100}%` }}
                    />
                  </div>
                  <div className="bar-score">{dim.score} / 20</div>
                </div>
                <p className="dim-reason">{dim.reason}</p>
              </div>
            ))}
          </div>

          {ev.recommendations.length > 0 && (
            <>
              <div className="section-label">Fix first</div>
              <div className="card">
                <ol style={{ paddingLeft: 20 }}>
                  {ev.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: 14 }}>
                      <strong>{r.title}</strong>
                      <p className="dim-reason">{r.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          <div className="section-label">All findings</div>
          {ev.problems.map((p, i) => (
            <div className={`problem ${p.severity}`} key={i}>
              <h3>
                {severityIcon[p.severity]} {p.title}
              </h3>
              <p>
                <strong>Evidence:</strong> {p.evidence}
              </p>
              <p>
                <strong>Why it matters to a coding agent:</strong> {p.impact}
              </p>
              <p>
                <strong>Recommended change:</strong> {p.fix}
              </p>
            </div>
          ))}

          {ev.strengths.length > 0 && (
            <>
              <div className="section-label">Strengths</div>
              {ev.strengths.map((s, i) => (
                <div className="strength" key={i}>
                  {s}
                </div>
              ))}
            </>
          )}

          <div className="section-label">Generated AGENTS.md</div>
          <p className="dim-reason">
            Drop this at the root of your repository. Coding agents (Claude
            Code, Codex, Cursor, Copilot) read it automatically.
          </p>
          <pre className="agents-md">{ev.agents_md}</pre>
          <CopyButton text={ev.agents_md} label="Copy AGENTS.md" />

          {ev.claude_md && (
            <>
              <div className="section-label">Optional CLAUDE.md</div>
              <p className="dim-reason">
                A condensed variant formatted as project memory for Claude
                Code.
              </p>
              <pre className="agents-md">{ev.claude_md}</pre>
              <CopyButton text={ev.claude_md} label="Copy CLAUDE.md" />
            </>
          )}
        </>
      )}

      <p className="footer">
        Questions? Reply to your Stripe receipt — it reaches a human.
      </p>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <Report />
    </Suspense>
  );
}
