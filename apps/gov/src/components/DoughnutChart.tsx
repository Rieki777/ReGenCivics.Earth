"use client";

/**
 * DoughnutChart: Kate Raworth's doughnut economics visualization adapted
 * for bioregional health. Two concentric rings (social foundation + ecological
 * ceiling) with 5 dimensions each. Red = shortfall/overshoot, green = healthy.
 *
 * Pure SVG, no external chart library.
 */

type Dimension = {
  dimension: string;
  ring: "ecological" | "social";
  value: number;
  min: number;
  max: number;
};

interface DoughnutChartProps {
  dimensions: Dimension[];
  size?: number;
}

const SOCIAL_DIMS = ["Food security", "Education", "Health", "Housing", "Community"];
const ECO_DIMS = ["Soil health", "Water quality", "Biodiversity", "Carbon", "Land use"];

function scoreColor(value: number): string {
  if (value >= 70) return "#7dd87d";
  if (value >= 40) return "#f0c040";
  return "#ef4444";
}

export function DoughnutChart({ dimensions, size = 320 }: DoughnutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.22;
  const midR = size * 0.35;
  const outerR = size * 0.46;

  const socialDims = SOCIAL_DIMS.map((name) => {
    const d = dimensions.find((x) => x.ring === "social" && x.dimension.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
    return { name, value: d?.value ?? 0 };
  });
  const ecoDims = ECO_DIMS.map((name) => {
    const d = dimensions.find((x) => x.ring === "ecological" && x.dimension.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
    return { name, value: d?.value ?? 0 };
  });

  const renderArc = (dims: typeof socialDims, rInner: number, rOuter: number, startOffset: number) => {
    const arcAngle = (2 * Math.PI) / dims.length;
    return dims.map((d, i) => {
      const a1 = startOffset + i * arcAngle;
      const a2 = a1 + arcAngle - 0.04;
      const x1i = cx + rInner * Math.cos(a1);
      const y1i = cy + rInner * Math.sin(a1);
      const x2i = cx + rInner * Math.cos(a2);
      const y2i = cy + rInner * Math.sin(a2);
      const x1o = cx + rOuter * Math.cos(a1);
      const y1o = cy + rOuter * Math.sin(a1);
      const x2o = cx + rOuter * Math.cos(a2);
      const y2o = cy + rOuter * Math.sin(a2);
      const path = [
        `M ${x1i} ${y1i}`,
        `A ${rInner} ${rInner} 0 0 1 ${x2i} ${y2i}`,
        `L ${x2o} ${y2o}`,
        `A ${rOuter} ${rOuter} 0 0 0 ${x1o} ${y1o}`,
        `Z`,
      ].join(" ");
      // Label position at the midpoint of the arc
      const midA = (a1 + a2) / 2;
      const labelR = (rInner + rOuter) / 2;
      const lx = cx + labelR * Math.cos(midA);
      const ly = cy + labelR * Math.sin(midA);
      return (
        <g key={d.name}>
          <path d={path} fill={scoreColor(d.value)} opacity={0.85} />
          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={8} fontWeight={600}>
            {d.value}
          </text>
        </g>
      );
    });
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto" aria-label="Bioregion doughnut economics chart">
      {/* Ecological ceiling (outer ring) */}
      {renderArc(ecoDims, midR + 4, outerR, -Math.PI / 2)}
      {/* Social foundation (inner ring) */}
      {renderArc(socialDims, innerR, midR - 4, -Math.PI / 2)}
      {/* Center label */}
      <circle cx={cx} cy={cy} r={innerR - 4} fill="#0d2818" />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#7dd87d" fontSize={11} fontWeight={700}>Safe &amp; Just</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize={9} opacity={0.65}>Space</text>
    </svg>
  );
}
