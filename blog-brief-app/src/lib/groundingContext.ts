import type { BriefRequest } from "./types";
import type { SemrushResult } from "./semrush";
import type { NeuronWriterResult } from "./neuronwriter";
import type { FetchedSource } from "./sourceFetch";

export interface GroundingInputs {
  request: BriefRequest;
  semrush: SemrushResult | null;
  neuronWriter: NeuronWriterResult | null;
  sources: FetchedSource[];
}

/**
 * Builds two things from the same gathered data: the text fed to Claude as
 * grounding context (so it prefers real numbers/text over guessing), and the
 * server-owned groundingNotes surfaced verbatim in the response. The model
 * never authors groundingNotes itself — only the orchestrator knows what
 * actually succeeded or failed.
 */
export function buildGrounding(inputs: GroundingInputs): { contextText: string; groundingNotes: string[] } {
  const { request, semrush, neuronWriter, sources } = inputs;
  const parts: string[] = [];
  const notes: string[] = [];

  if (!semrush) {
    parts.push(
      "SEMRUSH: not configured for this request. Do not invent specific search volume, CPC, difficulty, or intent — say they need live verification instead.",
    );
    notes.push("Semrush not configured — keyword volume/CPC/difficulty/intent figures are model estimates; verify with live SERP data.");
  } else if (!semrush.metrics) {
    parts.push(
      `SEMRUSH: lookup failed (${semrush.error}). Do not invent specific search volume, CPC, difficulty, or intent — say they need live verification instead.`,
    );
    notes.push(`Semrush lookup failed: ${semrush.error} — keyword figures are model estimates; verify with live SERP data.`);
  } else {
    const m = semrush.metrics;
    const lines = [
      `SEMRUSH KEYWORD DATA for "${m.keyword}" (${m.country}, real — use these, do not invent your own):`,
      `- Search volume: ${m.searchVolume}`,
      `- CPC: ${m.cpc}`,
      `- Keyword difficulty: ${m.keywordDifficulty ?? "n/a"}`,
      `- Competitive density: ${m.competitiveDensity ?? "n/a"}`,
      `- Search intent(s) per Semrush: ${m.intents.length > 0 ? m.intents.join(", ") : "n/a"}`,
      "Note: Semrush v4 only covers the primary keyword here — secondary/LSI keyword volumes are NOT grounded, estimate those yourself and say so.",
    ];
    parts.push(lines.join("\n"));
    notes.push(
      `Primary keyword volume/CPC/difficulty/intent grounded via Semrush. Secondary/LSI keyword volumes are model estimates — verify with live SERP data.`,
    );
  }

  if (!neuronWriter) {
    parts.push(
      "NEURONWRITER: not configured for this request. Estimate word count and template yourself, and note it needs live verification.",
    );
    notes.push("NeuronWriter not configured — word-count/term targets are model estimates; verify with live SERP data.");
  } else if (neuronWriter.status === "ready") {
    const lines = ["NEURONWRITER TERM COVERAGE (real — prefer these over your own estimate):"];
    if (neuronWriter.targetWordCount) lines.push(`- Target word count from live SERP analysis: ~${neuronWriter.targetWordCount}`);
    if (neuronWriter.recommendedTerms.length) lines.push(`- Recommended terms to cover: ${neuronWriter.recommendedTerms.join(", ")}`);
    parts.push(lines.join("\n"));
    notes.push(
      "Term-coverage/word-count targets grounded via NeuronWriter." + (neuronWriter.error ? ` Note: ${neuronWriter.error}` : ""),
    );
  } else {
    parts.push(
      `NEURONWRITER: ${neuronWriter.error ?? "unavailable"}. Estimate word count and template yourself, and note it needs live verification.`,
    );
    notes.push(
      neuronWriter.status === "processing"
        ? (neuronWriter.error ?? "NeuronWriter analysis still processing — regenerate in about a minute.")
        : `NeuronWriter lookup failed: ${neuronWriter.error ?? "unknown error"} — word-count/term targets are model estimates.`,
    );
  }

  if (request.sourceUrls && request.sourceUrls.length > 0) {
    if (sources.length === 0) {
      parts.push("SOURCE MATERIAL: none could be fetched.");
    } else {
      const lines = ["SOURCE MATERIAL SUPPLIED BY THE USER (use as cited grounding facts where relevant):"];
      for (const s of sources) {
        if (s.text) {
          lines.push(`--- ${s.url}${s.title ? ` ("${s.title}")` : ""} ---\n${s.text}`);
        } else {
          lines.push(`--- ${s.url} — NOT usable: ${s.error} ---`);
        }
      }
      parts.push(lines.join("\n\n"));

      const failed = sources.filter((s) => s.error);
      const succeeded = sources.filter((s) => s.text);
      for (const s of failed) {
        notes.push(`Source fetch failed for ${s.url}: ${s.error}`);
      }
      if (succeeded.length > 0) {
        notes.push(`Grounded using extracted content from: ${succeeded.map((s) => s.url).join(", ")}`);
      }
    }
  } else {
    parts.push("SOURCE MATERIAL: none supplied by the user.");
  }

  return { contextText: parts.join("\n\n"), groundingNotes: notes };
}
