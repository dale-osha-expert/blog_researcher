# Content Brief Generator

A small Next.js (App Router, TypeScript) web app deployed on Vercel. Type a topic, get back
a structured, human-readable content brief — the web equivalent of the `claude-blog`
project's `/blog brief` skill. See [PROJECT.md](./PROJECT.md) for the full spec.

## Status

Milestone 1 (scaffold + placeholder UI) is complete. Brief generation is currently stubbed
with placeholder content in `src/lib/placeholder.ts` — no Claude API call is wired up yet
(milestone 2).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in values as later milestones require them:

- `ANTHROPIC_API_KEY` — required starting milestone 2
- `SEMRUSH_API_KEY` — optional, v1.1
- `NEURONWRITER_API_KEY` — optional, v1.1

## Deploy on Vercel

```bash
vercel
```

See "What's left" in the project notes for what's still needed before a real deploy is
useful (currently: milestone 2, wiring up the real Claude API call).
