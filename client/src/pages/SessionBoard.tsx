/**
 * Session board (/season2/week/:week, ADR-68)
 *
 * The live board for one weekly Season 2 episode, shared on screen and open on
 * everyone's own device at once. The facilitator moves the room from stage to
 * stage; everyone else follows along live and types in: an arrival word, their
 * project's card, pain points, growth opportunities, three votes, notes on the
 * game canvas, a hand for the weeks they'll join, a closing word. What lands
 * here stays as the week's record, the Season's own memory.
 *
 * Rye, 2026-10-01: "put this on the site so people could actually type in ...
 * and we can start using that information in our game and system and storing
 * our own seasonal memory". Week 2 is the first board.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { SEO } from "@/components/SEO";
import {
  BOARD_LIMITS,
  LAST_BOARD_WEEK,
  boardStages,
  hasSessionBoard,
  sessionBoardHref,
  followingAfterStageChoice,
  keepsFollowingRoom,
  sessionClosedAt,
  sessionElapsedMs,
  sessionMinutes,
  type BoardState,
  type StageKind,
} from "@shared/sessionBoard";
import { useBoardClock, useServerTimePassed } from "@/components/session-board/useBoardClock";
import { useSeasonSchedule } from "@/hooks/useSeasonSchedule";
import { episodeByWeek } from "@shared/season2Curriculum";
import { useSessionBoard } from "@/components/session-board/useSessionBoard";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Ahead,
  Breath,
  CheckIn,
  Circle,
  Close,
  Game,
  GetVillageOS,
  Harvest,
  NeedsStage,
  OpenSeason,
  PromptStage,
  Together,
  VillageOS,
  Welcome,
  type StageProps,
} from "@/components/session-board/stages";
import "@/components/session-board/session-board.css";
import { CoursePlayer, CourseSprout, useWeekCourse } from "@/components/session-board/CoursePlayer";
import { SessionRecap } from "@/components/session-board/SessionRecap";
import { showSessionRecap } from "@shared/weekRecap";

function boardDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const fmtClock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + ":" + String(s).padStart(2, "0");
};

/** The header clock: session time against the plan, ticking on its own. */
function SessionClock({ state, plannedMs, total, serverNow, closedAt }: {
  state: BoardState | undefined;
  plannedMs: number;
  total: number;
  serverNow: () => number;
  closedAt: number | null;
}) {
  const now = useBoardClock(serverNow, !!state?.sessionStartedAt && closedAt == null);
  const elapsed = state ? sessionElapsedMs(state, plannedMs, closedAt ?? now) : null;
  return (
    <span className="sb-clock" title="Session time">
      {elapsed != null ? `${fmtClock(elapsed)} of ${total} min` : `${total} min planned`}
    </span>
  );
}

/** The footer clock: time on the stage on screen, when it is the live one. */
function StageClock({ state, view, planMin, serverNow, closedAt }: {
  state: BoardState | undefined;
  view: number;
  planMin: number;
  serverNow: () => number;
  closedAt: number | null;
}) {
  const startedAt = state && view === state.stage ? state.stageStartedAt : null;
  const now = useBoardClock(serverNow, !!startedAt && closedAt == null);
  const stageElapsed = startedAt ? (closedAt ?? now) - startedAt : null;
  const planMs = planMin * 60_000;
  const stageOver = stageElapsed != null && stageElapsed > planMs;
  const label = stageElapsed == null
    ? `${planMin} min`
    : stageOver && !closedAt
      ? `over by ${fmtClock(stageElapsed - planMs)}`
      : stageOver
        ? `${planMin} min`
        : `${fmtClock(stageElapsed)} of ${planMin} min`;
  return <span className={`sb-foot-time${stageOver && !closedAt ? " sb-over" : ""}`}>{label}</span>;
}

const WIDE: StageKind[] = ["circle", "harvest", "game", "checkin", "needs"];

/** A text field on the stage has focus: someone is typing there right now. */
function typingOnStage(root: HTMLElement | null): boolean {
  if (!root || typeof document === "undefined") return false;
  const a = document.activeElement as HTMLElement | null;
  if (!a || !root.contains(a)) return false;
  if (a.tagName === "TEXTAREA" || a.isContentEditable) return true;
  if (a.tagName !== "INPUT") return false;
  const type = (a as HTMLInputElement).type;
  return type === "text" || type === "search" || type === "" || type === "email" || type === "url";
}

export default function SessionBoard() {
  const params = useParams<{ week: string }>();
  const week = Number(params.week);
  if (!hasSessionBoard(week)) return <NoBoard />;
  return <Board week={week} />;
}

function NoBoard() {
  return (
    <div className="sb-app">
      <div />
      <section className="sb-main" aria-label="Week board">
        <div className="sb-stage">
          <h1 className="sb-title">No board for that week</h1>
          <p className="sb-lede">Season 2 has a live board for each week from 2 to {LAST_BOARD_WEEK}.</p>
          <p><Link href={sessionBoardHref(2)} className="sb-link">Open the Week 2 board</Link> or go back to the <Link href="/season2" className="sb-link">Season 2 page</Link>.</p>
        </div>
      </section>
      <div />
    </div>
  );
}

function Board({ week }: { week: number }) {
  const stages = useMemo(() => boardStages(week), [week]);
  const { board, loading, error, serverNow, mine, actions, displayName, setDisplayName, myProject, setMyProject } = useSessionBoard(week);
  const { user } = useAuth();
  const signedIn = !!user;
  const facilitator = !!board?.canFacilitate;
  const open = board?.status !== "closed";
  const canWrite = !!board && (open || facilitator);

  // Where this screen is. Everyone follows the room's stage unless they step
  // away to look at another one; "Back to live" brings them back.
  const live = board?.state.stage ?? 0;
  const [view, setView] = useState(0);
  const [following, setFollowing] = useState(true);
  // A facilitator who taps "Tap your project" or "Go back" looks at another
  // stage on this screen only; the room stays where it is until they move it.
  const [looking, setLooking] = useState(false);

  // While someone types on a stage, the room moving on never pulls the screen
  // (and their words) away; a bar offers to go there instead.
  const [held, setHeld] = useState(false);
  // Set by look(): the next stage shown gets focus on its heading, since the
  // button that moved there (Change, Tap your project, Go to ...) is gone.
  const focusStage = useRef(false);

  const go = useCallback((i: number) => {
    const to = Math.max(0, Math.min(stages.length - 1, i));
    // A facilitator only looking at another stage moves this screen alone:
    // the arrows, keys and rail never yank the room from there.
    // Arriving back on the room's own stage ends the looking.
    if (facilitator && looking) {
      setView(to);
      if (to === live) {
        setLooking(false);
        setFollowing(true);
      }
      return;
    }
    setView(to);
    const plan = board?.state.plan ?? stages.map((s) => s.min);
    const planned = sessionMinutes(plan, stages) * 60_000;
    const ended = board ? sessionClosedAt(board.state, planned, Date.now()) != null : false;
    setLooking(false);
    if (facilitator && open) {
      actions.act({ type: "go", stage: to });
    }
    setFollowing(followingAfterStageChoice({
      boardLoaded: !!board,
      sessionEnded: ended,
      facilitator: facilitator && open,
      chosen: to,
      liveStage: live,
    }));
  }, [stages, facilitator, open, actions, live, board, looking]);

  // This screen only, never the room (contract check 8).
  const look = useCallback((i: number) => {
    focusStage.current = true;
    setView(Math.max(0, Math.min(stages.length - 1, i)));
    setFollowing(false);
    setLooking(true);
  }, [stages.length]);
  const backToLive = useCallback(() => {
    setFollowing(true);
    setLooking(false);
    setHeld(false);
    setView(live);
  }, [live]);

  const [cuesOpen, setCuesOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    if (!focusStage.current) return;
    focusStage.current = false;
    const h = mainRef.current?.querySelector<HTMLElement>(".sb-stage h1, .sb-stage h2");
    if (h) {
      if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }
  }, [view]);
  // The phone rail scrolls inside itself. Keep the stage people are on in that window.
  useEffect(() => {
    const rail = railRef.current;
    const btn = rail?.querySelector<HTMLElement>(":scope > li.sb-now > .sb-rail-btn");
    if (!rail || !btn) return;
    const railBox = rail.getBoundingClientRect();
    const btnBox = btn.getBoundingClientRect();
    if (btnBox.left >= railBox.left - 1 && btnBox.right <= railBox.right + 1) return;
    rail.scrollLeft += btnBox.left - railBox.left - (railBox.width - btnBox.width) / 2;
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(view + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(view - 1); }
      else if ((e.key === "c" || e.key === "C") && facilitator) setCuesOpen((v) => !v);
      else if (e.key === "Escape") setCuesOpen(false);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= stages.length) go(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, view, facilitator, stages.length]);

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const canFullscreen = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  const ep = episodeByWeek(week);
  const title = ep ? `Week ${week}: ${ep.title}` : `Week ${week}`;
  const course = useWeekCourse(week, stages.length);
  const watched = new Set(course.progress.watched);
  const stage = stages[view];
  const state = board?.state;
  const total = sessionMinutes(state?.plan ?? stages.map((s) => s.min), stages);
  const planFor = (i: number) => state?.plan[i] ?? stages[i].min;
  const plannedMs = total * 60_000;
  // A running session also ends on its own once the planned length has
  // passed: one timer for that moment. The clocks tick in their own
  // components (SessionClock, StageClock, the share timer), so the board and
  // the stage people type on no longer re-render twice a second.
  const plannedEnd = state?.sessionStartedAt && !state.endedAt ? state.sessionStartedAt + Math.max(0, plannedMs) : null;
  const pastPlannedEnd = useServerTimePassed(serverNow, plannedEnd);
  const closedAt = state ? sessionClosedAt(state, plannedMs, pastPlannedEnd && plannedEnd != null ? plannedEnd : serverNow()) : null;
  useEffect(() => {
    if (!keepsFollowingRoom({
      boardLoaded: !!board,
      sessionEnded: closedAt != null,
      facilitator: facilitator && !looking,
      following,
    })) return;
    if (!facilitator && view !== live && typingOnStage(mainRef.current)) {
      setHeld(true);
      return;
    }
    setHeld(false);
    setView(live);
    // view is read, never a trigger: a follower's own tap is handled by go().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, closedAt, facilitator, looking, following, live]);
  const schedule = useSeasonSchedule();
  const nextSession = useMemo(() => {
    if (!closedAt || !schedule.ready) return null;
    return schedule.sessions
      .filter((s) => s.status !== "cancelled" && s.status !== "completed" && s.start.getTime() > closedAt)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;
  }, [closedAt, schedule.ready, schedule.sessions]);
  const planMin = planFor(view);
  const endedDate = closedAt ? boardDate(state?.sessionStartedAt ?? closedAt) : null;
  const sessionEnded = closedAt != null || !open;
  const showRecap = showSessionRecap(view, sessionEnded && !!board);
  const stageName = (index: number) => (showSessionRecap(index, sessionEnded && !!board) ? "Recap" : stages[index].name);
  const stageShort = (index: number) => (showSessionRecap(index, sessionEnded && !!board) ? "Recap" : stages[index].short);

  const stageProps: StageProps | null = board
    ? {
      board, week, stages, index: view, facilitator, canWrite, mine, actions, serverNow, go,
      myProject, setMyProject, displayName, setDisplayName, signedIn, look,
    }
    : null;
  // A week with a check-in stage (Week 3 on) keeps its Welcome under the Recap,
  // so people going at their own pace still read the Part 1 of 2 framing.
  const promptWeek = stages.some((s) => s.kind === "checkin");
  const sessionRunning = !!state?.sessionStartedAt && !closedAt;

  return (
    // sb-prompt-week carries the readability fixes (44px targets, field
    // outlines at 3:1) to Week 3 on, and leaves Week 2's board as it ran.
    <div className={`sb-app${promptWeek ? " sb-prompt-week" : ""}`}>
      <SEO title={`${title} · Live board`} description={`The live board for Season 2, ${title}. Type in your project, your pain points and the growth opportunities you see.`} />
      <header className="sb-top">
        <Link href="/season2" className="sb-mark">
          <span className="sb-mark-name">ReGen Civics</span>
          <span className="sb-mark-sub">Season 2 · Week {week}</span>
        </Link>
        <div className="sb-rail-wrap">
          <p className="sb-rail-current">{stageName(view)}</p>
          <ol className="sb-rail" aria-label="Session stages" ref={railRef}>
            {stages.map((s, i) => (
              <li key={s.kind + i} className={[i === view ? "sb-now" : "", i < view ? "sb-done" : "", (!facilitator || looking) && !sessionEnded && i === live && i !== view ? "sb-live" : "", watched.has(i) ? "sb-sprout" : ""].filter(Boolean).join(" ")}>
                <button type="button" className="sb-rail-btn" title={stageName(i)} aria-label={watched.has(i) ? `${stageName(i)}, watched` : stageName(i)} aria-current={i === view ? "step" : undefined} onClick={() => go(i)}>
                  {watched.has(i) ? <CourseSprout /> : null}
                  <span className="sb-dot" />
                  <span className="sb-lbl">{stageShort(i)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="sb-status">
          {facilitator && open && state && !state.sessionStartedAt ? (
            <button type="button" className="sb-btn sb-small" onClick={() => actions.act({ type: "startSession" })}>Start session</button>
          ) : null}
          {facilitator && open && state?.sessionStartedAt && !closedAt ? (
            <button type="button" className="sb-btn sb-small" onClick={() => actions.act({ type: "endSession" })}>End session</button>
          ) : null}
          <SessionClock state={state} plannedMs={plannedMs} total={total} serverNow={serverNow} closedAt={closedAt} />
          <span className={`sb-pill${!open || closedAt ? "" : facilitator ? " sb-host" : " sb-on"}`}>
            <span className="sb-pill-dot" />
            {!open ? "The week's record" : endedDate ? `Ended ${endedDate}` : facilitator ? "You're facilitating" : "Live"}
          </span>
        </div>
      </header>

      <section className="sb-main" ref={mainRef} id="board" aria-label="Week board">
        <section className={`sb-stage${WIDE.includes(stage.kind) ? " sb-wide" : ""}`} aria-label={stageName(view)}>
          {!open ? <p className="sb-banner">This board is closed and kept as the record of {title}. Browse every stage with the arrows.</p> : null}
          {held && following && view !== live && !sessionEnded ? (
            <p className="sb-banner" role="status">
              The room moved to {stageName(live)}.{" "}
              <button type="button" className="sb-btn sb-small" onClick={backToLive}>Go there</button>
            </p>
          ) : null}
          {open && endedDate ? (
            <p className="sb-banner">
              This session ended {endedDate}.{nextSession ? ` Next session: Week ${nextSession.week}, ${boardDate(nextSession.start.getTime())}.` : ""}
            </p>
          ) : null}
          {showRecap ? null : (
            <CoursePlayer
              week={week}
              stageIndex={view}
              stages={stages}
              map={course.map}
              progress={course.progress}
              setMode={course.setMode}
              markWatched={course.markWatched}
              onGo={go}
            />
          )}
          {loading || !stageProps ? (
            <p className="sb-empty">{error ? "The board didn't load. Check your connection and refresh the page." : "Opening the board..."}</p>
          ) : showRecap ? (
            <>
              <SessionRecap week={week} />
              {promptWeek ? <Welcome {...stageProps} /> : null}
            </>
          )
            : stage.kind === "welcome" ? <Welcome {...stageProps} />
            : stage.kind === "breath" ? <Breath {...stageProps} />
            : stage.kind === "open" ? <OpenSeason {...stageProps} />
            : stage.kind === "villageos" ? <VillageOS {...stageProps} />
            : stage.kind === "together" ? <Together {...stageProps} />
            : stage.kind === "circle" ? <Circle {...stageProps} />
            : stage.kind === "harvest" ? <Harvest {...stageProps} />
            : stage.kind === "game" ? <Game {...stageProps} />
            : stage.kind === "ahead" ? <Ahead {...stageProps} />
            : stage.kind === "getvillageos" ? <GetVillageOS {...stageProps} />
            : stage.kind === "checkin" ? <CheckIn {...stageProps} />
            : stage.kind === "prompt" ? <PromptStage {...stageProps} />
            : stage.kind === "needs" ? <NeedsStage {...stageProps} />
            : <Close {...stageProps} />}
        </section>
      </section>

      <footer className="sb-foot">
        <button type="button" className="sb-btn" disabled={view === 0} onClick={() => go(view - 1)}>← {view > 0 ? stageShort(view - 1) : "Back"}</button>
        <div className="sb-foot-mid">
          <span className="sb-foot-stage">{view + 1}. {stageName(view)}</span>
          <StageClock state={state} view={view} planMin={planMin} serverNow={serverNow} closedAt={closedAt} />
        </div>
        <button type="button" className="sb-btn sb-primary" disabled={view === stages.length - 1} onClick={() => go(view + 1)}>{view < stages.length - 1 ? stageShort(view + 1) : "Done"} →</button>
        <div className="sb-foot-tools">
          {(!facilitator || looking) && view !== live && open && !sessionEnded ? (
            <button type="button" className="sb-btn sb-ghost" onClick={backToLive}>Back to live</button>
          ) : null}
          {facilitator ? (
            <button type="button" className="sb-btn sb-ghost" aria-expanded={cuesOpen} aria-controls="sb-cues" onClick={() => setCuesOpen((v) => !v)}>Cues</button>
          ) : null}
          {canFullscreen ? (
            <button type="button" className="sb-btn sb-ghost" onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
              else void document.documentElement.requestFullscreen().catch(() => {});
            }}>{fullscreen ? "Exit full screen" : "Full screen"}</button>
          ) : null}
        </div>
      </footer>

      {facilitator && cuesOpen ? (
        <aside className="sb-cues" id="sb-cues" aria-label="Facilitator cues">
          <div className="sb-cues-head">
            <p className="sb-kicker">Cues · {stage.name}</p>
            <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => setCuesOpen(false)}>Hide</button>
          </div>
          <ul>{stage.cues.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="sb-row">
            {open && sessionRunning ? (
              <button
                type="button"
                className="sb-btn sb-small"
                aria-label={`Add five minutes to ${stages[live]?.name ?? "this stage"}`}
                disabled={planFor(live) >= BOARD_LIMITS.maxStageMinutes}
                onClick={() => actions.act({ type: "plan", stage: live, minutes: Math.min(BOARD_LIMITS.maxStageMinutes, planFor(live) + 5) })}
              >
                +5 min
              </button>
            ) : null}
            <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => actions.act({ type: "restartClocks" })}>Restart the clocks</button>
          </div>
          {open && sessionRunning ? <p className="sb-hint">+5 min goes to the stage the room is on: {stages[live]?.name}, now {planFor(live)} min.</p> : null}
          <p className="sb-hint">Keys: ← and → move the room, 1 to {Math.min(9, stages.length)} jump, C shows or hides these cues.</p>
        </aside>
      ) : null}
    </div>
  );
}
