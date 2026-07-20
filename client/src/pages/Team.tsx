/**
 * Team Page
 * Design: Regenerative Ikigai theme with tree of life
 * Focus: Dynamic organization, Hypha link, how we work
 */

import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { gameRoles } from '@/data/gameRoles';
import { trpc } from '@/lib/trpc';
import { RolePortalCard } from '@/components/RolePortalCard';
import { SeasonalRhythmSection } from '@/components/SeasonalRhythmSection';
import { HowToApplySection } from '@/components/HowToApplySection';
import { RoleVariablesSection } from '@/components/RoleVariablesSection';
import { SeasonScorecardSection } from '@/components/SeasonScorecardSection';
import { 
  ExternalLink,
  Heart,
  Eye,
  Users,
  Compass,
  Lightbulb,
  MessageCircle,
  BookOpen,
  Sparkles,
  TreeDeciduous,
  Home as HomeIcon,
  ArrowRight,
  Calendar,
  Target,
  Coins,
  HelpCircle,
  Wrench,
  Search,
  Sprout,
  Link2,
  Megaphone,
  X,
  ChevronRight
} from 'lucide-react';
import { TypewriterText } from '@/components/TypewriterText';
import { SeedOfLifeIcon } from '@/components/SeedOfLifeIcon';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SEO, pageSEO } from '@/components/SEO';
import { RelatedContent, relatedContentMap } from "@/components/RelatedContent";
import { LazyImage } from "@/components/LazyImage";
import { cdnImg } from "@/lib/utils";

const coreValues = [
  { icon: Heart, title: "Honesty (with Empathy)", description: "We speak truth with care, balancing directness with compassion for each other's journeys." },
  { icon: Eye, title: "Transparency", description: "Our processes, decisions, and finances are open for all members to see and understand." },
  { icon: Users, title: "Responsibility", description: "We own our commitments and hold ourselves accountable to the community." },
  { icon: Compass, title: "Focus", description: "We channel our energy toward what matters most for the ReGenerative Renaissance." },
  { icon: Heart, title: "Compassion", description: "We approach each other and our work with kindness, understanding, and care." }
];

const archetypes = [
  { 
    emoji: "🛠️", 
    title: "Building & Developing", 
    description: "Creating tools, systems, and infrastructure that serve the regenerative movement.",
    examples: ["Building out our Game platform", "Creating infrastructure for our portfolio of land projects", "Developing governance tools", "Building dashboards and tracking systems"]
  },
  { 
    emoji: "🔬", 
    title: "Researching & Architecting", 
    description: "Designing frameworks, exploring possibilities, and mapping the path forward.",
    examples: ["Designing tokenomics models", "Researching regenerative land practices", "Creating organizational frameworks", "Mapping ecosystem relationships"]
  },
  { 
    emoji: "🌱", 
    title: "Facilitating & Space Holding", 
    description: "Creating containers for collaboration, learning, and community growth.",
    examples: ["Facilitating community sessions", "Hosting Season incubators", "Running onboarding calls", "Holding space for conflict resolution"]
  },
  { 
    emoji: "🔗", 
    title: "Catalyzing & Connecting", 
    description: "Weaving relationships, building bridges, and sparking new possibilities.",
    examples: ["Helping onboard new land projects", "Making key introductions to alliances", "Connecting investors with projects", "Building partnership networks"]
  },
  { 
    emoji: "📖", 
    title: "Storytelling & Communicating", 
    description: "Sharing our vision, documenting our journey, and inspiring others to join.",
    examples: ["Amplifying the story of our movement", "Creating content that inspires", "Documenting our journey", "Managing social media presence"]
  }
];

const howWeWork = [
  { 
    step: 1, 
    title: "Join Community Sessions", 
    description: "Attend our regular gatherings to learn about the game and meet fellow players.",
    link: "/schedule",
    linkText: "View Schedule",
    icon: Calendar
  },
  { 
    step: 2, 
    title: "Try Out Some Quests", 
    description: "Start with small quests to get a feel for how we work and build trust.",
    link: "/quest",
    linkText: "Explore Quests",
    icon: Target
  },
  { 
    step: 3, 
    title: "Explore Compensation", 
    description: "Review historical compensation for similar contributions to see if it aligns with your needs.",
    link: "/community/post/624",
    linkText: "Ask in Forum",
    icon: Coins
  },
  { 
    step: 4, 
    title: "Check for Collaborators", 
    description: "Is anyone else already working on the same area? Ask them if your help would be appreciated!",
    link: "/socials",
    linkText: "Connect with Others",
    icon: HelpCircle
  },
  { 
    step: 5, 
    title: "Find Your Ikigai", 
    description: "Discover the intersection of what you love, what you're great at, what we need, and what we can compensate.",
    icon: Sparkles
  },
  { 
    step: 6, 
    title: "Make a Proposal", 
    description: "Propose your contribution and agree on fair value exchange with the community. We prioritize 1st time proposals from those already active in the ReGen Game Space.",
    icon: MessageCircle,
    externalLinks: [
      { text: "ReGen Civics Space", url: "https://app.hypha.earth/en/dho/regen-civics/agreements" },
      { text: "ReGen Game Space", url: "https://app.hypha.earth/en/dho/regen-games/agreements" }
    ]
  }
];

const openRoles = [
  {
    title: "Season Facilitator",
    purpose: "Guide and support the 13 land projects through their incubation journey each season",
    circle: "Incubation Circle",
    accountability: "Facilitate weekly sessions, track project progress, ensure resources flow to projects",
    domain: "Season incubation process and project support protocols",
    assignment: "Filled - Seeking 1-2 co-facilitators"
  },
  {
    title: "Investment Relations Lead",
    purpose: "Build and maintain relationships with investors and alliance partners",
    circle: "Alliance Circle",
    accountability: "Investor communications, partnership development, funding pipeline management",
    domain: "Investor relations strategy and alliance onboarding",
    assignment: "Open"
  },
  {
    title: "Land Project Liaison",
    purpose: "Support land projects in navigating the ReGen Civics ecosystem",
    circle: "Projects Circle",
    accountability: "Onboard new projects, connect them with resources, track their needs",
    domain: "Project intake process and support coordination",
    assignment: "Open - 2 positions"
  },
  {
    title: "Community Engagement Coordinator",
    purpose: "Build active community participation and member engagement",
    circle: "Community Circle",
    accountability: "Organize events, welcome new members, maintain community health",
    domain: "Community events calendar and engagement initiatives",
    assignment: "Open - Seeking co-creators"
  },
  {
    title: "Governance Architect",
    purpose: "Design and evolve our governance systems and processes",
    circle: "Anchor Circle",
    accountability: "Maintain game guide, facilitate governance proposals, document decisions",
    domain: "Governance documentation and proposal processes",
    assignment: "Partially filled - Support needed"
  },
  {
    title: "Treasury Steward",
    purpose: "Ensure transparent and effective management of community resources",
    circle: "Finance Circle",
    accountability: "Track funds, process payments, report on treasury health",
    domain: "Treasury operations and financial reporting",
    assignment: "Partially filled - Seeking support"
  },
  {
    title: "Communications & Storytelling Lead",
    purpose: "Amplify the ReGenerative Renaissance story and grow our movement",
    circle: "Communications Circle",
    accountability: "Content creation, social media, newsletter, brand consistency",
    domain: "External communications and brand voice",
    assignment: "Open - Creative souls welcome"
  },
  {
    title: "Technical Infrastructure Builder",
    purpose: "Build and maintain the technical systems that power our game",
    circle: "Tech Circle",
    accountability: "Website, tools, integrations, technical documentation",
    domain: "Technical architecture and development priorities",
    assignment: "Partially filled - Builders needed"
  }
];

// Flippable Archetype Card Component
function ArchetypeCard({ archetype }: { archetype: typeof archetypes[0] }) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div
      className="relative h-64 cursor-pointer perspective-1000"
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label="Flip card for details"
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIsFlipped(!isFlipped); } }}
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20 text-center flex flex-col items-center justify-center">
          <div className="text-4xl mb-4">{archetype.emoji}</div>
          <h3 className="text-lg font-bold text-white mb-2">{archetype.title}</h3>
          <p className="text-white/60 text-sm">{archetype.description}</p>
          <p className="text-[#7dd87d] text-xs mt-4">Click to see examples →</p>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-[#7dd87d]/20 to-[#1a472a] rounded-2xl p-6 border border-[#7dd87d]/40">
          <h4 className="text-[#7dd87d] font-bold text-sm mb-3 uppercase tracking-wide">Examples</h4>
          <ul className="space-y-2">
            {archetype.examples.map((example, i) => (
              <li key={i} className="text-white/80 text-sm flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-[#7dd87d] flex-shrink-0 mt-0.5" />
                {example}
              </li>
            ))}
          </ul>
          <p className="text-white/60 text-xs mt-4 absolute bottom-4 left-6">Click to flip back</p>
        </div>
      </div>
    </div>
  );
}

// Role Card Modal Component
function RoleModal({ role, onClose }: { role: typeof openRoles[0], onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        className="bg-gradient-to-br from-[#1a472a] to-[#0d2818] rounded-2xl p-8 max-w-lg w-full border border-[#7dd87d]/30 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h3 id="role-modal-title" className="text-2xl font-bold text-white">{role.title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-[#7dd87d] font-semibold text-sm uppercase tracking-wide mb-1">Purpose</h4>
            <p className="text-white/80">{role.purpose}</p>
          </div>
          
          <div>
            <h4 className="text-[#7dd87d] font-semibold text-sm uppercase tracking-wide mb-1">Circle</h4>
            <p className="text-white/80">{role.circle}</p>
          </div>
          
          <div>
            <h4 className="text-[#7dd87d] font-semibold text-sm uppercase tracking-wide mb-1">Accountability</h4>
            <p className="text-white/80">{role.accountability}</p>
          </div>
          
          <div>
            <h4 className="text-[#7dd87d] font-semibold text-sm uppercase tracking-wide mb-1">Domain</h4>
            <p className="text-white/80">{role.domain}</p>
          </div>
          
          <div>
            <h4 className="text-[#7dd87d] font-semibold text-sm uppercase tracking-wide mb-1">Assignment</h4>
            <p className="text-white/80">{role.assignment}</p>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4">
          <Link 
            href={`/connect?path=role&role=${encodeURIComponent(role.title)}&circle=${encodeURIComponent(role.circle)}&purpose=${encodeURIComponent(role.purpose)}`}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-4 py-3 rounded-xl font-semibold transition-colors"
          >
            Apply for This Role
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Interactive Ikigai Circle Component
function IkigaiCircle({ 
  color, 
  position, 
  label, 
  sublabel, 
  emoji,
  isActive,
  onClick 
}: { 
  color: string, 
  position: { top?: string, bottom?: string, left?: string, right?: string, width: string, height: string },
  label: string,
  sublabel: string,
  emoji: string,
  isActive: boolean,
  onClick: () => void
}) {
  return (
    <div 
      className={`absolute rounded-full backdrop-blur-sm transition-all duration-500 cursor-pointer
        ${isActive ? 'z-20 scale-110' : 'z-10 hover:scale-105'}
      `}
      style={{ 
        ...position,
        background: `linear-gradient(135deg, ${color}40 0%, ${color}15 100%)`,
        border: `2px solid ${isActive ? color : color + '60'}`,
        boxShadow: isActive ? `0 0 30px ${color}50` : 'none'
      }}
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-4">
          <span className="text-3xl block mb-2">{emoji}</span>
          <span className="font-bold text-base uppercase tracking-wide drop-shadow-lg" style={{ color }}>{label}</span>
          <span className="block text-white text-sm mt-1 drop-shadow-md">{sublabel}</span>
        </div>
      </div>
    </div>
  );
}

type RoleView = "game" | "fund" | "all";

export default function Team() {
  // Role portal cards handle their own modal state via RolePortalCard
  const [roleView, setRoleView] = useState<RoleView>("game");

  // Sync with URL param on mount so /team?view=fund links work
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v === "fund" || v === "game" || v === "all") {
      setRoleView(v);
    }
  }, []);

  const setViewAndUrl = (v: RoleView) => {
    setRoleView(v);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (v === "game") {
      params.delete("view");
    } else {
      params.set("view", v);
    }
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", newUrl);
  };

  // Roles come from the DB (seeded from gameRoles.ts). Fall back to the static
  // seed data if the query is empty or errors, so the page always renders.
  const rolesQuery = trpc.roles.list.useQuery(undefined, { staleTime: 60_000 });
  const allRoles = rolesQuery.data && rolesQuery.data.length > 0
    ? (rolesQuery.data as unknown as typeof gameRoles)
    : gameRoles;
  const gameOnly = allRoles.filter((r) => r.kind !== "fund");
  const fundOnly = allRoles.filter((r) => r.kind === "fund");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] via-[#2d5a3d] to-[#1a472a]">
      <SEO {...pageSEO.team} />
      
      {/* CSS for card flip animation */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
      
      {/* Mission Statement - shown first on entry */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative bg-gradient-to-br from-[#7dd87d]/20 via-[#4a7c59]/15 to-[#1a472a]/30 backdrop-blur-md rounded-3xl p-10 md:p-12 border-2 border-[#7dd87d]/40 text-center shadow-2xl shadow-[#7dd87d]/10 overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#7dd87d]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#7dd87d]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

            {/* Icon */}
            <div className="relative z-10 mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7dd87d] to-[#4a7c59] rounded-2xl shadow-lg shadow-[#7dd87d]/30 animate-bounce-gentle p-2">
                <SeedOfLifeIcon size={48} className="text-white w-full h-full" />
              </div>
            </div>

            {/* Mission text with typewriter effect */}
            <p className="relative z-10 text-white text-2xl md:text-3xl font-semibold leading-relaxed min-h-[4rem]" style={{ fontFamily: 'var(--font-display)' }}>
              <TypewriterText
                text="Welcome to an adventure in co-creating organizations for a Regenerative Civilization"
                speed={40}
                delay={300}
              />
            </p>

            {/* Subtle decorative line */}
            <div className="relative z-10 mt-8 flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#7dd87d] to-transparent rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage
            src={cdnImg("https://assets.regencivics.earth/PPEoXqTcNBKerkDe.jpg")}
            alt="Regenerative Ikigai"
            className="blur-up w-full h-full object-cover"
            placeholder={<div className="w-full h-full bg-[#1a472a]" />}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a]/85 via-[#1a472a]/75 to-[#1a472a]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          {/* Text backdrop for better readability */}
          <div className="max-w-4xl mx-auto bg-[#1a472a]/60 backdrop-blur-md rounded-3xl p-8 md:p-12">
          <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#7dd87d]/30">
            <Users className="w-5 h-5 text-[#7dd87d]" />
            <span className="text-[#7dd87d] font-medium">A Dynamic, Self-Organizing Team</span>
          </div>

          <h1 className="ink-reveal text-5xl md:text-7xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Who <span className="text-[#7dd87d]">We Are</span>
          </h1>

          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-4 safe-prose">
            We're not your average organisation. We use the same tools we help Land Projects adopt to co-create a constantly evolving organism of passionate individuals united by a shared purpose: catalyzing the ReGenerative Renaissance.
          </p>

          <p className="text-base text-white/60 max-w-2xl mx-auto mb-8 leading-relaxed safe-prose">
            Over 150 people have helped build this infrastructure. No single face is more important than another, so we list none.
          </p>

          <a
            href="https://app.hypha.earth/en/dho/regen-civics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            <TreeDeciduous className="w-5 h-5" />
            Explore Our Living Organization
            <ExternalLink className="w-4 h-4" />
          </a>
          </div>
        </div>
      </section>

      {/* How We Work - Updated with Links - MOVED TO TOP */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              How to <span className="text-[#7dd87d]">Join the Game</span>
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Playing the game of ReGen Civics starts with discovering your unique contribution
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {howWeWork.map((item) => (
              <div key={item.step} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#7dd87d]/20 rounded-full flex items-center justify-center text-[#7dd87d] font-bold">
                    {item.step}
                  </div>
                  {item.icon && <item.icon className="w-5 h-5 text-[#7dd87d]" />}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm mb-4">{item.description}</p>
                {item.link && (
                  <Link href={item.link}>
                    <span className="inline-flex items-center gap-1 text-[#7dd87d] text-sm font-medium hover:underline cursor-pointer">
                      {item.linkText}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                )}
                {item.externalLinks && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.externalLinks.map((extLink: { text: string; url: string }, idx: number) => (
                      <a 
                        key={idx}
                        href={extLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#7dd87d] text-sm font-medium hover:underline"
                      >
                        {extLink.text}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Cards: Toggle + Game & Fund Role Cards */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Segmented toggle */}
          <div className="flex justify-center mb-8" role="tablist" aria-label="Role view selector">
            <div className="inline-flex items-center gap-1 bg-[#0d2818]/70 border border-white/15 rounded-full p-1 backdrop-blur-sm">
              <button
                role="tab"
                aria-selected={roleView === 'game'}
                onClick={() => setViewAndUrl('game')}
                className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all focus-ring ${
                  roleView === 'game'
                    ? 'bg-[#7dd87d] text-[#0d2818] shadow-[0_0_20px_rgba(125,216,125,0.35)]'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1.5">🎮</span>Game Roles
              </button>
              <button
                role="tab"
                aria-selected={roleView === 'fund'}
                onClick={() => setViewAndUrl('fund')}
                className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all focus-ring ${
                  roleView === 'fund'
                    ? 'bg-[#d4a574] text-[#0d2818] shadow-[0_0_20px_rgba(212,165,116,0.35)]'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1.5">🏛️</span>Fund Roles
              </button>
              <button
                role="tab"
                aria-selected={roleView === 'all'}
                onClick={() => setViewAndUrl('all')}
                className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all focus-ring ${
                  roleView === 'all'
                    ? 'bg-white/90 text-[#0d2818]'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Game Roles block */}
          {(roleView === 'game' || roleView === 'all') && (
            <div className="mb-10">
              <div className="max-w-3xl mx-auto mb-6 bg-[#0d2818]/60 border border-[#7dd87d]/30 rounded-2xl p-4 md:p-5 text-center">
                <p className="text-white/85 text-sm md:text-base leading-relaxed">
                  These roles coordinate the <span className="font-bold text-[#7dd87d]">ReGen Infinite Game</span>.
                  They steward quests, players, the forum, and the Living Game economy. Compensated in $ReGen.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gameOnly.map((role, index) => (
                  <RolePortalCard key={`g-${index}`} role={role} />
                ))}
              </div>
            </div>
          )}

          {/* Fund Roles block */}
          {(roleView === 'fund' || roleView === 'all') && fundOnly.length > 0 && (
            <div className="mb-6">
              <div className="max-w-3xl mx-auto mb-6 bg-[#0d2818]/60 border border-[#d4a574]/40 rounded-2xl p-4 md:p-5 text-center">
                <p className="text-white/85 text-sm md:text-base leading-relaxed">
                  These roles coordinate the <span className="font-bold text-[#d4a574]">ReGen Civics Fund</span>.
                  They steward capital, due diligence, and investor relationships. Compensated in $RCivics.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {fundOnly.map((role, index) => (
                  <RolePortalCard key={`f-${index}`} role={role} />
                ))}
              </div>
            </div>
          )}

          {/* Missing Role Callout */}
          <div className="mt-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-[#7dd87d]/20 text-center">
            <p className="text-white/70 text-sm">
              <span className="text-[#7dd87d] font-semibold">See a role missing?</span>{' '}
              <a href="/community/c/roles-dialogue" className="text-[#7dd87d] underline hover:text-[#9de89d] transition-colors">Tell us in the Roles Dialogue thread.</a>
            </p>
          </div>

          {/* Fleet Roles: the ReGen Ship + Fleet operating roles (paid in USD). */}
          <div className="mt-12">
            <div className="max-w-3xl mx-auto mb-6 bg-[#0d2818]/60 border border-[#2b7fb8]/40 rounded-2xl p-4 md:p-5 text-center">
              <p className="text-white/85 text-sm md:text-base leading-relaxed">
                These roles keep the <span className="font-bold text-[#7dd87d]">ReGen Fleet</span> sailing.
                They hold the ships between voyages, in real life, on the land. Paid per turnover.
              </p>
            </div>
            <div className="max-w-3xl mx-auto bg-[#0d2818]/70 border border-white/15 rounded-2xl p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl" aria-hidden="true">⚓</span>
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>The Keeper of the Fleet</h3>
              </div>
              <p className="text-white/80 leading-relaxed mb-4">
                Between every voyage, someone holds the ship. The Keeper resets her on the Monday turnover,
                between 11am and 5pm, runs the two-hour orientation and the handing of the keys for every first-time crew,
                counts her treasures at boarding and return, and keeps her healthy voyage after voyage. Flat pay,
                two hundred dollars per turnover.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/blog/keeper-of-the-fleet" className="inline-flex items-center gap-1.5 bg-[#7dd87d] text-[#0d2818] font-semibold px-4 py-2 rounded-full hover:bg-[#9de89d] transition-colors">
                  Read the full role <span aria-hidden="true">→</span>
                </a>
                <a href="/ship/keeper" className="inline-flex items-center gap-1.5 border border-white/30 text-white font-semibold px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                  Apply to keep her
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Sides: How the Roles Work Together narrative */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-[#d4a574]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#d4a574]/30">
              <span className="text-lg">🌉</span>
              <span className="text-[#d4a574] font-medium text-sm uppercase tracking-wide">How the Roles Work Together</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Two sides of the <span className="text-[#7dd87d]">same bridge</span>
            </h2>
          </div>

          {/* The Narrative Story, always visible, explains how Game and Fund weave together */}
          <div className="max-w-4xl mx-auto mb-10 space-y-5 text-white/85 leading-relaxed safe-prose">
            <p>
              ReGen Civics runs on two sides of one bridge. The{' '}
              <button
                onClick={() => setViewAndUrl('game')}
                className="text-[#7dd87d] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#9de89d] transition-colors"
              >
                Infinite Game
              </button>{' '}
              is where players, quests, forum life, and the living economy unfold. The{' '}
              <button
                onClick={() => setViewAndUrl('fund')}
                className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors"
              >
                ReGen Civics Fund
              </button>{' '}
              is where capital meets land and regeneration gets paid for. Each side has its own roles, its own token, its own rhythm. They hand things to each other across the middle.
            </p>

            <p>
              Every investment flows through the same spine. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Due Diligence Lead</button>{' '}
              visits the land, reads the team, and writes the memo. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Fund Steward</button>{' '}
              drafts the Hypha DAO proposal. The committee (Steward, Diligence Lead, Capital Weaver, and Portfolio Tender once seated) reviews it together. The Hypha DAO casts its weighted $RCivics voice and the call is made.
            </p>

            <p>
              After deployment, the{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Portfolio Tender</button>{' '}
              walks beside the project month to month. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Impact Witness</button>{' '}
              measures what is actually happening on the ground. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Fund Treasurer</button>{' '}
              tracks the money and keeps the fund audit-ready. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Structure Keeper</button>{' '}
              makes sure every step lives inside a real legal vessel. The{' '}
              <button onClick={() => setViewAndUrl('fund')} className="text-[#d4a574] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#d4a574] transition-colors">Capital Weaver</button>{' '}
              is the loop back to investors, narrating the whole cycle.
            </p>

            <p>
              The Game side weaves the other half.{' '}
              <button onClick={() => setViewAndUrl('game')} className="text-[#7dd87d] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#9de89d] transition-colors">Alliance Weaver</button>{' '}
              connects partner organizations into the ecosystem.{' '}
              <button onClick={() => setViewAndUrl('game')} className="text-[#7dd87d] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#9de89d] transition-colors">Season Facilitator</button>{' '}
              walks with incubator projects through their quests. The{' '}
              <button onClick={() => setViewAndUrl('game')} className="text-[#7dd87d] font-semibold underline decoration-dotted underline-offset-4 hover:text-[#9de89d] transition-colors">Storyteller</button>{' '}
              holds the public narrative of what the fund and the Game are building together. Different waters, same river. Game roles are compensated in $ReGen. Fund roles are compensated in $RCivics.
            </p>
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <HowToApplySection />

      {/* Regenerative Ikigai */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              The Regenerative <span className="text-[#7dd87d]">Ikigai</span>
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              At the heart of how we work is our Regenerative Ikigai: finding the sweet spot where our passion, skills, purpose, and livelihood intersect in service of regeneration.
            </p>
          </div>

          {/* Static Ikigai Diagram Image */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <LazyImage
              src={cdnImg("https://assets.regencivics.earth/sceUJeMUZWMBHqFi.png")}
              alt="Regenerative Ikigai - The intersection of what you love creating, what you're good at, what the renaissance needs, and what ReGen Civics will pay you for"
              className="w-full h-auto"
              aspect="1/1"
            />
            <p className="text-center text-white/60 text-sm mt-4 italic">
              Ikigai (生き甲斐) is a Japanese concept meaning "a reason for being" - a purpose in life that makes one's life worthwhile.
            </p>
          </div>

          {/* Goal Statement Box - moved below image */}
          <div className="bg-gradient-to-r from-[#7dd87d]/20 via-[#7dd87d]/10 to-[#7dd87d]/20 backdrop-blur-sm rounded-2xl p-6 mb-12 border border-[#7dd87d]/30 text-center max-w-2xl mx-auto">
            <p className="text-white text-lg font-medium">
              🌍 Our goal is a civilization designed around organisations filled with people playing out their <span className="text-[#7dd87d]">Regenerative Ikigai's</span> in service to life.
            </p>
          </div>

        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Our <span className="text-[#7dd87d]">Commitments</span>
            </h2>
            <p className="text-lg text-white/70">
              The values that guide how we work together
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreValues.map((value, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
                <value.icon className="w-8 h-8 text-[#7dd87d] mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">{value.title}</h3>
                <p className="text-white/60 text-sm">{value.description}</p>
              </div>
            ))}
            
            <div className="bg-gradient-to-br from-[#7dd87d]/20 to-transparent rounded-2xl p-6 border border-[#7dd87d]/30">
              <Sparkles className="w-8 h-8 text-[#7dd87d] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">For Anyone, Not Everyone</h3>
              <p className="text-white/60 text-sm">We welcome explorers who are among the first to study and develop new ways of being. This path isn't for everyone, but it might be for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Archetypal Contributions - Now Clickable */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              5 Archetypal <span className="text-[#7dd87d]">Contributions</span>
            </h2>
            <p className="text-lg text-white/70">
              Different ways to contribute to the regenerative movement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archetypes.map((archetype, index) => (
              <ArchetypeCard key={index} archetype={archetype} />
            ))}
          </div>
        </div>
      </section>

      {/* Seasonal Rhythm */}
      {/* Role Variables: Seed & Harvest */}
      <RoleVariablesSection />

      {/* Seasonal Rhythm */}
      <SeasonalRhythmSection />

      {/* Season Scorecard */}
      <SeasonScorecardSection />

      {/* Key Principles */}
      <section className="py-20 px-4 bg-[#0d2818]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Our <span className="text-[#7dd87d]">Philosophy</span>
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">Members Don't Sell Their Time</h3>
                <p className="text-white/60">We contribute value, not hours. Compensation is based on impact and outcomes, not time spent.</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
              <Users className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">Power-With, Not Power-Over</h3>
                <p className="text-white/60">We practice collaborative leadership where influence comes from contribution and wisdom, not position.</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
              <Compass className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">Inspiration Over Delegation</h3>
                <p className="text-white/60">We inspire action through shared vision rather than assigning tasks through hierarchy.</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
              <BookOpen className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">Learning Over Failing, Successfully</h3>
                <p className="text-white/60">Every experiment teaches us something. We embrace iteration and continuous improvement.</p>
              </div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-[#7dd87d]/20 flex items-start gap-4">
              <MessageCircle className="w-6 h-6 text-[#7dd87d] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-1">Dynamically Self-Organizing</h3>
                <p className="text-white/60">We adapt and reorganize around the ReGenerative Renaissance's evolving needs.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Governance Section (migrated from old homepage) */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#1a472a] to-[#0d2818]">
        <div className="container mx-auto max-w-4xl text-center">
          <AnimatedSection animation="slide-up">
            <div
              className="inline-block px-5 py-2 mb-6 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30 text-base"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              Transparent Governance
            </div>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={100}>
            <h2
              className="text-4xl md:text-5xl font-bold mb-6 text-white"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              See How We <span className="text-[#7dd87d]">Co-Govern</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={200}>
            <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto safe-prose">
              Explore our <span className="text-[#7dd87d] font-semibold">Hypha Space</span> to see how we transparently govern, send funds, and make decisions. Everything is open.
            </p>
          </AnimatedSection>

          <AnimatedSection animation="slide-up" delay={300}>
            <a
              href="https://app.hypha.earth/en/dho/regen-civics/agreements"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] text-lg px-10 py-6 h-auto"
                style={{ fontFamily: 'var(--font-accent)' }}
              >
                <span className="flex items-center gap-2">
                  🌿 Explore Our Hypha Space
                  <ExternalLink className="w-5 h-5" />
                </span>
              </Button>
            </a>
          </AnimatedSection>

          {/* Governance Features */}
          <AnimatedSection animation="slide-up" delay={400}>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Democratic Decisions
                </h3>
                <p className="text-white/70 text-base">
                  Every major decision is voted on by community members
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-6 h-6 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Transparent Funds
                </h3>
                <p className="text-white/70 text-base">
                  Track every transaction and see where funds flow
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-[#7dd87d]/20">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-[#7dd87d]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                  Open Agreements
                </h3>
                <p className="text-white/70 text-base">
                  All agreements and policies are publicly accessible
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#0d2818] to-[#1a472a]">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Ready to <span className="text-[#7dd87d]">Explore</span>?
          </h2>
          <p className="text-lg text-white/70 mb-8 safe-prose">
            Dive into our living organization on Hypha to see who's currently contributing, what projects are active, and how you might find your place in the regenerative movement.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
          
          </div>
        </div>
      </section>
    </div>
  );
}
