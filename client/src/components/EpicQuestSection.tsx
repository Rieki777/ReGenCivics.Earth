/**
 * EpicQuestSection, full-width dark section showing Epic quests.
 * Data from epicQuestsData.ts. Placed at the bottom of the Quest page.
 */

import { EPIC_QUESTS, EpicQuest, EpicElement } from "@/data/epicQuestsData";
import { Link } from "wouter";
import { Lock } from "lucide-react";
import { SeasonProgressRing } from "@/components/SeasonProgressRing";
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";

const TIER_CONFIG = {
  easy: {
    label: "Easy",
    accent: "#7dd87d",
    accentBg: "rgba(125,216,125,0.08)",
    badgeBg: "rgba(125,216,125,0.15)",
    badgeText: "#7dd87d",
    borderColor: "rgba(125,216,125,0.4)",
  },
  hard: {
    label: "Hard",
    accent: "#d4a574",
    accentBg: "rgba(212,165,116,0.08)",
    badgeBg: "rgba(212,165,116,0.15)",
    badgeText: "#d4a574",
    borderColor: "rgba(212,165,116,0.4)",
  },
  expert: {
    label: "Expert",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.08)",
    badgeBg: "rgba(239,68,68,0.15)",
    badgeText: "#ef4444",
    borderColor: "rgba(239,68,68,0.4)",
  },
};

const ELEMENT_ICONS: Record<EpicElement, string> = {
  earth: "🌱",
  water: "💧",
  fire: "🔥",
  air: "🌬",
};

function EpicCard({ quest }: { quest: EpicQuest }) {
  const cfg = TIER_CONFIG[quest.tier];

  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden border transition-colors hover:border-white/25"
      style={{
        backgroundColor: cfg.accentBg,
        borderColor: "rgba(255,255,255,0.1)",
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
            <p className="text-white/55 text-sm mt-0.5">{quest.tagline}</p>
          </div>

          {/* EPIC badge */}
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
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

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-auto pt-2 border-t border-white/8 text-xs text-white/45">
          <span>
            <span className="text-white/30">Duration:</span> {quest.duration}
          </span>
          <span>
            <span className="text-white/30">Effort:</span> {quest.commitment}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-sm leading-none">{ELEMENT_ICONS[quest.element]}</span>
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

function TierRow({ tier }: { tier: "easy" | "hard" | "expert" }) {
  const cfg = TIER_CONFIG[tier];
  const quests = EPIC_QUESTS.filter((q) => q.tier === tier);

  if (quests.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-1.5 h-5 rounded-full flex-shrink-0"
          style={{ backgroundColor: cfg.accent }}
        />
        <h3
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: cfg.accent, fontFamily: "var(--font-accent, sans-serif)" }}
        >
          {cfg.label}
        </h3>
        <div className="flex-1 h-px" style={{ backgroundColor: `${cfg.accent}20` }} />
      </div>

      {/* Mobile: horizontal snap carousel. Desktop: 2-col grid. */}
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {quests.map((quest) => (
            <div key={quest.id} className="snap-start shrink-0 w-[85vw] max-w-sm">
              <EpicCard quest={quest} />
            </div>
          ))}
        </div>
        <p className="text-white/40 text-xs text-center mt-2">Swipe to see more →</p>
      </div>
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-4">
        {quests.map((quest) => (
          <EpicCard key={quest.id} quest={quest} />
        ))}
      </div>
    </div>
  );
}

export function EpicQuestSection() {
  let unlocks: ReturnType<typeof useQuestUnlocks> | null = null;
  try { unlocks = useQuestUnlocks(); } catch { /* outside provider */ }
  const isLocked = unlocks ? !unlocks.isEpicUnlocked : false;

  return (
    <section className="py-20 px-4" style={{ backgroundColor: "#0a1f0f" }}>
      <div className="container max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#7dd87d]/30 text-[#7dd87d]/70 mb-5">
            Long-Form Challenges
          </div>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-display, serif)" }}
          >
            EPIC Quests
          </h2>
          <p className="text-white/55 text-lg max-w-xl mx-auto">
            Long-form challenges for committed regenerators. These are not short quests. They are seasons of real work.
          </p>
          {isLocked && unlocks && (
            <div className="mt-6 inline-flex flex-col items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Lock className="w-4 h-4 text-emerald-400/70" />
                <span>Complete all 13 Rites of Passage to access Epic Quests ({unlocks.completedRitesCount}/13)</span>
              </div>
              <SeasonProgressRing completedSeasons={unlocks.completedSeasons} />
            </div>
          )}
        </div>

        {/* Tier rows */}
        <div className={isLocked ? "opacity-40 grayscale pointer-events-none" : ""}>
          <TierRow tier="easy" />
          <TierRow tier="hard" />
          <TierRow tier="expert" />
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link href="/community">
            <span className="inline-block px-8 py-3 rounded-full font-bold text-base cursor-pointer transition-colors shadow-lg shadow-[#7dd87d]/10 hover:bg-[#6bc86b]"
              style={{ backgroundColor: "#7dd87d", color: "#0a1f0f" }}
            >
              Join the Quest
            </span>
          </Link>
          <p className="mt-4 text-white/35 text-sm">
            Connect with others working on these in the community forum.
          </p>
        </div>
      </div>
    </section>
  );
}
