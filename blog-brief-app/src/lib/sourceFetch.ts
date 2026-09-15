import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 8000;
const MAX_EXTRACTED_CHARS = 6000;

export interface FetchedSource {
  url: string;
  title: string | null;
  text: string | null;
  error: string | null;
}

export async function fetchSourceText(url: string): Promise<FetchedSource> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { url, title: null, text: null, error: "not a valid URL, skipped" };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { url, title: null, text: null, error: "unsupported URL scheme, skipped" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "content-brief-generator/1.0 (+source grounding fetch)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { url, title: null, text: null, error: `fetch failed with HTTP ${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return {
        url,
        title: null,
        text: null,
        error: `skipped — non-HTML content (${contentType.split(";")[0] || "unknown type"}); PDF/other extraction is a later milestone`,
      };
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url: parsedUrl.toString() });
    const article = new Readability(dom.window.document).parse();

    if (!article || !article.textContent || !article.textContent.trim()) {
      return { url, title: null, text: null, error: "could not extract readable article content" };
    }

    const text = article.textContent.trim().slice(0, MAX_EXTRACTED_CHARS);
    return { url, title: article.title || null, text, error: null };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s`
        : err instanceof Error
          ? err.message
          : "unknown fetch error";
    return { url, title: null, text: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAllSources(urls: string[]): Promise<FetchedSource[]> {
  const unique = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
  return Promise.all(unique.map(fetchSourceText));
}
