/**
 * TierBadge - Organic-shaped tier indicator.
 * Sizes: 20px (forum/community), 48px (profile).
 */

const TIER_VISUALS: Record<string, { emoji: string; color: string; bgColor: string }> = {
  Seedling: { emoji: "🌰", color: "#8B7355", bgColor: "#8B735520" },
  Sprout: { emoji: "🌱", color: "#7C9A7E", bgColor: "#7C9A7E20" },
  Sapling: { emoji: "🌿", color: "#5A8C5A", bgColor: "#5A8C5A20" },
  Grower: { emoji: "🌳", color: "#4A7C4A", bgColor: "#4A7C4A20" },
  Cultivator: { emoji: "🌲", color: "#3A6C3A", bgColor: "#3A6C3A20" },
  Elder: { emoji: "🌸", color: "#C4785B", bgColor: "#C4785B20" },
  Guardian: { emoji: "🍎", color: "#B85C3A", bgColor: "#B85C3A20" },
};

interface Props {
  tier: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = "sm", showLabel = false, className = "" }: Props) {
  const visual = TIER_VISUALS[tier] ?? TIER_VISUALS.Seedling;
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
