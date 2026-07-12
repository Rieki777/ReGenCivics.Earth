/**
 * The Ship's Inventory (the bag) — SHIP_MAINTAINER_INVENTORY Section 2.
 *
 * Everything she carries, shown as game-style item slots in the solarpunk
 * elven-futuristic style. Tap a slot to open its item card (icon, lore line,
 * practical description, where it is stowed, activity tags). Search by name and
 * filter by "what are you up to?" activity chips. Rarity-style ring colors by
 * category, subtle and tasteful.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package } from "lucide-react";

type Item = {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  lore: string | null;
  iconUrl: string | null;
  quantity: number;
  storagePlace: string | null;
  activityTags: unknown;
};

// Rarity-style ring + glyph per category (subtle, painterly, never casino).
const CATEGORY: Record<string, { ring: string; glow: string; glyph: string; label: string }> = {
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

function meta(cat: string) {
  return CATEGORY[cat] ?? CATEGORY.comfort;
}
function tagsOf(item: Item): string[] {
  return Array.isArray(item.activityTags) ? (item.activityTags as string[]) : [];
}

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

export function ShipInventory() {
  const { data, isLoading } = trpc.ship.inventory.list.useQuery();
  const [query, setQuery] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [open, setOpen] = useState<Item | null>(null);

  const items = (data ?? []) as Item[];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (activity && !tagsOf(it).some((t) => t.toLowerCase() === activity)) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.lore ?? "").toLowerCase().includes(q) ||
        (it.description ?? "").toLowerCase().includes(q) ||
        tagsOf(it).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, query, activity]);

  if (!isLoading && items.length === 0) return null; // nothing to show yet

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
        {ACTIVITIES.map((a) => (
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
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpen(it)}
                  className={`group w-full aspect-square rounded-2xl border-2 ${m.ring} bg-[#0d1f16]/90 ${m.glow} flex flex-col items-center justify-center p-2 text-center transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
                  aria-label={`${it.name}, ${m.label}${it.quantity > 1 ? `, ${it.quantity} aboard` : ""}`}
                >
                  {it.iconUrl ? (
                    <img src={it.iconUrl} alt="" className="w-12 h-12 object-contain" loading="lazy" />
                  ) : (
                    <span className="text-3xl" aria-hidden="true">{m.glyph}</span>
                  )}
                  <span className="mt-1 text-[11px] leading-tight text-white/85 line-clamp-2">{it.name}</span>
                  {it.quantity > 1 && (
                    <span className="absolute mt-14 ml-14 text-[10px] font-bold text-[#ffd700]">×{it.quantity}</span>
                  )}
                </button>
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
                <div className={`shrink-0 w-24 h-24 rounded-2xl border-2 ${meta(open.category).ring} bg-[#0d1f16]/90 ${meta(open.category).glow} flex items-center justify-center`}>
                  {open.iconUrl ? (
                    <img src={open.iconUrl} alt="" className="w-16 h-16 object-contain" />
                  ) : (
                    <span className="text-4xl" aria-hidden="true">{meta(open.category).glyph}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d]">{meta(open.category).label}</span>
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
