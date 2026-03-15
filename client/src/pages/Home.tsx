/**
 * ReGen Civics Homepage - Biofi-style continuous background
 * Sections: Banner, Hero+Video, 4 Paths, Scarcity to Regeneration,
 * Who Are You, Stats, Fund+Game, Video Overview, Intro Videos, Newsletter, Footer
 * Mobile-first, enchanted forest aesthetic with glass panels
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useEffect } from "react";
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
import { PageWrapper } from "@/components/PageWrapper";

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
    accentColor: "#fbbf24",
    image: "https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png",
    activatedImage: "https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png",
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
    image: "https://assets.regencivics.earth/yqqImtZyZVyKlZyO.png",
    activatedImage: "https://assets.regencivics.earth/mgXrrAJIIHwfFWah.png",
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
    accentColor: "#60a5fa",
    image: "https://assets.regencivics.earth/xlNRfxzajiAdMyaP.png",
    activatedImage: "https://assets.regencivics.earth/HQpqacLKyIAkXOdS.png",
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
    accentColor: "#c084fc",
    image: "https://assets.regencivics.earth/LAizfmKwiZguwYMz.png",
    activatedImage: "https://assets.regencivics.earth/qDmGFHBsFPyCECbM.png",
  },
];

// Data-driven insight cards (from research sources)
const insightCards = [
  {
    icon: Globe,
    title: "Can't Keep Building This Way",
    lede: 'By 2050, 3.1 billion new urban dwellers will need homes.',
    body: 'If we reach 9.8 billion people, we\'ll need the equivalent of <a href="https://www.un.org/sustainabledevelopment/sustainable-consumption-production/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#a3e635]">almost 3 planets</a> worth of natural resources. Projects demonstrating a new way of building human settlements need support now.',
    borderColor: "border-white/20",
  },
  {
    icon: TrendingUp,
    title: "$10.1 Trillion Opportunity",
    lede: 'Nature-positive transitions could unlock $10.1 trillion in business value by 2030.',
    body: 'Nature-positive transitions could unlock <a href="https://www.weforum.org/stories/2024/07/theres-10-1-trillion-in-nature-positive-transition-heres-how-we-unlock-it/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#a3e635]">$10.1 trillion in business value</a> by 2030 and create 395 million jobs. Regenerative development is where the capital is flowing.<br/><br/><span class="text-white/50 text-xs">Source: World Economic Forum / PwC, 2024</span>',
    borderColor: "border-[#7dd87d]/30",
  },
  {
    icon: Leaf,
    title: "We're Here to Support the Transition",
    lede: 'Thousands of regenerative land projects are pioneering new ways to live.',
    body: 'Yet most <a href="https://www.ic.org/sky-blue-where-do-we-go-from-here/" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-[#a3e635]">lack the support systems</a> to reach their full potential. ReGen Civics builds the <span class="text-[#7dd87d] font-semibold">connective tissue</span> linking these projects to capital, governance, and each other so <span class="text-[#7dd87d] font-semibold">we can thrive together</span>.<br/><br/>The infrastructure for systemic regeneration.',
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
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload, { timeout: 3000 });
    } else {
      setTimeout(preload, 2000);
    }
  }, []);
  const userCardId = userProfile?.path ? PATH_TO_CARD_ID[userProfile.path] : null;
  
  const bgImage = "https://assets.regencivics.earth/YPVdYWGRrdEquJbO.webp";
  const mobileBgImage = "https://assets.regencivics.earth/uoYdLjIIoDZIndLO.webp";

  return (
    <PageWrapper>
    <PageBackground
      backgroundImage={bgImage}
      mobileBackgroundImage={mobileBgImage}
      blurPlaceholder="https://assets.regencivics.earth/BgSdISTWNrtyvPRw.webp"
      mobileBlurPlaceholder="https://assets.regencivics.earth/hgJmIPplQaQKSPKg.webp"
      overlayOpacity={0.55}
      theme="forest"
      blendColor="18, 45, 28"
      scrollWithPage={true}
      sectionOverlays={[
        { id: "hero", opacity: 0.35 },           // Hero - let image detail show through
        { id: "four-paths", opacity: 0.55 },      // Four Paths cards - moderate
        { id: "scarcity", opacity: 0.50 },         // Scarcity to Regeneration - let art show
        { id: "who-are-you", opacity: 0.60 },      // Who Are You - needs text readability
        { id: "fund-game", opacity: 0.55 },        // Fund + Game overview
        { id: "newsletter", opacity: 0.65 },       // Newsletter/Footer - stronger for contrast
      ]}
    >
      <SEO {...pageSEO.home} />
      <JsonLD data={schemas.organization()} />
      <JsonLD data={schemas.website()} />

      {/* Editable Banner */}
      <BannerDisplay bannerKey="main-banner" />
      
      {/* Progressive Onboarding: Return visitors see quick path selector */}
      {isReturnVisitor && !showFullPage ? (
        <ImagePreloader>
          <div className="relative">
            <ProgressiveOnboarding onShowFullPage={() => setShowFullPage(true)} />
          </div>
        </ImagePreloader>
      ) : (
      <div className="relative">
        {/* Fund Launch Announcement Banner */}
        <div className="bg-gradient-to-r from-[#7dd87d] via-[#4a9f4a] to-[#7dd87d] text-[#1a472a] py-3 px-4 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNiw3MSw0MiwwLjEpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm sm:text-base font-semibold">
            <span className="flex items-center gap-2">
              <span className="animate-pulse">🌱</span>
              <span>Fund Launches Late 2026 &mdash; Accepting Letters of Intent Now</span>
            </span>
            <span className="hidden sm:inline">|</span>
            <div className="flex items-center gap-3">
              <Link href="/investor" className="underline hover:no-underline font-bold flex items-center gap-1">
                Investor Info <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-[#1a472a]/60">or</span>
              <Link href="/seasons" className="underline hover:no-underline font-bold">
                Apply for Season 3
              </Link>
            </div>
          </div>
        </div>

        {/* Welcome Short Intro Video */}
        <section className="relative py-10 md:py-14">
          <div className="container max-w-4xl">
            <AnimatedSection animation="fade-in">
              <VideoPreviewCard
                mp4Url="/images/clip-01-welcome.mp4"
                title="Welcome to the Regenerative Renaissance"
                playLabel="Watch Full Video"
                comingSoon
              />
            </AnimatedSection>
          </div>
        </section>

        {/* Hero Section with Video */}
        <section className="relative min-h-[60vh] flex items-center py-12 md:py-16">
          <div className="container">
            <AnimatedSection animation="fade-in" className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h1
                  className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white leading-tight text-shadow-strong"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  <span className="text-[#7dd87d]">ReGen</span> Civics
                </h1>
                <p
                  className="text-white/90 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto mb-8 text-shadow-subtle leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  A venture fund and alliance helping regenerative land projects grow their
                  economies, attract investment, and build thriving communities.
                </p>
              </div>

              {/* Video Section - Autoplay on scroll */}
              <AutoplayVideo
                videoId="_LO2sItSofo"
                title="ReGen Civics - 4 Paths to Play"
                thumbnailUrl="https://assets.regencivics.earth/nAJFMAHKUducxpdN.jpg"
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
                Choose your role in the regenerative renaissance
              </p>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pathCards.map((card, index) => (
                <AnimatedSection
                  key={card.id}
                  animation="slide-up"
                  delay={index * 100}
                >
                  <Link href={card.href}>
                    <div
                      className={`glass-panel p-6 h-full group hover:scale-105 transition-all duration-300 ${card.borderColor} ${card.glowColor} relative ${card.id === 'ally' ? 'overflow-visible' : 'overflow-hidden'} ${userCardId === card.id ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}`}
                      style={userCardId === card.id ? { '--tw-ring-color': card.accentColor } as React.CSSProperties : undefined}
                    >
                      {/* "Your Path" badge for logged-in users */}
                      {userCardId === card.id && (
                        <div
                          className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: card.accentColor, color: "#1a1a1a" }}
                        >
                          Your Path
                        </div>
                      )}
                      {/* Card illustration with hover animation */}
                      <div className="mb-4">
                        <PathCardImage
                          cardId={card.id as "fund" | "land" | "ally" | "play"}
                          image={card.image}
                          activatedImage={card.activatedImage}
                          title={card.title}
                          accentColor={card.accentColor}
                        />
                      </div>
                      <h3
                        className="text-xl font-bold text-white mb-2"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {card.title}
                      </h3>
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
                        {card.tagline}
                      </p>
                      <p className="text-white/70 text-sm mb-4 leading-relaxed">
                        {card.description}
                      </p>
                      <div className="flex items-center text-sm font-semibold group-hover:gap-2 transition-all">
                        <span style={{ color: card.accentColor }}>{card.cta}</span>
                        <ArrowRight className="w-4 h-4 ml-1" style={{ color: card.accentColor }} />
                      </div>
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
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

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
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

            {/* WEF Quote */}
            <AnimatedSection animation="fade-in" delay={500}>
              <div className="max-w-4xl mx-auto text-center">
                <blockquote className="text-white/90 text-base md:text-lg lg:text-xl italic leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                  "Over half [sic ALL] of global GDP depends on nature. Investing in regeneration is not charity, it is the most strategic allocation of capital in our lifetime."
                </blockquote>
                <p className="text-white/50 text-xs md:text-sm mt-3">
                  - Adapted from{" "}
                  <a
                    href="https://www.weforum.org/stories/2024/07/theres-10-1-trillion-in-nature-positive-transition-heres-how-we-unlock-it/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7dd87d]/70 underline hover:text-[#7dd87d]"
                  >
                    World Economic Forum
                  </a>{" "}
                  research ($44T+ in nature-dependent GDP)
                </p>
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
                src="https://assets.regencivics.earth/zfElEQNBAtFioaGj.jpg"
                alt="Impact metrics: Acres under regeneration, community members supported, biodiversity restored"
                width={1200}
                height={675}
                className="hidden md:block w-full rounded-xl shadow-2xl"
                loading="lazy"
                decoding="async"
              />
              {/* Mobile version - portrait layout optimized for phone screens */}
              <img
                src="https://assets.regencivics.earth/FfLefvCNHfDcTYUt.png"
                alt="Impact metrics: Acres under regeneration, community members supported, biodiversity restored"
                width={800}
                height={1200}
                className="block md:hidden w-full rounded-xl shadow-2xl"
                loading="lazy"
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
                className="text-white/80 text-base md:text-lg max-w-2xl mx-auto text-shadow-subtle"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Two legally distinct yet interconnected ways to participate in the regenerative movement
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
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
                      <Button className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-base py-3 h-auto">
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
                      <Button className="w-full rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] text-base py-3 h-auto">
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
                  Both spaces work together to grow our regenerative renaissance
                </p>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="relative py-12 md:py-16">
          <div className="container max-w-2xl">
            <AnimatedSection animation="fade-in">
              <div className="glass-panel p-8 md:p-10 text-center border-[#7dd87d]/20">
                <Leaf className="w-12 h-12 text-[#7dd87d] mx-auto mb-4" />
                <p className="text-white/70 mb-6 text-base">
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
  );
}
