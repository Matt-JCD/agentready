import Anthropic from "@anthropic-ai/sdk";
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

export interface TaskSimulation {
  task: string;
  outcome: "succeeds" | "struggles" | "fails";
  narrative: string;
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
  task_simulations: TaskSimulation[];
  projected_score: number;
  agents_md: string;
  claude_md: string;
}

function verdictForScore(score: number): string {
  if (score >= 80) return "Agent-ready";
  if (score >= 60) return "Nearly there";
  if (score >= 40) return "Needs work";
  return "Not agent-ready";
}

function clampDim(dim: Dimension): Dimension {
  return { ...dim, score: Math.max(0, Math.min(20, Math.round(dim.score))) };
}

export async function evaluateRepo(
  data: RepoData,
  opts: { deep?: boolean } = {}
): Promise<Evaluation> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";

  // Paid reports get the deepest reasoning; free scores stay at the default.
  const stream = client.messages.stream({
    model,
    max_tokens: opts.deep ? 48000 : 32000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: opts.deep ? "xhigh" : "high",
      format: {
        type: "json_schema",
        schema: EVALUATION_SCHEMA as any,
      },
    },
    messages: [{ role: "user", content: buildUserPrompt(data) }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("Evaluation was declined by the model");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Evaluation output was truncated");
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!textBlock) throw new Error("Model returned no content");
  const parsed = JSON.parse(textBlock.text);

  const dims = {
    setup: clampDim(parsed.dimensions.setup),
    testing: clampDim(parsed.dimensions.testing),
    architecture: clampDim(parsed.dimensions.architecture),
    instructions: clampDim(parsed.dimensions.instructions),
    tooling: clampDim(parsed.dimensions.tooling),
  };
  const score =
    dims.setup.score +
    dims.testing.score +
    dims.architecture.score +
    dims.instructions.score +
    dims.tooling.score;

  const projected = Math.max(
    score,
    Math.min(100, Math.round(parsed.projected_score ?? score))
  );

  return {
    ...parsed,
    dimensions: dims,
    score,
    projected_score: projected,
    verdict: verdictForScore(score),
  };
}
