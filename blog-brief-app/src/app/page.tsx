"use client";

import { useState } from "react";
import BriefForm from "@/components/BriefForm";
import BriefOutput from "@/components/BriefOutput";
import { generatePlaceholderBrief } from "@/lib/placeholder";
import type { BriefRequest, ContentBrief } from "@/lib/types";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState<ContentBrief | null>(null);

  async function handleSubmit(request: BriefRequest) {
    setIsLoading(true);
    setBrief(null);

    // TODO(milestone 2): replace with a call to /api/brief backed by the Claude API.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setBrief(generatePlaceholderBrief(request));

    setIsLoading(false);
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

      {brief ? <BriefOutput brief={brief} /> : null}
    </main>
  );
}
