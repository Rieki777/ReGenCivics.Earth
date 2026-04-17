/**
 * TreeOfLifeIcon: quest icon depicting a tree of life with a winding trail.
 * Replaces WizardsFamilyIcon as the unified quest glyph.
 *
 * Inline SVG so it works with currentColor, tree-shakes if unused,
 * and has zero FOUC from external file loading.
 */

type Props = {
  className?: string;
  size?: number;
  /** Tailwind/CSS color via currentColor on the SVG fills. */
  color?: string;
};

export function TreeOfLifeIcon({ className = "", size = 20, color }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ color }}
      aria-hidden="true"
    >
      {/* Canopy - overlapping ellipses for organic tree crown */}
      <ellipse cx="12" cy="5.5" rx="4.5" ry="3.8" />
      <ellipse cx="8.8" cy="7.5" rx="3" ry="2.5" />
      <ellipse cx="15.2" cy="7.5" rx="3" ry="2.5" />
      <ellipse cx="12" cy="9" rx="3.5" ry="2.2" />

      {/* Trunk */}
      <rect x="11" y="10" width="2" height="6" rx="0.8" />

      {/* Center root */}
      <rect x="11.5" y="15.8" width="1" height="1.7" rx="0.4" />
      {/* Left root */}
      <path d="M11 15.8c-.8 1-2 1.8-3.2 2.2-.3.1-.2-.1.1-.3.9-.6 1.8-1.2 2.4-1.9" fillRule="evenodd" />
      {/* Right root */}
      <path d="M13 15.8c.8 1 2 1.8 3.2 2.2.3.1.2-.1-.1-.3-.9-.6-1.8-1.2-2.4-1.9" fillRule="evenodd" />

      {/* Winding trail/path approaching the tree.
          At sizes below 20px the curve detail is lost, so show a simple
          straight line instead. */}
      {size >= 20 ? (
        <path
          d="M12 19c-.8.5-1.5 1.2-1 1.8.4.5 1.2.3 1.8.8.5.4.2 1-.5 1.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      ) : (
        <line
          x1="12" y1="18.5" x2="12" y2="22"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
