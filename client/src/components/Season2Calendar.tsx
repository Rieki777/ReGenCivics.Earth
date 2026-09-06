/**
 * Add-to-calendar block for /season2.
 * Event titles, times, and ICS/Google URLs come from the same module /schedule uses.
 *
 * Each list shows only its FIRST date and keeps the rest collapsed by default
 * (Rye, 2026-09-02). Rendering all 4 open sessions plus all 13 episodes pushed
 * ~1,700px of near-identical cards between the season arc and the rest of the
 * story. The subscribe-once CTA is the primary action anyway; the per-date
 * buttons are the fallback.
 */
import { useState } from "react";
import { Calendar, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { CalendarCta } from "@/components/CalendarCta";
import {
  formatDualZoneStart,
  formatOpenAccessWhen,
  formatSessionLong,
  openAccessGoogleUrl,
  openAccessIcsUrl,
  season2EpisodeEvents,
  sessionStartUtc,
  SEASON_2_SERIES_GOOGLE_URL,
  SEASON_2_SERIES_ICS_URL,
  upcomingOpenAccessSessions,
  OPEN_ACCESS_PITCH,
  sessionTopic,
} from "@/lib/seasonEvents";

const display = { fontFamily: "var(--font-display)" } as const;

function formatEpisodeDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Toggle for the dates held back after the first one. */
function MoreDatesToggle({
  open,
  count,
  label,
  onToggle,
}: {
  open: boolean;
  count: number;
  label: string;
  onToggle: () => void;
}) {
  if (count < 1) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#7dd87d]/30 bg-[#0d2818]/40 px-5 py-2.5 text-sm font-semibold text-[#7dd87d] hover:bg-[#7dd87d]/10 hover:text-white transition-colors"
    >
      {open ? "Show fewer dates" : `Show ${count} more ${label}`}
      <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export function Season2Calendar() {
  const sessions = upcomingOpenAccessSessions();
  const episodes = season2EpisodeEvents();

  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [episodesOpen, setEpisodesOpen] = useState(false);

  const shownSessions = sessionsOpen ? sessions : sessions.slice(0, 1);
  const shownEpisodes = episodesOpen ? episodes : episodes.slice(0, 1);

  return (
    <AnimatedSection as="section" animation="slide-up" id="dates" className="py-16 md:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
          Add these dates
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4" style={display}>
          Put Season Two <span className="italic text-[#a8e6a8]">on your calendar</span>
        </h2>
        <p className="text-white/75 text-lg leading-relaxed mb-10">
          Subscribe once and the live feed stays current. Google Calendar and Apple/Outlook add one date at a time.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-[#7dd87d]" />
          <h3 className="text-white font-semibold text-lg" style={display}>
            Open Access Sessions
          </h3>
        </div>
        <p className="text-white/75 text-sm mb-5 max-w-2xl">
          Every new moon, 11:00 AM Pacific, 2:00 PM Eastern. {OPEN_ACCESS_PITCH}
        </p>

        <div className="space-y-4">
          {shownSessions.map((s, i) => (
            <div
              key={s.date}
              className={`rounded-xl p-5 border ${
                i === 0
                  ? "border-[#7dd87d]/40 bg-[#7dd87d]/10"
                  : "border-[#7dd87d]/20 bg-[#0d2818]/40"
              }`}
            >
              {i === 0 && (
                <span className="inline-block bg-[#7dd87d] text-[#1a472a] text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                  NEXT SESSION
                </span>
              )}
              <div className="text-white font-semibold mb-1">Open Access Session</div>
              <div className="text-white/70 text-sm mb-4">
                {s.dayName}, {formatSessionLong(s.date)}, {formatOpenAccessWhen(s)}
              </div>
              {(() => {
                const topic = sessionTopic(s.date);
                if (!topic) return null;
                return (
                  <div className="mb-4 rounded-lg bg-[#7dd87d]/12 border border-[#7dd87d]/30 p-4">
                    <div className="text-[#7dd87d] text-xs font-bold tracking-[0.15em] uppercase mb-1.5">
                      This session
                    </div>
                    <div className="text-white font-semibold mb-1">{topic.headline}</div>
                    <p className="text-white/75 text-sm leading-relaxed">{topic.body}</p>
                  </div>
                );
              })()}
              <CalendarCta
                googleUrl={openAccessGoogleUrl(s)}
                appleUrl={openAccessIcsUrl(s)}
                appleDownload={`regen-civics-open-session-${s.date}.ics`}
              />
            </div>
          ))}
        </div>

        <MoreDatesToggle
          open={sessionsOpen}
          count={Math.max(0, sessions.length - 1)}
          label="sessions"
          onToggle={() => setSessionsOpen((v) => !v)}
        />

        <div className="flex items-center gap-2 mb-3 mt-12">
          <Calendar className="w-5 h-5 text-[#7dd87d]" />
          <h3 className="text-white font-semibold text-lg" style={display}>
            Season Two episodes
          </h3>
        </div>
        <p className="text-white/70 text-sm mb-5">
          Weekly incubator sessions, 11:00 AM Pacific, 2:00 PM Eastern, September through December 2026.
        </p>

        <div className="rounded-xl border border-[#7dd87d]/30 bg-[#7dd87d]/8 p-5 mb-6">
          <div className="text-white font-semibold mb-1">All 13 weekly episodes</div>
          <p className="text-white/65 text-sm mb-4">Subscribe for the series. Times stay current if they change.</p>
          <CalendarCta
            googleUrl={SEASON_2_SERIES_GOOGLE_URL}
            appleUrl={SEASON_2_SERIES_ICS_URL}
            appleDownload="regen-civics-season-2.ics"
          />
        </div>

        <div className="space-y-3">
          {shownEpisodes.map((ep) => (
            <div
              key={ep.id}
              className="rounded-xl border border-[#7dd87d]/20 bg-[#0d2818]/40 p-5"
            >
              <div className="text-white font-semibold mb-1">{ep.title}</div>
              <div className="text-white/70 text-sm mb-4">
                {formatEpisodeDate(ep.date)} · {formatDualZoneStart(sessionStartUtc(ep.date))}
              </div>
              <CalendarCta
                googleUrl={ep.googleCalendarUrl}
                appleUrl={ep.appleCalendarUrl}
                appleDownload={`${ep.title.replace(/\s+/g, "-")}.ics`}
              />
            </div>
          ))}
        </div>

        <MoreDatesToggle
          open={episodesOpen}
          count={Math.max(0, episodes.length - 1)}
          label="episodes"
          onToggle={() => setEpisodesOpen((v) => !v)}
        />

        <div className="mt-10">
          <Link href="/schedule">
            <span className="inline-flex items-center gap-2 text-[#7dd87d] hover:text-[#9de89d] font-semibold">
              See the full season schedule
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </AnimatedSection>
  );
}
