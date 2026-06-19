/**
 * Fund the Renaissance - Investor Path
 * Biofi-style continuous background with amber/gold accents
 * Sections: Hero, Dashboard, Opportunity, How It Works, Bottom CTA
 */

import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  TrendingUp,
  Leaf,
  Users,
  Globe,
  Building,
  Target,
  Wallet,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { HeroPageLoader } from "@/components/HeroPageLoader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { ViewportTriggeredVideo } from "@/components/ViewportTriggeredVideo";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import TreasuryDashboard from "@/components/TreasuryDashboard";
import { SocialLinks } from "@/components/SocialLinks";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import AutoplayVideo from "@/components/AutoplayVideo";
import { LazyImage } from "@/components/LazyImage";
import { MobileTableOfContents, type TocSection, type TocAction } from "@/components/MobileTableOfContents";

const FUND_SECTIONS: TocSection[] = [
  { id: 'fund-dashboard', title: 'Dashboard' },
  { id: 'fund-opportunity', title: 'The Opportunity' },
  { id: 'fund-how-it-works', title: 'How It Works' },
  { id: 'fund-overview', title: 'Fund Overview' },
  { id: 'fund-finance-future', title: 'Finance the Future' },
  { id: 'fund-journey', title: 'Investor Journey' },
  { id: 'fund-cta', title: 'Get Started' },
];
import InvestorJourney from "@/components/InvestorJourney";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { PageWrapper } from "@/components/PageWrapper";
import { cdnImg } from "@/lib/utils";
import { Pullquote } from "@/components/Pullquote";
import { ReadingTime } from "@/components/ReadingTime";
import { TLDR } from "@/components/TLDR";
import { TractionStrip, type TractionStat } from "@/components/TractionStrip";
import { trpc } from "@/lib/trpc";

/**
 * Live movement counts for the Fund page. Pulled from
 * system.getPublicStats; renders nothing until data is loaded and skips
 * any stat that is zero so we never claim AUM-style metrics we do not
 * have. Fund is in formation, so no money figures.
 */
function FundTractionStrip() {
  const { data } = trpc.stats.getPublicStats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  if (!data) return null;
  const stats: TractionStat[] = [
    { value: data.landProjects ?? 0, label: "Land projects" },
    { value: data.questsCompleted ?? 0, label: "Quests completed" },
    { value: data.members ?? 0, label: "Community members" },
    { value: data.bioregionsTouched ?? 0, label: "Bioregions" },
  ].filter((s) => s.value > 0);
  if (stats.length === 0) return null;
  return <TractionStrip eyebrow="Movement in motion" stats={stats} tone="cream" />;
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  stats,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  stats?: { value: string; label: string }[];
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3
              className="text-lg md:text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h3>
            {stats && !isOpen && (
              <div className="flex gap-4 mt-1">
                {stats.map((s, i) => (
                  <span key={i} className="text-amber-400 text-sm font-bold">
                    {s.value}{" "}
                    <span className="text-white/70 font-normal text-xs">{s.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-amber-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="ml-13 pl-4 border-l-2 border-amber-400/30">
            {stats && (
              <div className="flex flex-wrap gap-4 mb-4">
                {stats.map((s, i) => (
                  <div key={i} className="glass-panel-light px-4 py-2 rounded-lg">
                    <span className="text-amber-400 font-bold text-lg">{s.value}</span>
                    <span className="text-white/70 text-sm ml-2">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-white/70 text-base leading-relaxed safe-prose">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Fund() {
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (index: number) => {
    setOpenSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const heroImages = [cdnImg("https://assets.regencivics.earth/OfqiIKxSsWfMhFwN.webp"), cdnImg("https://assets.regencivics.earth/AxJkbpktjcGvTnJs.webp")];

  return (
    <HeroPageLoader images={heroImages}>
    <PageWrapper>
    <PageBackground
      backgroundImage={cdnImg("https://assets.regencivics.earth/OfqiIKxSsWfMhFwN.webp")}
      mobileBackgroundImage={cdnImg("https://assets.regencivics.earth/AxJkbpktjcGvTnJs.webp")}
      blurPlaceholder={cdnImg("https://assets.regencivics.earth/mCYNtInTzAALMYmI.webp")}
      mobileBlurPlaceholder={cdnImg("https://assets.regencivics.earth/CPfORGmZXXuBnUvg.webp")}
      overlayOpacity={0.65}
      theme="ocean"
      blendColor="12, 42, 48"
      overlayColor="12, 42, 48"
      scrollWithPage={true}
      sectionOverlays={[
        { id: "hero", opacity: 0.35 },            // Hero - let image detail show through
        { id: "problem", opacity: 0.55 },          // Problem statement
        { id: "solution", opacity: 0.50 },          // Solution approach - let art breathe
        { id: "structure", opacity: 0.60 },         // Fund structure - needs readability
        { id: "cta", opacity: 0.55 },               // Call to action
      ]}
    >
      <SEO {...pageSEO.fund} breadcrumbs={[{ name: "Home", url: "/" }, { name: "The Fund", url: "/fund" }]} />
      <JsonLD data={schemas.investmentFund()} />
      <JsonLD data={schemas.faqPage([
        { question: "What is the ReGen Civics Alliance Fund?", answer: "The ReGen Civics Alliance Fund is a venture fund investing in regenerative land projects globally. It pools capital from accredited investors to back projects that heal soil, water, community, and local economy." },
        { question: "Who can invest in the ReGen Civics Fund?", answer: "The fund is open to accredited investors who meet the eligibility criteria. Submit a Letter of Intent to begin the process." },
        { question: "What is the minimum investment?", answer: "Minimum investment details are shared during the investor qualification process. Contact the team to discuss your allocation." },
        { question: "How is the fund governed?", answer: "The fund uses voice-based governance rooted in land contributions. Token holders participate in key decisions through the ReGen Civics governance model." },
        { question: "What types of land projects does the fund support?", answer: "The fund backs early-stage and mature regenerative land projects including ecovillages, food forests, regenerative farms, and intentional communities with demonstrated community engagement." },
      ])} />

      <MobileTableOfContents
        sections={FUND_SECTIONS}
        fallbackTitle="Fund"
        actions={[
          { label: "Pitch Deck", href: "/regen-civics-investor-deck.pdf", icon: FileText, external: true },
          { label: "Book a Call", href: "https://calendly.com/rieki-cordon/30min", icon: Calendar, external: true },
        ]}
      />

      {/* Fund Status Banner */}
      <div className="bg-gradient-to-r from-[#d4a574] via-[#ffd700] to-[#d4a574] border-b-2 border-[#ffd700]/50 shadow-[0_4px_15px_rgba(255,215,0,0.3)]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[#1a472a]">
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Fund In Formation, Currently Accepting LOIs</span>
            </div>
            <span className="hidden sm:inline text-[#1a472a]">|</span>
            <Link href="/loi">
              <Button
                size="sm"
                className="breathing-cta bg-gradient-to-r from-[#7dd87d] to-[#9de89d] text-[#1a472a] text-xs sm:text-sm px-5 py-3 min-h-[44px] h-auto font-bold"
              >
                Submit LOI
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">

          <AnimatedSection animation="fade-in">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass-panel-light text-amber-400 text-base"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              <Wallet className="w-5 h-5" />
              <span>Investor Path</span>
            </div>
          </AnimatedSection>


          <AnimatedSection animation="slide-up" delay={200}>
            <h1
              className="ink-reveal text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white leading-tight text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Fund the <span className="text-amber-400">Renaissance</span>
            </h1>
            <ReadingTime words={2000} />
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={400}>
            <p
              className="text-lg md:text-xl lg:text-2xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto text-shadow-subtle safe-prose"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Vision: Billions in resources effectively serving regenerative land projects. A venture
              fund governed by the ecosystem and investors directly, backed by healing land.
            </p>
          </AnimatedSection>

          {/* CTAs — links to /opportunity (the actual investment thesis page);
              the previous `/investor` target was the interest-form page,
              which read as a 404 to anyone expecting the thesis content. */}
          <AnimatedSection animation="slide-up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/opportunity">
                <Button
                  className="bg-amber-400 text-[#1a472a] hover:bg-amber-300 font-bold px-10 py-5 text-lg w-full sm:w-auto h-auto shadow-[0_0_20px_rgba(251,191,36,0.5),0_0_40px_rgba(251,191,36,0.25)] hover:shadow-[0_0_30px_rgba(251,191,36,0.7),0_0_60px_rgba(251,191,36,0.35)] transition-shadow"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Investment Thesis
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* TLDR */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <TLDR points={[
          "ReGen Civics is a land-backed regenerative investment fund",
          "Capital flows to vetted land projects through seasonal incubator cohorts",
          "Returns come from land value appreciation, revenue sharing, and token economics",
        ]} />
      </div>

      {/* Live movement traction — real counts, never invented. */}
      <FundTractionStrip />

      {/* Investor Dashboard */}
      <section id="fund-dashboard" className="py-12 md:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection animation="slide-up">
            <TreasuryDashboard />
          </AnimatedSection>
        </div>
      </section>

      {/* The Opportunity */}
      <section id="fund-opportunity" className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="story-grow text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The <span className="text-amber-400">Opportunity</span>
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              The regenerative economy represents one of the largest market transformations of our
              time.
            </p>
          </AnimatedSection>

          <div className="space-y-3">
            <AnimatedSection animation="slide-up" delay={100}>
              <CollapsibleSection
                title="Market Opportunity"
                icon={TrendingUp}
                defaultOpen={true}
                stats={[
                  { value: "$160B+", label: "Regen Ag Market by 2030" },
                  { value: "$1T+", label: "Sustainable Housing Redesign" },
                ]}
              >
                <p>
                  The global regenerative agriculture market alone is projected to reach $160B by
                  2030. Combined with sustainable real estate, urban redesign for regenerative
                  housing, and ecosystem services, the total addressable market exceeds $3-5
                  trillion. We need to redesign how humans inhabit the Earth, and that redesign is
                  the investment opportunity of our generation.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={200}>
              <CollapsibleSection title="Land-Backed Security" icon={Shield}>
                <p>
                  Every investment is backed by real land that appreciates as it regenerates. Unlike
                  speculative assets, regenerative land becomes more valuable over time as soil
                  health improves, biodiversity increases, and ecosystem services multiply. This
                  creates a natural floor on investment value while generating ongoing returns
                  through agriculture, eco-tourism, home sales, carbon credits, and a growing
                  diversity of community run economies and businesses.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={300}>
              <CollapsibleSection title="Community-Governed Fund" icon={Users}>
                <p>
                  The ReGen Civics fund is governed by its participants, not a single fund manager.
                  Investment decisions are made collectively through transparent governance
                  processes. This distributed approach reduces single points of failure and ensures
                  investments align with both financial returns and regenerative impact. Funds
                  require 90% alignment to move, meaning we need extremely high conviction before
                  acting.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={400}>
              <CollapsibleSection title="Systemic Impact Returns" icon={Globe}>
                <p>
                  Beyond financial returns, investments generate measurable impact across multiple
                  dimensions: carbon sequestration, biodiversity restoration, water cycle repair,
                  food sovereignty, and community resilience. These are tracked through our HEIST
                  (Holistic Ecosystemic Impact and Sustainability Tracking) framework.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={500}>
              <CollapsibleSection title="De-Risked Through Alliance" icon={Building}>
                <p>
                  Land projects don't go it alone. Our alliance of organizations provides
                  full-spectrum support: legal structure, financial modeling, regenerative design,
                  governance setup, infrastructure and development, and ongoing operational support.
                  This dramatically reduces the failure rate and protects investor capital.
                </p>
              </CollapsibleSection>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Pullquote>We need to redesign how humans inhabit the Earth, and that redesign is the investment opportunity of our generation.</Pullquote>

      {/* How It Works */}
      <section id="fund-how-it-works" className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="story-grow text-3xl md:text-5xl font-bold text-white mb-8 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How It <span className="text-amber-400">Works</span>
            </h2>
          </AnimatedSection>

          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Discovery Call",
                desc: "Schedule a conversation to explore alignment between your investment goals and our regenerative projects. We walk you through the fund structure, current portfolio, and governance model.",
                icon: Calendar,
                buttons: [
                  { label: "Download Pitch Deck", href: "/regen-civics-investor-deck.pdf", icon: FileText, external: true },
                  { label: "Book a Call", href: "https://calendly.com/rieki-cordon/30min", icon: Calendar, external: true }
                ]
              },
              {
                step: "02",
                title: "Review Investment Thesis",
                desc: "Receive detailed information on thesis, financial projections, governance structure, and impact metrics. Review at your own pace with support from our team.",
                icon: FileText,
                buttons: [
                  { label: "Access Investment Thesis", href: "/investor", icon: FileText }
                ]
              },
              {
                step: "03",
                title: "Due Diligence",
                desc: "Visit projects, meet stewards, review legal structures, and assess the land-backed security model. We encourage hands-on engagement with the communities.",
                icon: Target,
              },
              {
                step: "04",
                title: "Invest and Participate",
                desc: "Deploy capital and join the governance community. Track your impact in real-time through our dashboard. Participate in seasonal reviews and fund governance decisions.",
                icon: Wallet,
              },
            ].map((item, i) => (
              <AnimatedSection key={i} animation="slide-up" delay={i * 100}>
                <Collapsible open={openSteps[i]} onOpenChange={() => toggleStep(i)}>
                  <div className="glass-panel">
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-start gap-4 p-5 md:p-6 text-left hover:bg-white/5 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                          <span
                            className="text-amber-400 font-bold text-base"
                            style={{ fontFamily: "var(--font-accent)" }}
                          >
                            {item.step}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3
                            className="text-lg md:text-xl font-bold text-amber-400 mb-0 flex items-center justify-between"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            <span>{item.title}</span>
                            <ChevronDown
                              className={`w-5 h-5 text-amber-400 transition-transform ml-2 ${
                                openSteps[i] ? "rotate-180" : ""
                              }`}
                            />
                          </h3>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 pl-20 md:pl-[5.5rem]">
                        <p
                          className="text-white/70 text-base leading-relaxed mb-4 safe-prose"
                          style={{ fontFamily: "var(--font-body)" }}
                        >
                          {item.desc}
                        </p>
                        {item.buttons && (
                          <div className="flex flex-wrap gap-3 mt-4">
                            {item.buttons.map((btn: any, btnIdx: number) => (
                              btn.external ? (
                                <Button
                                  key={btnIdx}
                                  size="sm"
                                  className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 border border-amber-400/40"
                                  onClick={() => window.open(btn.href, '_blank')}
                                >
                                  <btn.icon className="w-4 h-4 mr-2" />
                                  {btn.label}
                                </Button>
                              ) : (
                                <Link key={btnIdx} href={btn.href}>
                                  <Button
                                    size="sm"
                                    className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 border border-amber-400/40"
                                  >
                                    <btn.icon className="w-4 h-4 mr-2" />
                                    {btn.label}
                                  </Button>
                                </Link>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Fund Overview Video - Coming Soon */}
      <section id="fund-overview" className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection animation="scale-in">
            <h2
              className="text-2xl md:text-4xl font-bold text-white mb-6 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Fund <span className="text-amber-400">Overview</span>
            </h2>
            <AutoplayVideo
              videoId="_LO2sItSofo"
              title="Fund Overview - Coming Soon"
              thumbnailUrl={cdnImg("https://assets.regencivics.earth/oFPkKpXaMzxeZTqG.png")}
              thumbnailAlt="Fund overview video coming soon"
              comingSoon={true}
            />
          </AnimatedSection>
        </div>
      </section>

      {/* Finance the Future of Our Planet */}
      <section id="fund-finance-future" className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Finance the <span className="text-amber-400">Future</span> of Our Planet
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-2xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              A diversified portfolio of regenerative land projects, backed by real assets and delivering multi-capital returns.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Left: Key features */}
            <AnimatedSection animation="slide-up" delay={100}>
              <div className="space-y-4">
                <div className="glass-panel p-5 border-amber-400/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-400 mb-1" style={{ fontFamily: "var(--font-display)" }}>Land-Backed Security</h3>
                      <p className="text-white/70 text-sm leading-relaxed">Every investment is secured by real land assets, providing tangible collateral and long-term value appreciation through ecological restoration.</p>
                    </div>
                  </div>
                </div>
                <div className="glass-panel p-5 border-[#7dd87d]/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#7dd87d]/15 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#7dd87d] mb-1" style={{ fontFamily: "var(--font-display)" }}>Multi-Capital Returns</h3>
                      <p className="text-white/70 text-sm leading-relaxed">Financial returns plus ecological regeneration, social impact, and community resilience. Your investment generates value across multiple dimensions.</p>
                    </div>
                  </div>
                </div>
                <div className="glass-panel p-5 border-blue-400/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-400/15 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-400 mb-1" style={{ fontFamily: "var(--font-display)" }}>Diversified Portfolio</h3>
                      <p className="text-white/70 text-sm leading-relaxed">Spread across multiple regenerative land projects globally, reducing risk while maximizing systemic impact across bioregions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Right: Composite image */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="glass-panel p-3 border-amber-400/20 overflow-hidden rounded-xl">
                <div className="space-y-2">
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/qxKCptuMsYLJOEzx.jpg")}
                    alt="Regenerative floating island communities"
                    className="w-full h-48 md:h-56 object-cover rounded-lg"
                    aspect="16/9"
                  />
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/cQIjYKqAtIzcnlPb.jpg")}
                    alt="Tree of life roots and branches"
                    className="w-full h-36 md:h-44 object-cover rounded-lg"
                    aspect="16/9"
                  />
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/oFPkKpXaMzxeZTqG.png")}
                    alt="Underwater tree of life with bridges and community"
                    className="w-full h-48 md:h-56 object-cover rounded-lg"
                    aspect="16/9"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* What You Give & Receive */}
          <AnimatedSection animation="slide-up" delay={300}>
            <div className="mt-10 glass-panel p-6 md:p-8 border-amber-400/20">
              <h3
                className="text-2xl font-bold text-white mb-6 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                What You <span className="text-amber-400">Give</span> & <span className="text-[#7dd87d]">Receive</span>
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15">
                  <h4 className="text-amber-400 font-bold mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>What You Give</h4>
                  <ul className="space-y-2 text-white/70 text-sm">
                    <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&#x2022;</span>Capital investment into the regenerative fund</li>
                    <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&#x2022;</span>Patience for ecological timelines (nature does not rush)</li>
                    <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">&#x2022;</span>Trust in systemic, long-term approaches</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#7dd87d]/5 border border-[#7dd87d]/15">
                  <h4 className="text-[#7dd87d] font-bold mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>What You Receive</h4>
                  <ul className="space-y-2 text-white/70 text-sm">
                    <li className="flex items-start gap-2"><span className="text-[#7dd87d] mt-0.5">&#x2022;</span>Land-backed financial returns</li>
                    <li className="flex items-start gap-2"><span className="text-[#7dd87d] mt-0.5">&#x2022;</span>RGVoice governance tokens (shape fund decisions)</li>
                    <li className="flex items-start gap-2"><span className="text-[#7dd87d] mt-0.5">&#x2022;</span>Measurable ecological and social impact data</li>
                    <li className="flex items-start gap-2"><span className="text-[#7dd87d] mt-0.5">&#x2022;</span>Access to a portfolio of regenerative communities</li>
                  </ul>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Fund Dispersal Animation */}
      <section className="py-8 md:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="fade-in">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-amber-400/20">
              <ViewportTriggeredVideo
                src={cdnImg("https://assets.regencivics.earth/VeYvNDrIyHjuiPlZ.mp4")}
                className="w-full h-auto"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Investor Journey Quest */}
      <div id="fund-journey">
        <InvestorJourney />
      </div>

      {/* Bottom CTA */}
      <section id="fund-cta" className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/*
            M-2 rewrite proposal (Rye to swap in when ready).
            Trips Writing Rule 5 ("Begin your journey" is vague filler).
            Replacement, in Rye's voice, leads with affirmative + specific:

              <h2 ...>Read the <span ...>Thesis</span></h2>
              <p ...>
                The fund is open. Read the investment thesis, then sign a
                Letter of Intent so we know you are coming. We will get
                you onboarded for the next close.
              </p>

            Leaving the live copy untouched per the spec ("draft in
            comment block above the current copy. Do not replace the
            live copy without Rye's sign-off").
          */}
          <AnimatedSection animation="scale-in">
            <div className="glass-panel p-8 md:p-12 border-amber-400/20">
              <SeedOfLifeIcon className="w-12 h-12 text-amber-400/40 mx-auto mb-6" />
              <h2
                className="text-2xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Begin Your <span className="text-amber-400">Investor Journey</span>
              </h2>
              <p className="text-white/60 text-base md:text-lg mb-6 max-w-xl mx-auto safe-prose">
                Or, if you are already in, signal your support by signing a Letter of Intent.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/opportunity">
                  <Button
                    className="bg-amber-400 text-[#1a472a] hover:bg-amber-300 font-bold px-10 py-5 text-lg h-auto shadow-[0_0_20px_rgba(251,191,36,0.5),0_0_40px_rgba(251,191,36,0.25)] hover:shadow-[0_0_30px_rgba(251,191,36,0.7),0_0_60px_rgba(251,191,36,0.35)] transition-shadow"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Investment Thesis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>
          </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.fund.pages} blog={relatedContentMap.fund.blog} />
    </PageBackground>
    </PageWrapper>
    </HeroPageLoader>
  );
}
