"use client";

import { useState } from "react";
import BriefForm from "@/components/BriefForm";
import BriefOutput from "@/components/BriefOutput";
import type { BriefRequest, ContentBrief } from "@/lib/types";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(request: BriefRequest) {
    setIsLoading(true);
    setBrief(null);
    setError(null);

    try {
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const raw = await response.text();
      let data: { error?: string } | ContentBrief | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(
          `The server returned an unreadable response (status ${response.status}). Check the server logs and try again.`,
        );
      }

      if (!response.ok || !data) {
        const message = data && "error" in data && data.error ? data.error : `Request failed with status ${response.status}`;
        throw new Error(message);
      }
      setBrief(data as ContentBrief);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong generating this brief.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-12 sm:px-8">
      <div className="flex max-w-3xl flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold">Content Brief Generator</h1>
        <p className="text-black/60 dark:text-white/60">
          Type a topic and get back a structured, human-readable content brief.
        </p>
      </div>

      <BriefForm onSubmit={handleSubmit} isLoading={isLoading} />

      {error ? (
        <div className="w-full max-w-3xl rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {brief ? <BriefOutput brief={brief} /> : null}
    </main>
  );
}
