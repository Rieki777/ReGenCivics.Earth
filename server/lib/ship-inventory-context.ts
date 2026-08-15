/**
 * ship-inventory-context.ts
 *
 * Shared inventory context for the ship's guest-facing AIs. Turns the nested
 * ship_inventory_items tree into compact, token-bounded lists the bots ground
 * their answers in:
 *   - the Shipwright gets repair-relevant tools with where each is stored, so it
 *     only ever suggests a tool that is actually aboard and can say where to find it;
 *   - the concierge (First Mate) can use the same location walk to tell a guest
 *     where a piece of gear lives.
 *
 * Pure functions over plain rows so they are easy to unit-test and reuse.
 */

export type InventoryRow = {
  id: number;
  name: string;
  quantity: number;
  parentId: number | null;
  storagePlace: string | null;
  category: string;
  manifestCategory: string | null;
  isContainer: boolean;
  isVisible: boolean;
};

export type ToolContextItem = { name: string; quantity: number; location: string };

// Which items count as repair-relevant, by the 9-value enum and by the manifest taxonomy.
const REPAIR_ENUM = new Set(["tools", "power", "water", "safety", "connectivity"]);
const REPAIR_MANIFEST = /(tool|electr|power|plumb|water|sewer|safety|sealant|fasten|screw|hardware|adhesive|tape)/i;

function isRepairRelevant(row: InventoryRow): boolean {
  if (row.isContainer) return false; // a container is a place, not a tool
  if (REPAIR_ENUM.has(row.category)) return true;
  if (row.manifestCategory && REPAIR_MANIFEST.test(row.manifestCategory)) return true;
  return false;
}

/** Ancestor container rows, top-level first (excludes the item itself). Cycle-guarded. */
function ancestors(row: InventoryRow, byId: Map<number, InventoryRow>): InventoryRow[] {
  const chain: InventoryRow[] = [];
  const seen = new Set<number>();
  let cur = row.parentId != null ? byId.get(row.parentId) : undefined;
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/**
 * The full where-it-lives path for an item, e.g.
 * "Outdoor tool bag ▸ Tool section, passenger side". Falls back to the item's
 * own storagePlace, then a plain "aboard".
 */
export function locationOf(row: InventoryRow, byId: Map<number, InventoryRow>): string {
  const chain = ancestors(row, byId);
  const parts = chain.map((c) => c.name);
  const deepest = chain[chain.length - 1];
  const place = deepest?.storagePlace || row.storagePlace;
  if (place && place !== parts[parts.length - 1]) parts.push(place);
  return parts.join(" ▸ ") || row.storagePlace || "aboard";
}

/**
 * Repair-relevant tools aboard, each with where it is stored, token-bounded so
 * it never blows the Shipwright's context.
 */
export function buildToolContext(rows: InventoryRow[], opts?: { maxItems?: number; maxChars?: number }): ToolContextItem[] {
  const maxItems = opts?.maxItems ?? 80;
  const maxChars = opts?.maxChars ?? 2600;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: ToolContextItem[] = [];
  let chars = 0;
  for (const row of rows) {
    if (!row.isVisible || !isRepairRelevant(row)) continue;
    const item: ToolContextItem = { name: row.name, quantity: row.quantity, location: locationOf(row, byId) };
    const cost = item.name.length + item.location.length + 10;
    if (items.length >= maxItems || chars + cost > maxChars) break;
    items.push(item);
    chars += cost;
  }
  return items;
}

/** A compact TOOLS-ABOARD block for a system prompt (no em-dashes: it feeds a bot). */
export function toolContextBlock(items: ToolContextItem[]): string {
  if (!items.length) {
    return "TOOLS ABOARD: (none recorded yet; do not name specific tools, point them to the Keeper).";
  }
  const lines = items.map((t) => `- ${t.name}${t.quantity > 1 ? ` (x${t.quantity})` : ""} (stored: ${t.location})`);
  return [
    "TOOLS ABOARD. Only suggest tools from this list, and tell the guest where each one is stored. Never invent a tool that is not on this list:",
    ...lines,
  ].join("\n");
}
