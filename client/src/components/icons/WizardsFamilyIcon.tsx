/**
 * WizardsFamilyIcon: unified Quests glyph used everywhere Quests appears.
 * Loads the public SVG so Rye can swap the file without code changes.
 *
 * Replace `client/public/images/icons/wizards-family.svg` with the final
 * art and this component will pick it up automatically.
 */

type Props = {
  className?: string;
  size?: number;
  /** Tailwind/CSS color via currentColor on the SVG fills. */
  color?: string;
};

export function WizardsFamilyIcon({ className = "", size = 20, color }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        color,
        WebkitMaskImage: `url(/images/icons/wizards-family.svg)`,
        maskImage: `url(/images/icons/wizards-family.svg)`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        backgroundColor: "currentColor",
      }}
      aria-hidden="true"
    />
  );
}
