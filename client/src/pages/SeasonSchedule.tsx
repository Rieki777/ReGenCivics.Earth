/**
 * Season Schedule (/season-schedule)
 *
 * The land projects in a Season pick its weekly time. Each browser raises a
 * hand for every time it can make. From the Season's `followsFrom` on, the
 * schedule follows the vote the way the Circle's does: a new leader takes over
 * once it has held the lead for a day, for every session more than three days
 * out (shared/seasonSchedule.ts, ADR-64, ADR-65). Reusable for every Season:
 * the page reads ACTIVE_SEASON and that Season's entry in SEASON_SCHEDULES, so
 * its copy stays general and the invitation email carries the moment's story.
 *
 * Forked from /interop-sessions (Rye, 2026-09-28). Since 2026-10-01 it is also
 * where people sign up for the season: the join section reads the intake from
 * shared/applicationWindow.ts, so it says the same thing as /apply and /season2.
 */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { MemberBadgeChips } from "@/components/CallTimeVoteNudge";
import { LandProjectVoteField, type AppliedProjectPick } from "@/components/LandProjectVoteField";
import { SITE_ORIGIN } from "@shared/sessionLinks";
import { projectPathForApplication } from "@shared/projectKey";
import { Calendar, CheckCircle2, Clock, ExternalLink, MessageSquare, Sprout, Users, Video, Youtube } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { BackButton } from "@/components/BackButton";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SessionBoardLink } from "@/components/SessionBoardLink";
import { LiveFeedNote, SubscribeButtons } from "@/components/CalendarCta";
import { CALENDAR_FEEDS, formatLocalDate, formatLocalDateShort, formatLocalTime, formatStartWithReference } from "@/lib/calendarLinks";
import { trpc } from "@/lib/trpc";
import { useSeasonSchedule, type SeasonSessionView } from "@/hooks/useSeasonSchedule";
import { usePersistFn } from "@/hooks/usePersistFn";
import { Link } from "wouter";
import { SEEDS_YOUTUBE_URL } from "@shared/sessionLinks";
import {
  ACCEPTANCE_LINE,
  APPLICATIONS,
  APPLICATIONS_HEADLINE,
  APPLICATIONS_STATUS,
  APPLY_BUTTON_LABEL,
} from "@shared/applicationWindow";
import { READINESS_HREF } from "@shared/crowdpoolReadiness";
import {
  ACTIVE_SEASON,
  SEASON_FACILITATION_MAX,
  SEASON_FREEZE_HOURS,
  SEASON_TOPIC_MAX,
  clockBlip,
  clockShift,
  isSeasonSlotKey,
  listJoin,
  pacificClockChange,
  seasonSessionStart,
  seasonSlot,
  zoneTimes,
  type ClockBlip,
  type ClockShift,
  type SeasonScheduleConfig,
  type SeasonSlot,
  type SeasonSlotKey,
} from "@shared/seasonSchedule";

/** One key per browser, shared by every Season: the table is keyed by Season and voter together. */
const VOTER_KEY_STORAGE = "season-voter-key";
const NAME_STORAGE = "season-schedule:name";
const PROJECT_STORAGE = "season-schedule:project";
const LINK_STORAGE = "season-schedule:link";
const voteStorage = (season: string) => `season-schedule:${season}:vote`;

const APPLIED_STATUSES = new Set(["submitted", "under_review", "approved", "active", "changes_requested"]);

function appliedPick(id: number, name: string | null | undefined): AppliedProjectPick | null {
  const projectName = (name ?? "").trim();
  if (!projectName) return null;
  return {
    id,
    name: projectName,
    href: `${SITE_ORIGIN}${projectPathForApplication(id, projectName)}`,
  };
}

/** 32 hex characters of CSPRNG output, or a last-resort fallback where crypto is absent. Same as the Circle's. */
function randomKeyBody(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }
}

/** A random id this browser keeps, so someone with no account still gets one vote. It is a bearer credential. */
function readVoterKey(): string {
  const fresh = "s" + randomKeyBody();
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    window.localStorage.setItem(VOTER_KEY_STORAGE, fresh);
  } catch {
    // Private windows and blocked storage: the key lives for this page load only.
  }
  return fresh;
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the vote still lives on the server under the voter key.
  }
}

function pacificWhen(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Los_Angeles", timeZoneName: "short",
  });
}

function pacificDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "America/Los_Angeles",
  });
}

/** The first session a time would hold if it won now: its first week that starts after `cutoff`. */
function firstSessionOn(
  config: SeasonScheduleConfig,
  cutoff: number,
  slot: SeasonSlot,
): { week: number; start: Date } | null {
  for (let week = 1; week <= config.weeks.length; week++) {
    const start = seasonSessionStart(config, week, slot);
    if (start && start.getTime() > cutoff) return { week, start };
  }
  return null;
}

type ScheduleState = NonNullable<ReturnType<typeof useSeasonSchedule>["data"]>;
type RegisterEntry = ScheduleState["register"][number];
type PublicNote = ScheduleState["publicNotes"][number];

const NO_REGISTER: RegisterEntry[] = [];
const NO_NOTES: PublicNote[] = [];

// The sections below are memoized and take only what they show, so a keystroke
// in the project, link, name or note fields re-renders the page body and the
// section holding the field, never the session list, the slots or the register.

const StillSEO = memo(SEO);
const StillProjectField = memo(LandProjectVoteField);

const HeaderSection = memo(function HeaderSection({
  seasonName,
  ready,
  decided,
  scheduledLabel,
  nextUp,
  followsFrom,
}: {
  seasonName: string;
  ready: boolean;
  decided: boolean;
  scheduledLabel: string;
  nextUp: SeasonSessionView | null;
  followsFrom: Date;
}) {
  return (
    <>
      <BackButton />

      <AnimatedSection>
        <header className="mt-6 mb-12">
          <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
            Season Schedule · {seasonName}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
            {!ready ? seasonName : decided ? `${seasonName} meets ${scheduledLabel}` : `Pick the time ${seasonName} meets`}
          </h1>
          {/* Waits for the live schedule once the vote has decided (useSeasonSchedule `ready`). */}
          {ready && (
            <p className="text-white/75 text-lg max-w-2xl">
              {decided
                ? "The land projects picked this time, and it keeps following their vote. Change your picks whenever your week changes, and the Season moves with the group."
                : "The land projects choose the next session and the weekly time. Tap every time your project can make, as many as work. The time most projects can make wins, and the Season keeps following the vote as weeks change."}
            </p>
          )}

          {ready && nextUp && (
            <div className="mt-8 bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-xl p-5 max-w-2xl">
              <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-1">Next session</p>
              <p className="text-white font-bold text-lg">{nextUp.title ?? `Week ${nextUp.week}`}</p>
              {decided ? (
                <p className="text-white/80">
                  {formatLocalDate(nextUp.start)}, {formatStartWithReference(nextUp.start)}
                </p>
              ) : (
                <p className="text-white/80">
                  The vote picks when it happens, {pacificWhen(followsFrom)}. Each time below shows the date it
                  would be, and everyone gets an email with the result.
                </p>
              )}
            </div>
          )}
        </header>
      </AnimatedSection>
    </>
  );
});

const JoinSeasonSection = memo(function JoinSeasonSection({
  seasonName,
  applyingThisSeason,
}: {
  seasonName: string;
  applyingThisSeason: boolean;
}) {
  return (
    <AnimatedSection>
      <section id="join" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Sprout className="w-5 h-5 text-[#7dd87d]" />
          <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Join the season</p>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          {applyingThisSeason ? `Sign up for ${seasonName}` : `Follow ${seasonName}`}
        </h2>
        {applyingThisSeason ? (
          <>
            <p className="text-white/80 mb-3">{APPLICATIONS_HEADLINE}</p>
            <p className="text-white/75 mb-5">{ACCEPTANCE_LINE}</p>
          </>
        ) : (
          <p className="text-white/75 mb-5">{APPLICATIONS_STATUS}</p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 min-h-11 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
          >
            <Sprout className="w-4 h-4" />
            {APPLY_BUTTON_LABEL}
          </Link>
          <a
            href="#weeks"
            className="inline-flex items-center gap-2 min-h-11 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
          >
            <Calendar className="w-4 h-4" />
            Add the season to your calendar
          </a>
          <a
            href="#catch-up"
            className="inline-flex items-center gap-2 min-h-11 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
          >
            <Youtube className="w-4 h-4" />
            Watch sessions you missed
          </a>
          <Link
            href={READINESS_HREF}
            className="inline-flex items-center gap-2 min-h-11 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            What a project needs to crowdpool
          </Link>
        </div>
        <p className="text-white/55 text-sm mt-4">
          Already in? Vote on the weekly time below, and add the season to your calendar so every session lands
          on it.
        </p>
      </section>
    </AnimatedSection>
  );
});

const VoteIntro = memo(function VoteIntro({
  ready,
  decided,
  followsFrom,
  revealAt,
}: {
  ready: boolean;
  decided: boolean;
  followsFrom: Date;
  revealAt: number;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Clock className="w-5 h-5 text-[#e3ac4f]" />
        <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Live vote</p>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Tap every time your project can make</h2>
      <p className="text-white/75 mb-3">
        {!ready
          ? "The time most projects can make becomes the weekly time, and the Season keeps following the vote."
          : decided
          ? "The Season follows this vote. When a different time takes the lead and holds it for a day, every session more than three days out moves there, and everyone gets an email with the new time."
          : `The vote decides ${pacificWhen(followsFrom)}: the time most projects can make becomes the next session and the weekly time. After that the Season keeps following the vote, so change your picks whenever your week changes.`}
      </p>
      <p className="text-white/55 text-sm mb-6">
        Votes stay anonymous until {revealAt} projects have voted. Until then the page shows only each time's
        share of projects. After that, it shows which projects picked each time.
      </p>
    </>
  );
});

const SlotList = memo(function SlotList({
  offered,
  tally,
  config,
  cutoff,
  mySlots,
  leaderKey,
  decided,
  scheduledKey,
  seasonOver,
  anyVotes,
  revealed,
  canVote,
  hasProject,
  onToggle,
}: {
  offered: SeasonSlot[];
  tally: Map<string, ScheduleState["tally"][number]>;
  config: SeasonScheduleConfig;
  cutoff: number;
  mySlots: SeasonSlotKey[];
  leaderKey: string | undefined;
  decided: boolean;
  scheduledKey: string;
  seasonOver: boolean;
  anyVotes: boolean;
  revealed: boolean;
  /** A voter key is in and no save is on its way. */
  canVote: boolean;
  hasProject: boolean;
  onToggle: (key: SeasonSlotKey) => void;
}) {
  return (
    <div className="space-y-4">
      {offered.map((slot) => {
        const t = tally.get(slot.key);
        const share = t?.share ?? 0;
        const first = firstSessionOn(config, cutoff, slot);
        const isMine = mySlots.includes(slot.key);
        const isLeader = leaderKey === slot.key && share > 0;
        const isCurrent = decided && scheduledKey === slot.key;
        return (
          <div
            key={slot.key}
            className={`rounded-xl border p-5 transition-colors ${
              isMine || isCurrent ? "border-[#7dd87d] bg-[#7dd87d]/10" : "border-white/15 bg-white/5"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-bold text-lg">{slot.label}</h3>
                  {slot.weekend && (
                    <span className="text-white/70 border border-white/25 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Weekend
                    </span>
                  )}
                  {isLeader && (
                    <span className="text-[#1a472a] bg-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">
                      Winning
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[#1a472a] bg-[#e3ac4f] text-xs font-bold px-2 py-0.5 rounded-full">
                      Current time
                    </span>
                  )}
                </div>
                {first && !isCurrent && (
                  <p className="text-white/55 text-sm mt-1">
                    Week {first.week} would meet {pacificDay(first.start)}.
                  </p>
                )}
              </div>
              {!seasonOver && (
                <button
                  type="button"
                  onClick={() => onToggle(slot.key)}
                  disabled={!canVote || (!hasProject && !isMine)}
                  title={!hasProject && !isMine ? "Add your land project first" : undefined}
                  aria-pressed={isMine}
                  className={`inline-flex items-center gap-2 min-h-11 px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                    isMine
                      ? "bg-[#7dd87d] text-[#1a472a]"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  }`}
                >
                  {isMine ? <><CheckCircle2 className="w-4 h-4" /> You can make this</> : "I can make this"}
                </button>
              )}
            </div>

            {first && (
              <>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/65 tabular-nums">
                  {zoneTimes(first.start).map((z) => (
                    <li key={z.label}>
                      <span className="text-white font-medium">{z.time}</span> {z.label}
                    </li>
                  ))}
                </ul>
                <p className="text-white/45 text-xs mt-1 mb-3">
                  Your time: {formatLocalDateShort(first.start)}, {formatLocalTime(first.start)}
                </p>
              </>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#e3ac4f] transition-all" style={{ width: `${share}%` }} />
              </div>
              <span className="text-white/60 text-sm tabular-nums whitespace-nowrap">
                {anyVotes ? `${share}% of projects` : "No votes yet"}
              </span>
            </div>
            {revealed && t && t.names.length > 0 && (
              <p className="text-white/50 text-xs mt-2">{t.names.join(", ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
});

type ClockChanges = {
  lasting: (ClockShift & { change: Date | null }) | null;
  blip: ClockBlip | null;
} | null;

const ShiftNotes = memo(function ShiftNotes({ shift, rescheduleNote }: { shift: ClockChanges; rescheduleNote?: string }) {
  return (
    <div className="text-white/60 text-sm mt-5 space-y-2">
      {shift?.lasting?.change && (
        <p>
          US clocks change on {pacificDay(shift.lasting.change)}. Each session keeps its Pacific time, so
          from then it starts an hour {shift.lasting.later ? "later" : "earlier"} in {listJoin(shift.lasting.zones)}.
        </p>
      )}
      {shift?.blip && (
        <p>
          {listJoin(shift.blip.zones)} changes its clocks a week before the US, so in the week of{" "}
          {pacificDay(shift.blip.weekOf).replace(/^\w+, /, "")} the session starts an hour{" "}
          {shift.blip.earlier ? "earlier" : "later"} there.
        </p>
      )}
      {rescheduleNote && <p>{rescheduleNote}</p>}
    </div>
  );
});

const VoteStatus = memo(function VoteStatus({
  loadFailed,
  decided,
  seasonName,
  scheduledLabel,
  leaderLabel,
  leaderShare,
  hasProject,
  seasonOver,
  movingSoon,
  pinned,
  picksSaved,
  saveError,
}: {
  loadFailed: boolean;
  decided: boolean;
  seasonName: string;
  scheduledLabel: string;
  leaderLabel: string | null;
  leaderShare: number;
  hasProject: boolean;
  seasonOver: boolean;
  movingSoon: boolean;
  pinned: boolean;
  picksSaved: boolean;
  saveError: string | null;
}) {
  return (
    <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
      {loadFailed && (
        <p className="text-red-300 text-sm">The vote did not load. Try again in a minute.</p>
      )}
      {decided && (
        <p className="text-white/75">
          {seasonName} meets <span className="text-white font-semibold">{scheduledLabel}</span>.
        </p>
      )}
      <p className="text-white/75">
        {leaderLabel
          ? <>Winning right now: <span className="text-white font-semibold">{leaderLabel}</span>, which {leaderShare}% of the projects that voted can make.</>
          : <>No votes yet. The first projects set the lead.</>}
      </p>
      {!hasProject && !seasonOver && (
        <p className="text-white/55 text-sm">Add your land project above to vote. Each project counts once, however many of you vote.</p>
      )}
      {movingSoon && leaderLabel && (
        <p className="text-[#e3ac4f] text-sm">
          If {leaderLabel} holds the lead for a day, sessions more than three days out move there, and
          everyone gets an email.
        </p>
      )}
      {pinned && (
        <p className="text-white/50 text-sm">The organizers have set this time for now. The vote keeps counting.</p>
      )}
      {picksSaved && (
        <p className="inline-flex items-center gap-2 text-[#7dd87d] text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          Saved. Change your picks whenever your week changes.
        </p>
      )}
      {saveError !== null && <p className="text-red-300 text-sm">{saveError}</p>}
    </div>
  );
});

const RegisterSection = memo(function RegisterSection({
  seasonName,
  register,
}: {
  seasonName: string;
  register: RegisterEntry[];
}) {
  if (register.length === 0) return null;
  return (
    <AnimatedSection>
      <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-5 h-5 text-[#7dd87d]" />
          <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Who is in the room</p>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">The projects in {seasonName}</h2>
        <p className="text-white/75 mb-5">
          Every project that has shared a link. Open each other's work before the next session.
          Add yours in the fields above.
        </p>
        <ul className="divide-y divide-white/10">
          {register.map((entry, i) => (
            <li key={`${entry.project ?? entry.url}-${i}`} className="py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-white font-medium">{entry.project ?? "A project"}</span>
              {entry.url && (
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-[#7dd87d] hover:text-[#9de89d] text-sm underline underline-offset-2 break-all"
                >
                  {entry.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              )}
              {entry.names && <span className="text-white/55 text-sm">{entry.names}</span>}
              <MemberBadgeChips badges={entry.badges} />
            </li>
          ))}
        </ul>
      </section>
    </AnimatedSection>
  );
});

const WeeksSection = memo(function WeeksSection({
  seasonName,
  ready,
  decided,
  followsFrom,
  loadFailed,
  upcoming,
}: {
  seasonName: string;
  ready: boolean;
  decided: boolean;
  followsFrom: Date;
  loadFailed: boolean;
  upcoming: SeasonSessionView[];
}) {
  return (
    <AnimatedSection>
      <section id="weeks" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="w-5 h-5 text-[#7dd87d]" />
          <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">The weeks ahead</p>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Every session still to come</h2>
        <p className="text-white/75 mb-5">
          {!ready
            ? "In your own time zone."
            : decided
            ? "In your own time zone. When the vote moves the Season, this list and the calendar feed move with it."
            : `In your own time zone. These are the times the Season opened with; when the vote decides ${pacificWhen(followsFrom)}, this list and the calendar feed move to the winning time.`}
        </p>
        {!ready ? (
          <p className="text-white/60 mb-6">
            {loadFailed ? "The sessions did not load. Try again in a minute." : "Loading the sessions."}
          </p>
        ) : upcoming.length === 0 ? (
          <p className="text-white/60">{seasonName} has finished. Thank you for building it with us.</p>
        ) : (
          <ol className="divide-y divide-white/10 mb-6">
            {upcoming.map((s) => (
              <li key={s.week} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <span className="flex flex-col">
                  <span className="text-white font-medium">{s.title ?? `Week ${s.week}`}</span>
                  <SessionBoardLink week={s.week} status={s.status} />
                </span>
                <span className="text-white/65 text-sm tabular-nums sm:text-right">
                  {formatLocalDate(s.start)}, {formatStartWithReference(s.start)}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-white/75 mb-3">Subscribe once and every session lands on your calendar.</p>
        <SubscribeButtons feed={CALENDAR_FEEDS.season2} />
        <LiveFeedNote />
      </section>
    </AnimatedSection>
  );
});

const NotesIntro = memo(function NotesIntro({
  nextWeek,
  notesForNext,
}: {
  nextWeek: number | null | undefined;
  notesForNext: number;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <MessageSquare className="w-5 h-5 text-[#e3ac4f]" />
        <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Your notes</p>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Help shape the next session</h2>
      <p className="text-white/75 mb-2">
        Tell us what you want to dig into{nextWeek ? ` at Week ${nextWeek}` : " next"}, and how the
        facilitation is working for you. We read every note before each session.
      </p>
      <p className="text-white/55 text-sm mb-5">
        You choose: share a note with the whole cohort on this page, or keep it with the organizers. Leave it
        unsigned and it stays anonymous either way.
        {notesForNext > 0
          ? ` ${notesForNext === 1 ? "1 note is" : `${notesForNext} notes are`} in for Week ${nextWeek} so far.`
          : ""}
      </p>
    </>
  );
});

const NoteSent = memo(function NoteSent({ week, isPublic }: { week: number | null | undefined; isPublic: boolean }) {
  return (
    <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold mb-4">
      <CheckCircle2 className="w-5 h-5" />
      Thank you. {week ? `It is in for Week ${week}` : "It is in"}
      {isPublic ? ", and shared below." : "."}
    </p>
  );
});

/**
 * The note form keeps its own text, so typing a note re-renders only this
 * form. It takes the name and project to offer signing with them.
 */
const NotesForm = memo(function NotesForm({
  season,
  name,
  project,
  onSent,
}: {
  season: string;
  name: string;
  project: string;
  onSent: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [facilitation, setFacilitation] = useState("");
  const [signNote, setSignNote] = useState(false);
  // Private unless the writer chooses to share it (Rye, 2026-09-28).
  const [shareNote, setShareNote] = useState(false);

  const sendFeedback = trpc.seasonSchedule.sendFeedback.useMutation({
    onSuccess: () => {
      setTopic("");
      setFacilitation("");
      onSent();
    },
  });

  function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() && !facilitation.trim()) return;
    sendFeedback.mutate({
      season,
      topic: topic.trim() || undefined,
      facilitation: facilitation.trim() || undefined,
      displayName: signNote ? name.trim() || undefined : undefined,
      projectName: signNote ? project.trim() || undefined : undefined,
      isPublic: shareNote,
    });
  }

  return (
    <>
      {sendFeedback.isSuccess && (
        <NoteSent week={sendFeedback.data?.week} isPublic={!!sendFeedback.data?.isPublic} />
      )}
      <form onSubmit={submitFeedback} className="space-y-4">
        <label className="block">
          <span className="block text-white/70 text-sm mb-2">What do you want to talk about next?</span>
          <textarea
            value={topic}
            maxLength={SEASON_TOPIC_MAX}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="A question, a sticking point, something another project is doing that you want to hear more about"
            className="w-full bg-white/10 border border-white/45 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
          />
        </label>
        <label className="block">
          <span className="block text-white/70 text-sm mb-2">Feedback on the facilitation</span>
          <textarea
            value={facilitation}
            maxLength={SEASON_FACILITATION_MAX}
            onChange={(e) => setFacilitation(e.target.value)}
            rows={3}
            placeholder="What is working, what to change, what you need more of"
            className="w-full bg-white/10 border border-white/45 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
          />
        </label>
        {(name.trim() || project.trim()) && (
          <label className="flex items-center gap-3 text-white/75 text-sm min-h-11 cursor-pointer">
            <input
              type="checkbox"
              checked={signNote}
              onChange={(e) => setSignNote(e.target.checked)}
              className="w-4 h-4 accent-[#e3ac4f]"
            />
            Sign it with {[name.trim(), project.trim()].filter(Boolean).join(", ")}
          </label>
        )}
        <fieldset className="space-y-1">
          <legend className="text-white/70 text-sm mb-1">Who sees it</legend>
          <label className="flex items-center gap-3 text-white/80 text-sm min-h-11 cursor-pointer">
            <input
              type="radio"
              name="note-visibility"
              checked={!shareNote}
              onChange={() => setShareNote(false)}
              className="w-4 h-4 accent-[#e3ac4f]"
            />
            Only the organizers
          </label>
          <label className="flex items-center gap-3 text-white/80 text-sm min-h-11 cursor-pointer">
            <input
              type="radio"
              name="note-visibility"
              checked={shareNote}
              onChange={() => setShareNote(true)}
              className="w-4 h-4 accent-[#e3ac4f]"
            />
            The whole cohort, on this page
          </label>
        </fieldset>
        <button
          type="submit"
          disabled={sendFeedback.isPending || (!topic.trim() && !facilitation.trim())}
          className="inline-flex items-center justify-center gap-2 min-h-11 bg-[#e3ac4f] hover:bg-[#edc27a] text-[#1a472a] px-5 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-60"
        >
          {sendFeedback.isPending ? "Sending..." : shareNote ? "Share it" : "Send to the organizers"}
        </button>
        {sendFeedback.isError && <p className="text-red-300 text-sm">{sendFeedback.error.message}</p>}
      </form>
    </>
  );
});

const PublicNotes = memo(function PublicNotes({ notes }: { notes: PublicNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-white/10">
      <h3 className="text-white font-bold text-lg mb-1">What the cohort wants to talk about</h3>
      <p className="text-white/55 text-sm mb-4">Notes their writers chose to share, newest first.</p>
      <ul className="space-y-3">
        {notes.map((n, i) => (
          <li key={`${n.createdAt}-${i}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/45 text-xs mb-1">
              {n.week ? `Before Week ${n.week}` : "After the Season"}
              {n.projectName || n.displayName
                ? ` · ${[n.projectName, n.displayName].filter(Boolean).join(", ")}`
                : ""}
            </p>
            {n.topic && <p className="text-white/85 text-sm whitespace-pre-wrap">{n.topic}</p>}
            {n.facilitation && (
              <p className="text-white/70 text-sm whitespace-pre-wrap mt-1">
                <span className="text-[#e3ac4f] font-semibold">On the facilitation: </span>
                {n.facilitation}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});

const CatchUpSection = memo(function CatchUpSection({ selectionVideos }: { selectionVideos: boolean }) {
  return (
    <AnimatedSection>
      <section id="catch-up" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Youtube className="w-5 h-5 text-[#e3ac4f]" />
          <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Catching up</p>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-3">If you missed a session</h2>

        {/* Selection Day stays private until every project is in it (Rye,
            2026-09-28). The address rides in the invitation email, not on
            this public page. An admin hides this once it goes public. */}
        {selectionVideos && (
          <div className="bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-[#7dd87d]" />
              <h3 className="text-white font-bold">If you missed Selection Day, send your video</h3>
            </div>
            <p className="text-white/80 text-sm mb-3">
              Selection Day goes public once every project is in it. If the time did not work for you, send your
              3 to 5 minute video and we add you to the session before it goes public. Your invitation email
              says where to send it.
            </p>
            <ul className="text-white/80 text-sm list-disc pl-5 space-y-1">
              <li>Five minutes is the hard stop.</li>
              <li>Social media style: the vision and purpose of what you are creating. Save the technical detail for the weeks ahead.</li>
              <li>Film in landscape, with your phone turned sideways. A phone is all you need.</li>
            </ul>
          </div>
        )}

        <p className="text-white/75 mb-5">
          Sessions go up on the SEEDS YouTube channel, so you can catch up before the next one.
        </p>
        <a
          href={SEEDS_YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 min-h-11 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
        >
          <ExternalLink className="w-4 h-4" />
          SEEDS on YouTube
        </a>
      </section>
    </AnimatedSection>
  );
});

const FooterLinks = memo(function FooterLinks({ seasonName }: { seasonName: string }) {
  return (
    <AnimatedSection>
      <div className="flex flex-wrap gap-3 pb-8">
        <a
          href="/season2"
          className="inline-flex items-center gap-2 min-h-11 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
        >
          <Sprout className="w-4 h-4" />
          {seasonName}, and how it works
        </a>
        <a
          href="/schedule"
          className="inline-flex items-center gap-2 min-h-11 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
        >
          <Calendar className="w-4 h-4" />
          Every session, past and upcoming
        </a>
      </div>
    </AnimatedSection>
  );
});

export default function SeasonSchedule() {
  return (
    <PageWrapper>
      <SeasonScheduleBody />
    </PageWrapper>
  );
}

/** Everything typed lives here, under PageWrapper, so a keystroke never re-renders the page frame. */
function SeasonScheduleBody() {
  const { config, data, sessions, scheduled, query, loaded, ready } = useSeasonSchedule(ACTIVE_SEASON, { poll: true });
  const { user, loading: authLoading } = useAuth();
  const season = config.season;
  const mineQuery = trpc.applications.myApplications.useQuery(undefined, { enabled: !!user });
  const minePicks = useMemo(() => {
    const rows = mineQuery.data ?? [];
    const picks: AppliedProjectPick[] = [];
    for (const row of rows) {
      if (!APPLIED_STATUSES.has(row.status ?? "")) continue;
      const pick = appliedPick(row.id, row.projectName);
      if (pick) picks.push(pick);
    }
    return picks;
  }, [mineQuery.data]);
  const publicQuery = trpc.community.activeLandProjects.useQuery(undefined, {
    enabled: !authLoading && (!user || (mineQuery.isFetched && minePicks.length === 0)),
  });
  const projectPicks = useMemo(
    () =>
      minePicks.length > 0
        ? minePicks
        : (publicQuery.data ?? []).flatMap((row) => {
            const pick = appliedPick(row.id, row.projectName);
            return pick ? [pick] : [];
          }),
    [minePicks, publicQuery.data],
  );
  const [voterKey, setVoterKey] = useState("");
  const [mySlots, setMySlots] = useState<SeasonSlotKey[]>([]);
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [link, setLink] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setVoterKey(readVoterKey());
    setMySlots(readStored(voteStorage(season)).split(",").filter(isSeasonSlotKey));
    setName(readStored(NAME_STORAGE));
    setProject(readStored(PROJECT_STORAGE));
    setLink(readStored(LINK_STORAGE));
  }, [season]);

  // Keeps the clock-driven copy current without a reload.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const setSlots = trpc.seasonSchedule.setSlots.useMutation({
    onSuccess: () => { void query.refetch(); },
  });
  const saveProject = trpc.seasonSchedule.setProject.useMutation({
    onSuccess: () => { void query.refetch(); },
  });
  const refetchState = usePersistFn(() => { void query.refetch(); });

  const offered: SeasonSlot[] = useMemo(
    () => data?.offered ?? config.offered.map((o) => seasonSlot(o.key, o.hourPT)),
    [data, config],
  );
  const followsFrom = useMemo(() => (data ? new Date(data.followsFrom) : config.followsFrom), [data, config]);
  const seasonOver = data ? !data.running : false;
  const tally = useMemo(() => new Map((data?.tally ?? []).map((t) => [t.key, t])), [data]);
  const anyVotes = data?.anyVotes ?? false;
  const revealed = data?.revealed ?? false;
  const revealAt = data?.revealNamesAt ?? config.revealNamesAt;
  const decided = data?.decided ?? false;
  // Whether this Season is the one taking applications right now ("Season 2").
  const applyingThisSeason = APPLICATIONS.reviewing && season === `Season ${APPLICATIONS.openSeason}`;
  const leader = anyVotes && data?.leader ? offered.find((o) => o.key === data.leader) ?? null : null;
  const leaderShare = leader ? tally.get(leader.key)?.share ?? 0 : 0;
  // A different time leads and is waiting out its day before the Season moves.
  const movingSoon = decided && !data?.pinned && leader != null && leader.key !== scheduled.key;
  const hasProject = project.trim().length > 0;

  /**
   * The first session each time would hold if it won as things stand. Before
   * the first decision, any session that has not started can take the new
   * time (the next one is decided by the vote); after it, only sessions past
   * the freeze window can.
   */
  const cutoff = decided
    ? now.getTime() + SEASON_FREEZE_HOURS * 3_600_000
    : Math.max(now.getTime(), followsFrom.getTime());
  const firstWeek = offered.map((slot) => firstSessionOn(config, cutoff, slot)).find(Boolean)?.week ?? null;

  // Where the clock change moves the local time, worked out from real dates.
  const shift = useMemo(() => {
    const slot = offered[0];
    if (!slot || firstWeek == null) return null;
    const starts: Date[] = [];
    for (let week = firstWeek; week <= config.weeks.length; week++) {
      const start = seasonSessionStart(config, week, slot);
      if (start) starts.push(start);
    }
    const found = clockShift(starts);
    const blip = clockBlip(starts);
    return {
      lasting: found ? { ...found, change: pacificClockChange(starts[0], found.from) } : null,
      blip,
    };
  }, [offered, firstWeek, config]);

  const upcoming = useMemo(
    () => sessions.filter((s) => s.end.getTime() > now.getTime() && s.status !== "cancelled"),
    [sessions, now],
  );
  const nextUp = upcoming.find((s) => s.start.getTime() > now.getTime()) ?? null;
  const register = data?.register ?? NO_REGISTER;

  // Signed in: attach this browser's vote to the account, so the project's
  // badge shows on the register (ADR-72).
  const linkMyVote = trpc.seasonSchedule.linkMyVote.useMutation();
  const linkedVote = useRef(false);
  useEffect(() => {
    if (!user || !voterKey || linkedVote.current) return;
    linkedVote.current = true;
    linkMyVote.mutate({ season, voterKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, voterKey, season]);
  const publicNotes = data?.publicNotes ?? NO_NOTES;

  function save(slots: SeasonSlotKey[]) {
    if (!voterKey || seasonOver) return;
    writeStored(voteStorage(season), slots.join(","));
    setSlots.mutate({
      season,
      voterKey,
      slots,
      displayName: name.trim() || undefined,
      projectName: project.trim() || undefined,
      projectUrl: link.trim() || undefined,
    });
  }

  // Stable for the memoized slot list; reads the latest picks and names when called.
  const toggleSlot = usePersistFn((key: SeasonSlotKey) => {
    const next = offered
      .map((o) => o.key)
      .filter((k) => (k === key ? !mySlots.includes(k) : mySlots.includes(k)));
    setMySlots(next);
    save(next);
  });

  /**
   * Save the name, project and link on their own, so they reach the register
   * whether or not any hands are up.
   */
  function saveNames(next?: { project?: string; link?: string }) {
    const projectName = next?.project ?? project;
    const projectLink = next?.link ?? link;
    writeStored(NAME_STORAGE, name);
    writeStored(PROJECT_STORAGE, projectName);
    writeStored(LINK_STORAGE, projectLink);
    if (!voterKey || (!name.trim() && !projectName.trim() && !projectLink.trim())) return;
    saveProject.mutate({
      season,
      voterKey,
      displayName: name.trim() || undefined,
      projectName: projectName.trim() || undefined,
      projectUrl: projectLink.trim() || undefined,
    });
  }
  const saveNamesOnBlur = usePersistFn(() => saveNames());

  const chooseProject = usePersistFn((pick: AppliedProjectPick) => {
    setProject(pick.name);
    setLink(pick.href);
    saveNames({ project: pick.name, link: pick.href });
  });

  return (
    <>
      <StillSEO
        title="Season Schedule | ReGen Civics"
        description={`Sign up for ${config.name} and vote on when it meets each week. Tap every time that works for your project; the time most projects can make becomes the Season's time, and it keeps following the vote.`}
        url="https://regencivics.earth/season-schedule"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
          <HeaderSection
            seasonName={config.name}
            ready={ready}
            decided={decided}
            scheduledLabel={scheduled.label}
            nextUp={nextUp}
            followsFrom={followsFrom}
          />

          {/* Signing up for the season (Rye, 2026-10-01): applications roll until
              the crowdpooling round opens, and being accepted is the bar for
              crowdpooling. Outside that window this says what /apply says. */}
          <JoinSeasonSection seasonName={config.name} applyingThisSeason={applyingThisSeason} />

          {/* The vote */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#e3ac4f]/30 p-6 md:p-8 mb-8">
              <VoteIntro ready={ready} decided={decided} followsFrom={followsFrom} revealAt={revealAt} />

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <StillProjectField
                    project={project}
                    picks={projectPicks}
                    onProjectChange={setProject}
                    onPick={chooseProject}
                    onBlur={saveNamesOnBlur}
                  />
                  <label className="block">
                    <span className="block text-white/60 text-sm mb-2">Link to your project (optional)</span>
                    <input
                      type="text"
                      inputMode="url"
                      value={link}
                      maxLength={500}
                      onChange={(e) => setLink(e.target.value)}
                      onBlur={() => saveNames()}
                      placeholder="yourproject.org"
                      className="w-full min-h-11 bg-white/10 border border-white/45 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-white/60 text-sm mb-2">Your name (optional)</span>
                    <input
                      type="text"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => saveNames()}
                      placeholder="Name"
                      className="w-full min-h-11 bg-white/10 border border-white/45 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                    />
                  </label>
                  <p className="text-white/45 text-xs sm:self-end">
                    Add a link and your project joins the public list below, so the cohort can find each other.
                    {seasonOver ? "" : " Your picks save as you tap."}
                  </p>
                  {saveProject.isError && <p className="text-red-300 text-sm sm:col-span-2">{saveProject.error.message}</p>}
                </div>

              <SlotList
                offered={offered}
                tally={tally}
                config={config}
                cutoff={cutoff}
                mySlots={mySlots}
                leaderKey={leader?.key}
                decided={decided}
                scheduledKey={scheduled.key}
                seasonOver={seasonOver}
                anyVotes={anyVotes}
                revealed={revealed}
                canVote={!!voterKey && !setSlots.isPending}
                hasProject={hasProject}
                onToggle={toggleSlot}
              />

              <ShiftNotes shift={shift} rescheduleNote={config.rescheduleNote} />

              <VoteStatus
                loadFailed={query.isError && !loaded}
                decided={decided}
                seasonName={config.name}
                scheduledLabel={scheduled.label}
                leaderLabel={leader?.label ?? null}
                leaderShare={leaderShare}
                hasProject={hasProject}
                seasonOver={seasonOver}
                movingSoon={movingSoon}
                pinned={!!data?.pinned}
                picksSaved={setSlots.isSuccess && mySlots.length > 0}
                saveError={setSlots.isError ? setSlots.error.message : null}
              />
            </section>
          </AnimatedSection>

          {/* The register: the cohort's common ground, like the Circle's list of what everyone brings. */}
          <RegisterSection seasonName={config.name} register={register} />

          {/* The weeks ahead, as scheduled right now */}
          <WeeksSection
            seasonName={config.name}
            ready={ready}
            decided={decided}
            followsFrom={followsFrom}
            loadFailed={query.isError}
            upcoming={upcoming}
          />

          {/* Notes, taken in week by week as the Season runs. The writer decides
              whether each one is shared on the page or kept with the organizers. */}
          <AnimatedSection>
            <section id="notes" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#e3ac4f]/30 p-6 md:p-8 mb-8">
              <NotesIntro nextWeek={data?.nextWeek} notesForNext={data?.notesForNext ?? 0} />
              <NotesForm season={season} name={name} project={project} onSent={refetchState} />
              <PublicNotes notes={publicNotes} />
            </section>
          </AnimatedSection>

          {/* Catching up */}
          <CatchUpSection selectionVideos={!!data?.selectionVideos} />

          <FooterLinks seasonName={config.name} />
        </div>
      </div>
    </>
  );
}
