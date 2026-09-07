/**
 * The "add by URL" fallback for calendar subscription.
 *
 * Why this exists: on 2026-09-07 a community member reported that Subscribe
 * sent them to webcal://regencivics.earth/regen-civics-all-events.ics and
 * nothing happened. webcal:// is resolved by whatever calendar app the OS has
 * registered, so a desktop Chrome user on Google Calendar has no handler and
 * the click is silently inert. That specific bug is fixed (Google now gets a
 * calendar.google.com/calendar/render?cid= link), but the class of it is not:
 * every one-click path depends on the browser, the OS, and the calendar app
 * agreeing, and one of those will always be misconfigured for someone.
 *
 * A URL you can copy and paste works everywhere, in every calendar app, with
 * no handoff. It is the floor under the buttons. Nobody should have to message
 * us to get a calendar link.
 *
 * The buttons above this live in CalendarCta/SubscribeButtons and are owned by
 * the calendar work; this is page copy and reads the same feed definitions, so
 * the URLs cannot drift from what the buttons point at.
 */
import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { CALENDAR_FEEDS, type CalendarFeed } from "@/lib/calendarLinks";

const ROWS: { feed: CalendarFeed; label: string; hint: string }[] = [
  {
    feed: CALENDAR_FEEDS.all,
    label: "Everything",
    hint: "Open Access Sessions and every Season Two episode",
  },
  {
    feed: CALENDAR_FEEDS.openAccess,
    label: "Open Access Sessions only",
    hint: "The monthly session, open to anyone",
  },
  {
    feed: CALENDAR_FEEDS.season2,
    label: "Season Two episodes only",
    hint: "The thirteen weekly sessions",
  },
];

function CopyRow({ feed, label, hint }: { feed: CalendarFeed; label: string; hint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(feed.httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions or an insecure context. The URL
      // is visible and selectable either way, which is the whole point of it.
    }
  }

  return (
    <div className="rounded-xl border border-[#7dd87d]/20 bg-[#0d2818]/40 p-4">
      <div className="text-white font-semibold text-sm">{label}</div>
      <div className="text-white/60 text-xs mb-3">{hint}</div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-0 break-all rounded-lg bg-black/30 px-3 py-2 text-[#a8e6a8] text-xs select-all">
          {feed.httpsUrl}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy the ${label} calendar URL`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#7dd87d]/40 bg-[#7dd87d]/10 px-3 py-2 text-xs font-semibold text-[#7dd87d] hover:bg-[#7dd87d]/20 hover:text-white transition-colors min-h-[44px] sm:min-h-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function CalendarFeedUrls() {
  return (
    <div className="rounded-2xl border border-[#7dd87d]/20 bg-[#0d2818]/30 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-5 h-5 text-[#7dd87d]" />
        <h3 className="text-white font-bold text-lg">Buttons not working? Add it by URL</h3>
      </div>
      <p className="text-white/70 text-sm leading-relaxed mb-5">
        Every calendar app can subscribe from a plain link, and it works the same
        on every device. In Google Calendar, open Other calendars, then From URL.
        In Apple Calendar, File, then New Calendar Subscription. In Outlook, Add
        calendar, then Subscribe from web.
      </p>

      <div className="space-y-3">
        {ROWS.map((r) => (
          <CopyRow key={r.feed.httpsUrl} {...r} />
        ))}
      </div>

      <p className="text-white/60 text-xs leading-relaxed mt-5">
        These are live feeds. Add one once and it stays current on its own, so a
        changed time or a new session updates in place rather than arriving as a
        duplicate.
      </p>
    </div>
  );
}
