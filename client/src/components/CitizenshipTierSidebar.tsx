/**
 * CitizenshipTierSidebar: vertical timeline of the four tier thresholds.
 *
 * Per QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 9.3.
 *
 * The four rungs are Explorer, Co-Creator, Steward, Sage. The player's
 * current position glows; the next threshold is faintly visible. Each
 * threshold has a one-line label and serves as a tap-target that
 * scrolls the page to a relevant section (Welcome Aboard for Explorer,
 * Rites for Co-Creator, etc).
 *
 * On narrow viewports (default Tailwind md breakpoint), the sidebar
 * collapses to a horizontal pill row at the top of the page; the
 * caller is responsible for choosing a layout that wraps this in the
 * appropriate container.
 */

import { Sparkles, Sprout, TreeDeciduous, Mountain } from "lucide-react";

type TierName = "explorer" | "co_creator" | "steward" | "sage";

interface TierMeta {
  name: TierName;
  label: string;
  oneLiner: string;
  scrollTargetId: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TIERS: TierMeta[] = [
  {
    name: "explorer",
    label: "Explorer",
    oneLiner: "You just got here",
    // Explorer has nothing to scroll to on /quest (Welcome Aboard
    // lives in the Profile Quests tab); empty string means scroll
    // to the top of the page instead.
    scrollTargetId: "",
    Icon: Sparkles,
  },
  {
    name: "co_creator",
    label: "Co-Creator",
    oneLiner: "Walk a path",
    scrollTargetId: "rites-of-passage",
    Icon: Sprout,
  },
  {
    name: "steward",
    label: "Steward",
    oneLiner: "Deep on a path",
    scrollTargetId: "epic-quests",
    Icon: TreeDeciduous,
  },
  {
    name: "sage",
    label: "Sage",
    oneLiner: "Top contribution",
    scrollTargetId: "epic-quests",
    Icon: Mountain,
  },
];

interface CitizenshipTierSidebarProps {
  /** Player's highest earned tier. */
  currentTier: TierName;
  className?: string;
  /** Render horizontally (true) or vertically (false). */
  horizontal?: boolean;
}

export function CitizenshipTierSidebar({
  currentTier,
  className = "",
  horizontal = false,
}: CitizenshipTierSidebarProps) {
  const currentIdx = TIERS.findIndex((t) => t.name === currentTier);
  const nextIdx = Math.min(currentIdx + 1, TIERS.length - 1);

  const scrollTo = (id: string) => {
    if (!id) {
      // Empty target id means scroll to the page top (used by Explorer
      // since Welcome Aboard isn't on /quest).
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (horizontal) {
    return (
      <div className={`flex items-center gap-2 overflow-x-auto pb-1 ${className}`}>
        {TIERS.map((tier, i) => (
          <TierPill
            key={tier.name}
            tier={tier}
            state={
              i < currentIdx
                ? "past"
                : i === currentIdx
                  ? "current"
                  : i === nextIdx
                    ? "next"
                    : "future"
            }
            onClick={() => scrollTo(tier.scrollTargetId)}
          />
        ))}
      </div>
    );
  }

  return (
    <ol className={`relative flex flex-col gap-6 ${className}`}>
      {/* Vertical thread connecting the rungs */}
      <div
        className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-[#7dd87d]/30 via-white/10 to-transparent"
        aria-hidden="true"
      />
      {TIERS.map((tier, i) => (
        <TierRung
          key={tier.name}
          tier={tier}
          state={
            i < currentIdx
              ? "past"
              : i === currentIdx
                ? "current"
                : i === nextIdx
                  ? "next"
                  : "future"
          }
          onClick={() => scrollTo(tier.scrollTargetId)}
        />
      ))}
    </ol>
  );
}

type RungState = "past" | "current" | "next" | "future";

function rungStyles(state: RungState) {
  switch (state) {
    case "past":
      return {
        dot: "bg-[#7dd87d]/70 border-[#7dd87d]/70",
        label: "text-white/60",
        oneLiner: "text-white/30",
      };
    case "current":
      return {
        dot: "bg-[#7dd87d] border-[#7dd87d] shadow-[0_0_18px_rgba(125,216,125,0.6)] animate-pulse",
        label: "text-white font-semibold",
        oneLiner: "text-[#7dd87d]/80",
      };
    case "next":
      return {
        dot: "bg-transparent border-[#7dd87d]/50",
        label: "text-white/70",
        oneLiner: "text-white/40",
      };
    case "future":
      return {
        dot: "bg-transparent border-white/15",
        label: "text-white/30",
        oneLiner: "text-white/20",
      };
  }
}

function TierRung({
  tier,
  state,
  onClick,
}: {
  tier: TierMeta;
  state: RungState;
  onClick: () => void;
}) {
  const styles = rungStyles(state);
  const Icon = tier.Icon;
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onClick}
        className="flex items-start gap-3 w-full text-left group"
      >
        <span
          className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${styles.dot}`}
          aria-hidden="true"
        >
          <Icon className="w-3 h-3 text-[#0a1f15]" />
        </span>
        <span className="flex-1 pt-0.5">
          <span className={`block text-sm leading-tight ${styles.label}`}>{tier.label}</span>
          <span className={`block text-[11px] leading-tight ${styles.oneLiner}`}>{tier.oneLiner}</span>
        </span>
      </button>
    </li>
  );
}

function TierPill({
  tier,
  state,
  onClick,
}: {
  tier: TierMeta;
  state: RungState;
  onClick: () => void;
}) {
  const Icon = tier.Icon;
  const isCurrent = state === "current";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors " +
        (isCurrent
          ? "bg-[#7dd87d]/15 border border-[#7dd87d]/50 text-white"
          : state === "past"
            ? "bg-white/[0.04] border border-[#7dd87d]/30 text-white/60"
            : state === "next"
              ? "bg-transparent border border-[#7dd87d]/25 text-white/50"
              : "bg-transparent border border-white/10 text-white/30")
      }
    >
      <Icon className="w-3 h-3" />
      <span>{tier.label}</span>
    </button>
  );
}
