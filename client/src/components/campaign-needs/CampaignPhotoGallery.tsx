import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { BlurImage } from "@/components/BlurImage";
import { decodeBasicEntities } from "@shared/htmlText";

const IMAGE_CATEGORIES: Record<string, string> = {
  land: 'Land',
  team: 'Team',
  progress: 'Progress',
  infrastructure: 'Infrastructure',
  community: 'Community',
  other: 'Other',
};

/**
 * A campaign's photos: the cover large, the rest as thumbnails. The viewer
 * opens on the base DialogContent (STEERING 12), so focus is trapped, Escape
 * closes and the page behind stays put; it used to be a hand-rolled
 * `fixed inset-0` overlay with none of that. Arrow keys move between photos.
 *
 * `inline` drops the card chrome, for use inside another card (About this land).
 */
export function CampaignPhotoGallery({ images, variant = "card" }: { images: any[]; variant?: "card" | "inline" }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  };

  if (!images || images.length === 0) return null;

  // Cover image is the first one (sorted by isCover desc)
  const coverImage = images[0];
  const otherImages = images.slice(1);
  const selected = selectedIndex !== null ? images[selectedIndex] : null;
  const caption = (img: any) => (img?.caption ? decodeBasicEntities(String(img.caption)) : "");

  return (
    <>
      <div className={variant === "card" ? "bg-white/95 backdrop-blur rounded-3xl overflow-hidden mb-6 shadow-xl" : "rounded-2xl overflow-hidden"}>
        {/* Cover / featured image */}
        <button
          type="button"
          className="relative block w-full cursor-pointer group text-left"
          onClick={() => setSelectedIndex(0)}
          aria-label={`Open photo 1 of ${images.length}${caption(coverImage) ? `: ${caption(coverImage)}` : ""}`}
        >
          <BlurImage
            src={coverImage.url}
            alt={caption(coverImage) || 'Campaign cover photo'}
            className="w-full h-48 md:h-72"
            loading="lazy"
          />
          <span className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Camera className="pointer-events-none w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
          {caption(coverImage) && (
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <span className="text-white text-sm">{caption(coverImage)}</span>
            </span>
          )}
          <Badge className="absolute top-3 left-3 bg-[#7dd87d] text-[#1a472a]">
            <Camera className="w-3 h-3 mr-1" />
            {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
          </Badge>
        </button>

        {/* Thumbnail grid */}
        {otherImages.length > 0 && (
          <div className={variant === "card" ? "p-4" : "pt-2"}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {otherImages.map((img: any, idx: number) => (
                <button
                  key={img.id ?? idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx + 1)}
                  className="aspect-square rounded-lg overflow-hidden relative group"
                  aria-label={`Open photo ${idx + 2} of ${images.length}`}
                >
                  <BlurImage
                    src={img.url}
                    alt={caption(img) || `Photo ${idx + 2}`}
                    className="absolute inset-0"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {IMAGE_CATEGORIES[img.category] || 'Other'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={(open) => { if (!open) setSelectedIndex(null); }}>
        <DialogContent
          className="max-w-4xl bg-[#0d1a12] text-white border-none p-4 md:p-6"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">
            {selectedIndex !== null ? `Photo ${selectedIndex + 1} of ${images.length}` : "Photo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {caption(selected) || "Use the arrow keys to move between photos."}
          </DialogDescription>
          {selected && (
            <div className="flex flex-col items-center">
              <div className="relative w-full flex items-center justify-center">
                <img
                  src={selected.url}
                  alt={caption(selected) || `Photo ${(selectedIndex ?? 0) + 1}`}
                  className="max-w-full max-h-[65dvh] object-contain rounded-lg"
                />
              </div>
              <div className="mt-3 text-center">
                {caption(selected) && <p className="text-white/90 text-sm mb-1">{caption(selected)}</p>}
                <p className="text-white/75 text-xs">
                  {IMAGE_CATEGORIES[selected.category] || 'Other'}, {(selectedIndex ?? 0) + 1} of {images.length}
                </p>
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={handlePrev}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={handleNext}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
