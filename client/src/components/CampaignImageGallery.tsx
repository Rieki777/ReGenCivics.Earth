import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Images } from 'lucide-react';

interface GalleryImage {
  id: number;
  imageUrl: string;
  caption?: string | null;
  category?: string | null;
  isCover?: boolean;
}

interface CampaignImageGalleryProps {
  images: GalleryImage[];
  campaignName: string;
  /** Card mode: show thumbnail strip on campaign cards */
  mode?: 'card' | 'detail';
}

/**
 * Compact image gallery for campaign cards.
 * Shows cover image with overlay count, click to open full lightbox.
 */
export function CampaignImageGallery({ images, campaignName, mode = 'card' }: CampaignImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const coverImage = images.find(img => img.isCover) || images[0];
  const imageCount = images.length;

  const openLightbox = useCallback((e: React.MouseEvent, index: number = 0) => {
    e.stopPropagation();
    setCurrentIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxOpen(false);
  }, []);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % imageCount);
  }, [imageCount]);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + imageCount) % imageCount);
  }, [imageCount]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % imageCount);
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev - 1 + imageCount) % imageCount);
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, imageCount]);

  if (images.length === 0) return null;

  if (mode === 'card') {
    return (
      <>
        {/* Card thumbnail with image count overlay */}
        <div 
          className="relative cursor-pointer group"
          onClick={(e) => openLightbox(e, 0)}
        >
          {coverImage && (
            <img 
              src={coverImage.imageUrl} 
              alt={coverImage.caption || campaignName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          
          {/* Image count badge */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 group-hover:bg-black/80 transition-colors">
              <Images className="w-3 h-3" />
              {imageCount} photos
            </div>
          )}
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>
        </div>

        {/* Lightbox */}
        {lightboxOpen && (
          <ImageLightbox
            images={images}
            currentIndex={currentIndex}
            campaignName={campaignName}
            onClose={closeLightbox}
            onNext={goNext}
            onPrev={goPrev}
          />
        )}
      </>
    );
  }

  // Detail mode: grid of thumbnails
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {images.slice(0, 8).map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
            onClick={(e) => openLightbox(e, index)}
          >
            <img
              src={image.imageUrl}
              alt={image.caption || `${campaignName} photo ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {index === 7 && imageCount > 8 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+{imageCount - 8}</span>
              </div>
            )}
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{image.caption}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          campaignName={campaignName}
          onClose={closeLightbox}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </>
  );
}

/** Full-screen lightbox overlay */
function ImageLightbox({
  images,
  currentIndex,
  campaignName,
  onClose,
  onNext,
  onPrev,
}: {
  images: GalleryImage[];
  currentIndex: number;
  campaignName: string;
  onClose: (e?: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onPrev: (e: React.MouseEvent) => void;
}) {
  const current = images[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-bold text-sm md:text-base">{campaignName}</h3>
          <p className="text-xs text-white/60">
            {currentIndex + 1} of {images.length}
            {current.category && ` | ${current.category}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center relative px-4 pb-4">
        {/* Previous button */}
        {images.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-2 md:left-4 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        )}

        {/* Main image */}
        <img
          src={current.imageUrl}
          alt={current.caption || `${campaignName} photo`}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
          onClick={e => e.stopPropagation()}
        />

        {/* Next button */}
        {images.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-2 md:right-4 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
        )}
      </div>

      {/* Caption */}
      {current.caption && (
        <div className="text-center pb-4 px-4" onClick={e => e.stopPropagation()}>
          <p className="text-white/80 text-sm">{current.caption}</p>
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-4 px-4 overflow-x-auto" onClick={e => e.stopPropagation()}>
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              className={`w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === currentIndex ? 'border-[#7dd87d] opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img
                src={img.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CampaignImageGallery;
