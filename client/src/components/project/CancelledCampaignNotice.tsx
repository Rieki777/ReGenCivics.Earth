/**
 * Shown when a project's campaign is cancelled: the steward's message, if
 * they left one, and up to three live campaigns that could use the energy of
 * the people who were part of this one (projects.getPublic suggestions).
 */
import { Link } from "wouter";
import { ArrowRight, MapPin, Sprout } from "lucide-react";
import { decodeBasicEntities } from "@shared/htmlText";

export type CampaignSuggestionCard = {
  id: number;
  title: string;
  projectName: string | null;
  location: string | null;
  country: string | null;
  isDemo: boolean;
  path: string;
};

export function CancelledCampaignNotice({
  message,
  suggestions,
}: {
  message: string | null;
  suggestions: CampaignSuggestionCard[];
}) {
  return (
    <section id="cancelled" className="bg-white/95 backdrop-blur rounded-3xl light-form-island p-4 sm:p-6 md:p-8 mb-6 shadow-xl scroll-mt-24">
      <h2 className="text-xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
        This campaign has been cancelled.
      </h2>
      {message && (
        <blockquote className="border-l-4 border-[#7dd87d] pl-4 my-4 text-[#1a472a]/85 whitespace-pre-line break-words">
          {decodeBasicEntities(message)}
        </blockquote>
      )}
      {suggestions.length > 0 ? (
        <>
          <p className="text-sm text-[#1a472a]/85 mb-3">These campaigns could use your energy:</p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {suggestions.map((s) => {
              const place = [s.location, s.country].filter((p) => p && p.trim()).join(", ");
              return (
                <li key={s.id}>
                  <Link
                    href={s.path}
                    className="flex h-full flex-col rounded-2xl border border-[#1a472a]/10 bg-[#f0f7f0] p-4 hover:border-[#4a7c59]/60 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-[#4a7c59] mb-1">
                      <Sprout className="w-3.5 h-3.5" />
                      {s.isDemo ? "Example project" : "Live now"}
                    </span>
                    <span className="font-bold text-[#1a472a] break-words">{decodeBasicEntities(s.projectName || s.title)}</span>
                    {s.projectName && s.projectName !== s.title && (
                      <span className="text-sm text-[#1a472a]/80 break-words">{decodeBasicEntities(s.title)}</span>
                    )}
                    {place && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-[#1a472a]/75">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="break-words min-w-0">{decodeBasicEntities(place)}</span>
                      </span>
                    )}
                    <span className="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-medium text-[#4a7c59]">
                      Visit the project <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm font-semibold text-[#4a7c59] hover:underline">
          Browse live campaigns <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </section>
  );
}
