"use client";

import { useId, useState } from "react";
import type { BriefRequest } from "@/lib/types";

interface BriefFormProps {
  onSubmit: (request: BriefRequest) => void;
  isLoading: boolean;
}

export default function BriefForm({ onSubmit, isLoading }: BriefFormProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [domain, setDomain] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const formId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTopic = topic.trim();
    if (!trimmedTopic || isLoading) return;

    onSubmit({
      topic: trimmedTopic,
      audience: audience.trim() || undefined,
      domain: domain.trim() || undefined,
      competitorUrls: competitorUrls
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean),
      sourceUrls: sourceUrls
        .split(/[,\n]/)
        .map((url) => url.trim())
        .filter(Boolean),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/20 sm:p-8"
    >
      <div className="mb-4">
        <label htmlFor={`${formId}-topic`} className="mb-1 block text-sm font-medium">
          What topic do you want a brief for?
        </label>
        <input
          id={`${formId}-topic`}
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. how to choose a project management tool"
          className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
        />
      </div>

      <details className="mb-4 group">
        <summary className="cursor-pointer text-sm font-medium text-black/60 dark:text-white/60">
          Optional details
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor={`${formId}-audience`} className="mb-1 block text-sm font-medium">
              Target audience
            </label>
            <input
              id={`${formId}-audience`}
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. small business owners"
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-domain`} className="mb-1 block text-sm font-medium">
              Primary domain
            </label>
            <input
              id={`${formId}-domain`}
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. example.com"
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-competitors`} className="mb-1 block text-sm font-medium">
              Competitor URLs (comma-separated)
            </label>
            <input
              id={`${formId}-competitors`}
              type="text"
              value={competitorUrls}
              onChange={(e) => setCompetitorUrls(e.target.value)}
              placeholder="e.g. https://a.com/post, https://b.com/post"
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-sources`} className="mb-1 block text-sm font-medium">
              Source URLs to ground the brief in (comma or newline separated)
            </label>
            <textarea
              id={`${formId}-sources`}
              value={sourceUrls}
              onChange={(e) => setSourceUrls(e.target.value)}
              placeholder={"e.g. https://example.com/article\nhttps://example.com/study"}
              rows={2}
              className="w-full resize-y rounded-md border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/40"
            />
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Fetched server-side and used as cited grounding facts. Web pages and PDFs are both supported (scanned PDFs without a text layer can&apos;t be read).
            </p>
          </div>
        </div>
      </details>

      <button
        type="submit"
        disabled={isLoading || !topic.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/80"
      >
        {isLoading ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Generating brief…
          </>
        ) : (
          "Generate Brief"
        )}
      </button>
    </form>
  );
}
