/**
 * QuestGameIntro, cinematic 4-panel intro shown to first-time visitors.
 * Only renders when localStorage "regen_game_entered" !== "true".
 *
 * Visual layer (added 2026-07-16): a living forest-portal backdrop, drawn
 * entirely with SVG + CSS so it stays self-contained (no new deps):
 *   - slow-rotating Seed of Life sacred geometry
 *   - drifting aurora glow blobs, colored per panel
 *   - rising spore particles
 *   - circular progress ring + step dots
 *   - staggered headline / body reveals, glowing CTA halo
 *   - per-panel R2 art, soft-masked so it vignettes into the backdrop
 * All motion is gated behind prefers-reduced-motion.
 */

import { useMemo, useState, type CSSProperties } from "react";
import { cdnImg } from "@/lib/utils";

interface QuestGameIntroProps {
  onEnter: () => void;
}

/** Panel art lives on R2 under generated/onboarding/ and is served through the
 *  /api/img resize proxy. Rendered at ~800px wide; the sources are 1600x2000
 *  (4:5) so they stay sharp on retina. */
const ART_BASE = "https://assets.regencivics.earth/generated/onboarding";

const PANELS = [
  {
    id: 0,
    heading: "Questing our way into a growing diversity of regenerative economic systems.",
    body: null as null | string,
    image: `${ART_BASE}/panel-1.webp`,
    imageAlt: "A forest trailhead opening between two ancient trees, a path leading toward a glowing sacred-geometry sun",
    pulse: true,
    cta: false,
    accent: "#7dd87d",
  },
  {
    id: 1,
    heading: "Acts that heal and grow you and us.",
    body: "Every quest is something you do in the world. Regenerate your body. Build soil. Plant abundance. Read something that shifts how you see and from where you create. Each quest grows your capabilities and increases our capabilities as a movement, improving our collective health and connecting you to the living world around you. Go at your own pace. The key is thriving.",
    image: `${ART_BASE}/panel-2.webp`,
    imageAlt: "Two hands cupping dark living soil, lowering a dew-covered seedling into the earth in morning light",
    pulse: false,
    cta: false,
    accent: "#5ec7a8",
  },
  {
    id: 2,
    heading: "Do the work. Earn the tokens.",
    body: "When you complete a quest, you earn tokens. Both to distribute the currency of the economic system we're co-creating together, and to distribute governance voice in our Infinite Game. This is your actual share of an economy built around healing, growth, and care. Your contribution is logged. Other players see it. Land projects see it. The record builds, quest by quest, person by person. This is the foundation from which we raise investment, seek donors, and bring real financial value into the movement, and build the financial systems of the future, today.",
    image: `${ART_BASE}/panel-3.webp`,
    imageAlt: "Golden seeds and motes of light rising from a harvest basket, tracing constellation lines in the dark",
    pulse: false,
    cta: false,
    accent: "#e6b84f",
  },
  {
    id: 3,
    heading: "Our Game Remembers.",
    body: "Quests can be qualifiers and signals. A land project might prioritize applicants who've completed the Non-Violent Communication course and the Healing Trauma Masterclass. One focused on food might look for those who've done Seed Saving, Food Foresting, and Healing Wholes. An intentional ecovillage might use the whole Rites of Passage series as its 13-quest requirement to apply. Quests are something we co-create together as tools to learn, evolve, and become better players of our Infinite Game.",
    image: `${ART_BASE}/panel-4.webp`,
    imageAlt: "An ancient tree with glowing growth rings, an ecovillage settling into dusk behind it",
    pulse: false,
    cta: true,
    accent: "#7dd87d",
  },
] as const;

/** Seed of Life: a central circle ringed by six, the classic sacred-geometry
 *  seed. Rendered faint and slowly rotating behind the content. */
function SeedOfLife({ color }: { color: string }) {
  const r = 90;
  const centers: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    centers.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return (
    <svg
      className="rgi-seed"
      viewBox="-200 -200 400 400"
      width="620"
      height="620"
      aria-hidden="true"
    >
      <g fill="none" stroke={color} strokeWidth="1.1">
        {centers.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
        <circle cx={0} cy={0} r={r * 2} strokeWidth="0.7" opacity="0.6" />
      </g>
    </svg>
  );
}

export function QuestGameIntro({ onEnter }: QuestGameIntroProps) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  // Panel art lives on R2 and may not be uploaded yet. Any image that 404s or
  // fails to decode is remembered here so the panel collapses cleanly to the
  // animated backdrop instead of showing a broken frame.
  const [brokenImages, setBrokenImages] = useState<Set<number>>(() => new Set());

  const panel = PANELS[current];
  const progress = (current + 1) / PANELS.length;

  // Stable spore field, generated once. Each spore drifts upward on its own
  // clock via CSS custom props, so the array never needs to re-render.
  const spores = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 5,
        delay: -Math.random() * 16,
        duration: 12 + Math.random() * 12,
        drift: (Math.random() - 0.5) * 60,
        opacity: 0.15 + Math.random() * 0.4,
      })),
    []
  );

  function handleNext() {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrent((c) => Math.min(c + 1, PANELS.length - 1));
      setTransitioning(false);
    }, 220);
  }

  function handleEnter() {
    localStorage.setItem("regen_game_entered", "true");
    onEnter();
  }

  // Circular progress ring geometry
  const ringR = 22;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div
      className="rgi-root fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: "#06160b" }}
    >
      <style>{`
        .rgi-root {
          --rgi-accent: ${panel.accent};
          /* The site's bottom nav is fixed, 4rem tall and also z-50
             (MobileTabBar on phones, SmartBottomNav from md up), so it paints
             over this overlay. Everything interactive has to end above it. */
          --rgi-nav-clear: calc(4rem + env(safe-area-inset-bottom, 0px));
          background:
            radial-gradient(ellipse 90% 70% at 50% 18%, rgba(125,216,125,0.10), transparent 60%),
            radial-gradient(ellipse 120% 90% at 50% 120%, rgba(10,31,15,0.9), #06160b 70%),
            #06160b;
        }

        /* The scrolling half of the overlay. Kept separate from .rgi-root so
           the ambient layers and the pinned chrome (progress ring, Skip) live
           outside the scrollport: they can neither scroll away nor stretch the
           scrollable area. Only the vertical axis scrolls -- the decorative
           layers are wider than a phone by design and used to drag a
           horizontal scrollbar along with them. */
        .rgi-scroll {
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column; align-items: center;
          overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 8rem 1.5rem calc(var(--rgi-nav-clear) + 2.5rem);
          /* Panels 3 and 4 are taller than a short phone. Plain center
             alignment overflows them upward, sliding the art and kicker under
             the progress ring; "safe" falls back to start alignment once the
             content stops fitting, so the top padding is always respected and
             the overflow scrolls downward instead. */
          justify-content: safe center;
        }

        /* Aurora glow blobs, tinted with the active panel accent */
        @keyframes rgi-aurora {
          0%   { transform: translate(-8%, -6%) scale(1);   }
          50%  { transform: translate(8%, 6%) scale(1.25);  }
          100% { transform: translate(-8%, -6%) scale(1);   }
        }
        .rgi-aurora {
          position: absolute; border-radius: 9999px; filter: blur(70px);
          mix-blend-mode: screen; pointer-events: none;
          transition: background-color 0.9s ease;
        }
        /* Sized off the viewport's larger axis with a floor: a plain vw size
           collapses to a ~180px dot on a portrait phone, which reads as a
           smudge in one corner rather than an ambient wash. */
        .rgi-aurora-a {
          width: clamp(300px, 46vmax, 720px); height: clamp(300px, 46vmax, 720px);
          left: -12%; top: -6%;
          background: radial-gradient(circle, var(--rgi-accent), transparent 68%);
          opacity: 0.28; animation: rgi-aurora 18s ease-in-out infinite;
        }
        .rgi-aurora-b {
          width: clamp(260px, 40vmax, 640px); height: clamp(260px, 40vmax, 640px);
          right: -14%; bottom: -6%;
          background: radial-gradient(circle, #2f8f6b, transparent 68%);
          opacity: 0.22; animation: rgi-aurora 22s ease-in-out infinite reverse;
        }

        /* Sacred geometry, slow rotation + breathe */
        @keyframes rgi-rotate { to { transform: rotate(360deg); } }
        @keyframes rgi-breathe {
          0%, 100% { opacity: 0.10; }
          50%      { opacity: 0.20; }
        }
        .rgi-seed-wrap {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -52%);
          animation: rgi-breathe 8s ease-in-out infinite;
          pointer-events: none;
        }
        .rgi-seed {
          /* The SVG's own width/height are the desktop size; these override
             them so the geometry fits inside a phone instead of being cropped
             into a few disconnected arcs. Height follows from the viewBox. */
          width: min(620px, 88vw);
          height: auto;
          animation: rgi-rotate 90s linear infinite;
          color: var(--rgi-accent);
          transition: color 0.9s ease;
        }

        /* Rising spores */
        @keyframes rgi-spore {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          12%  { opacity: var(--rgi-o); }
          88%  { opacity: var(--rgi-o); }
          100% { transform: translateY(-108vh) translateX(var(--rgi-drift)); opacity: 0; }
        }
        .rgi-spore {
          position: absolute; bottom: -6vh; border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #d6ffd6, var(--rgi-accent));
          box-shadow: 0 0 10px var(--rgi-accent);
          animation-name: rgi-spore; animation-timing-function: linear;
          animation-iteration-count: infinite; pointer-events: none;
        }

        /* Content reveals */
        @keyframes rgi-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.62; } }
        @keyframes rgi-fadein {
          from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes rgi-rise {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rgi-pulse { animation: rgi-pulse 3.4s ease-in-out infinite; }
        .rgi-fadein { animation: rgi-fadein 0.6s cubic-bezier(.2,.7,.3,1) forwards; }
        .rgi-fadeout { opacity: 0; transform: translateY(-10px); filter: blur(4px); transition: all 0.22s ease; }
        .rgi-stagger { opacity: 0; animation: rgi-rise 0.7s cubic-bezier(.2,.7,.3,1) forwards; }

        /* Panel art. Height-capped so the long panel bodies always win the
           space fight on short viewports; the 4:5 aspect ratio derives the
           width from that height rather than the other way round. */
        @keyframes rgi-img-in {
          from { opacity: 0; transform: scale(1.05); filter: blur(7px); }
          to   { opacity: 1; transform: scale(1);    filter: blur(0); }
        }
        .rgi-img-wrap {
          position: relative;
          margin: 0 auto 1.75rem;
          height: clamp(84px, 20vh, 232px);
          aspect-ratio: 4 / 5;
          /* Purely decorative: never swallow taps meant for the step dots,
             which the art can overlap on short viewports. */
          pointer-events: none;
        }
        .rgi-img-glow {
          position: absolute; inset: -14%;
          background: radial-gradient(circle, var(--rgi-accent), transparent 62%);
          filter: blur(20px); opacity: 0.3;
          transition: background 0.9s ease;
          pointer-events: none;
        }
        .rgi-img {
          position: relative;
          width: 100%; height: 100%;
          object-fit: cover;
          border-radius: 18px;
          /* Feather the frame so the art dissolves into the dark backdrop
             instead of sitting on it as a hard rectangle. */
          -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 46%, transparent 96%);
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 46%, transparent 96%);
          opacity: 0;
          animation: rgi-img-in 0.85s cubic-bezier(.2,.7,.3,1) forwards;
        }

        /* Headline gradient shimmer */
        @keyframes rgi-shimmer { to { background-position: 200% center; } }
        .rgi-heading {
          background: linear-gradient(100deg, #ffffff 20%, var(--rgi-accent) 42%, #ffffff 62%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          animation: rgi-shimmer 6s linear infinite;
        }
        /* The h2 carries both classes, and animation is a shorthand: without
           this, .rgi-heading's shimmer replaces .rgi-stagger's rgi-rise, the
           opacity 0 -> 1 reveal never runs, and the headline stays invisible.
           Both animations have to be declared together. */
        .rgi-heading.rgi-stagger {
          animation:
            rgi-rise 0.7s cubic-bezier(.2,.7,.3,1) forwards,
            rgi-shimmer 6s linear infinite;
        }

        /* CTA halo */
        @keyframes rgi-halo {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%      { transform: scale(1.14); opacity: 0.9; }
        }
        @keyframes rgi-ringspin { to { transform: rotate(360deg); } }
        .rgi-cta-wrap { position: relative; display: inline-flex; }
        .rgi-cta-halo {
          position: absolute; inset: -10px; border-radius: 9999px;
          background: radial-gradient(circle, var(--rgi-accent), transparent 70%);
          filter: blur(14px); animation: rgi-halo 2.6s ease-in-out infinite;
          pointer-events: none;
        }
        .rgi-cta {
          position: relative; z-index: 1;
          transition: transform 0.2s ease, box-shadow 0.3s ease;
        }
        .rgi-cta:hover { transform: translateY(-2px) scale(1.02); }

        .rgi-ring-track { stroke: rgba(255,255,255,0.14); }
        .rgi-ring-fill {
          stroke: var(--rgi-accent);
          transition: stroke-dashoffset 0.6s cubic-bezier(.2,.7,.3,1), stroke 0.9s ease;
          filter: drop-shadow(0 0 4px var(--rgi-accent));
        }

        @media (prefers-reduced-motion: reduce) {
          .rgi-aurora-a, .rgi-aurora-b, .rgi-seed, .rgi-seed-wrap,
          .rgi-spore, .rgi-pulse, .rgi-heading, .rgi-cta-halo,
          .rgi-fadein, .rgi-stagger, .rgi-img {
            animation: none !important;
          }
          .rgi-heading {
            -webkit-text-fill-color: #ffffff; color: #ffffff;
          }
          .rgi-fadein, .rgi-stagger, .rgi-img { opacity: 1 !important; transform: none !important; filter: none !important; }
          .rgi-fadeout { transition: none; }
        }
      `}</style>

      {/* Ambient background layers */}
      <div className="rgi-aurora rgi-aurora-a" aria-hidden="true" />
      <div className="rgi-aurora rgi-aurora-b" aria-hidden="true" />
      <div className="rgi-seed-wrap" aria-hidden="true">
        <SeedOfLife color={panel.accent} />
      </div>
      {spores.map((s, i) => (
        <span
          key={i}
          className="rgi-spore"
          style={{
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            // custom props consumed by the keyframes
            "--rgi-drift": `${s.drift}px`,
            "--rgi-o": `${s.opacity}`,
          } as CSSProperties}
          aria-hidden="true"
        />
      ))}

      {/* Skip — bottom left, lifted above the site's bottom nav. Left rather
          than right because the WizardRadialMenu FAB owns the bottom-right
          corner on phones at z-[60] and would sit on top of it. */}
      <button
        onClick={handleEnter}
        className="absolute left-4 text-white/70 hover:text-white text-sm transition-colors underline-offset-4 hover:underline z-20"
        style={{ bottom: "calc(var(--rgi-nav-clear) + 0.75rem)" }}
      >
        Skip
      </button>

      {/* Top scrim. The ring below is pinned rather than scrolling with the
          panel, so on a short viewport the long panel bodies slide underneath
          it. This fades them out on the way up instead of letting two layers
          of text collide. */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-[15]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,22,11,0.97) 0%, rgba(6,22,11,0.88) 48%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      {/* Progress ring + step dots (top center). Sits above the panel content:
          the centered content block is tall enough on short viewports to
          overlap this row, and it must not steal taps from the step dots. */}
      <div className="absolute top-7 left-0 right-0 flex flex-col items-center gap-3 z-20 pointer-events-none [&_button]:pointer-events-auto">
        <div className="relative" style={{ width: 56, height: 56 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <circle className="rgi-ring-track" cx="28" cy="28" r={ringR} fill="none" strokeWidth="3" />
            <circle
              className="rgi-ring-fill"
              cx="28"
              cy="28"
              r={ringR}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - progress)}
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center text-white/90 font-bold text-sm"
            style={{ fontFamily: "var(--font-accent, sans-serif)" }}
          >
            {current + 1}
            <span className="text-white/60">/{PANELS.length}</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {PANELS.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrent(p.id)}
              aria-label={`Go to panel ${p.id + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                p.id === current
                  ? "w-6 bg-[color:var(--rgi-accent)]"
                  : p.id < current
                  ? "w-2 bg-white/45"
                  : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrolling region: panel content + the Next button. */}
      <div className="rgi-scroll">
        {/* Panel content */}
        <div
          key={current}
          className={`relative max-w-2xl w-full text-center mx-auto ${
            transitioning ? "rgi-fadeout" : "rgi-fadein"
          }`}
        >
          {panel.image && !brokenImages.has(current) && (
            <div className="rgi-img-wrap">
              <span className="rgi-img-glow" aria-hidden="true" />
              <img
                className="rgi-img"
                src={cdnImg(panel.image, 800)}
                alt={panel.imageAlt}
                width={1600}
                height={2000}
                loading="eager"
                decoding="async"
                onError={() =>
                  setBrokenImages((prev) => {
                    const next = new Set(prev);
                    next.add(current);
                    return next;
                  })
                }
              />
            </div>
          )}

          <div
            className="text-[color:var(--rgi-accent)] text-xs font-bold uppercase tracking-[0.3em] mb-6 rgi-stagger"
            style={{ fontFamily: "var(--font-accent, sans-serif)", animationDelay: "0.05s" }}
          >
            {String(current + 1).padStart(2, "0")} / {String(PANELS.length).padStart(2, "0")}
          </div>

          {panel.heading && (
            <h2
              className={`rgi-heading rgi-stagger text-3xl md:text-5xl font-bold leading-tight ${
                panel.body ? "mb-8" : ""
              } ${panel.pulse ? "rgi-pulse" : ""}`}
              style={{ fontFamily: "var(--font-display, serif)", animationDelay: "0.14s" }}
            >
              {panel.heading}
            </h2>
          )}

          {panel.body && (
            <p
              className="rgi-stagger text-lg md:text-xl text-white/80 leading-relaxed max-w-xl mx-auto"
              style={{ animationDelay: "0.26s" }}
            >
              {panel.body}
            </p>
          )}

          {panel.cta && (
            <div className="rgi-stagger mt-10" style={{ animationDelay: "0.4s" }}>
              <span className="rgi-cta-wrap">
                <span className="rgi-cta-halo" aria-hidden="true" />
                <button
                  onClick={handleEnter}
                  className="rgi-cta px-14 py-5 rounded-full font-bold text-xl shadow-lg"
                  style={{ backgroundColor: "var(--rgi-accent)", color: "#06160b" }}
                >
                  Start Your First Quest
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!panel.cta && (
          <div className="relative mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleNext}
              className="rgi-cta px-10 py-4 rounded-full font-bold text-lg shadow-lg"
              style={{ backgroundColor: "var(--rgi-accent)", color: "#06160b" }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-[1]"
        style={{
          background: "linear-gradient(to top, rgba(6,22,11,0.95) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
