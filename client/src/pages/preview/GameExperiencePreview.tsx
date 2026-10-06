/**
 * Design mockup for a unified game feel.
 * Example data only. Not linked from nav, sitemap, or live pages.
 * Route: /preview/game
 *
 * Each screen answers one player question. Nature frames the information.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from "react";
import { SEO } from "@/components/SEO";
import { ARCHETYPES } from "@shared/archetypes";
import {
  POOL_CAPITALS,
  classPortraitSrc,
  type PortraitPresentation,
} from "@shared/characterSheet";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { JOIN_URL } from "@shared/sessionLinks";
import { boardStages, PROJECT_PHASES } from "@shared/sessionBoard";
import { VILLAGE_OS_OFFER } from "@shared/villageOsOffer";
import "./game-preview.css";

const SCREENS = [
  { id: "week", label: "Week" },
  { id: "reward", label: "Gift" },
  { id: "sheet", label: "Sheet" },
  { id: "quests", label: "Quests" },
  { id: "locked", label: "Matching" },
  { id: "paths", label: "Paths" },
  { id: "hosting", label: "Hosting" },
  { id: "phone-before", label: "Before" },
  { id: "phone-after", label: "After" },
  { id: "recap", label: "Recap" },
  { id: "guilds", label: "Guilds" },
  { id: "splash", label: "Splash" },
  { id: "install", label: "Install" },
] as const;

type ScreenId = (typeof SCREENS)[number]["id"];
type Emote = "sprout" | "sun" | "rain" | "heart";
type MarkKind = Emote | "stem" | "leaf" | "drop" | "bud";

const SESSION = boardStages(2).filter((stage) => stage.kind !== "getvillageos");
const NOW_INDEX = Math.max(0, SESSION.findIndex((stage) => stage.kind === "circle"));
const NOW_STAGE = SESSION[NOW_INDEX];
const NEXT_STAGE = SESSION[NOW_INDEX + 1] ?? SESSION[NOW_INDEX];
const SPROUT = PROJECT_PHASES.find((phase) => phase.key === "sprout") ?? PROJECT_PHASES[2];
const ROOT = PROJECT_PHASES.find((phase) => phase.key === "root") ?? PROJECT_PHASES[1];

const PLAYERS: Array<{ name: string; cls: string; mark: MarkKind }> = [
  { name: "Example player", cls: "Spaceholder", mark: "heart" },
  { name: "Example player 2", cls: "Builder", mark: "stem" },
  { name: "Example player 3", cls: "Architect", mark: "sun" },
  { name: "Example player 4", cls: "Catalyst", mark: "rain" },
  { name: "Example player 5", cls: "Storyteller", mark: "leaf" },
  { name: "Example player 6", cls: "Builder", mark: "stem" },
  { name: "Example player 7", cls: "Spaceholder", mark: "heart" },
  { name: "Example player 8", cls: "Catalyst", mark: "rain" },
];

const QUEST_STEPS = [
  { id: "call", title: "Join the call", href: JOIN_URL, reward: "A seat in the room" },
  { id: "need", title: "Share one need", reward: "A note on the board" },
  { id: "gift", title: "Name a gift", reward: "A ring on your sheet" },
  { id: "sit", title: "Sit with a project", reward: "A bud on a guild" },
] as const;

const SEASON_PATHS = [
  { name: "Investor", steps: "2 steps", who: "Brings resources in", get: "A path into the village" },
  { name: "Village Steward", steps: "12 steps", who: "Tends the village week to week", get: "A role on the land" },
  { name: "Resident", steps: "14 steps", who: "Lives on the land", get: "A home in the game" },
  { name: "Prosperity Creator", steps: "10 steps", who: "Makes a livelihood here", get: "Work that stays" },
] as const;

const CALENDAR_HREF =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
  encodeURIComponent("ReGen Civics session (example)") +
  "&details=" +
  encodeURIComponent("Join the call: https://regencivics.earth/join") +
  "&location=" +
  encodeURIComponent(JOIN_URL);

const SLOT_FILL: Record<string, string> = {
  living: "Valley plot",
  material: "Tools",
  financial: "Open",
  experiential: "10 hrs carpentry",
  social: "The table",
  cultural: "Open",
};

function isScreen(value: string | null): value is ScreenId {
  return SCREENS.some((screen) => screen.id === value);
}

function readScreen(): ScreenId {
  if (typeof window === "undefined") return "week";
  const value = new URLSearchParams(window.location.search).get("screen");
  return isScreen(value) ? value : "week";
}

function queryIs(name: string, expected: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === expected;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function lightTap() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* this browser has no tap */
  }
}

function Ex() {
  return <span className="gx-ex-tag">example</span>;
}

function Head({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="gx-head">
      <p className="sheet-kicker">{kicker}</p>
      <h1 className="sheet-display gx-title">{title}</h1>
    </header>
  );
}

function Mark({ kind }: { kind: MarkKind }) {
  if (kind === "sun") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="5" fill="currentColor" />
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "rain") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 14a7 7 0 0 1 13-2 5 5 0 0 1 1 10H8a5 5 0 0 1 0-8z" fill="currentColor" />
        <path d="M12 24c1 2 1 3.5 0 5M18 23c1 2 1 3.5 0 5M24 24c1 2 1 3.5 0 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "heart") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 26C9 20 7 16 9 12.5 11 10 14 10.5 16 13c2-2.5 5-3 7-.5C25 16 23 20 16 26z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "leaf") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 24c8-1 14-8 16-18-8 2-14 8-16 18z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "bud") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 28V16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 17c-4-1-6-4-5-8 4 1 5.5 3.5 5 8zM16 17c4-1 6-4 5-8-4 1-5.5 3.5-5 8z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "drop") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 5c4 6 8 10 8 15a8 8 0 0 1-16 0c0-5 4-9 8-15z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "stem") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 28V12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M16 16c-6-1-8-6-7-10 5 1 8 5 7 10z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28V14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 16c-6-1-8-6-7-10 5 1 8 5 7 10zM16 15c6-1 8-6 7-10-5 1-8 5-7 10z" fill="currentColor" />
    </svg>
  );
}

function Silhouette() {
  return (
    <svg className="gx-silhouette" viewBox="0 0 200 260" aria-hidden="true">
      <circle cx="100" cy="88" r="38" />
      <path d="M36 248c8-72 32-108 64-108s56 36 64 108" />
    </svg>
  );
}

function SproutArt({ grown }: { grown: boolean }) {
  return (
    <svg className={grown ? "gx-sprout gx-sprout-grown" : "gx-sprout"} viewBox="0 0 80 90" aria-hidden="true">
      <path d="M40 82 V36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 48c-14-2-20-14-16-26 12 2 18 12 16 26z" fill="currentColor" />
      <path d="M40 42c14-2 20-14 16-26-12 2-18 12-16 26z" fill="currentColor" />
    </svg>
  );
}

function WeekScreen({
  shot,
  hand,
  onHand,
  portrait,
  inset,
}: {
  shot: boolean;
  hand: boolean;
  onHand: () => void;
  portrait: string | null;
  inset?: boolean;
}) {
  const [floaters, setFloaters] = useState<Array<{ id: number; kind: Emote; x: string; drift: string }>>([]);
  const [cue, setCue] = useState("");
  const nextId = useRef(1);
  const send = (kind: Emote) => {
    const id = nextId.current++;
    setFloaters((list) => [...list.slice(-4), { id, kind, x: `${18 + Math.round(Math.random() * 58)}%`, drift: `${Math.round((Math.random() - 0.4) * 28)}px` }]);
    setCue(kind === "rain" ? "Water drop" : "Wind through leaves");
  };
  return (
    <div className={inset ? "gx-board gx-board-inset" : "gx-board"}>
      {inset ? null : <Head kicker="This call" title="What's happening" />}
      <section className="gx-panel gx-now">
        <div className="gx-now-top">
          <div>
            <p className="sheet-kicker">Stage {NOW_INDEX + 1} of {SESSION.length}</p>
            <h2 className="sheet-display gx-h2">{NOW_STAGE.name}</h2>
          </div>
          <p className="gx-timer"><b className="sheet-display">18:40</b><Ex /></p>
        </div>
        <p className="gx-line">{NOW_STAGE.line}</p>
        <p className="gx-cue">{NOW_STAGE.min} min on the plan. Updates as they happen.</p>
      </section>
      <section className="gx-panel gx-people">
        <div className="gx-panel-label"><span>Who&apos;s here</span><span className="gx-count"><b>{PLAYERS.length}</b> <Ex /></span></div>
        <ul className="gx-roster">
          {PLAYERS.map((player, index) => (
            <li key={player.name} className="gx-person">
              <span className="gx-avatar">
                {index === 0 && hand ? <span className="gx-stem gx-stem-grown"><Mark kind="stem" /></span> : null}
                {index === 0 && portrait ? <img src={portrait} alt="" /> : <Silhouette />}
                <i className="gx-class-icon" title={player.cls}><Mark kind={player.mark} /></i>
              </span>
              <span className="gx-person-name">{player.name}</span>
              <span className="gx-person-class">{player.cls}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="gx-panel gx-spot">
        <p className="sheet-kicker">Some projects at the table</p>
        <h2 className="sheet-display gx-h2">Example Grove <Ex /></h2>
        <p className="gx-meta"><b>{SPROUT.title}</b> · Example valley</p>
        <p className="gx-line">{SPROUT.desc}</p>
      </section>
      <section className="gx-panel gx-do">
        <div className="gx-float-layer" aria-hidden="true">
          {(shot
            ? [
                { id: 1, kind: "sprout" as const, x: "12%", drift: "-6px" },
                { id: 2, kind: "sun" as const, x: "28%", drift: "8px" },
                { id: 3, kind: "heart" as const, x: "44%", drift: "2px" },
              ]
            : floaters
          ).map((item) => (
            <span
              key={item.id}
              className={`gx-floater${shot ? " gx-floater-still" : ""}${item.kind === "sun" ? " gx-floater-sun" : ""}`}
              style={{ left: item.x, ["--gx-drift" as string]: item.drift, ["--gx-rise" as string]: "-36px" } as CSSProperties}
              onAnimationEnd={() => setFloaters((list) => list.filter((floater) => floater.id !== item.id))}
            >
              <Mark kind={item.kind} />
            </span>
          ))}
        </div>
        <div className="gx-dock" role="group" aria-label="Emotes">
          {(["sprout", "sun", "rain", "heart"] as const).map((kind) => (
            <button key={kind} type="button" className="gx-emote" data-testid={`emote-${kind}`} aria-label={kind === "heart" ? "Heart leaf" : kind} onClick={() => send(kind)}>
              <Mark kind={kind} />
            </button>
          ))}
          <button type="button" className="gx-btn gx-btn-quiet gx-hand" data-testid="raise-hand" aria-pressed={hand} onClick={onHand}>Raise a hand</button>
          <a className="gx-link" href={JOIN_URL}>Join the call</a>
        </div>
        <p className="gx-cue" role="status">{cue}</p>
      </section>
      <section className="gx-panel gx-next">
        <p className="sheet-kicker">Next</p>
        <p className="gx-meta"><b className="sheet-display">{NEXT_STAGE.name}</b> · {NEXT_STAGE.min} min</p>
        <p className="gx-line">{NEXT_STAGE.line}</p>
      </section>
    </div>
  );
}

function RewardScreen({ gifts, bloomed, onAdd }: { gifts: number; bloomed: boolean; onAdd: () => void; reduced: boolean }) {
  return (
    <div className="gx-gift">
      <Head kicker="Your gift" title="What it did" />
      <section className="gx-panel gx-gave">
        <p className="sheet-kicker">You gave</p>
        <h2 className="sheet-display gx-h2">10 hrs carpentry <Ex /></h2>
        <p className="gx-meta">Experiential · to Example Grove</p>
      </section>
      <section className="gx-panel gx-land">
        <p className="sheet-kicker">Where it landed</p>
        <ul className="gx-slots gx-slots-mini">
          {POOL_CAPITALS.map((capital) => {
            const on = capital === "experiential" || capital === "living" || capital === "social";
            const hero = capital === "experiential";
            return (
              <li key={capital} className={on ? "gx-slot gx-slot-on" : "gx-slot"}>
                {hero ? <SproutArt grown={bloomed} /> : <span className="gx-slot-icon"><Mark kind={capital === "living" ? "leaf" : capital === "material" ? "stem" : capital === "financial" ? "sprout" : capital === "social" ? "rain" : "heart"} /></span>}
                <b>{CAPITAL_LABELS[capital].label}</b>
                <small>{hero ? "10 hrs carpentry" : (SLOT_FILL[capital] ?? "Open")}</small>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="gx-panel gx-changed">
        <p className="sheet-kicker">What changed</p>
        <p className="gx-line">{gifts} rings on your sheet. Quest step Name a gift is done. <Ex /></p>
        <p className="gx-cue">{bloomed ? "Water drop. Light tap on Android." : ""}</p>
        <p className="gx-meta">Next: Sit with a project</p>
        <button type="button" className="gx-btn" data-testid="add-gift" onClick={onAdd}>Add an example gift</button>
      </section>
    </div>
  );
}

function SheetScreen({
  archetype,
  look,
  gifts,
  onArchetype,
  onLook,
}: {
  archetype: string | null;
  look: PortraitPresentation | null;
  gifts: number;
  onArchetype: (key: string | null) => void;
  onLook: (look: PortraitPresentation) => void;
  onAdd: () => void;
}) {
  const picked = ARCHETYPES.find((item) => item.key === archetype);
  const portrait = archetype && look ? classPortraitSrc(archetype, look) : null;
  return (
    <div className="gx-who">
      <Head kicker="Your sheet" title="Who you are" />
      <div className="gx-who-grid">
        <section className="gx-panel gx-identity" data-rings={String(Math.min(4, Math.max(1, gifts)))}>
          <div className="gx-portrait">
            {portrait ? <img src={portrait} alt="" /> : <Silhouette />}
          </div>
          <div>
            <h2 className="sheet-display gx-h2">Example player</h2>
            <p className="gx-meta">{picked ? picked.name : "No class yet"}</p>
            <p className="gx-line">{picked ? picked.subtitle : "Pick a class below."}</p>
          </div>
        </section>
        <div className="gx-carousel" role="group" aria-label="Classes">
          <button type="button" className="gx-card-art" aria-pressed={archetype === null} onClick={() => onArchetype(null)}>
            <Silhouette />
            <span>None</span>
          </button>
          {ARCHETYPES.map((item) => {
            const src = classPortraitSrc(item.key, look ?? "f");
            return (
              <button key={item.key} type="button" className="gx-card-art" aria-pressed={archetype === item.key} onClick={() => onArchetype(item.key)}>
                {src ? <img src={src} alt="" /> : <Silhouette />}
                <span>{item.name.replace(/^The\s+/i, "")}</span>
              </button>
            );
          })}
        </div>
        <div className="gx-looks" role="group" aria-label="Class illustration">
          <button type="button" className="gx-btn gx-btn-quiet" aria-pressed={look === "f"} onClick={() => onLook("f")}>Illustration one</button>
          <button type="button" className="gx-btn gx-btn-quiet" aria-pressed={look === "m"} onClick={() => onLook("m")}>Illustration two</button>
        </div>
        <section className="gx-panel gx-capitals">
          <p className="sheet-kicker">Capitals</p>
          <ul className="gx-slots">
            {POOL_CAPITALS.map((capital) => {
              const on = SLOT_FILL[capital] !== "Open";
              return (
                <li key={capital} className={on ? "gx-slot gx-slot-on" : "gx-slot"}>
                  <span className="gx-slot-icon"><Mark kind={capital === "living" ? "leaf" : capital === "material" ? "stem" : capital === "financial" ? "sprout" : capital === "experiential" ? "sun" : capital === "social" ? "rain" : "heart"} /></span>
                  <b>{CAPITAL_LABELS[capital].label}</b>
                  <small>{SLOT_FILL[capital]} <Ex /></small>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="gx-panel gx-party">
          <p className="sheet-kicker">Guild</p>
          <p className="gx-meta"><b>Example Grove</b> <Ex /></p>
          <p className="gx-line">With Example player 2, Example player 4</p>
        </section>
        <section className="gx-panel gx-questprog">
          <p className="sheet-kicker">This week</p>
          <p className="gx-meta"><b>2 of 4</b> steps <Ex /></p>
          <div className="gx-bar gx-bar-on" aria-hidden="true"><span style={{ width: "50%" }} /></div>
          <p className="gx-line">Next: Name a gift</p>
        </section>
      </div>
    </div>
  );
}

function QuestScreen({ done, onAdvance }: { done: number; onAdvance: () => void }) {
  const segments = QUEST_STEPS.length - 1;
  const offset = 100 * (1 - Math.min(1, done / segments));
  return (
    <div className="gx-qlog">
      <Head kicker="This week" title="What to do next" />
      <div className="gx-qlog-grid">
        <ol className="gx-quest">
          <svg className="gx-vine gx-vine-v" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength="100" d="M10 0 V100" strokeDasharray="100" strokeDashoffset={offset} />
          </svg>
          {QUEST_STEPS.map((step, index) => {
            const complete = index < done;
            const now = index === done;
            const state = complete ? "gx-qstep gx-qstep-done" : now ? "gx-qstep gx-qstep-now" : "gx-qstep gx-qstep-bud";
            return (
              <li key={step.id} className={state}>
                <span className="gx-node"><Mark kind={complete ? "leaf" : now ? "sprout" : "bud"} /></span>
                <span className="gx-qcopy">
                  {"href" in step ? (
                    <a className="gx-step-hit" href={step.href}>{step.title}</a>
                  ) : (
                    <span className="gx-step-name">{step.title}</span>
                  )}
                  <small>{complete ? "Done" : now ? "Now" : "Later"} · {step.reward}</small>
                  {now ? (
                    <button type="button" className="gx-btn" data-testid="quest-advance" onClick={onAdvance}>
                      {step.title}
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        <section className="gx-panel gx-season-card">
          <p className="sheet-kicker">Season</p>
          <p className="gx-meta"><b>Week 2 of 13</b> <Ex /></p>
          <p className="gx-line">Streak: 2 calls</p>
          <div className="gx-bar gx-bar-on" aria-hidden="true"><span style={{ width: "15%" }} /></div>
        </section>
      </div>
    </div>
  );
}

function LockedScreen() {
  const cards = [
    { name: "Example Grove", why: "Your carpentry meets a build week" },
    { name: "Example Watershed", why: "A water need sits open" },
    { name: "Example Orchard", why: "A harvest role is unfilled" },
  ];
  return (
    <div className="gx-match">
      <Head kicker="Project matching" title="What's coming" />
      <section className="gx-panel gx-progress-card">
        <p className="gx-meta"><b className="sheet-display gx-h2">48</b> of 111 campaigns <Ex /></p>
        <div className="gx-bar gx-bar-on" role="progressbar" aria-valuemin={0} aria-valuemax={111} aria-valuenow={48} aria-valuetext="Example count, 48 of 111 active campaigns"><span /></div>
        <p className="gx-line">At 111, the sheet can suggest projects that fit your gifts.</p>
      </section>
      <ul className="gx-matches">
        {cards.map((card) => (
          <li key={card.name} className="gx-panel gx-match-card">
            <span className="gx-bud-icon" aria-hidden="true"><Mark kind="bud" /></span>
            <div>
              <p className="sheet-kicker">Budding</p>
              <b className="sheet-display">{card.name}</b> <Ex />
              <p className="gx-line">{card.why}</p>
            </div>
          </li>
        ))}
      </ul>
      <section className="gx-panel">
        <p className="sheet-kicker">How you help it grow</p>
        <p className="gx-line">Name a gift on your sheet. Each gift moves the count.</p>
        <button type="button" className="gx-btn">Name a gift</button>
      </section>
    </div>
  );
}

function PathsScreen({ season, onSeason }: { gate: string; season: string; onGate: (key: string) => void; onSeason: (name: string) => void }) {
  return (
    <div className="gx-paths">
      <Head kicker="Season 2" title="Which path is yours" />
      <div className="gx-path-grid">
        {SEASON_PATHS.map((path) => (
          <article key={path.name} className={season === path.name ? "gx-panel gx-path gx-path-on" : "gx-panel gx-path"}>
            <h2 className="sheet-display gx-h2">{path.name}</h2>
            <p className="gx-line"><b>Who</b> {path.who} <Ex /></p>
            <p className="gx-line"><b>Do</b> {path.steps}</p>
            <p className="gx-line"><b>Get</b> {path.get} <Ex /></p>
            <button type="button" className="gx-btn" aria-pressed={season === path.name} onClick={() => onSeason(path.name)}>
              {season === path.name ? "Chosen" : "Choose"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function HostingScreen({ level, onLevel }: { level: number; onLevel: (level: number) => void }) {
  const steps = VILLAGE_OS_OFFER.howHostingWorks;
  const current = steps[level - 1] ?? steps[1];
  const next = steps[level] ?? null;
  return (
    <div className="gx-host">
      <Head kicker="Example village" title="Where hosting stands" />
      <section className="gx-panel gx-host-now">
        <p className="sheet-kicker">Now · Level {level} <Ex /></p>
        <h2 className="sheet-display gx-h2">{current.title}</h2>
        <p className="gx-line">{current.body}</p>
      </section>
      {next ? (
        <section className="gx-panel">
          <p className="sheet-kicker">Next · Level {level + 1}</p>
          <h2 className="sheet-display gx-h2">{next.title}</h2>
          <p className="gx-line">{next.body}</p>
        </section>
      ) : null}
      <ol className="gx-ladder">
        {steps.map((step, index) => {
          const n = index + 1;
          const cls = n === level ? "gx-ladder-now" : n < level ? "gx-ladder-done" : "";
          return (
            <li key={step.title}>
              <button type="button" className={cls} aria-pressed={n === level} onClick={() => onLevel(n)}>
                <b>{n}</b> {step.title}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChromeStudy({ phase, shot, hand, onHand, portrait }: { phase: "before" | "after"; shot: boolean; hand: boolean; onHand: () => void; portrait: string | null }) {
  const [away, setAway] = useState(shot && phase === "after");
  const [film, setFilm] = useState(false);
  const last = useRef(0);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    if (phase !== "after") return;
    const top = event.currentTarget.scrollTop;
    if (top > last.current + 6 && top > 8) setAway(true);
    else if (top + 6 < last.current) setAway(false);
    last.current = top;
  };
  return (
    <div className="gx-chrome-screen">
      <Head kicker={phase === "before" ? "Before" : "After"} title={phase === "before" ? "First visit" : "After the scroll"} />
      <div className={`gx-chrome gx-chrome-${phase}`}>
        <header className={away ? "gx-site-header gx-header-away" : "gx-site-header"}>
          <img src="/images/logos/regen-civics-emblem.webp" alt="" />
          <b>ReGen Civics</b>
        </header>
        {phase === "after" ? (
          <button type="button" className="gx-film" onClick={() => setFilm((open) => !open)}>Film</button>
        ) : null}
        <div className="gx-chrome-body" onScroll={onScroll}>
          <WeekScreen shot={shot} hand={hand} onHand={onHand} portrait={portrait} inset />
          {film ? <p className="gx-cue">The welcome film waits here until you ask for it.</p> : null}
        </div>
        {phase === "before" ? (
          <div className="gx-cookie">
            <strong>Cookie Preferences</strong>
            <p>We use cookies for essential site functionality and analytics to improve your experience.</p>
            <div className="gx-dock">
              <button type="button" className="gx-btn gx-btn-quiet">Essential Only</button>
              <button type="button" className="gx-btn">Accept All Cookies</button>
            </div>
          </div>
        ) : (
          <div className="gx-cookie gx-cookie-compact">
            <p>Cookies</p>
            <button type="button" className="gx-btn">Accept</button>
          </div>
        )}
        {phase === "before" ? (
          <div className="gx-modal">
            <div className="gx-modal-card">
              <img className="gx-hero" src="/images/backgrounds/community-hero-mobile.webp" alt="" />
              <div className="gx-modal-copy">
                <img src="/images/logos/regen-civics-emblem.webp" alt="" width={40} height={40} />
                <h2 className="sheet-display">Welcome to ReGen Civics</h2>
                <div className="gx-dock" style={{ justifyContent: "center" }}>
                  <button type="button" className="gx-btn">Skip, I&apos;m ready</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <nav className="gx-tabbar" aria-label="Phone bar">
          {["Home", "Quests", "Community", "Profile", "More"].map((item) => <span key={item}>{item}</span>)}
        </nav>
        <nav className="gx-desktopbar" aria-label="Desktop bar">
          {["Quests", "Map", "Profile", "Music", "More"].map((item) => <span key={item}>{item}</span>)}
        </nav>
      </div>
    </div>
  );
}

function RecapScreen() {
  return (
    <div className="gx-recap">
      <Head kicker="Example session" title="What we did" />
      <div className="gx-recap-grid">
        <section className="gx-panel">
          <p className="sheet-kicker">The room shared</p>
          <p className="gx-line">Water, a bed, tools <Ex /></p>
          <p className="gx-meta"><b>4</b> hands raised <Ex /></p>
        </section>
        <section className="gx-panel">
          <p className="sheet-kicker">Some projects at the table</p>
          <p className="gx-meta"><b>Example Grove</b> <Ex /></p>
          <p className="gx-line">{ROOT.title} to {SPROUT.title}</p>
          <p className="gx-meta"><b>Example Watershed</b> <Ex /></p>
          <p className="gx-line">Stayed at {ROOT.title}</p>
        </section>
        <section className="gx-panel">
          <p className="sheet-kicker">You</p>
          <p className="gx-line">10 hrs carpentry, Experiential, to Example Grove <Ex /></p>
        </section>
        <section className="gx-panel gx-next-call">
          <p className="sheet-kicker">Next call</p>
          <p className="gx-meta"><b className="sheet-display gx-h2">6 days</b> <Ex /></p>
          <div className="gx-dock">
            <a className="gx-link" href={JOIN_URL}>Join the call</a>
            <a className="gx-link gx-btn-quiet" href={CALENDAR_HREF} target="_blank" rel="noopener noreferrer">Add to calendar</a>
          </div>
        </section>
      </div>
    </div>
  );
}

function GuildsScreen() {
  return (
    <div className="gx-guilds">
      <Head kicker="Guilds" title="Your crew" />
      <section className="gx-panel gx-my-guild">
        <div className="gx-banner" aria-hidden="true"><Mark kind="leaf" /></div>
        <div>
          <p className="sheet-kicker">Your guild</p>
          <h2 className="sheet-display gx-h2">Example Grove <Ex /></h2>
          <ul className="gx-member-line">
            <li>Example player · Spaceholder</li>
            <li>Example player 2 · Builder</li>
            <li>Example player 4 · Catalyst</li>
          </ul>
          <p className="gx-line">Latest: named 10 hrs carpentry</p>
          <a className="gx-link" href={HYLO_SEEDS_URL} target="_blank" rel="noopener noreferrer">Gather</a>
          <span className="gx-ex-tag">Example Hylo space</span>
        </div>
      </section>
      <p className="sheet-kicker">Also gather</p>
      <div className="gx-dock">
        <a className="gx-link" href={HYLO_SEEDS_URL} target="_blank" rel="noopener noreferrer">Gather</a>
        <span className="gx-ex-tag">Hylo, SEEDS group</span>
        <a className="gx-link" href={HOLOS_REGEN_CIVICS_URL} target="_blank" rel="noopener noreferrer">Gather</a>
        <span className="gx-ex-tag">Holos, Regen Civics holon</span>
      </div>
      <ul className="gx-other-guilds">
        {[
          { name: "Example Watershed", where: "Example Holos space", href: HOLOS_REGEN_CIVICS_URL, mark: "drop" as const, note: "Shared a water need" },
          { name: "Example Orchard", where: "Example Hylo space", href: HYLO_SEEDS_URL, mark: "bud" as const, note: "Opened a harvest role" },
        ].map((guild) => (
          <li key={guild.name} className="gx-panel gx-guild-row">
            <span className="gx-banner"><Mark kind={guild.mark} /></span>
            <div>
              <b className="sheet-display">{guild.name}</b> <Ex />
              <p className="gx-line">{guild.note}</p>
              <a className="gx-link" href={guild.href} target="_blank" rel="noopener noreferrer">Gather</a>
              <span className="gx-cue">{guild.where}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SplashScreen({ splashKey, onReplay, shot }: { splashKey: number; onReplay: () => void; shot: boolean }) {
  return (
    <div className="gx-splash">
      <div className="gx-splash-art" data-testid="splash-stage" key={splashKey}>
        <svg className="gx-seedling" viewBox="0 0 240 260" role="img" aria-label="A seed growing into a sprout">
          <ellipse cx="120" cy="214" rx="78" ry="16" fill="var(--sheet-raised)" />
          <g className="gx-seed-stem">
            <path d="M120 210 V108" fill="none" stroke="var(--sheet-living)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="120" cy="208" r="6" fill="var(--sheet-gold)" />
          </g>
          <path className="gx-seed-leaf-l" d="M120 150c-36-4-52-36-44-64 32 6 50 30 44 64z" fill="var(--sheet-living)" />
          <path className="gx-seed-leaf-r" d="M120 136c36-4 52-36 44-64-32 6-50 30-44 64z" fill="var(--sheet-living)" />
        </svg>
        <h1 className="sheet-display gx-splash-word">ReGen</h1>
      </div>
      <p className="gx-cue">Session alerts. Wind chime.</p>
      {shot ? null : (
        <button type="button" className="gx-btn gx-btn-quiet" data-testid="splash-replay" onClick={onReplay}>Again</button>
      )}
    </div>
  );
}

function InstallScreen() {
  const benefits = [
    { title: "Session alerts", line: "A note when the room opens.", cue: "Birdsong" },
    { title: "The call, one tap", line: "Join the call from the home screen.", cue: "" },
    { title: "Your sheet", line: "Gifts, quests, and your guild stay one tap away.", cue: "" },
  ];
  return (
    <div className="gx-install">
      <Head kicker="On your phone" title="Why install" />
      <ul className="gx-benefits">
        {benefits.map((item) => (
          <li key={item.title} className="gx-panel">
            <b className="sheet-display">{item.title}</b>
            <p className="gx-line">{item.line}</p>
            {item.cue ? <p className="gx-cue">{item.cue}</p> : null}
          </li>
        ))}
      </ul>
      <section className="gx-panel gx-install-action">
        <div className="gx-appicon">
          <img className="gx-icon-live" src="/images/logos/regen-civics-emblem.webp" alt="" />
          <span>ReGen</span>
        </div>
        <button type="button" className="gx-btn">Install</button>
        <button type="button" className="gx-btn gx-btn-quiet">Not now</button>
      </section>
    </div>
  );
}

export default function GameExperiencePreview() {
  const reduced = useReducedMotion();
  const shot = queryIs("shot", "1");
  const chrome = !shot && !queryIs("chrome", "0");
  const [screen, setScreen] = useState<ScreenId>(readScreen);
  const [hand, setHand] = useState(shot);
  const [gifts, setGifts] = useState(shot ? 3 : 2);
  const [bloomed, setBloomed] = useState(shot);
  const [done, setDone] = useState(shot ? 2 : 1);
  const [archetype, setArchetype] = useState<string | null>(shot ? "facilitating" : null);
  const [look, setLook] = useState<PortraitPresentation | null>(shot ? "f" : null);
  const [season, setSeason] = useState<string>(SEASON_PATHS[1].name);
  const [level, setLevel] = useState(2);
  const [splashKey, setSplashKey] = useState(0);

  useEffect(() => {
    const onPop = () => setScreen(readScreen());
    const onGo = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (isScreen(next)) setScreen(next);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("gx-go", onGo);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("gx-go", onGo);
    };
  }, []);

  const go = (next: ScreenId) => {
    setScreen(next);
    const url = new URL(window.location.href);
    url.searchParams.set("screen", next);
    window.history.pushState({}, "", url);
  };

  const addGift = () => {
    lightTap();
    setGifts((count) => Math.min(4, count + 1));
    setBloomed(true);
  };

  const index = SCREENS.findIndex((item) => item.id === screen);
  const portrait = archetype && look ? classPortraitSrc(archetype, look) : null;

  let body: ReactNode = null;
  if (screen === "week") body = <WeekScreen shot={shot} hand={hand} onHand={() => setHand((value) => !value)} portrait={portrait} />;
  else if (screen === "reward") body = <RewardScreen gifts={gifts} bloomed={bloomed} onAdd={addGift} reduced={reduced || shot} />;
  else if (screen === "sheet") {
    body = (
      <SheetScreen
        archetype={archetype}
        look={look}
        gifts={gifts}
        onArchetype={(key) => {
          setArchetype(key);
          if (key && !look) setLook("f");
        }}
        onLook={setLook}
        onAdd={addGift}
      />
    );
  } else if (screen === "quests") body = <QuestScreen done={done} onAdvance={() => setDone((count) => Math.min(QUEST_STEPS.length, count + 1))} />;
  else if (screen === "locked") body = <LockedScreen />;
  else if (screen === "paths") body = <PathsScreen gate="hosted" season={season} onGate={() => undefined} onSeason={setSeason} />;
  else if (screen === "hosting") body = <HostingScreen level={level} onLevel={setLevel} />;
  else if (screen === "phone-before") body = <ChromeStudy phase="before" shot={shot} hand={hand} onHand={() => setHand((value) => !value)} portrait={portrait} />;
  else if (screen === "phone-after") body = <ChromeStudy phase="after" shot={shot} hand={hand} onHand={() => setHand((value) => !value)} portrait={portrait} />;
  else if (screen === "recap") body = <RecapScreen />;
  else if (screen === "guilds") body = <GuildsScreen />;
  else if (screen === "splash") body = <SplashScreen splashKey={splashKey} shot={shot} onReplay={() => setSplashKey((key) => key + 1)} />;
  else body = <InstallScreen />;

  return (
    <div className={shot ? "sheet-night gx-root gx-shot" : "sheet-night gx-root"} data-gx-root data-screen={screen}>
      <SEO
        noIndex
        title="Game experience mockup"
        description="Design mockup with example data. It is not part of the live site."
        url="https://regencivics.earth/preview/game"
      />
      <div className="gx-canopy" aria-hidden="true"><i /><i /><i /></div>
      <div className="gx-stage">
        <div className="gx-stage-inner" key={screen}>{body}</div>
      </div>
      {chrome ? (
        <nav className="gx-rail" aria-label="Mockup screens">
          <button type="button" onClick={() => go(SCREENS[(index - 1 + SCREENS.length) % SCREENS.length].id)}>Back</button>
          <label className="sr-only" htmlFor="gx-jump">Screen</label>
          <select id="gx-jump" value={screen} onChange={(event) => go(event.target.value as ScreenId)}>
            {SCREENS.map((item, itemIndex) => (
              <option key={item.id} value={item.id}>{itemIndex + 1}. {item.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => go(SCREENS[(index + 1) % SCREENS.length].id)}>Onward</button>
          <span className="gx-rail-note">Design mockup. Example data.</span>
        </nav>
      ) : null}
    </div>
  );
}
