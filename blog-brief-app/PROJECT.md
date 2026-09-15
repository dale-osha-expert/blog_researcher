# Content Brief Generator (Vercel Web App)

## What this is

A small, standalone Next.js web app deployed on Vercel. A user types in a topic or target
keyword, clicks "Generate," and gets back a structured, human-readable content brief — the
same kind of brief that the `claude-blog` project's `/blog brief` skill produces inside
Claude Code, but as a shareable web page instead of a markdown file in a repo.

This is a **separate project/repo from `claude-blog`**. It does not import from or depend on
that codebase. Its output should just feel familiar to anyone who has used `/blog brief`
there — same sections, same intent, no code sharing required.

## Why

`/blog brief` only runs inside a Claude Code session. Teammates who aren't running Claude
Code (or who just want to fire off a quick brief from a phone) can't use it. A tiny hosted
app removes that friction: type a topic, get a brief, share the link.

## Core user flow (v1)

1. User lands on a single page with a text input: "What topic do you want a brief for?"
   Optional fields: target audience, primary domain, competitor URLs (comma-separated),
   source URLs to ground the brief in (comma/newline-separated).
2. User clicks "Generate Brief."
3. Server orchestrates: Semrush (if configured) for real keyword/SERP data, NeuronWriter
   (if configured) for term-coverage targets, and a server-side fetch + text extraction of
   any source URLs supplied — then feeds all of it into a single Claude API call that
   produces the brief (see "Generation approach").
4. Result renders as a readable, sectioned page — not a raw markdown/JSON dump. See "Brief
   output format."
5. User can copy individual sections, download the whole brief as Markdown, or (later) get a
   shareable URL to the generated brief.

## Brief output format

Sections to include, mirroring `/blog brief` in claude-blog:

- **Summary / TL;DR** — one paragraph on what this article should accomplish and for whom
- **Target keyword + related terms** — primary keyword, 5-10 secondary/LSI terms
- **Search intent** — informational / commercial / transactional, and the "job" the reader
  hires this article to do
- **Recommended title options** — 3-5 candidates
- **Content outline** — H2/H3 hierarchy with a one-line note per section on what it must
  cover
- **Word count target** — overall target + a rough per-section split
- **Template recommendation** — which content shape fits best (how-to, listicle,
  comparison, ultimate guide, etc.) and why
- **Competitive gap notes** — what similar top-ranking pages are likely missing that this
  brief should fill (general differentiation angles if no competitor URLs were supplied)
- **Statistics/evidence checklist** — a checklist of claims that need a primary source, not
  prescribed numbers. **Never fabricate a statistic** — flag "needs a cited source" instead
  of inventing one.
- **Image/chart suggestions** — where visuals would help and what they should show
- **Internal linking suggestions** — if a primary domain was provided, suggest link
  opportunities by topic; note this is directional, not a live crawl, in v1
- **FAQ candidates** — 4-6 questions worth answering, phrased the way people actually search
- **Distribution notes** — one or two channels this topic is well-suited for (e.g. "this is
  also a good LinkedIn post")
- **NotebookLM Research Kit** — see "NotebookLM integration" below. A curated list of
  source links worth adding to a notebook, plus a curated list of specific questions worth
  asking it, for deeper verification before drafting. Present even when source URLs were
  supplied and used for grounding — this section is about *further* research, not a
  duplicate of what was already fetched.

## Generation approach

Real, grounded generation from day one — this is the actual point of the app, not a v1.1
add-on:

- **Keyword/SERP grounding**: if `SEMRUSH_API_KEY` is set, call Semrush directly (same
  pattern as `claude-blog`'s `mcp__semrush` usage — HTTP API, `Authorization: Apikey`
  header) for a real keyword cluster + SERP snapshot, and feed it into the prompt instead of
  asking the model to guess intent/volume.
- **Term-coverage grounding**: if `NEURONWRITER_API_KEY` is set, call NeuronWriter directly
  (same pattern as `claude-blog/scripts/neuronwriter_mcp_server.py`) for content-score
  term-coverage and word-count/readability targets against the live SERP.
- **Source grounding (replaces live NotebookLM automation — see below)**: if the user
  supplies source URLs, fetch each server-side and extract the main article text (e.g.
  `@mozilla/readability` + `jsdom` for HTML; a PDF text extractor for `.pdf` URLs). Pass the
  extracted text into the Claude call as cited grounding context, the same way the
  claude-blog pipeline uses NotebookLM answers as grounded facts — just sourced directly
  instead of through a NotebookLM query round-trip.
- Every field must degrade gracefully when its data source isn't configured or a fetch
  fails: say "verify with live SERP data" / "source fetch failed, verify manually" rather
  than silently guessing and presenting it as fact. **Never fabricate a statistic, SERP
  position, or source quote.**

## NotebookLM integration

NotebookLM has no public API, and `claude-blog`'s existing integration (see
`skills/blog-notebooklm/scripts/`) works by driving a real browser against an authenticated
Google session — that approach doesn't fit a stateless, publicly-deployed Vercel function
(cold starts, cookie/session persistence, Google anti-bot challenges). This app does **not**
attempt live NotebookLM automation. Instead:

1. **Source URL fetching** (above) gets the same practical outcome — grounded facts from
   real sources — without touching NotebookLM at all, fully automated and reliable.
2. Every brief also includes a **NotebookLM Research Kit** section (see "Brief output
   format") so a human can still take the brief into an actual NotebookLM notebook for
   deeper, cited research before writing — mirroring how NotebookLM is actually used in the
   claude-blog pipeline today (paste sources in, ask questions, ground facts), just as a
   manual next step this app hands off cleanly instead of automating end-to-end.

## Tech stack

- **Framework**: Next.js (App Router), TypeScript
- **Hosting**: Vercel
- **AI**: `@anthropic-ai/sdk`, called from a Vercel serverless/edge function — no separate
  backend needed
- **Styling**: Tailwind CSS
- **Storage (v1)**: none required — render the brief in-session; "Download as Markdown"
  covers persistence. If shareable links are wanted later, add Vercel Postgres or Vercel KV
  to store generated briefs by ID.
- **Auth**: none for v1 (assume trusted/internal use). Add a simple password gate via
  middleware later if this needs to be semi-public.

## Environment variables

- `ANTHROPIC_API_KEY` (required)
- `SEMRUSH_API_KEY` (optional — graceful degradation if unset, same principle as the
  `claude-blog` MCP servers: missing key means skip that data source and say so, never crash)
- `NEURONWRITER_API_KEY` (optional, same graceful-degradation principle)

## Explicit non-goals

- No full `/blog write` pipeline (research -> write -> deliver -> publish) — brief
  generation only
- No WordPress publishing integration
- No multi-language support
- No user accounts/auth
- No editing/collaboration on a saved brief (read-only output + markdown export is enough)
- No live NotebookLM automation (see "NotebookLM integration" above for why, and what this
  app does instead)
- No file/PDF upload in this pass — source grounding is URL-only for now; uploads are a
  later milestone if URL-only grounding proves too limiting

## Suggested milestones

1. ~~Scaffold Next.js + Tailwind + Vercel deploy: single input -> loading state ->
   placeholder output in the target layout.~~ **Done.**
2. Git init/commit the milestone-1 work, push to a new GitHub repo, and import that repo
   into Vercel via its dashboard ("Add New Project" -> Import Git Repository) so every
   future push auto-deploys. Add `ANTHROPIC_API_KEY` (required) and
   `SEMRUSH_API_KEY`/`NEURONWRITER_API_KEY` (optional) in the Vercel project's env vars.
3. Build `/api/generate-brief`: wire up `@anthropic-ai/sdk`, replace
   `generatePlaceholderBrief` with the real grounded pipeline — Semrush + NeuronWriter calls
   (when keys present) + source-URL fetch/extraction (when URLs supplied) + the Claude call
   that produces the full `ContentBrief`, including the NotebookLM Research Kit section.
4. Add "Download as Markdown" and "Copy section" actions.
5. (Later) Shareable brief URLs via Vercel KV/Postgres; file/PDF upload for source grounding.
