/**
 * The profile's "Weekly sessions" section under Submissions (Rye, 2026-10-13):
 * every answer, note, question, vote and hand a person gave on a weekly
 * session board, week by week, newest week first, each week linking back to
 * its board. Boards stay open, so a week can keep growing long after its live
 * session.
 *
 * Guest answers arrive through `useClaimGuest`: when this browser holds the
 * board's guest key, the server moves that key's rows to the signed-in person
 * once, then this list reads them. The key itself never reaches this file.
 */
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useClaimGuest } from "@/components/session-board/useSessionBoard";
import { SUBMISSIONS_COPY, weekHeading } from "@shared/boardEntries";
import { hasSessionBoard } from "@shared/sessionBoard";
import { useSeasonSchedule } from "@/hooks/useSeasonSchedule";

/** One week as `sessionBoard.mySubmissions` returns it (API_CONTRACT 3.9). */
export type SubmissionWeek = {
  week: number;
  title: string;
  href: string;
  lastAt: string;
  projects: { cardId: number; name: string; how: "added" | "checked in" }[];
  entries: {
    id: string;
    stage: string | null;
    label: string;
    value: string;
    project: string | null;
    anonymous: boolean;
    at: string;
  }[];
};

/** The empty state's second line: how a guest's answers get here. */
export const GUEST_LINE =
  "Joined as a guest? Open a board in that same browser while signed in and they come with you.";

/** When the list can't load (a rate limit, a dropped connection). */
const LOAD_FAILED = "Your weekly answers didn't load. Try again in a minute.";

/** Under the last stage group, for entries that belong to no one stage. */
const NO_STAGE = "Also this week";

/** The board the empty state points to before the schedule has loaded. */
const EMPTY_LINK_WEEK = 3;

/**
 * The board the empty state points to: the session running now or next on
 * the Season Schedule, else the last one held, so from Week 4 on a newcomer
 * lands on the current week.
 */
export function boardWeekNow(sessions: readonly { week: number; end: Date; status: string }[], now: number): number {
  const live = sessions.filter((x) => x.status !== "cancelled" && hasSessionBoard(x.week));
  const next = live
    .filter((x) => x.status !== "completed" && x.end.getTime() > now)
    .sort((a, b) => a.end.getTime() - b.end.getTime())[0];
  if (next) return next.week;
  const last = live.filter((x) => x.end.getTime() <= now).sort((a, b) => b.end.getTime() - a.end.getTime())[0];
  return last?.week ?? EMPTY_LINK_WEEK;
}

function day(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function countLine(n: number): string {
  return `${n} ${n === 1 ? "answer" : "answers"}`;
}

/** A week's entries in runs of one stage, in the order the server sent them. */
export function groupByStage(entries: SubmissionWeek["entries"]): { stage: string | null; entries: SubmissionWeek["entries"] }[] {
  const out: { stage: string | null; entries: SubmissionWeek["entries"] }[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.stage === e.stage) last.entries.push(e);
    else out.push({ stage: e.stage, entries: [e] });
  }
  return out;
}

/** "You added Toa Hermitage." and "You checked in with Amora, Lupine Hollow." */
export function projectLines(projects: SubmissionWeek["projects"]): string[] {
  const added = projects.filter((p) => p.how === "added").map((p) => p.name);
  const checked = projects.filter((p) => p.how === "checked in").map((p) => p.name);
  const lines: string[] = [];
  if (added.length) lines.push(`${SUBMISSIONS_COPY.added} ${added.join(", ")}.`);
  if (checked.length) lines.push(`${SUBMISSIONS_COPY.checkedIn} ${checked.join(", ")}.`);
  return lines;
}

/** The section itself, from data already loaded. Pure, so it renders the same in a test. */
export function WeeklySessionsView({
  weeks,
  loading = false,
  error = null,
  emptyWeek = EMPTY_LINK_WEEK,
}: {
  weeks: SubmissionWeek[];
  loading?: boolean;
  error?: string | null;
  /** The week the empty state links to. */
  emptyWeek?: number;
}) {
  const sorted = useMemo(() => [...weeks].sort((a, b) => b.week - a.week), [weeks]);
  const [open, setOpen] = useState<Set<number> | null>(null);
  // Until someone taps a heading, the newest week shows open and the rest stay folded.
  const isOpen = (week: number) => (open ? open.has(week) : sorted[0]?.week === week);
  const toggle = (week: number) => {
    const next = new Set(open ?? (sorted[0] ? [sorted[0].week] : []));
    if (next.has(week)) next.delete(week);
    else next.add(week);
    setOpen(next);
  };

  return (
    <div data-testid="weekly-sessions">
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{SUBMISSIONS_COPY.title}</h3>
        <span className="text-white/75 text-xs">({sorted.length})</span>
      </div>
      <p className="text-white/75 text-xs mb-3">{SUBMISSIONS_COPY.lede}</p>

      {loading ? (
        <div className="bg-white/5 rounded-lg px-4 py-5 flex justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-white/60" />
        </div>
      ) : error ? (
        <div className="bg-white/5 rounded-lg px-4 py-5 text-center">
          <p className="text-white/75 text-sm">{error}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white/5 rounded-lg px-4 py-5 text-center">
          <p className="text-white/75 text-sm">{SUBMISSIONS_COPY.empty}</p>
          <p className="text-white/75 text-sm mt-1">{GUEST_LINE}</p>
          <a
            href={weekHeading(emptyWeek).href}
            className="mt-2 inline-flex items-center min-h-11 text-[#7dd87d] text-sm font-medium hover:underline"
          >
            {SUBMISSIONS_COPY.emptyLink.replace("{week}", String(emptyWeek))}
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((w) => {
            const expanded = isOpen(w.week);
            const lines = projectLines(w.projects);
            const bodyId = `weekly-session-${w.week}`;
            return (
              <div key={w.week} className="bg-white/5 border border-white/10 rounded-lg" data-testid="weekly-session-week">
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => toggle(w.week)}
                    aria-expanded={expanded}
                    aria-controls={bodyId}
                    className="min-w-0 flex-1 flex items-start gap-2 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 mt-0.5 text-white/60 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mt-0.5 text-white/60 shrink-0" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-white font-medium text-sm">{w.title}</span>
                      <span className="block text-white/75 text-xs mt-0.5">
                        {countLine(w.entries.length)}
                        {day(w.lastAt) ? ` · Updated ${day(w.lastAt)}` : ""}
                      </span>
                    </span>
                  </button>
                  <a
                    href={w.href}
                    className="inline-flex items-center min-h-11 text-[#1a472a] bg-[#7dd87d] hover:bg-[#9de89d] text-xs px-3 rounded font-medium transition-colors shrink-0"
                  >
                    {SUBMISSIONS_COPY.open}
                  </a>
                </div>

                {expanded && (
                  <div id={bodyId} className="px-4 pb-4 space-y-3">
                    {lines.map((l) => (
                      <p key={l} className="text-white/80 text-sm">{l}</p>
                    ))}
                    {groupByStage(w.entries).map((g, gi) => (
                      <div key={`${g.stage ?? "none"}-${gi}`}>
                        <p className="text-[#7dd87d]/90 text-xs font-semibold uppercase tracking-wider mb-1.5">
                          {g.stage ?? NO_STAGE}
                        </p>
                        <ul className="space-y-1.5">
                          {g.entries.map((e) => (
                            <li key={e.id} className="rounded-md bg-black/10 px-3 py-2">
                              <p className="text-white/75 text-xs">{e.label}</p>
                              <p className="text-white text-sm break-words">{e.value}</p>
                              <p className="text-white/75 text-xs mt-0.5">
                                {e.anonymous ? SUBMISSIONS_COPY.anonymous : e.project ?? SUBMISSIONS_COPY.forRoom}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Mounted in the profile's Submissions tab, which only renders on a person's
 * own profile. Claims this browser's guest answers first, then lists them.
 */
export function SessionSubmissions() {
  const utils = trpc.useUtils();
  const query = trpc.sessionBoard.mySubmissions.useQuery(undefined, { staleTime: 60_000 });
  const schedule = useSeasonSchedule();
  const emptyWeek = useMemo(
    () => (schedule.ready ? boardWeekNow(schedule.sessions, Date.now()) : EMPTY_LINK_WEEK),
    [schedule.ready, schedule.sessions],
  );

  useClaimGuest((r: { moved: number; merged: number }) => {
    void utils.sessionBoard.mySubmissions.invalidate();
    if (r.moved > 0) toast.success(SUBMISSIONS_COPY.claimed);
  });

  return (
    <WeeklySessionsView
      weeks={query.data?.weeks ?? []}
      loading={query.isLoading}
      error={query.isError ? LOAD_FAILED : null}
      emptyWeek={emptyWeek}
    />
  );
}
