/**
 * What's Aboard? Remix It (Galley spec section 6). The centerpiece of /ship/galley.
 *
 * Logged-in crew log what they gathered (type it or snap a photo), pick a track,
 * and remix it into dishes. Two engines: Remix (deterministic, instant, works with
 * no LLM) and Ask the Ship's Cook (AI, sees the photos). Hauls and remixes save to
 * the crew's account and link to the active voyage. A favorite can be sent to the
 * shared cookbook for review.
 *
 * Photos upload through files.upload to the asset domain, the same path the
 * Shipwright uses; the server hands only our own asset URLs to the Cook's vision.
 */
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GalleyTrackCards, HEALTH_NOTE, type TrackId } from "./GalleyTracks";
import {
  Sparkles, ChefHat, Camera, X, Loader2, Plus, Dice5, Globe, Lock, BookOpen,
} from "lucide-react";

const ITEM_CATEGORIES = ["produce", "pantry", "protein", "sauce", "other"] as const;
const ITEM_SOURCES = ["market", "ship", "forage", "store"] as const;
const MAX_PHOTOS = 4;
const MAX_PHOTO_MB = 8;

type Dish = {
  cardSlug?: string;
  name?: string;
  dishName?: string;
  base?: string[];
  fillings?: string[];
  toppings?: string[];
  sauce?: string[];
  method?: string;
  why?: string;
  matchedTokens?: string[];
};
type CookTurn = { role: "user" | "assistant"; content: string; photoUrls?: string[] };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** A composed dish, shown the same whether it came from Remix or the Cook. */
function DishCard({
  dish,
  onPublish,
  publishing,
  published,
}: {
  dish: Dish;
  onPublish?: () => void;
  publishing?: boolean;
  published?: boolean;
}) {
  const name = dish.name ?? dish.dishName ?? "A galley dish";
  const rows: Array<[string, string[] | undefined]> = [
    ["Base", dish.base],
    ["Fill", dish.fillings],
    ["Top", dish.toppings],
    ["Sauce", dish.sauce],
  ];
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h4 className="font-semibold text-lg mb-2 text-[#2f5d3a] dark:text-[#9de89d]">{name}</h4>
      <div className="space-y-1 mb-3">
        {rows.map(([label, vals]) =>
          vals && vals.length ? (
            <p key={label} className="text-sm">
              <span className="uppercase tracking-wide text-[11px] font-semibold text-muted-foreground mr-2">{label}</span>
              {vals.join(", ")}
            </p>
          ) : null,
        )}
      </div>
      {dish.method && <p className="text-sm text-foreground/90 mb-2">{dish.method}</p>}
      {dish.why && <p className="text-sm italic text-[#8a5a2b] dark:text-[#e0b483]">{dish.why}</p>}
      {onPublish && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 min-h-11"
          disabled={publishing || published}
          onClick={onPublish}
        >
          <BookOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {published ? "Sent for review" : publishing ? "Sending…" : "Add to the cookbook"}
        </Button>
      )}
    </div>
  );
}

export function GalleyRemixer() {
  const { isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();

  const haulsQuery = trpc.ship.galley.myHauls.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const createHaul = trpc.ship.galley.createHaul.useMutation();
  const addItem = trpc.ship.galley.addItem.useMutation();
  const removeItem = trpc.ship.galley.removeItem.useMutation();
  const setVisibility = trpc.ship.galley.setHaulVisibility.useMutation();
  const remixMut = trpc.ship.galley.remix.useMutation();
  const rollMut = trpc.ship.galley.roll.useMutation();
  const cookMut = trpc.ship.galley.cook.useMutation();
  const publishMut = trpc.ship.galley.publishToCookbook.useMutation();
  const upload = trpc.files.upload.useMutation();

  const [activeHaulId, setActiveHaulId] = useState<number | null>(null);
  const [track, setTrack] = useState<TrackId>("table");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof ITEM_CATEGORIES)[number]>("produce");
  const [source, setSource] = useState<(typeof ITEM_SOURCES)[number]>("market");
  const [itemPhoto, setItemPhoto] = useState<string | null>(null);
  const [uploadingItem, setUploadingItem] = useState(false);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastRemixId, setLastRemixId] = useState<number | null>(null);
  const [publishedIds, setPublishedIds] = useState<Set<number>>(new Set());

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

  async function ensureHaul(): Promise<number> {
    if (activeHaul) return activeHaul.id;
    const res = await createHaul.mutateAsync({ title: "My market haul" });
    await utils.ship.galley.myHauls.invalidate();
    const id = res.id ?? 0;
    setActiveHaulId(id);
    return id;
  }

  async function uploadOne(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) return null;
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setErr(`Each photo needs to be under ${MAX_PHOTO_MB}MB.`);
      return null;
    }
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
    setErr(null);
    try {
      const haulId = await ensureHaul();
      await addItem.mutateAsync({ haulId, name: n, category, source, ...(itemPhoto ? { photoUrl: itemPhoto } : {}) });
      setName("");
      setItemPhoto(null);
      await utils.ship.galley.myHauls.invalidate();
    } catch {
      setErr("Couldn't add that item. Try again.");
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
      if (res.dish) {
        setDishes([res.dish as Dish]);
        setSuggestions([]);
        setLastRemixId(null);
      }
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
  }

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">Loading the galley…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <ChefHat className="w-8 h-8 mx-auto text-[#b5651d] mb-3" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">Cook from your own haul</h3>
        <p className="text-foreground/80 mb-4 max-w-md mx-auto">
          Sign in with your ReGen Civics account to log what you gathered and remix it into dishes. Your hauls and
          recipes save to your voyage.
        </p>
        <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f] min-h-11">
          <a href={getLoginUrl()}>Sign in to cook</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Track choice */}
      <div>
        <GalleyTrackCards value={track} onChange={setTrack} compact />
      </div>

      {/* The pantry: add + chips */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold">Your pantry</h3>
          {activeHaul && (
            <button
              type="button"
              onClick={toggleVisibility}
              className="inline-flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 min-h-11 sm:min-h-0"
              aria-label="Toggle who can see this haul"
            >
              {activeHaul.visibility === "public" ? <Globe className="w-3.5 h-3.5" aria-hidden="true" /> : <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
              {activeHaul.visibility === "public" ? "Public" : "Crew only"}
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {items.map((it) => (
              <span key={it.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#4a7c59]/10 border border-[#4a7c59]/30 pl-1 pr-2 py-1 text-sm">
                {it.photoUrl ? (
                  <img src={it.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#4a7c59]/20 flex items-center justify-center text-[11px]" aria-hidden="true">🥬</span>
                )}
                {it.name}
                <button type="button" aria-label={`Remove ${it.name}`} onClick={() => void drop(it.id)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={submitItem} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              placeholder="What did you gather? (watermelon, kale, avocado…)"
              className="text-base"
            />
            <div className="flex gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-11 rounded-md border bg-background px-2 text-sm" aria-label="Category">
                {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={source} onChange={(e) => setSource(e.target.value as typeof source)} className="h-11 rounded-md border bg-background px-2 text-sm" aria-label="Where from">
                {ITEM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {itemPhoto && (
            <div className="relative inline-block">
              <img src={itemPhoto} alt="item" className="w-16 h-16 rounded-lg object-cover border" />
              <button type="button" aria-label="Remove photo" onClick={() => setItemPhoto(null)} className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5">
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={addItem.isPending || uploadingItem || !name.trim()} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]">
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
        <Button type="button" onClick={doRemix} disabled={remixMut.isPending || !items.length} className="min-h-11 bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d]">
          <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" /> {remixMut.isPending ? "Remixing…" : "Remix it"}
        </Button>
        <Button type="button" onClick={doRoll} disabled={rollMut.isPending || !items.length} variant="outline" className="min-h-11">
          <Dice5 className="w-4 h-4 mr-1.5" aria-hidden="true" /> Roll the Tide
        </Button>
      </div>

      {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}

      {/* Remix results */}
      {dishes.length > 0 && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {dishes.map((dish, i) => (
              <DishCard
                key={dish.cardSlug ?? i}
                dish={dish}
                onPublish={lastRemixId ? () => void publish(lastRemixId) : undefined}
                publishing={publishMut.isPending}
                published={lastRemixId ? publishedIds.has(lastRemixId) : false}
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
          <h3 className="text-lg font-semibold">Ask the Ship's Cook</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Want something wilder? Tell the Cook what you're after, or snap your haul, and she'll dream up a dish that fits your track.
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
            <DishCard
              dish={cookDish}
              onPublish={cookRemixId ? () => void publish(cookRemixId) : undefined}
              publishing={publishMut.isPending}
              published={cookRemixId ? publishedIds.has(cookRemixId) : false}
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
                  <button type="button" aria-label="Remove photo" onClick={() => setCookPhotos((p) => p.filter((x) => x !== u))} className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5">
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={cookMut.isPending || uploadingCook || cookMsg.trim().length < 1} className="min-h-11 bg-[#b5651d] hover:bg-[#9c531a] text-white">
              {cookMut.isPending ? "Cooking…" : "Ask the Cook"}
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
