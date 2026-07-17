/**
 * Shared building blocks for the ReGen Ship pages (/ship/*). Kept in one place
 * so every page shares the same look, the same price display, and the same
 * graceful image fallback (so pages never break when an image is missing).
 */
import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export const ANCHOR_NIGHTLY = 600;
export const TRIAL_NIGHTLY = 299;
// Pricing is per voyage now (Mon 3pm board to Sun 11am return). Keep these in
// sync with server/lib/ship-config.ts (ANCHOR_VOYAGE_USD / TRIAL_TOTAL_VOYAGE_USD).
export const ANCHOR_VOYAGE = ANCHOR_NIGHTLY * 7; // 4200, struck through
export const TRIAL_VOYAGE = TRIAL_NIGHTLY * 7; // 2093, the trial-year voyage total
export const SHIP_TAGLINE = "Visiting the most beautiful places on earth in reverence and regeneration.";
export const CHESTNUT_URL = "https://regencivics.earth/blog/great-american-chestnut-abundance";

/** Local image path. Assets live in client/public/images/ship/. */
export function shipImg(name: string): string {
  return `/images/ship/${name}`;
}

/**
 * An image that degrades to a warm gradient block if the file is missing.
 * Interior shots are intentionally empty-state until Rye's real photos land.
 */
export function ShipImage({
  name,
  alt,
  className,
  rounded = true,
}: {
  name: string;
  alt: string;
  className?: string;
  rounded?: boolean;
}) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-[#2f5d3a] via-[#4a7c59] to-[#d4a574] text-white/70",
          rounded && "rounded-2xl",
          className,
        )}
      >
        <span className="text-4xl" aria-hidden="true">⚓</span>
      </div>
    );
  }
  return (
    <img
      src={shipImg(name)}
      alt={alt}
      loading="lazy"
      onError={() => setErr(true)}
      className={cn("object-cover w-full h-full", rounded && "rounded-2xl", className)}
    />
  );
}

/** Empty-state slot for interior gallery photos still to come. */
export function InteriorPlaceholder({ label }: { label: string }) {
  return (
    <div className="aspect-[4/3] rounded-2xl border border-dashed border-[#4a7c59]/40 bg-[#4a7c59]/5 flex flex-col items-center justify-center text-center p-6">
      <span className="text-3xl mb-2" aria-hidden="true">📷</span>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Interior tour coming aboard soon</p>
    </div>
  );
}

/** The price display: per-voyage anchor struck through, trial voyage rate shown. */
export function PriceTag({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-3 flex-wrap", className)}>
      <span className="text-muted-foreground line-through text-xl">${ANCHOR_VOYAGE.toLocaleString()}</span>
      <span className="text-3xl font-bold text-[#2f5d3a] dark:text-[#9de89d]">${TRIAL_VOYAGE.toLocaleString()}</span>
      <span className="text-muted-foreground">per voyage week, trial year</span>
      <span className="text-xs text-muted-foreground/80 w-full">Her ${ANCHOR_NIGHTLY}/night value, one Monday-to-Sunday voyage at a time.</span>
    </div>
  );
}

export function ShipSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-14 px-4", className)}>
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

export function ShipEyebrow({ children }: { children: ReactNode }) {
  return <p className="uppercase tracking-widest text-xs font-semibold text-[#4a7c59] dark:text-[#7dd87d] mb-3">{children}</p>;
}

/**
 * The ship's sub-page navigation as image cards. Each destination carries a
 * picture, like the ReGen Civics landing cards. Three across on mobile, a
 * single row of eight on desktop. Cards zoom on hover and reveal on scroll.
 */
const NAV_CARDS: Array<{ href: string; label: string; image: string; alt: string }> = [
  { href: "/ship", label: "The Ship", image: "ship-cascadia-forest.jpg", alt: "The ship in the forest." },
  { href: "/ship/theme", label: "The Theme", image: "ship-double-rainbow.jpg", alt: "A double rainbow over the ship." },
  { href: "/ship/book", label: "Book", image: "ship-lake-powell-overlook.jpg", alt: "A lake vista." },
  { href: "/ship/map", label: "Treasure Map", image: "ship-treasure-map-hero.jpg", alt: "A treasure map." },
  { href: "/ship/galley", label: "The Galley", image: "ship-galley-table.webp", alt: "A galley table of ripe fruit and greens." },
  { href: "/ship/quest", label: "The Quest", image: "ship-quest-banner.jpg", alt: "A trail under a rainbow." },
  { href: "/ship/fleet", label: "The Fleet", image: "ship-fleet-caravan.jpg", alt: "A caravan of ships." },
  { href: "/ship/log", label: "Voyage Log", image: "ship-campfire-dusk.jpg", alt: "A campfire at dusk." },
];

export function ShipNavRow({ current }: { current?: string }) {
  return (
    <nav aria-label="ReGen Ship pages" className="max-w-5xl mx-auto px-4 py-5">
      <div className="grid grid-cols-3 md:grid-cols-8 gap-2 sm:gap-3">
        {NAV_CARDS.map((c, i) => {
          const active = current === c.href;
          return (
            <Link
              key={c.href}
              href={c.href}
              data-reveal
              data-reveal-delay={i * 60}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative block overflow-hidden rounded-xl aspect-[4/3] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]",
                active ? "ring-2 ring-[#ffd700] shadow-lg" : "ring-1 ring-black/10",
              )}
            >
              <img
                src={shipImg(c.image)}
                alt={c.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <span className={cn(
                "absolute inset-x-0 bottom-0 p-1.5 sm:p-2 text-center text-white font-semibold leading-tight text-[11px] sm:text-sm",
                active && "text-[#ffd700]",
              )}>
                {c.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Secondary legal/utility links, kept off the image-card grid. */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Link
          href="/ship/terms"
          aria-current={current === "/ship/terms" ? "page" : undefined}
          className={cn(
            "underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700] rounded",
            current === "/ship/terms" ? "text-[#2f5d3a] dark:text-[#7dd87d] font-medium underline" : "hover:text-foreground",
          )}
        >
          Voyage Covenant &amp; Rental Terms
        </Link>
      </div>
    </nav>
  );
}

/** Feature flags (which env-gated pieces are live). Safe default while loading. */
export function useShipFlags() {
  const q = trpc.ship.featureFlags.useQuery(undefined, { staleTime: 60_000 });
  return (
    q.data ?? {
      concierge: false,
      offering: false,
      offeringUrl: null as string | null,
      gift: false,
      giftUrl: null as string | null,
      platformListing: false,
      platformListingUrl: null as string | null,
      tracker: false,
      sponsor: false,
      entryThreshold: 150,
      sponsorGoalCents: 210000,
    }
  );
}
