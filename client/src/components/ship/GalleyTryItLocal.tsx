/**
 * The logged-out "try it" remixer. The deterministic engine is pure and shared,
 * so a visitor can taste the Galley without an account: type what they have, pick
 * a track, and remix locally in the browser. Saving, photos, the Ship's Cook, and
 * quest points live behind sign-in, so the wall becomes an invitation instead of
 * a dead end.
 */
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { remixHaul, rollRemix } from "@shared/galleyRemix";
import { GalleyTrackCards, HEALTH_NOTE, type TrackId } from "./GalleyTracks";
import { GalleyDishCard, type Dish } from "./GalleyDishCard";
import { Sparkles, Dice5, Plus, X, ChefHat } from "lucide-react";

export function GalleyTryItLocal() {
  const [items, setItems] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [track, setTrack] = useState<TrackId>("table");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (items.some((i) => i.toLowerCase() === n.toLowerCase())) { setName(""); return; }
    setItems((xs) => [...xs, n]);
    setName("");
  }

  function remix() {
    if (!items.length) return;
    const res = remixHaul(items.map((n) => ({ name: n })), track, 3);
    setDishes(res.dishes as Dish[]);
    setSuggestions(res.suggestions);
  }

  function roll() {
    if (!items.length) return;
    const seed = Math.floor(Math.random() * 1_000_000);
    const dish = rollRemix(items.map((n) => ({ name: n })), track, seed);
    if (dish) { setDishes([dish as Dish]); setSuggestions([]); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#ffd700]/50 bg-[#ffd700]/8 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <p className="text-sm text-foreground/85">
          Give it a try right here. To save your haul, cook with the Ship's Cook, and earn quest points, sign in with
          your ReGen Civics account.
        </p>
        <Button asChild className="bg-[#2f5d3a] hover:bg-[#264a2f] min-h-11 shrink-0">
          <a href={getLoginUrl()}><ChefHat className="w-4 h-4 mr-1.5" aria-hidden="true" /> Sign in to save + cook</a>
        </Button>
      </div>

      <div>
        <GalleyTrackCards value={track} onChange={setTrack} compact />
        {track === "reset" && <p className="text-xs text-muted-foreground mt-2">{HEALTH_NOTE}</p>}
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold mb-3">Your pantry</h3>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {items.map((it) => (
              <span key={it} className="inline-flex items-center gap-1.5 rounded-full bg-[#4a7c59]/10 border border-[#4a7c59]/30 pl-2.5 pr-2 py-1 text-sm">
                {it}
                <button type="button" aria-label={`Remove ${it}`} onClick={() => setItems((xs) => xs.filter((x) => x !== it))} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={add} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="What did you gather? (watermelon, kale, avocado…)" className="text-base" />
          <Button type="submit" disabled={!name.trim()} className="min-h-11 bg-[#2f5d3a] hover:bg-[#264a2f]"><Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add</Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={remix} disabled={!items.length} className="min-h-11 bg-[#ffd700] text-[#1a472a] font-bold hover:bg-[#ffe14d]">
          <Sparkles className="w-4 h-4 mr-1.5" aria-hidden="true" /> Remix it
        </Button>
        <Button type="button" onClick={roll} disabled={!items.length} variant="outline" className="min-h-11">
          <Dice5 className="w-4 h-4 mr-1.5" aria-hidden="true" /> Roll the Tide
        </Button>
      </div>

      {dishes.length > 0 && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {dishes.map((dish, i) => <GalleyDishCard key={dish.cardSlug ?? i} dish={dish} />)}
          </div>
          {suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Thin haul. Grab a little more from the valley to unlock more dishes: {suggestions.join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
