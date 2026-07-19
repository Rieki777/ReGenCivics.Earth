/**
 * Owner/admin inline editor for the nested Ship's Inventory.
 *
 * Gated with the same role check the Harvest uses (admin/superadmin), backed by
 * the server adminProcedure on ship.inventory.upsertInventory / deleteInventory.
 * Because upsert is a FULL-object write, this form round-trips every preserved
 * field (activityTags, sortOrder, isGearChecked, photoUrl, confidence, source*)
 * so editing a curated card never silently wipes its data.
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SmartImagePicker } from "@/components/SmartImagePicker";
import { InventoryItem, tagsOf, CATEGORY } from "./shipInventoryMeta";
import { Loader2, Trash2 } from "lucide-react";

/** Owner/admin gate — mirrors HarvestCaptureModal + the adminProcedure server gate. */
export function useCanEditInventory(): boolean {
  const { user } = useAuth();
  return user?.role === "admin" || user?.role === "superadmin";
}

const ENUM_CATEGORIES = Object.keys(CATEGORY);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type FormState = {
  name: string; slug: string; category: string; manifestCategory: string;
  quantity: number; unit: string; storagePlace: string; zone: string;
  description: string; lore: string; itemCondition: string;
  isVisible: boolean; comingYear2: boolean; isContainer: boolean;
  parentId: number | null; iconUrl: string; frameUrl: string;
};

function initialForm(editing: InventoryItem | null, defaultParentId: number | null): FormState {
  return {
    name: editing?.name ?? "",
    slug: editing?.slug ?? "",
    category: editing?.category ?? "tools",
    manifestCategory: editing?.manifestCategory ?? "",
    quantity: editing?.quantity ?? 1,
    unit: editing?.unit ?? "",
    storagePlace: editing?.storagePlace ?? "",
    zone: editing?.zone ?? "",
    description: editing?.description ?? "",
    lore: editing?.lore ?? "",
    itemCondition: editing?.itemCondition ?? "",
    isVisible: editing?.isVisible ?? true,
    comingYear2: editing?.comingYear2 ?? false,
    isContainer: editing?.isContainer ?? false,
    parentId: editing ? editing.parentId : defaultParentId,
    iconUrl: editing?.iconUrl ?? "",
    frameUrl: editing?.frameUrl ?? "",
  };
}

export function InventoryEditorModal({
  open, onOpenChange, editing, defaultParentId, containers, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: InventoryItem | null;
  defaultParentId: number | null;
  containers: InventoryItem[];
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const upsert = trpc.ship.admin.upsertInventory.useMutation();
  const del = trpc.ship.admin.deleteInventory.useMutation();

  const [form, setForm] = useState<FormState>(() => initialForm(editing, defaultParentId));
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal opens for a different item.
  useEffect(() => {
    if (open) {
      setForm(initialForm(editing, defaultParentId));
      setSlugTouched(Boolean(editing));
      setError(null);
    }
  }, [open, editing, defaultParentId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Top-level / container cards use iconUrl; nested leaf items use a real photo (frameUrl).
  const usesIcon = form.isContainer || form.parentId == null;

  async function save() {
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name) { setError("Name is required."); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setError("Slug must be lowercase letters, digits, and dashes only."); return; }
    setError(null);
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        name,
        slug,
        category: form.category as (typeof ENUM_CATEGORIES)[number] as any,
        description: form.description.trim() || undefined,
        lore: form.lore.trim() || undefined,
        iconUrl: form.iconUrl || undefined,
        photoUrl: editing?.photoUrl || undefined, // preserved
        quantity: form.quantity,
        storagePlace: form.storagePlace.trim() || undefined,
        activityTags: editing ? tagsOf(editing) : undefined, // preserved
        isVisible: form.isVisible,
        isGearChecked: editing?.isGearChecked ?? false, // preserved
        sortOrder: editing?.sortOrder ?? 0, // preserved
        comingYear2: form.comingYear2,
        parentId: form.parentId,
        isContainer: form.isContainer,
        provenance: (editing?.provenance as "curated" | "transcribed" | "curator_added" | undefined) ?? "curator_added",
        zone: form.zone.trim() || undefined,
        unit: form.unit.trim() || undefined,
        itemCondition: form.itemCondition.trim() || undefined,
        confidence: editing?.confidence || undefined, // preserved
        sourceVideo: editing?.sourceVideo || undefined, // preserved
        sourceTimestamp: editing?.sourceTimestamp || undefined, // preserved
        frameUrl: form.frameUrl || undefined,
        manifestCategory: form.manifestCategory.trim() || undefined,
      });
      await Promise.all([
        utils.ship.inventory.list.invalidate(),
        utils.ship.inventory.get.invalidate(),
      ]);
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function remove() {
    if (!editing) return;
    if (!window.confirm(`Delete "${editing.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await del.mutateAsync({ id: editing.id });
      await Promise.all([
        utils.ship.inventory.list.invalidate(),
        utils.ship.inventory.get.invalidate(),
      ]);
      onSaved();
      onOpenChange(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const labelCls = "block text-xs font-semibold text-foreground/70 mb-1";
  // A container may not be re-parented under itself or one of its own descendants
  // (that would create a cycle and orphan the subtree from the top-level view).
  const forbiddenParents = new Set<number>();
  if (editing) {
    forbiddenParents.add(editing.id);
    const childrenOf = new Map<number, InventoryItem[]>();
    for (const c of containers) {
      if (c.parentId == null) continue;
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c);
      childrenOf.set(c.parentId, arr);
    }
    const queue = [editing.id];
    while (queue.length) {
      const id = queue.shift()!;
      for (const child of childrenOf.get(id) ?? []) {
        if (!forbiddenParents.has(child.id)) { forbiddenParents.add(child.id); queue.push(child.id); }
      }
    }
  }
  const parentOptions = containers.filter((c) => !forbiddenParents.has(c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit: ${editing.name}` : "Add gear"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="inv-name" className={labelCls}>Name</label>
            <Input
              id="inv-name"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
              }}
              placeholder="Multi-screwdriver"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-slug" className={labelCls}>Slug</label>
              <Input
                id="inv-slug"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                placeholder="multi-screwdriver"
              />
            </div>
            <div>
              <label htmlFor="inv-parent" className={labelCls}>Inside (parent)</label>
              <select
                id="inv-parent"
                value={form.parentId ?? ""}
                onChange={(e) => set("parentId", e.target.value ? Number(e.target.value) : null)}
                className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="">None (top-level)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-cat" className={labelCls}>Category (glyph)</label>
              <select
                id="inv-cat"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-border bg-background text-sm"
              >
                {ENUM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="inv-mcat" className={labelCls}>Manifest category</label>
              <Input id="inv-mcat" value={form.manifestCategory} onChange={(e) => set("manifestCategory", e.target.value)} placeholder="Tools" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="inv-qty" className={labelCls}>Quantity</label>
              <Input id="inv-qty" type="number" min={0} value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value) || 0)} />
            </div>
            <div>
              <label htmlFor="inv-unit" className={labelCls}>Unit</label>
              <Input id="inv-unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="each" />
            </div>
            <div>
              <label htmlFor="inv-cond" className={labelCls}>Condition</label>
              <Input id="inv-cond" value={form.itemCondition} onChange={(e) => set("itemCondition", e.target.value)} placeholder="good" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-store" className={labelCls}>Storage place</label>
              <Input id="inv-store" value={form.storagePlace} onChange={(e) => set("storagePlace", e.target.value)} placeholder="Indoor tool bag" />
            </div>
            <div>
              <label htmlFor="inv-zone" className={labelCls}>Zone</label>
              <Input id="inv-zone" value={form.zone} onChange={(e) => set("zone", e.target.value)} placeholder="Storage-general" />
            </div>
          </div>

          <div>
            <label htmlFor="inv-desc" className={labelCls}>Description / notes</label>
            <textarea
              id="inv-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-sm"
            />
          </div>

          <div>
            <label htmlFor="inv-lore" className={labelCls}>Lore (optional flavor line)</label>
            <Input id="inv-lore" value={form.lore} onChange={(e) => set("lore", e.target.value)} placeholder="Every ship her age keeps her own kit close." />
          </div>

          <div className="flex flex-wrap gap-4 py-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isContainer} onChange={(e) => set("isContainer", e.target.checked)} />
              Container (holds other items)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isVisible} onChange={(e) => set("isVisible", e.target.checked)} />
              Visible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.comingYear2} onChange={(e) => set("comingYear2", e.target.checked)} />
              Coming year two
            </label>
          </div>

          <div>
            <span className={labelCls}>{usesIcon ? "Card icon" : "Photo (video frame)"}</span>
            <SmartImagePicker
              value={usesIcon ? form.iconUrl : form.frameUrl}
              onChange={(url) => set(usesIcon ? "iconUrl" : "frameUrl", url)}
              hideGenerate
              context="default"
              theme="light"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            {editing ? (
              <button
                type="button"
                onClick={remove}
                disabled={del.isPending}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {del.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-2 rounded-lg text-sm border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={upsert.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#2f5d3a] text-white hover:bg-[#1a472a] disabled:opacity-50"
              >
                {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
