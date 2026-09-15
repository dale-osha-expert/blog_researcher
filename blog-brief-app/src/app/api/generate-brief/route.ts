import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { BRIEF_TOOL, SYSTEM_PROMPT, buildUserPrompt, type ModelBriefOutput } from "@/lib/briefTool";
import { buildGrounding } from "@/lib/groundingContext";
import { fetchNeuronWriterTermCoverage, type NeuronWriterResult } from "@/lib/neuronwriter";
import { fetchSemrushData, type SemrushResult } from "@/lib/semrush";
import { fetchAllSources } from "@/lib/sourceFetch";
import type { BriefRequest, ContentBrief } from "@/lib/types";
import { withTimeout } from "@/lib/withTimeout";

export const runtime = "nodejs";
export const maxDuration = 60;

const SEMRUSH_BUDGET_MS = 10000;
const NEURONWRITER_BUDGET_MS = 25000;
const MODEL = "claude-sonnet-5";

function parseRequestBody(body: unknown): BriefRequest | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const topic = typeof record.topic === "string" ? record.topic.trim() : "";
  if (!topic) return null;

  const toStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const strings = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim());
    return strings.length > 0 ? strings : undefined;
  };

  return {
    topic,
    audience: typeof record.audience === "string" && record.audience.trim() ? record.audience.trim() : undefined,
    domain: typeof record.domain === "string" && record.domain.trim() ? record.domain.trim() : undefined,
    competitorUrls: toStringArray(record.competitorUrls),
    sourceUrls: toStringArray(record.sourceUrls),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const briefRequest = parseRequestBody(body);
  if (!briefRequest) {
    return NextResponse.json({ error: "A non-empty 'topic' is required." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 500 });
  }

  const semrushKey = process.env.SEMRUSH_API_KEY;
  const neuronWriterKey = process.env.NEURONWRITER_API_KEY;

  const semrushPromise: Promise<SemrushResult | null> = semrushKey
    ? withTimeout(fetchSemrushData(briefRequest.topic, semrushKey), SEMRUSH_BUDGET_MS, () => ({
        metrics: null,
        error: "Semrush call exceeded this request's timeout budget",
      }))
    : Promise.resolve(null);

  const neuronWriterPromise: Promise<NeuronWriterResult | null> = neuronWriterKey
    ? withTimeout(fetchNeuronWriterTermCoverage(briefRequest.topic, neuronWriterKey), NEURONWRITER_BUDGET_MS, () => ({
        status: "processing" as const,
        targetWordCount: null,
        recommendedTerms: [],
        error: "NeuronWriter call exceeded this request's timeout budget — regenerate shortly to pick up results",
      }))
    : Promise.resolve(null);

  const sourcesPromise = briefRequest.sourceUrls && briefRequest.sourceUrls.length > 0 ? fetchAllSources(briefRequest.sourceUrls) : Promise.resolve([]);

  const [semrush, neuronWriter, sources] = await Promise.all([semrushPromise, neuronWriterPromise, sourcesPromise]);

  const { contextText, groundingNotes } = buildGrounding({ request: briefRequest, semrush, neuronWriter, sources });

  const anthropic = new Anthropic({ apiKey });
  const userPrompt = buildUserPrompt({
    topic: briefRequest.topic,
    audience: briefRequest.audience,
    domain: briefRequest.domain,
    competitorUrls: briefRequest.competitorUrls,
    groundingContext: contextText,
  });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [BRIEF_TOOL],
      tool_choice: { type: "tool", name: "emit_content_brief" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error calling Claude API";
    return NextResponse.json({ error: `Claude API call failed: ${message}` }, { status: 502 });
  }

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) {
    return NextResponse.json({ error: "Claude did not return a structured brief." }, { status: 502 });
  }

  const modelBrief = toolUse.input as ModelBriefOutput;

  const brief: ContentBrief = {
    topic: briefRequest.topic,
    groundingNotes,
    summary: modelBrief.summary,
    keywords: modelBrief.keywords,
    searchIntent: modelBrief.searchIntent,
    titleOptions: modelBrief.titleOptions,
    outline: modelBrief.outline,
    wordCount: modelBrief.wordCount,
    template: modelBrief.template,
    competitiveGaps: modelBrief.competitiveGaps,
    statsChecklist: modelBrief.statsChecklist,
    visualSuggestions: modelBrief.visualSuggestions,
    internalLinks: {
      hasDomain: Boolean(briefRequest.domain),
      suggestions: modelBrief.internalLinks.suggestions,
      note: modelBrief.internalLinks.note,
    },
    faqs: modelBrief.faqs,
    distributionNotes: modelBrief.distributionNotes,
    notebookLmResearchKit: modelBrief.notebookLmResearchKit,
  };

  return NextResponse.json(brief);
}
