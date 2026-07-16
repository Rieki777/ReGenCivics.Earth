/**
 * The interactive free-voyage ladder. Reads the live booking status and lets
 * the reader drag to preview how many voyages sail free at any level of
 * bookings. Used on /ship/quest (theme-aware) and in the blog article
 * (onDark, white text for the dark article background).
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Ship, Trophy } from "lucide-react";
import { MAX_FREE_VOYAGES, FREE_VOYAGE_RELEASE_MILESTONES, freeVoyagesUnlocked } from "@shared/shipFreeVoyage";

export function FreeVoyageLadder({ onDark = false }: { onDark?: boolean }) {
  const { data } = trpc.ship.quest.freeVoyageStatus.useQuery(undefined, { staleTime: 30_000 });
  const livePct = data?.percentBooked ?? 0;
  const poolSize = data?.poolSize ?? 0;

  const [preview, setPreview] = useState<number | null>(null);
  const shownPct = preview ?? livePct;
  const shownUnlocked = freeVoyagesUnlocked(shownPct);
  const isPreviewing = preview !== null && preview !== livePct;

  const tiles = Array.from({ length: MAX_FREE_VOYAGES }, (_, i) => {
    const voyage = i + 1;
    // Voyage 1 is the launch draw; voyages 2..6 release on the milestone schedule.
    const unlocksAt = i === 0 ? 0 : FREE_VOYAGE_RELEASE_MILESTONES[i - 1];
    return { voyage, unlocksAt, lit: shownUnlocked >= voyage, newest: shownUnlocked === voyage };
  });

  // Theme classes: onDark forces light text (dark blog bg); default is
  // theme-aware via semantic tokens (works in the app's light and dark modes).
  const c = {
    container: onDark
      ? "border-[#ffd700]/30 bg-gradient-to-br from-[#ffd700]/10 to-[#2f5d3a]/20"
      : "border bg-card",
    heading: onDark ? "text-white" : "text-foreground",
    sub: onDark ? "text-white/70" : "text-muted-foreground",
    tileUnlit: onDark ? "border-white/10 bg-white/5 text-white/40" : "border-[#4a7c59]/20 bg-[#4a7c59]/5 text-muted-foreground",
    tileLitText: onDark ? "text-white" : "text-foreground",
    iconUnlit: onDark ? "text-white/30" : "text-muted-foreground/40",
    label: onDark ? "text-white/60" : "text-muted-foreground",
    readout: onDark ? "text-white/85" : "text-foreground/85",
    live: onDark ? "text-white/55" : "text-muted-foreground",
    backLink: onDark ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground",
  };

  return (
    <div className={cn("rounded-2xl border p-5 sm:p-7", c.container)}>
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-5 w-5 text-[#ffd700]" />
        <h3 className={cn("text-lg font-bold", c.heading)}>The free-voyage ladder</h3>
      </div>
      <p className={cn("text-sm mb-5", c.sub)}>The first free voyage is drawn August 16. More unlock at 40%, 60%, 75%, 85%, and 95% booked, up to six. Drag to see how it grows.</p>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-5">
        {tiles.map((t) => (
          <div
            key={t.voyage}
            className={cn(
              "relative rounded-xl border p-3 text-center transition-all duration-500",
              t.lit ? cn("border-[#ffd700] bg-[#ffd700]/20", c.tileLitText) : c.tileUnlit,
              t.lit && t.newest && "animate-glow",
            )}
          >
            <Ship className={cn("h-6 w-6 mx-auto mb-1", t.lit ? "text-[#ffd700]" : c.iconUnlit)} />
            <div className="text-xs font-semibold">Voyage {t.voyage}</div>
            <div className="text-[10px] opacity-70">{t.voyage === 1 ? "First draw" : `${t.unlocksAt}% booked`}</div>
          </div>
        ))}
      </div>

      <label className={cn("block text-xs mb-1", c.label)} htmlFor="ladder-slider">Bookings this year: {shownPct}%</label>
      <input
        id="ladder-slider"
        type="range"
        min={0}
        max={100}
        value={shownPct}
        onChange={(e) => setPreview(Number(e.target.value))}
        className="w-full accent-[#ffd700]"
        aria-label="Preview bookings percent"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm">
        <span className={c.readout}>
          At <b className="text-[#ffd700]">{shownPct}%</b> booked, <b className="text-[#ffd700]">{shownUnlocked}</b> of {MAX_FREE_VOYAGES} voyages sail free.
        </span>
        {isPreviewing && (
          <button onClick={() => setPreview(null)} className={cn("text-xs underline", c.backLink)}>Back to live</button>
        )}
      </div>
      <p className={cn("mt-3 text-xs", c.live)}>
        Live now: {freeVoyagesUnlocked(livePct)} of {MAX_FREE_VOYAGES} unlocked at {livePct}% booked, {poolSize} {poolSize === 1 ? "crew" : "crews"} in the draw.
      </p>
    </div>
  );
}
