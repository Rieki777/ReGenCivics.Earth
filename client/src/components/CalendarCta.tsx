/**
 * Add-to-calendar buttons.
 *
 * Every subscribe control on the site used to be a single button labelled
 * "Subscribe" pointing at a `webcal://` URL. That is an operating-system
 * protocol handler: it opens Apple Calendar or Outlook, and Google Calendar,
 * being a website, never registers for it. A Google user on Chrome got a dead
 * click. That is what a reader reported on 2026-09-07, and it had been the only
 * subscribe path on /schedule and /season2 the whole time.
 *
 * So there is no bare "Subscribe" any more. Google and Apple are always offered
 * side by side, each one click, each going somewhere that works.
 */
import { Calendar, Check } from "lucide-react";
import type { CalendarFeed } from "@/lib/calendarLinks";
import { CALENDAR_FEEDS } from "@/lib/calendarLinks";

/**
 * The two labels, defined once.
 *
 * They drifted within a day of being written: three blocks rendering the same
 * component showed "Google Calendar"/"Apple or Outlook", "Google Calendar"/
 * "Apple/Outlook", and "Google"/"Apple/Outlook". This is the control someone
 * is scanning when they cannot make the calendar work, and it is what you name
 * over a support channel when you tell them which button to press, so the words
 * have to be the same in every block.
 */
export const CALENDAR_LABELS = {
  google: "Google Calendar",
  apple: "Apple/Outlook",
} as const;

/**
 * All three button styles carry an explicit min-h-[44px].
 *
 * The coarse-pointer hit-area expander in index.css (~line 1256) covers
 * `button` and `[role="button"|"checkbox"|"radio"|"switch"]`. It does not cover
 * a plain `<a>`, and every control here is an anchor, so these get no help from
 * it. Measured on a 375px viewport before this was added: the quiet buttons
 * were 34px tall and the inline Season 2 links were 18px. scripts/
 * audit-touch-targets.py did not catch it because it looks for heights capped
 * by a utility class (h-4..h-8), not for heights that come out short from
 * padding alone, so gate 1c passed the whole time.
 */
const primaryButton =
  "inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-5 py-2.5 rounded-xl font-bold transition-colors text-sm";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 min-h-[44px] bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors text-sm border border-white/20";

const quietButton =
  "inline-flex items-center justify-center gap-2 min-h-[44px] bg-transparent hover:bg-white/10 text-white/70 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors text-xs border border-white/20";

/**
 * Subscribe to a feed in Google Calendar or in Apple/Outlook.
 *
 * Google gets an https deep link into its "add calendar by URL" flow. Apple and
 * Outlook get webcal://, which is what they actually want. One button each,
 * because guessing which the reader uses is what broke this before.
 */
export function SubscribeButtons({ feed }: { feed: CalendarFeed }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={feed.googleUrl} target="_blank" rel="noopener noreferrer" className={primaryButton}>
        <Calendar className="w-4 h-4" />
        {CALENDAR_LABELS.google}
      </a>
      <a href={feed.webcalUrl} className={secondaryButton}>
        <Calendar className="w-4 h-4" />
        {CALENDAR_LABELS.apple}
      </a>
    </div>
  );
}

/** Subscribe to everything. The default when a page just needs one control. */
export function CalendarSubscribeButton() {
  return <SubscribeButtons feed={CALENDAR_FEEDS.all} />;
}

/**
 * A one-shot add for a single session.
 *
 * `googleUrl` is a pre-filled Google event the reader saves in one click.
 * `appleUrl` should be a real .ics URL on our origin (`/calendar/event/N.ics`)
 * rather than a `data:` URL: iOS Safari handles `data:` downloads unreliably,
 * and a served file is something the calendar can be pointed at again later.
 */
export function CalendarCta({
  googleUrl,
  appleUrl,
  appleDownload,
  note,
}: {
  googleUrl: string;
  appleUrl: string;
  appleDownload?: string;
  note?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={quietButton}>
          {CALENDAR_LABELS.google}
        </a>
        <a
          href={appleUrl}
          {...(appleDownload ? { download: appleDownload } : {})}
          className={quietButton}
        >
          {CALENDAR_LABELS.apple}
        </a>
      </div>
      {note ? <p className="text-white/50 text-xs">{note}</p> : null}
    </div>
  );
}

/** Shared shell for the three subscribe options. */
export function CalendarOptionCard({
  step,
  title,
  blurb,
  children,
  highlight = false,
}: {
  step: number;
  title: string;
  blurb: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 border backdrop-blur-sm flex flex-col ${
        highlight
          ? "border-[#7dd87d]/50 bg-gradient-to-br from-[#7dd87d]/25 to-[#4a7c59]/15 ring-2 ring-[#7dd87d]/20"
          : "border-[#7dd87d]/25 bg-gradient-to-br from-[#4a7c59]/20 to-[#2d5a3d]/20"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-[#7dd87d] text-[#1a472a] text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <p className="text-white/70 text-sm mb-4 flex-1">{blurb}</p>
      {children}
    </div>
  );
}

/** The line that tells people why subscribing beats a one-off add. */
export function LiveFeedNote() {
  return (
    <p className="text-white/60 text-xs mt-3 flex items-start gap-1.5">
      <Check className="w-3.5 h-3.5 text-[#7dd87d] flex-shrink-0 mt-0.5" />
      <span>If we move a session, it moves in your calendar. New sessions appear on their own.</span>
    </p>
  );
}
