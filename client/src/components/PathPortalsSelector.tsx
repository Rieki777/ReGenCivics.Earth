/**
 * PathPortalsSelector: four elemental portals at the top of /quest.
 *
 * Per QUEST_PAGE_AND_PATH_PROGRESSION_SPEC.md section 9.2:
 *   - Four portal icons in a row (fire / water / earth / air mapped
 *     to ReGen Player / Investor / Land Project / Alliance Partner).
 *   - Tap a portal to filter the quest list to that path.
 *   - Portals never lock; all four always visible.
 *   - Declared paths render as filled glyphs with aurora glow.
 *     Undeclared render as outline-only silhouettes.
 *   - First-paint shimmer borrowed from Hollow Knight's map fade-in.
 *   - Tapping an undeclared portal triggers the parent's onAddPath
 *     so the parent can open the Add a Path modal.
 */

import { useEffect, useState } from "react";

type PathSlug = "player" | "investor" | "land_project" | "ally";

interface PortalMeta {
  slug: PathSlug;
  label: string;
  element: string; // "fire" | "water" | "earth" | "air"
  /** Hue for the portal aurora ring. Hex without '#'. */
  hue: string;
}

const PORTALS: PortalMeta[] = [
  { slug: "player", label: "ReGen Player", element: "fire", hue: "f97316" },
  { slug: "investor", label: "Investor", element: "water", hue: "38bdf8" },
  { slug: "land_project", label: "Land Project", element: "earth", hue: "65a30d" },
  { slug: "ally", label: "Alliance Partner", element: "air", hue: "a78bfa" },
];

interface PathPortalsSelectorProps {
  /** Paths the player has declared. Drives filled vs outline rendering. */
  declaredPaths: PathSlug[];
  /** Currently active path filter (null = show all paths). */
  activePath: PathSlug | null;
  /** Called when a declared portal is tapped. Toggles the filter. */
  onSelectPath: (path: PathSlug | null) => void;
  /**
   * Called when an UNdeclared portal is tapped. Parent opens the
   * Add a Path modal pre-pointed at this path.
   */
  onAddPath: (path: PathSlug) => void;
  className?: string;
}

export function PathPortalsSelector({
  declaredPaths,
  activePath,
  onSelectPath,
  onAddPath,
  className = "",
}: PathPortalsSelectorProps) {
  // Shimmer-in on first mount only (Hollow Knight map vibe). Subsequent
  // re-renders skip the animation so filter changes feel snappy.
  const [shimmered, setShimmered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShimmered(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={
        `grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 ` + className
      }
      role="radiogroup"
      aria-label="Filter quests by path"
    >
      {PORTALS.map((portal, i) => {
        const declared = declaredPaths.includes(portal.slug);
        const active = activePath === portal.slug;
        return (
          <Portal
            key={portal.slug}
            portal={portal}
            declared={declared}
            active={active}
            shimmerDelay={i * 120}
            shimmered={shimmered}
            onClick={() => {
              if (declared) {
                onSelectPath(active ? null : portal.slug);
              } else {
                onAddPath(portal.slug);
              }
            }}
          />
        );
      })}
    </div>
  );
}

interface PortalProps {
  portal: PortalMeta;
  declared: boolean;
  active: boolean;
  shimmerDelay: number;
  shimmered: boolean;
  onClick: () => void;
}

function Portal({ portal, declared, active, shimmerDelay, shimmered, onClick }: PortalProps) {
  const auroraColor = `#${portal.hue}`;
  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={active}
      aria-label={
        declared
          ? `${portal.label} path${active ? " (currently filtered)" : ""}`
          : `Add ${portal.label} path`
      }
      className={
        `group relative flex flex-col items-center justify-center ` +
        `aspect-square rounded-2xl p-4 ` +
        `border transition-all duration-500 ` +
        (active
          ? "border-[#7dd87d] bg-[#1a472a]/40 shadow-[0_0_32px_rgba(125,216,125,0.25)] "
          : "border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04] ") +
        (shimmered ? "opacity-100 translate-y-0 " : "opacity-0 -translate-y-2 ")
      }
      style={{
        transitionDelay: shimmered ? "0ms" : `${shimmerDelay}ms`,
      }}
    >
      {/* Aurora ring behind the glyph; only visible when declared */}
      {declared && (
        <span
          className="absolute inset-3 rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
          style={{
            background: `radial-gradient(circle, ${auroraColor}40 0%, transparent 70%)`,
            filter: "blur(8px)",
          }}
          aria-hidden="true"
        />
      )}

      <PortalGlyph element={portal.element} declared={declared} hue={auroraColor} />
      <div
        className={
          "mt-2 text-[11px] md:text-xs font-medium tracking-wide text-center " +
          (declared ? "text-white" : "text-white/70")
        }
      >
        {portal.label}
      </div>
      {!declared && (
        <div className="text-[9px] text-white/30 mt-0.5">tap to add</div>
      )}
    </button>
  );
}

function PortalGlyph({
  element,
  declared,
  hue,
}: {
  element: string;
  declared: boolean;
  hue: string;
}) {
  const stroke = declared ? hue : "rgba(255,255,255,0.4)";
  const fill = declared ? `${hue}30` : "transparent";
  return (
    <svg viewBox="0 0 64 64" className="w-12 h-12 md:w-16 md:h-16 relative z-10" aria-hidden="true">
      {element === "fire" && (
        <path
          d="M32 8 C 28 18, 22 22, 22 32 C 22 42, 28 52, 32 56 C 36 52, 42 42, 42 32 C 42 26, 38 24, 36 18 C 35 14, 33 10, 32 8 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {element === "water" && (
        <path
          d="M32 8 C 22 22, 16 34, 16 44 C 16 53, 23 58, 32 58 C 41 58, 48 53, 48 44 C 48 34, 42 22, 32 8 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {element === "earth" && (
        <g fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round">
          <path d="M8 50 L 32 12 L 56 50 Z" />
          <path d="M18 50 L 32 28 L 46 50" fill="none" opacity="0.6" />
        </g>
      )}
      {element === "air" && (
        <g fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
          <path d="M10 22 Q 26 14, 42 22 T 56 20" />
          <path d="M10 36 Q 26 28, 42 36 T 56 34" opacity="0.75" />
          <path d="M10 50 Q 26 42, 42 50 T 56 48" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}
