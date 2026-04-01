/**
 * ContributionCompass - 9-axis radar chart showing a player's contribution
 * distribution across 9 forms of capital. Renders as inline SVG with a
 * dark-theme design (transparent background, white/green text).
 */
import { useMemo } from "react";

const CAPITAL_TYPES = [
  { key: "financial", label: "Financial", emoji: "\u{1F4B0}" },
  { key: "social", label: "Social", emoji: "\u{1F91D}" },
  { key: "cultural", label: "Cultural", emoji: "\u{1F3AD}" },
  { key: "living", label: "Living", emoji: "\u{1F331}" },
  { key: "intellectual", label: "Intellectual", emoji: "\u{1F4DA}" },
  { key: "experiential", label: "Experiential", emoji: "\u26A1" },
  { key: "material", label: "Material", emoji: "\u{1F528}" },
  { key: "spiritual", label: "Spiritual", emoji: "\u{1F56F}\uFE0F" },
  { key: "health", label: "Health", emoji: "\u2764\uFE0F" },
] as const;

const AXIS_COUNT = CAPITAL_TYPES.length;
const RING_LEVELS = [0.25, 0.5, 0.75, 1.0];

interface Props {
  values: Record<string, number>; // 9 capital types, each 0-100
  size?: number;
  className?: string;
}

/** Return the angle in radians for axis index i (starting at top, going clockwise). */
function axisAngle(i: number): number {
  return (Math.PI * 2 * i) / AXIS_COUNT - Math.PI / 2;
}

export function ContributionCompass({
  values,
  size = 280,
  className = "",
}: Props) {
  const center = size / 2;
  const radius = size * 0.34; // leave room for labels + emoji
  const labelOffset = radius + 28;
  const emojiOffset = radius + 14;

  // Pre-compute axis endpoint coordinates for each ring level
  const axisEndpoints = useMemo(() => {
    return CAPITAL_TYPES.map((_, i) => {
      const angle = axisAngle(i);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return { cos, sin };
    });
  }, []);

  // Build the player's value polygon
  const polygonPoints = useMemo(() => {
    return CAPITAL_TYPES.map((cap, i) => {
      const pct = Math.max(0, Math.min(100, values[cap.key] ?? 0)) / 100;
      const { cos, sin } = axisEndpoints[i];
      return {
        x: center + cos * radius * pct,
        y: center + sin * radius * pct,
      };
    });
  }, [values, center, radius, axisEndpoints]);

  const polygonPath =
    polygonPoints
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ") + " Z";

  // Concentric ring paths (polygons, not circles, matching the 9-sided shape)
  const ringPaths = useMemo(() => {
    return RING_LEVELS.map((level) => {
      const pts = axisEndpoints.map(({ cos, sin }) => ({
        x: center + cos * radius * level,
        y: center + sin * radius * level,
      }));
      return (
        pts
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
          .join(" ") + " Z"
      );
    });
  }, [center, radius, axisEndpoints]);

  // Determine strongest and weakest capital types
  const { strongest, weakest } = useMemo(() => {
    let maxVal = -1;
    let minVal = 101;
    let maxLabel: string = CAPITAL_TYPES[0].label;
    let minLabel: string = CAPITAL_TYPES[0].label;

    for (const cap of CAPITAL_TYPES) {
      const v = values[cap.key] ?? 0;
      if (v > maxVal) {
        maxVal = v;
        maxLabel = cap.label;
      }
      if (v < minVal) {
        minVal = v;
        minLabel = cap.label;
      }
    }

    return { strongest: maxLabel, weakest: minLabel };
  }, [values]);

  const isEmpty = CAPITAL_TYPES.every((cap) => (values[cap.key] ?? 0) === 0);

  // Total height includes the chart plus the two text labels below
  const textAreaHeight = 44;

  return (
    <div className={className} style={{ width: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ display: "block" }}
      >
        {/* Concentric ring guides */}
        {ringPaths.map((d, i) => (
          <path
            key={`ring-${i}`}
            d={d}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines from center to outer edge */}
        {axisEndpoints.map(({ cos, sin }, i) => (
          <line
            key={`axis-${i}`}
            x1={center}
            y1={center}
            x2={center + cos * radius}
            y2={center + sin * radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.75}
          />
        ))}

        {/* Player value polygon */}
        {!isEmpty && (
          <path
            d={polygonPath}
            fill="#7dd87d"
            fillOpacity={0.3}
            stroke="#7dd87d"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Emoji icons along each axis */}
        {CAPITAL_TYPES.map((cap, i) => {
          const { cos, sin } = axisEndpoints[i];
          const ex = center + cos * emojiOffset;
          const ey = center + sin * emojiOffset;
          return (
            <text
              key={`emoji-${cap.key}`}
              x={ex}
              y={ey}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
            >
              {cap.emoji}
            </text>
          );
        })}

        {/* Axis labels (capital type names) */}
        {CAPITAL_TYPES.map((cap, i) => {
          const { cos, sin } = axisEndpoints[i];
          const lx = center + cos * labelOffset;
          const ly = center + sin * labelOffset;
          return (
            <text
              key={`label-${cap.key}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.6)"
              fontSize={9}
              fontFamily="sans-serif"
            >
              {cap.label}
            </text>
          );
        })}
      </svg>

      {/* Summary text below the chart */}
      {!isEmpty && (
        <div
          style={{
            height: textAreaHeight,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            paddingTop: 4,
          }}
        >
          <span
            style={{
              color: "#7dd87d",
              fontSize: 13,
              fontFamily: "sans-serif",
            }}
          >
            Strongest: {strongest}
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              fontFamily: "sans-serif",
            }}
          >
            Room to grow: {weakest}
          </span>
        </div>
      )}
    </div>
  );
}
