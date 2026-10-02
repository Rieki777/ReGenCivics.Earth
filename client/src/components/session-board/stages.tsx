/**
 * The stages of a live session board (ADR-68). Each one is a screen the room
 * moves through together; anyone can type into it, and the facilitator runs it.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CROWDPOOL_READINESS } from "@shared/crowdpoolReadiness";
import { SEASON2_CURRICULUM } from "@shared/season2Curriculum";
import {
  BOARD_LIMITS,
  BREATH_KEYS,
  BREATH_PATTERNS,
  BREATH_ROUNDS,
  GAME_BLOCKS,
  LAST_BOARD_WEEK,
  OPPORTUNITY_THEMES,
  PROJECT_PHASES,
  boardWelcome,
  breathAt,
  sessionBoardHref,
  sessionMinutes,
  shareTime,
  type BoardStage,
} from "@shared/sessionBoard";
import { AMORA_CIRCLES_EMBED_URL, AMORA_CIRCLES_URL, AMORA_VILLAGE_URL, VILLAGE_OS_OFFER, VILLAGE_OS_PATH } from "@shared/villageOsOffer";
import { trpc } from "@/lib/trpc";
import type { BoardActions, BoardItem, BoardProject, Mine, SessionBoardData } from "./useSessionBoard";

export type StageProps = {
  board: SessionBoardData;
  week: number;
  stages: BoardStage[];
  index: number;
  facilitator: boolean;
  /** Participants can add to the board (it is open), or this viewer facilitates. */
  canWrite: boolean;
  mine: Mine;
  actions: BoardActions;
  now: number;
  serverNow: () => number;
  go: (i: number) => void;
};

const THEME_TITLE: Record<string, string> = Object.fromEntries(OPPORTUNITY_THEMES.map((t) => [t.key, t.title]));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmt = (secs: number) => {
  const t = Math.max(0, Math.floor(secs));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + ":" + String(s).padStart(2, "0");
};

function StageHead({ stages, index, title, lede, children }: { stages: BoardStage[]; index: number; title: string; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="sb-head">
      <p className="sb-kicker">Stage {index + 1} of {stages.length} · {stages[index].min} min</p>
      <h2 className="sb-title">{title}</h2>
      {lede ? <p className="sb-lede">{lede}</p> : null}
      {children}
    </header>
  );
}

/** One input that adds a note on Enter. */
function QuickAdd({ placeholder, max, label, onAdd, button = false }: { placeholder: string; max: number; label: string; onAdd: (text: string) => Promise<unknown> | void; button?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const r = await onAdd(v);
      if (r !== null) setText("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-add" onSubmit={submit}>
      <input className="sb-field" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={max} aria-label={label} autoComplete="off" />
      {button ? <button className="sb-btn" type="submit" disabled={busy}>Add</button> : null}
    </form>
  );
}

/** Notes as chips, with take-back for the writer and the facilitator. */
function Chips({ items, mine, facilitator, actions, className = "sb-chips" }: { items: BoardItem[]; mine: Mine; facilitator: boolean; actions: BoardActions; className?: string }) {
  return (
    <ul className={className}>
      {items.map((i) => {
        const removable = facilitator || mine.itemIds.has(i.id);
        return (
          <li key={i.id} className={`sb-chip${removable ? " sb-has-x" : ""}${i.hidden ? " sb-r-hidden" : ""}`}>
            <span className="sb-chip-t">{i.text}</span>
            {removable ? (
              <button type="button" className="sb-x" aria-label={`Take back "${i.text}"`} onClick={() => void actions.removeItem(i.id)}>×</button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A field that saves as you type (after a pause) and when you leave it, and
 * takes in other people's changes whenever you are not typing in it.
 */
function LiveField({ value, onSave, readOnly, multiline, className, placeholder, label, max }: {
  value: string; onSave: (v: string) => void; readOnly: boolean; multiline?: boolean; className: string; placeholder?: string; label: string; max: number;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(value);
  useEffect(() => {
    if (!focused.current) {
      setDraft(value);
      lastSaved.current = value;
    }
  }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const save = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (v !== lastSaved.current) {
      lastSaved.current = v;
      onSave(v);
    }
  };
  const common = {
    className,
    value: draft,
    readOnly,
    placeholder,
    "aria-label": label,
    maxLength: max,
    onFocus: () => { focused.current = true; },
    onBlur: () => { focused.current = false; save(draft); },
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      setDraft(v);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(v), 900);
    },
  };
  return multiline ? <textarea {...common} /> : <input {...common} autoComplete="off" />;
}

/* ================================================================ welcome */

function YearWheel({ week }: { week: number }) {
  const cx = 130, cy = 130, r = 92;
  const P = (a: number, rr: number): [number, number] => [cx + rr * Math.sin((a * Math.PI) / 180), cy - rr * Math.cos((a * Math.PI) / 180)];
  const arc = (a0: number, a1: number) => {
    const [x0, y0] = P(a0, r);
    const [x1, y1] = P(a1, r);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const seasons: [string, number][] = [["Design", 0], ["Resource", 90], ["Build", 180], ["Rest", 270]];
  const at = (week / 13) * 88 + 2;
  const [lx, ly] = P(90, r);
  const [mx, my] = P(at, r);
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label={`The year wheel: Design Season, week ${week} of 13. The shared crowdpool launches at the December solstice, where the Resource Season begins.`}>
      {seasons.map(([n, a], i) => <path key={n} d={arc(a + 2, a + 88)} className={`sb-w-arc${i === 0 ? " sb-w-design" : ""}`} />)}
      <path d={arc(2, at)} className="sb-w-prog" />
      {seasons.map(([n, a], i) => {
        const [x, y] = P(a + 45, 122);
        return <text key={n} x={x.toFixed(1)} y={y.toFixed(1)} className={`sb-w-lbl${i === 0 ? " sb-w-lbl-on" : ""}`} textAnchor="middle" dominantBaseline="middle">{n}</text>;
      })}
      <rect x={(lx - 8).toFixed(1)} y={(ly - 8).toFixed(1)} width="16" height="16" transform={`rotate(45 ${lx.toFixed(1)} ${ly.toFixed(1)})`} className="sb-w-launch" />
      <circle cx={mx.toFixed(1)} cy={my.toFixed(1)} r="10" className="sb-w-here" />
      <text x="130" y="128" className="sb-w-big" textAnchor="middle">Week {week}</text>
      <text x="130" y="152" className="sb-w-small" textAnchor="middle">OF 13 WEEKS</text>
    </svg>
  );
}

export function Welcome({ board, week, stages, facilitator, actions, go }: StageProps) {
  const w = boardWelcome(week);
  const plan = board.state.plan;
  const total = sessionMinutes(plan, stages);
  const link = `regencivics.earth${sessionBoardHref(week)}`;
  return (
    <div className="sb-welcome">
      <div className="sb-welcome-main">
        <p className="sb-kicker">Season 2 · Design Season · Week {week} of 13</p>
        <h1 className="sb-hero">{w.title}</h1>
        {w.lede ? <p className="sb-lede">{w.lede}</p> : null}
        <div>
          <div className="sb-agenda-head"><h2 className="sb-h3">Today</h2><span className="sb-agenda-total">{total} min</span></div>
          <ol className="sb-agenda">
            {stages.map((s, i) => (
              <li key={s.kind + i} className={`sb-ag-row${board.state.sessionStartedAt && i === board.state.stage ? " sb-now" : ""}`}>
                <span className="sb-ag-n">{i + 1}</span>
                <button type="button" className="sb-ag-main" onClick={() => go(i)}>
                  <span className="sb-ag-name">{s.name}</span>
                  <span className="sb-ag-line">{s.line}</span>
                </button>
                <span className="sb-ag-min">
                  {facilitator ? <button type="button" className="sb-mini" aria-label={`One minute less for ${s.name}`} onClick={() => actions.act({ type: "plan", stage: i, minutes: Math.max(1, plan[i] - 1) })}>−</button> : null}
                  <span className="sb-ag-m">{plan[i]} min</span>
                  {facilitator ? <button type="button" className="sb-mini" aria-label={`One minute more for ${s.name}`} onClick={() => actions.act({ type: "plan", stage: i, minutes: plan[i] + 1 })}>+</button> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <aside className="sb-side">
        <div className="sb-wheel"><YearWheel week={week} /></div>
        <ul className="sb-legend"><li><span className="sb-lg-here" />You are here</li><li><span className="sb-lg-launch" />Crowdpool launch, December solstice</li></ul>
        <div className="sb-panel">
          <h2 className="sb-h3">Type in with us</h2>
          <p className="sb-hint">Open this board on your own screen. Your words, your project and your votes land here live.</p>
          <div className="sb-copy"><code>{link}</code><CopyButton text={`https://${link}`} /></div>
        </div>
        <div className="sb-panel">
          <h2 className="sb-h3">We leave with</h2>
          <ul className="sb-ticks">{w.leaveWith.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        {board.notes.length > 0 ? (
          <div className="sb-panel">
            <h2 className="sb-h3">You asked us to cover</h2>
            <ul className="sb-asked">
              {board.notes.map((n, i) => (
                <li key={i}>
                  <p>{n.topic}</p>
                  {n.projectName || n.displayName ? <span>{[n.displayName, n.projectName].filter(Boolean).join(", ")}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sb-btn sb-small"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }, () => {});
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

/* ================================================================= breath */

export function Breath({ board, stages, index, facilitator, canWrite, mine, actions, serverNow }: StageProps) {
  const orb = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLParagraphElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const breath = board.state.breath;
  const pattern = BREATH_PATTERNS[breath.pattern] ?? BREATH_PATTERNS.settle;
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    let raf = 0;
    let alive = true;
    const draw = () => {
      if (!alive) return;
      const m = breathAt(breath, serverNow());
      let sc = 0.72;
      let cueText = "Ready when you are";
      let subText = `${pattern.title} · ${pattern.sub} · ${breath.rounds} rounds`;
      if ("done" in m) {
        cueText = "Rest here";
        subText = "Notice how you feel.";
      } else if ("round" in m) {
        const e = 0.5 - 0.5 * Math.cos(Math.PI * m.progress);
        sc = m.kind === "in" ? 0.55 + 0.45 * e : m.kind === "out" ? 1 - 0.45 * e : m.kind === "hold-in" ? 1 : 0.55;
        cueText = m.label;
        subText = `Round ${m.round} of ${breath.rounds} · ${m.secondsLeft}`;
      }
      if (orb.current) {
        if (reduced) {
          orb.current.style.transform = "scale(0.8)";
          orb.current.style.opacity = String(0.4 + 0.6 * ((sc - 0.55) / 0.45));
        } else {
          orb.current.style.transform = `scale(${sc.toFixed(3)})`;
          orb.current.style.opacity = "1";
        }
      }
      if (cue.current && cue.current.textContent !== cueText) cue.current.textContent = cueText;
      if (sub.current && sub.current.textContent !== subText) sub.current.textContent = subText;
      if (breath.startedAt && !("done" in m)) raf = requestAnimationFrame(draw);
    };
    draw();
    // A timer as well, so the words keep moving when the tab is hidden behind a share.
    const t = setInterval(draw, 500);
    return () => { alive = false; cancelAnimationFrame(raf); clearInterval(t); };
  }, [breath, pattern, serverNow, reduced]);

  const running = breath.startedAt != null && !("done" in breathAt(breath, serverNow()));
  const words = board.items.filter((i) => i.kind === "arrive");
  return (
    <>
      <StageHead stages={stages} index={index} title="Drop in and tune in" lede="Feet on the ground. Feel the land under you, wherever you're joining from. Soften your eyes, or close them, and follow the light." />
      <div className="sb-breath">
        <div className="sb-orb-col">
          <div className="sb-orb-wrap"><div className="sb-orb" ref={orb} /></div>
          <p className="sb-cue" ref={cue} aria-live="polite">Ready when you are</p>
          <p className="sb-cue-sub" ref={sub} />
        </div>
        <div className="sb-breath-side">
          {facilitator ? (
            <div className="sb-panel sb-ctl">
              <p className="sb-label">Pattern</p>
              <div className="sb-row">
                {BREATH_KEYS.map((k) => (
                  <button key={k} type="button" className="sb-toggle" aria-pressed={breath.pattern === k} onClick={() => actions.act({ type: "breath", pattern: k })}>
                    <span>{BREATH_PATTERNS[k].title}</span><small>{BREATH_PATTERNS[k].sub}</small>
                  </button>
                ))}
              </div>
              <p className="sb-label">Rounds</p>
              <div className="sb-row">
                {BREATH_ROUNDS.map((n) => (
                  <button key={n} type="button" className="sb-toggle" aria-pressed={breath.rounds === n} onClick={() => actions.act({ type: "breath", rounds: n })}>{n}</button>
                ))}
              </div>
              <button type="button" className="sb-btn sb-primary" onClick={() => actions.act({ type: "breath", run: !running })}>
                {running ? "Stop" : breath.startedAt ? "Breathe again" : "Start breathing"}
              </button>
            </div>
          ) : null}
          <div className="sb-q">
            <h3 className="sb-h3">One word for how you're arriving</h3>
            {canWrite ? (
              <QuickAdd placeholder="Type a word and press Enter" max={BOARD_LIMITS.word} label="Arrival word" button onAdd={(text) => actions.addItem({ kind: "arrive", text })} />
            ) : null}
            {words.length ? <Chips className="sb-chips sb-words" items={words} mine={mine} facilitator={facilitator} actions={actions} /> : <p className="sb-empty">Words show up here as people share them.</p>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================ open season */

export function OpenSeason({ stages, index, week }: StageProps) {
  return (
    <>
      <StageHead stages={stages} index={index} title="The incubator is open" lede="Any project can apply at any time, and every session is a roundtable you can join. The shared crowdpool is where we're all headed." />
      <div className="sb-two">
        <article className="sb-panel sb-hats">
          <p className="sb-kicker">Two hats</p>
          <h3 className="sb-h3">I'm here as Amora too</h3>
          <p>I'm facilitating this season, and I'm also walking the incubator as one more project at the table. Every exercise I bring you, I'm doing for Amora out loud, so you can see the work as it happens.</p>
          <p>Amora's vision goes on the board beside yours.</p>
        </article>
        <article className="sb-q">
          <h3 className="sb-h3">How it works now</h3>
          <ol className="sb-path">
            <li><span className="sb-path-n">1</span><div><strong>Apply any time</strong><p>Applications roll all season at regencivics.earth/apply.</p></div></li>
            <li><span className="sb-path-n">2</span><div><strong>A yes means foundations</strong><p>Approval says we see the minimum foundations for you to join the crowdpool.</p></div></li>
            <li><span className="sb-path-n">3</span><div><strong>Choose your roundtables</strong><p>Every weekly session is open to every project. Come to the ones that serve where you are.</p></div></li>
            <li><span className="sb-path-n">4</span><div><strong>Get yourself ready</strong><p>Follow the episodes live or recorded, and work through the eight readiness items at your own pace.</p></div></li>
            <li className="sb-path-end"><span className="sb-path-n sb-path-diamond" aria-hidden="true" /><div><strong>December solstice: the shared crowdpool launch</strong><p>Every project that's ready launches together, as many as are ready.</p></div></li>
          </ol>
        </article>
      </div>
      <div className="sb-q">
        <h3 className="sb-h3">Ready to crowdpool: the eight</h3>
        <p className="sb-hint">The review checks that each one is in place and clear. Nobody scores how good it is. Who shows up each week shapes the route we take to get there.</p>
        <ol className="sb-ready-grid">
          {CROWDPOOL_READINESS.map((r) => {
            const now = r.weeks.includes(week);
            return (
              <li key={r.key} className={now ? "sb-is-today" : undefined}>
                <span className="sb-rg-t">{r.title}</span>
                <span className="sb-rg-w">{r.weeks.length === 1 ? "Week" : "Weeks"} {r.weeks.join(", ")}{now ? <> <span className="sb-today">This week</span></> : null}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

/* ============================================================== village os */

const MODULES = [
  { t: "Quests", d: "People claim the work, and a person confirms it before credit lands." },
  { t: "Gratitude", d: "Thanks that carries weight, settled each lunar cycle." },
  { t: "Stages & roles", d: "Circles and seats, so everyone can see who holds what." },
  { t: "Profiles", d: "Who's here, and what each person brings." },
];

const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

/**
 * Amora's circles map: its map-only view live in a frame when Amora's headers
 * let this origin frame it (villageOs.amoraMap), and a dated picture otherwise.
 */
function AmoraCircles() {
  const map = trpc.villageOs.amoraMap.useQuery(undefined, { staleTime: 10 * 60 * 1000, refetchOnWindowFocus: false, retry: false });
  const live = !!map.data && typeof window !== "undefined" && map.data.frameOrigins.includes(window.location.origin);
  return (
    <section className="sb-panel sb-amora" aria-labelledby="sb-amora-h">
      <div className="sb-amora-head">
        <h3 id="sb-amora-h" className="sb-h3">Amora's circles</h3>
        <a className="sb-btn sb-small" href={AMORA_CIRCLES_URL} target="_blank" rel="noopener noreferrer">Open the map{NEW_TAB}</a>
      </div>
      {live ? (
        <iframe
          className="sb-amora-frame"
          src={AMORA_CIRCLES_EMBED_URL}
          title="Amora's circles map, live from amora.regencivics.earth"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <a className="sb-amora-shot" href={AMORA_CIRCLES_URL} target="_blank" rel="noopener noreferrer">
          <img
            src="/images/session-board/amora-circles-map.webp"
            width={1600}
            height={1075}
            loading="lazy"
            decoding="async"
            alt="Amora's circles map on 2 October: the village drawn as circles inside circles, from the General Coordinating Circle and the Development Circle to councils still forming, with open seats marked by a plus. Beside it: 17 circles, and 16 open calls waiting for someone."
          />
          {NEW_TAB}
        </a>
      )}
      <p className="sb-hint">
        {live
          ? "Live from Amora. Tap a circle to step inside it, or a seat to see who holds it."
          : "A picture of Amora's map from 2 October. Open the map to tap a circle or a seat."}
      </p>
    </section>
  );
}

/** A first look at the role cards being built into Village OS, from invented sample seats. */
function RoleCardsPreview() {
  return (
    <section className="sb-panel sb-rolecards" aria-labelledby="sb-rolecards-h">
      <h3 id="sb-rolecards-h" className="sb-h3">Coming to Village OS: role cards</h3>
      <p className="sb-hint">A first look at what's being built. Every seat in a Game gets a card, and a new role starts as a proposal the circle decides on. The seats and the person on them here are made-up examples.</p>
      <div className="sb-rolecard-row">
        <figure className="sb-rolecard">
          <img
            src="/images/session-board/role-card-seat.webp"
            width={1648}
            height={1504}
            loading="lazy"
            decoding="async"
            alt="A sample role card for a Water Steward seat, opened flat. On the left: its art, its aim (every household has clean water and the systems that carry it are cared for), a Raise your hand button, and who holds it: Mara, an agent, and one open place waiting for a hand. On the right: three places, two held and one open; five of its seven commitments written down; what it decides on, the four things it answers for, why it matters, a term ending 21 March 2027, and consent as its way of deciding."
          />
          <figcaption>A seat's card, front and back side by side: who holds it, the open place waiting for a hand, and what the seat does.</figcaption>
        </figure>
        <figure className="sb-rolecard">
          <img
            src="/images/session-board/role-card-proposal.webp"
            width={752}
            height={1596}
            loading="lazy"
            decoding="async"
            alt="A sample role card for a Treasury Keeper: one place, nobody seated yet, a vote fills it, and two powers it carries (list tokens, post prices and stock the treasury; confirm that a member was paid and destroy the tokens they redeemed). The rung it asks for is Contributor or above, on a ladder of twelve rungs from Visitor to Sage."
          />
          <figcaption>The card someone sees while proposing a role: the powers it carries and the rung it asks for.</figcaption>
        </figure>
      </div>
    </section>
  );
}

export function VillageOS({ stages, index }: StageProps) {
  return (
    <>
      <StageHead stages={stages} index={index} title="Building our Games in Village OS" lede="Village OS is where each project's Game runs: its circles and roles, its quests, its gratitude and its Game Guide. Every village gets its own space on it, with its own people, settings and address. Amora runs on it today." />
      <div className="sb-two">
        <div className="sb-col">
          <div className="sb-panel sb-q">
            <h3 className="sb-h3">What every village starts with</h3>
            <ul className="sb-modules">{MODULES.map((m) => <li key={m.t}><strong>{m.t}</strong><span>{m.d}</span></li>)}</ul>
            <p className="sb-hint">Twenty more modules switch on as a village is ready for them: the Village Map, crowdpooling, governance and more.</p>
            <p>
              See it live at{" "}
              <a className="sb-link" href={AMORA_VILLAGE_URL} target="_blank" rel="noopener noreferrer">amora.regencivics.earth{NEW_TAB}</a>
              .
            </p>
          </div>
        </div>
        <div className="sb-q">
          <h3 className="sb-h3">How we build our Games this season</h3>
          <ol className="sb-path">
            <li><span className="sb-path-n">1</span><div><span className="sb-path-weeks">Weeks 3 to 5</span><strong>Design the Game</strong><p>Purpose, roles, who decides, and your Game Guide. In Village OS they become your circles, your seats and your Guide.</p></div></li>
            <li><span className="sb-path-n">2</span><div><span className="sb-path-weeks">Week 6</span><strong>Grow the village</strong><p>How people find you, join and stay. In Village OS, your entry journeys and onboarding.</p></div></li>
            <li><span className="sb-path-n">3</span><div><span className="sb-path-weeks">Weeks 8, 9 and 12</span><strong>Set the economy</strong><p>What flows between your players. In Village OS, your gratitude, your credits and the ledger that keeps them honest.</p></div></li>
            <li><span className="sb-path-n">4</span><div><span className="sb-path-weeks">Week 13</span><strong>Open the roster</strong><p>Every role your Game needs, with the hours a week it asks for.</p></div></li>
            <li className="sb-path-end"><span className="sb-path-n sb-path-diamond" aria-hidden="true" /><div><strong>December solstice: the crowdpool fills the roster</strong><p>People pledge hours to the roles your Game needs. A 40-hour role fills as pledges arrive, ten hours at a time.</p></div></li>
          </ol>
        </div>
      </div>
      <AmoraCircles />
      <RoleCardsPreview />
    </>
  );
}

/* ================================================================= circle */

function useSelected(board: SessionBoardData, facilitator: boolean) {
  const [localSel, setLocalSel] = useState<number | null>(null);
  const speaker = board.state.speaker.projectId;
  const last = useRef(speaker);
  useEffect(() => {
    if (last.current !== speaker) {
      last.current = speaker;
      setLocalSel(null);
    }
  }, [speaker]);
  const want = !facilitator && localSel != null ? localSel : speaker;
  const sel = board.projects.find((p) => p.id === want) ?? null;
  return { sel, setLocalSel };
}

function upNext(projects: BoardProject[], currentId: number | null): BoardProject | null {
  const i = currentId == null ? -1 : projects.findIndex((p) => p.id === currentId);
  const order = i >= 0 ? [...projects.slice(i + 1), ...projects.slice(0, i)] : projects;
  return order.find((p) => !p.shared && !p.hidden) ?? null;
}

function AddProject({ actions, onAdded, displayName, setDisplayName }: { actions: BoardActions; onAdded: (id: number) => void; displayName: string; setDisplayName: (v: string) => void }) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await actions.addProject({ name: name.trim(), place: place.trim() || undefined });
      if (r) {
        setName("");
        setPlace("");
        if (r.id) onAdded(r.id);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="sb-add-project" onSubmit={submit}>
      <p className="sb-label">Add your project</p>
      <input className="sb-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" maxLength={BOARD_LIMITS.projectName} aria-label="Project name" autoComplete="off" />
      <input className="sb-field" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where on Earth" maxLength={BOARD_LIMITS.place} aria-label="Where on Earth" autoComplete="off" />
      <input className="sb-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name (optional)" maxLength={BOARD_LIMITS.displayName} aria-label="Your name" autoComplete="name" />
      <button className="sb-btn" type="submit" disabled={busy || !name.trim()}>Add to the circle</button>
    </form>
  );
}

export function Circle(props: StageProps & { displayName: string; setDisplayName: (v: string) => void }) {
  const { board, stages, index, facilitator, canWrite, mine, actions, now } = props;
  const { sel, setLocalSel } = useSelected(board, facilitator);
  const next = upNext(board.projects, sel?.id ?? null);
  const [confirmHide, setConfirmHide] = useState(false);
  useEffect(() => setConfirmHide(false), [sel?.id]);

  const select = (id: number) => {
    if (facilitator) actions.act({ type: "speaker", projectId: id });
    else setLocalSel(id);
  };
  const editable = !!sel && (facilitator || (canWrite && mine.projectIds.has(sel.id)));
  const sp = board.state.speaker;
  const { used, left } = shareTime(sp, now);
  const notesFor = (kind: string) => (sel ? board.items.filter((i) => i.kind === kind && i.projectId === sel.id) : []);
  const ready = new Set(sel?.ready ?? []);
  const phase = PROJECT_PHASES.find((p) => p.key === sel?.phase);

  return (
    <>
      <StageHead stages={stages} index={index} title="Project circle" lede="A few minutes each. Where are you now, what's your biggest pain point, and what growth opportunity do you see right now?" />
      <div className="sb-circle">
        <aside className="sb-roster">
          {canWrite ? <AddProject actions={actions} onAdded={(id) => { if (facilitator) { if (sp.projectId == null) actions.act({ type: "speaker", projectId: id }); } else setLocalSel(id); }} displayName={props.displayName} setDisplayName={props.setDisplayName} /> : null}
          {facilitator && board.facilitatorLists && board.facilitatorLists.register.length > 0 ? (
            <button type="button" className="sb-btn sb-ghost sb-small" onClick={() => actions.importRegister()}>
              Bring in the register ({board.facilitatorLists.register.length})
            </button>
          ) : null}
          {board.projects.length ? (
            <ol className="sb-roster-list">
              {board.projects.map((p) => {
                const ph = PROJECT_PHASES.find((x) => x.key === p.phase);
                const isMine = mine.projectIds.has(p.id);
                const tag = p.shared ? "Shared" : next?.id === p.id && sel?.id !== p.id ? "Up next" : isMine ? "Yours" : "";
                return (
                  <li key={p.id}>
                    <button type="button" className={`sb-r-item${sel?.id === p.id ? " sb-on" : ""}${p.hidden ? " sb-r-hidden" : ""}`} aria-current={sel?.id === p.id} onClick={() => select(p.id)}>
                      <span className="sb-r-top">
                        <span className="sb-r-name">{p.name}</span>
                        <span className={`sb-r-tag${tag === "Up next" ? " sb-next" : tag === "Yours" ? " sb-mine" : ""}`}>{p.hidden ? "Hidden" : tag}</span>
                      </span>
                      <span className="sb-r-meta">{[p.place, ph?.title, p.ready.length ? `${p.ready.length} of 8 in place` : ""].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="sb-empty">{canWrite ? "Projects join the circle as they arrive. Add yours above." : "Projects show up here as they join the circle."}</p>
          )}
        </aside>

        <article className="sb-panel sb-spot">
          {!sel ? (
            <div className="sb-sp-empty">
              <p className="sb-h3">{facilitator ? "Pick a project to give it the floor." : "The project sharing now shows here."}</p>
              <p className="sb-hint">Its notes fill in while it shares.</p>
            </div>
          ) : (
            <>
              <div className="sb-sp-top">
                <div className="sb-sp-id">
                  <LiveField className="sb-sp-name" value={sel.name} readOnly={!editable} label="Project name" max={BOARD_LIMITS.projectName} onSave={(v) => { if (v.trim()) void actions.updateProject({ projectId: sel.id, name: v }); }} />
                  <LiveField className="sb-sp-place" value={sel.place ?? ""} readOnly={!editable} placeholder={editable ? "Where on Earth" : ""} label="Where on Earth" max={BOARD_LIMITS.place} onSave={(v) => void actions.updateProject({ projectId: sel.id, place: v })} />
                  {sel.url ? <a className="sb-link" href={sel.url} target="_blank" rel="noopener noreferrer">{sel.url.replace(/^https?:\/\//, "")}<span className="sr-only"> (opens in a new tab)</span></a> : null}
                </div>
                {sp.projectId === sel.id ? (
                  <div className="sb-timer">
                    <div className={`sb-ring${left < 0 ? " sb-over" : left <= 30 ? " sb-warn" : ""}`} role="timer" aria-label="Time left for this share">
                      <svg viewBox="0 0 120 120" aria-hidden="true">
                        <circle cx="60" cy="60" r="52" className="sb-ring-bg" />
                        <circle cx="60" cy="60" r="52" className="sb-ring-fg" transform="rotate(-90 60 60)" style={{ strokeDashoffset: 326.73 * Math.min(1, used / sp.secs) }} />
                      </svg>
                      <div className="sb-ring-num">{left >= 0 ? fmt(Math.ceil(left)) : `+${fmt(-left)}`}</div>
                    </div>
                    {facilitator ? (
                      <div className="sb-timer-ctl">
                        <button type="button" className="sb-btn sb-small" onClick={() => actions.act({ type: "timer", op: sp.startedAt ? "pause" : "start" })}>{sp.startedAt ? "Pause" : used > 0 ? "Resume" : "Start"}</button>
                        <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => actions.act({ type: "timer", op: "reset" })}>Reset</button>
                        <select className="sb-field" aria-label="Minutes per share" value={sp.secs} onChange={(e) => actions.act({ type: "shareSecs", secs: Number(e.target.value) })}>
                          {[120, 180, 240, 300].map((s) => <option key={s} value={s}>{s / 60} min</option>)}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="sb-q">
                <h3 className="sb-q-t">Where are you now?</h3>
                <div className="sb-row" role="group" aria-label="Where the project is">
                  {PROJECT_PHASES.map((p) => (
                    <button key={p.key} type="button" className="sb-toggle" aria-pressed={sel.phase === p.key} disabled={!editable}
                      onClick={() => void actions.updateProject({ projectId: sel.id, phase: sel.phase === p.key ? null : p.key })}>{p.title}</button>
                  ))}
                </div>
                <p className="sb-hint">{phase ? phase.desc : editable ? "Pick the stage that fits best." : ""}</p>
                {editable || sel.whereNow ? (
                  <LiveField multiline className="sb-field" value={sel.whereNow ?? ""} readOnly={!editable} placeholder="Land, people, what's built, what's running" label="Where the project is now" max={BOARD_LIMITS.whereNow} onSave={(v) => void actions.updateProject({ projectId: sel.id, whereNow: v })} />
                ) : null}
              </div>

              <div className="sb-sp-two">
                <div className="sb-q">
                  <h3 className="sb-q-t">Biggest pain point</h3>
                  <Chips items={notesFor("pain")} mine={mine} facilitator={facilitator} actions={actions} />
                  {canWrite ? <QuickAdd placeholder="Type a pain point and press Enter" max={BOARD_LIMITS.note} label="Add a pain point" onAdd={(text) => actions.addItem({ kind: "pain", text, projectId: sel.id })} /> : null}
                </div>
                <div className="sb-q">
                  <h3 className="sb-q-t">Growth opportunity you see right now</h3>
                  <Chips items={notesFor("opp")} mine={mine} facilitator={facilitator} actions={actions} />
                  {canWrite ? <QuickAdd placeholder="Type an opportunity and press Enter" max={BOARD_LIMITS.note} label="Add a growth opportunity" onAdd={(text) => actions.addItem({ kind: "opp", text, projectId: sel.id })} /> : null}
                </div>
              </div>

              <div className="sb-sp-ready">
                <div className="sb-sp-ready-head"><h3 className="sb-q-t">Ready to crowdpool: in place now</h3><span className="sb-count">{ready.size} of 8</span></div>
                <div className="sb-row" role="group" aria-label="Readiness items in place">
                  {CROWDPOOL_READINESS.map((r) => (
                    <button key={r.key} type="button" className="sb-rt" aria-pressed={ready.has(r.key)} disabled={!editable} title={r.need}
                      onClick={() => {
                        const set = new Set(ready);
                        if (set.has(r.key)) set.delete(r.key); else set.add(r.key);
                        void actions.updateProject({ projectId: sel.id, ready: [...set] });
                      }}>{r.title}</button>
                  ))}
                </div>
              </div>

              <div className="sb-sp-foot">
                <span className="sb-row">{sel.shared ? <span className="sb-badge">Shared</span> : null}{mine.projectIds.has(sel.id) ? <span className="sb-badge">Your project</span> : null}</span>
                {facilitator ? (
                  <div className="sb-actions">
                    {board.facilitatorLists && board.facilitatorLists.applications.length > 0 ? (
                      <select className="sb-field" aria-label="Link to an incubator application" value={sel.applicationId ?? ""} onChange={(e) => actions.curateProject({ projectId: sel.id, applicationId: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Link to an application</option>
                        {board.facilitatorLists.applications.map((a) => <option key={a.id} value={a.id}>{a.projectName}</option>)}
                      </select>
                    ) : null}
                    {confirmHide ? (
                      <>
                        <span>Hide this project from the board?</span>
                        <button type="button" className="sb-btn sb-small" onClick={() => { actions.curateProject({ projectId: sel.id, hidden: !sel.hidden }); setConfirmHide(false); }}>{sel.hidden ? "Show it" : "Hide it"}</button>
                        <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => setConfirmHide(false)}>Keep</button>
                      </>
                    ) : (
                      <button type="button" className="sb-btn sb-ghost" onClick={() => setConfirmHide(true)}>{sel.hidden ? "Show" : "Hide"}</button>
                    )}
                    <button type="button" className="sb-btn sb-primary" onClick={() => {
                      if (!sel.shared) actions.curateProject({ projectId: sel.id, shared: true });
                      const n = upNext(board.projects.map((p) => (p.id === sel.id ? { ...p, shared: true } : p)), sel.id);
                      if (n) actions.act({ type: "speaker", projectId: n.id });
                    }}>{sel.shared ? "Next project →" : "Shared, next project →"}</button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </article>
      </div>
    </>
  );
}

/* ================================================================ harvest */

function ThemeControl({ item, facilitator, actions }: { item: BoardItem; facilitator: boolean; actions: BoardActions }) {
  if (!facilitator) return item.theme ? <span>{THEME_TITLE[item.theme] ?? ""}</span> : null;
  return (
    <select className="sb-field" aria-label="Theme" value={item.theme ?? ""}
      onChange={(e) => actions.curateItem({ itemId: item.id, theme: (e.target.value || null) as Parameters<BoardActions["curateItem"]>[0]["theme"] })}>
      <option value="">Pick a theme</option>
      {OPPORTUNITY_THEMES.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
    </select>
  );
}

export function Harvest({ board, stages, index, facilitator, canWrite, mine, actions }: StageProps) {
  const [filter, setFilter] = useState("all");
  const projectName = (id: number | null) => board.projects.find((p) => p.id === id)?.name ?? "From the room";
  const opps = board.items.filter((i) => i.kind === "opp");
  const pains = board.items.filter((i) => i.kind === "pain");
  const all = [...opps, ...pains];
  const keys: [string, string][] = [["all", "All"], ...OPPORTUNITY_THEMES.map((t) => [t.key, t.title] as [string, string]), ["none", "No theme yet"]];
  const count = (k: string) => (k === "all" ? all.length : all.filter((o) => (o.theme ?? "none") === k).length);
  const active = filter !== "all" && count(filter) === 0 ? "all" : filter;
  const pass = (o: BoardItem) => active === "all" || (o.theme ?? "none") === active;
  const shown = opps.filter(pass).sort((a, b) => b.votes - a.votes || a.id - b.id);
  const votesLeft = BOARD_LIMITS.votesPerPerson - mine.votes.size;

  return (
    <>
      <StageHead stages={stages} index={index} title="Harvest the opportunities" lede="Every growth opportunity from the circle in one place. Sort them by theme, then vote for the ones we design our game around.">
        {board.status === "open" ? <p className="sb-hint">You have three votes. {votesLeft > 0 ? `${plural(votesLeft, "vote", "votes")} left.` : "All three used. Take one back to move it."}</p> : null}
      </StageHead>
      {all.length ? (
        <div className="sb-row" role="group" aria-label="Filter by theme">
          {keys.filter(([k]) => k === "all" || count(k) > 0).map(([k, t]) => (
            <button key={k} type="button" className="sb-toggle" aria-pressed={active === k} onClick={() => setFilter(k)}>
              <span>{t}<span className="sb-filter-n">{count(k)}</span></span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="sb-harvest">
        <div className="sb-col">
          {canWrite ? <QuickAdd placeholder="Add an opportunity from the room" max={BOARD_LIMITS.note} label="Add an opportunity from the room" button onAdd={(text) => actions.addItem({ kind: "opp", text })} /> : null}
          {shown.length ? (
            <div className="sb-opp-grid">
              {shown.map((o) => {
                const voted = mine.votes.has(o.id);
                return (
                  <article key={o.id} className={`sb-opp${o.chosen ? " sb-chosen" : ""}${o.hidden ? " sb-r-hidden" : ""}`}>
                    <p className="sb-opp-t">{o.text}</p>
                    <div className="sb-opp-meta"><span className="sb-from">{projectName(o.projectId)}</span><ThemeControl item={o} facilitator={facilitator} actions={actions} /></div>
                    <div className="sb-opp-act">
                      <div className="sb-votes">
                        {facilitator ? <button type="button" className="sb-mini" aria-label="One room vote fewer" onClick={() => actions.curateItem({ itemId: o.id, roomVotes: Math.max(0, o.roomVotes - 1) })}>−</button> : null}
                        <span className="sb-v-n">{o.votes}</span><span className="sb-v-l">{o.votes === 1 ? "vote" : "votes"}</span>
                        {facilitator ? <button type="button" className="sb-mini" aria-label="One more room vote" onClick={() => actions.curateItem({ itemId: o.id, roomVotes: o.roomVotes + 1 })}>+</button> : null}
                      </div>
                      <div className="sb-row">
                        {board.status === "open" ? (
                          <button type="button" className="sb-toggle" aria-pressed={voted} disabled={!voted && votesLeft <= 0} onClick={() => void actions.vote(o.id, !voted)}>{voted ? "Voted" : "Vote"}</button>
                        ) : null}
                        {facilitator ? (
                          <button type="button" className="sb-toggle" aria-pressed={o.chosen} onClick={() => actions.curateItem({ itemId: o.id, chosen: !o.chosen })}>{o.chosen ? "Chosen" : "Choose"}</button>
                        ) : o.chosen ? <span className="sb-badge">Chosen</span> : null}
                        {facilitator ? <button type="button" className="sb-x" aria-label={o.hidden ? "Show this note" : "Hide this note"} title={o.hidden ? "Show" : "Hide"} onClick={() => actions.curateItem({ itemId: o.id, hidden: !o.hidden })}>{o.hidden ? "↺" : "×"}</button> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="sb-empty">{opps.length ? "Nothing under this theme yet." : "Opportunities from the circle land here."}</p>
          )}
        </div>
        <aside className="sb-panel sb-col">
          <h3 className="sb-h3">Pain points we heard</h3>
          {pains.filter(pass).length ? (
            <ul className="sb-pain-list">
              {pains.filter(pass).map((p) => (
                <li key={p.id} className={p.hidden ? "sb-r-hidden" : undefined}>
                  <span className="sb-pain-t">{p.text}</span>
                  <div className="sb-pain-meta"><span className="sb-from">{projectName(p.projectId)}</span><ThemeControl item={p} facilitator={facilitator} actions={actions} /></div>
                </li>
              ))}
            </ul>
          ) : <p className="sb-empty">{pains.length ? "No pain points under this theme." : "Pain points from the circle land here."}</p>}
        </aside>
      </div>
    </>
  );
}

/* =================================================================== game */

export function Game({ board, stages, index, facilitator, canWrite, mine, actions }: StageProps) {
  const chosen = board.items.filter((i) => i.kind === "opp" && i.chosen).sort((a, b) => b.votes - a.votes || a.id - b.id);
  const games = board.items.filter((i) => i.kind === "game");
  const projectName = (id: number | null) => board.projects.find((p) => p.id === id)?.name ?? "From the room";
  return (
    <>
      <StageHead stages={stages} index={index} title="Seed the game" lede="Every organisation is a game. It has players, something they play for, moves they make, things that flow between them, and a way to decide the rules. We sketch ours around the opportunities we chose." />
      <div className="sb-game">
        <aside className="sb-col">
          <h3 className="sb-h3">Chosen opportunities</h3>
          {chosen.length ? (
            <ol className="sb-chosen-list">
              {chosen.map((o) => {
                const inGame = games.some((g) => g.fromItemId === o.id);
                return (
                  <li key={o.id}>
                    <span className="sb-ch-t">{o.text}</span>
                    <div className="sb-ch-row">
                      <span>{plural(o.votes, "vote", "votes")} · {projectName(o.projectId)}</span>
                      {facilitator ? <button type="button" className="sb-btn sb-small" disabled={inGame} onClick={() => actions.promote(o.id)}>{inGame ? "Quest added" : "Make it a quest"}</button> : inGame ? <span className="sb-badge">Quest</span> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : <p className="sb-empty">The opportunities chosen in the Harvest show up here.</p>}
        </aside>
        <div className="sb-canvas">
          {GAME_BLOCKS.map((b) => {
            const notes = games.filter((g) => g.block === b.key);
            return (
              <section key={b.key} className={`sb-block${b.key === "aim" ? " sb-block-aim" : ""}`}>
                <h3 className="sb-h3">{b.title}</h3>
                <p className="sb-hint">{b.prompt}</p>
                {notes.length ? (
                  <ul className="sb-notes">
                    {notes.map((n) => {
                      const removable = facilitator || mine.itemIds.has(n.id);
                      return (
                        <li key={n.id} className={removable ? "sb-has-x" : undefined}>
                          <span className="sb-chip-t">{n.text}</span>
                          {removable ? <button type="button" className="sb-x" aria-label={`Take back "${n.text}"`} onClick={() => void actions.removeItem(n.id)}>×</button> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {canWrite ? <QuickAdd placeholder="Add a note and press Enter" max={BOARD_LIMITS.note} label={`Add to ${b.title}`} onAdd={(text) => actions.addItem({ kind: "game", text, block: b.key })} /> : null}
              </section>
            );
          })}
        </div>
      </div>
      <p className="sb-hint">These five blocks start two readiness items: a clear game for everyone, and the game's governance. Weeks 3 and 4 build them out, and week 5 writes them into your Game Guide.</p>
    </>
  );
}

/* ================================================================== ahead */

export function Ahead({ board, week, stages, index, facilitator, canWrite, mine, actions }: StageProps) {
  const coming = SEASON2_CURRICULUM.filter((e) => e.week > week && e.week <= LAST_BOARD_WEEK);
  const nextWeek = week + 1;
  return (
    <>
      <StageHead stages={stages} index={index} title="Choose your roundtables" lede="Every session from here is open to every project. Come to the ones that serve where you are, and raise a hand for the ones you'll join." />
      <div className="sb-ahead">
        <ol className="sb-weeks">
          {coming.map((e) => {
            const n = board.hands[e.week] ?? 0;
            const raised = mine.hands.has(e.week);
            return (
              <li key={e.week} className="sb-wk">
                <span className="sb-wk-n">Week {e.week}</span>
                <div className="sb-wk-main"><strong>{e.title}</strong><p>{e.description}</p></div>
                <div className="sb-hands">
                  <span className="sb-h-n">{plural(n, "hand", "hands")}</span>
                  {board.status === "open" ? <button type="button" className="sb-toggle" aria-pressed={raised} onClick={() => void actions.hand(e.week, !raised)}>{raised ? "I'll be there" : "Raise a hand"}</button> : null}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="sb-side">
          <div className="sb-panel">
            <h3 className="sb-h3">{nextWeek <= LAST_BOARD_WEEK ? `One move before week ${nextWeek}` : "One move from here"}</h3>
            <p className="sb-hint">Each project names one thing it will do this week.</p>
            {board.projects.length ? (
              <ol className="sb-moves">
                {board.projects.filter((p) => !p.hidden).map((p) => {
                  const editable = facilitator || (canWrite && mine.projectIds.has(p.id));
                  return (
                    <li key={p.id}>
                      <span className="sb-mv-name">{p.name}</span>
                      <LiveField className="sb-field" value={p.nextMove ?? ""} readOnly={!editable} placeholder={editable ? "One move" : "No move named yet"} label={`${p.name}: one move`} max={BOARD_LIMITS.nextMove} onSave={(v) => void actions.updateProject({ projectId: p.id, nextMove: v })} />
                    </li>
                  );
                })}
              </ol>
            ) : <p className="sb-empty">Projects from the circle show up here.</p>}
          </div>
          <div className="sb-panel">
            <h3 className="sb-h3">Bring another project</h3>
            <p>Applications roll all season. Send this to any land project that should be at this table.</p>
            <div className="sb-copy"><code>regencivics.earth/apply</code><CopyButton text="https://regencivics.earth/apply" /></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================================================================== close */

export function Close({ board, week, stages, index, facilitator, canWrite, mine, actions }: StageProps) {
  const [confirm, setConfirm] = useState(false);
  const words = board.items.filter((i) => i.kind === "leave");
  const opps = board.items.filter((i) => i.kind === "opp" && !i.hidden);
  const pains = board.items.filter((i) => i.kind === "pain" && !i.hidden);
  const quests = board.items.filter((i) => i.kind === "game" && i.block === "quests" && !i.hidden).length;
  const projects = board.projects.filter((p) => !p.hidden);
  const shared = projects.filter((p) => p.shared).length;
  const top = opps.filter((o) => o.votes > 0).sort((a, b) => b.votes - a.votes || a.id - b.id).slice(0, 3);
  const next = SEASON2_CURRICULUM.find((e) => e.week === week + 1);
  const stats: [string, string][] = [
    ["Projects shared", projects.length ? `${shared} of ${projects.length}` : "0"],
    ["Growth opportunities", String(opps.length)],
    ["Pain points named", String(pains.length)],
    ["Quests drafted", String(quests)],
  ];
  return (
    <>
      <StageHead stages={stages} index={index} title="Close" lede="One word as you leave. Thank you for bringing your projects to this table." />
      <div className="sb-close">
        <div className="sb-col">
          {canWrite ? <QuickAdd placeholder="Type a word and press Enter" max={BOARD_LIMITS.word} label="Closing word" button onAdd={(text) => actions.addItem({ kind: "leave", text })} /> : null}
          {words.length ? <Chips className="sb-chips sb-words" items={words} mine={mine} facilitator={facilitator} actions={actions} /> : <p className="sb-empty">Closing words show up here.</p>}
        </div>
        <div className="sb-panel sb-col">
          <h3 className="sb-h3">What we made today</h3>
          <dl className="sb-stats">{stats.map(([t, v]) => <div key={t}><dt>{t}</dt><dd>{v}</dd></div>)}</dl>
          {top.length ? (
            <>
              <p className="sb-label">Top opportunities</p>
              <ol className="sb-top-opps">{top.map((o) => <li key={o.id}><span>{o.text}</span><span className="sb-tv">{plural(o.votes, "vote", "votes")}</span></li>)}</ol>
            </>
          ) : null}
        </div>
      </div>
      {next ? (
        <div className="sb-panel sb-col">
          <p className="sb-kicker">Next roundtable · Week {next.week}</p>
          <h3 className="sb-h3">{next.title}</h3>
          <p>{next.description}</p>
        </div>
      ) : null}
      {facilitator ? (
        <div className="sb-row">
          {board.status === "open" ? (
            confirm ? (
              <>
                <span>Close the board? It stays up as this week's record, and only you can change it after.</span>
                <button type="button" className="sb-btn sb-small" onClick={() => { actions.setStatus("closed"); setConfirm(false); }}>Close the board</button>
                <button type="button" className="sb-btn sb-small sb-ghost" onClick={() => setConfirm(false)}>Keep it open</button>
              </>
            ) : <button type="button" className="sb-btn sb-ghost" onClick={() => setConfirm(true)}>Close the board</button>
          ) : <button type="button" className="sb-btn sb-ghost" onClick={() => actions.setStatus("open")}>Open the board again</button>}
        </div>
      ) : null}
    </>
  );
}

/* ========================================================= get village os */

/**
 * The last page of every board (ADR-69), left up as people leave: the two
 * ways to start a village on Village OS, and where to find them. The board is
 * public and kept as the week's record, so this page names no money and no
 * gifts. Every word comes from shared/villageOsOffer.ts.
 */
export function GetVillageOS({ stages, index }: StageProps) {
  const b = VILLAGE_OS_OFFER.board;
  const url = `https://regencivics.earth${VILLAGE_OS_PATH}`;
  const cards = [
    { key: "self", kicker: VILLAGE_OS_OFFER.self.kicker, title: VILLAGE_OS_OFFER.self.title, line: b.selfLine },
    { key: "hosted", kicker: VILLAGE_OS_OFFER.hosted.kicker, title: VILLAGE_OS_OFFER.hosted.title, line: b.hostedLine },
  ];
  return (
    <>
      <StageHead stages={stages} index={index} title={b.title} lede={b.lede} />
      <div className="sb-vos-cards">
        {cards.map((c) => (
          <article key={c.key} className={`sb-panel sb-vos-card sb-vos-${c.key}`}>
            <p className="sb-kicker">{c.kicker}</p>
            <h3 className="sb-h3">{c.title}</h3>
            <p>{c.line}</p>
          </article>
        ))}
      </div>
      <div className="sb-panel sb-vos-go">
        <p className="sb-label">Open it on your own screen</p>
        <a className="sb-vos-link" href={VILLAGE_OS_PATH} target="_blank" rel="noopener noreferrer">{b.link}<span className="sr-only"> (opens in a new tab)</span></a>
        <CopyButton text={url} />
      </div>
    </>
  );
}
