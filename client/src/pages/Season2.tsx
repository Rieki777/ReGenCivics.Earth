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
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  ChevronDown,
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
    body: "A minimum 100k $RCivics equivalent token swap that makes every project co-invested in every other. ReGen Civics holds a piece of your project. Your project holds a piece of the alliance.",
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
            src="/season2/hero.jpg"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d2818]/75 via-[#0d2818]/55 to-[#0d2818]" />
        </div>

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

          {/* Season One projects map — the thirteen that went through.
              TODO(rye): drop the "Growing the Diversity of Regenerative Realities"
              graphic (the numbered project-logos map) in at this path. */}
          <figure className="mt-12">
            <img
              src="/season2/s1-projects-map.jpg"
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

      <img src="/season2/div-soil.jpg" alt="" aria-hidden="true" loading="lazy" className="block w-full h-16 md:h-20 object-cover opacity-60" />

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

          <div className="relative pl-8 border-l border-[#7dd87d]/25 space-y-10">
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
          </div>
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
            <div className="relative">
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
          </div>
        </div>
      </AnimatedSection>

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
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-12" style={display}>
            The accelerator, <span className="italic text-[#a8e6a8]">and a stake in each other.</span>
          </h2>

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
          <p className="text-white/75 text-lg leading-relaxed mb-10">
            An honest look at what we're looking for in Season Two. You don't need
            to finish all of this before applying. Apply at whatever stage you're
            actually at.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-[#7dd87d] text-xs font-semibold tracking-[0.18em] uppercase mb-4">
                Required
              </h3>
              <ul className="space-y-3">
                {[
                  "Existing land or assets under contract",
                  "Ready to fundraise with a pitch and timeline",
                  "A lot of passion and dedication to your vision",
                  "A team with existing social presence and storytelling capacity",
                  "Core project management team in place",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/70 leading-relaxed">
                    <ArrowRight className="w-4 h-4 text-[#7dd87d] mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[#7dd87d] text-xs font-semibold tracking-[0.18em] uppercase mb-4">
                Strongly encouraged
              </h3>
              <ul className="space-y-3">
                {[
                  "Interoperable technology stack (Hypha DAO tools or equivalent)",
                  "Regenerative business plan with a capital model",
                  "A framework for measuring what regeneration means for your project",
                  "Ability to edify others: courses, resources, documentation",
                  "Cooperative or distributed power and value structures",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/70 leading-relaxed">
                    <ArrowRight className="w-4 h-4 text-[#7dd87d] mt-1 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

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
              <strong className="text-[#7dd87d] font-semibold">Minimum token swap:</strong>{" "}
              100k $RCivics equivalent. ReGen Civics sends $RCivics tokens to your
              project. Your project sends an equivalent value in your own tokens to
              ReGen Civics. Neither is sold on the open market. They represent
              ownership and alignment.
            </p>
            <p>
              <strong className="text-[#7dd87d] font-semibold">What this means in practice:</strong>{" "}
              If $RCivics is valued at €10 and your project's tokens are valued at
              €1, ReGen Civics would send 100k $RCivics and receive 1 million of
              your project's tokens. You hold a piece of the alliance. The alliance
              holds a piece of you.
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
            Token figures are illustrative and describe alignment, not a financial
            return or investment promise. Token values can move and may be illiquid.
            Read the full{" "}
            <Link href="/risk-disclosure" className="text-[#7dd87d] hover:text-[#9de89d] underline underline-offset-2">
              risk disclosure
            </Link>{" "}
            before participating.
          </p>
        </div>
      </AnimatedSection>

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
