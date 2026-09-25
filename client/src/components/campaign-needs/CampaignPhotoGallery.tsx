import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { BlurImage } from "@/components/BlurImage";

// Photo Gallery component for campaign detail page
export function CampaignPhotoGallery({ images }: { images: any[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const IMAGE_CATEGORIES: Record<string, string> = {
    land: 'Land',
    team: 'Team',
    progress: 'Progress',
    infrastructure: 'Infrastructure',
    community: 'Community',
    other: 'Other',
  };

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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') setSelectedIndex(null);
  };

  if (images.length === 0) return null;

  // Cover image is the first one (sorted by isCover desc)
  const coverImage = images[0];
  const otherImages = images.slice(1);

  return (
    <>
      <div className="bg-white/95 backdrop-blur rounded-3xl overflow-hidden mb-6 shadow-xl">
        {/* Cover / Featured Image */}
        <div 
          className="relative cursor-pointer group"
          onClick={() => setSelectedIndex(0)}
        >
          <BlurImage
            src={coverImage.url}
            alt={coverImage.caption || 'Campaign cover photo'}
            className="w-full h-48 md:h-72"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Camera className="pointer-events-none w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {coverImage.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-sm">{coverImage.caption}</p>
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-[#7dd87d] text-[#1a472a]">
            <Camera className="w-3 h-3 mr-1" />
            {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
          </Badge>
        </div>

        {/* Thumbnail Grid */}
        {otherImages.length > 0 && (
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {otherImages.map((img: any, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedIndex(idx + 1)}
                  className="aspect-square rounded-lg overflow-hidden relative group"
                >
                  <BlurImage
                    src={img.url}
                    alt={img.caption || `Photo ${idx + 2}`}
                    className="absolute inset-0"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                    {IMAGE_CATEGORIES[img.category] || 'Other'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Photo viewer"
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[selectedIndex].url}
              alt={images[selectedIndex].caption || `Photo ${selectedIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              {images[selectedIndex].caption && (
                <p className="text-white/90 text-sm mb-1">{images[selectedIndex].caption}</p>
              )}
              <p className="text-white/70 text-xs">
                {IMAGE_CATEGORIES[images[selectedIndex].category] || 'Other'} - {selectedIndex + 1} of {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
