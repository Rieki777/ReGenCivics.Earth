import { Label } from "@/components/ui/label";
import {
  formatLandApplicationAnswers,
  groupLandApplicationAnswers,
  type FormattedApplicationAnswer,
} from "@shared/landApplicationFields";
import { CompanionTranscriptSection } from "@/components/admin/CompanionTranscriptSection";

function AnswerValue({ answer }: { answer: FormattedApplicationAnswer }) {
  if (answer.isEmpty) {
    return <p className="text-sm text-[#1a472a]/50 mt-1">{answer.displayValue}</p>;
  }

  if (answer.kind === "url_list") {
    return (
      <ul className="mt-1 space-y-1">
        {answer.urls.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#4a7c59] hover:underline break-all"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (answer.kind === "url") {
    return (
      <a
        href={answer.displayValue}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#4a7c59] hover:underline break-all mt-1 inline-block"
      >
        {answer.displayValue}
      </a>
    );
  }

  return (
    <p
      className={`text-sm text-[#1a472a]/90 mt-1 ${
        answer.kind === "longtext" ? "whitespace-pre-wrap" : ""
      }`}
    >
      {answer.displayValue}
    </p>
  );
}

/**
 * Full land-project application answers for admin review drawers.
 * Renders every registry field with label + value (empty → "—").
 */
export function ApplicationAnswersPanel({
  application,
  title = "Application answers",
}: {
  /** Full application row from admin list/getById (extra keys ignored). */
  application: object | null | undefined;
  title?: string;
}) {
  const groups = groupLandApplicationAnswers(
    formatLandApplicationAnswers(application as Record<string, unknown> | null | undefined),
  );

  return (
    <section className="space-y-4" aria-label={title}>
      <h3 className="text-sm font-semibold text-[#1a472a] uppercase tracking-wide border-b border-[#1a472a]/15 pb-2">
        {title}
      </h3>
      {groups.map((group) => (
        <div key={group.section} className="space-y-3">
          <p className="text-xs font-semibold text-[#1a472a]/70 uppercase tracking-wide">
            {group.section}
          </p>
          <div className="space-y-3 rounded-lg border border-[#1a472a]/10 bg-white/70 p-3">
            {group.answers.map((answer) => (
              <div key={answer.key}>
                <Label className="text-xs font-medium text-[#1a472a]/75">{answer.label}</Label>
                <AnswerValue answer={answer} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <CompanionTranscriptSection application={application} />
    </section>
  );
}
