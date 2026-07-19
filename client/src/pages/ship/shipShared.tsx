/**
 * Shared building blocks for the ReGen Ship pages (/ship/*). Kept in one place
 * so every page shares the same look, the same price display, and the same
 * graceful image fallback (so pages never break when an image is missing).
 */
import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Anchor } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The one standardized booking call to action for every Ship page. Always reads
 * "Book Now", always routes to the booking flow (/ship/book), always the bright
 * booking green, so it stays visually distinct from the gold quest CTA. Pass a
 * `href` only for the referral-tagged booking link.
 */
export function BookNowButton({
  className,
  size = "lg",
  href = "/ship/book",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
  href?: string;
}) {
  return (
    <Button
      asChild
      size={size}
      className={cn("bg-[#3ddc84] hover:bg-[#5ee89d] text-[#08301c] font-bold shadow-lg shadow-[#3ddc84]/25", className)}
    >
      <Link href={href}>
        <Anchor className="w-4 h-4 mr-1.5" aria-hidden="true" /> Book Now
      </Link>
    </Button>
  );
}

/** A tasteful mid-page booking prompt for the exploration sections. */
export function BookNowCallout({
  headline = "Ready to sail?",
  sub,
  className,
}: {
  headline?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "my-10 rounded-2xl border border-[#3ddc84]/40 bg-gradient-to-br from-[#2f5d3a]/10 to-[#d4a574]/10 p-6 text-center",
        className,
      )}
    >
      <p className="text-xl font-bold">{headline}</p>
      {sub && <p className="text-foreground/75 text-sm mt-1 max-w-xl mx-auto">{sub}</p>}
      <div className="mt-4"><BookNowButton /></div>
    </div>
  );
}

export const ANCHOR_NIGHTLY = 600;
export const TRIAL_NIGHTLY = 300; // exactly half the anchor, so the trial reads as a clean 50% off
// Pricing is per voyage now (Mon 3pm board to Sun 11am return). Keep these in
// sync with server/lib/ship-config.ts (ANCHOR_VOYAGE_USD / TRIAL_TOTAL_VOYAGE_USD).
export const ANCHOR_VOYAGE = ANCHOR_NIGHTLY * 7; // 4200, struck through
export const TRIAL_VOYAGE = TRIAL_NIGHTLY * 7; // 2100, the trial-year voyage total (half of anchor)
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

/**
 * A captioned interior photo. Shows the real shot when the file is present, and
 * degrades to the same "coming aboard soon" placeholder when it is missing, so
 * the section never breaks while photos are being added.
 */
export function ShipInteriorCard({ name, label, alt }: { name: string; label: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err) return <InteriorPlaceholder label={label} />;
  return (
    <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl group">
      <img
        src={shipImg(name)}
        alt={alt}
        loading="lazy"
        onError={() => setErr(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 p-2 text-center text-white text-sm font-semibold leading-tight">{label}</figcaption>
    </figure>
  );
}

/**
 * The price display: full per-voyage anchor struck through, the trial voyage
 * rate shown, and the discount made explicit (a clean 50% off, with the dollars
 * saved). Full rate returns April 2027.
 */
export function PriceTag({ className }: { className?: string }) {
  const saved = ANCHOR_VOYAGE - TRIAL_VOYAGE;
  const pct = Math.round((saved / ANCHOR_VOYAGE) * 100);
  return (
    <div className={cn("flex items-baseline gap-x-3 gap-y-1 flex-wrap", className)}>
      <span className="text-muted-foreground line-through text-xl">${ANCHOR_VOYAGE.toLocaleString()}</span>
      <span className="text-3xl font-bold text-[#2f5d3a] dark:text-[#9de89d]">${TRIAL_VOYAGE.toLocaleString()}</span>
      <span className="inline-flex items-center rounded-full bg-[#2f5d3a] text-white text-xs font-bold px-2 py-0.5">{pct}% off</span>
      <span className="text-muted-foreground">per voyage week, trial year</span>
      <span className="text-xs text-muted-foreground/80 w-full">Her full ${ANCHOR_NIGHTLY}/night rate, reduced by {pct}% for the trial year, so you save ${saved.toLocaleString()} a week. Full rate returns April 2027. Plus applicable taxes.</span>
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
const NAV_CARDS: Array<{ href: string; label: string; image: string; alt: string; primary?: boolean }> = [
  { href: "/ship", label: "The Ship", image: "ship-cascadia-forest.jpg", alt: "The ship in the forest." },
  { href: "/ship/theme", label: "The Theme", image: "ship-double-rainbow.jpg", alt: "A double rainbow over the ship." },
  // The main event: the booking card wears the bright green shimmer (the CTA).
  { href: "/ship/book", label: "Book Now", image: "ship-lake-powell-overlook.jpg", alt: "A lake vista.", primary: true },
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
                // Pure gold ring = the page you are on (always wins). Bright green
                // shimmer = the booking call to action. The two never share a color.
                active
                  ? "ring-2 ring-[#ffd700] shadow-lg"
                  : c.primary
                    ? "ship-nav-book"
                    : "ring-1 ring-black/10",
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
              {c.primary && !active && (
                <span className="absolute top-1 right-1 z-[3] rounded-full bg-[#3ddc84] text-[#08301c] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 leading-none shadow">
                  Grab your spot
                </span>
              )}
              <span className={cn(
                "absolute inset-x-0 bottom-0 z-[3] p-1.5 sm:p-2 text-center text-white font-semibold leading-tight text-[11px] sm:text-sm",
                active && "text-[#ffd700]",
                c.primary && !active && "text-[#7dffa8] font-bold",
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
