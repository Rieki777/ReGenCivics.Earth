/**
 * The three ways to put our sessions in your calendar.
 *
 * Rye set the shape on 2026-09-07 after a reader could not get the site's only
 * subscribe button to do anything in Google Calendar:
 *
 *   1. Everything. For the Season 2 cohort and anyone following the whole thing.
 *   2. The open sessions only, which includes Selection Day, plus the nudge to
 *      subscribe on YouTube for people who want to follow rather than attend.
 *   3. One session.
 *
 * Each option offers Google and Apple/Outlook separately, because a single
 * `webcal://` link silently excludes every Google user. See CalendarCta.
 */
import { useState } from "react";
import { Youtube } from "lucide-react";
import {
  CALENDAR_LABELS,
  CalendarCta,
  CalendarOptionCard,
  LiveFeedNote,
  SubscribeButtons,
} from "@/components/CalendarCta";
import { CALENDAR_FEEDS, eventFeed, formatLocalDateShort, formatLocalTime } from "@/lib/calendarLinks";
import { googleCalUrl, icsDataUrl, toCompactUtc, SEEDS_YOUTUBE_SUBSCRIBE_URL } from "@/lib/seasonEvents";

/** Quiet secondary control. Carries the same 44px floor as the main buttons. */
const secondaryLink =
  "inline-flex items-center justify-center min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold text-[#7dd87d] hover:text-white hover:bg-[#7dd87d]/15 border border-[#7dd87d]/30 transition-colors";

export type CalendarSession = {
  /** Database id when we have one. Null for a catalog fallback row. */
  id: number | null;
  title: string;
  start: Date;
  end: Date;
  description: string;
};

function sessionGoogleUrl(s: CalendarSession): string {
  return googleCalUrl({
    title: s.title,
    startUtc: toCompactUtc(s.start),
    endUtc: toCompactUtc(s.end),
    description: s.description,
  });
}

/**
 * A served .ics rather than a `data:` URL wherever we have an id. iOS Safari
 * handles `data:` downloads unreliably, and a real URL is something Calendar
 * can be handed directly.
 */
function sessionIcsUrl(s: CalendarSession): string {
  if (s.id != null) return eventFeed(s.id).httpsUrl;
  return icsDataUrl({
    uid: `event-${toCompactUtc(s.start)}@regencivics.earth`,
    summary: s.title,
    startUtc: toCompactUtc(s.start),
    endUtc: toCompactUtc(s.end),
    description: s.description,
  });
}

export function CalendarOptions({
  sessions,
  heading = "Add these to your calendar",
}: {
  sessions: CalendarSession[];
  heading?: string;
}) {
  const [pickedIndex, setPickedIndex] = useState(0);
  const picked = sessions[pickedIndex];

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
          {heading}
        </h2>
        <p className="text-white/70 text-sm mb-6 max-w-2xl">
          Pick one. Google and Apple both work in a single click, and every time on this page is
          shown in your own timezone.
        </p>

        <div className="grid md:grid-cols-3 gap-5">
          <CalendarOptionCard
            step={1}
            highlight
            title="Every session"
            blurb="The thirteen Season 2 weeks and the monthly Open Access Sessions. The easiest option if you are in the cohort or following the whole season."
          >
            <SubscribeButtons feed={CALENDAR_FEEDS.all} />
            <LiveFeedNote />
            {/* Two real controls rather than links inside a sentence. As inline
                text these measured 18px tall on a 375px viewport, and an anchor
                gets no help from the coarse-pointer hit expander in index.css,
                which only covers button and [role=...]. */}
            <p className="text-white/50 text-xs mt-4 mb-2">Just the thirteen Season 2 weeks:</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={CALENDAR_FEEDS.season2.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryLink}
              >
                {CALENDAR_LABELS.google}
              </a>
              <a href={CALENDAR_FEEDS.season2.webcalUrl} className={secondaryLink}>
                {CALENDAR_LABELS.apple}
              </a>
            </div>
          </CalendarOptionCard>

          <CalendarOptionCard
            step={2}
            title="Open sessions only"
            blurb="The monthly Open Access Sessions, plus Season 2 Selection Day. Everything on this calendar is open to anyone, with nothing to apply for."
          >
            <SubscribeButtons feed={CALENDAR_FEEDS.openAccess} />
            <LiveFeedNote />
            <a
              href={SEEDS_YOUTUBE_SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] mt-3 text-xs font-semibold text-white/80 hover:text-white bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
            >
              <Youtube className="w-3.5 h-3.5" />
              Subscribe on YouTube to follow the season
            </a>
          </CalendarOptionCard>

          <CalendarOptionCard
            step={3}
            title="One session"
            blurb="Pick a single date and add just that one."
          >
            {sessions.length === 0 ? (
              <p className="text-white/60 text-sm">No upcoming sessions to add yet.</p>
            ) : (
              <>
                <label htmlFor="calendar-session-pick" className="sr-only">
                  Choose a session
                </label>
                <select
                  id="calendar-session-pick"
                  value={pickedIndex}
                  onChange={(e) => setPickedIndex(Number(e.target.value))}
                  className="w-full mb-3 rounded-xl bg-[#0d2818] border border-[#7dd87d]/30 text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50"
                >
                  {sessions.map((s, i) => (
                    <option key={`${s.id ?? "x"}-${i}`} value={i}>
                      {formatLocalDateShort(s.start)} · {s.title}
                    </option>
                  ))}
                </select>
                {picked ? (
                  <>
                    <p className="text-white/60 text-xs mb-3">
                      {formatLocalTime(picked.start)} your time
                    </p>
                    <CalendarCta
                      googleUrl={sessionGoogleUrl(picked)}
                      appleUrl={sessionIcsUrl(picked)}
                      appleDownload={`${picked.title.replace(/[^\w-]+/g, "-")}.ics`}
                      note="A one-off add. Subscribe above instead if you want changes to reach you."
                    />
                  </>
                ) : null}
              </>
            )}
          </CalendarOptionCard>
        </div>
      </div>
    </section>
  );
}
