import OpenAI from "openai";
import type { RepoData } from "./github";
import { SYSTEM_PROMPT, buildUserPrompt, EVALUATION_SCHEMA } from "./prompt";

export interface Dimension {
  score: number;
  reason: string;
}

export interface Problem {
  severity: "high" | "medium" | "low";
  title: string;
  evidence: string;
  impact: string;
  fix: string;
}

export interface Evaluation {
  score: number;
  verdict: string;
  summary: string;
  dimensions: {
    setup: Dimension;
    testing: Dimension;
    architecture: Dimension;
    instructions: Dimension;
    tooling: Dimension;
  };
  problems: Problem[];
  strengths: string[];
  recommendations: { title: string; detail: string }[];
  agents_md: string;
  claude_md: string;
}

function verdictForScore(score: number): string {
  if (score >= 80) return "Agent-ready";
  if (score >= 60) return "Nearly there";
  if (score >= 40) return "Needs work";
  return "Not agent-ready";
}

export async function evaluateRepo(data: RepoData): Promise<Evaluation> {
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(data) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "agent_readiness_evaluation",
        strict: true,
        schema: EVALUATION_SCHEMA as any,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Model returned no content");
  const parsed = JSON.parse(raw);

  const dims = parsed.dimensions;
  const score =
    dims.setup.score +
    dims.testing.score +
    dims.architecture.score +
    dims.instructions.score +
    dims.tooling.score;

  return {
    ...parsed,
    score,
    verdict: verdictForScore(score),
  };
}
