/**
 * TierBadge - Organic-shaped tier indicator for both contribution and citizenship tiers.
 * Sizes: 20px (forum/community), 28px (cards), 48px (profile).
 */

// Contribution score tiers (percentile-based)
const CONTRIBUTION_TIER_VISUALS: Record<string, { emoji: string; color: string; bgColor: string }> = {
  Seedling: { emoji: "🌰", color: "#8B7355", bgColor: "#8B735520" },
  Sprout: { emoji: "🌱", color: "#7C9A7E", bgColor: "#7C9A7E20" },
  Sapling: { emoji: "🌿", color: "#5A8C5A", bgColor: "#5A8C5A20" },
  Grower: { emoji: "🌳", color: "#4A7C4A", bgColor: "#4A7C4A20" },
  Cultivator: { emoji: "🌲", color: "#3A6C3A", bgColor: "#3A6C3A20" },
  Elder: { emoji: "🌸", color: "#C4785B", bgColor: "#C4785B20" },
  Guardian: { emoji: "🍎", color: "#B85C3A", bgColor: "#B85C3A20" },
};

// Citizenship tiers (requirement-based)
const CITIZENSHIP_TIER_VISUALS: Record<string, { emoji: string; color: string; bgColor: string; label: string }> = {
  explorer: { emoji: "🧭", color: "#7C9A7E", bgColor: "#7C9A7E20", label: "Explorer" },
  co_creator: { emoji: "🔥", color: "#E8A838", bgColor: "#E8A83820", label: "Co-Creator" },
  steward: { emoji: "🏔️", color: "#6B8DD6", bgColor: "#6B8DD620", label: "Steward" },
  sage: { emoji: "✨", color: "#C084FC", bgColor: "#C084FC20", label: "Sage" },
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
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
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
        className="inline-flex items-center justify-center rounded-full flex-shrink-0"
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
