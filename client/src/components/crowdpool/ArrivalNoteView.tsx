/**
 * The arrival note as the person whose offer stands reads it (build spec
 * 2026-09-27, section 11.4): "Before you arrive", then only the fields the
 * stewards set, each a label and its text. Plain text, broken anywhere so a
 * long address never pushes the page sideways at 375px.
 *
 * Shown in Your contributions ("Needs you"), on the offer status page and,
 * as an email block, in the accepted email. The note arrives resolved (the
 * need's note field by field over the campaign's, shared/offerStatus.ts).
 * Stored text is sanitized, so it is decoded once here.
 */
import { MapPin } from "lucide-react";
import { ARRIVAL } from "@shared/crowdpoolCopy";
import { arrivalNoteLines, type ResolvedArrivalNote } from "@shared/offerStatus";
import { decodeBasicEntities } from "@shared/htmlText";

export function ArrivalNoteView({
  note,
  headingLevel = 3,
  id,
  className = "",
}: {
  note: ResolvedArrivalNote | null | undefined;
  headingLevel?: 2 | 3 | 4;
  id?: string;
  className?: string;
}) {
  const lines = arrivalNoteLines(note);
  if (lines.length === 0) return null;
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section id={id} className={`rounded-xl bg-[#f0f7f0] p-4 text-[#1a472a] min-w-0 ${className}`} aria-label={ARRIVAL.viewHeading}>
      <Heading className="font-bold text-base mb-2 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#4a7c59] flex-shrink-0" aria-hidden="true" />
        {ARRIVAL.viewHeading}
      </Heading>
      <dl className="space-y-2 text-sm">
        {lines.map((l) => (
          <div key={l.field} className="min-w-0">
            <dt className="font-semibold">{l.label}</dt>
            <dd className="text-[#1a472a]/90 break-words whitespace-pre-wrap">{decodeBasicEntities(l.text)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
