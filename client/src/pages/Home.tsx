/**
 * ReGen Civics Homepage - Biofi-style continuous background
 * Sections: Banner, Hero+Video, 4 Paths, Scarcity to Regeneration,
 * Who Are You, Stats, Fund+Game, Video Overview, Intro Videos, Newsletter, Footer
 * Mobile-first, enchanted forest aesthetic with glass panels
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { HeroPageLoader } from "@/components/HeroPageLoader";
import {
  ArrowRight,
  Coins,
  Sprout,
  Handshake,
  Leaf,
  Heart,
  Target,
  Users,
  Building,
  Globe,
  TrendingUp,
  Shield,
  Network,
  Sparkles,
  Eye,
  ChevronDown,
} from "lucide-react";
import PageBackground from "@/components/PageBackground";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AnimatedSection } from "@/components/AnimatedSection";
import { HeroTypewriter } from "@/components/HeroTypewriter";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import NewsletterSignup from "@/components/NewsletterSignup";
import { SocialLinks } from "@/components/SocialLinks";

import { SEO, pageSEO } from "@/components/SEO";
import { JsonLD, schemas } from "@/components/JsonLD";
import { PathCardImage } from "@/components/PathCardImage";
import "@/components/PathCardImage.css";
import AutoplayVideo from "@/components/AutoplayVideo";
import VideoPreviewCard from "@/components/VideoPreviewCard";
import HowItWorks from "@/components/HowItWorks";
import { ProgressiveOnboarding, useIsReturnVisitor } from "@/components/ProgressiveOnboarding";
import { BannerDisplay } from "@/components/BannerDisplay";
import { ImagePreloader } from "@/components/ImagePreloader";
import { trpc } from "@/lib/trpc";
import { analytics } from "@/lib/analytics";
import { PageWrapper } from "@/components/PageWrapper";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { cdnImg } from "@/lib/utils";
import { AmbientParticles } from "@/components/AmbientParticles";
import { ReadableScrim } from "@/components/ReadableScrim";

// Path card data
const pathCards = [
  {
    id: "fund",
    title: "Investors",
    tagline: "Fund the Renaissance",
    description:
      "Land-backed investments in systemic regeneration. Your capital heals land, builds communities, and generates healthy returns.",
    cta: "Explore the Fund",
    href: "/fund",
    icon: Coins,
    borderColor: "border-amber-400/40",
    glowColor: "shadow-amber-400/20",
    iconBg: "bg-amber-400/20",
    iconColor: "text-amber-300",
    accentColor: "#d4a574",
    image: cdnImg("https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png", 480, 75),
    activatedImage: cdnImg("https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png", 480, 75),
  },
  {
    id: "land",
    title: "Land Projects",
    tagline: "Evolve Your Project",
    description:
      "Create or evolve your Game, access expertise, and join a global network to transform your land project into a regenerative community.",
    cta: "Explore Land Project Path",
    href: "/land",
    icon: Sprout,
    borderColor: "border-[#7dd87d]/40",
    glowColor: "shadow-[#7dd87d]/20",
    iconBg: "bg-[#7dd87d]/20",
    iconColor: "text-[#7dd87d]",
    accentColor: "#7dd87d",
    image: cdnImg("https://assets.regencivics.earth/yqqImtZyZVyKlZyO.png", 480, 75),
    activatedImage: cdnImg("https://assets.regencivics.earth/mgXrrAJIIHwfFWah.png", 480, 75),
  },
  {
    id: "ally",
    title: "Alliance Partners",
    tagline: "Join the Alliance",
    description:
      "Organizations supporting regenerative land projects with infrastructure, services, tools, expertise and more.",
    cta: "Explore Alliance Path",
    href: "/ally",
    icon: Handshake,
    borderColor: "border-blue-400/40",
    glowColor: "shadow-blue-400/20",
    iconBg: "bg-blue-400/20",
    iconColor: "text-blue-300",
    accentColor: "#7dd87d",
    image: cdnImg("https://assets.regencivics.earth/xlNRfxzajiAdMyaP.png", 480, 75),
    activatedImage: cdnImg("https://assets.regencivics.earth/HQpqacLKyIAkXOdS.png", 480, 75),
  },
  {
    id: "play",
    title: "ReGen Game Players",
    tagline: "Play the Game",
    description:
      "Earn tokens, complete quests, and contribute to regenerative projects. Open to everyone co-evolved by the Players!",
    cta: "Explore the Game",
    href: "/play",
    icon: Globe,
    borderColor: "border-purple-400/40",
    glowColor: "shadow-purple-400/20",
    iconBg: "bg-purple-400/20",
    iconColor: "text-purple-300",
    accentColor: "#7dd87d",
    image: cdnImg("https://assets.regencivics.earth/LAizfmKwiZguwYMz.png", 480, 75),
    activatedImage: cdnImg("https://assets.regencivics.earth/qDmGFHBsFPyCECbM.png", 480, 75),
  },
];

// Data-driven insight cards (from research sources)
const insightCards = [
  {
    icon: Globe,
    title: "Can't Keep Building This Way",
    lede: 'By 2050, 3.1 billion new urban dwellers will need homes.',
    body: 'If we reach 9.8 billion people, we\'ll need the equivalent of <a href="https://www.un.org/sustainabledevelopment/sustainable-consumption-production/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#9de89d]">almost 3 planets</a> worth of natural resources. Projects demonstrating a new way of building human settlements need support now.',
    borderColor: "border-white/20",
  },
  {
    icon: TrendingUp,
    title: "$10.1 Trillion Opportunity",
    lede: 'Nature-positive transitions could generate $10.1 trillion in business value by 2030.',
    body: 'Nature-positive transitions could generate <a href="https://www.weforum.org/stories/2024/07/theres-10-1-trillion-in-nature-positive-transition-heres-how-we-unlock-it/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#9de89d]">$10.1 trillion in business value</a> by 2030 and create 395 million jobs. Regenerative development is where the capital is flowing.<br/><br/><span class="text-white/75 text-xs">Source: World Economic Forum / PwC, 2024</span>',
    borderColor: "border-[#7dd87d]/30",
  },
  {
    icon: Leaf,
    title: "We're Here to Support the Transition",
    lede: 'Thousands of regenerative land projects are pioneering new ways to live.',
    body: 'Yet most <a href="https://www.ic.org/sky-blue-where-do-we-go-from-here/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#9de89d]">lack the support systems</a> to reach their full potential. ReGen Civics builds the <span class="text-[#7dd87d] font-semibold">connective tissue</span> linking these projects to capital, governance, and each other so <span class="text-[#7dd87d] font-semibold">we can thrive together</span>.<br/><br/>The infrastructure for systemic regeneration.',
    borderColor: "border-white/20",
  },
];


// Maps userProfile.path values to pathCards ids
const PATH_TO_CARD_ID: Record<string, string> = {
  investor: "fund",
  land_project: "land",
  ally: "ally",
  player: "play",
};

export default function Home() {
  const { user, loading } = useAuth();
  const [fundOpen, setFundOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  // Track which 2x2 path card has its "More" panel open (only one at a time)
  // so the full-grid first-time-visitor view matches the compact returning-
  // visitor pattern from ProgressiveOnboarding.
  const [expandedPathCard, setExpandedPathCard] = useState<string | null>(null);
  const isReturnVisitor = useIsReturnVisitor();
  const [showFullPage, setShowFullPage] = useState(false);

  const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });

  // Fix 109 Step 7: idle-preload most likely next routes after home page settles
  useEffect(() => {
    const preload = () => {
      import('./Quest');
      import('./Community');
      import('./Play');
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preload, { timeout: 3000 });
    } else {
      setTimeout(preload, 2000);
    }
  }, []);
  const userCardId = userProfile?.path ? PATH_TO_CARD_ID[userProfile.path] : null;
  
  const bgImage = "/images/backgrounds/home-desktop.webp?v=14";
  const mobileBgImage = "/images/backgrounds/home-mobile.webp?v=14";
  const heroImages = useMemo(() => [bgImage, mobileBgImage], [bgImage, mobileBgImage]);

  return (
    <HeroPageLoader images={heroImages} dataLoading={loading}>
    <PageWrapper>
    <PageBackground
      backgroundImage={bgImage}
      mobileBackgroundImage={mobileBgImage}
      blurPlaceholder="/images/backgrounds/home-desktop.webp?v=14"
      mobileBlurPlaceholder="/images/backgrounds/home-mobile.webp?v=14"
      overlayOpacity={0}
      theme="cosmos-forest"
      blendColor="18, 45, 28"
      scrollWithPage={true}
      backgroundFit="tile-vertical"
      glassOverlay={0.22}
      sectionOverlays={[
        { id: "hero", opacity: 0 },
        { id: "four-paths", opacity: 0 },
        { id: "scarcity", opacity: 0 },
        { id: "who-are-you", opacity: 0 },
        { id: "fund-game", opacity: 0 },
        { id: "newsletter", opacity: 0 },
      ]}
    >
      <SEO {...pageSEO.home} breadcrumbs={[{ name: "Home", url: "/" }]} />
      {/* Brand entity structured data for search (Organization + WebSite). */}
      <JsonLD data={schemas.organization()} />
      <JsonLD data={schemas.website()} />

      {/* Editable Banner */}
      <BannerDisplay bannerKey="main-banner" />
      
      {/* Progressive Onboarding: 4-paths card selector. Shows to every
          logged-out visitor (so first-time + returning both see the same
          card-driven entry point) and to returning logged-in visitors who
          haven't dismissed the onboarding. The full landing page is one
          tap away via "View Full Landing Page" inside ProgressiveOnboarding. */}
      {(isReturnVisitor || !user) && !showFullPage ? (
        <ImagePreloader>
          <div className="relative">
            <ProgressiveOnboarding onShowFullPage={() => setShowFullPage(true)} />
          </div>
        </ImagePreloader>
      ) : (
      <div className="relative">
        {/* Fund Launch Announcement Banner */}
        <BannerDisplay
          bannerKey="fund-launch-banner"
          className="bg-gradient-to-r from-[#7dd87d] via-[#4a7c59] to-[#7dd87d] text-[#1a472a] py-3 px-4 text-center"
        />

        {/* Hero Title */}
        <section className="relative pt-16 md:pt-24 pb-4 md:pb-6">
          <AmbientParticles />
          <div className="container relative z-10 max-w-5xl">
            <AnimatedSection animation="fade-in">
              <div className="text-center">
                <h1
                  className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-8 md:mb-10 leading-[1.02] tracking-tight"
                  style={{
                    fontFamily: "var(--font-display)",
                    filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.85)) drop-shadow(0 2px 6px rgba(0,0,0,0.7))",
                  }}
                >
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #b8f0b8 0%, #7dd87d 30%, #f7d27a 55%, #9de89d 80%, #4a7c59 100%)",
                      WebkitTextStroke: "0.5px rgba(157,232,157,0.25)",
                    }}
                  >
                    ReGen
                  </span>{" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #ffffff 0%, #fff7dc 45%, #f7d27a 100%)",
                    }}
                  >
                    Civics
                  </span>
                </h1>
                <HeroTypewriter
                  className="block text-white text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto leading-[1.5] safe-prose font-light"
                  style={{
                    fontFamily: "var(--font-body)",
                    textShadow:
                      "0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.85), 0 0 22px rgba(0,0,0,0.55)",
                    minHeight: "6em",
                  }}
                  durationMs={4500}
                  startDelayMs={900}
                  segments={[
                    { text: "A " },
                    { text: "venture fund", className: "font-medium text-amber-200" },
                    { text: " and " },
                    { text: "alliance", className: "font-medium text-amber-200" },
                    { text: " helping " },
                    {
                      text: "regenerative land projects",
                      className: "font-medium text-[#9de89d]",
                    },
                    {
                      text:
                        " pool resources, grow their economies, attract investment, and co-create ",
                    },
                    {
                      text: "thriving communities",
                      className: "font-medium text-[#9de89d]",
                    },
                    { text: "." },
                  ]}
                />
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Welcome Short Intro Video */}
        <section className="relative py-8 md:py-12">
          <div className="container max-w-4xl">
            <AnimatedSection animation="fade-in">
              <AutoplayVideo
                videoId="G-6ZpxvZ3qM"
                title="Welcome to the ReGenerative Renaissance"
                thumbnailUrl="/images/clip-01-poster.webp"
                thumbnailAlt="Welcome to the ReGenerative Renaissance"
              />
            </AnimatedSection>
          </div>
        </section>

        {/* Mission Description: one parchment band per breakpoint.
             Desktop (md+) uses the original landscape village-map-scroll
             as a single wide map with all the copy centered inside it.
             Mobile uses a new portrait parchment (9:16) tall enough to
             hold all three text blocks comfortably, split across the
             height so nothing gets cropped on small screens. */}
        <section className="relative py-10 md:py-14">
          <div className="container max-w-6xl">
            <AnimatedSection animation="fade-in">
              {/* Desktop band: single landscape map */}
              <div className="hidden md:block max-w-6xl mx-auto">
                <div className="relative w-full overflow-hidden rounded-2xl shadow-xl">
                  <img
                    aria-hidden="true"
                    src="/images/village-map-scroll.webp?v=5"
                    alt=""
                    className="w-full h-auto block"
                    style={{
                      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center px-8 lg:px-12">
                    <ReadableScrim block className="max-w-2xl text-center space-y-4 py-5">
                      <p
                        className="text-white text-lg leading-relaxed"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        <span className="text-[#9de89d] font-bold">regen-civics</span>{" "}
                        is a fund and an in-real-life game for supporting
                        regenerative land projects and the{" "}
                        <span className="text-[#f5b942] font-bold italic">
                          ReGenerative Renaissance
                        </span>{" "}
                        <span className="text-white/90">
                          (a movement to heal ourselves, our earth, our communities,
                          and our bioregions).
                        </span>
                      </p>
                      <p
                        className="text-white text-lg leading-relaxed"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        We create quests and{" "}
                        <span className="text-[#f5b942] font-bold italic">
                          Infinite Games
                        </span>{" "}
                        that help people heal, and in doing so build new financial,
                        economic, and governance systems that support and network
                        land projects across our movement.
                      </p>
                      <p
                        className="text-[#f5b942] font-bold text-xl tracking-[0.01em]"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        Welcome to the Infinite Game.
                      </p>
                    </ReadableScrim>
                  </div>
                </div>
              </div>

              {/* Mobile band: portrait parchment, text inside a single
                  centered scrim so every line stays legible against the
                  hand-drawn art. */}
              <div className="md:hidden max-w-md mx-auto">
                <div className="relative w-full overflow-hidden rounded-2xl shadow-xl">
                  <img
                    aria-hidden="true"
                    src="/images/village-map-scroll-portrait.webp"
                    alt=""
                    className="w-full h-auto block"
                    style={{
                      filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <ReadableScrim block className="w-full text-center space-y-3 py-4">
                      <p
                        className="text-white text-sm leading-relaxed"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        <span className="text-[#9de89d] font-bold">regen-civics</span>{" "}
                        is a fund and an in-real-life game for supporting
                        regenerative land projects and the{" "}
                        <span className="text-[#f5b942] font-bold italic">
                          ReGenerative Renaissance
                        </span>{" "}
                        <span className="text-white/90">
                          (a movement to heal ourselves, our earth, our communities,
                          and our bioregions).
                        </span>
                      </p>
                      <p
                        className="text-white text-sm leading-relaxed"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        We create quests and{" "}
                        <span className="text-[#f5b942] font-bold italic">
                          Infinite Games
                        </span>{" "}
                        that help people heal, and in doing so build new financial,
                        economic, and governance systems that support and network
                        land projects across our movement.
                      </p>
                      <p
                        className="text-[#f5b942] font-bold text-base tracking-[0.01em]"
                        style={{
                          fontFamily:
                            "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', ui-serif, serif",
                        }}
                      >
                        Welcome to the Infinite Game.
                      </p>
                    </ReadableScrim>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* 4 Paths Video */}
        <section className="relative py-8 md:py-12">
          <div className="container max-w-5xl">
            <AnimatedSection animation="fade-in">
              <AutoplayVideo
                videoId="_LO2sItSofo"
                title="ReGen Civics - 4 Paths to Play"
                thumbnailUrl={cdnImg("https://assets.regencivics.earth/nAJFMAHKUducxpdN.jpg")}
                thumbnailAlt="4 Paths to Play - Investors, Land Projects, Alliance Organisations, ReGen Players"
              />
            </AnimatedSection>
          </div>
        </section>

        {/* 4 Paths to Play */}
        <section className="relative py-12 md:py-16">
          <div className="container">
            <AnimatedSection animation="fade-in" className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Four Paths to Play
              </h2>
              <p
                className="text-white/80 text-base md:text-lg max-w-2xl mx-auto text-shadow-subtle"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Choose your path in the Infinite Game
              </p>
            </AnimatedSection>

            {/* Compact 2x2 path-card grid. Matches the returning-visitor
                pattern from ProgressiveOnboarding: full-bleed character
                art at top, title + uppercase tagline, "Go ->" tap target,
                and a "More" expander that reveals the long description
                without leaving the page. Long-form copy is hidden by
                default so the page reads at a glance on mobile. */}
            <div className="mycelium-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {pathCards.map((card, index) => {
                const isExpanded = expandedPathCard === card.id;
                const isYourPath = userCardId === card.id;
                return (
                  <AnimatedSection
                    key={card.id}
                    animation="slide-up"
                    delay={index * 100}
                  >
                    <div
                      className={`mycelium-card card-tilt glass-panel p-4 md:p-5 h-full transition-all duration-300 ${card.borderColor} ${card.glowColor} relative ${card.id === 'ally' ? 'overflow-visible' : 'overflow-hidden'} ${isYourPath ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}`}
                      style={isYourPath ? { '--tw-ring-color': card.accentColor } as React.CSSProperties : undefined}
                    >
                      {isYourPath && (
                        <span
                          className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full z-10"
                          style={{ backgroundColor: card.accentColor, color: "#1a1a1a" }}
                        >
                          Your Path
                        </span>
                      )}

                      <Link
                        href={card.href}
                        className="block group hover:scale-[1.02] transition-transform duration-300"
                      >
                        <div className="mb-4">
                          <PathCardImage
                            cardId={card.id as "fund" | "land" | "ally" | "play"}
                            image={card.image}
                            activatedImage={card.activatedImage}
                            title={card.title}
                            accentColor={card.accentColor}
                            forceActivated={isExpanded}
                          />
                        </div>

                        <h3
                          className="text-base md:text-lg font-bold text-white mb-1"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {card.title}
                        </h3>
                        <p className="text-white/80 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2">
                          {card.tagline}
                        </p>
                        <div className="flex items-center text-xs md:text-sm font-semibold mt-2 group-hover:gap-1 transition-all">
                          <span style={{ color: card.accentColor }}>Go</span>
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" style={{ color: card.accentColor }} />
                        </div>
                      </Link>

                      {/* Desktop (md+) always shows the description inline,
                          no collapsible. Mobile keeps the More/Less toggle
                          so the grid stays scannable on small screens. */}
                      <div className="hidden md:block mt-3 pt-3 border-t border-white/15">
                        <p className="text-white/85 text-sm leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedPathCard(isExpanded ? null : card.id)}
                        aria-expanded={isExpanded}
                        className="md:hidden mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/65 hover:text-white transition-colors"
                      >
                        <ChevronDown
                          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          style={{ color: card.accentColor }}
                        />
                        {isExpanded ? "Less" : "More"}
                      </button>

                      {isExpanded && (
                        <div className="md:hidden mt-3 pt-3 border-t border-white/15">
                          <p className="text-white/85 text-xs leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </AnimatedSection>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works - Interactive flow */}
        <HowItWorks />

        {/* From Scarcity to Regeneration - Data-driven insight cards */}
        <section className="relative py-12 md:py-16">
          <div className="container">
            <AnimatedSection animation="fade-in" className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                From Scarcity to Regeneration
              </h2>
              <p
                className="text-white/80 text-base md:text-lg max-w-3xl mx-auto text-shadow-subtle"
                style={{ fontFamily: "var(--font-body)" }}
              >
                The data is clear: regeneration is both urgent and economically compelling
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
              {insightCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <AnimatedSection key={idx} animation="fade-in" delay={idx * 150}>
                    <Collapsible>
                      <div className={`glass-panel p-5 md:p-6 ${card.borderColor} h-full`}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#7dd87d]" />
                          </div>
                          <h3
                            className="text-lg md:text-xl font-bold text-[#7dd87d]"
                            style={{ fontFamily: "var(--font-display)" }}
                          >
                            {card.title}
                          </h3>
                        </div>
                        <p className="text-white/90 text-sm md:text-base leading-relaxed mb-3" style={{ fontFamily: "var(--font-body)" }}>
                          {card.lede}
                        </p>
                        <CollapsibleTrigger className="flex items-center gap-1 text-[#7dd87d]/80 text-xs hover:text-[#7dd87d] transition-colors cursor-pointer">
                          <ChevronDown className="w-4 h-4" />
                          <span>Read more</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div
                            className="mt-3 pt-3 border-t border-white/10 text-white/70 text-sm leading-relaxed"
                            style={{ fontFamily: "var(--font-body)" }}
                          >
                            {card.body}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </AnimatedSection>
                );
              })}
            </div>

            {/* WEF Quote: wrapped in ReadableScrim so the attribution
                line stops washing out against the earth-from-space hero
                image. Quote text already had some scrim before; the
                attribution did not. Now both share the same backing. */}
            <AnimatedSection animation="fade-in" delay={500}>
              <div className="max-w-3xl mx-auto text-center">
                <ReadableScrim block className="mx-auto">
                  <blockquote className="text-white text-base md:text-lg lg:text-xl italic leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                    "Over half [sic ALL] of global GDP depends on nature. Investing in regeneration is not charity, it is the most strategic allocation of capital in our lifetime."
                  </blockquote>
                  <p className="text-white/90 text-xs md:text-sm mt-3">
                    - Adapted from{" "}
                    <a
                      href="https://www.weforum.org/stories/2024/07/theres-10-1-trillion-in-nature-positive-transition-heres-how-we-unlock-it/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#9de89d] underline hover:text-white"
                    >
                      World Economic Forum
                    </a>{" "}
                    research ($44T+ in nature-dependent GDP)
                  </p>
                </ReadableScrim>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* What We Value */}
        <section className="relative py-12 md:py-16">
          <div className="container max-w-4xl">
            <AnimatedSection animation="scale-in" className="mt-8 mb-6">
              <div className="text-center mb-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel-light text-[#7dd87d] text-base font-semibold">
                  <Eye className="w-5 h-5" />
                  What We Value
                </span>
              </div>
              {/* Desktop version - landscape layout */}
              <img
                src={cdnImg("https://assets.regencivics.earth/zfElEQNBAtFioaGj.jpg")}
                alt="Impact metrics: Acres under regeneration, community members supported, biodiversity restored"
                width={1200}
                height={675}
                className="hidden md:block w-full rounded-xl shadow-2xl"
                loading="eager"
                decoding="async"
              />
              {/* Mobile version - portrait layout optimized for phone screens */}
              <img
                src={cdnImg("https://assets.regencivics.earth/FfLefvCNHfDcTYUt.png")}
                alt="Impact metrics: Acres under regeneration, community members supported, biodiversity restored"
                width={800}
                height={1200}
                className="block md:hidden w-full rounded-xl shadow-2xl"
                loading="eager"
                decoding="async"
              />
            </AnimatedSection>
          </div>
        </section>


        {/* Two Paths, One Vision */}
        <section className="relative py-12 md:py-16">
          <div className="container max-w-5xl">
            <AnimatedSection animation="fade-in" className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-shadow-strong"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Two Spaces, One Vision
              </h2>
              <p
                className="text-white/80 text-base md:text-lg max-w-2xl mx-auto text-shadow-subtle safe-prose"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Two legally distinct yet interconnected ways to participate in the regenerative movement
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Venture Fund - Collapsible */}
              <AnimatedSection animation="slide-up" delay={100}>
                <Collapsible open={fundOpen} onOpenChange={setFundOpen}>
                  <div className="glass-panel p-6 md:p-8 h-full group border-amber-400/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">
                          ReGen Civics Fund
                        </span>
                        <h3
                          className="text-2xl md:text-3xl font-bold text-white"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Venture Fund
                        </h3>
                      </div>
                    </div>

                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left mb-4">
                        <p className="text-white/80 text-base md:text-lg leading-relaxed flex items-center justify-between">
                          <span>
                            A venture fund centered around an alliance of land projects and the organizations
                            that support them.
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-amber-400 flex-shrink-0 ml-2 transition-transform ${
                              fundOpen ? "rotate-180" : ""
                            }`}
                          />
                        </p>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <p className="text-white/70 text-sm mb-6 leading-relaxed">
                        We run regular accelerators to support land projects in their journey toward regeneration.
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <Network className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-base">Highly curated alliance of regenerative land projects</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <Sprout className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-base">Regular accelerator programs</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-base">Support organizations & resources</span>
                        </div>
                      </div>
                    </CollapsibleContent>

                    <Link href="/seasons">
                      <Button className="w-full rounded-xl breathing-cta bg-gradient-to-r from-[#7dd87d] to-[#9de89d] text-[#1a472a] text-base py-3 h-auto font-bold">
                        Explore Seasons <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </Collapsible>
              </AnimatedSection>

              {/* Infinite Game - Collapsible */}
              <AnimatedSection animation="slide-up" delay={200}>
                <Collapsible open={gameOpen} onOpenChange={setGameOpen}>
                  <div className="glass-panel p-6 md:p-8 h-full group border-[#7dd87d]/20">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] flex items-center justify-center shadow-lg shadow-[#7dd87d]/30 group-hover:scale-110 transition-transform">
                        <SeedOfLifeIcon className="w-8 h-8 text-white" size={32} />
                      </div>
                      <div>
                        <span className="text-[#7dd87d] text-sm font-semibold uppercase tracking-wider">
                          The ReGen Game
                        </span>
                        <h3
                          className="text-2xl md:text-3xl font-bold text-white"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          Infinite Game
                        </h3>
                      </div>
                    </div>

                    <CollapsibleTrigger asChild>
                      <button className="w-full text-left mb-4">
                        <p className="text-white/80 text-base md:text-lg leading-relaxed flex items-center justify-between">
                          <span>
                            What if humanity can meet all our needs and more through productive play?
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-[#7dd87d] flex-shrink-0 ml-2 transition-transform ${
                              gameOpen ? "rotate-180" : ""
                            }`}
                          />
                        </p>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <p className="text-white/70 text-sm mb-6 leading-relaxed">
                        An infinite game that anyone can play to co-create regenerative civilizations.
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-[#7dd87d]" />
                          </div>
                          <span className="text-base">Open to everyone, everywhere</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-[#7dd87d]" />
                          </div>
                          <span className="text-base">Fun, fulfilling, & focused on increasing our capacity</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <div className="w-8 h-8 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                            <Target className="w-4 h-4 text-[#7dd87d]" />
                          </div>
                          <span className="text-base">Quest-based growth that heals ourselves & community</span>
                        </div>
                      </div>
                    </CollapsibleContent>

                    <Link href="/game">
                      <Button data-ripple className="w-full rounded-xl breathing-cta bg-gradient-to-r from-[#7dd87d] to-[#9de89d] text-[#1a472a] text-base py-3 h-auto font-bold">
                        Play the Game <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                  </div>
                </Collapsible>
              </AnimatedSection>
            </div>

            {/* Connection Message */}
            <AnimatedSection animation="fade-in" delay={300} className="text-center mt-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 glass-panel-light rounded-full">
                <Sparkles className="w-5 h-5 text-[#7dd87d]" />
                <p className="text-white/80 text-base md:text-lg">
                  Both spaces work together to grow our ReGenerative Renaissance
                </p>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Live Community Activity */}
        <section className="relative py-8 md:py-10">
          <div className="container max-w-2xl">
            <AnimatedSection animation="fade-in">
              <LiveActivityFeed />
            </AnimatedSection>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="relative py-12 md:py-16">
          <div className="container max-w-2xl">
            <AnimatedSection animation="fade-in">
              <div className="glass-panel p-8 md:p-10 text-center border-[#7dd87d]/20">
                <Leaf className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
                <p className="text-white/70 mb-6 text-base safe-prose">
                  Join our community newsletter for updates on new seasons, project spotlights, and opportunities to participate in the infinite game.
                </p>
                <NewsletterSignup />
              </div>
            </AnimatedSection>
          </div>
        </section>


      </div>
      )}
    </PageBackground>
    </PageWrapper>
    </HeroPageLoader>
  );
}
