/**
 * Land Projects Path - Biofi-style continuous background
 * Sections: Hero, What You Receive, Apply for Season (criteria + paths),
 * Featured Land Projects Showcase, Journey, Resources, CTA
 */
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { ReadableScrim } from "@/components/ReadableScrim";
import {
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp,
  Leaf,
  Users,
  Shield,
  Compass,
  Sprout,
  Building,
  Globe,
  FileText,
  Calendar,
  BookOpen,
  Network,
  Target,
  Wallet,
  Heart,
  Handshake,
  CheckCircle2,
  ExternalLink,
  Eye,
  Scale,
  Vote,
  Coins,
  Printer,
  Star,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { ViewportTriggeredVideo } from "@/components/ViewportTriggeredVideo";
import { HeroPageLoader } from "@/components/HeroPageLoader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { SocialLinks } from "@/components/SocialLinks";
import { SEO } from "@/components/SEO";
import AutoplayVideo from "@/components/AutoplayVideo";
import { LazyImage } from "@/components/LazyImage";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { StickyThumbCta } from "@/components/StickyThumbCta";
import { cdnImg } from "@/lib/utils";

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#7dd87d]/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <h3
            className="text-lg md:text-xl font-bold text-white flex-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h3>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#7dd87d] flex-shrink-0" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="ml-13 pl-4 border-l-2 border-[#7dd87d]/30 text-white/70 text-base leading-relaxed">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneCard({
  icon: Icon,
  title,
  summary,
  expanded,
  videoLabel,
  videoUrl,
}: {
  icon: React.ElementType;
  title: string;
  summary: string;
  expanded: string;
  videoLabel?: string;
  videoUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#7dd87d]/40 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#7dd87d]" />
          </div>
          <div className="flex-1">
            <h4
              className="font-bold text-[#7dd87d] text-base mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h4>
            <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
            {videoLabel && videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#7dd87d] text-xs mt-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="w-3 h-3" /> {videoLabel}
              </a>
            )}
            {videoLabel && !videoUrl && (
              <p className="text-[#7dd87d] text-xs mt-2 flex items-center gap-1">
                <Play className="w-3 h-3" /> {videoLabel}
              </p>
            )}
          </div>
          <div className="flex-shrink-0 mt-1">
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-[#7dd87d]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#7dd87d]" />
            )}
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-13 pl-4 border-l-2 border-[#7dd87d]/30">
            <p className="text-white/70 text-sm leading-relaxed">{expanded}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Land() {
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [journeyStepsOpen, setJourneyStepsOpen] = useState(false);

  const heroImages = [cdnImg("https://assets.regencivics.earth/UfviEsVKlfgomHkn.webp"), cdnImg("https://assets.regencivics.earth/qpgHkSSnOsTrFhXQ.webp")];

  return (
    <HeroPageLoader images={heroImages}>
    <PageBackground
      backgroundImage={cdnImg("https://assets.regencivics.earth/UfviEsVKlfgomHkn.webp")}
      mobileBackgroundImage={cdnImg("https://assets.regencivics.earth/qpgHkSSnOsTrFhXQ.webp")}
      blurPlaceholder={cdnImg("https://assets.regencivics.earth/BXOcRMdYlfNoEQcm.webp")}
      mobileBlurPlaceholder={cdnImg("https://assets.regencivics.earth/CFqunDldTPTGuURs.webp")}
      overlayOpacity={0.65}
      theme="garden"
      blendColor="22, 50, 30"
      scrollWithPage={true}
      sectionOverlays={[
        { id: "hero", opacity: 0.30 },             // Hero - let image detail show through
        { id: "problem", opacity: 0.55 },           // Problem overview
        { id: "approach", opacity: 0.50 },           // Restoration approach - let greenery show
        { id: "criteria", opacity: 0.55 },           // Selection criteria
        { id: "process", opacity: 0.60 },            // Process steps - needs readability
        { id: "cta", opacity: 0.55 },                // Call to action
      ]}
    >
      <SEO
        title="Land Projects - ReGen Civics"
        description="Design your economic game, build governance, access alliance support, and attract investment for your regenerative land project."
        image="/og/land.webp"
        url="/land"
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Land Projects", url: "/land" }]}
      />

      {/* Season Banner */}
      <div className="bg-gradient-to-r from-[#4a7c59] via-[#7dd87d] to-[#4a7c59] border-b-2 border-[#7dd87d]/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-[#1a472a]">
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
              <Sprout className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Season 2 Applications Open - September 2026</span>
            </div>
            <span className="hidden sm:inline text-[#1a472a]/80">|</span>
            <Link href="/apply">
              <Button
                size="sm"
                className="bg-[#1a472a] hover:bg-[#0d2818] text-white text-xs sm:text-sm px-3 py-1 h-auto"
              >
                Apply Now
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
              className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass-panel-light text-[#7dd87d] text-base"
              style={{ fontFamily: "var(--font-accent)" }}
            >
              <Leaf className="w-5 h-5" />
              <span>Land Project Path</span>
            </div>
          </AnimatedSection>


          <AnimatedSection animation="slide-up" delay={200}>
            <ReadableScrim block className="max-w-3xl mx-auto mb-4">
              <h1
                className="ink-reveal text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                We help you design the economic, financial, and governance <span className="text-[#7dd87d]">Game</span> your land project needs to thrive and access diverse forms of capital to help you thrive!
              </h1>
            </ReadableScrim>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={400}>
            <ReadableScrim block className="max-w-3xl mx-auto mb-8">
              <p
                className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed"
                style={{ fontFamily: "var(--font-body)" }}
              >
                We help you design the economic, financial, and governance game your land project needs to
                thrive and access capital from the regenerative fund.
              </p>
            </ReadableScrim>
          </AnimatedSection>

          {/* CTAs */}
          <AnimatedSection animation="slide-up" delay={600}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/apply">
                <Button
                  className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto shadow-[0_0_20px_rgba(125,216,125,0.4),0_0_40px_rgba(125,216,125,0.2)]"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Sprout className="w-5 h-5 mr-2" />
                  Apply for Next Season
                </Button>
              </Link>
              <Link href="/schedule">
                <Button
                  variant="outline"
                  className="border-[#7dd87d]/60 text-white bg-[#1a472a]/60 hover:bg-[#7dd87d]/20 font-bold px-8 py-4 text-lg w-full sm:w-auto h-auto backdrop-blur-sm"
                  style={{ fontFamily: "var(--font-accent)" }}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Join Next Session
                </Button>
              </Link>
            </div>
          </AnimatedSection>

          {/* Hero Video - Autoplay on scroll */}
          <AnimatedSection animation="scale-in" delay={800}>
            <div className="mt-8 max-w-3xl mx-auto">
              <AutoplayVideo
                videoId="slsblbvYHUk"
                title="Land Projects - Stewards of Regeneration"
                thumbnailUrl={cdnImg("https://assets.regencivics.earth/CmfDfArnSYUuTsEl.jpg")}
                thumbnailAlt="Land Projects introduction video"
                playLabel="Watch Introduction"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* What You Receive */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <ReadableScrim block className="max-w-2xl mx-auto text-center mb-8">
              <h2
                className="text-3xl md:text-5xl font-bold text-white mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                What You <span className="text-[#7dd87d]">Receive</span>
              </h2>
              <p
                className="text-white/85 text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                A complete support system from conception to thriving community.
              </p>
            </ReadableScrim>
          </AnimatedSection>

          <div className="space-y-3">
            <AnimatedSection animation="slide-up" delay={100}>
              <CollapsibleSection title="Economic Game Design" icon={Compass} defaultOpen={true}>
                <p>
                  We help you design the economic engine of your project: community currencies,
                  revenue sharing models, local exchange systems, and financial sustainability plans.
                  Your project becomes a living economy that serves its residents and regenerates the
                  land.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={200}>
              <CollapsibleSection title="Alliance Support Network" icon={Network}>
                <p>
                  Access our alliance of organizations providing specialized services: legal
                  structuring, regenerative design, governance frameworks, financial modeling, impact
                  measurement, technology infrastructure, community building and more.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={300}>
              <CollapsibleSection title="Investment Readiness" icon={Wallet}>
                <p>
                  We prepare your project to attract investment through economic modeling, impact
                  metrics, legal structure, and governance design. Our fund and investor network are
                  ready to deploy capital to projects that meet our criteria.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={400}>
              <CollapsibleSection title="Governance and Legal Structure" icon={Shield}>
                <p>
                  From digital organisations and DAOs to cooperatives, from land trusts to private
                  community land ownership models, we help you choose and implement the right
                  governance and legal structure for your specific context.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={500}>
              <CollapsibleSection title="Impact Tracking (HEIST)" icon={Target}>
                <p>
                  Our Holistic Ecosystemic Impact and Sustainability Tracking framework measures your
                  project's impact across ecological, social, economic, and cultural dimensions. This
                  data attracts investors and demonstrates your contribution to planetary healing.
                </p>
              </CollapsibleSection>
            </AnimatedSection>

            <AnimatedSection animation="slide-up" delay={600}>
              <CollapsibleSection title="Community of Practice" icon={Heart}>
                <p>
                  Join a growing network of land stewards who share knowledge, resources, and support.
                  Seasonal gatherings, regular calls, and shared platforms keep the community connected
                  and learning together.
                </p>
              </CollapsibleSection>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Apply for the Next Season (criteria) */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up" className="text-center mb-10">
            <Link href="/apply">
              <div
                className="inline-flex items-center gap-2 px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] transition-colors cursor-pointer text-base font-bold"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                <Calendar className="w-5 h-5" />
                Applications Open
              </div>
            </Link>
            <h2
              className="text-3xl md:text-5xl font-bold mb-4 text-white text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Apply for the Next{" "}
              <span className="text-[#7dd87d]">Season</span>
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto text-shadow-subtle">
              Whether you're just starting or ready to scale, we have a path for you
            </p>
          </AnimatedSection>

          {/* What We're Looking For - Collapsible Criteria.
              On expand, scroll the section header to the top of the
              viewport so the newly-revealed content isn't below the fold. */}
          <div className="mb-10" id="land-criteria-collapsible">
            <button
              onClick={(e) => {
                const willOpen = !criteriaOpen;
                setCriteriaOpen(willOpen);
                if (willOpen) {
                  // Defer so the new content has measured before we scroll.
                  setTimeout(() => {
                    (e.currentTarget as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }
              }}
              className="w-full glass-panel p-6 text-left hover:bg-white/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#7dd87d]" />
                    </div>
                    <h3
                      className="text-2xl font-bold text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      What We're Looking For
                    </h3>
                  </div>
                  <p className="text-white/80 leading-relaxed mb-3 text-base">
                    We seek land-based projects aligned with:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      "Regenerative Stewardship",
                      "Ecological Preservation",
                      "Decentralized Governance",
                      "Cultural Respect",
                      "Long-term Service to Life",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-full text-[#7dd87d] text-sm font-medium"
                      >
                        <Leaf className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[#7dd87d] text-sm font-medium">
                    Click to see detailed criteria (flexible guidelines, not rigid rules)
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  {criteriaOpen ? (
                    <ChevronUp className="w-6 h-6 text-[#7dd87d]" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-[#7dd87d] animate-bounce" />
                  )}
                </div>
              </div>
            </button>

            {criteriaOpen && (
              <div className="glass-panel-light p-6 mt-1 rounded-b-xl">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                      <Leaf className="w-5 h-5 text-[#7dd87d]" />
                      Land & Team
                    </h4>
                    <ul className="space-y-2 text-white/70 text-base">
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Secured land access (owned, leased, or committed)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Founding team of 2+ committed members</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Clear vision for the project</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                      <Heart className="w-5 h-5 text-[#7dd87d]" />
                      Values Alignment
                    </h4>
                    <ul className="space-y-2 text-white/70 text-base">
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Designed to meet human needs holistically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Focus on ecological restoration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Openness to collaborative learning</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#7dd87d] mt-1">✓</span>
                        <span>Commitment to community-led governance</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Time Commitments */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5 text-[#7dd87d]" />
                    Time Commitments
                  </h4>
                  <ul className="space-y-2 text-white/70 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      <span>
                        <strong className="text-white">During Seasons:</strong> 1 day per week for
                        sessions and collaborative work
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      <span>
                        <strong className="text-white">Network Participation:</strong> Minimum 1 day
                        per Season to stay connected
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Network Investment */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                    <Handshake className="w-5 h-5 text-[#7dd87d]" />
                    Network Investment
                  </h4>
                  <ul className="space-y-2 text-white/70 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      <span>
                        <strong className="text-white">Equity/Token/Access Swap:</strong> Projects
                        exchange ownership or access with the network to become co-invested in the
                        alliance
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Priority */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-lg">
                    <Star className="w-5 h-5 text-[#d4a574]" />
                    Priority
                  </h4>
                  <ul className="space-y-2 text-white/70 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-[#d4a574] mt-1">★</span>
                      <span>Priority given to land projects that are working towards being a case-study and incubator themselves  -  actively tracking and mapping their process, creating a replicable "play" for how others can mimic their protocols, and intending to host teams to come learn from them. Our priority is to support the projects that want to support more projects.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 p-4 bg-[#7dd87d]/10 rounded-lg border border-[#7dd87d]/20">
                  <p className="text-white/70 text-base">
                    <strong className="text-white">Note:</strong> These are guidelines, not rigid
                    requirements. We evaluate each project holistically. If unsure, apply anyway.
                    We'll help you find the right path.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Two Paths - Mature and Early Stage (Images 4 & 5) */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Mature Projects */}
            <AnimatedSection animation="slide-up" delay={100}>
              <div className="glass-panel p-6 md:p-8 h-full border-amber-400/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[#4a7c59] flex items-center justify-center flex-shrink-0">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-bold text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Mature Projects
                  </h3>
                </div>
                <CollapsibleSection title="Already established and ready for alliance membership" icon={CheckCircle2}>
                  <p className="mb-3">
                    Already established and ready for alliance membership, advanced organisational and
                    financial tools, and further funding opportunities.
                  </p>
                  <ul className="space-y-2 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Direct funding access
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Alliance co-ownership benefits
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Potential to co-steward fund
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Create your MVE (Minimum Viable Economy)
                    </li>
                  </ul>
                </CollapsibleSection>
                <div className="mt-4">
                  <Link href="/apply">
                    <Button className="w-full rounded-xl bg-[#4a7c59] hover:bg-[#3d6a4a] text-white text-base py-3 h-auto">
                      Apply <ExternalLink className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </AnimatedSection>

            {/* Early Stage Projects */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="glass-panel p-6 md:p-8 h-full border-[#7dd87d]/20">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                    <Sprout className="w-7 h-7 text-[#1a472a]" />
                  </div>
                  <h3
                    className="text-2xl md:text-3xl font-bold text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Early Stage Projects
                  </h3>
                </div>
                <CollapsibleSection title="Building foundations and getting ready to thrive" icon={Sprout}>
                  <p className="mb-3">
                    Building your foundations and getting ready to thrive. We help you become
                    investment-ready and community-strong.
                  </p>
                  <ul className="space-y-2 text-base">
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Foundation building support
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Mentorship and network access
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#7dd87d] mt-1">✓</span>
                      Governance, economic, and organizational foundations
                    </li>
                  </ul>
                </CollapsibleSection>
                <div className="mt-4">
                  <Link href="/apply">
                    <Button className="w-full rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] text-base py-3 h-auto">
                      Apply <ExternalLink className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </AnimatedSection>
          </div>

          <p className="text-center text-white/70 mt-8 max-w-2xl mx-auto text-base">
            Not sure which path? Apply anyway. We'll help you find the best fit.
          </p>
        </div>
      </section>

      {/* Pasture to Paradise - Transformation Video */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up" className="text-center mb-8">
            <ReadableScrim block className="max-w-2xl mx-auto">
              <h2
                className="text-2xl md:text-4xl font-bold mb-3 text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                From Pasture to <span className="text-[#7dd87d]">Paradise</span>
              </h2>
              <p className="text-base md:text-lg text-white/85">
                Watch the transformation. This is what regenerative land development looks like in action.
              </p>
            </ReadableScrim>
          </AnimatedSection>
          <AnimatedSection animation="fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-[#7dd87d]/20">
              <ViewportTriggeredVideo
                src={cdnImg("https://assets.regencivics.earth/XsPbGgILnGYjlRUh.mp4")}
                ariaLabel="Regenerative landscape transformation"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1a472a]/80 to-transparent p-4 md:p-6">
                <p className="text-white/90 text-sm md:text-base font-medium" style={{ fontFamily: 'var(--font-display)' }}>
                  Regenerative transformation in progress
                </p>
                <p className="text-white/60 text-xs md:text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  Every project begins with a vision. Every landscape holds potential.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Featured Land Projects Showcase (Image 6) */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection animation="slide-up" className="text-center mb-12">
            <ReadableScrim block className="max-w-2xl mx-auto">
              <h2
                className="text-3xl md:text-5xl font-bold mb-4 text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Featured <span className="text-[#7dd87d]">Land Projects</span>
              </h2>
              <p className="text-xl text-white/85">
                Explore thriving regenerative communities in our network
              </p>
            </ReadableScrim>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Liminal Village */}
            <AnimatedSection animation="slide-up" delay={100}>
              <div className="glass-panel p-5 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-[#1a472a]" />
                  </div>
                  <div>
                    <h4
                      className="font-bold text-white text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <a
                        href="https://liminalvillage.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#7dd87d] transition-colors"
                      >
                        Liminal Village
                      </a>
                    </h4>
                    <p className="text-sm text-white/70">Portugal - Regenerative Ecovillage</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/akMLmQzqqlUsisDu.webp")}
                    alt="Liminal Village aerial view"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/yyyxPsMbwSGiMHEp.webp")}
                    alt="Liminal Village sunset"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                </div>
                {/* Liminal Village Tour Video */}
                <AutoplayVideo
                  videoId="XdhPXocPf9g"
                  title="Liminal Village Tour"
                  thumbnailUrl="https://img.youtube.com/vi/XdhPXocPf9g/hqdefault.jpg"
                  thumbnailAlt="Liminal Village tour video"
                  playLabel="Watch Tour"
                />
              </div>
            </AnimatedSection>

            {/* Heartland */}
            <AnimatedSection animation="slide-up" delay={200}>
              <div className="glass-panel p-5 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4
                      className="font-bold text-white text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <a
                        href="https://heartlandcollective.org/home-retreat/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#7dd87d] transition-colors"
                      >
                        Heartland Retreat
                      </a>
                    </h4>
                    <p className="text-sm text-white/70">California - Eco-Healing Sanctuary</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/xHHoWlRQHaZwWmCV.webp")}
                    alt="Heartland glamping tent"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/eHZRDmAdPefGZGgJ.webp")}
                    alt="Heartland wellness"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                </div>
              </div>
            </AnimatedSection>

            {/* Traditional Dream Factory */}
            <AnimatedSection animation="slide-up" delay={300}>
              <div className="glass-panel p-5 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#4a7c59] flex items-center justify-center">
                    <Sprout className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4
                      className="font-bold text-white text-lg"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      <a
                        href="https://www.traditionaldreamfactory.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#7dd87d] transition-colors"
                      >
                        Traditional Dream Factory
                      </a>
                    </h4>
                    <p className="text-sm text-white/70">Portugal - Web3 Regenerative Village</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/rmKnVnHXVDidptKc.jpg")}
                    alt="Traditional Dream Factory greenhouse"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                  <LazyImage
                    src={cdnImg("https://assets.regencivics.earth/ezyQpMhwRnDAKylV.jpg")}
                    alt="Traditional Dream Factory aerial view"
                    className="w-full h-28 object-cover rounded-lg border border-white/10"
                  />
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Your Project CTA */}
          <div className="text-center mt-8">
            <Link href="/apply">
              <div className="inline-flex items-center gap-3 px-6 py-4 glass-panel border-[#7dd87d]/30 cursor-pointer hover:bg-white/10 transition-colors rounded-xl">
                <span className="text-2xl">🌱</span>
                <div className="text-left">
                  <p
                    className="font-bold text-white text-lg"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Your Project?
                  </p>
                  <p className="text-sm text-white/70">Apply to join the next season</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#7dd87d]" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* The ReGen Game Journey */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection animation="slide-up">
            <h2
              className="text-3xl md:text-5xl font-bold text-white mb-3 text-center text-shadow-strong"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The ReGen Game <span className="text-[#7dd87d]">Journey</span>
            </h2>
            <p
              className="text-white/60 text-center mb-8 max-w-xl mx-auto text-lg text-shadow-subtle"
              style={{ fontFamily: "var(--font-body)" }}
            >
              We guide land projects through essential milestones to co-create your unique "Game"
            </p>
          </AnimatedSection>

          {/* Watch Season 1 Recap Button */}
          <AnimatedSection animation="slide-up" delay={100}>
            <div className="text-center mb-8">
              <a
                href="https://www.youtube.com/watch?v=AJZI0OiRPeU&list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io&pp=sAgC"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 glass-panel border-[#7dd87d]/30 hover:bg-white/10 transition-colors rounded-full text-white font-medium"
                style={{ fontFamily: "var(--font-accent)" }}
              >
                <Play className="w-4 h-4 text-[#7dd87d]" />
                Watch Season 1 Recap
              </a>
            </div>
          </AnimatedSection>

          {/* Game Board Animation Video */}
          <AnimatedSection animation="scale-in" delay={200}>
            <div className="mb-8 rounded-2xl overflow-hidden border-4 border-[#4a7c59]/60 shadow-2xl">
              <video
                src={cdnImg("https://assets.regencivics.earth/TfYrpbnmJmpWuEeg.mp4")}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-auto"
                poster={cdnImg("https://assets.regencivics.earth/ACFKZcufsmYBYHhs.jpg")}
              />
            </div>
          </AnimatedSection>

          {/* Explore the Journey Steps - Collapsible */}
          <AnimatedSection animation="slide-up" delay={300}>
            <div className="glass-panel overflow-hidden">
              <button
                onClick={() => setJourneyStepsOpen(!journeyStepsOpen)}
                className="w-full p-5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#7dd87d]/15 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-[#7dd87d]" />
                  </div>
                  <h3
                    className="text-lg md:text-xl font-bold text-white flex-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Explore the Journey Steps
                  </h3>
                  {journeyStepsOpen ? (
                    <ChevronUp className="w-6 h-6 text-[#7dd87d] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-[#7dd87d] flex-shrink-0 animate-bounce" />
                  )}
                </div>
              </button>

              {journeyStepsOpen && (
                <div className="px-4 pb-5 pt-2">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 1. Vision & Purpose */}
                    <MilestoneCard
                      icon={Eye}
                      title="Vision & Purpose"
                      summary='What are we co-creating? Where is it? What is it? Defining the dream.'
                      expanded="This foundational step helps you articulate your project's core identity. We explore questions like: What transformation do you want to create? Who is this for? What makes your vision unique? Through guided exercises, you'll craft a compelling narrative that attracts aligned collaborators and investors."
                    />

                    {/* 2. Patterns of Co-Creation */}
                    <MilestoneCard
                      icon={Handshake}
                      title="Patterns of Co-Creation"
                      summary="Creating the foundations for a trusted Game. Similar to a 'Constitution' for Nation States."
                      videoLabel="Watch Video on Co-Creation"
                      videoUrl="https://youtu.be/9pwW-55zeEU?si=fu0cC6m7jAxbqGeA"
                      expanded="How do we co-create? We establish the foundational agreements that govern how your community operates. Think of it as creating your project's 'constitution' that ensures trust and alignment as you grow."
                    />

                    {/* 3. Legal Structure */}
                    <MilestoneCard
                      icon={Scale}
                      title="Legal Structure"
                      summary="How do we relate with legacy economies and nation-states? What legal vehicle gives us the most flexibility, protection and ability to execute our mission?"
                      expanded="Find the legal structure that best serves your mission. We explore cooperatives, DAOs, trusts, private associations, hybrid models, and more. The goal is maximum flexibility and protection while staying aligned with your values."
                    />

                    {/* 4. Circles, Roles & Quests */}
                    <MilestoneCard
                      icon={Target}
                      title="Circles, Roles & Quests"
                      summary="How do we execute our mission in a playful way? What structure can others join so they can contribute in a well-defined and joyful way?"
                      videoLabel="Explore Video on Org. Design"
                      videoUrl="https://www.youtube.com/watch?v=A4wkSnXnNdU"
                      expanded="Design your organizational structure using the 'Circles' model. Each circle has clear purpose, roles, and accountabilities. 'Quests' are specific missions that members can take on, gamifying contribution and making participation engaging. This creates clarity while maintaining flexibility and fun."
                    />

                    {/* 5. Membership & Conflict Evolution */}
                    <MilestoneCard
                      icon={Users}
                      title="Membership & Conflict Evolution"
                      summary="Who is a member? What are their Rites of Passage to enter? How do we evolve through conflict? How do people leave amicably?"
                      expanded="Define clear pathways for joining, growing within, and gracefully exiting your community. We design 'Rites of Passage' that ensure alignment and commitment. Conflict is reframed as an opportunity for evolution, with clear processes for resolution that strengthen rather than fracture relationships."
                    />

                    {/* 6. Crowd Pooling */}
                    <MilestoneCard
                      icon={Coins}
                      title="Crowd Pooling"
                      summary="Can we pool resources together to co-create our projects dramatically reducing our dependence on financial capital? Can we access low interest Regenerative Development Loans to further dramatically reduce financial investor requirements?"
                      videoLabel="Explore Video on Crowd Pooling"
                      videoUrl="https://youtu.be/jxKR-WneJp0?si=V89eEKkLecPQPvBf"
                      expanded="Explore innovative funding mechanisms that go beyond traditional investment. Crowd pooling allows communities to contribute resources (time, skills, materials, money) in exchange for access, ownership, or future benefits. Combined with Regenerative Development Loans, this can dramatically reduce the need for conventional investors."
                    />
                  </div>

                  {/* 7. Governance Process - Full Width */}
                  <div className="mt-4">
                    <MilestoneCard
                      icon={Vote}
                      title="Governance Process - Ongoing Game to Create the Game"
                      summary="How do we evolve and change? Who makes decisions and how? What are the systems that allow us to continuously adapt and improve?"
                      videoLabel="Watch Video on Governance"
                      videoUrl="https://youtu.be/iH8gS_YZHAc?si=l8H4WoHPTZTOFxwM"
                      expanded="Governance is an ongoing 'game within the game.' We design adaptive systems that allow your community to evolve its own rules over time. This includes proposal processes, voting mechanisms, and feedback loops that ensure the governance itself can be improved as you learn."
                    />
                  </div>
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection animation="scale-in">
            <div className="glass-panel p-8 md:p-12 border-[#7dd87d]/20">
              <SeedOfLifeIcon className="w-12 h-12 text-[#7dd87d]/75 mx-auto mb-6" />
              <h2
                className="text-2xl md:text-4xl font-bold text-white mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to <span className="text-[#7dd87d]">Begin?</span>
              </h2>
              <p className="text-white/60 text-base md:text-lg mb-6 max-w-xl mx-auto">
                Season 2 applications are open now for September 2026. Applications take around 15 minutes.
                The team reviews every submission and follows up directly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/apply">
                  <Button
                    className="bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold px-8 py-4 text-lg h-auto"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    Apply for Next Season
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button
                    variant="outline"
                    className="border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#7dd87d]/10 font-bold px-8 py-4 text-lg h-auto"
                    style={{ fontFamily: "var(--font-accent)" }}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Join Next Session
                  </Button>
                </Link>
              </div>
            </div>
          </AnimatedSection>

      {/* Heal the Land Program */}
      <section id="heal-program" className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <AnimatedSection animation="fade-in">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 px-4 py-2 rounded-full mb-4 border border-[#d4a574]/30">
                <span className="text-lg">🌱</span>
                <span className="text-[#d4a574] font-medium text-sm uppercase tracking-wide">Ministry Program</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Heal the Land, <span className="text-[#7dd87d]">Heal Ourselves</span>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Host the program on your land. We build a custom civic coordination game for your local food system at no cost.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#0d2818]/75 backdrop-blur-sm border border-[#d4a574]/30 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="text-[#d4a574] font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>You Bring</h3>
                <ul className="space-y-2 text-white/85 text-sm">
                  <li className="flex items-start gap-2"><span className="text-[#d4a574]">+</span> Land and growing capacity</li>
                  <li className="flex items-start gap-2"><span className="text-[#d4a574]">+</span> Willingness to host community days</li>
                  <li className="flex items-start gap-2"><span className="text-[#d4a574]">+</span> Space for land residents (if capacity allows)</li>
                  <li className="flex items-start gap-2"><span className="text-[#d4a574]">+</span> Alignment with regenerative values</li>
                </ul>
              </div>
              <div className="bg-[#0d2818]/75 backdrop-blur-sm border border-[#7dd87d]/30 rounded-2xl p-6 shadow-lg shadow-black/20">
                <h3 className="text-[#7dd87d] font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>We Bring</h3>
                <ul className="space-y-2 text-white/85 text-sm">
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> Active community and spiritual container</li>
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> Stewardship labor from gardening day participants</li>
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> Free Game Building for your local food system</li>
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> Custom quest curriculum for your ecosystem</li>
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> $ReGen token rewards for contributors</li>
                  <li className="flex items-start gap-2"><span className="text-[#7dd87d]">+</span> Governance design and community onboarding</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Link href="/connect?path=land_project&program=heal-the-land">
                <Button size="lg" className="bg-[#d4a574] hover:bg-[#c49564] text-[#1a472a] font-bold rounded-xl" style={{ fontFamily: 'var(--font-accent)' }}>
                  Apply as a Land Project Partner
                </Button>
              </Link>
              <p className="text-white/65 text-xs mt-3">
                <Link href="/heal-the-land" className="text-[#7dd87d] hover:underline">Learn more about the program</Link>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.land.pages} blog={relatedContentMap.land.blog} />
        </div>
      </section>
      <StickyThumbCta
        href="/apply"
        label="Apply as a Land Partner"
        where="land_sticky_cta"
        page="/land"
      />
    </PageBackground>
    </HeroPageLoader>
  );
}
