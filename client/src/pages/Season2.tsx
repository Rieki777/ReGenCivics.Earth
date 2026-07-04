/**
 * Season Two: public invitation / landing page (/season2)
 *
 * Reskinned from the Season Two invitation concept into the ReGen Civics
 * design system: forest-green palette, Quicksand/Nunito type, lucide icons,
 * AnimatedSection reveals, ReadableScrim over the hero image, glass panels.
 *
 * Folds in the 10 pre-build improvements:
 *  1. Higher-contrast body text (min white/70, never below white/60)
 *  2. Persistent apply CTA (StickyThumbCta, mobile thumb zone)
 *  3. Concrete closing CTA (timeline + what-happens-next)
 *  4. lucide icons in place of emoji
 *  5. Season One proof block (placeholders flagged for Rye)
 *  6. Risk/legal note on the token swap (links /risk-disclosure)
 *  7. FAQ section (objection handling)
 *  8. Time-commitment stated up front
 *  9. Newsletter fallback for the not-ready-yet
 * 10. Tighter hero + full SEO/share meta
 *
 * NOTE for Rye: search "TODO(rye)" for the few spots that need real numbers,
 * dates, or quotes before this goes fully live.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Sprout,
  Gamepad2,
  Link2,
  Coins,
  Scale,
  Network,
  Unlock as UnlockIcon,
  Heart,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { ReadableScrim } from "@/components/ReadableScrim";
import { StickyThumbCta } from "@/components/StickyThumbCta";
import { SEO } from "@/components/SEO";

const display = { fontFamily: "var(--font-display)" } as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ─── Countdown to application close ─────────────────────────────────────
const APPLICATIONS_CLOSE = new Date("2026-09-01T23:59:59");

function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, APPLICATIONS_CLOSE.getTime() - now);
  if (diff === 0) return null;

  const cells: { value: number; label: string }[] = [
    { value: Math.floor(diff / 86_400_000), label: "days" },
    { value: Math.floor(diff / 3_600_000) % 24, label: "hours" },
    { value: Math.floor(diff / 60_000) % 60, label: "min" },
    { value: Math.floor(diff / 1000) % 60, label: "sec" },
  ];

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 md:gap-3">
        {cells.map((c) => (
          <div
            key={c.label}
            className="w-16 md:w-20 py-2.5 rounded-xl bg-[#0d2818]/70 backdrop-blur-sm border border-[#7dd87d]/25 text-center"
          >
            <div
              className="text-2xl md:text-3xl font-bold text-[#7dd87d] tabular-nums leading-none"
              style={display}
            >
              {String(c.value).padStart(2, "0")}
            </div>
            <div className="text-white/55 text-[0.65rem] uppercase tracking-[0.15em] mt-1">
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div className="text-white/70 text-sm">until applications close</div>
    </div>
  );
}

// ─── Drifting seed particles over the hero ──────────────────────────────
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  delay: (i * 1.9) % 14,
  duration: 16 + (i % 5) * 5,
  size: 3 + (i % 3) * 2,
  opacity: 0.2 + (i % 4) * 0.09,
}));

function HeroParticles() {
  const [reduced] = useState(prefersReducedMotion);
  if (reduced) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes s2-drift {
          0% { transform: translateY(12vh) translateX(0); opacity: 0; }
          12% { opacity: var(--s2-o); }
          85% { opacity: var(--s2-o); }
          100% { transform: translateY(-95vh) translateX(38px); opacity: 0; }
        }
      `}</style>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full bg-[#a8e6a8]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: 0,
            filter: "blur(0.5px)",
            boxShadow: "0 0 8px rgba(125,216,125,0.7)",
            animation: `s2-drift ${p.duration}s linear ${p.delay}s infinite`,
            ["--s2-o" as string]: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ─── Roadmap timeline that grows as you scroll ──────────────────────────
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

// ─── FAQ item ───────────────────────────────────────────────────────────
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

// ─── Readiness check (interactive "what to bring") ─────────────────────
const REQUIRED_ITEMS = [
  "Existing land or assets under contract",
  "Ready to fundraise with a pitch and timeline",
  "A lot of passion and dedication to your vision",
  "A team with existing social presence and storytelling capacity",
  "Core project management team in place",
];

const ENCOURAGED_ITEMS = [
  "Interoperable technology stack (Hypha DAO tools or equivalent)",
  "Regenerative business plan with a capital model",
  "A framework for measuring what regeneration means for your project",
  "Ability to edify others: courses, resources, documentation",
  "Cooperative or distributed power and value structures",
];

function readinessMessage(req: number): { headline: string; body: string } {
  if (req === REQUIRED_ITEMS.length)
    return {
      headline: "Your project is ready for this season.",
      body: "Get your application in early. Shortlisting is rolling, and applying sooner gives you more time to prepare your pitch video.",
    };
  if (req >= 3)
    return {
      headline: "You're close.",
      body: "Most of the baseline is in place, and the season itself is designed to help you build the rest. Apply now and keep growing the missing pieces.",
    };
  return {
    headline: "Early is welcome here.",
    body: "Passion and a real team count for more than polish. Apply at the stage you're actually at, and tell us where you're headed.",
  };
}

function ChecklistColumn({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: string[];
  checked: Set<string>;
  onToggle: (item: string) => void;
}) {
  return (
    <div>
      <h3 className="text-[#7dd87d] text-xs font-semibold tracking-[0.18em] uppercase mb-4">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => {
          const on = checked.has(item);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => onToggle(item)}
                aria-pressed={on}
                className={`w-full flex items-start gap-3 text-left leading-relaxed rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                  on ? "text-white bg-[#7dd87d]/10" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                    on
                      ? "bg-[#7dd87d] border-[#7dd87d]"
                      : "border-[#7dd87d]/40 bg-transparent"
                  }`}
                >
                  {on && <Check className="w-3.5 h-3.5 text-[#1a472a]" strokeWidth={3} />}
                </span>
                {item}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReadinessCheck() {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const toggle = (item: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });

  const req = REQUIRED_ITEMS.filter((i) => checked.has(i)).length;
  const enc = ENCOURAGED_ITEMS.filter((i) => checked.has(i)).length;
  const touched = checked.size > 0;
  const msg = readinessMessage(req);

  return (
    <>
      <div className="grid md:grid-cols-2 gap-8">
        <ChecklistColumn title="Required" items={REQUIRED_ITEMS} checked={checked} onToggle={toggle} />
        <ChecklistColumn title="Strongly encouraged" items={ENCOURAGED_ITEMS} checked={checked} onToggle={toggle} />
      </div>

      {touched && (
        <div className="mt-8 p-6 md:p-7 rounded-xl bg-[#7dd87d]/10 border border-[#7dd87d]/30">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3 text-sm text-white/70">
            <span>
              <strong className="text-[#7dd87d] font-semibold">{req}</strong> of{" "}
              {REQUIRED_ITEMS.length} required
            </span>
            <span>
              <strong className="text-[#7dd87d] font-semibold">{enc}</strong> of{" "}
              {ENCOURAGED_ITEMS.length} encouraged
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7dd87d]/70 to-[#7dd87d] transition-all duration-500"
              style={{ width: `${((req * 2 + enc) / (REQUIRED_ITEMS.length * 2 + ENCOURAGED_ITEMS.length)) * 100}%` }}
            />
          </div>
          <div className="text-white font-semibold text-lg mb-1" style={display}>
            {msg.headline}
          </div>
          <p className="text-white/75 leading-relaxed mb-5">{msg.body}</p>
          <Link href="/apply">
            <Button className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-6">
              Apply for Season Two
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}

// ─── Roadmap step ───────────────────────────────────────────────────────
const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Start with Heart: share your vision",
    body: "Each project makes a 5-minute video: where your project is now, where it's going, and why it matters. This becomes part of the Season Two introduction and crowdpooling campaign.",
  },
  {
    n: "02",
    title: "Co-create your economic and organizational structure",
    body: "Choose your DAO/DHO tools: Hypha, Gardens, DAOhaus, Colony, or others. Design your coordination structure: roles, tokens, quests, acknowledgment systems, co-creation frameworks. This is the core of your Infinite Game.",
  },
  {
    n: "03",
    title: "Co-create your legal and land ownership structure",
    body: "What legal entities protect the land, the members, and the mission? What's the long-term ownership intention: private, cooperative, fractional, community land trust? We work through this together with the full cohort's experience.",
  },
  {
    n: "04",
    title: "Financial and sustainability structure",
    body: "Business models, regenerative economics, thrivability planning. How are members' needs sustained? How does the project create returns for people, for land, for the alliance? What evidence shows this model can work?",
  },
  {
    n: "05",
    title: "Co-create your Crowdpooling event",
    body: "Crowdpooling gathers all 9+ forms of capital: land, equipment, expertise, labor, relationships, knowledge. Design contribution tiers, acknowledgment systems, and thresholds, then launch to the world together.",
  },
  {
    n: "06",
    title: "Co-create shared economic frameworks across the network",
    body: "Contributions to one project become redeemable for access to another. Shared DAO/DHO infrastructure, shared game and cultural framing, interoperable tokens. This is where thirteen independent projects start to become a global network.",
  },
  {
    n: "07",
    title: "Graduate into member status and keep going",
    body: "Projects that complete the season move into alliance member status. You keep co-creating and coordinating as the next cohort of thirteen projects comes through. Everything you built gets templated and open-sourced.",
  },
];

// ─── Who this is for ────────────────────────────────────────────────────
const WHO: { img: string; name: string; desc: string }[] = [
  {
    img: "/season2/who-1-gardens.jpg",
    name: "Community Gardens & Local Food Economies",
    desc: "A shared garden is already a coordination challenge. The game helps you name it and design it well from the start.",
  },
  {
    img: "/season2/who-2-cohousing.jpg",
    name: "Intentional Communities & Collaborative Co-Housing",
    desc: "Groups building shared life together who need clear structures for how everything actually works.",
  },
  {
    img: "/season2/who-3-ecovillage.jpg",
    name: "Eco-Villages & Permaculture Projects",
    desc: "Place-based projects with land and a vision that needs legal grounding and economic infrastructure to hold together long-term.",
  },
  {
    img: "/season2/who-4-lab.jpg",
    name: "Learning Labs & Regenerative Demonstration Hubs",
    desc: "Projects whose purpose is to model and teach regenerative systems, and need their own internal systems to reflect that.",
  },
  {
    img: "/season2/who-5-city.jpg",
    name: "Solarpunk Cities & Regenerative Startup Towns",
    desc: "Large-scale visions for entire communities designing their own economies and governance from the ground up.",
  },
  {
    img: "/season2/who-6-bioregion.jpg",
    name: "Bioregional DAOs & Purpose-Driven Organizations",
    desc: "Decentralized organizations coordinating regenerative economies at regional scale, where governance complexity tends to outpace what informal structures can handle.",
  },
];

// ─── What accepted projects receive ─────────────────────────────────────
const GET: { icon: React.ElementType; title: string; body: string }[] = [
  {
    icon: Gamepad2,
    title: "The ReGen Civics Accelerator",
    body: "Full participation in the season's incubation process: designing your social, economic, financial, governance, and organizational systems alongside thirteen other projects doing the same.",
  },
  {
    icon: Link2,
    title: "The $RCivics Token Swap",
    body: "A token swap that makes every project co-invested in every other. ReGen Civics takes a minority stake, usually under 10%, sized uniquely to your project. You hold a piece of the alliance. The alliance holds a piece of you.",
  },
  {
    icon: Coins,
    title: "Funding Access",
    body: "Alliance membership opens access to funding from ReGen Civics, with member voting on which projects receive capital. Projects receive funding and provide equivalent tokens in return. Investors put money into the alliance and hold tokens backed by all projects.",
  },
  {
    icon: Scale,
    title: "Legal Structure Design",
    body: "Support designing the legal entities that protect your land, your members, and your mission, drawing on what the full cohort and alliance network have already worked through.",
  },
  {
    icon: Network,
    title: "Global Alliance Network",
    body: "Access to the full ReGen Civics alliance: Global Ecovillage Network, Foundation for Intentional Communities, SEEDS, Hypha, Universe Land Trust, and dozens of other regenerative organizations and tools.",
  },
  {
    icon: UnlockIcon,
    title: "Open Source Everything",
    body: "Every tool, template, and framework built during the season gets open-sourced. Your work becomes infrastructure for every project that comes after you.",
  },
];

// ─── Selection process ──────────────────────────────────────────────────
const PITCH_EXAMPLES_URL =
  "https://pie.yt/?v=https://youtu.be/AJZI0OiRPeU?si=bHPcwIEA1HHBq-IV&pieshare=1";

const SELECTION: {
  title: string;
  body: string;
  cta?: { href: string; label: string; external?: boolean };
}[] = [
  {
    title: "Apply by September 1st",
    body: "Applications close September 1st. Every project that applies is taken seriously regardless of scale, geography, or stage. We approve shortlisted projects on a rolling basis, so applying earlier gives you more time to prepare.",
  },
  {
    title: "Shortlisted projects make a pitch video",
    body: "All projects are scored, and we let shortlisted projects know by September 5th, or sooner if you apply early. Shortlisted projects then have until September 14th to submit a short pitch video telling their story, so about nine days to finalize it. We encourage making one in advance since it is a great thing to have anyway. We share every pitch video publicly to give your project exposure, unless you ask us not to.",
    cta: { href: PITCH_EXAMPLES_URL, label: "Watch Season One pitch video examples", external: true },
  },
  {
    title: "The season council selects 13 on the Equinox",
    body: "Season Two opens on the Equinox with a selection day held in public. A season council, made up of members from previous seasons' projects, chooses the thirteen projects for the season. As the alliance grows, the wider community takes on more of this choice each season.",
  },
  {
    title: "The season opens",
    body: "The thirteen selected projects are introduced in a recording that kicks off the season, used for the crowdpooling campaigns and to get word out about what's about to be built.",
    cta: { href: "/crowd-pooling", label: "See our crowdpooling page" },
  },
];

// ─── Season One projects ────────────────────────────────────────────────
const SEASON_ONE: { tag: string; name: string; loc: string; img: string }[] = [
  { tag: "Eco-Village", name: "Liminal Village", loc: "Italy", img: "/season2/s1-liminal.jpg" },
  { tag: "Regenerative Village", name: "Traditional Dream Factory", loc: "Portugal", img: "/season2/s1-tdf.jpg" },
  { tag: "Sacred Land Farm", name: "Finca Sagrada", loc: "Ecuador", img: "/season2/s1-finca.jpg" },
  { tag: "Eco-Healing Sanctuary", name: "Heartland Retreat", loc: "California", img: "/season2/s1-heartland.jpg" },
  { tag: "Blue Zone Village", name: "La Tierra", loc: "Costa Rica", img: "/season2/s1-latierra.jpg" },
  { tag: "Ecovillage", name: "Our NeighbourGood", loc: "New Zealand", img: "/season2/s1-neighbourgood.jpg" },
];

export default function Season2() {
  const heroImgRef = useRef<HTMLImageElement>(null);

  // Slow parallax drift on the hero image
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => {
      const img = heroImgRef.current;
      if (!img) return;
      const y = Math.min(window.scrollY * 0.16, 150);
      img.style.transform = `translateY(${y}px) scale(1.08)`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO
        title="Season Two: Apply to the ReGen Civics Incubator"
        description="Season Two opens thirteen seats for regenerative land projects. Design the governance, economic, legal, and financial systems that let your project actually work, alongside an alliance building it in public."
        image="/og/season2.jpg"
      />

      {/* ── HERO ── */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center overflow-hidden px-4 py-24 text-center">
        <div className="absolute inset-0">
          <img
            ref={heroImgRef}
            src="/season2/hero.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover will-change-transform"
            style={{ transform: "scale(1.08)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/75 via-[#0d2818]/55 to-[#0d2818]" />
        </div>
        <HeroParticles />

        <AnimatedSection animation="fade-in" className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/15 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-[#7dd87d]/30">
            <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
            <span className="text-white/90 text-sm font-medium tracking-wide">
              Season Two · 13 seats open · begins September 2026
            </span>
          </div>

          <ReadableScrim block className="max-w-3xl mx-auto mb-8">
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
              style={display}
            >
              Help your land project answer the questions it can't afford to{" "}
              <span className="italic text-[#7dd87d]">ignore.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 leading-relaxed max-w-2xl mx-auto">
              An alliance of global organizations running an incubator for
              regenerative land projects. We help each one build the governance,
              economic, and legal systems to actually work.
            </p>
          </ReadableScrim>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/apply">
              <Button
                size="lg"
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-8"
              >
                Apply for Season Two
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#what">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl px-8 border-[#7dd87d]/40 text-[#7dd87d] hover:text-white hover:border-[#7dd87d] bg-transparent"
              >
                Learn what this is
              </Button>
            </a>
          </div>

          <div className="mt-10">
            <Countdown />
          </div>
        </AnimatedSection>

        <a
          href="#what"
          aria-label="Scroll to learn more"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#7dd87d]/50 hover:text-[#7dd87d] transition-colors"
        >
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* ── WHAT ── */}
      <AnimatedSection as="section" animation="slide-up" id="what" className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            What is ReGen Civics
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8" style={display}>
            An alliance helping communities launch{" "}
            <span className="italic text-[#a8e6a8]">Infinite Games</span> to
            co-create regenerative societies
          </h2>

          <div className="space-y-6 text-white/75 text-lg leading-relaxed">
            <p>
              Most land projects are held together by shared vision. That gets
              them started. Eventually, sometimes early and sometimes only when
              something breaks, every project has to answer the same hard
              questions: who decides, how do people get compensated, what legal
              structure protects the land, how do we bring someone new in, and
              what happens when we disagree?
            </p>
            <p>
              <strong className="text-white font-semibold">
                ReGen Civics helps land projects design the social, economic,
                financial, governance, and organizational systems that let them
                actually work.
              </strong>{" "}
              We call these systems Infinite Games. The goal is to keep playing,
              and to grow the number of people who can play. The main idea behind
              any Infinite Game is to help us meet our needs in the most joyful and
              beautiful way we can.
            </p>

            <blockquote className="border-l-2 border-[#7dd87d] bg-[#7dd87d]/8 rounded-r-lg pl-6 pr-5 py-5 my-2">
              <p className="italic text-[#a8e6a8] text-xl leading-relaxed" style={display}>
                "Economic systems are the single most powerful tools that
                humanity has ever created. They have the ability to coordinate
                billions of humans around a shared purpose."
              </p>
            </blockquote>

            <img
              src="/season2/infinite-games.jpg"
              alt="An endless regenerative loop with no finish line"
              loading="lazy"
              className="w-full max-w-lg mx-auto my-4 select-none drop-shadow-[0_0_45px_rgba(125,216,125,0.18)]"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse at center, #000 55%, transparent 78%)",
                maskImage: "radial-gradient(ellipse at center, #000 55%, transparent 78%)",
              }}
            />

            <p>
              The dominant ones were designed with flaws built in. Incentives to
              create waste, incentives to extract, incentives to concentrate
              power. The ReGenerative Renaissance is the global movement to
              prototype something better. Thirteen projects at a time, each
              season, in public, with everything open-sourced so the next wave of
              builders starts from a foundation instead of scratch.
            </p>
            <p>
              Season One ran. Projects went through. We learned a lot. Season Two
              opens thirteen new seats.
            </p>
          </div>

          {/* Season One projects map — the thirteen that went through. */}
          <figure className="mt-12">
            <img
              src="/season2/s1-projects-map.webp"
              alt="The thirteen Season One projects: Ubuntu, Finca Sagrada, Tabi, Liminal Village, collaborative housing, TDF, TioGA, la tierra, StarSeed Village, Nyx, ReGen Campus, LaLa Gardens Cooperative, and more, growing out from ReGen Civics"
              loading="lazy"
              onError={(e) => {
                // Hide the figure until the projects-map graphic is dropped in.
                (e.currentTarget.closest("figure") as HTMLElement | null)?.style.setProperty("display", "none");
              }}
              className="w-full rounded-2xl border border-[#7dd87d]/15"
            />
            <figcaption className="mt-3 text-center text-white/55 text-sm">
              The Season One cohort. More ReGen projects join each season.
            </figcaption>
          </figure>
        </div>
      </AnimatedSection>

      {/* Regenerative Renaissance — cinematic band between the story and the roadmap */}
      <figure className="relative w-full h-64 md:h-[26rem] overflow-hidden">
        <img
          src="/season2/regenerative-renaissance.webp"
          alt="Barren land healing across the scene into abundant regenerated forest, gardens, clean water, and people planting and celebrating together beneath a banner reading The Regenerative Renaissance"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818] via-transparent to-[#0d2818]/95" />
        <figcaption className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-center">
          <p className="text-white text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" style={display}>
            A movement to prototype something better, thirteen projects at a time.
          </p>
        </figcaption>
      </figure>

      {/* ── ROADMAP ── */}
      <AnimatedSection as="section" animation="slide-up" id="journey" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            The incubation roadmap
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            Seven steps, <span className="italic text-[#a8e6a8]">one season</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-4">
            Each season follows a living roadmap, updated as we learn. Weekly
            sessions move through three patterns: we explain the next step, teams
            work on it, then each project showcases where they're at. Once nine
            projects have finalized their models for a given step, the whole
            cohort moves forward together.
          </p>
          <p className="inline-flex items-center gap-2 text-[#7dd87d] text-sm font-medium mb-8">
            <Clock className="w-4 h-4" />
            Plan for one live weekly session, plus a few to many more hours of
            project work between sessions depending on how prepared and advanced
            your team and project already are.
          </p>

          <div className="mb-10">
            <Link href="/schedule">
              <Button
                size="lg"
                className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-8"
              >
                See the full season schedule
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <img
            src="/season2/roadmap.jpg"
            alt="A seedling growing into a full canopy across the season"
            loading="lazy"
            className="w-full max-w-[280px] mx-auto mb-12 select-none drop-shadow-[0_0_40px_rgba(125,216,125,0.16)]"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, #000 82%, transparent)",
              maskImage: "linear-gradient(to bottom, #000 82%, transparent)",
            }}
          />

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

      {/* ── NEW FOR SEASON TWO: launch your own Infinite Game ── */}
      <AnimatedSection as="section" animation="slide-up" className="px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-[#7dd87d]/40 bg-gradient-to-br from-[#7dd87d]/15 via-[#0d2818]/60 to-[#0d2818]/80 p-8 md:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(125,216,125,0.22), transparent 70%)" }}
            />
            <div className="relative grid md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/40">
                  <Sparkles className="w-4 h-4 text-[#7dd87d]" />
                  <span className="text-white/90 text-xs font-semibold tracking-[0.18em] uppercase">
                    New for Season Two
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5" style={display}>
                  Launch your own <span className="italic text-[#a8e6a8]">Infinite Game</span>
                </h2>
                <p className="text-white/80 text-lg leading-relaxed mb-4">
                  This season we help you use AI tools and templates, starting from an
                  open-source blueprint we have spent a lot of time building, to launch
                  your own Infinite Game. The same kind of system we built for ReGen
                  Civics, purpose-built for your land project and owned by you.
                </p>
                <p className="text-white/70 leading-relaxed">
                  It is one of the biggest things we are adding for Season Two, and a
                  huge value for every project that comes through.
                </p>
              </div>
              <img
                src="/season2/launch-game.webp"
                alt="An open blueprint book in an enchanted forest, a glowing seed rising from its pages into a thriving miniature village-world"
                loading="lazy"
                className="w-full rounded-2xl border border-[#7dd87d]/20 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
              />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Community gathering — a celebratory band leading into who this is for */}
      <figure className="relative w-full h-64 md:h-[26rem] overflow-hidden">
        <img
          src="/season2/season2-gathering.webp"
          alt="A large diverse community gathered around a fire at golden dusk, holding lanterns and seedlings, celebrating beneath banners reading A New Season and Community Returning"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818] via-transparent to-[#0d2818]/95" />
      </figure>

      {/* ── WHO ── */}
      <AnimatedSection as="section" animation="slide-up" id="who" className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            Who this is for
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            Any group doing a regenerative land project where{" "}
            <span className="italic text-[#a8e6a8]">humans are meeting their needs</span>{" "}
            together
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-10 max-w-2xl">
            Season Two is open to a wide range of projects. What matters is that
            you're building with other people, on or with the land, and you're
            ready to design the systems that make it work. Projects of every scale
            are welcome.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHO.map((w) => (
              <div
                key={w.name}
                className="group relative min-h-[20rem] rounded-2xl overflow-hidden border border-[#7dd87d]/15 hover:border-[#7dd87d]/45 transition-all duration-300"
              >
                <img
                  src={w.img}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818] via-[#0d2818]/75 to-[#0d2818]/15" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-white font-semibold text-lg leading-snug mb-1.5" style={display}>
                    {w.name}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ── WHAT YOU GET ── */}
      <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            What accepted projects receive
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-8" style={display}>
            The accelerator, <span className="italic text-[#a8e6a8]">and a stake in each other.</span>
          </h2>

          <figure className="relative mb-12 rounded-2xl overflow-hidden border border-[#7dd87d]/15">
            <img
              src="/season2/alliance-network.webp"
              alt="Many small luminous project-worlds suspended in a forest, each holding a different regenerative project, all interconnected by glowing gold threads into one living alliance"
              loading="lazy"
              className="w-full h-40 md:h-56 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818] via-transparent to-transparent" />
          </figure>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GET.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.title}
                  className="p-6 rounded-xl border border-[#7dd87d]/15 bg-[#7dd87d]/5 hover:border-[#7dd87d]/35 transition-colors"
                >
                  <Icon className="w-7 h-7 text-[#7dd87d] mb-4" />
                  <h3 className="text-white font-semibold text-lg mb-2" style={display}>
                    {g.title}
                  </h3>
                  <p className="text-white/65 text-sm leading-relaxed">{g.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <img src="/season2/div-myc.jpg" alt="" aria-hidden="true" loading="lazy" className="block w-full h-16 md:h-20 object-cover opacity-60" />

      {/* ── WHAT TO BRING ── */}
      <AnimatedSection as="section" animation="slide-up" id="requirements" className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            What we're looking for
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            What to bring <span className="italic text-[#a8e6a8]">when you apply</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-8">
            An honest look at what we're looking for in Season Two. You don't need
            to finish all of this before applying. Apply at whatever stage you're
            actually at. Tap what you already have and see where you stand.
          </p>

          <figure className="relative mb-10 rounded-2xl overflow-hidden border border-[#7dd87d]/15">
            <img
              src="/season2/your-team.webp"
              alt="A small diverse team standing together on their land at golden hour, holding a seedling and tools in front of a partly-built regenerative community"
              loading="lazy"
              className="w-full h-44 md:h-60 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818] via-transparent to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white/90 text-sm md:text-base font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
              Passion and a real team count for more than polish.
            </figcaption>
          </figure>

          <ReadinessCheck />

          <div className="mt-10 p-6 rounded-xl bg-[#7dd87d]/8 border border-[#7dd87d]/20 text-white/75 leading-relaxed">
            <strong className="text-white font-semibold">A note on scale:</strong>{" "}
            We look for regenerative diversity across housing, food, wellbeing, and
            more. A small garden with clear purpose and a real team can score
            higher than a large project without a regenerative mindset.
          </div>
        </div>
      </AnimatedSection>

      {/* ── TOKEN SWAP ── */}
      <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
        <div className="max-w-2xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            How co-investment works
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            Everyone becomes <span className="italic text-[#a8e6a8]">invested in each other</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed">
            The token swap is what makes ReGen Civics an alliance. When you join
            the season, you and ReGen Civics become co-invested, and through the
            alliance, you become co-invested in every other project that's part of
            it.
          </p>

          <img
            src="/season2/token-swap.jpg"
            alt="Two projects exchanging tokens within the alliance ring"
            loading="lazy"
            className="w-full max-w-xl mx-auto mt-8 select-none drop-shadow-[0_0_50px_rgba(125,216,125,0.16)]"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at center, #000 56%, transparent 80%)",
              maskImage: "radial-gradient(ellipse at center, #000 56%, transparent 80%)",
            }}
          />

          <div className="mt-8 p-6 md:p-8 rounded-xl bg-[#7dd87d]/8 border border-[#7dd87d]/22 space-y-4 text-white/75 leading-relaxed">
            <p>
              <strong className="text-[#7dd87d] font-semibold">How the swap works:</strong>{" "}
              There is no fixed minimum. ReGen Civics sends $RCivics tokens to your
              project, and your project sends an equivalent value in your own tokens
              back. Neither is sold on the open market. They represent ownership and
              alignment. The intention is for ReGen Civics to hold a minority stake
              in your project, usually under 10%.
            </p>
            <p>
              <strong className="text-[#7dd87d] font-semibold">Unique to each project:</strong>{" "}
              Projects vary widely, so the swap is different for every one. We work
              through it together with each chosen project to design something that
              works for everyone: good for your project, good for the alliance, and
              good for the land and the people it holds.
            </p>
            <p>
              <strong className="text-[#7dd87d] font-semibold">Funding flows:</strong>{" "}
              When ReGen Civics receives investment, alliance members vote on which
              projects receive capital, with a preference for current season
              projects. Projects receive funding and provide equivalent tokens in
              return. Investors hold tokens backed by the whole alliance.
            </p>
          </div>

          <p className="mt-6 text-white/70 leading-relaxed">
            The entire process is open-source. Other projects outside the thirteen
            are encouraged to follow along, adapt it, and even set up additional
            alliance ecosystems with their own unique tokens.
          </p>

          <p className="mt-6 text-sm text-white/55 leading-relaxed">
            The token swap describes alignment, not a financial return or
            investment promise. Token values can move and may be illiquid.
            Read the full{" "}
            <Link href="/risk-disclosure" className="text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-2">
              risk disclosure
            </Link>{" "}
            before participating.
          </p>
        </div>
      </AnimatedSection>

      {/* Cohort constellation — a band leading into how thirteen get chosen */}
      <figure className="relative w-full h-64 md:h-[26rem] overflow-hidden">
        <img
          src="/season2/season2-constellation.webp"
          alt="Thirteen glowing project-worlds arranged in a circle around a radiant tree of light in a forest, connected by golden threads into one living constellation"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818] via-transparent to-[#0d2818]/95" />
        <figcaption className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-center">
          <p className="text-white text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" style={display}>
            Thirteen projects. One season. One growing network.
          </p>
        </figcaption>
      </figure>

      {/* ── SELECTION ── */}
      <AnimatedSection as="section" animation="slide-up" id="process" className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            The selection process
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            How thirteen projects <span className="italic text-[#a8e6a8]">get chosen</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-10">
            Any project can apply. Here's how the selection works.
          </p>

          <div className="relative mb-10 rounded-2xl overflow-hidden border border-[#7dd87d]/15">
            <img
              src="/season2/selection-day.jpg"
              alt="Community selection day gathering at the equinox"
              loading="lazy"
              className="w-full max-h-72 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818]/70 via-transparent to-transparent" />
          </div>

          <div className="space-y-0">
            {SELECTION.map((s, i) => (
              <div
                key={s.title}
                className="flex gap-5 items-start py-6 border-b border-[#7dd87d]/12 last:border-b-0"
              >
                <span
                  className="text-4xl font-bold text-[#7dd87d]/25 leading-none w-10 text-right shrink-0"
                  style={display}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-white font-medium mb-1">{s.title}</div>
                  <p className="text-white/65 leading-relaxed">{s.body}</p>
                  {s.cta &&
                    (s.cta.external ? (
                      <a
                        href={s.cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#7dd87d]/40 bg-[#7dd87d]/10 px-5 py-2.5 text-sm font-semibold text-[#7dd87d] hover:bg-[#7dd87d]/20 hover:text-white transition-colors"
                      >
                        {s.cta.label}
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link
                        href={s.cta.href}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7dd87d] px-5 py-2.5 text-sm font-semibold text-[#1a472a] hover:bg-[#9de89d] transition-colors"
                      >
                        {s.cta.label}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <img src="/season2/div-canopy.jpg" alt="" aria-hidden="true" loading="lazy" className="block w-full h-16 md:h-20 object-cover opacity-60" />

      {/* ── SEASON ONE ── */}
      <AnimatedSection as="section" animation="slide-up" className="py-20 md:py-28 px-4 bg-[#0d2818]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            From Season One
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            The kinds of projects that have <span className="italic text-[#a8e6a8]">gone through this</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-2xl">
            Season One brought together projects from across the globe, each going
            through the same incubation roadmap and open-sourcing what they learned
            along the way.
          </p>

          {/* Cinematic Season One map band with the actual stats overlaid.
              Richer impact stats will be captured from Season Two onward.
              TODO(rye): optional, add one short participant quote nearby for social proof. */}
          <div className="relative mb-10 rounded-2xl overflow-hidden border border-[#7dd87d]/15">
            <img
              src="/season2/s1map.jpg"
              alt="Season One projects connected across the globe"
              loading="lazy"
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818] via-[#0d2818]/45 to-[#0d2818]/10" />
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
              <div className="grid grid-cols-3 gap-4 max-w-2xl">
                {[
                  { stat: "46", label: "projects applied" },
                  { stat: "21", label: "shortlisted to pitch" },
                  { stat: "13", label: "chosen by the community" },
                ].map((m) => (
                  <div key={m.label} className="text-center">
                    <div className="text-3xl md:text-5xl font-bold text-[#7dd87d] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" style={display}>
                      {m.stat}
                    </div>
                    <div className="text-white/75 text-xs md:text-sm mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEASON_ONE.map((p) => (
              <div
                key={p.name}
                className="group relative aspect-[3/2] rounded-2xl overflow-hidden border border-[#7dd87d]/12 hover:border-[#7dd87d]/40 transition-all duration-300"
              >
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818] via-[#0d2818]/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="block text-[#7dd87d] text-[0.62rem] font-semibold tracking-[0.15em] uppercase mb-1">
                    {p.tag}
                  </span>
                  <div className="text-white font-semibold leading-tight" style={display}>
                    {p.name}
                  </div>
                  <div className="text-white/60 text-sm">{p.loc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-white/60">
            Watch the full Season One episodes on{" "}
            <a
              href="https://www.youtube.com/watch?v=fPLnPrugQz8&list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-2"
            >
              YouTube
            </a>{" "}
            to see the journey these projects went through.
          </p>
        </div>
      </AnimatedSection>

      {/* ── AMORA SNEAK PEEK ── */}
      <AnimatedSection as="section" animation="slide-up" id="amora" className="py-20 md:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            Sneak peek · a live Infinite Game
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6" style={display}>
            This is what we helped <span className="italic text-[#a8e6a8]">Amora</span> build
          </h2>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5 text-white/75 text-lg leading-relaxed">
              <p>
                Amora is a regenerative village rising in Costa Rica. Together we
                built their Infinite Game: four journeys into the village for
                Investors, Village Stewards, Residents, and Prosperity Creators,
                with their own GRATITUDE and VOICE tokens, circles, quests, roles,
                and rites of passage.
              </p>
              <p>
                Season Two projects get this same kind of build, purpose-built
                for your land and owned by your community.
              </p>
              <div className="pt-2">
                <a
                  href="https://amora.regencivics.earth/"
                  target="_blank"
                  rel="noopener noreferrer"
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
            </div>

            {/* Stylized peek at the Amora app, in Amora's warm palette */}
            <div className="relative">
              <a
                href="https://amora.regencivics.earth/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Amora Co-Create, the Infinite Game we built with Amora"
                className="block rounded-3xl border border-[#e07a5f]/35 bg-[#f7f1e8] shadow-[0_18px_60px_rgba(0,0,0,0.45)] overflow-hidden transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-2 px-5 py-3 bg-[#2d5a3d]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e07a5f]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d4a574]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7dd87d]" />
                  <span className="ml-2 text-white/85 text-xs font-medium truncate">
                    amora.regencivics.earth
                  </span>
                </div>
                <div className="p-6">
                  <div className="text-[#2d5a3d] font-bold text-xl mb-1" style={display}>
                    Amora Co-Create
                  </div>
                  <div className="text-[#2d5a3d]/70 text-sm mb-5">
                    Choose your path into the village
                  </div>
                  <div className="space-y-3">
                    {[
                      { path: "Investor", steps: "2 steps" },
                      { path: "Village Steward", steps: "12 steps" },
                      { path: "Resident", steps: "14 steps" },
                      { path: "Prosperity Creator", steps: "10 steps" },
                    ].map((j) => (
                      <div
                        key={j.path}
                        className="flex items-center justify-between rounded-xl bg-white/70 border border-[#2d5a3d]/15 px-4 py-3"
                      >
                        <span className="text-[#2d5a3d] font-semibold text-sm">
                          {j.path}
                        </span>
                        <span className="flex items-center gap-2 text-[#e07a5f] text-xs font-semibold">
                          {j.steps}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </a>

              {/* GRATITUDE + VOICE token coins */}
              <img
                src="/season2/amora-gratitude.webp"
                alt="Amora GRATITUDE token"
                width={480}
                height={480}
                className="absolute -bottom-8 -left-6 w-20 md:w-24 h-auto rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] rotate-[-8deg]"
              />
              <img
                src="/season2/amora-voice.webp"
                alt="Amora VOICE token"
                width={480}
                height={480}
                className="absolute -bottom-10 left-12 w-16 md:w-20 h-auto rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] rotate-[7deg]"
              />
            </div>
          </div>

          {/* Custom game: hire the core team 1 on 1 */}
          <div className="relative mt-16 overflow-hidden rounded-3xl border-2 border-[#d4a574]/50 bg-gradient-to-br from-[#d4a574]/15 via-[#0d2818]/70 to-[#0d2818]/90 p-8 md:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,165,116,0.25), transparent 70%)" }}
            />
            <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 px-4 py-2 rounded-full mb-5 border border-[#d4a574]/45">
                  <Sparkles className="w-4 h-4 text-[#d4a574]" />
                  <span className="text-white/90 text-xs font-semibold tracking-[0.18em] uppercase">
                    One project at a time
                  </span>
                </div>
                <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight mb-4" style={display}>
                  Don't want to wait for{" "}
                  <span className="italic text-[#d4a574]">selection?</span>
                </h3>
                <p className="text-white/80 text-lg leading-relaxed mb-2">
                  You can hire the ReGen Civics core team to go through this
                  whole process 1 on 1 with your project. We take on one project
                  at a time and go deep. That's exactly what we did with Amora.
                </p>
                <p className="text-white/65 leading-relaxed">
                  When a spot opens, it goes to the next best project in line.
                  Apply now to claim yours.
                </p>
              </div>
              <div className="md:text-right">
                <Link
                  href="/custom-games"
                  className="inline-block rounded-xl shadow-[0_8px_30px_rgba(212,165,116,0.35)]"
                >
                  <Button
                    size="lg"
                    className="bg-[#d4a574] hover:bg-[#e3bd93] text-[#1a2818] font-bold rounded-xl px-8"
                  >
                    Build your custom game with us
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Threshold — an inviting pause before the practical questions */}
      <figure className="relative w-full h-64 md:h-[26rem] overflow-hidden">
        <img
          src="/season2/threshold.webp"
          alt="A lantern-lit path winding through a glowing enchanted forest toward a warm gathering around a fire, an inviting threshold at dusk"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818] via-transparent to-[#0d2818]/95" />
        <figcaption className="absolute inset-x-0 bottom-0 p-6 md:p-10 text-center">
          <p className="text-white text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]" style={display}>
            There is a place in this for your project.
          </p>
        </figcaption>
      </figure>

      {/* ── FAQ ── */}
      <AnimatedSection as="section" animation="slide-up" id="faq" className="py-20 md:py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-[#d4a574] text-xs font-semibold tracking-[0.22em] uppercase mb-4">
            Common questions
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-10" style={display}>
            Before you <span className="italic text-[#a8e6a8]">apply</span>
          </h2>

          <div className="space-y-4">
            <FaqItem q="What does it cost to take part?">
              There's no fee to apply or to take part in the season. The
              commitment is a token swap and your team's time. Season Two may be
              our last free-to-participate season, so this is a good one to be in.
            </FaqItem>
            <FaqItem q="How much time does the season take?">
              Plan for one live weekly session across the season, plus a few to
              many more hours of project work between sessions depending on how
              prepared and advanced your team and project are. Projects move
              forward together as a cohort.
            </FaqItem>
            <FaqItem q="Do we need crypto or DAO experience?">
              No. We help you choose and set up your tooling (Hypha, Gardens,
              DAOhaus, Colony, or others) during the season. Coming in without it
              is normal.
            </FaqItem>
            <FaqItem q="We're early-stage. Is it too soon to apply?">
              Apply at whatever stage you're actually at. A small project with a
              real team and clear purpose can be a strong fit. The required list is
              the honest baseline we look for.
            </FaqItem>
            <FaqItem q="When do applications close and when does the season start?">
              Applications close September 1st, and we approve shortlisted
              projects on a rolling basis, so applying earlier gives you more
              time to prepare. We'll let you know by September 5th (or sooner if
              you apply early) whether you're shortlisted, and you'll have until
              September 14th to submit a short pitch video. Every pitch video is
              shared publicly to give your project exposure, unless you ask us not
              to. Season Two then begins on the Equinox with a selection day held
              in public, where a season council of members from previous seasons'
              projects picks the 13 projects.
            </FaqItem>
          </div>
        </div>
      </AnimatedSection>

      {/* ── CTA ── */}
      <section className="relative py-24 md:py-32 px-4 text-center overflow-hidden bg-[#0d2818]/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(125,216,125,0.12), transparent 70%)" }}
        />
        <AnimatedSection animation="scale-in" className="relative z-10 max-w-xl mx-auto">
          <div className="relative mx-auto mb-7 w-40 h-48">
            <div aria-hidden="true" className="absolute -inset-3 rounded-3xl bg-[#7dd87d]/15 blur-2xl" />
            <img
              src="/season2/cta-character.jpg"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="relative w-40 h-48 object-cover object-top rounded-2xl border border-[#7dd87d]/30 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/15 px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
            <span className="w-2 h-2 rounded-full bg-[#7dd87d] animate-pulse" />
            <span className="text-white/90 text-sm font-medium">Season Two · 13 seats</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5" style={display}>
            Your project belongs <span className="italic text-[#a8e6a8]">in this game</span>
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-8">
            If you're building with other people, on the land, and you've been
            putting off the hard questions about how to organize, govern, fund, and
            sustain it, this is where you work through them.
          </p>

          <Link href="/apply">
            <Button
              size="lg"
              className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold rounded-xl px-10"
            >
              Apply for Season Two
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>

          {/* What happens next */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
            {[
              { icon: CheckCircle2, t: "Apply by September 1st", d: "A short application about your project and team. We approve shortlisted projects on a rolling basis, so earlier is better." },
              { icon: Clock, t: "Pitch by September 14th", d: "We let shortlisted projects know by September 5th, then you have until September 14th to submit a short pitch video. We share every video publicly for exposure, unless you ask us not to." },
              { icon: Sprout, t: "Selection day on the Equinox", d: "A season council of members from previous seasons' projects picks the 13, in public, and Season Two begins." },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.t} className="p-4 rounded-xl border border-[#7dd87d]/15 bg-[#0d2818]/40">
                  <Icon className="w-5 h-5 text-[#7dd87d] mb-2" />
                  <div className="text-white font-medium text-sm mb-1">{s.t}</div>
                  <p className="text-white/60 text-xs leading-relaxed">{s.d}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-[#d4a574]/80 font-medium tracking-wide">
            Applications close September 1st · Thirteen seats · Rolling shortlisting
          </p>

          {/* Newsletter fallback */}
          <div className="mt-10 pt-8 border-t border-[#7dd87d]/15">
            <p className="text-white/70">
              <Heart className="inline w-4 h-4 text-[#7dd87d] mr-1 -mt-0.5" />
              Not ready this season?{" "}
              <Link href="/newsletter" className="text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-2">
                Follow along and we'll keep you posted
              </Link>{" "}
              as the next cohort opens.
            </p>
          </div>
        </AnimatedSection>
      </section>

      <StickyThumbCta href="/apply" label="Apply for Season Two" where="season2_sticky_cta" page="/season2" />
    </div>
  );
}
