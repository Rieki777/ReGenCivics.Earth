import { parseCompanionTranscript } from "@shared/companionTranscript";

/**
 * Expandable Gardener companion conversation from applications.companionTranscript.
 * Renders nothing when the field is missing, empty, or unreadable.
 */
export function CompanionTranscriptSection({
  application,
  title = "Gardener conversation",
}: {
  application: object | null | undefined;
  title?: string;
}) {
  const raw = (application as Record<string, unknown> | null | undefined)?.companionTranscript;
  const turns = parseCompanionTranscript(raw);
  if (!turns) return null;

  return (
    <details className="rounded-lg border border-[#1a472a]/10 bg-white/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#1a472a] uppercase tracking-wide list-outside">
        {title} ({turns.length} turn{turns.length === 1 ? "" : "s"})
      </summary>
      <div className="mt-3 space-y-2 max-h-80 overflow-y-auto border-l-2 border-[#1a472a]/15 pl-3">
        {turns.map((t, i) => (
          <p key={i} className="text-sm leading-relaxed text-[#1a472a]/90 whitespace-pre-wrap">
            <span
              className={
                t.speakerLabel === "Gardener"
                  ? "font-semibold text-[#1a472a]"
                  : "font-semibold text-[#6b3f12]"
              }
            >
              {t.speakerLabel}:
            </span>{" "}
            {t.content}
          </p>
        ))}
      </div>
    </details>
  );
}
