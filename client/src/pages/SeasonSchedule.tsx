/**
 * Season Schedule (/season-schedule)
 *
 * The land projects in a Season pick its weekly time. Each browser raises a
 * hand for every time it can make; when voting closes, the time with the most
 * hands becomes the Season's time for every session more than three days out
 * (shared/seasonSchedule.ts, ADR-64). Reusable for every Season: the page
 * reads ACTIVE_SEASON and that Season's entry in SEASON_SCHEDULES, so its copy
 * stays general and the invitation email carries the story of the moment.
 *
 * Forked from /interop-sessions (Rye, 2026-09-28). The rule differs on
 * purpose: the Circle's time follows its vote week to week, while a cohort's
 * time moves once per round, because land projects plan their weeks around it.
 */

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, ExternalLink, MessageSquare, Sprout, Users, Video, Youtube } from "lucide-react";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { BackButton } from "@/components/BackButton";
import { AnimatedSection } from "@/components/AnimatedSection";
import { LiveFeedNote, SubscribeButtons } from "@/components/CalendarCta";
import { CALENDAR_FEEDS, formatLocalDate, formatLocalDateShort, formatLocalTime, formatStartWithReference } from "@/lib/calendarLinks";
import { trpc } from "@/lib/trpc";
import { useSeasonSchedule } from "@/hooks/useSeasonSchedule";
import { SEEDS_YOUTUBE_URL } from "@shared/sessionLinks";
import {
  ACTIVE_SEASON,
  SEASON_FACILITATION_MAX,
  SEASON_FREEZE_HOURS,
  SEASON_TOPIC_MAX,
  clockShift,
  isSeasonSlotKey,
  listJoin,
  pacificClockChange,
  seasonSessionStart,
  seasonSlot,
  zoneTimes,
  type SeasonSlot,
  type SeasonSlotKey,
} from "@shared/seasonSchedule";

/** One key per browser, shared by every Season: the table is keyed by Season and voter together. */
const VOTER_KEY_STORAGE = "season-voter-key";
const NAME_STORAGE = "season-schedule:name";
const PROJECT_STORAGE = "season-schedule:project";
const LINK_STORAGE = "season-schedule:link";
const voteStorage = (season: string) => `season-schedule:${season}:vote`;

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

function hands(n: number): string {
  return n === 1 ? "1 hand" : `${n} hands`;
}

export default function SeasonSchedule() {
  const { config, data, sessions, scheduled, query, loaded } = useSeasonSchedule(ACTIVE_SEASON, { poll: true });
  const season = config.season;

  const [voterKey, setVoterKey] = useState("");
  const [mySlots, setMySlots] = useState<SeasonSlotKey[]>([]);
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [link, setLink] = useState("");
  const [topic, setTopic] = useState("");
  const [facilitation, setFacilitation] = useState("");
  const [signNote, setSignNote] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setVoterKey(readVoterKey());
    setMySlots(readStored(voteStorage(season)).split(",").filter(isSeasonSlotKey));
    setName(readStored(NAME_STORAGE));
    setProject(readStored(PROJECT_STORAGE));
    setLink(readStored(LINK_STORAGE));
  }, [season]);

  // The page turns from "vote" to "result" at the close without a reload.
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
  const sendFeedback = trpc.seasonSchedule.sendFeedback.useMutation({
    onSuccess: () => {
      setTopic("");
      setFacilitation("");
      void query.refetch();
    },
  });

  const offered: SeasonSlot[] = useMemo(
    () => data?.offered ?? config.offered.map((o) => seasonSlot(o.key, o.hourPT)),
    [data, config],
  );
  const closesAt = useMemo(() => (data ? new Date(data.closesAt) : config.closesAt), [data, config]);
  // The server enforces the close; the browser clock only decides what to show.
  const closed = data?.closed || now.getTime() >= closesAt.getTime();
  const tally = useMemo(() => new Map((data?.tally ?? []).map((t) => [t.key, t])), [data]);
  const voters = data?.voters ?? 0;
  const leader = data?.leader ? offered.find((o) => o.key === data.leader) ?? null : null;
  const leaderTally = leader ? tally.get(leader.key) : undefined;

  /**
   * The first session each time would hold if voting closed as it stands: the
   * first week whose session on that time starts after the close plus the
   * freeze window. Earlier weeks keep the time they have.
   */
  const cutoff = Math.max(now.getTime(), closesAt.getTime()) + SEASON_FREEZE_HOURS * 3_600_000;
  const firstOn = (slot: SeasonSlot): { week: number; start: Date } | null => {
    for (let week = 1; week <= config.weeks.length; week++) {
      const start = seasonSessionStart(config, week, slot);
      if (start && start.getTime() > cutoff) return { week, start };
    }
    return null;
  };
  const firstWeek = offered.map(firstOn).find(Boolean)?.week ?? null;

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
    if (!found) return null;
    return { ...found, change: pacificClockChange(starts[0], found.from) };
  }, [offered, firstWeek, config]);

  const upcoming = sessions.filter((s) => s.end.getTime() > now.getTime() && s.status !== "cancelled");
  const nextUp = upcoming.find((s) => s.start.getTime() > now.getTime()) ?? null;
  const register = data?.register ?? [];

  function save(slots: SeasonSlotKey[]) {
    if (!voterKey || closed) return;
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

  function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() && !facilitation.trim()) return;
    sendFeedback.mutate({
      season,
      topic: topic.trim() || undefined,
      facilitation: facilitation.trim() || undefined,
      displayName: signNote ? name.trim() || undefined : undefined,
      projectName: signNote ? project.trim() || undefined : undefined,
    });
  }

  function toggleSlot(key: SeasonSlotKey) {
    const next = offered
      .map((o) => o.key)
      .filter((k) => (k === key ? !mySlots.includes(k) : mySlots.includes(k)));
    setMySlots(next);
    save(next);
  }

  /**
   * Save the name, project and link on their own, so they reach the register
   * whether or not any hands are up, and after voting closes too.
   */
  function saveNames() {
    writeStored(NAME_STORAGE, name);
    writeStored(PROJECT_STORAGE, project);
    writeStored(LINK_STORAGE, link);
    if (!voterKey || (!name.trim() && !project.trim() && !link.trim())) return;
    saveProject.mutate({
      season,
      voterKey,
      displayName: name.trim() || undefined,
      projectName: project.trim() || undefined,
      projectUrl: link.trim() || undefined,
    });
  }

  return (
    <PageWrapper>
      <SEO
        title="Season Schedule | ReGen Civics"
        description={`The land projects pick when ${config.name} meets each week. Tap every time that works for your project; when voting closes, the time with the most hands becomes the Season's time.`}
        url="https://regencivics.earth/season-schedule"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#14301f] to-[#0d2818]">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-16">
          <BackButton />

          <AnimatedSection>
            <header className="mt-6 mb-12">
              <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-3">
                Season Schedule · {config.name}
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                {closed ? `${config.name} meets ${scheduled.label}` : `Pick the time ${config.name} meets`}
              </h1>
              <p className="text-white/75 text-lg max-w-2xl">
                {closed
                  ? "The land projects picked this time. Every session below runs at it, and the calendar feed already carries it."
                  : "The land projects choose the weekly time. Tap every time your project can make, as many as work. When voting closes, the time with the most hands becomes the Season's time."}
              </p>

              {nextUp && (
                <div className="mt-8 bg-[#7dd87d]/15 border border-[#7dd87d]/40 rounded-xl p-5 max-w-2xl">
                  <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase mb-1">Next session</p>
                  <p className="text-white font-bold text-lg">{nextUp.title ?? `Week ${nextUp.week}`}</p>
                  <p className="text-white/80">
                    {formatLocalDate(nextUp.start)}, {formatStartWithReference(nextUp.start)}
                  </p>
                  {!closed && firstWeek != null && nextUp.week < firstWeek && (
                    <p className="text-white/65 text-sm mt-2">
                      This one keeps its current time. The time the projects pick starts with Week {firstWeek}.
                    </p>
                  )}
                </div>
              )}
            </header>
          </AnimatedSection>

          {/* The vote */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#e3ac4f]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-[#e3ac4f]" />
                <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">
                  {closed ? "How the vote landed" : "Live vote"}
                </p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {closed ? "The times on offer" : "Tap every time your project can make"}
              </h2>
              <p className="text-white/75 mb-6">
                {closed
                  ? `Voting closed ${pacificWhen(closesAt)}.`
                  : `Voting closes ${pacificWhen(closesAt)}. Until then every session stays where it is${firstWeek ? `, and the winning time starts with Week ${firstWeek}` : ""}. Change your picks as often as you like before the close.`}
              </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <label className="block">
                    <span className="block text-white/60 text-sm mb-2">Your land project (optional)</span>
                    <input
                      type="text"
                      value={project}
                      maxLength={120}
                      onChange={(e) => setProject(e.target.value)}
                      onBlur={saveNames}
                      placeholder="Project name"
                      className="w-full min-h-11 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-white/60 text-sm mb-2">Link to your project (optional)</span>
                    <input
                      type="text"
                      inputMode="url"
                      value={link}
                      maxLength={500}
                      onChange={(e) => setLink(e.target.value)}
                      onBlur={saveNames}
                      placeholder="yourproject.org"
                      className="w-full min-h-11 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-white/60 text-sm mb-2">Your name (optional)</span>
                    <input
                      type="text"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={saveNames}
                      placeholder="Name"
                      className="w-full min-h-11 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
                    />
                  </label>
                  <p className="text-white/45 text-xs sm:self-end">
                    Your project and link go on the public list below, so the cohort can find each other.
                    {closed ? "" : " Your hands save as you tap."}
                  </p>
                  {saveProject.isError && <p className="text-red-300 text-sm sm:col-span-2">{saveProject.error.message}</p>}
                </div>

              <div className="space-y-4">
                {offered.map((slot) => {
                  const t = tally.get(slot.key);
                  const count = t?.hands ?? 0;
                  const projects = t?.projects ?? 0;
                  const pct = voters > 0 ? Math.round((count / voters) * 100) : 0;
                  const first = firstOn(slot);
                  const isMine = mySlots.includes(slot.key);
                  const isLeader = !closed && leader?.key === slot.key && count > 0;
                  const isChosen = closed && scheduled.key === slot.key;
                  return (
                    <div
                      key={slot.key}
                      className={`rounded-xl border p-5 transition-colors ${
                        isMine || isChosen ? "border-[#7dd87d] bg-[#7dd87d]/10" : "border-white/15 bg-white/5"
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
                                Leading
                              </span>
                            )}
                            {isChosen && (
                              <span className="text-[#1a472a] bg-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">
                                Chosen
                              </span>
                            )}
                          </div>
                          {first && !closed && (
                            <p className="text-white/55 text-sm mt-1">
                              Week {first.week} would meet {pacificDay(first.start)}.
                            </p>
                          )}
                        </div>
                        {!closed && (
                          <button
                            type="button"
                            onClick={() => toggleSlot(slot.key)}
                            disabled={!voterKey || setSlots.isPending}
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
                          <div className="h-full bg-[#e3ac4f] transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-white/60 text-sm tabular-nums whitespace-nowrap">
                          {hands(count)}
                          {projects > 0 ? ` · ${projects === 1 ? "1 project" : `${projects} projects`}` : ""}
                        </span>
                      </div>
                      {t && t.names.length > 0 && (
                        <p className="text-white/50 text-xs mt-2">{t.names.join(", ")}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {shift && shift.change && (
                <p className="text-white/60 text-sm mt-5">
                  US clocks change on {pacificDay(shift.change)}. Each session keeps its Pacific time, so from
                  then it starts an hour {shift.later ? "later" : "earlier"} in {listJoin(shift.zones)}.
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                {query.isError && !loaded && (
                  <p className="text-red-300 text-sm">The vote did not load. Try again in a minute.</p>
                )}
                {!closed && (
                  <p className="text-white/75">
                    {leader && leaderTally
                      ? <>Leading right now: <span className="text-white font-semibold">{leader.label}</span>, with {hands(leaderTally.hands)}{leaderTally.projects > 0 ? ` from ${leaderTally.projects === 1 ? "1 project" : `${leaderTally.projects} projects`}` : ""}.</>
                      : <>No hands up yet. The first ones set the lead.</>}
                  </p>
                )}
                {closed && (
                  <p className="text-white/75">
                    {config.name} meets <span className="text-white font-semibold">{scheduled.label}</span>.
                  </p>
                )}
                {data?.pinned && (
                  <p className="text-white/50 text-sm">The organizers have set this time. The vote keeps its count.</p>
                )}
                {setSlots.isSuccess && !closed && mySlots.length > 0 && (
                  <p className="inline-flex items-center gap-2 text-[#7dd87d] text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Saved. You can change your picks until voting closes.
                  </p>
                )}
                {setSlots.isError && <p className="text-red-300 text-sm">{setSlots.error.message}</p>}
              </div>
            </section>
          </AnimatedSection>

          {/* The register: the cohort's common ground, like the Circle's list of what everyone brings. */}
          {register.length > 0 && (
            <AnimatedSection>
              <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-[#7dd87d]" />
                  <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">Who is in the room</p>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">The projects in {config.name}</h2>
                <p className="text-white/75 mb-5">
                  Every project that has shared its name or a link. Open each other's work before the next session.
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
                    </li>
                  ))}
                </ul>
              </section>
            </AnimatedSection>
          )}

          {/* The weeks ahead, as scheduled right now */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#7dd87d]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-[#7dd87d]" />
                <p className="text-[#7dd87d] text-xs font-semibold tracking-[0.2em] uppercase">The weeks ahead</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Every session still to come</h2>
              <p className="text-white/75 mb-5">
                In your own time zone. When the vote moves the Season, this list and the calendar feed move with it.
              </p>
              {upcoming.length === 0 ? (
                <p className="text-white/60">{config.name} has finished. Thank you for building it with us.</p>
              ) : (
                <ol className="divide-y divide-white/10 mb-6">
                  {upcoming.map((s) => (
                    <li key={s.week} className="py-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <span className="text-white font-medium">{s.title ?? `Week ${s.week}`}</span>
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

          {/* Notes for the organizers, taken in week by week as the Season runs. */}
          <AnimatedSection>
            <section id="notes" className="bg-white/5 backdrop-blur-sm rounded-2xl border border-[#e3ac4f]/30 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-5 h-5 text-[#e3ac4f]" />
                <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Your notes</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Help shape the next session</h2>
              <p className="text-white/75 mb-2">
                Tell us what you want to dig into{data?.nextWeek ? ` at Week ${data.nextWeek}` : " next"}, and how the
                facilitation is working for you. Every note goes to the organizers, and we read them before each session.
              </p>
              <p className="text-white/55 text-sm mb-5">
                Only the organizers see these. Leave it unsigned and it stays anonymous.
                {data && data.notesForNext > 0
                  ? ` ${data.notesForNext === 1 ? "1 note is" : `${data.notesForNext} notes are`} in for Week ${data.nextWeek} so far.`
                  : ""}
              </p>
              {sendFeedback.isSuccess && (
                <p className="inline-flex items-center gap-2 text-[#7dd87d] font-semibold mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  Thank you. {sendFeedback.data?.week ? `It is in for Week ${sendFeedback.data.week}.` : "It is in."}
                </p>
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
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
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
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e3ac4f]"
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
                <button
                  type="submit"
                  disabled={sendFeedback.isPending || (!topic.trim() && !facilitation.trim())}
                  className="inline-flex items-center justify-center gap-2 min-h-11 bg-[#e3ac4f] hover:bg-[#edc27a] text-[#1a472a] px-5 py-2 rounded-xl font-semibold transition-colors text-sm disabled:opacity-60"
                >
                  {sendFeedback.isPending ? "Sending..." : "Send to the organizers"}
                </button>
                {sendFeedback.isError && <p className="text-red-300 text-sm">{sendFeedback.error.message}</p>}
              </form>
            </section>
          </AnimatedSection>

          {/* Catching up */}
          <AnimatedSection>
            <section className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Youtube className="w-5 h-5 text-[#e3ac4f]" />
                <p className="text-[#e3ac4f] text-xs font-semibold tracking-[0.2em] uppercase">Catching up</p>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">If you missed a session</h2>

              {/* Selection Day stays private until every project is in it (Rye,
                  2026-09-28). The address rides in the invitation email, not on
                  this public page. An admin hides this once it goes public. */}
              {data?.selectionVideos && (
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

          <AnimatedSection>
            <div className="flex flex-wrap gap-3 pb-8">
              <a
                href="/season2"
                className="inline-flex items-center gap-2 min-h-11 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
              >
                <Sprout className="w-4 h-4" />
                {config.name}, and how it works
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
        </div>
      </div>
    </PageWrapper>
  );
}
