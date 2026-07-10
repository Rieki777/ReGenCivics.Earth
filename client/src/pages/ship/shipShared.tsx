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

/** The two-line price display: anchor struck through, trial rate shown. */
export function PriceTag({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span className="text-muted-foreground line-through text-xl">${ANCHOR_NIGHTLY}</span>
      <span className="text-3xl font-bold text-[#2f5d3a]">${TRIAL_NIGHTLY}</span>
      <span className="text-muted-foreground">/ night, trial year</span>
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
  return <p className="uppercase tracking-widest text-xs font-semibold text-[#4a7c59] mb-3">{children}</p>;
}

/** A small link row of the ship's sub-pages, used as secondary nav on pages. */
export function ShipNavRow({ current }: { current?: string }) {
  const links: Array<[string, string]> = [
    ["/ship", "The Ship"],
    ["/ship/book", "Book"],
    ["/ship/map", "Treasure Map"],
    ["/ship/quest", "The Quest"],
    ["/ship/fleet", "The Fleet"],
    ["/ship/log", "Voyage Log"],
  ];
  return (
    <nav className="flex flex-wrap gap-2 justify-center py-4 px-4 text-sm">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-3 py-1.5 rounded-full border transition-colors",
            current === href
              ? "bg-[#2f5d3a] text-white border-[#2f5d3a]"
              : "border-[#4a7c59]/30 hover:bg-[#4a7c59]/10",
          )}
        >
          {label}
        </Link>
      ))}
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
    }
  );
}
