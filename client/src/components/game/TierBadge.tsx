/**
 * TierBadge - Organic-shaped tier indicator for both contribution and citizenship tiers.
 * Sizes: 20px (forum/community), 28px (cards), 48px (profile).
 */

// Contribution score tiers (percentile-based)
const CONTRIBUTION_TIER_VISUALS: Record<string, { emoji: string; color: string; bgColor: string }> = {
  Seedling: { emoji: "🌰", color: "#8b7355", bgColor: "#8b735520" },
  Sprout: { emoji: "🌱", color: "#7c9a7e", bgColor: "#7c9a7e20" },
  Sapling: { emoji: "🌿", color: "#5a8c5a", bgColor: "#5a8c5a20" },
  Grower: { emoji: "🌳", color: "#4a7c4a", bgColor: "#4a7c4a20" },
  Cultivator: { emoji: "🌲", color: "#3a6c3a", bgColor: "#3a6c3a20" },
  Elder: { emoji: "🌸", color: "#c4785b", bgColor: "#c4785b20" },
  Guardian: { emoji: "🍎", color: "#b85c3a", bgColor: "#b85c3a20" },
};

// Citizenship tiers (requirement-based)
const CITIZENSHIP_TIER_VISUALS: Record<string, { emoji: string; color: string; bgColor: string; label: string }> = {
  explorer: { emoji: "🧭", color: "#7c9a7e", bgColor: "#7c9a7e20", label: "Explorer" },
  co_creator: { emoji: "🔥", color: "#e8a838", bgColor: "#e8a83820", label: "Co-Creator" },
  steward: { emoji: "🏔️", color: "#6b8dd6", bgColor: "#6b8dd620", label: "Steward" },
  sage: { emoji: "✨", color: "#7dd87d", bgColor: "#7dd87d20", label: "Sage" },
};

interface Props {
  tier: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = "sm", showLabel = false, className = "" }: Props) {
  const visual = CONTRIBUTION_TIER_VISUALS[tier] ?? CONTRIBUTION_TIER_VISUALS.Seedling;
  const px = size === "lg" ? 48 : size === "md" ? 28 : 20;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={tier}
    >
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0 tier-badge-glow"
        style={{
          width: px,
          height: px,
          fontSize: px * 0.5,
          backgroundColor: visual.bgColor,
          border: `1.5px solid ${visual.color}40`,
        }}
      >
        {visual.emoji}
      </span>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: visual.color }}>
          {tier}
        </span>
      )}
    </span>
  );
}

interface CitizenshipBadgeProps {
  tier: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function CitizenshipBadge({ tier, size = "sm", showLabel = false, className = "" }: CitizenshipBadgeProps) {
  const visual = CITIZENSHIP_TIER_VISUALS[tier] ?? CITIZENSHIP_TIER_VISUALS.explorer;
  const px = size === "lg" ? 48 : size === "md" ? 28 : 20;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={visual.label}
    >
      <span
        className="inline-flex items-center justify-center rounded-full flex-shrink-0 tier-badge-glow"
        style={{
          width: px,
          height: px,
          fontSize: px * 0.5,
          backgroundColor: visual.bgColor,
          border: `2px solid ${visual.color}60`,
        }}
      >
        {visual.emoji}
      </span>
      {showLabel && (
        <span className="text-xs font-semibold" style={{ color: visual.color }}>
          {visual.label}
        </span>
      )}
    </span>
  );
}
