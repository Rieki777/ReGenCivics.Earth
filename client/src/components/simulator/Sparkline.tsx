/**
 * Sparkline: small inline SVG line chart with optional dashed ghost line.
 *
 * Used in the Game Mechanics simulator to show the trajectory of a single
 * variable across the current session's history entries, with the previous
 * season's value (if any) drawn as a dashed reference line.
 *
 * Pure SVG, no external chart library.
 */

type Props = {
  /** The series to plot. At least 1 point. */
  values: number[];
  /** Optional baseline reference (dashed line at this y value). */
  baseline?: number;
  /** Optional ghost reference (longer-dashed line, e.g. previous season). */
  ghost?: number;
  width?: number;
  height?: number;
  className?: string;
  /** Color for the main line. Defaults to ReGen Civics green. */
  color?: string;
};

export function Sparkline({
  values,
  baseline,
  ghost,
  width = 120,
  height = 32,
  className = "",
  color = "#7dd87d",
}: Props) {
  if (values.length === 0) return null;

  // Build the y-range so all of values + baseline + ghost fit
  const all = [...values, ...(baseline != null ? [baseline] : []), ...(ghost != null ? [ghost] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const padY = 2;

  const xStep = values.length > 1 ? (width - 2) / (values.length - 1) : 0;
  const yFor = (v: number) => height - padY - ((v - min) / range) * (height - 2 * padY);

  // Use a single horizontal line for a single point
  const linePath = values.length === 1
    ? `M 1 ${yFor(values[0])} L ${width - 1} ${yFor(values[0])}`
    : values.map((v, i) => `${i === 0 ? "M" : "L"} ${1 + i * xStep} ${yFor(v)}`).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      {/* Ghost (previous season) reference line */}
      {ghost != null && (
        <line
          x1={1}
          y1={yFor(ghost)}
          x2={width - 1}
          y2={yFor(ghost)}
          stroke="#d4a574"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      {/* Baseline reference line */}
      {baseline != null && (
        <line
          x1={1}
          y1={yFor(baseline)}
          x2={width - 1}
          y2={yFor(baseline)}
          stroke="#ffffff"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.25}
        />
      )}
      {/* Main trajectory */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last-point dot */}
      {values.length > 0 && (
        <circle
          cx={values.length === 1 ? width - 1 : 1 + (values.length - 1) * xStep}
          cy={yFor(values[values.length - 1])}
          r={1.8}
          fill={color}
        />
      )}
    </svg>
  );
}
