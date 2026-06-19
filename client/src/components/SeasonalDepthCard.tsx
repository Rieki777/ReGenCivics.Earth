/**
 * SeasonalDepthCard: card for seasonal depth quests in carousels.
 * Matches QuestCard dimensions but accepts the seasonalQuestsData shape.
 * Uses element-colored gradient placeholders (no quest art yet).
 */
import { Lock, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import type { SeasonalQuest } from "@/data/seasonalQuestsData";
import { QuestCompletionBadge, MarkCompleteButton } from "@/components/QuestProgressTracker";
import {
  ELEMENT_EMOJI, ELEMENT_GRADIENTS,
  DEFAULT_ELEMENT_EMOJI, DEFAULT_ELEMENT_GRADIENT,
} from "@/data/seasonConstants";

interface SeasonalDepthCardProps {
  quest: SeasonalQuest;
  isLocked: boolean;
}

export function SeasonalDepthCard({ quest, isLocked }: SeasonalDepthCardProps) {
  if (isLocked) {
    return (
      <div className="relative bg-white/60 rounded-xl border-2 border-[#1a472a]/5 shadow-sm opacity-60 pointer-events-none">
        <div className={`relative w-full h-36 bg-gradient-to-br ${ELEMENT_GRADIENTS[quest.element as keyof typeof ELEMENT_GRADIENTS] ?? DEFAULT_ELEMENT_GRADIENT} rounded-t-xl overflow-hidden flex items-center justify-center`}>
          <Lock className="w-8 h-8 text-white/40" />
        </div>
        <div className="p-5">
          <h4 className="font-bold text-[#1a472a]/80 text-sm leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            {quest.title}
          </h4>
          <p className="text-xs text-[#1a472a]/75 mt-1">{quest.tagline}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl border-2 border-[#1a472a]/10 shadow-md hover:shadow-lg transition-all hover:-translate-y-1 quest-card-green">
      {/* Gradient placeholder image area */}
      <div className={`relative w-full h-36 bg-gradient-to-br ${ELEMENT_GRADIENTS[quest.element as keyof typeof ELEMENT_GRADIENTS] ?? DEFAULT_ELEMENT_GRADIENT} rounded-t-xl overflow-hidden`}>
        {/* Element emoji top-right */}
        <span className="absolute top-3 right-3 text-2xl opacity-60">
          {ELEMENT_EMOJI[quest.element as keyof typeof ELEMENT_EMOJI] ?? DEFAULT_ELEMENT_EMOJI}
        </span>
        {/* Completion badge */}
        <QuestCompletionBadge questId={quest.id} />
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <h4 className="font-bold text-[#1a472a] text-sm leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {quest.title}
            </h4>
            <p className="text-xs text-[#1a472a]/70 mt-0.5">{quest.tagline}</p>
          </div>
          {/* Time pill */}
          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1a472a]/5 text-[#1a472a]/80">
            {quest.estimatedTime}
          </span>
        </div>

        <p className="text-sm text-[#1a472a]/80 mb-3 line-clamp-3">{quest.description}</p>

        {/* Reward row */}
        {quest.reward && (
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#7dd87d]/30 text-[#1a472a] rounded-full font-semibold">
              +{quest.reward.regen} $ReGen
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-[#7dd87d] text-[#1a472a] rounded-full font-semibold">
              +{quest.reward.rvoice} RGVoice
            </span>
          </div>
        )}

        <p className="text-xs text-[#1a472a]/80 italic mb-3">
          <strong>Deliverable:</strong> {quest.deliverable}
        </p>

        {quest.forumUrl && (
          <Link href={quest.forumUrl} className="inline-flex items-center gap-1.5 text-xs text-[#4a7c59] hover:text-[#1a472a] font-medium mb-3 transition-colors">
            <MessageSquare className="w-3.5 h-3.5" />
            Discuss in Forum
          </Link>
        )}

        {/* Mark Complete */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#1a472a]/10">
          <MarkCompleteButton questId={quest.id} size="sm" />
        </div>
      </div>
    </div>
  );
}
