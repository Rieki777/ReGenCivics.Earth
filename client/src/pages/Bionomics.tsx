/**
 * Bionomics Page - The Living Economy
 * Route: /bionomics
 *
 * Companion to /tokenomics. Bionomics is the Game side of the bridge:
 * the living economy of bioregions, food, gratitude, and $ReGen.
 *
 * Voice rules: zero em-dashes, no contrast framing, no AI-isms.
 * Mobile-first. Heavy use of collapsible accordions for depth-on-demand.
 *
 * Content draws on the BioFi Project's Bioregional Financing Facilities ebook
 * (BioFi Project, Dark Matter Labs, Buckminster Fuller Institute, 2024)
 * and on the SEEDS lineage that ReGen Civics evolved from.
 */

import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Pullquote } from "@/components/Pullquote";
import { ReadingTime } from "@/components/ReadingTime";
import { TLDR } from "@/components/TLDR";
import { Concept } from "@/components/Concept";
import {
  Leaf,
  Sprout,
  TreeDeciduous,
  Droplets,
  Sun,
  Moon,
  Heart,
  Users,
  Globe,
  Wallet,
  Coins,
  Mountain,
  Wheat,
  Bird,
  Compass,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  CircleDot,
  Circle,
  Flame,
  Network,
  HandHeart,
  Hammer,
  GitBranch,
  Library,
  Sparkles,
} from "lucide-react";
import { LandscapeSVG } from "@/components/backgrounds/LandscapeSVG";
import { RiverDivider } from "@/components/dividers/RiverDivider";
import { getBionomicsCopy } from "@/content/bionomicsContent";

/* ─── Color tokens ────────────────────────────────────────────────────── */

const C = {
  green: "#7dd87d",
  greenSoft: "#a8e6a8",
  amber: "#d4a574",
  gold: "#ffd700",
  teal: "#4a9f9f",
  deep: "#0d2818",
  forest: "#1a472a",
  earth: "#3a2818",
  bark: "#4a3525",
  bone: "#f4eede",
  violet: "#c8a8e0",
} as const;

/* ─── Yin/Yang Glyph (Tokenomics + Bionomics pair) ────────────────────── */

function BridgeYinYang({ size = 56 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Tokenomics and Bionomics, two sides of one bridge"
    >
      <defs>
        <linearGradient id="yyAmber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d4a574" />
          <stop offset="1" stopColor="#ffd700" />
        </linearGradient>
        <linearGradient id="yyGreen" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd87d" />
          <stop offset="1" stopColor="#2d6b3f" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
      {/* Amber half (Tokenomics) */}
      <path
        d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 0 50 50 A24 24 0 0 1 50 2 Z"
        fill="url(#yyAmber)"
      />
      {/* Green half (Bionomics) */}
      <path
        d="M50 2 A48 48 0 0 0 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2 Z"
        fill="url(#yyGreen)"
      />
      {/* Coin dot (in green half) */}
      <circle cx="50" cy="26" r="5" fill="#0d2818" />
      <circle cx="50" cy="26" r="2" fill="#d4a574" />
      {/* Leaf dot (in amber half) */}
      <circle cx="50" cy="74" r="5" fill="#0d2818" />
      <path d="M48 74 Q50 70 52 74 Q50 78 48 74 Z" fill="#7dd87d" />
    </svg>
  );
}

/* ─── Accordion: collapsible section primitive ────────────────────────── */

interface AccordionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
  accent?: string;
  children: ReactNode;
}

function Accordion({
  title,
  icon,
  defaultOpen = false,
  badge,
  badgeColor,
  accent = C.green,
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: open ? `${accent}66` : "rgba(255,255,255,0.10)",
        boxShadow: open ? `0 0 0 1px ${accent}22, 0 8px 32px rgba(0,0,0,0.25)` : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 md:gap-4 px-4 md:px-6 py-4 md:py-5 text-left hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        {icon ? (
          <span
            className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}1a`, color: accent }}
          >
            {icon}
          </span>
        ) : null}
        <h3
          className="flex-1 text-base md:text-xl font-bold text-white leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {badge ? (
          <span
            className="hidden sm:inline-flex text-[10px] md:text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border"
            style={{
              color: badgeColor ?? accent,
              background: `${badgeColor ?? accent}1a`,
              borderColor: `${badgeColor ?? accent}55`,
            }}
          >
            {badge}
          </span>
        ) : null}
        <ChevronDown
          className="flex-shrink-0 w-5 h-5 transition-transform"
          style={{
            color: accent,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div className="px-4 md:px-6 pb-5 md:pb-6 pt-1 text-white/80 leading-relaxed space-y-4 accordion-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── BFF Attribute Row ──────────────────────────────────────────────── */

type AttrStatus = "Building" | "Experimenting" | "Reaching";

function statusColor(s: AttrStatus): string {
  if (s === "Building") return "#7dd87d";
  if (s === "Experimenting") return "#ffd700";
  return "#7fb8d6";
}

function BFFAttributeRow({
  num,
  title,
  status,
  children,
}: {
  num: number;
  title: string;
  status: AttrStatus;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const c = statusColor(status);
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: open ? `${c}66` : "rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 md:px-5 py-3.5 text-left hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: `${c}1a`, color: c, border: `1px solid ${c}55` }}
        >
          {num}
        </span>
        <span
          className="flex-1 text-white text-sm md:text-base font-semibold leading-snug"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          {title}
        </span>
        <span
          className="hidden sm:inline-flex text-[10px] md:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color: c, background: `${c}1a`, border: `1px solid ${c}44` }}
        >
          {status}
        </span>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: c, transform: open ? "rotate(180deg)" : "rotate(0)" }}
        />
      </button>
      {open && (
        <div className="px-4 md:px-5 pb-4 pt-1 text-white/75 text-sm leading-relaxed accordion-fade-in">
          <div className="sm:hidden mb-2">
            <span
              className="inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ color: c, background: `${c}1a`, border: `1px solid ${c}44` }}
            >
              {status}
            </span>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── BFF Type Quadrant Card ─────────────────────────────────────────── */

function BFFTypeCard({
  title,
  icon,
  oneLiner,
  expression,
  link,
  linkLabel,
  accent,
}: {
  title: string;
  icon: ReactNode;
  oneLiner: string;
  expression: string;
  link: string;
  linkLabel: string;
  accent: string;
}) {
  return (
    <div
      className="mycelium-card card-tilt rounded-2xl border p-5 md:p-6 flex flex-col h-full"
      style={{
        background: `linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        borderColor: `${accent}40`,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1f`, color: accent }}
        >
          {icon}
        </span>
        <h3
          className="text-lg md:text-xl font-bold text-white leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      </div>
      <p className="text-white/65 text-sm italic mb-3">{oneLiner}</p>
      <p className="text-white/85 text-sm leading-relaxed mb-4 flex-1">{expression}</p>
      <Link
        href={link}
        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
        style={{ color: accent }}
      >
        {linkLabel} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

/* ─── Three Legs Triangle ────────────────────────────────────────────── */

function ThreeLegsTriangle() {
  return (
    <svg
      viewBox="0 0 320 280"
      className="w-full max-w-sm mx-auto"
      role="img"
      aria-label="Three legs of bioregional regeneration: Organizing Team, Bioregional Hub, Bioregional Financing Facility"
    >
      <defs>
        <radialGradient id="triGlow" cx="50%" cy="55%" r="60%">
          <stop offset="0" stopColor="#7dd87d" stopOpacity="0.25" />
          <stop offset="1" stopColor="#7dd87d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="155" rx="140" ry="110" fill="url(#triGlow)" />
      {/* Triangle */}
      <path
        d="M160 30 L290 240 L30 240 Z"
        fill="rgba(125,216,125,0.06)"
        stroke="#7dd87d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner connecting lines */}
      <line x1="160" y1="30" x2="160" y2="155" stroke="#7dd87d" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 4" />
      <line x1="290" y1="240" x2="160" y2="155" stroke="#7dd87d" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 4" />
      <line x1="30" y1="240" x2="160" y2="155" stroke="#7dd87d" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx="160" cy="155" r="6" fill="#ffd700" />
      {/* Top vertex: Hub */}
      <circle cx="160" cy="30" r="22" fill="#1a472a" stroke="#7dd87d" strokeWidth="2" />
      <text x="160" y="36" textAnchor="middle" fontSize="20" fill="#7dd87d">🏡</text>
      <text x="160" y="14" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">Hub</text>
      {/* Bottom right: BFF */}
      <circle cx="290" cy="240" r="22" fill="#1a472a" stroke="#d4a574" strokeWidth="2" />
      <text x="290" y="246" textAnchor="middle" fontSize="20">💰</text>
      <text x="290" y="270" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">BFF</text>
      {/* Bottom left: Team */}
      <circle cx="30" cy="240" r="22" fill="#1a472a" stroke="#4a9f9f" strokeWidth="2" />
      <text x="30" y="246" textAnchor="middle" fontSize="20">🤝</text>
      <text x="30" y="270" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">Team</text>
    </svg>
  );
}

/* ─── 4 Returns Card ─────────────────────────────────────────────────── */

function ReturnCard({
  title,
  icon,
  body,
  accent,
}: {
  title: string;
  icon: ReactNode;
  body: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl border p-5 md:p-6 h-full"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: `${accent}40`,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1f`, color: accent }}
        >
          {icon}
        </span>
        <h3
          className="text-base md:text-lg font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      </div>
      <p className="text-white/80 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

/* ─── P2P Food Economy Diagram ─────────────────────────────────────────
 * The 2017 watercolor sketch lives at /images/economy/p2p-food-system-2017.webp.
 * If the file is missing, the onError handler hides the broken image so the
 * page degrades gracefully.
 */

function P2PFoodEconomyImage() {
  return (
    <div className="my-8 space-y-6">
      <figure>
        <img
          src="/images/economy/p2p-food-system-bionomics.webp"
          alt="Peer-to-peer food economy: grower, courier, cook, eater, and neighbor cycling compost back to the grower, with $ReGen circulating alongside the food."
          className="w-full max-w-3xl mx-auto rounded-2xl border border-white/10 shadow-xl"
          loading="lazy"
          width="2752"
          height="1536"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <figcaption className="mt-2 text-sm text-center text-white/60">
          {getBionomicsCopy('p2p_food_caption')}
        </figcaption>
      </figure>
      <figure className="max-w-md mx-auto opacity-80">
        <img
          src="/images/economy/p2p-food-system-2017.webp"
          alt="The original 2017 sketch that started the idea: grower, courier, cook, eater, neighbor cycling back to the grower with $ReGen moving alongside the food."
          className="w-full rounded-lg"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <figcaption className="mt-2 text-xs text-center text-white/70 italic">
          The original 2017 sketch that started the whole idea.
        </figcaption>
      </figure>
    </div>
  );
}

/* ─── Timeline River ─────────────────────────────────────────────────── */

interface TimelineNode {
  year: string;
  title: string;
  body: string;
}

const TIMELINE: TimelineNode[] = [
  {
    year: "2017",
    title: "The seed question",
    body:
      "Bitcoin can spend billions a year on energy to back its currency. What if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? This is the question that started everything. A democratic financial system backed by local food systems.",
  },
  {
    year: "2018 to 2020",
    title: "SEEDS era",
    body:
      "Helping design and launch SEEDS, the first serious attempt at a regenerative currency with citizenship, harvest cycles, and a constitution. We learned what worked and what wanted to grow differently. Most of our work centered on figuring out the democratic and decentralized nature of that question. ReGen Civics is picking up the baton to focus again on food systems and regenerative land projects.",
  },
  {
    year: "2021 to 2022",
    title: "Tools and infrastructure",
    body:
      "Building the early versions of the Game's core tools. Hypha DAO tooling, the first experiments with forum, quests, incubator scaffolding, and land project Season 1 where we tested and built out much of our infrastructure and processes.",
  },
  {
    year: "2022",
    title: "The first incubator: Spring Season 1",
    body:
      "Land projects, mentors, and the first version of the seasonal rhythm. ReGen Civics is formed.",
  },
  {
    year: "2022 to 2025",
    title: "The long Winter Season 1",
    body:
      "Rest, recuperation, consideration, research, and listening. Composting what came before so something truer could grow next.",
  },
  {
    year: "2025",
    title: "The Fund takes shape (Winter)",
    body:
      "$RCivics and $ReGen dynamics. The Game and Bionomics. Tier system, gratitude protocol, Game Mechanics, and the foundations of what you see on the site, designed and ready to build.",
  },
  {
    year: "Early 2026",
    title: "Building starts (Winter)",
    body:
      "We rapidly develop and deploy the Bioregional Games, Land-Based Games, and the ReGen Civics home site. The first land project pilots adopt and adapt the Game structure.",
  },
  {
    year: "Fall 2026",
    title: "Season 2 (Spring)",
    body:
      "Thirteen land projects will go through the open-source process of co-creating their Games. The season ends with the first Crowdpooling Season, where projects pool various forms of capital to evolve their work.",
  },
  {
    year: "Looking ahead",
    title: "A networked Game",
    body:
      "A network of land-based and bioregional Games, each sovereign, all connected, all playing toward the ReGenerative Renaissance.",
  },
];

function TimelineRiver() {
  // Standard in-page layout: every entry visible at once, page scrolls
  // naturally past the whole list. No accordion, no scroll hijacking,
  // no step-locking. Each entry is a row with the year + dot indicator
  // on the left and the body content on the right, flowing top to bottom.
  return (
    <div className="space-y-6 md:space-y-8">
      {TIMELINE.map((node, i) => (
        <article
          key={i}
          className="rounded-xl border px-4 md:px-6 py-5 md:py-6"
          style={{
            background: "rgba(255,255,255,0.035)",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-start gap-3 md:gap-5">
            <span
              className="flex-shrink-0 w-16 md:w-24 text-right text-xs md:text-sm font-bold tracking-wide pt-0.5"
              style={{ color: C.amber, fontFamily: "var(--font-display)" }}
            >
              {node.year}
            </span>
            <span
              aria-hidden="true"
              className="flex-shrink-0 w-3 h-3 mt-1.5 rounded-full"
              style={{
                background: C.green,
                border: `2px solid ${C.green}`,
                boxShadow: `0 0 0 4px ${C.green}22`,
              }}
            />
            <div className="flex-1 min-w-0">
              <h3
                className="text-white text-base md:text-lg font-semibold leading-snug mb-2"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                {node.title}
              </h3>
              <div className="text-white/85 text-sm md:text-base leading-relaxed">
                {i === 0 ? getBionomicsCopy('seed_2017_text') : node.body}
                {i === 0 && (
                  <div className="mt-4">
                    <P2PFoodEconomyImage />
                    <p className="text-xs italic text-white/70 text-center mt-2">
                      {getBionomicsCopy('p2p_food_caption')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─── Section heading ────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  blurb,
  accent = C.green,
  titleClassName,
}: {
  eyebrow?: string;
  title: string;
  blurb?: string;
  accent?: string;
  titleClassName?: string;
}) {
  return (
    <div className="max-w-3xl mx-auto mb-8 md:mb-10">
      {eyebrow && (
        <p
          className="uppercase tracking-[0.2em] text-xs font-bold mb-2"
          style={{ color: accent, fontFamily: "var(--font-accent)" }}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-3xl md:text-4xl font-bold text-white mb-3 leading-tight ${titleClassName || ""}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      {blurb && (
        <p className="text-base md:text-lg text-white/75 leading-relaxed">{blurb}</p>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════ */
/*                              MAIN PAGE                                */
/* ═════════════════════════════════════════════════════════════════════ */

export default function Bionomics() {
  return (
    <PageWrapper>
      <SEO
        title="Bionomics | The Living Economy of ReGen Civics"
        description="Bionomics is the Game side of ReGen Civics: $ReGen, bioregional financing, local food systems, gratitude, and the Index Fund for the ReGenerative Renaissance. Built on the BioFi framework and the SEEDS lineage."
        image="/og/bionomics.webp"
        url="/bionomics"
      />

      {/* No min-h-screen on the outer wrapper. iOS Safari recomputes
          100vh every time its URL bar shows / hides, which triggered a
          jarring reflow ("vibration") right after the hero on mobile.
          The page already exceeds the viewport by a wide margin, so
          the min-h hint isn't needed; dropping it removes the resize
          loop. */}
      <div
        className="relative"
        style={{
          background:
            "radial-gradient(ellipse at top, #1a472a 0%, #0f3320 35%, #081a10 100%)",
        }}
      >
        {/* Subtle organic pattern overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #7dd87d 0, transparent 40%), radial-gradient(circle at 80% 70%, #d4a574 0, transparent 40%)",
          }}
        />

        <div className="relative">
          <div className="container px-4 pt-6">
            <BackButton />
          </div>

          {/* ════ 1. HERO ════════════════════════════════════════════ */}
          <section className="relative overflow-hidden">
            <LandscapeSVG seed="bionomics" className="absolute inset-0 text-[#7dd87d] pointer-events-none z-0" />
            <div className="container px-4 pt-8 md:pt-12 pb-10 md:pb-16 relative z-10">
              <div className="max-w-5xl mx-auto">
                {/* Hero image */}
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/blog-hero-bridging-worlds.webp"
                    alt="Bridging Worlds: a phoenix bridge between the dominant grey city and the regenerative living world"
                    className="blur-up w-full h-auto object-cover"
                    loading="eager"
                    fetchPriority="high"
                    width="1920"
                    height="1080"
                  />
                </div>

                {/* Hero title and description below the image */}
                <div className="mt-6 text-center px-4">
                  <Badge className="mb-3 bg-[#7dd87d]/90 text-[#0d2818] border-0 text-[11px] md:text-xs font-bold px-3 py-1">
                    <Leaf className="w-3.5 h-3.5 mr-1.5 inline" />
                    The Living Economy
                  </Badge>
                  <h1
                    className="word-reveal text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-none mb-2 md:mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <span>Bionomics</span>
                  </h1>
                  <ReadingTime words={3000} />
                  <p className="text-sm md:text-lg text-white/95 max-w-2xl mx-auto safe-prose">
                    {getBionomicsCopy('hero_blurb')}
                  </p>
                </div>

                <p
                  className="text-center text-sm md:text-base italic text-white/75 mt-4 md:mt-5 max-w-xl mx-auto"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Tokenomics is the bridge to the dominant Games. Bionomics is the Games
                  we are co-creating.
                </p>

                {/* Hero CTA row */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <Link href="/tokenomics">
                    <Button
                      size="lg"
                      variant="outline"
                      data-magnetic
                      data-ripple
                      className="rounded-full border-2 border-[#d4a574]/60 text-[#d4a574] hover:bg-[#d4a574]/15 px-5 md:px-7"
                      style={{ fontFamily: "var(--font-accent)" }}
                    >
                      <Coins className="w-4 h-4 mr-2" /> See Tokenomics
                    </Button>
                  </Link>
                  <span className="hidden sm:flex items-center px-1 bridge-rotate">
                    <BridgeYinYang size={36} />
                  </span>
                  <Link href="/game">
                    <Button
                      size="lg"
                      data-magnetic
                      data-ripple
                      className="rounded-full bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] font-bold px-5 md:px-7"
                      style={{ fontFamily: "var(--font-accent)" }}
                    >
                      <Sprout className="w-4 h-4 mr-2" /> Play the Game
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* TLDR */}
          <div className="container px-4 max-w-4xl mx-auto">
            <TLDR points={[
              "Bionomics is the living-economy framework behind ReGen Civics",
              "It bridges regenerative land projects with aligned capital through the Fund",
              "Every quest, contribution, and governance action feeds back into the system",
            ]} />
          </div>

          {/* ════ 2. THE DEFINITION ═════════════════════════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The Word"
                title="Bio. Bioregion. Economics."
                accent={C.greenSoft}
                titleClassName="story-grow"
              />
              <div
                className="rounded-3xl border border-[#7dd87d]/20 p-6 md:p-10 space-y-5 md:space-y-6 safe-prose"
                style={{ background: "rgba(13,40,24,0.5)", backdropFilter: "blur(8px)" }}
              >
                <p className="text-white/90 text-base md:text-lg leading-relaxed">
                  <strong className="text-[#7dd87d]">Bio.</strong> Life. The pulse of cells,
                  soil, mycelium, bird, river, person. The first economy was always the one
                  life was already running. It is currently still running, and it is asking
                  us humans to reorient towards it.
                </p>
                <p className="text-white/90 text-base md:text-lg leading-relaxed">
                  <strong className="text-[#7dd87d]">Bio also short for bioregion.</strong>{" "}
                  The scale at which living systems actually organize themselves. A
                  watershed. A foodshed. A continent's nervous system of mountains and
                  migration paths. The scale our work coordinates at.
                </p>
                <p className="text-white/90 text-base md:text-lg leading-relaxed">
                  <strong className="text-[#7dd87d]">Economics.</strong> The patterns and
                  principles by which a household manages itself. From{" "}
                  <em className="text-[#d4a574]">oikonomia</em>, the original word for
                  economy.
                </p>
                <div className="border-t border-[#7dd87d]/20 pt-5 md:pt-6">
                  <p className="text-white text-base md:text-lg leading-relaxed">
                    <strong className="text-[#ffd700]">Bionomics</strong>, then, is the
                    study of how life organizes its own economy and how we can mimic those
                    patterns. It is the work of remembering that we are part of an economy
                    that has been running for billions of years, and learning to play inside
                    it instead of around it.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Pullquote>The first economy was always the one life was already running. Bionomics is the work of remembering we are part of it.</Pullquote>

          {/* ════ 3. THE BRIDGE ═════════════════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-5xl">
              <SectionHeading
                eyebrow="The Two Sides"
                title="Two sides of one bridge"
                blurb="The Fund draws capital from the current Games (capitalism and everything downstream of it). The Game grows the new economies that capital is flowing toward. They need each other."
                titleClassName="story-grow"
              />

              <div className="mycelium-grid grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
                {/* Tokenomics side */}
                <Link href="/tokenomics" className="group">
                  <div
                    className="rounded-3xl border p-6 md:p-8 h-full transition-all group-hover:-translate-y-1 group-hover:border-[#d4a574]/70"
                    style={{
                      background:
                        "linear-gradient(160deg, rgba(212,165,116,0.10), rgba(13,40,24,0.5))",
                      borderColor: "rgba(212,165,116,0.30)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-12 h-12 rounded-2xl bg-[#d4a574]/20 text-[#d4a574] flex items-center justify-center">
                        <Coins className="w-6 h-6" />
                      </span>
                      <h3
                        className="text-2xl font-bold text-white"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        Tokenomics
                      </h3>
                    </div>
                    <ul className="space-y-2 text-white/80 text-sm md:text-base">
                      <li className="flex gap-2"><span className="text-[#d4a574]">•</span> The Fund</li>
                      <li className="flex gap-2"><span className="text-[#d4a574]">•</span> $RCivics</li>
                      <li className="flex gap-2"><span className="text-[#d4a574]">•</span> Capital from the current economic systems</li>
                      <li className="flex gap-2"><span className="text-[#d4a574]">•</span> Investment, fundraising, financial returns</li>
                      <li className="flex gap-2"><span className="text-[#d4a574]">•</span> How money moves into regenerative work</li>
                    </ul>
                    <div
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold group-hover:gap-2.5 transition-all"
                      style={{ color: C.amber }}
                    >
                      See Tokenomics <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>

                {/* Bionomics side */}
                <div
                  className="rounded-3xl border p-6 md:p-8 h-full"
                  style={{
                    background:
                      "linear-gradient(200deg, rgba(125,216,125,0.12), rgba(13,40,24,0.5))",
                    borderColor: "rgba(125,216,125,0.40)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-12 h-12 rounded-2xl bg-[#7dd87d]/20 text-[#7dd87d] flex items-center justify-center">
                      <Leaf className="w-6 h-6" />
                    </span>
                    <h3
                      className="text-2xl font-bold text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Bionomics
                    </h3>
                  </div>
                  <ul className="space-y-2 text-white/85 text-sm md:text-base">
                    <li className="flex gap-2"><span className="text-[#7dd87d]">•</span> The Game</li>
                    <li className="flex gap-2"><span className="text-[#7dd87d]">•</span> $ReGen</li>
                    <li className="flex gap-2"><span className="text-[#7dd87d]">•</span> Life flowing through bioregions</li>
                    <li className="flex gap-2"><span className="text-[#7dd87d]">•</span> Gratitude, food, land, culture</li>
                    <li className="flex gap-2"><span className="text-[#7dd87d]">•</span> How value circulates inside the ReGenerative Renaissance</li>
                  </ul>
                  <div
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: C.green }}
                  >
                    You are here <CircleDot className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="mt-6 max-w-3xl mx-auto text-center">
                <p className="text-white/60 text-sm md:text-base italic">
                  We do not call the dominant economy broken. It is still vital to many
                  people. It is the system most of us are crossing from. Bionomics is what
                  we are crossing toward.
                </p>
              </div>
            </div>
          </section>

          <RiverDivider className="my-8" />

          {/* ════ 4. SINCE 2017 (Timeline) ══════════════════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-3xl">
              <SectionHeading
                eyebrow="Lineage"
                title="Since 2017"
                blurb="A meandering river of seasons, lessons, and seeds planted. Tap any year to descend."
                accent={C.amber}
                titleClassName="story-grow"
              />
              <TimelineRiver />
            </div>
          </section>

          {/* ════ 5. THE INDEX FUND ═════════════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The Frame"
                title="The Index Fund for the ReGenerative Renaissance"
                accent={C.gold}
              />
              <div
                className="rounded-3xl border border-[#ffd700]/30 p-6 md:p-10 space-y-5 safe-prose"
                style={{ background: "rgba(13,40,24,0.55)" }}
              >
                <p className="text-white/90 text-base md:text-lg leading-relaxed">
                  We are investing in local food, regenerative land, community, and the
                  organizations that support them. It is a full-suite investment into the
                  <Concept>ReGenerative Renaissance</Concept> and the cultures growing inside it.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  Generally funds pick a single thesis and ride it. Our thesis is simply
                  that we must invest in the foundations for regenerative civilizations,
                  for a myriad of reasons. For this reason, we look to fund the whole
                  portfolio of practices and infrastructures that a regenerative
                  civilization needs to take root. Land projects. Food producers. Tools.
                  Governance experiments. Bioregional organizing. Stories. Each one is a
                  position in the index. Together we are the ReGenerative Renaissance.
                  Because the mission is so big, we need to have the governance be
                  decentralized and democratic to play this vital role of our future
                  civilizations.
                </p>
                <p className="text-white text-base md:text-lg font-semibold">
                  Think of it as the index fund for Regenerative Civilizations.
                </p>
                <div className="pt-2 flex flex-wrap gap-5">
                  <Link
                    href="/tokenomics"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
                    style={{ color: C.amber }}
                  >
                    See how the Fund works on Tokenomics <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/governance"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold hover:gap-2.5 transition-all"
                    style={{ color: C.green }}
                  >
                    See how we make decisions in Governance <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ════ 6. BIOREGIONAL FINANCING FACILITIES ══════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The Framework"
                title="Bioregional Financing Facilities"
                blurb="Bionomics unites with the Bioregional Financing Facilities (BFF) framework developed by the BioFi Project, Dark Matter Labs, and the Buckminster Fuller Institute. We have a lot of love for this work. ReGen Civics is one expression of where it can go when you weave it together with what we learned in the SEEDS era and braid it into a Game that bioregions and land projects can actually play."
              />
              <p className="text-white/80 text-base leading-relaxed mb-6 safe-prose">
                A BFF is a financial body designed to take capital from the current
                economic systems and grow regenerative bioregional economies in its place.
                It is a semi-permeable membrane between two worlds. We are building tools,
                infrastructure, and a Game to help bioregions create their own Games.
              </p>

              <div className="space-y-3 md:space-y-4">
                <Accordion title="What is a BFF?" icon={<Network className="w-5 h-5" />}>
                  <p>
                    The BioFi ebook describes BFFs as place-based, patient, participatory,
                    and 4 Returns oriented bodies that move capital from extractive systems
                    into regenerative ones. We treat BFFs as one of the three legs (alongside
                    an Organizing Team and a Bioregional Hub) that any bioregion needs in
                    order to regenerate at scale.
                  </p>
                </Accordion>

                <Accordion
                  title="Where ReGen Civics fits"
                  icon={<Globe className="w-5 h-5" />}
                  accent={C.greenSoft}
                >
                  <p>
                    We are a global network that supports bioregions in tooling,
                    infrastructure, and Game design. Every tool we build is free and open
                    source. Bioregions are welcome to copy, fork, remix, and run them. Our
                    work is to help the bioregional economy grow everywhere it wants to,
                    owned locally by the people doing the regenerating.
                  </p>
                  <p>
                    Bionomics evolves the BioFi framework through our history with SEEDS.
                    SEEDS taught us what worked in a regenerative currency, what wanted to
                    grow differently, and what we needed to add. The Game is what came from
                    that learning.
                  </p>
                  <p>
                    We are not trying to own the bioregional economy. We are trying to help
                    it grow everywhere it wants to.
                  </p>
                </Accordion>

                <Accordion title="Read the source" icon={<Library className="w-5 h-5" />} accent={C.amber}>
                  <p>
                    The source material for this section is the{" "}
                    <a
                      href="https://www.biofi.earth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7dd87d] underline underline-offset-2"
                    >
                      BioFi Project
                    </a>
                    's 2024 ebook on Bioregional Financing Facilities, with contributions
                    from Dark Matter Labs and the Buckminster Fuller Institute. It is a
                    foundational read for anyone working in bioregional economics.
                  </p>
                </Accordion>
              </div>
            </div>
          </section>

          {/* ════ 7. THE 4 RETURNS FRAMEWORK ════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-5xl">
              <SectionHeading
                eyebrow="How We Measure"
                title="The 4 Returns Framework"
                blurb="The BioFi framework organizes regenerative success around four kinds of return: Inspiration, Ecological, Social, and Economic-Financial. Bionomics is built around all four. Here is what each one looks like inside the Game."
                accent={C.greenSoft}
              />
              <div className="mycelium-grid grid sm:grid-cols-2 gap-4 md:gap-5">
                <ReturnCard
                  title="Inspiration Return"
                  icon={<Sparkles className="w-5 h-5" />}
                  body="Stories, art, quests, and the felt sense that something better is real and within reach. The Game's quest system, the Living Tree on every player profile, and the seasonal harvest rituals are all designed to generate this return. When players complete a Quest, we share our stories, our wisdom, and our inspiration, and we grow together."
                  accent={C.gold}
                />
                <ReturnCard
                  title="Ecological Return"
                  icon={<TreeDeciduous className="w-5 h-5" />}
                  body="Soil rebuilt, water restored, biodiversity returning, carbon drawn down. Tracked through land project reports, bioregional health indicators, and the regenerative metrics each project commits to in its Game. Many of the Quests are centered around direct action to regenerate our bioregions and communities."
                  accent={C.green}
                />
                <ReturnCard
                  title="Social Return"
                  icon={<Users className="w-5 h-5" />}
                  body="Trust, belonging, repaired relationships, new councils, healthier communities. Tracked through gratitude flows, forum reputation, the trust graph, and the seasonal council structure. Co-creating this Game is the most challenging, rewarding, and ambitious part of our work, the human side of co-creation at a grand scale."
                  accent={C.teal}
                />
                <ReturnCard
                  title="Economic-Financial Return"
                  icon={<Wallet className="w-5 h-5" />}
                  body="Patient capital that earns honest returns inside a regenerative thesis. Held inside the Index Fund for the ReGenerative Renaissance and circulated through $RCivics and $ReGen. Explore the Fund and Opportunity pages for more on this."
                  accent={C.amber}
                />
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/game-mechanics"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7dd87d] hover:gap-2.5 transition-all"
                >
                  See how returns are measured in the Game <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ════ 8. THE 12 BFF ATTRIBUTES ═════════════════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-3xl">
              <SectionHeading
                eyebrow="Honest Checklist"
                title="The 12 BFF Attributes"
                blurb={getBionomicsCopy('twelve_attributes_blurb')}
              />
              <img
                src="/bionomics-12-attributes.webp"
                alt="A circular mandala of twelve woven attributes around a central living tree"
                width="1376"
                height="768"
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-2xl border border-white/10 mb-6"
              />
              <div className="flex flex-wrap items-center gap-3 mb-6 text-xs">
                {(["Building", "Experimenting", "Reaching"] as AttrStatus[]).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      color: statusColor(s),
                      background: `${statusColor(s)}1a`,
                      border: `1px solid ${statusColor(s)}55`,
                    }}
                  >
                    <Circle className="w-2 h-2 fill-current" /> {s}
                  </span>
                ))}
              </div>
              <div className="space-y-2.5">
                <BFFAttributeRow num={1} title="Place-based and bioregionally rooted" status="Reaching">
                  Our global Game is the trellis. bioregion.regencivics.earth will host
                  place-based Games starting with the first pilot bioregions later this
                  year or next, as soon as a bioregion is ready to receive the Game.
                </BFFAttributeRow>
                <BFFAttributeRow num={2} title="Long-term and patient" status="Building">
                  The Fund is structured for multi-season cycles, not quarterly returns.
                  Land projects we incubate are evaluated on five to twenty year horizons.
                </BFFAttributeRow>
                <BFFAttributeRow num={3} title="Participatory governance" status="Building">
                  All participants get a voice. Voices are tiered and weighted based on
                  contribution, trust, and citizenship tier so that influence reflects
                  engagement and care, not capital alone.
                </BFFAttributeRow>
                <BFFAttributeRow num={4} title="Holistic and 4 Returns oriented" status="Building">
                  Inspiration, ecological, social, and economic-financial returns are
                  tracked through quests, harvests, and the Living Tree visualization on
                  every player profile.
                </BFFAttributeRow>
                <BFFAttributeRow num={5} title="Catalytic and connective" status="Building">
                  The Game's whole job is to connect regenerators to capital, attention,
                  and each other. The forum, incubator, and gratitude system are all
                  connective tissue.
                </BFFAttributeRow>
                <BFFAttributeRow num={6} title="Blended capital structures" status="Experimenting">
                  The Fund mixes philanthropic, investment, and community capital. $RCivics
                  and $ReGen are two complementary capital flows.
                </BFFAttributeRow>
                <BFFAttributeRow num={7} title="Innovative financial instruments" status="Experimenting">
                  Gratitude tokens as eco-credits, seasonal harvests as a form of
                  retroactive public goods funding, contribution-weighted voting, future
                  obligation clearing pilots, and Crowdpooling as a direct-governance
                  financial primitive. The Game gives communities the tools to experiment
                  with their own financial and economic systems instead of waiting for
                  someone else's.
                </BFFAttributeRow>
                <BFFAttributeRow num={8} title="Right relationship with regenerators" status="Building">
                  Land projects sit at the table as co-designers. The Incubator runs as
                  a circle that meets, builds, and ships together.
                </BFFAttributeRow>
                <BFFAttributeRow num={9} title="Transparent and accountable" status="Building">
                  The Game Mechanics page, public Game Variables, and open seasonal
                  scorecards make every important number visible.
                </BFFAttributeRow>
                <BFFAttributeRow num={10} title="Networked with other BFFs" status="Reaching">
                  We are open to connect further with bioregions that are actively
                  organizing. All our tools are open source so any BFF or bioregional team
                  can fork and adapt them.
                </BFFAttributeRow>
                <BFFAttributeRow num={11} title="Capacity-building beyond capital" status="Building">
                  Quests, the Game itself, the role system, and the seasonal rhythm all
                  build capacity in players, projects, and bioregions.
                </BFFAttributeRow>
                <BFFAttributeRow num={12} title="Regenerative by design" status="Building">
                  The whole architecture composts at the end of each full seasonal cycle
                  and regrows. Winter season is explicitly meant for regenerating and
                  redesigning all our systems for a new spring. Each full cycle of seasons
                  we renew and regenerate the Game itself.
                </BFFAttributeRow>
              </div>
            </div>
          </section>

          {/* ════ 9. THE 4 BFF TYPES ═══════════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-5xl">
              <SectionHeading
                eyebrow="The Four Forms"
                title="The 4 BFF Types, mapped to our work"
                blurb="The BioFi ebook describes four BFF types. Each has its own way of raising and allocating capital. ReGen Civics gestures toward all four. Here is where each one shows up in our work."
                accent={C.amber}
              />
              <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
                <BFFTypeCard
                  title="Bioregional Trust"
                  icon={<Mountain className="w-6 h-6" />}
                  oneLiner="Stewardship across generations."
                  expression="Holding land, culture, and commons across generations. ReGen Civics expression: the Land Project incubator, the Steward citizenship tier, the long-horizon governance councils, and the relationships we hold with the projects in our portfolio."
                  link="/land"
                  linkLabel="See Land Projects"
                  accent={C.green}
                />
                <BFFTypeCard
                  title="Bioregional Venture Studio"
                  icon={<Hammer className="w-6 h-6" />}
                  oneLiner="Designing and launching new ventures."
                  expression="ReGen Civics expression: the quest system as a way to incubate new ideas, Crowdpooling as the financing primitive for venture launches, and the Game roles that produce the people who can run them."
                  link="/crowd-pooling-projects"
                  linkLabel="See Crowdpool Campaigns"
                  accent={C.amber}
                />
                <BFFTypeCard
                  title="Bioregional Investment Company"
                  icon={<Wallet className="w-6 h-6" />}
                  oneLiner="Patient capital, blended portfolio."
                  expression="ReGen Civics expression: the Fund itself, the Index Fund for the ReGenerative Renaissance framing, $RCivics, and the investor cultivation work on the Tokenomics side of the bridge."
                  link="/tokenomics"
                  linkLabel="See Tokenomics"
                  accent={C.gold}
                />
                <BFFTypeCard
                  title="Bioregional Bank"
                  icon={<Coins className="w-6 h-6" />}
                  oneLiner="Day-to-day circulation of value."
                  expression="ReGen Civics expression: $ReGen, the gratitude protocol, the food economy circulation through LocalScale, and the bioregional vouchers and obligation clearing experiments to come."
                  link="/game-mechanics"
                  linkLabel="See Game Mechanics"
                  accent={C.teal}
                />
              </div>
            </div>
          </section>

          {/* ════ 10. THE THREE LEGS ═══════════════════════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The Architecture"
                title="The three legs of bioregional regeneration"
                blurb={getBionomicsCopy('three_legs_blurb')}
                accent={C.teal}
              />
              <img
                src="/bionomics-three-legs.webp"
                alt="A triangular composition of an organizing team, a bioregional hub, and a bioregional financing facility connected by mycelial threads"
                width="1408"
                height="768"
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-2xl border border-white/10 mb-6"
              />
              <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
                <ThreeLegsTriangle />
                <div className="space-y-3">
                  <Accordion
                    title="Organizing Team"
                    icon={<HandHeart className="w-5 h-5" />}
                    accent={C.teal}
                  >
                    <p>
                      The humans holding the work. We support them through the Game role
                      system, sociocratic governance templates, seasonal councils, and the
                      seasonal rhythm of harvest and composting.
                    </p>
                  </Accordion>
                  <Accordion
                    title="Bioregional Hub"
                    icon={<Globe className="w-5 h-5" />}
                    accent={C.green}
                  >
                    <p>
                      The place (digital and physical) where the bioregion gathers. We
                      support hubs through the forum, the quest system, the incubator
                      scaffolding, and the open-source ReGen Civics codebase that any hub
                      can fork and run as its own home.
                    </p>
                  </Accordion>
                  <Accordion
                    title="Bioregional Financing Facility"
                    icon={<Wallet className="w-5 h-5" />}
                    accent={C.amber}
                  >
                    <p>
                      The body that moves capital. We support BFFs through the Fund,
                      $RCivics, $ReGen, the Crowdpool primitive, the Tokenomics page, and
                      the connective tissue that links bioregional BFFs into a global
                      movement.
                    </p>
                  </Accordion>
                </div>
              </div>
            </div>
          </section>

          <RiverDivider className="my-8" />

          {/* ════ 11. LOCAL FOOD ECONOMIES ═════════════════════════ */}
          <section
            id="local-food-economies"
            className="px-4 py-10 md:py-16"
            style={{ background: "rgba(0,0,0,0.18)" }}
          >
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The Anchor"
                title="Local food economies"
                blurb="Our entire journey started with food. In 2017 the question was simple. If Bitcoin could spend billions a year on energy to back its currency, what if we spent that money setting up local food systems to back a new currency, one backed by local, regenerative, and delicious food? Bionomics is what grew from that question."
                accent={C.greenSoft}
              />

              <div
                className="rounded-3xl border border-[#7dd87d]/25 p-3 md:p-5 mb-6"
                style={{ background: "rgba(13,40,24,0.55)" }}
              >
                <P2PFoodEconomyImage />
                <p className="text-xs italic text-white/70 text-center mt-2 mb-1">
                  The 2017 sketch, redrawn. Local food systems as the energy backing a
                  regenerative currency.
                </p>
              </div>

              <div className="space-y-3">
                <Accordion
                  title="Why food first"
                  icon={<Wheat className="w-5 h-5" />}
                  defaultOpen
                >
                  <p>
                    Food is the layer of the economy everyone touches every day. It is also
                    the layer where regenerative work has the most direct impact on land,
                    water, soil, and community. Start here and the rest follows.
                  </p>
                </Accordion>
                <Accordion
                  title="LocalScale, our key partner"
                  icon={<Network className="w-5 h-5" />}
                  accent={C.greenSoft}
                >
                  <p>
                    LocalScale is the platform we work with most closely on the food
                    economy. Together we are building the application flow for food
                    producers, the routing of $ReGen through producer rewards, and the
                    bioregional vouchers experiment.
                  </p>
                  <p>
                    Organizations that facilitate local food trade earn higher contribution
                    multipliers. A food co-op earns tokens every time members transact
                    through the system. The economy pays you to grow and distribute good
                    food. Transactions are free. You save the 3 to 30 percent that payment
                    processors normally take, and you earn on top of that. Better design,
                    better outcome.
                  </p>
                </Accordion>
                <Accordion title="For food producers" icon={<Sprout className="w-5 h-5" />}>
                  <p>
                    If you grow, raise, harvest, ferment, mill, bake, or distribute food in
                    a regenerative way, the food economy inside the Game is for you.
                  </p>
                  <Link
                    href="/connect"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7dd87d] hover:gap-2.5 transition-all mt-2"
                  >
                    Apply to join the food producer network <ArrowRight className="w-4 h-4" />
                  </Link>
                </Accordion>
                <Accordion
                  title="For eaters and households"
                  icon={<Heart className="w-5 h-5" />}
                  accent={C.greenSoft}
                >
                  <p>
                    Eat from your bioregion. Pay producers directly. Vouch for the ones who
                    are doing the work. Every transaction helps the food economy take root.
                  </p>
                  <Link
                    href="/map"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7dd87d] hover:gap-2.5 transition-all mt-2"
                  >
                    Find regenerative food in your bioregion <ArrowRight className="w-4 h-4" />
                  </Link>
                </Accordion>
                <Accordion
                  title="The food backed currency idea"
                  icon={<Coins className="w-5 h-5" />}
                  accent={C.amber}
                >
                  <p>
                    The 2017 question is alive in the Game today. $ReGen circulates with
                    food. Producers earn it. Eaters spend it. Bioregions grow with it.
                    Every variable that decides how the currency moves is open and tunable.
                  </p>
                  <Link
                    href="/game-mechanics"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4a574] hover:gap-2.5 transition-all mt-2"
                  >
                    See the full numbers on Game Mechanics <ArrowRight className="w-4 h-4" />
                  </Link>
                </Accordion>
                <Accordion
                  title="Bioregional vouchers and food economy primitives"
                  icon={<GitBranch className="w-5 h-5" />}
                  accent={C.teal}
                >
                  <p>
                    Bioregional vouchers, bioservices banks, advance market commitments for
                    regenerative produce, and obligation clearing for food co-ops are all
                    on the experiment list. We will ship them as the Game grows and the
                    food network is ready for them.
                  </p>
                </Accordion>
              </div>
            </div>
          </section>

          {/* ════ 12. INNOVATIVE MECHANISMS (brief, link to Tools) ═ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-3xl">
              <SectionHeading
                eyebrow="Build Your Own"
                title="The innovative mechanisms"
                accent={C.gold}
              />
              <div
                className="rounded-3xl border border-[#ffd700]/25 p-6 md:p-9 space-y-5 safe-prose"
                style={{ background: "rgba(13,40,24,0.55)" }}
              >
                <p className="text-white/85 text-base md:text-lg leading-relaxed">
                  The BioFi ebook gathers a long list of innovative mechanisms that
                  bioregional economies are experimenting with. Eco-credits, quadratic and
                  conviction voting, retroactive public goods funding, obligation clearing,
                  bioregional vouchers, advance market commitments, profit pooling, and
                  more.
                </p>
                <p className="text-white/85 text-base md:text-lg leading-relaxed">
                  Our work is to make them buildable. ReGen Civics is the open-source
                  foundation that bioregions, land projects, and their communities can use
                  to experiment with their own. Crowdpooling is the first one we are
                  shipping as a first-class primitive. Many more will follow, and we aim
                  to integrate with any experiments and tools that want to make themselves
                  compatible with our tooling. We use Base, one of the most widely adopted
                  blockchains, as our foundation, which lets us easily integrate with other
                  tooling built on it.
                </p>
                <Link href="/tools">
                  <Button
                    className="rounded-full bg-[#ffd700] hover:bg-[#e3b035] text-[#0d2818] font-bold px-6"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    See the Tools we are building <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* ════ 13. RIGHT RELATIONSHIP ═══════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-3xl">
              <SectionHeading
                eyebrow="In Right Relationship"
                title="Open to bioregions actively organizing"
                accent={C.teal}
              />
              <div
                className="rounded-3xl border border-[#4a9f9f]/30 p-6 md:p-9 space-y-5 safe-prose"
                style={{ background: "rgba(13,40,24,0.55)" }}
              >
                <p className="text-white/85 text-base md:text-lg leading-relaxed">
                  The BioFi ebook is firm about this. BFFs should not compete with each
                  other. They should build right relationship with their neighbors. We feel
                  the same way.
                </p>
                <p className="text-white/85 text-base md:text-lg leading-relaxed">
                  ReGen Civics is a global network that supports bioregions with tooling,
                  infrastructure, and Game design. Our work is to help every bioregion
                  grow its own BFF. We are open to connect with bioregions that are
                  actively organizing. If that is you, the door is open. We aim to play
                  the global connective tissue that helps land projects, bioregions, and
                  the organizations that support them rally around a shared fund and
                  raise shared capital for our efforts.
                </p>
                <Link href="/community">
                  <Button
                    variant="outline"
                    className="rounded-full border-2 border-[#4a9f9f]/60 text-[#4a9f9f] hover:bg-[#4a9f9f]/15 px-6"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    Connect in the Bioregions thread <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* ════ 14. BIOCULTURAL REGENERATION ═════════════════════ */}
          <section className="px-4 py-10 md:py-16">
            <div className="container max-w-3xl">
              <SectionHeading
                eyebrow="The Whole Loop"
                title="Biocultural regeneration"
                accent={C.greenSoft}
              />
              <div className="space-y-4 text-white/85 text-base md:text-lg leading-relaxed safe-prose">
                <p>
                  Healing land and healing culture are inseparable. The BioFi ebook calls
                  this biocultural regeneration. We call it the whole point.
                </p>
                <p>
                  The Game's design holds this everywhere. Quests heal players. Players
                  heal communities. Communities heal land. Land heals players back. The
                  loop only works when all four are in motion at once. Bionomics is what
                  happens when an economy is built around that loop instead of around
                  extraction.
                </p>
              </div>
            </div>
          </section>

          {/* ════ 15. REGENERATORS ═════════════════════════════════ */}
          <section className="px-4 py-10 md:py-16" style={{ background: "rgba(0,0,0,0.18)" }}>
            <div className="container max-w-4xl">
              <SectionHeading
                eyebrow="The People"
                title="Regenerators"
                accent={C.green}
              />
              <img
                src="/bionomics-regenerators.webp"
                alt="A wide bioregional landscape: hands cupping seedlings in the foreground, a regenerative farm in the midground, a forested valley with a sun shaped like the bridge glyph in the sky"
                width="1584"
                height="672"
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-2xl border border-white/10 mb-6"
              />
              <p className="text-white/85 text-base md:text-lg leading-relaxed mb-8 safe-prose">
                {getBionomicsCopy('regenerators_paragraph_1')}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: <Mountain className="w-5 h-5" />, label: "I have land", href: "/land", color: C.green },
                  { icon: <Wheat className="w-5 h-5" />, label: "I grow food", href: "/bionomics#local-food-economies", color: C.greenSoft },
                  { icon: <Sprout className="w-5 h-5" />, label: "I want to play", href: "/game", color: C.gold },
                  { icon: <Wallet className="w-5 h-5" />, label: "I want to invest", href: "/tokenomics", color: C.amber },
                ].map((cta) => (
                  <Link key={cta.label} href={cta.href}>
                    <div
                      className="rounded-2xl border p-4 md:p-5 text-center cursor-pointer hover:-translate-y-1 transition-all h-full flex flex-col items-center gap-2"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderColor: `${cta.color}55`,
                      }}
                    >
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${cta.color}1f`, color: cta.color }}
                      >
                        {cta.icon}
                      </span>
                      <span
                        className="text-white text-xs md:text-sm font-semibold leading-tight"
                        style={{ fontFamily: "var(--font-accent)" }}
                      >
                        {cta.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ════ 16. THE CLOSING ══════════════════════════════════ */}
          <section className="px-4 py-12 md:py-20">
            <div className="container max-w-3xl text-center">
              <Flame className="w-10 h-10 text-[#ffd700] mx-auto mb-4" />
              <p className="text-white/70 italic mb-6 max-w-2xl mx-auto">
                The BioFi Project's 2024 ebook concludes with a clear charge: financial
                architecture must serve regeneration. Bionomics is one answer.
              </p>
              <p className="text-white/90 text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto safe-prose">
                This page will keep growing. The Game is just getting started. If any of
                this resonates, find a quest, talk to a land project, or just sit with the
                bridge image for a minute. The world on the other side is real. We are
                walking toward it together.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <Link href="/apply">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#0d2818] font-bold"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    For land projects <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/connect">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-[#a8e6a8] hover:bg-[#9bd99b] text-[#0d2818] font-bold"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    For food producers <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/quest">
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-[#ffd700] hover:bg-[#e3b035] text-[#0d2818] font-bold"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    For players <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/tokenomics">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-2xl border-2 border-[#d4a574]/60 text-[#d4a574] hover:bg-[#d4a574]/15 font-bold"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    For investors <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
