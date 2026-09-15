import type Anthropic from "@anthropic-ai/sdk";
import type { InternalLinkSuggestion, NotebookLmResearchKit, OutlineSection, StatChecklistItem, VisualSuggestion, WordCountSection } from "./types";

export type ModelBriefOutput = {
  summary: string;
  keywords: { primary: string; secondary: string[] };
  searchIntent: { type: string; job: string };
  titleOptions: string[];
  outline: OutlineSection[];
  wordCount: { total: number; sections: WordCountSection[] };
  template: { recommendation: string; reason: string };
  competitiveGaps: string[];
  statsChecklist: StatChecklistItem[];
  visualSuggestions: VisualSuggestion[];
  internalLinks: { suggestions: InternalLinkSuggestion[]; note: string };
  faqs: string[];
  distributionNotes: string[];
  notebookLmResearchKit: NotebookLmResearchKit;
};

const REQUIRED_ARRAY_FIELDS = [
  "titleOptions",
  "outline",
  "competitiveGaps",
  "statsChecklist",
  "visualSuggestions",
  "faqs",
  "distributionNotes",
] as const;

const REQUIRED_OBJECT_FIELDS = [
  "keywords",
  "searchIntent",
  "wordCount",
  "template",
  "internalLinks",
  "notebookLmResearchKit",
] as const;

/**
 * The model's tool input is external data, not a guarantee — a truncated or
 * malformed response must surface as a clear error rather than a TypeError
 * deep in the response builder (which Next turns into an empty-body 500).
 */
export function validateModelBrief(input: unknown): { ok: true; value: ModelBriefOutput } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : null;
  if (!record) {
    return { ok: false, missing: ["entire brief object"] };
  }

  if (typeof record.summary !== "string" || !record.summary.trim()) missing.push("summary");
  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(record[field])) missing.push(field);
  }
  for (const field of REQUIRED_OBJECT_FIELDS) {
    if (!record[field] || typeof record[field] !== "object") missing.push(field);
  }

  if (missing.length === 0) {
    const internalLinks = record.internalLinks as Record<string, unknown>;
    if (!Array.isArray(internalLinks.suggestions)) missing.push("internalLinks.suggestions");
    const kit = record.notebookLmResearchKit as Record<string, unknown>;
    if (!Array.isArray(kit.suggestedSources)) missing.push("notebookLmResearchKit.suggestedSources");
    if (!Array.isArray(kit.suggestedQuestions)) missing.push("notebookLmResearchKit.suggestedQuestions");
    const wordCount = record.wordCount as Record<string, unknown>;
    if (!Array.isArray(wordCount.sections)) missing.push("wordCount.sections");
  }

  return missing.length === 0 ? { ok: true, value: record as unknown as ModelBriefOutput } : { ok: false, missing };
}

export const BRIEF_TOOL: Anthropic.Tool = {
  name: "emit_content_brief",
  description: "Emit the complete structured content brief for the requested topic.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One paragraph: what this article should accomplish and for whom." },
      keywords: {
        type: "object",
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 10 },
        },
        required: ["primary", "secondary"],
      },
      searchIntent: {
        type: "object",
        properties: {
          type: { type: "string", description: "e.g. informational / commercial / transactional" },
          job: { type: "string", description: "The job the reader hires this article to do." },
        },
        required: ["type", "job"],
      },
      titleOptions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      outline: {
        type: "array",
        items: {
          type: "object",
          properties: {
            level: { type: "string", enum: ["H2", "H3"] },
            heading: { type: "string" },
            note: { type: "string", description: "One-line note on what this section must cover." },
          },
          required: ["level", "heading", "note"],
        },
      },
      wordCount: {
        type: "object",
        properties: {
          total: { type: "number" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: { section: { type: "string" }, words: { type: "number" } },
              required: ["section", "words"],
            },
          },
        },
        required: ["total", "sections"],
      },
      template: {
        type: "object",
        properties: {
          recommendation: { type: "string", description: "e.g. how-to, listicle, comparison, ultimate guide" },
          reason: { type: "string" },
        },
        required: ["recommendation", "reason"],
      },
      competitiveGaps: {
        type: "array",
        items: { type: "string" },
        description: "What similar top-ranking pages likely miss; general differentiation angles if no competitor URLs were supplied.",
      },
      statsChecklist: {
        type: "array",
        description: "Claims that need a primary source. Never invent a number — every entry is a checklist item, not a prescribed statistic.",
        items: {
          type: "object",
          properties: {
            claim: { type: "string" },
            status: { type: "string", enum: ["needs-cited-source"] },
          },
          required: ["claim", "status"],
        },
      },
      visualSuggestions: {
        type: "array",
        items: {
          type: "object",
          properties: { placement: { type: "string" }, description: { type: "string" } },
          required: ["placement", "description"],
        },
      },
      internalLinks: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: { anchorText: { type: "string" }, note: { type: "string" } },
              required: ["anchorText", "note"],
            },
          },
          note: {
            type: "string",
            description: "Note that this is directional, not a live crawl, and say if no domain was supplied.",
          },
        },
        required: ["suggestions", "note"],
      },
      faqs: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
      distributionNotes: { type: "array", items: { type: "string" } },
      notebookLmResearchKit: {
        type: "object",
        description:
          "A NotebookLM follow-up research kit: sources worth adding to a notebook and questions worth asking it for deeper, cited verification before drafting. Present even when source URLs were already supplied — this is about further research, not a duplicate of what was already fetched.",
        properties: {
          suggestedSources: { type: "array", items: { type: "string" } },
          suggestedQuestions: { type: "array", items: { type: "string" } },
        },
        required: ["suggestedSources", "suggestedQuestions"],
      },
    },
    required: [
      "summary",
      "keywords",
      "searchIntent",
      "titleOptions",
      "outline",
      "wordCount",
      "template",
      "competitiveGaps",
      "statsChecklist",
      "visualSuggestions",
      "internalLinks",
      "faqs",
      "distributionNotes",
      "notebookLmResearchKit",
    ],
  },
};

export const SYSTEM_PROMPT = `You are a senior SEO content strategist producing a structured content brief for a writer who has not researched this topic yet.

Rules:
- Call the emit_content_brief tool exactly once with the complete brief. Do not respond in plain text.
- Never fabricate a statistic, SERP position, search volume, or source quote. When grounding context below gives you real data, use it. When a data source says it is unavailable, unconfigured, or failed, explicitly say the relevant field needs live verification instead of inventing a plausible-sounding number.
- When source material is supplied, ground claims in it and prefer it over generic knowledge.
- Keep every field concise and actionable — a writer should be able to work from this brief without re-deriving your reasoning.`;

export function buildUserPrompt(args: {
  topic: string;
  audience?: string;
  domain?: string;
  competitorUrls?: string[];
  groundingContext: string;
}): string {
  const { topic, audience, domain, competitorUrls, groundingContext } = args;
  const lines = [
    `Topic: ${topic}`,
    audience ? `Target audience: ${audience}` : "Target audience: not specified — assume a general reader searching this topic.",
    domain ? `Primary domain: ${domain}` : "Primary domain: not specified.",
    competitorUrls && competitorUrls.length > 0 ? `Competitor URLs: ${competitorUrls.join(", ")}` : "Competitor URLs: none supplied.",
    "",
    "--- GROUNDING CONTEXT ---",
    groundingContext,
  ];
  return lines.join("\n");
}
