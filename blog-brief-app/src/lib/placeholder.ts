import type { BriefRequest, ContentBrief } from "./types";

/**
 * Milestone 1 stub: returns brief-shaped placeholder content so the UI can be built
 * and reviewed before the real Claude API call (milestone 2) replaces this.
 */
export function generatePlaceholderBrief(request: BriefRequest): ContentBrief {
  const { topic, audience, domain, competitorUrls } = request;
  const audienceLabel = audience?.trim() || "a general reader searching this topic";
  const hasDomain = Boolean(domain?.trim());
  const hasCompetitors = Boolean(competitorUrls && competitorUrls.length > 0);

  return {
    topic,
    summary: `[Placeholder] This article should give ${audienceLabel} a clear, actionable answer on "${topic}", establishing enough credibility to rank and to satisfy the reader's underlying intent. Real generation (milestone 2) will replace this paragraph with a topic-specific summary.`,
    keywords: {
      primary: topic,
      secondary: [
        `${topic} guide`,
        `${topic} examples`,
        `${topic} best practices`,
        `how to ${topic}`,
        `${topic} tips`,
        `${topic} checklist`,
        `${topic} for beginners`,
      ],
    },
    searchIntent: {
      type: "Informational (placeholder — verify with live SERP data)",
      job: `The reader hires this article to understand "${topic}" well enough to make a decision or take the next step.`,
    },
    titleOptions: [
      `${topic}: A Complete Guide`,
      `The Ultimate Guide to ${topic}`,
      `${topic} Explained: What You Need to Know`,
      `How to Approach ${topic} (Step by Step)`,
      `${topic}: Tips, Examples, and Best Practices`,
    ],
    outline: [
      { level: "H2", heading: "Introduction", note: "Frame the problem and promise the reader's payoff up front." },
      { level: "H2", heading: `What is ${topic}?`, note: "Define the topic clearly for readers who are new to it." },
      { level: "H3", heading: "Why it matters", note: "Explain the stakes or benefits in concrete terms." },
      { level: "H2", heading: "Key considerations", note: "Cover the main factors readers must weigh." },
      { level: "H3", heading: "Common mistakes", note: "Call out pitfalls to build trust and differentiate from competitors." },
      { level: "H2", heading: "Step-by-step approach", note: "Give a practical, sequential walkthrough." },
      { level: "H2", heading: "Examples", note: "Show real or realistic examples that illustrate the advice." },
      { level: "H2", heading: "FAQ", note: "Answer the FAQ candidates listed below." },
      { level: "H2", heading: "Conclusion", note: "Summarize and give a clear next step or call to action." },
    ],
    wordCount: {
      total: 1800,
      sections: [
        { section: "Introduction", words: 150 },
        { section: `What is ${topic}?`, words: 300 },
        { section: "Key considerations", words: 400 },
        { section: "Step-by-step approach", words: 450 },
        { section: "Examples", words: 300 },
        { section: "FAQ", words: 150 },
        { section: "Conclusion", words: 50 },
      ],
    },
    template: {
      recommendation: "Ultimate guide (placeholder)",
      reason: "A broad topic like this typically benefits from a comprehensive guide format that can rank for the head term and several long-tail variants at once. Real generation will reassess this per topic.",
    },
    competitiveGaps: hasCompetitors
      ? [
          "[Placeholder] Competitor URL analysis will run in milestone 2 to identify specific gaps.",
          "General angle: add first-hand examples or a original mini-analysis competitors are unlikely to have.",
        ]
      : [
          "No competitor URLs supplied — using general differentiation angles.",
          "Add first-hand experience or an original example that generic articles on this topic tend to skip.",
          "Include an up-to-date perspective (recent changes, tools, or data) competitors may not have refreshed.",
        ],
    statsChecklist: [
      { claim: `Adoption/usage rate related to "${topic}"`, status: "needs-cited-source" },
      { claim: "Any percentage or statistic used to justify the topic's importance", status: "needs-cited-source" },
      { claim: "Comparative claims (e.g. \"X% faster/better\")", status: "needs-cited-source" },
    ],
    visualSuggestions: [
      { placement: "After the introduction", description: "A simple diagram or hero image establishing the topic visually." },
      { placement: "In 'Key considerations'", description: "A comparison table or chart summarizing the main factors." },
      { placement: "In 'Step-by-step approach'", description: "A numbered process graphic or screenshots for each step." },
    ],
    internalLinks: {
      hasDomain,
      suggestions: hasDomain
        ? [
            { anchorText: `${topic} basics`, note: `Link to an existing foundational page on ${domain} if one exists.` },
            { anchorText: "related how-to content", note: `Link to related how-to or comparison pages on ${domain}.` },
          ]
        : [],
      note: hasDomain
        ? "Directional suggestions only — this is not a live crawl of the domain."
        : "No primary domain supplied — provide one to get internal linking suggestions.",
    },
    faqs: [
      `What is ${topic}?`,
      `How do I get started with ${topic}?`,
      `What are the most common mistakes with ${topic}?`,
      `How much does ${topic} cost or take?`,
      `Is ${topic} worth it for beginners?`,
    ],
    distributionNotes: [
      "[Placeholder] This topic is likely well-suited for a LinkedIn post summarizing the key takeaway.",
      "[Placeholder] Consider a short-form video walkthrough if the topic is process-heavy.",
    ],
  };
}
