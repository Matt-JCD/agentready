"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Evaluation } from "@/lib/evaluator";

const DIMENSION_LABELS: Record<string, string> = {
  setup: "Environment & setup",
  testing: "Testing & verification",
  architecture: "Architecture context",
  instructions: "Agent instructions",
  tooling: "Tool discoverability",
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

function badgeMarkdown(repo: string, score: number) {
  const color = score >= 80 ? "2bbc8a" : score >= 60 ? "e9b46a" : "e05d5d";
  const badge = `https://img.shields.io/badge/Agent%20Ready-${score}%2F100-${color}`;
  return `[![Agent Ready](${badge})](https://www.getreadyforagents.com/agent-ready/)`;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy no-print"
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
  const [paywalled, setPaywalled] = useState(false);
  const [reportDate, setReportDate] = useState("");

  useEffect(() => {
    setReportDate(
      new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    const sessionId = params.get("session_id");
    const accessKey = params.get("key");
    const fromQuery = params.get("repo");
    let target = fromQuery;
    let githubToken: string | null = null;
    try {
      if (!target) target = sessionStorage.getItem("agentready:paid-repo");
      githubToken = sessionStorage.getItem("agentready:gh-token");
    } catch {}

    // With a paid session the server derives the repo from the session
    // itself, so a missing local repo is only fatal without one.
    if (!target && !sessionId) {
      setError("No repository specified. Run your repo on the homepage first.");
      setLoading(false);
      return;
    }
    if (target) setRepo(target);

    fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: target,
        full: true,
        sessionId,
        accessKey,
        githubToken: githubToken || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const e: any = new Error(data.error || "Analysis failed");
          e.paymentRequired = !!data.paymentRequired;
          throw e;
        }
        setRepo(data.repo);
        setEv(data.evaluation);
      })
      .catch((err) => {
        setError(err.message);
        setPaywalled(!!err.paymentRequired);
      })
      .finally(() => setLoading(false));
  }, [params]);

  return (
    <main className="wrap wrap--report">
      <p className="no-print" style={{ marginBottom: 24 }}>
        <a className="back" href="/">
          ← Check another repo
        </a>
      </p>

      {loading && (
        <p className="loading">
          Generating your full report <span className="dot">●</span> a fresh,
          complete evaluation takes 1–3 minutes.
        </p>
      )}
      {error && !paywalled && <p className="error">{error}</p>}
      {error && paywalled && (
        <div className="upsell">
          <h2>This is the paid report</h2>
          <p className="summary">{error}</p>
          <a href="/">
            <button className="primary" style={{ marginTop: 18 }}>
              Get your free score first →
            </button>
          </a>
        </div>
      )}

      {ev && repo && (
        <article className="report">
          {/* Cover block — doubles as the PDF title page header */}
          <div className="report-cover card">
            <div className="report-brand">
              <span className="logo logo--sm">
                agent <span>ready</span>
              </span>
              <span className="report-brand-by">
                Full Repository Report · by Get Ready for Agents
              </span>
            </div>
            <h1 className="report-title">{repo}</h1>
            <p className="report-date">Agent readiness report · {reportDate}</p>
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
            {ev.projected_score > ev.score && (
              <p className="summary">
                Implementing this report&apos;s fix plan takes the repository
                to about <strong>{ev.projected_score}/100</strong>.
              </p>
            )}
            <button
              className="primary no-print"
              style={{ marginTop: 22 }}
              onClick={() => window.print()}
            >
              Download as PDF
            </button>
          </div>

          <div className="section-label">Readiness breakdown</div>
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
              <div className="section-label">The build plan</div>
              <p className="dim-reason">
                In priority order, each step built on what your repository
                already has.
              </p>
              <div className="card">
                <ol className="fix-first">
                  {ev.recommendations.map((r, i) => (
                    <li key={i}>
                      <strong>{r.title}</strong>
                      {r.effort && (
                        <span className={`effort effort--${r.effort}`}>
                          {r.effort}
                        </span>
                      )}
                      <p className="dim-reason">{r.detail}</p>
                      {r.builds_on && (
                        <p className="builds-on">Builds on: {r.builds_on}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {ev.task_simulations?.length > 0 && (
            <>
              <div className="section-label">
                What happens when an agent works here
              </div>
              <p className="dim-reason">
                Three realistic tasks, simulated step by step against what the
                repository actually documents.
              </p>
              {ev.task_simulations.map((s, i) => (
                <div
                  className={`problem ${
                    s.outcome === "fails"
                      ? "high"
                      : s.outcome === "struggles"
                      ? "medium"
                      : "low"
                  }`}
                  key={i}
                >
                  <h3>
                    {s.outcome === "fails"
                      ? "❌"
                      : s.outcome === "struggles"
                      ? "⚠️"
                      : "✅"}{" "}
                    {s.task}
                  </h3>
                  <p>{s.narrative}</p>
                </div>
              ))}
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
              <div className="section-label">
                What you already have — and how to use it
              </div>
              {ev.strengths.map((s, i) => (
                <div className="problem low" key={i}>
                  <h3>✓ {s.title}</h3>
                  <p>{s.evidence}</p>
                  <p>
                    <strong>Leverage it:</strong> {s.leverage}
                  </p>
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

          <div className="section-label">README badge</div>
          <p className="dim-reason">
            Show your score. Paste this into your README — and re-run Agent
            Ready after the fixes to earn the higher number.
          </p>
          <pre className="agents-md">{badgeMarkdown(repo, ev.score)}</pre>
          <CopyButton text={badgeMarkdown(repo, ev.score)} label="Copy badge" />

          <p className="report-colophon">
            Generated by Agent Ready (agentready.onrender.com), a Get Ready for
            Agents product by Prefactor. Every finding is grounded in evidence
            from the repository at the time of analysis.
          </p>
        </article>
      )}

      <p className="footer no-print">
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
