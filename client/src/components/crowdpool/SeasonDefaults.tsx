/**
 * The season's defaults on the /campaigns gallery (build spec 2026-09-27,
 * section 14; research question 14, ruled 2026-09-27).
 *
 * Two things, each labelled as a default: the shared opening day from the
 * Year wheel (the March equinox, when the Build Season opens;
 * shared/crowdpoolCalendar.ts, ADR-70) and what every project shows before
 * its campaign goes live, which links to the Ready to crowdpool list on the
 * creator front door (ruling 14 keeps it published as a default). A project
 * may open on another day (ruling 2026-09-24), so the line says each
 * project's page shows its own dates; worded for contributors (bundle 1,
 * section 16.2). Sits under the explanatory callout and above the tabs, so it
 * heads both the gallery and the Needs tab.
 */
import { Link } from "wouter";
import { CalendarDays } from "lucide-react";
import { defaultCrowdpoolOpening } from "@shared/crowdpoolCalendar";
import { formatCloseDate } from "@shared/campaignProgress";
import { SEASON_DEFAULTS } from "@shared/crowdpoolCopy";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";

export function SeasonDefaults({ now }: { now?: Date }) {
  const opening = defaultCrowdpoolOpening(now ?? new Date());
  const day = formatCloseDate(opening.date);
  const line = opening.state === "open"
    ? SEASON_DEFAULTS.open(day, opening.seasonNumber)
    : SEASON_DEFAULTS.upcoming(day, opening.seasonNumber);
  return (
    <section
      aria-label={SEASON_DEFAULTS.label}
      className="bg-white/5 border border-[#7dd87d]/20 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 text-sm text-white/80 flex items-start gap-3"
    >
      <CalendarDays className="w-4 h-4 text-[#7dd87d] flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-2 min-w-0">
        <p className="break-words">{line}</p>
        <p className="break-words">
          {SEASON_DEFAULTS.lookForLead}
          <Link href={READINESS_HREF} className="font-medium text-[#7dd87d] underline underline-offset-2 hover:text-white">
            {SEASON_DEFAULTS.lookForLink}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
