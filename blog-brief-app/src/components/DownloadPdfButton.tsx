"use client";

import { useState } from "react";
import type { ContentBrief } from "@/lib/types";

function slugify(topic: string): string {
  return (
    topic
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "content-brief"
  );
}

export default function DownloadPdfButton({ brief }: { brief: ContentBrief }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsGenerating(true);
    setError(null);
    try {
      const [{ pdf }, { BriefPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/BriefPdfDocument"),
      ]);
      const blob = await pdf(<BriefPdfDocument brief={brief} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `content-brief-${slugify(brief.topic)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        {isGenerating ? (
          <>
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Preparing PDF…
          </>
        ) : (
          "Download as PDF"
        )}
      </button>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
