# Agent Ready

Next.js app that scores a GitHub repository for coding-agent readiness (setup, testing, architecture, instructions, tooling). Marketing lives on Get Ready For Agents at https://www.getreadyforagents.com/agent-ready/ — do not rebuild a landing page here. `landing/` is an abandoned Astro copy; leave it alone.

Live app: https://agentready.onrender.com

No accounts, no database of analyses, no OAuth, no clone. Ingestion is GitHub REST only.

## Setup

```
npm install
cp .env.example .env.local
npm run dev
```

Required for a real evaluation: `ANTHROPIC_API_KEY`. Optional but recommended: `GITHUB_TOKEN` (raises GitHub rate limit from 60/hr to 5000/hr). See `.env.example` for Stripe, Slack, Supabase, and owner-bypass keys.

Default model is `claude-opus-5` (`ANTHROPIC_MODEL` overrides).

## Commands that exist

`package.json` scripts: `dev`, `build`, `start`. There is no test, lint, or typecheck script — do not invent one.

Before finishing a change, run `npm run build`. That is the compile check this repo actually has.

Smoke-test ingestion without an Anthropic key (no model call):

```
curl -X POST localhost:3000/api/analyse -H "Content-Type: application/json" -d "{\"repo\":\"vercel/next.js\",\"dryRun\":true}"
```

A real evaluation takes 1–3 minutes and burns model tokens.

## Architecture

- `app/` — App Router UI and routes: `/` (checker), `/report` (paid full report), `/checkout` (sessionStorage bridge onto the Stripe Payment Link), `app/api/analyse/route.ts`, `app/api/feedback/route.ts`. Shared chrome: `app/components/` (GRFA nav/footer, feedback widget).
- `lib/github.ts` — parse `owner/repo` or a GitHub URL; fetch tree + key files via REST. Never clones.
- `lib/prompt.ts` — evaluator system prompt, evidence rules, structured-output schema.
- `lib/evaluator.ts` — Claude structured-output call; clamps dimension scores 0–20 and derives the 0–100 total.

Do not add a second scoring path. Findings must cite files, scripts, and commands from the supplied repo (see `lib/prompt.ts`).

## API

`POST /api/analyse` JSON body:

| Mode | Body | Result |
| --- | --- | --- |
| Dry run | `{ "repo": "owner/repo", "dryRun": true }` | `found` / `missing` key files and the two-level tree. No model call. |
| Free teaser | `{ "repo": "owner/repo", "githubToken"? }` | Score, verdict, summary, biggest problem (no fix), locked titles, one strength. |
| Full report | `{ "repo", "full": true }` plus `sessionId` or `accessKey` | Complete evaluation. Gated: paid Stripe Checkout Session or `REPORT_ACCESS_KEY`. |

Optional `githubToken` is used for that one GitHub fetch only — never stored, never logged. Caller token wins over server `GITHUB_TOKEN`.

CORS allowlist for the GRFA landing: `https://www.getreadyforagents.com`, `https://getreadyforagents.com`, `http://localhost:4321`. Same-origin UI on this app does not need CORS.

`POST /api/feedback` — `{ message, email?, page?, repo? }`. Delivered to Slack and/or Supabase (`agentready_feedback`); either destination is enough.

## Constraints

- Do not clone repositories. Do not persist analysed repo contents or caller GitHub tokens.
- Do not invent npm scripts, test commands, or lint targets in generated `AGENTS.md` / report copy. Use only what the target repo actually contains.
- Full reports must not leak on a free call (`full` is gated before fetch + model).
- Product copy uses British spelling where the UI already does (`Analysing`).
- Marketing page edits belong in the Get Ready For Agents Astro repo (`src/pages/agent-ready/index.astro`), not `landing/`.
- Hosted on Render: build `npm install && npm run build`, start `npm start`.
