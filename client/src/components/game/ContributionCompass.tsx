/**
 * ContributionCompass - 9-axis radar chart showing contribution across capital types.
 * Empty state: outline with pulse, "Your compass will fill in as you contribute."
 */
import { useMemo } from "react";

const AXES = [
  { key: "quests", label: "Quests", color: "#7C9A7E" },
  { key: "financial", label: "Financial", color: "#C4785B" },
  { key: "social", label: "Social", color: "#6BA3BE" },
  { key: "cultural", label: "Cultural", color: "#B07CB5" },
  { key: "living", label: "Living", color: "#7DD87D" },
  { key: "intellectual", label: "Intellectual", color: "#D4A574" },
  { key: "experiential", label: "Experiential", color: "#E8A87C" },
  { key: "material", label: "Material", color: "#8B7355" },
  { key: "health", label: "Health", color: "#E06C75" },
];

interface Props {
  values: Record<string, number>; // 0-100 per axis
  size?: number;
  className?: string;
}

export function ContributionCompass({ values, size = 280, className = "" }: Props) {
  const center = size / 2;
  const radius = size * 0.38;
  const isEmpty = Object.values(values).every(v => v === 0);

  const points = useMemo(() => {
    return AXES.map((axis, i) => {
      const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
      const value = (values[axis.key] ?? 0) / 100;
      return {
        ...axis,
        x: center + Math.cos(angle) * radius * value,
        y: center + Math.sin(angle) * radius * value,
        labelX: center + Math.cos(angle) * (radius + 24),
        labelY: center + Math.sin(angle) * (radius + 24),
        gridX: center + Math.cos(angle) * radius,
        gridY: center + Math.sin(angle) * radius,
      };
    });
  }, [values, center, radius]);

  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const gridPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.gridX} ${p.gridY}`).join(" ") + " Z";

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {/* Grid outline */}
        <path d={gridPath} fill="none" stroke="#4A3728" strokeWidth={1} opacity={0.2} />

        {/* Grid lines from center */}
        {points.map((p, i) => (
          <line key={i} x1={center} y1={center} x2={p.gridX} y2={p.gridY} stroke="#4A3728" strokeWidth={0.5} opacity={0.15} />
        ))}

        {/* Value polygon */}
        {!isEmpty && (
          <path d={polygonPath} fill="#7C9A7E" fillOpacity={0.2} stroke="#7C9A7E" strokeWidth={2} />
        )}

        {/* Axis dots */}
        {points.map((p, i) => (
          <circle key={i} cx={isEmpty ? p.gridX : p.x} cy={isEmpty ? p.gridY : p.y} r={3} fill={p.color}>
            {isEmpty && (
              <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />
            )}
          </circle>
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="central" fill="#4A3728" fontSize={9} fontFamily="var(--font-body)" opacity={0.6}>
            {p.label}
          </text>
        ))}
      </svg>

      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-[#4A3728]/50 text-center px-8 leading-relaxed">
            Your compass will fill in as you contribute. Start with a quest.
          </p>
        </div>
      )}
    </div>
  );
}
