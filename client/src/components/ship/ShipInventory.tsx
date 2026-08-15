/**
 * The Ship's Inventory overview (the bag) — SHIP_MAINTAINER_INVENTORY Section 2.
 *
 * The top level of the nested inventory tree: only parentId === null nodes show
 * here as game-style slots. Container cards (isContainer) get a gold ring, an
 * "N inside" count, and a chevron, and drill into /ship/inventory/:slug. Leaf
 * cards open their item card in a dialog (icon, lore, description, storage,
 * activity tags). Search by name and filter by "what are you up to?" chips.
 * Overview cards use iconUrl (glyph fallback), never the per-item video frames.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, ChevronRight } from "lucide-react";
import {
  InventoryItem, meta, tagsOf, CONTAINER_RING, CONTAINER_GLOW,
} from "./shipInventoryMeta";

// "What are you up to?" chips filter by activity tag.
const ACTIVITIES = [
  { key: "lake day", label: "Lake day" },
  { key: "forest walk", label: "Forest walk" },
  { key: "spring run", label: "Spring run" },
  { key: "rainy day", label: "Rainy day" },
  { key: "hosting dinner", label: "Hosting dinner" },
  { key: "planting", label: "Planting" },
  { key: "repairs", label: "Repairs" },
];

/** Count every item nested under a container, at any depth. */
function buildDescendantCounts(items: InventoryItem[]): Map<number, number> {
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
    if (seen.has(id)) return 0; // cycle guard
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

export function ShipInventory() {
  const { data, isLoading } = trpc.ship.inventory.list.useQuery();
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [open, setOpen] = useState<InventoryItem | null>(null);

  const items = (data ?? []) as InventoryItem[];
  const insideCounts = useMemo(() => buildDescendantCounts(items), [items]);

  // Only parentId === null nodes are hero cards on the overview.
  const topLevel = useMemo(() => items.filter((it) => it.parentId == null), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topLevel.filter((it) => {
      if (activity && !tagsOf(it).some((t) => t.toLowerCase() === activity)) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.lore ?? "").toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q) ||
        tagsOf(it).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [topLevel, query, activity]);

  // Only show chips that match at least one loaded item, so no chip lands on the
  // empty state and looks broken.
  // Built from topLevel (not all items): the activity filter runs over topLevel,
  // so a chip whose only tag lives on a nested item would land on the empty state.
  const availableTags = useMemo(() => {
    const s = new Set<string>();
    for (const it of topLevel) for (const t of tagsOf(it)) s.add(t.toLowerCase());
    return s;
  }, [topLevel]);
  const visibleActivities = ACTIVITIES.filter((a) => availableTags.has(a.key));

  if (!isLoading && topLevel.length === 0) return null; // nothing to show yet

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the bag…"
            className="pl-9 text-base"
            aria-label="Search the ship's inventory"
          />
        </div>
      </div>

      {/* Activity filter chips */}
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="What are you up to?">
        <button
          type="button"
          onClick={() => setActivity(null)}
          aria-pressed={activity === null}
          className={`rounded-full px-3 py-1 text-sm border transition-colors min-h-9 ${activity === null ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "bg-background text-foreground/70 hover:border-[#2f5d3a]"}`}
        >
          Everything
        </button>
        {visibleActivities.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setActivity(activity === a.key ? null : a.key)}
            aria-pressed={activity === a.key}
            className={`rounded-full px-3 py-1 text-sm border transition-colors min-h-9 ${activity === a.key ? "bg-[#2f5d3a] text-white border-[#2f5d3a]" : "bg-background text-foreground/70 hover:border-[#2f5d3a]"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Opening the bag…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nothing in the bag for that. Try another search.</p>
      ) : (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filtered.map((it) => {
            const m = meta(it.category);
            const inside = it.isContainer ? insideCounts.get(it.id) ?? 0 : 0;
            const ring = it.isContainer ? CONTAINER_RING : m.ring;
            const glow = it.isContainer ? CONTAINER_GLOW : m.glow;
            const cardClass = `group relative w-full aspect-square rounded-2xl border-2 ${ring} bg-[#0d1f16] ${glow} overflow-hidden flex flex-col items-center justify-center p-2 text-center transition-transform hover:-translate-y-0.5 hover:shadow-lg ${it.comingYear2 ? "opacity-80" : ""}`;
            const inner = (
              <>
                {it.comingYear2 && (
                  <span className="absolute top-1 left-1 z-10 rounded-full bg-[#b5762f]/90 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">Year two</span>
                )}
                {it.isContainer ? (
                  inside > 0 && (
                    <span className="absolute top-1 right-1 z-10 rounded-full bg-[#0d1f16]/90 border border-[#ffd700]/70 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd700] leading-none">{inside} inside</span>
                  )
                ) : (
                  it.quantity > 1 && (
                    <span className="absolute top-1 right-1 z-10 rounded-full bg-[#0d1f16]/90 border border-[#ffd700]/60 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd700] leading-none">×{it.quantity}</span>
                  )
                )}
                {it.iconUrl ? (
                  <>
                    <img src={it.iconUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-1 pt-5 pb-1.5 text-[11px] leading-tight text-white line-clamp-2">{it.name}</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl" aria-hidden="true">{m.glyph}</span>
                    <span className="mt-1 text-[11px] leading-tight text-white/85 line-clamp-2">{it.name}</span>
                  </>
                )}
                {it.isContainer && (
                  <ChevronRight className="absolute bottom-1 right-1 z-10 w-4 h-4 text-[#ffd700]/80" aria-hidden="true" />
                )}
              </>
            );
            return (
              <li key={it.id}>
                {it.isContainer ? (
                  <Link
                    href={`/ship/inventory/${it.slug}`}
                    className={cardClass}
                    aria-label={`${it.name}, ${inside} items inside. Open`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpen(it)}
                    className={cardClass}
                    aria-label={`${it.name}, ${m.label}${it.comingYear2 ? ", coming year two" : ""}${it.quantity > 1 ? `, ${it.quantity} aboard` : ""}`}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span aria-hidden="true">{meta(open.category).glyph}</span> {open.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-24 h-24 rounded-2xl border-2 ${meta(open.category).ring} bg-[#0d1f16] ${meta(open.category).glow} flex items-center justify-center overflow-hidden`}>
                  {open.iconUrl ? (
                    <img src={open.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl" aria-hidden="true">{meta(open.category).glyph}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d]">{meta(open.category).label}</span>
                  {open.comingYear2 && <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#b5762f]/15 text-[#8a5a2b] dark:text-[#e0b483]">Coming year two</span>}
                  {open.quantity > 1 && <span className="ml-2 text-xs text-muted-foreground">{open.quantity} aboard</span>}
                  {open.lore && <p className="mt-2 text-sm italic text-foreground/80">{open.lore}</p>}
                </div>
              </div>
              {open.description && <p className="mt-4 text-sm text-foreground/85">{open.description}</p>}
              {open.storagePlace && (
                <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" aria-hidden="true" /> Stowed: {open.storagePlace}
                </p>
              )}
              {tagsOf(open).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tagsOf(open).map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
