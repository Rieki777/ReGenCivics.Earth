/**
 * /opportunity: the long-form page about the ReGen Network Cooperative.
 *
 * Until 2026-09-27 this page was the fund's investment memorandum: a modelled
 * IRR, carry, waterfalls, exchange listings, an allocation calculator and a
 * $250,000 minimum. Rye's ruling that day (FUNDING_ENGINE_PLAN v1.2) turned the
 * fund into a member-owned purchasing cooperative in design, and asked for this
 * page to "speak about the co-op, a cooperative regenerative society". The
 * memorandum is saved in git tag archive/fund-pages-2026-09-27.
 *
 * Every fact about the cooperative comes from COOP in shared/fund.ts, and
 * scripts/check-fund-claims.mjs fails the build if this file stops importing it
 * or brings back return, listing or offer language. A purchasing cooperative
 * keeps its "bought for use" footing only while nothing in the funnel promises
 * upside, so this page says what the cooperative is being designed to do and
 * never what anyone gets back. The few sentences written here that COOP does
 * not carry are on the counsel review list.
 */

import { useState, useRef, useCallback, useId, type ReactNode, type FormEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  CircleDot,
  CircleHelp,
  Handshake,
  History,
  KeyRound,
  Landmark,
  Layers,
  Leaf,
  Mail,
  Network,
  PencilRuler,
  RefreshCw,
  Signpost,
  Sprout,
  TreePine,
  Users,
  Vote,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { COOP, COOP_LINEAGE_HEADING } from "@shared/fund";
import { CAPITAL_TYPES, type CapitalType } from "@shared/capitals";
import { CAPITAL_COLORS } from "@shared/crowdpoolingTaxonomy";
import { trpc } from "@/lib/trpc";
import { useThrottledScroll } from "@/hooks/useThrottledScroll";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { ReadingProgress } from "@/components/ReadingProgress";
import { TableOfContents } from "@/components/TableOfContents";
import { MobileTableOfContents, type TocAction, type TocSection } from "@/components/MobileTableOfContents";

// =============================================
// PAGE DATA
// =============================================

const CALL_URL = "https://calendly.com/rieki-cordon/30min";

// Module-level so SEO's effect (which depends on the array) runs once. The
// crumb reads the page title from pageSEO, so the two can't disagree.
const BREADCRUMBS = [
  { name: "Home", url: "/" },
  { name: pageSEO.opportunity.title, url: "/opportunity" },
];

/**
 * The page's sections in order. Both tables of contents read this one list,
 * so an entry can never point at a section that is not on the page. The old
 * hardcoded lists had drifted: six of the desktop list's seventeen ids, and
 * four of the mobile list's, matched nothing on the page.
 */
const SECTIONS: TocSection[] = [
  { id: "why-a-cooperative", title: "Why a cooperative" },
  { id: "design", title: "How it's being designed" },
  { id: "capital", title: "The nine forms of capital" },
  { id: "who-its-for", title: "Who it's for" },
  { id: "regen-civics", title: "How it fits with ReGen Civics" },
  { id: "where-it-stands", title: "Where it stands" },
  { id: "lineage", title: COOP_LINEAGE_HEADING },
  { id: "faq", title: "Questions" },
  { id: "interested", title: "Help design the cooperative" },
];

const MOBILE_ACTIONS: TocAction[] = [{ label: "Tell us you're interested", href: "/loi", icon: Sprout }];

/**
 * Anchor offset for every section. index.css gives every [id] a 112px
 * scroll-margin-top from an unlayered rule, and an unlayered rule outranks any
 * plain Tailwind utility. On phones the fixed page header plus the mobile table
 * of contents reach about 168px, so a section opened from the contents (or from
 * the hero's #design link) landed with its heading hidden under them. The
 * important modifier is the one utility that outranks the unlayered rule.
 */
const SECTION_CLASS = "mb-12 md:mb-16 scroll-mt-48! md:scroll-mt-32!";

/**
 * One icon per design principle, keyed by title. If COOP renames or adds a
 * principle, it renders with the fallback icon until someone picks one here.
 */
const PRINCIPLE_ICONS: Record<string, LucideIcon> = {
  "Owned by its members": Vote,
  "Every form of capital counts": Layers,
  "Membership stays with the member": KeyRound,
  "No managing partners": RefreshCw,
  "Land held for the long term": TreePine,
  "Built for use": Wrench,
};

/**
 * One plain line per capital. A Record over CapitalType, so adding a tenth
 * capital to shared/capitals.ts fails the typecheck until it has a line here.
 * Written for this page on purpose: the crowdpooling blurbs in
 * shared/crowdpoolingTaxonomy.ts describe money in campaign terms.
 */
const CAPITAL_LINES: Record<CapitalType, string> = {
  intellectual: "Knowledge, designs and systems that make the work smarter.",
  social: "Relationships, trust and the connections that hold a community together.",
  material: "Tools, equipment, buildings and supplies.",
  financial: "Money and grants that pay for the work.",
  living: "Soil, water, plants, animals and the land itself.",
  cultural: "Stories, art, music and the traditions that carry meaning.",
  spiritual: "Purpose, ceremony and the practices that keep people rooted.",
  experiential: "Skills and hands-on wisdom earned by doing the work.",
  health: "Movement, rest, care and the wellbeing of bodies and minds.",
};

const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

type Audience = {
  title: string;
  body: string;
  icon: LucideIcon;
  link?: { href: string; label: string };
};

const AUDIENCES: Audience[] = [
  {
    title: "Land projects",
    icon: Sprout,
    body:
      "Each land project would join as a member through its own local entity, and " +
      "share tools, services and knowledge with the rest of the network.",
  },
  {
    title: "People",
    icon: Users,
    body:
      "People would join to use and care for shared land, tools and services, " +
      "and to have a say in how they are run.",
  },
  {
    title: "Allies and organizations",
    icon: Handshake,
    body:
      "Builders, growers, educators, toolmakers and other organizations that serve " +
      "land projects can help shape the design. Tell us what you bring.",
  },
  {
    title: "Funders and foundations",
    icon: Landmark,
    body:
      "Funders and foundations who want to support land projects directly can talk " +
      "with us. The cooperative accepts no money today.",
    link: { href: "/investor/contact", label: "Get in touch" },
  },
];

/** The path from here. No dates on purpose: none are set. */
const PATH: { label: string; text: string; current?: boolean }[] = [
  { label: "Now", text: "Designing with land projects and counsel.", current: true },
  { label: "Next", text: "The founding members adopt the bylaws." },
  { label: "Then", text: "The cooperative forms." },
];

/** The lineage that is real. No years and no counts, on purpose. */
const LINEAGE: { label: string; text: string }[] = [
  {
    label: "SEEDS",
    text:
      "SEEDS began as a whitepaper on regenerative economics and grew into a live " +
      "digital economy and governance system.",
  },
  {
    label: "Hypha",
    text:
      "Hypha followed: the DAO and governance tools the ecosystem runs on. ReGen " +
      "Civics uses Hypha for its formal decisions today.",
  },
  {
    label: "ReGen Civics seasons",
    text:
      "ReGen Civics runs its game in seasons. Each season a new cohort of land " +
      "projects goes through the incubator, designs its game and gathers the " +
      "support it needs.",
  },
];

// =============================================
// REUSABLE COMPONENTS
// =============================================

/**
 * Status bar under the page header. Full width at the top of the page on
 * tablet and desktop, then a small pill once the reader scrolls. Hidden on
 * phones: there the mobile table of contents carries the same link in its own
 * row, and the full bar used to sit on top of it for the first 200px.
 */
function CoopStatusBanner() {
  const [minimized, setMinimized] = useState(false);

  const handleScroll = useCallback(() => {
    setMinimized(window.scrollY > 200);
  }, []);

  useThrottledScroll(handleScroll);

  if (minimized) {
    return (
      <div className="hidden md:block fixed top-[73px] right-4 z-40">
        <Link
          href="/loi"
          className="bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] transition-all flex items-center gap-2"
          style={{ fontFamily: "var(--font-accent)" }}
        >
          <Sprout className="w-4 h-4" aria-hidden="true" />
          Tell us you're interested
        </Link>
      </div>
    );
  }

  return (
    <div className="hidden md:block fixed top-[73px] left-0 right-0 z-40 bg-gradient-to-r from-[#d4a574] via-[#ffd700] to-[#d4a574] border-b-2 border-[#ffd700]/50 shadow-[0_4px_15px_rgba(255,215,0,0.3)]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-[#1a472a]">
          <p className="flex items-center gap-2 font-bold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a472a] flex-shrink-0" aria-hidden="true" />
            {COOP.name}: {COOP.statusLabel}
          </p>
          <span className="text-[#1a472a]" aria-hidden="true">|</span>
          <Link
            href="/loi"
            className="inline-flex items-center bg-[#1a472a] hover:bg-[#0d2818] text-white text-sm px-3 py-1 rounded-md font-medium transition-colors"
          >
            Tell us you're interested
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Icon className="w-6 h-6 text-[#7dd87d] flex-shrink-0" aria-hidden="true" />
      <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
        {children}
      </h2>
    </div>
  );
}

/** A section opening with a full-width illustration and its heading laid over the bottom edge. */
function ImageHeader({
  src,
  alt,
  title,
  width,
  height,
}: {
  src: string;
  alt: string;
  title: string;
  width: number;
  height: number;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-6">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-2xl border border-[#7dd87d]/20 object-contain"
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d2818]/85 via-transparent to-transparent rounded-2xl" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

// Inline FAQ item. The closed answer is inert, so a link inside it is out of
// the tab order until the question is opened.
function FAQItem({ question, children }: { question: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full min-h-[44px] py-4 flex items-start justify-between text-left hover:text-[#7dd87d] transition-colors gap-3"
      >
        <span className="font-semibold text-white text-[15px] md:text-base leading-relaxed">{question}</span>
        <span className={`transform transition-transform duration-300 flex-shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}>
          <ChevronDown className="w-4 h-4 text-[#7dd87d]" aria-hidden="true" />
        </span>
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`transition-all duration-400 ease-in-out overflow-hidden ${isOpen ? "max-h-[2000px] opacity-100 pb-4" : "max-h-0 opacity-0"}`}
      >
        <div className="text-white/75 text-sm md:text-[15px] leading-relaxed space-y-3 safe-prose min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

// Glowing divider
function GlowDivider() {
  return (
    <div className="my-10 md:my-14 flex items-center justify-center" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
      <div className="mx-4 w-2 h-2 rounded-full bg-[#7dd87d]/50 shadow-[0_0_8px_rgba(125,216,125,0.5)]" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#7dd87d]/30 to-transparent" />
    </div>
  );
}

// Magnetic call-to-action button. Holds still for readers who ask for less motion.
function MagneticCTAButton() {
  const btnRef = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();

  const handleMouseMove = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (reducedMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.15;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.15;
    btnRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handleMouseLeave = () => {
    if (!btnRef.current) return;
    btnRef.current.style.transform = "translate(0, 0)";
  };

  return (
    <Link
      ref={btnRef}
      href="/loi"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
      className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-6 py-3 rounded-xl text-base hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]"
    >
      <Sprout className="w-5 h-5" aria-hidden="true" />
      Tell us you're interested
    </Link>
  );
}

/**
 * Email signup. Subscribes to the ReGen Civics newsletter, which is double
 * opt-in: the server sends a confirmation email and the address stays pending
 * until it is clicked, so success here means "check your inbox".
 */
function CoopUpdates() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribeMutation = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => setDone(true),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    subscribeMutation.mutate({ email, name: name || undefined, source: "other" });
  };

  return (
    <AnimatedSection animation="slide-up">
      <div className="mb-10 rounded-2xl border border-[#7dd87d]/20 bg-white/[0.03] p-6 md:p-8 hover:border-[#7dd87d]/40 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
          <h3 className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
            Cooperative updates
          </h3>
        </div>
        <p className="text-white/70 text-sm mb-4">
          We share news about the cooperative's design in the ReGen Civics newsletter.
        </p>
        {done ? (
          <p className="text-[#7dd87d] text-sm font-semibold" role="status">
            Check your email to confirm your subscription.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              aria-label="Your name (optional)"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-h-[44px] bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-base sm:text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address for cooperative updates"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 min-h-[44px] bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/60 text-base sm:text-sm focus:outline-none focus:border-[#7dd87d]/50"
            />
            <button
              type="submit"
              disabled={subscribeMutation.isPending}
              className="min-h-[44px] bg-[#7dd87d] text-[#1a472a] font-bold px-5 py-2 rounded-lg text-sm hover:bg-[#9de89d] transition-colors whitespace-nowrap disabled:opacity-70"
            >
              {subscribeMutation.isPending ? "Sending..." : "Get updates"}
            </button>
          </form>
        )}
        {subscribeMutation.isError && !done && (
          <p className="text-red-300 text-sm mt-2" role="alert">
            That didn't go through. Please try again in a moment.
          </p>
        )}
      </div>
    </AnimatedSection>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function Opportunity() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d2818] via-[#1a472a] to-[#0d2818]">
      <SEO {...pageSEO.opportunity} breadcrumbs={BREADCRUMBS} />
      {isDesktop ? (
        <TableOfContents sections={SECTIONS} />
      ) : (
        <MobileTableOfContents sections={SECTIONS} actions={MOBILE_ACTIONS} />
      )}

      {/* Fixed header. 44px targets on phones; the tighter padding there keeps
          the bar the same 56px height the mobile contents are pinned under. */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-md border-b border-[#ffd700]/30">
        <div className="container mx-auto px-4 py-1.5 md:py-3 flex items-center justify-between">
          <Link
            href="/"
            aria-label="Home"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 text-white hover:text-[#ffd700] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium hidden sm:inline">Home</span>
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
          >
            <a href={CALL_URL} target="_blank" rel="noopener noreferrer" aria-label="Book a call">
              <Calendar className="w-4 h-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Book a call</span>
            </a>
          </Button>
        </div>
      </header>

      <CoopStatusBanner />

      {/* Main Content */}
      <section className="pt-28 md:pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* On large screens, shift content left to make room for TOC sidebar (w-72 + 2rem gap = ~320px) */}
          <div className="max-w-4xl mx-auto lg:mr-80 xl:mr-80 min-w-0">

            {/* ===== HERO ===== */}
            <AnimatedSection animation="slide-up">
              <div className="hero-grain relative text-center mb-12 rounded-2xl py-6">
                <div className="relative z-10 flex flex-col items-center">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border border-[#7dd87d]/40 bg-[#7dd87d]/10 text-[#7dd87d] text-xs font-bold uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 rounded-full bg-[#7dd87d]" aria-hidden="true" />
                    {COOP.statusLabel}
                  </span>
                  <p className="text-xs md:text-sm uppercase tracking-[0.2em] text-[#d4a574] mb-3">{COOP.name}</p>
                  <h1
                    className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {COOP.tagline}
                  </h1>
                  <p className="text-base md:text-xl text-white/85 max-w-3xl mx-auto leading-relaxed safe-prose">
                    {COOP.statement}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7 w-full sm:w-auto">
                    <Link
                      href="/loi"
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-gradient-to-r from-[#d4a574] to-[#ffd700] text-[#1a472a] font-bold px-6 py-3 rounded-xl text-base hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-shadow"
                    >
                      <Sprout className="w-5 h-5" aria-hidden="true" />
                      Tell us you're interested
                    </Link>
                    <a
                      href="#design"
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 font-semibold px-6 py-3 rounded-xl text-base transition-colors"
                    >
                      See the design principles
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* ===== WHY A COOPERATIVE ===== */}
            <section id="why-a-cooperative" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-alliance-ecosystem.webp"
                  alt="Illustration of land projects, homes and gardens linked by glowing roots into one living network"
                  title="Why a cooperative"
                  width={1920}
                  height={1072}
                />
                <div className="space-y-4 text-white/80 text-[15px] md:text-base leading-relaxed safe-prose">
                  <p>
                    Most land projects stand alone today. Each one finds its own land, gathers its own people,
                    builds its own tools and learns hard lessons by itself.
                  </p>
                  <p>
                    A land project runs on people, skills, tools, seed, water and time. Money is one of nine forms
                    of capital it needs.
                  </p>
                  <p>
                    A network lets land projects and people carry more together. The cooperative is being designed
                    so they can share land, tools, services and knowledge, and govern all of it together.
                  </p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== HOW IT'S BEING DESIGNED ===== */}
            <section id="design" className={SECTION_CLASS}>
              {/* Investor emails sent before 2026-09-27 link to /opportunity#terms.
                  The true answer to "terms" today is this section: they are set
                  with counsel and adopted by the founding members. */}
              <span id="terms" className="block scroll-mt-48! md:scroll-mt-32!" aria-hidden="true" />
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={PencilRuler}>How it's being designed</SectionHeading>
                <p className="text-[#d4a574] text-sm md:text-[15px] leading-relaxed mb-6 safe-prose">
                  {COOP.designPrinciplesNote}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {COOP.designPrinciples.map((principle) => {
                    const Icon = PRINCIPLE_ICONS[principle.title] ?? CircleDot;
                    return (
                      <div
                        key={principle.title}
                        className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/40 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-3">
                          <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                        </div>
                        <h3 className="font-bold text-white text-base mb-1" style={{ fontFamily: "var(--font-display)" }}>
                          {principle.title}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed">{principle.body}</p>
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            </section>

            {/* ===== THE NINE FORMS OF CAPITAL ===== */}
            <section id="capital" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Leaf}>The nine forms of capital</SectionHeading>
                <p className="text-white/80 text-[15px] md:text-base leading-relaxed mb-6 safe-prose">
                  ReGen Civics recognizes contributions in nine forms of capital today, and the cooperative is being
                  designed to recognize all nine.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CAPITAL_TYPES.map((capital) => (
                    <div key={capital} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h3 className="font-bold text-white text-sm mb-1 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CAPITAL_COLORS[capital] }}
                          aria-hidden="true"
                        />
                        {titleCase(capital)}
                      </h3>
                      <p className="text-white/70 text-sm leading-relaxed">{CAPITAL_LINES[capital]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-white/60 text-xs md:text-sm mt-4 leading-relaxed safe-prose">
                  The first eight come from Ethan Roland and Gregory Landua's eight forms of capital. Health is the
                  ninth, added by ReGen Civics.{" "}
                  <Link href="/learn/nine-forms-of-capital" className="text-[#7dd87d] hover:underline">
                    Why we added a ninth
                  </Link>
                </p>
              </AnimatedSection>
            </section>

            {/* ===== WHO IT'S FOR ===== */}
            <section id="who-its-for" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <ImageHeader
                  src="/images/opportunity/opp-vision-2040.webp"
                  alt="Illustration of a regenerative village: people tending gardens, homes with green roofs and bridges over a river"
                  title="Who it's for"
                  width={2752}
                  height={1536}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AUDIENCES.map((audience) => {
                    const Icon = audience.icon;
                    return (
                      <div key={audience.title} className="bg-white/5 rounded-xl p-5 border border-[#7dd87d]/20 flex flex-col">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#7dd87d]" aria-hidden="true" />
                          </div>
                          <h3 className="font-bold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>
                            {audience.title}
                          </h3>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed">{audience.body}</p>
                        {audience.link && (
                          <Link
                            href={audience.link.href}
                            className="mt-2 self-start inline-flex items-center gap-1 min-h-[44px] text-[#7dd87d] hover:text-[#ffd700] text-sm font-semibold transition-colors"
                          >
                            {audience.link.label}
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AnimatedSection>
            </section>

            <GlowDivider />

            {/* ===== HOW IT FITS WITH REGEN CIVICS ===== */}
            <section id="regen-civics" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Network}>How it fits with ReGen Civics</SectionHeading>
                <div className="bg-[#0d2818] border-2 border-[#7dd87d]/40 rounded-2xl p-5 md:p-6 space-y-3">
                  <p className="text-white/90 text-[15px] md:text-base leading-relaxed safe-prose">
                    ReGen Civics builds the tools and runs the game land projects use today.
                  </p>
                  <p className="text-white/75 text-sm md:text-[15px] leading-relaxed safe-prose">{COOP.entities}</p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== WHERE IT STANDS ===== */}
            <section id="where-it-stands" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={Signpost}>Where it stands</SectionHeading>
                <p className="text-white/80 text-[15px] md:text-base leading-relaxed mb-6 safe-prose">
                  {COOP.whereItStands}
                </p>
                <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PATH.map((step) => (
                    <li
                      key={step.label}
                      aria-current={step.current ? "step" : undefined}
                      className={`rounded-xl p-5 border ${step.current ? "border-[#ffd700]/40 bg-[#ffd700]/5" : "border-white/10 bg-white/5"}`}
                    >
                      <span className={`text-xs font-bold uppercase tracking-wider ${step.current ? "text-[#ffd700]" : "text-[#7dd87d]"}`}>
                        {step.label}
                      </span>
                      <p className="text-white/80 text-sm mt-2 leading-relaxed">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </AnimatedSection>
            </section>

            {/* ===== WHERE THIS COMES FROM ===== */}
            <section id="lineage" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={History}>{COOP_LINEAGE_HEADING}</SectionHeading>
                <p className="text-white/70 text-sm md:text-[15px] leading-relaxed mb-6 safe-prose">
                  SEEDS, Hypha and the ReGen Civics seasons happened. The cooperative has no record of its own yet,
                  because it is still in design.
                </p>
                <ol className="relative pl-6 border-l border-[#7dd87d]/30 space-y-6">
                  {LINEAGE.map((item) => (
                    <li key={item.label} className="relative">
                      <span
                        className="absolute -left-[34.5px] top-4 w-5 h-5 rounded-full border-2 border-[#7dd87d] bg-[#0d2818] flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#7dd87d]" />
                      </span>
                      <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7dd87d]">{item.label}</h3>
                        <p className="text-white/70 text-sm mt-1 leading-relaxed">{item.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </AnimatedSection>
            </section>

            {/* ===== QUESTIONS ===== */}
            <section id="faq" className={SECTION_CLASS}>
              <AnimatedSection animation="slide-up">
                <SectionHeading icon={CircleHelp}>Questions</SectionHeading>
                <div className="border border-white/10 rounded-2xl bg-white/[0.03] px-5 md:px-6">
                  <FAQItem question="Is this an investment?">
                    <p>
                      The cooperative accepts no money today, and nothing on this site is an offer. It is being
                      designed for use: land projects and people would join to use and care for shared land, tools
                      and services, and a membership could not be sold or traded.
                    </p>
                  </FAQItem>

                  <FAQItem question="Can I become a member now?">
                    <p>
                      Not yet. The cooperative has no members until it forms and its founding members adopt the
                      bylaws. You can{" "}
                      <Link href="/loi" className="text-[#7dd87d] hover:underline">
                        tell us you're interested
                      </Link>{" "}
                      now, and we'll invite you into the design conversations.
                    </p>
                  </FAQItem>

                  <FAQItem question="How will land projects join?">
                    <p>
                      As members, each through its own local entity. The terms of joining will be set with counsel
                      and adopted by the founding members, and land projects are helping design them now.
                    </p>
                  </FAQItem>

                  <FAQItem question="What happens to tokens?">
                    <p>{COOP.tokensNote}</p>
                    <p>$ReGen and RGVoice are the Game's tokens, earned by playing and contributing.</p>
                    <p>{COOP.coopTokens.rcivics}</p>
                    <p>{COOP.coopTokens.rcvoice}</p>
                  </FAQItem>

                  <FAQItem question="Who makes decisions?">
                    <p>
                      Members would govern the cooperative together, one member, one vote. They would elect a small
                      board that rotates, and the network would hire the people who run the day-to-day work. There
                      would be no managing partners.
                    </p>
                    <p>
                      Until the cooperative forms, these are design principles. The founding members will adopt
                      the bylaws together.
                    </p>
                  </FAQItem>
                </div>
              </AnimatedSection>
            </section>

            <GlowDivider />

            {/* ===== HELP DESIGN THE COOPERATIVE ===== */}
            <section id="interested" className={SECTION_CLASS}>
              <AnimatedSection animation="scale-in">
                <div className="text-center bg-gradient-to-br from-[#7dd87d]/10 to-transparent rounded-2xl p-8 md:p-12 border border-[#7dd87d]/30">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
                    Help design the cooperative
                  </h2>
                  <p className="text-white/80 text-sm md:text-base mb-6 max-w-2xl mx-auto safe-prose">
                    {COOP.interestPromise}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                    <MagneticCTAButton />
                    <Button
                      asChild
                      variant="outline"
                      className="h-auto min-h-[44px] border-2 border-[#7dd87d]/50 text-[#7dd87d] hover:bg-[#7dd87d]/10 px-6 py-3 rounded-xl text-base"
                    >
                      <a href={CALL_URL} target="_blank" rel="noopener noreferrer">
                        <Calendar className="w-5 h-5 mr-2" aria-hidden="true" />
                        Book a call
                      </a>
                    </Button>
                  </div>
                  <Link
                    href="/investor/contact"
                    className="inline-flex items-center justify-center gap-1 min-h-[44px] text-sm text-white/70 hover:text-[#7dd87d] transition-colors"
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    Contact the team
                  </Link>
                  <p className="text-xs text-white/60 mt-6 max-w-2xl mx-auto leading-relaxed safe-prose">{COOP.notAnOffer}</p>
                </div>
              </AnimatedSection>
            </section>

            {/* ===== COOPERATIVE UPDATES ===== */}
            <CoopUpdates />

            {/* ===== RELATED CONTENT ===== */}
            <AnimatedSection animation="fade-in">
              <RelatedContent pages={relatedContentMap.opportunity.pages} blog={relatedContentMap.opportunity.blog} />
            </AnimatedSection>

          </div>
        </div>
      </section>

      <ReadingProgress />
    </div>
  );
}
