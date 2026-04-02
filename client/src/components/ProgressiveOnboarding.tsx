/**
 * Progressive Onboarding Component
 * New visitors: see full landing page
 * Return visitors: see "Choose Your Path" cards with quick navigation
 * Uses localStorage to track visit count
 */
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Coins, Sprout, Handshake, Globe, ChevronDown, Map, Compass, MessageSquare, TrendingUp, Zap, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { PathCardImage } from '@/components/PathCardImage';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { cdnImg } from "@/lib/utils";

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
    image: cdnImg("https://assets.regencivics.earth/lbnKFdCSSCxSsgLa.png"),
    activatedImage: cdnImg("https://assets.regencivics.earth/ryfVYMtjiLnLKYwN.png"),
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
    image: cdnImg("https://assets.regencivics.earth/yqqImtZyZVyKlZyO.png"),
    activatedImage: cdnImg("https://assets.regencivics.earth/mgXrrAJIIHwfFWah.png"),
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
    image: cdnImg("https://assets.regencivics.earth/xlNRfxzajiAdMyaP.png"),
    activatedImage: cdnImg("https://assets.regencivics.earth/HQpqacLKyIAkXOdS.png"),
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
    image: cdnImg("https://assets.regencivics.earth/LAizfmKwiZguwYMz.png"),
    activatedImage: cdnImg("https://assets.regencivics.earth/qDmGFHBsFPyCECbM.png"),
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

function PersonalizedCards() {
  const { user } = useAuth();
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });
  const { data: investorInquiry } = trpc.investorInquiries.mine.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });

  const hasVisitedForum =
    typeof window !== 'undefined' &&
    localStorage.getItem('regen_visited_forum') === 'true';

  if (!user || !profile) return null;

  type PersonalCard = {
    id: string;
    title: string;
    subtitle: string;
    href: string;
    image: string;
    accentColor: string;
    icon: React.ElementType;
  };

  const cards: PersonalCard[] = [];

  const completedQuests: number[] = (() => {
    try { return JSON.parse((profile as any).questsCompleted ?? '[]') ?? []; }
    catch { return []; }
  })();

  const isInvestor = profile.path === 'investor' || !!investorInquiry;

  if (profile.path) {
    cards.push({ id: 'journey-quests', title: 'Journey Quests', subtitle: 'Welcome to the Journey Quests', href: '/profile#quests', image: '/images/return-cards/journey-quests.webp', accentColor: '#7dd87d', icon: Map });
  }
  if (completedQuests.length > 0 && completedQuests.length < 12) {
    cards.push({ id: 'next-quest', title: 'Continue Your Quest', subtitle: `Quest ${completedQuests.length + 1} of 12 awaits`, href: '/quest', image: '/images/return-cards/next-quest.webp', accentColor: '#fbbf24', icon: Compass });
  }
  if (hasVisitedForum) {
    cards.push({ id: 'community', title: 'Back to the Forum', subtitle: 'Continue the conversation', href: '/community', image: '/images/return-cards/community.webp', accentColor: '#60a5fa', icon: MessageSquare });
  }
  if (profile.path === 'investor' && (profile as any).investorFormSubmitted) {
    cards.push({ id: 'opportunity', title: 'Investor Dashboard', subtitle: 'View the opportunity', href: '/opportunity', image: '/images/return-cards/opportunity.webp', accentColor: '#a78bfa', icon: TrendingUp });
  }
  if (profile.path === 'land_project') {
    cards.push({ id: 'accelerator', title: 'Seasonal Accelerator', subtitle: 'Grow your project', href: '/apply', image: '/images/return-cards/accelerator.webp', accentColor: '#34d399', icon: Zap });
  }
  // Discovery Call: investors only (Rye is only taking calls from investors)
  if (isInvestor) {
    cards.push({ id: 'schedule', title: 'Book a Discovery Call', subtitle: 'Talk with the team', href: '/schedule', image: '/images/return-cards/schedule.webp', accentColor: '#f472b6', icon: CalendarDays });
  }

  if (cards.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mb-6">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
        Pick up where you left off
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <AnimatedSection key={card.id} animation="fade-in">
              <Link href={card.href}>
                <div
                  className="glass-panel p-3 w-40 md:w-48 group hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
                  style={{ borderColor: `${card.accentColor}33` }}
                >
                  <div className="h-20 mb-2 overflow-hidden rounded-md bg-white/5">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      width="340"
                      height="80"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon className="w-3 h-3 flex-shrink-0" style={{ color: card.accentColor }} />
                    <span className="text-white text-xs font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
                      {card.title}
                    </span>
                  </div>
                  <p className="text-white/60 text-[10px] leading-tight">{card.subtitle}</p>
                </div>
              </Link>
            </AnimatedSection>
          );
        })}
      </div>
    </div>
  );
}

export function ProgressiveOnboarding({ onShowFullPage }: { onShowFullPage: () => void }) {
  const { user } = useAuth();
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, { enabled: !!user, staleTime: 300_000 });
  const { data: investorInquiry } = trpc.investorInquiries.mine.useQuery(undefined, { enabled: !!user, staleTime: 300_000 });
  const { data: myClaims } = trpc.orgClaims.mine.useQuery(undefined, { enabled: !!user, staleTime: 300_000 });
  const { data: myApplications } = trpc.applications.myApplications.useQuery(undefined, { enabled: !!user, staleTime: 300_000 });
  const { data: myCompletions } = trpc.quest.myCompletions.useQuery(undefined, { enabled: !!user, staleTime: 300_000 });

  const userPaths = {
    fund: profile?.path === 'investor' || !!investorInquiry,
    land: profile?.path === 'land_project'
      || !!(myClaims?.some((c: any) => c.entityType === 'land_project' && c.status === 'approved'))
      || !!(myApplications?.some((a: any) => a.status === 'approved' || a.status === 'active')),
    ally: !!(myClaims?.some((c: any) => c.entityType === 'organisation' && c.status === 'approved')),
    play: !!(myCompletions && myCompletions.length > 0),
  };

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

      {/* Personalized shortcut cards  -  shown above path cards for return visitors */}
      <PersonalizedCards />

      {/* 4 Path Cards - Mobile optimized 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 max-w-4xl w-full mb-8">
        {pathCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <AnimatedSection key={card.id} animation="slide-up" delay={index * 80}>
              <Link href={card.href}>
                <div
                  className={`relative glass-panel p-4 md:p-5 h-full group hover:scale-105 transition-all duration-300 ${card.borderColor} ${card.glowColor} cursor-pointer overflow-hidden`}
                >
                  {/* YOUR PATH badge */}
                  {userPaths[card.id as keyof typeof userPaths] && (
                    <span className="absolute top-2 right-2 bg-[#7dd87d] text-[#0d2818] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide z-10">
                      Your Path
                    </span>
                  )}
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
                    style={{ fontFamily: 'var(--font-display)', textShadow: '0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-white/70 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)' }}>
                    {card.tagline}
                  </p>
                  <p className="text-white/80 text-xs md:text-sm leading-relaxed hidden md:block" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {card.shortDesc}
                  </p>
                  <div className="flex items-center text-xs md:text-sm font-semibold mt-2 md:mt-3 group-hover:gap-1 transition-all" style={{ textShadow: '0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)' }}>
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
          className="text-white/80 hover:text-white hover:bg-white/10 text-sm font-medium group"
        >
          <ChevronDown className="w-4 h-4 mr-1 group-hover:translate-y-0.5 transition-transform" />
          View Full Landing Page
        </Button>
      </AnimatedSection>
    </div>
  );
}

export default ProgressiveOnboarding;
