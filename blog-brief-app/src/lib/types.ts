export interface BriefRequest {
  topic: string;
  audience?: string;
  domain?: string;
  competitorUrls?: string[];
  sourceUrls?: string[];
}

export interface OutlineSection {
  level: "H2" | "H3";
  heading: string;
  note: string;
}

export interface WordCountSection {
  section: string;
  words: number;
}

export interface StatChecklistItem {
  claim: string;
  status: "needs-cited-source";
}

export interface VisualSuggestion {
  placement: string;
  description: string;
}

export interface InternalLinkSuggestion {
  anchorText: string;
  note: string;
}

export interface NotebookLmResearchKit {
  suggestedSources: string[];
  suggestedQuestions: string[];
}

export interface ContentBrief {
  topic: string;
  /**
   * Server-generated notes about data-source availability/failures for this brief
   * (e.g. "Semrush not configured", "source fetch failed for X"). Never written by the
   * model — always attached by the API route from what actually happened.
   */
  groundingNotes: string[];
  summary: string;
  keywords: {
    primary: string;
    secondary: string[];
  };
  searchIntent: {
    type: string;
    job: string;
  };
  titleOptions: string[];
  outline: OutlineSection[];
  wordCount: {
    total: number;
    sections: WordCountSection[];
  };
  template: {
    recommendation: string;
    reason: string;
  };
  competitiveGaps: string[];
  statsChecklist: StatChecklistItem[];
  visualSuggestions: VisualSuggestion[];
  internalLinks: {
    hasDomain: boolean;
    suggestions: InternalLinkSuggestion[];
    note: string;
  };
  faqs: string[];
  distributionNotes: string[];
  notebookLmResearchKit: NotebookLmResearchKit;
}
