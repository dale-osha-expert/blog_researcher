import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 8000;
const PDF_FETCH_TIMEOUT_MS = 15000;
const MAX_EXTRACTED_CHARS = 6000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;

export interface FetchedSource {
  url: string;
  title: string | null;
  text: string | null;
  kind: "html" | "pdf" | null;
  error: string | null;
}

function failure(url: string, error: string): FetchedSource {
  return { url, title: null, text: null, kind: null, error };
}

export async function fetchSourceText(url: string): Promise<FetchedSource> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return failure(url, "not a valid URL, skipped");
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return failure(url, "unsupported URL scheme, skipped");
  }

  const looksLikePdf = parsedUrl.pathname.toLowerCase().endsWith(".pdf");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), looksLikePdf ? PDF_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Many public sites (osha.gov among them) reject unrecognized agents
        // with a 403, which would silently strip grounding from every brief.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return failure(url, `fetch failed with HTTP ${response.status}`);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const isPdf = contentType.includes("application/pdf") || (looksLikePdf && !contentType.includes("text/html"));

    if (isPdf) {
      return await extractPdf(url, response);
    }

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return failure(url, `skipped — unsupported content type (${contentType.split(";")[0] || "unknown"})`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document).parse();

    if (!article?.textContent?.trim()) {
      return failure(url, "could not extract readable article content");
    }

    return {
      url,
      title: article.title || null,
      text: article.textContent.trim().slice(0, MAX_EXTRACTED_CHARS),
      kind: "html",
      error: null,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `fetch timed out after ${(looksLikePdf ? PDF_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS) / 1000}s`
        : err instanceof Error
          ? err.message
          : "unknown fetch error";
    return failure(url, message);
  } finally {
    clearTimeout(timeout);
  }
}

async function extractPdf(url: string, response: Response): Promise<FetchedSource> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_PDF_BYTES) {
    return failure(url, `skipped — PDF is ${(declaredLength / 1024 / 1024).toFixed(1)}MB, larger than the ${MAX_PDF_BYTES / 1024 / 1024}MB limit`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return failure(url, `skipped — PDF is larger than the ${MAX_PDF_BYTES / 1024 / 1024}MB limit`);
  }

  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });

  const cleaned = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) {
    return failure(url, "PDF contained no extractable text (it may be a scanned image — OCR is not supported)");
  }

  const metadata = await pdf.getMetadata().catch(() => null);
  const info = metadata?.info as { Title?: string } | undefined;

  return {
    url,
    title: info?.Title?.trim() || `PDF (${totalPages} page${totalPages === 1 ? "" : "s"})`,
    text: cleaned.slice(0, MAX_EXTRACTED_CHARS),
    kind: "pdf",
    error: null,
  };
}

export async function fetchAllSources(urls: string[]): Promise<FetchedSource[]> {
  const unique = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
  return Promise.all(unique.map(fetchSourceText));
}
