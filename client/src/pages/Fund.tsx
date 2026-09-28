/**
 * /fund: the cooperative overview.
 *
 * Until 2026-09-27 this page pitched a venture fund ("Fund the Renaissance"):
 * a model treasury dashboard, market-size figures, "land-backed security",
 * financial returns, a pitch deck and an investor journey. Rye's ruling that
 * day: keep the page and "rewrite the mechanics of that page to speak about the
 * co-op, a cooperative regenerative society". The old page is in git tag
 * archive/fund-pages-2026-09-27.
 *
 * Every sentence that describes the cooperative comes from COOP in
 * shared/fund.ts, verbatim. The few sentences written here (audience cards,
 * FAQ answers, the capital intro) stay in the conditional tense, because the
 * cooperative is not yet a legal entity (COOP.hasLegalEntity) and no surface
 * may speak of its members, land or votes in the present tense until it is.
 * No numbers on this page: no counts, no amounts, no percentages.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  HeartHandshake,
  KeyRound,
  Landmark,
  Layers,
  Leaf,
  PenLine,
  Sprout,
  Trees,
  Users,
  Vote,
  Wrench,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { COOP } from "@shared/fund";
import { CAPITAL_TYPES, type CapitalType } from "@shared/capitals";
import { CAPITAL_COLORS, CAPITAL_LABELS } from "@shared/crowdpoolingTaxonomy";
import { HeroPageLoader } from "@/components/HeroPageLoader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import { MobileTableOfContents, type TocSection } from "@/components/MobileTableOfContents";
import TakePartJourney from "@/components/InvestorJourney";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { PageWrapper } from "@/components/PageWrapper";
import { cdnImg } from "@/lib/utils";
import { StickyThumbCta } from "@/components/StickyThumbCta";

const COOP_SECTIONS: TocSection[] = [
  { id: "coop-principles", title: "Design principles" },
  { id: "coop-capital", title: "Nine forms of capital" },
  { id: "coop-who", title: "Who it's for" },
  { id: "coop-take-part", title: "How to take part" },
  { id: "coop-where", title: "Where it stands" },
  { id: "coop-cta", title: "Tell us you're interested" },
];

/**
 * One icon per design principle, keyed by title so a reorder in COOP never
 * mismatches them. A retitled or new principle falls back to the leaf.
 */
const PRINCIPLE_ICONS: Record<string, React.ElementType> = {
  "Owned by its members": Users,
  "Every form of capital counts": Layers,
  "Membership stays with the member": KeyRound,
  "No managing partners": Vote,
  "Land held for the long term": Trees,
  "Built for use": Wrench,
};

/**
 * Blurbs come from the shared capital taxonomy. Its financial line is written
 * for crowdpooling (crypto, recommended funders), which is the wrong context
 * for a cooperative that accepts no money, so this page says less.
 */
function capitalBlurb(capital: CapitalType): string {
  if (capital === "financial") return "Money, the most familiar of the nine.";
  return CAPITAL_LABELS[capital].blurb;
}

/** "a, b and c": the nine capitals as one plain-language list. */
function listCapitals(): string {
  const names = CAPITAL_TYPES.map((c) => CAPITAL_LABELS[c].label.toLowerCase());
  const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return list.charAt(0).toUpperCase() + list.slice(1);
}

const AUDIENCES: {
  title: string;
  body: string;
  cta: string;
  href: string;
  icon: React.ElementType;
}[] = [
  {
    title: "Land projects",
    body: "Projects would buy and steward land together, for use, and govern the cooperative as members.",
    cta: "The land project path",
    href: "/land",
    icon: Sprout,
  },
  {
    title: "People",
    body: "Anyone who wants to live on, work on or care for shared land would join alongside the projects.",
    cta: "Tell us you're interested",
    href: "/loi",
    icon: Users,
  },
  {
    title: "Allies",
    body: "Organizations that support land projects with tools, skills and services can help design how allies take part.",
    cta: "The ally path",
    href: "/ally",
    icon: HeartHandshake,
  },
  {
    title: "Funders and foundations",
    body: "If you support regenerative land work, talk with us about the design as it takes shape.",
    cta: "Talk with us",
    href: "/investor/contact",
    icon: Landmark,
  },
];

const HEADING_STYLE = { fontFamily: "var(--font-display)" } as const;
const BODY_STYLE = { fontFamily: "var(--font-body)" } as const;
const ACCENT_STYLE = { fontFamily: "var(--font-accent)" } as const;

const PRIMARY_CTA_CLASS =
  "bg-amber-400 text-[#1a472a] hover:bg-amber-300 font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto min-h-[48px] shadow-[0_0_20px_rgba(251,191,36,0.5),0_0_40px_rgba(251,191,36,0.25)] hover:shadow-[0_0_30px_rgba(251,191,36,0.7),0_0_60px_rgba(251,191,36,0.35)] transition-shadow";
// Default variant with explicit colors: the outline variant carries
// dark:border-input, and the public site renders in dark mode, so it would
// override the amber border.
const SECONDARY_CTA_CLASS =
  "border-2 border-amber-400/70 bg-transparent text-amber-300 hover:bg-amber-400/10 hover:text-amber-200 font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto min-h-[48px]";

export default function Fund() {
  const heroImages = [
    cdnImg("https://assets.regencivics.earth/OfqiIKxSsWfMhFwN.webp", 1920),
    cdnImg("https://assets.regencivics.earth/AxJkbpktjcGvTnJs.webp", 900),
  ];

  return (
    <HeroPageLoader images={heroImages}>
    <PageWrapper>
    <PageBackground
      backgroundImage={cdnImg("https://assets.regencivics.earth/OfqiIKxSsWfMhFwN.webp", 1920)}
      mobileBackgroundImage={cdnImg("https://assets.regencivics.earth/AxJkbpktjcGvTnJs.webp", 900)}
      blurPlaceholder={cdnImg("https://assets.regencivics.earth/mCYNtInTzAALMYmI.webp")}
      mobileBlurPlaceholder={cdnImg("https://assets.regencivics.earth/CPfORGmZXXuBnUvg.webp")}
      overlayOpacity={0.65}
      theme="ocean"
      blendColor="12, 42, 48"
      overlayColor="12, 42, 48"
      scrollWithPage={true}
      sectionOverlays={[
        { id: "hero", opacity: 0.35 },         // Hero: let image detail show through
        { id: "principles", opacity: 0.55 },   // Design principles
        { id: "capital", opacity: 0.55 },      // Nine forms of capital
        { id: "who", opacity: 0.55 },          // Who it's for
        { id: "take-part", opacity: 0.55 },    // How to take part
        { id: "where", opacity: 0.6 },         // Where it stands: dense text, needs readability
        { id: "cta", opacity: 0.55 },          // Closing call to action
      ]}
    >
      <SEO {...pageSEO.fund} breadcrumbs={[{ name: "Home", url: "/" }, { name: "The Cooperative", url: "/fund" }]} />
      <JsonLD data={schemas.faqPage([
        { question: `What is the ${COOP.name}?`, answer: COOP.statement },
        {
          question: "Who is the cooperative for?",
          answer:
            "It is being designed for land projects and the people who work with them. They would own it together and govern it one member, one vote.",
        },
        {
          question: "How would the cooperative be governed?",
          answer: `One member, one vote. Members would elect a small board that rotates, and the network would hire the people who run the day-to-day work. ${COOP.designPrinciplesNote}`,
        },
        {
          question: "What are the nine forms of capital?",
          answer: `${listCapitals()}. The cooperative is being designed to recognize contributions in all nine.`,
        },
        { question: "Does the cooperative accept money?", answer: `No. ${COOP.notAnOffer}` },
        { question: "How can I take part?", answer: `Fill in the short interest form on this site. ${COOP.interestPromise}` },
        { question: "Is the cooperative part of the church?", answer: COOP.entities },
      ])} />

      <MobileTableOfContents
        sections={COOP_SECTIONS}
        fallbackTitle="Cooperative"
        actions={[
          { label: "Tell us you're interested", href: "/loi", icon: PenLine },
          { label: "Book a call", href: "https://calendly.com/rieki-cordon/30min", icon: Calendar, external: true },
        ]}
      />

      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection animation="fade-in">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass-panel-light text-amber-400 text-base"
              style={ACCENT_STYLE}
            >
              <Sprout className="w-5 h-5" aria-hidden="true" />
              <span>{COOP.statusLabel}</span>
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={200}>
            <p
              className="text-amber-300 text-sm md:text-base uppercase tracking-[0.2em] mb-3 text-shadow-subtle"
              style={ACCENT_STYLE}
            >
              {COOP.name}
            </p>
            <h1
              className="ink-reveal text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight text-shadow-strong"
              style={HEADING_STYLE}
            >
              {COOP.tagline}
            </h1>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={400}>
            <p
              className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed max-w-3xl mx-auto text-shadow-subtle safe-prose"
              style={BODY_STYLE}
            >
              {COOP.statement}
            </p>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className={PRIMARY_CTA_CLASS} style={ACCENT_STYLE}>
                <Link href="/loi">
                  <PenLine className="w-5 h-5 mr-2" aria-hidden="true" />
                  Tell us you're interested
                </Link>
              </Button>
              <Button asChild className={SECONDARY_CTA_CLASS} style={ACCENT_STYLE}>
                <Link href="/opportunity">
                  <BookOpen className="w-5 h-5 mr-2" aria-hidden="true" />
                  Read the full design
                </Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Design principles */}
      <section id="coop-principles" className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="story-grow text-3xl md:text-5xl font-bold text-white mb-4 text-center text-shadow-strong"
              style={HEADING_STYLE}
            >
              Design <span className="text-amber-400">principles</span>
            </h2>
            <p
              className="text-white/75 text-center mb-10 max-w-2xl mx-auto text-base md:text-lg text-shadow-subtle safe-prose"
              style={BODY_STYLE}
            >
              {COOP.designPrinciplesNote}
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {COOP.designPrinciples.map((principle, i) => {
              const Icon = PRINCIPLE_ICONS[principle.title] ?? Leaf;
              return (
                <AnimatedSection key={principle.title} animation="slide-up" delay={i * 80}>
                  <div className="glass-panel p-5 md:p-6 h-full border-amber-400/20">
                    <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-amber-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-amber-400 mb-2" style={HEADING_STYLE}>
                      {principle.title}
                    </h3>
                    <p className="text-white/75 text-base leading-relaxed safe-prose" style={BODY_STYLE}>
                      {principle.body}
                    </p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Nine forms of capital */}
      <section id="coop-capital" className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="story-grow text-3xl md:text-5xl font-bold text-white mb-4 text-center text-shadow-strong"
              style={HEADING_STYLE}
            >
              Nine forms of <span className="text-amber-400">capital</span>
            </h2>
            <p
              className="text-white/75 text-center mb-10 max-w-2xl mx-auto text-base md:text-lg text-shadow-subtle safe-prose"
              style={BODY_STYLE}
            >
              The cooperative is being designed to recognize contributions in all nine forms of capital.
              Money is one of them.{" "}
              <Link
                href="/learn/nine-forms-of-capital"
                className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
              >
                Read about the nine forms
              </Link>
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CAPITAL_TYPES.map((capital, i) => (
              <AnimatedSection key={capital} animation="slide-up" delay={i * 50}>
                <div className="glass-panel p-4 h-full flex items-start gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-2"
                    style={{ backgroundColor: CAPITAL_COLORS[capital] }}
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white" style={HEADING_STYLE}>
                      {CAPITAL_LABELS[capital].label}
                    </h3>
                    <p className="text-white/70 text-sm leading-relaxed safe-prose">{capitalBlurb(capital)}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="coop-who" className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="story-grow text-3xl md:text-5xl font-bold text-white mb-10 text-center text-shadow-strong"
              style={HEADING_STYLE}
            >
              Who it's <span className="text-amber-400">for</span>
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUDIENCES.map((audience, i) => {
              const Icon = audience.icon;
              return (
                <AnimatedSection key={audience.title} animation="slide-up" delay={i * 80}>
                  <div className="glass-panel p-5 md:p-6 h-full flex flex-col border-amber-400/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-amber-400" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-white" style={HEADING_STYLE}>
                        {audience.title}
                      </h3>
                    </div>
                    <p className="text-white/75 text-base leading-relaxed mb-4 flex-1 safe-prose" style={BODY_STYLE}>
                      {audience.body}
                    </p>
                    <Link
                      href={audience.href}
                      className="inline-flex items-center gap-2 self-start min-h-[44px] text-amber-300 hover:text-amber-200 font-semibold underline-offset-2 hover:underline"
                    >
                      {audience.cta}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to take part */}
      <div id="coop-take-part">
        <TakePartJourney />
      </div>

      {/* Where it stands, and who does what */}
      <section id="coop-where" className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatedSection animation="slide-up">
            <div className="glass-panel p-6 md:p-8 h-full border-amber-400/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={HEADING_STYLE}>
                Where it <span className="text-amber-400">stands</span>
              </h2>
              <p className="text-white/80 text-base md:text-lg leading-relaxed safe-prose" style={BODY_STYLE}>
                {COOP.whereItStands}
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection animation="slide-up" delay={100}>
            <div className="glass-panel p-6 md:p-8 h-full border-amber-400/20">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4" style={HEADING_STYLE}>
                Who does <span className="text-amber-400">what</span>
              </h2>
              <p className="text-white/80 text-base md:text-lg leading-relaxed safe-prose" style={BODY_STYLE}>
                {COOP.entities}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Closing call to action */}
      <section id="coop-cta" className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection animation="scale-in">
            <div className="glass-panel p-8 md:p-12 border-amber-400/20">
              <SeedOfLifeIcon className="w-12 h-12 text-amber-400/40 mx-auto mb-6" />
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4" style={HEADING_STYLE}>
                Help shape the <span className="text-amber-400">cooperative</span>
              </h2>
              <p className="text-white/75 text-base md:text-lg mb-8 max-w-xl mx-auto safe-prose" style={BODY_STYLE}>
                {COOP.interestPromise}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className={PRIMARY_CTA_CLASS} style={ACCENT_STYLE}>
                  <Link href="/loi">
                    Tell us you're interested
                    <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild className={SECONDARY_CTA_CLASS} style={ACCENT_STYLE}>
                  <Link href="/opportunity">Read the full design</Link>
                </Button>
              </div>
              <p className="text-white/60 text-xs md:text-sm leading-relaxed mt-8 max-w-xl mx-auto safe-prose">
                {COOP.notAnOffer}
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.fund.pages} blog={relatedContentMap.fund.blog} />
      <StickyThumbCta
        href="/loi"
        label="Tell us you're interested"
        where="fund_sticky_cta"
        page="/fund"
        tone="amber"
      />
    </PageBackground>
    </PageWrapper>
    </HeroPageLoader>
  );
}
