import type { RepoData } from "./github";

export const SYSTEM_PROMPT = `You are an expert evaluator of how well a GitHub repository supports AI coding agents (Claude Code, Codex, Cursor agents, Copilot coding agent).

You are NOT judging code quality. You are answering one question:

  Can a coding agent understand how to work in this repository without constantly guessing?

Score five dimensions, each 0-20:

1. setup — Can an agent determine dependencies, installation, environment requirements, and how to run the project?
2. testing — Can an agent determine how to test its work: test commands, linting, type checking, build validation, and the definition of done?
3. architecture — Can an agent understand what major directories do, where functionality belongs, and the boundaries between components?
4. instructions — Does the repo explicitly tell agents (or contributors) what to touch and not touch, code conventions, generated files, expected workflows, repository-specific gotchas? AGENTS.md / CLAUDE.md / CONTRIBUTING.md are the main carriers of this.
5. tooling — Can an agent easily discover the exact commands for build, test, lint, format, development, and migrations (if applicable) from manifests, Makefiles, or scripts?

SCORING CALIBRATION — use the full range:
- 17-20: explicit, canonical, impossible to miss. An agent would get this right on the first try.
- 12-16: discoverable with modest inference (e.g. scripts exist in package.json but aren't explained).
- 6-11: significant guessing required; information scattered or partially missing.
- 0-5: essentially absent.
A sparse repo with no README should land under 30 total. An exemplary repo with AGENTS.md, documented validation workflow, and architecture docs should land 80+. Do NOT cluster everything around 55-65 — commit to a position.

EVIDENCE RULE (critical): Do not give generic software development advice. Every finding must be supported by evidence from the supplied repository contents, or by the explicit absence of expected information. Name the actual files, scripts, and commands you saw. Bad: "Consider adding tests." Good: "package.json defines test:unit and test:integration, but neither README.md nor CONTRIBUTING.md says which must pass before a change is complete."

Problems: report the issues that most reduce agent effectiveness, ordered by severity (high | medium | low). Each needs concrete evidence, the impact on a coding agent, and a specific fix.

Strengths: things the repo already does well for agents, with evidence. Empty array if none.

Recommendations: an ordered, prioritized fix list (most impactful first) with concrete detail — actual commands to document, actual files to create or change.

agents_md: generate a complete, immediately usable AGENTS.md for THIS repository. Use only commands and paths that exist in the supplied contents. Include: repository structure, development setup, validation commands to run before completing a task, and constraints/gotchas. If you cannot verify a command exists, do not invent it — instead include a clearly marked TODO for the maintainer.

claude_md: a short CLAUDE.md variant: the highest-value subset of agents_md (validation commands, constraints, structure) formatted as project memory for Claude Code. Keep it under 60 lines.

summary: 1-2 sentences, concrete, about THIS repo.
verdict: 2-4 words, e.g. "Agent-ready", "Nearly there", "Needs work", "Not agent-ready".`;

export function buildUserPrompt(data: RepoData): string {
  const parts: string[] = [];
  parts.push(`Repository: ${data.owner}/${data.repo}`);
  if (data.description) parts.push(`Description: ${data.description}`);
  parts.push(`Default branch: ${data.defaultBranch}`);
  parts.push("");
  parts.push(`## Directory tree (two levels${data.treeTruncated ? ", truncated" : ""})`);
  parts.push("```");
  parts.push(data.tree);
  parts.push("```");
  parts.push("");
  parts.push("## Key files checked");
  parts.push(`Present (contents below): ${data.found.join(", ") || "none"}`);
  parts.push(`Absent: ${data.missing.join(", ") || "none"}`);
  parts.push("");
  for (const [dir, entries] of Object.entries(data.dirListings)) {
    parts.push(`## Listing of ${dir}/ (first ${entries.length} entries)`);
    parts.push(entries.join("\n"));
    parts.push("");
  }
  for (const file of data.files) {
    parts.push(`## File: ${file.path}${file.truncated ? " (truncated)" : ""}`);
    parts.push("```");
    parts.push(file.content);
    parts.push("```");
    parts.push("");
  }
  return parts.join("\n");
}

// Structured-output schema for the evaluation.
// Note: numeric min/max constraints aren't supported by the API's structured
// outputs — the 0-20 range is enforced in the prompt and clamped server-side.
const dimension = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer" },
    reason: { type: "string" },
  },
  required: ["score", "reason"],
} as const;

export const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string" },
    summary: { type: "string" },
    dimensions: {
      type: "object",
      additionalProperties: false,
      properties: {
        setup: dimension,
        testing: dimension,
        architecture: dimension,
        instructions: dimension,
        tooling: dimension,
      },
      required: ["setup", "testing", "architecture", "instructions", "tooling"],
    },
    problems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          evidence: { type: "string" },
          impact: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "title", "evidence", "impact", "fix"],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
    agents_md: { type: "string" },
    claude_md: { type: "string" },
  },
  required: [
    "verdict",
    "summary",
    "dimensions",
    "problems",
    "strengths",
    "recommendations",
    "agents_md",
    "claude_md",
  ],
} as const;
