/**
 * /ship/inventory — The Ship's Inventory (physical manifest).
 *
 * Renders the `ship_inventory` table (everything aboard the 2006 Fleetwood
 * Revolution LE, transcribed from the captain's walkthrough videos) grouped by
 * zone, with a category filter and a search box. This is distinct from the
 * gamified "bag" (ShipInventory component / ship.inventory.list) on /ship.
 * source_video / timestamp are stored server-side but intentionally not shown.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { ShipSection, ShipEyebrow } from "./shipShared";
import { trpc } from "@/lib/trpc";
import { Package, Search } from "lucide-react";

const ZONE_ORDER = [
  "Cab/Cockpit", "Galley", "Dinette", "Living/Salon", "Bedroom", "Bathroom",
  "Wardrobe/Closets", "Overhead cabinets", "Basement/Exterior bays",
  "Roof/Exterior", "Storage-general",
];

type Item = {
  id: string; name: string; quantity: number; unit: string | null;
  category: string; zone: string; location: string | null;
  itemCondition: string | null; notes: string | null; confidence: string;
};

export default function ShipManifest() {
  const q = trpc.shipManifest.list.useQuery(undefined, { staleTime: 60_000 });
  const items = (q.data ?? []) as Item[];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "All" && i.category !== category) return false;
      if (!s) return true;
      return [i.name, i.notes, i.location, i.category, i.zone]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(s));
    });
  }, [items, search, category]);

  const zones = useMemo(() => {
    const present = Array.from(new Set(filtered.map((i) => i.zone)));
    present.sort((a, b) => {
      const ai = ZONE_ORDER.indexOf(a);
      const bi = ZONE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return present;
  }, [filtered]);

  return (
    <PageWrapper>
      <SEO
        title="The ReGen Ship — Inventory"
        description="Everything aboard the ReGen Ship and where she keeps it: the full inventory of the 2006 Fleetwood Revolution LE land yacht."
        url="/ship/inventory"
      />

      <ShipSection className="pt-10 pb-4">
        <Link href="/ship" className="text-sm text-[#2f5d3a] dark:text-[#ffd700] font-semibold hover:underline">← Back to the ship</Link>
        <ShipEyebrow>The manifest</ShipEyebrow>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
          <Package className="w-7 h-7 text-[#2f5d3a] dark:text-[#ffd700]" /> What&apos;s aboard the ship
        </h1>
        <p className="text-foreground/80 max-w-2xl">
          A full inventory of the ReGen Ship — every tool, hose, battery, and bit
          of gear aboard the 2006 Fleetwood Revolution LE, and where she keeps it.
          Transcribed from the captain&apos;s walkthrough.
        </p>
      </ShipSection>

      <ShipSection className="py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items, locations, notes…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2f5d3a]/40"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="py-2 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#2f5d3a]/40"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>
            ))}
          </select>
        </div>

        {q.isLoading && <p className="text-muted-foreground py-8 text-center">Loading the manifest…</p>}
        {q.isError && <p className="text-muted-foreground py-8 text-center">The manifest could not be loaded right now.</p>}
        {!q.isLoading && !q.isError && items.length === 0 && (
          <p className="text-muted-foreground py-8 text-center">The inventory hasn&apos;t been loaded aboard yet.</p>
        )}

        {!q.isLoading && items.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {filtered.length} of {items.length} items across {zones.length} {zones.length === 1 ? "zone" : "zones"}.
            </p>
            {filtered.length === 0 && (
              <p className="text-muted-foreground py-8 text-center">No items match your search.</p>
            )}
            <div className="space-y-10">
              {zones.map((zone) => {
                const zoneItems = filtered.filter((i) => i.zone === zone);
                const cats = Array.from(new Set(zoneItems.map((i) => i.category))).sort();
                return (
                  <section key={zone}>
                    <h2 className="text-xl md:text-2xl font-bold mb-1 text-[#2f5d3a] dark:text-[#ffd700]">{zone}</h2>
                    <div className="h-px bg-border mb-4" />
                    <div className="space-y-6">
                      {cats.map((cat) => (
                        <div key={cat}>
                          <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">{cat}</h3>
                          <ul className="grid sm:grid-cols-2 gap-3">
                            {zoneItems.filter((i) => i.category === cat).map((i) => (
                              <li key={i.id} className="rounded-xl border border-border bg-card/40 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-semibold text-foreground">{i.name}</span>
                                  <span className="shrink-0 text-xs rounded-full bg-[#2f5d3a]/10 dark:bg-[#ffd700]/10 text-[#2f5d3a] dark:text-[#ffd700] px-2 py-0.5">
                                    {i.quantity}{i.unit ? ` ${i.unit}` : ""}
                                  </span>
                                </div>
                                {i.location && <p className="text-sm text-muted-foreground mt-1">📍 {i.location}</p>}
                                {i.notes && <p className="text-sm text-foreground/70 mt-1">{i.notes}</p>}
                                {i.itemCondition && !["good", "n/a"].includes(i.itemCondition.toLowerCase()) && (
                                  <span className="inline-block mt-2 text-xs rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5">{i.itemCondition}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </ShipSection>
    </PageWrapper>
  );
}
