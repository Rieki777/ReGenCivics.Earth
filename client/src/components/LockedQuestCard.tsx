/**
 * LockedQuestCard: a quest the player can see exists but hasn't unlocked yet.
 *
 * Per QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 9.8, locked
 * quests render as moss-overgrown stone ruins with a single faint
 * elemental glyph (fire / water / earth / air) instead of a corporate
 * lock icon. The aesthetic says "the path continues into the forest,
 * you just haven't walked there yet."
 *
 * Hover reveals a one-line tooltip with the unlock chain. Not
 * interactive (no onclick); the affordance is the ruin itself.
 *
 * Backward compatibility: the previous prop API (title, subtitle,
 * className, children) is preserved so existing call-sites keep
 * working without edits.
 */

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Glyph = "fire" | "water" | "earth" | "air";

interface LockedQuestCardProps {
  title: string;
  subtitle?: string;
  /**
   * Element glyph hinting at the quest's nature. Picked by the parent
   * from the quest's pool / metadata. Defaults to earth (most common
   * solarpunk element) when nothing better is known.
   */
  glyph?: Glyph;
  /**
   * Single-line unlock hint shown on hover. Examples:
   *   "Complete Fire to unlock"
   *   "Reveals after Rites of Passage"
   *   "Unlocks when one of your current quests is complete"
   */
  unlockHint?: string;
  className?: string;
  children?: React.ReactNode;
}

const GLYPH_PATHS: Record<Glyph, ReactElement> = {
  fire: (
    <path
      d="M32 12 C 28 22, 22 26, 22 36 C 22 44, 28 50, 32 50 C 36 50, 42 44, 42 36 C 42 30, 38 28, 36 22 C 35 18, 33 14, 32 12 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  water: (
    <path
      d="M32 14 C 24 24, 20 32, 20 40 C 20 47, 25 52, 32 52 C 39 52, 44 47, 44 40 C 44 32, 40 24, 32 14 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  earth: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M16 44 L 32 18 L 48 44 Z" />
      <path d="M22 44 L 32 28 L 42 44" opacity="0.5" />
    </g>
  ),
  air: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14 24 Q 26 18, 38 24 T 50 22" />
      <path d="M14 34 Q 26 28, 38 34 T 50 32" opacity="0.7" />
      <path d="M14 44 Q 26 38, 38 44 T 50 42" opacity="0.45" />
    </g>
  ),
};

function RuinSilhouette({ glyph }: { glyph: Glyph }) {
  return (
    <svg viewBox="0 0 64 80" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="lqc-moss-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(125, 216, 125, 0.0)" />
          <stop offset="60%" stopColor="rgba(125, 216, 125, 0.18)" />
          <stop offset="100%" stopColor="rgba(125, 216, 125, 0.45)" />
        </linearGradient>
        <filter id="lqc-glyph-glow">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Two pillars + half-collapsed crown + scattered rubble */}
      <g fill="rgba(15, 25, 18, 0.65)" stroke="rgba(60, 80, 65, 0.35)" strokeWidth="0.8">
        <path d="M14 78 L 14 30 Q 14 22, 22 22 L 24 22 L 24 78 Z" />
        <path d="M40 78 L 40 22 L 42 22 Q 50 22, 50 30 L 50 78 Z" />
        <path d="M22 22 L 22 14 L 36 14 L 38 18 L 44 18 L 42 22 Z" />
        <path d="M8 78 L 12 70 L 18 74 L 22 70 L 26 76 L 30 72 L 34 78 Z" opacity="0.7" />
        <path d="M34 78 L 38 72 L 42 76 L 48 70 L 54 78 Z" opacity="0.7" />
      </g>

      {/* Moss creeping up from base */}
      <path d="M0 80 L 0 56 Q 16 50, 32 56 T 64 52 L 64 80 Z" fill="url(#lqc-moss-gradient)" />
      <circle cx="18" cy="48" r="3" fill="rgba(125, 216, 125, 0.25)" />
      <circle cx="46" cy="42" r="2.5" fill="rgba(125, 216, 125, 0.2)" />

      {/* Bioluminescent glyph centered in the arch */}
      <g transform="translate(0, 4)" color="rgba(180, 240, 200, 0.7)" filter="url(#lqc-glyph-glow)">
        {GLYPH_PATHS[glyph]}
      </g>
    </svg>
  );
}

export function LockedQuestCard({
  title,
  subtitle,
  glyph = "earth",
  unlockHint,
  className = "",
  children,
}: LockedQuestCardProps) {
  const card = (
    <div
      className={
        `relative overflow-hidden rounded-2xl border border-[#7dd87d]/25 ` +
        `bg-gradient-to-b from-[#1b3324] to-[#0f2117] ` +
        `ring-1 ring-inset ring-white/5 ` +
        `aspect-[3/4] cursor-default select-none ` +
        `shadow-[0_0_20px_rgba(0,0,0,0.35)] ` +
        `transition-all duration-500 hover:border-[#7dd87d]/45 ` +
        `hover:shadow-[0_0_24px_rgba(125,216,125,0.12)] ` +
        className
      }
      aria-disabled="true"
      role="img"
      aria-label={`Locked quest: ${title}. ${unlockHint ?? "Reveals as you progress."}`}
    >
      <div className="absolute inset-0">
        <RuinSilhouette glyph={glyph} />
      </div>

      {/* Title sits below the moss line, faint and serene */}
      <div className="absolute bottom-3 left-3 right-3 text-center">
        <h3
          className="text-[#7dd87d]/75 text-xs font-medium tracking-wide line-clamp-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/20 text-[10px] mt-0.5 line-clamp-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );

  if (!unlockHint) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {unlockHint}
        </TooltipContent>
    </Tooltip>
  );
}
