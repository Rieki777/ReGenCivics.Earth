/**
 * Quest Page - ReGen Civics
 * Design: Enchanted Forest Storybook - playful, game-like
 * Content sourced from SEEDS Quest knowledge base
 */

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ExternalLink, Flame, Sprout, Sun, Leaf, Snowflake, Sparkles, Heart, Users, Vote, Coins, BookOpen, TreeDeciduous, Droplets, Home as HomeIcon, Music, Circle, Wind, MessageSquare, GitBranch, Brain, Apple, Play, RotateCcw, ArrowRight, ChevronDown, Copy, Check, ClipboardCopy, Download, ImageIcon, Info, Map, HeartPulse, Clock } from "lucide-react";
import { SeedOfLifeIcon } from "@/components/SeedOfLifeIcon";
import { Link } from "wouter";
import { ParallaxSection } from "@/components/ParallaxSection";
import { QuestProgressTracker, QuestProgressProvider, QuestCompletionBadge, MarkCompleteButton, useQuestProgressContext } from "@/components/QuestProgressTracker";
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
import { SeasonalDepthCard } from "@/components/SeasonalDepthCard";
import { QuestArcMap } from "@/components/QuestArcMap";
import { useHemisphere, setHemisphereOverride } from "@/hooks/useHemisphere";
import { ForYouLabel } from "@/components/ForYouLabel";
import { VineDivider } from "@/components/dividers/VineDivider";
import { useNextQuest } from "@/hooks/useNextQuest";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { questData, QUEST_BEST_SEASONS, SEASON_HERO } from "@/data/questData";
import { JsonLD } from "@/components/JsonLD";
import { seasonalQuestsData } from "@/data/seasonalQuestsData";
import { pageCopy } from "@/data/pageCopy";
import { cdnImg } from "@/lib/utils";
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { LockedQuestCard } from "@/components/LockedQuestCard";
import { SeasonProgressRing } from "@/components/SeasonProgressRing";
import { SubmitToDAOModal } from "@/components/SubmitToDAOModal";
import { QUEST_MASTER_CONTENT } from "@/data/questMasterContent";
import {
  SEASON_ORDER as SEASON_ORDER_ALL, SEASON_EMOJI as SHARED_SEASON_EMOJI,
  SEASON_LABELS as SHARED_SEASON_LABELS, SEASON_PALETTE,
  getRotatedSeasons, type Season as SeasonKey,
} from "@/data/seasonConstants";

// Image base URL for quest art  -  drop files matching quest-NN-slug.webp to this path
const QUEST_IMG_BASE = cdnImg("https://assets.regencivics.earth/quests");

function questImageUrl(id: number, slug: string) {
  return `${QUEST_IMG_BASE}/quest-${String(id).padStart(2, '0')}-${slug}.webp`;
}

function questImageFallback(id: number, slug: string) {
  return `/images/quests/quest-${String(id).padStart(2, '0')}-${slug}.webp`;
}


async function downloadImage(url: string, filename: string) {
  // Try the primary URL (R2 / CDN) first, then the local fallback under
  // /images/quests/, then open whichever responded in a new tab.
  const candidates = [url];
  const localFallback = `/images/quests/${filename}`;
  if (!url.startsWith(localFallback)) candidates.push(localFallback);

  for (const src of candidates) {
    try {
      const response = await fetch(src);
      if (!response.ok) continue;
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    } catch {
      // try next candidate
    }
  }
  // Final fallback: open the local copy in a new tab so the user at least sees it
  window.open(localFallback, '_blank');
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
        className="rounded-xl bg-[#1a472a] hover:bg-[#0d2818] text-white"
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
      className="flex items-center gap-1.5 text-xs bg-[#f0f7f0] hover:bg-[#f0f7f0] px-2 py-1 rounded-md transition-colors text-[#1a472a]/70 hover:text-[#1a472a] w-full text-left"
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

const QuestCard = React.memo(function QuestCard({ quest, colorClass, onOpenDetails, isGreatNow, activePlayers, isActive, onToggleActive, isAuthenticated, endorsements, isLocked, isExpanded, onExpand, onCollapse }: { quest: typeof questData.spring[0] & { slug?: string }, colorClass: string, onOpenDetails?: (questId: string) => void, isGreatNow?: boolean, activePlayers?: number, isActive?: boolean, onToggleActive?: () => void, isAuthenticated?: boolean, endorsements?: Array<{ orgId: string; endorsementType: "recommended" | "required" }>, isLocked?: boolean, isExpanded?: boolean, onExpand?: () => void, onCollapse?: () => void }) {
  // Locked state: show greyed card with lock icon
  if (isLocked) {
    return (
      <LockedQuestCard title={quest.title} subtitle={quest.subtitle}>
        {quest.deliverable && (
          <p className="text-xs text-[#1a472a]/30 mt-2 italic">{quest.deliverable}</p>
        )}
      </LockedQuestCard>
    );
  }

  const questId = `quest-${quest.id}`;
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const slug = quest.slug;
  const imgUrl = slug ? questImageUrl(quest.id, slug) : null;
  const shimmerClass = ORIGINAL_QUEST_IDS.has(quest.id) ? 'quest-card-gold' : 'quest-card-green';
  const masterContent = (QUEST_MASTER_CONTENT as Record<number | string, any>)[quest.id];

  // Scroll into view when expanded
  useEffect(() => {
    if (!isExpanded || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const overflow = rect.bottom - window.innerHeight;
    if (overflow > 0) {
      window.scrollBy({ top: overflow + 16, behavior: 'smooth' });
    }
  }, [isExpanded]);

  const handleCardClick = () => {
    if (isExpanded) {
      onOpenDetails?.(questId);
    } else {
      onExpand?.();
    }
  };

  return (
    <div
      ref={cardRef}
      data-quest-card="true"
      data-expanded={isExpanded ? "true" : "false"}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? `Quest ${quest.id}: ${quest.title} expanded. Tap again to open full quest, press Escape to close.` : `Quest ${quest.id}: ${quest.title}. Tap to see details.`}
      className={`quest-card relative bg-white rounded-xl border-2 border-[#1a472a]/10 shadow-md hover:shadow-lg transition-all ${colorClass} ${shimmerClass} cursor-pointer`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); }
        if (e.key === 'Escape' && isExpanded) { e.preventDefault(); onCollapse?.(); }
      }}
    >
      {/* ── TIER 1: Netflix poster ── */}
      {!isExpanded && (
        <>
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#1a472a]/10 to-[#4a7c59]/10 rounded-t-xl overflow-hidden">
            {imgUrl && (
              <img
                src={imgError ? questImageFallback(quest.id, slug!) : imgUrl}
                alt={`Quest ${quest.id}: ${quest.title}`}
                width={640} height={360}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                loading="lazy" decoding="async"
              />
            )}
            {/* Dark gradient for title legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            {/* Title overlay */}
            <h4 className="absolute bottom-3 left-4 right-4 text-white font-semibold text-lg leading-snug line-clamp-2" style={{ fontFamily: 'var(--font-display)' }}>
              Quest {quest.id}: {quest.title}
            </h4>
            {/* Floating chips */}
            <QuestCompletionBadge questId={questId} />
            {masterContent?.videoUrl && (
              <span className="absolute top-3 left-3 rounded-full bg-black/60 text-white backdrop-blur px-2 py-0.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <Play className="w-3 h-3" />Trailer
              </span>
            )}
            {isGreatNow && (
              <span className="absolute bottom-3 right-3 text-xs bg-[#7dd87d]/20 text-[#7dd87d] px-1.5 py-0.5 rounded-full backdrop-blur">
                Good for right now
              </span>
            )}
          </div>
          {/* Metadata row */}
          <div className="flex items-center justify-between px-4 py-2 text-xs text-[#1a472a]/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#4a7c59]" />
              {masterContent?.timeEstimate || 'Ongoing'}
            </span>
            <span className="flex items-center gap-1 text-[#4a7c59] font-medium">
              <Info className="w-3 h-3" /> See details
            </span>
          </div>
        </>
      )}

      {/* ── TIER 2: About layer (expanded) ── */}
      {isExpanded && (
        <div className="p-5" id={`quest-${quest.id}-tier2`}>
          {/* Header strip */}
          <div className="flex items-start gap-3 mb-4">
            {imgUrl && (
              <img
                src={imgError ? questImageFallback(quest.id, slug!) : imgUrl}
                alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                loading="lazy" onError={() => setImgError(true)}
              />
            )}
            <div className="min-w-0">
              <h4 className="font-bold text-[#1a472a] text-base leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Quest {quest.id}: {quest.title}
              </h4>
              <p className="text-xs text-[#4a7c59] italic">{quest.subtitle}</p>
              {QUEST_METADATA[questId]?.experience && (
                <p className="text-xs italic text-[#4a7c59]/80 mt-0.5">{QUEST_METADATA[questId].experience}</p>
              )}
            </div>
          </div>

          {/* Rewards + time */}
          <div className="flex items-center gap-2 text-xs mb-3 flex-wrap">
            <span className="px-2 py-0.5 bg-[#7dd87d]/30 text-[#1a472a] rounded-full font-semibold">+{quest.reward.regen} $ReGen</span>
            <span className="px-2 py-0.5 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold">+{quest.reward.rvoice} RGVoice</span>
            <span className="px-2 py-0.5 bg-[#1a472a]/5 text-[#1a472a]/60 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> {masterContent?.timeEstimate || 'Ongoing'}
            </span>
          </div>

          {/* Story teaser */}
          {masterContent?.storyTeaser?.length > 0 && (
            <div className="mb-3 text-sm text-[#1a472a]/80 leading-relaxed space-y-2">
              {masterContent.storyTeaser.map((p: string, i: number) => <p key={i}>{p}</p>)}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenDetails?.(questId); }}
                className="text-xs text-[#4a7c59] font-medium hover:text-[#1a472a] transition-colors"
              >
                Read full story in the guide &rarr;
              </button>
            </div>
          )}

          {/* Endorsements */}
          {endorsements && endorsements.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {endorsements.slice(0, 2).map((e) => (
                <span key={`${e.orgId}-${e.endorsementType}`} className={`text-xs px-2 py-0.5 rounded-full border ${e.endorsementType === "required" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-[#7dd87d]/20 text-[#1a472a] border-[#7dd87d]/30"}`}>
                  {e.endorsementType === "required" ? "⭐ Required by" : "🌱 Recommended by"} {e.orgId}
                </span>
              ))}
            </div>
          )}

          {/* Social proof */}
          <div className="flex flex-wrap items-center gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
            {(activePlayers ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                🌿 {activePlayers} in the field
              </span>
            )}
            {quest.forumUrl && (
              <Link href={quest.forumUrl} className="inline-flex items-center gap-1.5 text-xs text-[#4a7c59] hover:text-[#1a472a] font-medium transition-colors" onClick={(e) => e.stopPropagation()}>
                <MessageSquare className="w-3.5 h-3.5" /> Discuss in Forum
              </Link>
            )}
          </div>

          {/* Primary CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetails?.(questId); }}
            className="w-full flex items-center justify-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white px-4 py-3 rounded-xl font-semibold transition-colors"
          >
            Do this quest <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
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
          className="relative bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-8 rounded-2xl border-3 border-orange-500/50 overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url(/images/quests/quest-fire-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="relative z-10">
          {/* Completion Badge */}
          <QuestCompletionBadge questId="quest-0" className="!top-4 !left-4" />
          <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] sm:text-xs text-orange-600 bg-orange-100 px-2 sm:px-3 py-1 rounded-full max-w-[40%] z-10" aria-label="Click to flip for video">
            <RotateCcw className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline">Click to flip for video</span>
            <span className="sm:hidden">Flip</span>
          </div>
          <div className="flex items-center gap-4 mb-4 pr-16 sm:pr-32">
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
          </div>{/* close z-10 wrapper */}
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

// ── Season carousel config ──────────────────────────────────────────────

const SEASON_TAGLINES: Record<SeasonKey, string> = {
  spring: "Season of New Beginnings",
  summer: "Season of Adventure",
  fall: "Season of Harvest",
  winter: "Season of Reflection",
};

const SEASON_ICONS: Record<SeasonKey, React.ComponentType<{ className?: string }>> = {
  spring: Sprout,
  summer: Sun,
  fall: Leaf,
  winter: Snowflake,
};

const RITES_BY_SEASON_DATA: Record<SeasonKey, typeof questData.spring> = {
  spring: questData.spring,
  summer: questData.summer,
  fall: questData.fall,
  winter: questData.winter,
};

/** Pre-compute depth quests per season to avoid re-filtering on every render */
const DEPTH_QUESTS_BY_SEASON: Record<string, typeof seasonalQuestsData> = {};
for (const season of SEASON_ORDER_ALL) {
  DEPTH_QUESTS_BY_SEASON[season] = seasonalQuestsData.filter(sq => sq.season === season);
}
DEPTH_QUESTS_BY_SEASON["any"] = seasonalQuestsData.filter(sq => sq.season === "any");

// ── Continue Your Journey Banner ────────────────────────────────────────
function ContinueYourJourneyBanner() {
  let unlocks: ReturnType<typeof useQuestUnlocks> | null = null;
  try { unlocks = useQuestUnlocks(); } catch { /* outside provider */ }
  let nextQuest: ReturnType<typeof useNextQuest> = null;
  try { nextQuest = useNextQuest(); } catch { /* outside provider */ }

  if (!unlocks) return null;

  const completedRites = unlocks.ritesProgress.completed;
  const totalRites = unlocks.ritesProgress.total || 1; // guard against division by zero
  const progressPct = Math.round((completedRites / totalRites) * 100);

  let bannerSub = "";
  if (nextQuest) {
    // Fire quest title already includes "Quest 0:", other rites don't
    const qNum = nextQuest.questNumber !== null && nextQuest.type !== "fire" ? `Quest ${nextQuest.questNumber}: ` : "";
    const se = nextQuest.season ? (SHARED_SEASON_EMOJI[nextQuest.season] ?? "") + " " : "";
    bannerSub = `${se}${qNum}${nextQuest.title}`;
  } else {
    bannerSub = "All Rites complete. Explore Epic Quests and seasonal depth quests.";
  }

  return (
    <section className="py-10 bg-gradient-to-b from-[#f0ebe3] to-[#faf6f1]">
      <div className="container max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Continue Your Journey <ForYouLabel />
        </h2>
        <p className="text-[#1a472a]/70 text-base mb-4">{bannerSub}</p>
        {nextQuest?.prompt && (
          <p className="text-[#4a7c59] font-medium text-sm mb-4">{nextQuest.prompt}</p>
        )}
        {/* Progress bar */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs text-[#1a472a]/60 mb-1">
            <span>{completedRites} of {totalRites} Rites completed</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-[#1a472a]/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full relative transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #4a7c59, #7dd87d)",
              }}
            >
              {/* Gold shimmer on leading edge */}
              {progressPct > 0 && progressPct < 100 && (
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-r from-transparent to-amber-400/60 rounded-full" />
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <SeasonProgressRing completedSeasons={unlocks.completedSeasons} compact />
        </div>
      </div>
    </section>
  );
}

// ── Season Carousels (combined Rites + depth quests) ────────────────────
type SeasonCarouselProps = {
  unlocks: ReturnType<typeof useQuestUnlocks> | null;
  shouldShowQuest: (id: string) => boolean;
  openQuestDetails: (id: string) => void;
  hemisphereLoading: boolean;
  currentSeason: string;
  activeSeasonFilter: SeasonKey | null;
  /** Quest activity state */
  activity: {
    counts: Record<string, number>;
    myActiveIds: Set<string>;
    isAuthenticated: boolean;
    signalActive: { mutate: (v: { questId: string; questTitle: string }) => void };
    clearActive: { mutate: (v: { questId: string }) => void };
    endorsementsMap: Record<string, Array<{ orgId: string; endorsementType: "recommended" | "required" }>>;
  };
};

function SeasonCarousels({
  unlocks, shouldShowQuest, openQuestDetails, hemisphereLoading, currentSeason,
  activeSeasonFilter, activity,
}: SeasonCarouselProps) {
  const { isQuestCompleted: checkCompleted } = useQuestProgressContext();
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  // Outside-click to collapse
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-quest-card="true"]')) {
        setExpandedQuestId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Escape to collapse
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedQuestId) {
        setExpandedQuestId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [expandedQuestId]);
  const rotated = getRotatedSeasons(currentSeason as SeasonKey);
  const seasonsToShow = activeSeasonFilter ? [activeSeasonFilter] : rotated;

  return (
    <>
      {seasonsToShow.map((season) => {
        const palette = SEASON_PALETTE[season];
        const rites = RITES_BY_SEASON_DATA[season];
        const depthQuests = DEPTH_QUESTS_BY_SEASON[season] ?? [];
        const isCurrentSeason = season === currentSeason;
        const isSeasonLocked = unlocks ? !unlocks.unlockedSeasons.includes(season) : false;
        const depthLocked = unlocks ? !unlocks.isSeasonalPracticeUnlocked : true;
        const SeasonIcon = SEASON_ICONS[season];
        const emoji = SHARED_SEASON_EMOJI[season];
        const label = SHARED_SEASON_LABELS[season];
        const tagline = SEASON_TAGLINES[season];

        // Count completed rites in this season
        const completedInSeason = rites.filter(q => checkCompleted(`quest-${q.id}`)).length;

        return (
          <ParallaxSection key={season} imageSrc={palette.parallax}>
            <div className="container">
              {/* Season header */}
              <div className={`flex items-center gap-3 mb-2 ${isCurrentSeason ? "bg-white/10 backdrop-blur-sm -mx-4 px-4 py-3 rounded-xl border border-white/20" : ""}`}>
                <div className={`w-14 h-14 rounded-full ${palette.iconBg} flex items-center justify-center shadow-lg`}>
                  <SeasonIcon className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)", textShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)" }}>
                      {emoji} {label} Rites &amp; Quests
                    </h3>
                    {isCurrentSeason && (
                      <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/30">
                        Current Season
                      </span>
                    )}
                  </div>
                  <p className="text-white/90 font-medium" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)" }}>
                    {tagline}
                  </p>
                </div>
                {/* Rites progress count */}
                <div className="hidden sm:flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full">
                  <span className="text-white/70 text-xs font-medium">
                    {completedInSeason}/{rites.length} Rites
                  </span>
                </div>
              </div>

              {/* Lock notice */}
              {isSeasonLocked && unlocks && unlocks.getSeasonLockReason(season) && (
                <div className="mb-6 mt-4 flex items-center gap-3 bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-3">
                  <span className="text-white/50 text-lg">{"\uD83D\uDD12"}</span>
                  <span className="text-white/70 text-sm font-medium">{unlocks.getSeasonLockReason(season)}</span>
                </div>
              )}

              {/* Combined carousel: Rites (gold) + Depth quests (green) */}
              <div className="mt-6">
                <QuestCarousel totalCount={rites.length + depthQuests.length}>
                  {/* Rites of Passage cards first */}
                  {rites.filter(quest => shouldShowQuest(`quest-${quest.id}`)).map((quest) => (
                    <div key={quest.id} id={`quest-${quest.id}`} className="relative">
                      {/* Rite number badge */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-amber-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                          Rite {quest.id}
                        </span>
                      </div>
                      <QuestCard
                        quest={quest}
                        colorClass={`${palette.cardBorder} bg-white/95 backdrop-blur-sm border-amber-400/40`}
                        onOpenDetails={openQuestDetails}
                        isGreatNow={!hemisphereLoading && (QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes(currentSeason) || QUEST_BEST_SEASONS[`quest-${quest.id}`]?.includes("any"))}
                        activePlayers={activity.counts[`quest-${quest.id}`] ?? 0}
                        isActive={activity.myActiveIds.has(`quest-${quest.id}`)}
                        isAuthenticated={activity.isAuthenticated}
                        onToggleActive={() => {
                          if (activity.myActiveIds.has(`quest-${quest.id}`)) {
                            activity.clearActive.mutate({ questId: `quest-${quest.id}` });
                          } else {
                            activity.signalActive.mutate({ questId: `quest-${quest.id}`, questTitle: quest.title ?? `quest-${quest.id}` });
                          }
                        }}
                        endorsements={activity.endorsementsMap[`quest-${quest.id}`] ?? []}
                        isLocked={unlocks ? !unlocks.isQuestUnlocked(`quest-${quest.id}`) : false}
                        isExpanded={expandedQuestId === `quest-${quest.id}`}
                        onExpand={() => setExpandedQuestId(`quest-${quest.id}`)}
                        onCollapse={() => setExpandedQuestId(null)}
                      />
                    </div>
                  ))}
                  {/* Seasonal depth quest cards */}
                  {depthQuests.map((sq) => (
                    <div key={sq.id} id={sq.id}>
                      <SeasonalDepthCard quest={sq} isLocked={depthLocked} />
                    </div>
                  ))}
                </QuestCarousel>

                {rites.filter(quest => shouldShowQuest(`quest-${quest.id}`)).length === 0 && depthQuests.length === 0 && (
                  <p className="text-center text-white/70 py-8">No quests match your current filters</p>
                )}
              </div>
            </div>
          </ParallaxSection>
        );
      })}

      {/* Anytime Quests Section */}
      <ParallaxSection imageSrc="/backgrounds/quest-anytime-baked.webp">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-full bg-[#4a7c59] flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                Anytime Quests
              </h3>
              <p className="text-[#7dd87d] font-medium">No season required. Do these whenever you are ready.</p>
            </div>
          </div>
          <QuestCarousel totalCount={seasonalQuestsData.filter(q => q.season === "any").length}>
            {seasonalQuestsData.filter(q => q.season === "any").map((sq) => (
              <SeasonalDepthCard key={sq.id} quest={sq} isLocked={unlocks ? !unlocks.isSeasonalPracticeUnlocked : true} />
            ))}
          </QuestCarousel>
        </div>
      </ParallaxSection>
    </>
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

  // Quest progression locking
  let unlocks: ReturnType<typeof useQuestUnlocks> | null = null;
  try { unlocks = useQuestUnlocks(); } catch { /* not inside QuestProgressProvider yet */ }
  
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
    <div className="min-h-screen bg-[#faf6f1] pb-24 md:pb-0">
      <SEO {...pageSEO.quest} breadcrumbs={[{ name: "Home", url: "/" }, { name: "Quests", url: "/quest" }]} />
      <JsonLD data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "ReGen Civics Quests",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": questData.intro.title, "url": `https://regencivics.earth/quest#${questData.intro.slug}` },
          ...questData.spring.map((q, i) => ({ "@type": "ListItem" as const, "position": i + 2, "name": q.title, "url": `https://regencivics.earth/quest#${q.slug}` })),
        ]
      }} />

      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-[#7dd87d] via-[#7dd87d] to-[#7dd87d] py-3 px-4 text-center">
        <p className="text-[#1a472a] font-medium flex items-center justify-center gap-2 flex-wrap">
          <Sparkles className="w-5 h-5" />
          <span>{pageCopy.quest.announcement}</span>
          <Sparkles className="w-5 h-5" />
        </p>
        <div className="flex items-center justify-center mt-2">
          <SocialLinks variant="pills" size="sm" colorScheme="dark" gap="sm" />
        </div>
      </div>

      {/* Quest Hero Image */}
      <div className="w-full overflow-hidden max-h-[240px] sm:max-h-[360px] md:max-h-[480px]">
        <img
          src="/images/quests/quest-hero.webp"
          alt="A forest path at golden hour"
          loading="eager"
          width={1920}
          height={1047}
          sizes="100vw"
          className="w-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
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
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setHemisphereOverride("northern"); window.location.reload(); }}
                  className={`text-xs px-4 py-2.5 min-h-[44px] rounded-full border transition-colors ${
                    hemisphere === "northern"
                      ? "bg-[#7dd87d] text-[#1a472a] border-[#7dd87d]"
                      : "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                  }`}
                >
                  {pageCopy.quest.hero.hemisphere.northern}
                </button>
                <button
                  onClick={() => { setHemisphereOverride("southern"); window.location.reload(); }}
                  className={`text-xs px-4 py-2.5 min-h-[44px] rounded-full border transition-colors ${
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
                  <span className="text-white/55 text-xs">From the Field</span>
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
              className="rounded-xl bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a]"
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
      <section className="py-10 md:py-14 bg-gradient-to-r from-[#1a472a] via-[#2d5a3d] to-[#1a472a] relative overflow-hidden">
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
                {/* Section illustration, acts */}
                <img
                  src="/images/quests/quest-acts.webp"
                  alt="Hands planting a seedling into rich soil"
                  loading="lazy"
                  width={1920}
                  height={1047}
                  className="w-full rounded-xl mb-6 object-cover"
                  style={{ maxHeight: '280px', objectPosition: 'center 60%' }}
                />
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
                  <VineDivider className="my-6" />
                  <h4 className="text-[#4a7c59] font-semibold mb-3 text-sm uppercase tracking-wide">The Arc</h4>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">We begin with Fire. Before we can build anything new we have to be willing to let go of the old.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">Next we focus on our physical health - the healthier we are - the more capable we become.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The Potions Quest adds diversity and intelligence to our bodies and changes the information processing in all three minds; our gut, heart, and head.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">Then we extend our internal intelligence to the soil around us through saving seeds and making healing wholes and growing food connected to ourselves.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The Food Foresting quest, done after Potions, seeds the earth with the expanded ecosystem of our own body and moves us closer to a world of healthy food abundance.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">From there, the quests move outward. From personal vitality into relationships, communication, creation, community, and so much more.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">The seasonal quests are something you can do in a few days while the EPIC Quests are acts of collective transformation and require years of dedication.</p>

                  <VineDivider className="my-6" />
                  <h4 className="text-[#4a7c59] font-semibold mb-3 text-sm uppercase tracking-wide">What the Tokens Mean</h4>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">$ReGen tokens are earned by completing quests and contributing to the mission. They represent your participation in building a regenerative civilization. As the Game grows, so do the opportunities for the tokens to carry value.</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed mb-4">RGVoice tokens give you a say in the governance of the Game itself, so the Game is always governed by those who are playing it.</p>

                  <VineDivider className="my-6" />
                  {/* Section illustration, remembers */}
                  <img
                    src="/images/quests/quest-remembers.webp"
                    alt="Aerial view of regenerative land plots connected by glowing threads"
                    loading="lazy"
                    width={1920}
                    height={1047}
                    className="w-full rounded-xl mb-6 object-cover"
                    style={{ maxHeight: '240px', objectPosition: 'center' }}
                  />
                  <h4 className="text-[#4a7c59] font-semibold mb-3 text-sm uppercase tracking-wide">Quests as Qualifiers</h4>
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

      {/* Token info is shown on quest cards, removed duplicate callout per Fix 110-C */}

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
            <div ref={featuredQuestRef} className="relative bg-gradient-to-br from-[#7dd87d]/20 to-[#4a7c59]/20 p-8 rounded-2xl border-3 border-[#7dd87d]/50 overflow-hidden">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'url(/images/quests/quest-food-foresting-hero.webp)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div className="relative z-10">
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
              {/* Old-Map Style Checklist */}
              <div className="mt-4 p-5 rounded-xl border-2 border-[#2d5a3d]/40 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f5e6c8 0%, #e8d5a8 40%, #dcc89a 100%)', boxShadow: 'inset 0 0 20px rgba(139,115,85,0.15), 0 2px 8px rgba(0,0,0,0.1)' }}>
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                <h4 className="relative text-sm font-bold text-[#5a4230] mb-3 uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>The Food Foresting Loop</h4>
                <div className="relative space-y-2">
                  {[
                    "Get Delicious Local Fruits",
                    "Bring Yummy Fruits on a Forest/Nature Walk",
                    "Eat Yummy Fruits, Save Seeds, Enjoy the Walk",
                    "Plant Seeds in Good New Homes for Seeds",
                    "Harvest Wild Fruits Grown by You and Other Players",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#4a7c59] text-base mt-0.5">&#10003;</span>
                      <span className="text-[#5a4230] text-sm leading-snug" style={{ fontFamily: 'Georgia, serif' }}>{step}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[#4a7c59] text-base">&#8634;</span>
                    <span className="text-[#5a4230] text-sm font-semibold italic" style={{ fontFamily: 'Georgia, serif' }}>Repeat</span>
                  </div>
                </div>
              </div>

              {/* Mark Complete Button */}
              <div className="pt-4 border-t border-[#7dd87d]/30">
                <MarkCompleteButton questId="food-foresting" size="md" />
              </div>
              </div>{/* close z-10 wrapper */}
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

      {/* Continue Your Journey Banner */}
      <ContinueYourJourneyBanner />

      {/* All Quests by Season - Header */}
      <section className="py-12 bg-[#f0ebe3]">
        <div className="container">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 text-[#1a472a] text-center"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Rites &amp; Quests by <span className="text-[#7dd87d]">Season</span> <ForYouLabel label="Track Progress" />
          </h2>
          <p className="text-center text-[#1a472a]/70 max-w-2xl mx-auto mb-6">
            Each season combines Rites of Passage (gold cards) with seasonal depth quests. Quests can be done at any time and in any order. <strong>A key focus is growing and having fun!</strong>
          </p>
          {/* Season filter tabs */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-6">
            {SEASON_ORDER_ALL.map((s) => {
              const active = activeSeasonFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setActiveSeasonFilter(active ? null : s)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border min-h-[44px] ${
                    active
                      ? "bg-[#1a472a] text-white border-[#1a472a]"
                      : "bg-white text-[#1a472a] border-[#1a472a]/20 hover:border-[#1a472a]/50"
                  }`}
                  style={{ fontFamily: 'var(--font-accent)' }}
                >
                  {SHARED_SEASON_EMOJI[s]} {SHARED_SEASON_LABELS[s]}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <QuestFilter activeFilters={filters} onFilterChange={setFilters} />
          </div>
        </div>
      </section>

      {/* Combined Season Carousels - current season first */}
      <SeasonCarousels
        unlocks={unlocks}
        shouldShowQuest={shouldShowQuest}
        openQuestDetails={openQuestDetails}
        hemisphereLoading={hemisphereLoading}
        currentSeason={currentSeason}
        activeSeasonFilter={activeSeasonFilter}
        activity={{
          counts: activeCountsData,
          myActiveIds: myActiveQuestIds,
          isAuthenticated: !!user,
          signalActive,
          clearActive,
          endorsementsMap,
        }}
      />

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

          {/*
            Mobile: horizontal snap carousel (flex + overflow-x).
            Desktop: 2-column grid via md:grid override of layout properties.
          */}
          <div className="flex md:grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-10 overflow-x-auto snap-x snap-mandatory md:overflow-visible md:snap-none -mx-4 px-4 md:mx-auto md:px-0 pb-2 md:pb-0 [&>div]:snap-start [&>div]:shrink-0 [&>div]:w-[85vw] md:[&>div]:w-auto [&>div]:max-w-sm md:[&>div]:max-w-none">
            {/* Food Foresting */}
            <div className="relative bg-white/10 backdrop-blur-md p-7 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl flex flex-col gap-4">
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-semibold">
                <RotateCcw className="w-3 h-3" /> Repeatable
              </span>
              <div className="flex items-start gap-4 pr-28 sm:pr-24">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {questData.featured.title}
                  </h4>
                  <p className="text-sm text-white/70">{questData.featured.subtitle}</p>
                </div>
              </div>
              <p className="text-white/85 text-base sm:text-sm leading-relaxed flex-1">
                {questData.featured.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.featured.reward.regen} $ReGen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.featured.reward.rvoice} RGVoice</span>
                <span className="text-white/60 text-xs ml-1">per completion</span>
              </div>
            </div>

            {/* Fasting */}
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuestDetails("quest-13"); } }} className="relative bg-white/10 backdrop-blur-md p-7 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl flex flex-col gap-4 cursor-pointer hover:border-[#7dd87d]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50" onClick={() => openQuestDetails("quest-13")}>
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-semibold">
                <RotateCcw className="w-3 h-3" /> Repeatable
              </span>
              <div className="flex items-start gap-4 pr-28 sm:pr-24">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    Quest 13: {questData.routine.title}
                  </h4>
                  <p className="text-sm text-white/70">{questData.routine.subtitle}, {questData.routine.minimumTime}</p>
                </div>
              </div>
              <p className="text-white/85 text-base sm:text-sm leading-relaxed flex-1">
                {questData.routine.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.routine.reward.regen} $ReGen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.routine.reward.rvoice} RGVoice</span>
                <span className="text-white/60 text-xs ml-1">per completion</span>
              </div>
            </div>

            {/* Love to Heal Your Body */}
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuestDetails("quest-14"); } }} className="relative bg-white/10 backdrop-blur-md p-7 rounded-2xl border-2 border-[#7dd87d]/30 shadow-2xl flex flex-col gap-4 cursor-pointer hover:border-[#7dd87d]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#7dd87d]/50" onClick={() => openQuestDetails("quest-14")}>
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/40 text-[#7dd87d] text-xs font-semibold">
                <RotateCcw className="w-3 h-3" /> Repeatable
              </span>
              <div className="flex items-start gap-4 pr-28 sm:pr-24">
                <div className="w-12 h-12 rounded-full bg-[#7dd87d] flex items-center justify-center flex-shrink-0">
                  <HeartPulse className="w-6 h-6 text-[#1a472a]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {questData.routine2.title}
                  </h4>
                  <p className="text-sm text-white/70">{questData.routine2.subtitle}, {questData.routine2.minimumTime}</p>
                </div>
              </div>
              <p className="text-white/85 text-base sm:text-sm leading-relaxed flex-1">
                {questData.routine2.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-3 py-1 bg-[#7dd87d]/30 text-[#7dd87d] rounded-full font-semibold text-sm">+{questData.routine2.reward.regen} $ReGen</span>
                <span className="px-3 py-1 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold text-sm">+{questData.routine2.reward.rvoice} RGVoice</span>
                <span className="text-white/60 text-xs ml-1">per completion</span>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* Suggest a Quest CTA */}
      <section className="py-12 px-4 bg-gradient-to-b from-[#1a472a]/5 to-[#f0ebe3]">
        <div className="container">
          <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm border border-[#7dd87d]/40 rounded-2xl text-center shadow-lg">
            <div className="w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-[#1a472a]" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>Got a Quest Idea?</h2>
            <p className="text-[#1a472a]/70 mb-6 max-w-lg mx-auto">If you've discovered a practice worth spreading, propose it. The community votes. The best ones become official quests.</p>
            <Link href="/community/quests" className="inline-flex items-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md">
              Suggest a Quest <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Epic Quest Section */}
      <EpicQuestSection />

      {/* Quest Journal Prompt */}
      <div className="text-center py-8 text-[#1a472a]/60 text-sm">
        <Link href="/profile?tab=quests" className="hover:text-[#1a472a] underline">
          Your quest completions live in your profile →
        </Link>
      </div>

      {/* Token Info Section */}
      <section className="py-16 bg-[#f0ebe3]">
        <div className="container">
          <h2 
            className="text-2xl md:text-3xl font-bold mb-10 text-center text-[#1a472a]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Want to learn more about the tokens you're earning in quests?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* $ReGen Tokenomics Card */}
            <div className="bg-white rounded-2xl p-8 shadow-md border border-[#7dd87d]/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#1a472a]" />
                </div>
                <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>$ReGen Tokenomics</h3>
              </div>
              <p className="text-[#1a472a]/70 text-sm font-semibold mb-2">🌳 Quests build your stake in the Game</p>
              <p className="text-[#1a472a]/70 text-sm leading-relaxed mb-5">
                Every quest you complete earns $ReGen tokens, which is our in-game currency. Part of our Infinite Game involves making this a real and meaningful currency for our everyday lives in how we meet our needs and thrive together. The more you contribute, the more currency you earn.
              </p>
              <Link href="/bionomics" className="inline-flex items-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                $ReGen on the Bionomics page <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* RGVoice Governance Card */}
            <div className="bg-white rounded-2xl p-8 shadow-md border border-[#7dd87d]/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 flex items-center justify-center">
                  <Vote className="w-5 h-5 text-[#1a472a]" />
                </div>
                <h3 className="text-xl font-bold text-[#1a472a]" style={{ fontFamily: 'var(--font-display)' }}>RGVoice Governance</h3>
              </div>
              <p className="text-[#1a472a]/70 text-sm font-semibold mb-2">🌳 Quests build your governance voice</p>
              <p className="text-[#1a472a]/70 text-sm leading-relaxed mb-5">
                Every quest you complete earns RGVoice tokens, giving you more say in how the game evolves. The more you contribute, the more the game is governed by players like you.
              </p>
              <Link href="/governance" className="inline-flex items-center gap-2 bg-[#1a472a] hover:bg-[#0d2818] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                RGVoice Governance <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Sign In CTA */}
          <div className="mt-10">
            <SignInCTA />
          </div>
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
