const METRICS_ENDPOINT = "https://api.semrush.com/apis/v4/keywords/v1/metrics";
const TIMEOUT_MS = 8000;
const DEFAULT_COUNTRY = "US";

export interface SemrushKeywordMetrics {
  keyword: string;
  country: string;
  searchVolume: string;
  cpc: string;
  keywordDifficulty: number | null;
  competitiveDensity: number | null;
  intents: string[];
}

export interface SemrushResult {
  metrics: SemrushKeywordMetrics | null;
  error: string | null;
}

interface SemrushMetricsResponse {
  meta?: { success?: boolean; status_code?: number };
  data?: {
    search_volume?: string;
    cpc?: string;
    keyword_difficulty?: number;
    competitive_density?: number;
    intents?: string[];
  };
}

/**
 * Semrush API v4 (Early Access, as of this writing) only exposes a single
 * keyword-metrics endpoint — no related-keywords/SERP endpoint yet. So this
 * grounds the primary keyword only; secondary/LSI terms stay model-estimated
 * (the caller must say so). Country defaults to US since there's no country
 * field in the UI yet.
 */
export async function fetchSemrushData(keyword: string, apiKey: string): Promise<SemrushResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const params = new URLSearchParams({ keyword, country: DEFAULT_COUNTRY });
    const response = await fetch(`${METRICS_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Authorization: apiKey.trim().toLowerCase().startsWith("apikey ") ? apiKey.trim() : `Apikey ${apiKey.trim()}`,
        Accept: "application/json",
      },
    });
    const raw = await response.text();
    if (!response.ok) {
      return { metrics: null, error: describeHttpError(response.status, raw) };
    }

    let parsed: SemrushMetricsResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { metrics: null, error: `non-JSON response from Semrush: ${raw.slice(0, 300)}` };
    }

    if (parsed.meta?.success === false || !parsed.data) {
      return { metrics: null, error: `Semrush returned no data for this keyword (meta: ${JSON.stringify(parsed.meta)})` };
    }

    const data = parsed.data;
    return {
      metrics: {
        keyword,
        country: DEFAULT_COUNTRY,
        searchVolume: data.search_volume ?? "n/a",
        cpc: data.cpc ?? "n/a",
        keywordDifficulty: typeof data.keyword_difficulty === "number" ? data.keyword_difficulty : null,
        competitiveDensity: typeof data.competitive_density === "number" ? data.competitive_density : null,
        intents: Array.isArray(data.intents) ? data.intents : [],
      },
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `Semrush call timed out after ${TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : "unknown Semrush error";
    return { metrics: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Semrush distinguishes an unrecognized credential (401) from a recognized one
 * whose account lacks entitlement (403), so the message should point at the
 * right fix rather than dumping the raw gateway JSON into the brief.
 */
function describeHttpError(status: number, raw: string): string {
  switch (status) {
    case 401:
      return "Semrush did not recognize the API key (401) — check that SEMRUSH_API_KEY is set correctly.";
    case 403:
      return "Semrush accepted the key but denied access (403) — the account behind it does not have API access enabled for this endpoint. Semrush's REST API generally requires an API subscription on top of the plan.";
    case 429:
      return "Semrush rate-limited this request (429) — try again shortly.";
    default:
      return `HTTP ${status} from Semrush: ${raw.slice(0, 200)}`;
  }
}
