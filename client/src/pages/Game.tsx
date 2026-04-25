/**
 * Game Page - ReGen Civics Infinite Game
 * Design: Enchanted Forest Storybook - playful, game-like
 * Content: Game mechanics, Voice tokens, ReGen tokens, and game philosophy
 */

import { useState, useEffect, useRef } from "react";
// State for Why Games dropdown
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ExternalLink, 
  Vote, 
  Coins, 
  BookOpen, 
  Users, 
  Heart, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Infinity, 
  Compass, 
  TreeDeciduous, 
  Sprout, 
  Zap, 
  Shield, 
  Play,
  ArrowRight,
  Star,
  Building2,
  Award,
  Globe,
  Layers,
  Gift,
  FileCheck,
  Wrench,
  Map,
  Lightbulb,
  Flame,
  Printer
} from "lucide-react";
import { Link } from "wouter";
import { ParallaxSection } from "@/components/ParallaxSection";
import { SocialLinks } from "@/components/SocialLinks";
import { AnimatedSection } from "@/components/AnimatedSection";
import { ViewportTriggeredVideo } from "@/components/ViewportTriggeredVideo";
import { SEO, pageSEO } from "@/components/SEO";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import AutoplayVideo from "@/components/AutoplayVideo";
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { pageCopy } from "@/data/pageCopy";
import { cdnImg } from "@/lib/utils";
import { Concept } from "@/components/Concept";
// Calculator moved to separate page at /calculator

// Game Way Card Component
function GameWayCard({ 
  icon: Icon, 
  title, 
  emoji,
  description, 
  linkTo, 
  linkText,
  external = false
}: { 
  icon: any; 
  title: string;
  emoji: string;
  description: string;
  linkTo: string;
  linkText: string;
  external?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border-2 border-[#1a472a]/10 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{emoji}</span>
        </div>
        <h3 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h3>
      </div>
      <p className="text-[#1a472a]/80 text-sm mb-4 leading-relaxed">
        {description}
      </p>
      {external ? (
        <a 
          href={linkTo}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[#4a7c59] font-semibold hover:text-[#7dd87d] transition-colors text-sm"
        >
          {linkText} <ExternalLink className="w-4 h-4" />
        </a>
      ) : (
        <Link 
          href={linkTo}
          className="inline-flex items-center gap-2 text-[#4a7c59] font-semibold hover:text-[#7dd87d] transition-colors text-sm"
        >
          {linkText} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// Token Info Card Component
function TokenInfoCard({ 
  iconSrc, 
  title, 
  subtitle,
  description, 
  features,
  color,
  ctaLink,
  ctaLabel
}: { 
  iconSrc: string; 
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: string;
  ctaLink?: string;
  ctaLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={`bg-white p-6 rounded-xl border-3 ${color} shadow-lg`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 flex-shrink-0">
          <img src={iconSrc} alt={title} className="w-full h-full object-contain" width={64} height={64} loading="lazy" />
        </div>
        <div>
          <h3 className="font-bold text-[#1a472a] text-xl" style={{ fontFamily: 'var(--font-display)' }}>
            {title}
          </h3>
          <p className="text-[#1a472a]/60 text-sm">{subtitle}</p>
        </div>
      </div>
      <p className="text-[#1a472a]/80 mb-4 leading-relaxed">
        {description}
      </p>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-[#4a7c59] font-semibold hover:text-[#7dd87d] transition-colors text-sm">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          How to Earn
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                <Sparkles className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      {ctaLink && (
        <Link href={ctaLink} className="inline-flex items-center gap-2 mt-4 text-[#4a7c59] font-semibold hover:text-[#7dd87d] transition-colors text-sm">
          {ctaLabel || 'Learn More'} <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// Philosophy Card Component
function PhilosophyCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-[#7dd87d]/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#1a472a]" />
        </div>
        <h4 className="font-bold text-[#7dd87d]" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h4>
      </div>
      <p className="text-white/80 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function TypewriterText({ className }: { className?: string }) {
  const fullText = "Let's explore how we can turn the transition into a growing diversity of Regenerative Civilizations into a real-world Game for players of all ages.";
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= fullText.length) return;
    const timer = setTimeout(() => {
      setDisplayed(fullText.slice(0, displayed.length + 1));
    }, 30);
    return () => clearTimeout(timer);
  }, [started, displayed]);

  // Highlight "Regenerative Civilizations" once fully typed
  const rcStart = fullText.indexOf("Regenerative Civilizations");
  const rcEnd = rcStart + "Regenerative Civilizations".length;

  const before = displayed.slice(0, Math.min(displayed.length, rcStart));
  const highlight = displayed.length > rcStart
    ? displayed.slice(rcStart, Math.min(displayed.length, rcEnd))
    : "";
  const after = displayed.length > rcEnd ? displayed.slice(rcEnd) : "";

  return (
    <p ref={ref} className={className}>
      {before}
      {highlight && <span className="font-semibold text-[#4a7c59]">{highlight}</span>}
      {after}
      {displayed.length < fullText.length && started && (
        <span className="inline-block w-0.5 h-5 bg-[#4a7c59] ml-0.5 animate-pulse align-middle" />
      )}
    </p>
  );
}

export default function Game() {
  const [whatIsGameOpen, setWhatIsGameOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [infiniteOpen, setInfiniteOpen] = useState(false);
  const [seedsOpen, setSeedsOpen] = useState(false);
  const [contribIntroOpen, setContribIntroOpen] = useState(false);
  const [whyGamesOpen, setWhyGamesOpen] = useState(false);
  const [tokenSystemOpen, setTokenSystemOpen] = useState(false);
  const [questDesignOpen, setQuestDesignOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f5f0]">
      <SEO {...pageSEO.game} breadcrumbs={[{ name: "Home", url: "/" }, { name: "The Game", url: "/game" }]} />
      
      {/* SEEDS Legacy Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4">
        <div className="container flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-center md:text-left">
          <span className="text-2xl">🌱</span>
          <p className="text-sm md:text-base font-medium">
            <strong>SEEDS Contributors:</strong> Your past investments can be recognized in the ReGen Game!
          </p>
          <a 
            href="#seeds-legacy" 
            className="text-xs md:text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors whitespace-nowrap"
          >
            Learn How →
          </a>
        </div>
      </div>

      {/* Video Introduction Section - Removed (exists on /play page) */}

      {/* Hero Section */}
      <ParallaxSection
        imageSrc="/backgrounds/game-seeds-intro-baked.webp"
        className="min-h-[60vh]"
        overlay="rgba(5, 28, 12, 0.72)"
      >
        <div className="container flex flex-col items-center justify-center h-full text-center px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#7dd87d]/20 rounded-full mb-6">
            <SeedOfLifeIcon className="w-5 h-5 text-[#7dd87d]" size={20} />
            <span className="text-[#7dd87d] font-semibold">{pageCopy.game.hero.badge}</span>
          </div>
          
          <h1
            className="ink-reveal text-4xl md:text-6xl font-bold text-white mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pageCopy.game.hero.heading}
          </h1>
          
          <p className="text-xl text-white/90 max-w-2xl mb-8 leading-relaxed">
            {pageCopy.game.hero.subtext}
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/quest">
              <Button
                size="lg"
                className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                {pageCopy.game.hero.cta}
              </Button>
            </Link>
          </div>
        </div>
      </ParallaxSection>

      {/* So what's the Game? */}
      <AnimatedSection>
        <section className="py-16 md:py-20 bg-[#f0ebe3] border-b border-[#1a472a]/10">
          <div className="container px-4 max-w-5xl mx-auto">
            <h2
              className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              So what's the Game?
            </h2>

            {/* Teaser line */}
            <p className="text-lg text-[#1a472a]/80 leading-relaxed mb-4">
              One simple way to describe what's happening here is "we're co-creating an infinite game to do the thing" - which of course we'll need to explain each part of this...
            </p>

            {/* Collapsible body */}
            <Collapsible open={whatIsGameOpen} onOpenChange={setWhatIsGameOpen}>
              <CollapsibleContent className="overflow-hidden transition-all duration-300">
                <div className="space-y-4 text-[#1a472a]/80 leading-relaxed">
                  <p>
                    What do we mean "The Thing"? Let's start here as it's the most important.
                  </p>
                  <p>
                    The "Thing" is creating a civilization that's a healthy, joyful, fulfilling and magical place to raise ourselves, our children, and the more than human world.
                  </p>
                  <p>
                    The thing about "The Thing" is there's no right, or single, answer. There are however a growing diversity of much better answers than the dominant way we're doing this as a human species...
                  </p>
                  <p>
                    The Thing is hard, The Thing is monumental... and it's necessary, fun, fulfilling to work on, and deeply meaningful and evolutionary to be part of (at least it is for the person writing these words...).
                  </p>
                  <p>
                    Nobody knows the absolute right way to do it, and there isn't one. So, we need to try and have thousands (or more) of viable options to learn from and choose between.
                  </p>
                  <p>
                    Because if we can't choose the story in which we raise ourselves, we aren't choosing anything meaningful.
                  </p>

                  <h3 className="text-xl font-bold text-[#1a472a] pt-4" style={{ fontFamily: "var(--font-display)" }}>So if it's so important, why call it a Game?</h3>
                  <p>
                    There's so many layers to this, let's start with the surface.
                  </p>
                  <p>
                    We design from the point of view of a Game so that it's simple for people to participate.
                  </p>
                  <p>
                    Because the old Games (corporatism, nationalism, capitalism, etc) are taking everyone's time and degrading our attention. So, it needs to be extremely easy to participate, and designing it like a Game helps us consider this lens and design for it.
                  </p>
                  <p>
                    Second, if we get to make new economic, financial and governance systems, why not make them as fun as possible?!
                  </p>
                  <p>
                    Imagine if the vast majority of our days were spent in authentically fulfilling and fun-to-be-part-of-ways where we're actively co-creating regenerative civilizations and the realities we inhabit...
                  </p>
                  <p>
                    In our opinion this is the best Game to play. Which is also why we call it a Game. It's the best Game!
                  </p>
                  <p>Which brings us to part 3...</p>

                  <h3 className="text-xl font-bold text-[#1a472a] pt-4" style={{ fontFamily: "var(--font-display)" }}>The Infinite Part</h3>
                  <p>
                    The Game isn't designed to end "finite Games" that have winners, losers, and outcomes.
                  </p>
                  <p>
                    This Game is continually redesigned by and for the players, to become a better and better Game to play!
                  </p>
                  <p>
                    The catalysts that are forming ReGen Civics are not the founders, owners, C-Suite, etc. of this vital piece of community infrastructure.
                  </p>
                  <p>
                    Our roles are simply to get the Game started then make ourselves obsolete as quickly as we can while still supporting the healthy development of the Game.
                  </p>
                  <p>Much like the pattern for raising healthy children.</p>
                  <p>
                    In this way we continually evolve the Game to better serve us and the goal of co-creating a growing diversity of regenerative realities, villages, projects, etc.
                  </p>
                  <p>This is why we call it an "<Concept>Infinite Game</Concept>".</p>

                  <h3 className="text-xl font-bold text-[#1a472a] pt-4" style={{ fontFamily: "var(--font-display)" }}>2 main parts to this Game:</h3>
                  <p>
                    Much of what we're doing is building bridges from one Game, the Dominant Game, to a growing diversity of new Games. We approach this by mastering the economic systems of the old Game and the New Games simultaneously.
                  </p>
                  <p>That's why we have 2 distinct spaces.</p>
                  <p>
                    The ReGen Civics Fund is designed to be deeply rooted in the old Games, working to master that Game through using the most powerful coordination structures, a Fund, to ensure we have the capability to coordinate in that Game.
                  </p>
                  <p>
                    The ReGen Game is deeply rooted on the other side, the Games we're moving into. It's a continuation of the work started in SEEDS back in 2017: taking a decade of learning and weaving it into this new structure to help us co-create a growing number of new financial and economic systems better suited for Regenerative Civilizations.
                  </p>
                  <p>Think of these two spaces as the 2 foundations of a bridge crossing a chasm.</p>
                  <p>
                    Part of our Game is then creating a bigger and better bridge so that the growing number of people ready for these realities can safely, joyfully, easily, and, hopefully with a bit of awe and wonder, walk across these bridges into the new worlds.
                  </p>

                  <h3 className="text-xl font-bold text-[#1a472a] pt-4" style={{ fontFamily: "var(--font-display)" }}>Quests!</h3>
                  <p>
                    Now this is not without doing the work. By "the work" we mean the inner work and the actual actions we humans need to take to heal ourselves and our world.
                  </p>
                  <p>
                    This is where Quests come in. To help us co-create a growing number of "Mini Games" on doing the inner and outer work of healing so that we can become better players in the Game.
                  </p>
                  <p>
                    In this way we can see ourselves as "Athletes in the Infinite Game of Systemic Regeneration" and Quests help strengthen us and improve our abilities.
                  </p>
                  <p>
                    Quests are intended to grow into vital coordination infrastructure of our new civilization. Where we're exploring the question, "Can we meet all of our needs through Quests and Play?" We lean into this question when designing quests.
                  </p>
                  <p>
                    There's so much more to this Game, but the story is just beginning the Game is to be designed by all of us, by you dear reader, so don't feel that you need to have a full handle on this to get involved, as nobody does!
                  </p>
                  <p className="font-semibold text-[#1a472a]">Welcome to the Infinite Game.</p>

                  {/* Images */}
                  <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <img
                      src="/game-infinite-forest.webp"
                      alt="A dreamlike regenerative forest village at dusk"
                      width="800"
                      height="600"
                      className="w-full rounded-2xl object-cover"
                      loading="lazy"
                    />
                    <img
                      src="/game-bridge-worlds.webp"
                      alt="Two worlds connected by a bridge of light"
                      width="800"
                      height="600"
                      className="w-full rounded-2xl object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </CollapsibleContent>

              <CollapsibleTrigger asChild>
                <button className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1a472a] hover:text-[#4a7c59] transition-colors">
                  {whatIsGameOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {whatIsGameOpen ? pageCopy.game.whatsTheGame.readMore.close : pageCopy.game.whatsTheGame.readMore.open}
                </button>
              </CollapsibleTrigger>
            </Collapsible>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mt-8">
              <Link href="/tokenomics">
                <Button size="lg" className="rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                  Explore Tokenomics <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/governance">
                <Button size="lg" className="rounded-xl bg-[#4a7c59] hover:bg-[#1a472a] text-white">
                  Explore Governance <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>

      {/* Watch the Overview Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d]">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="text-2xl md:text-4xl font-bold text-white mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {pageCopy.game.overview.heading}
            </h2>
            <p className="text-white/70 text-base md:text-lg mb-6 max-w-xl mx-auto">
              {pageCopy.game.overview.subtext}
            </p>
            <AutoplayVideo
              videoId="C9U0JTsqKv8"
              title="ReGen Civics Overview"
              thumbnailUrl={cdnImg("https://assets.regencivics.earth/NnpPOudclSlFoAuh.png")}
              thumbnailAlt="Watch the ReGen Civics Overview"
              playLabel={pageCopy.game.overview.playLabel}
            />
          </div>
        </div>
      </section>

      {/* Callout Banner */}
      <section className="py-10 md:py-14 bg-gradient-to-r from-[#ffd700] via-[#ffd700] to-[#ffd700] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-[#1a472a]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#2d5a3d]/10 rounded-full blur-3xl" />
        </div>
        <div className="container px-4 relative z-10">
          <AnimatedSection animation="slide-up" className="max-w-3xl mx-auto text-center">
            <p 
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1a472a] leading-snug"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {pageCopy.game.callout.heading}
            </p>
            <p 
              className="text-xl md:text-2xl font-semibold text-[#1a472a] mt-4"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              {pageCopy.game.callout.subline}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Animated Transition - Gold to Green */}
      <div className="h-16 bg-gradient-to-b from-[#ffd700] via-[#f0f7f0] to-[#f0f7f0] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-full bg-gradient-to-b from-[#1a472a]/20 via-[#7dd87d]/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#7dd87d] shadow-lg shadow-[#7dd87d]/50" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
      </div>

      {/* Quest Animation Video Section */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-[#f0f7f0] to-[#f0f7f0] relative overflow-hidden">
        <div className="container px-4">
          <AnimatedSection animation="slide-up" className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 bg-[#7dd87d]/90 backdrop-blur-sm text-[#1a472a] px-4 py-2 rounded-full text-sm font-bold mb-4">
                +111 ReGen  +1 RGVoice
              </div>
              <h2 
                className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Players on Their{' '}
                <span className="text-[#7dd87d]">Quests</span>
              </h2>
            </div>
            
            {/* Two quest animations side by side on desktop, stacked on mobile */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Heal the Watershed */}
              <div>
                <div className="mb-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#7dd87d]/20 text-[#7dd87d] rounded-full text-xs font-bold w-fit">
                  <Sparkles className="w-3 h-3" />
                  Heal the Watershed
                </div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[#7dd87d]/30">
                  <ViewportTriggeredVideo
                    src={cdnImg("https://assets.regencivics.earth/ckVBEXxJKsydomeb.mp4")}
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Epic Quest: Corn to Paradise */}
              <div>
                <div className="mb-3 flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 text-amber-400 rounded-full text-xs font-bold w-fit">
                  <Star className="w-3 h-3" />
                  Epic Quest: Cornfield to Hemp to Ecovillage
                </div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-400/30">
                  <ViewportTriggeredVideo
                    src={cdnImg("https://assets.regencivics.earth/zpwWWhxtucLzomsE.mp4")}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
            

          </AnimatedSection>
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#f0f7f0] via-white to-[#f0f7f0] relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-[#7dd87d]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#4a7c59]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <div className="container px-4 relative z-10">
          <AnimatedSection animation="slide-up" className="max-w-4xl mx-auto text-center">
            {/* Seed of Life icon with animation */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ffed4e] mb-8 shadow-lg">
              <SeedOfLifeIcon className="w-12 h-12 text-[#1a472a] seed-hero-animated" size={48} />
            </div>
            
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#7dd87d]" />
              <Sparkles className="w-6 h-6 text-[#7dd87d]" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#7dd87d]" />
            </div>
            
            {/* Exploration statement - typewriter effect */}
            <TypewriterText className="text-lg md:text-xl text-[#1a472a]/80 leading-relaxed max-w-3xl mx-auto" />
            
            {/* Animated icons row */}
            <div className="flex justify-center gap-6 mt-10">
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#7dd87d]/40 transition-colors group-hover:scale-110 transform duration-300">
                  <Heart className="w-7 h-7 text-rose-500" />
                </div>
                <span className="text-xs text-[#1a472a]/60 font-medium">Love</span>
              </div>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#7dd87d]/40 transition-colors group-hover:scale-110 transform duration-300">
                  <Users className="w-7 h-7 text-[#4a7c59]" />
                </div>
                <span className="text-xs text-[#1a472a]/60 font-medium">Community</span>
              </div>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#7dd87d]/40 transition-colors group-hover:scale-110 transform duration-300">
                  <Globe className="w-7 h-7 text-blue-500" />
                </div>
                <span className="text-xs text-[#1a472a]/60 font-medium">Planet</span>
              </div>
              <div className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center group-hover:bg-[#7dd87d]/40 transition-colors group-hover:scale-110 transform duration-300">
                  <SeedOfLifeIcon className="w-7 h-7 text-amber-500" size={28} />
                </div>
                <span className="text-xs text-[#1a472a]/60 font-medium">Play</span>
              </div>
            </div>
            
            {/* Featured Quest Spotlight */}
            <div className="mt-12 max-w-lg mx-auto">
              <div className="bg-white rounded-2xl border-2 border-[#ffd700]/50 shadow-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="bg-gradient-to-r from-[#ffd700]/20 to-[#ffed4e]/20 px-6 py-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#d4a574]" />
                  <span className="text-xs font-bold text-[#1a472a] uppercase tracking-wider" style={{ fontFamily: 'var(--font-accent)' }}>Featured Quest</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Quest 0: Fire</h4>
                      <p className="text-sm text-[#1a472a]/60">Transforming the Stories That No Longer Serve Us</p>
                    </div>
                  </div>
                  <p className="text-sm text-[#1a472a]/70 mb-4 text-left">
                    Begin your journey by burning the stories that no longer serve you. Create a 2-3 minute video sharing who you are and why you're here.
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-[#7dd87d]/20 text-[#1a472a] rounded-full text-xs font-bold">+111 $Regen</span>
                    <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full text-xs font-bold">+1 RGVoice</span>
                  </div>
                  <Link href="/quest">
                    <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-bold" style={{ fontFamily: 'var(--font-accent)' }}>
                      Start Your First Quest <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Join the Movement Section - Player Invitation - MOVED HIGHER */}
      <section className="py-16 bg-gradient-to-b from-[#f0ebe3] to-[#f0f7f0] relative overflow-hidden">
        <div className="container px-4">
          <AnimatedSection animation="slide-up" className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4 text-[#1a472a]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Join the{" "}
              <span className="text-[#7dd87d]">Movement</span>
            </h2>
            <p className="text-lg text-[#1a472a]/70 max-w-3xl mx-auto">
              There are many ways to participate in the ReGen Civics ecosystem. Find the path that resonates with you.
            </p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Create with Alliances (merged from Work with Alliances + Create Together) */}
            <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-4 mx-auto">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-[#1a472a] text-lg mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
                Create with Alliances
              </h3>
              <p className="text-[#1a472a]/70 text-sm mb-4 text-center">
                Collaborate with alliance organisations and land projects to co-create regenerative infrastructure, remotely or in person.
              </p>
              <Link href="/connect?path=create_with_regens">
                <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl">
                  Explore Opportunities <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Join a Community */}
            <div className="bg-white p-6 rounded-xl border-2 border-teal-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4 mx-auto">
                <TreeDeciduous className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-[#1a472a] text-lg mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
                Join a Community
              </h3>
              <p className="text-[#1a472a]/70 text-sm mb-4 text-center">
                Join a regenerative land project and experience community living firsthand.
              </p>
              <Link href="/connect?path=live">
                <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl">
                  Find Your Home <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Join Our Team */}
            <div className="bg-white p-6 rounded-xl border-2 border-rose-200 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-[#1a472a] text-lg mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
                Join Our Team
              </h3>
              <p className="text-[#1a472a]/70 text-sm mb-4 text-center">
                Apply for a role in ReGen Civics and help shape the ReGenerative Renaissance.
              </p>
              <Link href="/team">
                <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
                  View Team & Roles <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Additional CTA */}
          <div className="text-center mt-10">
            <p className="text-[#1a472a]/60 text-sm mb-4">
              {pageCopy.game.joinMovement.text}
            </p>
            <Link href="/connect">
              <Button variant="outline" className="border-2 border-[#1a472a] text-[#1a472a] hover:bg-[#1a472a] hover:text-white rounded-xl">
                {pageCopy.game.joinMovement.button} <Compass className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contributions to the ReGenerative Renaissance */}
      <section id="seeds-legacy" className="py-12 bg-gradient-to-br from-amber-50 to-orange-50 border-y-4 border-amber-400">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="slide-up" className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full mb-4">
                <span className="text-2xl">🌱</span>
                <span className="text-amber-700 font-semibold">Contributions to the ReGenerative Renaissance</span>
              </div>
              <h2
                className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Your contributions to creating a more healthy and beautiful world can be tracked here.
              </h2>
              <Collapsible open={contribIntroOpen} onOpenChange={setContribIntroOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-amber-700 font-semibold hover:text-amber-600 transition-colors w-full justify-center text-sm">
                  {contribIntroOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {contribIntroOpen ? 'Hide details' : 'Learn more about contributions'}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="text-[#1a472a]/80 max-w-2xl mx-auto space-y-4 text-left mt-4">
                    <p>
                      If you have been contributing to a regenerative mission and haven't been paid or otherwise given financial or equal capital in return, we are building the ecosystem to track and account for those contributions. Every form of capital counts: social, material, financial, living, intellectual, experiential, spiritual, and cultural!
                    </p>
                    <p>
                      As you join this movement, you can make a historical proposal for your contributions and bring those contributions here. The point is not just the tokens, it's to form an ecosystem that represents us all, that helps us coordinate, raise capital, and move together as a whole.
                    </p>
                    <p>
                      For every token we give out, we receive an equal amount of value pooled here - so as you claim tokens you offer up your contribution to the whole. This could be in the form of a video on the lessons you learned (starting a community garden for example) or free access to tools and templates you've created.
                    </p>
                    <p className="font-medium text-[#1a472a]">
                      If you have something of value for the movement, we want to track it, share it, and coordinate new civilizations with it.
                    </p>
                    <p>
                      Our collective contributions are the real value backing our tokens.
                    </p>
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      💛 If you contributed to SEEDS or other regenerative projects before finding ReGen Civics, those contributions count here too.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <a
                  href="/claim-seeds"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                >
                  <Coins className="w-5 h-5" />
                  Claim Financial Contributions
                </a>
                <a
                  href="https://docs.google.com/spreadsheets/d/1Z6V3DSRHpA7fIjE2JYi4L5L2-vH6TbOIYKXHYJp_mHY/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/80 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium text-sm"
                >
                  {pageCopy.game.contributions.buttons.calculator}
                </a>
                <a
                  href="/community/post/625"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a472a] text-white rounded-xl hover:bg-[#2d5a3d] transition-colors font-medium text-sm"
                >
                  {pageCopy.game.contributions.buttons.discussion}
                </a>
              </div>
            </AnimatedSection>
            
            <div className="bg-white p-6 md:p-8 rounded-2xl border-3 border-amber-400 shadow-lg">
              <h3 className="font-bold text-[#1a472a] text-xl mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                How to Claim Your Legacy Tokens
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-[#1a472a]">Financial Contributions</h4>
                  </div>
                  <p className="text-sm text-[#1a472a]/80 mb-3">
                    Make a proposal showing how much USD value you contributed to SEEDS or our movement.
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-amber-300">
                    <p className="text-sm font-semibold text-amber-700">
                      💰 Receive <span className="text-lg">100 tokens</span> per $1 contributed
                    </p>
                  </div>
                </div>
                
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-[#1a472a]">Other Contributions</h4>
                  </div>
                  <p className="text-sm text-[#1a472a]/80 mb-3">
                    Make a clear proposal for the USD value of your contribution and how it serves ReGen Civics goals.
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-amber-300">
                    <p className="text-sm font-semibold text-amber-700">
                      📝 Value assessed by community proposal
                    </p>
                  </div>
                </div>
              </div>
              
              <Collapsible open={seedsOpen} onOpenChange={setSeedsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-amber-700 font-bold hover:text-amber-600 transition-colors w-full justify-center">
                  {seedsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  Examples of Valuable Contributions
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Wrench className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Tools & Software</h5>
                        <p className="text-xs text-[#1a472a]/70">Created tools, apps, or software that the network can use</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Map className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Maps & Processes</h5>
                        <p className="text-xs text-[#1a472a]/70">Created maps, frameworks, or processes that help regenerative projects succeed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <BookOpen className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Educational Content</h5>
                        <p className="text-xs text-[#1a472a]/70">Developed courses, guides, or educational materials for the community</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Users className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Community Building</h5>
                        <p className="text-xs text-[#1a472a]/70">Organized events, facilitated groups, or grew the community</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Lightbulb className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Strategic Guidance</h5>
                        <p className="text-xs text-[#1a472a]/70">Provided consulting, mentorship, or strategic direction</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <FileCheck className="w-6 h-6 text-[#4a7c59] flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-bold text-[#1a472a] text-sm mb-1">Documentation</h5>
                        <p className="text-xs text-[#1a472a]/70">Created governance docs, legal frameworks, or operational guides</p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {/* How to Quantify Your Contribution */}
              <Collapsible className="mt-6 pt-6 border-t border-amber-200">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-[#1a472a]">How to Quantify Your Contribution Value</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-amber-600 group-data-[state=open]:rotate-180 transition-transform" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-amber-200">
                    <h5 className="font-bold text-[#1a472a] mb-3">Industry Best Practices for Valuation</h5>
                    <ul className="space-y-3 text-sm text-[#1a472a]/80">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">1.</span>
                        <span><strong>Market Comparison:</strong> What would this service/product cost if purchased from a vendor? Use quotes or market rates as reference.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">2.</span>
                        <span><strong>Impact-Based:</strong> What value did your contribution create? Revenue generated, costs saved, or strategic value added.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">3.</span>
                        <span><strong>Replacement Cost:</strong> What would it cost to replace or recreate this contribution from scratch?</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">4.</span>
                        <span><strong>8 Forms of Capital:</strong> Consider the 8 forms of capital (financial, material, living, social, intellectual, experiential, spiritual, cultural) for a more holistic tracking of value contributed.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-[#f0f7f0] p-4 rounded-xl border border-[#7dd87d]/30">
                    <h5 className="font-bold text-[#1a472a] mb-2">Submit to the ReGen Game Space</h5>
                    <p className="text-sm text-[#1a472a]/70 mb-3">
                      Once you've calculated your contribution value, create a proposal in the ReGen Game Space explaining your contribution, the value calculation method, and supporting evidence.
                    </p>
                    <p className="text-sm text-[#1a472a]/70 mb-3 italic bg-amber-50 p-2 rounded border border-amber-200">
                      All proposals will ultimately be decided by the Voice holders in the space.
                    </p>
                    <a 
                      href="https://app.hypha.earth/en/dho/regen-games/agreements"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#4a7c59] hover:text-[#1a472a] font-semibold text-sm"
                    >
                      Go to ReGen Game Space <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Contribution Calculator Link */}
              <div className="mt-8 pt-8 border-t border-amber-200">
                <Link href="/calculator">
                  <div className="bg-gradient-to-r from-[#7dd87d]/20 to-[#4a7c59]/20 p-6 rounded-xl border-2 border-[#7dd87d]/30 hover:border-[#7dd87d] transition-all cursor-pointer group hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#7dd87d] flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Lightbulb className="w-7 h-7 text-[#1a472a]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Contribution Calculator</h4>
                          <p className="text-sm text-[#1a472a]/70">Estimate your contribution value across all 8 forms of capital using our calculator!</p>
                        </div>
                      </div>
                      <ArrowRight className="w-6 h-6 text-[#4a7c59] group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Token System Section - Collapsible */}
      <section className="py-16 bg-[#1a472a]">
        <div className="container px-4">
          <Collapsible open={tokenSystemOpen} onOpenChange={setTokenSystemOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="text-center mb-4 cursor-pointer group">
                <h2 
                  className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-[#7dd87d] transition-colors"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  The Token System
                  {tokenSystemOpen ? <ChevronUp className="w-6 h-6 inline ml-2 text-[#7dd87d]" /> : <ChevronDown className="w-6 h-6 inline ml-2 text-[#7dd87d] animate-bounce" />}
                </h2>
                <p className="text-white/70 max-w-2xl mx-auto">
                  Two complementary spaces, each with their own governance and utility/currency tokens. Both are earned through contributions, giving tokens to those who add value.
                </p>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>

          {/* ReGen Game Space */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-[#7dd87d]/20 px-6 py-3 rounded-full border border-[#7dd87d]/40 mb-4">
                <SeedOfLifeIcon className="w-6 h-6 text-[#7dd87d]" size={24} />
                <h3 className="text-xl font-bold text-[#7dd87d]" style={{ fontFamily: 'var(--font-display)' }}>
                  ReGen Game Space
                </h3>
              </div>
              <p className="text-white/60 text-sm max-w-xl mx-auto">
                Explore quests, share your gifts, earn tokens, and grow your voice in the ReGenerative Renaissance!
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <TokenInfoCard
                iconSrc={cdnImg("https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.png")}
                title="RGVoice"
                subtitle="Game Governance Token"
                description="RGVoice represents how much 'weight your voice carries' in game decisions. We believe that the more you contribute, the wiser your decisions become."
                features={[
                  "Complete Quests to earn RGVoice tokens",
                  "More RGVoice = more powerful votes on proposals",
                  "Non-tradable, earned through direct experience",
                  "Can delegate another player to represent you"
                ]}
                color="border-purple-500/50"
              />
              <TokenInfoCard
                iconSrc={cdnImg("https://assets.regencivics.earth/ZWOtkRNjdCWfFFed.png")}
                title="$ReGen"
                subtitle="Game Utility Token"
                description="$ReGen is our tradable utility token representing economic participation in the Game."
                features={[
                  "Earn $ReGen per quest",
                  "Create historical and current contribution proposals",
                  "Help grow our movement",
                  "Tradable with other players & secondary markets when available"
                ]}
                color="border-[#7dd87d]/50"
              />
            </div>
          </div>

          {/* Alliance & Fund Space */}
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 bg-amber-500/20 px-6 py-3 rounded-full border border-amber-500/40 mb-4">
                <Building2 className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-amber-400" style={{ fontFamily: 'var(--font-display)' }}>
                  Alliance & Fund Space
                </h3>
              </div>
              <p className="text-white/60 text-sm max-w-xl mx-auto">
                Invest in land projects, join the alliance, and help govern the fund
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <TokenInfoCard
                iconSrc={cdnImg("https://assets.regencivics.earth/cSiqeQzVeKFgrJHp.png")}
                title="RCVoice"
                subtitle="Fund Governance Token"
                description="RCVoice governs fund decisions. Council holds 40% voice; Land Projects, Alliance Orgs, and Investors each hold 20%. Voice evolves over time as the community matures."
                features={[
                  "Council 40% / Others 20% each at launch",
                  "Vote on investment decisions & proposals",
                  "Non-tradable, can delegate to other members"
                ]}
                ctaLink="/governance"
                ctaLabel="Explore Governance Model"
                color="border-amber-500/50"
              />
              <TokenInfoCard
                iconSrc={cdnImg("https://assets.regencivics.earth/MhyYoMLbeOhEHQLm.png")}
                title="$RCivics"
                subtitle="Rewards & Returns Token"
                description="$RCivics is your claim on fund returns. Portfolio distributions are sent proportionally to $RCivics holders - separate from governance voice."
                features={[
                  "Acquired through investment or equity swap",
                  "Proportional claim on returns",
                  "Tradable on secondary markets when available"
                ]}
                ctaLink="/governance"
                ctaLabel="Learn How to Acquire"
                color="border-amber-500/50"
              />
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
              <p className="text-white/90 text-lg mb-2">
                <strong className="text-[#7dd87d]">Example Quest Reward:</strong>
              </p>
              <p className="text-white/70">
                Food Foresting Quest: <span className="text-[#7dd87d] font-bold">+33 $Regen</span> + <span className="text-purple-400 font-bold">+1 RGVoice</span>
              </p>
            </div>
          </div>

            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* Why Regeneration Section */}
      <section className="py-16 bg-[#f8f5f0]">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 
                className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Why Focus on Regeneration?
              </h2>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border-2 border-[#1a472a]/10 shadow-lg mb-8">
              <p className="text-[#1a472a]/80 text-lg leading-relaxed mb-6">
                ReGen Civics is a decentralised organisation helping coordinate a global network of regenerative land projects into a new type of global and networked Civilization.
              </p>
              
              <div className="bg-[#7dd87d]/10 border-2 border-[#7dd87d] rounded-xl p-6 mb-6">
                <p className="text-[#1a472a] font-semibold text-lg mb-2">
                  Our Thesis:
                </p>
                <p className="text-[#1a472a]/80">
                  To co-create a regenerative civilization, we must <strong>LIVE regeneratively today</strong>. We must BE REGENERATIVE ourselves. From this embodied space and new perspective, we design and co-create our new civilizations together.
                </p>
              </div>
              
              <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-[#4a7c59] font-bold hover:text-[#7dd87d] transition-colors">
                  {whyOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  What the Quests Help Us Achieve
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Heart className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-[#1a472a] mb-1">Heal Ourselves</h4>
                        <p className="text-sm text-[#1a472a]/70">Our bodies, families, communities, bioregions, and Earth across all layers: physical, mental, emotional, spiritual.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <BookOpen className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-[#1a472a] mb-1">Grow & Learn Together</h4>
                        <p className="text-sm text-[#1a472a]/70">Share our journey and insights with communities. This is the VALUE we add in exchange for tokens.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Vote className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-[#1a472a] mb-1">Distribute Ownership & Governance</h4>
                        <p className="text-sm text-[#1a472a]/70">More quests = more tokens = greater Voice impact. Our game is owned and governed by Players and Allies.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-[#f0f7f0] rounded-xl">
                      <Sparkles className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-[#1a472a] mb-1">Co-Create a Beautiful Game</h4>
                        <p className="text-sm text-[#1a472a]/70">Constantly redesigned by all of us to help experience life in loving, connected, and regenerative ways.</p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            <div className="text-center">
              <p className="text-[#1a472a]/70 italic">
                "To focus on regeneration & healing is to focus on growing our shared potential."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Game Philosophy Section */}
      <ParallaxSection
        imageSrc="/backgrounds/game-seeds-legacy-baked.webp"
        overlay="rgba(5, 28, 12, 0.72)"
      >
        <div className="container py-16 px-4">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The Infinite Game Philosophy
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Unlike finite games played to win, infinite games are played for the purpose of continually improving the quality of play.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            <PhilosophyCard
              icon={Infinity}
              title="No End Goal"
              description="The Game continues as long as players want to play. Success is measured by the continuation and evolution of the Game itself."
            />
            <PhilosophyCard
              icon={Users}
              title="Players Can Join Anytime"
              description="New players are always welcome. The more diverse our players, the richer our collective wisdom becomes."
            />
            <PhilosophyCard
              icon={Layers}
              title="Rules Can Change"
              description="Players collectively evolve the rules through governance. The Game adapts to serve the players, not the other way around."
            />
          </div>
          
          <Collapsible open={infiniteOpen} onOpenChange={setInfiniteOpen} className="max-w-3xl mx-auto">
            <CollapsibleTrigger className="flex items-center gap-2 text-[#7dd87d] font-bold hover:text-[#9de89d] transition-colors mx-auto">
              {infiniteOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              Why an Infinite Game?
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/30">
                <p className="text-white/90 leading-relaxed mb-4">
                  Traditional systems are finite games. They have winners and losers, clear endpoints, and fixed rules. But regeneration isn't about winning; it's about thriving together indefinitely.
                </p>
                <p className="text-white/80 leading-relaxed mb-4">
                  By designing ReGen Civics as an infinite game, we create a system that:
                </p>
                <ul className="space-y-2 text-white/70">
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#7dd87d] mt-1 flex-shrink-0" />
                    <span>Prioritizes long-term regeneration over short-term extraction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#7dd87d] mt-1 flex-shrink-0" />
                    <span>Welcomes new players and perspectives at any time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#7dd87d] mt-1 flex-shrink-0" />
                    <span>Evolves its rules through collective wisdom</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#7dd87d] mt-1 flex-shrink-0" />
                    <span>Creates alternatives to extractive financial and governance systems</span>
                  </li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ParallaxSection>

      {/* Why Games Section - Moved here after Infinite Game Philosophy */}
      <section className="py-16 bg-white relative overflow-hidden">
        <div className="container px-4">
          <AnimatedSection animation="slide-up" className="text-center mb-8">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-4 text-[#1a472a]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Why{" "}
              <span className="text-[#7dd87d]">Games?</span>
            </h2>
            <p className="text-lg text-[#1a472a]/70 max-w-3xl mx-auto">
              Capitalism, Nation States, Companies... all just Games. For systemic change, we need better Games that are actually designed to meet our needs.
            </p>
          </AnimatedSection>
          
          {/* Collapsible Research Section */}
          <div className="max-w-4xl mx-auto">
            <Collapsible open={whyGamesOpen} onOpenChange={setWhyGamesOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="bg-gradient-to-r from-[#f0f7f0] to-[#c8e6c9] p-4 rounded-xl border-2 border-[#4a7c59]/30 shadow-lg flex items-center justify-between hover:bg-[#d4e8d4] transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4a7c59] flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[#1a472a] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      Explore the Research Behind Games
                    </span>
                  </div>
                  {whyGamesOpen ? <ChevronUp className="w-5 h-5 text-[#7dd87d]" /> : <ChevronDown className="w-5 h-5 text-[#7dd87d] animate-bounce" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 bg-white p-6 rounded-xl border-2 border-[#4a7c59]/20 shadow-lg">
                  {/* Core Values */}
                  <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e91e63] to-[#f48fb1] flex items-center justify-center shadow-lg shadow-[#e91e63]/30">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                      <span className="mt-2 text-sm font-bold text-[#e91e63]" style={{ fontFamily: 'var(--font-display)' }}>LOVE</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4caf50] to-[#81c784] flex items-center justify-center shadow-lg shadow-[#4caf50]/30">
                        <Sprout className="w-8 h-8 text-white" />
                      </div>
                      <span className="mt-2 text-sm font-bold text-[#4caf50]" style={{ fontFamily: 'var(--font-display)' }}>REGENERATION</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#9c27b0] to-[#ce93d8] flex items-center justify-center shadow-lg shadow-[#9c27b0]/30">
                        <Target className="w-8 h-8 text-white" />
                      </div>
                      <span className="mt-2 text-sm font-bold text-[#9c27b0]" style={{ fontFamily: 'var(--font-display)' }}>PURPOSE</span>
                    </div>
                  </div>
                  
                  {/* Research Cards */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-[#f0f7f0] to-[#c8e6c9] p-4 rounded-xl border border-[#4a7c59]/30 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#1a472a] flex items-center justify-center mx-auto mb-3">
                        <Lightbulb className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-[#1a472a] text-sm mb-1">Faster Learning</h4>
                      <p className="text-xs text-[#1a472a]/70 mb-2">Play accelerates skill acquisition</p>
                      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3574776/" target="_blank" rel="noopener noreferrer" className="text-xs text-[#1a472a] hover:underline">
                        Research &rarr;
                      </a>
                    </div>
                    <div className="bg-gradient-to-br from-[#f1f8e9] to-[#dcedc8] p-4 rounded-xl border border-[#558b2f]/30 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#558b2f] flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-[#1a472a] text-sm mb-1">Creative Solutions</h4>
                      <p className="text-xs text-[#1a472a]/70 mb-2">Play opens up innovative thinking</p>
                      <a href="https://pubmed.ncbi.nlm.nih.gov/38889248/" target="_blank" rel="noopener noreferrer" className="text-xs text-[#558b2f] hover:underline">
                        Research &rarr;
                      </a>
                    </div>
                    <div className="bg-gradient-to-br from-[#e0f2f1] to-[#b2dfdb] p-4 rounded-xl border border-[#00796b]/30 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#00796b] flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-[#1a472a] text-sm mb-1">Stronger Bonds</h4>
                      <p className="text-xs text-[#1a472a]/70 mb-2">Games build relationships faster</p>
                      <a href="https://www.sciencedirect.com/science/article/abs/pii/S0747563214003227" target="_blank" rel="noopener noreferrer" className="text-xs text-[#00796b] hover:underline">
                        Research &rarr;
                      </a>
                    </div>
                    <div className="bg-gradient-to-br from-[#f0f7f0] to-[#a8e6a8] p-4 rounded-xl border border-[#388e3c]/30 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#388e3c] flex items-center justify-center mx-auto mb-3">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-[#1a472a] text-sm mb-1">Adaptability</h4>
                      <p className="text-xs text-[#1a472a]/70 mb-2">Play enables faster adaptation</p>
                      <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4928743/" target="_blank" rel="noopener noreferrer" className="text-xs text-[#388e3c] hover:underline">
                        Research &rarr;
                      </a>
                    </div>
                  </div>
                  
                  {/* Wellbeing Card */}
                  <div className="bg-gradient-to-br from-[#f0f7f0] to-[#81c784] p-6 rounded-xl border-2 border-[#43a047]/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-[#43a047] flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                        Wellbeing & Joy
                      </h4>
                    </div>
                    <p className="text-[#1a472a]/80">
                      Play isn't just effective, it's joyful. We believe the journey to regeneration should feel as good as the destination. When we design for wellbeing, everyone wins.
                    </p>
                  </div>
                  
                  {/* Full Guide Link */}
                  <div className="text-center mt-6">
                    <a 
                      href="https://explore.joinseeds.earth/regen-civics-infinite-game" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a472a] text-white rounded-xl hover:bg-[#2d5a3d] transition-colors"
                    >
                      <BookOpen className="w-5 h-5" />
                      Read the Full Game Guide
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      {/* Quest Design Section - Collapsible */}
      <section className="py-16 bg-[#f8f5f0]">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <Collapsible open={questDesignOpen} onOpenChange={setQuestDesignOpen}>
              <CollapsibleTrigger className="w-full">
                <div className="text-center mb-8 cursor-pointer group">
                  <h2 
                    className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4 group-hover:text-[#4a7c59] transition-colors"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Quest Design Philosophy
                    {questDesignOpen ? <ChevronUp className="w-6 h-6 inline ml-2 text-[#7dd87d]" /> : <ChevronDown className="w-6 h-6 inline ml-2 text-[#7dd87d] animate-bounce" />}
                  </h2>
                  <p className="text-[#1a472a]/70 max-w-2xl mx-auto">
                    Quests are designed to provide the greatest regenerative impact with the lowest effort, time, and resources.
                  </p>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
            
            <div className="bg-white p-8 rounded-2xl border-2 border-[#1a472a]/10 shadow-lg">
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="text-center p-6 bg-[#7dd87d]/10 rounded-xl">
                  <Target className="w-12 h-12 text-[#4a7c59] mx-auto mb-4" />
                  <h3 className="font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    Maximum Impact
                  </h3>
                  <p className="text-sm text-[#1a472a]/70">
                    Healing, growth, connection, and regeneration through direct experience
                  </p>
                </div>
                <div className="text-center p-6 bg-[#7dd87d]/10 rounded-xl">
                  <Zap className="w-12 h-12 text-[#4a7c59] mx-auto mb-4" />
                  <h3 className="font-bold text-[#1a472a] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                    Minimum Effort
                  </h3>
                  <p className="text-sm text-[#1a472a]/70">
                    Low time, resources, and capital requirements to participate
                  </p>
                </div>
              </div>
              
              <div className="bg-[#f0f7f0] p-6 rounded-xl mb-6">
                <h4 className="font-bold text-[#1a472a] mb-3">Key Quest Features:</h4>
                <ul className="space-y-2 text-sm text-[#1a472a]/80">
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span>Do quests in any order that calls to you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span>Complete quests multiple times (earn rewards up to 3x)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span>Skip quests that don't resonate with you right now</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-[#7dd87d] mt-0.5 flex-shrink-0" />
                    <span>Focus on having fun while deepening relationships with life</span>
                  </li>
                </ul>
              </div>
              
              <p className="text-[#1a472a]/70 text-sm italic text-center">
                "At first glance, the titles of these Quests may not make sense to you, but we hope this changes after you experience them."
              </p>
            </div>

              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      {/* ReGen Game Journey Section (migrated from old homepage - Image 10) */}
      <section className="py-16 bg-[#1a472a] text-white relative overflow-hidden">
        <div className="container px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 
                className="text-3xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                The ReGen Game{" "}
                <span className="text-[#7dd87d]">Journey</span>
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto mb-6">
                We guide land projects through essential milestones to co-create your unique "Game"
              </p>
              <a 
                href="https://www.youtube.com/playlist?list=PL3Xi8vZSmBTSUZsQ82awoNIQS8ceBQ4io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7dd87d] text-[#1a472a] font-bold rounded-full hover:bg-[#9de89d] transition-colors shadow-lg"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                <Play className="w-5 h-5" />
                Watch Season 1 Recap
              </a>
            </div>
            
            {/* Journey Image */}
            <div className="max-w-4xl mx-auto mb-12">
              <img
                src={cdnImg("https://assets.regencivics.earth/LbIXEUcDdcOLOHmP.jpg")}
                alt="ReGen Game Journey Map"
                width="1200"
                height="800"
                loading="lazy"
                className="w-full rounded-2xl border-4 border-[#7dd87d]/50 shadow-2xl"
              />
            </div>
            
            {/* Journey Steps Grid */}
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-[#7dd87d]/30 flex items-center justify-between hover:bg-white/15 transition-colors cursor-pointer">
                  <span className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                    Explore the Journey Steps
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#7dd87d]" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  {/* Vision & Purpose */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Compass className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Vision & Purpose</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">What are we co-creating? Where is it? What is it? Defining the dream. This foundational step helps you articulate your project's core identity.</p>
                  </div>

                  {/* Patterns of Co-Creation */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Patterns of Co-Creation</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">Creating the foundations for a trusted Game. Similar to a 'Constitution' for Nation States. How do we co-create together?</p>
                    <a href="https://youtu.be/A4wkSnXnNdU" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[#7dd87d] text-sm hover:underline">
                      <Play className="w-3 h-3" /> Watch Video
                    </a>
                  </div>

                  {/* Legal Structure */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Shield className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Legal Structure</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">How do we relate with legacy economies and nation-states? What legal vehicle gives us the most flexibility, protection and ability to execute?</p>
                  </div>

                  {/* Circles, Roles & Quests */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Target className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Circles, Roles & Quests</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">How do we execute our mission in a playful way? What structure can others join so they can contribute in a well-defined and joyful way?</p>
                  </div>

                  {/* Membership & Conflict Evolution */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Heart className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Membership & Conflict Evolution</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">Who is a member? What are their Rites of Passage to enter? How do we evolve through conflict? How do people leave amicably?</p>
                  </div>

                  {/* Crowd Pooling */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Coins className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Crowd Pooling</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">Can we pool resources together to co-create our projects, dramatically reducing our dependence on financial capital?</p>
                    <a href="https://youtu.be/cGjQj8vbYNY" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[#7dd87d] text-sm hover:underline">
                      <Play className="w-3 h-3" /> Watch Video
                    </a>
                  </div>

                  {/* Governance Process - Full Width */}
                  <div className="md:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl border border-[#7dd87d]/30 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center">
                        <Vote className="w-5 h-5 text-[#1a472a]" />
                      </div>
                      <h3 className="font-bold text-[#7dd87d] text-lg" style={{ fontFamily: 'var(--font-display)' }}>Governance Process - Ongoing Game to Create the Game</h3>
                    </div>
                    <p className="text-white/80 text-base leading-relaxed">How do we evolve and change? Who makes decisions and how? What are the systems that allow us to continuously adapt and improve? Governance is not a one-time setup but an ongoing 'game within the game.'</p>
                    <a href="https://youtu.be/Xw2Xtk8Xyqk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[#7dd87d] text-sm hover:underline">
                      <Play className="w-3 h-3" /> Watch Video on Governance
                    </a>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </section>

      {/* Why Games Section - Moved to after Infinite Game Philosophy */}

      {/* Understanding Tokens Section */}
      <section className="py-16 bg-[#f0f7f0]">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection animation="slide-up" className="text-center mb-10">
              <h2
                className="text-3xl md:text-4xl font-bold text-[#1a472a] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Understanding Tokens
              </h2>
              <p className="text-[#1a472a]/70 max-w-2xl mx-auto">
                Two types of tokens, two different purposes. Here's what each one does and how you earn it.
              </p>
            </AnimatedSection>

            <div className="space-y-4">
              {/* RVoice */}
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 flex items-center justify-between hover:border-purple-400 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Vote className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: "var(--font-display)" }}>
                          RVoice: Governance Token
                        </h3>
                        <p className="text-sm text-[#1a472a]/60">Earned through participation, used to vote</p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-purple-500 group-data-[state=open]:rotate-180 transition-transform flex-shrink-0" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white border-2 border-t-0 border-purple-200 rounded-b-2xl p-5 -mt-1">
                    <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">
                      RVoice represents how much weight your voice carries in decisions. The more you contribute, the more you earn, and the more your votes count. It is not transferable. It stays tied to your own participation and cannot be bought or sold.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>Complete quests to earn RVoice tokens</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>Vote on proposals and game decisions</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>Delegate your voting power to a trusted player</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span>Not tradable. Earned through direct experience only.</span>
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* ReGen Token */}
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <div className="bg-white border-2 border-[#7dd87d]/50 rounded-2xl p-5 flex items-center justify-between hover:border-[#7dd87d] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center flex-shrink-0">
                        <Coins className="w-6 h-6 text-[#4a7c59]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: "var(--font-display)" }}>
                          ReGen Token: Economic Token
                        </h3>
                        <p className="text-sm text-[#1a472a]/60">Earned through verified impact contributions</p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-[#4a7c59] group-data-[state=open]:rotate-180 transition-transform flex-shrink-0" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white border-2 border-t-0 border-[#7dd87d]/50 rounded-b-2xl p-5 -mt-1">
                    <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">
                      The ReGen Token represents a share of the regenerative economy. It is earned through verified contributions to land projects, the community, and the game. It can be used to participate in fund distributions as the ecosystem grows.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                        <span>Earned per quest completed</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                        <span>Submit contribution proposals to claim historical tokens</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-[#1a472a]/70">
                        <Sparkles className="w-4 h-4 text-[#4a7c59] mt-0.5 flex-shrink-0" />
                        <span>Tradable with other players when secondary markets are available</span>
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* How you earn both */}
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 flex items-center justify-between hover:border-amber-400 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a472a] text-lg" style={{ fontFamily: "var(--font-display)" }}>
                          How you earn both
                        </h3>
                        <p className="text-sm text-[#1a472a]/60">Multiple paths to participate and contribute</p>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-amber-500 group-data-[state=open]:rotate-180 transition-transform flex-shrink-0" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-white border-2 border-t-0 border-amber-200 rounded-b-2xl p-5 -mt-1">
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-sm text-[#1a472a]/80">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-purple-600 font-bold text-xs">V</span>
                        </div>
                        <span><strong className="text-[#1a472a]">Complete a quest</strong>: earn RVoice</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#1a472a]/80">
                        <div className="w-6 h-6 rounded-full bg-[#7dd87d]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[#4a7c59] font-bold text-xs">R</span>
                        </div>
                        <span><strong className="text-[#1a472a]">Fund a campaign</strong>: earn ReGen Token</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#1a472a]/80">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-xs">+</span>
                        </div>
                        <span><strong className="text-[#1a472a]">Contribute a skill to a project</strong>: earn both</span>
                      </li>
                      <li className="flex items-start gap-3 text-sm text-[#1a472a]/80">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-xs">+</span>
                        </div>
                        <span><strong className="text-[#1a472a]">Participate in community sessions</strong>: earn RVoice</span>
                      </li>
                    </ul>
                    <p className="text-xs text-[#1a472a]/50 mt-4 italic">
                      Token amounts vary per quest and contribution type. No financial returns are guaranteed.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#1a472a]">
        <div className="container px-4 text-center">
          <h2 
            className="text-3xl md:text-4xl font-bold text-white mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to Play?
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-8">
            Join regenerative magicians around the world who are co-creating more beautiful civilizations together!
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link href="/quest">
              <Button
                size="lg"
                className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                <span className="mr-2">🧙</span> Start Your Quest Journey
              </Button>
            </Link>
            <Link href="/seasons">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-2 border-[#7dd87d] text-[#7dd87d] hover:bg-[#7dd87d]/20"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                Apply for the Next Season → <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/governance">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-2 border-[#d4a574]/60 text-[#d4a574] hover:bg-[#d4a574]/10"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                <span className="mr-2">🌳</span> Explore How We Govern
              </Button>
            </Link>
          </div>
          
          <div className="flex justify-center mb-4">
            <SocialLinks />
          </div>
        </div>
      </section>

      {/* Related Content */}
      <RelatedContent pages={relatedContentMap.game.pages} blog={relatedContentMap.game.blog} />
    </div>
  );
}
