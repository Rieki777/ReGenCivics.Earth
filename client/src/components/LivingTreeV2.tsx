/**
 * LivingTreeV2 — hybrid AI base plate + live SVG overlay.
 *
 * Renders a bioluminescent base plate image (served via /api/img from R2)
 * and an absolutely-positioned SVG overlay that draws the 9 capital root
 * arteries, flowers, fruit, and ancient-stage mycelium from real player data.
 *
 * Falls back to the procedural LivingTree component if the base plate
 * image fails to load (e.g. plates not yet uploaded).
 */

import { useState, useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LivingTree, type CapitalScores } from "@/components/LivingTree";

// Re-export so callers can import either from this module.
export type { CapitalScores };

export interface LivingTreeV2Props {
  capitalScores: CapitalScores;
  seasonsCompleted: number;
  totalContributionScore: number;
  currentSeasonActions?: number;
  width?: number;
  height?: number;
  showRootLabels?: boolean;
  /** Override the base plate URL (for local dev before R2 upload). */
  basePlateSrc?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Plates served from /public/living-tree/ (750px WebP, ~40-100KB each).
// When plates are migrated to R2, change to:
//   const R2_BASE = "https://assets.regencivics.earth";
//   function basePlateUrl(stage, season, w) {
//     return `/api/img?url=${encodeURIComponent(`${R2_BASE}/living-tree/${stage}-${season}.png`)}&w=${w}`;
//   }
const PUBLIC_TREE_BASE = "/living-tree";

const CAPITAL_ORDER: (keyof CapitalScores)[] = [
  "intellectual",
  "social",
  "material",
  "financial",
  "living",
  "cultural",
  "spiritual",
  "experiential",
  "healthVital",
];

/** Bioluminescent jewel tones matching the base plate's painted root colors.
 *  Order matches CAPITAL_ORDER (left-to-right: violet, amber, copper, gold,
 *  leaf-green, coral, lavender, teal, rose). */
const ROOT_COLORS: Record<keyof CapitalScores, string> = {
  intellectual: "#8B5CF6",
  social:       "#F59E0B",
  material:     "#D97706",
  financial:    "#EAB308",
  living:       "#22C55E",
  cultural:     "#F97316",
  spiritual:    "#A78BFA",
  experiential: "#14B8A6",
  healthVital:  "#F43F5E",
};

const CAPITAL_LABELS: Record<keyof CapitalScores, string> = {
  intellectual: "Intellectual",
  social:       "Social",
  material:     "Material",
  financial:    "Financial",
  living:       "Living",
  cultural:     "Cultural",
  spiritual:    "Spiritual",
  experiential: "Experiential",
  healthVital:  "Health & Vitality",
};

/** Seasonal flower palette (bioluminescent hues per season). */
const SEASON_FLOWER: Record<string, readonly [string, string]> = {
  spring: ["#7DD3FC", "#F9A8D4"],
  summer: ["#FDE68A", "#FFFFFF"],
  autumn: ["#FBBF24", "#FB7185"],
  winter: ["#BAE6FD", "#E0F2FE"],
};

// ── Overlay geometry (viewBox 300 × 400) ──────────────────────────────────────
// These values must match the base plate's fixed composition:
// soil line at ~62%, trunk centred, canopy size increases by stage.

const VB_W = 300;
const VB_H = 375; // 4:5 aspect to match generated plates
const CX = 150;
const SOIL_Y = 232; // ~62% of 375

const STAGE_CANOPY: Record<string, { cy: number; r: number }> = {
  seedling:         { cy: 202, r: 18 },
  sapling:          { cy: 187, r: 32 },
  "young-tree":     { cy: 168, r: 52 },
  "flowering-tree": { cy: 147, r: 68 },
  "fruiting-tree":  { cy: 132, r: 78 },
  "ancient-tree":   { cy: 108, r: 92 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageName(s: number): string {
  if (s >= 10) return "ancient-tree";
  if (s >= 6)  return "fruiting-tree";
  if (s >= 3)  return "flowering-tree";
  if (s >= 2)  return "young-tree";
  if (s >= 1)  return "sapling";
  return "seedling";
}

function currentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

function basePlateUrl(stage: string, season: string, _w: number): string {
  return `${PUBLIC_TREE_BASE}/${stage}-${season}.webp`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Deterministic pseudo-random offset keyed on index. No Math.random(). */
function seeded(index: number, range: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * range;
}

// ── Root artery computation ───────────────────────────────────────────────────

interface RootArtery {
  key: keyof CapitalScores;
  color: string;
  x1: number; y1: number;
  x2: number; y2: number;
  cpx: number; cpy: number; // single control point for a subtle curve
  strength: number; // 0-1 normalised score
  strokeWidth: number;
  opacity: number;
}

function computeRoots(scores: CapitalScores): RootArtery[] {
  const maxScore = Math.max(1, ...CAPITAL_ORDER.map((k) => scores[k]));
  const totalFan = 140; // degrees
  const startAngle = -totalFan / 2;
  const step = totalFan / (CAPITAL_ORDER.length - 1);

  return CAPITAL_ORDER.map((key, i) => {
    const score = scores[key];
    const s = clamp(score / Math.min(maxScore, 200), 0, 1);
    // angle from vertical (downward). negative = left, positive = right
    const angleDeg = startAngle + i * step;
    const angleRad = (angleDeg * Math.PI) / 180;
    const len = 22 + s * 75; // 22px faint base, up to 97px at full strength

    const x2 = CX + Math.sin(angleRad) * len;
    const y2 = SOIL_Y + Math.cos(angleRad) * (len * 0.82);
    // Control point: slightly bowed outward for organic feel
    const cpx = CX + Math.sin(angleRad) * len * 0.55 + Math.cos(angleRad) * seeded(i, 8) - 4;
    const cpy = SOIL_Y + Math.cos(angleRad) * (len * 0.55) + 5;

    return {
      key,
      color: ROOT_COLORS[key],
      x1: CX,
      y1: SOIL_Y,
      x2,
      y2,
      cpx,
      cpy,
      strength: s,
      strokeWidth: 1.2 + s * 3.2,
      opacity: 0.22 + s * 0.78,
    };
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export function LivingTreeV2({
  capitalScores,
  seasonsCompleted,
  totalContributionScore,
  currentSeasonActions = 0,
  width = 300,
  height = 400,
  showRootLabels = false,
  basePlateSrc,
}: LivingTreeV2Props) {
  const [imgError, setImgError] = useState(false);
  const reducedMotion = useReducedMotion();

  const stage  = stageName(seasonsCompleted);
  const season = currentSeason();
  const plateUrl = basePlateSrc ?? basePlateUrl(stage, season, Math.min(width * 2, 800));

  const roots = useMemo(() => computeRoots(capitalScores), [capitalScores]);
  const canopy = STAGE_CANOPY[stage] ?? STAGE_CANOPY["seedling"];

  const maxScore = Math.max(1, ...CAPITAL_ORDER.map((k) => capitalScores[k]));
  const dominantCapital = CAPITAL_ORDER.reduce((best, k) =>
    capitalScores[k] > capitalScores[best] ? k : best
  , CAPITAL_ORDER[0]);

  const isFlowering = seasonsCompleted >= 3;
  const isFruiting  = seasonsCompleted >= 6;
  const isAncient   = seasonsCompleted >= 10;

  const flowerCount = isFlowering ? Math.min(currentSeasonActions, 24) : 0;
  const fruitCount  = isFruiting  ? Math.min(Math.floor(totalContributionScore / 200) + 2, 8) : 0;
  const seasonColors = SEASON_FLOWER[season] ?? SEASON_FLOWER.summer;

  // Fruit size driven by max individual capital score.
  const fruitR = 3 + clamp(maxScore / 80, 0, 1) * 3.5;

  // Fall back to the procedural SVG tree if the base plate can't be loaded.
  if (imgError) {
    return (
      <LivingTree
        capitalScores={capitalScores}
        seasonsCompleted={seasonsCompleted}
        totalContributionScore={totalContributionScore}
        currentSeasonActions={currentSeasonActions}
        width={width}
        height={height}
        showRootLabels={showRootLabels}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Living Tree, ${stage} stage`}
      style={{ position: "relative", width: "100%", aspectRatio: "4 / 5" }}
    >
      {/* ── Base plate ─────────────────────────────────────────────────────── */}
      <img
        src={plateUrl}
        alt=""
        aria-hidden="true"
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* ── SVG overlay ────────────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        <defs>
          {/* Per-root glow filters. Mobile Safari: cap stdDeviation at 3. */}
          {!reducedMotion && CAPITAL_ORDER.map((key) => (
            <filter key={key} id={`glow-${key}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Flower glow */}
          {!reducedMotion && (
            <filter id="glow-flower" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          {/* Mycelium glow (ancient) */}
          {!reducedMotion && isAncient && (
            <filter id="glow-mycelium" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* ── Root arteries ────────────────────────────────────────────────── */}
        {roots.map((r) => (
          <g key={r.key}>
            <path
              d={`M ${r.x1} ${r.y1} Q ${r.cpx} ${r.cpy} ${r.x2} ${r.y2}`}
              stroke={r.color}
              strokeWidth={r.strokeWidth}
              strokeLinecap="round"
              fill="none"
              opacity={r.opacity}
              filter={!reducedMotion ? `url(#glow-${r.key})` : undefined}
            />
            {/* Root tip dot */}
            {r.strength > 0.05 && (
              <circle
                cx={r.x2}
                cy={r.y2}
                r={1.2 + r.strength * 2.2}
                fill={r.color}
                opacity={r.opacity * 0.9}
              />
            )}
            {/* Root label (shown in detail modal) */}
            {showRootLabels && (
              <text
                x={r.x2}
                y={r.y2 + 13}
                textAnchor="middle"
                fontSize={8}
                fill={r.color}
                opacity={0.9}
                style={{ fontFamily: "var(--font-accent, sans-serif)" }}
              >
                {CAPITAL_LABELS[r.key]}
              </text>
            )}
          </g>
        ))}

        {/* ── Ancient stage: mycelium filaments ────────────────────────────── */}
        {isAncient && roots.map((r, i) => {
          // Extend a thin white-gold filament beyond each root tip toward edges
          const extendX = r.x2 + (r.x2 - CX) * 0.35 + seeded(i + 90, 12) - 6;
          const extendY = r.y2 + seeded(i + 99, 18) + 8;
          return (
            <path
              key={`myc-${r.key}`}
              d={`M ${r.x2} ${r.y2} Q ${(r.x2 + extendX) / 2 + seeded(i, 10) - 5} ${r.y2 + 12} ${extendX} ${extendY}`}
              stroke="#E8D4A0"
              strokeWidth={0.5}
              fill="none"
              opacity={0.18 + r.strength * 0.12}
              filter={!reducedMotion ? "url(#glow-mycelium)" : undefined}
            />
          );
        })}

        {/* ── Flowers (flowering / fruiting / ancient) ─────────────────────── */}
        {flowerCount > 0 && Array.from({ length: flowerCount }).map((_, i) => {
          const angle = (i / Math.max(flowerCount, 1)) * Math.PI * 2 + 0.4;
          const dist = 0.6 + seeded(i + 300, 0.35);
          const fx = CX + Math.cos(angle) * canopy.r * dist;
          const fy = canopy.cy + Math.sin(angle) * canopy.r * dist * 0.75;
          const color = i % 2 === 0 ? seasonColors[0] : seasonColors[1];
          const fr = 1.8 + seeded(i + 100, 1.2);
          return (
            <circle
              key={`fl-${i}`}
              cx={fx}
              cy={fy}
              r={fr}
              fill={color}
              opacity={0.75}
              filter={!reducedMotion ? "url(#glow-flower)" : undefined}
            >
              {!reducedMotion && (
                <animate
                  attributeName="opacity"
                  values="0.5;0.9;0.5"
                  dur={`${3.5 + seeded(i, 2.5)}s`}
                  begin={`${seeded(i + 50, 3)}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          );
        })}

        {/* ── Fruit (fruiting / ancient) ───────────────────────────────────── */}
        {isFruiting && fruitCount > 0 && Array.from({ length: fruitCount }).map((_, i) => {
          const angle = (i / Math.max(fruitCount, 1)) * Math.PI * 2 + 1.1;
          const dist = 0.5 + seeded(i + 200, 0.35);
          const fx = CX + Math.cos(angle) * canopy.r * dist;
          const fy = canopy.cy + canopy.r * 0.15 + Math.sin(angle) * canopy.r * dist * 0.7;
          return (
            <circle
              key={`fr-${i}`}
              cx={fx}
              cy={fy}
              r={fruitR + seeded(i + 400, 1.2) - 0.6}
              fill={ROOT_COLORS[dominantCapital]}
              opacity={0.82}
              stroke={ROOT_COLORS[dominantCapital]}
              strokeWidth={0.6}
              strokeOpacity={0.4}
            />
          );
        })}

        {/* ── Gentle root glow pulse on mount (non-reduced-motion only) ────── */}
        {!reducedMotion && (
          <ellipse
            cx={CX}
            cy={SOIL_Y + 4}
            rx={22}
            ry={5}
            fill="#ffffff"
            opacity={0}
          >
            <animate
              attributeName="opacity"
              values="0;0.06;0"
              dur="3s"
              begin="0.5s"
              repeatCount="indefinite"
            />
          </ellipse>
        )}
      </svg>
    </div>
  );
}
