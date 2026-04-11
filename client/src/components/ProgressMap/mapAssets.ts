// Map illustration assets with responsive variants
// sm = 640px (mobile), md = 1024px (tablet), lg = original (desktop)

interface ResponsiveAsset {
  sm: string;
  md: string;
  lg: string;
}

export const MAP_ASSETS: Record<string, ResponsiveAsset> = {
  /** New solarpunk village canvas (Sprint Fix 5, 2026-04-11) */
  village_canvas: {
    sm: "/map/village-canvas-lg.webp",
    md: "/map/village-canvas-lg.webp",
    lg: "/map/village-canvas-lg.webp",
  },
  hero: {
    sm: "/map/progress-map-full-sm.webp",
    md: "/map/progress-map-full-md.webp",
    lg: "/map/progress-map-full-lg.webp",
  },
  earth: {
    sm: "/map/zone-earth-land-sm.webp",
    md: "/map/zone-earth-land-md.webp",
    lg: "/map/zone-earth-land-lg.webp",
  },
  water: {
    sm: "/map/zone-water-ally-sm.webp",
    md: "/map/zone-water-ally-md.webp",
    lg: "/map/zone-water-ally-lg.webp",
  },
  air: {
    sm: "/map/zone-air-play-sm.webp",
    md: "/map/zone-air-play-md.webp",
    lg: "/map/zone-air-play-lg.webp",
  },
  fire: {
    sm: "/map/zone-fire-fund-sm.webp",
    md: "/map/zone-fire-fund-md.webp",
    lg: "/map/zone-fire-fund-lg.webp",
  },
  tree: {
    sm: "/map/regen-tree-center-sm.webp",
    md: "/map/regen-tree-center-md.webp",
    lg: "/map/regen-tree-center-lg.webp",
  },
  village: {
    sm: "/map/village-endgame-sm.webp",
    md: "/map/village-endgame-md.webp",
    lg: "/map/village-endgame-lg.webp",
  },
} as const;

/** Get the right image size for the current viewport */
export function getMapSrc(asset: ResponsiveAsset): string {
  if (typeof window === "undefined") return asset.lg;
  const w = window.innerWidth;
  if (w < 768) return asset.sm;
  if (w < 1280) return asset.md;
  return asset.lg;
}

/** Per-landmark illustrations, keyed by mapData node id (Fix 5). */
export function getLandmarkSrc(nodeId: string): string {
  return `/map/landmarks/${nodeId}.webp`;
}
