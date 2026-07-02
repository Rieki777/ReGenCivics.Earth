/**
 * CORE illustration registry. The single client-side source of truth for every
 * image slot: id, alt text, aspect ratio, and the responsive widths to request.
 * Prompts + generation live in scripts/generate-core-assets.ts; the human source
 * of truth for prompts is client/src/pages/core/ASSET_PROMPTS.md.
 *
 * Images are served through the existing /api/img proxy (which returns WebP) from
 * R2 at assets.regencivics.earth/core/<id>-<width>.webp, with a tiny blurred
 * LQIP data URI held in asset-manifest.json. Until an asset is generated,
 * processed, and marked ready in the manifest, CoreImage renders its fallback,
 * so the site is whole before and after generation.
 */
export type CoreAssetId =
  | "home-hero"
  | "faith-seed"
  | "program-gathering"
  | "program-meal"
  | "program-healing"
  | "program-planting"
  | "program-ceremony"
  | "program-song"
  | "elders-anastasia"
  | "donate-seed-to-tree"
  | "transparency-open-hand"
  | "core-emblem"
  | "not-found-404";

export type CoreAsset = {
  id: CoreAssetId;
  alt: string;
  /** [w, h] used only for the CSS aspect-ratio box. */
  aspect: [number, number];
  /** Widths (px) to emit + request via srcset, largest first. */
  widths: number[];
};

export const R2_CORE_BASE = "https://assets.regencivics.earth/core";

export const CORE_ASSETS: Record<CoreAssetId, CoreAsset> = {
  "home-hero": { id: "home-hero", alt: "A community tending a food forest at dawn, sunlight through the trees.", aspect: [16, 9], widths: [2400, 1600, 1000, 640] },
  "faith-seed": { id: "faith-seed", alt: "Two hands lowering a single seed into dark, living soil.", aspect: [4, 3], widths: [1600, 1000, 640] },
  "program-gathering": { id: "program-gathering", alt: "People gathered in a warm circle of light around a glowing seedling.", aspect: [1, 1], widths: [800, 480] },
  "program-meal": { id: "program-meal", alt: "Hands sharing bowls of food across a long outdoor table.", aspect: [1, 1], widths: [800, 480] },
  "program-healing": { id: "program-healing", alt: "People sitting in a gentle circle, one hand resting on another.", aspect: [1, 1], widths: [800, 480] },
  "program-planting": { id: "program-planting", alt: "Hands pressing a young sapling into rich earth.", aspect: [1, 1], widths: [800, 480] },
  "program-ceremony": { id: "program-ceremony", alt: "People around a small fire under a starlit sky in a forest clearing.", aspect: [1, 1], widths: [800, 480] },
  "program-song": { id: "program-song", alt: "People singing together with open, joyful faces.", aspect: [1, 1], widths: [800, 480] },
  "elders-anastasia": { id: "elders-anastasia", alt: "A symbolic figure standing in a sunlit cedar forest, seen softly from behind.", aspect: [3, 4], widths: [900, 600] },
  "donate-seed-to-tree": { id: "donate-seed-to-tree", alt: "A seed passing between two hands and growing into a great tree of light.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "transparency-open-hand": { id: "transparency-open-hand", alt: "An open hand holding a small glowing ledger of light.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "core-emblem": { id: "core-emblem", alt: "The CORE emblem, a sprouting seed inside a circle.", aspect: [1, 1], widths: [256, 128, 64] },
  "not-found-404": { id: "not-found-404", alt: "A small glowing seedling on a forked forest path at dusk.", aspect: [4, 3], widths: [1000, 640] },
};

/** Build a /api/img URL (returns WebP) for an asset at a given width. */
export function coreImgUrl(id: CoreAssetId, width: number): string {
  const src = `${R2_CORE_BASE}/${id}-${width}.webp`;
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}`;
}

export function coreSrcSet(asset: CoreAsset): string {
  return asset.widths.map((w) => `${coreImgUrl(asset.id, w)} ${w}w`).join(", ");
}
