/**
 * /ship/inventory — The Ship's Inventory (nested tree).
 *
 *   /ship/inventory          overview: the top-level hero cards (parentId null).
 *                            Piercing search + category filter across the whole
 *                            tree; container cards drill into their sub-page.
 *   /ship/inventory/:slug    detail sub-page: breadcrumb trail, then either the
 *                            child containers (drillable cards) or a leaf list
 *                            grouped by manifest category with real video-frame
 *                            photos (glyph fallback).
 *
 * Overview cards use iconUrl (glyph fallback); leaf detail rows use frameUrl.
 * Owner/admin sees inline "+ Add gear" / "Edit" controls (server adminProcedure
 * is the real gate).
 */
import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { ShipSection, ShipEyebrow } from "./shipShared";
import { trpc } from "@/lib/trpc";
import { Package, Search, ChevronRight, Plus, Pencil } from "lucide-react";
import {
  InventoryItem, meta, buildDescendantCounts, ancestorNames,
  CONTAINER_RING, CONTAINER_GLOW,
} from "@/components/ship/shipInventoryMeta";
import { useCanEditInventory, InventoryEditorModal } from "@/components/ship/InventoryEditor";

const groupOf = (i: InventoryItem) => i.manifestCategory || meta(i.category).label;

// ── A drillable hero card in a grid (overview + child-container lists) ─────────
function CardTile({ item, inside }: { item: InventoryItem; inside: number }) {
  const m = meta(item.category);
  const ring = item.isContainer ? CONTAINER_RING : m.ring;
  const glow = item.isContainer ? CONTAINER_GLOW : m.glow;
  return (
    <Link
      href={`/ship/inventory/${item.slug}`}
      className={`group relative w-full aspect-square rounded-2xl border-2 ${ring} bg-[#0d1f16]/90 ${glow} flex flex-col items-center justify-center p-2 text-center transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
      aria-label={item.isContainer ? `${item.name}, ${inside} items inside. Open` : `${item.name}. Open`}
    >
      {item.isContainer && inside > 0 && (
        <span className="absolute top-1 right-1 rounded-full bg-[#0d1f16]/90 border border-[#ffd700]/70 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd700] leading-none">{inside} inside</span>
      )}
      {!item.isContainer && item.quantity > 1 && (
        <span className="absolute top-1 right-1 rounded-full bg-[#0d1f16]/90 border border-[#ffd700]/60 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd700] leading-none">×{item.quantity}</span>
      )}
      {item.iconUrl ? (
        <img src={item.iconUrl} alt="" className="w-12 h-12 object-contain" loading="lazy" />
      ) : (
        <span className="text-3xl" aria-hidden="true">{m.glyph}</span>
      )}
      <span className="mt-1 text-[11px] leading-tight text-white/85 line-clamp-2">{item.name}</span>
      {item.isContainer && <ChevronRight className="absolute bottom-1 right-1 w-4 h-4 text-[#ffd700]/80" aria-hidden="true" />}
    </Link>
  );
}

function OwnerBar({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[#2f5d3a]/40 text-[#2f5d3a] dark:text-[#ffd700] hover:bg-[#2f5d3a]/10"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

// ── Overview: top-level cards + piercing search ───────────────────────────────
function InventoryOverview() {
  const { data, isLoading, isError } = trpc.ship.inventory.list.useQuery(undefined, { staleTime: 60_000 });
  const items = (data ?? []) as InventoryItem[];
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const canEdit = useCanEditInventory();
  const [editorOpen, setEditorOpen] = useState(false);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const insideCounts = useMemo(() => buildDescendantCounts(items), [items]);
  const containers = useMemo(() => items.filter((i) => i.isContainer), [items]);
  const topLevel = useMemo(() => items.filter((i) => i.parentId == null), [items]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => s.add(groupOf(i)));
    return ["All", ...Array.from(s).sort()];
  }, [items]);

  const searching = search.trim().length > 0 || cat !== "All";
  const results = useMemo(() => {
    if (!searching) return [];
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "All" && groupOf(i) !== cat) return false;
      if (!q) return true;
      return [i.name, i.description, i.storagePlace, i.manifestCategory, i.zone]
        .filter(Boolean).some((f) => (f as string).toLowerCase().includes(q));
    });
  }, [items, search, cat, searching]);

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
          Every tool, hose, battery, and bit of gear aboard the 2006 Fleetwood
          Revolution LE, and where she keeps it. Open a kit to see what is inside.
        </p>
        {canEdit && (
          <div className="mt-4">
            <OwnerBar label="Add gear" onAdd={() => setEditorOpen(true)} />
          </div>
        )}
      </ShipSection>

      <ShipSection className="py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search every item, kit, and storage place…"
              aria-label="Search the inventory"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2f5d3a]/40"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Filter by category"
            className="py-2 px-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#2f5d3a]/40"
          >
            {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
          </select>
        </div>

        {isLoading && <p className="text-muted-foreground py-8 text-center">Opening the bag…</p>}
        {isError && <p className="text-muted-foreground py-8 text-center">The inventory could not be loaded right now.</p>}
        {!isLoading && !isError && items.length === 0 && (
          <p className="text-muted-foreground py-8 text-center">The inventory hasn&apos;t been loaded aboard yet.</p>
        )}

        {/* Piercing search results (flat, with breadcrumb path) */}
        {searching && (
          <>
            <p className="text-sm text-muted-foreground mb-4">{results.length} {results.length === 1 ? "match" : "matches"}.</p>
            {results.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Nothing matches that search.</p>
            ) : (
              <ul className="space-y-2">
                {results.map((it) => {
                  const path = ancestorNames(it, byId);
                  return (
                    <li key={it.id}>
                      <Link href={`/ship/inventory/${it.slug}`} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3 hover:border-[#2f5d3a]/40">
                        <span className="shrink-0 w-10 h-10 rounded-lg bg-[#0d1f16]/90 border border-border flex items-center justify-center overflow-hidden">
                          {it.frameUrl || it.iconUrl
                            ? <img src={it.frameUrl || it.iconUrl || ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <span aria-hidden="true">{meta(it.category).glyph}</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold text-foreground">{it.name}</span>
                          {path.length > 0 && <span className="block text-xs text-muted-foreground truncate">{path.join(" ▸ ")}</span>}
                        </span>
                        {it.quantity > 1 && <span className="shrink-0 text-xs text-muted-foreground">{it.quantity}{it.unit ? ` ${it.unit}` : ""}</span>}
                        {it.isContainer && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* Default: the top-level hero grid */}
        {!searching && topLevel.length > 0 && (
          <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {topLevel.map((it) => (
              <li key={it.id}><CardTile item={it} inside={insideCounts.get(it.id) ?? 0} /></li>
            ))}
          </ul>
        )}
      </ShipSection>

      {canEdit && (
        <InventoryEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          editing={null}
          defaultParentId={null}
          containers={containers}
          onSaved={() => {}}
        />
      )}
    </PageWrapper>
  );
}

// ── Detail sub-page: breadcrumb + children ────────────────────────────────────
function InventoryDetail({ slug }: { slug: string }) {
  const getQ = trpc.ship.inventory.get.useQuery({ slug }, { staleTime: 60_000 });
  const listQ = trpc.ship.inventory.list.useQuery(undefined, { staleTime: 60_000 });
  const canEdit = useCanEditInventory();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [addParent, setAddParent] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const item = (getQ.data?.item ?? null) as InventoryItem | null;
  const children = (getQ.data?.children ?? []) as InventoryItem[];
  const breadcrumb = getQ.data?.breadcrumb ?? [];
  const allItems = (listQ.data ?? []) as InventoryItem[];
  const containers = useMemo(() => allItems.filter((i) => i.isContainer), [allItems]);
  const insideCounts = useMemo(() => buildDescendantCounts(allItems), [allItems]);

  const childContainers = children.filter((c) => c.isContainer);
  const leafChildren = children.filter((c) => !c.isContainer);

  const q = search.trim().toLowerCase();
  const matchLeaf = (c: InventoryItem) =>
    !q || [c.name, c.description, c.storagePlace, c.manifestCategory].filter(Boolean).some((f) => (f as string).toLowerCase().includes(q));
  const shownLeaves = leafChildren.filter(matchLeaf);

  // Group leaf children by manifest category.
  const leafGroups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const c of shownLeaves) {
      const g = groupOf(c);
      (map.get(g) ?? map.set(g, []).get(g)!).push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shownLeaves]);

  function openEdit(it: InventoryItem) { setEditing(it); setAddParent(null); setEditorOpen(true); }
  function openAddChild() { setEditing(null); setAddParent(item?.id ?? null); setEditorOpen(true); }

  const m = item ? meta(item.category) : meta("comfort");

  return (
    <PageWrapper>
      <SEO
        title={item ? `${item.name} — Ship's Inventory` : "Ship's Inventory"}
        description={item?.description || "A kit aboard the ReGen Ship and what is inside it."}
        url={`/ship/inventory/${slug}`}
      />

      <ShipSection className="pt-10 pb-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
          <Link href="/ship/inventory" className="text-[#2f5d3a] dark:text-[#ffd700] font-semibold hover:underline">The manifest</Link>
          {breadcrumb.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span aria-hidden="true">▸</span>
              {i === breadcrumb.length - 1
                ? <span className="text-foreground font-semibold">{c.name}</span>
                : <Link href={`/ship/inventory/${c.slug}`} className="hover:underline">{c.name}</Link>}
            </span>
          ))}
        </nav>

        {getQ.isLoading && <p className="text-muted-foreground py-8">Loading…</p>}
        {!getQ.isLoading && !item && (
          <div className="py-10">
            <p className="text-muted-foreground">That item is not aboard, or is not on the manifest.</p>
            <Link href="/ship/inventory" className="text-[#2f5d3a] dark:text-[#ffd700] font-semibold hover:underline">← Back to the inventory</Link>
          </div>
        )}

        {item && (
          <>
            <div className="mt-4 flex items-start gap-4">
              <div className={`shrink-0 w-20 h-20 rounded-2xl border-2 ${item.isContainer ? CONTAINER_RING : m.ring} bg-[#0d1f16]/90 ${item.isContainer ? CONTAINER_GLOW : m.glow} flex items-center justify-center overflow-hidden`}>
                {item.iconUrl ? <img src={item.iconUrl} alt="" className="w-14 h-14 object-contain" />
                  : item.frameUrl ? <img src={item.frameUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-4xl" aria-hidden="true">{m.glyph}</span>}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold">{item.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 font-medium bg-[#4a7c59]/15 text-[#2f5d3a] dark:text-[#7dd87d]">{item.manifestCategory || m.label}</span>
                  {item.quantity > 1 && <span className="text-muted-foreground">{item.quantity}{item.unit ? ` ${item.unit}` : ""} aboard</span>}
                  {item.itemCondition && !["good", "n/a"].includes(item.itemCondition.toLowerCase()) && (
                    <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5">{item.itemCondition}</span>
                  )}
                </div>
                {item.lore && <p className="mt-2 text-sm italic text-foreground/80">{item.lore}</p>}
              </div>
            </div>
            {item.description && <p className="mt-4 text-sm text-foreground/85 max-w-2xl">{item.description}</p>}
            {item.storagePlace && (
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" aria-hidden="true" /> Stowed: {item.storagePlace}
              </p>
            )}
            {canEdit && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(item)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[#2f5d3a]/40 text-[#2f5d3a] dark:text-[#ffd700] hover:bg-[#2f5d3a]/10">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <OwnerBar label="Add gear here" onAdd={openAddChild} />
              </div>
            )}
          </>
        )}
      </ShipSection>

      {item && children.length > 0 && (
        <ShipSection className="py-4">
          {leafChildren.length > 0 && (
            <div className="relative max-w-sm mb-6">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inside this kit…"
                aria-label="Search inside this kit"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#2f5d3a]/40"
              />
            </div>
          )}

          {/* Child containers drill further */}
          {childContainers.length > 0 && (
            <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
              {childContainers.map((c) => (
                <li key={c.id}><CardTile item={c} inside={insideCounts.get(c.id) ?? 0} /></li>
              ))}
            </ul>
          )}

          {/* Leaf children: grouped list with real photos */}
          {leafGroups.map(([group, rows]) => (
            <section key={group} className="mb-8">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">{group}</h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {rows.map((c) => {
                  const cm = meta(c.category);
                  return (
                    <li key={c.id} className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-3">
                      <span className="shrink-0 w-14 h-14 rounded-lg bg-[#0d1f16]/90 border border-border flex items-center justify-center overflow-hidden">
                        {c.frameUrl ? <img src={c.frameUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                          : <span className="text-2xl" aria-hidden="true">{cm.glyph}</span>}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground">{c.name}</span>
                          <span className="shrink-0 flex items-center gap-1.5">
                            {c.quantity > 1 && <span className="text-xs rounded-full bg-[#2f5d3a]/10 dark:bg-[#ffd700]/10 text-[#2f5d3a] dark:text-[#ffd700] px-2 py-0.5">{c.quantity}{c.unit ? ` ${c.unit}` : ""}</span>}
                            {canEdit && (
                              <button type="button" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`} className="text-muted-foreground hover:text-foreground">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        </div>
                        {c.storagePlace && <p className="text-sm text-muted-foreground mt-0.5">📍 {c.storagePlace}</p>}
                        {c.description && <p className="text-sm text-foreground/70 mt-0.5">{c.description}</p>}
                        {c.itemCondition && !["good", "n/a"].includes(c.itemCondition.toLowerCase()) && (
                          <span className="inline-block mt-1.5 text-xs rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5">{c.itemCondition}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </ShipSection>
      )}

      {canEdit && (
        <InventoryEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          editing={editing}
          defaultParentId={addParent}
          containers={containers}
          onSaved={() => {}}
        />
      )}
    </PageWrapper>
  );
}

export default function ShipManifest() {
  const [, params] = useRoute("/ship/inventory/:slug");
  const slug = params?.slug;
  return slug ? <InventoryDetail slug={slug} /> : <InventoryOverview />;
}
