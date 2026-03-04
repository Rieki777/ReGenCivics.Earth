/**
 * Progressive Onboarding Component
 * New visitors: see full landing page
 * Return visitors: see "Choose Your Path" cards with quick navigation
 * Uses localStorage to track visit count
 */
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Coins, Sprout, Handshake, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { PathCardImage } from '@/components/PathCardImage';

const VISIT_KEY = 'regen_civics_visit_count';
const ONBOARDING_DISMISSED_KEY = 'regen_civics_onboarding_dismissed';

const pathCards = [
  {
    id: "fund",
    title: "Investors",
    tagline: "Fund the Renaissance",
    shortDesc: "Land-backed investments in systemic regeneration",
    href: "/fund",
    icon: Coins,
    borderColor: "border-amber-400/40",
    glowColor: "shadow-amber-400/20",
    iconColor: "text-amber-300",
    accentColor: "#fbbf24",
    image: "https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png",
    activatedImage: "https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png",
  },
  {
    id: "land",
    title: "Land Projects",
    tagline: "Evolve Your Project",
    shortDesc: "Access expertise, resources, and a global network",
    href: "/land",
    icon: Sprout,
    borderColor: "border-[#7dd87d]/40",
    glowColor: "shadow-[#7dd87d]/20",
    iconColor: "text-[#7dd87d]",
    accentColor: "#7dd87d",
    image: "https://assets.regencivics.earth/yqqImtZyZVyKlZyO.png",
    activatedImage: "https://assets.regencivics.earth/mgXrrAJIIHwfFWah.png",
  },
  {
    id: "ally",
    title: "Alliance Partners",
    tagline: "Join the Alliance",
    shortDesc: "Support regenerative projects with your org.",
    href: "/ally",
    icon: Handshake,
    borderColor: "border-blue-400/40",
    glowColor: "shadow-blue-400/20",
    iconColor: "text-blue-300",
    accentColor: "#60a5fa",
    image: "https://assets.regencivics.earth/xlNRfxzajiAdMyaP.png",
    activatedImage: "https://assets.regencivics.earth/HQpqacLKyIAkXOdS.png",
  },
  {
    id: "play",
    title: "ReGen Players",
    tagline: "Play the Game",
    shortDesc: "Earn tokens, complete quests, join the movement",
    href: "/play",
    icon: Globe,
    borderColor: "border-purple-400/40",
    glowColor: "shadow-purple-400/20",
    iconColor: "text-purple-300",
    accentColor: "#c084fc",
    image: "https://assets.regencivics.earth/LAizfmKwiZguwYMz.png",
    activatedImage: "https://assets.regencivics.earth/qDmGFHBsFPyCECbM.png",
  },
];

export function useIsReturnVisitor(): boolean {
  const [isReturn, setIsReturn] = useState(false);
  
  useEffect(() => {
    try {
      const visitCount = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
      const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';
      
      // Increment visit count
      localStorage.setItem(VISIT_KEY, String(visitCount + 1));
      
      // Return visitor = visited at least once before AND hasn't dismissed onboarding
      if (visitCount >= 1 && !dismissed) {
        setIsReturn(true);
      }
    } catch {
      // localStorage not available
    }
  }, []);
  
  return isReturn;
}

export function ProgressiveOnboarding({ onShowFullPage }: { onShowFullPage: () => void }) {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-8 px-4">
      <AnimatedSection animation="fade-in">
        <div className="text-center mb-8">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 text-shadow-strong"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome Back to <span className="text-[#7dd87d]">ReGen</span> Civics
          </h1>
          <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto text-shadow-subtle">
            Where would you like to go?
          </p>
        </div>
      </AnimatedSection>

      {/* 4 Path Cards - Mobile optimized 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 max-w-4xl w-full mb-8">
        {pathCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <AnimatedSection key={card.id} animation="slide-up" delay={index * 80}>
              <Link href={card.href}>
                <div
                  className={`glass-panel p-4 md:p-5 h-full group hover:scale-105 transition-all duration-300 ${card.borderColor} ${card.glowColor} cursor-pointer overflow-hidden`}
                >
                  {/* Card image */}
                  <div className="mb-3 h-24 md:h-32 flex items-center justify-center">
                    <PathCardImage
                      cardId={card.id as "fund" | "land" | "ally" | "play"}
                      image={card.image}
                      activatedImage={card.activatedImage}
                      title={card.title}
                      accentColor={card.accentColor}
                    />
                  </div>
                  
                  <h3
                    className="text-base md:text-lg font-bold text-white mb-1"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-white/50 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2">
                    {card.tagline}
                  </p>
                  <p className="text-white/70 text-xs md:text-sm leading-relaxed hidden md:block">
                    {card.shortDesc}
                  </p>
                  <div className="flex items-center text-xs md:text-sm font-semibold mt-2 md:mt-3 group-hover:gap-1 transition-all">
                    <span style={{ color: card.accentColor }}>Go</span>
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1" style={{ color: card.accentColor }} />
                  </div>
                </div>
              </Link>
            </AnimatedSection>
          );
        })}
      </div>

      {/* Go to Landing Page button */}
      <AnimatedSection animation="fade-in" delay={400}>
        <Button
          variant="ghost"
          onClick={onShowFullPage}
          className="text-white/60 hover:text-white hover:bg-white/10 text-sm group"
        >
          <ChevronDown className="w-4 h-4 mr-1 group-hover:translate-y-0.5 transition-transform" />
          View Full Landing Page
        </Button>
      </AnimatedSection>
    </div>
  );
}

export default ProgressiveOnboarding;
