/**
 * The two ways to subscribe to our sessions.
 *
 * Rye set the shape on 2026-09-07 after a reader could not get the site's only
 * subscribe button to do anything in Google Calendar:
 *
 *   1. Everything, for the Season 2 cohort and anyone following the whole thing.
 *   2. The open sessions only, which includes Selection Day, plus the nudge to
 *      subscribe on YouTube for people who want to follow rather than attend.
 *
 * It started as three. The third was a dropdown for adding a single session,
 * and it went the same evening: every upcoming session further down the page
 * already carries its own Google and Apple buttons, so the picker was a second
 * way to do a thing the list does better, with the date detached from the
 * session you were reading about.
 *
 * A "just the thirteen Season 2 weeks" pair used to sit under option 1 as well.
 * Also gone, for the same reason: two more buttons directly beneath two working
 * buttons reads as though the first pair might not work. That feed still exists
 * and is reachable from the add-by-URL panel, which is where someone who wants
 * that specific slice will look.
 *
 * Each option offers Google and Apple/Outlook separately, because a single
 * `webcal://` link silently excludes every Google user. See CalendarCta.
 */
import { Youtube } from "lucide-react";
import { CalendarOptionCard, LiveFeedNote, SubscribeButtons } from "@/components/CalendarCta";
import { CALENDAR_FEEDS } from "@/lib/calendarLinks";
import { SEEDS_YOUTUBE_SUBSCRIBE_URL } from "@/lib/seasonEvents";

export function CalendarOptions({
  heading = "Add these to your calendar",
}: {
  heading?: string;
}) {
  return (
    <section className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <h2
          className="text-2xl md:text-3xl font-bold text-white mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {heading}
        </h2>
        <p className="text-white/70 text-sm mb-6 max-w-2xl">
          Google and Apple both work in a single click, and every time on this page is shown in your
          own timezone. To add just one session, use the buttons on that session further down.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          <CalendarOptionCard
            step={1}
            highlight
            title="Every session"
            blurb="The thirteen Season 2 weeks and the monthly Open Access Sessions. The easiest option if you are in the cohort or following the whole season."
          >
            <SubscribeButtons feed={CALENDAR_FEEDS.all} />
            <LiveFeedNote />
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
        </div>
      </div>
    </section>
  );
}
