import DownloadPdfButton from "@/components/DownloadPdfButton";
import type { ContentBrief } from "@/lib/types";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/10 py-6 last:border-b-0 dark:border-white/10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
        {title}
      </h2>
      <div className="text-base leading-relaxed">{children}</div>
    </section>
  );
}

export default function BriefOutput({ brief }: { brief: ContentBrief }) {
  return (
    <div className="w-full max-w-3xl rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-black/20 sm:p-8">
      <div className="mb-2 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">Content Brief: {brief.topic}</h1>
        <DownloadPdfButton brief={brief} />
      </div>
      {brief.groundingNotes.length > 0 ? (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <p className="mb-2 font-semibold uppercase tracking-wide">Data sources for this brief</p>
          <ul className="list-inside list-disc space-y-1">
            {brief.groundingNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Section title="Summary / TL;DR">
        <p>{brief.summary}</p>
      </Section>

      <Section title="Target keyword + related terms">
        <p className="mb-2">
          <span className="font-medium">Primary:</span> {brief.keywords.primary}
        </p>
        <p className="mb-2 font-medium">Secondary / LSI terms:</p>
        <ul className="list-inside list-disc space-y-1">
          {brief.keywords.secondary.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </Section>

      <Section title="Search intent">
        <p className="mb-2">
          <span className="font-medium">Type:</span> {brief.searchIntent.type}
        </p>
        <p>
          <span className="font-medium">Job to be done:</span> {brief.searchIntent.job}
        </p>
      </Section>

      <Section title="Recommended title options">
        <ol className="list-inside list-decimal space-y-1">
          {brief.titleOptions.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ol>
      </Section>

      <Section title="Content outline">
        <ul className="space-y-2">
          {brief.outline.map((item, i) => (
            <li key={i} className={item.level === "H3" ? "ml-6" : ""}>
              <span className="mr-2 rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                {item.level}
              </span>
              <span className="font-medium">{item.heading}</span>
              <span className="text-black/60 dark:text-white/60"> — {item.note}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Word count target">
        <p className="mb-2">
          <span className="font-medium">Total:</span> ~{brief.wordCount.total.toLocaleString("en-US")} words
        </p>
        <ul className="list-inside list-disc space-y-1">
          {brief.wordCount.sections.map((s) => (
            <li key={s.section}>
              {s.section}: ~{s.words} words
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Template recommendation">
        <p className="mb-1 font-medium">{brief.template.recommendation}</p>
        <p className="text-black/60 dark:text-white/60">{brief.template.reason}</p>
      </Section>

      <Section title="Competitive gap notes">
        <ul className="list-inside list-disc space-y-1">
          {brief.competitiveGaps.map((gap, i) => (
            <li key={i}>{gap}</li>
          ))}
        </ul>
      </Section>

      <Section title="Statistics / evidence checklist">
        <ul className="space-y-1">
          {brief.statsChecklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                needs source
              </span>
              <span>{item.claim}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Image / chart suggestions">
        <ul className="space-y-1">
          {brief.visualSuggestions.map((v, i) => (
            <li key={i}>
              <span className="font-medium">{v.placement}:</span> {v.description}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Internal linking suggestions">
        {brief.internalLinks.hasDomain && brief.internalLinks.suggestions.length > 0 ? (
          <ul className="mb-2 list-inside list-disc space-y-1">
            {brief.internalLinks.suggestions.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.anchorText}:</span> {s.note}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-black/50 dark:text-white/50">{brief.internalLinks.note}</p>
      </Section>

      <Section title="FAQ candidates">
        <ul className="list-inside list-disc space-y-1">
          {brief.faqs.map((faq) => (
            <li key={faq}>{faq}</li>
          ))}
        </ul>
      </Section>

      <Section title="Distribution notes">
        <ul className="list-inside list-disc space-y-1">
          {brief.distributionNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </Section>

      <Section title="NotebookLM Research Kit">
        <p className="mb-3 text-sm text-black/60 dark:text-white/60">
          For deeper, cited verification before drafting — paste these into a NotebookLM notebook and ask it these questions.
        </p>
        <p className="mb-1 font-medium">Suggested sources to add</p>
        <ul className="mb-3 list-inside list-disc space-y-1">
          {brief.notebookLmResearchKit.suggestedSources.map((source, i) => (
            <li key={i}>{source}</li>
          ))}
        </ul>
        <p className="mb-1 font-medium">Suggested questions to ask</p>
        <ul className="list-inside list-disc space-y-1">
          {brief.notebookLmResearchKit.suggestedQuestions.map((question, i) => (
            <li key={i}>{question}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
