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
  LAST_BOARD_WEEK,
  boardStages,
  hasSessionBoard,
  sessionBoardHref,
  sessionMinutes,
  type StageKind,
} from "@shared/sessionBoard";
import { episodeByWeek } from "@shared/season2Curriculum";
import { useSessionBoard } from "@/components/session-board/useSessionBoard";
import {
  Ahead,
  Breath,
  Circle,
  Close,
  Game,
  GetVillageOS,
  Harvest,
  OpenSeason,
  VillageOS,
  Welcome,
  type StageProps,
} from "@/components/session-board/stages";
import "@/components/session-board/session-board.css";

const fmtClock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + ":" + String(s).padStart(2, "0");
};

const WIDE: StageKind[] = ["circle", "harvest", "game"];

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
      <main className="sb-main">
        <div className="sb-stage">
          <h1 className="sb-title">No board for that week</h1>
          <p className="sb-lede">Season 2 has a live board for each week from 2 to {LAST_BOARD_WEEK}.</p>
          <p><Link href={sessionBoardHref(2)} className="sb-link">Open the Week 2 board</Link> or go back to the <Link href="/season2" className="sb-link">Season 2 page</Link>.</p>
        </div>
      </main>
      <div />
    </div>
  );
}

function Board({ week }: { week: number }) {
  const stages = useMemo(() => boardStages(week), [week]);
  const { board, loading, error, serverNow, mine, actions, displayName, setDisplayName } = useSessionBoard(week);
  const facilitator = !!board?.canFacilitate;
  const open = board?.status !== "closed";
  const canWrite = !!board && (open || facilitator);

  // Where this screen is. Everyone follows the room's stage unless they step
  // away to look at another one; "Back to live" brings them back.
  const live = board?.state.stage ?? 0;
  const [view, setView] = useState(0);
  const [following, setFollowing] = useState(true);
  useEffect(() => {
    if (following || facilitator) setView(live);
  }, [live, following, facilitator]);

  const go = useCallback((i: number) => {
    const to = Math.max(0, Math.min(stages.length - 1, i));
    setView(to);
    if (facilitator && open) {
      actions.act({ type: "go", stage: to });
      setFollowing(true);
    } else {
      setFollowing(to === live);
    }
  }, [stages.length, facilitator, open, actions, live]);

  // One clock for the page, in server time.
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 500);
    return () => clearInterval(t);
  }, [serverNow]);

  const [cuesOpen, setCuesOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [view]);

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
  const stage = stages[view];
  const state = board?.state;
  const total = sessionMinutes(state?.plan ?? stages.map((s) => s.min), stages);
  const planFor = (i: number) => state?.plan[i] ?? stages[i].min;
  const stageElapsed = state && view === state.stage && state.stageStartedAt ? now - state.stageStartedAt : null;

  const stageProps: StageProps | null = board
    ? { board, week, stages, index: view, facilitator, canWrite, mine, actions, now, serverNow, go }
    : null;

  return (
    <div className="sb-app">
      <SEO title={`${title} · Live board`} description={`The live board for Season 2, ${title}. Type in your project, your pain points and the growth opportunities you see.`} />
      <header className="sb-top">
        <Link href="/season2" className="sb-mark">
          <span className="sb-mark-name">ReGen Civics</span>
          <span className="sb-mark-sub">Season 2 · Week {week}</span>
        </Link>
        <ol className="sb-rail" aria-label="Session stages">
          {stages.map((s, i) => (
            <li key={s.kind + i} className={[i === view ? "sb-now" : "", i < view ? "sb-done" : "", !facilitator && i === live && i !== view ? "sb-live" : ""].filter(Boolean).join(" ")}>
              <button type="button" className="sb-rail-btn" title={s.name} aria-current={i === view ? "step" : undefined} onClick={() => go(i)}>
                <span className="sb-dot" />
                <span className="sb-lbl">{s.short}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="sb-status">
          {facilitator && open && state && !state.sessionStartedAt ? (
            <button type="button" className="sb-btn sb-small" onClick={() => actions.act({ type: "startSession" })}>Start session</button>
          ) : null}
          <span className="sb-clock" title="Session time">
            {state?.sessionStartedAt ? `${fmtClock(now - state.sessionStartedAt)} of ${total} min` : `${total} min planned`}
          </span>
          <span className={`sb-pill${!open ? "" : facilitator ? " sb-host" : " sb-on"}`}>
            <span className="sb-pill-dot" />
            {!open ? "The week's record" : facilitator ? "You're facilitating" : "Live"}
          </span>
        </div>
      </header>

      <main className="sb-main" ref={mainRef} id="board">
        <section className={`sb-stage${WIDE.includes(stage.kind) ? " sb-wide" : ""}`} aria-label={stage.name}>
          {!open ? <p className="sb-banner">This board is closed and kept as the record of {title}. Browse every stage with the arrows.</p> : null}
          {loading || !stageProps ? (
            <p className="sb-empty">{error ? "The board didn't load. Check your connection and refresh the page." : "Opening the board..."}</p>
          ) : stage.kind === "welcome" ? <Welcome {...stageProps} />
            : stage.kind === "breath" ? <Breath {...stageProps} />
            : stage.kind === "open" ? <OpenSeason {...stageProps} />
            : stage.kind === "villageos" ? <VillageOS {...stageProps} />
            : stage.kind === "circle" ? <Circle {...stageProps} displayName={displayName} setDisplayName={setDisplayName} />
            : stage.kind === "harvest" ? <Harvest {...stageProps} />
            : stage.kind === "game" ? <Game {...stageProps} />
            : stage.kind === "ahead" ? <Ahead {...stageProps} />
            : stage.kind === "getvillageos" ? <GetVillageOS {...stageProps} />
            : <Close {...stageProps} />}
        </section>
      </main>

      <footer className="sb-foot">
        <button type="button" className="sb-btn" disabled={view === 0} onClick={() => go(view - 1)}>← {view > 0 ? stages[view - 1].short : "Back"}</button>
        <div className="sb-foot-mid">
          <span className="sb-foot-stage">{view + 1}. {stage.name}</span>
          <span className={`sb-foot-time${stageElapsed != null && stageElapsed > planFor(view) * 60000 ? " sb-over" : ""}`}>
            {stageElapsed != null ? `${fmtClock(stageElapsed)} of ${planFor(view)} min` : `${planFor(view)} min`}
          </span>
        </div>
        <button type="button" className="sb-btn sb-primary" disabled={view === stages.length - 1} onClick={() => go(view + 1)}>{view < stages.length - 1 ? stages[view + 1].short : "Done"} →</button>
        <div className="sb-foot-tools">
          {!facilitator && view !== live && open ? (
            <button type="button" className="sb-btn sb-ghost" onClick={() => { setFollowing(true); setView(live); }}>Back to live</button>
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
            <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => actions.act({ type: "restartClocks" })}>Restart the clocks</button>
          </div>
          <p className="sb-hint">Keys: ← and → move the room, 1 to {Math.min(9, stages.length)} jump, C shows or hides these cues.</p>
        </aside>
      ) : null}
    </div>
  );
}
