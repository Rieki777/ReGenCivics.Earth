/**
 * Design mockup for a unified game feel.
 * Example data only. Not linked from nav, sitemap, or live pages.
 * Route: /preview/game
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type UIEvent } from "react";
import { SEO } from "@/components/SEO";
import CharacterSheet from "@/components/character/CharacterSheet";
import { ARCHETYPES } from "@shared/archetypes";
import {
  POOL_CAPITALS,
  POOL_EVERYDAY,
  classPortraitSrc,
  type PortraitPresentation,
} from "@shared/characterSheet";
import { CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { HOLOS_REGEN_CIVICS_URL, HYLO_SEEDS_URL } from "@shared/communityLinks";
import { JOIN_URL } from "@shared/sessionLinks";
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

const LEVELS = ["Seed", "Sprout", "Sapling", "Tree"] as const;
const SEASON_PATHS = ["Investor", "Village Steward", "Resident", "Prosperity Creator"] as const;
const ROOM = [
  "Example player",
  "Example player 2",
  "Example player 3",
  "Example player 4",
  "Example player 5",
  "Example player 6",
  "Example player 7",
  "Example player 8",
] as const;

const QUEST_STEPS = [
  { id: "call", title: "Join the call", href: JOIN_URL },
  { id: "need", title: "Share one need" },
  { id: "gift", title: "Name a gift" },
  { id: "sit", title: "Sit with a project" },
] as const;

const CALENDAR_HREF =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
  encodeURIComponent("ReGen Civics session (example)") +
  "&details=" +
  encodeURIComponent("Join the call: https://regencivics.earth/join") +
  "&location=" +
  encodeURIComponent(JOIN_URL);

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

function useRoll(target: number, reduced: boolean): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / 720);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);
  return value;
}

function lightTap() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* this browser has no tap */
  }
}

function Head({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="gx-head">
      <div className="gx-kicker-row">
        <p className="sheet-kicker">{kicker}</p>
        {children}
      </div>
      <h1 className="sheet-display gx-title">{title}</h1>
    </header>
  );
}

function Mark({ kind }: { kind: Emote | "stem" | "leaf" | "drop" }) {
  if (kind === "sun") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="5.5" fill="currentColor" />
        <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M16 4v3.2M16 24.8V28M4 16h3.2M24.8 16H28M7.2 7.2l2.2 2.2M22.6 22.6l2.2 2.2M24.8 7.2l-2.2 2.2M9.4 22.6l-2.2 2.2" />
        </g>
      </svg>
    );
  }
  if (kind === "rain") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 14c0-4 3-7 7-7 2.4 0 4.5 1.2 5.8 3.1C22 9.4 23.4 9 25 9c3 0 5 2.2 5 5 0 .4 0 .7-.1 1H8.2C8.1 14.7 8 14.4 8 14z" fill="currentColor" opacity="0.85" />
        <path d="M12 20c1.2 3 1.2 5 0 7M18 19c1.2 3 1.2 5 0 7M24 20c1.2 3 1.2 5 0 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "heart") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 27C8 20 6 15 8.5 11.5 10.5 8.8 14 9.2 16 12c2-2.8 5.5-3.2 7.5-.5C26 15 24 20 16 27z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "stem") {
    return (
      <svg viewBox="0 0 32 48" aria-hidden="true">
        <path d="M16 46 V16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 22c-7-1-9-7-8-12 6 1 9 6 8 12z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "leaf") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 24c8-1 14-8 16-18-8 2-14 8-16 18z" fill="currentColor" />
        <path d="M10 22c3-4 6-8 10-12" fill="none" stroke="var(--sheet-ground)" strokeWidth="1" />
      </svg>
    );
  }
  if (kind === "drop") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 5c4 7 8 11 8 16a8 8 0 0 1-16 0c0-5 4-9 8-16z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 28V15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 18c-7-1-9-7-8-12 6 1.2 9 6 8 12z" fill="currentColor" />
      <path d="M16 16c7-1 9-7 8-12-6 1.2-9 6-8 12z" fill="currentColor" opacity="0.8" />
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
    <svg className={grown ? "gx-sprout gx-sprout-grown" : "gx-sprout"} viewBox="0 0 200 220" aria-hidden="true">
      <ellipse cx="100" cy="190" rx="70" ry="16" fill="var(--sheet-raised)" />
      <path d="M100 188 V92" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 120c-28-4-40-28-34-52 26 4 40 24 34 52z" fill="currentColor" />
      <path d="M100 108c28-4 40-28 34-52-26 4-40 24-34 52z" fill="currentColor" />
      <circle cx="100" cy="188" r="5" fill="var(--sheet-gold)" />
    </svg>
  );
}

const STILL_EMOTES: Array<{ kind: Emote; x: string; drift: string; rise: string }> = [
  { kind: "sprout", x: "22%", drift: "-16px", rise: "-78px" },
  { kind: "sun", x: "48%", drift: "20px", rise: "-120px" },
  { kind: "heart", x: "68%", drift: "8px", rise: "-52px" },
];

function WeekScreen({
  shot,
  hand,
  onHand,
  portrait,
}: {
  shot: boolean;
  hand: boolean;
  onHand: () => void;
  portrait: string | null;
}) {
  const [floaters, setFloaters] = useState<Array<{ id: number; kind: Emote; x: string; drift: string }>>([]);
  const [cue, setCue] = useState("");
  const nextId = useRef(1);

  const send = (kind: Emote) => {
    const id = nextId.current++;
    const drift = `${Math.round((Math.random() - 0.4) * 48)}px`;
    const x = `${18 + Math.round(Math.random() * 55)}%`;
    setFloaters((list) => [...list.slice(-5), { id, kind, x, drift }]);
    setCue(kind === "rain" ? "Water drop" : "Wind through leaves");
  };

  return (
    <>
      <Head kicker="Example week" title="Who's here">
        <span className="gx-ex-tag">Live</span>
      </Head>
      <div className="gx-week">
        <div className="gx-room">
          <svg className="gx-mycelium" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 120 C 80 40, 140 150, 200 80 S 320 30, 380 90" />
            <path d="M30 90 C 100 140, 180 40, 260 100 S 340 150, 390 70" />
          </svg>
          <div className="gx-float-layer" aria-hidden="true">
            {shot
              ? STILL_EMOTES.map((item) => (
                  <span
                    key={item.kind}
                    className={`gx-floater gx-floater-still${item.kind === "sun" ? " gx-floater-sun" : ""}`}
                    style={{ left: item.x, ["--gx-drift" as string]: item.drift, ["--gx-rise" as string]: item.rise } as CSSProperties}
                  >
                    <Mark kind={item.kind} />
                  </span>
                ))
              : floaters.map((item) => (
                  <span
                    key={item.id}
                    className={`gx-floater${item.kind === "sun" ? " gx-floater-sun" : ""}`}
                    style={{ left: item.x, ["--gx-drift" as string]: item.drift } as CSSProperties}
                    onAnimationEnd={() => setFloaters((list) => list.filter((floater) => floater.id !== item.id))}
                  >
                    <Mark kind={item.kind} />
                  </span>
                ))}
          </div>
          <div className="gx-avatars">
            {ROOM.map((name, index) => (
              <div key={name} className="gx-avatar" title={name}>
                {index === 0 && hand ? (
                  <span className="gx-stem gx-stem-grown">
                    <Mark kind="stem" />
                  </span>
                ) : null}
                {index === 0 && portrait ? (
                  <img src={portrait} alt={name} />
                ) : (
                  <Silhouette />
                )}
              </div>
            ))}
            <div className="gx-avatar gx-plus" aria-hidden="true">+4</div>
          </div>
          <p className="gx-ex" style={{ position: "relative", margin: "0.8rem 0 0" }}>
            <b className="sheet-display">12</b>
            <span>here</span>
            <span className="gx-ex-tag">example</span>
          </p>
        </div>
        <div>
          <div className="gx-dock" role="group" aria-label="Emotes">
            {(["sprout", "sun", "rain", "heart"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                className="gx-emote"
                data-testid={`emote-${kind}`}
                aria-label={kind === "heart" ? "Heart leaf" : kind}
                onClick={() => send(kind)}
              >
                <Mark kind={kind} />
              </button>
            ))}
            <button
              type="button"
              className="gx-btn gx-btn-quiet gx-hand"
              data-testid="raise-hand"
              aria-pressed={hand}
              onClick={onHand}
            >
              Raise a hand
            </button>
          </div>
          <p className="gx-cue" role="status" style={{ minHeight: "1.2rem", marginTop: "0.35rem" }}>{cue}</p>
          <p style={{ margin: "0.45rem 0" }}>
            <a className="gx-link" href={JOIN_URL}>Join the call</a>
          </p>
          <details className="gx-details">
            <summary>Live room</summary>
            <p>Updates arrive as they happen. Someone arrives, reacts, or raises a hand, and the room shows it.</p>
          </details>
        </div>
      </div>
    </>
  );
}

function RewardScreen({
  gifts,
  bloomed,
  onAdd,
  reduced,
}: {
  gifts: number;
  bloomed: boolean;
  onAdd: () => void;
  reduced: boolean;
}) {
  const shown = useRoll(gifts, reduced);
  return (
    <div className="gx-reward">
      <Head kicker="Example gift" title="A gift lands" />
      <div className="gx-reward-stage">
        <span className={bloomed ? "gx-ripple gx-ripple-on" : "gx-ripple"} aria-hidden="true" />
        <span className={bloomed ? "gx-ripple gx-ripple-on" : "gx-ripple"} aria-hidden="true" style={{ animationDelay: "0.18s" }} />
        <SproutArt grown={bloomed} />
        <span className={bloomed ? "gx-leaf gx-leaf-open" : "gx-leaf"} aria-hidden="true">
          <Mark kind="leaf" />
        </span>
      </div>
      <div className="gx-reward-read">
        <p className="gx-roll" aria-live="polite">
          <b className="sheet-display">{shown}</b>
          <span className="gx-ex-tag">example gifts</span>
        </p>
        <button type="button" className="gx-btn" data-testid="add-gift" onClick={onAdd}>
          Add an example gift
        </button>
        <p className="gx-cue" role="status">{bloomed ? "Water drop. Light tap on Android." : ""}</p>
      </div>
    </div>
  );
}

function SheetScreen({
  archetype,
  look,
  gifts,
  onArchetype,
  onLook,
  onAdd,
}: {
  archetype: string | null;
  look: PortraitPresentation | null;
  gifts: number;
  onArchetype: (key: string | null) => void;
  onLook: (look: PortraitPresentation) => void;
  onAdd: () => void;
}) {
  const showArt = Boolean(archetype && look);
  const filled = new Set<string>(["living", "social", "experiential"]);
  if (gifts >= 3) filled.add("material");
  const rings = [46, 38, 30, 22];
  return (
    <div className="gx-sheet-screen">
      <h1 className="sr-only">Example player</h1>
      <div className="gx-sheetwrap">
        <svg className="gx-rings" viewBox="0 0 100 100" aria-hidden="true">
          {rings.map((radius, index) => {
            const length = 2 * Math.PI * radius;
            const on = index < Math.min(gifts, rings.length);
            return (
              <circle
                key={radius}
                className={on ? "gx-ring gx-ring-on" : "gx-ring"}
                cx="50"
                cy="50"
                r={radius}
                strokeWidth={index === 0 ? 1.6 : 1.15}
                strokeDasharray={length}
                style={{ ["--gx-c" as string]: String(length) } as CSSProperties}
              />
            );
          })}
        </svg>
        {!showArt ? (
          <div className="gx-face-fallback">
            <Silhouette />
          </div>
        ) : null}
        <CharacterSheet
          displayName="Example player"
          primaryKey={archetype}
          partyKeys={[]}
          portraitPresentation={showArt ? look : null}
          signedIn
          stageIndex={Math.max(0, gifts - 1)}
          stageCount={6}
          statusLine=""
        />
      </div>
      <div className="gx-carousel" role="group" aria-label="Classes">
        <button
          type="button"
          className="gx-card-art"
          aria-pressed={archetype === null}
          onClick={() => onArchetype(null)}
        >
          <Silhouette />
          <span>Silhouette</span>
        </button>
        {ARCHETYPES.map((item) => {
          const src = classPortraitSrc(item.key, look ?? "f");
          return (
            <button
              key={item.key}
              type="button"
              className="gx-card-art"
              aria-pressed={archetype === item.key}
              onClick={() => onArchetype(item.key)}
            >
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
      <div className="gx-slots" aria-label="Six capitals">
        {POOL_CAPITALS.map((capital) => {
          const everyday = POOL_EVERYDAY[capital];
          const on = filled.has(capital);
          return (
            <div key={capital} className={on ? "gx-slot gx-slot-on" : "gx-slot"}>
              <b className="sheet-display">{CAPITAL_LABELS[capital].label}</b>
              <small>{everyday ?? (on ? "example" : "open")}</small>
            </div>
          );
        })}
      </div>
      <button type="button" className="gx-btn" onClick={onAdd}>Add an example gift</button>
    </div>
  );
}

function QuestScreen({ done, onAdvance }: { done: number; onAdvance: () => void }) {
  const segments = QUEST_STEPS.length - 1;
  const offset = 100 * (1 - Math.min(1, done / segments));
  return (
    <div className="gx-quest-screen">
      <Head kicker="This week" title="Quest log" />
      <ol className="gx-quest">
        <svg className="gx-vine gx-vine-v" viewBox="0 0 40 280" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d="M20 4 C 20 50 30 70 20 110 C 8 160 32 190 20 230 C 12 255 20 270 20 276" strokeDasharray="100" strokeDashoffset={offset} />
        </svg>
        <svg className="gx-vine gx-vine-h" viewBox="0 0 640 40" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="100" d="M4 22 C 80 4 140 36 220 18 C 320 0 400 36 500 16 C 560 8 600 22 636 20" strokeDasharray="100" strokeDashoffset={offset} />
        </svg>
        {QUEST_STEPS.map((step, index) => {
          const complete = index < done;
          const now = index === done;
          const className = complete ? "gx-qstep gx-qstep-done" : now ? "gx-qstep gx-qstep-now" : "gx-qstep";
          return (
            <li key={step.id} className={className}>
              <span className="gx-bloom" aria-hidden="true"><Mark kind="leaf" /></span>
              {"href" in step ? (
                <a className="gx-step-hit" href={step.href}>{step.title}</a>
              ) : (
                <button type="button" data-testid={now ? "quest-advance" : undefined} onClick={() => (now ? onAdvance() : undefined)}>
                  {step.title}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LockedScreen() {
  return (
    <div className="gx-locked">
      <Head kicker="Project matching" title="Under the soil">
        <span className="gx-ex">
          <b className="sheet-display">48</b>
          <span>of 111</span>
          <span className="gx-ex-tag">example count</span>
        </span>
      </Head>
      <div className="gx-soil" aria-hidden="true">
        <svg viewBox="0 0 360 200">
          <rect width="360" height="200" fill="var(--sheet-panel)" />
          <path d="M0 92 C 80 70 140 110 200 88 C 270 64 320 100 360 84 V 0 H 0 Z" fill="var(--sheet-ground)" opacity="0.55" />
          <path d="M0 108 C 70 128 150 90 220 112 C 290 132 330 100 360 114 V 200 H 0 Z" fill="var(--sheet-raised)" />
          <ellipse cx="176" cy="146" rx="11" ry="15" fill="var(--sheet-gold)" />
          <path d="M176 132 C 176 112 164 98 154 86" fill="none" stroke="var(--sheet-living)" strokeWidth="2" />
          <ellipse cx="150" cy="78" rx="9" ry="14" fill="var(--sheet-living)" />
        </svg>
      </div>
      <div
        className="gx-bar gx-bar-on"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={111}
        aria-valuenow={48}
        aria-valuetext="Example count, 48 of 111 active campaigns"
      >
        <span />
      </div>
      <p className="sheet-kicker" style={{ margin: 0 }}>Some projects at the table</p>
      <div className="gx-glimpse">
        <div><strong className="sheet-display">Example Grove</strong><span>a closed bud</span></div>
        <div><strong className="sheet-display">Example Watershed</strong><span>a closed bud</span></div>
      </div>
      <details className="gx-details">
        <summary>What opens</summary>
        <p>At 111 active campaigns, this sheet can suggest projects that fit the gifts on it.</p>
      </details>
    </div>
  );
}

function PathsScreen({
  gate,
  season,
  onGate,
  onSeason,
}: {
  gate: string;
  season: string;
  onGate: (key: string) => void;
  onSeason: (name: string) => void;
}) {
  const gates = [VILLAGE_OS_OFFER.self, VILLAGE_OS_OFFER.hosted, VILLAGE_OS_OFFER.custom];
  return (
    <div className="gx-paths">
      <Head kicker="Village OS" title="Choose a path" />
      <div className="gx-pick-row">
        {gates.map((card) => (
          <button
            key={card.key}
            type="button"
            className={gate === card.key ? "gx-pick gx-pick-on" : "gx-pick"}
            aria-pressed={gate === card.key}
            onClick={() => onGate(card.key)}
          >
            <span className="gx-mark-lg"><Mark kind={card.key === "hosted" ? "stem" : card.key === "custom" ? "leaf" : "sprout"} /></span>
            <span>
              <small>{card.gate}</small>
              <strong className="sheet-display">{card.title}</strong>
            </span>
          </button>
        ))}
      </div>
      <p className="sheet-kicker" style={{ margin: "0.2rem 0 0" }}>Season 2 paths</p>
      <div className="gx-season-row">
        {SEASON_PATHS.map((name) => (
          <button
            key={name}
            type="button"
            className="gx-season"
            aria-pressed={season === name}
            onClick={() => onSeason(name)}
          >
            <span className="sheet-display">{name}</span>
          </button>
        ))}
      </div>
      <details className="gx-details">
        <summary>Notes</summary>
        <p>{gates.find((card) => card.key === gate)?.blurb}</p>
      </details>
    </div>
  );
}

function HostingScreen({ level, onLevel }: { level: number; onLevel: (level: number) => void }) {
  return (
    <div className="gx-host">
      <Head kicker="Example village" title="Levels 1 to 4">
        <span className="gx-ex-tag">example</span>
      </Head>
      <div className="gx-level-row">
        {VILLAGE_OS_OFFER.howHostingWorks.map((step, index) => {
          const n = index + 1;
          const cls = n === level ? "gx-level gx-level-now" : n < level ? "gx-level gx-level-done" : "gx-level";
          return (
            <button key={step.title} type="button" className={cls} aria-pressed={n === level} onClick={() => onLevel(n)}>
              <span className="gx-mark-lg"><Mark kind={n === 1 ? "sprout" : n === 4 ? "leaf" : "stem"} /></span>
              <span>
                <small>Level {n} · {LEVELS[index]}</small>
                <strong className="sheet-display">{step.title}</strong>
              </span>
              <span className="gx-growth" aria-hidden="true"><i /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChromeStudy({ phase, shot }: { phase: "before" | "after"; shot: boolean }) {
  const [away, setAway] = useState(shot && phase === "after");
  const [film, setFilm] = useState(false);
  const last = useRef(0);
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    if (phase !== "after") return;
    const top = event.currentTarget.scrollTop;
    if (top > last.current + 6 && top > 12) setAway(true);
    else if (top + 6 < last.current) setAway(false);
    last.current = top;
  };
  return (
    <>
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
          <p className="sheet-kicker">Who&apos;s here</p>
          <div className="gx-avatars">
            {ROOM.slice(0, 5).map((name) => (
              <div key={name} className="gx-avatar"><Silhouette /></div>
            ))}
          </div>
          {phase === "after" && !shot ? <div className="gx-scroll-pad" /> : null}
          {film ? (
            <p className="gx-cue">The welcome film waits here until you ask for it.</p>
          ) : null}
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
                <img src="/images/logos/regen-civics-emblem.webp" alt="" width={56} height={56} />
                <h2 className="sheet-display">Welcome to ReGen Civics</h2>
                <div className="gx-dock" style={{ justifyContent: "center" }}>
                  <button type="button" className="gx-btn">Skip, I&apos;m ready</button>
                  <button type="button" className="gx-btn gx-btn-quiet">What is Regeneration?</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <nav className="gx-tabbar" aria-label="Phone bar">
          {["Home", "Quests", "Community", "Profile", "More"].map((item) => <span key={item}>{item}</span>)}
        </nav>
        <nav className="gx-desktopbar" aria-label="Desktop phone bar">
          {["Quests", "Map", "Profile", "Music", "More"].map((item) => <span key={item}>{item}</span>)}
        </nav>
      </div>
    </>
  );
}

function RecapScreen() {
  return (
    <div className="gx-recap">
      <Head kicker="Example session" title="The room" />
      <div className="gx-stats">
        <article className="gx-stat">
          <Mark kind="leaf" />
          <div>
            <p className="sheet-kicker" style={{ margin: 0 }}>Shared</p>
            <div className="gx-chips">
              <i>Water</i><i>A bed</i><i>Tools</i>
            </div>
            <span className="gx-ex-tag">example</span>
          </div>
        </article>
        <article className="gx-stat">
          <Mark kind="stem" />
          <div>
            <p className="gx-ex"><b className="sheet-display">4</b><span>hands</span><span className="gx-ex-tag">example</span></p>
          </div>
        </article>
        <article className="gx-stat">
          <svg className="gx-clock" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--sheet-edge)" strokeWidth="4" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--sheet-gold)" strokeWidth="4" strokeDasharray="150 201" strokeLinecap="round" transform="rotate(-90 40 40)" />
            <text x="40" y="46" textAnchor="middle" fill="var(--sheet-gold-lit)" fontSize="18" fontFamily="var(--sheet-display)">6</text>
          </svg>
          <div>
            <p className="gx-ex"><b className="sheet-display">6</b><span>days</span><span className="gx-ex-tag">example</span></p>
          </div>
        </article>
        <article className="gx-stat">
          <Mark kind="sprout" />
          <div>
            <p className="sheet-kicker" style={{ margin: 0 }}>Some projects at the table</p>
            <p style={{ margin: "0.2rem 0 0" }}>Example Grove, seed to sprout.</p>
          </div>
        </article>
      </div>
      <div className="gx-dock">
        <a className="gx-link" href={JOIN_URL}>Join the call</a>
        <a className="gx-link gx-btn-quiet" href={CALENDAR_HREF} target="_blank" rel="noopener noreferrer">Add to calendar</a>
      </div>
    </div>
  );
}

function Banner({ kind }: { kind: "leaf" | "water" | "fruit" | "table" }) {
  return (
    <span className="gx-banner" aria-hidden="true">
      <svg viewBox="0 0 80 64">
        <path d="M8 6 h64 v40 c-10 10-22 14-32 14 S18 56 8 46 Z" fill="var(--sheet-raised)" stroke="currentColor" />
        {kind === "water" ? (
          <path d="M40 16c6 8 12 12 12 18a12 12 0 0 1-24 0c0-6 6-10 12-18z" fill="var(--sheet-living)" />
        ) : kind === "fruit" ? (
          <circle cx="40" cy="32" r="10" fill="var(--sheet-gold)" />
        ) : kind === "table" ? (
          <path d="M18 40c8-16 36-16 44 0" fill="none" stroke="var(--sheet-living)" strokeWidth="2" />
        ) : (
          <path d="M28 44c10-2 18-12 20-24-12 2-20 12-20 24z" fill="var(--sheet-living)" />
        )}
      </svg>
    </span>
  );
}

function GuildsScreen() {
  const projects = [
    { name: "Example Grove", kind: "leaf" as const, href: HYLO_SEEDS_URL, where: "Example Hylo space" },
    { name: "Example Watershed", kind: "water" as const, href: HOLOS_REGEN_CIVICS_URL, where: "Example Holos space" },
    { name: "Example Orchard", kind: "fruit" as const, href: HYLO_SEEDS_URL, where: "Example Hylo space" },
  ];
  return (
    <div className="gx-guilds">
      <Head kicker="Guilds" title="Some projects at the table" />
      <article className="gx-guild">
        <Banner kind="table" />
        <div>
          <h2 className="sheet-display">The table</h2>
          <div className="gx-roster" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="gx-gather">
            <a className="gx-link" href={HYLO_SEEDS_URL} target="_blank" rel="noopener noreferrer">Gather</a>
            <span className="gx-ex-tag">Hylo, SEEDS group</span>
            <a className="gx-link" href={HOLOS_REGEN_CIVICS_URL} target="_blank" rel="noopener noreferrer">Gather</a>
            <span className="gx-ex-tag">Holos, Regen Civics holon</span>
          </div>
        </div>
      </article>
      {projects.map((project) => (
        <article key={project.name} className="gx-guild">
          <Banner kind={project.kind} />
          <div>
            <h2 className="sheet-display">{project.name}</h2>
            <span className="gx-ex-tag">example</span>
            <div className="gx-roster" aria-hidden="true"><i /><i /><i /></div>
            <div className="gx-gather">
              <a className="gx-link" href={project.href} target="_blank" rel="noopener noreferrer">Gather</a>
              <span className="gx-cue">{project.where}</span>
            </div>
          </div>
        </article>
      ))}
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
      <p className="gx-cue">Wind chime</p>
      {shot ? null : (
        <button type="button" className="gx-btn gx-btn-quiet" data-testid="splash-replay" onClick={onReplay}>Again</button>
      )}
    </div>
  );
}

function InstallScreen() {
  return (
    <div className="gx-install">
      <div className="gx-home" aria-label="Home screen">
        <div className="gx-appicon">
          <img className="gx-icon-live" src="/images/logos/regen-civics-emblem.webp" alt="ReGen" />
          ReGen
        </div>
        {["Leaf", "Rain", "Soil"].map((name) => (
          <div key={name} className="gx-appicon">
            <span className="gx-icon-fallback" />
            {name}
          </div>
        ))}
      </div>
      <div className="gx-prompt">
        <h1 className="sheet-display">Session starting</h1>
        <p>A note when the room opens.</p>
        <div className="gx-prompt-actions">
          <button type="button" className="gx-btn">Allow</button>
          <button type="button" className="gx-btn gx-btn-quiet">Not now</button>
        </div>
        <p className="gx-cue">Birdsong</p>
      </div>
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
  const [gate, setGate] = useState("hosted");
  const [season, setSeason] = useState<string>(SEASON_PATHS[1]);
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
    if (bloomed && gifts >= 3) {
      setBloomed(false);
      setGifts(2);
      window.setTimeout(() => {
        setGifts(3);
        setBloomed(true);
      }, 40);
      return;
    }
    setGifts((count) => Math.min(4, count + 1));
    setBloomed(true);
  };

  const index = SCREENS.findIndex((item) => item.id === screen);
  const portrait = archetype && look ? classPortraitSrc(archetype, look) : null;

  let body: ReactNode = null;
  if (screen === "week") {
    body = <WeekScreen shot={shot} hand={hand} onHand={() => setHand((value) => !value)} portrait={portrait} />;
  } else if (screen === "reward") {
    body = <RewardScreen gifts={gifts} bloomed={bloomed} onAdd={addGift} reduced={reduced || shot} />;
  } else if (screen === "sheet") {
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
  } else if (screen === "quests") {
    body = <QuestScreen done={done} onAdvance={() => setDone((count) => Math.min(QUEST_STEPS.length, count + 1))} />;
  } else if (screen === "locked") body = <LockedScreen />;
  else if (screen === "paths") body = <PathsScreen gate={gate} season={season} onGate={setGate} onSeason={setSeason} />;
  else if (screen === "hosting") body = <HostingScreen level={level} onLevel={setLevel} />;
  else if (screen === "phone-before") body = <ChromeStudy phase="before" shot={shot} />;
  else if (screen === "phone-after") body = <ChromeStudy phase="after" shot={shot} />;
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
