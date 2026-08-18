# AgentReady

Paste a public GitHub repo → get an agent readiness score out of 100, the biggest problems with evidence from the actual repo, and (for $10) a full remediation report with a generated AGENTS.md.

No accounts, no database, no OAuth, no cloning, no history.

## Stack

- Next.js (one app: UI + `/api/analyse`)
- GitHub REST API for repo structure + key files
- Claude API (structured outputs, `claude-opus-5`) for the evaluation
- Stripe Payment Link for the $10 report
- Hosted on Render

## Run locally

```
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY (and optionally GITHUB_TOKEN)
npm run dev
```

## Deploy (Render)

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Env vars: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `STRIPE_PAYMENT_URL`

## Smoke test without an API key

```
curl -X POST localhost:3000/api/analyse -H "Content-Type: application/json" -d '{"repo":"vercel/next.js","dryRun":true}'
```

Returns which key files were found/missing and the two-level tree, without calling the model.
