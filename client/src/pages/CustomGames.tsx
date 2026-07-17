/**
 * Custom Games for Land Projects
 * Route: /custom-games
 *
 * The product page for the Custom Games line (Workstream A of
 * CUSTOM_GAMES_MASTER_PLAN.md). Modeled on Season2.tsx: cinematic hero,
 * glass panels, growing scroll timeline, FAQ accordion, sticky mobile CTA.
 *
 * Amora screenshots land in /images/custom-games/ from a parallel capture
 * session; <AmoraShot> renders a styled gradient placeholder until each
 * file exists, so the page ships before the screenshots do.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  Coins,
  DoorOpen,
  ExternalLink,
  Eye,
  Handshake,
  KeyRound,
  Landmark,
  Monitor,
  Scale,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { ReadableScrim } from "@/components/ReadableScrim";
import { StickyThumbCta } from "@/components/StickyThumbCta";
import { SEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import { CustomGameWaitlistForm } from "@/components/CustomGameWaitlistForm";
import { PageWrapper } from "@/components/PageWrapper";
import { analytics } from "@/lib/analytics";

const display = { fontFamily: "var(--font-display)" } as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ─── Amora screenshot with graceful placeholder ─────────────────────────
// Screenshots are captured by a parallel session and dropped into
// client/public/images/custom-games/. Until a file exists, onError swaps
// in a branded gradient placeholder that carries the shot's caption.
const SHOT_BASE = "/images/custom-games";

function AmoraShot({
  name,
  caption,
  alt,
  className = "",
}: {
  name: string;
  caption: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-[#7dd87d]/20 bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#0d2818] ${className}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(125,216,125,0.18), transparent 70%)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Monitor className="w-8 h-8 text-[#7dd87d]/70" />
          <p className="text-white/85 text-sm md:text-base font-medium leading-snug max-w-xs">
            {caption}
          </p>
          <p className="text-white/50 text-xs">Live screenshot coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <figure className={className}>
      <img
        src={`${SHOT_BASE}/${name}.webp`}
        alt={alt ?? caption}
        loading="lazy"
        onError={() => setFailed(true)}
        // Full-page captures run tall (the quest board is 1200x4038); pin every
        // shot to the placeholder's 16:10 so one long screenshot cannot stretch
        // its grid cell. object-top keeps the meaningful header in frame.
        className="w-full aspect-[16/10] object-cover object-top rounded-2xl border border-[#7dd87d]/20 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
      />
      <figcaption className="mt-2 text-white/60 text-sm">{caption}</figcaption>
    </figure>
  );
}

// ─── Timeline that grows as you scroll (Season2 pattern) ─────────────────
function GrowingTimeline({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      if (fillRef.current) fillRef.current.style.height = "100%";
      return;
    }
    const onScroll = () => {
      const el = ref.current;
      const fill = fillRef.current;
      if (!el || !fill) return;
      const rect = el.getBoundingClientRect();
      const progress = (window.innerHeight * 0.8 - rect.top) / rect.height;
      fill.style.height = `${Math.min(1, Math.max(0, progress)) * 100}%`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="relative pl-8 space-y-10">
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-px bg-[#7dd87d]/15" />
      <span
        ref={fillRef}
        aria-hidden="true"
        className="absolute left-0 top-0 w-px bg-gradient-to-b from-[#7dd87d]/60 to-[#7dd87d]"
        style={{ height: "0%", boxShadow: "0 0 10px rgba(125,216,125,0.55)", transition: "height 120ms linear" }}
      />
      {children}
    </div>
  );
}

// ─── FAQ item (Season2 pattern) ──────────────────────────────────────────
function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#7dd87d]/20 rounded-xl bg-[#0d2818]/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left p-5 hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <span className="text-white font-medium text-base md:text-lg">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#7dd87d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-white/75 leading-relaxed">{children}</div>
      )}
    </div>
  );
}

// ─── Content data ────────────────────────────────────────────────────────

const AMORA_SHOTS: { name: string; caption: string; wide?: boolean }[] = [
  {
    name: "amora-home-desktop",
    caption: "Choose your path: four journeys into the village",
    wide: true,
  },
  {
    name: "amora-quests-desktop",
    caption: "The quest board, where the work of the village becomes visible",
  },
  {
    name: "amora-gratitude-desktop",
    caption: "The Gratitude wall: contribution seen, thanked, and rewarded",
  },
  {
    name: "amora-work-with-us-desktop",
    caption: "Work With Us, where Maia the AI guide walks proposals in",
  },
  {
    name: "amora-setup-wizard-desktop",
    caption: "The Setup Wizard, where admins reshape the game themselves",
  },
];

const LATEST_SHIPS: { title: string; body: string }[] = [
  {
    title: "Maia, the AI proposal guide",
    body: "Walks someone through a proposal in conversation, then hands it back to them to review and submit.",
  },
  {
    title: "Quest consent queue",
    body: "Quest credit lands only after the people involved consent to it. Recognition stays honest.",
  },
  {
    title: "Setup Wizard: make it yours in an afternoon",
    body: "Admins reshape brand, language, and journeys from one screen, no developer needed.",
  },
];

const PERSONAS: {
  label: string;
  shot: string;
  headline: string;
  body: string;
}[] = [
  {
    label: "Residents",
    shot: "amora-resident-journey-desktop",
    headline: "From first visit to rooted member",
    body: "Residents arrive through their own journey: introductions, agreements, rites of passage, and quests that turn settling in into contribution. Every step is written down and playable, so nobody has to onboard people one conversation at a time.",
  },
  {
    label: "Prosperity Creators",
    shot: "amora-prosperity-journey-desktop",
    headline: "Business builders inside the community",
    body: "People who want to build a venture on your land get a journey of their own: proposals, agreements with the community, and quests that grow their business while feeding the village economy.",
  },
  {
    label: "Core Team / Stewards",
    shot: "amora-steward-journey-desktop",
    headline: "The people who hold the project",
    body: "Stewards get roles, decision rights, and the tools to run seasons, budgets, and quests. The game carries the operational load so the core team spends less time chasing and more time building.",
  },
  {
    label: "Investors",
    shot: "amora-investor-journey-desktop",
    headline: "Capital with a clear window",
    body: "Investors get their own journey: the vision, the numbers, the agreements, and a live view of how the project spends and progresses. Accountability is built into the game instead of assembled for each update call.",
  },
];

const COVERS: { icon: React.ElementType; title: string; body: string }[] = [
  {
    icon: Scale,
    title: "Governance and decision-making",
    body: "Who decides what, how disputes resolve, how power is shared. Written into the game and visible to everyone who plays.",
  },
  {
    icon: Coins,
    title: "Economic systems and tokenomics",
    body: "Your community currency, budgets, rewards, and how value flows between people and the project.",
  },
  {
    icon: Landmark,
    title: "Legal structure",
    body: "The entities that protect the land, the members, and the mission, reflected in the game's agreements.",
  },
  {
    icon: DoorOpen,
    title: "Onboarding and rites of passage",
    body: "How someone moves from curious visitor to rooted member, one quest at a time.",
  },
  {
    icon: Award,
    title: "Contribution and recognition",
    body: "Work gets seen, credited, and rewarded. Invisible labor stops being invisible.",
  },
  {
    icon: Eye,
    title: "Resource flows and transparency",
    body: "Where the money goes, on a screen anyone in your community can open.",
  },
];

const OWNERSHIP_POINTS: string[] = [
  "100% ownership of the code, the data, and the keys",
  "Self-hosted on your accounts: your domain, your hosting, your database",
  "No subscription required to keep it running",
  "After handoff, ReGen Civics changes nothing unless you ask",
  "An owner's guide covering how to maintain and improve it",
  "Your API keys never touch our database",
  "AI features cost $0 until you add your key",
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Talk with Sylva, our AI guide",
    body: "About 20 minutes, voice or chat. Sylva asks about your land, your people, your language, and what hurts most about coordinating today. It's also a preview of the kind of guide your own community will get.",
  },
  {
    n: "02",
    title: "Receive your custom Blueprint",
    body: "We turn the conversation into a Blueprint: your personas, journeys, currency, stages, and brand, laid out as the plan for your game.",
  },
  {
    n: "03",
    title: "Contract + kickoff",
    body: "We agree on scope, milestones, and a firm timeline based on your team. Then we start building.",
  },
  {
    n: "04",
    title: "First playable draft of your game",
    body: "A running instance in your brand, in your language, with seeded journeys and quests for your team to react to.",
  },
  {
    n: "05",
    title: "Three to six months of co-creation with your team",
    body: "We shape the game together until it fits your community. Pace depends on your team's experience and availability; you get a firm estimate at contract.",
  },
  {
    n: "06",
    title: "Training, owner's guide, handoff",
    body: "Your team learns to run it. You get the owner's guide, your keys, and your hosting. From that day it's fully yours.",
  },
];

const NEEDS: string[] = [
  "A logo and photos of your land",
  "A vision holder available for weekly calls",
  "Content review within a week, each round",
  "Someone who will admin the game",
];

// Single source for both the accordion and the FAQPage structured data.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Who owns the code and data?",
    a: "You do, fully. The code lives in your repository, the data on your hosting, the keys in your hands. Nothing about your game depends on ReGen Civics staying in business.",
  },
  {
    q: "Do you change our game after handoff?",
    a: "Only when you ask. After handoff we make no changes to your game. When you want upgrades or new features, we're a message away.",
  },
  {
    q: "What do AI features cost?",
    a: "Nothing until you add your own API key. AI features sleep until a key exists, so a game without one costs $0 in AI. On full service, AI credits are included in your fixed monthly price.",
  },
  {
    q: "How long does it take?",
    a: "Three to six months, depending on your team's experience and availability. You get a firm estimate at contract, and milestone payments mean you pay as the game becomes real.",
  },
  {
    q: "Can we have different personas?",
    a: "Yes. Personas are fully configurable. Residents, business builders, stewards, and investors are the starting four. Rename them, replace them, or add your own.",
  },
  {
    q: "We already have a community. Does this still work?",
    a: "Yes. The game meets you where you are. Your existing agreements, roles, and rituals become the starting content instead of a blank page.",
  },
  {
    q: "What do we host it on?",
    a: "Your own accounts: your domain, your hosting, your database. We hand you the checklist and walk your admin through it. On full service, we carry the hosting for you.",
  },
];

// JSON-LD Service schema for search.
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Custom Coordination Games for Land Projects",
  serviceType: "Custom community coordination game design and build",
  description:
    "A complete coordination game for a land project community: persona journeys, quests, community currency, governance, and transparency. Built on the same foundation as Amora and owned 100% by the community.",
  provider: {
    "@type": "Organization",
    name: "ReGen Civics",
    url: "https://regencivics.earth",
  },
  url: "https://regencivics.earth/custom-games",
  areaServed: "Worldwide",
  offers: {
    "@type": "Offer",
    price: "20000",
    priceCurrency: "USD",
    description:
      "Fully owned, self-hosted coordination game. Milestone payments: 50% at kickoff, 25% at first draft, 25% at handoff. Optional full-service plan from $20 to $2,000 per month, fixed at contract.",
  },
};

export default function CustomGames() {
  const [showForm, setShowForm] = useState(false);

  const openWaitlist = (placement: string) => {
    analytics.ctaClick(`custom_games_join_waitlist_${placement}`, "/custom-games");
    setShowForm(true);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
        <SEO
          title="Custom Games for Land Projects | ReGen Civics"
          description="Get a complete coordination game for your land project: persona journeys, quests, community currency, governance, and money transparency. Built on the same foundation as Amora, owned 100% by you. $20,000, delivered in 3 to 6 months."
          keywords="custom coordination game, land project software, community governance tools, ecovillage onboarding, community currency, regenerative community platform"
        />
        <JsonLD data={serviceSchema} />
        <JsonLD data={schemas.faqPage(FAQS.map((f) => ({ question: f.q, answer: f.a })))} />

        {/* ── 1. HERO ── */}
        <section className="relative min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
          <div className="absolute inset-0">
            <img
              src="/season2/hero.jpg"
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
              style={{ transform: "scale(1.05)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/75 via-[#0d2818]/55 to-[#0d2818]" />
          </div>

          <AnimatedSection animation="fade-in" className="relative z-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/15 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-[#7dd87d]/30">
              <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
              <span className="text-white/90 text-sm font-medium tracking-wide">
                Custom Games · 3 to 5 projects per season
              </span>
            </div>

            <ReadableScrim block className="max-w-3xl mx-auto mb-8">
              <h1
                className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                style={display}
              >
                Your land project succeeds when everyone{" "}
                <span className="italic text-[#7dd87d]">knows the game.</span>
              </h1>
              <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
                A complete coordination game for your community, built on the
                same foundation as Amora, owned 100% by you.
              </p>
            </ReadableScrim>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <Link href="/custom-games/apply">
                <Button
                  size="lg"
                  onClick={() =>
                    analytics.ctaClick("custom_games_design_your_game_hero", "/custom-games")
                  }
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-8 min-h-[48px]"
                >
                  Design Your Game
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openWaitlist("hero")}
                className="rounded-xl px-8 min-h-[48px] border-[#7dd87d]/40 text-[#7dd87d] hover:text-white hover:border-[#7dd87d] bg-transparent"
              >
                Join the Waitlist
              </Button>
            </div>
          </AnimatedSection>

          <a
            href="#who"
            aria-label="Scroll to learn more"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#7dd87d]/50 hover:text-[#7dd87d] transition-colors"
          >
            <ChevronDown className="w-6 h-6 animate-bounce" />
          </a>
        </section>

        {/* ── 2. WHO THIS IS FOR ── */}
        <AnimatedSection as="section" animation="slide-up" id="who" className="py-20 md:py-28 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              Who this is for
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-10" style={display}>
              Built for the two people holding{" "}
              <span className="italic text-[#a8e6a8]">the most risk</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-7 md:p-8 rounded-2xl border border-[#7dd87d]/20 bg-[#7dd87d]/5 backdrop-blur-sm">
                <div className="w-12 h-12 bg-[#7dd87d]/20 rounded-full flex items-center justify-center mb-5">
                  <Sprout className="w-6 h-6 text-[#7dd87d]" />
                </div>
                <h3 className="text-white font-bold text-xl mb-3" style={display}>
                  Founders
                </h3>
                <p className="text-white/75 leading-relaxed">
                  You're starting a land project and you want clear agreements
                  from day one, and a game people actually play to make it
                  succeed. Who decides, how money flows, how new people come
                  in: written down, playable, and alive in your community.
                </p>
              </div>

              <div className="p-7 md:p-8 rounded-2xl border border-[#d4a574]/25 bg-[#d4a574]/5 backdrop-blur-sm">
                <div className="w-12 h-12 bg-[#d4a574]/20 rounded-full flex items-center justify-center mb-5">
                  <Coins className="w-6 h-6 text-[#d4a574]" />
                </div>
                <h3 className="text-white font-bold text-xl mb-3" style={display}>
                  Investors
                </h3>
                <p className="text-white/75 leading-relaxed">
                  You're putting capital into a land project and you want
                  coordination and accountability infrastructure so the
                  investment produces value. The game gives you a live window
                  into decisions, money, and progress, without chasing anyone
                  for updates.
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── 3. THE PROBLEM ── */}
        <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
          <div className="max-w-3xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              The problem
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8" style={display}>
              Land projects fail on coordination long before they fail on{" "}
              <span className="italic text-[#a8e6a8]">permaculture</span>
            </h2>
            <div className="space-y-6 text-white/75 text-lg leading-relaxed">
              <p>
                We've watched it happen. The soil is improving, the gardens are
                in, and the project still unravels. Coordination breaks first.
                Then money opacity. Then burnout in the two people carrying
                everything.
              </p>
              <p className="text-white text-xl font-medium" style={display}>
                Who decides. Where the money goes. How contribution gets seen.
              </p>
              <p>
                Most projects leave these questions for later, and later
                arrives as a crisis. The game answers them on day one, in a
                form your whole community can see and play.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* ── 4. AMORA, LIVE ── */}
        <AnimatedSection as="section" animation="slide-up" id="amora" className="py-20 md:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              Proof, running in production
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
              Amora, <span className="italic text-[#a8e6a8]">live</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-10 max-w-2xl">
              Amora is a regenerative village rising in Costa Rica, and client
              #1. Their game runs today: four journeys into the village, quests
              with consent-based crediting, a Gratitude currency, twelve stages
              of growth, and Maia, their own AI guide. Every screen below is
              the real thing.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {AMORA_SHOTS.map((s) => (
                <AmoraShot
                  key={s.name}
                  name={s.name}
                  caption={s.caption}
                  className={s.wide ? "sm:col-span-2" : ""}
                />
              ))}
            </div>

            <div className="mt-8">
              <a
                href="https://amora.regencivics.earth"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => analytics.ctaClick("custom_games_visit_amora", "/custom-games")}
              >
                <Button
                  size="lg"
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-8"
                >
                  Explore Amora's game
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </a>
            </div>

            {/* Latest from ReGen Civics: living proof of active development */}
            <div className="mt-14 p-6 md:p-8 rounded-2xl border border-[#7dd87d]/20 bg-[#7dd87d]/5">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-4 h-4 text-[#7dd87d]" />
                <span className="text-white/90 text-xs font-semibold tracking-[0.18em] uppercase">
                  Latest from ReGen Civics
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                {LATEST_SHIPS.map((ship) => (
                  <div key={ship.title}>
                    <div className="text-white font-semibold mb-1.5" style={display}>
                      {ship.title}
                    </div>
                    <p className="text-white/65 text-sm leading-relaxed">{ship.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-white/55 text-sm leading-relaxed">
                This strip updates as the platform ships. ReGen Civics is the
                builder shipping upgrades; Amora is client #1. Every game we
                deliver starts from the newest foundation.
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* ── 5. THE FOUR PERSONAS ── */}
        <AnimatedSection as="section" animation="slide-up" id="personas" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              The four personas
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
              A journey for every person{" "}
              <span className="italic text-[#a8e6a8]">your project needs</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-12 max-w-2xl">
              Different people arrive with different questions. Each persona
              gets its own path from arrival to contribution: quests to walk,
              agreements to make, and recognition that follows the work. All
              four are fully configurable to your community.
            </p>

            <div className="space-y-14">
              {PERSONAS.map((p, i) => (
                <div key={p.label} className="grid md:grid-cols-2 gap-8 items-center">
                  <div className={i % 2 === 1 ? "md:order-2" : ""}>
                    <AmoraShot name={p.shot} caption={`${p.label} journey inside Amora`} />
                  </div>
                  <div className={i % 2 === 1 ? "md:order-1" : ""}>
                    <div className="text-[#7dd87d] text-xs font-semibold tracking-[0.18em] uppercase mb-2">
                      {p.label}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3" style={display}>
                      {p.headline}
                    </h3>
                    <p className="text-white/70 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── 6. WHAT YOUR GAME COVERS ── */}
        <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              What your game covers
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
              The six systems every land project{" "}
              <span className="italic text-[#a8e6a8]">has to answer</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-10 max-w-2xl">
              The same curriculum our incubator teaches over a season, built
              into your game so the answers live where your community plays.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {COVERS.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.title}
                    className="p-6 rounded-xl border border-[#7dd87d]/15 bg-[#7dd87d]/5 hover:border-[#7dd87d]/35 transition-colors"
                  >
                    <Icon className="w-7 h-7 text-[#7dd87d] mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2" style={display}>
                      {c.title}
                    </h3>
                    <p className="text-white/65 text-sm leading-relaxed">{c.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* ── 7. YOU OWN IT. ALL OF IT. ── */}
        <AnimatedSection as="section" animation="slide-up" id="ownership" className="px-4 py-20 md:py-28 bg-[#0d2818]/50">
          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl border-2 border-[#d4a574]/50 bg-gradient-to-br from-[#d4a574]/15 via-[#0d2818]/70 to-[#0d2818]/90 p-8 md:p-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(212,165,116,0.25), transparent 70%)" }}
              />
              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 px-4 py-2 rounded-full mb-6 border border-[#d4a574]/45">
                  <KeyRound className="w-4 h-4 text-[#d4a574]" />
                  <span className="text-white/90 text-xs font-semibold tracking-[0.18em] uppercase">
                    The ownership promise
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5" style={display}>
                  You own it. <span className="italic text-[#d4a574]">All of it.</span>
                </h2>
                <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl">
                  The $20,000 buys the whole thing. When we hand your game off,
                  it's yours the way your land is yours.
                </p>

                <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-10">
                  {OWNERSHIP_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-white/80 leading-relaxed">
                      <span className="mt-1 w-5 h-5 rounded-md bg-[#d4a574]/20 border border-[#d4a574]/40 shrink-0 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-[#d4a574]" strokeWidth={3} />
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <div className="p-6 rounded-2xl bg-[#0d2818]/60 border border-[#7dd87d]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Handshake className="w-5 h-5 text-[#7dd87d]" />
                    <span className="text-white font-semibold" style={display}>
                      Or hand us the ops
                    </span>
                  </div>
                  <p className="text-white/70 leading-relaxed">
                    Full service: ReGen Civics carries hosting, AI credits,
                    updates, and stewardship for you. No servers, no code, no
                    ops on your side. One fixed monthly price, scoped at
                    contract.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ── 8. HOW IT WORKS ── */}
        <AnimatedSection as="section" animation="slide-up" id="process" className="py-20 md:py-28 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              How it works
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
              Six steps from conversation{" "}
              <span className="italic text-[#a8e6a8]">to handoff</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-12">
              It starts with a 20-minute conversation and ends with your team
              holding the keys. You follow the whole build on your own progress
              tracker in between.
            </p>

            <GrowingTimeline>
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <span className="absolute -left-[2.35rem] top-1 w-3 h-3 rounded-full bg-[#7dd87d] ring-4 ring-[#7dd87d]/20" />
                  <div className="text-[#d4a574] text-xs font-semibold tracking-[0.18em] uppercase mb-1">
                    Step {s.n}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2" style={display}>
                    {s.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </GrowingTimeline>
          </div>
        </AnimatedSection>

        {/* ── 9. PRICING ── */}
        <AnimatedSection as="section" animation="slide-up" id="pricing" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
          <div className="max-w-3xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-10" style={display}>
              One price. <span className="italic text-[#a8e6a8]">You pay as it becomes real.</span>
            </h2>

            <div className="rounded-3xl border border-[#7dd87d]/30 bg-[#7dd87d]/5 p-8 md:p-10 text-center">
              <div className="text-5xl md:text-6xl font-bold text-[#7dd87d] mb-2" style={display}>
                $20,000
              </div>
              <p className="text-white/75 mb-8">
                Your complete game, fully owned, self-hosted, delivered in 3 to
                6 months.
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                {[
                  { pct: "50%", label: "at kickoff" },
                  { pct: "25%", label: "at first draft" },
                  { pct: "25%", label: "at handoff" },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl border border-[#7dd87d]/20 bg-[#0d2818]/50 py-4 px-2">
                    <div className="text-2xl font-bold text-white" style={display}>
                      {m.pct}
                    </div>
                    <div className="text-white/60 text-xs mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[#d4a574]/30 bg-[#d4a574]/5 p-8 md:p-10">
              <h3 className="text-white font-bold text-xl mb-3" style={display}>
                Optional full service
              </h3>
              <div className="text-3xl md:text-4xl font-bold text-[#d4a574] mb-3" style={display}>
                $20 to $2,000 <span className="text-lg text-white/70 font-medium">per month</span>
              </div>
              <p className="text-white/75 leading-relaxed mb-3">
                Fixed at contract based on what you ask us to carry: hosting
                only at the low end, up through AI credits, updates, and
                ongoing stewardship. Metered only past the average use agreed
                at contract.
              </p>
              <p className="text-[#d4a574] font-semibold">One number, no surprises.</p>
            </div>

            <p className="mt-8 text-center text-white/60 text-sm leading-relaxed">
              We take on 3-5 projects per season so each one gets real
              attention from our team. Outreach-to-kickoff typically takes 5
              business days.
            </p>
          </div>
        </AnimatedSection>

        {/* ── 10. WHAT WE NEED FROM YOU ── */}
        <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              What we need from you
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
              Four things make the build{" "}
              <span className="italic text-[#a8e6a8]">move fast</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              The 3 to 6 month range mostly comes down to these. Have them
              ready and your game lands on the early side.
            </p>

            <ul className="space-y-4">
              {NEEDS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4 p-5 rounded-xl border border-[#7dd87d]/15 bg-[#7dd87d]/5 text-white/85 leading-relaxed"
                >
                  <span className="mt-0.5 w-6 h-6 rounded-md bg-[#7dd87d]/20 border border-[#7dd87d]/40 shrink-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#7dd87d]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </AnimatedSection>

        {/* ── 11. FAQ ── */}
        <AnimatedSection as="section" animation="slide-up" id="faq" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
          <div className="max-w-3xl mx-auto">
            <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
              Common questions
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-10" style={display}>
              Before you <span className="italic text-[#a8e6a8]">apply</span>
            </h2>

            <div className="space-y-4">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q}>
                  {f.a}
                </FaqItem>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── 12. FINAL CTA ── */}
        <section className="relative py-24 md:py-32 px-4 text-center overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(125,216,125,0.12), transparent 70%)" }}
          />
          <AnimatedSection animation="scale-in" className="relative z-10 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#7dd87d]/15 px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
              <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
              <span className="text-white/90 text-sm font-medium">3 to 5 projects per season</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5" style={display}>
              Your community is already playing a game.{" "}
              <span className="italic text-[#a8e6a8]">Design it on purpose.</span>
            </h2>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              Twenty minutes with Sylva starts it. You'll walk away with a
              Blueprint for your game worth reading even if we never build it
              together.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <Link href="/custom-games/apply">
                <Button
                  size="lg"
                  onClick={() =>
                    analytics.ctaClick("custom_games_design_your_game_final", "/custom-games")
                  }
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-10 min-h-[48px]"
                >
                  Design Your Game
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => openWaitlist("final")}
                className="rounded-xl px-8 min-h-[48px] border-[#7dd87d]/40 text-[#7dd87d] hover:text-white hover:border-[#7dd87d] bg-transparent"
              >
                Join the Waitlist
              </Button>
            </div>
          </AnimatedSection>
        </section>

        {/* Waitlist Form Modal (secondary path) */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <div className="relative bg-[#0d2818] border border-[#7dd87d]/25 rounded-2xl shadow-2xl w-full max-w-lg my-8 p-6">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-white mb-1" style={display}>
                Join the Waitlist
              </h2>
              <p className="text-white/70 text-sm mb-6">
                Tell us about your land project and we'll be in touch.
              </p>
              <CustomGameWaitlistForm onClose={() => setShowForm(false)} />
            </div>
          </div>
        )}

        <StickyThumbCta
          href="/custom-games/apply"
          label="Design Your Game"
          where="custom_games_sticky_cta"
          page="/custom-games"
        />
      </div>
    </PageWrapper>
  );
}
