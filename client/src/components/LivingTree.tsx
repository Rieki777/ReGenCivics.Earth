/**
 * LivingTree — SVG visualization of a player's nine forms of capital.
 * The tree grows in 6 life stages driven by seasonsCompleted and totalScore.
 * Canopy size, flower count, fruit, and root arteries all react to capital scores.
 */

import { useMemo } from "react";

export interface CapitalScores {
  intellectual: number;
  social: number;
  material: number;
  financial: number;
  living: number;
  cultural: number;
  spiritual: number;
  experiential: number;
  healthVital: number;
}

export interface LivingTreeProps {
  capitalScores: CapitalScores;
  seasonsCompleted: number;
  totalContributionScore: number;
  currentSeasonActions?: number;
  width?: number;
  height?: number;
  /** Render the labels under each root (used inside the detail modal). */
  showRootLabels?: boolean;
}

const CAPITAL_COLORS: Record<keyof CapitalScores, string> = {
  intellectual: "#8B7AB8",
  social: "#E6B566",
  material: "#A97B5F",
  financial: "#D4AF37",
  living: "#4a7c59",
  cultural: "#C9655F",
  spiritual: "#9A8DC9",
  experiential: "#7BA89A",
  healthVital: "#D85A4A",
};

const CAPITAL_LABELS: Record<keyof CapitalScores, string> = {
  intellectual: "Intellectual",
  social: "Social",
  material: "Material",
  financial: "Financial",
  living: "Living",
  cultural: "Cultural",
  spiritual: "Spiritual",
  experiential: "Experiential",
  healthVital: "Health & Vitality",
};

function lifeStage(seasonsCompleted: number): { label: string; index: 1 | 2 | 3 | 4 | 5 | 6 } {
  if (seasonsCompleted >= 10) return { label: "Ancient Tree", index: 6 };
  if (seasonsCompleted >= 6) return { label: "Fruiting Tree", index: 5 };
  if (seasonsCompleted >= 3) return { label: "Flowering Tree", index: 4 };
  if (seasonsCompleted >= 2) return { label: "Young Tree", index: 3 };
  if (seasonsCompleted >= 1) return { label: "Sapling", index: 2 };
  return { label: "Seedling", index: 1 };
}

export function LivingTree({
  capitalScores,
  seasonsCompleted,
  totalContributionScore,
  currentSeasonActions = 0,
  width = 320,
  height = 400,
  showRootLabels = false,
}: LivingTreeProps) {
  const stage = lifeStage(seasonsCompleted);
  const scoreScale = Math.min(1, Math.max(0.2, totalContributionScore / 500));

  // Canopy radius reacts to stage + contribution.
  const canopyR = 18 + stage.index * 14 + scoreScale * 20;
  const trunkWidth = 6 + stage.index * 3 + scoreScale * 4;
  const trunkHeight = 30 + stage.index * 14;

  const centerX = width / 2;
  const groundY = height - 90; // leave room for roots
  const trunkTop = groundY - trunkHeight;
  const canopyCenterY = trunkTop - canopyR * 0.6;

  const rootKeys = Object.keys(capitalScores) as (keyof CapitalScores)[];
  const maxRoot = Math.max(1, ...rootKeys.map((k) => capitalScores[k]));

  // 9 roots fan out from (centerX, groundY). Angles spread 160° across bottom.
  const roots = rootKeys.map((key, i) => {
    const angle = Math.PI + (Math.PI * (i + 0.5)) / rootKeys.length; // 180° to 360°
    const strength = capitalScores[key] / maxRoot;
    const len = 30 + strength * 50;
    const x2 = centerX + Math.cos(angle) * len;
    const y2 = groundY + Math.abs(Math.sin(angle)) * (len * 0.6);
    return { key, angle, strength, len, x2, y2 };
  });

  // Flowers for current season actions (cap at 16).
  const flowerCount = Math.min(currentSeasonActions, 16);
  const flowers = useMemo(() => {
    const arr: { cx: number; cy: number; r: number; color: string }[] = [];
    for (let i = 0; i < flowerCount; i++) {
      const a = (Math.PI * 2 * i) / Math.max(flowerCount, 1) + (i % 2 === 0 ? 0.3 : -0.3);
      const r = canopyR * (0.55 + (i % 3) * 0.1);
      arr.push({
        cx: centerX + Math.cos(a) * r,
        cy: canopyCenterY + Math.sin(a) * r * 0.8,
        r: 2.5 + (i % 3) * 0.5,
        color: i % 4 === 0 ? "#E6B566" : i % 4 === 1 ? "#C9655F" : i % 4 === 2 ? "#9A8DC9" : "#7dd87d",
      });
    }
    return arr;
  }, [flowerCount, canopyR, canopyCenterY, centerX]);

  const dominantCapital = rootKeys.reduce((best, k) =>
    capitalScores[k] > capitalScores[best] ? k : best
  , rootKeys[0]);
  const fruitColor = CAPITAL_COLORS[dominantCapital];
  const hasFruit = stage.index >= 5;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      role="img"
      aria-label={`Your Living Tree, stage: ${stage.label}`}
    >
      <defs>
        <radialGradient id="canopyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9de89d" />
          <stop offset="65%" stopColor="#4a7c59" />
          <stop offset="100%" stopColor="#1a472a" />
        </radialGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b4a2b" />
          <stop offset="50%" stopColor="#8b6239" />
          <stop offset="100%" stopColor="#5a3f25" />
        </linearGradient>
        <radialGradient id="soilGrad" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#5a3a20" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2d1d10" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Soil patch */}
      <ellipse cx={centerX} cy={groundY} rx={80} ry={12} fill="url(#soilGrad)" />

      {/* Roots (capital arteries) */}
      {roots.map((r) => (
        <g key={r.key}>
          <line
            x1={centerX}
            y1={groundY}
            x2={r.x2}
            y2={r.y2}
            stroke={CAPITAL_COLORS[r.key]}
            strokeWidth={1 + r.strength * 2.5}
            strokeLinecap="round"
            opacity={0.55 + r.strength * 0.4}
          />
          <circle cx={r.x2} cy={r.y2} r={1.5 + r.strength * 2} fill={CAPITAL_COLORS[r.key]} />
          {showRootLabels && (
            <text
              x={r.x2}
              y={r.y2 + 12}
              fontSize={9}
              fill={CAPITAL_COLORS[r.key]}
              textAnchor="middle"
              style={{ fontFamily: "var(--font-accent, sans-serif)" }}
            >
              {CAPITAL_LABELS[r.key]}
            </text>
          )}
        </g>
      ))}

      {/* Trunk */}
      <rect
        x={centerX - trunkWidth / 2}
        y={trunkTop}
        width={trunkWidth}
        height={trunkHeight}
        fill="url(#trunkGrad)"
        rx={trunkWidth / 3}
      />

      {/* Branches for stage >= 3 */}
      {stage.index >= 3 && (
        <>
          <line x1={centerX} y1={trunkTop + 10} x2={centerX - canopyR * 0.7} y2={canopyCenterY + 4} stroke="#6b4a2b" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={centerX} y1={trunkTop + 16} x2={centerX + canopyR * 0.7} y2={canopyCenterY + 8} stroke="#6b4a2b" strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}

      {/* Canopy */}
      {stage.index >= 1 && (
        <circle
          cx={centerX}
          cy={canopyCenterY}
          r={canopyR}
          fill="url(#canopyGrad)"
          opacity={0.92}
        />
      )}
      {/* For seedling, just two leaves */}
      {stage.index === 1 && (
        <>
          <ellipse cx={centerX - 6} cy={trunkTop + 2} rx={5} ry={3} fill="#7dd87d" transform={`rotate(-30 ${centerX - 6} ${trunkTop + 2})`} />
          <ellipse cx={centerX + 6} cy={trunkTop + 2} rx={5} ry={3} fill="#7dd87d" transform={`rotate(30 ${centerX + 6} ${trunkTop + 2})`} />
        </>
      )}

      {/* Flowers */}
      {flowers.map((f, i) => (
        <circle key={i} cx={f.cx} cy={f.cy} r={f.r} fill={f.color} opacity={0.85}>
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur={`${3 + (i % 3)}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Fruit at stage 5+ */}
      {hasFruit && (
        <>
          <circle cx={centerX - canopyR * 0.3} cy={canopyCenterY + canopyR * 0.3} r={4} fill={fruitColor} />
          <circle cx={centerX + canopyR * 0.35} cy={canopyCenterY + canopyR * 0.2} r={4} fill={fruitColor} />
          <circle cx={centerX + canopyR * 0.1} cy={canopyCenterY + canopyR * 0.45} r={3.5} fill={fruitColor} />
        </>
      )}

      {/* Ancient tree details */}
      {stage.index >= 6 && (
        <>
          <circle cx={centerX - 12} cy={groundY - 4} r={3} fill="#7dd87d" opacity={0.7} />
          <circle cx={centerX + 16} cy={groundY - 2} r={2.5} fill="#4a7c59" opacity={0.8} />
        </>
      )}

      {/* Stage label */}
      <text
        x={centerX}
        y={height - 8}
        textAnchor="middle"
        fontSize={11}
        fill="#1a472a"
        opacity={0.7}
        style={{ fontFamily: "var(--font-accent, sans-serif)" }}
      >
        {stage.label}
      </text>
    </svg>
  );
}
