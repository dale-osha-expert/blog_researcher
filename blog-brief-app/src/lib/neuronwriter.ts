const API_BASE = "https://app.neuronwriter.com/neuron-api/0.5/writer";
const REQUEST_TIMEOUT_MS = 8000;
const POLL_ATTEMPTS = 1;
const POLL_INTERVAL_MS = 3000;

export interface NeuronWriterResult {
  status: "ready" | "processing" | "unavailable";
  targetWordCount: number | null;
  recommendedTerms: string[];
  error: string | null;
}

class NeuronWriterError extends Error {}

async function callNeuronWriter(endpoint: string, apiKey: string, payload: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new NeuronWriterError(`HTTP ${response.status} from NeuronWriter: ${raw.slice(0, 300)}`);
    }
    try {
      return JSON.parse(raw);
    } catch {
      throw new NeuronWriterError(`non-JSON response from NeuronWriter: ${raw.slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * NeuronWriter's analysis takes ~2 minutes, so waiting on a freshly started
 * one would only burn the request's time budget without ever succeeding.
 * Instead this checks once: a previously started analysis for the keyword is
 * picked up if it's ready, otherwise we kick one off and report "processing"
 * so the next generate collects it. Field names (status,
 * metrics.word_count.target, terms.content_basic[].t) are verified against a
 * live account's get-query response.
 */
export async function fetchNeuronWriterTermCoverage(keyword: string, apiKey: string): Promise<NeuronWriterResult> {
  try {
    const projects = await callNeuronWriter("list-projects", apiKey, {});
    const projectList = Array.isArray(projects) ? projects : [];
    const project = projectList
      .map(asRecord)
      .find((p): p is Record<string, unknown> => p !== null && typeof p.id === "string");

    if (!project) {
      return {
        status: "unavailable",
        targetWordCount: null,
        recommendedTerms: [],
        error: "no NeuronWriter project found in this account",
      };
    }
    const projectId = project.id as string;

    const existing = await callNeuronWriter("list-queries", apiKey, { project: projectId, keyword }).catch(() => []);
    const existingList = Array.isArray(existing) ? existing.map(asRecord) : [];
    // Reuse any existing query for this exact keyword — ready or still processing —
    // so a retry/regenerate never fires a second paid analysis for the same keyword.
    const existingForKeyword = existingList.find(
      (q) => q !== null && typeof q.keyword === "string" && q.keyword.toLowerCase() === keyword.toLowerCase(),
    );

    let queryId: string | null = null;
    if (existingForKeyword && typeof existingForKeyword.query === "string") {
      queryId = existingForKeyword.query;
      if (isReadyStatus(existingForKeyword.status)) {
        const result = asRecord(await callNeuronWriter("get-query", apiKey, { query: queryId }));
        if (result) return extractTermCoverage(result);
      }
    } else {
      const created = asRecord(
        await callNeuronWriter("new-query", apiKey, {
          project: projectId,
          keyword,
          engine: "google.com",
          language: "English",
        }),
      );
      queryId = (created?.query as string) ?? (created?.id as string) ?? null;
      if (!queryId) {
        return {
          status: "unavailable",
          targetWordCount: null,
          recommendedTerms: [],
          error: "NeuronWriter did not return a query id for the new analysis",
        };
      }
    }

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      const result = asRecord(await callNeuronWriter("get-query", apiKey, { query: queryId }));
      if (result && isReadyStatus(result.status)) {
        return extractTermCoverage(result);
      }
      if (attempt < POLL_ATTEMPTS - 1) {
        await sleep(POLL_INTERVAL_MS);
      }
    }

    return {
      status: "processing",
      targetWordCount: null,
      recommendedTerms: [],
      error:
        "NeuronWriter analysis was started but is not ready yet (its own analysis run typically takes ~60s) — regenerate the brief in about a minute to pick up results",
    };
  } catch (err) {
    return {
      status: "unavailable",
      targetWordCount: null,
      recommendedTerms: [],
      error: err instanceof Error ? err.message : "unknown NeuronWriter error",
    };
  }
}

function isReadyStatus(status: unknown): boolean {
  return typeof status === "string" && ["ready", "done", "finished", "complete", "completed"].includes(status.toLowerCase());
}

function extractTermCoverage(result: Record<string, unknown>): NeuronWriterResult {
  const metrics = asRecord(result.metrics);
  const wordCount = asRecord(metrics?.word_count);
  const targetWordCount = typeof wordCount?.target === "number" ? wordCount.target : null;

  const terms = asRecord(result.terms);
  const contentBasic = terms?.content_basic;
  const recommendedTerms = Array.isArray(contentBasic)
    ? contentBasic
        .map((entry) => asRecord(entry)?.t)
        .filter((t): t is string => typeof t === "string")
        .slice(0, 20)
    : [];

  return {
    status: "ready",
    targetWordCount,
    recommendedTerms,
    error:
      recommendedTerms.length === 0 && targetWordCount === null
        ? "NeuronWriter analysis is ready but this integration could not parse specific terms/word-count fields from the response — verify the response shape against your account"
        : null,
  };
}
