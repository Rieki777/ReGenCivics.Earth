/**
 * Quest Page - ReGen Civics
 * Design: Enchanted Forest Storybook - playful, game-like
 * Content sourced from SEEDS Quest knowledge base
 */

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ExternalLink, Flame, Sprout, Sun, Leaf, Snowflake, Sparkles, Heart, Users, Vote, Coins, BookOpen, TreeDeciduous, Droplets, Home as HomeIcon, Music, Circle, Wind, MessageSquare, GitBranch, Brain, Apple, Play, RotateCcw, ArrowRight, ChevronDown, Copy, Check, ClipboardCopy, Download, ImageIcon, Info, Map } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { Link } from "wouter";
import { ParallaxSection } from "@/components/ParallaxSection";
import { QuestProgressTracker, QuestProgressProvider, QuestCompletionBadge, MarkCompleteButton } from "@/components/QuestProgressTracker";
import { QuestDetailModal, questDetailsData } from "@/components/QuestDetailModal";
import { QuestBadges } from "@/components/QuestBadges";
import { QuestArtifactsGallery } from "@/components/QuestArtifactsGallery";
import { trpc } from "@/lib/trpc";
import { QuestFilter, QuestCategory, QuestDifficulty, QuestTime, QuestElement, QUEST_METADATA } from "@/components/QuestFilter";
import { SocialLinks } from "@/components/SocialLinks";
import { AnimatedSection } from "@/components/AnimatedSection";
import { SEO, pageSEO } from "@/components/SEO";
import { BackButton } from "@/components/BackButton";
import { QuestCarousel } from "@/components/QuestCarousel";
import { QuestGameIntro } from "@/components/QuestGameIntro";
import { EpicQuestSection } from "@/components/EpicQuestSection";
import { SeasonalQuestFeed } from "@/components/SeasonalQuestFeed";
import { QuestArcMap } from "@/components/QuestArcMap";
import { useHemisphere, setHemisphereOverride } from "@/hooks/useHemisphere";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { questData, QUEST_BEST_SEASONS, SEASON_HERO } from "@/data/questData";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import { pageCopy } from "@/data/pageCopy";

// Image base URL for quest art  -  drop files matching quest-NN-slug.png to this path
const QUEST_IMG_BASE = "https://assets.regencivics.earth/quests";

function questImageUrl(id: number, slug: string) {
  return `${QUEST_IMG_BASE}/quest-${String(id).padStart(2, '0')}-${slug}.png`;
}

function questImageFallback(id: number, slug: string) {
  return `/images/quests/quest-${String(id).padStart(2, '0')}-${slug}.webp`;
}

// Quest data is imported from @/data/questData (extracted for code-splitting)

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

const QuestCard = React.memo(function QuestCard({ quest, colorClass, onOpenDetails, isGreatNow, activePlayers, isActive, onToggleActive, isAuthenticated, endorsements }: { quest: typeof questData.spring[0] & { slug?: string }, colorClass: string, onOpenDetails?: (questId: string) => void, isGreatNow?: boolean, activePlayers?: number, isActive?: boolean, onToggleActive?: () => void, isAuthenticated?: boolean, endorsements?: Array<{ orgId: string; endorsementType: "recommended" | "required" }> }) {
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
            width={640}
            height={360}
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
            {QUEST_METADATA[questId]?.experience && (
              <p className="text-[10px] italic text-[#4a7c59]/80 mt-0.5">{QUEST_METADATA[questId].experience}</p>
            )}
          </div>
        </div>

        {isGreatNow && (
          <div className="mb-2">
            <span className="text-[10px] bg-[#7dd87d]/20 text-[#7dd87d] px-1.5 py-0.5 rounded-full">
              Good for right now
            </span>
          </div>
        )}

        <p className="text-sm text-[#1a472a]/80 mb-3">{quest.description}</p>

        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#7dd87d]/30 text-[#1a472a] rounded-full font-semibold">
            +{quest.reward.regen}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 cursor-help">
                  $ReGen <Info className="w-3 h-3 text-[#7dd87d]/60" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                $ReGen tokens are earned by completing quests and track your regenerative contributions.
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold">
            +{quest.reward.rvoice}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 cursor-help">
                  RGVoice <Info className="w-3 h-3 text-[#7dd87d]/60" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                RGVoice tokens represent your governance voting weight in the ReGen Civics Game.
              </TooltipContent>
            </Tooltip>
          </span>
        </div>

        <p className="text-xs text-[#1a472a]/60 italic mb-3">
          <strong>Deliverable:</strong> {quest.deliverable}
        </p>

        {/* Endorsement badges from DB */}
        {endorsements && endorsements.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {endorsements.slice(0, 2).map((e) => (
              <span
                key={`${e.orgId}-${e.endorsementType}`}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  e.endorsementType === "required"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-[#7dd87d]/20 text-[#1a472a] border-[#7dd87d]/30"
                }`}
              >
                {e.endorsementType === "required" ? "⭐ Required by" : "🌱 Recommended by"} {e.orgId}
              </span>
            ))}
            {endorsements.length > 2 && (
              <span
                className="text-[10px] px-2 py-0.5 bg-[#7dd87d]/20 text-[#1a472a] rounded-full border border-[#7dd87d]/30 cursor-help"
                title={endorsements.slice(2).map(e => `${e.endorsementType === "required" ? "Required" : "Recommended"} by ${e.orgId}`).join(", ")}
              >
                +{endorsements.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Active players pill and I'm on this quest toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(activePlayers ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              🌿 {activePlayers} in the field
            </span>
          )}
          {isAuthenticated && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleActive?.(); }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                isActive
                  ? "bg-[#4a7c59] text-white"
                  : "bg-[#1a472a]/10 text-[#1a472a] hover:bg-[#1a472a]/20"
              }`}
            >
              <Leaf className={`w-3.5 h-3.5 ${isActive ? "fill-current" : ""}`} />
              {isActive ? "In the field" : "I'm on this quest"}
            </button>
          )}
        </div>

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
            <p className="text-xs text-[#4a7c59] flex items-center gap-1 opacity-40 group-hover:opacity-80 transition-opacity">
              <RotateCcw className="w-3 h-3" />
              tap to explore
            </p>
          ) : quest.id >= 4 ? (
            <p className="text-xs text-[#1a472a]/50 italic">Details coming soon</p>
          ) : (
            <p className="text-xs text-[#4a7c59] flex items-center gap-1 opacity-40 group-hover:opacity-80 transition-opacity">
              <RotateCcw className="w-3 h-3" />
              tap to explore
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

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

// QUEST_BEST_SEASONS and SEASON_HERO are imported from @/data/questData

export default function Quest() {
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null);
  const [whyQuestsExpanded, setWhyQuestsExpanded] = useState(false);
  const [showQuestArc, setShowQuestArc] = useState(false);
  const [activeSeasonFilter, setActiveSeasonFilter] = useState<"spring" | "summer" | "fall" | "winter" | null>(null);
  const { currentSeason, hemisphere, loading: hemisphereLoading } = useHemisphere();
  const { isAuthenticated: user } = useAuth();
  const hasEntered = typeof localStorage !== 'undefined' && localStorage.getItem("regen_game_entered") === "true";
  const [showIntro, setShowIntro] = useState(!hasEntered);
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
    element: QuestElement;
  }>({ category: "all", difficulty: "all", time: "all", element: "all" });

  // Quest activity queries
  const activeCountsQuery = trpc.quest.activeCountPerQuest.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const myActiveQuestsQuery = trpc.quest.myActiveQuests.useQuery(undefined, { enabled: !!user, staleTime: 5 * 60 * 1000 });
  const spotlightQuery = trpc.quest.spotlight.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const allEndorsementsQuery = trpc.quest.allEndorsements.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  const myActiveQuestIds = new Set(myActiveQuestsQuery.data ?? []);
  const activeCountsData = activeCountsQuery.data ?? {};

  // Build map: questId → endorsements array
  const endorsementsMap = React.useMemo(() => {
    const map: Record<string, Array<{ orgId: string; endorsementType: "recommended" | "required" }>> = {};
    for (const e of (allEndorsementsQuery.data ?? [])) {
      if (!map[e.questId]) map[e.questId] = [];
      map[e.questId].push({ orgId: e.orgId, endorsementType: e.endorsementType as "recommended" | "required" });
    }
    return map;
  }, [allEndorsementsQuery.data]);

  const signalActive = trpc.quest.signalActive.useMutation({ onSettled: () => myActiveQuestsQuery.refetch() });
  const clearActive = trpc.quest.clearActive.useMutation({ onSettled: () => myActiveQuestsQuery.refetch() });

  // Filter function for quests
  const shouldShowQuest = (questId: string) => {
    const metadata = QUEST_METADATA[questId];
    if (!metadata) return true;
    if (filters.category !== "all" && metadata.category !== filters.category) return false;
    if (filters.difficulty !== "all" && metadata.difficulty !== filters.difficulty) return false;
    if (filters.time !== "all" && metadata.time !== filters.time) return false;
    if (filters.element !== "all" && metadata.element !== filters.element) return false;
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
    {showIntro && (
      <QuestGameIntro onEnter={() => {
        localStorage.setItem("regen_game_entered", "true");
        setShowIntro(false);
      }} />
    )}
    <div className="min-h-screen bg-[#faf6f1]">
      <SEO {...pageSEO.quest} />
      
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-[#7dd87d] via-[#5cb85c] to-[#7dd87d] py-3 px-4 text-center">
        <p className="text-[#1a472a] font-medium flex items-center justify-center gap-2 flex-wrap">
          <Sparkles className="w-5 h-5" />
          <span>{pageCopy.quest.announcement}</span>
          <Sparkles className="w-5 h-5" />
        </p>
        <div className="flex items-center justify-center mt-2">
          <SocialLinks variant="pills" size="sm" colorScheme="dark" gap="sm" />
        </div>
      </div>

      {/* Hero Section */}
      <section
        className="py-16 text-white"
        style={{
          background: hemisphereLoading
            ? "linear-gradient(to bottom, #1a472a, #2d5a3d)"
            : (SEASON_HERO[currentSeason]?.gradient ?? "linear-gradient(to bottom, #1a472a, #2d5a3d)"),
        }}
      >
        <AnimatedSection animation="fade-in" className="container text-center">
          <div
            className="inline-block px-5 py-2 mb-6 rounded-full bg-[#7dd87d] text-[#1a472a]"
            style={{ fontFamily: 'var(--font-accent)' }}
          >
            {pageCopy.quest.hero.badge}
          </div>
          <h1 
            className="text-4xl md:text-6xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {pageCopy.quest.hero.heading}
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-4 leading-relaxed">
            {pageCopy.quest.hero.line1}
          </p>
          <p className="text-2xl font-bold text-[#7dd87d] mb-8">
            {pageCopy.quest.hero.line2}
          </p>
          <p className="text-white/80 max-w-2xl mx-auto mb-4">
            {pageCopy.quest.hero.line3}
          </p>

          {/* Seasonal tagline + hemisphere toggle */}
          {!hemisphereLoading && (
            <div className="flex flex-col items-center gap-2 mb-8">
              <p className="text-white/60 text-sm italic">
                {pageCopy.quest.hero.seasonalTagline}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setHemisphereOverride("northern"); window.location.reload(); }}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    hemisphere === "northern"
                      ? "bg-[#7dd87d] text-[#1a472a] border-[#7dd87d]"
                      : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {pageCopy.quest.hero.hemisphere.northern}
                </button>
                <button
                  onClick={() => { setHemisphereOverride("southern"); window.location.reload(); }}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    hemisphere === "southern"
                      ? "bg-[#7dd87d] text-[#1a472a] border-[#7dd87d]"
                      : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {pageCopy.quest.hero.hemisphere.southern}
                </button>
              </div>
            </div>
          )}
          {hemisphereLoading && <div className="mb-8" />}

          {/* Quest Spotlight - improvement 18 */}
          {spotlightQuery.data && (
            <div className="mt-4 mb-2 max-w-lg mx-auto bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-xl p-4 text-left flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-[#4a7c59] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {spotlightQuery.data.displayName?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-white/80 text-xs font-semibold">{spotlightQuery.data.displayName ?? "A player"}</span>
                  <span className="text-[#7dd87d] text-xs bg-[#4a7c59]/30 px-2 py-0.5 rounded-full">
                    {spotlightQuery.data.questTitle}
                  </span>
                  <span className="text-white/30 text-xs">From the Field</span>
                </div>
                {(spotlightQuery.data.caption || spotlightQuery.data.artifactText) && (
                  <p className="text-white/60 text-xs italic line-clamp-2">
                    "{spotlightQuery.data.caption ?? spotlightQuery.data.artifactText}"
                  </p>
                )}
                {spotlightQuery.data.artifactUrl && (
                  <a
                    href={spotlightQuery.data.artifactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#7dd87d] text-xs mt-1 inline-flex items-center gap-1 hover:underline"
                  >
                    View artifact <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
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
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl border-2 border-white/40 text-white hover:bg-white/10"
              style={{ fontFamily: 'var(--font-accent)' }}
              onClick={() => setShowQuestArc(!showQuestArc)}
            >
              <Map className="mr-2 w-4 h-4" />
              {showQuestArc ? pageCopy.quest.questArcButton.collapse : pageCopy.quest.questArcButton.expand}
            </Button>
          </div>
        </AnimatedSection>
      </section>

      {/* Quest Arc Map */}
      {showQuestArc && (
        <section className="py-8 bg-[#faf6f1] border-b border-[#1a472a]/10">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-xl font-bold text-[#1a472a] mb-4 text-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Quest Arc for the Rites of Passage: full journey!
              </h2>
              <QuestArcMap onSelectQuest={openQuestDetails} />
            </div>
          </div>
        </section>
      )}

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
                <p className="text-xl text-[#1a472a] font-bold leading-relaxed mb-2 text-center">
                  What if healing ourselves and the Earth is actually a playful and Infinite Game?
                </p>
                <p className="text-base text-[#1a472a]/80 leading-relaxed mb-6 text-center">
                  We are co-creating a new economic and financial system built on top of this question, distributing tokens (our own currency) throughout our movement while doing quests that heal ourselves, our communities, our bioregions, and our Earth. Which, when you look closely, are all the same thing.
                </p>
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
                      <p className="text-sm text-[#1a472a]/70">Share our journey and insights with each other & our communities</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Vote className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Distribute Ownership</h3>
                      <p className="text-sm text-[#1a472a]/70">Earn currency tokens and gain voice in governing the Game</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-[#f0ebe3] rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                      <Coins className="w-6 h-6 text-[#1a472a]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a472a] mb-1">Co-Create the Game</h3>
                      <p className="text-sm text-[#1a472a]/70">Constantly redesigned by all of us together - to better serve our growing needs</p>
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

                <div className="mt-6">
                  <hr className="border-[#1a472a]/20 my-6" />
                  <h4 className="text-[#2d6a4f] font-semibold mb-3 text-sm uppercase tracking-wide">The Arc</h4>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">We begin with Fire. Before we can build anything new we have to be willing to let go of the old.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">Next we focus on our physical health - the healthier we are - the more capable we bcome.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The Potions Quest adds diversity and intelligence to our bodies and changes the information processing in all three minds; our gut, heart, and head.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">Then we extend our internal intelligence to the soil around us through saving seeds and making healing wholes and growing food connected to ourselves.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The Food Foresting quest, done after Potions, seeds the earth with the expanded ecosystem of our own body and moves us closer to a world of healthy food abundance.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">From there, the quests move outward. From personal vitality into relationships, communication, creation, community, and so much more.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The seasonal quests are something you can do in a few days while the EPIC Quests are acts of collective transformation and require years of dedication.</p>

                  <hr className="border-[#1a472a]/20 my-6" />
                  <h4 className="text-[#2d6a4f] font-semibold mb-3 text-sm uppercase tracking-wide">What the Tokens Mean</h4>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">$ReGen tokens are earned by completing quests and contributing to the mission. They represent your participation in building a regenerative civilization. As the Game grows, so do the opportunities for the tokens to carry value.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">RGVoice tokens give you a say in the governance of the Game itself, so the Game is always governed by those who are playing it.</p>

                  <hr className="border-[#1a472a]/20 my-6" />
                  <h4 className="text-[#2d6a4f] font-semibold mb-3 text-sm uppercase tracking-wide">Quests as Qualifiers</h4>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">Land projects and alliance organizations can require that applicants complete certain quests before applying to join or contribute. This ensures applicants have genuine lived experience with regenerative practices, builds a shared language across the community, and distributes tokens to people doing real work before they enter governance roles.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">For example: voting rights in a DAO might require 5 quests plus 1 seasonal quest. Land project stewardship might require Quest 4 (Food Foresting) plus Quest 3 (Healing Wholes) plus any 2 others.</p>
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

      {/* Token info is shown on quest cards — removed duplicate callout per Fix 110-C */}

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
                <span className="px-3 py-1 bg-[#7dd87d]/50 text-[#1a472a] rounded-full font-bold">+111 $Regen</span>
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
                "Each Quest focuses on healing one aspect of our reality. Starting with our Gut and digestion (and how that extends into our soils) - a core to our health and energy levels - and moving through relationships with plants, animals, our community, language, love and each other. As we journey through the quests we heal ourselves, our cells and our Earth (which we are but cells of)."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seasonal Quest Feed */}
      <SeasonalQuestFeed forceSeason={activeSeasonFilter ?? undefined} />

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
            Quests can be done at any time and in any order - the seasonal framing is a gentle suggestion. <strong>A key focus is growing and having fun!</strong>
          </p>
          {/* Season filter tabs — selecting one updates "What's Alive" above */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(["spring", "summer", "fall", "winter"] as const).map((s) => {
              const labels: Record<string, string> = { spring: "🌱 Spring", summer: "☀️ Summer", fall: "🍂 Fall", winter: "❄️ Winter" };
              const active = activeSeasonFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSeasonFilter(active ? null : s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                    active
                      ? "bg-[#1a472a] text-white border-[#1a472a]"
                      : "bg-white text-[#1a472a] border-[#1a472a]/20 hover:border-[#1a472a]/50"
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <QuestFilter activeFilters={filters} onFilterChange={setFilters} />
          </div>
        </div>
      </section>

      {/* Spring Quests Section */}
      <ParallaxSection imageSrc="/backgrounds/quest-spring-baked.webp">
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
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#4a7c59]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} isGreatNow={!hemisphereLoading && (QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes(currentSeason) || QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes("any"))} activePlayers={activeCountsData[`quest-${quest.id}`] ?? 0} isActive={myActiveQuestIds.has(`quest-${quest.id}`)} isAuthenticated={!!user} onToggleActive={() => { if (myActiveQuestIds.has(`quest-${quest.id}`)) { clearActive.mutate({ questId: `quest-${quest.id}` }); } else { signalActive.mutate({ questId: `quest-${quest.id}`, questTitle: quest.title ?? `quest-${quest.id}` }); } }} endorsements={endorsementsMap[`quest-${quest.id}`] ?? []} />
            ))}
          </QuestCarousel>
          {questData.spring.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Summer Quests Section */}
      <ParallaxSection imageSrc="/backgrounds/quest-summer-baked.webp">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#2e7d32] flex items-center justify-center shadow-lg">
              <Sun className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>
                Summer Quests
              </h3>
              <p className="text-[#2e7d32] font-medium">Season of Adventure</p>
            </div>
          </div>
          <QuestCarousel totalCount={questData.summer.length}>
            {questData.summer.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#2e7d32]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} isGreatNow={!hemisphereLoading && (QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes(currentSeason) || QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes("any"))} activePlayers={activeCountsData[`quest-${quest.id}`] ?? 0} isActive={myActiveQuestIds.has(`quest-${quest.id}`)} isAuthenticated={!!user} onToggleActive={() => { if (myActiveQuestIds.has(`quest-${quest.id}`)) { clearActive.mutate({ questId: `quest-${quest.id}` }); } else { signalActive.mutate({ questId: `quest-${quest.id}`, questTitle: quest.title ?? `quest-${quest.id}` }); } }} endorsements={endorsementsMap[`quest-${quest.id}`] ?? []} />
            ))}
          </QuestCarousel>
          {questData.summer.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Fall Quests Section */}
      <ParallaxSection imageSrc="/backgrounds/quest-fall-baked.webp">
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
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#d4a574]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} isGreatNow={!hemisphereLoading && (QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes(currentSeason) || QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes("any"))} activePlayers={activeCountsData[`quest-${quest.id}`] ?? 0} isActive={myActiveQuestIds.has(`quest-${quest.id}`)} isAuthenticated={!!user} onToggleActive={() => { if (myActiveQuestIds.has(`quest-${quest.id}`)) { clearActive.mutate({ questId: `quest-${quest.id}` }); } else { signalActive.mutate({ questId: `quest-${quest.id}`, questTitle: quest.title ?? `quest-${quest.id}` }); } }} endorsements={endorsementsMap[`quest-${quest.id}`] ?? []} />
            ))}
          </QuestCarousel>
          {questData.fall.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Winter Quests Section */}
      <ParallaxSection imageSrc="/backgrounds/quest-winter-baked.webp">
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
              <QuestCard key={quest.id} quest={quest} colorClass="hover:border-[#8b7355]/50 bg-white/95 backdrop-blur-sm" onOpenDetails={openQuestDetails} isGreatNow={!hemisphereLoading && (QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes(currentSeason) || QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes("any"))} activePlayers={activeCountsData[`quest-${quest.id}`] ?? 0} isActive={myActiveQuestIds.has(`quest-${quest.id}`)} isAuthenticated={!!user} onToggleActive={() => { if (myActiveQuestIds.has(`quest-${quest.id}`)) { clearActive.mutate({ questId: `quest-${quest.id}` }); } else { signalActive.mutate({ questId: `quest-${quest.id}`, questTitle: quest.title ?? `quest-${quest.id}` }); } }} endorsements={endorsementsMap[`quest-${quest.id}`] ?? []} />
            ))}
          </QuestCarousel>
          {questData.winter.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && (
            <p className="text-center text-white/70 py-8">No quests match your current filters</p>
          )}
        </div>
      </ParallaxSection>

      {/* Anytime Quests Section */}
      <ParallaxSection
        imageSrc="/backgrounds/quest-anytime-baked.webp"
      >
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#4a7c59] flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Anytime Quests
              </h3>
              <p className="text-[#7dd87d] font-medium">No season required. Do these whenever you are ready.</p>
            </div>
          </div>
          <QuestCarousel totalCount={seasonalQuestsData.filter(q => q.season === "any").length}>
            {seasonalQuestsData.filter(q => q.season === "any").map((quest) => (
              <div key={quest.id} className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-[#7dd87d]/20 hover:border-[#7dd87d]/50 hover:shadow-xl transition-all duration-200 cursor-pointer min-w-0">
                <div className="mb-3">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-[#7dd87d]/20 text-[#1a472a] mb-2">
                    {quest.element ?? "any"}
                  </span>
                  <h4 className="font-bold text-[#1a472a] text-base leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    {quest.title}
                  </h4>
                  {quest.tagline && (
                    <p className="text-[#4a7c59] text-xs italic mt-0.5">{quest.tagline}</p>
                  )}
                </div>
                <p className="text-[#1a472a]/70 text-sm line-clamp-3 mb-3">{quest.description}</p>
                {quest.deliverable && (
                  <p className="text-xs text-[#4a7c59] font-medium">
                    🌱 {quest.deliverable}
                  </p>
                )}
              </div>
            ))}
          </QuestCarousel>
        </div>
      </ParallaxSection>

      {/* Routine Quest Section */}
      <ParallaxSection
        imageSrc="/backgrounds/quest-anytime-baked.webp"
        className="py-20"
      >
        <div className="container">
          {/* Section Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-3 mb-4 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-[#7dd87d]/30">
              <RotateCcw className="w-5 h-5 text-[#7dd87d]" />
              <span className="text-[#7dd87d] font-semibold">Repeatable Quests</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Routine <span className="text-[#7dd87d]">Quests</span>
            </h2>
            <p className="text-white/70 text-lg max-w-xl mx-auto">
              These quests reward you every time. No limit.
            </p>
          </div>

          {/* Two-card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-10">
            {/* Food Foresting */}
            <div className="relative bg-white/10 backdrop-blur-md p-7 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl flex flex-col gap-4">
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-semibold">
                <RotateCcw className="w-3 h-3" /> Repeatable
              </span>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {questData.featured.title}
                  </h4>
                  <p className="text-sm text-white/60">{questData.featured.subtitle}</p>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed flex-1">
                {questData.featured.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.featured.reward.regen} $ReGen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.featured.reward.rvoice} RGVoice</span>
                <span className="text-white/40 text-xs ml-1">per completion</span>
              </div>
            </div>

            {/* Fasting */}
            <div className="relative bg-white/10 backdrop-blur-md p-7 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl flex flex-col gap-4">
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-semibold">
                <RotateCcw className="w-3 h-3" /> Repeatable
              </span>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    Quest 13: {questData.routine.title}
                  </h4>
                  <p className="text-sm text-white/60">{questData.routine.subtitle} &mdash; {questData.routine.minimumTime}</p>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed flex-1">
                {questData.routine.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.routine.reward.regen} $ReGen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.routine.reward.rvoice} RGVoice</span>
                <span className="text-white/40 text-xs ml-1">per completion</span>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* Epic Quest Section */}
      <EpicQuestSection />

      {/* Quest Journal Prompt */}
      <div className="text-center py-8 text-[#1a472a]/60 text-sm">
        <Link href="/profile#quest-journal" className="hover:text-[#1a472a] underline">
          Your quest journal lives in your profile →
        </Link>
      </div>

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
            Join the ReGen Game Space to be able to claim tokens while healing yourself and our world
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
      <QuestArtifactsGallery />

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
