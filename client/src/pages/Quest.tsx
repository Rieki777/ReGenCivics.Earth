/**
 * Quest Page - ReGen Civics
 * Design: Enchanted Forest Storybook - playful, game-like
 * Content sourced from SEEDS Quest knowledge base
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ExternalLink, Flame, Sprout, Sun, Leaf, Snowflake, Sparkles, Heart, Users, Vote, Coins, BookOpen, TreeDeciduous, Droplets, Home as HomeIcon, Music, Circle, Wind, MessageSquare, GitBranch, Brain, Apple, Play, RotateCcw, ArrowRight, ChevronDown, Copy, Check, ClipboardCopy, Download, ImageIcon } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { Link } from "wouter";
import { ParallaxSection } from "@/components/ParallaxSection";
import { QuestProgressTracker, QuestProgressProvider, QuestCompletionBadge, MarkCompleteButton } from "@/components/QuestProgressTracker";
import { QuestDetailModal, questDetailsData } from "@/components/QuestDetailModal";
import { QuestBadges } from "@/components/QuestBadges";
import { QuestLeaderboard } from "@/components/QuestLeaderboard";
import { QuestFilter, QuestCategory, QuestDifficulty, QuestTime, QUEST_METADATA } from "@/components/QuestFilter";
import { SocialLinks } from "@/components/SocialLinks";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { QuestCarousel } from "@/components/QuestCarousel";

// Image base URL for quest art  -  drop files matching quest-NN-slug.png to this path
const QUEST_IMG_BASE = "https://assets.regencivics.earth/quests";

function questImageUrl(id: number, slug: string) {
  return `${QUEST_IMG_BASE}/quest-${String(id).padStart(2, '0')}-${slug}.png`;
}

function questImageFallback(id: number, slug: string) {
  return `/images/quests/quest-${String(id).padStart(2, '0')}-${slug}.png`;
}

// Quest data organized by season
const questData = {
  intro: {
    id: 0,
    slug: "fire",
    title: "Quest 0: Fire",
    subtitle: "Transforming the Stories That No Longer Serve Us",
    description: "Introduction to Quests, background, and intention setting for this journey. An invitation to burn the stories that are no longer serving you to make room for new stories to emerge.",
    reward: { regen: 111, rvoice: 1 },
    icon: Flame,
    color: "from-orange-500/20 to-amber-500/20",
    borderColor: "border-orange-500/50",
    iconBg: "bg-orange-500",
    deliverable: "A 3-7 minute video sharing who you are and why you're here",
  },
  spring: [
    {
      id: 1,
      slug: "potion-brewing",
      title: "Potion Brewing",
      subtitle: "Diversifying Our Inner Soils",
      description: "Focus on our Microbiomes & Guts, Fungi Kingdom, Bacteria Kingdom, and Soil Kingdoms. Heal our relationship to the foundations of life.",
      reward: { regen: 111, rvoice: 1 },
      icon: Droplets,
      deliverable: "A 'Showcasing my Potions' video/article",
      focus: "Microbiomes, Fungi, Bacteria, Soil",
    },
    {
      id: 2,
      slug: "saving-seeds",
      title: "Saving Seeds",
      subtitle: "Sovereignty & Co-Evolution",
      description: "Growing plants that know us, and consciously evolving alongside the plants that nourish us.",
      reward: { regen: 22, rvoice: 1 },
      icon: Sprout,
      deliverable: "Adding seeds to swap in your LocalScale profile",
      focus: "Plant Kingdom",
    },
    {
      id: 3,
      slug: "healing-wholes",
      title: "Healing Wholes",
      subtitle: "Food Abundance",
      description: "Gardening our bioregions and homesteads. Healing our relationship to plants & extending our inner-soils to relate directly with our bioregions.",
      reward: { regen: 111, rvoice: 1 },
      icon: TreeDeciduous,
      deliverable: "'Showcasing my Healing Whole' video/article",
      focus: "Bioregion, Gardens",
    },
  ],
  summer: [
    {
      id: 4,
      slug: "dreaming-spaces-of-love",
      title: "Dreaming Spaces of Love",
      subtitle: "Family Homesteads",
      description: "Designing, dreaming, and co-creating our ideal homes, gardens, and life intended to meet all our needs. A 'Kins Domain' for your family of life.",
      reward: { regen: 111, rvoice: 1 },
      icon: HomeIcon,
      deliverable: "'Map of my current/future Space of Love' video/picture",
      focus: "Family, Home, Gardens",
    },
    {
      id: 5,
      slug: "rites-of-love",
      title: "Rites of Love",
      subtitle: "We are the Land",
      description: "Marrying the Earth and your beloved, remembering we're one with our Spaces of Love, and other Sacred Rites to connect with Earth.",
      reward: { regen: 111, rvoice: 1 },
      icon: Heart,
      deliverable: "Video/article or... Get Married!",
      focus: "Love, Partnership, Earth Connection",
    },
    {
      id: 6,
      slug: "healing-circles",
      title: "Healing Circles",
      subtitle: "Community Gathering",
      description: "Gathering in natural spaces with 10+ other humans to swap & practice healing modalities. Share whatever modality you're most aligned with.",
      reward: { regen: 111, rvoice: 1 },
      icon: Users,
      deliverable: "'How we gathered, what we learned' video/article",
      focus: "Community, Healing, Touch",
    },
  ],
  fall: [
    {
      id: 7,
      slug: "wild-foraging",
      title: "Wild Foraging",
      subtitle: "Deep Nourishment",
      description: "Foraging mushrooms, medicinal herbs, berries & tree magic. Eating sunlight and enjoying food plant-to-mouth while attuning to our ideal diets.",
      reward: { regen: 111, rvoice: 1 },
      icon: Apple,
      deliverable: "'What did I harvest and what did I do with it?' video/article",
      focus: "Foraging, Wild Foods, Nutrition",
    },
    {
      id: 8,
      slug: "medicine-journey",
      title: "Medicine Journey",
      subtitle: "Inner Exploration",
      description: "A guided journey into the depths of consciousness, exploring the medicine within and around us.",
      reward: { regen: 111, rvoice: 1 },
      icon: Circle,
      deliverable: "Reflection on your medicine journey",
      focus: "Consciousness, Healing, Spirit",
    },
    {
      id: 9,
      slug: "tree-talk",
      title: "Tree Talk",
      subtitle: "Forest Communication",
      description: "Learning to communicate with and understand the wisdom of trees. Deepening our relationship with the forest.",
      reward: { regen: 111, rvoice: 1 },
      icon: TreeDeciduous,
      deliverable: "'My conversation with trees' video/article",
      focus: "Trees, Nature, Communication",
    },
  ],
  winter: [
    {
      id: 10,
      slug: "communication-patterns",
      title: "Communication Patterns",
      subtitle: "How We Relate",
      description: "Exploring and improving our patterns of communication. Learning to listen deeply and speak authentically.",
      reward: { regen: 111, rvoice: 1 },
      icon: MessageSquare,
      deliverable: "Reflection on communication patterns",
      focus: "Communication, Relationships",
    },
    {
      id: 11,
      slug: "coordination-patterns",
      title: "Coordination Patterns",
      subtitle: "How We Organize",
      description: "Understanding how we coordinate as groups. Exploring governance, decision-making, and collective action.",
      reward: { regen: 111, rvoice: 1 },
      icon: GitBranch,
      deliverable: "Analysis of coordination patterns",
      focus: "Governance, Organization",
    },
    {
      id: 12,
      slug: "breathplay-future-dreaming",
      title: "Breathplay & Future Dreaming",
      subtitle: "Visioning Together",
      description: "Using breathwork to access expanded states and dream into the future we want to create together.",
      reward: { regen: 111, rvoice: 1 },
      icon: Wind,
      deliverable: "Vision board or future dreaming video",
      focus: "Breathwork, Visioning",
    },
  ],
  routine: {
    id: 13,
    title: "Fasting",
    subtitle: "Regenerative Ikigai",
    description: "What is your role? Discovering your unique purpose through the practice of fasting and reflection.",
    reward: { regen: 111, rvoice: 1 },
    icon: Brain,
    deliverable: "'My Regenerative Ikigai' reflection",
    focus: "Purpose, Role, Fasting",
  },
  featured: {
    title: "Food Foresting",
    subtitle: "Being Human Again",
    description: "Go out with your friends and family and plant seeds for fruiting plants in public spaces, parks, forests, and anywhere nature can thrive. This quest is all about turning our planet into a food forest where hunger is no longer relevant. Document your adventure and share what you planted, where, and the joy of being human again.",
    reward: { regen: 33, rvoice: 1 },
    icon: Sparkles,
    deliverable: "A <3 min video and/or written article",
    focus: "Bioregion, Food Forest, Community",
  },
};

// Sign In CTA Component
function SignInCTA() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading || isAuthenticated) return null;
  
  return (
    <div className="mt-8 pt-6 border-t border-[#1a472a]/20">
      <BackButton />
      <p className="text-[#1a472a]/70 mb-4">Sign in to track your quest progress and earn rewards</p>
      <Button
        size="lg"
        className="rounded-xl bg-[#1a472a] hover:bg-[#0f2d1a] text-white"
        style={{ fontFamily: 'var(--font-accent)' }}
        onClick={() => window.location.href = getLoginUrl()}
      >
        <Users className="mr-2 w-5 h-5" />
        Sign In to Start
      </Button>
    </div>
  );
}

// Quest Card Component
// Clipboard copy button helper
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs bg-[#f0f7f0] hover:bg-[#e0f0e0] px-2 py-1 rounded-md transition-colors text-[#1a472a]/70 hover:text-[#1a472a] w-full text-left"
      title={`Copy: ${text}`}
    >
      {copied ? <Check className="w-3 h-3 text-[#7dd87d] flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0" />}
      <span className="font-medium flex-shrink-0">{label}:</span>
      <span className="truncate">{text}</span>
    </button>
  );
}

// Original quest IDs (0–12) get gold shimmer; future quests get green shimmer
const ORIGINAL_QUEST_IDS = new Set([0,1,2,3,4,5,6,7,8,9,10,11,12]);

function QuestCard({ quest, colorClass, onOpenDetails }: { quest: typeof questData.spring[0] & { slug?: string }, colorClass: string, onOpenDetails?: (questId: string) => void }) {
  const Icon = quest.icon;
  const hasDetails = questDetailsData[`quest-${quest.id}`];
  const questId = `quest-${quest.id}`;
  const [showHowTo, setShowHowTo] = useState(false);
  const [imgError, setImgError] = useState(false);

  const proposalName = `Quest ${quest.id}: ${quest.title}`;
  const slug = (quest as any).slug as string | undefined;
  const imgUrl = slug ? questImageUrl(quest.id, slug) : null;
  const shimmerClass = ORIGINAL_QUEST_IDS.has(quest.id) ? 'quest-card-gold' : 'quest-card-green';

  return (
    <div
      className={`relative bg-white rounded-xl border-2 border-[#1a472a]/10 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 ${colorClass} ${shimmerClass} ${hasDetails ? 'cursor-pointer group' : ''}`}
      onClick={() => hasDetails && onOpenDetails?.(questId)}
    >
      {/* Quest image */}
      <div className="relative w-full h-36 bg-gradient-to-br from-[#1a472a]/10 to-[#4a7c59]/10 rounded-t-xl overflow-hidden">
        {imgUrl ? (
          <img
            src={imgError ? questImageFallback(quest.id, slug!) : imgUrl}
            alt={`Quest ${quest.id}: ${quest.title}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        {/* Completion Badge */}
        <QuestCompletionBadge questId={questId} />
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#4a7c59] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-[#1a472a] text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Quest {quest.id}: {quest.title}
            </h4>
            <p className="text-xs text-[#1a472a]/70">{quest.subtitle}</p>
          </div>
        </div>

        <p className="text-sm text-[#1a472a]/80 mb-3">{quest.description}</p>

        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="px-2 py-0.5 bg-[#7dd87d]/30 text-[#1a472a] rounded-full font-semibold">+{quest.reward.regen} $Regen</span>
          <span className="px-2 py-0.5 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold">+{quest.reward.rvoice} RGVoice</span>
        </div>

        <p className="text-xs text-[#1a472a]/60 italic mb-3">
          <strong>Deliverable:</strong> {quest.deliverable}
        </p>

        {/* How to Complete Section */}
        <div className="mt-3 pt-3 border-t border-[#1a472a]/10">
          <button
            onClick={(e) => { e.stopPropagation(); setShowHowTo(!showHowTo); }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#4a7c59] hover:text-[#1a472a] transition-colors mb-2"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            How to complete & claim tokens
            <ChevronDown className={`w-3 h-3 transition-transform ${showHowTo ? 'rotate-180' : ''}`} />
          </button>

          {showHowTo && (
            <div className="space-y-1.5 mb-3" onClick={(e) => e.stopPropagation()}>
              <CopyButton text={proposalName} label="Proposal Name" />
              <div className="text-[10px] text-[#1a472a]/50 px-2 py-1 bg-[#f8f5f0] rounded-md">
                <strong>Details:</strong> Share your deliverables here: {quest.deliverable}
              </div>
              <CopyButton text={String(quest.reward.regen)} label="ReGen tokens" />
              <CopyButton text="1" label="RGVoice" />
              {imgUrl && (
                <a
                  href={imgUrl}
                  download={`quest-${String(quest.id).padStart(2,'0')}-${slug}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-[#d4a574]/20 hover:bg-[#d4a574]/40 text-[#8b6135] border border-[#d4a574]/40 px-3 py-2 rounded-lg transition-colors w-full justify-center font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-3 h-3" />
                  Download Quest Image
                </a>
              )}
              <a
                href="https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs bg-[#1a472a] hover:bg-[#0f2d1a] text-white px-3 py-2 rounded-lg transition-colors w-full justify-center font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Submit Proposal on DAO
              </a>
            </div>
          )}
        </div>

        {/* Mark Complete Button */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#1a472a]/10">
          <MarkCompleteButton questId={questId} size="sm" />
          {hasDetails ? (
            <p className="text-xs text-[#4a7c59] flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-3 h-3" />
              View guide
            </p>
          ) : quest.id >= 4 && (
            <p className="text-xs text-[#1a472a]/50 italic">Details coming soon</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Quest 0 Flip Card Component
function Quest0FlipCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  
  return (
    <div 
      className="relative mb-8 cursor-pointer group"
      style={{ perspective: '1000px' }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className="relative transition-transform duration-700 w-full"
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Front of card */}
        <div 
          className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-8 rounded-2xl border-3 border-orange-500/50"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Completion Badge */}
          <QuestCompletionBadge questId="quest-0" className="!top-4 !left-4" />
          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
            <RotateCcw className="w-3 h-3" />
            <span>Click to flip for video</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Quest 0: Fire
              </h3>
              <p className="text-[#1a472a]/70">Transforming the Stories That No Longer Serve Us</p>
            </div>
          </div>
          <p className="text-[#1a472a]/80 mb-4">
            {questData.intro.description}
          </p>
          <div className="bg-white/50 p-4 rounded-xl mb-4">
            <p className="text-sm text-[#1a472a]/70 mb-2"><strong>What you'll gain:</strong></p>
            <p className="text-sm text-[#1a472a]/80">A clear vision and intention for what you're wanting to achieve with this journey.</p>
            <p className="text-sm text-[#1a472a]/70 mt-2"><strong>What the community gains:</strong></p>
            <p className="text-sm text-[#1a472a]/80">Another inspired and clear-sighted friend and ally!</p>
          </div>
          <div className="flex items-center gap-4 text-sm mb-4">
            <span className="px-3 py-1 bg-[#7dd87d]/50 text-[#1a472a] rounded-full font-bold">+111 $Regen</span>
            <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-bold">+1 RGVoice</span>
          </div>
          {/* Mark Complete Button */}
          <div className="pt-4 border-t border-orange-300/50" onClick={(e) => e.stopPropagation()}>
            <MarkCompleteButton questId="quest-0" size="md" />
          </div>
        </div>
        
        {/* Back of card - Video */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-orange-600 to-amber-600 p-8 rounded-2xl border-3 border-orange-500"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-white/80 bg-white/20 px-3 py-1 rounded-full">
            <RotateCcw className="w-3 h-3" />
            <span>Click to flip back</span>
          </div>
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4">
              <Play className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Watch the Quest 0 Video
            </h3>
            <p className="text-white/80 mb-6 text-center max-w-md">
              Learn about the Fire Quest and how to transform the stories that no longer serve you.
            </p>
            <button
              disabled
              className="inline-flex items-center gap-2 bg-gray-300 text-gray-500 px-6 py-3 rounded-full font-bold cursor-not-allowed opacity-60"
            >
              <Play className="w-5 h-5" />
              Video Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUEST_VISIT_KEY = 'regen_civics_quest_visit_count';

export default function Quest() {
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null);
  const [whyQuestsExpanded, setWhyQuestsExpanded] = useState(false);
  const featuredQuestRef = useRef<HTMLDivElement>(null);
  const [isQuestReturnVisitor, setIsQuestReturnVisitor] = useState(false);
  
  // Track quest page visits and auto-scroll return visitors to featured quest
  useEffect(() => {
    try {
      const visitCount = parseInt(localStorage.getItem(QUEST_VISIT_KEY) || '0', 10);
      localStorage.setItem(QUEST_VISIT_KEY, String(visitCount + 1));
      if (visitCount >= 1) {
        setIsQuestReturnVisitor(true);
        // Auto-scroll to featured quest after a brief delay
        setTimeout(() => {
          featuredQuestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    } catch {}
  }, []);
  const [filters, setFilters] = useState<{
    category: QuestCategory;
    difficulty: QuestDifficulty;
    time: QuestTime;
  }>({ category: "all", difficulty: "all", time: "all" });

  // Filter function for quests
  const shouldShowQuest = (questId: string) => {
    const metadata = QUEST_METADATA[questId];
    if (!metadata) return true;
    if (filters.category !== "all" && metadata.category !== filters.category) return false;
    if (filters.difficulty !== "all" && metadata.difficulty !== filters.difficulty) return false;
    if (filters.time !== "all" && metadata.time !== filters.time) return false;
    return true;
  };
  
  const openQuestDetails = (questId: string) => {
    setSelectedQuest(questId);
  };
  
  const closeQuestDetails = () => {
    setSelectedQuest(null);
  };
  
  return (
    <QuestProgressProvider>
    <div className="min-h-screen bg-[#faf6f1]">
      <SEO {...pageSEO.quest} />
      
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-[#7dd87d] via-[#5cb85c] to-[#7dd87d] py-3 px-4 text-center">
        <p className="text-[#1a472a] font-medium flex items-center justify-center gap-2 flex-wrap">
          <Sparkles className="w-5 h-5" />
          <span>UNDER CONSTRUCTION: Quests are almost live! Follow our social media channels to know when you can start questing!</span>
          <Sparkles className="w-5 h-5" />
        </p>
        <div className="flex items-center justify-center mt-2">
          <SocialLinks variant="pills" size="sm" colorScheme="dark" gap="sm" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-[#1a472a] to-[#2d5a3d] text-white">
        <AnimatedSection animation="fade-in" className="container text-center">
          <div 
            className="inline-block px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a]"
            style={{ fontFamily: 'var(--font-accent)' }}
          >
            🧙 Welcome to the Quest
          </div>
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The Rites of{" "}
            <span className="text-[#7dd87d]">Passage</span>
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-4 leading-relaxed">
            What are fun, magical, playful, productive, and regenerative ways to actively participate in creating more beautiful civilizations together?
          </p>
          <p className="text-2xl font-bold text-[#7dd87d] mb-8">
            Our current answer... Quests!
          </p>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            An ever-growing and ever-changing list of Quests curated by the active members of the ReGen Civics Alliance.
          </p>
          <Button
            size="lg"
            className="rounded-xl bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
            style={{ fontFamily: 'var(--font-accent)' }}
            onClick={() => {
              window.open('https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution', '_blank');
            }}
          >
            Join the ReGen Game Space <ExternalLink className="ml-2 w-4 h-4" />
          </Button>
        </AnimatedSection>
      </section>

      {/* Callout Banner */}
      <section className="py-10 md:py-14 bg-gradient-to-r from-[#1a472a] via-[#2d5a3e] to-[#1a472a] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-[#7dd87d]/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
        </div>
        <div className="container px-4 relative z-10">
          <AnimatedSection animation="slide-up" className="max-w-3xl mx-auto text-center">
            <p 
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-snug"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              What if healing ourselves and our Earth is a{' '}
              <span className="text-[#7dd87d]">fun</span> and{' '}
              <span className="text-[#ffd700]">Infinite Game</span>?
            </p>
            <p 
              className="text-xl md:text-2xl font-semibold text-[#7dd87d] mt-4"
              style={{ fontFamily: 'var(--font-accent)' }}
            >
              Let's make it so!
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Why Quests Section - Collapsible */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <button 
              onClick={() => setWhyQuestsExpanded(!whyQuestsExpanded)}
              className="w-full bg-white p-6 rounded-2xl border-3 border-[#1a472a]/20 shadow-lg mb-8 hover:border-[#7dd87d]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <h2 
                  className="text-3xl md:text-4xl font-bold text-[#1a472a] text-left"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Why <span className="text-[#7dd87d]">Quests?</span>
                </h2>
                <ChevronDown className={`w-8 h-8 text-[#7dd87d] transition-transform duration-300 ${whyQuestsExpanded ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-[#1a472a]/70 text-left mt-2">
                Click to learn how quests help us transition into regenerative realities
              </p>
            </button>
            
            {whyQuestsExpanded && (
              <div className="bg-white p-8 rounded-2xl border-3 border-[#7dd87d]/30 shadow-lg mb-8 animate-in slide-in-from-top-2 duration-300">
                <p className="text-lg text-[#1a472a]/80 leading-relaxed mb-6 text-center">
                  The Rites of Passage Quests are designed to help us transition into a growing diversity of regenerative realities by helping us:
                </p>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Heart className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Heal Ourselves</h3>
                      <p className="text-sm text-[#1a472a]/70">Our bodies, families, communities, bioregions, and Earth</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Grow & Learn Together</h3>
                      <p className="text-sm text-[#1a472a]/70">Share our journey and insights with our communities</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Vote className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Distribute Ownership</h3>
                      <p className="text-sm text-[#1a472a]/70">Earn tokens and gain voice in governing the Game</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Coins className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Co-Create the Game</h3>
                      <p className="text-sm text-[#1a472a]/70">Constantly redesigned by all of us together</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl md:col-span-2 lg:col-span-2">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Regenerate Relationships</h3>
                      <p className="text-sm text-[#1a472a]/70">With each other and the more-than-human world as we journey into new civilizations together</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-[#1a472a] text-white p-6 rounded-xl text-center">
              <p className="text-lg italic mb-2">
                "To focus on regeneration & healing is to focus on growing our shared potential."
              </p>
              <p className="text-white/60 text-sm">
                We believe creating a movement of healthier, more capable, and more effective humans will better help us achieve any goals we choose to collectively pursue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Token Rewards Callout - Links to Game Page */}
      <section className="py-12 bg-[#d4e8d4]">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border-3 border-[#7dd87d]/30 shadow-lg text-center">
              <div className="flex justify-center gap-4 mb-6">
                <img src="https://assets.regencivics.earth/ZWOtkRNjdCWfFFed.png" alt="$Regen Token" className="w-16 h-16 object-contain" loading="lazy" />
                <img src="https://assets.regencivics.earth/dWhwxPMVWDYiuDpF.png" alt="RGVoice Token" className="w-16 h-16 object-contain" loading="lazy" />
              </div>
              <h2 
                className="text-2xl md:text-3xl font-bold mb-4 text-[#1a472a]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Earn Tokens, Gain <span className="text-[#7dd87d]">Voice</span>
              </h2>
              <p className="text-[#1a472a]/70 mb-6">
                Complete quests to earn $Regen tokens and RGVoice governance tokens. Learn how the token system works and how to participate in the Infinite Game.
              </p>
              <Link href="/game">
                <Button
                  size="lg"
                  className="rounded-xl bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a]"
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  <SeedOfLifeIcon className="mr-2 w-5 h-5" size={20} />
                  Learn More
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quest 0 - Starting Point */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 
              className="text-3xl md:text-4xl font-bold mb-8 text-[#1a472a] text-center"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Start Your <span className="text-[#7dd87d]">Journey</span>
            </h2>
            
            {/* Quest 0 - Flip Card */}
            <Quest0FlipCard />
            
            {/* Featured Quest - Food Foresting */}
            <div ref={featuredQuestRef} className="relative bg-gradient-to-br from-[#7dd87d]/20 to-[#4a7c59]/20 p-8 rounded-2xl border-3 border-[#7dd87d]/50">
              {/* Completion Badge */}
              <QuestCompletionBadge questId="food-foresting" />
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#4a7c59] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="inline-block px-2 py-1 bg-[#7dd87d] text-[#1a472a] text-xs rounded-full font-bold">FEATURED QUEST</span>
                    <span className="inline-block px-2 py-1 bg-amber-400 text-amber-900 text-xs rounded-full font-bold animate-pulse">∞ DO INFINITE TIMES!</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                    Food Foresting: Being Human Again
                  </h3>
                </div>
              </div>
              <p className="text-[#1a472a]/80 mb-4">
                {questData.featured.description}
              </p>
              <div className="bg-white/50 p-4 rounded-xl mb-4">
                <p className="text-sm text-[#1a472a]/70 mb-2"><strong>Deliverable:</strong> A &lt;3 min video and/or written article:</p>
                <ul className="text-sm text-[#1a472a]/80 list-disc list-inside space-y-1">
                  <li>What you learned, insights, etc</li>
                  <li>What you planted and where</li>
                  <li>Any story you'd like to share</li>
                </ul>
              </div>
              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="px-3 py-1 bg-[#7dd87d]/50 text-[#1a472a] rounded-full font-bold">+33 $Regen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-bold">+1 RGVoice</span>
              </div>
              {/* Mark Complete Button */}
              <div className="pt-4 border-t border-[#7dd87d]/30">
                <MarkCompleteButton questId="food-foresting" size="md" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quest Philosophy Box */}
      <section className="py-12 bg-[#f0ebe3]">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border-2 border-[#7dd87d]/30 shadow-lg">
              <p className="text-lg text-[#1a472a]/90 leading-relaxed text-center italic">
                "Each Quest focuses on playfully healing one aspect of our reality. Starting with our Gut and digestion - a core to our health and energy levels - and moving through relationships with plants, animals, our community, language, love and each other. As we journey through the quests we heal ourselves, our cells and our Earth (which we are but cells of)."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All Quests by Season - Header */}
      <section className="py-12 bg-[#f0ebe3]">
        <div className="container">
          <h2 
            className="text-3xl md:text-4xl font-bold mb-4 text-[#1a472a] text-center"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            All Quests by <span className="text-[#7dd87d]">Season</span>
          </h2>
          <p className="text-center text-[#1a472a]/70 max-w-2xl mx-auto mb-6">
            Quests can be done at any time and in any order. Feel free to do them multiple times (earning rewards up to 3x) and skip those that don't call to you for now. <strong>A key focus is having fun!</strong>
          </p>
          <div className="flex justify-center">
            <QuestFilter activeFilters={filters} onFilterChange={setFilters} />
          </div>
        </div>
      </section>

      {/* Spring Quests Section */}
      <ParallaxSection imageSrc="https://assets.regencivics.earth/HqkwLOeDYdCpbwla.jpg">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#4a7c59] flex items-center justify-center shadow-lg">
              <Sprout className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Spring Quests
              </h3>
              <p className="text-[#4a7c59] font-medium">Season of New Beginnings</p>
            </div>
          </div>
          <QuestCarousel totalCount={questData.spring.length}>
            {questData.spring.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#4a7c59]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} />
            ))}
          </QuestCarousel>
          {questData.spring.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Summer Quests Section */}
      <ParallaxSection imageSrc="https://assets.regencivics.earth/hSCSMzfMvNBVNdFX.jpg">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#2e7d32] flex items-center justify-center shadow-lg">
              <Sun className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Summer Quests
              </h3>
              <p className="text-[#2e7d32] font-medium">Season of Abundance</p>
            </div>
          </div>
          <QuestCarousel totalCount={questData.summer.length}>
            {questData.summer.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#2e7d32]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} />
            ))}
          </QuestCarousel>
          {questData.summer.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Fall Quests Section */}
      <ParallaxSection imageSrc="https://assets.regencivics.earth/ZhVLJNePNkZErikp.jpg">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#d4a574] flex items-center justify-center shadow-lg">
              <Leaf className="w-7 h-7 text-[#1a472a]" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Fall Quests
              </h3>
              <p className="text-[#d4a574] font-medium">Season of Harvest</p>
            </div>
          </div>
          <QuestCarousel totalCount={questData.fall.length}>
            {questData.fall.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#d4a574]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} />
            ))}
          </QuestCarousel>
          {questData.fall.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Winter Quests Section */}
      <ParallaxSection imageSrc="https://assets.regencivics.earth/TdRIxUeJvpmoVwvP.jpg">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#8b7355] flex items-center justify-center shadow-lg">
              <Snowflake className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Winter Quests
              </h3>
              <p className="text-[#8b7355] font-medium">Season of Reflection</p>
            </div>
          </div>
          <QuestCarousel totalCount={questData.winter.length}>
            {questData.winter.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#8b7355]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} />
            ))}
          </QuestCarousel>
          {questData.winter.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Routine Quest Section */}
      <ParallaxSection
        imageSrc="https://assets.regencivics.earth/kdpmqczDwXGfwTIK.jpg"
        className="py-20"
        overlay="rgba(26, 71, 42, 0.75)"
      >
        <div className="container">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-[#7dd87d]/30">
              <Brain className="w-6 h-6 text-[#7dd87d]" />
              <span className="text-[#7dd87d] font-semibold">Daily Practice</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              Routine <span className="text-[#7dd87d]">Quests</span>
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              Build lasting habits through regular actions that compound into transformative change
            </p>
          </div>
          
          {/* Routine Quest Card */}
          <div className="max-w-lg mx-auto">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <Brain className="w-7 h-7 text-[#1a472a]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                    Quest 13: {questData.routine.title}
                  </h4>
                  <p className="text-sm text-white/70">{questData.routine.subtitle}</p>
                </div>
              </div>
              <p className="text-white/80 mb-6">
                {questData.routine.description}
              </p>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.routine.reward.regen} $Regen</span>
                <span className="px-3 py-1.5 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.routine.reward.rvoice} RGVoice</span>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* CTA Section */}
      <section className="py-16 bg-[#7dd87d]">
        <div className="container text-center">
          <h2 
            className="text-3xl md:text-4xl font-bold mb-4 text-[#1a472a]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Ready to Begin Your Quest?
          </h2>
          <p className="text-xl text-[#1a472a]/80 mb-8 max-w-2xl mx-auto">
            Join the ReGen Game Space and start earning tokens while healing yourself and our world
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Button
              size="lg"
              className="rounded-xl bg-[#1a472a] hover:bg-[#0f2d1a] text-white text-lg px-10 py-6"
              style={{ fontFamily: 'var(--font-accent)' }}
              onClick={() => {
                window.open('https://explore.joinseeds.earth/regen-civics-infinite-game/play-the-game/quest', '_blank');
              }}
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Explore All Quests
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl border-3 border-[#1a472a] text-[#1a472a] hover:bg-[#1a472a]/10 text-lg px-10 py-6"
              style={{ fontFamily: 'var(--font-accent)' }}
              onClick={() => {
                window.open('https://explore.joinseeds.earth/regen-civics-infinite-game/the-regenerative-renaissance', '_blank');
              }}
            >
              <BookOpen className="mr-2 w-5 h-5" />
              Explore Knowledge Base
            </Button>
          </div>
          <div className="bg-[#1a472a]/20 rounded-xl px-6 py-4 max-w-xl mx-auto mb-2">
            <p className="text-[#1a472a] text-sm font-semibold mb-1">🌳 Quests build your governance voice</p>
            <p className="text-[#1a472a]/70 text-sm">
              Every quest you complete earns RGVoice tokens, giving you more say in how the game evolves. The more you contribute, the more the game is governed by players like you.
            </p>
            <Link href="/governance" className="inline-flex items-center gap-1 mt-2 text-[#1a472a] font-semibold text-sm hover:underline">
              Learn how governance works <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {/* Sign In CTA */}
          <SignInCTA />
        </div>
      </section>

      {/* Quest Progress Tracker - Floating Button */}
      <QuestProgressTracker />
      <QuestBadges />
      <QuestLeaderboard />

      {/* Quest Detail Modal */}
      <QuestDetailModal 
        quest={selectedQuest ? questDetailsData[selectedQuest] : null}
        isOpen={!!selectedQuest}
        onClose={closeQuestDetails}
      />
    </div>
    </QuestProgressProvider>
  );
}
