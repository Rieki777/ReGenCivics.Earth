/**
 * EpicQuestSection, full-width dark section showing Epic quests.
 * Data from epicQuestsData.ts. Uses QuestCarousel for horizontal scroll.
 * Includes one-time unlock celebration animation.
 */

import { useState, useEffect, useMemo } from "react";
import { EPIC_QUESTS, EpicQuest } from "@/data/epicQuestsData";
import { ELEMENT_EMOJI, DEFAULT_ELEMENT_EMOJI } from "@/data/seasonConstants";
import { Link } from "wouter";
import { Lock } from "lucide-react";
import { SeasonProgressRing } from "@/components/SeasonProgressRing";
import { QuestCarousel } from "@/components/QuestCarousel";
import { LockedQuestCard } from "@/components/LockedQuestCard";
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { computeReveal } from "@shared/openUniverseReveal";
import { useActivePathHash, pathToElement } from "@/hooks/useActivePathHash";

const TIER_CONFIG = {
  easy: {
    label: "Easy",
    accent: "#7dd87d",
    accentBg: "rgba(125,216,125,0.08)",
    badgeBg: "rgba(125,216,125,0.15)",
    badgeText: "#7dd87d",
    borderColor: "rgba(125,216,125,0.4)",
    dot: "bg-green-500",
  },
  hard: {
    label: "Hard",
    accent: "#d4a574",
    accentBg: "rgba(212,165,116,0.08)",
    badgeBg: "rgba(212,165,116,0.15)",
    badgeText: "#d4a574",
    borderColor: "rgba(212,165,116,0.4)",
    dot: "bg-amber-500",
  },
  expert: {
    label: "Expert",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.08)",
    badgeBg: "rgba(239,68,68,0.15)",
    badgeText: "#ef4444",
    borderColor: "rgba(239,68,68,0.4)",
    dot: "bg-red-500",
  },
};

// Element icons from shared constants with safe fallback

function EpicCard({ quest, staggerDelay }: { quest: EpicQuest; staggerDelay?: number }) {
  const cfg = TIER_CONFIG[quest.tier];

  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden border transition-all hover:border-white/25"
      style={{
        backgroundColor: cfg.accentBg,
        borderColor: "rgba(255,255,255,0.1)",
        animationDelay: staggerDelay ? `${staggerDelay}ms` : undefined,
      }}
    >
      {/* Top accent stripe */}
      <div className="h-0.5 w-full" style={{ backgroundColor: cfg.accent }} />

      <div className="p-5 sm:p-6 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4
              className="text-white font-bold text-base leading-snug"
              style={{ fontFamily: "var(--font-display, serif)" }}
            >
              {quest.title}
            </h4>
            <p className="text-white/70 text-sm mt-0.5">{quest.tagline}</p>
          </div>

          {/* EPIC badge */}
          <span
            className="flex-shrink-0 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{
              color: cfg.badgeText,
              borderColor: cfg.accent,
              backgroundColor: cfg.badgeBg,
              boxShadow: `0 0 10px ${cfg.accent}40`,
            }}
          >
            EPIC
          </span>
        </div>

        {/* Description */}
        <p className="text-white/65 text-sm leading-relaxed">{quest.description}</p>

        {/* Meta row with duration and commitment badges */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-auto pt-2 border-t border-white/8 text-xs text-white/45">
          {/* Duration badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/70">Duration:</span> {quest.duration}
          </span>
          {/* Commitment dot */}
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-white/70">{cfg.label}</span>
          </span>
          {/* Element + reward */}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-sm leading-none">{ELEMENT_EMOJI[quest.element as keyof typeof ELEMENT_EMOJI] ?? DEFAULT_ELEMENT_EMOJI}</span>
            <span
              className="font-bold text-xs"
              style={{ color: cfg.badgeText }}
            >
              +{quest.regenReward} $ReGen
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

const EPIC_UNLOCK_KEY = "epic_unlock_celebrated";

export function EpicQuestSection() {
  let unlocks: ReturnType<typeof useQuestUnlocks> | null = null;
  try { unlocks = useQuestUnlocks(); } catch { /* outside provider */ }
  // Default to LOCKED when unlocks is null / still loading. Locked is the
  // safe default. Showing "Unlocked" to a player who hasn't finished the
  // rites was the root cause of the 2026-04-21 bug report.
  const isLocked = unlocks?.isEpicUnlocked === true ? false : true;
  const [celebrating, setCelebrating] = useState(false);

  // One-time unlock celebration
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!isLocked && unlocks?.isEpicUnlocked) {
      try {
        if (!localStorage.getItem(EPIC_UNLOCK_KEY)) {
          localStorage.setItem(EPIC_UNLOCK_KEY, "true");
          setCelebrating(true);
          timer = setTimeout(() => setCelebrating(false), 2000);
        }
      } catch { /* localStorage unavailable */ }
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isLocked, unlocks?.isEpicUnlocked]);

  // Path filter from the portal selector (synced via URL hash). When
  // an active path is set, narrow the EPIC_QUESTS pool to those whose
  // element matches the path's elemental theme. Phase 3.2 spec.
  const [activePath] = useActivePathHash();
  const filterElement = pathToElement(activePath);

  // Sort all epics by tier order: easy -> hard -> expert
  const sortedQuests = useMemo(() => {
    const tierOrder = ["easy", "hard", "expert"] as const;
    const filtered = filterElement
      ? EPIC_QUESTS.filter((q) => q.element === filterElement)
      : EPIC_QUESTS;
    return [...filtered].sort(
      (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
    );
  }, [filterElement]);

  // Open Universe progressive reveal (spec section 4.3). After Rites
  // are complete, only 2 + completedEpicCount quests are visible at
  // any time. The rest render as moss-overgrown ruins. Order is
  // deterministic per player via a seeded shuffle.
  const auth = (() => {
    try {
      return useAuth();
    } catch {
      return { user: null } as ReturnType<typeof useAuth>;
    }
  })();
  const userId: number | null =
    typeof (auth as { user?: { id?: number | string } }).user?.id === "number"
      ? ((auth as { user?: { id?: number } }).user!.id as number)
      : null;
  const profileQuery = trpc.playerProfiles.me.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });
  const completedEpicIds: string[] = useMemo(() => {
    try {
      const all = JSON.parse((profileQuery.data?.questsCompleted as string) || "[]") as string[];
      const epicIdSet = new Set(EPIC_QUESTS.map((q) => q.id));
      return all.filter((id) => epicIdSet.has(id));
    } catch {
      return [];
    }
  }, [profileQuery.data?.questsCompleted]);

  const reveal = useMemo(() => {
    if (isLocked) {
      // Pre-Rites players see all as locked silhouettes (the section
      // is grayed out anyway by the parent wrapper, but we still pick
      // the right shape so the moss-ruin variant flashes in cleanly
      // when Rites finish).
      return { visible: [] as EpicQuest[], locked: sortedQuests };
    }
    const seed = userId ?? 0;
    return computeReveal(sortedQuests, seed, completedEpicIds.length);
  }, [isLocked, sortedQuests, userId, completedEpicIds.length]);

  // Track which IDs were just revealed so we can run the canopy-fall
  // animation only on those cards (a single emotional beat, not a
  // page-wide sparkle).
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(() => new Set());
  const visibleIdsKey = reveal.visible.map((q) => q.id).join("|");
  useEffect(() => {
    const newIds = new Set(reveal.visible.map((q) => q.id));
    setAnimatedIds(newIds);
    const t = setTimeout(() => setAnimatedIds(new Set()), 1200);
    return () => clearTimeout(t);
  }, [visibleIdsKey]);

  return (
    <section id="epic-quests" className="py-20 px-4" style={{ backgroundColor: "#0a1f0f" }}>
      <div className="container max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 relative">
          {/* One-shot gold shimmer overlay on unlock */}
          {celebrating && (
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: "radial-gradient(ellipse at center, rgba(251,191,36,0.25) 0%, transparent 70%)",
                animation: "epicUnlockGlow 2s ease-out forwards",
              }}
            />
          )}
          <style>{`
            @keyframes epicUnlockGlow {
              0% { opacity: 0; transform: scale(0.8); }
              20% { opacity: 1; transform: scale(1.05); }
              100% { opacity: 0; transform: scale(1.2); }
            }
          `}</style>
          <div className={`inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 transition-colors ${
            isLocked
              ? "border-[#7dd87d]/30 text-[#7dd87d]/70"
              : "border-amber-400/50 text-amber-400"
          }`}>
            {isLocked ? "Long-Form Challenges" : "Unlocked"}
          </div>
          <h2
            className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-4 transition-colors ${
              isLocked ? "text-white/70" : "text-white"
            }`}
            style={{ fontFamily: "var(--font-display, serif)" }}
          >
            Epic Quests {isLocked && <Lock className="inline w-7 h-7 text-white/30 ml-2" />}
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Land Transformation Journeys. Long-form challenges for committed regenerators. These are seasons of real work.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <SeasonProgressRing completedSeasons={unlocks?.completedSeasons ?? []} compact />
            <span className="text-white/70 text-sm">
              {unlocks?.completedRitesCount ?? 0}/13 Rites Complete
            </span>
          </div>
          {isLocked && unlocks && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <Lock className="w-4 h-4 text-emerald-400/70" />
              <span className="text-white/60 text-sm">
                Complete all 13 Rites of Passage to access Epic Quests
              </span>
            </div>
          )}
        </div>

        {/* Canopy-fall animation for newly revealed Open Universe quests
            (spec section 9.7). Single beat, not a barrage of pings. */}
        <style>{`
          @keyframes canopyFall {
            0% { opacity: 0; transform: translateY(-24px) scale(0.96); filter: blur(2px); }
            55% { opacity: 1; transform: translateY(2px) scale(1.01); filter: blur(0); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .canopy-fall { animation: canopyFall 0.9s ease-out both; }
          @media (prefers-reduced-motion: reduce) {
            .canopy-fall { animation: none; opacity: 1; transform: none; filter: none; }
          }
        `}</style>

        {/* Epic carousel - visible quests interactive, locked render as
            moss ruins via LockedQuestCard. Spec sections 4.3 + 9.8.
            Empty-state branch handles the filtered case where the
            active path has no Epic quests in its element pool yet. */}
        <div className={isLocked ? "opacity-80 pointer-events-none" : ""}>
          {filterElement && sortedQuests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
              <p className="text-white/70 text-base mb-2">
                No {filterElement}-themed Epic Quests yet.
              </p>
              <p className="text-white/40 text-sm mb-5">
                The forest grows season by season. More quests in this element come with the next round of authoring.
              </p>
              <a
                href={typeof window !== "undefined" ? window.location.pathname + window.location.search : "/quest"}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/15 text-white/80 text-sm hover:bg-white/10 transition-colors"
              >
                See all Epic Quests
              </a>
            </div>
          ) : (
            <QuestCarousel totalCount={reveal.visible.length + reveal.locked.length} fadeColor="#0a1f0f">
              {reveal.visible.map((quest, i) => (
                <div
                  key={quest.id}
                  className={animatedIds.has(quest.id) ? "canopy-fall" : ""}
                  style={{ animationDelay: animatedIds.has(quest.id) ? `${i * 80}ms` : undefined }}
                >
                  <EpicCard quest={quest} staggerDelay={celebrating ? i * 100 : undefined} />
                </div>
              ))}
              {reveal.locked.map((quest) => (
                <LockedQuestCard
                  key={quest.id}
                  title={quest.title}
                  subtitle={quest.tagline}
                  glyph={quest.element as "fire" | "water" | "earth" | "air"}
                  unlockHint="Reveals as you complete your current Open Universe quests"
                />
              ))}
            </QuestCarousel>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link href="/community">
            <span className="inline-block px-8 py-3 rounded-full font-bold text-base cursor-pointer transition-colors shadow-lg shadow-[#7dd87d]/10 hover:bg-[#9de89d]"
              style={{ backgroundColor: "#7dd87d", color: "#0a1f0f" }}
            >
              Join the Quest
            </span>
          </Link>
          <p className="mt-4 text-white/60 text-sm">
            Connect with others working on these in the community forum.
          </p>
        </div>
      </div>
    </section>
  );
}
