/**
 * LivingTree - SVG visualization of player's contribution journey.
 * 6 life stages based on seasonsCompleted. 9 root arteries for capital types.
 * Trunk width from percentile. Seasonal visual cycle.
 */
import { useMemo } from "react";

interface LivingTreeProps {
  seasonsCompleted: number;
  contributionScore: number; // percentile 0-99
  capitalScores: Record<string, number>; // 9 capital types, raw scores
  currentSeasonActions: number;
  size?: "large" | "small";
  className?: string;
}

const CAPITAL_COLORS: Record<string, string> = {
  intellectual: "#D4A574",
  social: "#6BA3BE",
  material: "#8B7355",
  financial: "#C4785B",
  living: "#7DD87D",
  cultural: "#B07CB5",
  spiritual: "#E8D4A0",
  experiential: "#E8A87C",
  health: "#E06C75",
};

function getLifeStage(seasons: number): string {
  if (seasons >= 10) return "ancient";
  if (seasons >= 6) return "fruiting";
  if (seasons >= 3) return "flowering";
  if (seasons >= 2) return "young";
  if (seasons >= 1) return "sapling";
  return "seedling";
}

function getCurrentVisualSeason(): "spring" | "summer" | "autumn" | "winter" {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

export function LivingTree({
  seasonsCompleted,
  contributionScore,
  capitalScores,
  currentSeasonActions,
  size = "large",
  className = "",
}: LivingTreeProps) {
  const stage = getLifeStage(seasonsCompleted);
  const visualSeason = getCurrentVisualSeason();
  const isLarge = size === "large";
  const viewSize = isLarge ? 400 : 32;

  const trunkWidth = useMemo(() => {
    const base = isLarge ? 8 : 2;
    const growth = (contributionScore / 100) * (isLarge ? 20 : 4);
    return base + growth;
  }, [contributionScore, isLarge]);

  // Small icon version (32px)
  if (!isLarge) {
    const seedColor = stage === "seedling" ? "#8B7355" : "#7C9A7E";
    return (
      <svg viewBox="0 0 32 32" width={32} height={32} className={className}>
        <circle cx={16} cy={24} r={8} fill="#4A3728" opacity={0.15} />
        {stage === "seedling" ? (
          <ellipse cx={16} cy={18} rx={3} ry={4} fill={seedColor}>
            <animate attributeName="ry" values="4;4.2;4" dur="3s" repeatCount="indefinite" />
          </ellipse>
        ) : (
          <>
            <rect x={16 - trunkWidth / 2} y={8} width={trunkWidth} height={16} rx={1} fill="#8B7355" />
            <ellipse cx={16} cy={8} rx={10} ry={8} fill="#7C9A7E" opacity={0.8} />
          </>
        )}
      </svg>
    );
  }

  // Large version
  const cx = 200;
  const groundY = 320;

  return (
    <svg viewBox="0 0 400 400" className={`w-full max-w-md ${className}`} role="img" aria-label="Your Living Tree">
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={visualSeason === "winter" ? "#C8D6E5" : "#E8F0E8"} />
          <stop offset="100%" stopColor="#FAF8F3" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#sky)" rx={16} />

      {/* Ground */}
      <ellipse cx={cx} cy={groundY + 20} rx={160} ry={30} fill="#4A3728" opacity={0.12} />

      {stage === "seedling" ? (
        /* Seedling: tiny seed in bare soil */
        <g>
          <ellipse cx={cx} cy={groundY - 5} rx={12} ry={15} fill="#8B7355">
            <animate attributeName="ry" values="15;15.5;15" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <text x={cx} y={groundY + 60} textAnchor="middle" fill="#4A3728" fontSize={11} opacity={0.5} fontFamily="var(--font-body)">
            Every tree starts somewhere
          </text>
        </g>
      ) : (
        <g>
          {/* Root arteries */}
          {Object.entries(CAPITAL_COLORS).map(([key, color], i) => {
            const score = capitalScores[key] ?? 0;
            const maxDepth = 60;
            const depth = Math.min(score / 100, 1) * maxDepth;
            const angle = ((i / 9) * Math.PI) - Math.PI / 2;
            const rootX = cx + Math.cos(angle) * 40;
            const rootEndX = cx + Math.cos(angle) * (40 + depth);
            const rootEndY = groundY + 10 + Math.sin(Math.abs(angle)) * depth * 0.5 + depth * 0.3;
            return (
              <line
                key={key}
                x1={cx}
                y1={groundY}
                x2={rootEndX}
                y2={rootEndY}
                stroke={color}
                strokeWidth={Math.max(1, score / 30)}
                opacity={score > 0 ? 0.6 : 0.1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Trunk */}
          <rect
            x={cx - trunkWidth / 2}
            y={groundY - 120}
            width={trunkWidth}
            height={120}
            rx={trunkWidth / 4}
            fill="#8B7355"
          />

          {/* Seasonal rings */}
          {Array.from({ length: Math.min(seasonsCompleted, 8) }).map((_, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={groundY - 60 + i * 12}
              rx={trunkWidth / 2 - 1}
              ry={1}
              fill="#4A3728"
              opacity={0.2}
            />
          ))}

          {/* Canopy */}
          <ellipse
            cx={cx}
            cy={groundY - 140}
            rx={40 + contributionScore * 0.5}
            ry={35 + contributionScore * 0.3}
            fill={visualSeason === "autumn" ? "#C4785B" : visualSeason === "winter" ? "#9BA5A0" : "#7C9A7E"}
            opacity={visualSeason === "winter" ? 0.4 : 0.75}
          />

          {/* Flowers (current season actions) */}
          {stage !== "sapling" && Array.from({ length: Math.min(currentSeasonActions, 12) }).map((_, i) => {
            const fAngle = (i / 12) * Math.PI * 2;
            const fR = 25 + Math.random() * 20;
            return (
              <circle
                key={i}
                cx={cx + Math.cos(fAngle) * fR}
                cy={groundY - 140 + Math.sin(fAngle) * fR * 0.6}
                r={3}
                fill={visualSeason === "spring" ? "#F0B4CC" : visualSeason === "autumn" ? "#E8A87C" : "#FFE4B5"}
                opacity={0.8}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}
