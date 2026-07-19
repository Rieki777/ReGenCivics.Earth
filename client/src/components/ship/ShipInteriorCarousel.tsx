/**
 * The "Aboard the ship" interior photos, as a horizontal carousel with a
 * full-screen lightbox on click. Add more shots by extending INTERIOR_PHOTOS.
 *
 * Each card degrades to a warm placeholder if its file is missing, so the row
 * never breaks while photos are being swapped.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { shipImg } from "@/pages/ship/shipShared";

type InteriorPhoto = { name: string; label: string; alt: string };

// Ordered set. The four cabin/galley/lounge shots are the real interior photos;
// the rest are her rooms. The old inaccurate galley table and the mislabelled
// "by candlelight" bedroom were removed.
const INTERIOR_PHOTOS: InteriorPhoto[] = [
  { name: "ship-interior-cabin-wide.jpg", label: "The cabin", alt: "A wide view of the ship's cabin, wood trim and soft daylight through the windows." },
  { name: "ship-interior-cabin-forward.jpg", label: "Looking forward", alt: "The cabin looking forward toward the cockpit, seats and dash ahead." },
  { name: "ship-interior-lounge-sofa.jpg", label: "The lounge", alt: "The lounge nook with the cream sofa and cushions by the window." },
  { name: "ship-interior-galley-kitchen.jpg", label: "The galley kitchen", alt: "The real galley kitchen: counter, sink, and cabinetry for cooking aboard." },
  { name: "ship-interior-living.jpg", label: "The living room", alt: "The living area: the dinette by a wide window, set up with Starlink for working aboard." },
  { name: "ship-interior-bedroom.jpg", label: "The primary bedroom", alt: "The primary bedroom with a gold velvet headboard, ceiling fan, and trailing ivy." },
  { name: "ship-interior-bath.jpg", label: "The bath", alt: "The bathroom with vanity, toilet, and the full-size washing machine in cherry cabinetry." },
  { name: "ship-interior-shower.jpg", label: "The shower", alt: "A corner shower with frosted glass, fresh towels, and a skylight overhead." },
  { name: "ship-interior-bath-sink.jpg", label: "The vanity", alt: "The bathroom vanity with a stone tile backsplash, brushed gold fixtures, and a folded towel." },
  { name: "ship-interior-altar.jpg", label: "The altar", alt: "A small altar with framed agate slices, candles, selenite, and a feather." },
];

function CarouselCard({ photo, onOpen }: { photo: InteriorPhoto; onOpen: () => void }) {
  const [err, setErr] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative shrink-0 w-56 sm:w-64 snap-start overflow-hidden rounded-2xl aspect-[4/3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
      aria-label={`Open photo: ${photo.label}`}
    >
      {err ? (
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2f5d3a] via-[#4a7c59] to-[#d4a574] text-white/70 text-3xl" aria-hidden="true">⚓</span>
      ) : (
        <img
          src={shipImg(photo.name)}
          alt={photo.alt}
          loading="lazy"
          onError={() => setErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 p-2 text-center text-white text-sm font-semibold leading-tight">{photo.label}</figcaption>
    </button>
  );
}

export function ShipInteriorCarousel() {
  const [open, setOpen] = useState<InteriorPhoto | null>(null);

  // Dismiss the lightbox on Escape; lock body scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Aboard the ship</h3>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 [scrollbar-width:thin]">
        {INTERIOR_PHOTOS.map((p) => (
          <CarouselCard key={p.name} photo={p} onOpen={() => setOpen(p)} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1">Swipe or scroll to see more. Tap a photo to open it full screen.</p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={open.alt}
          onClick={() => setOpen(null)}
        >
          <button
            type="button"
            aria-label="Close full-screen photo"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 rounded-full bg-white/15 hover:bg-white/25 text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <figure className="max-w-5xl max-h-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img src={shipImg(open.name)} alt={open.alt} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <figcaption className="mt-3 text-center text-white/90 text-sm">{open.label}</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
