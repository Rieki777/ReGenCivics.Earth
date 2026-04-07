/**
 * LivingTree - SVG-based tree visualization of a player's contributions
 * across 9 forms of capital. Grows through 6 life stages based on totalScore.
 *
 * Exports:
 *   LivingTree     - full-size profile visualization
 *   LivingTreeIcon - 32px simplified silhouette for forum posts and cards
 */
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CAPITAL_TYPES = [
  "financial",
  "social",
  "cultural",
  "living",
  "intellectual",
  "experiential",
  "material",
  "spiritual",
  "health",
] as const;

type CapitalType = (typeof CAPITAL_TYPES)[number];

interface LivingTreeProps {
  /** Scores for each of the 9 capital types (0+). */
  capitalValues: Record<string, number>;
  /** Number of completed seasons. Drives seasonal palette rotation. */
  seasonCount: number;
  /** Cumulative contribution score. Determines life stage. */
  totalScore: number;
  /** Pixel width/height of the SVG. Defaults to 200. */
  size?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Earthy, distinct hue per capital type. */
const CAPITAL_COLORS: Record<CapitalType, string> = {
  financial: "#c4785b",
  social: "#6ba3be",
  cultural: "#b07cb5",
  living: "#7dd87d",
  intellectual: "#d4a574",
  experiential: "#e8a87c",
  material: "#8b7355",
  spiritual: "#e8d4a0",
  health: "#e06c75",
};

type LifeStage =
  | "seedling"
  | "sprout"
  | "sapling"
  | "young"
  | "mature"
  | "ancient";

function getLifeStage(score: number): LifeStage {
  if (score >= 10000) return "ancient";
  if (score >= 4000) return "mature";
  if (score >= 1500) return "young";
  if (score >= 500) return "sapling";
  if (score >= 100) return "sprout";
  return "seedling";
}

type VisualSeason = "spring" | "summer" | "autumn" | "winter";

/** Rotate through seasons based on seasonCount so each player sees variety. */
function getSeasonPalette(seasonCount: number): VisualSeason {
  const seasons: VisualSeason[] = ["spring", "summer", "autumn", "winter"];
  return seasons[seasonCount % 4];
}

const SEASON_CANOPY: Record<VisualSeason, string> = {
  spring: "#88b87a",
  summer: "#5e9a52",
  autumn: "#c8824a",
  winter: "#9ba5a0",
};

const SEASON_FLOWER: Record<VisualSeason, string> = {
  spring: "#f0b4cc",
  summer: "#f5d76e",
  autumn: "#e0825c",
  winter: "#d0dde4",
};

const SEASON_SKY_TOP: Record<VisualSeason, string> = {
  spring: "#e8f0e8",
  summer: "#e4ede0",
  autumn: "#f0e8dd",
  winter: "#c8d6e5",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number between min and max. */
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/** Deterministic pseudo-random based on index, avoids flicker on re-render. */
function seededOffset(index: number, range: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * range;
}

/** Normalise a capital value to 0..1 range based on a soft cap. */
function normCapital(val: number, softCap = 200): number {
  return clamp(val / softCap, 0, 1);
}

// ---------------------------------------------------------------------------
// Leaf generator
// ---------------------------------------------------------------------------

interface LeafProps {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  delay?: number;
}

function Leaf({ cx, cy, r, fill, delay = 0 }: LeafProps) {
  return (
    <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.8}>
      <animate
        attributeName="r"
        values={`${r};${r * 1.08};${r}`}
        dur="4s"
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}

// ---------------------------------------------------------------------------
// Main component: LivingTree
// ---------------------------------------------------------------------------

export function LivingTree({
  capitalValues,
  seasonCount,
  totalScore,
  size = 200,
}: LivingTreeProps) {
  const stage = getLifeStage(totalScore);
  const season = getSeasonPalette(seasonCount);

  // Pre-compute derived values once.
  const derived = useMemo(() => {
    // Normalise totalScore to a 0..1 growth factor (soft-caps at 15000).
    const growthFactor = clamp(totalScore / 15000, 0, 1);

    // Trunk dimensions scale with growth.
    const trunkW = 4 + growthFactor * 18;
    const trunkH = 30 + growthFactor * 55;

    // Canopy radius.
    const canopyRx = 15 + growthFactor * 40;
    const canopyRy = 12 + growthFactor * 32;

    // How many leaves to render.
    const leafCounts: Record<LifeStage, number> = {
      seedling: 2,
      sprout: 5,
      sapling: 10,
      young: 16,
      mature: 22,
      ancient: 30,
    };
    const leafCount = leafCounts[stage];

    // Fruit count for mature / ancient stages.
    const fruitCount =
      stage === "ancient" ? 8 : stage === "mature" ? 4 : 0;

    // Flower count for young+ stages (excluding seedling/sprout/sapling).
    const flowerCount =
      stage === "ancient"
        ? 10
        : stage === "mature"
          ? 7
          : stage === "young"
            ? 4
            : 0;

    return { growthFactor, trunkW, trunkH, canopyRx, canopyRy, leafCount, fruitCount, flowerCount };
  }, [totalScore, stage]);

  const { growthFactor, trunkW, trunkH, canopyRx, canopyRy, leafCount, fruitCount, flowerCount } =
    derived;

  // Viewbox is always 200x200 for consistency, scaled via width/height.
  const vb = 200;
  const cx = vb / 2; // centre x
  const groundY = 155; // where the ground line sits
  const canopyCy = groundY - trunkH - canopyRy * 0.5;

  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Living Tree, ${stage} stage, score ${totalScore}`}
      className="tree-breathe"
      style={{ transition: "width 0.4s ease, height 0.4s ease" }}
    >
      {/* ----- Defs ----- */}
      <defs>
        <linearGradient id="lt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SEASON_SKY_TOP[season]} />
          <stop offset="100%" stopColor="#faf8f3" />
        </linearGradient>
        <linearGradient id="lt-trunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a6347" />
          <stop offset="100%" stopColor="#5c4833" />
        </linearGradient>
      </defs>

      {/* ----- Sky ----- */}
      <rect width={vb} height={vb} fill="url(#lt-sky)" rx={8} />

      {/* ----- Ground ----- */}
      <ellipse cx={cx} cy={groundY + 12} rx={80} ry={18} fill="#4a3728" opacity={0.1} />

      {/* ----- Root arteries (9 lines fanning downward) ----- */}
      {CAPITAL_TYPES.map((key, i) => {
        const raw = capitalValues[key] ?? 0;
        const norm = normCapital(raw);
        const maxDepth = 28;
        const depth = norm * maxDepth;
        // Fan from -80deg to +80deg below the ground line.
        const angleDeg = -80 + (i / (CAPITAL_TYPES.length - 1)) * 160;
        const angleRad = (angleDeg * Math.PI) / 180;
        const endX = cx + Math.sin(angleRad) * (20 + depth);
        const endY = groundY + 8 + Math.cos(angleRad) * depth * 0.4 + depth * 0.5;
        const thickness = 1 + norm * 3;
        return (
          <line
            key={key}
            x1={cx}
            y1={groundY}
            x2={endX}
            y2={endY}
            stroke={CAPITAL_COLORS[key]}
            strokeWidth={thickness}
            strokeLinecap="round"
            opacity={raw > 0 ? 0.55 : 0.08}
            style={{ transition: "all 0.6s ease" }}
          />
        );
      })}

      {/* ----- Trunk ----- */}
      {stage === "seedling" ? (
        // Tiny sprout stem.
        <g>
          <line
            x1={cx}
            y1={groundY}
            x2={cx}
            y2={groundY - 14}
            stroke="#7a6347"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Two small leaves */}
          <Leaf cx={cx - 5} cy={groundY - 12} r={3.5} fill="#88b87a" delay={0} />
          <Leaf cx={cx + 5} cy={groundY - 15} r={3} fill="#7db86f" delay={0.5} />
        </g>
      ) : (
        <g>
          {/* Main trunk */}
          <rect
            x={cx - trunkW / 2}
            y={groundY - trunkH}
            width={trunkW}
            height={trunkH}
            rx={trunkW / 3}
            fill="url(#lt-trunk)"
            style={{ transition: "all 0.6s ease" }}
          />

          {/* Seasonal rings on trunk (subtle horizontal lines) */}
          {Array.from({ length: Math.min(seasonCount, 10) }).map((_, i) => (
            <line
              key={`ring-${i}`}
              x1={cx - trunkW / 2 + 1}
              y1={groundY - trunkH * 0.3 + i * (trunkH * 0.06)}
              x2={cx + trunkW / 2 - 1}
              y2={groundY - trunkH * 0.3 + i * (trunkH * 0.06)}
              stroke="#4a3728"
              strokeWidth={0.5}
              opacity={0.2}
            />
          ))}

          {/* Ancient stage extras: moss patches on trunk */}
          {stage === "ancient" && (
            <>
              <ellipse cx={cx - trunkW / 2 + 2} cy={groundY - trunkH * 0.5} rx={3} ry={5} fill="#6b8e5a" opacity={0.35} />
              <ellipse cx={cx + trunkW / 2 - 2} cy={groundY - trunkH * 0.7} rx={2} ry={4} fill="#6b8e5a" opacity={0.3} />
            </>
          )}

          {/* ----- Canopy ----- */}
          <ellipse
            cx={cx}
            cy={canopyCy}
            rx={canopyRx}
            ry={canopyRy}
            fill={SEASON_CANOPY[season]}
            opacity={season === "winter" ? 0.35 : 0.7}
            style={{ transition: "all 0.6s ease" }}
          />

          {/* Secondary canopy cluster for young+ trees */}
          {(stage === "young" || stage === "mature" || stage === "ancient") && (
            <ellipse
              cx={cx + canopyRx * 0.3}
              cy={canopyCy - canopyRy * 0.2}
              rx={canopyRx * 0.6}
              ry={canopyRy * 0.55}
              fill={SEASON_CANOPY[season]}
              opacity={season === "winter" ? 0.25 : 0.55}
              style={{ transition: "all 0.6s ease" }}
            />
          )}

          {/* ----- Leaves scattered around canopy ----- */}
          {Array.from({ length: leafCount }).map((_, i) => {
            const angle = (i / leafCount) * Math.PI * 2;
            const rFactor = 0.5 + seededOffset(i, 0.5);
            const lx = cx + Math.cos(angle) * canopyRx * rFactor;
            const ly = canopyCy + Math.sin(angle) * canopyRy * rFactor;
            const lr = 2 + seededOffset(i + 50, 2);
            const shade = season === "autumn" ? "#c87a3e" : season === "winter" ? "#aab2ad" : "#6ba35a";
            return (
              <Leaf
                key={`leaf-${i}`}
                cx={lx}
                cy={ly}
                r={lr}
                fill={shade}
                delay={seededOffset(i + 10, 2)}
              />
            );
          })}

          {/* ----- Flowers (young, mature, ancient) ----- */}
          {flowerCount > 0 &&
            Array.from({ length: flowerCount }).map((_, i) => {
              const angle = (i / flowerCount) * Math.PI * 2 + 0.3;
              const dist = 0.55 + seededOffset(i + 200, 0.35);
              const fx = cx + Math.cos(angle) * canopyRx * dist;
              const fy = canopyCy + Math.sin(angle) * canopyRy * dist;
              return (
                <circle
                  key={`flower-${i}`}
                  cx={fx}
                  cy={fy}
                  r={2.5}
                  fill={SEASON_FLOWER[season]}
                  opacity={0.85}
                >
                  <animate
                    attributeName="opacity"
                    values="0.85;0.55;0.85"
                    dur="5s"
                    begin={`${seededOffset(i + 70, 3)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              );
            })}

          {/* ----- Fruits (mature, ancient) ----- */}
          {fruitCount > 0 &&
            Array.from({ length: fruitCount }).map((_, i) => {
              const angle = (i / fruitCount) * Math.PI * 2 + 1.0;
              const dist = 0.65 + seededOffset(i + 300, 0.3);
              const fx = cx + Math.cos(angle) * canopyRx * dist;
              const fy = canopyCy + Math.sin(angle) * canopyRy * dist + 2;
              return (
                <circle
                  key={`fruit-${i}`}
                  cx={fx}
                  cy={fy}
                  r={3}
                  fill="#c4785b"
                  stroke="#a5603f"
                  strokeWidth={0.5}
                  opacity={0.9}
                />
              );
            })}

          {/* Ancient: small bird silhouette */}
          {stage === "ancient" && (
            <path
              d={`M${cx + canopyRx * 0.6} ${canopyCy - canopyRy * 0.7}
                  q3 -4 6 0 q3 4 6 0`}
              stroke="#4a3728"
              strokeWidth={1}
              fill="none"
              opacity={0.3}
            />
          )}
        </g>
      )}

      {/* ----- Stage label ----- */}
      <text
        x={cx}
        y={vb - 6}
        textAnchor="middle"
        fill="#4a3728"
        fontSize={7}
        opacity={0.4}
        fontFamily="sans-serif"
      >
        {stage === "seedling" && "Seedling"}
        {stage === "sprout" && "Sprout"}
        {stage === "sapling" && "Sapling"}
        {stage === "young" && "Young Tree"}
        {stage === "mature" && "Mature Tree"}
        {stage === "ancient" && "Ancient Tree"}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// LivingTreeIcon: 32px mini version (simplified silhouette)
// ---------------------------------------------------------------------------

export function LivingTreeIcon({
  capitalValues,
  totalScore,
  seasonCount,
}: Pick<LivingTreeProps, "capitalValues" | "totalScore" | "seasonCount">) {
  const stage = getLifeStage(totalScore);
  const season = getSeasonPalette(seasonCount);
  const growth = clamp(totalScore / 15000, 0, 1);

  // Dominant capital determines accent colour on the icon.
  const dominantCapital = useMemo(() => {
    let best: CapitalType = "social";
    let bestVal = 0;
    for (const key of CAPITAL_TYPES) {
      const v = capitalValues[key] ?? 0;
      if (v > bestVal) {
        bestVal = v;
        best = key;
      }
    }
    return best;
  }, [capitalValues]);

  const trunkW = 2 + growth * 3;
  const canopyR = 5 + growth * 7;
  const canopyColor = SEASON_CANOPY[season];
  const accentColor = CAPITAL_COLORS[dominantCapital];

  return (
    <svg
      viewBox="0 0 32 32"
      width={32}
      height={32}
      role="img"
      aria-label={`Living Tree icon, ${stage}`}
    >
      {/* Ground shadow */}
      <ellipse cx={16} cy={26} rx={10} ry={3} fill="#4a3728" opacity={0.1} />

      {stage === "seedling" ? (
        <g>
          <line x1={16} y1={24} x2={16} y2={19} stroke="#7a6347" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={14.5} cy={18.5} r={2.2} fill="#88b87a" opacity={0.8} />
          <circle cx={17.5} cy={17} r={2} fill="#7db86f" opacity={0.8} />
        </g>
      ) : (
        <g>
          {/* Trunk */}
          <rect
            x={16 - trunkW / 2}
            y={24 - (8 + growth * 6)}
            width={trunkW}
            height={8 + growth * 6}
            rx={trunkW / 3}
            fill="#7a6347"
          />
          {/* Canopy */}
          <circle
            cx={16}
            cy={24 - (8 + growth * 6) - canopyR * 0.4}
            r={canopyR}
            fill={canopyColor}
            opacity={season === "winter" ? 0.4 : 0.7}
          />
          {/* Accent dot for dominant capital */}
          {(stage === "mature" || stage === "ancient") && (
            <circle
              cx={16 + canopyR * 0.35}
              cy={24 - (8 + growth * 6) - canopyR * 0.3}
              r={1.5}
              fill={accentColor}
              opacity={0.8}
            />
          )}
        </g>
      )}
    </svg>
  );
}
