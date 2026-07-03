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
import manifest from "./asset-manifest.json";

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
  | "elders-yeshua"
  | "donate-seed-to-tree"
  | "transparency-open-hand"
  | "core-emblem"
  | "not-found-404"
  | "home-village-abundance"
  | "home-temple-grove"
  | "home-night-ceremony"
  | "faith-cathedral-canopy"
  | "faith-root-communion"
  | "faith-animals-abundance"
  | "programs-hero"
  | "program-stewardship"
  | "elders-hero"
  | "elders-future-lantern"
  | "get-involved-hero"
  | "get-involved-community-life"
  | "get-involved-sanctuary"
  | "get-involved-path"
  | "donate-temple-offering"
  | "transparency-roots-of-trust"
  | "elder-chat-threshold"
  | "thank-you-blossom"
  | "reconciliation-ledger-grove"
  | "footer-canopy-band";

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
  "elders-yeshua": { id: "elders-yeshua", alt: "A symbolic figure walking a sunlit path through a green garden at dawn, seen softly.", aspect: [3, 4], widths: [900, 600] },
  "donate-seed-to-tree": { id: "donate-seed-to-tree", alt: "A seed passing between two hands and growing into a great tree of light.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "transparency-open-hand": { id: "transparency-open-hand", alt: "An open hand holding a small glowing ledger of light.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "core-emblem": { id: "core-emblem", alt: "The CORE emblem, a sprouting seed inside a circle.", aspect: [1, 1], widths: [256, 128, 64] },
  "not-found-404": { id: "not-found-404", alt: "A small glowing seedling on a forked forest path at dusk.", aspect: [4, 3], widths: [1000, 640] },

  "home-village-abundance": { id: "home-village-abundance", alt: "A thriving village of living-roofed homes among terraced food-forest gardens.", aspect: [16, 9], widths: [2000, 1200, 720] },
  "home-temple-grove": { id: "home-temple-grove", alt: "An ancient grove of trees whose canopy arches overhead like a cathedral ceiling.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "home-night-ceremony": { id: "home-night-ceremony", alt: "Living-roof dwellings glowing at night under a starlit sky, people gathered by fires.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "faith-cathedral-canopy": { id: "faith-cathedral-canopy", alt: "Looking up through a soaring canopy of cathedral trees with light falling like stained glass.", aspect: [16, 9], widths: [2400, 1600, 1000, 640] },
  "faith-root-communion": { id: "faith-root-communion", alt: "A tree's roots glowing in rainbow colors underground, threaded with mycelium.", aspect: [4, 3], widths: [1200, 800, 480] },
  "faith-animals-abundance": { id: "faith-animals-abundance", alt: "Animals and people at ease together in an orchard and terraced garden.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "programs-hero": { id: "programs-hero", alt: "A living village of domed structures encircled by food-forest gardens.", aspect: [16, 9], widths: [2400, 1600, 1000, 640] },
  "program-stewardship": { id: "program-stewardship", alt: "An elder and a child planting together in a terraced garden.", aspect: [1, 1], widths: [800, 480] },
  "elders-hero": { id: "elders-hero", alt: "The interior of an ancient tree cathedral with an empty circle of stones at its base.", aspect: [16, 9], widths: [2400, 1600, 1000, 640] },
  "elders-future-lantern": { id: "elders-future-lantern", alt: "A hand passing a small glowing lantern of light to another hand.", aspect: [4, 3], widths: [1000, 640] },
  "get-involved-hero": { id: "get-involved-hero", alt: "A figure walking toward a warmly lit village gate at dusk.", aspect: [16, 9], widths: [2400, 1600, 1000, 640] },
  "get-involved-community-life": { id: "get-involved-community-life", alt: "A sunlit earthen village with raised garden beds and people tending plants.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "get-involved-sanctuary": { id: "get-involved-sanctuary", alt: "A small sanctuary campus among pines beside a calm mountain lake at dawn.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "get-involved-path": { id: "get-involved-path", alt: "A forest path leading toward a warmly lit village at dusk.", aspect: [4, 3], widths: [1000, 640] },
  "donate-temple-offering": { id: "donate-temple-offering", alt: "Hands placing fruit and seeds on a stone altar beneath a great tree.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "transparency-roots-of-trust": { id: "transparency-roots-of-trust", alt: "A visible network of glowing roots and mycelium beneath open soil.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "elder-chat-threshold": { id: "elder-chat-threshold", alt: "A doorway formed by two living trees grown and bent together.", aspect: [1, 1], widths: [480, 320] },
  "thank-you-blossom": { id: "thank-you-blossom", alt: "A tree bursting into blossom with petals and birds rising into golden light.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "reconciliation-ledger-grove": { id: "reconciliation-ledger-grove", alt: "Hands resting over a glowing ledger on a wooden table in a forest clearing.", aspect: [16, 9], widths: [1600, 1000, 640] },
  "footer-canopy-band": { id: "footer-canopy-band", alt: "A silhouette of a tree-of-life canopy and its roots at dusk.", aspect: [21, 9], widths: [1600, 1000] },
};

/** Build a /api/img URL (returns WebP) for an asset at a given width. */
export function coreImgUrl(id: CoreAssetId, width: number): string {
  const src = `${R2_CORE_BASE}/${id}-${width}.webp`;
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}`;
}

export function coreSrcSet(asset: CoreAsset): string {
  return asset.widths.map((w) => `${coreImgUrl(asset.id, w)} ${w}w`).join(", ");
}

/**
 * Whether an asset is generated, processed, and live on R2. Hero sections use
 * this to decide whether to apply the light-on-dark `.hero-image` text treatment:
 * that treatment assumes a dark photo sits behind the text, so it must stay off
 * until the asset is actually ready, or headline text would render unreadably
 * light-on-light over the plain gradient hero background.
 */
export function isCoreAssetReady(id: CoreAssetId): boolean {
  const entry = (manifest as { assets?: Record<string, { ready?: boolean }> }).assets?.[id];
  return entry?.ready === true;
}
