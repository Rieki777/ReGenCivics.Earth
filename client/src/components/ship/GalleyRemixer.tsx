/**
 * What's Aboard? Remix It (Galley spec section 6). The centerpiece of /ship/galley.
 *
 * Logged-in crew log what they gathered (type it or snap a photo), across named
 * hauls, pick a track, and remix it into dishes. Two engines: Remix (deterministic,
 * instant, works with no LLM) and Ask the Ship's Cook (AI, sees the photos). Hauls
 * and remixes save to the crew's account and link to the active voyage; a favorite
 * can go to the voyage log or be submitted to the shared cookbook. Logged-out
 * visitors get a local "try it" remix (GalleyTryItLocal) instead of a wall.
 *
 * Photos upload through files.upload to the asset domain, the same path the
 * Shipwright uses; the server hands only our own asset URLs to the Cook's vision.
 */
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GalleyTrackCards, HEALTH_NOTE, type TrackId } from "./GalleyTracks";
import { GalleyTryItLocal } from "./GalleyTryItLocal";
import { GalleyDishCard, type Dish } from "./GalleyDishCard";
import {
  Sparkles, ChefHat, Camera, X, Loader2, Plus, Dice5, Globe, Lock, Pencil, Check,
} from "lucide-react";

const ITEM_CATEGORIES = ["produce", "pantry", "protein", "sauce", "other"] as const;
const ITEM_SOURCES = ["market", "ship", "forage", "store"] as const;
const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 8;

type CookTurn = { role: "user" | "assistant"; content: string; photoUrls?: string[] };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dishToLogContent(dish: Dish): string {
  const name = dish.name ?? dish.dishName ?? "A galley dish";
  return [
    `From the galley: ${name}.`,
    dish.base?.length ? `Base: ${dish.base.join(", ")}.` : "",
    dish.fillings?.length ? `Fillings: ${dish.fillings.join(", ")}.` : "",
    dish.toppings?.length ? `Toppings: ${dish.toppings.join(", ")}.` : "",
    dish.sauce?.length ? `Sauce: ${dish.sauce.join(", ")}.` : "",
    dish.method ?? "",
    dish.why ?? "",
  ].filter(Boolean).join(" ").slice(0, 5000);
}

export function GalleyRemixer() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const haulsQuery = trpc.ship.galley.myHauls.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const voyage = trpc.ship.myVoyage.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createHaul = trpc.ship.galley.createHaul.useMutation();
  const renameHaul = trpc.ship.galley.renameHaul.useMutation();
  const addItem = trpc.ship.galley.addItem.useMutation();
  const removeItem = trpc.ship.galley.removeItem.useMutation();
  const setVisibility = trpc.ship.galley.setHaulVisibility.useMutation();
  const remixMut = trpc.ship.galley.remix.useMutation();
  const rollMut = trpc.ship.galley.roll.useMutation();
  const cookMut = trpc.ship.galley.cook.useMutation();
  const publishMut = trpc.ship.galley.publishToCookbook.useMutation();
  const logMut = trpc.ship.log.create.useMutation();
  const upload = trpc.files.upload.useMutation();

  const [activeHaulId, setActiveHaulId] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackId>("table");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof ITEM_CATEGORIES)[number]>("produce");
  const [source, setSource] = useState<(typeof ITEM_SOURCES)[number]>("market");
  const [itemPhoto, setItemPhoto] = useState<string | null>(null);
  const [uploadingItem, setUploadingItem] = useState(false);
  const [pending, setPending] = useState<string[]>([]); // optimistic item echoes
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastRemixId, setLastRemixId] = useState<number | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<number>>(new Set());
  const [loggedNames, setLoggedNames] = useState<Set<string>>(new Set());

  const [cookMsg, setCookMsg] = useState("");
  const [cookTurns, setCookTurns] = useState<CookTurn[]>([]);
  const [cookPhotos, setCookPhotos] = useState<string[]>([]);
  const [cookRemixId, setCookRemixId] = useState<number | null>(null);
  const [cookDish, setCookDish] = useState<Dish | null>(null);
  const [uploadingCook, setUploadingCook] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const itemFileRef = useRef<HTMLInputElement | null>(null);
  const cookFileRef = useRef<HTMLInputElement | null>(null);

  const hauls = haulsQuery.data ?? [];
  const activeHaul = useMemo(
    () => hauls.find((h) => h.id === activeHaulId) ?? hauls[0] ?? null,
    [hauls, activeHaulId],
  );
  const items = activeHaul?.items ?? [];
  const activeBooking = voyage.data?.booking ?? null;

  function haulLabel(h: { id: number; title: string | null; createdAt: string | Date }): string {
    return h.title || `Haul #${h.id}`;
  }

  async function ensureHaul(): Promise<number> {
    if (activeHaul) return activeHaul.id;
    const res = await createHaul.mutateAsync({ title: "My market haul" });
    await utils.ship.galley.myHauls.invalidate();
    const id = res.id ?? 0;
    setActiveHaulId(id);
    return id;
  }

  async function startNewHaul() {
    setErr(null);
    try {
      const res = await createHaul.mutateAsync({ title: "New haul" });
      await utils.ship.galley.myHauls.invalidate();
      if (res.id) { setActiveHaulId(res.id); setDishes([]); setSuggestions([]); }
    } catch {
      setErr("Couldn't start a new haul. Try again.");
    }
  }

  async function saveTitle() {
    if (!activeHaul) return;
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (!t || t === activeHaul.title) return;
    await renameHaul.mutateAsync({ haulId: activeHaul.id, title: t });
    await utils.ship.galley.myHauls.invalidate();
  }

  async function uploadOne(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) return null;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setErr(`Each photo needs to be under ${MAX_PHOTO_MB}MB.`); return null; }
    const base64 = await fileToBase64(file);
    const res = await upload.mutateAsync({ fileName: file.name, fileData: base64, contentType: file.type });
    return res.url;
  }

  async function onItemPhoto(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    setUploadingItem(true);
    try {
      const url = await uploadOne(files[0]);
      if (url) setItemPhoto(url);
    } catch {
      setErr("That photo didn't upload. Try again, or just type the item.");
    } finally {
      setUploadingItem(false);
      if (itemFileRef.current) itemFileRef.current.value = "";
    }
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    // Dedupe against what's already in the haul (and any in flight).
    const have = [...items.map((i) => i.name.toLowerCase()), ...pending.map((p) => p.toLowerCase())];
    if (have.includes(n.toLowerCase())) { toast.info(`${n} is already in your haul.`); setName(""); return; }
    setErr(null);
    setName("");
    setPending((p) => [...p, n]); // optimistic echo
    const photo = itemPhoto;
    setItemPhoto(null);
    try {
      const haulId = await ensureHaul();
      await addItem.mutateAsync({ haulId, name: n, category, source, ...(photo ? { photoUrl: photo } : {}) });
      await utils.ship.galley.myHauls.invalidate();
    } catch {
      setErr("Couldn't add that item. Try again.");
    } finally {
      setPending((p) => p.filter((x) => x !== n));
    }
  }

  async function drop(itemId: number) {
    await removeItem.mutateAsync({ itemId });
    await utils.ship.galley.myHauls.invalidate();
  }

  async function toggleVisibility() {
    if (!activeHaul) return;
    const next = activeHaul.visibility === "public" ? "crew" : "public";
    await setVisibility.mutateAsync({ haulId: activeHaul.id, visibility: next });
    await utils.ship.galley.myHauls.invalidate();
  }

  async function doRemix() {
    if (!activeHaul || !items.length) return;
    setErr(null);
    setCookDish(null);
    try {
      const res = await remixMut.mutateAsync({ haulId: activeHaul.id, track });
      setDishes(res.dishes as Dish[]);
      setSuggestions(res.suggestions);
      setLastRemixId(res.remixId ?? null);
    } catch {
      setErr("The remix stalled. Try again.");
    }
  }

  async function doRoll() {
    if (!activeHaul || !items.length) return;
    setErr(null);
    try {
      const seed = Math.floor(Math.random() * 1_000_000);
      const res = await rollMut.mutateAsync({ haulId: activeHaul.id, track, seed });
      if (res.dish) { setDishes([res.dish as Dish]); setSuggestions([]); setLastRemixId(null); }
    } catch {
      setErr("The tide didn't turn. Try again.");
    }
  }

  async function onCookPhoto(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const room = MAX_PHOTOS - cookPhotos.length;
    if (room <= 0) return;
    setUploadingCook(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const url = await uploadOne(file);
        if (url) urls.push(url);
      }
      setCookPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      setErr("That photo didn't upload. Try again, or describe your haul.");
    } finally {
      setUploadingCook(false);
      if (cookFileRef.current) cookFileRef.current.value = "";
    }
  }

  async function askCook(e: React.FormEvent) {
    e.preventDefault();
    const m = cookMsg.trim();
    if (m.length < 1) return;
    const sent = cookPhotos;
    setCookTurns((t) => [...t, { role: "user", content: m, photoUrls: sent }]);
    setCookMsg("");
    setCookPhotos([]);
    setErr(null);
    try {
      const res = await cookMut.mutateAsync({
        ...(activeHaul ? { haulId: activeHaul.id } : {}),
        ...(cookRemixId ? { remixId: cookRemixId } : {}),
        message: m,
        track,
        ...(sent.length ? { photoUrls: sent } : {}),
      });
      setCookRemixId(res.remixId ?? null);
      setCookTurns((t) => [...t, { role: "assistant", content: res.reply }]);
      setCookDish((res.dish as Dish) ?? null);
    } catch {
      setCookTurns((t) => [...t, { role: "assistant", content: "I couldn't plate that just now. Try Remix, or tell me again what you gathered." }]);
    }
  }

  async function publish(remixId: number | null) {
    if (!remixId) return;
    await publishMut.mutateAsync({ remixId, visibility: "public" });
    setPublishedIds((s) => new Set(s).add(remixId));
    toast.success("Sent to the cookbook for review.");
  }

  async function addToLog(dish: Dish) {
    if (!activeBooking) return;
    const key = dish.name ?? dish.dishName ?? "dish";
    try {
      await logMut.mutateAsync({
        bookingId: activeBooking.id,
        title: (dish.name ?? dish.dishName ?? "A galley dish").slice(0, 200),
        content: dishToLogContent(dish),
        isPublic: false,
      });
      setLoggedNames((s) => new Set(s).add(key));
      toast.success("Added to your voyage log.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add to the log.");
    }
  }

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">Loading the galley…</div>;
  }

  // Logged-out visitors get the local "try it" remixer instead of a wall.
  if (!isAuthenticated) return <GalleyTryItLocal />;

  const dishKey = (d: Dish) => d.name ?? d.dishName ?? "dish";

  return (
    <div className="space-y-6">
      {/* Track choice */}
      <div>
        <GalleyTrackCards value={track} onChange={setTrack} compact />
        {track === "reset" && <p className="text-xs text-muted-foreground mt-2">{HEALTH_NOTE}</p>}
      </div>

      {/* Haul selector */}
      {hauls.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="haul-select" className="text-xs text-muted-foreground">Haul</Label>
          <select
            id="haul-select"
            value={activeHaul?.id ?? ""}
            onChange={(e) => { setActiveHaulId(Number(e.target.value)); setDishes([]); setSuggestions([]); }}
            className="h-11 sm:h-9 rounded-md border bg-background px-2 text-sm max-w-[60%]"
          >
            {hauls.map((h) => <option key={h.id} value={h.id}>{haulLabel(h)}</option>)}
          </select>
          <Button type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-0" onClick={() => void startNewHaul()} disabled={createHaul.isPending}>
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> New haul
          </Button>
        </div>
      )}

      {/* The pantry: add + chips */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          {editingTitle && activeHaul ? (
            <span className="flex items-center gap-1.5">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} maxLength={200} className="h-9 w-48" placeholder="Name this haul" />
              <Button type="button" size="sm" variant="ghost" onClick={() => void saveTitle()} aria-label="Save name"><Check className="w-4 h-4" aria-hidden="true" /></Button>
            </span>
          ) : (
            <h3 className="text-lg font-semibold flex items-center gap-1.5">
              {activeHaul ? haulLabel(activeHaul) : "Your pantry"}
              {activeHaul && (
                <button type="button" onClick={() => { setTitleDraft(activeHaul.title ?? ""); setEditingTitle(true); }} className="text-muted-foreground hover:text-foreground p-2.5 -m-2 inline-flex items-center justify-center" aria-label="Rename haul">
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </h3>
          )}
          {activeHaul && (
            <button
              type="button"
              onClick={() => void toggleVisibility()}
              className="inline-flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 min-h-11 sm:min-h-0"
              aria-label="Toggle who can see this haul"
            >
              {activeHaul.visibility === "public" ? <Globe className="w-3.5 h-3.5" aria-hidden="true" /> : <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
              {activeHaul.visibility === "public" ? "Public" : "Crew only"}
            </button>
          )}
        </div>

        {(items.length > 0 || pending.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {items.map((it) => (
              <span key={it.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#4a7c59]/10 border border-[#4a7c59]/30 pl-1 pr-2 py-1 text-sm">
                {it.photoUrl ? (
                  <img src={it.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#4a7c59]/20 flex items-center justify-center text-[11px]" aria-hidden="true">🥬</span>
                )}
                {it.name}
                <button type="button" aria-label={`Remove ${it.name}`} onClick={() => void drop(it.id)} className="ml-0.5 text-muted-foreground hover:text-foreground p-2.5 -m-2 inline-flex items-center justify-center">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
            {pending.map((p) => (
              <span key={`pending-${p}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#4a7c59]/5 border border-dashed border-[#4a7c59]/30 pl-2.5 pr-2 py-1 text-sm opacity-60">
                {p} <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              </span>
            ))}
          </div>
        )}

        <form onSubmit={submitItem} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="What did you gather? (watermelon, kale, avocado…)" className="text-base" />
            <div className="flex gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-11 rounded-md border bg-background px-2 text-base md:text-sm" aria-label="Category">
                {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="h-11 rounded-md border bg-background px-2 text-base md:text-sm" aria-label="Where from">
                {ITEM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {itemPhoto && (
            <div className="relative inline-block">
              <img src={itemPhoto} alt="item" className="w-16 h-16 rounded-lg object-cover border" />
              <button type="button" aria-label="Remove photo" onClick={() => setItemPhoto(null)} className="absolute -top-2.5 -right-2.5 bg-background border rounded-full p-2">
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={uploadingItem || !name.trim()} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add
            </Button>
            <input ref={itemFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onItemPhoto(e.target.files)} />
            <Button type="button" variant="outline" className="min-h-11" disabled={uploadingItem} onClick={() => itemFileRef.current?.click()}>
              {uploadingItem ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
              <span className="ml-1.5">Snap it</span>
            </Button>
          </div>
        </form>
      </div>

      {/* The two engines */}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void doRemix()} disabled={remixMut.isPending || !items.length} className="min-h-11 bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d]">
          <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" /> {remixMut.isPending ? "Remixing…" : "Remix it"}
        </Button>
        <Button type="button" onClick={() => void doRoll()} disabled={rollMut.isPending || !items.length} variant="outline" className="min-h-11">
          <Dice5 className="w-4 h-4 mr-1.5" aria-hidden="true" /> Roll the Tide
        </Button>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      {/* Remix results */}
      {dishes.length > 0 && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {dishes.map((dish, i) => (
              <GalleyDishCard
                key={dish.cardSlug ?? i}
                dish={dish}
                onPublish={lastRemixId ? () => void publish(lastRemixId) : undefined}
                publishing={publishMut.isPending}
                published={lastRemixId ? publishedIds.has(lastRemixId) : false}
                onAddToLog={activeBooking ? () => void addToLog(dish) : undefined}
                addingToLog={logMut.isPending}
                addedToLog={loggedNames.has(dishKey(dish))}
              />
            ))}
          </div>
          {suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Thin haul. Grab a little more from the valley to unlock more dishes: {suggestions.join(", ")}.
            </p>
          )}
        </div>
      )}

      {/* Ask the Ship's Cook */}
      <div className="rounded-2xl border bg-gradient-to-br from-[#b5651d]/8 to-[#ffd700]/6 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ChefHat className="w-5 h-5 text-[#b5651d]" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Ask the Ship's Yum Dealer</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Want something wilder? Tell the Yum Dealer what you're after, or snap your haul, and she'll dream up a dish that
          fits your track. She's a natural hygienist, so ask her why we eat this way aboard and she'll tell you.
          She's a yum dealer, not a doctor, so anything to do with your health goes to a professional.
        </p>

        {cookTurns.length > 0 && (
          <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
            {cookTurns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "text-right" : ""}>
                <div className={["inline-block rounded-2xl px-3 py-2 text-sm text-left max-w-[90%]", t.role === "user" ? "bg-[#2f5d3a] text-white" : "bg-muted text-foreground"].join(" ")}>
                  {t.photoUrls && t.photoUrls.length > 0 && (
                    <span className="flex gap-1.5 mb-1.5">
                      {t.photoUrls.map((u) => <img key={u} src={u} alt="haul" className="w-12 h-12 rounded-lg object-cover border border-white/30" loading="lazy" />)}
                    </span>
                  )}
                  <span className="whitespace-pre-line">{t.content}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {cookDish && (
          <div className="mb-4">
            <GalleyDishCard
              dish={cookDish}
              onPublish={cookRemixId ? () => void publish(cookRemixId) : undefined}
              publishing={publishMut.isPending}
              published={cookRemixId ? publishedIds.has(cookRemixId) : false}
              onAddToLog={activeBooking ? () => void addToLog(cookDish) : undefined}
              addingToLog={logMut.isPending}
              addedToLog={loggedNames.has(dishKey(cookDish))}
            />
          </div>
        )}

        <form onSubmit={askCook} className="space-y-3">
          <div>
            <Label htmlFor="cook-msg" className="text-xs">What are you in the mood for?</Label>
            <Textarea id="cook-msg" value={cookMsg} onChange={(e) => setCookMsg(e.target.value)} rows={2} maxLength={1000} placeholder="Something cool for a hot afternoon, using my melon and cucumber." className="text-base" />
          </div>
          {cookPhotos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {cookPhotos.map((u) => (
                <div key={u} className="relative">
                  <img src={u} alt="to send" className="w-16 h-16 rounded-lg object-cover border" />
                  <button type="button" aria-label="Remove photo" onClick={() => setCookPhotos((p) => p.filter((x) => x !== u))} className="absolute -top-2.5 -right-2.5 bg-background border rounded-full p-2">
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={cookMut.isPending || uploadingCook || cookMsg.trim().length < 1} className="min-h-11 bg-[#b5651d] hover:bg-[#9c531a] text-white">
              {cookMut.isPending ? "Cooking…" : "Ask the Yum Dealer"}
            </Button>
            <input ref={cookFileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void onCookPhoto(e.target.files)} />
            <Button type="button" variant="outline" className="min-h-11" disabled={uploadingCook || cookPhotos.length >= MAX_PHOTOS} onClick={() => cookFileRef.current?.click()}>
              {uploadingCook ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Camera className="w-4 h-4" aria-hidden="true" />}
              <span className="ml-1.5">{cookPhotos.length ? `Photos (${cookPhotos.length}/${MAX_PHOTOS})` : "Snap your haul"}</span>
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-3">{HEALTH_NOTE}</p>
      </div>
    </div>
  );
}
