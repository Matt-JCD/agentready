# Agent Ready

Score GitHub repos for coding-agent readiness. Marketing is https://www.getreadyforagents.com/agent-ready/ — not `landing/` (abandoned). Live app: https://agentready.onrender.com

## Setup

```
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY required for eval; GITHUB_TOKEN recommended
npm run dev
```

Scripts: `dev`, `build`, `start`. No test/lint/typecheck script. Validate with `npm run build`.

Smoke-test without a model call:

```
curl -X POST localhost:3000/api/analyse -H "Content-Type: application/json" -d "{\"repo\":\"vercel/next.js\",\"dryRun\":true}"
```

## Layout

- `app/` — UI (`/`, `/report`, `/checkout`) + `app/api/analyse`, `app/api/feedback`
- `lib/github.ts` — GitHub REST ingestion (no clone)
- `lib/prompt.ts` — evaluator prompt + schema
- `lib/evaluator.ts` — Claude structured outputs (`claude-opus-5` unless `ANTHROPIC_MODEL` is set)

## Analyse API

`POST /api/analyse`: `{ repo, dryRun? }` ingestion only; `{ repo, githubToken? }` free teaser; `{ repo, full: true, sessionId | accessKey }` paid report. Caller `githubToken` is never stored. CORS: GRFA production + `http://localhost:4321`.

## Constraints

- No clone, no OAuth, no analysis database. GitHub REST only.
- Do not invent scripts in generated AGENTS.md — only commands the target repo has.
- Free responses must not include full findings/fixes. Gate `full` before fetch + model.
- British spelling in UI (`Analysing`). Do not edit `landing/`.
