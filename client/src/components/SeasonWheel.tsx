/**
 * SeasonWheel: the ReGen Civics Year, as one interactive wheel.
 *
 * Four quarters around a painted village that changes with the season. The
 * current season glows and carries a pulsing "now" marker placed by how far
 * into the season we are. Pick any season (the corner tabs, the ring itself,
 * the arrow keys, or "Turn the wheel") and the village, the particles, the
 * background, and the panel beside it all follow.
 *
 * Everything it says comes from shared/regenYear.ts. This file is only the
 * look: geometry, color, and motion.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight, Compass, Globe, MapPin, Pause, Play, Wind } from "lucide-react";
import {
  REGEN_SEASONS,
  REGEN_SEASON_ORDER,
  TURNING_POINTS,
  nextRegenSeason,
  previousRegenSeason,
  regenSeasonSpan,
  REGEN_LANDS,
  REGEN_LAND_ORDER,
  characterLabel,
  guessLandFromTimeZone,
  type LandKey,
  type RegenSeasonKey,
} from "@shared/regenYear";
import { SEASON_THEMES } from "@/lib/seasons";
import { SEASON_LOOK } from "@/lib/seasonLook";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trpc } from "@/lib/trpc";

// ─── Look ───────────────────────────────────────────────────────────────────

const LOOK = SEASON_LOOK;

/** The land ring's colors: a land's own season, painted like the wheel's. */
const NATURAL_COLOR: Record<"winter" | "spring" | "summer" | "autumn", string> = {
  winter: SEASON_LOOK.winter.color,
  spring: SEASON_LOOK.spring.color,
  summer: SEASON_LOOK.summer.color,
  autumn: SEASON_LOOK.fall.color,
};

const LAND_STORAGE_KEY = "regen_year_land";

// ─── Geometry ───────────────────────────────────────────────────────────────

const VB = 480;
const C = VB / 2;
const R_OUT = 198;
const R_IN = 152;
const R_MID = (R_OUT + R_IN) / 2;
const R_IMG = 143;
const R_FLOW = 147.5;

/**
 * Where each season's quarter starts on the dial, in SVG degrees (0 is three
 * o'clock, angles grow clockwise). The turning points sit on the cardinal
 * points, so winter fills the top left, spring the top right, summer the
 * bottom right, and fall the bottom left. That makes the left half inward and
 * the right half outward, the top half mostly online and the bottom half on
 * the land.
 */
const START_DEG: Record<RegenSeasonKey, number> = {
  winter: 180,
  spring: 270,
  summer: 360,
  fall: 450,
};

const GAP_DEG = 1.4;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

/** An annular sector from a0 to a1 (degrees, clockwise). */
function sectorPath(r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M${fmt(x0)} ${fmt(y0)}`,
    `A${r1} ${r1} 0 ${large} 1 ${fmt(x1)} ${fmt(y1)}`,
    `L${fmt(x2)} ${fmt(y2)}`,
    `A${r0} ${r0} 0 ${large} 0 ${fmt(x3)} ${fmt(y3)}`,
    "Z",
  ].join(" ");
}

/** An arc for curved text. Clockwise text reads upright on the top half. */
function arcPath(r: number, a0: number, a1: number, clockwise: boolean) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${fmt(x0)} ${fmt(y0)} A${r} ${r} 0 0 ${clockwise ? 1 : 0} ${fmt(x1)} ${fmt(y1)}`;
}

const CORNER: Record<RegenSeasonKey, string> = {
  winter: "left-0 top-0 items-start text-left",
  spring: "right-0 top-0 items-end text-right",
  summer: "right-0 bottom-0 items-end text-right",
  fall: "left-0 bottom-0 items-start text-left",
};

// ─── Particles ──────────────────────────────────────────────────────────────

const SEEDS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  // Negative delays start every particle mid-flight, so the sky is already
  // full on the first frame instead of emptying in from the top.
  delay: -((i * 1.9) % 16),
  duration: 12 + (i % 5) * 2.6,
  size: 4 + (i % 4) * 2,
  drift: ((i % 7) - 3) * 22,
  spin: (i % 2 ? 1 : -1) * (160 + (i % 3) * 110),
  opacity: 0.45 + (i % 4) * 0.12,
}));

const PETALS = ["#f7c6d9", "#fdeef4", "#f4a9c4"];
const LEAVES = ["#ea8a3c", "#d4a574", "#c4552b", "#e8a838"];

function SeasonParticles({ season }: { season: RegenSeasonKey }) {
  return (
    <div key={season} className="rw-particles rw-panel-in" aria-hidden="true">
      {SEEDS.map((p, i) => {
        const rises = season === "summer";
        let style: CSSProperties = {
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${rises ? p.duration * 0.7 : p.duration}s`,
          ["--rw-drift" as string]: `${p.drift}px`,
          ["--rw-spin" as string]: `${p.spin}deg`,
          ["--rw-opacity" as string]: String(p.opacity),
        };
        if (season === "winter") {
          style = {
            ...style,
            width: p.size,
            height: p.size,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 72%)",
          };
        } else if (season === "spring") {
          style = {
            ...style,
            width: p.size * 1.7,
            height: p.size,
            borderRadius: "100% 0 100% 0",
            background: PETALS[i % PETALS.length],
          };
        } else if (season === "summer") {
          style = {
            ...style,
            width: p.size,
            height: p.size,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(255,214,110,1) 0%, rgba(242,193,78,0) 70%)",
            boxShadow: "0 0 10px 2px rgba(242,193,78,0.45)",
          };
        } else {
          style = {
            ...style,
            width: p.size * 1.7,
            height: p.size * 1.7,
            borderRadius: "0 100% 0 100%",
            background: LEAVES[i % LEAVES.length],
          };
        }
        return <span key={i} className={`rw-particle ${rises ? "rw-rise" : "rw-fall"}`} style={style} />;
      })}
    </div>
  );
}

// ─── Wheel ──────────────────────────────────────────────────────────────────

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function SeasonWheel({ now }: { now?: Date }) {
  const span = useMemo(() => regenSeasonSpan(now ?? new Date()), [now]);
  const current = span.season;
  const reduceMotion = useReducedMotion();

  const [selected, setSelected] = useState<RegenSeasonKey>(current);
  const [hovered, setHovered] = useState<RegenSeasonKey | null>(null);
  const [playing, setPlaying] = useState(false);
  // Only the current season's painting loads with the page; the other three
  // follow once the browser is idle, so the crossfade has them ready.
  const [painted, setPainted] = useState<Set<RegenSeasonKey>>(() => new Set([current]));
  const tabRefs = useRef<Partial<Record<RegenSeasonKey, HTMLButtonElement | null>>>({});

  // Where the visitor's land is: a first guess from the browser's time zone,
  // then whatever they pick, remembered in this browser only.
  const [land, setLand] = useState<LandKey>(() => {
    try {
      const saved = window.localStorage.getItem(LAND_STORAGE_KEY);
      if (saved === "northern" || saved === "southern" || saved === "equatorial") return saved;
    } catch {
      /* storage blocked: fall through to the guess */
    }
    try {
      return guessLandFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      return "northern";
    }
  });
  const chooseLand = (key: LandKey) => {
    setLand(key);
    try {
      window.localStorage.setItem(LAND_STORAGE_KEY, key);
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
  };
  const landNatural = REGEN_LANDS[land].natural;

  useEffect(() => {
    const t = window.setTimeout(() => setPainted(new Set(REGEN_SEASON_ORDER)), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const choose = useCallback((key: RegenSeasonKey) => {
    setPlaying(false);
    setSelected(key);
    setPainted((prev) => (prev.has(key) ? prev : new Set([...prev, key])));
  }, []);

  // "Turn the wheel": once around, starting after now and landing back on now.
  useEffect(() => {
    if (!playing) return;
    const seq: RegenSeasonKey[] = [];
    let k = current;
    for (let i = 0; i < REGEN_SEASON_ORDER.length; i++) {
      k = nextRegenSeason(k);
      seq.push(k);
    }
    let step = 0;
    setSelected(seq[0]);
    const id = window.setInterval(() => {
      step += 1;
      if (step >= seq.length) {
        setPlaying(false);
        return;
      }
      setSelected(seq[step]);
    }, reduceMotion ? 3200 : 2600);
    return () => window.clearInterval(id);
  }, [playing, current, reduceMotion]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    let target: RegenSeasonKey | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") target = nextRegenSeason(selected);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") target = previousRegenSeason(selected);
    else if (e.key === "Home") target = REGEN_SEASON_ORDER[0];
    else if (e.key === "End") target = REGEN_SEASON_ORDER[REGEN_SEASON_ORDER.length - 1];
    if (!target) return;
    e.preventDefault();
    choose(target);
    tabRefs.current[target]?.focus();
  };

  const season = REGEN_SEASONS[selected];
  const look = LOOK[selected];
  // Kept a little clear of the turning points so the marker never sits on
  // the gathering dot at the start or end of a season.
  const nowDeg = START_DEG[current] + 90 * Math.min(0.9, Math.max(0.1, span.progress));
  const [nowX, nowY] = polar(R_MID, nowDeg);
  const upNext = nextRegenSeason(current);

  const statusFor = (key: RegenSeasonKey) =>
    key === current ? "Now" : key === upNext ? "Next" : null;

  const opening =
    span.progress < 0.15
      ? `We're entering the ${REGEN_SEASONS[current].title}`
      : span.progress > 0.85
        ? `The ${REGEN_SEASONS[upNext].title} is almost here`
        : `We're in the ${REGEN_SEASONS[current].title}`;

  return (
    <section
      aria-labelledby="regen-year-title"
      className="relative overflow-hidden"
    >
      {/* Background: one layer per season, crossfaded. */}
      {REGEN_SEASON_ORDER.map((key) => (
        <div
          key={key}
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-b ${SEASON_THEMES[key].gradient} transition-opacity duration-1000`}
          style={{ opacity: key === selected ? 1 : 0 }}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.06), transparent 60%), linear-gradient(to bottom, transparent 70%, #0d2818 100%)",
        }}
      />
      <SeasonParticles season={selected} />

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-14 md:pt-28 md:pb-16">
        {/* Header */}
        <header className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <p
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 text-sm font-medium text-white/90 backdrop-blur-sm border"
            style={{ background: `${LOOK[current].color}1f`, borderColor: `${LOOK[current].color}55` }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping"
                style={{ background: LOOK[current].color }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: LOOK[current].color }} />
            </span>
            {opening} · Season {span.seasonNumber}
          </p>
          <h1
            id="regen-year-title"
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The ReGen Civics <span style={{ color: look.color }} className="transition-colors duration-700">Year</span>
          </h1>
          <p className="text-lg md:text-xl text-white/85 leading-relaxed safe-prose">
            Our year turns through four seasons: Design, Resource, Build, and Rest. They
            loosely follow the pattern of winter, spring, summer, and fall, so every land
            project can find its rhythm in them, wherever it is on Earth. Then the wheel comes
            back around and a new cohort of land projects begins.
          </p>
        </header>

        <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* ── The wheel ── */}
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[32rem] aspect-square">
              {/* Glow behind the wheel, in the chosen season's color */}
              <div
                aria-hidden="true"
                className="absolute inset-[14%] rounded-full blur-3xl transition-colors duration-1000"
                style={{ background: `${look.color}33` }}
              />

              <svg
                viewBox={`0 0 ${VB} ${VB}`}
                className="relative w-full h-full select-none"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <clipPath id="rw-disc">
                    <circle cx={C} cy={C} r={R_IMG} />
                  </clipPath>
                  <radialGradient id="rw-vignette" cx={C} cy={C} r={R_IMG} gradientUnits="userSpaceOnUse">
                    <stop offset="0.62" stopColor="#0a1f14" stopOpacity="0" />
                    <stop offset="1" stopColor="#0a1f14" stopOpacity="0.7" />
                  </radialGradient>
                  {REGEN_SEASON_ORDER.map((key) => (
                    <radialGradient
                      key={key}
                      id={`rw-fill-${key}`}
                      cx={C}
                      cy={C}
                      r={R_OUT}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset={R_IN / R_OUT} stopColor={LOOK[key].color} stopOpacity="0.55" />
                      <stop offset="1" stopColor={LOOK[key].color} stopOpacity="1" />
                    </radialGradient>
                  ))}
                  <filter id="rw-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="7" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  {REGEN_SEASON_ORDER.map((key) => {
                    const a = START_DEG[key];
                    const bottom = key === "fall";
                    return (
                      <path
                        key={key}
                        id={`rw-tp-${key}`}
                        d={bottom ? arcPath(R_OUT + 29, a + 26, a - 26, false) : arcPath(R_OUT + 17, a - 26, a + 26, true)}
                      />
                    );
                  })}
                </defs>

                {/* The village, one painting per season, crossfaded */}
                <circle cx={C} cy={C} r={R_IMG} fill="#0a1f14" />
                <g clipPath="url(#rw-disc)">
                  {REGEN_SEASON_ORDER.filter((key) => painted.has(key)).map((key) => (
                    <image
                      key={key}
                      href={LOOK[key].image}
                      xlinkHref={LOOK[key].image}
                      x={C - R_IMG * 1.78}
                      y={C - R_IMG}
                      width={R_IMG * 3.56}
                      height={R_IMG * 2}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ opacity: key === selected ? 1 : 0, transition: "opacity 900ms ease" }}
                    />
                  ))}
                  <circle cx={C} cy={C} r={R_IMG} fill="url(#rw-vignette)" />
                </g>
                <circle cx={C} cy={C} r={R_IMG} fill="none" stroke="rgba(240,235,227,0.18)" strokeWidth="1" />

                {/* The flow of the year, clockwise */}
                <circle
                  className="rw-flow"
                  cx={C}
                  cy={C}
                  r={R_FLOW}
                  fill="none"
                  stroke="rgba(240,235,227,0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="2 10"
                  strokeLinecap="round"
                />

                {/* The four quarters */}
                {REGEN_SEASON_ORDER.map((key) => {
                  const a0 = START_DEG[key] + GAP_DEG;
                  const a1 = START_DEG[key] + 90 - GAP_DEG;
                  const mid = START_DEG[key] + 45;
                  const isSel = key === selected;
                  const isHover = key === hovered && !isSel;
                  const pop = isSel ? 7 : isHover ? 3 : 0;
                  const [dx, dy] = [Math.cos((mid * Math.PI) / 180) * pop, Math.sin((mid * Math.PI) / 180) * pop];
                  // The icon steps aside when the "now" pill passes through the
                  // middle of its quarter, so the two never sit on each other.
                  let iconDeg = mid;
                  if (key === current && Math.abs(nowDeg - mid) < 16) {
                    iconDeg = nowDeg < mid ? nowDeg + 16 : nowDeg - 16;
                    iconDeg = Math.min(START_DEG[key] + 80, Math.max(START_DEG[key] + 10, iconDeg));
                  }
                  const [ix, iy] = polar(R_MID, iconDeg);
                  const Icon = LOOK[key].Icon;
                  return (
                    <g
                      key={key}
                      onClick={() => choose(key)}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        cursor: "pointer",
                        transform: `translate(${fmt(dx)}px, ${fmt(dy)}px)`,
                        transition: "transform 500ms cubic-bezier(0.34, 1.4, 0.64, 1)",
                      }}
                    >
                      <path
                        d={sectorPath(R_IN, R_OUT, a0, a1)}
                        fill={`url(#rw-fill-${key})`}
                        filter={isSel ? "url(#rw-glow)" : undefined}
                        style={{
                          opacity: isSel ? 1 : isHover ? 0.75 : 0.4,
                          transition: "opacity 500ms ease",
                        }}
                      />
                      <g
                        transform={`translate(${fmt(ix - 12)} ${fmt(iy - 12)})`}
                        style={{ opacity: isSel ? 1 : 0.8, transition: "opacity 500ms ease" }}
                      >
                        <Icon width={24} height={24} color={isSel ? LOOK[key].ink : "#f0ebe3"} strokeWidth={2} />
                      </g>
                    </g>
                  );
                })}

                {/* Progress through the current season */}
                <path
                  d={sectorPath(R_OUT + 3, R_OUT + 6, START_DEG[current] + GAP_DEG, nowDeg)}
                  fill={LOOK[current].color}
                  opacity="0.9"
                />

                {/* Your land's own seasons: one thin ring outside the wheel */}
                {landNatural ? (
                  REGEN_SEASON_ORDER.map((key) => (
                    <path
                      key={`land-${key}`}
                      d={sectorPath(R_OUT + 9, R_OUT + 12, START_DEG[key] + GAP_DEG, START_DEG[key] + 90 - GAP_DEG)}
                      fill={NATURAL_COLOR[landNatural[key]]}
                      opacity="0.85"
                      style={{ transition: "fill 600ms ease" }}
                    />
                  ))
                ) : (
                  <circle
                    cx={C}
                    cy={C}
                    r={R_OUT + 10.5}
                    fill="none"
                    stroke="rgba(240,235,227,0.5)"
                    strokeWidth="3"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                  />
                )}

                {/* Turning points: the gatherings where one season hands to the next */}
                {REGEN_SEASON_ORDER.map((key) => {
                  const [tx, ty] = polar(R_MID, START_DEG[key]);
                  return (
                    <g key={key}>
                      <circle cx={fmt(tx)} cy={fmt(ty)} r="5.5" fill="#0a1f14" stroke="#f0ebe3" strokeWidth="1.5" />
                      <text
                        className="max-sm:hidden"
                        fontSize="11"
                        letterSpacing="1.6"
                        fill="rgba(240,235,227,0.78)"
                        style={{ textTransform: "uppercase", fontFamily: "var(--font-body)" }}
                      >
                        <textPath href={`#rw-tp-${key}`} xlinkHref={`#rw-tp-${key}`} startOffset="50%" textAnchor="middle">
                          {TURNING_POINTS[key].label}
                        </textPath>
                      </text>
                    </g>
                  );
                })}

                {/* Now */}
                <g>
                  <circle className="rw-now-pulse" cx={fmt(nowX)} cy={fmt(nowY)} r="11" fill="#ffffff" />
                  <rect
                    x={fmt(nowX - 24)}
                    y={fmt(nowY - 10.5)}
                    width="48"
                    height="21"
                    rx="10.5"
                    fill="#ffffff"
                    stroke={LOOK[current].ink}
                    strokeWidth="2"
                  />
                  <text
                    x={fmt(nowX)}
                    y={fmt(nowY + 3.8)}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="800"
                    letterSpacing="1.5"
                    fill={LOOK[current].ink}
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    NOW
                  </text>
                </g>
              </svg>

              {/* Season tabs, one in each corner beside its quarter. They are 44px
                  already, so they opt out of the global touch overlay, whose
                  position: relative would pull them out of their corners. */}
              <div role="tablist" aria-label="Seasons of the ReGen Civics Year" aria-orientation="horizontal">
                {REGEN_SEASON_ORDER.map((key) => {
                  const s = REGEN_SEASONS[key];
                  const isSel = key === selected;
                  const status = statusFor(key);
                  const Icon = LOOK[key].Icon;
                  return (
                    <button
                      key={key}
                      ref={(el) => {
                        tabRefs.current[key] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`regen-year-tab-${key}`}
                      aria-selected={isSel}
                      aria-controls="regen-year-panel"
                      aria-label={`${s.title}, the ${s.pattern.toLowerCase()} of our year${status === "Now" ? ", where we are now" : ""}`}
                      tabIndex={isSel ? 0 : -1}
                      onClick={() => choose(key)}
                      onKeyDown={onTabKey}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      className={`no-touch-extend absolute ${CORNER[key]} flex flex-col min-h-11 min-w-11 max-w-[30%] rounded-xl px-2 py-1.5 transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${isSel ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
                    >
                      <span
                        className="flex items-center gap-1.5 text-[0.7rem] sm:text-xs font-bold uppercase tracking-[0.18em]"
                        style={{ color: LOOK[key].color }}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {s.pattern}
                      </span>
                      <span
                        className="text-lg sm:text-2xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {s.verb}
                      </span>
                      {status === "Now" && (
                        <span
                          aria-hidden="true"
                          className="hidden sm:inline-flex mt-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
                          style={{ background: LOOK[key].color, color: LOOK[key].ink }}
                        >
                          We are here
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                {playing ? "Stop" : "Turn the wheel"}
              </button>
              <div className="mt-2 w-full max-w-md">
                <p
                  id="regen-year-land-label"
                  className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75"
                >
                  Where's your land?
                </p>
                <div
                  role="group"
                  aria-labelledby="regen-year-land-label"
                  className="flex flex-wrap justify-center gap-2"
                >
                  {REGEN_LAND_ORDER.map((key) => {
                    const on = key === land;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => chooseLand(key)}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                          on
                            ? "border-white/70 bg-white text-[#0d2818]"
                            : "border-white/25 bg-white/5 text-white/85 hover:bg-white/10"
                        }`}
                      >
                        {on && <Globe className="h-4 w-4" aria-hidden="true" />}
                        {REGEN_LANDS[key].label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-white/75 leading-relaxed safe-prose">
                  <span className="font-semibold text-white/90">The thin outer ring is your land's own seasons.</span>{" "}
                  {REGEN_LANDS[land].guidance}
                </p>
              </div>
            </div>
          </div>

          {/* ── The chosen season ── */}
          <div
            id="regen-year-panel"
            role="tabpanel"
            aria-labelledby={`regen-year-tab-${selected}`}
            className="glass-panel rounded-3xl p-6 md:p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ borderColor: `${look.color}66` }}
          >
            <div key={selected} className="rw-panel-in">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {statusFor(selected) && (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ background: look.color, color: look.ink }}
                  >
                    {statusFor(selected) === "Now" ? `Now · Season ${span.seasonNumber}` : "Up next"}
                  </span>
                )}
                <span className="text-xs text-white/75">
                  {selected === current
                    ? `${dateFmt.format(span.start)} to ${dateFmt.format(span.end)}`
                    : `${TURNING_POINTS[selected].label} to ${TURNING_POINTS[nextRegenSeason(selected)].label}`}
                </span>
              </div>

              <p
                className="text-sm font-bold uppercase tracking-[0.2em] mb-1"
                style={{ color: look.color }}
              >
                {season.title} <span className="opacity-70">· {season.pattern}</span>
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {season.headline}
              </h2>
              <p className="text-white/85 text-base md:text-lg leading-relaxed mb-6 safe-prose">{season.summary}</p>

              {selected === current && (
                <div className="mb-6" aria-hidden="true">
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(3, Math.round(span.progress * 100))}%`, background: look.color }}
                    />
                  </div>
                </div>
              )}

              <p className="text-sm text-white/80 mb-6 safe-prose">
                Organized by{" "}
                <Link href="/team" className="font-semibold underline-offset-4 hover:underline" style={{ color: look.color }}>
                  {characterLabel(season.organizer.title, season.organizer.character)}
                </Link>
                , the {season.organizer.title}.
              </p>

              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 mb-3">What happens</h3>
              <ul className="space-y-2.5 mb-6">
                {season.happens.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/85">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: look.color }}
                    />
                    <span className="safe-prose">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 mb-7 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/85">
                  <Wind className="h-3.5 w-3.5" aria-hidden="true" />
                  {season.flow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/85">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {season.scope === "shared" ? "Online, shared by everyone" : "On the land, timed to your land"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/85">
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  {landNatural ? `On your land: ${landNatural[selected]}` : "On your land: dry or wet, by place"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-white/85">
                  Opens with {season.opensWith}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={season.cta.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 font-bold transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  style={{ background: look.color, color: look.ink }}
                >
                  {season.cta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => choose(previousRegenSeason(selected))}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/20 px-3 text-sm text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {REGEN_SEASONS[previousRegenSeason(selected)].verb}
                  </button>
                  <button
                    type="button"
                    onClick={() => choose(nextRegenSeason(selected))}
                    className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/20 px-3 text-sm text-white/85 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    {REGEN_SEASONS[nextRegenSeason(selected)].verb}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loose timelines, said plainly (Rye, 2026-09-24) */}
        <div
          className="mt-10 md:mt-12 mx-auto max-w-3xl rounded-2xl border border-[#d4a574]/45 bg-[#d4a574]/10 p-5 md:p-6 flex items-start gap-4"
          role="note"
        >
          <Compass className="h-6 w-6 shrink-0 text-[#e8c9a0] mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-[#f3dcc0] mb-1">Loose timelines, on purpose</p>
            <p className="text-sm md:text-base text-white/85 leading-relaxed safe-prose">
              This is our first full turn of the wheel, so we'll adjust the seasons to meet our
              needs this year. Treat these dates as a guide. The goal is a clear, steady pattern
              once we get going.
            </p>
          </div>
        </div>

        {/* How to play the chosen season */}
        <div className="mt-12 md:mt-16">
          <div key={`play-${selected}`} className="rw-panel-in">
            <div className="text-center mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: look.color }}>
                How to play the {season.title}
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Find your move this season
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {season.play.map((move) => (
                <Link
                  key={move.href + move.who}
                  href={move.href}
                  className="group flex flex-col rounded-2xl border bg-white/[0.05] p-5 transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  style={{ borderColor: `${look.color}40` }}
                >
                  <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: look.color }}>
                    {move.who}
                  </span>
                  <span className="mt-2 text-white/90 leading-relaxed safe-prose">{move.what}</span>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1.5 font-semibold" style={{ color: look.color }}>
                    {move.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
            <SeasonRoles season={selected} color={look.color} title={season.title} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Tolerates the json column: an array of season keys, or anything else. */
function roleSeasons(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      return roleSeasons(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * The Game roles active in a season, read live from the roles table (the same
 * source as /team). The season's organizer leads, then roles that belong to
 * fewer seasons, so the season's own roles come before the year-round ones.
 */
function SeasonRoles({ season, color, title }: { season: RegenSeasonKey; color: string; title: string }) {
  const rolesQuery = trpc.roles.list.useQuery(undefined, { staleTime: 60_000 });
  const organizer = REGEN_SEASONS[season].organizer.title;
  const inSeason = (rolesQuery.data ?? [])
    .filter((r) => r.kind === "game")
    .map((r) => ({ title: r.title, seasons: roleSeasons(r.seasons) }))
    .filter((r) => r.seasons.includes(season))
    .sort((a, b) =>
      a.title === organizer ? -1 : b.title === organizer ? 1 : a.seasons.length - b.seasons.length,
    )
    .slice(0, 6);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
      {inSeason.length > 0 && (
        <>
          <span className="text-white/75 mr-1">Roles in the {title}:</span>
          {inSeason.map((r) => (
            <span
              key={r.title}
              className="rounded-full border px-3 py-1 text-white/90"
              style={{ borderColor: `${color}55`, background: `${color}14` }}
            >
              {r.title}
            </span>
          ))}
        </>
      )}
      <Link
        href="/team"
        className="inline-flex min-h-11 items-center gap-1.5 px-2 font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded"
        style={{ color }}
      >
        Meet the roles
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default SeasonWheel;
