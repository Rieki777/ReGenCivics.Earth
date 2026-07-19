/**
 * Shared inventory presentation helpers for the nested Ship's Inventory.
 *
 * Used by the /ship bag (ShipInventory.tsx), the /ship/inventory overview + the
 * /ship/inventory/:slug detail sub-page (ShipManifest.tsx), and the owner editor.
 * The overview + cards use iconUrl (glyph fallback); detail rows use frameUrl
 * (real walkthrough-video photos, glyph fallback).
 */

/** A row from ship.inventory.list / .get (structural subset of the tRPC output). */
export type InventoryItem = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  lore: string | null;
  iconUrl: string | null;
  photoUrl: string | null;
  frameUrl: string | null;
  quantity: number;
  unit: string | null;
  storagePlace: string | null;
  zone: string | null;
  itemCondition: string | null;
  confidence: string | null;
  sourceVideo: string | null;
  sourceTimestamp: string | null;
  activityTags: unknown;
  isVisible: boolean;
  isGearChecked: boolean;
  comingYear2?: boolean;
  sortOrder: number;
  parentId: number | null;
  isContainer: boolean;
  manifestCategory: string | null;
  provenance?: string;
};

/** A breadcrumb crumb from ship.inventory.get. */
export type Crumb = { id: number; slug: string; name: string };

// Rarity-style ring + glyph per category (subtle, painterly, never casino).
export const CATEGORY: Record<string, { ring: string; glow: string; glyph: string; label: string }> = {
  magic: { ring: "border-[#b98bd6]", glow: "shadow-[0_0_18px_rgba(185,139,214,0.35)]", glyph: "✨", label: "Magic" },
  adventure: { ring: "border-[#4a9c7c]", glow: "shadow-[0_0_16px_rgba(74,156,124,0.3)]", glyph: "🧭", label: "Adventure" },
  water: { ring: "border-[#5aa9d6]", glow: "shadow-[0_0_16px_rgba(90,169,214,0.3)]", glyph: "💧", label: "Water" },
  power: { ring: "border-[#d6b25a]", glow: "shadow-[0_0_16px_rgba(214,178,90,0.3)]", glyph: "⚡", label: "Power" },
  connectivity: { ring: "border-[#7c8bd6]", glow: "shadow-[0_0_16px_rgba(124,139,214,0.3)]", glyph: "📡", label: "Connectivity" },
  galley: { ring: "border-[#d68b5a]", glow: "shadow-[0_0_16px_rgba(214,139,90,0.3)]", glyph: "🍲", label: "Galley" },
  tools: { ring: "border-[#9c8a7c]", glow: "shadow-[0_0_16px_rgba(156,138,124,0.3)]", glyph: "🔧", label: "Tools" },
  comfort: { ring: "border-[#82b06a]", glow: "shadow-[0_0_16px_rgba(130,176,106,0.3)]", glyph: "🌿", label: "Comfort" },
  safety: { ring: "border-[#d67a7a]", glow: "shadow-[0_0_16px_rgba(214,122,122,0.3)]", glyph: "🛟", label: "Safety" },
};

export function meta(cat: string) {
  return CATEGORY[cat] ?? CATEGORY.comfort;
}

export function tagsOf(item: Pick<InventoryItem, "activityTags">): string[] {
  return Array.isArray(item.activityTags) ? (item.activityTags as string[]) : [];
}

/** Count every item nested under each container, at any depth (cycle-guarded). */
export function buildDescendantCounts(items: InventoryItem[]): Map<number, number> {
  const childrenOf = new Map<number, InventoryItem[]>();
  for (const it of items) {
    if (it.parentId == null) continue;
    const arr = childrenOf.get(it.parentId) ?? [];
    arr.push(it);
    childrenOf.set(it.parentId, arr);
  }
  const memo = new Map<number, number>();
  const count = (id: number, seen: Set<number>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    let n = 0;
    for (const child of childrenOf.get(id) ?? []) n += 1 + count(child.id, seen);
    memo.set(id, n);
    return n;
  };
  const result = new Map<number, number>();
  for (const it of items) if (it.isContainer) result.set(it.id, count(it.id, new Set()));
  return result;
}

/**
 * The ancestor names of an item, top-level first, excluding the item itself.
 * e.g. ["The tool bag", "Outdoor tool bag"]. Cycle-guarded.
 */
export function ancestorNames(item: InventoryItem, byId: Map<number, InventoryItem>): string[] {
  const names: string[] = [];
  const seen = new Set<number>();
  let cur = item.parentId != null ? byId.get(item.parentId) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return names;
}

/** Gold ring style for container hero cards (drillable). */
export const CONTAINER_RING = "border-[#ffd700]";
export const CONTAINER_GLOW = "shadow-[0_0_18px_rgba(255,215,0,0.28)]";
