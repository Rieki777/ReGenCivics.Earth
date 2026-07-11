/**
 * Interactive content blocks for the ReGen Ship blog post. Rendered via
 * SPECIAL_MARKERS in BlogPost.tsx so the key sections read as designed,
 * active elements instead of plain paragraphs. These render on the dark
 * article background, so text is light with green and gold accents.
 */
import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Anchor, Ship, Sparkles, Trophy, Share2, ClipboardCheck, Dice5, ArrowRight } from "lucide-react";

const FREE_TOTAL = 6;
const MILESTONE = 20;
function unlockedAt(percent: number): number {
  return Math.min(FREE_TOTAL, 1 + Math.floor(Math.max(0, Math.min(100, percent)) / MILESTONE));
}

/**
 * The centerpiece: a live, playable ladder of the six free voyages. It reads
 * the real booking status, and the reader can drag the slider to see what
 * unlocks at any level of bookings.
 */
export function FreeVoyageLadder() {
  const { data } = trpc.ship.quest.freeVoyageStatus.useQuery(undefined, { staleTime: 30_000 });
  const livePct = data?.percentBooked ?? 0;
  const poolSize = data?.poolSize ?? 0;

  const [preview, setPreview] = useState<number | null>(null);
  const shownPct = preview ?? livePct;
  const shownUnlocked = unlockedAt(shownPct);
  const isPreviewing = preview !== null && preview !== livePct;

  const tiles = Array.from({ length: FREE_TOTAL }, (_, i) => {
    const voyage = i + 1;
    const unlocksAt = i * MILESTONE; // voyage 1 at 0% (launch), voyage 2 at 20%, ...
    const lit = shownUnlocked >= voyage;
    const newest = lit && shownUnlocked === voyage;
    return { voyage, unlocksAt, lit, newest };
  });

  return (
    <div className="my-10 rounded-2xl border border-[#ffd700]/30 bg-gradient-to-br from-[#ffd700]/10 to-[#2f5d3a]/20 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-5 w-5 text-[#ffd700]" />
        <h3 className="text-lg font-bold text-white">The free-voyage ladder</h3>
      </div>
      <p className="text-sm text-white/70 mb-5">The maiden voyage sails free. Every 20% of the year that books unlocks one more, up to six. Drag to see how it grows.</p>

      {/* The six voyage tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-5">
        {tiles.map((t) => (
          <div
            key={t.voyage}
            className={`relative rounded-xl border p-3 text-center transition-all duration-500 ${
              t.lit
                ? "border-[#ffd700] bg-[#ffd700]/20 text-white"
                : "border-white/10 bg-white/5 text-white/40"
            } ${t.newest ? "animate-glow" : ""}`}
          >
            <Ship className={`h-6 w-6 mx-auto mb-1 ${t.lit ? "text-[#ffd700]" : "text-white/30"}`} />
            <div className="text-xs font-semibold">Voyage {t.voyage}</div>
            <div className="text-[10px] opacity-70">{t.voyage === 1 ? "Launch" : `${t.unlocksAt}% booked`}</div>
          </div>
        ))}
      </div>

      {/* Interactive slider */}
      <label className="block text-xs text-white/60 mb-1" htmlFor="ladder-slider">Bookings this year: {shownPct}%</label>
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
        <span className="text-white/85">
          At <b className="text-[#ffd700]">{shownPct}%</b> booked, <b className="text-[#ffd700]">{shownUnlocked}</b> of {FREE_TOTAL} voyages sail free.
        </span>
        {isPreviewing && (
          <button onClick={() => setPreview(null)} className="text-xs underline text-white/60 hover:text-white">Back to live</button>
        )}
      </div>
      <p className="mt-3 text-xs text-white/55">
        Live now: {unlockedAt(livePct)} of {FREE_TOTAL} unlocked at {livePct}% booked, {poolSize} {poolSize === 1 ? "crew" : "crews"} in the draw.
      </p>
    </div>
  );
}

/** Three active cards: complete the quest, you're in the draw, bookings unlock more. */
export function ShipQuestSteps() {
  const steps = [
    { icon: ClipboardCheck, title: "Complete the quest", body: "Real regenerative actions, each one verified. It takes at least a week, so no one has to rush." },
    { icon: Dice5, title: "You're in the draw", body: "Every crew who completes it goes in the same draw. Ties are settled at random, because the whole draw is random." },
    { icon: Share2, title: "Bookings unlock more", body: "Help fill the calendar. Every 20% booked draws another free voyage, and you're in every single draw." },
  ];
  return (
    <div className="my-8 grid gap-3 sm:grid-cols-3">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <div key={title} className="rounded-xl border border-[#7dd87d]/20 bg-[#7dd87d]/5 p-4 transition-all hover:-translate-y-1 hover:border-[#7dd87d]/40 hover:bg-[#7dd87d]/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffd700]/20 text-[#ffd700] font-bold text-sm">{i + 1}</span>
            <Icon className="h-5 w-5 text-[#7dd87d]" />
          </div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-snug text-white/70">{body}</p>
        </div>
      ))}
    </div>
  );
}

/** Closing call to action, a glowing gold panel. */
export function ShipArticleCTA() {
  const links: Array<{ href: string; label: string; primary?: boolean }> = [
    { href: "/ship/quest", label: "Enter the quest", primary: true },
    { href: "/ship/quest/rules", label: "Read the rules" },
    { href: "/ship", label: "See the ship" },
  ];
  return (
    <div className="my-10 quest-card-gold rounded-2xl border border-[#ffd700]/50 bg-gradient-to-br from-[#ffd700]/15 to-[#d4a574]/10 p-6 text-center">
      <Anchor className="h-8 w-8 mx-auto text-[#ffd700] mb-2" />
      <h3 className="text-xl font-bold text-white mb-1">The maiden voyage sails this August</h3>
      <p className="text-white/80 mb-5">The more of us who help her fill the calendar, the more of us sail free.</p>
      <div className="flex flex-wrap justify-center gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
              l.primary
                ? "bg-[#ffd700] text-[#1a472a] hover:bg-[#ffe14d]"
                : "border border-white/40 text-white hover:bg-white/10"
            }`}
          >
            {l.label} {l.primary && <ArrowRight className="h-4 w-4" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** A large pull quote to break up the reading and set the tone. */
export function ShipPullQuote() {
  return (
    <blockquote className="my-10 border-l-4 border-[#ffd700] pl-5">
      <p className="text-xl sm:text-2xl font-semibold text-white leading-snug flex items-start gap-2">
        <Sparkles className="h-6 w-6 text-[#ffd700] flex-shrink-0 mt-1" />
        The more the fleet sails, the more of us sail free.
      </p>
    </blockquote>
  );
}
